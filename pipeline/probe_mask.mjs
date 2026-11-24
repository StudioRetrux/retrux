// Visualise the plate's far-left ridge mask: patch the plate shader in the page (mask -> red) and shoot
// the left of the rest frame.
import { createRequire } from "node:module";
const require = createRequire("E:/Retrux Hero R&D/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const out = process.argv[2];
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => console.log("pageerror " + e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("console.error " + m.text().slice(0, 600)); });
  await page.goto("http://localhost:5173/?tier=T1&scale=1&debug=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => window.__hero.debug.settle(6));
  await page.screenshot({ path: out.replace(".png", "_base.png"), clip: { x: 0, y: 200, width: 600, height: 300 } });
  const r = await page.evaluate((repl) => {
    const m = window.__hero.env.plateMaterial;
    const src = m.fragmentShader;
    const a = "gl_FragColor = vec4(mix(col, MIST_COLOR, min(mist, 0.85)), 1.0);";
    const found = src.includes(a);
    m.fragmentShader = src.replace("gl_FragColor = vec4(mix(col, MIST_COLOR, min(mist, 0.85)), 1.0);", repl);
    m.needsUpdate = true;
    return { found, depthOn: window.__hero.env.occlusion.uPlateDepthOn.value };
  }, process.env.REPL || "gl_FragColor = vec4(col * 0.0, 1.0);");
  console.log(JSON.stringify(r));
  await page.waitForTimeout(800);
  await page.screenshot({ path: out, clip: { x: 0, y: 200, width: 600, height: 300 } });
} finally {
  await browser.close();
}



