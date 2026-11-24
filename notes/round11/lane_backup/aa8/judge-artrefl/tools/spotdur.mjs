// per frame: px in box (lake+band px of the mask) where SEQ is > T lv (luma) above the GT, for several seqs; prints frames with any
//   node spotdur.mjs MASK GT x0,y0,x1,y1 T NAME=SEQ ...
import { loadSeq } from "./lib.mjs";
const [md, gd, box, ts, ...rest] = process.argv.slice(2); const [x0, y0, x1, y1] = box.split(",").map(Number), T = +ts;
const G = loadSeq(gd); const S = rest.map((s) => { const [n, p] = s.split("="); return { n, s: loadSeq(p) }; });
const n = Math.min(G.n, ...S.map((q) => q.s.n)); const lum = (f, p) => 0.2126 * f[p] + 0.7152 * f[p + 1] + 0.0722 * f[p + 2];
const tot = S.map(() => [0, 0]); const lines = [];
for (let k = 0; k < n; k++) {
  const fg = G.frame(k); const row = [];
  S.forEach((q, j) => { const f = q.s.frame(k); let c = 0, sum = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const pg = ((y - G.y0) * G.W + x) * 4, pq = ((y - q.s.y0) * q.s.W + x) * 4; const d = lum(f, pq) - lum(fg, pg); if (d > T) { c++; sum += d; } } row.push(c ? `${c}px+${(sum / c).toFixed(0)}` : "-"); if (c) { tot[j][0]++; tot[j][1] += c; } });
  if (row.some((r) => r !== "-")) lines.push(`k${k} ` + S.map((q, j) => `${q.n}:${row[j]}`).join(" "));
}
console.log(`box ${box} thr ${T}: frames with px > thr above GT / px-frames: ` + S.map((q, j) => `${q.n} ${tot[j][0]} / ${tot[j][1]}`).join(", "));
console.log(lines.join("\n"));
