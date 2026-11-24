// Hold-pose variants (Rings.tune + CAM_TARGETS.expand overrides) vs the reference, one Chrome session.
//   node probe_holdvar.mjs <outDir> <variants.mjs> <names|all> [phases=p06,p05] [query=]
// variants.mjs: export default { name: { tune: {bTiltDeg, bowlLift, bSplitHeld, aSlotOut, aLift}, cam: {r, el, pitch} } }
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
const phases = (process.argv[5] || "p06,p05").split(",");
const query = process.argv[6] || "";
fs.mkdirSync(out, { recursive: true });
const names = ["none", ...(pick === "all" ? Object.keys(VARIANTS) : pick.split(",")).filter((n) => n !== "none")];
const PH = { p04: [0.9, "ref_F358"], p05: [2.37, "ref_F402"], p06: [2.97, "ref_F420"], p07: ["rel", 0.33, "ref_F453"] };
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
  await page.goto(`http://localhost:5173/?tier=T1&scale=1&debug=1${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => {
    const h = window.__hero;
    h.debug.settle(4);
    window.__tune0 = JSON.parse(JSON.stringify(h.rings.tune));
    window.__cam0 = JSON.parse(JSON.stringify(h.debug.camTargets.expand));
  });
  for (const ph of phases) {
    shots[ph] = [];
    for (const n of names) {
      const v = n === "none" ? {} : VARIANTS[n];
      await page.evaluate(([v, ph]) => {
        const h = window.__hero;
        Object.assign(h.rings.tune, JSON.parse(JSON.stringify(window.__tune0)), v.tune || {});
        Object.assign(h.debug.camTargets.expand, window.__cam0, v.cam || {});
        if (h.shards && h.shards.mesh) h.shards.mesh.visible = false;
        h.debug.freeze(false);
        h.debug.pose(null);
        h.debug.settle(1.0);
        // Run up to the press moment continuously (a tau jump right before the press left the rings mid-turn under the
        // turn-rate limit, so the hold's side latches depended on the previous shot: non-deterministic arrangements).
        const tauPress = v.tau !== undefined ? v.tau : 2.6;
        h.rings.tau = tauPress - 0.4;
        h.debug.settle(0.4);
        h.rings.tau = tauPress;
        h.debug.settle(1 / 60);
        h.debug.pose("expand", 0);
        h.debug.settle(0.1);
        const t = { p04: 0.9, p05: 2.37, p06: 2.97 }[ph];
        h.debug.pose("expand", t);
        h.debug.settle(1.6);
        h.debug.freeze(true);
      }, [v, ph]);
      await page.waitForTimeout(500);
      const f = path.join(out, `${ph}__${n}.png`);
      await page.screenshot({ path: f });
      shots[ph].push(f);
    }
  }
} finally {
  await browser.close();
}
for (const [ph, files] of Object.entries(shots)) {
  const list = [path.join(REF, PH[ph][PH[ph].length - 1] + ".png"), ...files];
  const w = 720, h = 383, cols = 2;
  const inputs = list.flatMap((f) => ["-i", f]);
  const scaled = list.map((_, i) => `[${i}]scale=${w}:${h}[s${i}]`).join(";");
  const layout = list.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join("|");
  const refs = list.map((_, i) => `[s${i}]`).join("");
  execFileSync(FF, ["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${scaled};${refs}xstack=inputs=${list.length}:layout=${layout}:fill=black`, "-q:v", "2", path.join(out, `${ph}__grid.jpg`)]);
  console.log(`${ph}: REF, ${names.join(", ")}`);
}
