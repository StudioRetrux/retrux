// Captures the engine at the reference video's validation moments.
//   node shoot_review.mjs <outDir>
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("C:/Users/fvldi/AppData/Local/Temp/claude/dc2ac90effee4131/570a569a-5122-4ff1-b51f-d34d42e5fde3/scratchpad/tools/package.json");
const { chromium } = require("playwright-core");

const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
const logs = [];
page.on("pageerror", (e) => logs.push("pageerror " + e.message));
await page.goto("http://localhost:5173/?tier=T1", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 120000 });
// Hide the HTML overlay so critics see the scene itself (a separate shot keeps it).
const shot = async (name, overlay = false) => {
  if (!overlay) await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay{visibility:hidden}" });
  await page.screenshot({ path: path.join(out, name + ".png") });
  const s = await page.evaluate(() => {
    const h = window.__hero;
    return { phase: h.choreo.phase, fps: +h.state.fps.toFixed(0), scale: h.state.renderScale };
  });
  logs.push(`${name} ${JSON.stringify(s)}`);
};
await page.waitForTimeout(4200);
await shot("e00_rest_overlay", true);
await page.waitForTimeout(1300);
await shot("e01_rest_b");
// Orbit extremes (video cursor C3 at (218,540), C5 at (1206,225)), moving then dwelling.
await page.mouse.move(400, 500, { steps: 6 });
await page.mouse.move(218, 540, { steps: 10 });
await page.waitForTimeout(180);
await shot("e02_orbit_left");
await page.waitForTimeout(450);
await shot("e03_dwell_eye");
await page.mouse.move(800, 300, { steps: 10 });
await page.mouse.move(1206, 225, { steps: 10 });
await page.waitForTimeout(180);
await shot("e04_orbit_right_up");
// Hover push-in (tilt).
await page.mouse.move(980, 380, { steps: 8 });
await page.mouse.move(735, 395, { steps: 10 });
await page.waitForTimeout(1300);
await shot("e05_tilt");
// Click -> collapse.
await page.mouse.down();
await page.waitForTimeout(100);
await page.mouse.up();
const t0 = Date.now();
const at = async (sec, name) => {
  const wait = sec * 1000 - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  await shot(name);
};
await at(0.7, "e06_collapse_flat");
await at(1.25, "e07_collapse_splay");
await at(1.75, "e08_collapse_peak");
await at(2.45, "e09_collapse_home");
await page.waitForTimeout(1200);
// Press and hold -> expand.
await page.mouse.down();
const h0 = Date.now();
const hat = async (sec, name) => {
  const wait = sec * 1000 - (Date.now() - h0);
  if (wait > 0) await page.waitForTimeout(wait);
  await shot(name);
};
await hat(0.5, "e10_charge");
await hat(0.95, "e11_pop");
await hat(1.6, "e12_expand");
await hat(2.6, "e13_sustain");
await hat(3.6, "e14_sustain_late");
await page.mouse.up();
const r0 = Date.now();
const rat = async (sec, name) => {
  const wait = sec * 1000 - (Date.now() - r0);
  if (wait > 0) await page.waitForTimeout(wait);
  await shot(name);
};
await rat(0.33, "e15_release_snap");
await rat(0.9, "e16_release_home");
fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n"));
console.log(logs.join("\n"));
await browser.close();
