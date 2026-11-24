// Hold 2.5 s, release, re-press after 0.3 s, hold 1.2 s: logs the frames around the largest ring step.
import { createRequire } from "node:module";
const require = createRequire("E:/Retrux Hero R&D/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  await page.goto("http://localhost:5173/?tier=T0&scale=0.5", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.waitForTimeout(4500);
  await page.evaluate(() => {
    const h = window.__hero;
    const keys = ["align", "alignA", "alignInner", "expandPose", "popPose", "gapA", "spreadA", "tiltA", "faceInner", "splitB", "spin"];
    const log = (window.__rlog = []);
    let prev = null;
    const tick = () => {
      const d = h.choreo.drivers;
      const qs = h.rings.groups.map((g) => g.quaternion.clone());
      const steps = prev ? qs.map((q, i) => +((q.angleTo(prev[i]) * 180) / Math.PI).toFixed(1)) : [0, 0, 0, 0];
      prev = qs;
      log.push({ t: +h.state.time.toFixed(3), ph: h.choreo.phase, steps, d: Object.fromEntries(keys.map((k) => [k, +(+d[k]).toFixed(3)])) });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.mouse.move(700, 600);
  await page.mouse.down();
  await page.waitForTimeout(2500);
  await page.mouse.up();
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__rlog.push({ mark: "repress" }));
  await page.mouse.down();
  await page.waitForTimeout(1400);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const log = await page.evaluate(() => window.__rlog);
  const start = log.findIndex((r) => r.mark === "repress");
  const seg = log.slice(start + 1).filter((r) => r.steps);
  let worst = 0;
  seg.forEach((r, i) => {
    if (Math.max(...r.steps) > Math.max(...seg[worst].steps)) worst = i;
  });
  for (let i = Math.max(0, worst - 4); i < Math.min(seg.length, worst + 3); i++) {
    const r = seg[i];
    console.log(`${i === worst ? ">>" : "  "} t=${r.t} ${r.ph} steps=${r.steps.join("/")} ${JSON.stringify(r.d)}`);
  }
} finally {
  await browser.close();
}
