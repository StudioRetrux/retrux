// frame-to-frame luma change in a box, per phase: mean |dL|, p99 |dL|, share of px with |dL| > 12 (shimmer / crawl)
//   node tflick.mjs x0,y0,x1,y1 NAME=SEQ ...  (phases for the hold path: press k0-90, sustain 150-300, release 300-360, after 360-480)
import { loadSeq } from "./lib.mjs";
const [box, ...rest] = process.argv.slice(2); const [x0, y0, x1, y1] = box.split(",").map(Number);
const S = rest.map((s) => { const [n, p] = s.split("="); return { n, s: loadSeq(p) }; });
const lum = (f, p) => 0.2126 * f[p] + 0.7152 * f[p + 1] + 0.0722 * f[p + 2];
const phases = [["press", 1, 90], ["sustain", 150, 300], ["release", 300, 360], ["after", 360, 480]];
for (const q of S) {
  const per = [];
  for (let k = 1; k < q.s.n; k++) {
    const a = q.s.frame(k), b = q.s.frame(k - 1); const d = [];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const p = ((y - q.s.y0) * q.s.W + x) * 4; d.push(Math.abs(lum(a, p) - lum(b, p))); }
    d.sort((u, v) => u - v); const m = d.reduce((s, v) => s + v, 0) / d.length; const big = d.filter((v) => v > 12).length / d.length;
    per.push({ k, m, p99: d[Math.floor(d.length * 0.99)], big });
  }
  const out = phases.map(([nm, k0, k1]) => { const r = per.filter((e) => e.k >= k0 && e.k < k1); if (!r.length) return `${nm} -`; const av = (f) => r.reduce((s, e) => s + f(e), 0) / r.length; return `${nm} mean ${av((e) => e.m).toFixed(2)} p99 ${av((e) => e.p99).toFixed(1)} >12 ${(100 * av((e) => e.big)).toFixed(2)}%`; });
  console.log(`${q.n.padEnd(6)} ${out.join(" | ")}`);
}
