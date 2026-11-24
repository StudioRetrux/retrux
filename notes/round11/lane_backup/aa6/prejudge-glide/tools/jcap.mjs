// Judge (artifacts lens) capture: deterministic stepped frames (engine RAF disabled), several URL variants in ONE browser,
// scripted events: fast flicks / reversals, hold press / release / re-press, resize mid-motion, adaptive-scale change,
// tab-hidden gap (no frames while the pointer moves), dt stalls, pointer leave / re-enter.
//   node jcap.mjs --case NAME --out DIR --variants "base:5182:mask,lane:5181,off:5181:lktaa=0" [--rows y0,y1] [--dsf 1] [--tier T1]
// Output per variant: DIR/<variant>[_sN]/fNNNN.bin (+ mNNNN.bin for :mask), meta.json (lib.mjs compatible; a resize starts _sN).
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const require = createRequire("/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const CASE = arg("case"), OUT = arg("out"), dsf = +arg("dsf", "1"), tier = arg("tier", "T1"), rowsArg = arg("rows", "");
const variants = arg("variants").split(",").map((s) => { const [name, port, ...rest] = s.split(":"); return { name, port, mask: rest.includes("mask"), qs: rest.filter((r) => r !== "mask").join("&") }; });
fs.mkdirSync(OUT, { recursive: true });

// Case scripts: pre-roll frames (not saved), then per frame i: pointer [nx, ny] (null = gone), event, action, save?
// actions: {resize:[w,h]} {scale:s} {gap:n (n frames of pointer motion without rendering)} {dt:s}
const lin = (a, b, u) => a + (b - a) * Math.min(1, Math.max(0, u));
function caseAt(i) {
  switch (CASE) {
    case "fastrev": {
      // fast sweep right, hard reversal, a flick (pointer +0.6 -> -0.8 in 3 frames), stop (TAA handover after 24 still frames)
      if (i < 40) return { p: [lin(-0.9, 0.9, i / 40), 0.15] };
      if (i < 70) return { p: [lin(0.9, -0.6, (i - 40) / 30), 0.15] };
      if (i < 90) return { p: [lin(-0.6, 0.6, (i - 70) / 20), lin(0.15, -0.2, (i - 70) / 20)] };
      if (i < 93) return { p: [lin(0.6, -0.8, (i - 89) / 3), -0.2] };
      return { p: [-0.8, -0.2] };
    }
    case "holdre": {
      // press at 10, release at 110, re-press at 135 (during the release), release at 215
      const ev = i === 10 ? "down" : i === 110 ? "up" : i === 135 ? "down" : i === 215 ? "up" : null;
      return { p: [0.15, 0.1], ev };
    }
    case "resize": {
      const p = [0.8 * Math.sin(i / 9), 0.2 * Math.sin(i / 13)];
      if (i === 30) return { p, act: { resize: [1100, 700] } };
      if (i === 60) return { p, act: { resize: [1440, 766] } };
      return { p };
    }
    case "gov": {
      const p = [0.9 * Math.sin(i / 8), 0.25 * Math.sin(i / 11)];
      if (i === 25) return { p, act: { scale: 0.9 } };
      if (i === 50) return { p, act: { scale: 0.8 } };
      if (i === 75) return { p, act: { scale: 0.7 } };
      if (i === 100) return { p, act: { scale: 1 } };
      return { p };
    }
    case "tab": {
      // sweep; at 40 the tab is hidden for 90 frames of pointer motion (no frames), then visible; stalls (dt 1/20) at 80-84
      const p = [0.9 * Math.sin(i / 10), 0.2 * Math.sin(i / 14)];
      if (i === 40) return { p, act: { gap: 90 } };
      if (i >= 80 && i < 85) return { p, act: { dt: 1 / 20 } };
      return { p };
    }
    case "leavere": {
      // sweep to the right edge, leave at 40, re-enter at 80 at the left (pointer appears there), sweep on
      if (i < 40) return { p: [lin(0.2, 1.0, i / 40), 0.2] };
      if (i < 80) return { p: [null, 0], ev: i === 40 ? "leave" : null };
      return { p: [lin(-0.7, 0.3, (i - 80) / 50), -0.1] };
    }
    case "holdpan": {
      // hold with the pointer moving (pitch / yaw): the cloud-card box edge sweeps over the far waterline
      const ev = i === 10 ? "down" : i === 120 ? "up" : i === 140 ? "down" : i === 175 ? "up" : null;
      return { p: [0.5 * Math.sin(i / 14), 0.45 * Math.sin(i / 9)], ev };
    }
    case "pump": {
      // (prejudge-glide) stop / start: sweep 0..69, pointer stops at 70 (camera settles, still tail, hand-over), starts again at 190
      // continuing the same sweep (velocity step, like a mouse that starts moving), runs to 259
      const sw = (j) => [0.6 * Math.sin(j / 12), 0.15 * Math.sin(j / 17)];
      if (i < 70) return { p: sw(i) };
      if (i < 190) return { p: sw(70) };
      return { p: sw(70 + (i - 190)) };
    }
    case "pump2": {
      // (prejudge-glide) run with --pre 40 (TAA handed over before k0): sweep 0..59, pointer stops at 60 for 600 frames (saved: the
      // first 10, every 60th and every frame whose TAA still count is 1..30 = the still tail), starts again at 660 (velocity step)
      const sw = (j) => [0.6 * Math.sin(j / 12), 0.15 * Math.sin(j / 17)];
      if (i < 60) return { p: sw(i) };
      if (i < 660) return { p: sw(60), auto: true };
      return { p: sw(60 + (i - 660)) };
    }
    case "dpr2":
      return { p: [1.0 * Math.sin((Math.PI * 2 * i) / 150), 0.4 * Math.sin((Math.PI * 2 * i) / 198)] };
    case "rest":
      return { p: [null, 0] };
    default:
      throw new Error("case " + CASE);
  }
}
const N = { pump2: 700, pump: 260, fastrev: 120, holdre: 240, resize: 90, gov: 120, tab: 100, leavere: 120, dpr2: 90, rest: 12, holdpan: 180 }[CASE];
const PRE = +arg("pre", "20");

const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const summary = [];
let autoSet = null;
try {
  for (const v of variants) {
    const logs = [];
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: dsf });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => logs.push("pageerror " + e.message));
    page.on("console", (m) => { const t = m.type(); if (t === "error" || t === "warning") logs.push(`console.${t} ${m.text().slice(0, 300)}`); });
    await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get() { return h; }, set(x) { h = x; x.start = function () {}; } }); });
    const url = `http://localhost:${v.port}/?tier=${tier}&scale=1&debug=1${v.qs ? "&" + v.qs : ""}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1" || document.documentElement.dataset.heroFailed === "1", null, { timeout: 240000 });
    await page.evaluate(() => {
      const h = window.__hero;
      const gl = h.renderer.getContext();
      const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
      const read = (y0, y1) => { const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const buf = new Uint8Array(W * (y1 - y0) * 4); h.renderer.setRenderTarget(null); gl.readPixels(0, H - y1, W, y1 - y0, gl.RGBA, gl.UNSIGNED_BYTE, buf); return b64(buf); };
      const heroParts = () => [h.rings?.root, h.orb?.mesh, h.shards?.mesh].filter(Boolean);
      const renderOnly = () => { h.pipeline.render(h.scene, h.rig.camera, h.hooks, 0); h.post.render(h.pipeline.main.texture, h.postParams); };
      window.__j = {
        dims() { return { W: gl.drawingBufferWidth, H: gl.drawingBufferHeight, main: [h.pipeline.main.width, h.pipeline.main.height], pr: h.renderer.getPixelRatio(), scale: h.adaptive.scale }; },
        pointer(p, ev) {
          const d = h.debug;
          if (p[0] === null) { d.pointer(null); if (ev !== "keep") h.state.pointer.active = false; } else d.pointer(p[0], p[1]);
          if (ev === "down") window.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: innerWidth * 0.55, clientY: innerHeight * 0.45, pointerType: "mouse", bubbles: true }));
          if (ev === "up") window.dispatchEvent(new PointerEvent("pointerup", { button: 0, pointerType: "mouse", bubbles: true }));
          if (ev === "leave") document.documentElement.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }));
        },
        update(dt) { h.update(dt, false); },
        scale(s) { h.adaptive._scale = s; h.resize(); },
        resize() { h.resize(); },
        step(dt, rows, save, mask, iFrame) {
          h.frame(dt, false);
          if (save === 2) { const ts = h.envEdge && h.envEdge.taaState; const st = ts ? ts.still : -1; save = (st >= 1 && st <= 30) || iFrame - 60 < 10 || (iFrame - 60) % 60 === 0; mask = mask && save; }
          const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
          const y0 = rows ? Math.round(rows[0] * H / 766) : 0, y1 = rows ? Math.round(rows[1] * H / 766) : H;
          const aa = h.pipeline.aa ? { plane: h.pipeline.aa.read.uAAPlane.value.toArray(), exc: Array.from(h.pipeline.aa.read.uAAExc.value.elements) } : null;
          const info = { W, H, y0, y1, main: [h.pipeline.main.width, h.pipeline.main.height], taa: h.envEdge && h.envEdge.taaState ? h.envEdge.taaState : null, mirror: h.lakeSched ? h.lakeSched.counts.mirror : -1, hold: h.state.hold, phase: h.choreo.phase, pos: h.rig.camera.position.toArray(), aa };
          if (!save) return { info };
          const f = read(y0, y1);
          if (!mask) return { info, f };
          const g = h.water.group.children;
          const saved = g.map((m) => m.material);
          if (!window.__flatMat) {
            const SM = h.water.material.constructor, V3 = h.rig.camera.position.constructor;
            window.__flatMat = new SM({ name: "cap-flat", vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: "uniform vec3 uC; void main() { gl_FragColor = vec4(uC, 1.0); }", uniforms: { uC: { value: new V3(0, 0, 0) } } });
          }
          const fm = window.__flatMat;
          g.forEach((m) => (m.material = fm));
          fm.uniforms.uC.value.set(0, 0, 0); renderOnly(); const fl = read(y0, y1);
          fm.uniforms.uC.value.set(8, 8, 8); renderOnly(); const fw = read(y0, y1);
          g.forEach((m, i) => (m.material = saved[i]));
          const parts = heroParts(); const vis = parts.map((p) => p.visible);
          parts.forEach((p) => (p.visible = false)); renderOnly(); const fh = read(y0, y1);
          parts.forEach((p, i) => (p.visible = vis[i]));
          return { info, f, fl, fw, fh };
        },
      };
    });
    if (arg("eval", "")) await page.evaluate(arg("eval", ""));
    const c0 = caseAt(0);
    await page.evaluate((p) => { const h = window.__hero; if (p[0] === null) h.debug.pointer(null); else h.debug.pointer(p[0], p[1]); h.debug.settle(6); }, c0.p);
    if (arg("eval2", "")) await page.evaluate(arg("eval2", ""));
    let seg = -1, segDir = null, meta = null, segK = 0, lastW = -1, lastH = -1;
    const rows = rowsArg ? rowsArg.split(",").map(Number) : null;
    const closeSeg = () => { if (meta) fs.writeFileSync(path.join(segDir, "meta.json"), JSON.stringify(meta)); };
    for (let i = -PRE; i < N; i++) {
      const c = i < 0 ? caseAt(0) : caseAt(i);
      const act = i < 0 ? null : c.act;
      if (act?.resize) { await page.setViewportSize({ width: act.resize[0], height: act.resize[1] }); await page.evaluate(() => window.__j.resize()); }
      if (act?.scale) await page.evaluate((s) => window.__j.scale(s), act.scale);
      if (act?.gap) {
        // the tab is hidden: the pointer moves, nothing is simulated or rendered (the engine is stopped)
        for (let g = 0; g < act.gap; g++) await page.evaluate(([p, ev]) => window.__j.pointer(p, ev), [caseAt(i + g).p, null]);
      }
      await page.evaluate(([p, ev]) => window.__j.pointer(p, ev), [c.p, i < 0 ? null : c.ev ?? null]);
      // (auto frames: the FIRST variant decides from its TAA still count; the later variants save the same frames)
      const save = i < 0 ? false : c.auto ? (autoSet && v !== variants[0] ? autoSet.has(i) : 2) : true;
      const dt = act?.dt ?? 1 / 60;
      const r = await page.evaluate(([dt, rows, save, mask, iF]) => window.__j.step(dt, rows, save, mask, iF), [dt, rows, save, v.mask && !!save, i]);
      if (!save || !r.f) continue;
      if (c.auto && v === variants[0]) (autoSet = autoSet || new Set()).add(i);
      const inf = r.info;
      if (inf.W !== lastW || inf.H !== lastH) {
        closeSeg();
        seg++;
        segDir = path.join(OUT, seg === 0 ? v.name : `${v.name}_s${seg}`);
        fs.mkdirSync(segDir, { recursive: true });
        meta = { url, case: CASE, W: inf.W, y0: inf.y0, y1: inf.y1, H: inf.H, dsf, info: [] };
        segK = 0; lastW = inf.W; lastH = inf.H;
      }
      meta.info.push({ k: segK, i, ...inf, ptr: c.p, ev: c.ev ?? null, act: act ?? null });
      const name = (p) => path.join(segDir, `${p}${String(segK).padStart(4, "0")}.bin`);
      fs.writeFileSync(name("f"), zlib.deflateSync(Buffer.from(r.f, "base64"), { level: 1 }));
      if (r.fl) {
        const a = Buffer.from(r.f, "base64"), b = Buffer.from(r.fl, "base64"), w = Buffer.from(r.fw, "base64"), hh = Buffer.from(r.fh, "base64");
        const m = Buffer.alloc(a.length / 4);
        for (let j = 0, q = 0; q < m.length; j += 4, q++) {
          const dl = Math.max(Math.abs(w[j] - b[j]), Math.abs(w[j + 1] - b[j + 1]), Math.abs(w[j + 2] - b[j + 2]));
          const dh = Math.max(Math.abs(a[j] - hh[j]), Math.abs(a[j + 1] - hh[j + 1]), Math.abs(a[j + 2] - hh[j + 2]));
          m[q] = (dl > 128 ? 1 : 0) | (dl > 16 && dl <= 128 ? 2 : 0) | (dh > 3 ? 4 : 0);
        }
        fs.writeFileSync(name("m"), zlib.deflateSync(m, { level: 1 }));
      }
      segK++;
    }
    closeSeg();
    fs.writeFileSync(path.join(OUT, `${v.name}.log.txt`), logs.join("\n"));
    summary.push(`${v.name}: ${seg + 1} seg, ${logs.length} errors/warnings${logs.length ? " :: " + logs.slice(0, 3).join(" | ") : ""}`);
    await ctx.close();
  }
} catch (e) {
  summary.push("ERROR " + (e.stack || e.message));
} finally {
  console.log(`[jcap ${CASE}] ` + summary.join("\n  "));
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
  process.exit(0);
}
