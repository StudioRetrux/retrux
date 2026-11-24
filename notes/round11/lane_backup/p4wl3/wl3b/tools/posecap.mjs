// judge: one stepped frame at a hold pose, read from the drawing buffer -> raw RGBA zlib (fNNNN.bin) + meta.json (fr.py format)
//   node posecap.mjs --port 5166 --qs "" --pose expand,2.97 --frames 20 --tier T1 --out DIR
import { createRequire } from "node:module";
import fs from "node:fs"; import zlib from "node:zlib";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port"), qs = arg("qs", ""), pose = arg("pose", ""), frames = +arg("frames", "20"), tier = arg("tier", "T1"), out = arg("out");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 })).newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text().slice(0, 200)); });
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=${tier}&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  const r = await page.evaluate(([frames, pose]) => {
    const h = window.__hero; const gl = h.renderer.getContext();
    h.debug.pointer(0, 0); h.debug.settle(6);
    if (pose) { const [ph, tt] = pose.split(","); h.debug.pose(ph, Number(tt)); }
    for (let i = 0; i < frames; i++) { h.debug.pointer(0.8 * Math.sin((2 * Math.PI * i) / 60), 0.2 * Math.sin((2 * Math.PI * i) / 80)); h.frame(1 / 60, false); }
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const buf = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return { W, H, b: btoa(s) };
  }, [frames, pose]);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(out + "/f0002.bin", zlib.deflateSync(Buffer.from(r.b, "base64")));
  fs.writeFileSync(out + "/meta.json", JSON.stringify({ W: r.W, H: r.H, y0: 0, y1: r.H, vw: 1440, vh: 766, info: [{}, {}, {}] }));
  console.log(`[posecap] ${out} ${r.W}x${r.H} logs ${logs.length} ${logs.join(" | ")}`);
} finally { await browser.close(); }
