import { fileURLToPath } from "node:url";
// Glitch sweep: the intro (live, a frame every ~0.35 s), then held / released poses with the pointer pinned at
// the screen edges and corners, then a few tumble phases. Writes sw_<name>.png and a contact sheet sweep.jpg.
//   node shoot_sweep.mjs <outDir> [tier=T1] [scale=1]
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SP = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, "");
const require = createRequire(SP + "/tools/package.json");
const { chromium } = require("playwright-core");
const FFMPEG = SP + "/tools/node_modules/ffmpeg-static/ffmpeg.exe";

const out = process.argv[2];
const tier = process.argv[3] || "T1";
const scale = process.argv[4] || "1";
fs.mkdirSync(out, { recursive: true });
const logs = [];
const shots = [];
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") logs.push(`console.error ${m.text().slice(0, 300)}`);
  });
  await page.goto(`http://localhost:5173/?tier=${tier}&scale=${scale}&debug=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: "[data-hud]{display:none !important}" });
  const snap = async (name) => {
    const f = path.join(out, `sw_${name}.png`);
    await page.screenshot({ path: f });
    shots.push(f);
    const st = await page.evaluate(() => {
      const h = window.__hero;
      const c = h.rig.camera.position;
      return { intro: +h.state.intro.toFixed(2), phase: h.choreo.phase, cam: c.toArray().map((v) => +v.toFixed(2)) };
    });
    logs.push(`${name} ${JSON.stringify(st)}`);
  };
  // 1. Intro, live (it starts when the loader hands over).
  for (let i = 0; i < 8; i++) {
    await snap(`intro_${i}`);
    await page.waitForTimeout(350);
  }
  await page.evaluate(() => window.__hero.debug.settle(4));
  // 2. Hold and release with the pointer at the edges (deterministic).
  const spots = [["L", -0.98, 0], ["R", 0.98, 0], ["T", 0, 0.98], ["B", 0, -0.98], ["BL", -0.98, -0.98], ["TR", 0.98, 0.98]];
  for (const [phase, t, tag] of [["expand", 2.97, "hold"], ["expand", 0.9, "pop"], ["release", 0.33, "rel"]]) {
    for (const [s, nx, ny] of spots) {
      await page.evaluate(
        ([ph, tt, x, y]) => {
          const h = window.__hero;
          h.debug.freeze(false);
          h.debug.pointer(x, y);
          if (ph === "expand") {
            h.debug.pose(ph, 0);
            h.debug.settle(0.1);
          }
          h.debug.pose(ph, tt);
          h.debug.settle(1.6);
          h.debug.freeze(true);
        },
        [phase, t, nx, ny],
      );
      await page.waitForTimeout(250);
      await snap(`${tag}_${s}`);
    }
  }
  // 3. Idle tumble phases at rest.
  for (const tau of [0.25, 0.75, 1.25, 1.75, 2.25, 2.75, 3.25, 3.75]) {
    await page.evaluate((ta) => {
      const h = window.__hero;
      h.debug.freeze(false);
      h.debug.pointer(null);
      h.debug.pose(null);
      h.debug.settle(1.5);
      h.rings.clock = ta;
      h.debug.freeze(true);
    }, tau);
    await page.waitForTimeout(250);
    await snap(`tau_${tau}`);
  }
} finally {
  fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n"));
  console.log(logs.filter((l) => /error/.test(l)).join("\n") || "no page errors");
  await browser.close();
}
// Contact sheet, 6 per row.
const cols = 6;
const list = shots.filter((f) => fs.existsSync(f));
const inputs = list.flatMap((f) => ["-i", f]);
const rows = Math.ceil(list.length / cols);
const layout = list.map((_, i) => `${(i % cols) * 320}_${Math.floor(i / cols) * 171}`).join("|");
const scaled = list.map((_, i) => `[${i}]scale=320:171[s${i}]`).join(";");
const refs = list.map((_, i) => `[s${i}]`).join("");
execFileSync(FFMPEG, ["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${scaled};${refs}xstack=inputs=${list.length}:layout=${layout}:fill=black`, "-q:v", "3", path.join(out, "sweep.jpg")]);
console.log(`sheet ${rows} rows`);
