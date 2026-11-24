// J5 attribution: late90_rest normal vs the cloud cards hidden vs the BG sky card hidden (same sim time).  node zig.mjs <port> <out> [qs]
import { createRequire } from "node:module";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const [port, out, qs] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  await page.evaluate(() => { const h = window.__hero; h.debug.pointer(null); h.debug.settle(6); });
  const names = await page.evaluate(() => { const n = []; window.__hero.env.group.traverse((o) => { if (o.isMesh && /BG|sky/i.test(o.name)) n.push(o.name); }); return n.concat(Object.keys(window.__hero.env).filter((k) => /cloud/i.test(k))); });
  logs.push("meshes/keys " + JSON.stringify(names));
  for (const [tag, T] of [["t92", 90], ["t152", 150]]) {
    for (const mode of ["normal", "noclouds", "nobg"]) {
      const r = await page.evaluate(([T, mode]) => {
        const h = window.__hero; const gl = h.renderer.getContext(); const env = h.env;
        h.debug.freeze(false);
        const now = h.state.time; h.debug.pose(null); h.debug.pointer(null);
        if (T > now) h.debug.settle(T - now);
        h.debug.pointer(null); h.debug.pose(null); if (mode === "normal") h.debug.settle(2.5); h.rings.clock = 0;
        h.debug.freeze(true);
        const cg = env.cloudGroup; const bg = []; env.group.traverse((o) => { if (o.isMesh && /^BG/i.test(o.name)) bg.push(o); });
        if (cg) cg.visible = mode !== "noclouds";
        for (const o of bg) o.visible = mode !== "nobg";
        for (let i = 0; i < 24; i++) h.frame(1 / 60, false);
        const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const fb = new Uint8Array(W * H * 4);
        h.renderer.setRenderTarget(null); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, fb);
        if (cg) cg.visible = true; for (const o of bg) o.visible = true;
        let bin = ""; const CH = 0x8000; for (let i = 0; i < fb.length; i += CH) bin += String.fromCharCode.apply(null, fb.subarray(i, i + CH));
        return { W, H, b64: btoa(bin), time: +h.state.time.toFixed(3), bg: bg.length, cg: !!cg };
      }, [T, mode]);
      const fb = Buffer.from(r.b64, "base64"); const W = r.W, H = r.H; const raw = Buffer.alloc(W * H * 3);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = ((H - 1 - y) * W + x) * 4, d = (y * W + x) * 3; raw[d] = fb[a]; raw[d + 1] = fb[a + 1]; raw[d + 2] = fb[a + 2]; }
      const p = `${out}/${tag}_${mode}.png`; fs.writeFileSync(p + ".rgb", raw);
      execFileSync("/opt/homebrew/bin/ffmpeg", ["-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", W + "x" + H, "-i", p + ".rgb", p]); fs.unlinkSync(p + ".rgb");
      logs.push(`${tag}_${mode} t=${r.time} bg=${r.bg} cg=${r.cg}`);
    }
  }
} catch (e) { logs.push("ERROR " + e.message); }
finally { fs.writeFileSync(`${out}/log.txt`, logs.join("\n")); console.log(logs.join("\n")); await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]); process.exit(0); }
