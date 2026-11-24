// Projection-glitch probe: plate / cloud / water shader variants (and js) at the glitch-sweep poses, one Chrome session.
//   node probe_glitch.mjs <outDir> <variants.mjs> <variant,...|all> "<spot[@x,y,w,h]>;<spot...>" [zoom=2]
// Spots: rest | p05 | p06 | <hold|pop|rel>_<L|R|T|B|BL|TR|C> (as validate\shoot_sweep.mjs: hold = expand 2.97, pop = expand 0.9,
// rel = release 0.33, pointer pinned at the edge / corner; C = centred). variants.mjs: export default { name: { plate: [[find,
// replace]], cloud: [...], water: [...], js: "code with h" } }; "none" is always the build. Writes <spot>__<variant>.png and, for
// spots with a crop, <spot>__grid.jpg (crops zoomed, 2 per row, in variant order).
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("E:/Retrux Hero R&D/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const FF = "E:/Retrux Hero R&D/hero-pipeline/tools/node_modules/ffmpeg-static/ffmpeg.exe";

const out = process.argv[2];
const MOD = await import(pathToFileURL(path.resolve(process.argv[3])).href);
const VARIANTS = MOD.default;
// Optional `export const reset = "js with h"`: run before every variant (js variants persist otherwise).
const RESET = MOD.reset || "";
const pick = process.argv[4] || "all";
// Spots are separated by ";" (crops contain commas).
const spotArgs = (process.argv[5] || "pop_B@1150,380,250,160").split(";").filter(Boolean);
const zoom = +(process.argv[6] || 2);
fs.mkdirSync(out, { recursive: true });
const names = ["none", ...(pick === "all" ? Object.keys(VARIANTS) : pick.split(",")).filter((n) => n !== "none")];
const EDGE = { L: [-0.98, 0], R: [0.98, 0], T: [0, 0.98], B: [0, -0.98], BL: [-0.98, -0.98], TR: [0.98, 0.98], C: [0, 0], TL: [-0.98, 0.98], BR: [0.98, -0.98] };
const PH = { hold: ["expand", 2.97], pop: ["expand", 0.9], rel: ["release", 0.33] };
function spotDef(name) {
  if (name === "rest") return { kind: "rest" };
  if (name === "p05") return { kind: "pose", ph: "expand", t: 2.37, p: null };
  if (name === "p06") return { kind: "pose", ph: "expand", t: 2.97, p: null };
  const [tag, e] = name.split("_");
  if (PH[tag] && EDGE[e]) return { kind: "pose", ph: PH[tag][0], t: PH[tag][1], p: EDGE[e] };
  // ptr_<E>: idle with the pointer pinned at an edge / corner (the cursor orbit).
  if (tag === "ptr" && EDGE[e]) return { kind: "ptr", p: EDGE[e] };
  return null;
}

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const shots = {};
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => console.log("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("console.error " + m.text().slice(0, 900)); });
  await page.goto(`http://localhost:5173/?tier=T1&scale=1&debug=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => {
    const h = window.__hero;
    h.debug.settle(4);
    window.__envOrig = { plate: h.env.plateMaterial.fragmentShader, cloud: h.env.cloudMaterials.map((m) => m.fragmentShader), water: h.water.material.fragmentShader };
  });
  const apply = async (v) => page.evaluate((v) => {
    const h = window.__hero;
    let plate = window.__envOrig.plate;
    for (const [a, b] of v.plate || []) { if (!plate.includes(a)) return "plate missing: " + a.slice(0, 80); plate = plate.split(a).join(b); }
    const m = h.env.plateMaterial;
    if (m.fragmentShader !== plate) { m.dispose(); m.fragmentShader = plate; m.needsUpdate = true; }
    for (let i = 0; i < h.env.cloudMaterials.length; i++) {
      let c = window.__envOrig.cloud[i];
      for (const [a, b] of v.cloud || []) { if (!c.includes(a)) return "cloud missing: " + a.slice(0, 80); c = c.split(a).join(b); }
      const cm = h.env.cloudMaterials[i];
      if (cm.fragmentShader !== c) { cm.dispose(); cm.fragmentShader = c; cm.needsUpdate = true; }
    }
    let water = window.__envOrig.water;
    for (const [a, b] of v.water || []) { if (!water.includes(a)) return "water missing: " + a.slice(0, 80); water = water.split(a).join(b); }
    const wm = h.water.material;
    if (wm.fragmentShader !== water) { wm.dispose(); wm.fragmentShader = water; wm.needsUpdate = true; }
    if (v.reset) new Function("h", v.reset)(h);
    if (v.js) new Function("h", v.js)(h);
    return "";
  }, { plate: v.plate, cloud: v.cloud, water: v.water, js: v.js, reset: RESET });

  for (const arg of spotArgs) {
    const [sn, crop] = arg.split("@");
    const S = spotDef(sn);
    if (!S) { console.log("unknown spot", sn); continue; }
    const shoot = async () => {
      await page.evaluate((S) => {
        const h = window.__hero;
        h.debug.freeze(false);
        if (S.kind === "rest" || S.kind === "ptr") {
          h.debug.pose(null);
          if (S.kind === "ptr") h.debug.pointer(S.p[0], S.p[1]); else h.debug.pointer(null);
          h.debug.settle(2.5);
          h.rings.clock = 0;
        } else {
          if (S.p) h.debug.pointer(S.p[0], S.p[1]); else h.debug.pointer(null);
          if (S.ph === "expand") { h.debug.pose(S.ph, 0); h.debug.settle(0.1); }
          h.debug.pose(S.ph, S.t);
          h.debug.settle(1.6);
        }
        h.debug.freeze(true);
      }, S);
    };
    shots[sn] = { crop, files: [] };
    for (const n of names) {
      const v = n === "none" ? {} : VARIANTS[n];
      if (!v) { console.log("unknown variant", n); continue; }
      const err = await apply(v);
      if (err) { console.log(n, err); continue; }
      // js variants may change the camera / choreography: re-pose after applying.
      await shoot();
      await page.waitForTimeout(900);
      const f = path.join(out, `${sn}__${n}.png`);
      await page.screenshot({ path: f });
      const cam = await page.evaluate(() => {
        const h = window.__hero;
        const d = h.choreo.drivers || h.choreo.d || {};
        return { cam: h.rig.camera.position.toArray().map((v) => +v.toFixed(2)), camExpand: d.camExpand !== undefined ? +d.camExpand.toFixed(3) : null, orbitAz: d.orbitAz !== undefined ? +d.orbitAz.toFixed(2) : null };
      });
      console.log(`  ${sn} ${n} ${JSON.stringify(cam)}`);
      shots[sn].files.push(f);
    }
    await apply({});
  }
  await page.evaluate(() => { const h = window.__hero; h.debug.pointer(null); h.debug.freeze(false); });
} finally {
  await browser.close();
}
for (const [sn, { crop, files }] of Object.entries(shots)) {
  if (!crop || !files.length) { console.log(`${sn}: ${names.join(", ")}`); continue; }
  const [cx, cy, cw, ch] = crop.split(",").map(Number);
  const w = cw * zoom, hh = ch * zoom, cols = 2;
  const inputs = files.flatMap((f) => ["-i", f]);
  const scaled = files.map((_, i) => `[${i}]crop=${cw}:${ch}:${cx}:${cy},scale=${w}:${hh}:flags=neighbor[s${i}]`).join(";");
  const layout = files.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * hh}`).join("|");
  const refs = files.map((_, i) => `[s${i}]`).join("");
  const filter = files.length > 1 ? `${scaled};${refs}xstack=inputs=${files.length}:layout=${layout}:fill=black` : scaled.replace(/\[s0\]$/, "");
  execFileSync(FF, ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filter, "-q:v", "2", path.join(out, `${sn}__grid.jpg`)]);
  console.log(`${sn}: ${names.join(", ")}`);
}
