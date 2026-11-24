// Where are the floes / rocks that stand on the lake (seen from the plate camera)? For plate columns u,
// walks the rows below the horizon and reports the world points of the projector depth map that stand
// above the water (y > 0.06 m), i.e. the objects whose reflections the plate's lake carries.
import { createRequire } from "node:module";
const require = createRequire("E:/Retrux Hero R&D/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  await page.goto("http://localhost:5173/?tier=T0&scale=0.5", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  const res = await page.evaluate(() => {
    const h = window.__hero;
    const env = h.env;
    const rt = env.depthTarget;
    const cam = env.plateCamera;
    const W = rt.width, H = rt.height;
    const buf = new Uint16Array(4 * W * H);
    h.renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    const half = (b) => { const s = (b & 0x8000) >> 15, e = (b & 0x7c00) >> 10, f = b & 0x3ff; return (s ? -1 : 1) * (e === 0 ? Math.pow(2, -14) * (f / 1024) : e === 31 ? Infinity : Math.pow(2, e - 15) * (1 + f / 1024)); };
    const V3 = cam.position.constructor;
    const fwd = new V3(0, 0, -1).applyQuaternion(cam.quaternion);
    const world = (u, v) => {
      const px = Math.min(W - 1, Math.floor(u * W)), py = Math.min(H - 1, Math.floor(v * H));
      const z = half(buf[(py * W + px) * 4]);
      const d = new V3(u * 2 - 1, v * 2 - 1, 0.5).unproject(cam).sub(cam.position).normalize();
      return cam.position.clone().addScaledVector(d, z / Math.max(1e-4, d.dot(fwd)));
    };
    const cols = [];
    for (let u = 0.04; u < 0.99; u += 0.04) {
      const hits = [];
      // v is bottom-up in the render target; walk from the horizon down towards the camera.
      for (let v = 0.62; v > 0.05; v -= 0.004) {
        const w = world(u, v);
        if (w.y > 0.06 && w.y < 12 && w.z > -80) hits.push(w);
      }
      const zs = hits.map((w) => w.z); const groups = []; for (const w of hits) { const g = groups.find((g) => Math.abs(g.z - w.z) < 3); if (g) { g.n++; g.y = Math.max(g.y, w.y); } else groups.push({ z: w.z, n: 1, y: w.y }); }
      cols.push({ u: +u.toFixed(2), n: hits.length, zFar: zs.length ? +Math.min(...zs).toFixed(1) : null, zNear: zs.length ? +Math.max(...zs).toFixed(1) : null, x: hits.length ? +hits[0].x.toFixed(1) : null, groups: groups.map((g) => `${g.z.toFixed(0)}:${g.n}:${g.y.toFixed(1)}`).join(" "), yMax: hits.length ? +Math.max(...hits.map((w) => w.y)).toFixed(2) : null });
    }
    return { cam: cam.position.toArray().map((a) => +a.toFixed(2)), W, H, cols };
  });
  console.log(JSON.stringify({ cam: res.cam, W: res.W, H: res.H }));
  for (const c of res.cols) console.log(JSON.stringify(c));
} finally {
  await browser.close();
}

