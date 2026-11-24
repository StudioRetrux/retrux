// Judge (G10): the AA3 lab and the BASE lab in Playwright WebKit / Firefox (desktop, headless): console / shader errors, the
// detected tier and GPU string, whether the lake-edge TAA runs, and the final frame after a deterministic medium sweep (the
// engine's RAF disabled, one __hero.frame(1/60) per step), saved as raw RGBA for crops vs BASE in the same engine.
//   node g10x.mjs --engine webkit|firefox --outdir DIR [--frames 60] [--qs ...]
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
// playwright-core 1.65.1 matches the installed webkit-2388 / firefox-1572 builds (the rig's 1.49.1 wants 2104 / 1466).
const pw = createRequire("/Users/muhamadrifaldi/RetruxR11Work/pw165/package.json")("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const engine = arg("engine", "webkit"), outdir = arg("outdir", "."), frames = +arg("frames", "60"), qs = arg("qs", "");
fs.mkdirSync(outdir, { recursive: true });
const bt = engine === "firefox" ? pw.firefox : engine === "chrome" ? pw.chromium : pw.webkit;
const launchOpts = { headless: true };
if (engine === "chrome") Object.assign(launchOpts, { executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
if (engine === "firefox") launchOpts.firefoxUserPrefs = { "webgl.force-enabled": true, "webgl.disabled": false, "layers.acceleration.force-enabled": true };
const browser = await bt.launch(launchOpts);
const results = [];
try {
  for (const r of [{ name: "lane", port: 5197 }, { name: "base", port: 5182 }]) {
    const logs = [];
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => logs.push("pageerror " + e.message));
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning" || m.type() === "warn") logs.push(`console.${m.type()} ${m.text().slice(0, 400)}`); });
    await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
    const t0 = Date.now();
    let ok = true;
    await page.goto(`http://localhost:${r.port}/?debug=1&scale=${arg("scale", "1")}${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
    try {
      await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1" || document.documentElement.dataset.heroFailed === "1", null, { timeout: 300000 });
    } catch (e) { ok = false; logs.push("timeout " + e.message.slice(0, 100)); }
    const loadMs = Date.now() - t0;
    const info = await page.evaluate(() => {
      const h = window.__hero;
      if (!h) return { noHero: true, failed: document.documentElement.dataset.heroFailed === "1" };
      const gl = h.renderer.getContext();
      return { failed: document.documentElement.dataset.heroFailed === "1", ready: h.state.ready, tier: h.state.tier, gpu: h.gpu, webgl2: typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext, ua: navigator.userAgent, maxSamples: gl.getParameter(gl.MAX_SAMPLES), extCBF: !!gl.getExtension("EXT_color_buffer_float"), extMSRTT: !!gl.getExtension("WEBGL_multisampled_render_to_texture") || !!gl.getExtension("EXT_multisampled_render_to_texture"), envEdge: !!h.envEdge, taaEnabled: !!(h.envEdge && h.envEdge.taa), mirror: !!h.lakeMirror, mirrorEvery: h.lakeSched ? h.lakeSched.mirrorEvery : null, precision: h.renderer.capabilities.precision, fhp: (() => { const f = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT); return f ? [f.rangeMin, f.rangeMax, f.precision] : null; })() };
    });
    let shot = null;
    if (ok && info.ready) {
      shot = await page.evaluate(async (frames) => {
        const h = window.__hero;
        const gl = h.renderer.getContext();
        const S = Math.sin, P = Math.PI * 2;
        h.debug.pointer(0, 0);
        h.debug.settle(6);
        const tf = [];
        for (let i = 0; i < frames; i++) {
          h.debug.pointer(0.8 * S((P * i) / 60 / 8 * 4), 0.25 * S((P * i) / 60 / 11 * 4));
          const t0 = performance.now();
          h.frame(1 / 60, false);
          tf.push(performance.now() - t0);
          if (i % 10 === 9 && i < frames - 1) await new Promise((r) => setTimeout(r, 0));
        }
        const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
        const px = new Uint8Array(W * H * 4);
        h.renderer.setRenderTarget(null);
        gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const err = gl.getError();
        let s = 0;
        for (let i = 0; i < px.length; i += 4) s += px[i] + px[i + 1] + px[i + 2];
        const b64 = (() => { let bin = ""; for (let i = 0; i < px.length; i += 0x8000) bin += String.fromCharCode.apply(null, px.subarray(i, i + 0x8000)); return btoa(bin); })();
        return { W, H, mean: s / (W * H * 3), glError: err, taa: h.envEdge && h.envEdge.taaState ? h.envEdge.taaState : null, frameMsMed: tf.sort((a, b) => a - b)[tf.length >> 1], b64 };
      }, frames);
      const raw = Buffer.from(shot.b64, "base64");
      delete shot.b64;
      fs.writeFileSync(path.join(outdir, `${engine}_${r.name}.rgba.z`), zlib.deflateSync(raw));
      await page.screenshot({ path: path.join(outdir, `${engine}_${r.name}_screenshot.png`) });
    }
    await ctx.close();
    results.push({ engine, name: r.name, loadMs, info, shot, logs });
    console.log(JSON.stringify({ engine, name: r.name, loadMs, info, shot, logs: logs.slice(0, 8) }));
  }
} catch (e) {
  console.log("error " + e.message);
} finally {
  fs.writeFileSync(path.join(outdir, `${engine}.json`), JSON.stringify(results, null, 1));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
