// p4water live tuning: one page, several uniform settings (JS run with u = __hero.water.material.uniforms), the panel's poses.
//   node tune.mjs --out DIR --port 5177 [--qs ...] --poses p05,p06 --sets 'tag::js;;tag2::js2'
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
const out = arg("out", ".");
fs.mkdirSync(out, { recursive: true });
const port = arg("port", "5177"), qs = arg("qs", "");
const sets = arg("sets", "base::").split(";;").filter(Boolean).map((s) => {
  const i = s.indexOf("::");
  return { tag: s.slice(0, i), js: s.slice(i + 2) };
});
const POSES = {
  q00: [null, 0, 0], q01: [null, 0, 0.5], q02: [null, 0, 1.0], q03: [null, 0, 1.5],
  p04: ["expand", 0.9, null], p05: ["expand", 2.37, null], p06: ["expand", 2.97, null],
  p07: ["release", 0.33, null], p08: ["release", 0.57, null], h15: ["expand", 1.5, null], h40: ["expand", 4.0, null],
};
const PTR = { ptrrest: [null, 0], ptrR: [0.98, 0], ptrL: [-0.98, 0], ptrTL: [-0.98, 0.98], ptrBL: [-0.98, -0.98], ptrTR: [0.98, 0.98], ptrBR: [0.98, -0.98] };
const poses = arg("poses", "p06").split(",");
const logs = [];
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => logs.push(`pageerror ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 300)}`);
  });
  await page.goto(`http://localhost:${port}/?tier=${arg("tier", "T1")}&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => window.__hero.debug.settle(6));
  await page.waitForTimeout(800);
  for (const s of sets) {
    await page.evaluate((js) => {
      const u = window.__hero.water.material.uniforms;
      // eslint-disable-next-line no-new-func
      new Function("u", "h", js)(u, window.__hero);
    }, s.js);
    for (const p of poses) {
      if (POSES[p]) {
        const [ph, t, tau] = POSES[p];
        await page.evaluate(([ph, tt, ta]) => {
          const h = window.__hero;
          h.debug.freeze(false);
          h.debug.pointer(null);
          if (ph === "expand") { h.debug.pose(ph, 0); h.debug.settle(0.1); }
          h.debug.pose(ph, tt);
          h.debug.settle(ph ? 1.6 : 2.5);
          if (ta !== null) h.rings.tau = ta;
          h.debug.freeze(true);
        }, [ph, t, tau]);
      } else if (PTR[p]) {
        const [x, y] = PTR[p];
        await page.evaluate(([x, y]) => {
          const h = window.__hero;
          h.debug.freeze(false);
          h.debug.pose(null);
          h.debug.pointer(x, y);
          h.debug.settle(2.5);
          h.rings.clock = 0;
          h.debug.freeze(true);
        }, [x, y]);
      } else continue;
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(out, `${s.tag}_${p}.png`) });
      logs.push(`${s.tag} ${p} ok`);
    }
  }
} finally {
  fs.writeFileSync(path.join(out, "tune_log.txt"), logs.join("\n"));
  console.log(logs.join("\n"));
  await browser.close();
}
