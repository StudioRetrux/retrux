// Lead demo check: open a page in the real Chrome (engine's own RAF), real mouse sweep, list shader names, console, screenshot.
//   node demo_check.mjs <url> <out.png>
import { createRequire } from "node:module";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const logs = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.type() + ": " + m.text().slice(0, 200)); });
  page.on("pageerror", (e) => logs.push("pageerror: " + String(e).slice(0, 200)));
  await page.addInitScript(() => {
    window.__shaderNames = new Set();
    const orig = WebGL2RenderingContext.prototype.shaderSource;
    WebGL2RenderingContext.prototype.shaderSource = function (s, src) {
      const m = /#define SHADER_NAME (\S+)/.exec(src);
      if (m) window.__shaderNames.add(m[1]);
      if (/LK_FFB/.test(src)) window.__shaderNames.add("marker:ffblock");
      if (/uGlide/.test(src)) window.__shaderNames.add("marker:glide"); if (/LK_FFBD0/.test(src)) window.__shaderNames.add("marker:ffb-r1"); if (/LK_FFBL/.test(src)) window.__shaderNames.add("marker:ffb-r2");
      return orig.call(this, s, src);
    };
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1" || !!document.querySelector("canvas"), null, { timeout: 120000 }).catch(() => logs.push("no canvas in 120 s"));
  await page.waitForTimeout(7000); // entrance
  for (let i = 0; i <= 60; i++) { await page.mouse.move(300 + i * 14, 420 + Math.sin(i / 9) * 40); await page.waitForTimeout(33); }
  await page.waitForTimeout(400);
  const names = await page.evaluate(() => [...window.__shaderNames].sort());
  await page.screenshot({ path: out });
  console.log(JSON.stringify({ url, taa: names.includes("rx-lake-edge-taa"), names: names.filter((n) => /lake|edge|water|mirror|blit|marker/i.test(n)), logs }, null, 1));
} finally {
  await browser.close();
}
