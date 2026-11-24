// judge_p4env3: frame-level interleaved A/B in ONE browser (two pages, engine RAF disabled, frame stepping, each frame synced
// with a 1-px readPixels). A and B alternate every K frames, so slow background load hits both alike (a check beside perfab,
// which interleaves whole runs). node gpuab.mjs <out.json> <urlA> <urlB> [rounds=40] [K=8] [pointer=rest|sweep]
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [out, A, B, roundsS, KS, mode] = process.argv.slice(2);
const rounds = +(roundsS || 40), K = +(KS || 8);
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--disable-gpu-vsync", "--disable-frame-rate-limit", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"],
});
const res = { A: [], B: [], load: [], mode: mode || "rest" };
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    let h = null;
    Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } });
  });
  const pages = {};
  for (const [k, u] of [["A", A], ["B", B]]) {
    const p = await ctx.newPage();
    await p.goto(u, { waitUntil: "domcontentloaded" });
    await p.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
    await p.evaluate(() => { const h = window.__hero; h.debug.pointer(null); h.debug.settle(6); });
    pages[k] = p;
  }
  // warm both
  for (const k of ["A", "B"]) await pages[k].evaluate((K) => { const h = window.__hero; for (let i = 0; i < 3 * K; i++) h.frame(1 / 60, false); }, K);
  for (let r = 0; r < rounds; r++) {
    for (const k of r % 2 ? ["B", "A"] : ["A", "B"]) {
      const t = await pages[k].evaluate(([K, r, sweep]) => {
        const h = window.__hero; const gl = h.renderer.getContext(); const px = new Uint8Array(4); const ts = [];
        for (let i = 0; i < K; i++) {
          if (sweep) { const f = r * K + i; h.debug.pointer(0.9 * Math.sin((2 * Math.PI * f) / 240), 0.3 * Math.sin((2 * Math.PI * f) / 340)); }
          const t0 = performance.now(); h.frame(1 / 60, false); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push(performance.now() - t0);
        }
        return ts;
      }, [K, r, mode === "sweep"]);
      res[k].push(...t);
    }
    res.load.push(+os.loadavg()[0].toFixed(1));
  }
} catch (e) { res.error = String(e); }
finally {
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const trim = (a) => { const s = [...a].sort((x, y) => x - y); return s.slice(Math.floor(s.length * 0.1), Math.ceil(s.length * 0.9)); };
  res.sum = res.A.length ? { n: res.A.length, A_med: med(res.A), B_med: med(res.B), ratio_med: med(res.B) / med(res.A), A_tmean: mean(trim(res.A)), B_tmean: mean(trim(res.B)), ratio_tmean: mean(trim(res.B)) / mean(trim(res.A)), load_min: Math.min(...res.load), load_max: Math.max(...res.load) } : null;
  fs.writeFileSync(out, JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ sum: res.sum, error: res.error }));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
