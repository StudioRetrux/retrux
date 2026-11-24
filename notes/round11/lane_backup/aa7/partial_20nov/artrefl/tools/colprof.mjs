// luma column profile at x over rows y0..y1 for frame k: node colprof.mjs K X Y0 Y1 NAME=SEQ ...
import { loadSeq } from "./lib.mjs";
const [k, x, a, b, ...rest] = process.argv.slice(2); const S = rest.map((s) => { const [n, p] = s.split("="); return [n, loadSeq(p)]; });
const lum = (f, q) => 0.2126 * f[q] + 0.7152 * f[q + 1] + 0.0722 * f[q + 2];
console.log("y    " + S.map(([n]) => n.padStart(6)).join(""));
for (let y = +a; y <= +b; y++) console.log(String(y).padEnd(5) + S.map(([n, s]) => { const f = s.frame(+k); return lum(f, ((y - s.y0) * s.W + +x) * 4).toFixed(0).padStart(6); }).join(""));
