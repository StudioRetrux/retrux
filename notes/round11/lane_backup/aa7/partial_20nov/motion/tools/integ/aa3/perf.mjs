// Frame cost: deterministic frames (__hero.frame, the engine's RAF loop disabled), GPU time per frame from
// EXT_disjoint_timer_query_webgl2 (TIME_ELAPSED around the whole frame) and the wall time of the frame with a GPU sync
// (1-px readPixels). Interleaved sessions: --runs "lane=5181,base=5182" x --pairs N.
//   SLOT_BG=0 node perf.mjs --runs "A=5181|qs,B=5182|qs" --pairs 6 --path medium --frames 240 [--warm 60] [--out FILE]
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const runs = arg("runs").split(",").map((r) => { const [name, rest] = r.split("="); const [port, qs] = rest.split("|"); return { name, port, qs: qs || "" }; });
const pairs = +arg("pairs", "6"), frames = +arg("frames", "240"), warm = +arg("warm", "60"), pathName = arg("path", "medium");
const vw = +arg("vw", "1440"), vh = +arg("vh", "766"), dsf = +arg("dsf", "1"), tier = arg("tier", "T1");
const out = arg("out", "");
const batch = +arg("batch", "1");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const results = {};
const logs = [];
async function session(r) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dsf });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push(r.name + " pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`${r.name} console.${m.type()} ${m.text().slice(0, 200)}`); });
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${r.port}/?tier=${tier}&scale=1&debug=1${r.qs ? "&" + r.qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  const res = await page.evaluate(async ([frames, warm, pathName, batch]) => {
    const h = window.__hero;
    const gl = h.renderer.getContext();
    const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    const px = new Uint8Array(4);
    const S = Math.sin, P = Math.PI * 2;
    const ptr = (i) => {
      const t = i / 60;
      if (pathName === "medium") return [0.8 * S((P * t) / 8), 0.25 * S((P * t) / 11)];
      if (pathName === "fast") return [1.0 * S((P * t) / 2.5), 0.4 * S((P * t) / 3.3)];
      if (pathName === "slow") return [0.5 * S((P * t) / 20), 0.1 * S((P * t) / 27)];
      if (pathName === "rest") return null;
      if (pathName === "hold") return [0.15, 0.1];
      return [0, 0];
    };
    const p0 = ptr(0);
    if (p0) h.debug.pointer(p0[0], p0[1]); else h.debug.pointer(null);
    h.debug.settle(6);
    const wall = [], gpu = [];
    const pending = [];
    const poll = () => {
      while (pending.length) {
        const q = pending[0];
        if (!gl.getQueryParameter(q.q, gl.QUERY_RESULT_AVAILABLE)) break;
        const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
        const ns = gl.getQueryParameter(q.q, gl.QUERY_RESULT);
        if (!disjoint && q.i >= warm) gpu.push(ns / 1e6);
        gl.deleteQuery(q.q);
        pending.shift();
      }
    };
    for (let i = 0; i < warm + frames; i++) {
      const p = ptr(i);
      if (p) h.debug.pointer(p[0], p[1]); else { h.debug.pointer(null); h.state.pointer.active = false; }
      if (pathName === "hold" && i === warm) window.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: innerWidth * 0.55, clientY: innerHeight * 0.45, pointerType: "mouse", bubbles: true }));
      let q = null;
      if (ext) { q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); }
      if (i % batch === 0) window.__t0 = performance.now();
      h.frame(1 / 60, false);
      if (ext) gl.endQuery(ext.TIME_ELAPSED_EXT);
      if (i % batch === batch - 1) {
        h.renderer.setRenderTarget(null);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const t1 = performance.now();
        if (i >= warm) wall.push((t1 - window.__t0) / batch);
      }
      if (q) pending.push({ q, i });
      poll();
      if (i % 30 === 29) await new Promise((r) => setTimeout(r, 0));
    }
    for (let k = 0; k < 50 && pending.length; k++) { await new Promise((r) => setTimeout(r, 20)); poll(); }
    return { wall, gpu, hasExt: !!ext };
  }, [frames, warm, pathName, batch]);
  await ctx.close();
  return res;
}
try {
  for (let p = 0; p < pairs; p++) {
    const order = p % 2 ? [...runs].reverse() : runs;
    for (const r of order) {
      const s = await session(r);
      (results[r.name] = results[r.name] || []).push(s);
      const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
      console.log(`pair ${p} ${r.name}: wall med ${med(s.wall).toFixed(2)} ms, gpu med ${s.gpu.length ? med(s.gpu).toFixed(2) : "-"} ms (n ${s.gpu.length})`);
    }
  }
} finally {
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
  const q = (a, f) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(b.length * f))]; };
  const summ = {};
  for (const r of runs) {
    const ss = results[r.name] || [];
    const wm = ss.map((s) => med(s.wall)), gm = ss.map((s) => (s.gpu.length ? med(s.gpu) : NaN));
    const allW = ss.flatMap((s) => s.wall), allG = ss.flatMap((s) => s.gpu);
    summ[r.name] = { wallMedOfMeds: +med(wm).toFixed(3), gpuMedOfMeds: +med(gm).toFixed(3), wallP90: +q(allW, 0.9).toFixed(2), wallMax: +Math.max(...allW).toFixed(2), gpuP90: allG.length ? +q(allG, 0.9).toFixed(3) : null, gpuMax: allG.length ? +Math.max(...allG).toFixed(3) : null, perPair: { wall: wm.map((x) => +x.toFixed(2)), gpu: gm.map((x) => +x.toFixed(3)) } };
  }
  const base = runs[runs.length - 1].name;
  for (const r of runs) {
    const pr = summ[r.name].perPair, pb = summ[base].perPair;
    summ[r.name].ratioGpuPairs = pr.gpu.map((g, i) => +(g / pb.gpu[i]).toFixed(3));
    summ[r.name].ratioWallPairs = pr.wall.map((g, i) => +(g / pb.wall[i]).toFixed(3));
    summ[r.name].ratioGpuMed = +med(summ[r.name].ratioGpuPairs).toFixed(3);
    summ[r.name].ratioWallMed = +med(summ[r.name].ratioWallPairs).toFixed(3);
  }
  console.log(JSON.stringify(summ, null, 1));
  if (logs.length) console.log(logs.slice(0, 10).join("\n"));
  if (out) fs.writeFileSync(out, JSON.stringify({ summ, logs }, null, 1));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
