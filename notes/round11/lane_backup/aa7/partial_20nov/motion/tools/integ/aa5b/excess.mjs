// Redraw-frame excess: per pixel, mean |dF| on frames where the lake mirror was redrawn minus the mean on the other frames
// (cap meta info.mirror; for a sequence without cadence use --ph 1: frames with k % 3 == 1). Heat = positive excess.
//   node excess.mjs --out FILE.png [--crop x0,y0,x1,y1] [--zoom 2] [--ph 1] SEQ1 SEQ2 ...
import { loadSeq, png, hstack, cropRGBA } from "./lib.mjs";
const argv = process.argv.slice(2);
const opt = {}; const seqs = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else seqs.push(loadSeq(argv[i])); }
const s0 = seqs[0], W = s0.W, H = s0.H;
let crop = opt.crop ? opt.crop.split(",").map(Number) : [0, s0.y0, W, s0.y0 + H];
crop = [crop[0], crop[1] - s0.y0, crop[2], crop[3] - s0.y0];
const imgs = [], sums = [];
for (const s of seqs) {
  const a = new Float32Array(W * H), b = new Float32Array(W * H);
  let na = 0, nb = 0;
  for (let k = 1; k < s.n; k++) {
    const red = opt.ph ? k % 3 === +opt.ph : s.meta.info[k].mirror > 0;
    const F = s.frame(k), P = s.frame(k - 1);
    const acc = red ? a : b;
    for (let i = 0; i < acc.length; i++) { const p = i * 4; acc[i] += Math.max(Math.abs(F[p] - P[p]), Math.abs(F[p + 1] - P[p + 1]), Math.abs(F[p + 2] - P[p + 2])); }
    if (red) na++; else nb++;
  }
  const base = s.frame(0), img = new Uint8Array(W * H * 4);
  let tot = 0;
  for (let i = 0; i < a.length; i++) {
    const e = a[i] / na - b[i] / nb;
    const y = Math.floor(i / W), x = i % W;
    if (x >= crop[0] && x < crop[2] && y >= crop[1] && y < crop[3]) tot += Math.max(0, e);
    const l = (0.2126 * base[i * 4] + 0.7152 * base[i * 4 + 1] + 0.0722 * base[i * 4 + 2]) * 0.45;
    const h = Math.min(1, Math.max(0, e) / 12);
    img[i * 4] = Math.min(255, l + 255 * h); img[i * 4 + 1] = Math.min(255, l + 200 * h * h); img[i * 4 + 2] = l * (1 - h); img[i * 4 + 3] = 255;
  }
  imgs.push(cropRGBA(img, W, crop)); sums.push(`${s.dir.split("/").pop()}: ${tot.toFixed(0)}`);
}
const st = hstack(imgs, crop[2] - crop[0], crop[3] - crop[1], 4);
png(st.img, st.W, st.H, opt.out, { zoom: +(opt.zoom || 1) });
console.log(sums.join("  "));
