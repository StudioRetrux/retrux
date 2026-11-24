// Frame-time A/B at a locked render scale: toggles features at runtime and measures fps for each.
import { createRequire } from "node:module";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const query = process.argv[2] || "tier=T0&scale=0.65";
const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
  args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  await page.goto(`${(process.env.LAB || "http://localhost:5173")}/?${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.waitForTimeout(5000);
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
  const set = (code) => page.evaluate(code);
  const results = [];
  results.push(["all on", await measure()]);
  await set(() => (window.__hero.env.occlusion.uPlateDepthOn.value = 0));
  results.push(["plate occlusion/rim off", await measure()]);
  await set(() => (window.__hero.env.occlusion.uPlateDepthOn.value = 1));
  await set(() => (window.__hero.water.material.uniforms.uReflectionOn.value = 0));
  results.push(["hero reflection off", await measure()]);
  await set(() => (window.__hero.water.material.uniforms.uReflectionOn.value = 1));
  await set(() => { window.__hero.water.mesh = null; window.__hero.water.group.visible = false; });
  results.push(["lake hidden", await measure()]);
  await set(() => (window.__hero.water.group.visible = true));
  await set(() => (window.__hero.rings.root.visible = false));
  results.push(["rings hidden", await measure()]);
  await set(() => (window.__hero.rings.root.visible = true));
  await set(() => (window.__hero.env.group.visible = false));
  results.push(["plate proxies hidden", await measure()]);
  await set(() => (window.__hero.env.group.visible = true));
  await set(() => (window.__hero.orb.mesh.visible = false));
  results.push(["orb hidden", await measure()]);
  await set(() => (window.__hero.orb.mesh.visible = true));
  await set(() => (window.__hero.shards.mesh.visible = false));
  results.push(["shards hidden", await measure()]);
  await set(() => (window.__hero.shards.mesh.visible = true));
  results.push(["all on (again)", await measure()]);
  const info = await page.evaluate(() => ({ gl: document.querySelector("canvas").width + "x" + document.querySelector("canvas").height, scale: window.__hero.state.renderScale, tier: window.__hero.profile.tier }));
  console.log(JSON.stringify(info));
  for (const [k, v] of results) console.log(`${k.padEnd(26)} ${v} fps`);
} finally {
  await browser.close();
}
