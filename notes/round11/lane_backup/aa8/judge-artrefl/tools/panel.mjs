// prejudge-refl: vertical panels of one frame k for several sequences over rows y0..y1 (full-frame coords) and x0..x1, plus a
// signed luma diff panel of SEQ[1] - SEQ[0] (red = darker, green = brighter; |d| <= 2 shown grey), optional zoom.
//   node panel.mjs --k K --crop x0,y0,x1,y1 [--zoom 1] [--gain 4] --out F.png SEQ0 SEQ1 [SEQ2 ...]
import { loadSeq, png } from "./lib.mjs";
const argv = process.argv.slice(2); const opt = {}; const seqs = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else seqs.push(loadSeq(argv[i])); }
const [x0, y0, x1, y1] = opt.crop.split(",").map(Number); const k = +opt.k, gain = +(opt.gain || 4);
const cw = x1 - x0, ch = y1 - y0, gap = 3, n = seqs.length + 1;
const Hd = n * ch + (n - 1) * gap; const img = new Uint8Array(cw * Hd * 4).fill(255);
const lum = (f, q) => 0.2126 * f[q] + 0.7152 * f[q + 1] + 0.0722 * f[q + 2];
const fr = seqs.map((s) => s.frame(Math.min(k, s.n - 1)));
seqs.forEach((s, c) => {
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const q = ((y0 + y - s.y0) * s.W + x0 + x) * 4, o = ((c * (ch + gap) + y) * cw + x) * 4;
    img[o] = fr[c][q]; img[o + 1] = fr[c][q + 1]; img[o + 2] = fr[c][q + 2]; img[o + 3] = 255;
  }
});
const a = seqs[0], b = seqs[1];
for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
  const qa = ((y0 + y - a.y0) * a.W + x0 + x) * 4, qb = ((y0 + y - b.y0) * b.W + x0 + x) * 4;
  const d = lum(fr[1], qb) - lum(fr[0], qa); const o = ((seqs.length * (ch + gap) + y) * cw + x) * 4;
  const v = Math.min(255, Math.abs(d) * gain);
  if (Math.abs(d) <= 2) { img[o] = 128; img[o + 1] = 128; img[o + 2] = 128; }
  else if (d < 0) { img[o] = 128 + v / 2; img[o + 1] = 128 - v / 2; img[o + 2] = 128 - v / 2; }
  else { img[o] = 128 - v / 2; img[o + 1] = 128 + v / 2; img[o + 2] = 128 - v / 2; }
  img[o + 3] = 255;
}
png(img, cw, Hd, opt.out, { zoom: +(opt.zoom || 1) });
console.log("wrote", opt.out);
