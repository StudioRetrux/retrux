// Environment (plate / cloud) shader variants at pointer-orbit spots, one Chrome session.
//   node probe_envvar.mjs <outDir> <variants.mjs> <variant,variant,...|all> [spots=top_right,right,rest] [crop=x,y,w,h] [zoom=2]
// variants.mjs: export default { name: { plate: [[find, replace], ...], cloud: [[find, replace], ...], js: "code with h" } }.
// "none" is always the build. Writes <spot>__<variant>.png (full frame) and <spot>__grid.jpg (crops, zoomed, 2 per row).
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("E:/Retrux Hero R&D/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const FF = "E:/Retrux Hero R&D/hero-pipeline/tools/node_modules/ffmpeg-static/ffmpeg.exe";

const out = process.argv[2];
const VARIANTS = (await import(pathToFileURL(path.resolve(process.argv[3])).href)).default;
const pick = process.argv[4] || "all";
const spotList = (process.argv[5] || "top_right,right,rest").split(",");
const [cx, cy, cw, ch] = (process.argv[6] || "0,170,300,200").split(",").map(Number);
const zoom = +(process.argv[7] || 2);
fs.mkdirSync(out, { recursive: true });
const names = ["none", ...(pick === "all" ? Object.keys(VARIANTS) : pick.split(",")).filter((n) => n !== "none")];
const SPOTS = {
  rest: [null, 0], left: [-0.98, 0], right: [0.98, 0], top: [0, 0.98], bottom: [0, -0.98],
  top_left: [-0.98, 0.98], top_right: [0.98, 0.98], bottom_left: [-0.98, -0.98], bottom_right: [0.98, -0.98],
  orb: [0.0, 0.03],
  left1: [-1.0, 0],   // exactly at the orbN projector (az -5)
  // Hold poses (phase, t): pointer centred.
  p05: ["expand", 2.37], p06: ["expand", 2.97],
};

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
    if (v.js) new Function("h", v.js)(h);
    return "";
  }, { plate: v.plate, cloud: v.cloud, water: v.water, js: v.js });

  for (const sn of spotList) {
    const S = SPOTS[sn];
    if (!S) { console.log("unknown spot", sn); continue; }
    await page.evaluate(([x, y]) => {
      const h = window.__hero;
      h.debug.freeze(false);
      if (typeof x === "string") {
        h.debug.pointer(null);
        h.debug.pose(null);
        h.debug.settle(1.0);
        h.rings.tau = 2.6;
        h.debug.pose(x, 0);
        h.debug.settle(0.1);
        h.debug.pose(x, y);
        h.debug.settle(1.6);
      } else {
        h.debug.pose(null);
        h.debug.pointer(x, y);
        h.debug.settle(2.5);
        h.rings.clock = 0;
      }
      h.debug.freeze(true);
    }, S);
    shots[sn] = [];
    for (const n of names) {
      const v = n === "none" ? {} : VARIANTS[n];
      if (!v) { console.log("unknown variant", n); continue; }
      const err = await apply(v);
      if (err) { console.log(n, err); continue; }
      await page.waitForTimeout(900);
      const f = path.join(out, `${sn}__${n}.png`);
      await page.screenshot({ path: f });
      shots[sn].push(f);
    }
    await apply({});
  }
  await page.evaluate(() => { const h = window.__hero; h.debug.pointer(null); h.debug.freeze(false); });
} finally {
  await browser.close();
}
for (const [sn, files] of Object.entries(shots)) {
  const w = cw * zoom, hh = ch * zoom, cols = 2;
  const inputs = files.flatMap((f) => ["-i", f]);
  const scaled = files.map((_, i) => `[${i}]crop=${cw}:${ch}:${cx}:${cy},scale=${w}:${hh}:flags=neighbor[s${i}]`).join(";");
  const layout = files.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * hh}`).join("|");
  const refs = files.map((_, i) => `[s${i}]`).join("");
  const filter = files.length > 1 ? `${scaled};${refs}xstack=inputs=${files.length}:layout=${layout}:fill=black` : scaled.replace(/\[s0\]$/, "");
  execFileSync(FF, ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filter, "-q:v", "2", path.join(out, `${sn}__grid.jpg`)]);
  console.log(`${sn}: ${names.join(", ")}`);
}
