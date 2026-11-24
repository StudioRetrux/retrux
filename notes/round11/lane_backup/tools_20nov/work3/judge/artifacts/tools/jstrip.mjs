// Frame strips with diff columns: rows = frames, columns = sequences, then |A - B| heat columns for the listed pairs.
//   node jstrip.mjs --crop x0,y0,x1,y1 --ks 10,11,12 (or --k0 --k1 --step) --zoom 3 --out F.png --diff 1-0,1-2 SEQ0 SEQ1 SEQ2
//   (crop in full-frame coords; --gain g: heat = |d| * g / 255, default 16 lv = full)
import { loadSeq, png, cropRGBA } from "../../../aa3/tools/lib.mjs";
const argv = process.argv.slice(2);
const opt = {}; const seqs = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else seqs.push(loadSeq(argv[i])); }
const [x0, y0, x1, y1] = opt.crop.split(",").map(Number);
let ks = [];
if (opt.ks) ks = opt.ks.split(",").map(Number);
else for (let k = +opt.k0; k <= +opt.k1; k += +(opt.step || 1)) ks.push(k);
const pairs = (opt.diff || "").split(",").filter(Boolean).map((s) => s.split("-").map(Number));
const full = +(opt.full || 16);
const cw = x1 - x0, ch = y1 - y0, gap = 3, cols = seqs.length + pairs.length;
const W = cols * cw + (cols - 1) * gap, H = ks.length * ch + (ks.length - 1) * gap;
const img = new Uint8Array(W * H * 4).fill(255);
const put = (cr, r, c) => { for (let y = 0; y < ch; y++) img.set(cr.subarray(y * cw * 4, (y + 1) * cw * 4), ((r * (ch + gap) + y) * W + c * (cw + gap)) * 4); };
const stats = [];
ks.forEach((k, r) => {
  const crs = seqs.map((s) => cropRGBA(s.frame(k), s.W, [x0, y0 - s.y0, x1, y1 - s.y0]));
  crs.forEach((cr, c) => put(cr, r, c));
  pairs.forEach(([a, b], j) => {
    const A = crs[a], B = crs[b], o = new Uint8Array(cw * ch * 4);
    let n4 = 0, mx = 0;
    for (let i = 0; i < cw * ch; i++) {
      const p = i * 4;
      const d = Math.max(Math.abs(A[p] - B[p]), Math.abs(A[p + 1] - B[p + 1]), Math.abs(A[p + 2] - B[p + 2]));
      if (d > 4) n4++;
      mx = Math.max(mx, d);
      const l = (0.2126 * B[p] + 0.7152 * B[p + 1] + 0.0722 * B[p + 2]) * 0.35;
      const h = Math.min(1, d / full);
      o[p] = Math.min(255, l + 255 * h); o[p + 1] = Math.min(255, l + 140 * h); o[p + 2] = l * (1 - h); o[p + 3] = 255;
    }
    stats.push(`k${k} ${a}-${b}: >4 ${n4} max ${mx}`);
    put(o, r, seqs.length + j);
  });
});
png(img, W, H, opt.out, { zoom: +(opt.zoom || 3) });
console.log("wrote", opt.out, ks.length, "rows x", cols, "cols");
if (opt.v) console.log(stats.join("\n"));
