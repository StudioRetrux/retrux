// judge-artrefl: side by side crops of frame k: 1x seqs (zoom Z) + a 2x GT seq (same area, zoom Z/2), 3-px white gaps, stacked
// for several crops (one row each). node gtcmp.mjs --k K --zoom Z --crops "x0,y0,x1,y1;..." --gt2 DIR --out F.png SEQ ...
import { loadSeq, png } from "./lib.mjs";
const argv = process.argv.slice(2); const opt = {}; const seqs = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else seqs.push(loadSeq(argv[i])); }
const Z = +opt.zoom, k = +opt.k, G2 = opt.gt2 ? loadSeq(opt.gt2) : null, gap = 3;
const crops = opt.crops.split(";").filter(Boolean).map((s) => s.split(",").map(Number));
const blocks = crops.map(([x0, y0, x1, y1]) => {
  const cw = (x1 - x0) * Z, ch = (y1 - y0) * Z, n = seqs.length + (G2 ? 1 : 0), w = n * cw + (n - 1) * gap;
  const o = new Uint8Array(w * ch * 4).fill(255);
  const put = (s, sx0, sy0, z, col) => { const f = s.frame(Math.min(k, s.n - 1));
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const xs = sx0 + Math.floor(x / z), ys = sy0 + Math.floor(y / z) - s.y0; const q = (ys * s.W + xs) * 4, p = (y * w + col * (cw + gap) + x) * 4; o[p] = f[q]; o[p + 1] = f[q + 1]; o[p + 2] = f[q + 2]; o[p + 3] = 255; } };
  seqs.forEach((s, c) => put(s, x0, y0, Z, c));
  if (G2) put(G2, x0 * 2, y0 * 2, Z / 2, seqs.length);
  return { o, w, ch };
});
const Wt = Math.max(...blocks.map((b) => b.w)), Ht = blocks.reduce((s, b) => s + b.ch, 0) + (blocks.length - 1) * 6;
const img = new Uint8Array(Wt * Ht * 4).fill(40); let yy = 0;
for (const b of blocks) { for (let y = 0; y < b.ch; y++) img.set(b.o.subarray(y * b.w * 4, (y + 1) * b.w * 4), ((yy + y) * Wt) * 4); yy += b.ch + 6; }
png(img, Wt, Ht, opt.out); console.log("wrote", opt.out, Wt + "x" + Ht);
