// pale-block finder: per frame, pixels in a region where SEQ is paler than GT by > T (luma), connected bbox stats
import { loadSeq } from "./lib.mjs";
const [a, g, regS, k0S, k1S, TS] = process.argv.slice(2);
const A = loadSeq(a), G = loadSeq(g); const [x0, y0, x1, y1] = regS.split(",").map(Number); const T = +(TS || 10);
const L = (f, i) => 0.2126 * f[i * 4] + 0.7152 * f[i * 4 + 1] + 0.0722 * f[i * 4 + 2];
const rows = [];
for (let k = +k0S; k <= +k1S; k++) {
  const F = A.frame(k), R = G.frame(k); let n = 0, sum = 0, mx = 0, bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y - A.y0) * A.W + x; const d = L(F, i) - L(R, i); if (d > T) { n++; sum += d; mx = Math.max(mx, d); bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); } }
  rows.push(`k${k}: n ${n} mean ${(n ? sum / n : 0).toFixed(1)} max ${mx.toFixed(1)} bbox ${n ? [bx0, by0, bx1, by1].join(",") : "-"}`);
}
console.log(a.split("/").pop(), "vs", g.split("/").pop(), regS, "T", T); console.log(rows.join("\n"));
