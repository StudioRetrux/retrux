// prejudge-glide A-2: where are A's px > 4 lv outside R's 3x3 range in frames k0..k1 (list of the largest + 40x20 cell histogram)
//   node a2where.mjs A R k0 k1
import { loadSeq } from "./lib.mjs";
const [ad, rd, k0A, k1A] = process.argv.slice(2);
const A = loadSeq(ad), R = loadSeq(rd), W = A.W, H = A.H;
const all = [], cells = new Map();
for (let k = +k0A; k <= +k1A; k++) {
  const fa = A.frame(k), fr = R.frame(k);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = (y * W + x) * 4; let ex = 0, sg = 0;
    for (let c = 0; c < 3; c++) { let mn = 255, mx = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = fr[((y + dy) * W + x + dx) * 4 + c]; if (v < mn) mn = v; if (v > mx) mx = v; } const v = fa[p + c]; if (v > mx + 4 && v - mx > ex) { ex = v - mx; sg = 1; } if (v < mn - 4 && mn - v > ex) { ex = mn - v; sg = -1; } }
    if (!ex) continue;
    all.push([ex, k, x, y + A.y0, sg]);
    const key = `${Math.floor(x / 40) * 40},${Math.floor((y + A.y0) / 20) * 20}`; cells.set(key, (cells.get(key) || 0) + 1);
  }
}
all.sort((a, b) => b[0] - a[0]);
console.log(`${all.length} px; largest: ` + all.slice(0, 12).map((a) => `k${a[1]}(${a[2]},${a[3]})${a[4] * a[0]}`).join(" "));
console.log("densest 40x20 cells: " + [...cells.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + ":" + v).join(" "));
