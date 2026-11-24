// pale-block detector without GT: per frame, in a box, 6x6 tiles whose mean luma rises > T over the previous frame while the
// tile's 4 neighbours (6 px away) rise < T/3 (a block popping in), for a sequence. Prints the frames / tiles found.
import { loadSeq } from "./lib.mjs";
const [d, regS, TS] = process.argv.slice(2); const S = loadSeq(d); const [x0, y0, x1, y1] = regS.split(",").map(Number); const T = +(TS || 10);
const L = (f, i) => 0.2126 * f[i * 4] + 0.7152 * f[i * 4 + 1] + 0.0722 * f[i * 4 + 2];
const tm = (f, x, y) => { let a = 0; for (let yy = y; yy < y + 6; yy++) for (let xx = x; xx < x + 6; xx++) a += L(f, (yy - S.y0) * S.W + xx); return a / 36; };
const hits = [];
for (let k = 1; k < S.n; k++) { const F = S.frame(k), P = S.frame(k - 1);
  for (let y = y0 + 6; y + 12 <= y1; y += 3) for (let x = x0 + 6; x + 12 <= x1; x += 3) { const d0 = tm(F, x, y) - tm(P, x, y); if (d0 < T) continue; const nb = [[x - 6, y], [x + 6, y], [x, y - 6], [x, y + 6]].map(([a, b]) => tm(F, a, b) - tm(P, a, b)); if (Math.max(...nb.map(Math.abs)) < T / 3) hits.push(`k${k}@${x},${y}:+${d0.toFixed(0)}`); } }
console.log(d.split("/").pop(), regS, hits.length, "hits"); console.log(hits.slice(0, 60).join(" "));
