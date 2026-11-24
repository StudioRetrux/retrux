// dclust.mjs A B k0 k1 [thr 8] [minpx 15]: connected clusters (8-conn) of |luma(B)-luma(A)| > thr per frame; prints the largest.
import { loadSeq } from "./lib.mjs";
const [a, b, K0, K1, T, MP] = process.argv.slice(2); const A = loadSeq(a), B = loadSeq(b);
const W = A.W, H = A.H, Y0 = A.y0, thr = +(T || 8), minpx = +(MP || 15);
const L = (f, i) => 0.2126 * f[i] + 0.7152 * f[i + 1] + 0.0722 * f[i + 2];
const agg = new Map();
for (let k = +K0; k < +K1; k++) {
  const fa = A.frame(k), fb = B.frame(k); const D = new Float32Array(W * H); const seen = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) D[i] = L(fb, i * 4) - L(fa, i * 4);
  const cl = [];
  for (let s = 0; s < W * H; s++) {
    if (seen[s] || Math.abs(D[s]) <= thr) continue;
    const st = [s]; seen[s] = 1; let n = 0, sum = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    while (st.length) { const p = st.pop(); const x = p % W, y = (p / W) | 0; n++; sum += D[p]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = yy * W + xx; if (!seen[q] && Math.abs(D[q]) > thr) { seen[q] = 1; st.push(q); } } }
    if (n >= minpx) cl.push({ n, m: sum / n, bb: `x${x0}-${x1} y${y0 + Y0}-${y1 + Y0}` });
  }
  cl.sort((p, q) => q.n - p.n);
  console.log(`k${k}: ${cl.length} clusters >= ${minpx} px: ` + cl.slice(0, 6).map((c) => `${c.n}px ${c.m.toFixed(0)}lv ${c.bb}`).join(" | "));
}
