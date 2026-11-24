// Frame-rate probe on this machine's GPU: auto tier (or ?tier=), rest then the hold pose.
//   node perf_probe.mjs [query, e.g. "tier=T1&scale=1"]
import { createRequire } from "node:module";

const SP = "C:/Users/fvldi/AppData/Local/Temp/claude/dc2ac90effee4131/570a569a-5122-4ff1-b51f-d34d42e5fde3/scratchpad";
const require = createRequire(SP + "/tools/package.json");
const { chromium } = require("playwright-core");
const query = process.argv[2] || "";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://localhost:5173/?${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  const sample = async (label, ms) => {
    const r = await page.evaluate(async (ms) => {
      const h = window.__hero;
      const t0 = performance.now();
      let frames = 0;
      let worst = 0;
      let last = t0;
      await new Promise((res) => {
        const f = (now) => {
          frames++;
          worst = Math.max(worst, now - last);
          last = now;
          if (now - t0 < ms) requestAnimationFrame(f);
          else res();
        };
        requestAnimationFrame(f);
      });
      const dt = performance.now() - t0;
      return { fps: +((frames * 1000) / dt).toFixed(1), worstMs: +worst.toFixed(1), tier: h.state.tier, scale: h.state.renderScale, gpu: h.gpu };
    }, ms);
    console.log(label, JSON.stringify(r));
  };
  await page.waitForTimeout(7000); // intro + adaptive settling
  await sample("rest", 5000);
  await page.evaluate(() => window.__hero.debug.pose("expand", 2.97));
  await page.waitForTimeout(4000);
  await sample("hold", 5000);
  await page.evaluate(() => window.__hero.debug.pose("collapse", 1.67));
  await page.waitForTimeout(2000);
  await sample("collapse", 3000);
  await page.evaluate(() => window.__hero.debug.pose(null));
  if (errors.length) console.log("errors", errors.join(" | "));
} finally {
  await browser.close();
}
