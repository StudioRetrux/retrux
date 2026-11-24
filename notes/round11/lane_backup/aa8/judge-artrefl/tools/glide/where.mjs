// prejudge-glide: where are the band px of a box (BASE mask) and the A-vs-B 3x3 outliers at frame k: bounding boxes + list
//   node where.mjs DIR k [--a a6 --b g0 --m base --t 8 --box FS]
import path from "node:path";
import { loadSeq, bandFromMask } from "./lib.mjs";
const argv = process.argv.slice(2);
const dir = argv[0], k = +argv[1];
const opt = {};
for (let i = 2; i < argv.length; i++) if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i];
const A = loadSeq(path.join(dir, opt.a || "a6")), B = loadSeq(path.join(dir, opt.b || "g0")), M = loadSeq(path.join(dir, opt.m || "base"));
const W = A.W, H = A.H, Y0 = A.y0, T = +(opt.t || 8);
const BOX = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
const { band } = bandFromMask(M.mask(k), W, H, 3);
const fa = A.frame(k), fb = B.frame(k);
for (const [bn, [x0, y0, x1, y1]] of Object.entries(BOX)) {
  if (opt.box && opt.box !== bn) continue;
  let bb = [1e9, 1e9, -1, -1], nb = 0; const outl = [];
  const hist = new Map();
  for (let y = Math.max(1, y0 - Y0); y < Math.min(H - 1, y1 - Y0); y++) for (let x = Math.max(1, x0); x < Math.min(W - 1, x1); x++) {
    const i = y * W + x; if (!band[i]) continue;
    nb++; bb = [Math.min(bb[0], x), Math.min(bb[1], y + Y0), Math.max(bb[2], x), Math.max(bb[3], y + Y0)];
    const key = Math.floor(x / 40) * 40 + "," + Math.floor((y + Y0) / 20) * 20; hist.set(key, (hist.get(key) || 0) + 1);
    const p = i * 4; let ex = 0, sg = 0;
    for (let c = 0; c < 3; c++) { let mn = 255, mx = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = fb[((y + dy) * W + x + dx) * 4 + c]; mn = Math.min(mn, v); mx = Math.max(mx, v); } const v = fa[p + c]; if (v > mx + T && v - mx > ex) { ex = v - mx; sg = 1; } if (v < mn - T && mn - v > ex) { ex = mn - v; sg = -1; } }
    if (ex) outl.push(`(${x},${y + Y0})${sg * ex}`);
  }
  const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => k + ":" + v).join(" ");
  console.log(`${bn}: band ${nb} px bbox ${bb.join(",")} densest 40x20 cells ${top} | outliers ${outl.length}: ${outl.slice(0, 16).join(" ")}`);
}
