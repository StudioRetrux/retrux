// Difference map between two sequences at frame k (max channel |a - b|, heat), plus counts
//   node diffmap.mjs A B k OUT.png [crop x0,y0,x1,y1] [zoom]
import { loadSeq, png, cropRGBA } from "./lib.mjs";
const [da, db, k, out, crop, zoom] = process.argv.slice(2);
const A = loadSeq(da), B = loadSeq(db);
const fa = A.frame(+k), fb = B.frame(+k), W = A.W, H = A.H;
const img = new Uint8Array(W * H * 4);
let n = 0, n4 = 0, mx = 0;
for (let i = 0; i < W * H; i++) {
  const p = i * 4;
  const d = Math.max(Math.abs(fa[p] - fb[p]), Math.abs(fa[p + 1] - fb[p + 1]), Math.abs(fa[p + 2] - fb[p + 2]));
  if (d) n++;
  if (d > 4) n4++;
  mx = Math.max(mx, d);
  const l = (0.2126 * fa[p] + 0.7152 * fa[p + 1] + 0.0722 * fa[p + 2]) * 0.4;
  const h = Math.min(1, d / 16);
  img[p] = Math.min(255, l + 255 * h); img[p + 1] = Math.min(255, l + 120 * h); img[p + 2] = l * (1 - h); img[p + 3] = 255;
}
let c = crop && crop !== "-" ? crop.split(",").map(Number) : [0, A.y0, W, A.y0 + H];
c = [c[0], c[1] - A.y0, c[2], c[3] - A.y0];
png(cropRGBA(img, W, c), c[2] - c[0], c[3] - c[1], out, { zoom: +(zoom || 1) });
console.log(`diff px ${n}, >4 lv ${n4}, max ${mx}`);
