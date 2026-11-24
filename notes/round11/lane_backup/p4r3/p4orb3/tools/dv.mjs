// p4orb3: deterministic variant captures (the judge's flick / rj_det method: engine loop off, the same call sequence per capture).
// One page per config (--fresh 1, paired A/B) or several live variants on one page (exploration). The ring clock is pinned at the
// hold start (--taus, "n" = natural) and the orb's plasma clock is pinned before the final frames (--orbframe), so every variant
// shows the same plasma. Optional HDR readout of `main` around the projected orb (--hdr 1: half floats, box 2*hs).
//   node dv.mjs --port 5176 --out DIR --tag X [--qs "p4orb=0"] [--variants v.json] [--poses p05,p06] [--taus 3.3,n] [--hdr 1]
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port", "5176"), qs = arg("qs", ""), out = arg("out", "."), tag = arg("tag", "x"), N = +arg("n", "9");
const poses = arg("poses", "q00,q03,p04,p05,p06").split(",");
const taus = arg("taus", "3.3").split(",");
const hdr = arg("hdr", "0") === "1";
const orbFrame = arg("orbframe", "2400");
const variants = arg("variants", "") ? JSON.parse(fs.readFileSync(arg("variants"), "utf8")) : [{ name: "base", js: "" }];
const P = { q00: [null, 0], q03: ["eye", 0], p04: ["expand", 0.9], p05: ["expand", 2.37], p06: ["expand", 2.97], p07: ["release", 0.33], p08: ["release", 0.57] };
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
const t0 = Date.now();
async function boot() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 200)}`); });
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  // snapshot of every uniform value of the orb, shards, rings[0] and post materials, restored before each variant
  await page.evaluate(() => {
    const h = window.__hero;
    const mats = [h.orb?.material, h.shards?.material, h.post?.down, h.post?.up, h.post?.grade].filter(Boolean);
    const snap = mats.map((m) => Object.fromEntries(Object.entries(m.uniforms).map(([k, u]) => [k, u.value && u.value.clone ? u.value.clone() : u.value])));
    const scal = { holdCut: h.orb?.holdCut, holdGlowK: h.post?.holdGlowK, orbThr: h.post?.orbThr };
    window.__dvReset = () => {
      mats.forEach((m, i) => { for (const [k, v] of Object.entries(snap[i])) { const u = m.uniforms[k]; if (u.value && u.value.copy && v && v.clone) u.value.copy(v); else if (!(v && v.isTexture)) u.value = v; } });
      if (h.orb) h.orb.holdCut = scal.holdCut;
      if (h.post) { h.post.holdGlowK = scal.holdGlowK; h.post.orbThr = scal.orbThr; }
    };
  });
  return { ctx, page };
}
try {
  fs.mkdirSync(out, { recursive: true });
  const fresh = arg("fresh", "0") === "1";
  let cur = fresh ? null : await boot();
  for (const v of variants) {
    if (fresh) { if (cur) await cur.ctx.close(); cur = await boot(); }
    const page = cur.page;
    await page.evaluate(() => window.__dvReset());
    if (v.js) await page.evaluate(v.js);
    const jobs = [];
    for (const key of poses) {
      const ph = P[key][0];
      if (ph === "expand" || ph === "release") for (const t of taus) jobs.push([key, t]);
      else jobs.push([key, "n"]);
    }
    for (const [key, tau] of jobs) {
      const [ph, t] = P[key];
      const tau0 = tau === "n" ? null : +tau;
      const r = await page.evaluate(([ph, t, N, tau0, hdr, orbFrame]) => {
        const h = window.__hero, gl = h.renderer.getContext();
        h.debug.pointer(0, 0);
        h.debug.pose(null);
        h.debug.settle(6);
        if (ph === "expand" || ph === "release") {
          if (tau0 !== null) h.rings.clock = tau0;
          h.debug.pose("expand", 0); h.debug.settle(0.1);
          if (ph === "expand") { h.debug.pose("expand", t); h.debug.settle(1.0); }
          else { h.debug.pose("expand", 2.97); h.debug.settle(1.0); h.debug.pose("release", t); h.debug.settle(1.0); }
        } else if (ph === "eye") { h.debug.settle(1.5); }
        else { h.debug.settle(0.5); }
        if (orbFrame !== "n" && h.orb) h.orb.frame = +orbFrame;
        for (let i = 0; i < N; i++) h.frame(1 / 60, false);
        h.renderer.setRenderTarget(null);
        const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
        const buf = new Uint8Array(W * H * 4);
        gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        const enc = (u8) => { let s = ""; for (let j = 0; j < u8.length; j += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(j, j + 0x8000)); return btoa(s); };
        const u = h.orb.material.uniforms, cam = h.rig.camera;
        const c = u.uCenter.value.clone(), R = u.uRadius.value;
        const p = c.clone().project(cam);
        const d = c.distanceTo(cam.position);
        const f = H / 2 / Math.tan((cam.fov * Math.PI) / 360);
        const orb = { x: (p.x * 0.5 + 0.5) * W, y: (1 - (p.y * 0.5 + 0.5)) * H, r: (R / Math.sqrt(Math.max(d * d - R * R, 1e-6))) * f };
        let hd = null;
        if (hdr) {
          const m = h.pipeline.main, hs = Math.min(200, Math.ceil(orb.r * 1.3));
          const sx = m.width / W;
          const x0 = Math.max(0, Math.round((orb.x - hs) * sx)), y0 = Math.max(0, Math.round((H - orb.y - hs) * sx));
          const w = Math.min(m.width - x0, Math.round(2 * hs * sx)), hh = Math.min(m.height - y0, Math.round(2 * hs * sx));
          const a = new Uint16Array(w * hh * 4);
          h.renderer.readRenderTargetPixels(m, x0, y0, w, hh, a);
          hd = { b: enc(new Uint8Array(a.buffer)), x0, y0, w, h: hh, sx };
        }
        return { b: enc(buf), W, H, clock: h.rings.clock, orb, hd, rim: h.orb.material.uniforms.uRim.value };
      }, [ph, t, N, tau0, hdr, orbFrame]);
      const nm = `${tag}_${v.name}_${key}_t${tau}`;
      fs.writeFileSync(`${out}/${nm}.rgba`, Buffer.from(r.b, "base64"));
      if (r.hd) fs.writeFileSync(`${out}/${nm}.hdr16`, Buffer.from(r.hd.b, "base64"));
      fs.writeFileSync(`${out}/${nm}.json`, JSON.stringify({ W: r.W, H: r.H, orb: r.orb, clock: r.clock, rim: r.rim, qs, port, variant: v, hd: r.hd ? { x0: r.hd.x0, y0: r.hd.y0, w: r.hd.w, h: r.hd.h, sx: r.hd.sx } : null }));
    }
  }
  console.log(JSON.stringify({ tag, variants: variants.map((v) => v.name), poses, taus, s: ((Date.now() - t0) / 1000).toFixed(1), logs }));
} catch (e) {
  console.log("ERROR " + e.message, logs.join("\n"));
} finally {
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
