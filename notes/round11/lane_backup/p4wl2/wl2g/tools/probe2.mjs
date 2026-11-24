// wl2g: re-anchor counts along the cap.mjs pointer paths (stepped 1/60), console errors. node probe.mjs PORT TIER DSF PATH FRAMES [qs]
import { createRequire } from "node:module";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [port, tier, dsf, pathName, frames, qs = ""] = process.argv.slice(2);
const S = Math.sin, P = Math.PI * 2;
function pointerAt(i) {
  const t = i / 60;
  switch (pathName) {
    case "fast": return [1.0 * S((P * t) / 2.5), 0.4 * S((P * t) / 3.3), null];
    case "diag": return [0.9 * S((P * t) / 4), 0.9 * S((P * t) / 4), null];
    case "reverse": { const u = (t % 2) / 2; const tri = u < 0.5 ? u * 4 - 1 : 3 - u * 4; return [0.9 * tri, 0, null]; }
    case "hold": return [0.15, 0.1, i === 30 ? "down" : i === 330 ? "up" : null];
    case "holdpan": return [0.6 * S((P * t) / 6), 0.3 * S((P * t) / 7), i === 30 ? "down" : i === 390 ? "up" : null];
    case "corners": { const k = Math.floor(i / 40) % 4; return [[-1, -1], [1, -1], [1, 1], [-1, 1]][k].concat([null]); }
  }
}
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: +dsf });
const page = await ctx.newPage();
page.on("pageerror", (e) => logs.push("pageerror " + e.message));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.type() + " " + m.text().slice(0, 300)); });
await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get() { return h; }, set(v) { h = v; v.start = function () {}; } }); });
await page.goto(`http://localhost:${port}/?tier=${tier}&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1" || document.documentElement.dataset.heroFailed === "1", null, { timeout: 240000 });
const res = [];
for (let i = 0; i < +frames; i++) {
  const [x, y, ev] = pointerAt(i);
  const r = await page.evaluate(([x, y, ev]) => {
    const h = window.__hero; h.debug.pointer(x, y);
    if (ev === "down") window.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: innerWidth * 0.55, clientY: innerHeight * 0.45, pointerType: "mouse", bubbles: true }));
    if (ev === "up") window.dispatchEvent(new PointerEvent("pointerup", { button: 0, pointerType: "mouse", bubbles: true }));
    h.frame(1 / 60, false);
    const w = h.water; const t = w.walkTarget;
    const AP = w.material.uniforms.uLkWalkAP.value; const bx=[0,0,0,0]; const pr = w.wlProbe(h.rig.camera, AP, bx);
    return [w.wlAnchors + "/" + pr.inside + "/" + pr.scale.toFixed(3) + "/" + bx.map(v=>v.toFixed(0)).join(","), h.lakeSched ? h.lakeSched.counts.walk : -1, t ? t.width + "x" + t.height : "", t ? Array.from(t.scissor.toArray()).join(",") : "", w.walkAnchored, +h.state.hold.toFixed(3)];
  }, [x, y, ev]);
  res.push(r);
}
const an = res.map((r) => r[0].split("/")[0]); { let mx = 0, ins = true; for (let i = 20; i < res.length; i++) { const p = res[i][0].split("/"); mx = Math.max(mx, +p[2]); if (p[1] !== "true") ins = false; } console.log("maxScale", mx, "allInside", ins); }
const changes = [];
for (let i = 1; i < an.length; i++) if (an[i] !== an[i - 1]) changes.push(i + ":h" + res[i][5]);
console.log(JSON.stringify({ port, tier, dsf, pathName, anchored: res[0][4], target: res.at(-1)[2], scissorLast: res.at(-1)[3], anchorsTotal: an.at(-1), walks: res.at(-1)[1], reanchorFrames: changes.slice(0, 40), errors: logs.slice(0, 5) }));
await browser.close();
