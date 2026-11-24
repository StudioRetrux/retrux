// luma column profile: node colp.mjs K X Y0 Y1 NAME=SEQ ...  (mean of columns X..X+2)
import { loadSeq } from "./lib.mjs";
const [ks, xs, a, b, ...rest] = process.argv.slice(2); const k = +ks, x = +xs, y0 = +a, y1 = +b;
const S = rest.map((s) => { const [n, p] = s.split("="); return { n, s: loadSeq(p) }; });
console.log("y    " + S.map((q) => q.n.padStart(7)).join(""));
for (let y = y0; y <= y1; y++) {
  let row = String(y).padEnd(5);
  for (const q of S) { const f = q.s.frame(k); const W = q.s.W; let v = 0; for (let dx = 0; dx < 3; dx++) { const p = ((y - q.s.y0) * W + x + dx) * 4; v += 0.2126 * f[p] + 0.7152 * f[p + 1] + 0.0722 * f[p + 2]; } row += (v / 3).toFixed(0).padStart(7); }
  console.log(row);
}
