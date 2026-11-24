// Time series of the far-floe crop (x 150-320, y 480-530 of 1440x766) over the g10x sweep: lane, lane?slabflash=0, BASE.
// Deterministic (engine RAF disabled), one frame per step, the crop read with gl.readPixels right after each frame.
//   node blockseq.mjs --out DIR [--frames 120]
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const outdir = arg("out", "."), frames = +arg("frames", "120");
fs.mkdirSync(outdir, { recursive: true });
const X0 = 150, Y0 = 480, X1 = 320, Y1 = 530, W = X1 - X0, H = Y1 - Y0;
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const r of [{ name: "lane", port: 5181, qs: "" }, { name: "lane_sf0", port: 5181, qs: "slabflash=0" }, { name: "base", port: 5182, qs: "" }]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const logs = [];
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text().slice(0, 200)); });
    await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
    await page.goto(`http://localhost:${r.port}/?debug=1&scale=1&tier=T1${r.qs ? "&" + r.qs : ""}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
    const b64 = await page.evaluate(async ([frames, X0, Y0, W, H]) => {
      const h = window.__hero;
      const gl = h.renderer.getContext();
      const S = Math.sin, P = Math.PI * 2;
      h.debug.pointer(0, 0);
      h.debug.settle(6);
      const all = new Uint8Array(frames * W * H * 4);
      const buf = new Uint8Array(W * H * 4);
      const yGl = gl.drawingBufferHeight - (Y0 + H);
      for (let i = 0; i < frames; i++) {
        h.debug.pointer(0.8 * S((P * i) / 60 / 8 * 4), 0.25 * S((P * i) / 60 / 11 * 4));
        h.frame(1 / 60, false);
        h.renderer.setRenderTarget(null);
        gl.readPixels(X0, yGl, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        all.set(buf, i * W * H * 4);
        if (i % 20 === 19) await new Promise((res) => setTimeout(res, 0));
      }
      let bin = "";
      for (let i = 0; i < all.length; i += 0x8000) bin += String.fromCharCode.apply(null, all.subarray(i, i + 0x8000));
      return btoa(bin);
    }, [frames, X0, Y0, W, H]);
    fs.writeFileSync(path.join(outdir, `${r.name}.seq.z`), zlib.deflateSync(Buffer.from(b64, "base64")));
    console.log(r.name, "done", logs.length, "logs");
    await ctx.close();
  }
} finally {
  fs.writeFileSync(path.join(outdir, "meta.json"), JSON.stringify({ X0, Y0, W, H, frames }));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
