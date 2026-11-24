// judge_p4ice3: deterministic posed frames (engine RAF disabled, h.frame(1/60) stepped, same sequence on every page),
// full 1440x766 final image read back as raw RGBA -> lane vs MAIN diffs show exactly the lane's effect.
//   node jpose.mjs --port 5175 --out DIR [--qs ""]
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port"), out = arg("out"), qs = arg("qs", "");
fs.mkdirSync(out, { recursive: true });
const POSES = [
  ["q00_rest", null, 0, 0], ["q01_loop15", null, 0, 0.5], ["q02_loop30", null, 0, 1.0], ["q03_eye", null, 0, 1.5],
  ["p04_expand_pop", "expand", 0.9, null], ["p05_expand", "expand", 2.37, null], ["p06_sustain", "expand", 2.97, null],
  ["p07_release_snap", "release", 0.33, null], ["p08_release_home", "release", 0.57, null],
];
const logs = [];
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 300)}`); });
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  await page.evaluate(() => { const h = window.__hero; h.debug.pointer(0, 0); h.debug.settle(6); });
  for (const [name, ph, t, tau] of POSES) {
    const b64 = await page.evaluate(([ph, t, tau]) => {
      const h = window.__hero; h.debug.pointer(0, 0); h.debug.freeze(false);
      if (ph === "expand") { h.debug.pose(ph, 0); h.debug.settle(0.1); h.debug.pose(ph, t); h.debug.settle(1.6); }
      else if (ph) { h.debug.pose(ph, t); h.debug.settle(1.6); }
      else { h.debug.pose(null, 0); h.debug.settle(2.5); h.rings.tau = tau; }
      for (let i = 0; i < 4; i++) h.frame(1 / 60, false);
      const r = h.renderer, gl = r.getContext(); r.setRenderTarget(null);
      const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const px = new Uint8Array(W * H * 4);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let s = ""; const C = 0x8000; for (let k = 0; k < px.length; k += C) s += String.fromCharCode.apply(null, px.subarray(k, k + C));
      return W + "x" + H + ":" + btoa(s);
    }, [ph, t, tau]);
    const i = b64.indexOf(":");
    fs.writeFileSync(path.join(out, `${name}_${b64.slice(0, i)}.rgba`), Buffer.from(b64.slice(i + 1), "base64"));
  }
} catch (e) { logs.push("ERROR " + e.message); }
finally { fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n")); console.log(logs.slice(0, 5).join("\n")); await browser.close(); }
