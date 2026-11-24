// p4orb fixer: deterministic A/B (the judge's flick.mjs method): engine loop off (start() stubbed), the same call sequence per
// config from a fresh page, full-frame readPixels after N frames of 1/60 s; one page per config; variants = live JS before poses.
//   node detab.mjs --port 5176 --out DIR --tag lane [--qs "p4orb=0"] [--js "..."] [--poses p05,p06,q00,q03] [--n 9]
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port", "5176"), qs = arg("qs", ""), out = arg("out", "."), tag = arg("tag", "x"), js = arg("js", ""), N = +arg("n", "9");
const poses = arg("poses", "p05,p06,q00,q03").split(",");
const tau0 = arg("tau0", "") === "" ? null : +arg("tau0");
const P = { q00: [null, 0], q03: ["eye", 0], p04: ["expand", 0.9], p05: ["expand", 2.37], p06: ["expand", 2.97], p07: ["release", 0.33], p08: ["release", 0.57] };
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 200)}`); });
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  if (js) await page.evaluate(js);
  fs.mkdirSync(out, { recursive: true });
  for (const key of poses) {
    const [ph, t] = P[key];
    const r = await page.evaluate(([ph, t, N, tau0]) => {
      const h = window.__hero, gl = h.renderer.getContext();
      h.debug.pointer(0, 0);
      h.debug.pose(null);
      h.debug.settle(6);
      if (ph === "expand") { if (tau0 !== null) h.rings.tau = tau0; h.debug.pose("expand", 0); h.debug.settle(0.1); h.debug.pose("expand", t); h.debug.settle(1.0); }
      else if (ph === "eye") { h.debug.settle(1.5); }
      else if (ph === "release") { h.debug.pose("expand", 0); h.debug.settle(0.1); h.debug.pose("expand", 2.97); h.debug.settle(1.0); h.debug.pose("release", t); h.debug.settle(1.0); }
      else { h.debug.settle(0.5); }
      for (let i = 0; i < N; i++) h.frame(1 / 60, false);
      h.renderer.setRenderTarget(null);
      const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
      const buf = new Uint8Array(W * H * 4);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      let s = "";
      for (let j = 0; j < buf.length; j += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(j, j + 0x8000));
      const u = h.orb.material.uniforms, cam = h.rig.camera;
      const c = u.uCenter.value.clone(), R = u.uRadius.value;
      const p = c.clone().project(cam);
      const d = c.distanceTo(cam.position);
      const f = H / 2 / Math.tan((cam.fov * Math.PI) / 360);
      return { b: btoa(s), W, H, orb: { x: (p.x * 0.5 + 0.5) * W, y: (1 - (p.y * 0.5 + 0.5)) * H, r: (R / Math.sqrt(Math.max(d * d - R * R, 1e-6))) * f } };
    }, [ph, t, N, tau0]);
    fs.writeFileSync(`${out}/${tag}_${key}.rgba`, Buffer.from(r.b, "base64"));
    fs.writeFileSync(`${out}/${tag}_${key}.json`, JSON.stringify({ W: r.W, H: r.H, orb: r.orb, qs, js }));
  }
  console.log(JSON.stringify({ tag, poses, logs }));
} catch (e) {
  console.log("ERROR " + e.message, logs.join("\n"));
} finally {
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
