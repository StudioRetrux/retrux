// p4hold: hold camera numbers at the QC poses (no screenshots): camera position / pitch, the lifted orb's screen centre, shares, opening.
//   node probe_cam.mjs <port> [qs] [WxH]
import { createRequire } from "node:module";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [port, qs = "", vp = "1440x766"] = process.argv.slice(2);
const [VW, VH] = vp.split("x").map(Number);
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  const page = await browser.newPage({ viewport: { width: VW, height: VH } });
  const logs = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  await page.goto(`http://localhost:${port}/?tier=T0&scale=0.5&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  const res = await page.evaluate(([VW, VH]) => {
    const h = window.__hero;
    h.debug.settle(2);
    const out = [];
    for (const [name, ph, t] of [["rest", null, 0], ["p04", "expand", 0.9], ["p05", "expand", 2.37], ["p06", "expand", 2.97], ["p07", "release", 0.33], ["p08", "release", 0.57]]) {
      h.debug.freeze(false);
      if (ph === "expand") { h.debug.pose(ph, 0); h.debug.settle(0.1); }
      h.debug.pose(ph, t);
      h.debug.settle(ph ? 1.6 : 2.5);
      const cam = h.rig.camera;
      cam.updateMatrixWorld(true);
      const o = h.orb.mesh.getWorldPosition(cam.position.clone()).project(cam);
      const e = new cam.rotation.constructor().setFromQuaternion(cam.quaternion, "YXZ");
      const d = h.choreo.drivers;
      out.push({ name, camY: +cam.position.y.toFixed(3), camZ: +cam.position.z.toFixed(3), pitchDeg: +((e.x * 180) / Math.PI).toFixed(3), orb: [+((o.x * 0.5 + 0.5) * VW).toFixed(1), +((1 - (o.y * 0.5 + 0.5)) * VH).toFixed(1)], camExpand: +d.camExpand.toFixed(4), spreadA: +d.spreadA.toFixed(4), splitB: +d.splitB.toFixed(4), holdFit: +h.rig.holdFit.toFixed(4), holdShare: +h.rig.holdShare.toFixed(4) });
    }
    h.debug.pose(null);
    return out;
  }, [VW, VH]);
  for (const r of res) console.log(JSON.stringify(r));
  console.log("logs", JSON.stringify(logs));
} finally { await browser.close(); }
