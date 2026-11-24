// Pops of X that the reference R does not have: flagged in X (e > thr vs GT) where R's own e <= thr - margin, and X differs
// from R (>2 lv) in frame k or k-1 (the change caused it). Clustered as popscan. 
//   node popnew.mjs --mask M --gt G --x X --ref R [--thr 40] [--margin 10] [--r 3]
import { loadSeq, bandFromMask, luma8 } from "./lib.mjs";
const argv = process.argv.slice(2); const opt = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i];
const thr = +(opt.thr || 40), margin = +(opt.margin || 10), r = +(opt.r || 3);
const M = loadSeq(opt.mask), G = loadSeq(opt.gt), X = loadSeq(opt.x), R = loadSeq(opt.ref);
const W = M.W, H = M.H, y0 = M.y0;
const k1 = Math.min(M.n, G.n, X.n, R.n);
const md = (a, b, i) => Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
let tot = 0; const evs = [];
for (let k = 1; k < k1; k++) {
  const { band } = bandFromMask(M.mask(k), W, H, r);
  const g1 = G.frame(k), g0 = G.frame(k - 1), x1 = X.frame(k), x0 = X.frame(k - 1), r1 = R.frame(k), r0 = R.frame(k - 1);
  const pts = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!band[i]) continue;
    const q = ((y + y0 - X.y0) * W + x) * 4, qg = ((y + y0 - G.y0) * W + x) * 4, qr = ((y + y0 - R.y0) * W + x) * 4;
    const dg = md(g1, g0, qg);
    const ex = md(x1, x0, q) - dg, er = md(r1, r0, qr) - dg;
    if (ex > thr && er <= thr - margin && (md(x1, r1, q) > 2 || md(x0, r0, q) > 2)) pts.push([x, y + y0, ex]);
  }
  tot += pts.length;
  for (const p of pts) {
    let e = evs.find((e) => e.k1 >= k - 1 && e.x0 - 3 <= p[0] && p[0] <= e.x1 + 3 && e.y0 - 3 <= p[1] && p[1] <= e.y1 + 3);
    if (!e) { e = { k0: k, k1: k, x0: p[0], x1: p[0], y0: p[1], y1: p[1], n: 0, emax: 0 }; evs.push(e); }
    e.k1 = k; e.n++; e.emax = Math.max(e.emax, p[2]);
    e.x0 = Math.min(e.x0, p[0]); e.x1 = Math.max(e.x1, p[0]); e.y0 = Math.min(e.y0, p[1]); e.y1 = Math.max(e.y1, p[1]);
  }
}
evs.sort((a, b) => b.n * b.emax - a.n * a.emax);
console.log(`new pops (X flagged, ref not, X != ref): ${tot} px, ${evs.length} clusters, >= 6 px: ${evs.filter((e) => e.n >= 6).length}`);
for (const e of evs.slice(0, +(opt.top || 10))) console.log(`  k${e.k0}-${e.k1} x${e.x0}-${e.x1} y${e.y0}-${e.y1} n${e.n} emax${Math.round(e.emax)}`);
