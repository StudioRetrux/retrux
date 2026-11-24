// judge p4hold: the pop beat at 30 fps through a real stepped press (pointerdown on the orb, 1/60 engine steps, every 2nd step
// rendered + screenshotted) for tp 0.60-1.30, two tumble phases.   node shoot_pop30.mjs <port> <outdir> [qs]
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [port, outdir, qs = ""] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  const rows = [];
  for (const [s, phase] of [[0, 0.37], [1, 1.43]]) {
    await page.evaluate((phase) => {
      const h = window.__hero;
      h.debug.pointer(0, 0.02);
      h.debug.settle(6 + phase);
      const cv = h.renderer.domElement, r = cv.getBoundingClientRect();
      window.__ev = (type) => window.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height * 0.49, pointerType: "mouse", isPrimary: true, button: 0, buttons: type === "pointerdown" ? 1 : 0, pointerId: 1 }));
      window.__ev("pointerdown");
      window.__f = 0;
    }, phase);
    for (let f = 1; f <= 96; f++) {
      const cap = f >= 50 && f % 2 === 0; // tp = f/60 - 0.25: 0.583 .. 1.35 at 30 fps
      const info = await page.evaluate((cap) => {
        const h = window.__hero;
        if (cap) h.frame(1 / 60, false); else h.update(1 / 60, false);
        const d = h.choreo.drivers;
        return { cam: +d.camExpand.toFixed(3), open: +d.spreadA.toFixed(3) };
      }, cap);
      if (cap) {
        const tp = (f / 60 - 0.25).toFixed(3);
        await page.screenshot({ path: `${outdir}/s${s}_f${String(f).padStart(3, "0")}.png` });
        rows.push(`s${s} f${f} tp ${tp} cam ${info.cam} open ${info.open}`);
      }
    }
    await page.evaluate(() => { window.__ev("pointerup"); window.__hero.debug.settle(3); });
  }
  fs.writeFileSync(`${outdir}/log.txt`, rows.join("\n") + "\nlogs " + JSON.stringify(logs) + "\n");
  console.log(rows.length, "frames", JSON.stringify(logs));
} finally { await browser.close(); }
