// recheck: per-frame count of px where A is brighter (or darker) than BOTH B and C by > T lv inside a box (new pale / dark px vs two references)
//   node palenew.mjs A B C x0,y0,x1,y1 k0 k1 T
import { loadSeq, luma8 } from "./lib.mjs";
const [a, b, c, box, k0s, k1s, Ts] = process.argv.slice(2);
const A = loadSeq(a), B = loadSeq(b), C = loadSeq(c); const [x0, y0, x1, y1] = box.split(",").map(Number), T = +Ts;
const L = (s, f, x, y) => { const i = ((y - s.y0) * s.W + x) * 4; return luma8(f[i], f[i + 1], f[i + 2]); };
let tb = 0, td = 0; const rows = [];
for (let k = +k0s; k <= +k1s; k++) {
  const fa = A.frame(k), fb = B.frame(k), fc = C.frame(k); let nb = 0, nd = 0, bx = [1e9, 1e9, -1, -1];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const va = L(A, fa, x, y), vb = L(B, fb, x, y), vc = L(C, fc, x, y);
    if (va > vb + T && va > vc + T) { nb++; bx = [Math.min(bx[0], x), Math.min(bx[1], y), Math.max(bx[2], x), Math.max(bx[3], y)]; }
    if (va < vb - T && va < vc - T) nd++; }
  tb += nb; td += nd; rows.push(`k${k} brighter-than-both ${nb}${nb ? ` (bbox ${bx.join(",")})` : ""}  darker-than-both ${nd}`);
}
console.log(`A=${a.split("/").pop()} B=${b.split("/").pop()} C=${c.split("/").pop()} box ${box} k${k0s}-${k1s} T${T}`); console.log(rows.join("\n")); console.log(`total brighter-than-both ${tb}  darker-than-both ${td}`);
