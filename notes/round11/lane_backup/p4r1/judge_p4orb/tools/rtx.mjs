// (p4orb copy: confs lane=5176,main=5197; + HOLD blocks: debug.pose("expand", 2.97) held, the hold the lane changes most)
// judge-perfcode (G7, real loop, CROSS-LAB): AA7 (:5197) vs BASE (:5182) vs AA6 (:5196), each booted once in its own
// context of ONE headless Chrome; only the measured page runs (the others' engines stopped with __hero.stop(), so they draw
// nothing). Blocks interleaved ABC / CBA per cycle. MOVE blocks: CDP mouse sweeps (page.mouse.move every ~12 ms, the
// judges' rtpin path); REST blocks: no input, after a settle (camera at rest, TAA handed over). Per block: rAF intervals
// (ms) of a separate rAF hook; the engine's own loop is the product loop (?tier=T1&scale=1, no ?debug).
//   SLOT_BG=0 node rtx.mjs --vw 1440 --vh 766 --cycles 8 --blockms 2500 --out FILE
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const vw = +arg("vw", "1440"), vh = +arg("vh", "766"), cycles = +arg("cycles", "8"), blockms = +arg("blockms", "2500");
const restCycles = +arg("restcycles", String(cycles)), holdCycles = +arg("holdcycles", String(cycles)), restSettle = +arg("restsettle", "2600");
const out = arg("out", "");
const confs = (arg("confs", "lane=5176,main=5197")).split(",").map((s) => { const [name, port] = s.split("="); return { name, port }; });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
const blocks = [];
const pages = {};
let t0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (const c of confs) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => logs.push(c.name + " pageerror " + e.message));
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`${c.name} console.${m.type()} ${m.text().slice(0, 200)}`); });
    const tb = Date.now();
    await page.goto(`http://localhost:${c.port}/?tier=T1&scale=1`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
    const bootMs = Date.now() - tb;
    await page.mouse.move(vw / 2, vh * 0.45);
    await sleep(2500);
    await page.evaluate(() => {
      window.__iv = [];
      window.__rec = false;
      let last = 0;
      const f = (n) => { if (window.__rec) { if (last) window.__iv.push(n - last); last = n; requestAnimationFrame(f); } else last = 0; };
      window.__go = () => { window.__iv = []; window.__rec = true; requestAnimationFrame(f); };
      window.__end = () => { window.__rec = false; return window.__iv; };
      window.__hero.stop();
    });
    pages[c.name] = { page, bootMs };
  }
  let tm = 0; // the sweep's own clock (continues across pages)
  const runBlock = async (c, mode, cyc) => {
    const { page } = pages[c.name];
    const load = os.loadavg()[0];
    await page.evaluate(() => window.__hero.start());
    let stop = false, mover = null;
    if (mode === "move") {
      mover = (async () => {
        while (!stop) {
          const t = tm / 60;
          await page.mouse.move(vw * (0.5 + 0.35 * Math.sin((2 * Math.PI * t) / 6)), vh * (0.45 + 0.12 * Math.sin((2 * Math.PI * t) / 8.5)));
          await sleep(12);
          tm++;
        }
      })();
      await sleep(700);
    } else if (mode === "hold") {
      await page.evaluate(() => { const h = window.__hero; h.debug.pose("expand", 0); h.debug.settle(0.1); h.debug.pose("expand", 2.97); });
      await sleep(1500);
    } else {
      await sleep(restSettle);
    }
    await page.evaluate(() => window.__go());
    await sleep(blockms);
    const iv = await page.evaluate(() => window.__end());
    const st = await page.evaluate(() => ({ fps: window.__hero.state.fps, scale: window.__hero.state.renderScale, taa: window.__hero.envEdge?.taaState ?? null, reused: window.__hero.lakeMirror?.reused ?? null }));
    stop = true;
    if (mover) await mover;
    if (mode === "hold") await page.evaluate(() => window.__hero.debug.pose(null));
    await page.evaluate(() => window.__hero.stop());
    await sleep(150);
    blocks.push({ name: c.name, mode, cyc, load: +load.toFixed(2), loadEnd: +os.loadavg()[0].toFixed(2), n: iv.length, iv, st });
  };
  for (let cyc = 0; cyc < cycles; cyc++) for (const c of cyc % 2 ? [...confs].reverse() : confs) await runBlock(c, "move", cyc);
  for (let cyc = 0; cyc < restCycles; cyc++) for (const c of cyc % 2 ? [...confs].reverse() : confs) await runBlock(c, "rest", cyc);
  for (let cyc = 0; cyc < holdCycles; cyc++) for (const c of cyc % 2 ? [...confs].reverse() : confs) await runBlock(c, "hold", cyc);
} catch (e) {
  logs.push("ERROR " + e.message);
} finally {
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? (b.length % 2 ? b[b.length >> 1] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : NaN; };
  const q = (a, f) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(b.length * f))] : NaN; };
  const summ = {};
  for (const mode of ["move", "rest", "hold"]) {
    const s = {};
    for (const c of confs) {
      const bs = blocks.filter((b) => b.mode === mode && b.name === c.name);
      const all = bs.flatMap((b) => b.iv);
      s[c.name] = { blocks: bs.length, frames: all.length, med: +med(all).toFixed(2), p95: +q(all, 0.95).toFixed(2), max: +Math.max(...all).toFixed(1), blockMeds: bs.map((b) => +med(b.iv).toFixed(2)), blockP95: bs.map((b) => +q(b.iv, 0.95).toFixed(1)), loads: bs.map((b) => b.load), fps: bs.map((b) => b.st.fps), scale: [...new Set(bs.map((b) => b.st.scale))] };
    }
    const pair = (a, b) => {
      const A = blocks.filter((x) => x.mode === mode && x.name === a), B = blocks.filter((x) => x.mode === mode && x.name === b);
      const r = [], r95 = [], lmax = [];
      for (let i = 0; i < Math.min(A.length, B.length); i++) { r.push(+(med(A[i].iv) / med(B[i].iv)).toFixed(3)); r95.push(+(q(A[i].iv, 0.95) / q(B[i].iv, 0.95)).toFixed(3)); lmax.push(Math.max(A[i].load, B[i].load, A[i].loadEnd, B[i].loadEnd)); }
      const ok = r.filter((_, i) => lmax[i] < 10);
      return { paired: r, pairedMed: +med(r).toFixed(3), pairedP95ratios: r95, pairedP95Med: +med(r95).toFixed(3), loadMax: lmax, pairsUnder10: ok.length, pairedMedUnder10: +med(ok).toFixed(3), ratioOfMedians: +(s[a].med / s[b].med).toFixed(3), ratioOfP95: +(s[a].p95 / s[b].p95).toFixed(3) };
    };
    const names = confs.map((c) => c.name);
    if (names.includes("lane") && names.includes("main")) s.lane_vs_main = pair("lane", "main");
    if (names.includes("a7") && names.includes("base")) s.a7_vs_base = pair("a7", "base");
    if (names.includes("a7") && names.includes("a6")) s.a7_vs_a6 = pair("a7", "a6");
    if (names.includes("a6") && names.includes("base")) s.a6_vs_base = pair("a6", "base");
    summ[mode] = s;
  }
  const o = { vw, vh, cycles, blockms, boot: Object.fromEntries(Object.entries(pages).map(([k, v]) => [k, v.bootMs])), secs: Math.round((Date.now() - t0) / 1000), summ, logs, blocks: blocks.map((b) => ({ ...b, iv: b.iv.map((x) => +x.toFixed(2)) })) };
  const short = { ...o, blocks: undefined };
  console.log(JSON.stringify(short, null, 1));
  if (out) fs.writeFileSync(out, JSON.stringify(o, null, 1));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
