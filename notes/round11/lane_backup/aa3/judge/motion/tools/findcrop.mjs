// locate the lead's strip cells (200 x 45 crops at 3x, 7 rows, gap 3) in a sequence: brute-force SSD on a coarse grid
import fs from "node:fs"; import { loadSeq } from "./lib.mjs";
const [rgb, seqDir] = process.argv.slice(2); const SW = 1209, SH = 999; const img = fs.readFileSync(rgb);
const S = loadSeq(seqDir); const W = S.W, oy = S.y0;
const cw = 200, ch = 45, gap = 3, z = 3;
const cell = (r, c) => { const o = new Float32Array(cw * ch); for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const X = (c * (cw + gap) + i) * z + 1, Y = (r * (ch + gap) + j) * z + 1; const p = (Y * SW + X) * 3; o[j * cw + i] = 0.2126 * img[p] + 0.7152 * img[p + 1] + 0.0722 * img[p + 2]; } return o; };
const C0 = cell(0, 0);
const pts = []; for (let j = 2; j < ch; j += 6) for (let i = 2; i < cw; i += 9) pts.push([i, j]);
let best = { e: Infinity };
for (let k = 0; k < S.n; k++) { const F = S.frame(k); const L = (x, y) => { const p = ((y - oy) * W + x) * 4; return 0.2126 * F[p] + 0.7152 * F[p + 1] + 0.0722 * F[p + 2]; };
  for (let y0 = 440; y0 <= 560; y0++) for (let x0 = 0; x0 + cw <= W; x0 += 2) { let e = 0; for (const [i, j] of pts) { const d = L(x0 + i, y0 + j) - C0[j * cw + i]; e += d * d; if (e > best.e) break; } if (e < best.e) best = { e, k, x0, y0 }; } }
console.log("cell(0,0) best", best);
// refine x by 1 and check rows: which k for each row (assume same crop)
const sse = (F, x0, y0, C) => { let e = 0; for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const p = ((y0 + j - oy) * W + x0 + i) * 4; const d = 0.2126 * F[p] + 0.7152 * F[p + 1] + 0.0722 * F[p + 2] - C[j * cw + i]; e += d * d; } return e / (cw * ch); };
let bx = best.x0, by = best.y0; let b2 = { e: Infinity };
for (let x0 = bx - 2; x0 <= bx + 2; x0++) for (let y0 = by - 1; y0 <= by + 1; y0++) { const e = sse(S.frame(best.k), x0, y0, C0); if (e < b2.e) b2 = { e, x0, y0 }; }
console.log("refined", b2);
for (let r = 0; r < 7; r++) { const C = cell(r, 0); let bk = { e: Infinity }; for (let k = 0; k < S.n; k++) { const e = sse(S.frame(k), b2.x0, b2.y0, C); if (e < bk.e) bk = { e: +e.toFixed(1), k }; } console.log("row", r, "best k", bk); }
