// p4orb3: temporal stability at a pose: K consecutive frames of 1/60 s (engine loop off), crops around the projected orb.
//   node flk.mjs --port 5176 --qs "" --tag lane --out DIR --pose p05 --tau 3.3 --k 12
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port", "5176"), qs = arg("qs", ""), out = arg("out", "."), tag = arg("tag", "x"), K = +arg("k", "12");
const pose = arg("pose", "p05"), tau = arg("tau", "3.3");
const P = { q00: [null, 0], q03: ["eye", 0], p04: ["expand", 0.9], p05: ["expand", 2.37], p06: ["expand", 2.97], p07: ["release", 0.33] };
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  fs.mkdirSync(out, { recursive: true });
  const r = await page.evaluate(([ph, t, tau, K]) => {
    const h = window.__hero, gl = h.renderer.getContext();
    h.debug.pointer(0, 0); h.debug.pose(null); h.debug.settle(6);
    if (ph === "expand" || ph === "release") {
      if (tau !== "n") h.rings.clock = +tau;
      h.debug.pose("expand", 0); h.debug.settle(0.1);
      if (ph === "expand") { h.debug.pose("expand", t); h.debug.settle(1.0); }
      else { h.debug.pose("expand", 2.97); h.debug.settle(1.0); h.debug.pose("release", t); h.debug.settle(1.0); }
    } else h.debug.settle(ph === "eye" ? 1.5 : 0.5);
    if (h.orb) h.orb.frame = 2400;
    for (let i = 0; i < 9; i++) h.frame(1 / 60, false);
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    const u = h.orb.material.uniforms, cam = h.rig.camera;
    const c = u.uCenter.value.clone(), R = u.uRadius.value, p = c.clone().project(cam), d = c.distanceTo(cam.position);
    const f = H / 2 / Math.tan((cam.fov * Math.PI) / 360);
    const orb = { x: (p.x * 0.5 + 0.5) * W, y: (1 - (p.y * 0.5 + 0.5)) * H, r: (R / Math.sqrt(Math.max(d * d - R * R, 1e-6))) * f };
    const hs = Math.ceil(orb.r * 3.6), x0 = Math.max(0, Math.round(orb.x - hs)), y0 = Math.max(0, Math.round(H - orb.y - hs));
    const w = Math.min(W - x0, 2 * hs), hh = Math.min(H - y0, 2 * hs);
    const frames = [];
    for (let k = 0; k < K; k++) {
      h.frame(1 / 60, false); h.renderer.setRenderTarget(null);
      const buf = new Uint8Array(w * hh * 4); gl.readPixels(x0, y0, w, hh, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      let s = ""; for (let j = 0; j < buf.length; j += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(j, j + 0x8000));
      frames.push(btoa(s));
    }
    return { frames, w, h: hh, x0, y0, H, orb };
  }, [P[pose][0], P[pose][1], tau, K]);
  r.frames.forEach((b, k) => fs.writeFileSync(`${out}/${tag}_${pose}_${k}.rgba`, Buffer.from(b, "base64")));
  fs.writeFileSync(`${out}/${tag}_${pose}.json`, JSON.stringify({ w: r.w, h: r.h, x0: r.x0, y0: r.y0, H: r.H, orb: r.orb, K }));
  console.log(JSON.stringify({ tag, pose, K, w: r.w, h: r.h }));
} catch (e) { console.log("ERROR " + e.message); }
finally { await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]); process.exit(0); }
