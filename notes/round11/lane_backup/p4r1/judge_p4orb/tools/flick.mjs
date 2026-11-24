// judge p4orb: temporal flicker A/B of the crystals. Deterministic stepping (engine loop off), K consecutive frames at 1/60 s,
// hero crop read back; per pixel the temporal 2nd difference |f(t+1) - 2 f(t) + f(t-1)| (smooth motion ~0, flicker large),
// over crystal pixels (B - R >= 60 in any frame) and elsewhere. Saves raw crops for viewing.
//   node flick.mjs --port 5176 --qs "" --mode hold|rest --frames 16 --out DIR --tag lane
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port", "5176"), qs = arg("qs", ""), mode = arg("mode", "hold"), K = +arg("frames", "16"), out = arg("out", "."), tag = arg("tag", "x");
const X = +arg("x", "300"), Y = +arg("y", "80"), W = +arg("w", "840"), H = +arg("h", "600");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 200)}`); });
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  const frames = await page.evaluate(([mode, K, X, Y, W, H]) => {
    const h = window.__hero, gl = h.renderer.getContext();
    h.debug.pointer(0, 0);
    h.debug.settle(6);
    if (mode === "hold") { h.debug.pose("expand", 0); h.debug.settle(0.1); h.debug.pose("expand", 2.97); h.debug.settle(1.0); }
    else { h.debug.settle(0.5); }
    const res = [];
    const DH = gl.drawingBufferHeight;
    for (let i = 0; i < K; i++) {
      h.frame(1 / 60, false);
      h.renderer.setRenderTarget(null);
      const buf = new Uint8Array(W * H * 4);
      gl.readPixels(X, DH - Y - H, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      let s = "";
      for (let j = 0; j < buf.length; j += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(j, j + 0x8000));
      res.push(btoa(s));
    }
    return res;
  }, [mode, K, X, Y, W, H]);
  fs.mkdirSync(out, { recursive: true });
  frames.forEach((b, i) => fs.writeFileSync(`${out}/${tag}_${mode}_${String(i).padStart(2, "0")}.rgba`, Buffer.from(b, "base64")));
  fs.writeFileSync(`${out}/${tag}_${mode}_meta.json`, JSON.stringify({ X, Y, W, H, K, qs, port, logs }));
  console.log(JSON.stringify({ tag, mode, K, logs }));
} catch (e) {
  console.log("ERROR " + e.message);
} finally {
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
