// Hold frame bounds: for many press moments, pose the hold (p06, t 2.97) and project every ring piece's world bounding
// box to the screen; report the pieces' extreme screen extents (px at 1440 x 766). No screenshots.
//   node probe_holdbounds.mjs [tauStep=0.25] [t=2.97] [pointerX,pointerY]
import { createRequire } from "node:module";
const require = createRequire("E:/Retrux Hero R&D/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const step = +(process.argv[2] || 0.25);
const tHold = +(process.argv[3] || 2.97);
const ptr = process.argv[4] && process.argv[4] !== "-" ? process.argv[4].split(",").map(Number) : null;
// Optional Rings.tune overrides as a JSON file path.
const tuneOver = process.argv[5] ? JSON.parse((await import("node:fs")).readFileSync(process.argv[5], "utf8").replace(/^﻿/, "")) : {};
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => console.log("pageerror " + e.message));
  await page.goto(`http://localhost:5173/?tier=T0&scale=0.5&debug=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  const res = await page.evaluate(([step, tHold, ptr, tuneOver]) => {
    const h = window.__hero;
    Object.assign(h.rings.tune, tuneOver);
    const THREE = h.THREE || null;
    const out = [];
    const cam = h.rig.camera;
    const corners = [];
    for (let i = 0; i < 8; i++) corners.push([i & 1, (i >> 1) & 1, (i >> 2) & 1]);
    for (let tau = 0; tau < 8; tau += step) {
      h.debug.freeze(false);
      h.debug.pose(null);
      if (ptr) h.debug.pointer(ptr[0], ptr[1]); else h.debug.pointer(null);
      h.debug.settle(0.6);
      h.rings.tau = tau - 0.4;
      h.debug.settle(0.4);
      h.rings.tau = tau;
      h.debug.settle(1 / 60);
      h.debug.pose("expand", 0);
      h.debug.settle(0.1);
      h.debug.pose("expand", tHold);
      h.debug.settle(1.6);
      cam.updateWorldMatrix(true, false);
      cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      let minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9, topBy = "", botBy = "";
      for (const p of h.rings.pieces) {
        const tag = `r${p.ring}${p.half ? "h" + p.half : ""}${p.slot >= 0 && p.ring === 0 ? "s" + p.slot : ""}`;
        const m = p.mesh;
        // Parents too: in a settled (unrendered) frame the groups' world matrices are stale.
        m.updateWorldMatrix(true, false);
        const bb = m.geometry.boundingBox || (m.geometry.computeBoundingBox(), m.geometry.boundingBox);
        for (const c of corners) {
          const v = bb.min.clone();
          v.x = c[0] ? bb.max.x : bb.min.x;
          v.y = c[1] ? bb.max.y : bb.min.y;
          v.z = c[2] ? bb.max.z : bb.min.z;
          v.applyMatrix4(m.matrixWorld).project(cam);
          const sx = (v.x * 0.5 + 0.5) * 1440, sy = (1 - (v.y * 0.5 + 0.5)) * 766;
          minX = Math.min(minX, sx); maxX = Math.max(maxX, sx);
          if (sy < minY) { minY = sy; topBy = tag; }
          if (sy > maxY) { maxY = sy; botBy = tag; }
        }
      }
      out.push({ tau: +tau.toFixed(2), top: Math.round(minY), bottom: Math.round(maxY), left: Math.round(minX), right: Math.round(maxX), topBy, botBy });
    }
    h.debug.pointer(null);
    h.debug.pose(null);
    h.debug.freeze(false);
    return out;
  }, [step, tHold, ptr, tuneOver]);
  const worst = { top: Math.min(...res.map((r) => r.top)), bottom: Math.max(...res.map((r) => r.bottom)), left: Math.min(...res.map((r) => r.left)), right: Math.max(...res.map((r) => r.right)) };
  console.log(res.map((r) => `${r.tau}: top ${r.top} (${r.topBy}) bottom ${r.bottom} (${r.botBy}) left ${r.left} right ${r.right}`).join("\n"));
  console.log("WORST", JSON.stringify(worst), "(frame 0..1440 x 0..766; bounding boxes overestimate a little)");
} finally {
  await browser.close();
}
