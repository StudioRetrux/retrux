#!/usr/bin/env node
// slot.mjs - ONE shared headless-browser slot for every agent on the machine (awwwards-craft, from Astra 70, Nov 2026).
//
// Why: many agents probing a WebGL site in parallel melt a laptop, and the person at the keyboard is usually designing
// in Figma at the same time. Every headless browser, test run or browser-driven build goes through this gate.
//
//   node slot.mjs run <label> -- <cmd> [args...]   wait for a free slot AND 1-min load <= the cap, run <cmd> under
//                                                  `nice -n 10` (do not add nice yourself), free the slot on exit
//   node slot.mjs status                           print holders, load, config and the priority queue (JSON)
//   import { acquire, release } from './slot.mjs'  (node probes: await acquire('label'); try { ... } finally { release(); })
//
// Configuration (environment):
//   SLOT_DIR       directory for the lock dirs (.slot, .slot1, ...) and the priority queue (.slot-prio/).
//                  Default: the directory of this file. Every agent of one machine MUST use the same SLOT_DIR.
//   SLOT_CONF      path of the live mode file (default: $SLOT_DIR/.slot-conf.json), read on EVERY wait loop:
//                  { "n": 1-5, "loadMax": <1-min load cap>, "bg": true|false, "until": "<ISO time>", "why": "..." }
//                  n = parallel slots, bg = run commands under macOS background QoS (taskpolicy -b: efficiency cores,
//                  throttled I/O). After `until` the defaults come back (1 slot, SLOT_LOAD_MAX). Delete it to end early.
//   SLOT_LOAD_MAX  default 1-min load cap when no mode file is valid (default 6)
//   SLOT_PRIORITY  =1 makes this waiter a priority waiter (same as a label starting with '!')
//   SLOT_BG        =0 runs this one command without background QoS (timing / perf measurements only; still nice 10)
//   SLOT_WAIT_MIN  give up after this many minutes of waiting (default 90)
//
// Modes used on Astra:
//   light     { "n": 1, "loadMax": 5, "bg": true }     the person designs in Figma: one browser, background QoS
//   normal    (no file)                                 one browser, load <= 6, nice 10
//   deadline  { "n": 2-5, "loadMax": 10-40, "until": "..." }   only when the person sets a hard deadline; revert after
//   EXCEPTION timing-sensitive test suites (dropdown timings, video visibility, sticky states): run with bg:false.
//             Under background QoS 5 timing checks failed that all passed at normal priority (11 Nov).
//
// Locks: a slot is a directory (mkdir is atomic) holding owner.json { label, pid, at, slot }. A slot whose owner pid is
// gone, or that is older than 40 min, is taken over (logged on stderr). Hold a slot for ONE batch (<= ~5 min for a
// probe; a full build --test may hold it for its whole run).
// PRIORITY: while a live priority waiter is queued, other waiters let it go first. A holder is never pre-empted.
//
// Change vs the Astra original: the original released / reported only slots 0-2 although n could be 5, so slots 3-4
// were freed only by the stale take-over ("stale .slot3 removed" twice on 12-13 Nov). All MAX_N slots are handled here.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(process.env.SLOT_DIR || HERE);
const LOCK = path.join(DIR, '.slot');
const CONF = path.resolve(process.env.SLOT_CONF || path.join(DIR, '.slot-conf.json'));
const PRIO = path.join(DIR, '.slot-prio');
const LOADMAX = +(process.env.SLOT_LOAD_MAX || 6);
const WAIT_MS = +(process.env.SLOT_WAIT_MIN || 90) * 60e3;
const STALE_MS = 40 * 60e3;
const MAX_N = 5;
const ALL = [...Array(MAX_N).keys()];

// the live config: { n, loadMax, bg } while the mode file is valid, else the defaults
function conf() {
  try {
    const c = JSON.parse(fs.readFileSync(CONF, 'utf8'));
    if (c.until && Date.now() > Date.parse(c.until)) return { n: 1, loadMax: LOADMAX, bg: false };
    return { n: Math.max(1, Math.min(MAX_N, +c.n || 1)), loadMax: +c.loadMax || LOADMAX, bg: !!c.bg };
  } catch { return { n: 1, loadMax: LOADMAX, bg: false }; }
}
const lockDir = (i) => (i ? `${LOCK}${i}` : LOCK);
const isPrio = (label) => String(label).startsWith('!') || process.env.SLOT_PRIORITY === '1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const owner = (i = 0) => {
  const d = lockDir(i);
  try { return JSON.parse(fs.readFileSync(path.join(d, 'owner.json'), 'utf8')); }
  catch { return fs.existsSync(d) ? { label: '?', pid: 0, at: fs.statSync(d).mtimeMs, slot: i } : null; }
};
const owners = () => ALL.map((i) => owner(i)).filter(Boolean);

