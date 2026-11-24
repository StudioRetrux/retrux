// Frame strips: rows = frames k0..k1 (step), columns = sequences; each cell a crop (full-frame coords), zoomed (nearest).
//   node strip.mjs --crop x0,y0,x1,y1 --k0 K --k1 K --step 1 --zoom 3 --out FILE.png SEQ1 SEQ2 ...
import { loadSeq, png, cropRGBA } from "./lib.mjs";
const argv = process.argv.slice(2);
const opt = {}; const seqs = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else seqs.push(loadSeq(argv[i])); }
const [x0, y0, x1, y1] = opt.crop.split(",").map(Number);
const k0 = +opt.k0, k1 = +opt.k1, step = +(opt.step || 1);
const cw = x1 - x0, ch = y1 - y0, gap = 3;
const ks = [];
for (let k = k0; k <= k1; k += step) ks.push(k);
const W = seqs.length * cw + (seqs.length - 1) * gap, H = ks.length * ch + (ks.length - 1) * gap;
const img = new Uint8Array(W * H * 4).fill(255);
ks.forEach((k, r) => seqs.forEach((s, c) => {
  const cr = cropRGBA(s.frame(k), s.W, [x0, y0 - s.y0, x1, y1 - s.y0]);
  for (let y = 0; y < ch; y++) img.set(cr.subarray(y * cw * 4, (y + 1) * cw * 4), ((r * (ch + gap) + y) * W + c * (cw + gap)) * 4);
}));
png(img, W, H, opt.out, { zoom: +(opt.zoom || 3) });
console.log("wrote", opt.out, ks.length, "rows x", seqs.length);
