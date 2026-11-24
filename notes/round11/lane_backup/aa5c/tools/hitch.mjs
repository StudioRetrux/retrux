// Judge (perf lens): first-motion hitch in the REAL engine loop (its own requestAnimationFrame, CDP mouse input), lane vs base,
// interleaved sessions. Records: programs linked before the first motion, per-frame engine CPU time (h.frame wrapped) and the
// page's frame intervals; bursts: first motion after load, and again after a long rest (TAA handed over). Also TAA state.
//   SLOT_BG=0 node hitch.mjs --runs "lane=5181,base=5182" --reps 3 [--vw 1440 --vh 766] [--qs "scale=1"] --out FILE
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const runs = arg("runs", "lane=5181,base=5182").split(",").map((r) => { const [name, port] = r.split("="); return { name, port }; });
const reps = +arg("reps", "3"), vw = +arg("vw", "1440"), vh = +arg("vh", "766"), qs = arg("qs", "scale=1"), rest = +arg("rest", "8000");
const out = arg("out", "");
const load0 = os.loadavg();
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const results = [];
async function session(r, rep) {
  const logs = [];
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 200)}`); });
  // wrap the engine's frame as soon as the lab assigns window.__hero (the engine's own loop still runs)
  await page.addInitScript(() => {
    let h = null;
    window.__cpu = [];
    Object.defineProperty(window, "__hero", {
      configurable: true,
      get: () => h,
      set: (v) => {
        h = v;
        const proto = Object.getPrototypeOf(v);
        const of = proto.frame;
        v.frame = function (dt, warm) { const t0 = performance.now(); of.call(this, dt, warm); window.__cpu.push([t0, performance.now() - t0, warm ? 1 : 0]); };
      },
    });
  });
  const t0 = Date.now();
  await page.goto(`http://localhost:${r.port}/?tier=T1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  const loadMs = Date.now() - t0;
  const boot = await page.evaluate(() => {
    const h = window.__hero;
    const progs = (h.renderer.info.programs || []).map((p) => p.name);
    window.__ivl = [];
    let last = performance.now();
    const f = () => { const n = performance.now(); window.__ivl.push([n, n - last]); last = n; requestAnimationFrame(f); };
    requestAnimationFrame(f);
    return { programs: progs.length, names: progs, taaProgram: progs.includes("rx-lake-edge-taa"), taa: h.envEdge?.taaState ?? null, tier: h.state.tier, scale: h.state.renderScale };
  });
  // intro (3.4 s) + settle, pointer never moved
  await page.waitForTimeout(5500);
  const mark = (name) => page.evaluate((name) => { (window.__marks = window.__marks || []).push([name, performance.now()]); }, name);
  const burst = async (name, seed) => {
    await mark(name);
    for (let i = 0; i < 90; i++) await page.mouse.move(vw * (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(seed + i / 14))), vh * (0.4 + 0.12 * Math.sin(seed + i / 9)));
    await mark(name + "_end");
  };
  const st0 = await page.evaluate(() => window.__hero.envEdge?.taaState ?? null);
  await burst("first", 0);
  await page.waitForTimeout(400);
  const st1 = await page.evaluate(() => window.__hero.envEdge?.taaState ?? null);
  await page.waitForTimeout(rest);
  const st2 = await page.evaluate(() => window.__hero.envEdge?.taaState ?? null);
  await burst("afterRest", 2);
  await page.waitForTimeout(400);
  const st3 = await page.evaluate(() => window.__hero.envEdge?.taaState ?? null);
  const data = await page.evaluate(() => ({ cpu: window.__cpu, ivl: window.__ivl, marks: window.__marks, progs: (window.__hero.renderer.info.programs || []).map((p) => p.name) }));
  await ctx.close();
  const seg = (a, b, arr, k = 1) => arr.filter((x) => x[0] >= a && x[0] < b).map((x) => x[k]);
  const M = Object.fromEntries(data.marks.map(([n, t]) => [n, t]));
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
  const summarize = (n) => {
    const a = M[n], b = M[n + "_end"];
    const ivl = seg(a, b + 200, data.ivl), cpu = seg(a, b + 200, data.cpu);
    return { frames: ivl.length, ivlFirst10: ivl.slice(0, 10).map((x) => +x.toFixed(1)), ivlMax: +Math.max(...ivl).toFixed(1), ivlMed: +med(ivl).toFixed(1), cpuFirst10: cpu.slice(0, 10).map((x) => +x.toFixed(1)), cpuMax: +Math.max(...cpu).toFixed(1), cpuMed: +med(cpu).toFixed(2) };
  };
  const firstRealFrames = data.cpu.filter((x) => !x[2]).slice(0, 8).map((x) => +x[1].toFixed(1));
  const restIvl = seg(M.first_end + 1500, M.afterRest - 200, data.ivl);
  const restCpu = seg(M.first_end + 1500, M.afterRest - 200, data.cpu);
  return {
    name: r.name, rep, loadMs, boot, firstRealFramesCpu: firstRealFrames, warmFramesCpu: data.cpu.filter((x) => x[2]).map((x) => +x[1].toFixed(1)),
    first: summarize("first"), afterRest: summarize("afterRest"),
    rest: { frames: restIvl.length, ivlMed: +med(restIvl).toFixed(1), ivlMax: +Math.max(...restIvl).toFixed(1), cpuMed: +med(restCpu).toFixed(2) },
    taa: { beforeMotion: st0, afterFirst: st1, afterLongRest: st2, afterSecond: st3 },
    programsEnd: data.progs.length, taaProgramEnd: data.progs.includes("rx-lake-edge-taa"), newAfterBoot: data.progs.filter((n, i, a) => a.indexOf(n) === i && !(boot.names || []).includes(n)), logs,
  };
}
try {
  for (let p = 0; p < reps; p++) {
    const order = p % 2 ? [...runs].reverse() : runs;
    for (const r of order) {
      const s = await session(r, p);
      results.push(s);
      console.log(`${r.name} rep ${p}: load ${s.loadMs} ms, progs ${s.boot.programs} taaProg@boot ${s.boot.taaProgram}; first ivlMax ${s.first.ivlMax} cpuMax ${s.first.cpuMax} (cpu1st10 ${s.first.cpuFirst10.join(" ")}); afterRest ivlMax ${s.afterRest.ivlMax} cpuMax ${s.afterRest.cpuMax}; rest ivl med ${s.rest.ivlMed}; taa ${JSON.stringify(s.taa)}`);
    }
  }
} catch (e) {
  console.log("error " + e.message);
} finally {
  const load1 = os.loadavg();
  const o = { vw, vh, qs, rest, load1minBefore: +load0[0].toFixed(2), load1minAfter: +load1[0].toFixed(2), results };
  if (out) fs.writeFileSync(out, JSON.stringify(o, null, 1));
  console.log(JSON.stringify({ load1minBefore: o.load1minBefore, load1minAfter: o.load1minAfter }));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
