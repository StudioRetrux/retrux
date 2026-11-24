// Draw calls / triangles per pass: the lake mirror pass vs the whole frame (renderer.info), and CPU time of a mirror draw.
import { createRequire } from "node:module";
const require = createRequire("/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide/pw/package.json");
const { chromium } = require("playwright-core");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 766 } })).newPage();
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${process.argv[2] || 5181}/?tier=T1&scale=1&debug=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  const r = await page.evaluate(() => {
    const h = window.__hero, R = h.renderer, gl = R.getContext();
    h.debug.pointer(0.3, 0); h.debug.settle(6);
    for (let i = 0; i < 10; i++) { h.debug.pointer(0.3 + i * 0.02, 0); h.frame(1 / 60, false); }
    R.info.autoReset = false;
    R.info.reset();
    h.debug.pointer(0.6, 0);
    h.frame(1 / 60, false);
    const frame = { calls: R.info.render.calls, tris: R.info.render.triangles };
    R.info.reset();
    const px = new Uint8Array(4);
    // CPU cost of 20 mirror draws (no sync) and with sync
    let t0 = performance.now();
    for (let i = 0; i < 20; i++) h.lakeMirror.render(R, h.scene, h.rig.camera, 0, 1, h.lakeMirrorPass, true);
    const cpu = (performance.now() - t0) / 20;
    const mirror = { calls: R.info.render.calls / 20, tris: R.info.render.triangles / 20 };
    R.setRenderTarget(null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    t0 = performance.now();
    for (let i = 0; i < 20; i++) h.lakeMirror.render(R, h.scene, h.rig.camera, 0, 1, h.lakeMirrorPass, true);
    R.setRenderTarget(null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const synced = (performance.now() - t0) / 20;
    let n = 0; h.scene.traverse(() => n++);
    R.info.autoReset = true;
    return { frame, mirror, mirrorCpuMs: +cpu.toFixed(3), mirrorWallMsSynced20: +synced.toFixed(3), sceneObjects: n };
  });
  console.log(JSON.stringify(r));
} finally { await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]); process.exit(0); }
