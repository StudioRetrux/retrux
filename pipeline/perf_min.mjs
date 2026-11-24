// Minimal fps measurement (works on any engine version): node perf_min.mjs "<query>" [seconds]
import { createRequire } from "node:module";
const require = createRequire("E:/Retrux Hero R&D/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const query = process.argv[2] || "tier=T0&scale=0.85";
const secs = +(process.argv[3] || 3);
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  await page.goto(`http://localhost:5173/?${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.waitForTimeout(5000);
  const fps = [];
  for (let i = 0; i < 3; i++) {
    fps.push(
      await page.evaluate(
        (s) =>
          new Promise((res) => {
            let n = 0;
            const t0 = performance.now();
            const tick = () => {
              n++;
              if (performance.now() - t0 < s * 1000) requestAnimationFrame(tick);
              else res(+((n * 1000) / (performance.now() - t0)).toFixed(1));
            };
            requestAnimationFrame(tick);
          }),
        secs,
      ),
    );
  }
  console.log(`fps ${fps.join(" / ")}`);
} finally {
  await browser.close();
}
