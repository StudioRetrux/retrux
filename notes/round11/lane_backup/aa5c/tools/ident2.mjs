// AA5c: per-frame hashes of the mirror, walk and final image over a deterministic moving run (+ the linked programs), for
// "bit-identical with the switch on / off" and "off == the AA3 lane".
//   node ident2.mjs --port 5195 [--qs ...] [--path medium|fast|slow] [--frames 60] [--out file.json] [--vw 1440 --vh 766]
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port", "5195"), qs = arg("qs", ""), frames = +arg("frames", "60"), out = arg("out", ""), pathName = arg("path", "medium");
const dumpK = +arg("dump", "-1");
const vw = +arg("vw", "1440"), vh = +arg("vh", "766"), dsf = +arg("dsf", "1"), tier = arg("tier", "T1");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
let res = null;
try {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dsf });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 300)}`); });
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=${tier}&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  res = await page.evaluate(([frames, pathName, dumpK]) => {
    const h = window.__hero, r = h.renderer, gl = r.getContext();
    const S = Math.sin, P = Math.PI * 2;
    // cap.mjs's paths: [nx, ny, event]
    const ptr = (i) => {
      const t = i / 60;
      switch (pathName) {
        case "rest": return [null, 0, null];
        case "slow": return [0.5 * S((P * t) / 20), 0.1 * S((P * t) / 27), null];
        case "fast": return [1.0 * S((P * t) / 2.5), 0.4 * S((P * t) / 3.3), null];
        case "diag": return [0.9 * S((P * t) / 4), 0.9 * S((P * t) / 4), null];
        case "reverse": { const u = (t % 2) / 2; const tri = u < 0.5 ? u * 4 - 1 : 3 - u * 4; return [0.9 * tri, 0, null]; }
        case "hold": return [0.15, 0.1, i === 30 ? "down" : i === 330 ? "up" : null];
        case "holdpan": return [0.6 * S((P * t) / 6), 0.3 * S((P * t) / 7), i === 30 ? "down" : i === 390 ? "up" : null];
        case "leave": return t < 2 ? [Math.min(1, t * 0.6), 0.2, null] : [null, 0, i === 120 ? "leave" : null];
        default: return [0.8 * S((P * t) / 8), 0.25 * S((P * t) / 11), null];
      }
    };
    const setPtr = (p) => {
      if (p[0] === null) { h.debug.pointer(null); h.state.pointer.active = false; } else h.debug.pointer(p[0], p[1]);
      if (p[2] === "down") window.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: innerWidth * 0.55, clientY: innerHeight * 0.45, pointerType: "mouse", bubbles: true }));
      if (p[2] === "up") window.dispatchEvent(new PointerEvent("pointerup", { button: 0, pointerType: "mouse", bubbles: true }));
      if (p[2] === "leave") document.documentElement.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }));
    };
    const fnv = (u8) => {
      let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995;
      for (let i = 0; i < u8.length; i++) { a ^= u8[i]; a = Math.imul(a, 0x01000193); b ^= u8[i] ^ (i & 255); b = Math.imul(b, 0x01000193); }
      return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
    };
    const readT = (t) => {
      if (!t) return null;
      const w = t.width, hh = t.height;
      const buf = t.texture.type === 1015 ? new Float32Array(w * hh * 4) : new Uint16Array(w * hh * 4);
      try { r.readRenderTargetPixels(t, 0, 0, w, hh, buf); return fnv(new Uint8Array(buf.buffer)); } catch (e) { return "err " + e; }
    };
    const p0 = ptr(0);
    if (p0[0] === null) h.debug.pointer(null); else h.debug.pointer(p0[0], p0[1]);
    h.debug.settle(6);
    const per = { mirror: [], walk: [], final: [], mirrorDrawn: [] };
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, fb = new Uint8Array(W * H * 4);
    for (let i = 0; i < frames; i++) {
      setPtr(ptr(i));
      const m0 = h.lakeSched ? h.lakeSched.counts.mirror : 0;
      h.frame(1 / 60, false);
      per.mirrorDrawn.push(h.lakeSched ? h.lakeSched.counts.mirror - m0 : -1);
      per.mirror.push(readT(h.lakeMirror?.target));
      per.walk.push(readT(h.water?.walkTarget));
      r.setRenderTarget(null);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, fb);
      per.final.push(fnv(fb));
      if (i === dumpK) { let bin = ""; for (let j = 0; j < fb.length; j += 32768) bin += String.fromCharCode.apply(null, fb.subarray(j, j + 32768)); per.dump = { k: i, W, H, b64: btoa(bin) }; }
    }
    const programs = {};
    for (const p of r.info.programs || []) {
      const sh = gl.getAttachedShaders(p.program) || [];
      const src = sh.map((s) => gl.getShaderSource(s)).join("\n//----\n");
      const key = p.name + "|" + p.type;
      (programs[key] = programs[key] || []).push(fnv(new TextEncoder().encode(src)));
    }
    for (const k in programs) programs[k].sort();
    return { per, programs, counts: h.lakeSched ? { ...h.lakeSched.counts } : null };
  }, [frames, pathName, dumpK]);
} catch (e) {
  logs.push("ERROR " + e.message);
} finally {
  if (res?.per?.dump && out) { fs.writeFileSync(out.replace(/\.json$/, `_k${res.per.dump.k}_${res.per.dump.W}x${res.per.dump.H}.rgba`), Buffer.from(res.per.dump.b64, "base64")); delete res.per.dump; }
  const o = { qs, port, path: pathName, logs, ...res };
  if (out) fs.writeFileSync(out, JSON.stringify(o, null, 1));
  console.log(JSON.stringify({ qs, port, path: pathName, frames: res?.per.final.length, mirrorDraws: res?.per.mirrorDrawn.reduce((a, b) => a + b, 0), nprog: res ? Object.keys(res.programs).length : 0, logs: logs.slice(0, 5) }));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
