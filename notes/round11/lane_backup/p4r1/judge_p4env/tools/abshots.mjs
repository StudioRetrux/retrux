// judge_p4env: deterministic A/B shots (engine RAF disabled, frame stepping): the same sim time in both labs, so the only
// differences are the lane's. node abshots.mjs <port> <outDir> [qs]
import { createRequire } from "node:module";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [port, out, qs] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const SPOTS = [["rest", null, 0], ["left", -0.98, 0], ["right", 0.98, 0], ["top", 0, 0.98], ["bottom", 0, -0.98], ["top_left", -0.98, 0.98], ["top_right", 0.98, 0.98], ["bottom_left", -0.98, -0.98], ["bottom_right", 0.98, -0.98], ["orb", 0, 0.03]];
const SW = [["L", -0.98, 0], ["R", 0.98, 0], ["T", 0, 0.98], ["B", 0, -0.98], ["BL", -0.98, -0.98], ["TR", 0.98, 0.98]];
const shots = [];
for (const [n, x, y] of SPOTS) shots.push({ name: `ptr_${n}`, kind: "ptr", x, y });
for (const [ph, t, tag] of [["expand", 2.97, "hold"], ["expand", 0.9, "pop"], ["release", 0.33, "rel"]]) for (const [s, x, y] of SW) shots.push({ name: `sw_${tag}_${s}`, kind: "pose", ph, t, x, y });
for (const T of [90, 150]) for (const [n, x, y] of [["rest", null, 0], ["right", 0.98, 0], ["left", -0.98, 0], ["top_right", 0.98, 0.98], ["bottom_left", -0.98, -0.98]]) shots.push({ name: `late${T}_${n}`, kind: "late", T, x, y });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") logs.push("console.error " + m.text().slice(0, 200)); });
  await page.addInitScript(() => {
    let h = null;
    Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } });
  });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  await page.evaluate(() => { const h = window.__hero; h.debug.pointer(null); h.debug.settle(6); });
  for (const s of shots) {
    const r = await page.evaluate((s) => {
      const h = window.__hero; const gl = h.renderer.getContext();
      h.debug.freeze(false);
      if (s.kind === "late") { const now = h.state.time; h.debug.pose(null); h.debug.pointer(null); if (s.T > now) h.debug.settle(s.T - now); }
      h.debug.pointer(s.x, s.y);
      if (s.kind === "pose") { if (s.ph === "expand") { h.debug.pose(s.ph, 0); h.debug.settle(0.1); } h.debug.pose(s.ph, s.t); h.debug.settle(1.6); }
      else { h.debug.pose(null); h.debug.settle(2.5); h.rings.clock = 0; }
      h.debug.freeze(true);
      for (let i = 0; i < 24; i++) h.frame(1 / 60, false);
      const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const fb = new Uint8Array(W * H * 4);
      h.renderer.setRenderTarget(null); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, fb);
      let bin = ""; const CH = 0x8000; for (let i = 0; i < fb.length; i += CH) bin += String.fromCharCode.apply(null, fb.subarray(i, i + CH));
      return { W, H, b64: btoa(bin), time: +h.state.time.toFixed(3), phase: h.choreo.phase, cam: h.rig.camera.position.toArray().map((v) => +v.toFixed(3)) };
    }, s);
    const fb = Buffer.from(r.b64, "base64"); const W = r.W, H = r.H; const raw = Buffer.alloc(W * H * 3);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = ((H - 1 - y) * W + x) * 4, d = (y * W + x) * 3; raw[d] = fb[a]; raw[d + 1] = fb[a + 1]; raw[d + 2] = fb[a + 2]; }
    const p = `${out}/${s.name}.png`; fs.writeFileSync(p + ".rgb", raw);
    execFileSync("/opt/homebrew/bin/ffmpeg", ["-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", W + "x" + H, "-i", p + ".rgb", p]); fs.unlinkSync(p + ".rgb");
    logs.push(`${s.name} t=${r.time} phase=${r.phase} cam=${r.cam}`);
  }
} catch (e) { logs.push("ERROR " + e.message); }
finally { fs.writeFileSync(`${out}/log.txt`, logs.join("\n")); console.log(logs.join("\n")); await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]); process.exit(0); }
