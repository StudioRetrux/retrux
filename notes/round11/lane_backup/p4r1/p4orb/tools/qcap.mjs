// p4orb quick capture: shoot_qc's pose logic (phase-fair rest / loop taus, expand at its own t = 0), several live variants
// per browser session.
//   node qcap.mjs --port 5176 --out DIR [--qs ""] [--poses q00,q03,p05,p06] [--variants file.json] [--tier T1]
// variants file: [{ "name": "base", "js": "" }, { "name": "v1", "js": "__hero.orb.material.uniforms..." }]
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port", "5176"), out = arg("out"), qs = arg("qs", ""), tier = arg("tier", "T1");
const want = arg("poses", "q00,q03,p05,p06").split(",");
const tau0s = arg("tau0", "1.5").split(",").map(Number);
const variants = arg("variants", "") ? JSON.parse(fs.readFileSync(arg("variants"), "utf8")) : [{ name: "v", js: "" }];
const POSES = {
  q00: ["q00_rest", null, 0, 0],
  q01: ["q01_loop15", null, 0, 0.5],
  q02: ["q02_loop30", null, 0, 1.0],
  q03: ["q03_eye", null, 0, 1.5],
  p04: ["p04_expand_pop", "expand", 0.9, null],
  p05: ["p05_expand", "expand", 2.37, null],
  p06: ["p06_sustain", "expand", 2.97, null],
  p07: ["p07_release_snap", "release", 0.33, null],
  p08: ["p08_release_home", "release", 0.57, null],
};
fs.mkdirSync(out, { recursive: true });
const logs = [];
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 400)}`); });
  await page.goto(`http://localhost:${port}/?tier=${tier}&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => window.__hero.debug.settle(6));
  await page.waitForTimeout(1200);
  for (const v of variants) {
    if (v.js) await page.evaluate(v.js);
    for (const key of want) for (const tau0 of POSES[key][1] === "expand" ? tau0s : [null]) {
      const [name0, ph, t, tau] = POSES[key];
      const name = tau0 === null || tau0s.length === 1 ? name0 : `${name0}_t${tau0}`;
      await page.evaluate(([ph, tt, ta, t0]) => {
        const h = window.__hero;
        h.debug.freeze(false);
        // (p4orb: the ring clock pinned at the hold's start, so every session / variant sees the same hold rotation)
        if (ph === "expand") { h.debug.pose(null); h.debug.settle(0.2); h.rings.tau = t0; h.debug.pose(ph, 0); h.debug.settle(0.1); }
        h.debug.pose(ph, tt);
        h.debug.settle(ph ? 1.6 : 2.5);
        if (ta !== null) h.rings.tau = ta;
        h.debug.freeze(true);
      }, [ph, t, tau, tau0]);
      await page.waitForTimeout(400);
      const file = path.join(out, `${v.name}_${name}.png`);
      await page.screenshot({ path: file });
      const orb = await page.evaluate(() => {
        const h = window.__hero, u = h.orb.material.uniforms, cam = h.rig.camera;
        const c = u.uCenter.value.clone(), R = u.uRadius.value;
        const p = c.clone().project(cam);
        const d = c.distanceTo(cam.position);
        const f = 766 / 2 / Math.tan((cam.fov * Math.PI) / 360);
        return { x: (p.x * 0.5 + 0.5) * 1440, y: (1 - (p.y * 0.5 + 0.5)) * 766, r: (R / Math.sqrt(Math.max(d * d - R * R, 1e-6))) * f };
      });
      fs.writeFileSync(file.replace(/\.png$/, ".orb.json"), JSON.stringify(orb));
    }
    await page.evaluate(() => { const h = window.__hero; h.debug.freeze(false); h.debug.pose(null); });
  }
} catch (e) {
  logs.push("ERROR " + e.message);
} finally {
  if (logs.length) console.log(logs.join("\n"));
  console.log("done", out);
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
