// E2 edge pixels (3x3 holds lake bit0 and not-lake), split by the pixel's own class; error vs GT per sequence
import { loadSeq, bandFromMask } from "./lib.mjs";
const [maskDir, gtDir, strideS, ...seqArgs] = process.argv.slice(2);
const M = loadSeq(maskDir), G = loadSeq(gtDir); const W = M.W, H = M.H, stride = +strideS;
const seqs = seqArgs.map((a) => { const [n, d] = a.split("="); return { n, s: loadSeq(d), acc: { lake: [0, 0], solid: [0, 0], mixedL: [0, 0] } }; });
const N = Math.min(M.n, G.n, ...seqs.map((q) => q.s.n), 121);
for (let k = 1; k < N; k += stride) {
  const m = M.mask(k); const { hero } = bandFromMask(m, W, H, 3); const g = G.frame(k);
  const lk = (i) => (m[i] & 1) === 1;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x; if (hero[i]) continue;
    let l = 0, s = 0, nl = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = i + dy * W + dx; if (lk(j)) { l = 1; nl++; } else s = 1; }
    if (!(l && s)) continue;
    const cls = lk(i) ? (nl >= 7 ? "lake" : "mixedL") : "solid";
    for (const q of seqs) { const f = q.s.frame(k), p = i * 4; const e = Math.max(Math.abs(f[p] - g[p]), Math.abs(f[p + 1] - g[p + 1]), Math.abs(f[p + 2] - g[p + 2])); q.acc[cls][0]++; q.acc[cls][1] += e; }
  }
}
for (const q of seqs) console.log(q.n.padEnd(6), Object.entries(q.acc).map(([c, [n, e]]) => `${c} ${(e / Math.max(1, n)).toFixed(2)} (n ${n})`).join("   "));
