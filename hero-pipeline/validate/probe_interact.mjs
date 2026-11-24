// Click vs hold vs re-press: samples the choreography drivers every frame and reports the largest
// frame-to-frame jump of each driver and of every ring's orientation (degrees).
import { createRequire } from "node:module";
const require = createRequire(new URL("../tools/package.json", import.meta.url));
const { chromium } = require("playwright-core");
const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
  args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(((process.env.LAB || "http://localhost:5173") + "/?tier=T0&scale=0.5"), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.waitForTimeout(4500);
  await page.evaluate(() => {
    const h = window.__hero;
    const keys = ["camExpand", "align", "splitB", "spreadA", "expandPose", "faceInner", "flatten", "splay", "tilt"];
    const log = (window.__ilog = { rows: [], keys });
    let prevQ = null;
    const tick = () => {
      const d = h.choreo.drivers;
      const qs = h.rings.groups.map((g) => g.quaternion.clone());
      let maxDeg = 0;
      if (prevQ) qs.forEach((q, i) => (maxDeg = Math.max(maxDeg, (q.angleTo(prevQ[i]) * 180) / Math.PI)));
      prevQ = qs;
      log.rows.push({ t: +h.state.time.toFixed(3), phase: h.choreo.phase, holding: h.state.holding, pressed: h.state.pressed, v: keys.map((k) => +d[k].toFixed(4)), ringDeg: +maxDeg.toFixed(2), cam: h.rig.camera.position.toArray().map((x) => +x.toFixed(3)) });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const mark = (label) => page.evaluate((l) => window.__ilog.rows.push({ mark: l }), label);
  await page.mouse.move(700, 600);
  await page.waitForTimeout(600);
  // 1. A click (120 ms, timed inside the page so input latency cannot stretch it) must change nothing.
  await mark("click");
  await page.evaluate(() => new Promise((res) => {
    const opts = { bubbles: true, clientX: 700, clientY: 600, pointerType: "mouse", isPrimary: true, button: 0, buttons: 1, pointerId: 1 };
    const c = document.querySelector("[data-hero-canvas]");
    c.dispatchEvent(new PointerEvent("pointerdown", opts));
    setTimeout(() => { c.dispatchEvent(new PointerEvent("pointerup", { ...opts, buttons: 0 })); res(); }, 120);
  }));
  await page.waitForTimeout(1200);
  // 2. Hold 2.5 s, release.
  await mark("hold");
  await page.mouse.down();
  await page.waitForTimeout(2500);
  await mark("release");
  await page.mouse.up();
  await page.waitForTimeout(300);
  // 3. Re-press during the release return, hold 1.2 s, release.
  await mark("repress");
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await mark("release2");
  await page.mouse.up();
  await page.waitForTimeout(1500);
  const log = await page.evaluate(() => window.__ilog);
  // Report: per segment, max |delta| per driver and max ring rotation per frame (normalized to 60 fps).
  let seg = "pre";
  const stats = {};
  let prev = null;
  for (const r of log.rows) {
    if (r.mark) { seg = r.mark; prev = null; continue; }
    if (prev) {
      const dt = Math.max(1e-3, r.t - prev.t);
      const s = (stats[seg] ||= { frames: 0, maxDriver: {}, ringDegPerFrame60: 0, camStep60: 0, phases: new Set(), holding: false });
      s.frames++;
      s.phases.add(r.phase);
      if (r.holding) s.holding = true;
      log.keys.forEach((k, i) => {
        const dv = Math.abs(r.v[i] - prev.v[i]) * (1 / 60) / dt;
        s.maxDriver[k] = Math.max(s.maxDriver[k] || 0, +dv.toFixed(4));
      });
      // Raw degrees per rendered frame, skipping very short frames (they inflate a rate).
      if (dt >= 0.008) s.ringDegPerFrame60 = Math.max(s.ringDegPerFrame60, +(r.ringDeg * Math.min(1, (1 / 60) / dt)).toFixed(2));
      const dc = Math.hypot(...r.cam.map((c, i) => c - prev.cam[i]));
      s.camStep60 = Math.max(s.camStep60, +(dc * (1 / 60) / dt).toFixed(4));
    }
    prev = r;
  }
  for (const [k, s] of Object.entries(stats)) console.log(k, JSON.stringify({ ...s, phases: [...s.phases] }));
  const clickRows = log.rows.slice(log.rows.findIndex((r) => r.mark === "click"), log.rows.findIndex((r) => r.mark === "hold"));
  const clickMax = clickRows.filter((r) => r.v).reduce((m, r) => Math.max(m, r.v[0], r.v[2], r.v[3], r.v[4]), 0);
  console.log("click: max of camExpand/splitB/spreadA/expandPose =", clickMax, "phases", [...new Set(clickRows.filter((r) => r.phase).map((r) => r.phase))].join(","), "holding ever:", clickRows.some((r) => r.holding));
  console.log("errors:", errs.length ? errs.join(" | ") : "none");
} finally {
  await browser.close();
}

