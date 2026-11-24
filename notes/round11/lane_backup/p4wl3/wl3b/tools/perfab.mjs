// (int2 copy: own slot labels int2:*)
// p4env3 fixer (P1): the judge's perfab_env3.mjs (int1 perfab: the engine's own RAF loop, vsync / frame-rate limit off,
// interleaved A / B pairs, MODE=rest | hold | unset = the pointer sweep) + validity bookkeeping for the brief's gate
// (>= 6 pairs at 1-min load < 10): each run records the 1-min load at its start and end and the OTHER slot holders seen at its
// start and end; pairs continue until `want` pairs are valid (every load sample of both runs < 10) or `maxPairs` ran.
//   SLOT_BG=0 MODE=rest node perfab_fix.mjs <out.json> <want> <urlA> <urlB> [sec=6] [maxPairs=10]
// Output lines keep perfab's format ("<pair> <A|B> {json} load <end load>") so perfana.py reads them.
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import { execFileSync } from "node:child_process";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [out, wantS, A, B, secS, maxS] = process.argv.slice(2);
const want = +wantS, sec = +(secS || 6), maxPairs = +(maxS || 10);
const SLOT = "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/slot/slot.mjs";
const others = () => {
  try {
    const st = JSON.parse(execFileSync("node", [SLOT, "status"], { encoding: "utf8" }));
    return st.holders.filter((h) => h.pid !== process.ppid && !String(h.label).startsWith("p4wl:")).map((h) => h.label);
  } catch { return ["?"]; }
};
// per-run gate (fixer v2): wait (max GATE_S s, default 150) until the 1-min load < 9 before each run
const GATE_S = +(process.env.GATE_S || 150), DEADLINE = +(process.env.DEADLINE || 0);
const perfOthers = () => others().filter((l) => /perf|ftime|timing|fps|gpuab/.test(l));
// (fixer v3: also wait while ANOTHER lane's perf / timing job holds a slot; a run beside one is never valid)
// (fixer v4: STRICT=1 waits while ANY other slot holder exists (a capture beside a run doubled MAIN's frame time at load 5.5) and
// counts a pair as valid only if no other holder at all was seen)
const STRICT = process.env.STRICT === "1";
const busy = () => (STRICT ? others().length : perfOthers().length);
const gate = async () => { const t = Date.now(); while ((os.loadavg()[0] >= 9 || busy()) && Date.now() - t < GATE_S * 1000) await new Promise((r) => setTimeout(r, 3000)); return Math.round((Date.now() - t) / 1000); };
const one = async (url) => {
  const waited = await gate();
  const load0 = os.loadavg()[0], oth0 = others();
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
    const tb = Date.now();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
    const boot = Date.now() - tb;
    const REST = process.env.MODE === "rest";
    if (!REST) await page.mouse.move(720, 383);
    await page.waitForTimeout(4000);
    if (process.env.MODE === "hold") { await page.mouse.move(720, 380); await page.mouse.down(); await page.waitForTimeout(2500); }
    const t0 = Date.now();
    const sweep = (async () => {
      while (!REST && Date.now() - t0 < sec * 1000 + 300) {
        const t = (Date.now() - t0) / 1000;
        const a = process.env.MODE === "hold" ? 0.25 : 1;
        await page.mouse.move(720 + a * 640 * Math.sin((2 * Math.PI * t) / 6), 383 + a * 150 * Math.sin((2 * Math.PI * t) / 8.5));
        await page.waitForTimeout(16);
      }
    })();
    const iv = await page.evaluate((sec) => new Promise((res) => {
      const xs = []; let last = performance.now(); const end = last + sec * 1000;
      const f = (now) => { xs.push(now - last); last = now; if (now < end) requestAnimationFrame(f); else res(xs); };
      requestAnimationFrame(f);
    }), sec);
    await sweep;
    const held = process.env.MODE === "hold" ? await page.evaluate(() => ({ phase: window.__hero.choreo?.phase, cam: window.__hero.choreo?.drivers?.camExpand })) : null;
    if (process.env.MODE === "hold") await page.mouse.up();
    const s = iv.slice(2).sort((a, b) => a - b);
    const load1 = os.loadavg()[0], oth1 = others();
    return { held, n: s.length, med: s[Math.floor(s.length / 2)], mean: s.reduce((a, b) => a + b, 0) / s.length, p95: s[Math.floor(s.length * 0.95)], boot, waited, load0: +load0.toFixed(1), load1: +load1.toFixed(1), others: [...new Set([...oth0, ...oth1])] };
  } finally {
    await browser.close();
  }
};
const res = { A: [], B: [] }, valid = [];
for (let i = 0; i < maxPairs && valid.length < want && !(DEADLINE && Date.now() > DEADLINE); i++) {
  const pr = {};
  for (const [k, u] of i % 2 ? [["B", B], ["A", A]] : [["A", A], ["B", B]]) {
    const r = await one(u);
    res[k].push(r); pr[k] = r;
    console.log(i, k, JSON.stringify(r), "load", r.load1.toFixed(1));
  }
  const ok = [pr.A.load0, pr.A.load1, pr.B.load0, pr.B.load1].every((l) => l < 10) && ![...pr.A.others, ...pr.B.others].some((l) => STRICT || /perf|ftime|timing|fps|gpuab/.test(l));
  if (ok) valid.push(i);
  console.log(`# pair ${i} ${ok ? "VALID" : "invalid (load >= 10 or another perf job)"}; valid so far ${valid.length}/${want}`);
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const ratios = valid.map((i) => ({ i, med: res.B[i].med / res.A[i].med, mean: res.B[i].mean / res.A[i].mean }));
const sum = { valid: valid.length, pairs: res.A.length, paired_med: med(ratios.map((r) => r.med)), paired_mean: med(ratios.map((r) => r.mean)), A_med: med(valid.map((i) => res.A[i].med)), B_med: med(valid.map((i) => res.B[i].med)), A_boot: med(res.A.map((r) => r.boot)), B_boot: med(res.B.map((r) => r.boot)) };
console.log(JSON.stringify(sum));
fs.writeFileSync(out, JSON.stringify({ A, B, res, valid, ratios, sum }, null, 1));
