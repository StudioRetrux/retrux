// prejudge-refl: many cluster strips in one PNG. Each cluster -> a block: rows = frames kc-1..kc+1 (or given), cols = sequences.
//   node mstrip.mjs --out F.png --zoom 4 --cw 48 --ch 20 --list "k:x:y[:k0:k1];..." SEQ...
// x, y = cluster centre (full-frame coords); blocks separated by a 6-px dark bar; a 1-px red tick marks the centre column.
import { loadSeq, png } from "./lib.mjs";
const argv = process.argv.slice(2); const opt = {}; const seqs = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else seqs.push(loadSeq(argv[i])); }
const cw = +(opt.cw || 48), ch = +(opt.ch || 20), gap = 2, bar = 6;
const items = opt.list.split(";").filter(Boolean).map((s) => s.split(":").map(Number));
const rowsPer = items.map((it) => (it.length >= 5 ? it[4] - it[3] + 1 : 3));
const Wd = seqs.length * cw + (seqs.length - 1) * gap;
const Hd = rowsPer.reduce((s, r) => s + r * ch + (r - 1) * gap, 0) + (items.length - 1) * bar;
const img = new Uint8Array(Wd * Hd * 4);
for (let i = 0; i < img.length; i += 4) { img[i] = 255; img[i + 1] = 255; img[i + 2] = 255; img[i + 3] = 255; }
let oy = 0;
items.forEach((it, b) => {
  const [kc, xc, yc] = it; const k0 = it.length >= 5 ? it[3] : kc - 1, k1 = it.length >= 5 ? it[4] : kc + 1;
  const x0 = Math.max(0, Math.round(xc - cw / 2)), y0 = Math.round(yc - ch / 2);
  for (let k = k0; k <= k1; k++) {
    seqs.forEach((s, c) => {
      const kk = Math.min(Math.max(k, 0), s.n - 1); const f = s.frame(kk);
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const sy = y0 + y - s.y0, sx = x0 + x; const o = ((oy + y) * Wd + c * (cw + gap) + x) * 4;
        if (sy < 0 || sy >= s.H || sx >= s.W) { img[o] = 255; img[o + 1] = 0; img[o + 2] = 255; continue; }
        const q = (sy * s.W + sx) * 4; img[o] = f[q]; img[o + 1] = f[q + 1]; img[o + 2] = f[q + 2]; img[o + 3] = 255;
      }
      // centre tick on top row of the cell
      const o = ((oy) * Wd + c * (cw + gap) + (xc - x0)) * 4; img[o] = 255; img[o + 1] = 0; img[o + 2] = 0;
    });
    oy += ch + gap;
  }
  oy += bar - gap;
  if (b < items.length - 1) for (let y = oy - bar + 1; y < oy - 1; y++) for (let x = 0; x < Wd; x++) { const o = (y * Wd + x) * 4; img[o] = 40; img[o + 1] = 40; img[o + 2] = 40; }
});
png(img, Wd, Hd, opt.out, { zoom: +(opt.zoom || 4) });
console.log("wrote", opt.out, items.length, "blocks", Wd, "x", Hd);
