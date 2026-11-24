// AA3 capture: deterministic, manually stepped frames of the hero lab, read straight from the WebGL drawing buffer.
//   node cap.mjs --port 5181 --out DIR --path slow [--qs "a=1&b=2"] [--frames 240] [--pre 30] [--vw 1440 --vh 766]
//                [--dsf 1] [--tier T1] [--rows y0,y1] [--mask] [--mobile] [--full N,M,...]
// The engine's own RAF loop is disabled (window.__hero.start is patched before main.ts runs), so every session replays the
// same simulation: warm-up frame, settle, then exactly one __hero.frame(1/60) per captured frame with a scripted pointer.
// Frames: DIR/fNNNN.bin = zlib(raw RGBA, top-down rows rows[0]..rows[1]-1, full width); DIR/meta.json.
// --mask: per frame two more renders (no lake / no hero) -> DIR/mNNNN.bin = zlib(1 byte per px: bit0 lake visible (flat black vs
//         flat white lake differ > 128 lv), bit1 lake partial (16..128), bit2 hero (>3 lv change without the hero)).
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf("--" + k);
  return i < 0 ? d : argv[i + 1];
};
const flag = (k) => argv.includes("--" + k);
const port = arg("port", "5191");
const out = arg("out");
const pathName = arg("path", "slow");
const qs = arg("qs", "");
const frames = +arg("frames", "240");
const pre = +arg("pre", "30");
const mobile = flag("mobile");
const vw = +arg("vw", mobile ? "390" : "1440");
const vh = +arg("vh", mobile ? "844" : "766");
const dsf = +arg("dsf", mobile ? "3" : "1");
const tier = arg("tier", mobile ? "T0" : "T1");
const rowsArg = arg("rows", "");
const wantMask = flag("mask");
const fullList = (arg("full", "") || "").split(",").filter(Boolean).map(Number);
const scale = arg("scale", "1");
if (!out) throw new Error("--out");
fs.mkdirSync(out, { recursive: true });

