import { fileURLToPath } from "node:url";
// Pointer-driven camera checks with the engine's debug pointer (deterministic: the pointer is pinned and
// treated as moving, so the dwell recentre never kicks in). For each spot it shoots the frame with the
// projection-shadow fill on and off (same frozen pose), to spot doubled mountains / rocks, plate edges and
// bottom-of-frame glitches.
//   node shoot_pointer.mjs <outDir> [tier=T1] [scale=1] [spots=left,right,...]
// Writes ptr_<spot>.png (fill on), ptr_<spot>_off.png (fill off), cmp_<spot>.jpg (on above off) and log.txt.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SP = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, "");
const require = createRequire(SP + "/tools/package.json");
const { chromium } = require("playwright-core");
const FFMPEG = (process.env.FFMPEG || "/opt/homebrew/bin/ffmpeg");

const out = process.argv[2];
const tier = process.argv[3] || "T1";
const scale = process.argv[4] || "1";
const only = process.argv[5] ? process.argv[5].split(",") : null;
fs.mkdirSync(out, { recursive: true });

// [name, nx, ny] (normalized pointer, y up)
const SPOTS = [
  ["rest", null, 0],
  ["left", -0.98, 0],
  ["right", 0.98, 0],
  ["top", 0, 0.98],
  ["bottom", 0, -0.98],
  ["top_left", -0.98, 0.98],
  ["top_right", 0.98, 0.98],
  ["bottom_left", -0.98, -0.98],
  ["bottom_right", 0.98, -0.98],
  ["orb", 0.0, 0.03],
].filter((s) => !only || only.includes(s[0]));

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
    if (m.type() === "error") logs.push(`console.error ${m.text().slice(0, 300)}`);
  });
  await page.goto(`${(process.env.LAB || "http://localhost:5173")}/?tier=${tier}&scale=${scale}&debug=1${process.env.QS ? "&" + process.env.QS : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => window.__hero.debug.settle(6));
  await page.waitForTimeout(800);

  for (const [name, nx, ny] of SPOTS) {
    const st = await page.evaluate(
      ([x, y]) => {
        const h = window.__hero;
        h.debug.freeze(false);
        h.debug.pointer(x, y);
        h.debug.settle(2.5);
        h.rings.clock = 0;
        h.debug.freeze(true);
        const d = h.choreo.drivers;
        const c = h.rig.camera.position;
        return { az: +d.orbitAz.toFixed(2), el: +d.orbitEl.toFixed(2), tilt: +d.tilt.toFixed(3), cam: c.toArray().map((v) => +v.toFixed(2)), occ: h.env?.occlusion?.uPlateDepthOn?.value };
      },
      [nx, ny],
    );
    logs.push(`${name} ${JSON.stringify(st)}`);
    await page.waitForTimeout(400);
    const on = path.join(out, `ptr_${name}.png`);
    await page.screenshot({ path: on });
    await page.evaluate(() => (window.__hero.env.occlusion.uPlateDepthOn.value = 0));
    await page.waitForTimeout(300);
    const off = path.join(out, `ptr_${name}_off.png`);
    await page.screenshot({ path: off });
    // Restore the value the engine had (1 with the plates; 0 is legitimate with the round-11 mirror lake, ?envlake=mirror).
    await page.evaluate((v) => (window.__hero.env.occlusion.uPlateDepthOn.value = v), st.occ ?? 1);
    execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", on, "-i", off, "-filter_complex", "[0]scale=960:511[a];[1]scale=960:511[b];[a][b]vstack", "-q:v", "3", path.join(out, `cmp_${name}.jpg`)]);
  }
  await page.evaluate(() => {
    const h = window.__hero;
    h.debug.pointer(null);
    h.debug.freeze(false);
  });
} finally {
  fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n"));
  console.log(logs.join("\n"));
  await browser.close();
}
