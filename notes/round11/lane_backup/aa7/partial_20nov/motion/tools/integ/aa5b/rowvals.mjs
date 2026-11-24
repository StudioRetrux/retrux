import { loadSeq } from "./lib.mjs";
const [y, x0, x1, k0, k1, ...dirs] = process.argv.slice(2);
const seqs = dirs.map((d) => loadSeq(d));
for (let k = +k0; k <= +k1; k++) {
  const lines = seqs.map((s) => { const f = s.frame(k); const v = []; for (let x = +x0; x <= +x1; x++) { const p = ((+y - s.y0) * s.W + x) * 4; v.push(String(Math.round(0.2126 * f[p] + 0.7152 * f[p + 1] + 0.0722 * f[p + 2])).padStart(4)); } return v.join(""); });
  console.log(String(k).padStart(4), lines.join("  |"));
}
