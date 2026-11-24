// p4ice: shoot_qc's poses in one session for several live uniform configs (all ring materials).
//   node capv.mjs --port 5175 --out DIR [--qs "a=b"] [--poses q00,q03,p05] [--configs JSON-file] [--tier T1]
// configs file: [{"name":"base","u":{}}, {"name":"x","u":{"uP4A":[4,0.02,0.15,3],"uR11D.z":0.5}}]
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf("--" + k);
  return i < 0 ? d : argv[i + 1];
};
const port = arg("port", "5175"), out = arg("out", "."), qs = arg("qs", ""), tier = arg("tier", "T1");
const want = arg("poses", "q00,q01,q02,q03,p04,p05,p06,p07").split(",");
const configs = arg("configs", "") ? JSON.parse(fs.readFileSync(arg("configs", ""), "utf8")) : [{ name: "base", u: {} }];
fs.mkdirSync(out, { recursive: true });
const POSES = [
  ["q00_rest", null, 0, 0],
  ["q01_loop15", null, 0, 0.5],
  ["q02_loop30", null, 0, 1.0],
  ["q03_eye", null, 0, 1.5],
  ["p04_expand_pop", "expand", 0.9, null],
  ["p05_expand", "expand", 2.37, null],
  ["p06_sustain", "expand", 2.97, null],
  ["p07_release_snap", "release", 0.33, null],
  ["p08_release_home", "release", 0.57, null],
].filter((p) => want.some((w) => p[0].startsWith(w)));
const logs = [];
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 1500)}`);
  });
  await page.goto(`http://localhost:${port}/?tier=${tier}&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => window.__hero.debug.settle(6));
  await page.waitForTimeout(1200);
  for (const cfg of configs) {
    await page.evaluate((u) => {
      const h = window.__hero;
      h.__p4save = h.__p4save || null;
      for (const m of h.rings.materials) {
        if (!m.__p4orig) {
          m.__p4orig = {};
          for (const [k, v] of Object.entries(m.uniforms)) {
            const val = v.value;
            if (typeof val === "number") m.__p4orig[k] = val;
            else if (val && typeof val.toArray === "function") m.__p4orig[k] = val.toArray();
          }
        }
        // restore originals, then apply this config
        for (const [k, a] of Object.entries(m.__p4orig)) {
          const un = m.uniforms[k];
          if (typeof a === "number") un.value = a;
          else un.value.fromArray(a);
        }
        for (const [key, val] of Object.entries(u)) {
          const [k, comp] = key.split(".");
          const un = m.uniforms[k];
          if (!un) continue;
          if (comp) un.value[comp] = val;
          else if (typeof val === "number") un.value = val;
          else un.value.fromArray(val);
        }
      }
    }, cfg.u);
    for (const [name, phase, t, tau] of POSES) {
      await page.evaluate(
        ([ph, tt, ta]) => {
          const h = window.__hero;
          h.debug.freeze(false);
          if (ph === "expand") {
            h.debug.pose(ph, 0);
            h.debug.settle(0.1);
          }
          h.debug.pose(ph, tt);
          h.debug.settle(ph ? 1.6 : 2.5);
          if (ta !== null) h.rings.tau = ta;
          h.debug.freeze(true);
        },
        [phase, t, tau],
      );
      await page.waitForTimeout(450);
      await page.screenshot({ path: path.join(out, `${cfg.name}_${name}.png`) });
    }
    // crawl sequences: rings stepped one 60 fps frame at a time, everything else frozen (hero box only)
    const seq = arg("seq", "");
    if (seq) {
      for (const t0 of seq.split(",").map(Number)) {
        await page.evaluate((ta) => {
          const h = window.__hero;
          h.debug.freeze(false);
          h.debug.pose(null, 0);
          h.debug.settle(2.5);
          h.rings.tau = ta;
          h.debug.freeze(true);
        }, t0);
        await page.waitForTimeout(400);
        for (let i = 0; i < +arg("seqn", "6"); i++) {
          await page.evaluate((ta) => { window.__hero.rings.tau = ta; }, t0 + i / 60);
          await page.waitForTimeout(160);
          await page.screenshot({ path: path.join(out, `seq_${cfg.name}_${t0}_${i}.png`), clip: { x: 440, y: 130, width: 560, height: 420 } });
        }
      }
    }
  }
} finally {
  fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n"));
  console.log(logs.join("\n").slice(0, 6000));
  await browser.close();
}
