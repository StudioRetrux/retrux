// AA5c cost attribution: in-session, runtime toggles rotated in blocks (ABBA), every frame synced (1-px readPixels).
// Configs are named; each is a set of runtime switches (see CONF below). Also isolated per-pass timings at the end.
//   SLOT_BG=0 node mb.mjs --port 5195 --path medium --block 60 --cycles 8 --confs none,B,Bnomip --out FILE
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port", "5195"), pathName = arg("path", "medium"), block = +arg("block", "60"), cycles = +arg("cycles", "8");
const vw = +arg("vw", "1440"), vh = +arg("vh", "766"), dsf = +arg("dsf", "1"), tier = arg("tier", "T1"), qs = arg("qs", "");
const confs = arg("confs", "none,B").split(",");
const out = arg("out", "");
const iso = arg("iso", "1") === "1";
const seg = arg("seg", "0") === "1";
const load0 = os.loadavg();
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
let res = null;
try {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dsf });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 200)}`); });
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=${tier}&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  res = await page.evaluate(async ([pathName, block, cycles, confs, iso, seg]) => {
    const h = window.__hero;
    const R = h.renderer;
    const gl = R.getContext();
    const px = new Uint8Array(4);
    const S = Math.sin, P = Math.PI * 2;
    const ptr = (i) => {
      const t = i / 60;
      if (pathName === "fast") return [1.0 * S((P * t) / 2.5), 0.4 * S((P * t) / 3.3)];
      if (pathName === "slow") return [0.5 * S((P * t) / 20), 0.1 * S((P * t) / 27)];
      return [0.8 * S((P * t) / 8), 0.25 * S((P * t) / 11)];
    };
    const taa = h.envEdge ? h.envEdge.taa : null;
    const sched = h.lakeSched;
    const mir = h.lakeMirror;
    const tex = mir.target.texture;
    // CPU time inside the mirror pass (no sync)
    let mirCpu = 0;
    const r0 = mir.render.bind(mir);
    mir.render = (...a) => { const t = performance.now(); r0(...a); mirCpu += performance.now() - t; };
    const hooks = (window.__aa5c = window.__aa5c || {});
    // segmented timing (sync before / after each segment; frames fully serialized)
    const segT = { lake: 0, main: 0, post: 0 };
    if (seg) {
      const wrap = (obj, name, key) => { const f = obj[name].bind(obj); obj[name] = (...a) => { gl.finish(); const t = performance.now(); const r = f(...a); gl.finish(); segT[key] += performance.now() - t; return r; }; };
      wrap(h.lakeSched, "frame", "lake");
      wrap(h.pipeline, "render", "main");
      wrap(h.post, "render", "post");
    }
    const CONF = {
      none: { me: 3, taa: false },
      B: { me: 1, taa: false },
      C: { me: 3, taa: true },
      full: { me: 1, taa: true },
      Bnomip: { me: 1, taa: false, nomip: true },
      Bmip3: { me: 1, taa: false, mipMax: 3 },
      Bmip1: { me: 1, taa: false, mipMax: 1 },
      X1: { me: 3, taa: false, extra: "full" },
      X1nomip: { me: 3, taa: false, extra: "nomip" },
      X1sky: { me: 3, taa: false, extra: "sky" },
      X1geo: { me: 3, taa: false, extra: "geo" },
      X1clear: { me: 3, taa: false, extra: "clear" },
      X1clearnomip: { me: 3, taa: false, extra: "clear", xnomip: true },
      X1clearmip3: { me: 3, taa: false, extra: "clear", xmip: 3 },
      X1mip5: { me: 3, taa: false, extra: "full", xmip: 5 },
      X4: { me: 3, taa: false, extra: "full", xk: 4 },
      X4mc: { me: 3, taa: false, extra: "full", xk: 4, mc: [1, 1] },
      X4mcsky: { me: 3, taa: false, extra: "full", xk: 4, mc: [1, 0] },
      X4mcslim: { me: 3, taa: false, extra: "full", xk: 4, mc: [0, 1] },
      X4mcnocl: { me: 3, taa: false, extra: "full", xk: 4, mc: [1, 1], hide: "clouds" },
      X4mcnogeo: { me: 3, taa: false, extra: "full", xk: 4, mc: [1, 1], hide: "geo" },
      X4mcnosky: { me: 3, taa: false, extra: "full", xk: 4, mc: [1, 1], hide: "sky" },
      X4mcnomip: { me: 3, taa: false, extra: "nomip", xk: 4, mc: [1, 1] },
      X4mcmip6: { me: 3, taa: false, extra: "full", xk: 4, mc: [1, 1], xmip: 6 },
      X4mcmip5: { me: 3, taa: false, extra: "full", xk: 4, mc: [1, 1], xmip: 5 },
      X4mcmip3: { me: 3, taa: false, extra: "full", xk: 4, mc: [1, 1], xmip: 3 },
      T4: { me: 3, taa: false, extra: "taa", xk: 4, tv: "orig" },
      T4copy: { me: 3, taa: false, extra: "taa", xk: 4, tv: "copy" },
      T4noclear: { me: 3, taa: false, extra: "taa", xk: 4, tv: "orig", noclear: true },
      T4kind: { me: 3, taa: false, extra: "taa", xk: 4, tv: "kindonly" },
      T4class: { me: 3, taa: false, extra: "taa", xk: 4, tv: "class" },
      T4norefl: { me: 3, taa: false, extra: "taa", xk: 4, tv: "norefl" },
      T4nohist: { me: 3, taa: false, extra: "taa", xk: 4, tv: "nohist" },
      noneO: { me: 3, taa: false, mc: [0, 0] },
      noneN: { me: 3, taa: false, mc: [1, 1] },
      BO: { me: 1, taa: false, mc: [0, 0] },
      BN: { me: 1, taa: false, mc: [1, 1] },
      CO: { me: 3, taa: true, mc: [0, 0] },
      fullO: { me: 1, taa: true, mc: [0, 0] },
      fullN: { me: 1, taa: true, mc: [1, 1] },
      X4nomip: { me: 3, taa: false, extra: "nomip", xk: 4 },
      X4clear: { me: 3, taa: false, extra: "clear", xk: 4 },
      X4clearnomip: { me: 3, taa: false, extra: "clear", xnomip: true, xk: 4 },
      X4sky: { me: 3, taa: false, extra: "sky", xk: 4 },
      X4geo: { me: 3, taa: false, extra: "geo", xk: 4 },
      X4geonomip: { me: 3, taa: false, extra: "geo", xnomip: true, xk: 4 },
      // the switches this lane adds (runtime): h.aa5c = { ... } read by the engine when present
      ...(hooks.confs || {}),
    };
    const set = (c) => {
      const k = CONF[c];
      if (h.envEdge) h.envEdge.taa = k.taa ? taa : null;
      if (taa && !k.taa) taa.valid = false;
      if (sched) sched.mirrorEvery = k.me;
      tex.generateMipmaps = !k.nomip;
      mir.mipMax = k.mipMax ?? -1;
      if (k.mipMax === undefined) {
        // restore the full chain (TEXTURE_MAX_LEVEL 1000)
        const t = R.properties.get(tex).__webglTexture;
        if (t) { R.state.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 1000); }
      }
      if (h.setMirrorCost) h.setMirrorCost(!!(k.mc && k.mc[0]), !!(k.mc && k.mc[1]));
      xhide = k.hide || null; tv = k.tv || null; noclear = !!k.noclear;
      extra = k.extra || null; xk = k.xk || 1; xnomip = !!k.xnomip; xmip = k.xmip ?? -1;
      if (k.apply) k.apply(h, true);
      for (const o of Object.keys(CONF)) if (o !== c && CONF[o].apply) CONF[o].apply(h, false);
      if (k.apply) k.apply(h, true);
    };
    let extra = null, xnomip = false, xmip = -1, xhide = null;
    const env = h.env;
    let xk = 1, tv = null, noclear = false;
    // TAA pass variants rendered into a scratch target (cost only), with the live TAA material's uniforms
    const tmats = {};
    let tscratch = null;
    const T = taa ? taa.material.constructor : null;
    const tmat = (v) => {
      if (tmats[v]) return tmats[v];
      let fs = taa.material.fragmentShader;
      if (v === "copy") fs = fs.replace("void main() {", "void main() { gl_FragColor = texelFetch(uCur, ivec2(gl_FragCoord.xy), 0); return;");
      if (v === "kindonly") fs = fs.replace("if (!(lake && solid) || dNear > 1e8) return;", "return;");
      if (v === "class") fs = fs.replace("if (!(lake && solid) || dNear > 1e8) return;", "if (!(lake && solid) || dNear > 1e8) return; gl_FragColor.rgb = 0.5 * (mn + mx) + 1e-6 * (m1 + m2); return;");
      if (v === "norefl") fs = fs.replace("if (uReflOn > 0.5) {", "if (uReflOn > 1.5) {");
      if (v === "nohist") fs = fs.replace("vec3 h = taaHist(puv);", "vec3 h = texelFetch(uHist, ivec2(hp), 0).rgb;");
      const m = new T({ name: "mb-taa-" + v, vertexShader: taa.material.vertexShader, fragmentShader: fs, uniforms: taa.material.uniforms, depthTest: false, depthWrite: false, blending: 0 });
      tmats[v] = m;
      return m;
    };
    const doTaa = () => {
      if (!tscratch) tscratch = new taa.targets[0].constructor(taa.targets[0].width, taa.targets[0].height, { type: taa.targets[0].texture.type, depthBuffer: false });
      const mesh = taa.scene.children[0];
      const m0 = mesh.material;
      mesh.material = tmat(tv);
      const prevT = R.getRenderTarget();
      R.setRenderTarget(tscratch);
      if (!noclear) R.clear(true, false, false);
      R.render(taa.scene, h.envEdge.copyCamera);
      mesh.material = m0;
      R.setRenderTarget(prevT);
    };
    const doExtra = () => { for (let q = 0; q < xk; q++) (extra === "taa" ? doTaa() : doExtra1()); };
    const doExtra1 = () => {
      if (!extra) return;
      const prevT = R.getRenderTarget(), prevAuto = R.autoClear;
      R.autoClear = false;
      if (extra === "nomip" || xnomip) tex.generateMipmaps = false;
      if (xmip >= 0) { const t = R.properties.get(tex).__webglTexture; R.state.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, xmip); }
      R.setRenderTarget(mir.target);
      R.setClearColor(0x000000, 0);
      R.clear(true, true, false);
      if (extra !== "clear") {
        h.lakeMirrorPass(true);
        mir.skyMesh.visible = extra !== "geo" && xhide !== "sky";
        const cv = env.cloudGroup.visible, pv = env.envProxy.visible;
        if (xhide === "clouds") env.cloudGroup.visible = false;
        if (xhide === "geo") env.envProxy.visible = false;
        const gv = env.group.visible;
        if (extra === "sky") env.group.visible = false;
        mir.camera.layers.disableAll(); mir.camera.layers.enable(1);
        R.render(h.scene, mir.camera);
        env.group.visible = gv;
        env.cloudGroup.visible = cv;
        env.envProxy.visible = pv;
        mir.skyMesh.visible = false;
        h.lakeMirrorPass(false);
      }
      tex.generateMipmaps = true;
      R.setRenderTarget(prevT);
      if (xmip >= 0) { const t = R.properties.get(tex).__webglTexture; R.state.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 1000); }
      R.autoClear = prevAuto;
    };
    const step = (i) => { doExtra(); const p = ptr(i); h.debug.pointer(p[0], p[1]); h.frame(1 / 60, false); };
    const sync = () => { R.setRenderTarget(null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
    const p0 = ptr(0);
    h.debug.pointer(p0[0], p0[1]);
    h.debug.settle(6);
    let i = 0;
    for (let w = 0; w < 60; w++, i++) step(i);
    sync();
    const frames = Object.fromEntries(confs.map((c) => [c, []]));
    const blocks = Object.fromEntries(confs.map((c) => [c, []]));
    const cpu = Object.fromEntries(confs.map((c) => [c, []]));
    const mcpu = Object.fromEntries(confs.map((c) => [c, 0]));
    const mirrors = Object.fromEntries(confs.map((c) => [c, 0]));
    const taaRuns = Object.fromEntries(confs.map((c) => [c, 0]));
    const segs = Object.fromEntries(confs.map((c) => [c, { lake: [], main: [], post: [] }]));
    for (let cyc = 0; cyc < cycles; cyc++) {
      const order = cyc % 2 ? [...confs].reverse() : confs;
      for (const c of order) {
        set(c);
        for (let w = 0; w < 10; w++, i++) step(i);
        sync();
        const m0 = sched.counts.mirror, t0r = taa ? taa.runs : 0;
        mirCpu = 0;
        segT.lake = segT.main = segT.post = 0;
        const bs = [];
        for (let b = 0; b < block; b++, i++) {
          const t0 = performance.now();
          step(i);
          const t1 = performance.now();
          sync();
          const dtm = performance.now() - t0;
          frames[c].push(dtm);
          cpu[c].push(t1 - t0);
          bs.push(dtm);
        }
        mcpu[c] += mirCpu;
        for (const k of ["lake", "main", "post"]) segs[c][k].push(segT[k] / block);
        mirrors[c] += sched.counts.mirror - m0;
        taaRuns[c] += taa ? taa.runs - t0r : 0;
        bs.sort((x, y) => x - y);
        blocks[c].push(bs[bs.length >> 1]);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    // isolated: N mirror passes back to back, each synced (CPU + GPU serial), full chain vs no mips vs the lane's variants
    const isoRes = {};
    if (iso) {
      set("none");
      const cam = h.rig.camera;
      const one = (n, f) => { const a = []; for (let k = 0; k < n; k++) { sync(); const t = performance.now(); f(); sync(); a.push(performance.now() - t); } a.sort((x, y) => x - y); return +a[a.length >> 1].toFixed(3); };
      for (let rep = 0; rep < 3; rep++) {
        tex.generateMipmaps = true;
        (isoRes.mirrorFull = isoRes.mirrorFull || []).push(one(30, () => r0(R, h.scene, cam, 0, 1, h.lakeMirrorPass, true)));
        tex.generateMipmaps = false;
        (isoRes.mirrorNoMip = isoRes.mirrorNoMip || []).push(one(30, () => r0(R, h.scene, cam, 0, 1, h.lakeMirrorPass, true)));
        tex.generateMipmaps = true;
        (isoRes.mipOnly = isoRes.mipOnly || []).push(one(30, () => { R.setRenderTarget(mir.target); R.setRenderTarget(null); const t = R.properties.get(tex).__webglTexture; R.state.bindTexture(gl.TEXTURE_2D, t); gl.generateMipmap(gl.TEXTURE_2D); }));
        (isoRes.walk = isoRes.walk || []).push(one(30, () => h.water.renderWalk(R, cam)));
        (isoRes.empty = isoRes.empty || []).push(one(30, () => {}));
      }
    }
    set(confs[0]);
    return { segs, frames, blocks, cpu, mcpu, mirrors, taaRuns, iso: isoRes, main: [h.pipeline.main.width, h.pipeline.main.height], mirror: [mir.target.width, mir.target.height], tier: h.state.tier, scale: h.state.renderScale };
  }, [pathName, block, cycles, confs, iso, seg]);
  await ctx.close();
} catch (e) {
  logs.push("error " + e.message);
} finally {
  const load1 = os.loadavg();
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
  const summ = {};
  if (res) {
    const ref = confs[0];
    for (const c of confs) {
      const f = res.frames[c];
      const paired = res.blocks[c].map((v, k) => v / res.blocks[ref][k]);
      summ[c] = { n: f.length, med: +med(f).toFixed(2), cpuMed: +med(res.cpu[c]).toFixed(2), ratioMed: +(med(f) / med(res.frames[ref])).toFixed(4), pairedMed: +med(paired).toFixed(4), paired: paired.map((x) => +x.toFixed(3)), mirrors: res.mirrors[c], mirrorCpuPerFrame: +(res.mcpu[c] / f.length).toFixed(3), taaRuns: res.taaRuns[c], seg: Object.fromEntries(["lake", "main", "post"].map((k) => [k, +med(res.segs[c][k]).toFixed(3)])) };
    }
  }
  const o = { port, path: pathName, vw, vh, dsf, main: res?.main, mirror: res?.mirror, scale: res?.scale, load1minBefore: +load0[0].toFixed(2), load1minAfter: +load1[0].toFixed(2), summ, iso: res?.iso, logs };
  console.log(JSON.stringify(o, null, 1));
  if (out) fs.writeFileSync(out, JSON.stringify({ ...o, raw: res }, null, 1));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
