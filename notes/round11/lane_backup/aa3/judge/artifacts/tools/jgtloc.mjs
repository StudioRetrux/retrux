// cluster (16 px cells) of non-lake pixels where LANE is > 4 lv darker/brighter than BASE's 3x3 range; prints the top cells with GT verdicts
import { loadSeq, bandFromMask } from "../../../aa3/tools/lib.mjs";
const [bd, ld, gd, a, b] = process.argv.slice(2);
const B = loadSeq(bd), L = loadSeq(ld), G = loadSeq(gd), W = B.W, H = B.H;
const k0 = +(a || 0), k1 = Math.min(+(b || 1e9), B.n, L.n, G.n);
const cells = new Map();
for (let k = k0; k < k1; k++) {
  const m = B.mask(k); const { lake, hero } = bandFromMask(m, W, H, 3);
  const fb = B.frame(k), fl = L.frame(k), fg = G.frame(k);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, p = i * 4;
    if (lake[i] || hero[i]) continue;
    let ex = 0;
    for (let c = 0; c < 3; c++) {
      let mn = 255, mx = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = fb[((y + dy) * W + x + dx) * 4 + c]; mn = Math.min(mn, v); mx = Math.max(mx, v); }
      ex = Math.max(ex, mn - fl[p + c] - 4, fl[p + c] - mx - 4);
    }
    if (ex <= 0) continue;
    const lum = (f) => 0.2126 * f[p] + 0.7152 * f[p + 1] + 0.0722 * f[p + 2];
    const key = `${x >> 4},${(y + B.y0) >> 4}`;
    const e = cells.get(key) || { n: 0, ks: new Set(), closer: 0, ex: 0, eg: [], at: null };
    e.n++; e.ks.add(k); if (Math.abs(lum(fl) - lum(fg)) < Math.abs(lum(fb) - lum(fg))) e.closer++;
    if (ex + 4 > e.ex) { e.ex = ex + 4; e.at = [k, x, y + B.y0, Math.round(lum(fb)), Math.round(lum(fl)), Math.round(lum(fg))]; }
    cells.set(key, e);
  }
}
const top = [...cells.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 15);
for (const [key, e] of top) console.log(`cell ${key.split(",").map((v) => v * 16).join(",")} n${e.n} frames${e.ks.size} laneCloser ${e.closer} maxEx ${e.ex} at [k,x,y,lumB,lumL,lumGT]=${JSON.stringify(e.at)}`);
