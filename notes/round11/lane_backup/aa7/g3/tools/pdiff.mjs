// pdiff.mjs A B [--k0 0 --k1 n --thr 4 --box x0,y0,x1,y1]: per frame px with |luma(B) - luma(A)| > thr: count, signed mean,
// bbox, max (B - A); totals. Sequences: cap.mjs / jcap.mjs dirs (lib.mjs).
import { loadSeq } from "./lib.mjs";
const argv = process.argv.slice(2); const [a, b] = argv; const opt = {};
for (let i = 2; i < argv.length; i++) if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i];
const A = loadSeq(a), B = loadSeq(b); const W = A.W, H = A.H, Y0 = A.y0;
const k0 = +(opt.k0 || 0), k1 = Math.min(+(opt.k1 || 1e9), A.n, B.n), thr = +(opt.thr || 4);
const box = (opt.box || `0,${Y0},${W},${Y0 + H}`).split(",").map(Number);
const L = (f, i) => 0.2126 * f[i] + 0.7152 * f[i + 1] + 0.0722 * f[i + 2];
let tot = 0, totPos = 0, totNeg = 0, frames = 0;
for (let k = k0; k < k1; k++) {
  const fa = A.frame(k), fb = B.frame(k); let n = 0, s = 0, mx = 0, mn = 0, bb = [1e9, 1e9, -1, -1];
  for (let y = Math.max(box[1], Y0); y < Math.min(box[3], Y0 + H); y++) for (let x = box[0]; x < box[2]; x++) {
    const i = ((y - Y0) * W + x) * 4; const d = L(fb, i) - L(fa, i);
    if (Math.abs(d) > thr) { n++; s += d; if (d > 0) totPos++; else totNeg++; mx = Math.max(mx, d); mn = Math.min(mn, d); bb = [Math.min(bb[0], x), Math.min(bb[1], y), Math.max(bb[2], x), Math.max(bb[3], y)]; }
  }
  tot += n; if (n) frames++;
  if (n && !opt.quiet) console.log(`k${k} n ${n} mean ${(s / n).toFixed(1)} max +${mx.toFixed(0)} min ${mn.toFixed(0)} bbox x${bb[0]}-${bb[2]} y${bb[1]}-${bb[3]}`);
}
console.log(`TOTAL ${a.split("/").pop()} -> ${b.split("/").pop()} k${k0}-${k1 - 1} box ${box.join(",")} thr ${thr}: ${tot} px in ${frames} frames (brighter ${totPos}, darker ${totNeg})`);
