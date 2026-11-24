import { fileURLToPath } from "node:url";
// Samples the choreography phase / drivers around a synthetic click.
import { createRequire } from "node:module";
const SP = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, ""); // hero-pipeline/
const require = createRequire(SP + "/tools/package.json");
const { chromium } = require("playwright-core");
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
page.on("pageerror", (e) => console.log("pageerror", e.message));
await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 120000 });
await page.waitForTimeout(3600);
const sample = () =>
  page.evaluate(() => {
    const h = window.__hero;
    const c = h.choreo;
    const d = c.drivers;
    const el = document.elementFromPoint(730, 360);
    return {
      phase: c.phase,
      pressed: h.state.pressed,
      splitB: +d.splitB.toFixed(2),
      flatten: +d.flatten.toFixed(2),
      splay: +d.splay.toFixed(2),
      cam: +d.camCollapse.toFixed(2),
      target: el ? el.tagName + (el.className ? "." + el.className : "") : null,
    };
  });
await page.mouse.move(730, 360, { steps: 4 });
await page.waitForTimeout(300);
console.log("before", JSON.stringify(await sample()));
await page.mouse.down();
await page.waitForTimeout(110);
console.log("down", JSON.stringify(await sample()));
await page.mouse.up();
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(220);
  console.log(`+${((i + 1) * 0.22).toFixed(2)}s`, JSON.stringify(await sample()));
}
await browser.close();
