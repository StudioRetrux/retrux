// p4hold: hold poses at any viewport (shoot_qc's pose / settle / freeze sequence).  node shoot_vp.mjs <port> <outDir> <WxH> [qs] [poses=p04,p06]
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [port, out, vp, qs = "", posesS = "p04,p05,p06"] = process.argv.slice(2);
const [VW, VH] = vp.split("x").map(Number);
const ALL = { q00: [null, 0], p04: ["expand", 0.9], p05: ["expand", 2.37], p06: ["expand", 2.97], p07: ["release", 0.33] };
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  const page = await browser.newPage({ viewport: { width: VW, height: VH } });
  const logs = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text().slice(0, 200)); });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => window.__hero.debug.settle(6));
  await page.waitForTimeout(1500);
  for (const name of posesS.split(",")) {
    const [ph, t] = ALL[name];
    await page.evaluate(([ph, t]) => {
      const h = window.__hero;
      h.debug.freeze(false);
      if (ph === "expand") { h.debug.pose(ph, 0); h.debug.settle(0.1); }
      h.debug.pose(ph, t);
      h.debug.settle(ph ? 1.6 : 2.5);
      h.rings.tau = 3.6; // one tumble phase for every lab
      h.debug.settle(1 / 60);
      h.debug.freeze(true);
    }, [ph, t]);
    await page.waitForTimeout(450);
    await page.screenshot({ path: path.join(out, `${name}_${vp}.png`) });
  }
  console.log(out, "logs", JSON.stringify(logs));
} finally { await browser.close(); }
