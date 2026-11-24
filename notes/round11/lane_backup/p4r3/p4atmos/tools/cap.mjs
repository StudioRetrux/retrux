// p4atmos deterministic captures: node cap.mjs <port> <outDir> <plan.json> [qs]
// plan: [{name, t (engine time; rest shots), pose: [ph, t] | null, ptr: [nx, ny] | null, js: "<code run before render>", hand: false}]
// Engine RAF disabled (frame stepping), so two labs at the same plan render the same sim time.
import { createRequire } from "node:module";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [port, out, planFile, qs] = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push("console." + m.type() + " " + m.text().slice(0, 300)); });
  await page.addInitScript(() => {
    let h = null;
    Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } });
  });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => { const h = window.__hero; h.debug.pointer(null); h.debug.settle(6); });
  for (const s of plan) {
    const r = await page.evaluate((s) => {
      const h = window.__hero; const gl = h.renderer.getContext();
      h.debug.freeze(false);
      h.rig.reducedMotion = s.hand === true ? false : true;
      if (s.ptr) h.debug.pointer(s.ptr[0], s.ptr[1]); else h.debug.pointer(null);
      if (s.pose) {
        if (s.pose[0] === "expand" || s.pose[0] === "release") { h.debug.pose("expand", 0); h.debug.settle(0.1); }
        h.debug.pose(s.pose[0], s.pose[1]); h.debug.settle(1.6);
      } else { h.debug.pose(null); h.debug.settle(2.5); }
      if (typeof s.t === "number") h.state.time = s.t;
      if (typeof s.tau === "number") h.rings.tau = s.tau;
      if (s.js) (0, eval)(s.js);
      h.debug.freeze(true);
      for (let i = 0; i < 24; i++) h.frame(1 / 60, false);
      const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const fb = new Uint8Array(W * H * 4);
      h.renderer.setRenderTarget(null); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, fb);
      let bin = ""; const CH = 0x8000; for (let i = 0; i < fb.length; i += CH) bin += String.fromCharCode.apply(null, fb.subarray(i, i + CH));
      const d = h.choreo.drivers;
      return { W, H, b64: btoa(bin), time: +h.state.time.toFixed(3), phase: h.choreo.phase, fogHold: +(+d.fogHold).toFixed(3), camExpand: +(+d.camExpand).toFixed(3), cam: h.rig.camera.position.toArray().map((v) => +v.toFixed(3)) };
    }, s);
    const fb = Buffer.from(r.b64, "base64"); const W = r.W, H = r.H; const raw = Buffer.alloc(W * H * 3);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = ((H - 1 - y) * W + x) * 4, d = (y * W + x) * 3; raw[d] = fb[a]; raw[d + 1] = fb[a + 1]; raw[d + 2] = fb[a + 2]; }
    const p = `${out}/${s.name}.png`; fs.writeFileSync(p + ".rgb", raw);
    execFileSync("/opt/homebrew/bin/ffmpeg", ["-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", W + "x" + H, "-i", p + ".rgb", p]); fs.unlinkSync(p + ".rgb");
    logs.push(`${s.name} t=${r.time} phase=${r.phase} fogHold=${r.fogHold} camExpand=${r.camExpand} cam=${r.cam}`);
  }
} catch (e) { logs.push("ERROR " + e.message); }
finally { fs.writeFileSync(`${out}/log.txt`, logs.join("\n")); console.log(logs.join("\n")); await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]); process.exit(0); }
