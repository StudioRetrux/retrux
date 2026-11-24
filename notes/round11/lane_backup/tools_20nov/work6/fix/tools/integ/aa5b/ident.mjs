// AA3: hashes of the lake's own targets (mirror, walk, cache) and of every linked program's preprocessed sources after a
// deterministic run, for "the mirror target is bit-identical with the resolve on / off" and "switches restore BASE".
//   node ident.mjs --port 5181 [--qs ...] [--path medium] [--frames 20] [--out file.json] [--tier T1] [--mobile]
import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";

const require = createRequire("/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf("--" + k);
  return i < 0 ? d : argv[i + 1];
};
const mobile = argv.includes("--mobile");
const port = arg("port", "5192"), qs = arg("qs", ""), frames = +arg("frames", "20"), out = arg("out", "");
const tier = arg("tier", mobile ? "T0" : "T1");
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const logs = [];
let res = null;
try {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 300)}`);
  });
  await page.addInitScript(() => {
    let h = null;
    Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } });
  });
  await page.goto(`http://localhost:${port}/?tier=${tier}&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  res = await page.evaluate((frames) => {
    const h = window.__hero;
    const r = h.renderer;
    const gl = r.getContext();
    h.debug.pointer(0, 0);
    h.debug.settle(6);
    const out = { counts: null, targets: {}, programs: {} };
    for (let i = 0; i < frames; i++) {
      h.debug.pointer(0.8 * Math.sin((2 * Math.PI * i) / 60), 0.2 * Math.sin((2 * Math.PI * i) / 80));
      h.frame(1 / 60, false);
    }
    // FNV-1a over bytes (32 bit, two seeds) -> hex
    const fnv = (u8) => {
      let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995;
      for (let i = 0; i < u8.length; i++) {
        a ^= u8[i];
        a = Math.imul(a, 0x01000193);
        b ^= u8[i] ^ (i & 255);
        b = Math.imul(b, 0x01000193);
      }
      return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
    };
    const readT = (name, t) => {
      if (!t) return;
      const w = t.width, hh = t.height;
      const isF = t.texture.type === 1015; // FloatType
      const buf = isF ? new Float32Array(w * hh * 4) : new Uint16Array(w * hh * 4);
      try {
        r.readRenderTargetPixels(t, 0, 0, w, hh, buf);
        out.targets[name] = { w, h: hh, hash: fnv(new Uint8Array(buf.buffer)) };
      } catch (e) {
        out.targets[name] = { err: String(e) };
      }
    };
    readT("mirror", h.lakeMirror?.target);
    readT("walk", h.water?.walkTarget);
    readT("cache", h.water?.cacheTarget);
    readT("cacheN", h.water?.cacheNTarget);
    readT("reflection", h.pipeline.reflection);
    // the final image
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    const fb = new Uint8Array(W * H * 4);
    r.setRenderTarget(null);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, fb);
    out.targets.final = { w: W, h: H, hash: fnv(fb) };
    // programs: preprocessed sources as linked
    for (const p of r.info.programs || []) {
      const prog = p.program;
      const sh = gl.getAttachedShaders(prog) || [];
      const src = sh.map((s) => gl.getShaderSource(s)).join("\n//----\n");
      const key = p.name + "|" + p.type;
      const hsh = fnv(new TextEncoder().encode(src));
      (out.programs[key] = out.programs[key] || []).push(hsh);
    }
    for (const k in out.programs) out.programs[k].sort();
    out.counts = h.lakeSched ? { ...h.lakeSched.counts } : null;
    return out;
  }, frames);
} catch (e) {
  logs.push("ERROR " + e.message);
} finally {
  const o = { qs, port, logs, ...res };
  if (out) fs.writeFileSync(out, JSON.stringify(o, null, 1));
  console.log(JSON.stringify({ qs, port, targets: res?.targets, counts: res?.counts, nprog: res ? Object.keys(res.programs).length : 0, logs: logs.slice(0, 5) }));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
