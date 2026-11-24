// Visual check of the hero lab with system Chrome (GPU via ANGLE/D3D11).
//   node shoot.mjs <url> <outDir> [tag]
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");

const url = process.argv[2] ?? ((process.env.LAB || "http://localhost:5173") + "/?debug=1");
const out = process.argv[3] ?? ".";
const tag = process.argv[4] ?? "shot";
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
  // Playwright's temp profile path contains "playwright", which the RAM watchdog matches.
  args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist", "--disable-gpu-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

const t0 = Date.now();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
try {
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 120000 });
} catch {
  logs.push("[test] engine never became ready");
}
logs.push(`[test] ready after ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const gpu = await page.evaluate(() => {
  const h = window.__hero;
  return h ? { gpu: h.gpu, tier: h.state.tier, fps: h.state.fps } : null;
});
logs.push(`[test] ${JSON.stringify(gpu)}`);

const shot = async (name) => {
  await page.screenshot({ path: path.join(out, `${tag}_${name}.png`) });
  const s = await page.evaluate(() => {
    const st = window.__hero?.state;
    return st ? { fps: +st.fps.toFixed(1), hold: +st.hold.toFixed(2), shatter: +st.shatter.toFixed(2), scale: st.renderScale } : null;
  });
  logs.push(`[shot] ${name} ${JSON.stringify(s)}`);
};

await page.waitForTimeout(3500); // intro
await shot("01_rest");
await page.waitForTimeout(700);
await shot("02_rest_b");
await page.mouse.move(80, 80, { steps: 8 });
await page.waitForTimeout(900);
await shot("03_corner");
await page.mouse.move(720, 370, { steps: 10 });
await page.waitForTimeout(900);
await shot("04_hover");
await page.mouse.down();
await page.waitForTimeout(450);
await shot("05_hold_mid");
await page.waitForTimeout(1600);
await shot("06_hold_full");
await page.mouse.up();
await page.waitForTimeout(1500);
await shot("07_released");
// Click -> collapse one-shot.
await page.mouse.move(730, 360, { steps: 4 });
await page.waitForTimeout(300);
await page.mouse.down();
await page.waitForTimeout(110);
await page.mouse.up();
await page.waitForTimeout(700);
await shot("08_collapse_flat");
await page.waitForTimeout(700);
await shot("09_collapse_splay");
await page.waitForTimeout(1400);
await shot("10_collapse_home");

fs.writeFileSync(path.join(out, `${tag}_log.txt`), logs.join("\n"));
console.log(logs.join("\n"));
await browser.close();
