// Judge (G10): WEBGL_lose_context lose / restore in the live engine (its own RAF, CDP mouse), lane vs base; plus DPR 2 boot
// and a mid-motion resize in the live loop. Screenshots (composited page) before / after, console errors / warnings,
// whether frames advance, TAA state.
//   node ctxloss.mjs --outdir DIR
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const outdir = arg("outdir", ".");
fs.mkdirSync(outdir, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const results = [];
const sweep = async (page, n, w, h, seed = 0) => { for (let i = 0; i < n; i++) await page.mouse.move(w * (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(seed + i / 10))), h * (0.45 + 0.1 * Math.sin(seed + i / 7))); };
const st = (page) => page.evaluate(() => { const h = window.__hero; return { time: +h.state.time.toFixed(3), fps: +h.state.fps.toFixed(1), scale: h.state.renderScale, main: [h.pipeline.main.width, h.pipeline.main.height], pr: h.renderer.getPixelRatio(), taa: h.envEdge?.taaState ?? null, lost: h.renderer.getContext().isContextLost() }; });
try {
  for (const r of [{ name: "lane", port: 5181 }, { name: "base", port: 5182 }]) {
    // 1. context loss / restore
    {
      const logs = [];
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      page.on("pageerror", (e) => logs.push("pageerror " + e.message));
      page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 200)}`); });
      await page.goto(`http://localhost:${r.port}/?tier=T1&scale=1`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
      await page.waitForTimeout(4500);
      await sweep(page, 40, 1440, 766);
      const s0 = await st(page);
      await page.screenshot({ path: path.join(outdir, `loss_${r.name}_0before.png`) });
      await page.evaluate(() => { window.__lc = window.__hero.renderer.getContext().getExtension("WEBGL_lose_context"); window.__lc.loseContext(); });
      await page.waitForTimeout(1000);
      const s1 = await st(page);
      await page.evaluate(() => window.__lc.restoreContext());
      await page.waitForTimeout(1500);
      const s2 = await st(page);
      // the engine stops on loss; a visibility change restarts its loop (updateRunning)
      await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
      await page.waitForTimeout(1500);
      await sweep(page, 40, 1440, 766, 1);
      await page.waitForTimeout(500);
      const s3 = await st(page);
      await page.screenshot({ path: path.join(outdir, `loss_${r.name}_1restored.png`) });
      await ctx.close();
      results.push({ test: "loss", name: r.name, before: s0, lost: s1, restored: s2, restarted: s3, logs });
      console.log(JSON.stringify(results[results.length - 1]));
    }
    // 2. DPR 2 boot + mid-motion resize in the live loop
    {
      const logs = [];
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      page.on("pageerror", (e) => logs.push("pageerror " + e.message));
      page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 200)}`); });
      await page.goto(`http://localhost:${r.port}/?tier=T2&scale=1`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
      await page.waitForTimeout(4500);
      const mv = sweep(page, 60, 1440, 766, 2);
      await page.waitForTimeout(300);
      await page.setViewportSize({ width: 1180, height: 820 });
      await mv;
      await sweep(page, 30, 1180, 820, 3);
      const s0 = await st(page);
      await page.screenshot({ path: path.join(outdir, `dpr2_${r.name}_afterResize.png`) });
      await ctx.close();
      results.push({ test: "dpr2resize", name: r.name, after: s0, logs });
      console.log(JSON.stringify(results[results.length - 1]));
    }
  }
} catch (e) {
  console.log("error " + e.message);
} finally {
  fs.writeFileSync(path.join(outdir, "ctxloss.json"), JSON.stringify(results, null, 1));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
