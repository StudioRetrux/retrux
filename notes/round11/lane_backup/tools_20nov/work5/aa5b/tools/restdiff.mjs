// Per-frame differences X vs R (rest identity): px > 0, > 4, > 16 lv (max channel), max; bbox of > 4 lv; optional diff image of one frame.
//   node restdiff.mjs X R [--k 30] [--img out.png --crop x0,y0,x1,y1 --zoom 3]
import { loadSeq, png, hstack, cropRGBA } from "./lib.mjs";
const argv = process.argv.slice(2); const opt = {}; const s = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else s.push(loadSeq(argv[i])); }
const [X, R] = s;
const n = Math.min(X.n, R.n);
let tot = { a: 0, b: 0, c: 0, mx: 0 }; let bb = [1e9, 1e9, -1, -1];
for (let k = 0; k < n; k++) {
  const a = X.frame(k), b = R.frame(k);
  for (let y = 0; y < X.H; y++) for (let x = 0; x < X.W; x++) {
    const i = (y * X.W + x) * 4;
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
    if (d > 0) tot.a++; if (d > 4) { tot.b++; bb = [Math.min(bb[0], x), Math.min(bb[1], y + X.y0), Math.max(bb[2], x), Math.max(bb[3], y + X.y0)]; } if (d > 16) tot.c++; if (d > tot.mx) tot.mx = d;
  }
}
console.log(`${n} frames: per frame px>0 ${(tot.a / n).toFixed(0)}, >4 ${(tot.b / n).toFixed(1)}, >16 ${(tot.c / n).toFixed(1)}, max ${tot.mx}; bbox(>4) x${bb[0]}-${bb[2]} y${bb[1]}-${bb[3]}`);
if (opt.img) {
  const k = +(opt.k || 0); const [x0, y0, x1, y1] = opt.crop.split(",").map(Number);
  const a = X.frame(k), b = R.frame(k);
  const d = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i += 4) { const v = Math.min(255, 8 * Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]))); d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255; }
  const cr = (f, S) => cropRGBA(f, S.W, [x0, y0 - S.y0, x1, y1 - S.y0]);
  const st = hstack([cr(b, R), cr(a, X), cr(d, X)], x1 - x0, y1 - y0, 4);
  png(st.img, st.W, st.H, opt.img, { zoom: +(opt.zoom || 2) });
  console.log("wrote", opt.img);
}
