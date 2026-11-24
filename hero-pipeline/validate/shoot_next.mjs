import { fileURLToPath } from "node:url";
// The production Next.js page (next start): first paint, loader, settled hero, hover, hold.
//   node shoot_next.mjs <outDir> [url]
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SP = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, ""); // hero-pipeline/
const require = createRequire(SP + "/tools/package.json");
const { chromium } = require("playwright-core");
const FFMPEG = (process.env.FFMPEG || "/opt/homebrew/bin/ffmpeg");
const out = process.argv[2];
const url = process.argv[3] || "http://localhost:3000/";
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
  page.on("requestfailed", (r) => logs.push(`requestfailed ${r.url()} ${r.failure()?.errorText}`));
  const t0 = Date.now();
  const files = [];
  const shot = async (name) => {
    const f = path.join(out, name + ".png");
    await page.screenshot({ path: f });
    files.push(f);
    logs.push(`${name} t=${((Date.now() - t0) / 1000).toFixed(2)}s`);
  };
  await page.goto(url, { waitUntil: "commit" });
  await page.waitForTimeout(150);
  await shot("n00_firstpaint");
  await page.waitForTimeout(1200);
  await shot("n01_loader");
  // Loader gone and the copy revealed.
  await page.waitForFunction(() => !document.querySelector("[data-hero-loader]") && !!document.querySelector("[data-revealed]"), null, { timeout: 120000 });
  await page.waitForTimeout(2500);
  await shot("n02_settled");
  await page.mouse.move(900, 300, { steps: 6 });
  await page.mouse.move(735, 395, { steps: 12 });
  await page.waitForTimeout(1200);
  await shot("n03_hover");
  await page.mouse.down();
  await page.waitForTimeout(2800);
  await shot("n04_hold");
  await page.mouse.up();
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector("h1")?.textContent,
    revealed: document.querySelectorAll("[data-revealed]").length,
    canvas: (() => {
      const c = document.querySelector("canvas");
      return c ? `${c.width}x${c.height}` : "none";
    })(),
    font: getComputedStyle(document.querySelector("h1") || document.body).fontFamily,
  }));
  logs.push("info " + JSON.stringify(info));
  const inputs = files.flatMap((f) => ["-i", f]);
  execFileSync(FFMPEG, [
    "-y", "-loglevel", "error", ...inputs,
    "-filter_complex",
    "[0]scale=480:-2[a];[1]scale=480:-2[b];[2]scale=480:-2[c];[3]scale=480:-2[d];[4]scale=480:-2[e];[a][b][c]hstack=3[t];[d][e]hstack[u];[u]pad=1440:ih[v];[t][v]vstack",
    path.join(out, "grid.jpg"),
  ]);
} finally {
  fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n"));
  console.log(logs.join("\n"));
  await browser.close();
}
