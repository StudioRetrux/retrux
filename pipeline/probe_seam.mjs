// Far-left ridge seams with the camera orbited (pointer at the right edge): the normal frame, then the plate
// shader patched to show R = filled (uv moved by the occlusion fill), G = backdrop fragment (fz > 330),
// B = the projector saw a proxy at the original uv. Prints the debug colour at the seam pixels.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import path from "node:path";
const require = createRequire("E:/Retrux Hero R&D/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const out = process.argv[2];
const nx = +(process.argv[3] || 0.98);
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const clip = { x: 0, y: 230, width: 480, height: 240 };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => console.log("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("console.error " + m.text().slice(0, 400)); });
  await page.goto("http://localhost:5173/?tier=T1&scale=1&debug=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate((x) => {
    const h = window.__hero;
    h.debug.settle(4);
    h.debug.freeze(false);
    h.debug.pointer(x, 0);
    h.debug.settle(2.5);
    h.rings.clock = 0;
    h.debug.freeze(true);
  }, nx);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, "seam_normal.png"), clip });
  const found = await page.evaluate(() => {
    const m = window.__hero.env.plateMaterial;
    const a = "gl_FragColor = vec4(mix(col, MIST_COLOR, min(mist, 0.85)), 1.0);";
    const ok = m.fragmentShader.includes(a);
    m.fragmentShader = m.fragmentShader.replace(a, "gl_FragColor = vec4(vec3(holeUv.x >= 0.0 ? 3.0 : (distance(uv, uv0) > 1e-5 ? 0.004 : 0.25)), 1.0);");
    m.needsUpdate = true;
    return ok;
  });
  console.log("patched:", found);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(out, "seam_debug.png"), clip });
} finally {
  await browser.close();
}
const py = `
import sys
import numpy as np
from PIL import Image
d = sys.argv[1]
a = np.asarray(Image.open(d + "/seam_normal.png").convert("RGB")).astype(int)
b = np.asarray(Image.open(d + "/seam_debug.png").convert("RGB")).astype(int)
L = a @ np.array([2, 7, 1]) / 10
cnt = {}
for y in range(20, a.shape[0] - 2):
    for x in range(6, a.shape[1] - 6):
        nb = np.concatenate([L[y, x-5:x-2], L[y, x+3:x+6]])
        if L[y, x] - np.median(nb) > 40 and np.median(nb) < 110:
            r, g, bb = b[y, x]
            lum = (r + g + bb) / 3; key = "hole" if lum > 200 else ("fill" if lum < 40 else "plain(%d)" % (lum // 20 * 20))
            cnt[key] = cnt.get(key, 0) + 1
print("seam px by class:", cnt)
`;
execFileSync("python", ["-c", py, out], { stdio: "inherit" });


