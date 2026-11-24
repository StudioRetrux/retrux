// On the pixels where NEW differs from OLD by > T lv: mean |NEW - REF| vs mean |OLD - REF| (luma), inside a box and outside it,
// and the share of those px where NEW is closer to REF.   node toward.mjs NEW OLD REF T x0,y0,x1,y1 [k0,k1]
import { loadSeq, luma8 } from "./lib.mjs";
const [dn, dold, dref, Ts, bx, kr] = process.argv.slice(2);
const N = loadSeq(dn), O = loadSeq(dold), R = loadSeq(dref), T = +Ts;
const [x0, y0, x1, y1] = bx.split(",").map(Number);
const W = N.W, H = N.H, Y0 = N.y0;
const [k0, k1] = kr ? kr.split(",").map(Number) : [0, Math.min(N.n, O.n, R.n) - 1];
const acc = { in: [0, 0, 0, 0], out: [0, 0, 0, 0] };
for (let k = k0; k <= k1; k++) {
  const fn = N.frame(k), fo = O.frame(k), fr = R.frame(k);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const ln = luma8(fn[i], fn[i + 1], fn[i + 2]), lo = luma8(fo[i], fo[i + 1], fo[i + 2]), lr = luma8(fr[i], fr[i + 1], fr[i + 2]);
    if (Math.abs(ln - lo) <= T) continue;
    const a = x >= x0 && x < x1 && y + Y0 >= y0 && y + Y0 < y1 ? acc.in : acc.out;
    a[0]++; a[1] += Math.abs(ln - lr); a[2] += Math.abs(lo - lr); if (Math.abs(ln - lr) < Math.abs(lo - lr)) a[3]++;
  }
}
const f = (a) => `${a[0]} px-frames, |new-ref| ${(a[1] / Math.max(1, a[0])).toFixed(1)} vs |old-ref| ${(a[2] / Math.max(1, a[0])).toFixed(1)}, new closer on ${((100 * a[3]) / Math.max(1, a[0])).toFixed(0)} %`;
console.log(`${dn.split("/").slice(-1)} vs ${dold.split("/").slice(-1)} (ref ${dref.split("/").slice(-1)}) T${T} k${k0}-${k1}\n  box: ${f(acc.in)}\n  outside: ${f(acc.out)}`);
