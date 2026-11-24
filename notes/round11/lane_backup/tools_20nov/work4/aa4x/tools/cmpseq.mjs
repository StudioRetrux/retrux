// AA4X: frame-by-frame identity of two cap.mjs sequences (same path / rows): differing px, max level difference, poses.
//   node cmpseq.mjs SEQ_A SEQ_B [k1]
import { loadSeq } from "./lib.mjs";
const [a, b, k1] = process.argv.slice(2);
const A = loadSeq(a), B = loadSeq(b);
if (A.W !== B.W || A.H !== B.H || A.y0 !== B.y0) throw new Error("crop mismatch");
const n = Math.min(A.n, B.n, k1 ? +k1 + 1 : 1e9);
let tot = 0, maxd = 0, frames = 0, pose = 0;
for (let k = 0; k < n; k++) {
  const fa = A.frame(k), fb = B.frame(k);
  let d = 0;
  for (let i = 0; i < fa.length; i += 4) {
    const m = Math.max(Math.abs(fa[i] - fb[i]), Math.abs(fa[i + 1] - fb[i + 1]), Math.abs(fa[i + 2] - fb[i + 2]));
    if (m) {
      d++;
      if (m > maxd) maxd = m;
    }
  }
  if (d) frames++;
  tot += d;
  const pa = A.meta.info[k].pos, pb = B.meta.info[k].pos;
  pose = Math.max(pose, Math.abs(pa[0] - pb[0]), Math.abs(pa[1] - pb[1]), Math.abs(pa[2] - pb[2]));
}
console.log(`${n} frames: ${frames} differ, ${tot} px total, max ${maxd} levels; pose max diff ${pose}`);
