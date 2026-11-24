// p4hold (from the AA8 recheck's ctxloss2.mjs): WEBGL_lose_context lose / restore in the LIVE engine (its own rAF, CDP mouse), with NO
// visibilitychange: does the loop restart by itself, how long until the first frame after the restore, what the page shows 1.5 s
// after it. Per variant: name=port[?qs].   node ctxlive.mjs --outdir DIR name=5178 name2=5199 name3=5178?panokeep=1 ...
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const outdir = argv[argv.indexOf("--outdir") + 1];
const vars = argv.filter((a) => a.includes("=") && !a.startsWith("--"));
fs.mkdirSync(outdir, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const sweep = async (page, n, seed = 0) => { for (let i = 0; i < n; i++) await page.mouse.move(1440 * (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(seed + i / 10))), 766 * (0.45 + 0.1 * Math.sin(seed + i / 7))); };
const st = (page) => page.evaluate(() => { const h = window.__hero; return { time: +h.state.time.toFixed(3), taa: h.envEdge?.taaState ?? null, lost: h.renderer.getContext().isContextLost(), restoring: h.restoring ?? null, pano: h.panorama ? h.panorama.image.data.byteLength : 0 }; });
const results = [];
try {
  for (const v of vars) {
    const i0 = v.indexOf("="), name = v.slice(0, i0), spec = v.slice(i0 + 1);
    const [port, qs] = [spec.split("?")[0], spec.split("?").slice(1).join("?")];
    const logs = [];
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => logs.push("pageerror " + e.message));
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 200)}`); });
    await page.goto(`http://localhost:${port}/?tier=T1&scale=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
    await page.waitForTimeout(4500);
    await sweep(page, 40);
    const s0 = await st(page);
    await page.screenshot({ path: path.join(outdir, `${name}_0before.png`) });
    await page.evaluate(() => { window.__lc = window.__hero.renderer.getContext().getExtension("WEBGL_lose_context"); window.__lc.loseContext(); });
    await page.waitForTimeout(1000);
    const s1 = await st(page);
    // restore, then time the first engine frame after it (engine time moves only when the loop renders)
    const firstMs = await page.evaluate(() => new Promise((res) => {
      const h = window.__hero, t0 = h.state.time, c = h.renderer.domElement;
      let tR = 0;
      c.addEventListener("webglcontextrestored", () => { tR = performance.now(); }, { once: true });
      window.__lc.restoreContext();
      const poll = () => { if (tR && h.state.time !== t0) res(+(performance.now() - tR).toFixed(1)); else if (tR && performance.now() - tR > 3000) res(-1); else requestAnimationFrame(poll); };
      requestAnimationFrame(poll);
    }));
    await page.waitForTimeout(1500);
    const s2 = await st(page);
    await page.screenshot({ path: path.join(outdir, `${name}_1restored_novis.png`) });
    await sweep(page, 30, 1);
    const s3 = await st(page);
    await ctx.close();
    results.push({ name, port, qs: qs || "", before: s0, lost: s1, firstFrameAfterRestoreMs: firstMs, at1500: s2, afterSweep: s3, advanced: s2.time > s1.time, logs });
    console.log(JSON.stringify(results[results.length - 1]));
  }
} catch (e) { console.log("error " + e.message); }
finally {
  fs.writeFileSync(path.join(outdir, "ctxlive.json"), JSON.stringify(results, null, 1));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
