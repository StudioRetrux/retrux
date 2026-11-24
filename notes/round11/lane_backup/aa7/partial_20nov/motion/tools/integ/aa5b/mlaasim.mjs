// AA4Y offline prototype (display space): MSAA-aware MLAA = slope-adaptive box filter ALONG mask edges.
//   node mlaasim.mjs --mask MASKDIR --src SRCDIR --out OUTDIR [--kf 0.25] [--wmax 9] [--smax 32] [--k1 N] [--tent 1]
// Edge pixels (3x3 holds lake and solid, hero excluded). Orientation from the mask's Sobel. For a horizontal-ish edge at
// (x, y): the boundary row-pair in this column (nearest class change between rows y-1..y+1), the run of columns over which
// that same row-pair stays the boundary (MLAA's edge-length search, both ways up to smax) -> L; w = clamp(kf L, 1, wmax);
// output = mean of row y over columns x - w/2 .. x + w/2 (fractional ends). Vertical-ish: transposed.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { loadSeq, bandFromMask } from "./lib.mjs";
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const M = loadSeq(arg("mask")), S = loadSeq(arg("src")), out = arg("out");
const kf = +arg("kf", "0.25"), wmax = +arg("wmax", "9"), smax = +arg("smax", "32"), k1 = Math.min(+arg("k1", "1e9"), S.n - 1);
const W = S.W, H = S.H;
fs.mkdirSync(out, { recursive: true });
const meta = JSON.parse(fs.readFileSync(path.join(S.dir, "meta.json"), "utf8"));
meta.info = meta.info.slice(0, k1 + 1);
fs.writeFileSync(path.join(out, "meta.json"), JSON.stringify(meta));
const stats = { edge: 0, h: 0, v: 0, wsum: 0, filt: 0 };
for (let k = 0; k <= k1; k++) {
  const m = M.mask(k);
  const { lake, solid, hero } = bandFromMask(m, W, H, 3);
  const cls = new Uint8Array(W * H); // 1 lake, 2 solid, 3 partial
  for (let i = 0; i < cls.length; i++) cls[i] = lake[i] ? 1 : solid[i] ? 2 : 3;
  const bin = (i) => (cls[i] === 1 ? 1 : cls[i] === 2 ? 0 : 0.5);
  const F = S.frame(k);
  const O = new Uint8Array(F);
  // boundary between (x, y) and (x, y+1) in a column: classes differ (partial counts as different from both)
  const hb = (x, y) => x >= 0 && x < W && y >= 0 && y + 1 < H && cls[y * W + x] !== cls[(y + 1) * W + x];
  const vb = (x, y) => x >= 0 && x + 1 < W && y >= 0 && y < H && cls[y * W + x] !== cls[y * W + x + 1];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = y * W + x;
    if (hero[i]) continue;
    let l = 0, s = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = i + dy * W + dx; l |= lake[j]; s |= solid[j]; }
    if (!(l && s)) continue;
    stats.edge++;
    // mask Sobel
    const b = (dx, dy) => bin(i + dy * W + dx);
    const gx = b(1, -1) + 2 * b(1, 0) + b(1, 1) - b(-1, -1) - 2 * b(-1, 0) - b(-1, 1);
    const gy = b(-1, 1) + 2 * b(0, 1) + b(1, 1) - b(-1, -1) - 2 * b(0, -1) - b(1, -1);
    const horiz = Math.abs(gy) >= Math.abs(gx);
    let L = 0;
    if (horiz) {
      // boundary row-pair nearest to y in this column: y (y|y+1), y-1 (y-1|y), y+1 (y+1|y+2)
      const yb = hb(x, y) ? y : hb(x, y - 1) ? y - 1 : hb(x, y + 1) ? y + 1 : -1;
      if (yb < 0) continue;
      let a = 0, c = 0;
      while (a < smax && hb(x - a - 1, yb)) a++;
      while (c < smax && hb(x + c + 1, yb)) c++;
      L = a + c + 1;
      stats.h++;
    } else {
      const xb = vb(x, y) ? x : vb(x - 1, y) ? x - 1 : vb(x + 1, y) ? x + 1 : -1;
      if (xb < 0) continue;
      let a = 0, c = 0;
      while (a < smax && vb(xb, y - a - 1)) a++;
      while (c < smax && vb(xb, y + c + 1)) c++;
      L = a + c + 1;
      stats.v++;
    }
    const w = Math.max(1, Math.min(wmax, kf * L));
    if (w <= 1.0001) continue;
    stats.wsum += w; stats.filt++;
    // box of width w centred on the pixel: full taps |i| <= (w-1)/2, fractional end taps
    const r = (w - 1) / 2, ri = Math.floor(r), fr = r - ri;
    const acc = [0, 0, 0]; let ws = 0;
    for (let t = -ri - 1; t <= ri + 1; t++) {
      const wt = Math.abs(t) <= ri ? 1 : fr;
      if (wt <= 0) continue;
      const xx = horiz ? Math.min(W - 1, Math.max(0, x + t)) : x;
      const yy = horiz ? y : Math.min(H - 1, Math.max(0, y + t));
      const p = (yy * W + xx) * 4;
      acc[0] += wt * F[p]; acc[1] += wt * F[p + 1]; acc[2] += wt * F[p + 2]; ws += wt;
    }
    O[i * 4] = Math.round(acc[0] / ws); O[i * 4 + 1] = Math.round(acc[1] / ws); O[i * 4 + 2] = Math.round(acc[2] / ws);
  }
  // write in cap.mjs format (bottom-up rows)
  const row = W * 4, bu = Buffer.alloc(O.length);
  for (let yy = 0; yy < H; yy++) bu.set(O.subarray(yy * row, (yy + 1) * row), (H - 1 - yy) * row);
  fs.writeFileSync(path.join(out, `f${String(k).padStart(4, "0")}.bin`), zlib.deflateSync(bu, { level: 1 }));
}
console.log(`edge px ${stats.edge}, horiz ${stats.h}, vert ${stats.v}, filtered ${stats.filt} (mean w ${(stats.wsum / Math.max(1, stats.filt)).toFixed(2)})`);
