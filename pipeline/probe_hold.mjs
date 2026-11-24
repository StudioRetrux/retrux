// A real press-and-hold through the page (mouse down on the orb, hold ~4.5 s, release, ~2.5 s more), one
// frame every ~0.3 s, as a contact sheet: to eyeball the whole hold (pop, slow-motion sustain, release) for
// jumps or glitches. Also logs the largest per-frame ring turn seen by an in-page sampler.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import path from "node:path";
const require = createRequire("E:/Retrux Hero R&D/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const out = process.argv[2];
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const shots = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => console.log("pageerror " + e.message));
  await page.goto("http://localhost:5173/?tier=T1&scale=0.75", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.waitForTimeout(4500); // intro
  await page.evaluate(() => {
    const h = window.__hero;
    const log = (window.__hlog = { max: 0, at: "", prev: null });
    const tick = () => {
      const qs = h.rings.groups.map((g) => g.quaternion.clone());
      if (log.prev) qs.forEach((q, i) => { const d = (q.angleTo(log.prev[i]) * 180) / Math.PI; if (d > log.max) { log.max = d; log.at = `${h.choreo.phase} ring ${i} t=${h.state.time.toFixed(2)}`; } });
      log.prev = qs;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.mouse.move(720, 371, { steps: 6 });
  await page.waitForTimeout(400);
  const snap = async (tag) => {
    const f = path.join(out, `hold_${String(shots.length).padStart(2, "0")}.jpg`);
    await page.screenshot({ path: f, type: "jpeg", quality: 70 });
    shots.push([f, tag]);
  };
  await page.mouse.down();
  const t0 = Date.now();
  while (Date.now() - t0 < 4500) { await snap("hold"); await page.waitForTimeout(150); }
  await page.mouse.up();
  const t1 = Date.now();
  while (Date.now() - t1 < 2500) { await snap("release"); await page.waitForTimeout(150); }
  const log = await page.evaluate(() => ({ max: +window.__hlog.max.toFixed(1), at: window.__hlog.at, fps: window.__hero.state?.fps }));
  console.log("max ring turn per frame (deg):", JSON.stringify(log), "frames:", shots.length);
} finally {
  await browser.close();
}
const py = `
import sys, json
from PIL import Image
files = json.loads(sys.argv[1])
out = sys.argv[2]
W, H = 360, 192
cols = 6
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (W * cols, H * rows))
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB").resize((W, H), Image.LANCZOS)
    sheet.paste(im, ((i % cols) * W, (i // cols) * H))
sheet.save(out, quality=88)
print(sheet.size)
`;
execFileSync("python", ["-c", py, JSON.stringify(shots.map((s) => s[0])), path.join(out, "hold_sheet.jpg")], { stdio: "inherit" });