// another live priority waiter (dead ones are cleaned up)
function prioWaiting(self) {
  let names = [];
  try { names = fs.readdirSync(PRIO); } catch { return false; }
  return names.some((f) => {
    const pid = +f;
    if (!pid || pid === self) return false;
    if (!alive(pid)) { try { fs.rmSync(path.join(PRIO, f), { force: true }); } catch {} return false; }
    return true;
  });
}

export async function acquire(label, { pid = process.pid, waitMs = WAIT_MS } = {}) {
  fs.mkdirSync(DIR, { recursive: true });
  const prio = isPrio(label);
  if (prio) { fs.mkdirSync(PRIO, { recursive: true }); fs.writeFileSync(path.join(PRIO, String(pid)), String(label)); }
  try { return await acquireLoop(label, pid, waitMs, prio); }
  finally { if (prio) { try { fs.rmSync(path.join(PRIO, String(pid)), { force: true }); } catch {} } }
}

async function acquireLoop(label, pid, waitMs, prio) {
  const t0 = Date.now();
  let said = 0;
  for (;;) {
    const l = os.loadavg()[0];
    const C = conf();
    if (l <= C.loadMax && (prio || !prioWaiting(pid))) {
      let took = false, retry = false;
      for (let i = 0; i < C.n && !took; i++) {
        const d = lockDir(i);
        try {
          fs.mkdirSync(d);
          fs.writeFileSync(path.join(d, 'owner.json'), JSON.stringify({ label, pid, at: Date.now(), slot: i }));
          took = true;
        } catch (e) {
          if (e.code !== 'EEXIST') throw e;
          const h = owner(i);
          if (h && (!h.pid || !alive(h.pid) || Date.now() - h.at > STALE_MS)) {
            process.stderr.write(`[slot] taking over a stale slot ${JSON.stringify(h)}\n`);
            fs.rmSync(d, { recursive: true, force: true });
            retry = true;
          }
        }
      }
      if (took) return;
      if (retry) continue;
    }
    if (Date.now() - said > 60e3) {
      process.stderr.write(`[slot] ${label} waiting (load ${l.toFixed(1)} / max ${C.loadMax}, slots ${C.n}, holders ${JSON.stringify(owners())}${!prio && prioWaiting(pid) ? ', a priority waiter goes first' : ''})\n`);
      said = Date.now();
    }
    if (Date.now() - t0 > waitMs) throw new Error(`[slot] ${label}: waited ${Math.round(waitMs / 60e3)} min`);
    await sleep(5000);
  }
}

export function release(pid = process.pid) {
  for (const i of ALL) {
    const h = owner(i);
    if (h && h.pid === pid) fs.rmSync(lockDir(i), { recursive: true, force: true });
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [cmd, label, sep, ...rest] = process.argv.slice(2);
  if (cmd === 'status') {
    let prioQ = [];
    try { prioQ = fs.readdirSync(PRIO).map((f) => ({ pid: +f, label: fs.readFileSync(path.join(PRIO, f), 'utf8'), alive: alive(+f) })); } catch {}
    const C = conf();
    console.log(JSON.stringify({ dir: DIR, conf: CONF, holder: owner(), holders: owners(), slots: C.n, bg: C.bg, load: os.loadavg().map((x) => +x.toFixed(2)), max: C.loadMax, priorityWaiting: prioQ }));
  } else if (cmd === 'run' && label && sep === '--' && rest.length) {
    await acquire(label);
    process.stderr.write(`[slot] ${label}: taken (load ${os.loadavg()[0].toFixed(1)})\n`);
    // bg: background QoS keeps the performance cores for the person's own apps (macOS only)
    const bg = conf().bg && process.env.SLOT_BG !== '0' && process.platform === 'darwin'; // SLOT_BG=0: timing runs at normal QoS (still nice 10)
    const child = bg ? spawn('taskpolicy', ['-b', 'nice', '-n', '10', ...rest], { stdio: 'inherit' }) : spawn('nice', ['-n', '10', ...rest], { stdio: 'inherit' });
    const free = () => { try { release(); } catch {} };
    for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { try { child.kill(sig); } catch {} free(); process.exit(130); });
    child.on('exit', (code, signal) => { free(); process.stderr.write(`[slot] ${label}: freed (exit ${code ?? signal})\n`); process.exit(code ?? 1); });
  } else {
    console.error('usage: node slot.mjs run <label> -- <cmd> [args...] | node slot.mjs status   (env SLOT_DIR, SLOT_CONF, SLOT_LOAD_MAX)');
    process.exit(2);
  }
}
