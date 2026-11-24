// Mask visualisation: frame crop with lake (bit0) tinted blue, partial (bit1) red, hero (bit2) green; side by side for 2 seqs.
//   node maskimg.mjs --k K --crop x0,y0,x1,y1 --zoom Z --out F SEQ1 [SEQ2]
import { loadSeq, png, hstack, cropRGBA } from "./lib.mjs";
const argv = process.argv.slice(2); const opt = {}; const seqs = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else seqs.push(loadSeq(argv[i])); }
const [x0, y0, x1, y1] = opt.crop.split(",").map(Number); const k = +opt.k;
const imgs = seqs.map((s) => {
  const f = s.frame(k), m = s.mask(k);
  const o = new Uint8Array(f.length);
  for (let i = 0; i < m.length; i++) {
    const g = 0.3 * (f[i * 4] + f[i * 4 + 1] + f[i * 4 + 2]) / 3;
    o[i * 4] = (m[i] & 2 ? 230 : g) | 0; o[i * 4 + 1] = (m[i] & 4 ? 230 : g) | 0; o[i * 4 + 2] = (m[i] & 1 ? 200 : g) | 0; o[i * 4 + 3] = 255;
  }
  return cropRGBA(o, s.W, [x0, y0 - s.y0, x1, y1 - s.y0]);
});
const st = hstack(imgs, x1 - x0, y1 - y0, 4);
png(st.img, st.W, st.H, opt.out, { zoom: +(opt.zoom || 2) });
console.log("wrote", opt.out);
