// Frame-rate A/B of the ice-behind-ice split (T1 at a locked scale), alternating off / on, plus the ring
// vertex count. Relative numbers only (this laptop is a T0 machine and throttles).
import { createRequire } from "node:module";
const require = createRequire("E:/Retrux Hero R&D/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const query = process.argv[2] || "tier=T1&scale=0.6";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  await page.goto(`http://localhost:5173/?${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.waitForTimeout(4000);
  const verts = await page.evaluate(() => {
    let v = 0, m = 0;
    window.__hero.rings.root.traverse((o) => { if (o.isMesh) { m++; v += o.geometry.attributes.position.count; } });
    return { meshes: m, vertices: v };
  });
  console.log("rings:", JSON.stringify(verts));
  const measure = () =>
    page.evaluate(
      () =>
        new Promise((res) => {
          let n = 0;
          const t0 = performance.now();
          const tick = () => {
            n++;
            if (performance.now() - t0 < 2500) requestAnimationFrame(tick);
            else res(+((n * 1000) / (performance.now() - t0)).toFixed(1));
          };
          requestAnimationFrame(tick);
        }),
    );
  const res = { off: [], on: [] };
  for (let i = 0; i < 3; i++) {
    for (const on of [false, true]) {
      await page.evaluate((v) => { window.__hero.pipeline.profile.iceBehindIce = v; }, on);
      await page.waitForTimeout(300);
      res[on ? "on" : "off"].push(await measure());
    }
  }
  const avg = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
  console.log("off", res.off.join(" "), "avg", avg(res.off));
  console.log("on ", res.on.join(" "), "avg", avg(res.on));
} finally {
  await browser.close();
}
