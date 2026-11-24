// Phone-sized check of the lab (portrait + landscape), touch emulation.
//   node shoot_mobile.mjs <outDir>
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SP = "C:/Users/fvldi/AppData/Local/Temp/claude/dc2ac90effee4131/570a569a-5122-4ff1-b51f-d34d42e5fde3/scratchpad";
const require = createRequire(SP + "/tools/package.json");
const { chromium } = require("playwright-core");
const FFMPEG = SP + "/tools/node_modules/ffmpeg-static/ffmpeg.exe";
const out = process.argv[2];
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
    await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(out, `${name}_rest.png`) });
    // Touch press-and-hold in the middle of the hero.
    const cx = Math.round(w / 2), cy = Math.round(h * 0.45);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy }] });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(out, `${name}_hold.png`) });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const s = await page.evaluate(() => ({ tier: window.__hero.state.tier, scale: window.__hero.state.renderScale, fps: Math.round(window.__hero.state.fps) }));
    logs.push(`${name} ${JSON.stringify(s)}`);
    await ctx.close();
  }
  execFileSync(FFMPEG, [
    "-y", "-loglevel", "error",
    "-i", path.join(out, "portrait_rest.png"), "-i", path.join(out, "portrait_hold.png"),
    "-i", path.join(out, "landscape_rest.png"), "-i", path.join(out, "landscape_hold.png"),
    "-filter_complex", "[0]scale=-2:640[a];[1]scale=-2:640[b];[2]scale=-2:320[c];[3]scale=-2:320[d];[c][d]vstack[cd];[a][b][cd]hstack=3",
    path.join(out, "grid.jpg"),
  ]);
} finally {
  fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n"));
  console.log(logs.join("\n"));
  await browser.close();
}
