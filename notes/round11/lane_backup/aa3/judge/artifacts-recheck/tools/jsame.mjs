// Byte identity of two capture sequences (same case): frames identical / differing, max |d|, px > 4.
//   node jsame.mjs A B
import { loadSeq } from "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/aa3/tools/lib.mjs";
const [a, b] = process.argv.slice(2);
const A = loadSeq(a), B = loadSeq(b);
if (A.W !== B.W || A.H !== B.H) { console.log("size differs", A.W, A.H, B.W, B.H); process.exit(0); }
let same = 0, diff = 0, mx = 0, n4 = 0; const first = [];
for (let k = 0; k < Math.min(A.n, B.n); k++) {
  const fa = A.frame(k), fb = B.frame(k);
  let m = 0, c4 = 0;
  for (let i = 0; i < fa.length; i += 4) { const d = Math.max(Math.abs(fa[i] - fb[i]), Math.abs(fa[i + 1] - fb[i + 1]), Math.abs(fa[i + 2] - fb[i + 2])); if (d > m) m = d; if (d > 4) c4++; }
  if (m === 0) same++; else { diff++; if (first.length < 6) first.push(`k${k}:max${m}/>4:${c4}`); }
  mx = Math.max(mx, m); n4 += c4;
}
console.log(JSON.stringify({ a, b, frames: Math.min(A.n, B.n), same, diff, max: mx, px4: n4, first }));