// Pointer paths: per frame index i (60 fps, including the pre-roll) -> [nx, ny, event]
function pointerAt(i) {
  const t = i / 60;
  const S = Math.sin, P = Math.PI * 2;
  switch (pathName) {
    case "rest":
      return [null, 0, null];
    case "drift":
      // the pointer never moved: rest + handheld drift
      return [null, 0, null];
    case "slow":
      return [0.5 * S((P * t) / 20), 0.1 * S((P * t) / 27), null];
    case "medium":
      return [0.8 * S((P * t) / 8), 0.25 * S((P * t) / 11), null];
    case "fast":
      return [1.0 * S((P * t) / 2.5), 0.4 * S((P * t) / 3.3), null];
    case "diag":
      return [0.9 * S((P * t) / 4), 0.9 * S((P * t) / 4), null];
    case "reverse": {
      // fast sweep right then hard reversal
      const u = (t % 2) / 2;
      const tri = u < 0.5 ? u * 4 - 1 : 3 - u * 4;
      return [0.9 * tri, 0, null];
    }
    case "hold":
      // press at 0.5 s, hold 5 s, release, 3 s after
      return [0.15, 0.1, i === 30 ? "down" : i === 330 ? "up" : null];
    case "holdpan":
      // hold with the pointer moving
      return [0.6 * S((P * t) / 6), 0.3 * S((P * t) / 7), i === 30 ? "down" : i === 390 ? "up" : null];
    case "leave":
      // sweep to the right edge, then the pointer leaves the window (recentre)
      return t < 2 ? [Math.min(1, t * 0.6), 0.2, null] : [null, 0, i === 120 ? "leave" : null];
    default:
      throw new Error("path " + pathName);
  }
}

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const logs = [];
let meta = null;
try {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dsf, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => {
    const t = m.type();
    if (t === "error" || t === "warning") logs.push(`console.${t} ${m.text().slice(0, 400)}`);
  });
  await page.addInitScript(() => {
    let h = null;
    Object.defineProperty(window, "__hero", {
      configurable: true,
      get() {
        return h;
      },
      set(v) {
        h = v;
        v.start = function () {};
      },
    });
  });
  if (mobile) await page.addInitScript(() => { window.__capTouch = true; });
  const url = `http://localhost:${port}/?tier=${tier}&scale=${scale}&debug=1${qs ? "&" + qs : ""}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1" || document.documentElement.dataset.heroFailed === "1", null, { timeout: 240000 });
  const ok = await page.evaluate(() => document.documentElement.dataset.heroReady === "1");
  if (!ok) throw new Error("hero failed");
  // Helpers in the page.
  await page.evaluate((rowsArg) => {
    const h = window.__hero;
    const gl = h.renderer.getContext();
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    let y0 = 0, y1 = H;
    if (rowsArg) {
      const r = rowsArg.split(",").map(Number);
      y0 = Math.max(0, Math.round(r[0] * (r[2] ? H / r[2] : 1)));
      y1 = Math.min(H, Math.round(r[1] * (r[2] ? H / r[2] : 1)));
    }
    const n = W * (y1 - y0) * 4;
    const buf = new Uint8Array(n);
    const b64 = (u8) => {
      let s = "";
      const C = 0x8000;
      for (let i = 0; i < u8.length; i += C) s += String.fromCharCode.apply(null, u8.subarray(i, i + C));
      return btoa(s);
    };
    const read = () => {
      h.renderer.setRenderTarget(null);
      // readPixels rows are bottom-up: rows y0..y1 top-down = H - y1 .. H - y0 bottom-up
      gl.readPixels(0, H - y1, W, y1 - y0, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      return b64(buf);
    };
    const heroParts = () => [h.rings?.root, h.orb?.mesh, h.shards?.mesh].filter(Boolean);
    const renderOnly = () => {
      // the HDR frame + post again, same state (LakeSchedule / lake passes not re-run)
      h.pipeline.render(h.scene, h.rig.camera, h.hooks, 0);
      h.post.render(h.pipeline.main.texture, h.postParams);
    };
    window.__cap = {
      W,
      H,
      y0,
      y1,
      step(ptr, ev, wantMask, wantFrame) {
        const d = h.debug;
        if (ptr[0] === null) d.pointer(null);
        else d.pointer(ptr[0], ptr[1]);
        if (ptr[0] === null && ev !== "keep") h.state.pointer.active = false;
        if (window.__capTouch && ptr[0] !== null) h.state.pointer.type = "touch";
        if (ev === "down") window.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: innerWidth * 0.55, clientY: innerHeight * 0.45, pointerType: "mouse", bubbles: true }));
        if (ev === "up") window.dispatchEvent(new PointerEvent("pointerup", { button: 0, pointerType: "mouse", bubbles: true }));
        if (ev === "leave") document.documentElement.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }));
        const mBefore = h.lakeSched ? h.lakeSched.counts.mirror : -1;
        const wBefore = h.lakeSched ? h.lakeSched.counts.walk : -1;
        h.frame(1 / 60, false);
        const cam = h.rig.camera;
        const info = {
          mirror: h.lakeSched ? h.lakeSched.counts.mirror - mBefore : -1,
          walk: h.lakeSched ? h.lakeSched.counts.walk - wBefore : -1,
          cacheOn: h.water?.material.uniforms.uLkCacheOn ? h.water.material.uniforms.uLkCacheOn.value : -1,
          pos: cam.position.toArray(),
          quat: cam.quaternion.toArray(),
          proj: Array.from(cam.projectionMatrix.elements),
          time: h.state.time,
          hold: h.state.hold,
          phase: h.choreo.phase,
          taa: h.envEdge && h.envEdge.taaState ? h.envEdge.taaState : null,
        };
        if (!wantFrame) return { info };
        const f = read();
        if (!wantMask) return { info, f };
        // the lake drawn flat black, then flat white (coverage), then the hero hidden
        const g = h.water.group.children;
        const saved = g.map((m) => m.material);
        if (!window.__flatMat) {
          const SM = h.water.material.constructor;
          const V3 = h.rig.camera.position.constructor;
          window.__flatMat = new SM({
            name: "cap-flat",
            vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
            fragmentShader: "uniform vec3 uC; void main() { gl_FragColor = vec4(uC, 1.0); }",
            uniforms: { uC: { value: new V3(0, 0, 0) } },
          });
        }
        const fm = window.__flatMat;
        g.forEach((m) => (m.material = fm));
        fm.uniforms.uC.value.set(0, 0, 0);
        renderOnly();
        const fl = read();
        fm.uniforms.uC.value.set(8, 8, 8);
        renderOnly();
        const fw = read();
        g.forEach((m, i) => (m.material = saved[i]));
        const parts = heroParts();
        const vis = parts.map((p) => p.visible);
        parts.forEach((p) => (p.visible = false));
        renderOnly();
        const fh = read();
        parts.forEach((p, i) => (p.visible = vis[i]));
        return { info, f, fl, fw, fh };
      },
    };
  }, rowsArg);
  const dims = await page.evaluate(() => ({ W: window.__cap.W, H: window.__cap.H, y0: window.__cap.y0, y1: window.__cap.y1, gpu: window.__hero.gpu, tier: window.__hero.state.tier, dpr: devicePixelRatio, scale: window.__hero.state.renderScale }));
  // optional page-side setup (lab only), e.g. --eval "__hero.water.material.uniforms.uLakeDebug.value = 9"
  if (arg("eval", "")) await page.evaluate(arg("eval", ""));
  // settle: intro done, springs at the path's start
  const p0 = pointerAt(0);
  await page.evaluate((p0) => {
    const h = window.__hero;
    if (p0[0] === null) h.debug.pointer(null);
    else h.debug.pointer(p0[0], p0[1]);
    h.debug.settle(6);
  }, p0);
  meta = { url, path: pathName, frames, pre, ...dims, vw, vh, dsf, info: [] };
  const W = dims.W, rows = dims.y1 - dims.y0;
  const total = pre + frames;
  for (let i = 0; i < total; i++) {
    const p = pointerAt(i);
    const save = i >= pre;
    const r = await page.evaluate(([ptr, ev, m, s]) => window.__cap.step(ptr, ev, m, s), [[p[0], p[1]], p[2], wantMask && save, save]);
    if (!save) continue;
    const k = i - pre;
    meta.info.push({ k, ...r.info, ptr: [p[0], p[1]], ev: p[2] });
    const put = (b64, name) => fs.writeFileSync(path.join(out, name), zlib.deflateSync(Buffer.from(b64, "base64"), { level: 1 }));
    // top-down flip is done by the reader (rows come bottom-up)
    put(r.f, `f${String(k).padStart(4, "0")}.bin`);
    if (r.fl) {
      const a = Buffer.from(r.f, "base64"), b = Buffer.from(r.fl, "base64"), w = Buffer.from(r.fw, "base64"), c = Buffer.from(r.fh, "base64");
      const m = Buffer.alloc(W * rows);
      for (let j = 0, q = 0; q < m.length; j += 4, q++) {
        const dl = Math.max(Math.abs(w[j] - b[j]), Math.abs(w[j + 1] - b[j + 1]), Math.abs(w[j + 2] - b[j + 2]));
        const dh = Math.max(Math.abs(a[j] - c[j]), Math.abs(a[j + 1] - c[j + 1]), Math.abs(a[j + 2] - c[j + 2]));
        m[q] = (dl > 128 ? 1 : 0) | (dl > 16 && dl <= 128 ? 2 : 0) | (dh > 3 ? 4 : 0);
      }
      fs.writeFileSync(path.join(out, `m${String(k).padStart(4, "0")}.bin`), zlib.deflateSync(m, { level: 1 }));
      if (flag("dbgmask")) {
        put(r.fl, `l${String(k).padStart(4, "0")}.bin`);
        put(r.fw, `w${String(k).padStart(4, "0")}.bin`);
        put(r.fh, `h${String(k).padStart(4, "0")}.bin`);
      }
    }
    if (fullList.includes(k)) logs.push(`full ${k}`);
  }
} catch (e) {
  logs.push("ERROR " + (e.stack || e.message));
} finally {
  if (meta) fs.writeFileSync(path.join(out, "meta.json"), JSON.stringify(meta));
  fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n"));
  console.log(`[cap] ${out}: ${meta ? meta.info.length : 0} frames; ${logs.filter((l) => /error|warning|ERROR/.test(l)).length} errors/warnings`);
  for (const l of logs.filter((l) => /error|warning|ERROR/.test(l)).slice(0, 10)) console.log("  " + l);
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
