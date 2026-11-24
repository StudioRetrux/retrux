// Ice-shader variants side by side with the reference, one Chrome session, shards hidden.
//   node probe_icevar.mjs <outDir> <variants.mjs> <variant,variant,...|all> [poses=p06,q00] [tier=T1]
// variants.mjs: export default { name: { frag: [[find, replace], ...], vert: [[find, replace], ...],
//   uniforms: { uName: number | [x, y, z] }, js: "code run with h = window.__hero" } }. "none" is always the build.
// Writes <pose>__<variant>.png (crop) and <pose>__grid.jpg (reference crop, then each variant, 2 per row).
// Old programs are disposed before each patch (D3D compiles of the ice shader cost a lot of RAM); keep a batch
// to a handful of variants.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const FF = (process.env.FFMPEG || "/opt/homebrew/bin/ffmpeg");
const REF = "/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/reference";

const out = process.argv[2];
const VARIANTS = (await import(pathToFileURL(path.resolve(process.argv[3])).href)).default;
const pick = process.argv[4] || "all";
const poseList = (process.argv[5] || "p06,q00").split(",");
const tier = process.argv[6] || "T1";
fs.mkdirSync(out, { recursive: true });
const names = ["none", ...(pick === "all" ? Object.keys(VARIANTS) : pick.split(",")).filter((n) => n !== "none")];

// [name, phase, t, tau, reference, clip]
const POSES = {
  q00: [null, 0, 0, "ref_F000", { x: 440, y: 130, width: 560, height: 420 }],
  q01: [null, 0, 0.5, "loop_F015", { x: 440, y: 130, width: 560, height: 420 }],
  q03: [null, 0, 1.5, "loop_F045", { x: 470, y: 160, width: 500, height: 420 }],
  // Pop (F358) and an idle phase where a band hides the orb's core (tau 0.75, between loop F015 and F030).
  p04: ["expand", 0.88, null, "ref_F358", { x: 300, y: 60, width: 900, height: 640 }],
  t075: [null, 0, 0.75, "loop_F030", { x: 440, y: 130, width: 560, height: 420 }],
  p05: ["expand", 2.37, null, "ref_F402", { x: 300, y: 0, width: 900, height: 766 }],
  p06: ["expand", 2.97, null, "ref_F420", { x: 300, y: 0, width: 900, height: 766 }],
  p06b: ["expand", 2.97, null, "ref_F420", { x: 440, y: 230, width: 560, height: 340 }],
};

