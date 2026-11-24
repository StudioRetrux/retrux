// judge-artrefl AA8: WHERE are jgt2's over-darkened px (solid, off lake / band(3) / hero; lane < BASE's 3x3 min - 4 in any channel)?
// Per 32x32 block: px-frames for X and R, X's max excursion; the top blocks by X - R; a heat PNG (red = X count, green = R count).
//   node odmap.mjs BASE(mask) X R [k0 k1] --out F.png
import { loadSeq, bandFromMask, png } from "./lib.mjs";
const a = process.argv.slice(2); const oi = a.indexOf("--out"); const out = oi >= 0 ? a.splice(oi, 2)[1] : null;
const [bd, xd, rd, s0, s1] = a;
const B = loadSeq(bd), X = loadSeq(xd), R = loadSeq(rd), W = B.W, H = B.H;
const k0 = +(s0 || 0), k1 = Math.min(+(s1 || 1e9), B.n, X.n, R.n);
const cx = new Uint32Array(W * H), cr = new Uint32Array(W * H), ex = new Uint8Array(W * H);
const out1 = (fb, fl, y, x, p) => { let e = 0; for (let c = 0; c < 3; c++) { let mn = 255; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) mn = Math.min(mn, fb[((y + dy) * W + x + dx) * 4 + c]); if (fl[p + c] < mn - 4) e = Math.max(e, mn - fl[p + c]); } return e; };
for (let k = k0; k < k1; k++) {
  const m = B.mask(k); const { lake, hero, band } = bandFromMask(m, W, H, 3);
  const fb = B.frame(k), fx = X.frame(k), fr = R.frame(k);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, p = i * 4; if (lake[i] || hero[i] || band[i]) continue;
    const e1 = out1(fb, fx, y, x, p), e2 = out1(fb, fr, y, x, p);
    if (e1) { cx[i]++; ex[i] = Math.max(ex[i], e1); } if (e2) cr[i]++;
  }
}
const BS = 32, bw = Math.ceil(W / BS), bh = Math.ceil(H / BS), blk = [];
for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) { let nx = 0, nr = 0, em = 0; for (let y = by * BS; y < Math.min(H, by * BS + BS); y++) for (let x = bx * BS; x < Math.min(W, bx * BS + BS); x++) { const i = y * W + x; nx += cx[i]; nr += cr[i]; em = Math.max(em, ex[i]); } if (nx || nr) blk.push({ x: bx * BS, y: by * BS + B.y0, nx, nr, d: nx - nr, em }); }
let tx = 0, tr = 0; for (const b of blk) { tx += b.nx; tr += b.nr; }
console.log(`frames ${k1 - k0}: X ${tx} px-frames, R ${tr}; blocks ${blk.length}; rows ${B.y0}-${B.y0 + H}`);
console.log("top blocks by X - R:"); for (const b of [...blk].sort((p, q) => q.d - p.d).slice(0, 12)) console.log(`  x${b.x}-${b.x + BS} y${b.y}-${b.y + BS} X ${b.nx} R ${b.nr} d ${b.d} Xmax ${b.em}`);
console.log("top blocks by X:"); for (const b of [...blk].sort((p, q) => q.nx - p.nx).slice(0, 6)) console.log(`  x${b.x}-${b.x + BS} y${b.y}-${b.y + BS} X ${b.nx} R ${b.nr} Xmax ${b.em}`);
if (out) { const img = new Uint8Array(W * H * 4); const s = Math.max(1, (k1 - k0) / 8); for (let i = 0; i < W * H; i++) { img[i * 4] = Math.min(255, (cx[i] / s) * 255); img[i * 4 + 1] = Math.min(255, (cr[i] / s) * 255); img[i * 4 + 2] = 0; img[i * 4 + 3] = 255; } png(img, W, H, out); console.log("wrote " + out); }
