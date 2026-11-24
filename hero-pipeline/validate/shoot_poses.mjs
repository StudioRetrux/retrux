import { fileURLToPath } from "node:url";
// Deterministic engine captures at the reference video's validation moments, using the
// engine's debug hooks (pose / settle / freeze) instead of wall-clock timing.
//   node shoot_poses.mjs <outDir> [tier=T1] [scale=1] [only=p00,p06]
// Writes <name>.png, cmp_<name>.jpg (engine above, reference below) and log.txt.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SP = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, ""); // hero-pipeline/
const require = createRequire(SP + "/tools/package.json");
const { chromium } = require("playwright-core");
const FFMPEG = SP + "/tools/node_modules/ffmpeg-static/ffmpeg.exe";
const REF = SP + "/reference";

const out = process.argv[2];
const tier = process.argv[3] || "T1";
const scale = process.argv[4] || "1";
const only = process.argv[5] ? process.argv[5].split(",") : null;
fs.mkdirSync(out, { recursive: true });

// [name, phase, t (s into the phase), reference frame, close-up crop x,y,w,h (px) or null]
// Phase "eye" = idle with the tumble clock at the eye pose (every ring face-on), vs F082.
const POSES = [
  ["p00_rest", null, 0, "ref_F000", [440, 130, 560, 420]],
  ["p01_collapse_flat", "collapse", 0.73, "ref_F252", null],
  ["p02_collapse_peak", "collapse", 1.67, "ref_F280", null],
  ["p03_collapse_home", "collapse", 2.23, "ref_F297", null],
  ["p04_expand_pop", "expand", 0.9, "ref_F358", null],
  ["p05_expand", "expand", 2.37, "ref_F402", null],
  ["p06_sustain", "expand", 2.97, "ref_F420", [300, 0, 900, 766]],
  ["p07_release_snap", "release", 0.33, "ref_F453", null],
  ["p08_release_home", "release", 0.57, "ref_F460", null],
  ["p09_eye", "eye", 0, "ref_F082", [470, 160, 500, 420]],
].filter((p) => !only || only.some((o) => p[0].startsWith(o)));

const logs = [];
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 400)}`);
  });
  await page.goto(`http://localhost:5173/?tier=${tier}&scale=${scale}&debug=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  // Finish the intro deterministically, then let the real loop run a moment.
  await page.evaluate(() => window.__hero.debug.settle(6));
  await page.waitForTimeout(1500);

  for (const [name, phase, t, ref, crop] of POSES) {
    await page.evaluate(
      ([ph, tt]) => {
        const h = window.__hero;
        const eye = ph === "eye";
        h.debug.freeze(false);
        h.debug.pose(eye ? null : ph, tt);
        h.debug.settle(ph && !eye ? 1.6 : 2.5);
        if (eye) h.rings.tau = 1.5;
        h.debug.freeze(true);
      },
      [phase, t],
    );
    await page.waitForTimeout(450);
    const file = path.join(out, name + ".png");
    await page.screenshot({ path: file });
    const s = await page.evaluate(() => {
      const h = window.__hero;
      const d = h.choreo.drivers;
      return {
        phase: h.choreo.phase,
        scale: h.state.renderScale,
        d: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, +(+v).toFixed(3)])),
      };
    });
    logs.push(`${name} ${JSON.stringify(s)}`);
    const refFile = path.join(REF, ref + ".png");
    if (fs.existsSync(refFile)) {
      execFileSync(FFMPEG, [
        "-y", "-loglevel", "error", "-i", file, "-i", refFile,
        "-filter_complex", "[0]scale=960:-2[a];[1]scale=960:-2[b];[a][b]vstack",
        "-q:v", "3", path.join(out, `cmp_${name}.jpg`),
      ]);
      if (crop) {
        const [cx, cy, cw, ch] = crop;
        const c = `crop=${cw}:${ch}:${cx}:${cy}`;
        execFileSync(FFMPEG, [
          "-y", "-loglevel", "error", "-i", file, "-i", refFile,
          "-filter_complex", `[0]${c}[a];[1]${c}[b];[a][b]hstack`,
          "-q:v", "2", path.join(out, `crop_${name}.jpg`),
        ]);
      }
    }
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
