// Offline TAA simulation on the waterline band (display space): out_t = mix(F_t, clamp(H(x - v), 3x3 range of F_t), a)
// on pixels whose 3x3 holds lake and solid (mask session), dilated by --grow px; elsewhere F_t. v = per-tile motion
// (registration on F itself between t-1 and t), history sampled bilinear or Catmull-Rom (clamped to its 2x2 footprint).
//   node taasim.mjs --mask MASKSEQ --in SEQ --out DIR [--a 0.6] [--grow 1] [--tile 32] [--cr 1]
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { loadSeq, dilate } from "./lib.mjs";
const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].slice(2)] = argv[i + 1];
const M = loadSeq(opt.mask), S = loadSeq(opt.in);
const W = S.W, H = S.H, N = Math.min(S.n, M.n);
const A = +(opt.a || 0.6), grow = +(opt.grow || 1), T = +(opt.tile || 32), useCR = opt.cr === "1";
fs.mkdirSync(opt.out, { recursive: true });
const lum = (f) => { const o = new Float32Array(W * H); for (let i = 0; i < o.length; i++) o[i] = 0.2126 * f[i * 4] + 0.7152 * f[i * 4 + 1] + 0.0722 * f[i * 4 + 2]; return o; };
function reg(Ap, B, x0, y0, x1, y1, R = 10, RY = 4) {
  const xs = Math.max(x0, R + 2), xe = Math.min(x1, W - R - 2), ys = Math.max(y0, RY + 2), ye = Math.min(y1, H - RY - 2);
  if (xe - xs < 6 || ye - ys < 6) return [0, 0];
  const ssd = (dx, dy) => { let s = 0; for (let y = ys; y < ye; y++) for (let x = xs; x < xe; x++) { const d = B[y * W + x] - Ap[(y - dy) * W + x - dx]; s += d * d; } return s; };
  let best = [0, 0], bs = Infinity;
  for (let dy = -RY; dy <= RY; dy++) for (let dx = -R; dx <= R; dx++) { const s = ssd(dx, dy); if (s < bs) { bs = s; best = [dx, dy]; } }
  const fx = (a, c, d) => { const den = a - 2 * c + d; return den > 1e-9 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - d)) / den)) : 0; };
  return [best[0] + fx(ssd(best[0] - 1, best[1]), bs, ssd(best[0] + 1, best[1])), best[1] + fx(ssd(best[0], best[1] - 1), bs, ssd(best[0], best[1] + 1))];
}
const cr = (t) => { const t2 = t * t, t3 = t2 * t; return [-0.5 * t3 + t2 - 0.5 * t, 1.5 * t3 - 2.5 * t2 + 1, -1.5 * t3 + 2 * t2 + 0.5 * t, 0.5 * t3 - 0.5 * t2]; };
function samp(f, x, y, c) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const g = (xx, yy) => f[(Math.min(H - 1, Math.max(0, yy)) * W + Math.min(W - 1, Math.max(0, xx))) * 4 + c];
  const a = g(xi, yi), b = g(xi + 1, yi), cc = g(xi, yi + 1), d = g(xi + 1, yi + 1);
  const bil = (a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + d * fx) * fy;
  if (!useCR) return bil;
  const wx = cr(fx), wy = cr(fy);
  let s = 0;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) s += wx[i] * wy[j] * g(xi - 1 + i, yi - 1 + j);
  return Math.min(Math.max(a, b, cc, d), Math.max(Math.min(a, b, cc, d), s));
}
let hist = null, prevL = null;
for (let k = 0; k < N; k++) {
  const f = S.frame(k), m = M.mask(k);
  const L = lum(f);
  const o = new Uint8Array(f);
  if (hist) {
    // band: 3x3 holds lake (bit0|bit1) and solid
    const e = new Uint8Array(W * H);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      let hl = false, hs = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (m[i + dy * W + dx] & 3) hl = true; else hs = true; }
      if (hl && hs && !(m[i] & 4)) e[i] = 1;
    }
    const band = grow > 0 ? dilate(e, W, H, grow) : e;
    const vx = new Float32Array(W * H), vy = new Float32Array(W * H);
    for (let ty = 0; ty < H; ty += T) for (let tx = 0; tx < W; tx += T) {
      let any = false;
      for (let y = ty; y < Math.min(ty + T, H) && !any; y++) for (let x = tx; x < Math.min(tx + T, W); x++) if (band[y * W + x]) { any = true; break; }
      if (!any) continue;
      const v = reg(prevL, L, tx - 8, ty - 8, Math.min(tx + T + 8, W), Math.min(ty + T + 8, H));
      for (let y = ty; y < Math.min(ty + T, H); y++) for (let x = tx; x < Math.min(tx + T, W); x++) { vx[y * W + x] = v[0]; vy[y * W + x] = v[1]; }
    }
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!band[i] || m[i] & 4) continue;
      const sx = x - vx[i], sy = y - vy[i];
      if (sx < 1 || sy < 1 || sx > W - 3 || sy > H - 3) continue;
      for (let c = 0; c < 3; c++) {
        let mn = 255, mx = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = f[(i + dy * W + dx) * 4 + c]; if (v < mn) mn = v; if (v > mx) mx = v; }
        const h = Math.min(mx, Math.max(mn, samp(hist, sx, sy, c)));
        o[i * 4 + c] = Math.round(f[i * 4 + c] + (h - f[i * 4 + c]) * A);
      }
    }
  }
  hist = o;
  prevL = L;
  const b = Buffer.alloc(o.length);
  for (let y = 0; y < H; y++) b.set(o.subarray(y * W * 4, (y + 1) * W * 4), (H - 1 - y) * W * 4);
  fs.writeFileSync(path.join(opt.out, `f${String(k).padStart(4, "0")}.bin`), zlib.deflateSync(b, { level: 1 }));
}
fs.writeFileSync(path.join(opt.out, "meta.json"), JSON.stringify({ ...S.meta, info: S.meta.info.slice(0, N), taasim: opt }));
console.log("taasim", JSON.stringify(opt), N, "frames");
