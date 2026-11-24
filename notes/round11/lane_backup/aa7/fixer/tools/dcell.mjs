// fixer: where do A and B differ by > T lv in frame k: top 32x16 cells (count, signed mean)
import { loadSeq, luma8 } from "./lib.mjs";
const [a, b, ks, Ts, yArg] = process.argv.slice(2); const A = loadSeq(a), B = loadSeq(b), T = +Ts; const [ya, yb] = yArg.split(",").map(Number);
for (const k of ks.split(",").map(Number)) {
  const fa = A.frame(k), fb = B.frame(k); const cells = new Map();
  for (let y = ya; y < yb; y++) for (let x = 0; x < A.W; x++) { const i = ((y - A.y0) * A.W + x) * 4; const d = luma8(fa[i], fa[i + 1], fa[i + 2]) - luma8(fb[i], fb[i + 1], fb[i + 2]); if (Math.abs(d) > T) { const key = `${x >> 5 << 5},${y >> 4 << 4}`; const c = cells.get(key) || [0, 0]; c[0]++; c[1] += d; cells.set(key, c); } }
  const top = [...cells.entries()].sort((p, q) => q[1][0] - p[1][0]).slice(0, 6).map(([kk, [n, s]]) => `${kk}=${n}(${(s / n).toFixed(0)})`);
  console.log(`k${k}`, top.join("  "));
}
