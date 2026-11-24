// wl2g: per screen sample, the anchor texel in frame quarter texels over a pointer path, anchor taken at the settled neutral pose.
import { createRequire } from "node:module";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [port, tier, dsf, pathName, frames, qs = ""] = process.argv.slice(2);
const S = Math.sin, P = Math.PI * 2;
const pa = { fast: (t) => [1.0 * S((P * t) / 2.5), 0.4 * S((P * t) / 3.3)], corners: (t, i) => [[-1, -1], [1, -1], [1, 1], [-1, 1]][Math.floor(i / 40) % 4], diag: (t) => [0.9 * S((P * t) / 4), 0.9 * S((P * t) / 4)] }[pathName];
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: +dsf });
const page = await ctx.newPage();
await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get() { return h; }, set(v) { h = v; v.start = function () {}; } }); });
await page.goto(`http://localhost:${port}/?tier=${tier}&scale=1&debug=1&wl2gt=2${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
const out = await page.evaluate(([frames, src]) => {
  const pa = eval(src);
  const h = window.__hero, w = h.water;
  for (let i = 0; i < 60; i++) { h.debug.pointer(null); h.state.pointer.active = false; h.frame(1 / 60, false); }
  w.wlAnchorOk = false; h.debug.pointer(0, 0); h.frame(1 / 60, false);
  const T = h.rig.camera.constructor; // unused
  const cam = h.rig.camera, cp = cam.position;
  const V = cp.constructor; const v = new V(); const V4 = w.wlX.constructor;
  const AP = w.material.uniforms.uLkWalkAP.value;
  const worst = {}; let insideAll = true; const posR = [1e9, -1e9, 1e9, -1e9, 1e9, -1e9];
  for (let i = 0; i < frames; i++) {
    const p = pa(i / 60, i); h.debug.pointer(p[0], p[1]); h.frame(1 / 60, false);
    posR[0] = Math.min(posR[0], cp.x); posR[1] = Math.max(posR[1], cp.x); posR[2] = Math.min(posR[2], cp.y); posR[3] = Math.max(posR[3], cp.y); posR[4] = Math.min(posR[4], cp.z); posR[5] = Math.max(posR[5], cp.z);
    const cur = w.wlCur; const Wt = w.walkTarget.width, Ht = w.walkTarget.height, Wq = w.wlMain.x / w.walkDiv, Hq = w.wlMain.y / w.walkDiv;
    for (let j = 0; j <= 16; j++) for (let k = 0; k <= 16; k++) {
      const nx = -1 + k / 8, ny = -1 + j / 8;
      v.set(nx, ny, 0.5).unproject(cam).sub(cp).normalize();
      if (v.y >= -1e-4) continue;
      const t = -cp.y / v.y; const X = [cp.x + v.x * t, cp.z + v.z * t];
      const pr = (m, x, z, W, H) => { const c = new V4(x, 0, z, 1).applyMatrix4(m); return [c.x / c.w * 0.5 * W, c.y / c.w * 0.5 * H]; };
      let r = 0;
      for (const [dx, dz] of [[0.05, 0], [0, 0.05]]) {
        const a = pr(cur, X[0], X[1], Wq, Hq), b = pr(cur, X[0] + dx, X[1] + dz, Wq, Hq), c = pr(AP, X[0], X[1], Wt, Ht), d = pr(AP, X[0] + dx, X[1] + dz, Wt, Ht);
        r = Math.max(r, Math.hypot(b[0] - a[0], b[1] - a[1]) / Math.hypot(d[0] - c[0], d[1] - c[1]));
      }
      const key = `y${(((1 - ny) / 2) * 766).toFixed(0)}`; // css y
      const kx = `x${(((nx + 1) / 2) * 1440).toFixed(0)}`;
      worst[key] = worst[key] || {}; worst[key][kx] = Math.max(worst[key][kx] || 0, r);
      worst[key].dist = t;
    }
  }
  return { worst, anchors: w.wlAnchors, posR };
}, [+frames, pa.toString()]);
console.log("anchors", out.anchors, "camPos range", out.posR.map((v) => v.toFixed(3)).join(" "));
for (const [k, row] of Object.entries(out.worst)) {
  const xs = Object.entries(row).filter(([a]) => a !== "dist");
  console.log(k.padEnd(6), "dist", row.dist.toFixed(1).padStart(6), xs.map(([a, b]) => b.toFixed(2)).join(" "));
}
await browser.close();
