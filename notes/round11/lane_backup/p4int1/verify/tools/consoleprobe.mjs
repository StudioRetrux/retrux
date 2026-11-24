// verify_int1 console probe: the page as a visitor gets it (no debug=1), every console line of every type + page errors,
// through boot, a pointer sweep, a real press-hold 3.5 s, release, 3 s idle.  node consoleprobe.mjs <url> <out.json> [--mobile]
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [url, out] = process.argv.slice(2); const mobile = process.argv.includes("--mobile");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const lines = []; let st = null;
try {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 766 } });
  const page = await ctx.newPage();
  page.on("console", (m) => lines.push(`console.${m.type()} ${m.text().slice(0, 300)}`));
  page.on("pageerror", (e) => lines.push("pageerror " + e.message));
  page.on("requestfailed", (r) => lines.push("requestfailed " + r.url() + " " + (r.failure()?.errorText || "")));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  await page.waitForTimeout(2500);
  const W = mobile ? 390 : 1440, H = mobile ? 844 : 766;
  if (!mobile) { for (let i = 0; i <= 40; i++) { await page.mouse.move(W / 2 + 0.45 * W * Math.sin(i / 6), H / 2 + 0.3 * H * Math.sin(i / 9)); await page.waitForTimeout(30); } }
  if (mobile) { await page.touchscreen.tap(W / 2, H * 0.42); await page.waitForTimeout(1500); }
  else { await page.mouse.move(W / 2, H / 2); await page.mouse.down(); await page.waitForTimeout(3500); await page.mouse.up(); await page.waitForTimeout(3000); }
  st = await page.evaluate(() => ({ phase: window.__hero?.choreo?.phase, ready: document.documentElement.dataset.heroReady }));
} catch (e) { lines.push("ERROR " + e.message); }
finally { fs.writeFileSync(out, JSON.stringify({ url, mobile, st, n: lines.length, lines }, null, 1)); console.log(url, mobile ? "T0phone" : "desktop", "console lines", lines.length, JSON.stringify(lines.slice(0, 6))); await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]); process.exit(0); }
