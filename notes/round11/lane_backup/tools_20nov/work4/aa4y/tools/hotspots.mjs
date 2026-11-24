// where are the high-contrast edge errors? per box: top (x, y) edge pixels by |base - gt| summed over frames (stride)
import { loadSeq, bandFromMask } from "./lib.mjs";
const [maskDir, baseDir, gtDir, strideS] = process.argv.slice(2);
const M = loadSeq(maskDir), B = loadSeq(baseDir), G = loadSeq(gtDir);
const W = M.W, H = M.H, Y0 = M.y0, stride = +(strideS || 8);
const BOXES = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
const acc = new Float32Array(W * H);
for (let k = 1; k < M.n; k += stride) {
  const { lake, solid, hero } = bandFromMask(M.mask(k), W, H, 3);
  const b = B.frame(k), g = G.frame(k);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (hero[i]) continue;
    let l = 0, s = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = (y + dy) * W + x + dx; l |= lake[j]; s |= solid[j]; }
    if (!(l && s)) continue;
    const p = i * 4;
    acc[i] += Math.max(Math.abs(b[p] - g[p]), Math.abs(b[p + 1] - g[p + 1]), Math.abs(b[p + 2] - g[p + 2]));
  }
}
for (const [n, [x0, y0, x1, y1]] of Object.entries(BOXES)) {
  // column sums in 8-px wide bins
  const bins = [];
  for (let x = x0; x < x1; x += 8) {
    let s = 0, ys = 0, yw = 0;
    for (let y = Math.max(0, y0 - Y0); y < Math.min(H, y1 - Y0); y++) for (let dx = 0; dx < 8 && x + dx < x1; dx++) { const v = acc[y * W + x + dx]; s += v; ys += v * (y + Y0); yw += v; }
    bins.push([x, s, yw ? Math.round(ys / yw) : 0]);
  }
  bins.sort((a, b) => b[1] - a[1]);
  console.log(n, bins.slice(0, 6).map(([x, s, y]) => `x${x}-${x + 7}@y${y}:${Math.round(s)}`).join("  "));
}
