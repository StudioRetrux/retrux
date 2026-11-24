import { createRequire } from "node:module";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const browser = await chromium.launch({ executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"), headless: true, args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  await page.goto(((process.env.LAB || "http://localhost:5173") + "/?tier=T1&scale=0.5&debug=1"), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  const r = await page.evaluate(() => {
    const h = window.__hero;
    h.debug.pose(null); h.debug.pointer(null); h.debug.settle(2.5); return null; });
  await page.waitForTimeout(1500);
  const r2 = await page.evaluate(() => { const h = window.__hero;
    const env = h.env;
    const out = { cam: h.rig.camera.position.toArray().map((v) => +v.toFixed(3)), plateCam: env.plateCamera.position.toArray().map((v) => +v.toFixed(3)), restMix: env.projectorBinding.uniforms.uRestMix.value };
    for (const p of env.projectors) {
      const P = Object.keys(p.uniforms).find((k) => k.endsWith("Mix"));
      out[p.key] = { pos: p.camera.position.toArray().map((v) => +v.toFixed(3)), mix: p.uniforms[P].value };
    }
    return out;
  });
  console.log(JSON.stringify(r2, null, 1));
} finally { await browser.close(); }

