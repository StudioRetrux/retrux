// Overlay: the lane's aaIn region boundary (magenta), the carve-out box interior tinted, and G4-vs-off pixels (white) on frame k.
//   node jregion.mjs LANE OFF k OUT.png x0,y0,x1,y1 zoom
import { loadSeq, png, cropRGBA } from "../../../aa3/tools/lib.mjs";
const [ld, od, ks, out, crop, zs] = process.argv.slice(2);
const L = loadSeq(ld), O = loadSeq(od), k = +ks, W = L.W, H = L.H;
const inf = L.meta.info[k], P = inf.aa.plane, E = inf.aa.exc;
const f = L.frame(k), fo = O.frame(k);
const reg = new Uint8Array(W * H), box = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const gx = x + 0.5, gy = inf.H - (y + L.y0) - 0.5;
  const e0 = gx * E[0] + gy * E[1] + E[2], e1 = gx * E[3] + gy * E[4] + E[5], e2 = gx * E[6] + gy * E[7] + E[8];
  const b = e0 >= 0 && e1 >= 0 && e2 >= 0, pl = gx * P[0] + gy * P[1] + P[2] < 0;
  box[y * W + x] = b && pl ? 1 : 0;
  reg[y * W + x] = pl && !b ? 1 : 0;
}
const img = new Uint8Array(f);
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  const i = y * W + x, p = i * 4;
  if (box[i]) { img[p] = Math.min(255, img[p] * 0.8 + 50); img[p + 1] = img[p + 1] * 0.8; img[p + 2] = Math.min(255, img[p + 2] * 0.8 + 40); }
  if (reg[i] !== reg[i - 1] || reg[i] !== reg[i - W]) { img[p] = 255; img[p + 1] = 0; img[p + 2] = 255; }
  let ex = 0;
  for (let c = 0; c < 3; c++) {
    let mn = 255, mx = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = fo[((y + dy) * W + x + dx) * 4 + c]; mn = Math.min(mn, v); mx = Math.max(mx, v); }
    ex = Math.max(ex, f[p + c] - mx - 4, mn - f[p + c] - 4);
  }
  if (ex > 0) { img[p] = 0; img[p + 1] = 255; img[p + 2] = 0; }
}
const c = crop.split(",").map(Number);
png(cropRGBA(img, W, [c[0], c[1] - L.y0, c[2], c[3] - L.y0]), c[2] - c[0], c[3] - c[1], out, { zoom: +(zs || 1) });
console.log("wrote", out);
