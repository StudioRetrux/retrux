// Raw pointermove cadence vs Choreography.speed, sampled every frame inside the page.
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
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    const log = (window.__plog = { ev: [], fr: [] });
    window.addEventListener("pointermove", (e) => log.ev.push([+performance.now().toFixed(1), e.clientX, e.clientY, e.pointerType]), { passive: true });
    const c = window.__hero.choreo;
    const tick = () => {
      log.fr.push([+performance.now().toFixed(1), Math.round(c.speed), +c.dwell.toFixed(2), c.lastMove.t ? +(c.lastMove.t * 1000).toFixed(1) : 0]);
      if (log.fr.length < 400) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  let a = 0;
  for (let i = 0; i < 60; i++) {
    a += 0.6;
    await page.mouse.move(60 + Math.cos(a) * 4, 383 + Math.sin(a) * 4);
    await page.waitForTimeout(16);
  }
  const r = await page.evaluate(() => window.__plog);
  console.log("events:", r.ev.length, "first:", JSON.stringify(r.ev.slice(0, 6)));
  const gaps = r.ev.slice(1).map((e, i) => +(e[0] - r.ev[i][0]).toFixed(1));
  console.log("event gaps ms:", JSON.stringify(gaps.slice(0, 30)));
  console.log("frames:", r.fr.length, "sample [now, speed, dwell, lastMove.t]:", JSON.stringify(r.fr.filter((_, i) => i % 6 === 0).slice(0, 25)));
} finally {
  await browser.close();
}
