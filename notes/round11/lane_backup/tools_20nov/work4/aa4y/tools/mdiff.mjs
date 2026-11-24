// where did MLAA act? A vs B per frame: px changed (> 0, > 4, > 16 lv), max; amplified diff PNG of one frame (crop)
import { loadSeq, png } from "./lib.mjs";
const [da, db, kS, out, cropS] = process.argv.slice(2);
const A = loadSeq(da), B = loadSeq(db);
const N = Math.min(A.n, B.n);
let tot = [0, 0, 0], mx = 0, per = [];
for (let k = 0; k < N; k++) {
  const fa = A.frame(k), fb = B.frame(k); let c = [0, 0, 0];
  for (let i = 0; i < fa.length; i += 4) { const d = Math.max(Math.abs(fa[i] - fb[i]), Math.abs(fa[i + 1] - fb[i + 1]), Math.abs(fa[i + 2] - fb[i + 2])); if (d > 0) c[0]++; if (d > 4) c[1]++; if (d > 16) c[2]++; if (d > mx) mx = d; }
  tot = tot.map((v, j) => v + c[j]); per.push(c[0]);
}
console.log(`frames ${N}: px/frame changed >0 ${(tot[0] / N).toFixed(0)}, >4 ${(tot[1] / N).toFixed(0)}, >16 ${(tot[2] / N).toFixed(0)}, max ${mx}; first frames: ${per.slice(0, 10).join(" ")}`);
if (out) {
  const k = +kS, fa = A.frame(k), fb = B.frame(k), o = new Uint8Array(fa.length);
  for (let i = 0; i < fa.length; i += 4) { for (let c = 0; c < 3; c++) o[i + c] = Math.max(0, Math.min(255, 128 + 4 * (fa[i + c] - fb[i + c]))); o[i + 3] = 255; }
  const crop = cropS ? cropS.split(",").map(Number) : null;
  png(o, A.W, A.H, out, crop ? { crop: [crop[0], crop[1] - A.y0, crop[2], crop[3] - A.y0], zoom: 3 } : {});
  console.log("wrote", out);
}
