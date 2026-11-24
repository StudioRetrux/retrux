// rejudge_p4ice (copied from judge_p4ice): consecutive 60 fps frames (engine RAF loop disabled, h.frame(1/60) stepped) for crawl / boil checks.
//   node seq.mjs --port 5175 --out DIR [--qs ""] --n 10
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port"), out = arg("out"), qs = arg("qs", ""), N = +arg("n", "10");
fs.mkdirSync(out, { recursive: true });
const X0 = 300, Y0 = 30, CW = 840, CH = 550;
const SEQS = [
  ["hold", "expand", 2.37, null],   // p05 tumble
  ["sus", "expand", 2.97, null],    // p06 sustain
  ["eye", null, 0, 1.5],            // q03 idle
  ["rest", null, 0, 0.0],           // q00 idle
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
  for (const [name, ph, t, tau] of SEQS) {
    await page.evaluate(([ph, t, tau]) => {
      const h = window.__hero; h.debug.pointer(0, 0); h.debug.freeze(false);
      if (ph === "expand") { h.debug.pose(ph, 0); h.debug.settle(0.1); h.debug.pose(ph, t); h.debug.settle(1.6); }
      else { h.debug.pose(null, 0); h.debug.settle(2.5); h.rings.tau = tau; }
    }, [ph, t, tau]);
    for (let i = 0; i < N; i++) {
      const b64 = await page.evaluate(([X0, Y0, CW, CH]) => {
        const h = window.__hero; const r = h.renderer; const gl = r.getContext();
        h.frame(1 / 60, false);
        r.setRenderTarget(null);
        const H = gl.drawingBufferHeight; const px = new Uint8Array(CW * CH * 4);
        gl.readPixels(X0, H - Y0 - CH, CW, CH, gl.RGBA, gl.UNSIGNED_BYTE, px);
        let s = ""; const CH2 = 0x8000; for (let k = 0; k < px.length; k += CH2) s += String.fromCharCode.apply(null, px.subarray(k, k + CH2));
        return btoa(s);
      }, [X0, Y0, CW, CH]);
      fs.writeFileSync(path.join(out, `${name}_${String(i).padStart(2, "0")}.rgba`), Buffer.from(b64, "base64"));
    }
  }
} catch (e) { logs.push("ERROR " + e.message); }
finally { fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n")); console.log(logs.slice(0, 5).join("\n")); await browser.close(); }
