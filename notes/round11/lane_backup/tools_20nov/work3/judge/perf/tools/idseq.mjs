// Judge (G8 / G9): per-frame identity of the final image over a scripted sequence (sweep, stop > TAA tail, press-and-hold,
// release, sweep), plus the lake / hero-reflection / main HDR targets and every linked program's attached sources at the end.
// Desktop: debug pointer for motion, mouse PointerEvents for the press. --mobile: 390x844 DPR 3 touch emulation, T0, touch
// PointerEvents (pointerType "touch") for motion and press. Deterministic: the engine's RAF is disabled, one frame per step.
//   node idseq.mjs --port 5181 [--qs ...] [--tier T1] [--mobile] [--vw 1440 --vh 766] --out FILE
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const mobile = argv.includes("--mobile");
const port = arg("port", "5181"), qs = arg("qs", ""), out = arg("out", "");
const tier = arg("tier", mobile ? "T0" : "T1");
const scale = arg("scale", "1");
const vw = +arg("vw", mobile ? "390" : "1440"), vh = +arg("vh", mobile ? "844" : "766");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
let res = null;
try {
  const ctx = await browser.newContext(mobile ? { viewport: { width: vw, height: vh }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 300)}`); });
  if (argv.includes("--dbgtouch")) await page.addInitScript(() => { window.__dbgTouch = true; });
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=${tier}${scale !== "none" ? "&scale=" + scale : ""}&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  res = await page.evaluate(async (mobile) => {
    const h = window.__hero;
    const r = h.renderer;
    const gl = r.getContext();
    const fnv = (u8) => {
      let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995;
      for (let i = 0; i < u8.length; i++) { a ^= u8[i]; a = Math.imul(a, 0x01000193); b ^= u8[i] ^ (i & 255); b = Math.imul(b, 0x01000193); }
      return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
    };
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    const fb = new Uint8Array(W * H * 4);
    const cv = document.querySelector("[data-hero-canvas]");
    const rect = cv.getBoundingClientRect();
    const ev = (type, nx, ny) => {
      const x = rect.left + ((nx + 1) / 2) * rect.width, y = rect.top + ((1 - ny) / 2) * rect.height;
      cv.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0, buttons: type === "pointerup" ? 0 : 1, pointerType: mobile ? "touch" : "mouse", isPrimary: true, pointerId: 1 }));
    };
    const sweep = (i) => [0.7 * Math.sin((2 * Math.PI * i) / 70), 0.3 * Math.sin((2 * Math.PI * i) / 95)];
    h.debug.pointer(0, 0);
    h.debug.settle(6);
    if (mobile && !window.__dbgTouch) h.debug.pointer(null);
    const hashes = [];
    const taa = [];
    const N = 340;
    let last = [0, 0];
    for (let i = 0; i < N; i++) {
      if (i < 60 || i >= 300) {
        last = sweep(i);
        if (mobile && !window.__dbgTouch) ev("pointermove", last[0], last[1]); else h.debug.pointer(last[0], last[1]);
      } else if (i === 100) ev("pointerdown", 0.1, 0.05);
      else if (i === 220) ev("pointerup", 0.1, 0.05);
      h.frame(1 / 60, false);
      r.setRenderTarget(null);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, fb);
      hashes.push(fnv(fb));
      taa.push(h.envEdge && h.envEdge.taaState ? h.envEdge.taaState.weight : null);
      if (i % 20 === 19) await new Promise((res) => setTimeout(res, 0));
    }
    const targets = {};
    const readT = (name, t) => {
      if (!t) return;
      const w = t.width, hh = t.height;
      const buf = t.texture.type === 1015 ? new Float32Array(w * hh * 4) : new Uint16Array(w * hh * 4);
      try { r.readRenderTargetPixels(t, 0, 0, w, hh, buf); targets[name] = { w, h: hh, hash: fnv(new Uint8Array(buf.buffer)) }; } catch (e) { targets[name] = { err: String(e) }; }
    };
    readT("mirror", h.lakeMirror?.target);
    readT("walk", h.water?.walkTarget);
    readT("cache", h.water?.cacheTarget);
    readT("cacheN", h.water?.cacheNTarget);
    readT("reflection", h.pipeline.reflection);
    readT("main", h.pipeline.main);
    readT("refraction", h.pipeline.refraction);
    const programs = {};
    for (const p of r.info.programs || []) {
      const sh = gl.getAttachedShaders(p.program) || [];
      const src = sh.map((s) => gl.getShaderSource(s)).join("\n//----\n");
      const key = p.name + "|" + p.type;
      (programs[key] = programs[key] || []).push(fnv(new TextEncoder().encode(src)));
    }
    for (const k in programs) programs[k].sort();
    return { W, H, tier: h.state.tier, scale: h.state.renderScale, main: [h.pipeline.main.width, h.pipeline.main.height], hashes, taa, targets, programs, counts: h.lakeSched ? { ...h.lakeSched.counts } : null, envEdge: !!h.envEdge, taaOn: !!(h.envEdge && h.envEdge.taa), mirrorEvery: h.lakeSched ? h.lakeSched.mirrorEvery : null };
  }, mobile);
} catch (e) {
  logs.push("ERROR " + e.message);
} finally {
  const o = { port, qs, tier, mobile, logs, ...res };
  if (out) fs.writeFileSync(out, JSON.stringify(o, null, 1));
  console.log(JSON.stringify({ port, qs, tier, mobile, W: res?.W, H: res?.H, tierGot: res?.tier, main: res?.main, envEdge: res?.envEdge, taaOn: res?.taaOn, mirrorEvery: res?.mirrorEvery, counts: res?.counts, nprog: res ? Object.keys(res.programs).length : 0, logs: logs.slice(0, 5) }));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
