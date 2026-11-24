import { createRequire } from "node:module";
const require = createRequire("/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json");
const { chromium } = require("playwright-core");
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 766 } })).newPage();
await p.goto("http://localhost:5167/?tier=T1"); await p.waitForFunction(() => window.__hero?.state?.ready, null, { timeout: 120000 }); await p.waitForTimeout(9000);
const r = await p.evaluate(() => { const e = window.__hero; let cam = null; e.scene.traverse((x) => { if (!cam && x.isCamera) cam = x; });
  cam = cam || e.rig?.camera || e.pipeline?.camera; const out = { cam: cam ? cam.type : "none" }; if (!cam) return out;
  const V = cam.position.constructor; const pts = { left: [80, 560], leftTop: [80, 470], shelf: [380, 480], far: [1160, 510], farTop: [1160, 440], farLow: [1160, 590] };
  for (const [k, [x, y]] of Object.entries(pts)) { const v = new V((x / 1440) * 2 - 1, -(y / 766) * 2 + 1, 0.5).unproject(cam); const d = v.sub(cam.position).normalize(); const t = -cam.position.y / d.y; out[k] = t > 0 ? +t.toFixed(1) : null; }
  out.camY = +cam.position.y.toFixed(2); return out; });
console.log(JSON.stringify(r)); await b.close();
