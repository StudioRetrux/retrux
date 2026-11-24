// Jump map: per pixel, the number of frames with |dF| > T (max channel), as a heat overlay on frame k0 (dimmed).
//   node jumpmap.mjs --out FILE.png [--t 32] [--k0 1] [--k1 N] [--crop x0,y0,x1,y1] [--zoom 1] [--mc] SEQ1 [SEQ2 ...]
//   --mod3: three maps, one per frame phase (k mod 3), for the periodic flash
import { loadSeq, png, hstack, cropRGBA } from "./lib.mjs";

const argv = process.argv.slice(2);
const opt = {};
const seqs = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--mod3") opt.mod3 = "1";
  else if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i];
  else seqs.push(loadSeq(argv[i]));
}
const T = +(opt.t || 32);
const k0 = +(opt.k0 || 1);
const k1 = Math.min(+(opt.k1 || 1e9), ...seqs.map((s) => s.n));
const s0 = seqs[0];
const W = s0.W, H = s0.H;
const maps = [];
const totals = [];
for (const s of seqs) {
  const phases = opt.mod3 ? [0, 1, 2] : [-1];
  for (const ph of phases) {
    const cnt = new Uint16Array(W * H);
    let tot = 0;
    for (let k = k0; k < k1; k++) {
      if (ph >= 0 && k % 3 !== ph) continue;
      const F = s.frame(k), P = s.frame(k - 1);
      for (let i = 0; i < cnt.length; i++) {
        const p = i * 4;
        const d = Math.max(Math.abs(F[p] - P[p]), Math.abs(F[p + 1] - P[p + 1]), Math.abs(F[p + 2] - P[p + 2]));
        if (d > T) {
          cnt[i]++;
          tot++;
        }
      }
    }
    const base = s.frame(k0);
    const img = new Uint8Array(W * H * 4);
    const nk = k1 - k0;
    for (let i = 0; i < cnt.length; i++) {
      const l = (0.2126 * base[i * 4] + 0.7152 * base[i * 4 + 1] + 0.0722 * base[i * 4 + 2]) * 0.45;
      const h = Math.min(1, cnt[i] / Math.max(4, nk * 0.12));
      img[i * 4] = Math.min(255, l + 255 * h);
      img[i * 4 + 1] = Math.min(255, l + 160 * h * h);
      img[i * 4 + 2] = l * (1 - h);
      img[i * 4 + 3] = 255;
    }
    maps.push(img);
    totals.push(`${s.dir.split("/").pop()}${ph >= 0 ? "/m" + ph : ""}: ${tot}`);
  }
}
let crop = opt.crop ? opt.crop.split(",").map(Number) : [0, s0.y0, W, s0.y0 + H];
crop = [crop[0], crop[1] - s0.y0, crop[2], crop[3] - s0.y0];
const cw = crop[2] - crop[0], ch = crop[3] - crop[1];
const st = hstack(maps.map((m) => cropRGBA(m, W, crop)), cw, ch, 4);
png(st.img, st.W, st.H, opt.out, { zoom: +(opt.zoom || 1) });
console.log(totals.join("  "));
