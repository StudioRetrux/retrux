// Motion-compensated residual map: tiles of T px registered (sub-pixel) on the REF sequence between k-1 and k, every
// sequence's frame k-1 shifted by that motion (Catmull-Rom) and compared with frame k; count of frames with residual > thr.
//   node mcmap.mjs --ref SEQ --out FILE.png [--thr 32] [--k0 1 --k1 N] [--crop x0,y0,x1,y1] [--zoom 1] [--tile 40] SEQ1 SEQ2 ...
//   prints the total count per sequence inside the crop (and inside --mask band if given: --mask MASKSEQ)
import { loadSeq, png, hstack, cropRGBA, bandFromMask } from "./lib.mjs";
const argv = process.argv.slice(2);
const opt = {};
const seqs = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i];
  else seqs.push(loadSeq(argv[i]));
}
const ref = loadSeq(opt.ref);
const M = opt.mask ? loadSeq(opt.mask) : null;
const W = ref.W, H = ref.H;
const thr = +(opt.thr || 32), T = +(opt.tile || 40);
const k0 = +(opt.k0 || 1), k1 = Math.min(+(opt.k1 || 1e9), ref.n, ...seqs.map((s) => s.n));
let crop = opt.crop ? opt.crop.split(",").map(Number) : [0, ref.y0, W, ref.y0 + H];
crop = [crop[0], crop[1] - ref.y0, crop[2], crop[3] - ref.y0];
const lum = (f) => { const o = new Float32Array(W * H); for (let i = 0; i < o.length; i++) o[i] = 0.2126 * f[i * 4] + 0.7152 * f[i * 4 + 1] + 0.0722 * f[i * 4 + 2]; return o; };
const cr = (t) => { const t2 = t * t, t3 = t2 * t; return [-0.5 * t3 + t2 - 0.5 * t, 1.5 * t3 - 2.5 * t2 + 1, -1.5 * t3 + 2 * t2 + 0.5 * t, 0.5 * t3 - 0.5 * t2]; };
function samp(f, x, y, c) {
  const xi = Math.floor(x), yi = Math.floor(y), wx = cr(x - xi), wy = cr(y - yi);
  let s = 0;
  for (let j = 0; j < 4; j++) { const yy = Math.min(H - 1, Math.max(0, yi - 1 + j)); for (let i = 0; i < 4; i++) { const xx = Math.min(W - 1, Math.max(0, xi - 1 + i)); s += wx[i] * wy[j] * f[(yy * W + xx) * 4 + c]; } }
  return s;
}
function reg(A, B, x0, y0, x1, y1, R = 10, RY = 4) {
  const xs = Math.max(x0, R + 2), xe = Math.min(x1, W - R - 2), ys = Math.max(y0, RY + 2), ye = Math.min(y1, H - RY - 2);
  if (xe - xs < 6 || ye - ys < 6) return [0, 0];
  let gsum = 0;
  for (let y = ys; y < ye; y++) for (let x = xs; x < xe; x++) { const g = B[y * W + x + 1] - B[y * W + x - 1]; gsum += g * g; }
  if (gsum < 50 * (xe - xs) * (ye - ys)) return null; // flat tile
  const ssd = (dx, dy) => { let s = 0; for (let y = ys; y < ye; y++) for (let x = xs; x < xe; x++) { const d = B[y * W + x] - A[(y - dy) * W + x - dx]; s += d * d; } return s; };
  let best = [0, 0], bs = Infinity;
  for (let dy = -RY; dy <= RY; dy++) for (let dx = -R; dx <= R; dx++) { const s = ssd(dx, dy); if (s < bs) { bs = s; best = [dx, dy]; } }
  const fx = (a, c, d) => { const den = a - 2 * c + d; return den > 1e-9 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - d)) / den)) : 0; };
  return [best[0] + fx(ssd(best[0] - 1, best[1]), bs, ssd(best[0] + 1, best[1])), best[1] + fx(ssd(best[0], best[1] - 1), bs, ssd(best[0], best[1] + 1))];
}
const counts = seqs.map(() => new Uint16Array(W * H));
const tot = seqs.map(() => 0), totB = seqs.map(() => 0);
let bandPx = 0;
for (let k = k0; k < k1; k++) {
  const A = lum(ref.frame(k - 1)), B = lum(ref.frame(k));
  const band = M ? bandFromMask(M.mask(k), W, H, 3).band : null;
  const vx = new Float32Array(W * H).fill(NaN), vy = new Float32Array(W * H).fill(NaN);
  for (let ty = crop[1]; ty < crop[3]; ty += T) for (let tx = crop[0]; tx < crop[2]; tx += T) {
    const v = reg(A, B, tx, ty, Math.min(tx + T, W), Math.min(ty + T, H));
    if (!v) continue;
    for (let y = ty; y < Math.min(ty + T, H); y++) for (let x = tx; x < Math.min(tx + T, W); x++) { vx[y * W + x] = v[0]; vy[y * W + x] = v[1]; }
  }
  seqs.forEach((s, si) => {
    const F = s.frame(k), P = s.frame(k - 1);
    for (let y = Math.max(crop[1], 2); y < Math.min(crop[3], H - 2); y++) for (let x = Math.max(crop[0], 2); x < Math.min(crop[2], W - 2); x++) {
      const i = y * W + x;
      if (Number.isNaN(vx[i])) continue;
      const sx = x - vx[i], sy = y - vy[i];
      if (sx < 1 || sy < 1 || sx > W - 3 || sy > H - 3) continue;
      let e = 0;
      for (let c = 0; c < 3; c++) e = Math.max(e, Math.abs(F[i * 4 + c] - samp(P, sx, sy, c)));
      if (si === 0 && band && band[i]) bandPx++;
      if (e > thr) { counts[si][i]++; tot[si]++; if (band && band[i]) totB[si]++; }
    }
  });
}
const base = seqs[0].frame(k0);
const imgs = counts.map((cnt) => {
  const img = new Uint8Array(W * H * 4);
  for (let i = 0; i < cnt.length; i++) {
    const l = (0.2126 * base[i * 4] + 0.7152 * base[i * 4 + 1] + 0.0722 * base[i * 4 + 2]) * 0.45;
    const h = Math.min(1, cnt[i] / Math.max(3, (k1 - k0) * 0.08));
    img[i * 4] = Math.min(255, l + 255 * h); img[i * 4 + 1] = Math.min(255, l + 160 * h * h); img[i * 4 + 2] = l * (1 - h); img[i * 4 + 3] = 255;
  }
  return cropRGBA(img, W, crop);
});
const st = hstack(imgs, crop[2] - crop[0], crop[3] - crop[1], 4);
png(st.img, st.W, st.H, opt.out, { zoom: +(opt.zoom || 1) });
console.log(seqs.map((s, i) => `${s.dir.split("/").pop()}: all ${tot[i]}${M ? ` band ${totB[i]} (${((1000 * totB[i]) / Math.max(1, bandPx)).toFixed(2)}/1000)` : ""}`).join("  "));