const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
  args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"],
});
const shots = {};
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => console.log("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("console.error " + m.text().slice(0, 600)); });
  await page.goto(`${(process.env.LAB || "http://localhost:5173")}/?tier=${tier}&scale=1&debug=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => {
    const h = window.__hero;
    h.debug.settle(4);
    const m0 = h.rings.materials[0];
    window.__iceOrig = { frag: m0.fragmentShader, vert: m0.vertexShader };
    window.__iceU = h.rings.materials.map((m) => Object.fromEntries(Object.entries(m.uniforms).map(([k, u]) => {
      const v = u.value;
      return [k, typeof v === "number" ? v : v && v.toArray ? v.toArray() : null];
    })));
  });
  const apply = async (v) => page.evaluate((v) => {
    const h = window.__hero;
    let frag = window.__iceOrig.frag;
    let vert = window.__iceOrig.vert;
    for (const [a, b] of v.frag || []) { if (!frag.includes(a)) return "frag missing: " + a.slice(0, 80); frag = frag.split(a).join(b); }
    for (const [a, b] of v.vert || []) { if (!vert.includes(a)) return "vert missing: " + a.slice(0, 80); vert = vert.split(a).join(b); }
    const touched = window.__iceTouched || [];
    window.__iceTouched = Object.keys(v.uniforms || {});
    h.rings.materials.forEach((m, i) => {
      // Restore the uniforms the previous variant changed, then set this variant's. A value may be a number,
      // an array (vector / colour) or an array of per-material numbers under { per: [...] }.
      for (const k of touched) {
        const val = window.__iceU[i][k];
        const u = m.uniforms[k];
        if (val === null || val === undefined || !u) continue;
        if (typeof val === "number") u.value = val; else if (u.value && u.value.fromArray) u.value.fromArray(val);
      }
      for (const [k, val] of Object.entries(v.uniforms || {})) {
        const u = m.uniforms[k];
        if (!u) continue;
        const vv = val && val.per ? val.per[i % val.per.length] : val;
        if (typeof vv === "number") u.value = vv; else if (u.value && u.value.fromArray) u.value.fromArray(vv);
      }
      if (m.fragmentShader !== frag || m.vertexShader !== vert) {
        m.dispose();
        m.fragmentShader = frag;
        m.vertexShader = vert;
        m.needsUpdate = true;
      }
    });
    // The back-depth materials share the vertex stage (thickness must match a displaced front).
    for (const p of h.rings.pieces) {
      const b = p.mesh.userData.backMaterial;
      if (b && b.vertexShader !== vert) { b.dispose(); b.vertexShader = vert; b.needsUpdate = true; }
    }
    // The copy (blit) shader may be patched by a variant's js: restore the build's first.
    const bm = h.pipeline.blitMaterial;
    if (!window.__blitOrig) window.__blitOrig = bm.fragmentShader;
    if (bm.fragmentShader !== window.__blitOrig) { bm.dispose(); bm.fragmentShader = window.__blitOrig; bm.needsUpdate = true; }
    // The orb shader and intensity may be patched by a variant's js too.
    const om = h.orb.material;
    if (!window.__orbOrig) { window.__orbOrig = om.fragmentShader; window.__orbInt = h.orb.intensity; }
    if (om.fragmentShader !== window.__orbOrig) { om.dispose(); om.fragmentShader = window.__orbOrig; om.needsUpdate = true; }
    h.orb.intensity = window.__orbInt;
    // The post grade shader and its uniforms may be patched too (grade variants).
    const gm = h.post && h.post.grade;
    if (gm) {
      if (!window.__gradeOrig) window.__gradeOrig = gm.fragmentShader;
      if (gm.fragmentShader !== window.__gradeOrig) { gm.dispose(); gm.fragmentShader = window.__gradeOrig; gm.needsUpdate = true; }
    }
    if (v.js) new Function("h", v.js)(h);
    return "";
  }, { frag: v.frag, vert: v.vert, uniforms: v.uniforms, js: v.js });

  for (const pn of poseList) {
    const P = POSES[pn];
    if (!P) { console.log("unknown pose", pn); continue; }
    const [phase, t, tau, , clip] = P;
    await page.evaluate(([ph, tt, ta]) => {
      const h = window.__hero;
      if (h.shards && h.shards.mesh) h.shards.mesh.visible = false;
      h.debug.freeze(false);
      // The hold latches its slots from the tumble at the press: start it from the QC capture's tumble moment
      // (shoot_qc reaches p06's press at tau ~2.6), so every run shows the same hold arrangement.
      if (ph === "expand") { h.debug.pose(null); h.debug.settle(0.5); h.rings.tau = 2.6; h.debug.pose(ph, 0); h.debug.settle(0.1); }
      h.debug.pose(ph, tt);
      h.debug.settle(ph ? 1.6 : 2.5);
      if (ta !== null) h.rings.tau = ta;
      h.debug.freeze(true);
    }, [phase, t, tau]);
    shots[pn] = [];
    for (const n of names) {
      const v = n === "none" ? {} : VARIANTS[n];
      if (!v) { console.log("unknown variant", n); continue; }
      const err = await apply(v);
      if (err) { console.log(n, err); continue; }
      await page.waitForTimeout(900);
      const f = path.join(out, `${pn}__${n}.png`);
      await page.screenshot({ path: f, clip });
      shots[pn].push(f);
    }
    await apply({});
  }
} finally {
  await browser.close();
}
// Grids: the reference crop first, then the variants, 2 per row.
for (const [pn, files] of Object.entries(shots)) {
  const [, , , ref, c] = POSES[pn];
  const refCrop = path.join(out, `${pn}__REF.png`);
  execFileSync(FF, ["-y", "-loglevel", "error", "-i", path.join(REF, ref + ".png"), "-vf", `crop=${c.width}:${c.height}:${c.x}:${c.y}`, refCrop]);
  const list = [refCrop, ...files];
  const w = c.width > 600 ? 640 : c.width;
  const h = Math.round((c.height * w) / c.width);
  const cols = 2;
  const inputs = list.flatMap((f) => ["-i", f]);
  const scaled = list.map((_, i) => `[${i}]scale=${w}:${h}[s${i}]`).join(";");
  const layout = list.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join("|");
  const refs = list.map((_, i) => `[s${i}]`).join("");
  const filter = list.length > 1 ? `${scaled};${refs}xstack=inputs=${list.length}:layout=${layout}:fill=black` : `${scaled}`;
  execFileSync(FF, ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filter, "-q:v", "2", path.join(out, `${pn}__grid.jpg`)]);
  console.log(`${pn}: REF, ${names.join(", ")}`);
}
