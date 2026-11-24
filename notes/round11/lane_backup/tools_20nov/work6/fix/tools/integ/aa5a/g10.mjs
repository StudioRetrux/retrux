// G10: console errors / warnings, DPR 1 and 2, resize, and the live engine (its own RAF loop, real mouse moves, a hold).
//   node g10.mjs --port 5193 [--qs ...]
import { createRequire } from "node:module";
const require = createRequire("/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port", "5193"), qs = arg("qs", "");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const out = [];
async function stepped(dsf) {
  const logs = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: dsf });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 200)}`); });
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=T1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  const run = (n) => page.evaluate((n) => {
    const h = window.__hero;
    const gl = h.renderer.getContext();
    const st = [];
    for (let i = 0; i < n; i++) {
      h.debug.pointer(0.8 * Math.sin(i / 20), 0.2 * Math.sin(i / 27));
      h.frame(1 / 60, false);
      if (i % 20 === 19) st.push(h.envEdge && h.envEdge.taaState ? h.envEdge.taaState.weight : null);
    }
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    const px = new Uint8Array(W * H * 4);
    h.renderer.setRenderTarget(null);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let s = 0, dark = 0;
    for (let i = 0; i < px.length; i += 4) { const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; s += l; if (l < 8) dark++; }
    return { buffer: [W, H], pixelRatio: h.renderer.getPixelRatio(), mean: +(s / (W * H)).toFixed(1), darkPx: dark, taaWeights: st, main: [h.pipeline.main.width, h.pipeline.main.height] };
  }, n);
  const a = await run(80);
  // resize (as a window resize / phone toolbar: the ResizeObserver path calls engine.resize)
  await page.setViewportSize({ width: 1100, height: 700 });
  await page.evaluate(() => window.__hero.resize());
  const b = await run(40);
  await page.setViewportSize({ width: 1440, height: 766 });
  await page.evaluate(() => window.__hero.resize());
  const c = await run(40);
  await ctx.close();
  return { dsf, before: a, afterResize: b, back: c, logs };
}
async function live() {
  const logs = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 200)}`); });
  await page.goto(`http://localhost:${port}/?debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  await page.waitForTimeout(3500);
  for (let i = 0; i < 60; i++) { await page.mouse.move(200 + i * 18, 300 + 120 * Math.sin(i / 7)); await page.waitForTimeout(40); }
  await page.mouse.move(800, 380);
  await page.mouse.down();
  await page.waitForTimeout(3000);
  await page.mouse.up();
  await page.waitForTimeout(2000);
  for (let i = 0; i < 40; i++) { await page.mouse.move(1400 - i * 30, 500); await page.waitForTimeout(30); }
  await page.mouse.move(1500, 900); // leave
  await page.waitForTimeout(1500);
  const st = await page.evaluate(() => ({ fps: window.__hero.state.fps, tier: window.__hero.state.tier, scale: window.__hero.state.renderScale, taa: window.__hero.envEdge?.taaState ?? null }));
  await ctx.close();
  return { live: st, logs };
}
try {
  out.push(await stepped(1));
  out.push(await stepped(2));
  out.push(await live());
} catch (e) {
  out.push({ error: e.message });
} finally {
  console.log(JSON.stringify(out, null, 1));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
