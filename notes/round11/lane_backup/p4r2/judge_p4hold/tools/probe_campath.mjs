// Camera path during a real press-and-hold-release with the mouse at a screen edge: samples the camera every frame and
// reports the largest frame-to-frame step (position m, view direction deg) and the path (x, z) every ~0.1 s.
//   node probe_campath.mjs [mouseX=1430] [mouseY=383] [holdMs=3500]
import { createRequire } from "node:module";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const mx = +(process.argv[2] || 1430), my = +(process.argv[3] || 383), holdMs = +(process.argv[4] || 3500);
const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
  args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(((process.env.LAB || "http://localhost:5173") + "/?tier=T0&scale=0.5"), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.waitForTimeout(4500);
  await page.mouse.move(mx, my, { steps: 8 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const h = window.__hero;
    const rows = (window.__cam = []);
    const t0 = performance.now();
    const tick = () => {
      const c = h.rig.camera;
      const dir = c.getWorldDirection(c.position.clone());
      rows.push([performance.now() - t0, c.position.x, c.position.y, c.position.z, dir.x, dir.y, dir.z, h.choreo.phase]);
      if (rows.length < 4000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.waitForTimeout(300);
  await page.mouse.down();
  await page.waitForTimeout(holdMs);
  await page.mouse.up();
  await page.waitForTimeout(2500);
  const rows = await page.evaluate(() => window.__cam);
  let maxP = 0, maxA = 0, atP = 0, atA = 0;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    const dp = Math.hypot(b[1] - a[1], b[2] - a[2], b[3] - a[3]) / Math.max((b[0] - a[0]) / 16.67, 0.25);
    const dot = Math.min(1, a[4] * b[4] + a[5] * b[5] + a[6] * b[6]);
    const da = (Math.acos(dot) * 180) / Math.PI / Math.max((b[0] - a[0]) / 16.67, 0.25);
    if (dp > maxP) { maxP = dp; atP = b[0]; }
    if (da > maxA) { maxA = da; atA = b[0]; }
  }
  console.log(`frames ${rows.length}  max step per 60fps frame: pos ${maxP.toFixed(3)} m at ${(atP / 1000).toFixed(2)} s, dir ${maxA.toFixed(3)} deg at ${(atA / 1000).toFixed(2)} s`);
  let next = 0;
  const path = [];
  for (const r of rows) if (r[0] >= next) { path.push(`${(r[0] / 1000).toFixed(1)}s ${r[7]} x${r[1].toFixed(2)} z${r[3].toFixed(2)}`); next += 100; }
  console.log(path.join(" | "));
  if (errs.length) console.log("page errors: " + errs.join("; "));
} finally {
  await browser.close();
}
