// Hold (p06) water streaks: same frozen pose with the projection-shadow fill on / off and the hero
// reflection on / off, cropped to the lake under the sculpture.
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire("E:/Retrux Hero R&D/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const out = process.argv[2];
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => console.log("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("console.error " + m.text().slice(0, 600)); });
  await page.goto("http://localhost:5173/?tier=T1&scale=1&debug=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => window.__hero.debug.settle(6));
  await page.evaluate(() => {
    const h = window.__hero;
    h.debug.freeze(false);
    h.debug.pose("expand", 0);
    h.debug.settle(0.1);
    h.debug.pose("expand", 2.97);
    h.debug.settle(1.6);
    h.debug.freeze(true);
  });
  const clip = { x: 560, y: 560, width: 680, height: 206 };
  const variants = [
    ["on", () => {}],
    ["occ_off", () => (window.__hero.env.occlusion.uPlateDepthOn.value = 0)],
    ["occ_off_refl_off", () => (window.__hero.water.material.uniforms.uReflectionOn.value = 0)],
  ];
  for (const [name, fn] of variants) {
    await page.evaluate(fn);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, `streak_${name}.png`), clip });
  }
} finally {
  await browser.close();
}

