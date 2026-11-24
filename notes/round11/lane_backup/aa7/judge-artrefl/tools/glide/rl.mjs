// REAL-LOOP capture: the engine's own requestAnimationFrame loop (no RAF patch), trusted CDP Input.dispatchMouseEvent
// pointer sweeps, and a gl.readPixels grab of the six waterline boxes right after every engine frame (hook on __hero.frame,
// which the engine's tick calls as this.frame). Output = cap.mjs format (rows 380..766, pixels outside the boxes = 0).
//   node rl.mjs --port 5181 --out DIR --path slow|medium [--frames 180] [--qs ""] [--pre 2]
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port"), out = arg("out"), pathName = arg("path", "slow"), N = +arg("frames", "180"), qs = arg("qs", ""), preS = +arg("pre", "2");
const vw = 1440, vh = 766, Y0 = 380, Y1 = 766;
const BOXES = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
const boxes = Object.values(BOXES);
const P = Math.PI * 2, S = Math.sin;
const pathAt = (t) => pathName === "slow" ? [0.5 * S((P * t) / 20), 0.1 * S((P * t) / 27)] : [0.8 * S((P * t) / 8), 0.25 * S((P * t) / 11)];
fs.mkdirSync(out, { recursive: true });
const logs = [];
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
let meta = null;
try {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { const t = m.type(); if (t === "error" || t === "warning") logs.push(`console.${t} ${m.text().slice(0, 300)}`); });
  const url = `http://localhost:${port}/?tier=T1&scale=1${qs ? "&" + qs : ""}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1" || document.documentElement.dataset.heroFailed === "1", null, { timeout: 240000 });
  const cdp = await ctx.newCDPSession(page);
  const move = async (t) => { const [nx, ny] = pathAt(t); await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: ((nx + 1) / 2) * vw, y: ((1 - ny) / 2) * vh, button: "none", pointerType: "mouse" }); };
  await move(-preS);
  await page.waitForTimeout(8000); // intro (real loop)
  await page.evaluate(([boxes, N]) => {
    const h = window.__hero, gl = h.renderer.getContext();
    const orig = h.frame;
    const R = (window.__rl = { on: false, frames: [], info: [], N, calls: 0 });
    const size = boxes.reduce((s, b) => s + (b[2] - b[0]) * (b[3] - b[1]) * 4, 0);
    h.frame = function (dt, warm) {
      const m0 = h.lakeSched ? h.lakeSched.counts.mirror : -1, w0 = h.lakeSched ? h.lakeSched.counts.walk : -1;
      orig.call(this, dt, warm);
      R.calls++;
      if (!R.on || R.frames.length >= R.N) return;
      const H = gl.drawingBufferHeight;
      h.renderer.setRenderTarget(null);
      const buf = new Uint8Array(size);
      let off = 0;
      for (const [x0, y0, x1, y1] of boxes) { const n = (x1 - x0) * (y1 - y0) * 4; gl.readPixels(x0, H - y1, x1 - x0, y1 - y0, gl.RGBA, gl.UNSIGNED_BYTE, buf.subarray(off, off + n)); off += n; }
      R.frames.push(buf);
      R.info.push({ t: performance.now(), dt, W: gl.drawingBufferWidth, H, mirror: h.lakeSched ? h.lakeSched.counts.mirror - m0 : -1, walk: h.lakeSched ? h.lakeSched.counts.walk - w0 : -1, taa: h.envEdge && h.envEdge.taaState ? h.envEdge.taaState : null, scale: h.state.renderScale, pos: h.rig.camera.position.toArray(), quat: h.rig.camera.quaternion.toArray() });
    };
  }, [boxes, N]);
  // pre-roll then record while sweeping
  const t0 = Date.now();
  let started = false, it = 0;
  while (true) {
    const t = (Date.now() - t0) / 1000 - preS;
    await move(t);
    if (!started && t >= 0) { await page.evaluate(() => { window.__rl.on = true; }); started = true; }
    if (started && ++it % 8 === 0) { const n = await page.evaluate(() => window.__rl.frames.length); if (n >= N) break; }
    if (t > 30) { logs.push("ERROR timeout"); break; }
    await new Promise((r) => setTimeout(r, 6));
  }
  const info = await page.evaluate(() => window.__rl.info);
  const n = info.length;
  const W = vw, rows = Y1 - Y0;
  for (let k0 = 0; k0 < n; k0 += 10) {
    const b64s = await page.evaluate(([a, b]) => {
      const out = [];
      for (let k = a; k < b; k++) { const u8 = window.__rl.frames[k]; let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); out.push(btoa(s)); }
      return out;
    }, [k0, Math.min(n, k0 + 10)]);
    b64s.forEach((b64, j) => {
      const k = k0 + j, src = Buffer.from(b64, "base64"), full = Buffer.alloc(W * rows * 4);
      let off = 0;
      for (const [x0, y0, x1, y1] of boxes) {
        const bw = x1 - x0, bh = y1 - y0;
        for (let r = 0; r < bh; r++) { const dr = Y1 - y1 + r; src.copy(full, (dr * W + x0) * 4, off + r * bw * 4, off + (r + 1) * bw * 4); }
        off += bw * bh * 4;
      }
      fs.writeFileSync(path.join(out, `f${String(k).padStart(4, "0")}.bin`), zlib.deflateSync(full, { level: 1 }));
    });
  }
  const calls = await page.evaluate(() => window.__rl.calls);
  meta = { url, path: pathName, real: true, frames: n, W, H: vh, y0: Y0, y1: Y1, vw, vh, calls, info: info.map((x, k) => ({ k, ...x })) };
} catch (e) {
  logs.push("ERROR " + (e.stack || e.message));
} finally {
  if (meta) fs.writeFileSync(path.join(out, "meta.json"), JSON.stringify(meta));
  fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n"));
  const dts = meta ? meta.info.slice(1).map((x, i) => x.t - meta.info[i].t) : [];
  dts.sort((a, b) => a - b);
  console.log(`[rl] ${out}: ${meta ? meta.frames : 0} frames, frame ms med ${dts[dts.length >> 1]?.toFixed(1)} p90 ${dts[Math.floor(dts.length * 0.9)]?.toFixed(1)} max ${dts[dts.length - 1]?.toFixed(1)}; mirror frames ${meta ? meta.info.filter((x) => x.mirror > 0).length : 0}; ${logs.length} log lines`);
  for (const l of logs.slice(0, 8)) console.log("  " + l);
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
