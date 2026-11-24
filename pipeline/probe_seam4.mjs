// Ridge seams off the rest pose, round 2: more boolean tests of the plate shader's state over the seam pixels,
// then candidate fixes (shader patches) rendered normally and the seams re-counted.
// Batched (argv[4] = "t" tests | "f" fixes, argv[5] = comma list or "all") so one Chrome session compiles only
// a handful of plate-shader variants: the D3D compiles of this shader cost hundreds of MB each and the RAM
// watchdog killed the single-session run at ~600 MB free. Old programs are disposed before each patch.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import path from "node:path";
const require = createRequire("E:/Retrux Hero R&D/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const out = process.argv[2];
const nx = +(process.argv[3] || 0.98);
const kind = process.argv[4] || "t";
const pick = process.argv[5] || "all";
const L = (v) => `dot(${v}, vec3(0.2126, 0.7152, 0.0722))`;
const PRE = "envChroma(plateGrade(samplePlate(uv, lod)))";
const TESTS = {
  ridgeFull: "ridge > 0.98",
  ridgeHalf: "ridge > 0.5 && ridge < 0.98",
  pre1: `${L(PRE)} > 1.0`,
  pre3: `${L(PRE)} > 3.0`,
  pre6: `${L(PRE)} > 6.0`,
  lodHigh: "lod > 2.5",
  filled: "filled > 0.5",
  fin05: `${L("col")} > 0.5`,
  fin1: `${L("col")} > 1.0`,
  uvY: "abs(uv.y - uv0.y) > 1e-5",
  uvFar: "distance(uv, uv0) > uPlateDepthTexel.x * 20.0",
  uvOut: "uv.x > 0.15",
  rawSky: "textureLod(uPlateDepth, uv, 0.0).r >= 300.0",
  detHi: `${L(PRE)} / max(${L("plateGrade(samplePlate(uv, lod + 3.0))")}, 1e-4) > 1.25`,
  dxNeg: "uv.x < uv0.x - 1e-5",
  dxPos: "uv.x > uv0.x + 1e-5",
  dist8: "distance(uv, uv0) > uPlateDepthTexel.x * 8.5",
  dist32: "distance(uv, uv0) > uPlateDepthTexel.x * 32.5",
  dist100: "distance(uv, uv0) > uPlateDepthTexel.x * 100.0",
  srcFar: "textureLod(uPlateDepth, uv, 0.0).r > fz * 1.15",
  srcNear: "textureLod(uPlateDepth, uv, 0.0).r < fz * 0.9",
  srcBright: `${L("samplePlate(uv, 0.0)")} > 0.45`,
  orgBright: `${L("samplePlate(uv0, 0.0)")} > 0.45`,
  occl: "fz > textureLod(uPlateDepth, uv0, 0.0).r * 1.06 + 0.8",
  r13: "fz < textureLod(uPlateDepth, uv0, 0.0).r * 1.3",
  r16: "fz < textureLod(uPlateDepth, uv0, 0.0).r * 1.6",
  r25: "fz < textureLod(uPlateDepth, uv0, 0.0).r * 2.5",
  fz15: "fz < 15.0",
  fz25: "fz < 25.0",
  occ10: "textureLod(uPlateDepth, uv0, 0.0).r < 10.0",
};
const FINAL = "gl_FragColor = vec4(mix(col, MIST_COLOR, min(mist, 0.85)), 1.0);";
const LOD = "float lod = uDofBlur * smoothstep(0.0, uFocusRange, abs(d - uFocusDist)) + 3.0 * filled;";
const MIXR = "col = mix(col, navy, ridge * 0.95);";
const FILL = "vec2 uv = plateUnoccluded(uv0, vWorldPos);";
const FARL = "float far = fz * 1.6 + 20.0;";
const FIXES = {
  none: [],
  old: [
    ["float ridge = max(plateRidgeArea(uv), plateRidgeArea(uv0) * step(fz, occZ * 1.3 + 5.0));", "float ridge = plateRidgeArea(uv);"],
    ["float moved = step(1e-5, distance(uv, uv0));", "float moved = 0.0;"],
    ["smoothstep(0.46, 0.56, uv0.y)", "smoothstep(0.46, 0.56, uv.y)"],
  ],
  far115: [[FARL, "float far = fz * 1.15 + 5.0;"]],
  far13: [[FARL, "float far = fz * 1.3 + 10.0;"]],
  noBlur: [[LOD, LOD.replace(" + 3.0 * filled;", ";")]],
  noFill: [[FILL, "vec2 uv = uv0;"]],
  clampRidge: [[MIXR, "col = mix(min(col, vec3(0.35)), navy, ridge * 0.95);"]],
  ridgeFromUv0: [[MIXR, "ridge = max(ridge, (1.0 - smoothstep(0.15, 0.19, uv0.x)) * smoothstep(0.36, 0.41, uv0.y) * (1.0 - smoothstep(0.58, 0.63, uv0.y)) * step(pz, 300.0) * uPlateDepthOn);\n  " + MIXR]],
};
const table = kind === "f" ? FIXES : TESTS;
const names = pick === "all" ? Object.keys(table) : pick.split(",");
const tag = kind + "_" + names.join("-").slice(0, 40);
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const clip = process.env.CLIP
  ? Object.fromEntries(["x", "y", "width", "height"].map((k, i) => [k, +process.env.CLIP.split(",")[i]]))
  : { x: 0, y: 230, width: 480, height: 240 };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => console.log("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("console.error " + m.text().slice(0, 300)); });
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
    const c = h.env.group.getObjectByName("clouds");
    if (c) c.visible = false;
    window.__origPlate = h.env.plateMaterial.fragmentShader;
  }, nx);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, `${tag}__normal.png`), clip });
  const patch = async (pairs) => page.evaluate((pairs) => {
    const m = window.__hero.env.plateMaterial;
    let s = window.__origPlate;
    for (const [a, b] of pairs) {
      if (!s.includes(a)) return "missing: " + a.slice(0, 60);
      s = s.replace(a, b);
    }
    m.dispose();
    m.fragmentShader = s;
    m.needsUpdate = true;
    return "";
  }, pairs);
  for (const name of names) {
    const pairs = kind === "f" ? table[name] : [[FINAL, `gl_FragColor = vec4(vec3((${table[name]}) ? 8.0 : 0.0), 1.0);`]];
    if (!pairs) { console.log("unknown", name); continue; }
    const err = await patch(pairs);
    if (err) { console.log(name, err); continue; }
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(out, `${tag}__${name}.png`), clip });
  }
} finally {
  await browser.close();
}
const py = `
import sys, json
import numpy as np
from PIL import Image
d, tag, kind = sys.argv[1], sys.argv[2], sys.argv[3]; names = json.loads(sys.argv[4])
def lum(p):
    a = np.asarray(Image.open(p).convert("RGB")).astype(int)
    return a @ np.array([2, 7, 1]) / 10
def seams(L):
    s = []
    for y in range(20, L.shape[0] - 2):
        for x in range(6, L.shape[1] - 6):
            nb = np.concatenate([L[y, x-5:x-2], L[y, x+3:x+6]])
            if L[y, x] - np.median(nb) > 40 and np.median(nb) < 110:
                s.append((y, x))
    return s
L0 = lum("%s/%s__normal.png" % (d, tag))
S = seams(L0)
print("seam px:", len(S))
for n in names:
    try: f = "%s/%s__%s.png" % (d, tag, n); im = Image.open(f)
    except Exception: continue
    if kind == "t":
        t = np.asarray(im.convert("L")).astype(int)
        on = sum(1 for (y, x) in S if t[y, x] > 128)
        ref = sum(1 for (y, x) in S if t[y, x - 3] > 128)
        print("%-11s seams %3d / %d   neighbours %3d" % (n, on, len(S), ref))
    else:
        L1 = lum(f); s1 = seams(L1)
        print("fix %-13s seams %3d   (mean luma %.1f -> %.1f)" % (n, len(s1), L0[20:, :].mean(), L1[20:, :].mean()))
`;
execFileSync("python", ["-c", py, out, tag, kind, JSON.stringify(names)], { stdio: "inherit" });
