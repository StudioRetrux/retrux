// judge-motion: where are the J48 events of a box (band px with |F(k)-F(k-1)| > T, max channel), per variant; NEW mask band (+-3)
//   node j48loc.mjs MASK BOX T k0 k1 stride NAME=DIR ...
import { loadSeq, bandFromMask } from "./lib.mjs";
const [maskDir, boxN, Ts, k0s, k1s, sts, ...rest] = process.argv.slice(2);
const BOX = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
const M = loadSeq(maskDir); const W = M.W, H = M.H, Y0 = M.y0; const T = +Ts;
const seqs = rest.map((a) => { const [n, d] = a.split("="); return { n, s: loadSeq(d) }; });
const [x0, y0, x1, y1] = BOX[boxN];
const tot = Object.fromEntries(seqs.map((q) => [q.n, 0])); let band = 0; const rows = []; const hits = {};
for (let k = +k0s; k <= +k1s; k += +sts) {
  const { band: b } = bandFromMask(M.mask(k), W, H, 3); const r = { k };
  for (const q of seqs) {
    const F = q.s.frame(k), P = q.s.frame(k - 1); let c = 0;
    for (let y = Math.max(0, y0 - Y0); y < Math.min(H, y1 - Y0); y++) for (let x = x0; x < x1; x++) {
      const i = y * W + x; if (!b[i]) continue; const p = i * 4;
      const d = Math.max(Math.abs(F[p] - P[p]), Math.abs(F[p + 1] - P[p + 1]), Math.abs(F[p + 2] - P[p + 2]));
      if (d > T) { c++; const key = q.n + ":" + (x >> 4) * 16 + "," + (((y + Y0) >> 3) * 8); hits[key] = (hits[key] || 0) + 1; }
    }
    r[q.n] = c; tot[q.n] += c;
  }
  for (let y = Math.max(0, y0 - Y0); y < Math.min(H, y1 - Y0); y++) for (let x = x0; x < x1; x++) if (b[y * W + x]) band++;
  rows.push(r);
}
console.log("band px", band, "totals", JSON.stringify(tot), "per 1000:", Object.entries(tot).map(([n, c]) => n + " " + ((1000 * c) / band).toFixed(2)).join("  "));
const names = seqs.map((q) => q.n);
rows.sort((a, b) => (b[names[1]] - b[names[0]]) - (a[names[1]] - a[names[0]]));
console.log("frames with the largest " + names[1] + " - " + names[0] + ":"); for (const r of rows.slice(0, 10)) console.log(JSON.stringify(r));
for (const n of names) { const top = Object.entries(hits).filter(([k]) => k.startsWith(n + ":")).sort((a, b) => b[1] - a[1]).slice(0, 6); console.log(n, "top 16x8 cells:", top.map(([k, c]) => k.split(":")[1] + "=" + c).join("  ")); }
