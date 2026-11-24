// Phone-sized check of the lab (portrait + landscape), touch emulation.
//   node shoot_mobile.mjs <outDir>
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SP = "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad";
const require = createRequire(SP + "/tools/package.json");
const { chromium } = require("playwright-core");
const FFMPEG = (process.env.FFMPEG || "/opt/homebrew/bin/ffmpeg");
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const logs = [];
const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
  args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"],
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
    await page.goto(((process.env.LAB || "http://localhost:5173") + "/"), { waitUntil: "domcontentloaded" });
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
