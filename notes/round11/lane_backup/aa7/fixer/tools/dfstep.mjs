// fixer: mean |F(k) - F(k-1)| (luma) over rows y0-y1 for frames ks, several sequences (spike check at governor steps)
import { loadSeq, luma8 } from "./lib.mjs";
const [ksArg, yArg, ...dirs] = process.argv.slice(2);
const ks = ksArg.split(",").map(Number); const [ya, yb] = yArg.split(",").map(Number);
for (const d of dirs) {
  const s = loadSeq(d); const out = [];
  for (const k of ks) {
    const a = s.frame(k - 1), b = s.frame(k); let sum = 0, n = 0;
    for (let y = ya; y < yb; y++) for (let x = 0; x < s.W; x++) { const i = ((y - s.y0) * s.W + x) * 4; sum += Math.abs(luma8(b[i], b[i + 1], b[i + 2]) - luma8(a[i], a[i + 1], a[i + 2])); n++; }
    out.push(`k${k} ${(sum / n).toFixed(2)}`);
  }
  console.log(d.split("/").pop().padEnd(5), out.join("  "));
}
