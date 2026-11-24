import { fileURLToPath } from "node:url";
// Press-and-hold timeline vs the reference ("State 2 to 5.mp4", press at F331, release at F443, 30 fps): the engine at the
// same moments (debug poses, phase-fair: the tumble clock is pinned at the press), side by side with the reference frames
// extracted to <refDir>/F###.jpg. Writes eng_F###.png, sbs_F###.jpg (engine | reference) and sheet_*.jpg overviews.
//   node shoot_holdseq.mjs <outDir> <refDir> [frames=332,340,...] [tau=0] [tier=T1]
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(new URL("../tools/package.json", import.meta.url));
const { chromium } = require("playwright-core");
const FF = (process.env.FFMPEG || "/opt/homebrew/bin/ffmpeg");

const out = process.argv[2];
const refDir = process.argv[3];
const frames = (process.argv[4] || "332,340,348,356,364,372,380,388,396,404,412,420,428,436,444,452,460,468").split(",").map(Number);
const tau = +(process.argv[5] ?? 0);
const tier = process.argv[6] || "T1";
fs.mkdirSync(out, { recursive: true });
const PRESS = 331;
const RELEASE = 443;
const ff = (args) => execFileSync(FF, ["-y", "-loglevel", "error", ...args]);

const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
  args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"],
});
const logs = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  await page.goto(`${(process.env.LAB || "http://localhost:5173")}/?tier=${tier}&scale=1&debug=1${process.env.QS ? "&" + process.env.QS : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => window.__hero.debug.settle(6));
  await page.waitForTimeout(1200);
  for (const F of frames) {
    const held = F < RELEASE;
    const phase = held ? "expand" : "release";
    const t = held ? Math.max(0, (F - PRESS) / 30) : (F - RELEASE) / 30;
    const st = await page.evaluate(
      ([ph, tt, ta, held]) => {
        const h = window.__hero;
        h.debug.freeze(false);
        // A press at a pinned tumble phase, as a live press latches its hold slots at t = 0.
        h.debug.pose(null);
        h.debug.settle(0.2);
        h.rings.tau = ta;
        h.debug.pose("expand", 0);
        h.debug.settle(0.05);
        if (held) {
          h.debug.pose("expand", tt);
        } else {
          h.debug.pose("expand", 3.7);
          h.debug.settle(0.3);
          h.debug.pose("release", tt);
        }
        h.debug.settle(1.2);
        h.debug.freeze(true);
        return { phase: h.choreo.phase, tau: +(+h.rings.tau).toFixed(3), camExpand: +h.choreo.drivers.camExpand.toFixed(3) };
      },
      [phase, t, tau, held],
    );
    await page.waitForTimeout(350);
    const file = path.join(out, `eng_F${F}.png`);
    await page.screenshot({ path: file });
    console.log(`F${F} ${phase} t=${t.toFixed(2)} ${JSON.stringify(st)}`);
    const ref = path.join(refDir, `F${F}.jpg`);
    if (fs.existsSync(ref)) {
      ff(["-i", file, "-i", ref, "-filter_complex", "[0]scale=720:384[a];[1]scale=720:384[b];[a][b]hstack", "-q:v", "3", path.join(out, `sbs_F${F}.jpg`)]);
    }
  }
  await page.evaluate(() => {
    window.__hero.debug.freeze(false);
    window.__hero.debug.pose(null);
  });
  // Overview sheets: 6 rows of side-by-sides each.
  const sbs = frames.map((F) => path.join(out, `sbs_F${F}.jpg`)).filter((f) => fs.existsSync(f));
  for (let s = 0; s * 6 < sbs.length; s++) {
    const part = sbs.slice(s * 6, s * 6 + 6);
    const args = [];
    part.forEach((f) => args.push("-i", f));
    const n = part.length;
    const filter = part.map((_, i) => `[${i}]`).join("") + `vstack=inputs=${n}` + (n === 1 ? "" : "");
    ff([...args, "-filter_complex", n > 1 ? filter : "[0]copy", "-q:v", "4", path.join(out, `sheet_${s + 1}.jpg`)]);
  }
} finally {
  await browser.close();
}
if (logs.length) console.log(logs.slice(0, 10).join("\n"));
console.log("done", out);
