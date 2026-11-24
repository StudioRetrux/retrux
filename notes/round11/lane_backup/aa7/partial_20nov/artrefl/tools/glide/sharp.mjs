// prejudge-glide: band sharpness over time (L5 pumping). Per frame and box: mean squared luma gradient (central differences) over
// the band px (+-3 px of BASE's mask), and the band mean |dF| (frame to frame). Several variants of one jcap case dir.
//   node sharp.mjs DIR a6,g0,base [--m base] [--boxes FS,DR,WR,RS,FF,FR] [--k0 0 --k1 N] [--csv FILE]
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
const names = (opt.boxes || "FS,DR,WR,RS,FF,FR").split(",");
const k0 = +(opt.k0 || 0), k1 = Math.min(+(opt.k1 || 1e9), M.n, ...S.map((s) => s.n));
const L = (f, i) => 0.2126 * f[i * 4] + 0.7152 * f[i * 4 + 1] + 0.0722 * f[i * 4 + 2];
const out = [];
for (let k = k0; k < k1; k++) {
  const { band } = bandFromMask(M.mask(k), W, H, Math.round(3 * sc));
  const row = { k, i: M.meta.info[k].i, taa: S.map((s) => s.meta.info[k].taa) };
  for (const bn of [...names, "ALL"]) {
    const bx = bn === "ALL" ? null : BOX[bn].map((v, j) => Math.round(v * sc) - (j % 2 ? Y0 : 0));
    const acc = S.map(() => [0, 0, 0]);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (bx && (x < bx[0] || x >= bx[2] || y < bx[1] || y >= bx[3])) continue;
      if (!bx && !names.some((n) => { const b = BOX[n].map((v, j) => Math.round(v * sc) - (j % 2 ? Y0 : 0)); return x >= b[0] && x < b[2] && y >= b[1] && y < b[3]; })) continue;
      const i = y * W + x;
      if (!band[i]) continue;
      S.forEach((s, j) => {
        const f = s.frame(k), p = k > 0 ? s.frame(k - 1) : f;
        const gx = (L(f, i + 1) - L(f, i - 1)) / 2, gy = (L(f, i + W) - L(f, i - W)) / 2;
        acc[j][0] += gx * gx + gy * gy;
        acc[j][1] += Math.abs(L(f, i) - L(p, i));
        acc[j][2]++;
      });
    }
    row[bn] = acc.map((a) => [a[0] / Math.max(1, a[2]), a[1] / Math.max(1, a[2])]);
  }
  out.push(row);
}
if (opt.csv) fs.writeFileSync(opt.csv, JSON.stringify({ vars, names, out }));
const pr = (bn) => {
  console.log(`== ${bn}: per frame  grad^2 (${vars.join(" / ")})   |dL| (${vars.join(" / ")})   taa w/still per variant`);
  for (const r of out) console.log(`${String(r.k).padStart(3)} ${String(r.i).padStart(4)}  ` + r[bn].map((a) => a[0].toFixed(1).padStart(7)).join(" ") + "   " + r[bn].map((a) => a[1].toFixed(2).padStart(6)).join(" ") + "   " + r.taa.map((t) => (t ? `${typeof t.weight === "number" ? t.weight.toFixed(2) : t.weight}/${t.still}` : "-").padEnd(9)).join(" "));
};
for (const bn of (opt.print || "ALL").split(",")) pr(bn);
