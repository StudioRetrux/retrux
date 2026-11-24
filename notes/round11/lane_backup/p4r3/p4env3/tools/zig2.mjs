// J5: which cloud card shows through at the summit (late90 rest), and the crack guard's inputs.  node zig2.mjs <port> <out.json> [qs]
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [port, out, qs] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
let res = {};
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  res = await page.evaluate(() => {
    const h = window.__hero; const gl = h.renderer.getContext(); const env = h.env;
    h.debug.pointer(null); h.debug.settle(6);
    const now = h.state.time; h.debug.pose(null); h.debug.settle(90 - now); h.debug.settle(2.5); h.rings.clock = 0;
    h.debug.freeze(true);
    const box = () => {
      for (let i = 0; i < 24; i++) h.frame(1 / 60, false);
      const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const fb = new Uint8Array(W * H * 4);
      h.renderer.setRenderTarget(null); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, fb);
      // box x262-288 y236-250 (top-left origin): luma mean, sd, and the count of px brighter than their 5x5 median by > 15
      const L = (x, y) => { const a = ((H - 1 - y) * W + x) * 4; return 0.2126 * fb[a] + 0.7152 * fb[a + 1] + 0.0722 * fb[a + 2]; };
      let s = 0, s2 = 0, n = 0, hot = 0;
      for (let y = 236; y <= 250; y++) for (let x = 262; x <= 288; x++) {
        const v = L(x, y); s += v; s2 += v * v; n++;
        const nb = []; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) nb.push(L(x + dx, y + dy));
        nb.sort((a, b) => a - b); if (v - nb[12] > 15) hot++;
      }
      const m = s / n; return { mean: +m.toFixed(2), sd: +Math.sqrt(s2 / n - m * m).toFixed(2), hot };
    };
    const kids = env.cloudGroup.children.filter((o) => o.isMesh);
    const info = kids.map((o, i) => { const u = o.material.uniforms || {}; return { i, name: o.name, mat: o.material.name, rangeOcc: u.uRangeOcc?.value, depthOn: u.uPlateDepthOn?.value, texel: u.uPlateDepthTexel?.value?.toArray?.(), pos: o.position.toArray().map((v) => +v.toFixed(1)), z0: o.geometry.attributes.position.getZ(0) }; });
    const base = box();
    const per = [];
    for (let i = 0; i < kids.length; i++) { kids[i].visible = false; per.push({ i, ...box() }); kids[i].visible = true; }
    for (const k of kids) k.visible = false; const none = box(); for (const k of kids) k.visible = true;
    return { t: h.state.time, base, none, per, info, groupKids: env.cloudGroup.children.length };
  });
} catch (e) { res.error = e.message; }
finally { fs.writeFileSync(out, JSON.stringify(res, null, 1)); console.log(JSON.stringify({ base: res.base, none: res.none, t: res.t, err: res.error })); await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]); process.exit(0); }
