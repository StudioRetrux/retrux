// p4env probe: shoot named spots for several URL variants, the panel harness's exact pose recipe.
//   LAB=http://localhost:5174 node probe.mjs <outDir> '<json [[tag, qs], ...]>' <spots comma list> [extraSettle=0] [lab override]
// spots: rest,left,right,top,bottom,top_left,top_right,bottom_left,bottom_right,orb (shoot_pointer recipe)
//        hold_L/R/T/B/BL/TR, pop_*, rel_* (shoot_sweep recipe), p04,p05,p06,p07,p08 (shoot_qc expand/release recipe),
//        q00 (shoot_qc rest recipe: pose null, tau 0)
// Writes <outDir>/<tag>__<spot>.png
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");

const out = process.argv[2];
const variants = JSON.parse(process.argv[3]);
const spots = process.argv[4].split(",");
const extra = +(process.argv[5] || 0);
const LAB = process.env.LAB || "http://localhost:5174";
fs.mkdirSync(out, { recursive: true });
const PTR = { rest: [null, 0], left: [-0.98, 0], right: [0.98, 0], top: [0, 0.98], bottom: [0, -0.98], top_left: [-0.98, 0.98], top_right: [0.98, 0.98], bottom_left: [-0.98, -0.98], bottom_right: [0.98, -0.98], orb: [0, 0.03] };
const SW = { L: [-0.98, 0], R: [0.98, 0], T: [0, 0.98], B: [0, -0.98], BL: [-0.98, -0.98], TR: [0.98, 0.98] };
const QC = { p04: ["expand", 0.9], p05: ["expand", 2.37], p06: ["expand", 2.97], p07: ["release", 0.33], p08: ["release", 0.57] };
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const logs = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") logs.push(`console.error ${m.text().slice(0, 300)}`);
  });
  for (const [tag, qs] of variants) {
    await page.goto(`${LAB}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
    await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
    await page.evaluate((x) => window.__hero.debug.settle(6 + x), extra);
    await page.waitForTimeout(800);
    for (const s of spots) {
      if (PTR[s] || s === "rest") {
        const [nx, ny] = PTR[s];
        await page.evaluate(([x, y]) => { const h = window.__hero; h.debug.freeze(false); h.debug.pointer(x, y); h.debug.settle(2.5); h.rings.clock = 0; h.debug.freeze(true); }, [nx, ny]);
        await page.waitForTimeout(400);
      } else if (/^(hold|pop|rel)_/.test(s)) {
        const [tg, k] = s.split("_");
        const [nx, ny] = SW[k];
        const [ph, tt] = tg === "hold" ? ["expand", 2.97] : tg === "pop" ? ["expand", 0.9] : ["release", 0.33];
        await page.evaluate(([ph, tt, x, y]) => { const h = window.__hero; h.debug.freeze(false); h.debug.pointer(x, y); if (ph === "expand") { h.debug.pose(ph, 0); h.debug.settle(0.1); } h.debug.pose(ph, tt); h.debug.settle(1.6); h.debug.freeze(true); }, [ph, tt, nx, ny]);
        await page.waitForTimeout(250);
      } else if (QC[s]) {
        const [ph, tt] = QC[s];
        await page.evaluate(([ph, tt]) => { const h = window.__hero; h.debug.freeze(false); h.debug.pointer(null); if (ph === "expand") { h.debug.pose(ph, 0); h.debug.settle(0.1); } h.debug.pose(ph, tt); h.debug.settle(1.6); h.debug.freeze(true); }, [ph, tt]);
        await page.waitForTimeout(400);
      } else if (s === "q00") {
        await page.evaluate(() => { const h = window.__hero; h.debug.freeze(false); h.debug.pointer(null); h.debug.pose(null); h.debug.settle(1.5); h.rings.clock = 0; h.debug.freeze(true); });
        await page.waitForTimeout(400);
      }
      await page.screenshot({ path: path.join(out, `${tag}__${s}.png`) });
      const st = await page.evaluate(() => { const h = window.__hero; return { t: +h.state.time.toFixed(2), cam: h.rig.camera.position.toArray().map((v) => +v.toFixed(3)) }; });
      logs.push(`${tag} ${s} ${JSON.stringify(st)}`);
    }
    await page.evaluate(() => { const h = window.__hero; h.debug.pointer(null); h.debug.pose(null); h.debug.freeze(false); });
  }
} finally {
  fs.appendFileSync(path.join(out, "probe_log.txt"), logs.join("\n") + "\n");
  console.log(logs.join("\n"));
  await browser.close();
}
