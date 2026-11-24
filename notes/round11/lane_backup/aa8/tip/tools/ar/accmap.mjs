// Where do A and B differ over a whole sequence: per-pixel count of frames with |luma A - luma B| > T (signed: A darker / brighter),
// a heat PNG (red = A brighter, blue = A darker), and the top 16x16 cells by px-frames.
//   node accmap.mjs A B T OUT.png [k0,k1]
import { loadSeq, png, luma8 } from "./lib.mjs";
const [da, db, Ts, out, kr] = process.argv.slice(2);
const A = loadSeq(da), B = loadSeq(db), T = +Ts;
const W = A.W, H = A.H, y0 = A.y0;
const [k0, k1] = kr ? kr.split(",").map(Number) : [0, Math.min(A.n, B.n) - 1];
const br = new Uint16Array(W * H), dk = new Uint16Array(W * H);
let tot = 0, totB = 0, totD = 0;
for (let k = k0; k <= k1; k++) {
  const fa = A.frame(k), fb = B.frame(k);
  for (let i = 0, p = 0; p < W * H; i += 4, p++) {
    const d = luma8(fa[i], fa[i + 1], fa[i + 2]) - luma8(fb[i], fb[i + 1], fb[i + 2]);
    if (d > T) { br[p]++; totB++; } else if (d < -T) { dk[p]++; totD++; }
  }
}
const img = new Uint8Array(W * H * 4);
for (let p = 0; p < W * H; p++) { img[p * 4] = Math.min(255, br[p] * 40); img[p * 4 + 2] = Math.min(255, dk[p] * 40); img[p * 4 + 1] = 0; img[p * 4 + 3] = 255; }
png(img, W, H, out, { zoom: 1 });
const C = 16, cells = [];
for (let cy = 0; cy < H; cy += C) for (let cx = 0; cx < W; cx += C) {
  let b = 0, d = 0;
  for (let y = cy; y < Math.min(H, cy + C); y++) for (let x = cx; x < Math.min(W, cx + C); x++) { b += br[y * W + x]; d += dk[y * W + x]; }
  if (b + d) cells.push({ x: cx, y: cy + y0, b, d });
}
cells.sort((p, q) => q.b + q.d - (p.b + p.d));
console.log(`${da.split("/").slice(-1)} vs ${db.split("/").slice(-1)} k${k0}-${k1} T${T}: A brighter ${totB} px-frames, A darker ${totD}`);
console.log("top cells (x,y = cell origin, 16x16): " + cells.slice(0, 16).map((c) => `${c.x},${c.y}:+${c.b}/-${c.d}`).join("  "));
