// For pixels that B changes vs A (> 2 lv): does B move toward the GT? per box / overall; split by change sign (luma)
import { loadSeq } from "./lib.mjs";
const [da, db, dg, strideS] = process.argv.slice(2);
const A = loadSeq(da), B = loadSeq(db), G = loadSeq(dg);
const W = A.W, Y0 = A.y0, stride = +(strideS || 2);
const BOXES = { FS: [180, 600, 430, 720], WR: [990, 650, 1215, 725], DR: [350, 690, 660, 766], FF: [0, 445, 680, 560], FR: [900, 450, 1440, 515], RS: [940, 590, 1440, 655] };
const boxOf = (x, y) => { for (const [n, b] of Object.entries(BOXES)) if (x >= b[0] && x < b[2] && y >= b[1] && y < b[3]) return n; return "other"; };
const acc = {};
const L = (f, p) => 0.2126 * f[p] + 0.7152 * f[p + 1] + 0.0722 * f[p + 2];
const N = Math.min(A.n, B.n, G.n);
for (let k = 1; k < N; k += stride) {
  const a = A.frame(k), b = B.frame(k), g = G.frame(k);
  for (let i = 0, q = 0; i < a.length; i += 4, q++) {
    const d = L(b, i) - L(a, i);
    if (Math.abs(d) <= 2) continue;
    const x = q % W, y = ((q / W) | 0) + Y0;
    const n = boxOf(x, y);
    const r = (acc[n] ??= { n: 0, ea: 0, eb: 0, toward: 0, darker: 0, eaD: 0, ebD: 0, nD: 0 });
    const ea = Math.abs(L(a, i) - L(g, i)), eb = Math.abs(L(b, i) - L(g, i));
    r.n++; r.ea += ea; r.eb += eb; if (eb < ea) r.toward++;
    if (d < 0) { r.darker++; r.nD++; r.eaD += ea; r.ebD += eb; }
  }
}
for (const [n, r] of Object.entries(acc)) console.log(n.padEnd(6), `changed px ${String(r.n).padStart(6)}  |A-GT| ${(r.ea / r.n).toFixed(2)} -> |B-GT| ${(r.eb / r.n).toFixed(2)}  toward GT ${((100 * r.toward) / r.n).toFixed(0)}%  darker ${((100 * r.darker) / r.n).toFixed(0)}% (darker: ${(r.eaD / Math.max(1, r.nD)).toFixed(2)} -> ${(r.ebD / Math.max(1, r.nD)).toFixed(2)})`);
