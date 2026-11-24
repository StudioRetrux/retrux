// mean luma(F - GT) over a rect per frame for several sequences: node blockprof.mjs GT x0,y0,x1,y1 k0 k1 SEQ...
import { loadSeq } from "./lib.mjs";
const [g, r, k0, k1, ...ss] = process.argv.slice(2); const G = loadSeq(g); const S = ss.map(loadSeq); const [x0, y0, x1, y1] = r.split(",").map(Number);
const L = (f, i) => 0.2126 * f[i * 4] + 0.7152 * f[i * 4 + 1] + 0.0722 * f[i * 4 + 2];
let line = "k   " + ss.map((s) => s.split("/").pop().padStart(14)).join("");
console.log(line);
for (let k = +k0; k <= +k1; k++) { const R = G.frame(k); const v = S.map((s) => { const F = s.frame(k); let a = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y - s.y0) * s.W + x; a += L(F, i) - L(R, i); n++; } return (a / n).toFixed(1); }); console.log(String(k).padEnd(4) + v.map((x) => x.padStart(14)).join("")); }
