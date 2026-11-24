// p4ice3: one pose, frozen, then every live uniform config shot at that SAME pose (no re-posing between configs).
//   node capf.mjs --port 5175 --out DIR --poses q00,p04 --configs cfg.json [--qs "a=b"] [--tier T1] [--clip x,y,w,h]
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port", "5175"), out = arg("out", "."), qs = arg("qs", ""), tier = arg("tier", "T1");
const want = arg("poses", "q00").split(",");
const configs = JSON.parse(fs.readFileSync(arg("configs", ""), "utf8"));
const clipA = arg("clip", "");
const clip = clipA ? (([x, y, width, height]) => ({ x, y, width, height }))(clipA.split(",").map(Number)) : undefined;
fs.mkdirSync(out, { recursive: true });
const POSES = [
  ["q00_rest", null, 0, 0], ["q01_loop15", null, 0, 0.5], ["q02_loop30", null, 0, 1.0], ["q03_eye", null, 0, 1.5],
  ["p04_expand_pop", "expand", 0.9, null], ["p05_expand", "expand", 2.37, null], ["p06_sustain", "expand", 2.97, null],
  ["p07_release_snap", "release", 0.33, null], ["p08_release_home", "release", 0.57, null],
].filter((p) => want.some((w) => p[0].startsWith(w)));
const logs = [];
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 1500)}`); });
  await page.goto(`http://localhost:${port}/?tier=${tier}&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => window.__hero.debug.settle(6));
  await page.waitForTimeout(1200);
  const apply = (u) => page.evaluate((u) => {
    const h = window.__hero;
    for (const m of h.rings.materials) {
      if (!m.__p4orig) {
        m.__p4orig = {};
        for (const [k, v] of Object.entries(m.uniforms)) {
          const val = v.value;
          if (typeof val === "number") m.__p4orig[k] = val;
          else if (val && typeof val.toArray === "function" && !val.isTexture) m.__p4orig[k] = val.toArray();
        }
      }
      for (const [k, a] of Object.entries(m.__p4orig)) {
        const un = m.uniforms[k];
        if (typeof a === "number") un.value = a; else un.value.fromArray(a);
      }
      for (const [key, val] of Object.entries(u)) {
        const [k, comp] = key.split(".");
        const un = m.uniforms[k];
        if (!un) continue;
        if (comp) un.value[comp] = val; else if (typeof val === "number") un.value = val; else un.value.fromArray(val);
      }
    }
  }, u);
  for (const [name, phase, t, tau] of POSES) {
    await apply({});
    await page.evaluate(([ph, tt, ta]) => {
      const h = window.__hero;
      h.debug.freeze(false);
      if (ph === "expand") { h.debug.pose(ph, 0); h.debug.settle(0.1); }
      h.debug.pose(ph, tt);
      h.debug.settle(ph ? 1.6 : 2.5);
      if (ta !== null) h.rings.tau = ta;
      h.debug.freeze(true);
    }, [phase, t, tau]);
    await page.waitForTimeout(450);
    for (const cfg of configs) {
      await apply(cfg.u);
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(out, `${cfg.name}_${name}.png`), clip });
    }
  }
} finally {
  fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n"));
  console.log(logs.join("\n").slice(0, 3000));
  await browser.close();
}
