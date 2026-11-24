// g3 copy (rtB: fix B rowsFull on / off at runtime, scale pinned by --scale, default 0.7) of AA5c copy of the judges' rtpin.mjs: configs fullN (lane default), fullO (AA3: mirrorcost off), noneO (BASE schedule, no TAA,
// mirrorcost off); port arg.
// Judge (G7, real loop): the engine's own requestAnimationFrame loop with CDP mouse sweeps, B + C toggled at runtime in
// blocks (full = lane default, none = BASE schedule + no TAA; A compiled in both), ABBA order; per block the median frame
// interval (pipelined CPU / GPU, as a visitor sees it). Scale pinned (?scale=1), T1.
//   SLOT_BG=0 node rtpin.mjs --vw 1440 --vh 766 --cycles 8 --blockms 2500 --out FILE
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port", "5195"), confs = arg("confs", "B,A7").split(",");
const vw = +arg("vw", "1440"), vh = +arg("vh", "766"), cycles = +arg("cycles", "8"), blockms = +arg("blockms", "2500"), out = arg("out", "");
const load0 = os.loadavg();
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
let res = null;
const logs = [];
try {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text().slice(0, 200)); });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=${arg("scale", "0.7")}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  await page.waitForTimeout(4500);
  await page.evaluate(() => {
    const h = window.__hero;
    window.__taa = h.envEdge ? h.envEdge.taa : null;
    window.__cfg = "fullN";
    window.__iv = [];
    let last = performance.now();
    const f = () => { const n = performance.now(); window.__iv.push([window.__cfg, n - last]); last = n; requestAnimationFrame(f); };
    requestAnimationFrame(f);
    window.__set = (c) => {
      h.lakeMirror.rowsFull = c === "B";
      h.resize();
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
  for (let c = 0; c < cycles; c++) for (const k of c % 2 ? [...confs].reverse() : confs) order.push(k);
  for (const k of order) {
    await page.evaluate((k) => window.__set(k), k);
    await page.waitForTimeout(blockms);
    await page.evaluate((k) => window.__iv.push(["__end_" + k, 0]), k);
  }
  stop = true;
  await mover;
  res = await page.evaluate(() => ({ msize: [window.__hero.lakeMirror.target.width, window.__hero.lakeMirror.target.height], iv: window.__iv, fps: window.__hero.state.fps, scale: window.__hero.state.renderScale, taa: window.__hero.envEdge?.taaState ?? null }));
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
      else if (confs.includes(c)) cur.push(v);
    }
    const by = Object.fromEntries(confs.map((k) => [k, []]));
    for (const b of blocks) by[b.cfg].push(b.v);
    const ref = confs[confs.length - 1];
    const all = (k) => by[k].flat();
    summ = { ref };
    for (const k of confs) {
      const pairs = [];
      for (let i = 0; i < Math.min(by[k].length, by[ref].length); i++) pairs.push(+(med(by[k][i]) / med(by[ref][i])).toFixed(3));
      summ[k] = { frames: all(k).length, med: +med(all(k)).toFixed(2), p90: +q(all(k), 0.9).toFixed(1), max: +Math.max(...all(k)).toFixed(1), blockMeds: by[k].map((v) => +med(v).toFixed(1)), pairedRatios: pairs, pairedRatioMed: med(pairs), ratioOfMedians: +(med(all(k)) / med(all(ref))).toFixed(3) };
    }
  }
  const o = { msize: res?.msize, vw, vh, cycles, blockms, load1minBefore: +load0[0].toFixed(2), load1minAfter: +load1[0].toFixed(2), summ, fps: res?.fps, scale: res?.scale, taa: res?.taa, logs };
  console.log(JSON.stringify(o, null, 1));
  if (out) fs.writeFileSync(out, JSON.stringify(o, null, 1));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
