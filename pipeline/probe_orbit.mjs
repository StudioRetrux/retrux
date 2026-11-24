// Why does the pointer orbit not respond? Reads Choreography internals while the mouse circles at the left edge.
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
  const read = () =>
    page.evaluate(() => {
      const h = window.__hero;
      const c = h.choreo;
      return {
        active: h.state.pointer.active, type: h.state.pointer.type, nx: +h.state.pointer.nx.toFixed(3),
        speed: Math.round(c.speed), dwell: +c.dwell.toFixed(2), azT: +c.orbitAz.target.toFixed(2), az: +c.drivers.orbitAz.toFixed(2),
        reduced: c.reducedMotion, phase: c.phase, time: +h.state.time.toFixed(2), intro: +h.state.intro.toFixed(2),
        vis: document.visibilityState, mq: matchMedia("(prefers-reduced-motion: reduce)").matches,
      };
    });
  console.log("loaded", JSON.stringify(await read()));
  await page.waitForTimeout(4000);
  console.log("after intro", JSON.stringify(await read()));
  let a = 0;
  for (let i = 0; i < 90; i++) {
    a += 0.6;
    await page.mouse.move(60 + Math.cos(a) * 4, 383 + Math.sin(a) * 4);
    await page.waitForTimeout(16);
    if (i % 30 === 29) console.log("circling", i, JSON.stringify(await read()));
  }
} finally {
  await browser.close();
}
