import { createRequire } from "node:module";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
await page.goto(`http://localhost:5177/?tier=T1&scale=1&debug=1`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
const res = await page.evaluate(() => {
  const h = window.__hero;
  const out = {};
  const poses = { q00: [null, 0], p04: ["expand", 0.9], p05: ["expand", 2.37], p06: ["expand", 2.97], p07: ["release", 0.33], p08: ["release", 0.57] };
  for (const [k, [ph, t]] of Object.entries(poses)) {
    h.debug.freeze(false);
    if (ph === "expand") { h.debug.pose(ph, 0); h.debug.settle(0.1); }
    h.debug.pose(ph, t);
    h.debug.settle(ph ? 1.6 : 2.5);
    h.debug.freeze(true);
    const cam = h.rig.camera;
    cam.updateMatrixWorld();
    const C = cam.position.clone();
    const rows = {};
    for (const y of [480, 560, 640, 700, 730, 766]) {
      const v = new C.constructor((720 / 1440) * 2 - 1, 1 - (y / 766) * 2, 0.5).unproject(cam).sub(C).normalize();
      const tt = v.y < 0 ? (C.y - 0) / -v.y : -1;
      rows[y] = tt > 0 ? +tt.toFixed(2) : "sky";
    }
    out[k] = { cam: C.toArray().map((x) => +x.toFixed(2)), uHold: +(h.water?.material.uniforms.uHold.value ?? -1).toFixed(3), rows };
  }
  return out;
});
console.log(JSON.stringify(res, null, 0));
await browser.close();
