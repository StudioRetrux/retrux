// p4orb: synchronous frame-time A/B (no vsync): lane vs main booted once each in one headless Chrome (engines' own loops
// disabled), alternating blocks of N frames of __hero.frame(1/60) each followed by a 1-px readPixels (forces the GPU to finish),
// pointer swept deterministically; modes rest (pointer sweep) and hold (debug.pose expand 2.97). Mean / median ms per frame.
//   node ftime.mjs --confs lane=5176,main=5197 --cycles 8 --frames 60 --out FILE
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const confs = arg("confs", "lane=5176,main=5197").split(",").map((s) => { const [name, port] = s.split("="); return { name, port }; });
const cycles = +arg("cycles", "8"), frames = +arg("frames", "60"), out = arg("out", ""), tier = arg("tier", "T1");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const pages = {}, blocks = [], logs = [];
try {
  for (const c of confs) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => logs.push(c.name + " pageerror " + e.message));
    await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
    await page.goto(`http://localhost:${c.port}/?tier=${tier}&scale=1`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
    await page.evaluate(() => { const h = window.__hero; h.debug.settle(4); });
    pages[c.name] = page;
  }
  const run = async (c, mode, cyc) => {
    const page = pages[c.name];
    await page.bringToFront();
    const load = os.loadavg()[0];
    const r = await page.evaluate(([mode, frames, cyc]) => {
      const h = window.__hero, gl = h.renderer.getContext(), px = new Uint8Array(4);
      if (mode === "hold") { h.debug.pose("expand", 0); h.debug.settle(0.1); h.debug.pose("expand", 2.97); h.debug.settle(1.0); } else { h.debug.pose(null); h.debug.settle(0.5); }
      // warm 5 frames
      for (let i = 0; i < 5; i++) { h.frame(1 / 60, false); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
      const t = [];
      for (let i = 0; i < frames; i++) {
        const k = cyc * frames + i;
        h.debug.pointer(0.7 * Math.sin((2 * Math.PI * k) / 120), 0.2 * Math.sin((2 * Math.PI * k) / 170));
        const t0 = performance.now();
        h.frame(1 / 60, false);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        t.push(performance.now() - t0);
      }
      h.debug.pointer(null);
      if (mode === "hold") h.debug.pose(null);
      return t;
    }, [mode, frames, cyc]);
    blocks.push({ name: c.name, mode, cyc, load: +load.toFixed(2), loadEnd: +os.loadavg()[0].toFixed(2), t: r.map((x) => +x.toFixed(3)) });
  };
  for (const mode of ["rest", "hold"]) for (let cyc = 0; cyc < cycles; cyc++) for (const c of cyc % 2 ? [...confs].reverse() : confs) await run(c, mode, cyc);
} catch (e) {
  logs.push("ERROR " + e.message);
} finally {
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
  const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(a.length, 1);
  const summ = {};
  for (const mode of ["rest", "hold"]) {
    const s = {};
    for (const c of confs) {
      const bs = blocks.filter((b) => b.mode === mode && b.name === c.name);
      const all = bs.flatMap((b) => b.t);
      s[c.name] = { blocks: bs.length, mean: +mean(all).toFixed(3), med: +med(all).toFixed(3), blockMeans: bs.map((b) => +mean(b.t).toFixed(2)), loads: bs.map((b) => b.load) };
    }
    const [a, b] = confs.map((c) => c.name);
    const A = blocks.filter((x) => x.mode === mode && x.name === a), B = blocks.filter((x) => x.mode === mode && x.name === b);
    const rm = [], rd = [];
    for (let i = 0; i < Math.min(A.length, B.length); i++) { rm.push(+(mean(A[i].t) / mean(B[i].t)).toFixed(3)); rd.push(+(med(A[i].t) / med(B[i].t)).toFixed(3)); }
    s.pairedMeanRatios = rm; s.pairedMeanRatioMed = med(rm); s.pairedMedRatios = rd; s.pairedMedRatioMed = med(rd);
    s.loadMax = Math.max(...blocks.filter((x) => x.mode === mode).map((x) => Math.max(x.load, x.loadEnd)));
    summ[mode] = s;
  }
  const o = { tier, cycles, frames, summ, logs };
  console.log(JSON.stringify(o, null, 1));
  if (out) fs.writeFileSync(out, JSON.stringify({ ...o, blocks }, null, 1));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
