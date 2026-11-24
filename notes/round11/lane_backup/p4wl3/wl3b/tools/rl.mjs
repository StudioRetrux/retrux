// p4wl real-loop capture: the engine runs its own rAF loop (real dt, governor live unless ?scale=), a synthetic mouse circles,
// and after EVERY engine render a region of the canvas is read back asynchronously (PBO + fence, no stall). Per frame meta:
// dt, scale, lake schedule counts (mirror / walk / cache drawn), cacheOn. Output: <out>/frames.bin (RGBA rows, bottom-up as GL),
// <out>/meta.json.   node rl.mjs --url http://localhost:5163/ --qs "a=b" --out DIR [--vw 1512 --vh 860 --dpr 2] [--frames 240]
// [--rx 100 --ry 470 --rw 460 --rh 120 (CSS px)] [--rev 4 (s per pointer revolution)] [--warm 14000] [--still 0] [--phone 0]
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const A = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith("--") ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const url = (A.url || "http://localhost:5163/") + (A.qs ? "?" + A.qs : "");
const out = A.out;
fs.mkdirSync(out, { recursive: true });
const vw = +(A.vw || 1512), vh = +(A.vh || 860), dpr = +(A.dpr || 2), N = +(A.frames || 240);
const R = { x: +(A.rx ?? 100), y: +(A.ry ?? 470), w: +(A.rw ?? 460), h: +(A.rh ?? 120) };
const rev = +(A.rev || 4), warm = +(A.warm || 14000), still = A.still === "1", phone = A.phone === "1";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr, ...(phone ? { isMobile: true, hasTouch: true } : {}) });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__hero && window.__hero.state && window.__hero.state.ready, null, { timeout: 120000 });
// park the pointer at the circle's start and let the intro finish
const cx = vw / 2, cy = vh / 2, ax = vw * 0.2, ay = vh * 0.18;
await page.mouse.move(cx + ax, cy);
await page.waitForTimeout(warm);
const meta = await page.evaluate(async ({ R, N, rev, cx, cy, ax, ay, still, NOCAP }) => {
  const e = window.__hero;
  const r = e.renderer;
  const gl = r.getContext();
  const c = r.domElement;
  const k = c.width / c.getBoundingClientRect().width;
  const x = Math.round(R.x * k), w = Math.round(R.w * k), h = Math.round(R.h * k);
  const y = Math.round(c.height - (R.y + R.h) * k);
  const size = w * h * 4;
  // GPU-side capture: each frame's region is blitted into one layer of a texture array (no readback, no stall in the loop)
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, w, h, N);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
  const fbo = gl.createFramebuffer();
  const frames = new Array(N);
  const info = [];
  let n = 0, pending = 0, forced = 0;
  const harvest = () => {};
  const blit = (i) => {
    const pd = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING), pr = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbo);
    gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, tex, 0, i);
    gl.blitFramebuffer(x, y, x + w, y + h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, pd);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, pr);
  };
  const readAll = () => {
    const pr = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fbo);
    for (let i = 0; i < N; i++) {
      gl.framebufferTextureLayer(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, tex, 0, i);
      const a = new Uint8Array(size);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, a);
      frames[i] = a;
    }
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, pr);
  };
  const t0 = performance.now();
  const sched = e.lakeSched;
  let last = { ...(sched ? sched.counts : {}) };
  const orig = e.render.bind(e);
  let resolveDone;
  const done = new Promise((res) => (resolveDone = res));
  // pointer: one synthetic mouse event per animation frame (before the engine's tick reads it, as a real mouse would)
  const raf0 = window.requestAnimationFrame.bind(window);
  let moving = true;
  const drive = () => {
    if (!moving) return;
    const t = (performance.now() - t0) / 1000;
    const a = still ? 0 : (t / rev) * Math.PI * 2;
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: cx + ax * Math.cos(a), clientY: cy + ay * Math.sin(a), pointerType: "mouse", bubbles: true }));
    raf0(drive);
  };
  raf0(drive);
  const nocap = NOCAP;
  e.render = function () {
    const ta = performance.now();
    orig();
    const tb = performance.now();
    if (n >= N) return;
    if (!nocap) blit(n);
    const cc = sched ? sched.counts : {};
    const cam = e.rig.camera;
    info.push({
      t: +(ta - t0).toFixed(2), tr: +(tb - ta).toFixed(2), tc: +(performance.now() - tb).toFixed(2), dt: +(e.lastDt ?? 0).toFixed(5), scale: e.adaptive.scale,
      m: (cc.mirror ?? 0) - (last.mirror ?? 0), w: (cc.walk ?? 0) - (last.walk ?? 0), c: (cc.cache ?? 0) - (last.cache ?? 0), on: (cc.cacheOn ?? 0) - (last.cacheOn ?? 0),
      cam: [cam.position.x, cam.position.y, cam.position.z, cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w].map((v) => +v.toFixed(6)),
      buf: [c.width, c.height], ps: [e.pipeline.size.width, e.pipeline.size.height],
    });
    last = { ...cc };
    n++;
    if (n >= N) resolveDone();
  };
  await done;
  moving = false;
  e.render = orig;
  if (!nocap) readAll();
  window.__rlFrames = frames;
  return { w, h, x, y, k, info, n: N, forced };
}, { R, N, rev, cx, cy, ax, ay, still, NOCAP: A.nocap === "1" });
const fd = fs.openSync(out + "/frames.bin", "w");
for (let i = 0; i < (A.nocap === "1" ? 0 : N); i += 8) {
  const b64 = await page.evaluate(({ i }) => {
    const parts = window.__rlFrames.slice(i, i + 8);
    let s = "";
    for (const a of parts) { let bin = ""; for (let j = 0; j < a.length; j += 0x8000) bin += String.fromCharCode.apply(null, a.subarray(j, j + 0x8000)); s += btoa(bin) + "|"; }
    return s;
  }, { i });
  for (const p of b64.split("|").filter(Boolean)) fs.writeSync(fd, Buffer.from(p, "base64"));
}
fs.closeSync(fd);
const dts = meta.info.map((f) => f.dt * 1000).sort((a, b) => a - b);
meta.url = url; meta.errs = errs; meta.vw = vw; meta.vh = vh; meta.dpr = dpr;
fs.writeFileSync(out + "/meta.json", JSON.stringify(meta));
const med = (k) => { const v = meta.info.map((f) => f[k]).sort((a, b) => a - b); return v[v.length >> 1].toFixed(1) + '/' + v[Math.floor(v.length * 0.9)].toFixed(1) + '/' + v[v.length - 1].toFixed(1); };
const gaps = () => { const g = meta.info.slice(1).map((f, i) => f.t - meta.info[i].t).sort((a, b) => a - b); return g[g.length >> 1].toFixed(1) + '/' + g[Math.floor(g.length * 0.9)].toFixed(1) + '/' + g[g.length - 1].toFixed(1); };
const sum = (k) => meta.info.reduce((a, f) => a + f[k], 0);
console.log(`${out}: ${N} frames ${meta.w}x${meta.h} buf ${meta.info[0].buf} pipe ${meta.info[0].ps} scale ${[...new Set(meta.info.map((f) => f.scale))]} dt p50 ${dts[N >> 1].toFixed(1)} p90 ${dts[Math.floor(N * 0.9)].toFixed(1)} ms | mirror ${sum("m")} walk ${sum("w")} cache ${sum("c")} cacheOn ${sum("on")} | errs ${errs.length} forced ${meta.forced} | render ms p50 ${med("tr")} cap ms p50 ${med("tc")} gap p50/p90/max ${gaps()}`);
await browser.close();
