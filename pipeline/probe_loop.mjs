// Idle tumble vs Default Loop: the engine at ring clock tau = t (idle, rest camera), cropped like the loop
// frames (600x560 at 420,100), next to qc\loopframes\lf_XX.jpg. Writes loop_cmp.jpg (engine above reference).
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import path from "node:path";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const out = process.argv[2];
const SP = process.argv[3];
const taus = (process.argv[4] || "0,0.5,1,1.5,2,2.5,3,3.5").split(",").map(Number);
const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
  args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 766 } });
  page.on("pageerror", (e) => console.log("pageerror " + e.message));
  await page.goto(((process.env.LAB || "http://localhost:5173") + "/?tier=T1&scale=1&debug=1"), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
  await page.addStyleTag({ content: ".nav,.hero-copy,.scroll,.sound,.overlay,[data-hud]{visibility:hidden !important}" });
  await page.evaluate(() => window.__hero.debug.settle(6));
  for (const t of taus) {
    await page.evaluate((tt) => {
      const h = window.__hero;
      h.debug.freeze(false);
      h.debug.pose(null, 0);
      h.debug.settle(1.0);
      h.rings.tau = tt;
      h.debug.freeze(true);
    }, t);
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(out, `eng_${t.toFixed(1)}.png`), clip: { x: 420, y: 100, width: 600, height: 560 } });
  }
  await page.evaluate(() => { window.__hero.debug.freeze(false); window.__hero.debug.pose(null); });
} finally {
  await browser.close();
}
const py = `
import sys, os
from PIL import Image
out, sp = sys.argv[1], sys.argv[2]
taus = [float(x) for x in sys.argv[3].split(",")]
W, H = 300, 280
sheet = Image.new("RGB", (W * len(taus), H * 2), (0, 0, 0))
for i, t in enumerate(taus):
    e = Image.open(os.path.join(out, "eng_%.1f.png" % t)).convert("RGB").resize((W, H), Image.LANCZOS)
    k = int(round(t * 10)) % 40
    r = Image.open(os.path.join(sp, "qc", "loopframes", "lf_%02d.jpg" % k)).convert("RGB").resize((W, H), Image.LANCZOS)
    sheet.paste(e, (i * W, 0)); sheet.paste(r, (i * W, H))
sheet.save(os.path.join(out, "loop_cmp.jpg"), quality=90)
print("sheet", sheet.size)
`;
execFileSync("python", ["-c", py, out, SP, taus.join(",")], { stdio: "inherit" });
