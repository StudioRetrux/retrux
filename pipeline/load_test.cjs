const { createRequire } = require("node:module");
const req = createRequire("E:/Retrux Hero R&D/hero-pipeline/tools/package.json");
const { chromium } = req("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
  console.log("launched");
  const page = await b.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => console.log("pageerror " + e.message));
  page.on("crash", () => console.log("PAGE CRASHED"));
  console.log("goto...");
  await page.goto("http://localhost:5173/?tier=T1&scale=1&debug=1", { waitUntil: "domcontentloaded" });
  console.log("loaded, waiting for ready...");
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  console.log("hero ready");
  await b.close();
  console.log("done");
})().catch((e) => { console.log("ERR", e.message.slice(0, 600)); process.exit(2); });
