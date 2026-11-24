// prejudge-glide: band sharpness over time (L5 pumping), single pass per frame. Per frame and box: mean squared luma gradient
// (central differences) over the band px (+-3 px of BASE's mask), and the band mean |dL| (frame to frame), per variant.
//   node sharp2.mjs DIR a6,g0,base [--m base] [--print ALL,FS,DR] [--json FILE]
import fs from "node:fs";
import path from "node:path";
import { loadSeq, bandFromMask } from "./lib.mjs";
const argv = process.argv.slice(2);
const dir = argv[0], vars = argv[1].split(",");
const opt = {};
for (let i = 2; i < argv.length; i++) if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i];
const S = vars.map((v) => loadSeq(path.join(dir, v)));
const M = loadSeq(path.join(dir, opt.m || "base"));
const W = M.W, H = M.H, Y0 = M.y0, sc = W / 1440;
const BOX = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
const names = Object.keys(BOX);
const boxOf = new Uint8Array(W * H);
names.forEach((n, bi) => { const [x0, y0, x1, y1] = BOX[n].map((v) => Math.round(v * sc)); for (let y = Math.max(0, y0 - Y0); y < Math.min(H, y1 - Y0); y++) for (let x = x0; x < Math.min(W, x1); x++) if (!boxOf[y * W + x]) boxOf[y * W + x] = bi + 1; });
const N = Math.min(M.n, ...S.map((s) => s.n));
const out = [];
const lum = (f) => { const L = new Float32Array(W * H); for (let i = 0; i < W * H; i++) L[i] = 0.2126 * f[i * 4] + 0.7152 * f[i * 4 + 1] + 0.0722 * f[i * 4 + 2]; return L; };
const prevL = S.map(() => null);
for (let k = 0; k < N; k++) {
  const { band } = bandFromMask(M.mask(k), W, H, Math.round(3 * sc));
  const row = { k, i: M.meta.info[k].i, taa: S.map((s) => s.meta.info[k].taa) };
  const acc = S.map(() => names.map(() => [0, 0, 0]).concat([[0, 0, 0]]));
  S.forEach((s, j) => {
    const L = lum(s.frame(k)), P = prevL[j] || L;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, b = boxOf[i];
      if (!b || !band[i]) continue;
      const gx = (L[i + 1] - L[i - 1]) / 2, gy = (L[i + W] - L[i - W]) / 2, g = gx * gx + gy * gy, d = Math.abs(L[i] - P[i]);
      const a = acc[j][b - 1], t = acc[j][names.length];
      a[0] += g; a[1] += d; a[2]++; t[0] += g; t[1] += d; t[2]++;
    }
    prevL[j] = L;
  });
  for (const [bi, bn] of [...names, "ALL"].entries()) row[bn] = acc.map((a) => [a[bi][0] / Math.max(1, a[bi][2]), a[bi][1] / Math.max(1, a[bi][2])]);
  out.push(row);
}
if (opt.json) fs.writeFileSync(opt.json, JSON.stringify({ vars, names, out }));
for (const bn of (opt.print || "ALL").split(",")) {
  console.log(`== ${bn}: k i  grad^2 (${vars.join(" / ")})   |dL| (${vars.join(" / ")})   taa weight/still per variant`);
  for (const r of out) console.log(`${String(r.k).padStart(3)} ${String(r.i).padStart(4)}  ` + r[bn].map((a) => a[0].toFixed(1).padStart(7)).join(" ") + "   " + r[bn].map((a) => a[1].toFixed(2).padStart(6)).join(" ") + "   " + r.taa.map((t) => (t ? `${typeof t.weight === "number" ? t.weight.toFixed(2) : t.weight}/${t.still}` : "-").padEnd(9)).join(" "));
}
