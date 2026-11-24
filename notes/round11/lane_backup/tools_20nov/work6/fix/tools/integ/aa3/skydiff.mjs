// Where do A and B differ above the lake (rows above the frame's first lake row - 4), hero mask excluded? lists the top spots
import { loadSeq, bandFromMask } from "./lib.mjs";
const [ma, da, db, k0s, k1s] = process.argv.slice(2);
const M = loadSeq(ma), A = loadSeq(da), B = loadSeq(db);
const W = A.W, H = A.H;
const spots = [];
let tot = 0, n4 = 0;
for (let k = +(k0s || 0); k < Math.min(+(k1s || 1e9), A.n); k++) {
  const m = M.mask(k);
  const { hero } = bandFromMask(m, W, H, 3);
  let top = H;
  for (let y = 0; y < H && top === H; y++) for (let x = 0; x < W; x++) if (m[y * W + x] & 1) { top = y; break; }
  const fa = A.frame(k), fb = B.frame(k);
  for (let y = 0; y < top - 4; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, p = i * 4;
    if (hero[i]) continue;
    const d = Math.max(Math.abs(fa[p] - fb[p]), Math.abs(fa[p + 1] - fb[p + 1]), Math.abs(fa[p + 2] - fb[p + 2]));
    if (d) tot++;
    if (d > 4) { n4++; if (spots.length < 400) spots.push([k, x, y + A.y0, d, top + A.y0]); }
  }
}
console.log("px differing above the lake:", tot, ">4:", n4);
const byXY = {};
for (const s of spots) { const key = `${Math.floor(s[1] / 40) * 40},${Math.floor(s[2] / 20) * 20}`; byXY[key] = (byXY[key] || 0) + 1; }
console.log(JSON.stringify(Object.entries(byXY).sort((a, b) => b[1] - a[1]).slice(0, 12)));
console.log(spots.slice(0, 12).map((s) => s.join("/")).join(" "));
