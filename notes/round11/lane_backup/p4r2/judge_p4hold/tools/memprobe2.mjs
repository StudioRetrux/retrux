// p4hold R8-2: JS memory of the page at rest after a forced GC (CDP Runtime.getHeapUsage: V8 heap used / array-buffer backing store),
// plus whether the engine holds the panorama.   node memprobe.mjs name=port[?qs] ...   (T1 1440x766, no ?debug: the product page)
import { createRequire } from "node:module";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const vars = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const v of vars) {
    const i0 = v.indexOf("="), name = v.slice(0, i0), spec = v.slice(i0 + 1);
    const [port, qs] = [spec.split("?")[0], spec.split("?").slice(1).join("?")];
    const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
    await page.goto(`http://localhost:${port}/?tier=T1&scale=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
    await page.waitForTimeout(5000);
    const cdp = await page.context().newCDPSession(page);
    const rows = [];
    for (let k = 0; k < 3; k++) {
      await cdp.send("HeapProfiler.collectGarbage");
      await page.waitForTimeout(400);
      const u = await cdp.send("Runtime.getHeapUsage");
      rows.push(u);
    }
    const pano = await page.evaluate(() => (window.__hero.panorama ? window.__hero.panorama.image.data.byteLength : 0));
    // judge: lose + restore the context, wait for the restore, GC again (does the reloaded panorama get released?)
    const ctxinfo = await page.evaluate(async () => {
      const h = window.__hero; const gl = h.renderer.getContext(); const ext = gl.getExtension("WEBGL_lose_context");
      const t0 = performance.now(); const T = h.time ?? null;
      ext.loseContext(); await new Promise((r) => setTimeout(r, 300)); ext.restoreContext();
      await new Promise((r) => setTimeout(r, 2500));
      return { lost: gl.isContextLost(), restoring: h.restoring ?? null, panoAfter: h.panorama ? h.panorama.image.data.byteLength : 0 };
    });
    const rows2 = [];
    for (let k = 0; k < 3; k++) { await cdp.send("HeapProfiler.collectGarbage"); await page.waitForTimeout(400); rows2.push(await cdp.send("Runtime.getHeapUsage")); }
    console.log(JSON.stringify({ name, afterRestore: ctxinfo, all2: rows2.map((r) => [r.usedSize, r.backingStorageSize]) }));
    const last = rows[rows.length - 1];
    console.log(JSON.stringify({ name, port, qs, panoHeld: pano, usedMB: +(last.usedSize / 1048576).toFixed(3), backingMB: last.backingStorageSize != null ? +(last.backingStorageSize / 1048576).toFixed(3) : null, embedderMB: last.embedderHeapUsedSize != null ? +(last.embedderHeapUsedSize / 1048576).toFixed(3) : null, all: rows.map((r) => [r.usedSize, r.backingStorageSize]) }));
    await page.close();
  }
} finally { await browser.close(); }
