// AA5b: lake debug renders at chosen frames of a cap.mjs path (same deterministic stepping as cap.mjs).
//   node dbgcap.mjs --port 5194 --out DIR --path medium --ks 51,52 --modes 0,7,8,9,11 [--crop x0,y0,x1,y1] [--qs ...] [--targets 1]
// DIR/kNNNN_mM.bin = zlib(float32 RGBA of the main HDR target right after the env pass, crop rows top-down)
// DIR/kNNNN_final.bin = zlib(RGBA8 of the drawing buffer crop, top-down); DIR/kNNNN_mirror.bin / _walk.bin = full float targets
// (top-down); DIR/dbg.json = meta (uniforms per frame).
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port", "5194"), out = arg("out"), pathName = arg("path", "medium"), qs = arg("qs", ""), pre = +arg("pre", pathName === "gov" ? "20" : "30");
const urlScale = arg("scale", "1");
const ks = arg("ks", "51,52").split(",").map(Number);
const modes = arg("modes", "0,7,8,9,11").split(",").map(Number);
const crop = arg("crop", "100,470,400,540").split(",").map(Number);
const wantTargets = arg("targets", "1") === "1";
const vw = +arg("vw", "1440"), vh = +arg("vh", "766");
fs.mkdirSync(out, { recursive: true });
function pointerAt(i) {
  const t = i / 60, S = Math.sin, P = Math.PI * 2;
  switch (pathName) {
    case "slow": return [0.5 * S((P * t) / 20), 0.1 * S((P * t) / 27)];
    case "medium": return [0.8 * S((P * t) / 8), 0.25 * S((P * t) / 11)];
    case "fast": return [1.0 * S((P * t) / 2.5), 0.4 * S((P * t) / 3.3)];
    case "reverse": { const u = (t % 2) / 2; const tri = u < 0.5 ? u * 4 - 1 : 3 - u * 4; return [0.9 * tri, 0]; }
    case "gov": { const j = Math.max(0, i - pre); return [0.9 * S(j / 8), 0.25 * S(j / 11)]; }
    default: throw new Error("path");
  }
}
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
const meta = { crop, modes, frames: [] };
try {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 300)}`); });
  await page.addInitScript(() => {
    let h = null;
    Object.defineProperty(window, "__hero", { configurable: true, get() { return h; }, set(v) { h = v; v.start = function () {}; } });
  });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=${urlScale}&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1" || document.documentElement.dataset.heroFailed === "1", null, { timeout: 240000 });
  await page.evaluate((crop) => {
    const h = window.__hero;
    const gl = h.renderer.getContext();
    const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
    const [cx0, cy0, cx1, cy1] = crop;
    const readRT = (rt, full) => {
      const W = rt.width, H = rt.height;
      const fb = h.renderer.properties.get(rt).__webglFramebuffer;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      let x0 = 0, y0 = 0, w = W, hh = H;
      if (!full) { const sc = W / gl.drawingBufferWidth; const a0 = Math.floor(cx0 * sc), a1 = Math.ceil(cx1 * sc), b0 = Math.floor(cy0 * sc), b1 = Math.ceil(cy1 * sc); x0 = a0; w = a1 - a0; y0 = H - b1; hh = b1 - b0; }
      const buf = new Float32Array(w * hh * 4);
      gl.readPixels(x0, y0, w, hh, gl.RGBA, gl.FLOAT, buf);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      // top-down
      const o = new Float32Array(buf.length);
      for (let y = 0; y < hh; y++) o.set(buf.subarray((hh - 1 - y) * w * 4, (hh - y) * w * 4), y * w * 4);
      return { w, h: hh, b64: b64(new Uint8Array(o.buffer)) };
    };
    const orig = h.hooks.afterEnv;
    window.__want = false;
    h.hooks.afterEnv = (main) => {
      if (window.__want) { window.__grab = readRT(main, false); window.__want = false; h.renderer.setRenderTarget(main); }
      if (orig) orig(main);
    };
    const renderOnly = () => { h.pipeline.render(h.scene, h.rig.camera, h.hooks, 0); h.post.render(h.pipeline.main.texture, h.postParams); };
    const readFinal = () => {
      h.renderer.setRenderTarget(null);
      const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
      const w = cx1 - cx0, hh = cy1 - cy0;
      const buf = new Uint8Array(w * hh * 4);
      gl.readPixels(cx0, H - cy1, w, hh, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      const o = new Uint8Array(buf.length);
      for (let y = 0; y < hh; y++) o.set(buf.subarray((hh - 1 - y) * w * 4, (hh - y) * w * 4), y * w * 4);
      return { w, h: hh, b64: b64(o) };
    };
    window.__step = (ptr, want, modes, targets) => {
      h.debug.pointer(ptr[0], ptr[1]);
      h.frame(1 / 60, false);
      if (!want) return null;
      const res = { final: readFinal(), modes: {} };
      const u = h.water.material.uniforms;
      for (const m of modes) {
        u.uLakeDebug.value = m;
        window.__want = true;
        renderOnly();
        res.modes[m] = window.__grab;
      }
      u.uLakeDebug.value = 0;
      if (targets) {
        res.mirror = readRT(h.lakeMirror.target, true);
        const wt = h.water.walkTarget;
        if (wt) res.walk = readRT(wt, true);
      }
      const cam = h.rig.camera;
      const U = (n) => (u[n] && u[n].value && u[n].value.toArray ? u[n].value.toArray() : u[n] ? u[n].value : null);
      res.info = { pos: cam.position.toArray(), quat: cam.quaternion.toArray(), proj: Array.from(cam.projectionMatrix.elements), mw: Array.from(cam.matrixWorld.elements),
        envVP: U("uEnvMirrorViewProj"), mcam: U("uMirrorCamPos"), walkVP: U("uLkWalkVP"), hgtG: U("uLkHgtG"), res: U("uResolution"), msize: U("uEnvMirrorSize"), mP: U("uMirrorP"),
        mirrorDrawn: h.lakeSched ? h.lakeSched.counts.mirror : -1 };
      return res;
    };
  }, crop);
  const p0 = pointerAt(0);
  await page.evaluate((p0) => { window.__hero.debug.pointer(p0[0], p0[1]); window.__hero.debug.settle(6); }, p0);
  const last = Math.max(...ks);
  for (let i = 0; i <= pre + last; i++) {
    const k = i - pre;
    const want = ks.includes(k);
    if (pathName === "gov") { const j = i - pre; const sc = j === 25 ? 0.9 : j === 50 ? 0.8 : j === 75 ? 0.7 : j === 100 ? 1 : 0; if (sc) await page.evaluate((s) => { const h = window.__hero; h.adaptive._scale = s; h.resize(); }, sc); }
    const r = await page.evaluate(([p, w, m, t]) => window.__step(p, w, m, t), [pointerAt(i), want, modes, wantTargets]);
    if (!r) continue;
    const kk = `k${String(k).padStart(4, "0")}`;
    const put = (o, name) => fs.writeFileSync(path.join(out, `${kk}_${name}.bin`), zlib.deflateSync(Buffer.from(o.b64, "base64"), { level: 1 }));
    put(r.final, "final");
    const fr = { k, info: r.info, dims: {} };
    for (const m of Object.keys(r.modes)) { put(r.modes[m], "m" + m); fr.dims["m" + m] = [r.modes[m].w, r.modes[m].h]; }
    if (r.mirror) { put(r.mirror, "mirror"); fr.dims.mirror = [r.mirror.w, r.mirror.h]; }
    if (r.walk) { put(r.walk, "walk"); fr.dims.walk = [r.walk.w, r.walk.h]; }
    fr.dims.final = [r.final.w, r.final.h];
    meta.frames.push(fr);
  }
} catch (e) {
  logs.push("ERROR " + (e.stack || e.message));
} finally {
  fs.writeFileSync(path.join(out, "dbg.json"), JSON.stringify(meta));
  fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n"));
  console.log(`[dbgcap] ${out}: ${meta.frames.length} frames; ${logs.length} log lines`);
  for (const l of logs.slice(0, 10)) console.log("  " + l);
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
