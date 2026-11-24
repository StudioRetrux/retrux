// p4water: a stepped 60 fps sequence of the hold (no rAF loop: h.frame(1/60) per shot), for shimmer / crawl checks.
//   node seq.mjs --out DIR --confs "tag=port|qs;..." [--n 24] [--phase expand] [--t 2.97] [--ptr x,y]
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
const n = +arg("n", "24"), phase = arg("phase", "expand"), t = +arg("t", "2.97");
const confs = arg("confs", "").split(";").filter(Boolean).map((s) => {
  const i = s.indexOf("=");
  const tag = s.slice(0, i), rest = s.slice(i + 1);
  const [port, qs] = rest.split("|");
  return { tag, port, qs: qs || "" };
});
const logs = [];
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  for (const c of confs) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => logs.push(`${c.tag} pageerror ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") logs.push(`${c.tag} console.${m.type()} ${m.text().slice(0, 300)}`);
    });
    await page.addInitScript(() => {
      let h = null;
      Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } });
    });
    await page.goto(`http://localhost:${c.port}/?tier=T1&scale=1&debug=1${c.qs ? "&" + c.qs : ""}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
    await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
    await page.evaluate(([ph, tt]) => {
      const h = window.__hero;
      h.debug.settle(6);
      if (ph === "expand") { h.debug.pose(ph, 0); h.debug.settle(0.1); }
      h.debug.pose(ph, tt);
      h.debug.settle(1.6);
    }, [phase, t]);
    for (let i = 0; i < n; i++) {
      await page.evaluate(() => window.__hero.frame(1 / 60, false));
      await page.screenshot({ path: path.join(out, `${c.tag}_${String(i).padStart(3, "0")}.png`) });
    }
    logs.push(`${c.tag} ${n} frames`);
    await ctx.close();
  }
} finally {
  fs.writeFileSync(path.join(out, "seq_log.txt"), logs.join("\n"));
  console.log(logs.join("\n"));
  await browser.close();
}
