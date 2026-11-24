// (AA8 fixer copy: + --mobile = T0 phone context 390x844 DPR 3, touch)
// judge-perfcode: WebGL context loss + restore in STEPPED frames (the engine's rAF off): 20 moving frames, then (loss=1) lose and
// restore the context, then 4 more moving frames; each of those 4 final frames saved as raw RGBA (bottom-up). Compare a
// loss=1 run with a loss=0 run of the same lab / qs: what the restore leaves wrong, and for how many frames.
//   node ctxstep.mjs --port 5197 [--qs ...] --loss 1 --out PREFIX
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const mobile = argv.includes("--mobile");
const port = arg("port", "5197"), qs = arg("qs", ""), loss = arg("loss", "1") === "1", outp = arg("out", "ctx");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
let res = null;
try {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 200)}`); });
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=${mobile ? "T0" : "T1"}&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  await page.evaluate(() => {
    const h = window.__hero;
    h.debug.pointer(0, 0);
    h.debug.settle(6);
    window.__i = 0;
    window.__step = () => { const i = window.__i++; h.debug.pointer(0.8 * Math.sin((2 * Math.PI * i) / 60), 0.2 * Math.sin((2 * Math.PI * i) / 80)); h.frame(1 / 60, false); };
    for (let i = 0; i < 20; i++) window.__step();
  });
  if (loss) {
    await page.evaluate(() => new Promise((r) => { const c = window.__hero.renderer.domElement; window.__lc = window.__hero.renderer.getContext().getExtension("WEBGL_lose_context"); c.addEventListener("webglcontextlost", () => r(), { once: true }); window.__lc.loseContext(); }));
    await page.waitForTimeout(300);
    await page.evaluate(() => new Promise((r) => { const c = window.__hero.renderer.domElement; c.addEventListener("webglcontextrestored", () => r(), { once: true }); window.__lc.restoreContext(); }));
    await page.waitForTimeout(500);
  }
  res = await page.evaluate(() => {
    const h = window.__hero, gl = h.renderer.getContext();
    const out = [];
    for (let k = 0; k < 4; k++) {
      window.__step();
      const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, fb = new Uint8Array(W * H * 4);
      h.renderer.setRenderTarget(null);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, fb);
      let s = ""; for (let i = 0; i < fb.length; i += 0x8000) s += String.fromCharCode.apply(null, fb.subarray(i, i + 0x8000));
      out.push({ W, H, taa: h.envEdge?.taaState ?? null, lost: gl.isContextLost(), err: gl.getError(), raw: btoa(s) });
    }
    return out;
  });
  res.forEach((r, k) => { fs.writeFileSync(`${outp}_f${k}.rgba`, Buffer.from(r.raw, "base64")); delete r.raw; });
} catch (e) { logs.push("ERROR " + e.message); }
finally {
  console.log(JSON.stringify({ port, qs, loss, res, logs }));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
