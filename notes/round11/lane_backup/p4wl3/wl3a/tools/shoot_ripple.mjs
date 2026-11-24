// p4rip: deterministic rest captures of the lake for ripple analysis.
//   LAB=http://localhost:5170 node shoot_ripple.mjs <outDir> [N=1] [DT=0.0333333] [T0=100] [tau=0]
// env: QS (extra URL params), DPR (deviceScaleFactor, default 1), CLIP "x,y,w,h" (CSS px; default full frame), TIER (T1),
//      PREFIX (file prefix, default f), FMT (png), LIVE=1 (no freeze: real loop, screenshots as fast as possible)
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const out = process.argv[2];
const N = +(process.argv[3] || 1);
const DT = +(process.argv[4] || 1 / 30);
const T0 = +(process.argv[5] || 100);
const TAU = +(process.argv[6] || 0);
const DPR = +(process.env.DPR || 1);
const TIER = process.env.TIER || "T1";
const PREFIX = process.env.PREFIX || "f";
const clip = process.env.CLIP ? (([x, y, width, height]) => ({ x, y, width, height }))(process.env.CLIP.split(",").map(Number)) : undefined;
fs.mkdirSync(out, { recursive: true });
const logs = [];
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: DPR });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 400)}`);
  });
  const url = `${process.env.LAB || "http://localhost:5170"}/?tier=${TIER}&scale=1&debug=1${process.env.QS ? "&" + process.env.QS : ""}`;
  logs.push("url " + url);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => window.__hero.debug.settle(6));
  await page.waitForTimeout(800);
  await page.evaluate(([tau]) => {
    const h = window.__hero;
    h.debug.freeze(false);
    h.debug.pose(null, 0);
    h.debug.settle(2.5);
    h.rings.tau = tau;
    h.debug.freeze(true);
  }, [TAU]);
  await page.waitForTimeout(400);
  const raf2 = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(0)))));
  for (let i = 0; i < N; i++) {
    const t = T0 + i * DT;
    await page.evaluate(([tt]) => {
      window.__hero.state.time = tt;
    }, [t]);
    await raf2();
    await raf2();
    const f = path.join(out, `${PREFIX}${String(i).padStart(3, "0")}.png`);
    await page.screenshot({ path: f, clip });
  }
  const s = await page.evaluate(() => ({ time: window.__hero.state.time, tau: window.__hero.rings.tau, scale: window.__hero.state.renderScale, tier: window.__hero.profile?.tier, dpr: devicePixelRatio }));
  logs.push("state " + JSON.stringify(s));
} finally {
  fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n") + "\n");
  console.log(logs.join("\n"));
  // (22 Nov: browser.close() sometimes never returns tonight; as cap.mjs / identP.mjs)
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  setTimeout(() => process.exit(process.exitCode ?? 0), 500);
}
