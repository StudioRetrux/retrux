// p4hold: ring-piece screen speed through a real (stepped, deterministic) press: pointer pinned on the orb, pointerdown, 4.5 s of
// 1/60 steps (the engine's own update, no rendering), pointerup, 1.5 s. Per frame, every ring piece's bounding-box corners are
// projected; the piece's speed = its largest corner displacement (px per 60 Hz frame, 1440x766). Windows by hold time tp.
//   node probe_speed.mjs <port> [qs] [presses=4]
import { createRequire } from "node:module";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [port, qs = "", nS = "4"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  const logs = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=T0&scale=0.5&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  const res = await page.evaluate((nS) => {
    const h = window.__hero, cam = h.rig.camera, W = 1440, H = 766;
    const corners = [];
    for (let i = 0; i < 8; i++) corners.push([i & 1, (i >> 1) & 1, (i >> 2) & 1]);
    const V = cam.position.clone();
    const shot = () => {
      cam.updateMatrixWorld(true);
      cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      return h.rings.pieces.map((p) => {
        p.mesh.updateWorldMatrix(true, false);
        const bb = p.mesh.geometry.boundingBox || (p.mesh.geometry.computeBoundingBox(), p.mesh.geometry.boundingBox);
        return corners.map((c) => {
          V.set(c[0] ? bb.max.x : bb.min.x, c[1] ? bb.max.y : bb.min.y, c[2] ? bb.max.z : bb.min.z).applyMatrix4(p.mesh.matrixWorld).project(cam);
          return [(V.x * 0.5 + 0.5) * W, (1 - (V.y * 0.5 + 0.5)) * H];
        });
      });
    };
    const ringOf = h.rings.pieces.map((p) => p.ring);
    const cv = h.renderer.domElement, r = cv.getBoundingClientRect();
    const ev = (type) => window.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height * 0.49, pointerType: "mouse", isPrimary: true, button: 0, buttons: type === "pointerdown" ? 1 : 0, pointerId: 1 }));
    const rows = [];
    h.debug.pointer(0, 0.02);
    h.debug.settle(6);
    for (let s = 0; s < nS; s++) {
      h.debug.settle(0.37 + 0.53 * s); // a different tumble phase per press
      let prev = shot();
      const step = (seg, t) => {
        h.update(1 / 60, false);
        const cur = shot();
        cur.forEach((pc, i) => {
          let m = 0;
          pc.forEach((q, k) => { m = Math.max(m, Math.hypot(q[0] - prev[i][k][0], q[1] - prev[i][k][1])); });
          rows.push([s, seg, +t.toFixed(4), ringOf[i], +m.toFixed(3)]);
        });
        prev = cur;
      };
      ev("pointerdown");
      for (let f = 1; f <= 270; f++) step("hold", f / 60 - 0.25);
      ev("pointerup");
      for (let f = 1; f <= 90; f++) step("rel", f / 60);
      h.debug.settle(2);
    }
    h.debug.pointer(null);
    return { rows, cd: h.choreo.drivers.camExpand };
  }, +nS);
  const win = { "charge tp<0.65": (r) => r[1] === "hold" && r[2] < 0.65, "pop tp0.65-1.2": (r) => r[1] === "hold" && r[2] >= 0.65 && r[2] < 1.2, "sustain tp1.2-4.25": (r) => r[1] === "hold" && r[2] >= 1.2, "release 0-1.5": (r) => r[1] === "rel" };
  const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : NaN; };
  for (const [name, f] of Object.entries(win)) {
    const sel = res.rows.filter(f);
    const A = sel.filter((r) => r[3] === 0).map((r) => r[4]), B = sel.filter((r) => r[3] === 1).map((r) => r[4]), all = sel.map((r) => r[4]);
    console.log(`${name.padEnd(20)} A p99 ${q(A, 0.99).toFixed(2)} max ${Math.max(...A).toFixed(2)} | B p99 ${q(B, 0.99).toFixed(2)} max ${Math.max(...B).toFixed(2)} | all p50 ${q(all, 0.5).toFixed(2)} p99 ${q(all, 0.99).toFixed(2)} max ${Math.max(...all).toFixed(2)}`);
  }
  // per-press max in the pop window
  for (let s = 0; s < +nS; s++) {
    const sel = res.rows.filter((r) => r[0] === s && r[1] === "hold" && r[2] >= 0.65 && r[2] < 1.2).map((r) => r[4]);
    console.log(`press ${s}: pop max ${Math.max(...sel).toFixed(2)} p99 ${q(sel, 0.99).toFixed(2)}`);
  }
  console.log("logs", JSON.stringify(logs));
} finally { await browser.close(); }
