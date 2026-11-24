// Judge (perf lens): in-session A/B of the AA3 lane's runtime-switchable parts, per-frame GPU-synced wall times.
// Configs rotate in blocks (ABBA order per cycle): full = B + C (lane default), none = BASE schedule + no TAA (A stays: compiled in),
// noC = B only, noB = C only. Every frame is synced (1-px readPixels), so a frame's wall time is its CPU + GPU time.
//   SLOT_BG=0 node pin.mjs --port 5181 --vw 1440 --vh 766 --path medium --block 60 --cycles 12 --confs full,none --out FILE
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port", "5181"), pathName = arg("path", "medium"), block = +arg("block", "60"), cycles = +arg("cycles", "12");
const vw = +arg("vw", "1440"), vh = +arg("vh", "766"), dsf = +arg("dsf", "1"), tier = arg("tier", "T1"), qs = arg("qs", "");
const confs = arg("confs", "full,none").split(",");
const out = arg("out", "");
const load0 = os.loadavg();
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
let res = null;
try {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dsf });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 200)}`); });
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=${tier}&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  res = await page.evaluate(async ([pathName, block, cycles, confs]) => {
    const h = window.__hero;
    const gl = h.renderer.getContext();
    const px = new Uint8Array(4);
    const S = Math.sin, P = Math.PI * 2;
    const ptr = (i) => {
      const t = i / 60;
      if (pathName === "fast") return [1.0 * S((P * t) / 2.5), 0.4 * S((P * t) / 3.3)];
      if (pathName === "slow") return [0.5 * S((P * t) / 20), 0.1 * S((P * t) / 27)];
      if (pathName === "rest") return null;
      return [0.8 * S((P * t) / 8), 0.25 * S((P * t) / 11)];
    };
    const taa = h.envEdge ? h.envEdge.taa : null;
    const sched = h.lakeSched;
    const set = (c) => {
      if (h.envEdge) h.envEdge.taa = c === "full" || c === "noB" ? taa : null;
      if (taa && h.envEdge.taa === null) taa.valid = false;
      if (sched) sched.mirrorEvery = c === "full" || c === "noC" ? 1 : 3;
    };
    const step = (i) => { const p = ptr(i); if (p) h.debug.pointer(p[0], p[1]); else { h.debug.pointer(null); h.state.pointer.active = false; } h.frame(1 / 60, false); };
    const sync = () => { h.renderer.setRenderTarget(null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
    const p0 = ptr(0);
    if (p0) h.debug.pointer(p0[0], p0[1]); else h.debug.pointer(null);
    h.debug.settle(6);
    let i = 0;
    for (let w = 0; w < 60; w++, i++) step(i);
    sync();
    const frames = Object.fromEntries(confs.map((c) => [c, []]));
    const blocks = Object.fromEntries(confs.map((c) => [c, []]));
    const taaRuns = Object.fromEntries(confs.map((c) => [c, 0]));
    const mirrors = Object.fromEntries(confs.map((c) => [c, 0]));
    for (let cyc = 0; cyc < cycles; cyc++) {
      const order = cyc % 2 ? [...confs].reverse() : confs;
      for (const c of order) {
        set(c);
        for (let w = 0; w < 10; w++, i++) step(i);
        sync();
        const r0 = taa ? taa.runs : 0, m0 = sched ? sched.counts.mirror : 0;
        const bs = [];
        for (let b = 0; b < block; b++, i++) {
          const t0 = performance.now();
          step(i);
          sync();
          const dtm = performance.now() - t0;
          frames[c].push(dtm);
          bs.push(dtm);
        }
        taaRuns[c] += taa ? taa.runs - r0 : 0;
        mirrors[c] += sched ? sched.counts.mirror - m0 : 0;
        bs.sort((x, y) => x - y);
        blocks[c].push(bs[bs.length >> 1]);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    set("full");
    return { frames, blocks, taaRuns, mirrors, main: [h.pipeline.main.width, h.pipeline.main.height], tier: h.state.tier, scale: h.state.renderScale };
  }, [pathName, block, cycles, confs]);
  await ctx.close();
} catch (e) {
  logs.push("error " + e.message);
} finally {
  const load1 = os.loadavg();
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
  const q = (a, f) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(b.length * f))]; };
  const summ = {};
  if (res) {
    const ref = confs.includes("none") ? "none" : confs[confs.length - 1];
    for (const c of confs) {
      const f = res.frames[c];
      const paired = res.blocks[c].map((v, k) => v / res.blocks[ref][k]);
      const sortedF = [...f].sort((x, y) => y - x);
      summ[c] = { n: f.length, med: +med(f).toFixed(3), p90: +q(f, 0.9).toFixed(2), p99: +q(f, 0.99).toFixed(2), max: +Math.max(...f).toFixed(2), top5: sortedF.slice(0, 5).map((x) => +x.toFixed(1)), ratioMedVsRef: +(med(f) / med(res.frames[ref])).toFixed(4), pairedBlockRatioMed: +med(paired).toFixed(4), pairedBlockRatios: paired.map((x) => +x.toFixed(3)), taaRuns: res.taaRuns[c], mirrorDraws: res.mirrors[c] };
    }
  }
  const o = { port, path: pathName, vw, vh, dsf, tier, block, cycles, main: res?.main, scale: res?.scale, load1minBefore: +load0[0].toFixed(2), load1minAfter: +load1[0].toFixed(2), summ, logs };
  console.log(JSON.stringify(o, null, 1));
  if (out) fs.writeFileSync(out, JSON.stringify({ ...o, raw: res }, null, 1));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
