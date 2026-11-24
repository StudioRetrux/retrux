// Within-session A/B of the lane's runtime-switchable parts (one page, no reload): blocks of N frames rotate through
//   full (B + C), noC (envEdge.taa detached), noB (lakeSched.mirrorEvery 3), none (both) ; A is compiled in (shader defines).
// Sync every `batch` frames (wall time / batch). Medians per config over all blocks; ratio to "none".
//   SLOT_BG=0 node perf2.mjs --port 5193 [--path medium] [--block 30] [--cycles 10] [--batch 10]
import { createRequire } from "node:module";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port", "5193"), pathName = arg("path", "medium"), block = +arg("block", "30"), cycles = +arg("cycles", "10"), batch = +arg("batch", "10");
const qs = arg("qs", "");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript((c) => { window.__confs = c; }, arg("confs", "full,noC,noB,none"));
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  const res = await page.evaluate(async ([pathName, block, cycles, batch]) => {
    const h = window.__hero;
    const gl = h.renderer.getContext();
    const px = new Uint8Array(4);
    const S = Math.sin, P = Math.PI * 2;
    const ptr = (i) => {
      const t = i / 60;
      if (pathName === "fast") return [1.0 * S((P * t) / 2.5), 0.4 * S((P * t) / 3.3)];
      if (pathName === "rest") return null;
      return [0.8 * S((P * t) / 8), 0.25 * S((P * t) / 11)];
    };
    const taa = h.envEdge ? h.envEdge.taa : null;
    const sched = h.lakeSched;
    const confs = (window.__confs || "full,noC,noB,none").split(",");
    const w0 = taa ? taa.opts.weight : 0;
    const set = (c) => {
      // full: B + C; noC: B; noB: C; none: neither; copyC: the TAA pass as a plain copy (weight 0), no B; m2: B every 2nd + C
      if (h.envEdge) h.envEdge.taa = c === "full" || c === "noB" || c === "copyC" || c === "m2" || c === "fullmip2" ? taa : null;
      if (sched) sched.mipEvery = c === "fullmip2" || c === "noCmip2" ? 2 : 1;
      if (taa) { taa.opts.weight = c === "copyC" ? 0 : w0; if (h.envEdge.taa === null) taa.valid = false; }
      if (sched) sched.mirrorEvery = c === "full" || c === "noC" || c === "fullmip2" || c === "noCmip2" ? 1 : c === "m2" ? 2 : 3;
    };
    const p0 = ptr(0);
    if (p0) h.debug.pointer(p0[0], p0[1]); else h.debug.pointer(null);
    h.debug.settle(6);
    const out = Object.fromEntries(confs.map((c) => [c, []]));
    const blocks = Object.fromEntries(confs.map((c) => [c, []]));
    let i = 0;
    // warm-up
    for (let w = 0; w < 60; w++, i++) { const p = ptr(i); if (p) h.debug.pointer(p[0], p[1]); h.frame(1 / 60, false); }
    for (let cyc = 0; cyc < cycles; cyc++) {
      const order = cyc % 2 ? [...confs].reverse() : confs;
      for (const c of order) {
        set(c);
        // 10 frames to settle the switch (history refill, schedule), then the block
        for (let w = 0; w < 10; w++, i++) { const p = ptr(i); if (p) h.debug.pointer(p[0], p[1]); else { h.debug.pointer(null); h.state.pointer.active = false; } h.frame(1 / 60, false); }
        h.renderer.setRenderTarget(null);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const bs = [];
        for (let b = 0; b < block; b += batch) {
          const t0 = performance.now();
          for (let k = 0; k < batch; k++, i++) { const p = ptr(i); if (p) h.debug.pointer(p[0], p[1]); else { h.debug.pointer(null); h.state.pointer.active = false; } h.frame(1 / 60, false); }
          h.renderer.setRenderTarget(null);
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          out[c].push((performance.now() - t0) / batch);
          bs.push(out[c][out[c].length - 1]);
        }
        bs.sort((x, y) => x - y);
        blocks[c].push(bs[bs.length >> 1]);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    set("full");
    return { out, blocks };
  }, [pathName, block, cycles, batch]);
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const { out: R, blocks } = res;
  const n = med(R.none);
  const summ = {};
  for (const k of Object.keys(R)) {
    const paired = blocks[k].map((v, i) => v / blocks.none[i]);
    summ[k] = { med: +med(R[k]).toFixed(3), max: +Math.max(...R[k]).toFixed(2), n: R[k].length, ratioMed: +(med(R[k]) / n).toFixed(3), pairedRatioMed: +med(paired).toFixed(3), pairedRatios: paired.map((x) => +x.toFixed(3)) };
  }
  console.log(JSON.stringify({ path: pathName, summ }, null, 1));
} finally {
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
