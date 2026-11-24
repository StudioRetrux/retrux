// AA8 tip: lake debug renders at chosen frames of a jcap case (gov with --noscale, holdre, or a cap.mjs path), one variant.
//   node dbgj.mjs --case gov|holdre|medium|reverse|slow|fast|diag|leave --port 5198 --qs "lkhalf=0&tipdbg=1" --ks 70,74 --modes 12,13,14,15,16 --crop x0,y0,x1,y1 --out DIR [--noscale]
// DIR/kNNNN_mM.bin = zlib(float32 RGBA crop of the main HDR target right after the env pass, top-down); kNNNN_final.bin = RGBA8 crop.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const CASE = arg("case"), OUT = arg("out"), port = arg("port", "5198"), qs = arg("qs", "");
const ks = arg("ks").split(",").map(Number), modes = arg("modes", "12,13,14,15,16").split(",").map(Number);
const crop = arg("crop", "40,470,360,540").split(",").map(Number);
const noscale = argv.includes("--noscale");
fs.mkdirSync(OUT, { recursive: true });
const lin = (a, b, u) => a + (b - a) * Math.min(1, Math.max(0, u));
function caseAt(i) {
  const t = i / 60, S = Math.sin, P = Math.PI * 2;
  switch (CASE) {
    case "holdre": { const ev = i === 10 ? "down" : i === 110 ? "up" : i === 135 ? "down" : i === 215 ? "up" : null; return { p: [0.15, 0.1], ev }; }
    case "gov": {
      const p = [0.9 * Math.sin(i / 8), 0.25 * Math.sin(i / 11)];
      const sc = i === 25 ? 0.9 : i === 50 ? 0.8 : i === 75 ? 0.7 : i === 100 ? 1 : 0;
      return sc ? { p, act: { scale: sc } } : { p };
    }
    case "slow": return { p: [0.5 * S((P * t) / 20), 0.1 * S((P * t) / 27)] };
    case "medium": return { p: [0.8 * S((P * t) / 8), 0.25 * S((P * t) / 11)] };
    case "fast": return { p: [1.0 * S((P * t) / 2.5), 0.4 * S((P * t) / 3.3)] };
    case "reverse": { const u = (t % 2) / 2; const tri = u < 0.5 ? u * 4 - 1 : 3 - u * 4; return { p: [0.9 * tri, 0] }; }
    default: throw new Error("case " + CASE);
  }
}
const PRE = +arg("pre", "20");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
const meta = { crop, modes, frames: [] };
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { const t = m.type(); if (t === "error" || t === "warning") logs.push(`console.${t} ${m.text().slice(0, 300)}`); });
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get() { return h; }, set(x) { h = x; x.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1" || document.documentElement.dataset.heroFailed === "1", null, { timeout: 240000 });
  await page.evaluate((crop) => {
    const h = window.__hero;
    const gl = h.renderer.getContext();
    const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
    const [cx0, cy0, cx1, cy1] = crop;
    const readRT = (rt) => {
      const W = rt.width, H = rt.height;
      const fb = h.renderer.properties.get(rt).__webglFramebuffer;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      const sc = W / gl.drawingBufferWidth;
      const a0 = Math.floor(cx0 * sc), a1 = Math.ceil(cx1 * sc), b0 = Math.floor(cy0 * sc), b1 = Math.ceil(cy1 * sc);
      const w = a1 - a0, hh = b1 - b0;
      const buf = new Float32Array(w * hh * 4);
      gl.readPixels(a0, H - b1, w, hh, gl.RGBA, gl.FLOAT, buf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const o = new Float32Array(buf.length);
      for (let y = 0; y < hh; y++) o.set(buf.subarray((hh - 1 - y) * w * 4, (hh - y) * w * 4), y * w * 4);
      return { w, h: hh, b64: b64(new Uint8Array(o.buffer)) };
    };
    const orig = h.hooks.afterEnv;
    window.__want = false;
    h.hooks.afterEnv = (main) => { if (window.__want) { window.__grab = readRT(main); window.__want = false; h.renderer.setRenderTarget(main); } if (orig) orig(main); };
    const renderOnly = () => { h.pipeline.render(h.scene, h.rig.camera, h.hooks, 0); h.post.render(h.pipeline.main.texture, h.postParams); };
    const readFinal = () => {
      h.renderer.setRenderTarget(null);
      const H = gl.drawingBufferHeight, w = cx1 - cx0, hh = cy1 - cy0;
      const buf = new Uint8Array(w * hh * 4);
      gl.readPixels(cx0, H - cy1, w, hh, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      const o = new Uint8Array(buf.length);
      for (let y = 0; y < hh; y++) o.set(buf.subarray((hh - 1 - y) * w * 4, (hh - y) * w * 4), y * w * 4);
      return { w, h: hh, b64: b64(o) };
    };
    window.__j = {
      pointer(p, ev) {
        h.debug.pointer(p[0], p[1]);
        if (ev === "down") window.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: innerWidth * 0.55, clientY: innerHeight * 0.45, pointerType: "mouse", bubbles: true }));
        if (ev === "up") window.dispatchEvent(new PointerEvent("pointerup", { button: 0, pointerType: "mouse", bubbles: true }));
      },
      scale(s) { h.adaptive._scale = s; h.resize(); },
      step(want, modes) {
        h.frame(1 / 60, false);
        if (!want) return null;
        const res = { final: readFinal(), modes: {} };
        const u = h.water.material.uniforms;
        for (const m of modes) { u.uLakeDebug.value = m; window.__want = true; renderOnly(); res.modes[m] = window.__grab; }
        u.uLakeDebug.value = 0;
        { const rt = h.lakeMirror.target; const fb = h.renderer.properties.get(rt).__webglFramebuffer; gl.bindFramebuffer(gl.FRAMEBUFFER, fb); const buf = new Float32Array(rt.width * rt.height * 4); gl.readPixels(0, 0, rt.width, rt.height, gl.RGBA, gl.FLOAT, buf); gl.bindFramebuffer(gl.FRAMEBUFFER, null); res.mirror = { w: rt.width, h: rt.height, b64: b64(new Uint8Array(buf.buffer)) }; }
        res.info = { msize: u.uEnvMirrorSize ? u.uEnvMirrorSize.value.toArray() : null, main: [h.pipeline.main.width, h.pipeline.main.height], scale: h.adaptive.scale, mcam: u.uMirrorCamPos ? u.uMirrorCamPos.value.toArray() : null };
        return res;
      },
    };
  }, crop);
  const c0 = caseAt(0);
  await page.evaluate((p) => { const h = window.__hero; h.debug.pointer(p[0], p[1]); h.debug.settle(6); }, c0.p);
  const last = Math.max(...ks);
  for (let i = -PRE; i <= last; i++) {
    const c = i < 0 ? caseAt(0) : caseAt(i);
    if (i >= 0 && c.act?.scale && !noscale) await page.evaluate((s) => window.__j.scale(s), c.act.scale);
    await page.evaluate(([p, ev]) => window.__j.pointer(p, ev), [c.p, i < 0 ? null : c.ev ?? null]);
    const want = i >= 0 && ks.includes(i);
    const r = await page.evaluate(([w, m]) => window.__j.step(w, m), [want, modes]);
    if (!r) continue;
    const kk = `k${String(i).padStart(4, "0")}`;
    const put = (o, name) => fs.writeFileSync(path.join(OUT, `${kk}_${name}.bin`), zlib.deflateSync(Buffer.from(o.b64, "base64"), { level: 1 }));
    put(r.final, "final");
    const fr = { k: i, info: r.info, dims: { final: [r.final.w, r.final.h] } };
    for (const m of Object.keys(r.modes)) { put(r.modes[m], "m" + m); fr.dims["m" + m] = [r.modes[m].w, r.modes[m].h]; }
    if (r.mirror) { put(r.mirror, "mirror"); fr.dims.mirror = [r.mirror.w, r.mirror.h]; }
    meta.frames.push(fr);
  }
} catch (e) {
  logs.push("ERROR " + (e.stack || e.message));
} finally {
  fs.writeFileSync(path.join(OUT, "dbg.json"), JSON.stringify(meta));
  fs.writeFileSync(path.join(OUT, "log.txt"), logs.join("\n"));
  console.log(`[dbgj] ${OUT}: ${meta.frames.length} frames; ${logs.length} log lines`);
  for (const l of logs.slice(0, 10)) console.log("  " + l);
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
