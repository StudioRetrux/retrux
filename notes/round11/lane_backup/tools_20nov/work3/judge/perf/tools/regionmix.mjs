// Judge (code lens): does the lake-edge TAA mix compressed (inside aaIn) and linear (outside) texels in its 3x3 statistics /
// history at the resolve region's boundary (horizon line, cloud-card carve-out)? Wraps EnvEdge.runTAA: reads `main` (the
// env-only resolve the TAA reads) and the TAA output as float, replays aaIn + taaKind on the CPU (same uniforms), and reports
// per frame: band pixels inside the region with a 3x3 neighbour outside it ("mixed"), and their expanded output vs input.
//   node regionmix.mjs --port 5181 --vw 1440 --vh 766 --path medium --frames 240 --every 6 [--qs ...] --out FILE
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port", "5181"), vw = +arg("vw", "1440"), vh = +arg("vh", "766"), pathName = arg("path", "medium");
const frames = +arg("frames", "240"), every = +arg("every", "6"), qs = arg("qs", ""), out = arg("out", ""), tier = arg("tier", "T1");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
let res = null;
try {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 200)}`); });
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=${tier}&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  res = await page.evaluate(async ([pathName, frames, every]) => {
    const h = window.__hero;
    const gl = h.renderer.getContext();
    const edge = h.envEdge;
    if (!edge || !edge.taa) return { error: "no TAA" };
    const S = Math.sin, P = Math.PI * 2;
    const ptr = (i) => {
      const t = i / 60;
      if (pathName === "fast") return [1.0 * S((P * t) / 2.5), 0.4 * S((P * t) / 3.3)];
      if (pathName === "slow") return [0.5 * S((P * t) / 20), 0.1 * S((P * t) / 27)];
      if (pathName === "diag") return [0.9 * S((P * t) / 4), 0.6 * S((P * t) / 4)];
      if (pathName === "updown") return [0.2 * S((P * t) / 6), 0.9 * S((P * t) / 3)];
      return [0.8 * S((P * t) / 8), 0.25 * S((P * t) / 11)];
    };
    const readF = (rt) => {
      const W = rt.width, H = rt.height;
      const fb = h.renderer.properties.get(rt).__webglFramebuffer;
      const prev = h.renderer.getRenderTarget();
      h.renderer.state.bindFramebuffer(gl.FRAMEBUFFER, fb);
      const a = new Float32Array(W * H * 4);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, a);
      h.renderer.setRenderTarget(prev);
      return a;
    };
    let cap = false;
    const stats = [];
    const orig = edge.runTAA.bind(edge);
    const rd = edge.aaRead;
    edge.runTAA = (r, main) => {
      if (!cap) return orig(r, main);
      const W = main.width, H = main.height;
      const C = readF(main);
      const plane = rd.uAAPlane.value.clone(), exc = rd.uAAExc.value.clone(), K = rd.uAAKnee.value;
      const o = orig(r, main);
      const t = edge.taa;
      const outRT = t.targets[1 - t.cur];
      if (!o) { stats.push({ skipped: true }); return o; }
      const O = readF(outRT);
      const u = t.material.uniforms;
      const rO = u.uRayO.value, rX = u.uRayX.value, rY = u.uRayY.value, cp = u.uCamPos.value;
      const e = exc.elements; // column-major: column j = e_j
      const inR = new Uint8Array(W * H), kind = new Uint8Array(W * H);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const px = x + 0.5, py = y + 0.5;
          const d0 = px * plane.x + py * plane.y + plane.z;
          const a0 = px * e[0] + py * e[1] + e[2], a1 = px * e[3] + py * e[4] + e[5], a2 = px * e[6] + py * e[7] + e[8];
          const i = y * W + x;
          inR[i] = d0 < 0 && !(a0 >= 0 && a1 >= 0 && a2 >= 0) ? 1 : 0;
          const a = C[i * 4 + 3];
          let k = 0;
          if (a > 1) {
            const dx = rO.x + px * rX.x + py * rY.x, dy = rO.y + px * rX.y + py * rY.y, dz = rO.z + px * rX.z + py * rY.z;
            const L = Math.hypot(dx, dy, dz);
            if (dy > -1e-5 * L) k = 2;
            else {
              const tw = (-cp.y * L) / dy;
              k = Math.abs(a - tw) <= 0.004 * tw + 0.03 ? 1 : a < tw ? 2 : 0;
            }
          }
          kind[i] = k;
        }
      const lum = (A, i) => 0.2126 * A[i * 4] + 0.7152 * A[i * 4 + 1] + 0.0722 * A[i * 4 + 2];
      const expand = (l) => (K * l) / Math.max(1 - Math.max(l, 0), 1 / 4096);
      let band = 0, blended = 0, mixed = 0, mixedChanged = 0, invalid = 0, maxRatio = 0, maxRatioAt = null, over2 = 0, over4 = 0, under05 = 0;
      const rows = new Map();
      for (let y = 2; y < H - 2; y++)
        for (let x = 2; x < W - 2; x++) {
          const i = y * W + x;
          if (!inR[i]) continue;
          let lake = false, solid = false, outN = false;
          for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) { const q = i + j * W + k; lake ||= kind[q] === 1; solid ||= kind[q] === 2; outN ||= !inR[q]; }
          for (const q of [i + 2, i - 2, i + 2 * W, i - 2 * W]) { lake ||= kind[q] === 1; solid ||= kind[q] === 2; }
          if (!(lake && solid)) continue;
          band++;
          const lc = lum(C, i), lo = lum(O, i);
          const changed = Math.abs(lo - lc) > 1e-4;
          if (changed) blended++;
          if (!outN) continue;
          mixed++;
          if (lo >= 0.999) invalid++;
          if (!changed) continue;
          mixedChanged++;
          const ec = expand(lc), eo = expand(lo);
          const ratio = eo / Math.max(ec, 1e-4);
          if (ratio > 2) over2++;
          if (ratio > 4) over4++;
          if (ratio < 0.5) under05++;
          if (ratio > maxRatio) { maxRatio = ratio; maxRatioAt = [x, H - 1 - y, +lc.toFixed(3), +lo.toFixed(3), +ec.toFixed(3), +eo.toFixed(3)]; }
          const yy = H - 1 - y;
          rows.set(yy, (rows.get(yy) || 0) + 1);
        }
      // the region's boundary: rows where the horizon half-plane changes sign at the frame centre
      stats.push({ band, blended, mixed, mixedChanged, invalid, over2, over4, under05, maxRatio: +maxRatio.toFixed(3), maxRatioAt, mixedRows: [...rows.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6), weight: u.uHistW.value, excActive: !(e[2] === -1 && e[5] === -1 && e[8] === -1) });
      return o;
    };
    const p0 = ptr(0);
    h.debug.pointer(p0[0], p0[1]);
    h.debug.settle(6);
    for (let i = 0; i < frames; i++) {
      const p = ptr(i);
      h.debug.pointer(p[0], p[1]);
      cap = i >= 10 && i % every === 0;
      h.frame(1 / 60, false);
      if (i % 20 === 19) await new Promise((r) => setTimeout(r, 0));
    }
    cap = false;
    return { stats, main: [h.pipeline.main.width, h.pipeline.main.height] };
  }, [pathName, frames, every]);
  await ctx.close();
} catch (e) {
  logs.push("error " + e.message);
} finally {
  let summ = null;
  if (res && res.stats) {
    const S = res.stats.filter((s) => !s.skipped);
    const sum = (k) => S.reduce((a, s) => a + s[k], 0);
    summ = { frames: S.length, band: sum("band"), blended: sum("blended"), mixed: sum("mixed"), mixedChanged: sum("mixedChanged"), invalid: sum("invalid"), over2: sum("over2"), over4: sum("over4"), under05: sum("under05"), maxRatio: Math.max(...S.map((s) => s.maxRatio)), worst: S.reduce((a, s) => (s.maxRatio > (a?.maxRatio ?? 0) ? s : a), null), excActiveFrames: S.filter((s) => s.excActive).length };
  }
  const o = { port, vw, vh, path: pathName, qs, main: res?.main, summ, logs, err: res?.error };
  console.log(JSON.stringify(o, null, 1));
  if (out) fs.writeFileSync(out, JSON.stringify({ ...o, stats: res?.stats }, null, 1));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
