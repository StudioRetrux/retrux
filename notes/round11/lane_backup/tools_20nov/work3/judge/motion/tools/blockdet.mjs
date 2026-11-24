// pale-block detector vs GT: luma(F - GT) mean over a w x h window > T while the surrounding ring (6 px) mean < T/3;
// hero (mask bit 2, dilated) excluded. node blockdet.mjs SEQ GT MASK x0,y0,x1,y1 [T] [w] [h]
import { loadSeq, dilate } from "./lib.mjs";
const [s, g, mk, reg, TS, wS, hS] = process.argv.slice(2); const S = loadSeq(s), G = loadSeq(g), M = loadSeq(mk);
const [X0, Y0r, X1, Y1r] = reg.split(",").map(Number); const T = +(TS || 15), w = +(wS || 8), h = +(hS || 8), R = 6; const W = S.W, H = S.H, oy = S.y0;
const hits = [];
for (let k = 0; k < Math.min(S.n, G.n); k++) {
  const F = S.frame(k), Q = G.frame(k), m = M.mask(k); const hero = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) hero[i] = m[i] & 4 ? 1 : 0; const hd = dilate(hero, W, H, 8);
  const I = new Float64Array((W + 1) * (H + 1)), IH = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) { let a = 0, b = 0; for (let x = 0; x < W; x++) { const i = y * W + x, p = i * 4; a += 0.2126 * (F[p] - Q[p]) + 0.7152 * (F[p + 1] - Q[p + 1]) + 0.0722 * (F[p + 2] - Q[p + 2]); b += hd[i]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + a; IH[(y + 1) * (W + 1) + x + 1] = IH[y * (W + 1) + x + 1] + b; } }
  const sum = (A, x0, y0, x1, y1) => A[y1 * (W + 1) + x1] - A[y0 * (W + 1) + x1] - A[y1 * (W + 1) + x0] + A[y0 * (W + 1) + x0];
  let best = null;
  for (let y = Math.max(R, Y0r - oy); y + h + R <= Math.min(H, Y1r - oy); y += 2) for (let x = Math.max(R, X0); x + w + R <= Math.min(W, X1); x += 2) {
    if (sum(IH, x - R, y - R, x + w + R, y + h + R) > 0) continue;
    const inner = sum(I, x, y, x + w, y + h) / (w * h); if (inner < T) continue;
    const outer = (sum(I, x - R, y - R, x + w + R, y + h + R) - inner * w * h) / ((w + 2 * R) * (h + 2 * R) - w * h);
    if (Math.abs(outer) > T / 3) continue;
    if (!best || inner - outer > best.c) best = { k, x, y: y + oy, inner: +inner.toFixed(1), outer: +outer.toFixed(1), c: inner - outer };
  }
  if (best) hits.push(best);
}
console.log(s.split("/").pop(), "vs GT", reg, "T", T, "win", w, h, ":", hits.length, "frames");
console.log(hits.map((b) => `k${b.k}@${b.x},${b.y} in${b.inner} ring${b.outer}`).join("  "));
