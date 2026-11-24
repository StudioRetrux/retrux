// G5-ish split of X vs R differences: hero px (mask bit2, dilated 2), non-lake px outside the +-6 px band, lake+band; max and >2 / >4 lv counts
//   node g5.mjs MASKSEQ X R [k0 k1]
import { loadSeq, bandFromMask, dilate } from "./lib.mjs";
const [md, xd, rd, a, b] = process.argv.slice(2);
const M = loadSeq(md), X = loadSeq(xd), R = loadSeq(rd); const W = M.W, H = M.H;
const k0 = +(a || 0), k1 = Math.min(+(b || 1e9), M.n, X.n, R.n);
const st = { heroOverLake: [0, 0, 0, 0], heroOverNonLake: [0, 0, 0, 0], solid: [0, 0, 0, 0], lake: [0, 0, 0, 0] };
for (let k = k0; k < k1; k++) {
  const m = M.mask(k); const { band, lake, hero } = bandFromMask(m, W, H, 6);
  const fx = X.frame(k), fr = R.frame(k);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; const qx = ((y + M.y0 - X.y0) * X.W + x) * 4, qr = ((y + M.y0 - R.y0) * R.W + x) * 4;
    const d = Math.max(Math.abs(fx[qx] - fr[qr]), Math.abs(fx[qx + 1] - fr[qr + 1]), Math.abs(fx[qx + 2] - fr[qr + 2]));
    const c = hero[i] ? (m[i] & 3 ? "heroOverLake" : "heroOverNonLake") : lake[i] || band[i] ? "lake" : "solid";
    const s = st[c]; s[0]++; if (d > 2) s[1]++; if (d > 4) s[2]++; if (d > s[3]) s[3] = d;
  }
}
for (const [c, s] of Object.entries(st)) console.log(`${c}: px-frames ${s[0]}, >2 lv ${s[1]}, >4 lv ${s[2]}, max ${s[3]}`);
