// Lake shader variants at a pinned pointer: shoots the full frame for the unpatched shader and for each
// variant (string patches on h.water.material.fragmentShader), one Chrome session, old programs disposed.
//   node probe_water.mjs <outDir> <nx> <ny> <variant,variant,...>
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const out = process.argv[2];
const nx = +(process.argv[3] || 0.98);
const ny = +(process.argv[4] || 0);
const pick = (process.argv[5] || "").split(",").filter(Boolean);
const OCC_IF = "if (uPlateDepthOn > 0.5 && camAway > 1.0) {";
const OCC_RAMP = "occl = smoothstep(0.0, 2.5, behind) * smoothstep(1.0, 4.0, camAway);";
const VARIANTS = {
  oldWater: [["if (behind > 0.0) {", "if (false) {"]],
  noMirror: [["pw = plateMirrorPoint(vWorldPos);", "pw = vWorldPos;"]],
  noFill: [["vec2 puv = plateUnoccluded(puv0, pw);", "vec2 puv = puv0;"]],
  early: [
    [OCC_IF, "if (uPlateDepthOn > 0.5 && camAway > 0.25) {"],
    [OCC_RAMP, "occl = smoothstep(0.0, 2.5, behind) * smoothstep(0.25, 1.25, camAway);"],
  ],
  early2: [
    [OCC_IF, "if (uPlateDepthOn > 0.5 && camAway > 0.1) {"],
    [OCC_RAMP, "occl = smoothstep(0.0, 1.0, behind) * smoothstep(0.1, 0.6, camAway);"],
  ],
};
const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
  args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => console.log("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("console.error " + m.text().slice(0, 300)); });
  await page.goto(((process.env.LAB || "http://localhost:5173") + "/?tier=T1&scale=1&debug=1"), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(([x, y]) => {
    const h = window.__hero;
    h.debug.settle(4);
    h.debug.freeze(false);
    h.debug.pointer(x, y);
    h.debug.settle(2.5);
    h.rings.clock = 0;
    h.debug.freeze(true);
    // The shards drift with wall time between runs: hide them so frames compare like for like.
    if (h.shards && h.shards.group) h.shards.group.visible = false;
    else if (h.shards && h.shards.mesh) h.shards.mesh.visible = false;
    window.__origWater = h.water.material.fragmentShader;
  }, [nx, ny]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, "w_base.png") });
  for (const name of pick) {
    const err = await page.evaluate((pairs) => {
      const m = window.__hero.water.material;
      let s = window.__origWater;
      for (const [a, b] of pairs) {
        if (!s.includes(a)) return "missing: " + a.slice(0, 60);
        s = s.replace(a, b);
      }
      m.dispose();
      m.fragmentShader = s;
      m.needsUpdate = true;
      return "";
    }, VARIANTS[name] || []);
    if (err) { console.log(name, err); continue; }
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(out, `w_${name}.png`) });
    console.log("shot", name);
  }
} finally {
  await browser.close();
}
