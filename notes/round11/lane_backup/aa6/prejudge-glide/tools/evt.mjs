// prejudge-glide: per-frame event table for a jcap case dir (variants a6 / g0 / base with mask, same frames):
//   node evt.mjs DIR [--a a6 --b g0 --m base] [--seg ""] [--t 8] [--all]
// per frame: band (+-3 px from BASE's mask) mean |dF| (frame-to-frame) per variant; A vs B: mean |A-B| and the count of A px more
// than T lv outside B's 3x3 range (per channel), and the same vs the mask variant (BASE); per box for the worst frames.
import fs from "node:fs";
import path from "node:path";
import { loadSeq, bandFromMask } from "./lib.mjs";
const argv = process.argv.slice(2);
const dir = argv[0];
const opt = {};
for (let i = 1; i < argv.length; i++) if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "1";
const seg = opt.seg || "";
const A = loadSeq(path.join(dir, (opt.a || "a6") + seg)), B = loadSeq(path.join(dir, (opt.b || "g0") + seg)), M = loadSeq(path.join(dir, (opt.m || "base") + seg));
const T = +(opt.t || 8);
const W = A.W, H = A.H, Y0 = A.y0, sc = W / 1440;
const BOX = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
const boxOf = new Uint8Array(W * H);
Object.values(BOX).forEach(([x0, y0, x1, y1], bi) => {
  for (let y = Math.round(y0 * sc) - Y0; y < Math.round(y1 * sc) - Y0; y++) for (let x = Math.round(x0 * sc); x < Math.round(x1 * sc); x++) if (y >= 0 && y < H && !boxOf[y * W + x]) boxOf[y * W + x] = bi + 1;
});
const names = Object.keys(BOX);
const N = Math.min(A.n, B.n, M.n);
const rows = [];
const outside = (fa, fb, x, y, p) => {
  let ex = 0, sg = 0;
  for (let c = 0; c < 3; c++) {
    let mn = 255, mx = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = fb[((y + dy) * W + x + dx) * 4 + c]; if (v < mn) mn = v; if (v > mx) mx = v; }
    const v = fa[p + c];
    if (v > mx + T && v - mx > ex) { ex = v - mx; sg = 1; }
    if (v < mn - T && mn - v > ex) { ex = mn - v; sg = -1; }
  }
  return ex * sg;
};
const tot = { oB: 0, oM: 0, oBd: 0, oMd: 0, oMbase: 0, n: 0, maxB: 0, maxM: 0 };
const hot = [];
for (let k = 0; k < N; k++) {
  const fa = A.frame(k), fb = B.frame(k), fm = M.frame(k);
  const pa = k ? A.frame(k - 1) : fa, pb = k ? B.frame(k - 1) : fb, pm = k ? M.frame(k - 1) : fm;
  const { band } = bandFromMask(M.mask(k), W, H, Math.round(3 * sc));
  let n = 0, dA = 0, dB = 0, dM = 0, ab = 0, oB = 0, oM = 0, oBd = 0, oM0 = 0;
  const perBox = names.map(() => [0, 0]);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (!band[i] || !boxOf[i]) continue;
    const p = i * 4;
    let a = 0, b = 0, m = 0, d = 0;
    for (let c = 0; c < 3; c++) { a = Math.max(a, Math.abs(fa[p + c] - pa[p + c])); b = Math.max(b, Math.abs(fb[p + c] - pb[p + c])); m = Math.max(m, Math.abs(fm[p + c] - pm[p + c])); d = Math.max(d, Math.abs(fa[p + c] - fb[p + c])); }
    n++; dA += a; dB += b; dM += m; ab += d;
    if (d > T) {
      const e = outside(fa, fb, x, y, p);
      if (e) { oB++; if (e < 0) oBd++; perBox[boxOf[i] - 1][0]++; tot.maxB = Math.max(tot.maxB, Math.abs(e)); if (Math.abs(e) >= 16) hot.push([k, x, y + Y0, e]); }
    }
    const e2 = outside(fa, fm, x, y, p);
    if (e2) { oM++; perBox[boxOf[i] - 1][1]++; tot.maxM = Math.max(tot.maxM, Math.abs(e2)); }
    const e3 = outside(fb, fm, x, y, p);
    if (e3) oM0++;
  }
  const inf = A.meta.info[k];
  rows.push({ k, i: inf.i, ev: inf.ev, act: inf.act ? JSON.stringify(inf.act) : "", taa: inf.taa ? `${inf.taa.weight.toFixed?.(2) ?? inf.taa.weight}/${inf.taa.still}` : "", scale: +(inf.main[0] / inf.W).toFixed(2), n, dA: dA / n, dB: dB / n, dM: dM / n, ab: ab / n, oB, oBd, oM, oM0, perBox });
  tot.oB += oB; tot.oM += oM; tot.oBd += oBd; tot.oMbase += oM0; tot.n += n;
}
const f2 = (v) => v.toFixed(2).padStart(6);
console.log(`${dir}${seg}  A=${opt.a || "a6"} B=${opt.b || "g0"} M=${opt.m || "base"}  frames ${N}  W ${W}  T ${T} lv`);
console.log("  k   i  ev/act                scale taa(w/still)  |dF| A   B      M   | |A-B|  A>B3x3 (dark)  A>M3x3  B>M3x3   per box A>B / A>M");
for (const r of rows) {
  const evs = ((r.ev || "") + " " + r.act).trim();
  const mark = opt.all || evs || r.oB > 20 || r.k < 3 ? "" : null;
  if (mark === null) continue;
  console.log(`${String(r.k).padStart(3)} ${String(r.i).padStart(3)}  ${evs.slice(0, 20).padEnd(20)} ${String(r.scale).padStart(5)} ${r.taa.padEnd(12)} ${f2(r.dA)} ${f2(r.dB)} ${f2(r.dM)} | ${f2(r.ab)} ${String(r.oB).padStart(6)} (${String(r.oBd).padStart(4)}) ${String(r.oM).padStart(7)} ${String(r.oM0).padStart(7)}   ${r.perBox.map((b, j) => names[j] + ":" + b[0] + "/" + b[1]).join(" ")}`);
}
console.log(`TOTAL band px-frames ${tot.n}: A>B3x3 ${tot.oB} (dark ${tot.oBd}, max ${tot.maxB}) = ${(1e6 * tot.oB / tot.n).toFixed(1)} per M band px; A>M3x3 ${tot.oM} (max ${tot.maxM}); B>M3x3 ${tot.oMbase}`);
const srt = [...rows].sort((a, b) => b.dA - a.dA).slice(0, 6);
console.log("largest |dF| A frames: " + srt.map((r) => `k${r.k} ${r.dA.toFixed(2)} (B ${r.dB.toFixed(2)}, M ${r.dM.toFixed(2)})`).join(", "));
const srt2 = [...rows].sort((a, b) => b.dA / Math.max(0.05, b.dB) - a.dA / Math.max(0.05, a.dB)).slice(0, 6);
console.log("largest |dF| A/B ratio: " + srt2.map((r) => `k${r.k} ${r.dA.toFixed(2)}/${r.dB.toFixed(2)}`).join(", "));
console.log("hot (|excess| >= 16 vs B): " + hot.length + " " + hot.slice(0, 20).map((h) => `k${h[0]}(${h[1]},${h[2]})${h[3]}`).join(" "));
if (opt.json) fs.writeFileSync(opt.json, JSON.stringify({ rows, tot, hot }));
