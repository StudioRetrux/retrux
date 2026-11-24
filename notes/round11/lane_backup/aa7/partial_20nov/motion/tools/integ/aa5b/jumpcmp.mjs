// Frame-to-frame jumps of X vs R without a GT: px where |dX| - |dR| > t (X jumps more) and |dR| - |dX| > t (R jumps more).
//   node jumpcmp.mjs X R [--t 40] [--box x0,y0,x1,y1]
import { loadSeq } from "./lib.mjs";
const argv = process.argv.slice(2); const opt = {}; const s = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else s.push(loadSeq(argv[i])); }
const [X, R] = s; const t = +(opt.t || 40);
const [x0, y0, x1, y1] = opt.box ? opt.box.split(",").map(Number) : [0, X.y0, X.W, X.y0 + X.H];
const md = (a, b, i) => Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
let nx = 0, nr = 0; const perK = [];
for (let k = 1; k < Math.min(X.n, R.n); k++) {
  const a1 = X.frame(k), a0 = X.frame(k - 1), b1 = R.frame(k), b0 = R.frame(k - 1);
  let cx = 0, cr = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = ((y - X.y0) * X.W + x) * 4;
    const dx = md(a1, a0, i), dr = md(b1, b0, i);
    if (dx - dr > t) cx++; else if (dr - dx > t) cr++;
  }
  nx += cx; nr += cr; perK.push([k, cx, cr]);
}
perK.sort((p, q) => q[1] - p[1]);
console.log(`X jumps more: ${nx} px, R jumps more: ${nr} px; worst X frames: ${perK.slice(0, 5).map((p) => p.join("/")).join(" ")}`);
