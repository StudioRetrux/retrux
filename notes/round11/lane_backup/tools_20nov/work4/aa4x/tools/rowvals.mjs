import { loadSeq } from "./lib.mjs";
const [k, y, x0, x1, ...dirs] = process.argv.slice(2);
for (const d of dirs) { const s = loadSeq(d.split("=")[1]); const f = s.frame(+k); let o = d.split("=")[0].padEnd(5);
  for (let x = +x0; x < +x1; x++) { const p = ((+y - s.y0) * s.W + x) * 4; o += String(Math.round(0.2126 * f[p] + 0.7152 * f[p + 1] + 0.0722 * f[p + 2])).padStart(4); } console.log(o); }
