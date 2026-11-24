// fixer: per-frame count of px where seq A is brighter / darker than seq B by > T lv inside a box; + luma probes
//   node palecmp.mjs A B x0,y0,x1,y1 k0 k1 T [probe "k:x0-x1:y" ...] [--seqs C=dir,...]
import { loadSeq, luma8 } from "./lib.mjs";
const [a, b, box, k0s, k1s, Ts, ...probes] = process.argv.slice(2);
const A = loadSeq(a), B = loadSeq(b);
const [x0, y0, x1, y1] = box.split(",").map(Number), T = +Ts;
const L = (s, f, x, y) => { const i = ((y - s.y0) * s.W + x) * 4; return luma8(f[i], f[i + 1], f[i + 2]); };
let tb = 0, td = 0;
const rows = [];
for (let k = +k0s; k <= +k1s; k++) {
  const fa = A.frame(k), fb = B.frame(k);
  let nb = 0, nd = 0, mx = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const d = L(A, fa, x, y) - L(B, fb, x, y); if (d > T) nb++; if (d < -T) nd++; if (Math.abs(d) > Math.abs(mx)) mx = d; }
  tb += nb; td += nd; rows.push(`k${k} A>B+${T}: ${nb}  A<B-${T}: ${nd}  max ${mx.toFixed(1)}`);
}
console.log(`A=${a.split("/").pop()} B=${b.split("/").pop()} box ${box} k${k0s}-${k1s} T${T}`); console.log(rows.join("\n")); console.log(`total A>B ${tb}  A<B ${td}`);
for (const p of probes) { // "k:x0-x1:y:dir1,dir2,..."
  const [k, xs, y, dirs] = p.split(":"); const [px0, px1] = xs.split("-").map(Number);
  for (const d of dirs.split(",")) { const s = loadSeq(d), f = s.frame(+k); const v = []; for (let x = px0; x <= px1; x += 4) v.push(L(s, f, x, +y).toFixed(0)); console.log(`probe k${k} y${y} x${px0}-${px1}/4 ${d.split("/").pop().padEnd(5)} ${v.join(" ")}`); }
}
