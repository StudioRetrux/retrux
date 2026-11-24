// Isolates the ring groups at the expand sustain pose and shows the eye pose at rest.
//   node probe_rings.mjs <outDir>
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const SP = "C:/Users/fvldi/AppData/Local/Temp/claude/dc2ac90effee4131/570a569a-5122-4ff1-b51f-d34d42e5fde3/scratchpad";
const require = createRequire(SP + "/tools/package.json");
const { chromium } = require("playwright-core");
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const logs = [];
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  await page.goto("http://localhost:5173/?tier=T1&scale=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => window.__hero.debug.settle(6));
  await page.waitForTimeout(800);

  const info = await page.evaluate(() => {
    const h = window.__hero;
    h.debug.pose("expand", 2.97);
    h.debug.settle(1.6);
    h.debug.freeze(true);
    const cam = h.rig.camera;
    const f = (v) => v.toArray().map((x) => +x.toFixed(3));
    return {
      cam: f(cam.position),
      camQ: f(cam.quaternion),
      fov: +cam.fov.toFixed(2),
      axes: h.rings.axes.map(f),
      groups: h.rings.groups.map((g) => ({ name: g.name, q: f(g.quaternion) })),
      pieces: h.rings.pieces.map((p) => ({ name: p.mesh.name, pos: f(p.pivot.position), r: +p.mesh.geometry.boundingSphere.radius.toFixed(2) })),
    };
  });
  logs.push(JSON.stringify(info, null, 1));
  const sets = { onlyA: [0], onlyB: [1], onlyCD: [2, 3], all: [0, 1, 2, 3] };
  for (const [name, show] of Object.entries(sets)) {
    await page.evaluate((s) => {
      const h = window.__hero;
      h.rings.groups.forEach((g, i) => (g.visible = s.includes(i)));
      h.orb.mesh.visible = s.length === 4;
      h.shards.mesh.visible = s.length === 4;
    }, show);
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(out, `sustain_${name}.png`) });
  }
  // Rest, eye pose (every ring face-on and concentric) for comparison with ref_F082.
  await page.evaluate(() => {
    const h = window.__hero;
    h.debug.freeze(false);
    h.debug.pose(null);
    h.debug.settle(2.5);
    h.rings.tau = 1.5;
    h.debug.freeze(true);
  });
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(out, "rest_eye.png") });
} finally {
  fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n"));
  console.log(logs.join("\n"));
  await browser.close();
}
