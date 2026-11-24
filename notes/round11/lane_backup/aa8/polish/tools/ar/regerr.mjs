// judge-artrefl: luma error vs the GT per region (band = +-r px waterline band, lake interior, solid; hero dilated excluded):
// mean signed, mean abs, px-frames brighter than GT by > t and darker by > t. Also "over-bright beyond BASE": X > max(GT, BASE) + t.
//   node regerr.mjs --mask M --gt G --base B [--r 3] [--t 12] [--k0 0] [--k1 N] NAME=SEQ ...
import { loadSeq, bandFromMask } from "./lib.mjs";
const argv = process.argv.slice(2); const opt = {}; const seqs = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i]; else { const [n, p] = argv[i].split("="); seqs.push({ name: n, s: loadSeq(p) }); } }
const M = loadSeq(opt.mask), G = loadSeq(opt.gt), B = loadSeq(opt.base); const r = +(opt.r || 3), t = +(opt.t || 12);
const W = M.W, H = M.H, y0 = M.y0;
const k0 = +(opt.k0 || 0), k1 = Math.min(+(opt.k1 || 1e9), M.n, G.n, B.n, ...seqs.map((q) => q.s.n));
const lum = (f, q) => 0.2126 * f[q] + 0.7152 * f[q + 1] + 0.0722 * f[q + 2];
const regs = ["band", "lake", "solid"]; const st = {};
for (const q of [{ name: "BASE", s: B }, ...seqs]) { st[q.name] = {}; for (const g of regs) st[q.name][g] = { n: 0, s: 0, a: 0, br: 0, dk: 0, obB: 0, odB: 0 }; }
for (let k = k0; k < k1; k++) {
  const { band, lake, hero } = bandFromMask(M.mask(k), W, H, r);
  const fg = G.frame(k), fb = B.frame(k); const fx = seqs.map((q) => q.s.frame(k));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (hero[i]) continue; const g = band[i] ? "band" : lake[i] ? "lake" : "solid";
    const yy = y + y0; const lg = lum(fg, ((yy - G.y0) * G.W + x) * 4), lb = lum(fb, ((yy - B.y0) * B.W + x) * 4);
    const all = [{ name: "BASE", v: lb }, ...seqs.map((q, j) => ({ name: q.name, v: lum(fx[j], ((yy - q.s.y0) * q.s.W + x) * 4) }))];
    for (const { name, v } of all) { const e = v - lg, S = st[name][g]; S.n++; S.s += e; S.a += Math.abs(e); if (e > t) S.br++; if (e < -t) S.dk++; if (v > Math.max(lg, lb) + t) S.obB++; if (v < Math.min(lg, lb) - t) S.odB++; }
  }
}
console.log(`frames ${k1 - k0}, t ${t} lv, r ${r}`);
for (const g of regs) for (const [name, R] of Object.entries(st)) { const S = R[g]; console.log(`${g.padEnd(5)} ${name.padEnd(5)} n ${S.n} signed ${(S.s / S.n).toFixed(2)} abs ${(S.a / S.n).toFixed(2)} brighter>t ${S.br} darker>t ${S.dk} | beyond GT&BASE: brighter ${S.obB} darker ${S.odB}`); }
