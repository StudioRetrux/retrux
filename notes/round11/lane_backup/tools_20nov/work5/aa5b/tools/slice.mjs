// AA3 time slices and frame crops for visual checks.
//   node slice.mjs --out FILE.png --row Y --x0 X0 --x1 X1 [--k0 0 --k1 N] [--zoom 3] SEQ1 SEQ2 ...
//     one time slice per sequence (x across, frames down), stacked side by side (gap 4 px)
//   node slice.mjs --crop x0,y0,x1,y1 --k K [--zoom 3] --out FILE.png SEQ1 SEQ2 ...   frame crops side by side
//   (y in full-frame coordinates; sequences cropped by rows are offset automatically)
import { loadSeq, png, hstack, cropRGBA } from "./lib.mjs";

const argv = process.argv.slice(2);
const opt = {};
const seqs = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i];
  else seqs.push(loadSeq(argv[i]));
}
const zoom = +(opt.zoom || 3);
if (opt.row) {
  const y = +opt.row, x0 = +opt.x0, x1 = +opt.x1;
  const k0 = +(opt.k0 || 0), k1 = Math.min(+(opt.k1 || 1e9), ...seqs.map((s) => s.n));
  const w = x1 - x0, h = k1 - k0;
  const imgs = seqs.map((s) => {
    const o = new Uint8Array(w * h * 4);
    for (let k = k0; k < k1; k++) {
      const f = s.frame(k);
      const yy = y - s.y0;
      o.set(f.subarray((yy * s.W + x0) * 4, (yy * s.W + x1) * 4), (k - k0) * w * 4);
    }
    return o;
  });
  const st = hstack(imgs, w, h, 4);
  png(st.img, st.W, st.H, opt.out, { zoom });
} else {
  const [x0, y0, x1, y1] = opt.crop.split(",").map(Number);
  const k = +opt.k;
  const imgs = seqs.map((s) => cropRGBA(s.frame(k), s.W, [x0, y0 - s.y0, x1, y1 - s.y0]));
  const st = hstack(imgs, x1 - x0, y1 - y0, 4);
  png(st.img, st.W, st.H, opt.out, { zoom });
}
console.log("wrote", opt.out);
