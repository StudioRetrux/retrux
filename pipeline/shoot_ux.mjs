// The real visitor flow in the lab: loader, dissolve + text reveal, cursor hover, press-and-hold.
//   node shoot_ux.mjs <outDir> [query]
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const SP = "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad";
const require = createRequire(SP + "/tools/package.json");
const { chromium } = require("playwright-core");
const out = process.argv[2];
const query = process.argv[3] || "";
fs.mkdirSync(out, { recursive: true });
const logs = [];
const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
  args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 300)}`);
  });
  const t0 = Date.now();
  const shot = async (name) => {
    await page.screenshot({ path: path.join(out, name + ".png") });
    logs.push(`${name} t=${((Date.now() - t0) / 1000).toFixed(2)}s`);
  };
  await page.goto(`${(process.env.LAB || "http://localhost:5173")}/?${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await shot("u00_loading");
  await page.waitForFunction(() => !!window.__hero && window.__hero.state.ready, null, { timeout: 180000 });
  await page.waitForTimeout(250);
  await shot("u01_dissolve");
  await page.waitForTimeout(700);
  await shot("u02_reveal");
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot("u03_settled");
  // Hover over the hero, then press and hold.
  await page.mouse.move(900, 300, { steps: 6 });
  await page.mouse.move(735, 395, { steps: 12 });
  await page.waitForTimeout(1200);
  await shot("u04_hover");
  await page.mouse.down();
  await page.waitForTimeout(600);
  await shot("u05_press");
  await page.waitForTimeout(2200);
  await shot("u06_hold");
  await page.mouse.up();
  await page.waitForTimeout(1500);
  // Over a link (cursor link state).
  await page.mouse.move(1200, 60, { steps: 10 });
  await page.waitForTimeout(500);
  await shot("u07_link");
} finally {
  fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n"));
  console.log(logs.join("\n"));
  await browser.close();
}
