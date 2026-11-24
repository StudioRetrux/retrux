// prejudge-glide: event strip with automatic targeting: the window (cw x ch) of box BOX holding the most band px (BASE mask at
// frame k0) -> strip rows = frames ks, columns = variants.  node evstrip.mjs DIR BOX k0,k1,... a6,g0,base OUT.png [--cw 200 --ch 70 --zoom 3 --m base]
import path from "node:path";
import { loadSeq, bandFromMask, png, cropRGBA } from "./lib.mjs";
const argv = process.argv.slice(2);
const [dir, bn, ksA, varsA, out] = argv;
const opt = {};
for (let i = 5; i < argv.length; i++) if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i];
const ks = ksA.split(",").map(Number), vars = varsA.split(",");
const S = vars.map((v) => loadSeq(path.join(dir, v)));
const M = loadSeq(path.join(dir, opt.m || "base"));
const W = M.W, H = M.H, Y0 = M.y0, sc = W / 1440;
const BOX = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
const cw = Math.round(+(opt.cw || 200) * sc), ch = Math.round(+(opt.ch || 70) * sc);
let crop;
if (opt.crop) crop = opt.crop.split(",").map(Number);
else {
  const { band } = bandFromMask(M.mask(ks[0]), W, H, Math.round(3 * sc));
  const [bx0, by0, bx1, by1] = BOX[bn].map((v) => Math.round(v * sc));
  let best = -1;
  for (let y = Math.max(by0, Y0); y + ch <= Math.min(by1 + ch / 2, Y0 + H); y += 4) for (let x = bx0; x + cw <= Math.min(bx1 + cw / 2, W); x += 4) {
    let n = 0;
    for (let yy = y; yy < y + ch; yy += 2) for (let xx = x; xx < x + cw; xx += 2) n += band[(yy - Y0) * W + xx];
    if (n > best) { best = n; crop = [x, y, x + cw, y + ch]; }
  }
}
const [x0, y0, x1, y1] = crop;
const gap = 3, ww = x1 - x0, hh = y1 - y0;
const OW = S.length * ww + (S.length - 1) * gap, OH = ks.length * hh + (ks.length - 1) * gap;
const img = new Uint8Array(OW * OH * 4).fill(255);
ks.forEach((k, r) => S.forEach((s, c) => {
  const cr = cropRGBA(s.frame(k), s.W, [x0, y0 - s.y0, x1, y1 - s.y0]);
  for (let y = 0; y < hh; y++) img.set(cr.subarray(y * ww * 4, (y + 1) * ww * 4), ((r * (hh + gap) + y) * OW + c * (ww + gap)) * 4);
}));
png(img, OW, OH, out, { zoom: +(opt.zoom || 3) });
console.log(`wrote ${out}: crop ${crop.join(",")} frames ${ks.join(",")} cols ${vars.join("|")}`);
