// px where |X-R| > t in frame k within crop: node dpx.mjs K x0,y0,x1,y1 T X=SEQ R=SEQ [more=SEQ ...]  (prints luma of all)
import { loadSeq } from "./lib.mjs";
const [k, crop, t, ...rest] = process.argv.slice(2); const S = rest.map((s) => { const [n, p] = s.split("="); return [n, loadSeq(p)]; });
const [x0, y0, x1, y1] = crop.split(",").map(Number); const lum = (f, q) => 0.2126 * f[q] + 0.7152 * f[q + 1] + 0.0722 * f[q + 2];
const F = S.map(([n, s]) => s.frame(+k)); let c = 0;
for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
  const v = S.map(([n, s], j) => lum(F[j], ((y - s.y0) * s.W + x) * 4));
  if (Math.abs(v[0] - v[1]) > +t) { if (c++ < 40) console.log(`x${x} y${y} ` + S.map(([n], j) => `${n} ${v[j].toFixed(0)}`).join("  ")); }
}
console.log("count", c);
