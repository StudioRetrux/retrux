// Ridge seams off the rest pose: for each boolean test of the plate shader's state, re-render the frame with
// the test as black / white, then report, over the seam pixels found in the normal frame, how many are true.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import path from "node:path";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const out = process.argv[2];
const nx = +(process.argv[3] || 0.98);
const TESTS = {
  backdrop: "fz > 330.0",
  pzProxy: "pz < 300.0",
  ridgeOn: "ridge > 0.5",
  fpMoved: "distance(fp, vWorldPos) > 1.0",
  uvMoved: "distance(uv, uv0) > 1e-5",
  hole: "holeUv.x >= 0.0",
  fogHigh: "fog > 0.2",
  mistHigh: "mist > 0.2",
  dFar: "d > 200.0",
  colBright: "dot(col, vec3(0.2126, 0.7152, 0.0722)) > 0.25",
};
const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
  args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"],
});
const clip = { x: 0, y: 230, width: 480, height: 240 };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => console.log("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("console.error " + m.text().slice(0, 300)); });
  await page.goto(((process.env.LAB || "http://localhost:5173") + "/?tier=T1&scale=1&debug=1"), { waitUntil: "domcontentloaded" });
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
    const c = h.env.group.getObjectByName("clouds");
    if (c) c.visible = false;
    window.__origPlate = h.env.plateMaterial.fragmentShader;
  }, nx);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, "t_normal.png"), clip });
  for (const [name, expr] of Object.entries(TESTS)) {
    const ok = await page.evaluate((e) => {
      const m = window.__hero.env.plateMaterial;
      const a = "gl_FragColor = vec4(mix(col, MIST_COLOR, min(mist, 0.85)), 1.0);";
      if (!window.__origPlate.includes(a)) return false;
      m.fragmentShader = window.__origPlate.replace(a, `gl_FragColor = vec4(vec3((${e}) ? 8.0 : 0.0), 1.0);`);
      m.needsUpdate = true;
      return true;
    }, expr);
    if (!ok) { console.log("patch failed"); break; }
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(out, `t_${name}.png`), clip });
  }
} finally {
  await browser.close();
}
const py = `
import sys, json
import numpy as np
from PIL import Image
d = sys.argv[1]; names = json.loads(sys.argv[2])
a = np.asarray(Image.open(d + "/t_normal.png").convert("RGB")).astype(int)
L = a @ np.array([2, 7, 1]) / 10
seams = []
for y in range(20, a.shape[0] - 2):
    for x in range(6, a.shape[1] - 6):
        nb = np.concatenate([L[y, x-5:x-2], L[y, x+3:x+6]])
        if L[y, x] - np.median(nb) > 40 and np.median(nb) < 110:
            seams.append((y, x))
print("seam px:", len(seams))
for n in names:
    t = np.asarray(Image.open(d + "/t_%s.png" % n).convert("L")).astype(int)
    on = sum(1 for (y, x) in seams if t[y, x] > 128)
    # same test on the ridge pixels next to the seams (3 px left), for contrast
    ref = sum(1 for (y, x) in seams if t[y, x - 3] > 128)
    print("%-10s seams %3d / %d   neighbours %3d" % (n, on, len(seams), ref))
`;
execFileSync("python", ["-c", py, out, JSON.stringify(Object.keys(TESTS))], { stdio: "inherit" });
