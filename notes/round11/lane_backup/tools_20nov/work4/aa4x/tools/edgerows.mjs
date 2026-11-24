// lists, per box, the rows with the most edge px (mask: 3x3 holds lake and solid) at frame k, and their x span
import { loadSeq, bandFromMask } from "./lib.mjs";
const [dir, kArg] = process.argv.slice(2);
const M = loadSeq(dir), k = +kArg, W = M.W, H = M.H, Y0 = M.y0;
const m = M.mask(k); const { lake, solid, hero } = bandFromMask(m, W, H, 3);
const B = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
for (const [n, [x0, y0, x1, y1]] of Object.entries(B)) {
  const rows = [];
  for (let y = Math.max(y0, Y0 + 1); y < Math.min(y1, Y0 + H - 1); y++) {
    const xs = [];
    for (let x = x0 + 1; x < x1 - 1; x++) {
      const i = (y - Y0) * W + x; if (hero[i]) continue;
      let l = 0, s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { l |= lake[i + dy * W + dx]; s |= solid[i + dy * W + dx]; }
      if (l && s) xs.push(x);
    }
    rows.push([y, xs.length, xs[0], xs[xs.length - 1]]);
  }
  rows.sort((a, b) => b[1] - a[1]);
  console.log(n, rows.slice(0, 4).map((r) => `y${r[0]}:${r[1]}px x${r[2]}-${r[3]}`).join("  "));
}
