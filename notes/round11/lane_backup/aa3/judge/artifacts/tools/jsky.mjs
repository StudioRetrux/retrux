// Sky / clouds / mountains: rows above the lane's region top (horizon line - margin) minus 6 px, hero mask excluded:
// |lane - base| stats and the 6 rows on either side of the region top (seam check).
import { loadSeq, bandFromMask } from "../../../aa3/tools/lib.mjs";
const [bd, ld] = process.argv.slice(2);
const B = loadSeq(bd), L = loadSeq(ld), W = B.W, H = B.H;
let n = 0, sum = 0, max = 0, n4 = 0, at = null;
const seam = new Float64Array(13), seamN = new Float64Array(13);
for (let k = 0; k < Math.min(B.n, L.n); k++) {
  const inf = L.meta.info[k];
  if (!inf.aa || inf.main[0] !== inf.W) continue;
  const P = inf.aa.plane;
  const m = B.mask(k); const { hero } = bandFromMask(m, W, H, 3);
  const fb = B.frame(k), fl = L.frame(k);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = x + 0.5, gy = inf.H - (y + B.y0) - 0.5;
    const top = -(P[0] * gx + P[2]) / P[1]; // gl y of the region top at this x
    const dyTop = (inf.H - top) - (y + B.y0); // > 0: above the region top (top-down)
    const i = y * W + x, p = i * 4;
    if (hero[i]) continue;
    const d = Math.max(Math.abs(fl[p] - fb[p]), Math.abs(fl[p + 1] - fb[p + 1]), Math.abs(fl[p + 2] - fb[p + 2]));
    if (dyTop > 6) { n++; sum += d; if (d > 4) n4++; if (d > max) { max = d; at = [k, x, y + B.y0]; } }
    const r = Math.round(-dyTop);
    if (r >= -6 && r <= 6) { seam[r + 6] += d; seamN[r + 6]++; }
  }
}
console.log(JSON.stringify({ px: n, mean: +(sum / n).toFixed(4), n4, max, at }));
console.log("rows around the region top (-6 above .. +6 below): " + [...seam].map((s, i) => (s / Math.max(1, seamN[i])).toFixed(3)).join(" "));
