// Judge (G7, real loop): the engine's own requestAnimationFrame loop with CDP mouse sweeps, B + C toggled at runtime in
// blocks (full = lane default, none = BASE schedule + no TAA; A compiled in both), ABBA order; per block the median frame
// interval (pipelined CPU / GPU, as a visitor sees it). Scale pinned (?scale=1), T1.
//   SLOT_BG=0 node rtpin.mjs --vw 1440 --vh 766 --cycles 8 --blockms 2500 --out FILE
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const vw = +arg("vw", "1440"), vh = +arg("vh", "766"), cycles = +arg("cycles", "8"), blockms = +arg("blockms", "2500"), out = arg("out", "");
const load0 = os.loadavg();
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
let res = null;
const logs = [];
try {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text().slice(0, 200)); });
  await page.goto(`http://localhost:5181/?tier=T1&scale=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  await page.waitForTimeout(4500);
  await page.evaluate(() => {
    const h = window.__hero;
    window.__taa = h.envEdge ? h.envEdge.taa : null;
    window.__cfg = "full";
    window.__iv = [];
    let last = performance.now();
    const f = () => { const n = performance.now(); window.__iv.push([window.__cfg, n - last]); last = n; requestAnimationFrame(f); };
    requestAnimationFrame(f);
    window.__set = (c) => {
      const taa = window.__taa;
      if (h.envEdge) h.envEdge.taa = c === "full" ? taa : null;
      if (taa && c !== "full") taa.valid = false;
      if (h.lakeSched) h.lakeSched.mirrorEvery = c === "full" ? 1 : 3;
      window.__cfg = c + "_settle";
      setTimeout(() => { window.__cfg = c; }, 300);
    };
  });
  let stop = false;
  const mover = (async () => {
    let i = 0;
    while (!stop) {
      const t = i / 60;
      await page.mouse.move(vw * (0.5 + 0.35 * Math.sin((2 * Math.PI * t) / 6)), vh * (0.45 + 0.12 * Math.sin((2 * Math.PI * t) / 8.5)));
      await new Promise((r) => setTimeout(r, 12));
      i++;
    }
  })();
  const order = [];
  for (let c = 0; c < cycles; c++) for (const k of c % 2 ? ["none", "full"] : ["full", "none"]) order.push(k);
  for (const k of order) {
    await page.evaluate((k) => window.__set(k), k);
    await page.waitForTimeout(blockms);
    await page.evaluate((k) => window.__iv.push(["__end_" + k, 0]), k);
  }
  stop = true;
  await mover;
  res = await page.evaluate(() => ({ iv: window.__iv, fps: window.__hero.state.fps, scale: window.__hero.state.renderScale, taa: window.__hero.envEdge?.taaState ?? null }));
  await ctx.close();
} catch (e) {
  logs.push("error " + e.message);
} finally {
  const load1 = os.loadavg();
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
  const q = (a, f) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(b.length * f))]; };
  let summ = null;
  if (res) {
    // split into blocks at the __end markers
    const blocks = [];
    let cur = [];
    for (const [c, v] of res.iv) {
      if (c.startsWith("__end_")) { blocks.push({ cfg: c.slice(6), v: cur }); cur = []; }
      else if (c === "full" || c === "none") cur.push(v);
    }
    const by = { full: [], none: [] };
    for (const b of blocks) by[b.cfg].push(b.v);
    const pairs = [];
    for (let i = 0; i < Math.min(by.full.length, by.none.length); i++) pairs.push(+(med(by.full[i]) / med(by.none[i])).toFixed(3));
    const all = (k) => by[k].flat();
    summ = {
      full: { frames: all("full").length, med: +med(all("full")).toFixed(2), p90: +q(all("full"), 0.9).toFixed(1), max: +Math.max(...all("full")).toFixed(1), blockMeds: by.full.map((v) => +med(v).toFixed(1)) },
      none: { frames: all("none").length, med: +med(all("none")).toFixed(2), p90: +q(all("none"), 0.9).toFixed(1), max: +Math.max(...all("none")).toFixed(1), blockMeds: by.none.map((v) => +med(v).toFixed(1)) },
      pairedRatios: pairs, pairedRatioMed: med(pairs), ratioOfMedians: +(med(all("full")) / med(all("none"))).toFixed(3),
    };
  }
  const o = { vw, vh, cycles, blockms, load1minBefore: +load0[0].toFixed(2), load1minAfter: +load1[0].toFixed(2), summ, fps: res?.fps, scale: res?.scale, taa: res?.taa, logs };
  console.log(JSON.stringify(o, null, 1));
  if (out) fs.writeFileSync(out, JSON.stringify(o, null, 1));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
