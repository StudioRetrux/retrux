// per frame: pixels in a region where A is paler than B by > T (luma); bbox of the largest 8x8-tile cluster count
import { loadSeq } from "./lib.mjs";
const [a, b, regS, TS] = process.argv.slice(2); const A = loadSeq(a), B = loadSeq(b); const [x0, y0, x1, y1] = regS.split(",").map(Number); const T = +(TS || 12);
const L = (f, i) => 0.2126 * f[i * 4] + 0.7152 * f[i * 4 + 1] + 0.0722 * f[i * 4 + 2];
const out = [];
for (let k = 0; k < Math.min(A.n, B.n); k++) { const F = A.frame(k), G = B.frame(k); const tiles = new Map(); let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y - A.y0) * A.W + x; if (L(F, i) - L(G, i) > T) { n++; const key = ((y / 8) | 0) * 1000 + ((x / 8) | 0); tiles.set(key, (tiles.get(key) || 0) + 1); } }
  let best = 0, bk = 0; for (const [key, c] of tiles) if (c > best) { best = c; bk = key; }
  out.push({ k, n, best, tile: [(bk % 1000) * 8, ((bk / 1000) | 0) * 8] }); }
out.sort((p, q) => q.best - p.best);
console.log(a.split("/").pop(), "paler than", b.split("/").pop(), "T", T); console.log(out.slice(0, 25).map((o) => `k${o.k} n${o.n} tile${o.best}@${o.tile}`).join("  "));
