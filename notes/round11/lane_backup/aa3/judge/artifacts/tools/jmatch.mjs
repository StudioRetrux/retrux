import fs from "node:fs";
import { loadSeq } from "../../../aa3/tools/lib.mjs";
const [seqd, tmpl, a, b] = process.argv.slice(2);
const S = loadSeq(seqd), W = S.W, H = S.H;
const T = fs.readFileSync(tmpl), tw = 200, th = 45;
const tl = new Float32Array(tw * th);
for (let i = 0; i < tw * th; i++) tl[i] = 0.2126 * T[i * 3] + 0.7152 * T[i * 3 + 1] + 0.0722 * T[i * 3 + 2];
let best = { e: Infinity };
for (let k = +a; k <= +b; k++) {
  const f = S.frame(k);
  const L = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) L[i] = 0.2126 * f[i * 4] + 0.7152 * f[i * 4 + 1] + 0.0722 * f[i * 4 + 2];
  for (let y = 0; y + th <= H; y += 1) for (let x = 0; x + tw <= W; x += 2) {
    let e = 0;
    for (let j = 0; j < th && e < best.e; j += 2) for (let i = 0; i < tw; i += 2) { const d = L[(y + j) * W + x + i] - tl[j * tw + i]; e += d * d; }
    if (e < best.e) best = { e, k, x, y: y + S.y0 };
  }
}
console.log(JSON.stringify(best));
