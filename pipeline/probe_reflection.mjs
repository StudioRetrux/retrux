// Rest pose (tau 0): live hero reflection on vs off, bottom of the frame, full res.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const FF = (process.env.FFMPEG || "/opt/homebrew/bin/ffmpeg");
const out = process.argv[2];
const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
  args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  await page.goto(((process.env.LAB || "http://localhost:5173") + "/?tier=T1&scale=1&debug=1"), { waitUntil: "domcontentloaded" });
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
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/refl_on.png` });
  await page.evaluate(() => (window.__hero.water.material.uniforms.uReflectionOn.value = 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/refl_off.png` });
  execFileSync(FF, ["-y", "-loglevel", "error", "-i", `${out}/refl_on.png`, "-i", `${out}/refl_off.png`, "-filter_complex", "[0]crop=760:330:340:436[a];[1]crop=760:330:340:436[b];[a][b]vstack", "-q:v", "2", `${out}/refl_cmp.jpg`]);
  console.log("ok");
} finally {
  await browser.close();
}
