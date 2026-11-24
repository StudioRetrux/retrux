// progsrc.mjs --port P [--qs ..] --out DIR : after 20 moving frames, write each linked program's shader sources (as linked)
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work6/glide/pw/package.json");
const { chromium } = require("playwright-core");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const port = arg("port", "5196"), qs = arg("qs", ""), out = arg("out", ".");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const logs = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 766 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`console.${m.type()} ${m.text().slice(0, 300)}`); });
  await page.addInitScript(() => { let h = null; Object.defineProperty(window, "__hero", { configurable: true, get: () => h, set: (v) => { h = v; v.start = function () {}; } }); });
  await page.goto(`http://localhost:${port}/?tier=T1&scale=1&debug=1${qs ? "&" + qs : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 240000 });
  const res = await page.evaluate(() => {
    const h = window.__hero, r = h.renderer, gl = r.getContext();
    h.debug.pointer(0, 0); h.debug.settle(6);
    for (let i = 0; i < 20; i++) { h.debug.pointer(0.8 * Math.sin((2 * Math.PI * i) / 60), 0.2 * Math.sin((2 * Math.PI * i) / 80)); h.frame(1 / 60, false); }
    const o = {};
    for (const p of r.info.programs || []) {
      const sh = gl.getAttachedShaders(p.program) || [];
      o[p.name + "_" + p.id] = sh.map((s) => gl.getShaderSource(s)).join("\n//----FRAGMENT----\n");
    }
    return o;
  });
  for (const [k, v] of Object.entries(res)) fs.writeFileSync(`${out}/${k.replace(/[^\w.-]/g, "_")}.glsl`, v);
  console.log(JSON.stringify({ n: Object.keys(res).length, names: Object.keys(res), logs }));
} catch (e) { console.log("ERROR " + e.message, logs); }
finally { await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]); process.exit(0); }
