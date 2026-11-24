// Live engine run (its own requestAnimationFrame loop, adaptive governor free, real CDP mouse input) with per-frame crops read
// straight after each engine frame (rAF wrapper; same task, so the drawing buffer is intact).
//   node live.mjs --out DIR --variants "lane:5181,base:5182" [--qs ...]
// Script: sweep + reversals, flick, leave / re-enter, press-and-hold / release / re-press, tab hidden -> visible (engine
// stop / start via visibilitychange), resize 1440x766 -> 1100x700 -> back, all while moving. Capture windows around each.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const OUT = arg("out"), qs = arg("qs", "");
const variants = arg("variants").split(",").map((s) => { const [name, port] = s.split(":"); return { name, port }; });
fs.mkdirSync(OUT, { recursive: true });
// crop (fractions of the canvas): right slab feet + far floes right, and the left far floes
const CROPS = { R: [0.655, 0.6, 0.935, 0.86], L: [0.08, 0.6, 0.36, 0.78] };
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const summary = [];
try {
  for (const v of variants) {
    const logs = [];
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => logs.push("pageerror " + e.message));
    page.on("console", (m) => { const t = m.type(); if (t === "error" || t === "warning") logs.push(`console.${t} ${m.text().slice(0, 300)}`); });
    await page.addInitScript((CROPS) => {
      const raf = window.requestAnimationFrame.bind(window);
      window.__live = { on: false, label: "", frames: [], last: performance.now() };
      window.requestAnimationFrame = (cb) => raf((ts) => {
        cb(ts);
        const L = window.__live, h = window.__hero;
        const now = performance.now();
        if (!L.on || !h) { L.last = now; return; }
        const gl = h.renderer.getContext();
        const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
        const rec = { t: now, dt: now - L.last, label: L.label, W, H, scale: h.state.renderScale, taa: h.envEdge && h.envEdge.taaState ? { ...h.envEdge.taaState } : null, hold: h.state.hold, crops: {} };
        L.last = now;
        for (const [name, c] of Object.entries(CROPS)) {
          const x0 = Math.round(c[0] * W), x1 = Math.round(c[2] * W), y0 = Math.round(c[1] * H), y1 = Math.round(c[3] * H);
          const buf = new Uint8Array((x1 - x0) * (y1 - y0) * 4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.readPixels(x0, H - y1, x1 - x0, y1 - y0, gl.RGBA, gl.UNSIGNED_BYTE, buf);
          rec.crops[name] = { x0, y0, w: x1 - x0, h: y1 - y0, buf };
        }
        L.frames.push(rec);
      });
    }, CROPS);
    await page.goto(`http://localhost:${v.port}/?tier=T1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1" || document.documentElement.dataset.heroFailed === "1", null, { timeout: 240000 });
    await page.waitForTimeout(3500);
    const M = page.mouse;
    const cap = (on, label = "") => page.evaluate(([on, label]) => { window.__live.on = on; window.__live.label = label; }, [on, label]);
    await M.move(700, 380);
    await page.waitForTimeout(800);
    // 1. fast sweep with reversals and a flick
    await cap(true, "sweep");
    for (let i = 0; i <= 24; i++) { await M.move(700 + i * 30, 380 + 2 * i); await page.waitForTimeout(16); }
    for (let i = 0; i <= 30; i++) { await M.move(1420 - i * 40, 430 - i * 3); await page.waitForTimeout(16); }
    await M.move(1100, 300, { steps: 3 });
    await page.waitForTimeout(500);
    // 2. leave (pointer out of the window) and re-enter at the left
    await cap(true, "leave");
    for (let i = 0; i <= 10; i++) { await M.move(1100 + i * 33, 300 + i * 10); await page.waitForTimeout(16); }
    await M.move(1500, 420); // leave
    await page.evaluate(() => document.documentElement.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" })));
    await page.waitForTimeout(700);
    await M.move(150, 450, { steps: 2 }); // re-enter
    for (let i = 0; i <= 15; i++) { await M.move(150 + i * 20, 450 - i * 4); await page.waitForTimeout(16); }
    await page.waitForTimeout(600);
    await cap(false);
    // 3. hold: press, mid, release, re-press during the release
    await M.move(790, 400, { steps: 4 });
    await page.waitForTimeout(400);
    await cap(true, "hold");
    await M.down();
    await page.waitForTimeout(2600);
    await M.up();
    await page.waitForTimeout(420);
    await M.down();
    await page.waitForTimeout(2000);
    await M.up();
    await page.waitForTimeout(1200);
    await cap(false);
    // 4. tab hidden -> visible mid-motion
    await cap(true, "tab");
    for (let i = 0; i <= 12; i++) { await M.move(500 + i * 40, 380); await page.waitForTimeout(16); }
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
    for (let i = 0; i <= 20; i++) { await M.move(980 - i * 30, 380 + i * 3); await page.waitForTimeout(40); }
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" }); document.dispatchEvent(new Event("visibilitychange")); });
    for (let i = 0; i <= 12; i++) { await M.move(380 + i * 30, 440); await page.waitForTimeout(16); }
    await page.waitForTimeout(500);
    await cap(false);
    // 5. resize mid-motion
    await cap(true, "resize");
    for (let i = 0; i <= 10; i++) { await M.move(700 + i * 30, 380); await page.waitForTimeout(16); }
    await page.setViewportSize({ width: 1100, height: 700 });
    for (let i = 0; i <= 15; i++) { await M.move(1000 - i * 40, 360); await page.waitForTimeout(16); }
    await page.setViewportSize({ width: 1440, height: 766 });
    for (let i = 0; i <= 15; i++) { await M.move(400 + i * 40, 380); await page.waitForTimeout(16); }
    await page.waitForTimeout(500);
    await cap(false);
    // collect
    const n = await page.evaluate(() => window.__live.frames.length);
    const meta = [];
    const dir = path.join(OUT, v.name);
    fs.mkdirSync(dir, { recursive: true });
    for (let j = 0; j < n; j += 20) {
      const chunk = await page.evaluate(([a, b]) => window.__live.frames.slice(a, b).map((r) => {
        const crops = {};
        for (const [k, c] of Object.entries(r.crops)) { let s = ""; for (let i = 0; i < c.buf.length; i += 0x8000) s += String.fromCharCode.apply(null, c.buf.subarray(i, i + 0x8000)); crops[k] = { ...c, buf: btoa(s) }; }
        return { ...r, crops };
      }), [j, j + 20]);
      chunk.forEach((r, q) => {
        const idx = j + q;
        const m = { idx, t: r.t, dt: r.dt, label: r.label, W: r.W, H: r.H, scale: r.scale, taa: r.taa, hold: r.hold, crops: {} };
        for (const [k, c] of Object.entries(r.crops)) {
          fs.writeFileSync(path.join(dir, `${k}${String(idx).padStart(4, "0")}.bin`), zlib.deflateSync(Buffer.from(c.buf, "base64"), { level: 1 }));
          m.crops[k] = { x0: c.x0, y0: c.y0, w: c.w, h: c.h };
        }
        meta.push(m);
      });
    }
    const fps = await page.evaluate(() => ({ fps: window.__hero.state.fps, scale: window.__hero.state.renderScale, tier: window.__hero.state.tier }));
    fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify({ variant: v, fps, frames: meta }));
    fs.writeFileSync(path.join(OUT, `${v.name}.log.txt`), logs.join("\n"));
    summary.push(`${v.name}: ${n} frames, ${JSON.stringify(fps)}, ${logs.length} errors/warnings${logs.length ? " :: " + logs.slice(0, 3).join(" | ") : ""}`);
    await ctx.close();
  }
} catch (e) {
  summary.push("ERROR " + (e.stack || e.message));
} finally {
  console.log("[live] " + summary.join("\n  "));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
