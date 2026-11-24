// byte identity of two cap sequences over their common frames: node same.mjs A B [k0 k1]
import { loadSeq } from "./lib.mjs";
const [a, b, k0s, k1s] = process.argv.slice(2);
const A = loadSeq(a), B = loadSeq(b);
const k0 = +(k0s || 0), k1 = Math.min(+(k1s || 1e9), A.n - 1, B.n - 1);
let frames = 0, px = 0, mx = 0, first = -1;
for (let k = k0; k <= k1; k++) {
  const x = A.frame(k), y = B.frame(k);
  let d = 0;
  for (let i = 0; i < x.length; i += 4) {
    const m = Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2]));
    if (m) { d++; if (m > mx) mx = m; }
  }
  if (d) { frames++; px += d; if (first < 0) first = k; }
}
console.log(`${a.split("/").pop()} vs ${b.split("/").pop()}: k ${k0}..${k1}: ${frames} frames differ, ${px} px total, max ${mx} lv, first ${first}`);
