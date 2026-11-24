// verify_int1: T0 phone frame at a later session time (settle 90 s + 6 s + 20 frames), read back from the GL buffer.  node t0shot.mjs <port> <out.png> [qs]
import { createRequire } from "node:module";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [port, out, qs] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=T0&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  const r = await page.evaluate(() => {
    const h = window.__hero; const gl = h.renderer.getContext();
    h.debug.settle(90); h.debug.pointer(0, 0); h.debug.settle(6);
    for (let i = 0; i < 20; i++) { h.debug.pointer(0.8 * Math.sin((2 * Math.PI * i) / 60), 0.2 * Math.sin((2 * Math.PI * i) / 80)); h.frame(1 / 60, false); }
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const fb = new Uint8Array(W * H * 4);
    h.renderer.setRenderTarget(null); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, fb);
    let bin = ""; const CH = 0x8000; for (let i = 0; i < fb.length; i += CH) bin += String.fromCharCode.apply(null, fb.subarray(i, i + CH));
    return { W, H, b64: btoa(bin), t: h.state.time };
  });
  const fb = Buffer.from(r.b64, "base64"); const W = r.W, H = r.H; const raw = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = ((H - 1 - y) * W + x) * 4, d = (y * W + x) * 3; raw[d] = fb[a]; raw[d + 1] = fb[a + 1]; raw[d + 2] = fb[a + 2]; }
  fs.writeFileSync(out + ".rgb", raw);
  execFileSync("/opt/homebrew/bin/ffmpeg", ["-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", W + "x" + H, "-i", out + ".rgb", out]); fs.unlinkSync(out + ".rgb");
  console.log(out, W, H, "t", r.t);
} finally { await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]); process.exit(0); }
