// Time sweep at one pointer spot: is an artefact time-dependent (ripples, wisps)? Shoots N frames, settle(step) apart,
// for each water/plate shader variant, and builds one crop grid per variant (rows = time).
//   node probe_time.mjs <outDir> <variants.mjs> <names|all> <nx,ny> <crop x,y,w,h> [N=6] [step=0.37] [zoom=3]
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const FF = (process.env.FFMPEG || "/opt/homebrew/bin/ffmpeg");
const out = process.argv[2];
const VARIANTS = (await import(pathToFileURL(path.resolve(process.argv[3])).href)).default;
const pick = process.argv[4] || "all";
const [nx, ny] = (process.argv[5] || "-0.98,0").split(",").map(Number);
const [cx, cy, cw, ch] = (process.argv[6] || "300,580,200,120").split(",").map(Number);
const N = +(process.argv[7] || 6);
const STEP = +(process.argv[8] || 0.37);
const zoom = +(process.argv[9] || 3);
fs.mkdirSync(out, { recursive: true });
const names = ["none", ...(pick === "all" ? Object.keys(VARIANTS) : pick.split(",")).filter((n) => n !== "none")];
const browser = await chromium.launch({ executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"), headless: true, args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"] });
const shots = Object.fromEntries(names.map((n) => [n, []]));
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => console.log("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("console.error " + m.text().slice(0, 600)); });
  await page.goto(((process.env.LAB || "http://localhost:5173") + "/?tier=T1&scale=1&debug=1"), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(([x, y]) => {
    const h = window.__hero;
    h.debug.settle(4);
    window.__envOrig = { plate: h.env.plateMaterial.fragmentShader, water: h.water.material.fragmentShader };
    h.debug.pointer(x, y);
    h.debug.settle(2.5);
    h.debug.freeze(true);
  }, [nx, ny]);
  const apply = (v) => page.evaluate((v) => {
    const h = window.__hero;
    let plate = window.__envOrig.plate;
    for (const [a, b] of v.plate || []) { if (!plate.includes(a)) return "plate missing: " + a.slice(0, 80); plate = plate.split(a).join(b); }
    const m = h.env.plateMaterial;
    if (m.fragmentShader !== plate) { m.dispose(); m.fragmentShader = plate; m.needsUpdate = true; }
    let water = window.__envOrig.water;
    for (const [a, b] of v.water || []) { if (!water.includes(a)) return "water missing: " + a.slice(0, 80); water = water.split(a).join(b); }
    const wm = h.water.material;
    if (wm.fragmentShader !== water) { wm.dispose(); wm.fragmentShader = water; wm.needsUpdate = true; }
    return "";
  }, { plate: v.plate, water: v.water });
  for (let i = 0; i < N; i++) {
    const t = await page.evaluate((step) => {
      const h = window.__hero;
      h.debug.freeze(false);
      h.debug.settle(step);
      h.rings.clock = 0;
      h.debug.freeze(true);
      return +h.state.time.toFixed(3);
    }, STEP);
    for (const n of names) {
      const err = await apply(n === "none" ? {} : VARIANTS[n]);
      if (err) { console.log(n, err); continue; }
      await page.waitForTimeout(500);
      const f = path.join(out, `t${i}__${n}.png`);
      await page.screenshot({ path: f });
      shots[n].push(f);
    }
    await apply({});
    console.log("time", i, t);
  }
} finally {
  await browser.close();
}
for (const [n, files] of Object.entries(shots)) {
  if (!files.length) continue;
  const w = cw * zoom, hh = ch * zoom, cols = 3;
  const inputs = files.flatMap((f) => ["-i", f]);
  const scaled = files.map((_, i) => `[${i}]crop=${cw}:${ch}:${cx}:${cy},scale=${w}:${hh}:flags=neighbor[s${i}]`).join(";");
  const layout = files.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * hh}`).join("|");
  const refs = files.map((_, i) => `[s${i}]`).join("");
  execFileSync(FF, ["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${scaled};${refs}xstack=inputs=${files.length}:layout=${layout}:fill=black`, path.join(out, `grid__${n}.png`)]);
  console.log("grid", n);
}
