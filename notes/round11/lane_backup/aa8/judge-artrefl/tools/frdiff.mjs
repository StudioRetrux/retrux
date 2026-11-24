// per-frame: px differing (max channel > 0) between two sequences; prints run-length list of identical / differing frames
import { loadSeq } from "./lib.mjs";
const [ad, bd] = process.argv.slice(2); const A = loadSeq(ad), B = loadSeq(bd); const n = Math.min(A.n, B.n);
let out = [], prev = null, start = 0;
for (let k = 0; k <= n; k++) {
  let d = -1;
  if (k < n) { const fa = A.frame(k), fb = B.frame(k); d = 0; for (let i = 0; i < fa.length; i++) if (fa[i] !== fb[i]) { d = 1; break; } }
  if (k === n || (prev !== null && d !== prev)) { out.push(`k${start}-${k - 1}:${prev ? "DIFF" : "same"}`); start = k; }
  prev = d;
}
console.log(out.join(" "));
