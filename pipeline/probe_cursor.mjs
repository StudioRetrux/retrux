// Cursor check: after a mouse move over the hero, the root class is on, the computed cursor is the ring
// image, the link ring applies over a nav link, the cursor images load, and the press disc fills on a hold.
import { createRequire } from "node:module";
const require = createRequire("/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/tools/package.json");
const { chromium } = require("playwright-core");
const out = process.argv[2];
const browser = await chromium.launch({
  executablePath: (process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  headless: true,
  args: [(process.platform === "win32" ? "--use-angle=d3d11" : "--use-angle=metal"), "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  for (const [w, h, dpr] of [[1440, 766, 2], [1200, 700, 1], [1000, 700, 1]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    const page = await ctx.newPage();
    const failed = [];
    page.on("pageerror", (e) => console.log("pageerror " + e.message));
    page.on("requestfailed", (r) => failed.push(r.url()));
    page.on("response", (r) => { if (r.url().includes("/hero/cursor/") && r.status() !== 200) failed.push(r.url() + " " + r.status()); });
    await page.goto(((process.env.LAB || "http://localhost:5173") + "/?tier=T0&scale=0.5"), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.heroReady === "1", null, { timeout: 180000 });
    await page.mouse.move(w * 0.3, h * 0.5);
    await page.mouse.move(w * 0.32, h * 0.52, { steps: 4 });
    await page.waitForTimeout(400);
    const ring = await page.evaluate(() => ({
      cls: document.documentElement.className,
      cursor: getComputedStyle(document.elementFromPoint(innerWidth * 0.32, innerHeight * 0.52)).cursor,
      size: getComputedStyle(document.querySelector("[data-hero-cursor]")).getPropertyValue("--hero-cursor-size"),
    }));
    // Over a nav link.
    const link = await page.evaluate(() => {
      const a = document.querySelector("nav a, .nav a, header a[href]");
      if (!a) return null;
      const r = a.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    let linkCursor = null;
    if (link) {
      await page.mouse.move(link.x, link.y, { steps: 3 });
      await page.waitForTimeout(300);
      linkCursor = await page.evaluate(([x, y]) => getComputedStyle(document.elementFromPoint(x, y)).cursor, [link.x, link.y]);
    }
    // Hold on the hero: the disc should show.
    await page.mouse.move(w * 0.5, h * 0.48, { steps: 3 });
    await page.mouse.down();
    await page.waitForTimeout(1200);
    const disc = await page.evaluate(() => {
      const d = document.querySelector("[data-hero-cursor-disc]");
      const cs = getComputedStyle(d);
      const r = d.getBoundingClientRect();
      return { opacity: cs.opacity, transform: cs.transform, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] };
    });
    await page.screenshot({ path: `${out}\\cursor_hold_${w}.png`, clip: { x: w * 0.5 - 80, y: h * 0.48 - 80, width: 160, height: 160 } });
    await page.mouse.up();
    console.log(JSON.stringify({ w, dpr, ring, linkCursor: linkCursor && linkCursor.slice(0, 120), disc, failed }));
    await ctx.close();
  }
} finally {
  await browser.close();
}
