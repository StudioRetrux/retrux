import { createRequire } from "node:module";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"), headless: true, args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("console", (m) => console.log("console." + m.type() + " " + m.text().slice(0, 300)));
  await page.goto(((process.env.LAB || "http://localhost:5173") + "/?tier=T1&scale=1&debug=1"), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.evaluate(() => { const h = window.__hero; h.debug.pose(null); h.debug.pointer(null); h.debug.settle(2.5); });
  await page.waitForTimeout(800);
  await page.evaluate(() => new Promise((res) => {
    const h = window.__hero;
    const keys = ["uHoldPlate","uOrbNPlate","uOrbPPlate","uTiltPlate"]; const texs = keys.map((k) => h.env.projectorBinding.uniforms[k].value); const u = texs[3];
    console.log("tex before " + (u.image && u.image.width) + "x" + (u.image && u.image.height) + " ver " + u.version + " isTex " + !!u.isTexture);
    const img = new Image();
    img.onload = () => { texs.forEach((t) => { t.image = img; t.needsUpdate = true; }); console.log("extras red"); res(); };
    img.src = "/dist/test_red.webp";
  }));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: out });
  const info = await page.evaluate(() => { const h = window.__hero; const keys = ["uHoldPlate","uOrbNPlate","uOrbPPlate","uTiltPlate"]; const texs = keys.map((k) => h.env.projectorBinding.uniforms[k].value); const u = texs[3]; const wm = h.water.material.uniforms.uPlate && h.water.material.uniforms.uPlate.value; return { ver: u.version, w: u.image.width, sameAsWater: wm === u, meshes: (() => { let n = 0, same = 0; h.env.group.traverse((o) => { if (o.isMesh) { n++; if (o.material === h.env.plateMaterial) same++; } }); return [n, same]; })() }; });
  console.log(JSON.stringify(info));
} finally { await browser.close(); }

