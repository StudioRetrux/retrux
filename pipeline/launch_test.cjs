const { createRequire } = require("node:module");
const req = createRequire("E:/Retrux Hero R&D/hero-pipeline/tools/package.json");
const { chromium } = req("playwright-core");
console.log("launching...");
chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] })
  .then(async (b) => { console.log("launched", b.version()); await b.close(); console.log("closed"); })
  .catch((e) => { console.log("ERR", e.message.slice(0, 500)); process.exit(2); });
