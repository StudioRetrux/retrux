// CPU time of a mirror pass (no sync) with the scene as is vs the non-ENV top-level groups hidden; scene object counts.
import { createRequire } from "node:module";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 766 } })).newPage();
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${process.argv[2] || 5195}/?tier=T1&scale=1&debug=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  const r = await page.evaluate(() => {
    const h = window.__hero, R = h.renderer, gl = R.getContext(), px = new Uint8Array(4);
    h.debug.pointer(0.3, 0); h.debug.settle(6);
    for (let i = 0; i < 10; i++) { h.debug.pointer(0.3 + i * 0.02, 0); h.frame(1 / 60, false); }
    const top = h.scene.children.map((c) => { let n = 0, env = 0; c.traverse((o) => { n++; if (o.layers.mask & 2) env++; }); return { name: c.name || c.type, n, env, mask: c.layers.mask, vis: c.visible }; });
    const sync = () => { R.setRenderTarget(null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
    const cam = h.rig.camera;
    const run = (n) => { const a = []; for (let k = 0; k < n; k++) { const t = performance.now(); h.lakeMirror.render(R, h.scene, cam, 0, 1, h.lakeMirrorPass, true); a.push(performance.now() - t); if (k % 5 === 4) sync(); } a.sort((x, y) => x - y); return +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(3); };
    const res = {};
    for (let rep = 0; rep < 3; rep++) {
      (res.asis = res.asis || []).push(run(40));
      const hidden = h.scene.children.filter((c) => { let env = false; c.traverse((o) => { if (o.layers.mask & 2) env = true; }); return !env && c.visible; });
      for (const c of hidden) c.visible = false;
      (res.hiddenNonEnv = res.hiddenNonEnv || []).push(run(40));
      for (const c of hidden) c.visible = true;
      res.hiddenCount = hidden.length;
    }
    return { top, res };
  });
  console.log(JSON.stringify(r));
} catch (e) { console.log("ERR", e.message); } finally { await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]); process.exit(0); }
