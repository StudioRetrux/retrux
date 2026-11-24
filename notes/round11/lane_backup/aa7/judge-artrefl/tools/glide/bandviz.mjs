// prejudge-glide: OLD (cap.mjs) vs NEW (capm coverage) band in a box at frame k, over the frame (grey): red = OLD only,
// green = NEW only, yellow = both.  node bandviz.mjs OLDMASK NEWMASK FRAMESEQ k x0,y0,x1,y1 OUT.png [zoom]
import { loadSeq, bandFromMask, png } from "./lib.mjs";
const [om, nm, fs_, kA, cropA, out, zA] = process.argv.slice(2);
const O = loadSeq(om), N = loadSeq(nm), F = loadSeq(fs_), k = +kA;
const W = F.W, H = F.H, Y0 = F.y0;
const bo = bandFromMask(O.mask(k), W, H, 3).band, bn = bandFromMask(N.mask(k), W, H, 3).band;
const [x0, y0, x1, y1] = cropA.split(",").map(Number);
const f = F.frame(k);
const img = new Uint8Array(W * H * 4);
let no = 0, nn = 0, nb = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x, p = i * 4;
  const l = (0.2126 * f[p] + 0.7152 * f[p + 1] + 0.0722 * f[p + 2]) * 0.6;
  let r = l, g = l, b = l;
  const inBox = x >= x0 && x < x1 && y + Y0 >= y0 && y + Y0 < y1;
  if (bo[i] && bn[i]) { r = 230; g = 210; b = 40; if (inBox) nb++; }
  else if (bo[i]) { r = 230; g = 40; b = 40; if (inBox) no++; }
  else if (bn[i]) { r = 40; g = 220; b = 60; if (inBox) nn++; }
  img.set([r, g, b, 255], p);
}
png(img, W, H, out, { crop: [x0, y0 - Y0, x1, y1 - Y0], zoom: +(zA || 2) });
console.log(`box ${cropA} k${k}: OLD-only ${no} px, NEW-only ${nn}, both ${nb}`);
