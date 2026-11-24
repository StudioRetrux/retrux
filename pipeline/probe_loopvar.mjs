// Idle-loop variants (Rings.tune + optional js) at loop poses vs the reference, one Chrome session.
//   node probe_loopvar.mjs <outDir> <variants.mjs> <names|all> [poses=q01]
// variants.mjs: export default { name: { tune: {...}, js: "code with h (after the pose, before the shot)" } }
// Writes <pose>__<variant>.png (hero crop) and <pose>__grid.jpg (reference first, 2 per row).
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("E:/Retrux Hero R&D/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const FF = "E:/Retrux Hero R&D/hero-pipeline/tools/node_modules/ffmpeg-static/ffmpeg.exe";
const REF = "E:/Retrux Hero R&D/hero-pipeline/reference";
const out = process.argv[2];
const VARIANTS = (await import(pathToFileURL(path.resolve(process.argv[3])).href)).default;
const pick = process.argv[4] || "all";
const poses = (process.argv[5] || "q01").split(",");
fs.mkdirSync(out, { recursive: true });
const names = ["none", ...(pick === "all" ? Object.keys(VARIANTS) : pick.split(",")).filter((n) => n !== "none")];
const HERO = { x: 440, y: 130, width: 560, height: 420 };
const P = { q00: [0, "ref_F000"], q01: [0.5, "loop_F015"], q02: [1.0, "loop_F030"], q03: [1.5, "loop_F045"], q35: [3.5, "loop_F105"] };
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const shots = {};
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => console.log("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("console.error " + m.text().slice(0, 400)); });
  await page.goto(`http://localhost:5173/?tier=T1&scale=1&debug=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => {
    const h = window.__hero;
    h.debug.settle(4);
    window.__tune0 = JSON.parse(JSON.stringify(h.rings.tune));
  });
  for (const pn of poses) {
    if (!P[pn]) { console.log("unknown pose", pn); continue; }
    shots[pn] = [];
    for (const n of names) {
      const v = n === "none" ? {} : VARIANTS[n];
      await page.evaluate(([v, tau]) => {
        const h = window.__hero;
        Object.assign(h.rings.tune, JSON.parse(JSON.stringify(window.__tune0)), JSON.parse(JSON.stringify(v.tune || {})));
        h.rings.groups.forEach((g) => (g.visible = true));
        if (h.shards && h.shards.mesh) h.shards.mesh.visible = false;
        h.debug.freeze(false);
        h.debug.pose(null);
        h.debug.settle(2.5);
        h.rings.tau = tau;
        h.debug.settle(0.0001);
        h.rings.tau = tau;
        if (v.js) new Function("h", v.js)(h);
        h.debug.freeze(true);
      }, [v, P[pn][0]]);
      await page.waitForTimeout(600);
      const f = path.join(out, `${pn}__${n}.png`);
      await page.screenshot({ path: f, clip: HERO });
      shots[pn].push(f);
    }
  }
  await page.evaluate(() => { const h = window.__hero; h.rings.groups.forEach((g) => (g.visible = true)); h.debug.freeze(false); });
} finally {
  await browser.close();
}
for (const [pn, files] of Object.entries(shots)) {
  const refCrop = path.join(out, `${pn}__REF.png`);
  execFileSync(FF, ["-y", "-loglevel", "error", "-i", path.join(REF, P[pn][1] + ".png"), "-vf", `scale=1440:766,crop=${HERO.width}:${HERO.height}:${HERO.x}:${HERO.y}`, refCrop]);
  const list = [refCrop, ...files];
  const w = HERO.width, h = HERO.height, cols = 2;
  const inputs = list.flatMap((f) => ["-i", f]);
  const scaled = list.map((_, i) => `[${i}]scale=${w}:${h}[s${i}]`).join(";");
  const layout = list.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join("|");
  const refs = list.map((_, i) => `[s${i}]`).join("");
  execFileSync(FF, ["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${scaled};${refs}xstack=inputs=${list.length}:layout=${layout}:fill=black`, "-q:v", "2", path.join(out, `${pn}__grid.jpg`)]);
  console.log(`${pn}: REF, ${names.join(", ")}`);
}
