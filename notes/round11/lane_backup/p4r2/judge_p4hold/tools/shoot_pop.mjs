// p4hold: frames through the pop at fixed hold times with the ring tumble pinned (tau), shoot_qc's pose / settle / freeze sequence.
//   node shoot_pop.mjs <port> <outDir> [qs] [tau=3.171]
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [port, out, qs = "", tauS = "3.171"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => window.__hero.debug.settle(6));
  for (const t of [0.8, 0.85, 0.9, 0.94, 1.0, 1.1]) {
    const d = await page.evaluate(([t, tau]) => {
      const h = window.__hero;
      h.debug.freeze(false);
      h.debug.pose("expand", 0); h.debug.settle(0.1);
      h.debug.pose("expand", t); h.debug.settle(1.6);
      h.rings.tau = tau; h.debug.settle(1 / 60);
      h.debug.freeze(true);
      return { spreadA: +h.choreo.drivers.spreadA.toFixed(3), cam: +h.choreo.drivers.camExpand.toFixed(3) };
    }, [t, +tauS]);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, `pop_${t.toFixed(2)}.png`) });
    console.log(t, JSON.stringify(d));
  }
} finally { await browser.close(); }
