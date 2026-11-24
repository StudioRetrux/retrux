// Prints every projector camera (position, Euler YXZ in degrees, projection terms) as the engine builds it, to compare
// with the Blender cameras the plates were rendered from (blend\v2build5\plate_<cam>.json).
import { createRequire } from "node:module";
const require = createRequire("E:/Retrux Hero R&D/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  const page = await browser.newPage({ viewport: { width: 720, height: 383 } });
  await page.goto("http://localhost:5173/?tier=T1&scale=0.5&debug=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  const r = await page.evaluate(() => {
    const h = window.__hero;
    const env = h.env;
    const dump = (cam) => {
      // Blender camera: rotation_euler XYZ = (90 + pitch, 0, yaw) about Blender axes; three: Y-up. Report the forward
      // vector's yaw (about +Y, from -Z) and pitch, and the camera's roll.
      const f = new cam.position.constructor(0, 0, -1).applyQuaternion(cam.quaternion);
      const up = new cam.position.constructor(0, 1, 0).applyQuaternion(cam.quaternion);
      const yaw = Math.atan2(-f.x, -f.z) * 180 / Math.PI;
      const pitch = Math.asin(f.y) * 180 / Math.PI;
      const pm = cam.projectionMatrix.elements;
      return { pos: cam.position.toArray().map((v) => +v.toFixed(5)), blenderPos: [cam.position.x, -cam.position.z, cam.position.y].map((v) => +v.toFixed(5)), yaw: +yaw.toFixed(5), pitch: +pitch.toFixed(5), upx: +up.x.toFixed(6), p00: +pm[0].toFixed(6), p11: +pm[5].toFixed(6), p20: +pm[8].toFixed(6), p21: +pm[9].toFixed(6) };
    };
    const out = { rest: dump(env.plateCamera) };
    for (const p of env.projectors) out[p.key] = dump(p.camera);
    out.hero = h.rig.camera.position.toArray();
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
} finally { await browser.close(); }
