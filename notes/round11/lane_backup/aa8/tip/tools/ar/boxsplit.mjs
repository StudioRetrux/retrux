// Change split: px-frames with |luma A - luma B| > T inside a box vs outside it (A darker / A brighter), and the box's pale excess
//   node boxsplit.mjs A B T x0,y0,x1,y1 [k0,k1]
import { loadSeq, luma8 } from "./lib.mjs";
const [da, db, Ts, bx, kr] = process.argv.slice(2);
const A = loadSeq(da), B = loadSeq(db), T = +Ts;
const [x0, y0, x1, y1] = bx.split(",").map(Number);
const W = A.W, H = A.H, Y0 = A.y0;
const [k0, k1] = kr ? kr.split(",").map(Number) : [0, Math.min(A.n, B.n) - 1];
let inD = 0, inB = 0, outD = 0, outB = 0, maxOut = 0;
for (let k = k0; k <= k1; k++) {
  const fa = A.frame(k), fb = B.frame(k);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const d = luma8(fa[i], fa[i + 1], fa[i + 2]) - luma8(fb[i], fb[i + 1], fb[i + 2]);
    if (Math.abs(d) <= T) continue;
    const inside = x >= x0 && x < x1 && y + Y0 >= y0 && y + Y0 < y1;
    if (inside) { if (d < 0) inD++; else inB++; } else { if (d < 0) outD++; else outB++; if (Math.abs(d) > maxOut) maxOut = Math.abs(d); }
  }
}
console.log(`${da.split("/").slice(-1)} vs ${db.split("/").slice(-1)} T${T} k${k0}-${k1}: box darker ${inD} brighter ${inB} | outside darker ${outD} brighter ${outB} max ${maxOut.toFixed(0)}`);
