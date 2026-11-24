// Ice artefact hunt: eye pose, toggles one ice feature at a time, saves zoomed crops in a grid.
//   node probe_ice.mjs <outDir>
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SP = "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad";
const require = createRequire(SP + "/tools/package.json");
const { chromium } = require("playwright-core");
const FFMPEG = (process.env.FFMPEG || "/opt/homebrew/bin/ffmpeg");
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const clip = { x: 540, y: 170, width: 260, height: 150 };

// name -> [ring uniform overrides, shared uniform overrides]
const VARIANTS = {
  a_base: [{}, {}],
  b_noBack: [{}, { uUseBackDepth: 0 }],
  c_noDisp: [{ uDisplace: 0 }, {}],
  d_noCrack: [{ uCrack: 0 }, {}],
  e_noScatter: [{ uScatter: 0 }, {}],
  f_noFrost: [{ uFrost: 0 }, {}],
};

const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
  args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"],
});
const logs = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => logs.push("pageerror " + e.message));
  await page.goto(((process.env.LAB || "http://localhost:5173") + "/?tier=T1&scale=1"), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => {
    const h = window.__hero;
    h.debug.settle(6);
    h.debug.pose(null);
    h.debug.settle(2.5);
    h.rings.tau = 1.5;
    h.debug.freeze(true);
    // Remember the defaults.
    window.__iceDefaults = Object.fromEntries(Object.entries(h.rings.materials[0].uniforms).map(([k, v]) => [k, v.value]));
    window.__sharedDefaults = { uUseBackDepth: h.shared.uUseBackDepth.value };
  });
  const files = [];
  for (const [name, [ice, shared]] of Object.entries(VARIANTS)) {
    await page.evaluate(
      ([ice, shared]) => {
        const h = window.__hero;
        for (const m of h.rings.materials) {
          for (const k of ["uDisplace", "uCrack", "uScatter", "uFrost"]) m.uniforms[k].value = window.__iceDefaults[k];
          for (const [k, v] of Object.entries(ice)) m.uniforms[k].value = v;
        }
        h.shared.uUseBackDepth.value = window.__sharedDefaults.uUseBackDepth;
        for (const [k, v] of Object.entries(shared)) h.shared[k].value = v;
      },
      [ice, shared],
    );
    await page.waitForTimeout(350);
    const f = path.join(out, `${name}.png`);
    await page.screenshot({ path: f, clip });
    files.push(f);
  }
  // 3 x 2 grid at 2x.
  const inputs = files.flatMap((f) => ["-i", f]);
  const n = files.length;
  const scaled = files.map((_, i) => `[${i}]scale=520:300:flags=neighbor[s${i}]`).join(";");
  const layout = files.map((_, i) => `${(i % 3) * 520}_${Math.floor(i / 3) * 300}`).join("|");
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${scaled};${files.map((_, i) => `[s${i}]`).join("")}xstack=inputs=${n}:layout=${layout}`, path.join(out, "grid.png")]);
} finally {
  fs.writeFileSync(path.join(out, "log.txt"), logs.join("\n"));
  console.log(logs.join("\n"));
  await browser.close();
}
