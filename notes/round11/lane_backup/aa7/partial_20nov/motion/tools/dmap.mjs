// prejudge-glide: frame-to-frame change map |F(k) - F(k-1)| (luma) x gain for variants side by side over a crop, plus per-box
// counts of band px > 8 lv.   node dmap.mjs DIR a6,g0,base k x0,y0,x1,y1 OUT.png [--gain 8 --zoom 2]
import path from "node:path";
import { loadSeq, bandFromMask, png } from "./lib.mjs";
const argv = process.argv.slice(2);
const [dir, varsA, kA, cropA, out] = argv;
const opt = {}; for (let i = 5; i < argv.length; i++) if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i];
const vars = varsA.split(","), k = +kA, S = vars.map((v) => loadSeq(path.join(dir, v)));
const M = loadSeq(path.join(dir, opt.m || "base"));
const W = M.W, H = M.H, Y0 = M.y0, gain = +(opt.gain || 8);
const BOX = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
const { band } = bandFromMask(M.mask(k), W, H, 3);
const lum = (f, i) => 0.2126 * f[i * 4] + 0.7152 * f[i * 4 + 1] + 0.0722 * f[i * 4 + 2];
for (const [bn, [x0, y0, x1, y1]] of Object.entries(BOX)) {
  const c = S.map(() => 0);
  for (let y = y0 - Y0; y < y1 - Y0; y++) for (let x = x0; x < x1; x++) { const i = y * W + x; if (y < 0 || y >= H || !band[i]) continue; S.forEach((s, j) => { if (Math.abs(lum(s.frame(k), i) - lum(s.frame(k - 1), i)) > 8) c[j]++; }); }
  console.log(`${bn}: band px |dL| > 8 at k${k}: ${vars.map((v, j) => v + " " + c[j]).join(", ")}`);
}
const [cx0, cy0, cx1, cy1] = cropA.split(",").map(Number);
const cw = cx1 - cx0, ch = cy1 - cy0, gap = 3, OW = vars.length * 2 * cw + (vars.length * 2 - 1) * gap;
const img = new Uint8Array(OW * ch * 4).fill(255);
S.forEach((s, j) => {
  const f = s.frame(k), p = s.frame(k - 1);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = (y + cy0 - Y0) * W + x + cx0;
    const o1 = (y * OW + j * 2 * (cw + gap) + x) * 4, o2 = (y * OW + (j * 2 + 1) * (cw + gap) + x) * 4;
    img.set([f[i * 4], f[i * 4 + 1], f[i * 4 + 2], 255], o1);
    const d = Math.min(255, Math.abs(lum(f, i) - lum(p, i)) * gain);
    img.set([d, d, d, 255], o2);
  }
});
png(img, OW, ch, out, { zoom: +(opt.zoom || 2) });
console.log("wrote " + out + " (per variant: frame k | |F(k)-F(k-1)| x" + gain + ")");
