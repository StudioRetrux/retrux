import { fileURLToPath } from "node:url";
// Prints the live orb / camera numbers from the running lab page.
import { createRequire } from "node:module";
const SP = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, ""); // hero-pipeline/
const require = createRequire(SP + "/tools/package.json");
const { chromium } = require("playwright-core");
const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
  args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
await page.goto(((process.env.LAB || "http://localhost:5173") + "/"), { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 120000 });
await page.waitForTimeout(4000);
const info = await page.evaluate(() => {
  const h = window.__hero;
  const u = h.orb.material.uniforms;
  const cam = h.rig.camera;
  return {
    orbRadius: u.uRadius.value,
    orbCenter: u.uCenter.value.toArray(),
    meshScale: h.orb.mesh.scale.toArray(),
    camPos: cam.position.toArray(),
    fov: cam.fov,
    aspect: cam.aspect,
    dist: cam.position.distanceTo(h.orb.mesh.position),
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
