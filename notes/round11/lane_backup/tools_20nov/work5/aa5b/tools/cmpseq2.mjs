// Compare two cap sequences on their common rows / frames: differing px count and max diff per frame (summary).
//   node cmpseq2.mjs A B [--k0 0 --k1 N] [--box x0,y0,x1,y1]
import { loadSeq } from "./lib.mjs";
const argv = process.argv.slice(2);
const opt = {}; const seqs = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else seqs.push(loadSeq(argv[i])); }
const [A, B] = seqs;
const y0 = Math.max(A.y0, B.y0), y1 = Math.min(A.y0 + A.H, B.y0 + B.H);
let [bx0, by0, bx1, by1] = opt.box ? opt.box.split(",").map(Number) : [0, y0, A.W, y1];
by0 = Math.max(by0, y0); by1 = Math.min(by1, y1);
const k0 = +(opt.k0 || 0), k1 = Math.min(+(opt.k1 || 1e9), A.n, B.n);
let tot = 0, totMax = 0, framesDiff = 0;
for (let k = k0; k < k1; k++) {
  const a = A.frame(k), b = B.frame(k);
  let n = 0, mx = 0;
  for (let y = by0; y < by1; y++) for (let x = bx0; x < bx1; x++) {
    const ia = ((y - A.y0) * A.W + x) * 4, ib = ((y - B.y0) * B.W + x) * 4;
    const d = Math.max(Math.abs(a[ia] - b[ib]), Math.abs(a[ia + 1] - b[ib + 1]), Math.abs(a[ia + 2] - b[ib + 2]));
    if (d) { n++; if (d > mx) mx = d; }
  }
  tot += n; if (mx > totMax) totMax = mx; if (n) framesDiff++;
}
console.log(`rows ${by0}-${by1} x ${bx0}-${bx1} frames ${k0}-${k1}: ${framesDiff} frames differ, ${tot} px differ, max ${totMax}`);
