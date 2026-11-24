// re-judge p4orb: paired deterministic captures (the judge's flick method, engine loop off, same call sequence per config from a
// fresh page). For each tau0 (ring clock pinned at the hold start; "n" = not pinned) and pose: full frame after N frames of 1/60 s,
// plus the projected orb centre / radius. One page per config.
//   node rj_det.mjs --port 5176 --qs "" --tag lane --out DIR --taus 3.3,n --poses q00,q03,p04,p05,p06,p07,p08
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port", "5176"), qs = arg("qs", ""), out = arg("out", "."), tag = arg("tag", "x"), N = +arg("n", "9");
const tier = arg("tier", "T1");
const poses = arg("poses", "q00,q03,p04,p05,p06,p07,p08").split(",");
const taus = arg("taus", "3.3,n").split(",");
const P = { q00: [null, 0], q03: ["eye", 0], p04: ["expand", 0.9], p05: ["expand", 2.37], p06: ["expand", 2.97], p07: ["release", 0.33], p08: ["release", 0.57] };
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 200)}`); });
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=${tier}&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  fs.mkdirSync(out, { recursive: true });
  const jobs = [];
  for (const key of poses) {
    const ph = P[key][0];
    if (ph === "expand" || ph === "release") for (const t of taus) jobs.push([key, t]);
    else jobs.push([key, "n"]);
  }
  for (const [key, tau] of jobs) {
    const [ph, t] = P[key];
    const tau0 = tau === "n" ? null : +tau;
    const r = await page.evaluate(([ph, t, N, tau0]) => {
      const h = window.__hero, gl = h.renderer.getContext();
      h.debug.pointer(0, 0);
      h.debug.pose(null);
      h.debug.settle(6);
      if (ph === "expand" || ph === "release") {
        if (tau0 !== null) h.rings.clock = tau0;
        h.debug.pose("expand", 0); h.debug.settle(0.1);
        if (ph === "expand") { h.debug.pose("expand", t); h.debug.settle(1.0); }
        else { h.debug.pose("expand", 2.97); h.debug.settle(1.0); h.debug.pose("release", t); h.debug.settle(1.0); }
      } else if (ph === "eye") { h.debug.settle(1.5); }
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
      return { b: btoa(s), W, H, clock: h.rings.clock, orb: { x: (p.x * 0.5 + 0.5) * W, y: (1 - (p.y * 0.5 + 0.5)) * H, r: (R / Math.sqrt(Math.max(d * d - R * R, 1e-6))) * f } };
    }, [ph, t, N, tau0]);
    const nm = `${tag}_${key}_t${tau}`;
    fs.writeFileSync(`${out}/${nm}.rgba`, Buffer.from(r.b, "base64"));
    fs.writeFileSync(`${out}/${nm}.json`, JSON.stringify({ W: r.W, H: r.H, orb: r.orb, clock: r.clock, qs, port }));
  }
  console.log(JSON.stringify({ tag, n: jobs.length, logs }));
} catch (e) {
  console.log("ERROR " + e.message, logs.join("\n"));
} finally {
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
