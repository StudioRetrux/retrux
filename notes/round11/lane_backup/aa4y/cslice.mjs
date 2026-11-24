// column time slices: for column X, rows Y0..Y1 (full-frame coords) over frames K0..K1: time across, y down; sequences stacked
//   node cslice.mjs --out F.png --col X --y0 A --y1 B [--k0 0 --k1 N] [--zoom 3] [--avg 1] SEQ...   (--avg n: mean of columns X..X+n-1)
import { loadSeq, png, vstack } from "./lib.mjs";
const argv = process.argv.slice(2);
const opt = {}; const seqs = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else seqs.push(loadSeq(argv[i])); }
const X = +opt.col, Y0 = +opt.y0, Y1 = +opt.y1, k0 = +(opt.k0 || 0), k1 = Math.min(+(opt.k1 || 1e9), ...seqs.map((s) => s.n)), zoom = +(opt.zoom || 3), avg = +(opt.avg || 1);
const w = k1 - k0, h = Y1 - Y0;
const imgs = seqs.map((s) => {
  const o = new Uint8Array(w * h * 4);
  for (let k = k0; k < k1; k++) {
    const f = s.frame(k);
    for (let y = Y0; y < Y1; y++) for (let c = 0; c < 4; c++) {
      let v = 0; for (let a = 0; a < avg; a++) v += f[((y - s.y0) * s.W + X + a) * 4 + c];
      o[((y - Y0) * w + (k - k0)) * 4 + c] = c === 3 ? 255 : Math.round(v / avg);
    }
  }
  return o;
});
const st = vstack(imgs, w, h, 3);
png(st.img, st.W, st.H, opt.out, { zoom });
console.log("wrote", opt.out);
