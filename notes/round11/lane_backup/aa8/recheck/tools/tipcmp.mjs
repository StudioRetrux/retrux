// AA8 recheck: tip box, per frame: mean luma of each seq, |first - other| max and px > 4 / > 16 luma levels, optional probe px.
//   node tipcmp.mjs x0,y0,x1,y1 k0 k1 [--probe x,y] NAME=SEQ NAME=SEQ ...
import { loadSeq } from "./lib.mjs";
const a = process.argv.slice(2); let probe = null; const rest = [];
for (let i = 0; i < a.length; i++) { if (a[i] === "--probe") probe = a[++i].split(",").map(Number); else rest.push(a[i]); }
const [box, k0s, k1s, ...seqs] = rest; const [x0, y0, x1, y1] = box.split(",").map(Number); const k0 = +k0s, k1 = +k1s;
const S = seqs.map((s) => { const [n, p] = s.split("="); return { n, s: loadSeq(p) }; });
const lum = (f, q, x, y) => { const p = ((y - q.y0) * q.W + x) * 4; return 0.2126 * f[p] + 0.7152 * f[p + 1] + 0.0722 * f[p + 2]; };
const tot = S.map(() => ({ mx: 0, n4: 0, n16: 0 }));
for (let k = k0; k <= k1; k++) {
  const F = S.map((q) => q.s.frame(k)); const parts = [];
  S.forEach((q, j) => { let s = 0, c = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { s += lum(F[j], q.s, x, y); c++; } parts.push(`${q.n} mean ${(s / c).toFixed(1)}${probe ? " probe " + lum(F[j], q.s, probe[0], probe[1]).toFixed(0) : ""}`); });
  for (let j = 1; j < S.length; j++) { let mx = 0, n4 = 0, n16 = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const d = Math.abs(lum(F[0], S[0].s, x, y) - lum(F[j], S[j].s, x, y)); mx = Math.max(mx, d); if (d > 4) n4++; if (d > 16) n16++; } parts.push(`|${S[0].n}-${S[j].n}| max ${mx.toFixed(1)} >4 ${n4} >16 ${n16}`); tot[j].mx = Math.max(tot[j].mx, mx); tot[j].n4 += n4; tot[j].n16 += n16; }
  console.log(`k${k} ` + parts.join(" | "));
}
for (let j = 1; j < S.length; j++) console.log(`TOTAL |${S[0].n}-${S[j].n}| k${k0}-${k1} box ${box}: max ${tot[j].mx.toFixed(1)} px>4 ${tot[j].n4} px>16 ${tot[j].n16}`);
