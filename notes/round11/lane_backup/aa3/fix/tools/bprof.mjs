// mean luma(F - GT) in a rect per frame: node bprof.mjs GT x0,y0,x1,y1 k0 k1 SEQ...   (handles different y0)
import { loadSeq } from "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion/tools/lib.mjs";
const [g, r, k0, k1, ...ss] = process.argv.slice(2); const G = loadSeq(g); const S = ss.map(loadSeq); const [x0, y0, x1, y1] = r.split(",").map(Number);
const L = (f, i) => 0.2126 * f[i * 4] + 0.7152 * f[i * 4 + 1] + 0.0722 * f[i * 4 + 2];
console.log("k   " + ss.map((s) => s.split("/").pop().slice(0, 11).padStart(12)).join(""));
const tot = S.map(() => 0);
for (let k = +k0; k <= +k1; k++) { const R = G.frame(k); const v = S.map((s, si) => { if (k >= s.n) return "-"; const F = s.frame(k); let a = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { a += L(F, (y - s.y0) * s.W + x) - L(R, (y - G.y0) * G.W + x); n++; } tot[si] += Math.max(0, a / n); return (a / n).toFixed(1); }); console.log(String(k).padEnd(4) + v.map((x) => x.padStart(12)).join("")); }
console.log("sum+".padEnd(4) + tot.map((x) => x.toFixed(1).padStart(12)).join(""));
