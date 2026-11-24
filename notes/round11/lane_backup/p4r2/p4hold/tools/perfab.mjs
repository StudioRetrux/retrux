// (p4hold copy: + MODE=hold: the mouse is pressed at the orb after the warm-up and held through a 2.5 s lunge and the measurement)
// p4env perf A/B: the engine's own RAF loop (no frame stepping), vsync / frame-rate limit off so the interval is the frame cost,
// a slow pointer sweep (CDP mouse moves) so the orbit-dependent shaders run. Interleaved A, B pairs; per run the median and
// mean RAF interval over `sec` seconds after a warm-up.
//   SLOT_BG=0 node perfab.mjs <out.json> <pairs> <urlA> <urlB> [sec=6]
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [out, pairsS, A, B, secS] = process.argv.slice(2);
const pairs = +pairsS, sec = +(secS || 6);
const one = async (url) => {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
    await page.mouse.move(720, 383);
    await page.waitForTimeout(4000);
    if (process.env.MODE === "hold") { await page.mouse.move(720, 380); await page.mouse.down(); await page.waitForTimeout(2500); }
    const t0 = Date.now();
    const sweep = (async () => {
      while (Date.now() - t0 < sec * 1000 + 300) {
        const t = (Date.now() - t0) / 1000;
        const a = process.env.MODE === "hold" ? 0.25 : 1;
        await page.mouse.move(720 + a * 640 * Math.sin((2 * Math.PI * t) / 6), 383 + a * 150 * Math.sin((2 * Math.PI * t) / 8.5));
        await page.waitForTimeout(16);
      }
    })();
    const iv = await page.evaluate((sec) => new Promise((res) => {
      const xs = []; let last = performance.now(); const end = last + sec * 1000;
      const f = (now) => { xs.push(now - last); last = now; if (now < end) requestAnimationFrame(f); else res(xs); };
      requestAnimationFrame(f);
    }), sec);
    await sweep;
    const held = process.env.MODE === "hold" ? await page.evaluate(() => ({ phase: window.__hero.choreo?.phase, cam: window.__hero.choreo?.drivers?.camExpand })) : null;
    if (process.env.MODE === "hold") await page.mouse.up();
    const s = iv.slice(2).sort((a, b) => a - b);
    return { held, n: s.length, med: s[Math.floor(s.length / 2)], mean: s.reduce((a, b) => a + b, 0) / s.length, p95: s[Math.floor(s.length * 0.95)] };
  } finally {
    await browser.close();
  }
};
const res = { A: [], B: [] };
for (let i = 0; i < pairs; i++) {
  for (const [k, u] of i % 2 ? [["B", B], ["A", A]] : [["A", A], ["B", B]]) {
    const r = await one(u);
    res[k].push(r);
    console.log(i, k, JSON.stringify(r), "load", (await import("node:os")).loadavg()[0].toFixed(1));
  }
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const sum = { A_med: med(res.A.map((r) => r.med)), B_med: med(res.B.map((r) => r.med)), A_mean: med(res.A.map((r) => r.mean)), B_mean: med(res.B.map((r) => r.mean)) };
sum.ratio_med = sum.B_med / sum.A_med;
sum.ratio_mean = sum.B_mean / sum.A_mean;
console.log(JSON.stringify(sum));
fs.writeFileSync(out, JSON.stringify({ A, B, res, sum }, null, 1));
