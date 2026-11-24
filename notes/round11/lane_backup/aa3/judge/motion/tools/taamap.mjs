// TAA activity: per pixel, fraction of frames where |A - B| (max channel) > 2 lv, A = AA3, B = AA3 with ?lktaa=0; image +
// per-box stats restricted to the band of the mask sequence. node taamap.mjs A B MASK OUT.png
import { loadSeq, png, bandFromMask } from "./lib.mjs";
const [a, b, m, out] = process.argv.slice(2); const A = loadSeq(a), B = loadSeq(b), M = loadSeq(m); const W = A.W, H = A.H, Y0 = A.y0;
const cnt = new Float32Array(W * H); const N = Math.min(A.n, B.n);
const BOXES = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
const st = Object.fromEntries(Object.keys(BOXES).map((k) => [k, [0, 0]]));
for (let k = 2; k < N; k += 2) { const F = A.frame(k), G = B.frame(k); const { band } = bandFromMask(M.mask(k), W, H, 3);
  for (let i = 0; i < W * H; i++) { const p = i * 4; const d = Math.max(Math.abs(F[p] - G[p]), Math.abs(F[p + 1] - G[p + 1]), Math.abs(F[p + 2] - G[p + 2])); if (d > 2) cnt[i]++;
    if (!band[i]) continue; const x = i % W, y = ((i / W) | 0) + Y0; for (const [n, [x0, y0, x1, y1]] of Object.entries(BOXES)) if (x >= x0 && x < x1 && y >= y0 && y < y1) { st[n][1]++; if (d > 2) st[n][0]++; break; } } }
const img = new Uint8Array(W * H * 4); const n = Math.floor((N - 2) / 2);
const F0 = A.frame(120);
for (let i = 0; i < W * H; i++) { const v = Math.min(1, cnt[i] / n * 3); const g = 0.25 * (0.2126 * F0[i * 4] + 0.7152 * F0[i * 4 + 1] + 0.0722 * F0[i * 4 + 2]); img[i * 4] = Math.min(255, g + 255 * v); img[i * 4 + 1] = Math.min(255, g + 120 * v); img[i * 4 + 2] = g; img[i * 4 + 3] = 255; }
for (const [x0, y0, x1, y1] of Object.values(BOXES)) { for (let x = x0; x < x1; x++) for (const y of [y0, y1 - 1]) { const yy = y - Y0; if (yy >= 0 && yy < H) { const p = (yy * W + x) * 4; img[p] = 0; img[p + 1] = 200; img[p + 2] = 255; } } for (let y = y0; y < y1; y++) for (const x of [x0, x1 - 1]) { const yy = y - Y0; if (yy >= 0 && yy < H) { const p = (yy * W + x) * 4; img[p] = 0; img[p + 1] = 200; img[p + 2] = 255; } } }
png(img, W, H, out);
console.log("band px where TAA changed the pixel by > 2 lv (share):", Object.entries(st).map(([k, [c, t]]) => `${k} ${(100 * c / Math.max(1, t)).toFixed(1)}%`).join("  "));
