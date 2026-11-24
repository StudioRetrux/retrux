// p4water quick shots: one browser, several configs, the panel's poses (shoot_qc / shoot_pointer logic).
//   node shot.mjs --out DIR --confs "tag=port|qs,tag2=port|qs" [--poses q00,p04,p05,p06,p07,p08,ptrR,ptrL,ptrTL,ptrBL,ptrTR,ptrBR,ptrrest]
//                 [--tier T1] [--scale 1] [--extra 0] (extra settled frames after the pose, G6 cache check)
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
const tier = arg("tier", "T1"), scale = arg("scale", "1");
const extra = +arg("extra", "0");
const confs = arg("confs", "").split(";").filter(Boolean).map((s) => {
  const [tag, rest] = s.split("=", 2).length === 2 ? [s.slice(0, s.indexOf("=")), s.slice(s.indexOf("=") + 1)] : [s, s];
  const [port, qs] = rest.split("|");
  return { tag, port, qs: qs || "" };
});
const POSES = {
  q00: [null, 0, 0], q01: [null, 0, 0.5], q02: [null, 0, 1.0], q03: [null, 0, 1.5],
  p04: ["expand", 0.9, null], p05: ["expand", 2.37, null], p06: ["expand", 2.97, null],
  p07: ["release", 0.33, null], p08: ["release", 0.57, null],
  // extra hold moments for the bottom strip
  h15: ["expand", 1.5, null], h40: ["expand", 4.0, null], r10: ["release", 1.0, null],
};
const PTR = { ptrrest: [null, 0], ptrR: [0.98, 0], ptrL: [-0.98, 0], ptrT: [0, 0.98], ptrB: [0, -0.98], ptrTL: [-0.98, 0.98], ptrTR: [0.98, 0.98], ptrBL: [-0.98, -0.98], ptrBR: [0.98, -0.98] };
const poses = arg("poses", "q00,p05,p06").split(",");
const logs = [];
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  for (const c of confs) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
    page.on("pageerror", (e) => logs.push(`${c.tag} pageerror ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") logs.push(`${c.tag} console.${m.type()} ${m.text().slice(0, 300)}`);
    });
    await page.goto(`http://localhost:${c.port}/?tier=${tier}&scale=${scale}&debug=1${c.qs ? "&" + c.qs : ""}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
    await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
    await page.evaluate(() => window.__hero.debug.settle(6));
    await page.waitForTimeout(800);
    for (const p of poses) {
      if (POSES[p]) {
        const [ph, t, tau] = POSES[p];
        await page.evaluate(([ph, tt, ta, ex]) => {
          const h = window.__hero;
          h.debug.freeze(false);
          h.debug.pointer(null);
          if (ph === "expand") { h.debug.pose(ph, 0); h.debug.settle(0.1); }
          h.debug.pose(ph, tt);
          h.debug.settle(ph ? 1.6 : 2.5);
          if (ta !== null) h.rings.tau = ta;
          if (ex > 0) h.debug.settle(ex);
          h.debug.freeze(true);
        }, [ph, t, tau, extra]);
      } else if (PTR[p]) {
        const [x, y] = PTR[p];
        await page.evaluate(([x, y, ex]) => {
          const h = window.__hero;
          h.debug.freeze(false);
          h.debug.pose(null);
          h.debug.pointer(x, y);
          h.debug.settle(2.5);
          h.rings.clock = 0;
          if (ex > 0) h.debug.settle(ex);
          h.debug.freeze(true);
        }, [x, y, extra]);
      } else continue;
      await page.waitForTimeout(450);
      const file = path.join(out, `${c.tag}_${p}.png`);
      await page.screenshot({ path: file });
      logs.push(`${c.tag} ${p} ok`);
    }
    await page.close();
  }
} finally {
  fs.writeFileSync(path.join(out, "shot_log.txt"), logs.join("\n"));
  console.log(logs.join("\n"));
  await browser.close();
}
