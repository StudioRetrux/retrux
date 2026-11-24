// Is the doubled contour at the mid-left mound's end (ptr_left after ptr_rest) a capture artefact (the rest spot's
// uPlateDepthOn off/on toggle) or real camera-history state? Shoots rest -> left twice in one session:
//   A: no toggle (rest shot, then left)      B: with the shoot_pointer toggle on the rest spot (depth off shot, back on)
//   node probe_seq.mjs <outDir>
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const FF = (process.env.FFMPEG || "/opt/homebrew/bin/ffmpeg");
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"), headless: true, args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"] });
const files = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => console.log("pageerror " + e.message));
  await page.goto(((process.env.LAB || "http://localhost:5173") + "/?tier=T1&scale=1&debug=1"), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => window.__hero.debug.settle(6));
  await page.waitForTimeout(800);
  const spot = async (x, y) => page.evaluate(([x, y]) => {
    const h = window.__hero;
    h.debug.freeze(false);
    h.debug.pointer(x, y);
    h.debug.settle(2.5);
    h.rings.clock = 0;
    h.debug.freeze(true);
    return h.rig.camera.position.toArray().map((v) => +v.toFixed(3));
  }, [x, y]);
  for (const mode of ["A", "B"]) {
    console.log(mode, "rest", JSON.stringify(await spot(null, 0)));
    await page.waitForTimeout(400);
    if (mode === "B") {
      await page.evaluate(() => (window.__hero.env.occlusion.uPlateDepthOn.value = 0));
      await page.waitForTimeout(300);
      await page.evaluate(() => (window.__hero.env.occlusion.uPlateDepthOn.value = 1));
    }
    console.log(mode, "left", JSON.stringify(await spot(-0.98, 0)));
    for (const wait of [400, 1500]) {
      await page.waitForTimeout(wait === 400 ? 400 : 1100);
      const f = path.join(out, `${mode}_left_${wait}.png`);
      await page.screenshot({ path: f });
      files.push(f);
    }
  }
} finally {
  await browser.close();
}
const inputs = files.flatMap((f) => ["-i", f]);
const crops = files.map((_, i) => `[${i}]crop=300:200:250:520,scale=600:400:flags=neighbor[s${i}]`).join(";");
execFileSync(FF, ["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${crops};[s0][s1][s2][s3]xstack=inputs=4:layout=0_0|600_0|0_400|600_400`, path.join(out, "grid.png")]);
console.log("grid: A400 A1500 / B400 B1500");
