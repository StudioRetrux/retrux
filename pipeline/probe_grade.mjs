// Rest pose (tau 0), one screenshot per plate-grade setting: node probe_grade.mjs <outDir> "a,p,b;a,p,b;..."
import { createRequire } from "node:module";
const require = createRequire("E:/Retrux Hero R&D/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const out = process.argv[2];
const sets = process.argv[3].split(";").map((s) => s.split(",").map(Number));
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  await page.goto("http://localhost:5173/?tier=T1&scale=1&debug=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => {
    const h = window.__hero;
    h.debug.settle(6);
    h.debug.pose(null);
    h.debug.settle(2.5);
    h.rings.clock = 0;
    h.debug.freeze(true);
  });
  for (const [a, p, b] of sets) {
    await page.evaluate(([a, p, b]) => window.__hero.env.occlusion.uPlateGrade.value.set(a, p, b), [a, p, b]);
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${out}/grade_${a}_${p}_${b}.png` });
    console.log(`${out}/grade_${a}_${p}_${b}.png`);
  }
} finally {
  await browser.close();
}
