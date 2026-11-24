// AA4X: grabs the environment pass's resolve (main target right after the env pass: rgb, compressed below the horizon line,
// alpha = view distance) as float32 for chosen frames of a cap.mjs path, plus the camera; for offline edge analysis.
//   node hdrcap.mjs --port 5191 --out DIR --path medium --ks 100,101 [--qs ...] [--pre 30]
// DIR/eNNNN.bin = zlib(float32 RGBA, readPixels order: bottom-up rows), DIR/hdr.json = { W, H, frames: [{ k, pos, quat, proj, projInv, mw, aa }] }
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf("--" + k);
  return i < 0 ? d : argv[i + 1];
};
const port = arg("port", "5191"), out = arg("out"), pathName = arg("path", "medium"), qs = arg("qs", ""), pre = +arg("pre", "30");
const ks = arg("ks", "100").split(",").map(Number);
const vw = +arg("vw", "1440"), vh = +arg("vh", "766");
fs.mkdirSync(out, { recursive: true });
function pointerAt(i) {
  const t = i / 60, S = Math.sin, P = Math.PI * 2;
  switch (pathName) {
    case "slow": return [0.5 * S((P * t) / 20), 0.1 * S((P * t) / 27)];
    case "medium": return [0.8 * S((P * t) / 8), 0.25 * S((P * t) / 11)];
    case "fast": return [1.0 * S((P * t) / 2.5), 0.4 * S((P * t) / 3.3)];
    default: throw new Error("path");
  }
}
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
const meta = { frames: [] };
try {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 300)}`); });
  await page.addInitScript(() => {
    let h = null;
    Object.defineProperty(window, "__hero", { configurable: true, get() { return h; }, set(v) { h = v; v.start = function () {}; } });
  });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1" || document.documentElement.dataset.heroFailed === "1", null, { timeout: 240000 });
  await page.evaluate(() => {
    const h = window.__hero;
    const gl = h.renderer.getContext();
    const orig = h.hooks.afterEnv;
    window.__grab = null;
    h.hooks.afterEnv = (main) => {
      if (window.__want) {
        const W = main.width, H = main.height;
        const fb = h.renderer.properties.get(main).__webglFramebuffer;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        const buf = new Float32Array(W * H * 4);
        gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, buf);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        h.renderer.setRenderTarget(null);
        h.renderer.setRenderTarget(main);
        window.__grab = { W, H, buf };
        window.__want = false;
      }
      orig(main);
    };
    window.__step = (ptr, want) => {
      h.debug.pointer(ptr[0], ptr[1]);
      window.__want = want;
      h.frame(1 / 60, false);
      if (!want) return null;
      const g = window.__grab;
      const cam = h.rig.camera;
      const u8 = new Uint8Array(g.buf.buffer);
      let s = "";
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      const aa = h.pipeline.aa ? { plane: h.pipeline.aa.read.uAAPlane.value.toArray(), knee: h.pipeline.aa.read.uAAKnee.value } : null;
      return { W: g.W, H: g.H, b64: btoa(s), pos: cam.position.toArray(), quat: cam.quaternion.toArray(), proj: Array.from(cam.projectionMatrix.elements), projInv: Array.from(cam.projectionMatrixInverse.elements), mw: Array.from(cam.matrixWorld.elements), aa };
    };
  });
  const p0 = pointerAt(0);
  await page.evaluate((p0) => { window.__hero.debug.pointer(p0[0], p0[1]); window.__hero.debug.settle(6); }, p0);
  const last = Math.max(...ks);
  for (let i = 0; i <= pre + last; i++) {
    const k = i - pre;
    const want = ks.includes(k);
    const r = await page.evaluate(([p, w]) => window.__step(p, w), [pointerAt(i), want]);
    if (!r) continue;
    fs.writeFileSync(path.join(out, `e${String(k).padStart(4, "0")}.bin`), zlib.deflateSync(Buffer.from(r.b64, "base64"), { level: 1 }));
    delete r.b64;
    meta.W = r.W;
    meta.H = r.H;
    meta.frames.push({ k, ...r });
  }
} catch (e) {
  logs.push("ERROR " + (e.stack || e.message));
} finally {
  fs.writeFileSync(path.join(out, "hdr.json"), JSON.stringify(meta));
  fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n"));
  console.log(`[hdrcap] ${out}: ${meta.frames.length} frames; ${logs.length} log lines`);
  for (const l of logs.slice(0, 10)) console.log("  " + l);
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
