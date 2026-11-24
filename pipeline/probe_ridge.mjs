// World position of the plate surface under a few screen points (rest camera), from the projector depth map.
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
    const pts = [[30, 330], [60, 300], [110, 280], [180, 300], [300, 230], [360, 250]];
    const out = [];
    for (const [x, y] of pts) {
      // frame px -> plate uv (overscan from plate.json via coverage)
      const c = env.coverage;
      const u = (x / 1440 * 2 - 1) / c.side * 0.5 + 0.5;
      // vertical: plate spans top..bottom coverage around the rest frame
      const ny = 1 - (y / 766) * 2; // -1..1 in the rest frame
      const v = (ny + c.bottom) / (c.top + c.bottom);
      const px = Math.floor(u * rt.width), py = Math.floor(v * rt.height);
      const buf = new Uint16Array(4);
      h.renderer.readRenderTargetPixels(rt, px, py, 1, 1, buf);
      const half = (b) => { const s = (b & 0x8000) >> 15, e = (b & 0x7c00) >> 10, f = b & 0x3ff; return (s ? -1 : 1) * (e === 0 ? Math.pow(2, -14) * (f / 1024) : e === 31 ? Infinity : Math.pow(2, e - 15) * (1 + f / 1024)); };
      const z = half(buf[0]);
      // ray through the plate camera
      const ndc = [u * 2 - 1, v * 2 - 1];
      const p = cam.position.clone();
      const dir = { x: 0, y: 0, z: 0 };
      const inv = cam.projectionMatrixInverse.elements;
      // unproject ndc at z=-1..1 using camera methods
      const near = new cam.position.constructor(ndc[0], ndc[1], 0.5).unproject(cam);
      const d = near.sub(p).normalize();
      const fwd = new cam.position.constructor(0, 0, -1).applyQuaternion(cam.quaternion);
      const dist = z / Math.max(1e-4, d.dot(fwd));
      const w = p.clone().addScaledVector(d, dist);
      out.push({ x, y, u: +u.toFixed(3), v: +v.toFixed(3), depth: +z.toFixed(1), world: w.toArray().map((a) => +a.toFixed(1)) });
    }
    return out;
  });
  for (const r of res) console.log(JSON.stringify(r));
} finally {
  await browser.close();
}
