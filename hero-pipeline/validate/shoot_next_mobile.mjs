import { fileURLToPath } from "node:url";
// Production Next.js page at phone sizes (portrait / landscape).
//   node shoot_next_mobile.mjs <outDir> [url]
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SP = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, ""); // hero-pipeline/
const require = createRequire(SP + "/tools/package.json");
const { chromium } = require("playwright-core");
const FFMPEG = SP + "/tools/node_modules/ffmpeg-static/ffmpeg.exe";
const out = process.argv[2];
const url = process.argv[3] || "http://localhost:3000/";
fs.mkdirSync(out, { recursive: true });
const logs = [];
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  for (const [name, w, h] of [
    ["portrait", 390, 844],
    ["landscape", 844, 390],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => logs.push(`${name} pageerror ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") logs.push(`${name} console.error ${m.text().slice(0, 200)}`);
    });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !document.querySelector("[data-hero-loader]") && !!document.querySelector("[data-revealed]"), null, { timeout: 120000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(out, `${name}.png`) });
    const overflow = await page.evaluate(() => {
      const r = document.querySelector("h1")?.getBoundingClientRect();
      return { h1Right: r ? Math.round(r.right) : -1, vw: innerWidth, scrollW: document.documentElement.scrollWidth };
    });
    logs.push(`${name} ${JSON.stringify(overflow)}`);
    await ctx.close();
  }
  execFileSync(FFMPEG, [
    "-y", "-loglevel", "error",
    "-i", path.join(out, "portrait.png"), "-i", path.join(out, "landscape.png"),
    "-filter_complex", "[0]scale=-2:640[a];[1]scale=-2:296[b];[b]pad=iw:640:0:0[c];[a][c]hstack",
    path.join(out, "grid.jpg"),
  ]);
} finally {
  fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n"));
  console.log(logs.join("\n"));
  await browser.close();
}
