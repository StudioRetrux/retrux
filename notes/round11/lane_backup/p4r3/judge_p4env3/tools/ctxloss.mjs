// judge_p4env3: WebGL context loss / restore check with frame stepping (engine RAF off). Two pages on the same lab URL:
// page N never loses its context, page L loses and restores it at t ~8.5 s; both then step the same frames, and the frames at
// the same sim time are written as PNGs (N vs L should differ only by what the restore cannot rebuild, e.g. TAA history).
// node ctxloss.mjs <url> <outDir>
import { createRequire } from "node:module";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [url, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
const shot = async (page, name) => {
  const r = await page.evaluate(() => {
    const h = window.__hero; const gl = h.renderer.getContext();
    h.frame(1 / 60, false); // (render and read in the same task: the default framebuffer is not preserved)
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const fb = new Uint8Array(W * H * 4);
    h.renderer.setRenderTarget(null); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, fb);
    let bin = ""; const CH = 0x8000; for (let i = 0; i < fb.length; i += CH) bin += String.fromCharCode.apply(null, fb.subarray(i, i + CH));
    return { W, H, b64: btoa(bin), time: +h.state.time.toFixed(3) };
  });
  const fb = Buffer.from(r.b64, "base64"); const raw = Buffer.alloc(r.W * r.H * 3);
  for (let y = 0; y < r.H; y++) for (let x = 0; x < r.W; x++) { const a = ((r.H - 1 - y) * r.W + x) * 4, d = (y * r.W + x) * 3; raw[d] = fb[a]; raw[d + 1] = fb[a + 1]; raw[d + 2] = fb[a + 2]; }
  const p = `${out}/${name}.png`; fs.writeFileSync(p + ".rgb", raw);
  execFileSync("/opt/homebrew/bin/ffmpeg", ["-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", r.W + "x" + r.H, "-i", p + ".rgb", p]); fs.unlinkSync(p + ".rgb");
  logs.push(`${name} t=${r.time}`);
};
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    let h = null;
    Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } });
  });
  const pages = {};
  for (const k of ["N", "L"]) {
    const p = await ctx.newPage();
    p.on("pageerror", (e) => logs.push(`${k} pageerror ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`${k} console.${m.type()} ${m.text().slice(0, 200)}`); });
    await p.goto(url, { waitUntil: "domcontentloaded" });
    await p.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
    await p.evaluate(() => { const h = window.__hero; h.debug.pointer(null); h.debug.settle(6); for (let i = 0; i < 150; i++) h.frame(1 / 60, false); });
    pages[k] = p;
  }
  // page L: lose + restore (nothing renders meanwhile: RAF is off)
  await pages.L.evaluate(async () => {
    const h = window.__hero; const c = h.renderer.domElement; const ext = h.renderer.getContext().getExtension("WEBGL_lose_context");
    await new Promise((res) => { c.addEventListener("webglcontextlost", res, { once: true }); ext.loseContext(); });
    await new Promise((res) => { c.addEventListener("webglcontextrestored", res, { once: true }); setTimeout(() => ext.restoreContext(), 50); });
  });
  await pages.L.waitForFunction(() => window.__hero.restoring !== true, null, { timeout: 60000 });
  logs.push(`L restored, lost=${await pages.L.evaluate(() => window.__hero.renderer.getContext().isContextLost())}`);
  // both: the same frames from here
  for (const [k, p] of Object.entries(pages)) {
    await p.evaluate(() => { const h = window.__hero; for (let i = 0; i < 60; i++) h.frame(1 / 60, false); });
    await shot(p, `${k}_t1`);
    await p.evaluate(() => { const h = window.__hero; h.debug.pointer(0.98, 0.98); for (let i = 0; i < 150; i++) h.frame(1 / 60, false); });
    await shot(p, `${k}_t2_ptrTR`);
  }
} catch (e) { logs.push("ERROR " + e.message); }
finally { fs.writeFileSync(`${out}/log.txt`, logs.join("\n")); console.log(logs.join("\n")); await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]); process.exit(0); }
