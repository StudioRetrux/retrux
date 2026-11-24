// toward-GT split by local contrast (AA3's own 3x3 luma range at the pixel): <40, 40-100, >100
import { loadSeq } from "./lib.mjs";
const [da, db, dg, strideS] = process.argv.slice(2);
const A = loadSeq(da), B = loadSeq(db), G = loadSeq(dg);
const W = A.W, H = A.H, stride = +(strideS || 2);
const L = (f, p) => 0.2126 * f[p] + 0.7152 * f[p + 1] + 0.0722 * f[p + 2];
const acc = [0, 1, 2].map(() => ({ n: 0, ea: 0, eb: 0, t: 0 }));
for (let k = 1; k < Math.min(A.n, B.n, G.n); k += stride) {
  const a = A.frame(k), b = B.frame(k), g = G.frame(k);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = (y * W + x) * 4;
    if (Math.abs(L(b, i) - L(a, i)) <= 2) continue;
    let mn = 1e9, mx = -1e9;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = L(a, ((y + dy) * W + x + dx) * 4); if (v < mn) mn = v; if (v > mx) mx = v; }
    const c = mx - mn < 40 ? 0 : mx - mn < 100 ? 1 : 2;
    const ea = Math.abs(L(a, i) - L(g, i)), eb = Math.abs(L(b, i) - L(g, i));
    const r = acc[c]; r.n++; r.ea += ea; r.eb += eb; if (eb < ea) r.t++;
  }
}
["con<40", "con40-100", "con>100"].forEach((nm, c) => { const r = acc[c]; console.log(nm.padEnd(10), `n ${r.n}  |A-GT| ${(r.ea / Math.max(1, r.n)).toFixed(2)} -> ${(r.eb / Math.max(1, r.n)).toFixed(2)}  toward ${((100 * r.t) / Math.max(1, r.n)).toFixed(0)}%`); });
