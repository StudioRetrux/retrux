// Ice behind ice A/B: for each pose, the hero crop with the split pass off and on (same frozen frame).
//   node probe_ibi.mjs <outDir> [tier=T1]
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const out = process.argv[2];
const tier = process.argv[3] || "T1";
// [name, phase, t, tau]
const POSES = [
  ["q00", null, 0, 0],
  ["q01", null, 0, 0.5],
  ["q02", null, 0, 1.0],
  ["q03", null, 0, 1.5],
  ["p06", "expand", 2.97, null],
];
const clip = { x: 400, y: 100, width: 640, height: 480 };
const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
  args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => console.log("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("console.error " + m.text().slice(0, 300)); });
  await page.goto(`${(process.env.LAB || "http://localhost:5173")}/?tier=${tier}&scale=1&debug=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => window.__hero.debug.settle(6));
  const has = await page.evaluate(() => typeof window.__hero.pipeline.profile.iceBehindIce);
  console.log("profile.iceBehindIce:", has);
  for (const [name, phase, t, tau] of POSES) {
    await page.evaluate(([ph, tt, ta]) => {
      const h = window.__hero;
      if (h.shards && h.shards.mesh) h.shards.mesh.visible = false;
      h.debug.freeze(false);
      h.debug.pose(ph, 0);
      h.debug.settle(0.1);
      h.debug.pose(ph, tt);
      h.debug.settle(ph ? 1.6 : 2.5);
      if (ta !== null) h.rings.tau = ta;
      h.debug.freeze(true);
    }, [phase, t, tau]);
    for (const on of [false, true]) {
      await page.evaluate((v) => { window.__hero.pipeline.profile.iceBehindIce = v; }, on);
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(out, `${name}_${on ? "on" : "off"}.png`), clip });
    }
  }
} finally {
  await browser.close();
}
console.log("done");
