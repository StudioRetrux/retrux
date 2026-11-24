import { fileURLToPath } from "node:url";
// QC capture set for scored reviews. Like shoot_poses.mjs, but phase-fair: the rest and loop poses
// pin the ring tumble clock (rings.tau) to the reference frame's moment in the 4 s Default Loop
// (Loop F000 = State F000 = tau 0, eye at tau 1.5), and it adds the UI overlay vs the Figma frame.
//   node shoot_qc.mjs <outDir> [tier=T1] [scale=1] [only=q00,p06,ui]
// Writes <name>.png, cmp_<name>.jpg (engine above, reference below, 960 px wide),
// crop_<name>_<region>.jpg (full-res engine | reference, or engine above reference for wide crops)
// and log.txt.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SP = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, ""); // hero-pipeline/
const require = createRequire(SP + "/tools/package.json");
const { chromium } = require("playwright-core");
const FFMPEG = (process.env.FFMPEG || "/opt/homebrew/bin/ffmpeg");
const REF = SP + "/reference";
const FIGMA = process.env.QC_FIGMA || path.join(SP, "reference", "figma_hero_2497-2204.png");

const out = process.argv[2];
const tier = process.argv[3] || "T1";
const scale = process.argv[4] || "1";
const only = process.argv[5] ? process.argv[5].split(",") : null;
fs.mkdirSync(out, { recursive: true });

const HERO = [440, 130, 560, 420];
// [name, phase, t (s into the phase), tau (ring clock) or null, reference, {region: [x, y, w, h]}]
const POSES = [
  ["q00_rest", null, 0, 0, "ref_F000", { hero: HERO, mountains: [0, 120, 720, 330], water: [300, 440, 840, 326], right: [840, 160, 600, 330] }],
  ["q01_loop15", null, 0, 0.5, "loop_F015", { hero: HERO }],
  ["q02_loop30", null, 0, 1.0, "loop_F030", { hero: HERO }],
  ["q03_eye", null, 0, 1.5, "loop_F045", { hero: [470, 160, 500, 420] }],
  // (The click-triggered collapse, F230-F302, was removed on 2026-11-11: a click does nothing now.)
  ["p04_expand_pop", "expand", 0.9, null, "ref_F358", {}],
  ["p05_expand", "expand", 2.37, null, "ref_F402", {}],
  ["p06_sustain", "expand", 2.97, null, "ref_F420", { hero: [300, 0, 900, 766] }],
  ["p07_release_snap", "release", 0.33, null, "ref_F453", {}],
  ["p08_release_home", "release", 0.57, null, "ref_F460", {}],
].filter((p) => !only || only.some((o) => p[0].startsWith(o)));
const UI_REGIONS = { copy: [0, 500, 760, 266], nav: [0, 0, 1440, 110], sound: [1100, 650, 340, 116], scroll: [520, 670, 400, 96] };
const wantUi = !only || only.includes("ui");

function ff(args) {
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", ...args]);
}
function compare(file, refFile, name, regions) {
  if (!fs.existsSync(refFile)) return;
  // Scale both to 960 x 511 so a 1 px height difference (Figma 767) cannot break the stack.
  ff(["-i", file, "-i", refFile, "-filter_complex", "[0]scale=960:511[a];[1]scale=960:511[b];[a][b]vstack", "-q:v", "3", path.join(out, `cmp_${name}.jpg`)]);
  for (const [region, [x, y, w, h]] of Object.entries(regions)) {
    const c = `crop=${w}:${h}:${x}:${y}`;
    const stack = w > h * 1.6 ? "vstack" : "hstack";
    ff(["-i", file, "-i", refFile, "-filter_complex", `[0]${c}[a];[1]${c}[b];[a][b]${stack}`, "-q:v", "2", path.join(out, `crop_${name}_${region}.jpg`)]);
  }
}

const logs = [];
const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
  args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 400)}`);
  });
  await page.goto(`${(process.env.LAB || "http://localhost:5173")}/?tier=${tier}&scale=${scale}&debug=1${process.env.QS ? "&" + process.env.QS : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  const hide = await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => window.__hero.debug.settle(6));
  await page.waitForTimeout(1500);

  const shoot = async (name, phase, t, tau) => {
    await page.evaluate(
      ([ph, tt, ta]) => {
        const h = window.__hero;
        h.debug.freeze(false);
        // A hold starts at its own t = 0 (the rings latch their hold slots there), as a live press does.
        if (ph === "expand") {
          h.debug.pose(ph, 0);
          h.debug.settle(0.1);
        }
        h.debug.pose(ph, tt);
        h.debug.settle(ph ? 1.6 : 2.5);
        if (ta !== null) h.rings.tau = ta;
        h.debug.freeze(true);
      },
      [phase, t, tau],
    );
    await page.waitForTimeout(450);
    const file = path.join(out, name + ".png");
    await page.screenshot({ path: file });
    const s = await page.evaluate(() => {
      const h = window.__hero;
      return {
        phase: h.choreo.phase,
        tau: +(+h.rings.tau).toFixed(3),
        scale: h.state.renderScale,
        tier: h.profile?.tier,
        d: Object.fromEntries(Object.entries(h.choreo.drivers).map(([k, v]) => [k, +(+v).toFixed(3)])),
      };
    });
    logs.push(`${name} ${JSON.stringify(s)}`);
    return file;
  };

  for (const [name, phase, t, tau, ref, regions] of POSES) {
    const file = await shoot(name, phase, t, tau);
    compare(file, path.join(REF, ref + ".png"), name, regions);
  }

  if (wantUi) {
    // The page as a visitor sees it at rest (overlay, nav, copy, Sound), vs the Figma frame.
    await hide.evaluate((el) => el.remove());
    await page.addStyleTag({ content: "[data-hud]{display:none !important}" });
    const file = await shoot("ui_rest", null, 0, 0);
    if (fs.existsSync(FIGMA)) compare(file, FIGMA, "ui_rest", UI_REGIONS);
    else logs.push(`no Figma frame at ${FIGMA}`);
  }
  await page.evaluate(() => {
    window.__hero.debug.freeze(false);
    window.__hero.debug.pose(null);
  });
} finally {
  fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n"));
  console.log(logs.join("\n"));
  await browser.close();
}
