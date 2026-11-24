// G4 / G5 helper on two full-frame sequences of the same path (A = lane, B = reference) with a mask session (full frames):
//   node g45.mjs --mask MASKSEQ --a SEQ --b SEQ [--k0 0 --k1 N] [--out DIR]
// G5: |A - B| (max channel) over the hero mask, the sky / mountains above the horizon (rows where no lake pixel exists in the
//     mask, above the first lake row - 4), and the lake region; the mean |diff| per row around the horizon line (seam check).
// G4: pixels of A more than 4 levels outside B's 3x3 per-channel range: total, on the band, by sign (darker / brighter), and
//     the largest excess; histogram of excess.
import fs from "node:fs";
import { loadSeq, bandFromMask, png } from "./lib.mjs";
const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].slice(2)] = argv[i + 1];
const M = loadSeq(opt.mask), A = loadSeq(opt.a), B = loadSeq(opt.b);
const W = A.W, H = A.H;
if (A.y0 !== 0 || B.y0 !== 0 || M.y0 !== 0) console.log("WARN: not full frames (y0 " + A.y0 + ")");
const k0 = +(opt.k0 || 0), k1 = Math.min(+(opt.k1 || 1e9), A.n, B.n, M.n);
const acc = { hero: [0, 0, 0], sky: [0, 0, 0], lake: [0, 0, 0] }; // sum, n, max
const g4 = { all: 0, band: 0, dark: 0, bright: 0, maxEx: 0, hist: new Array(8).fill(0), px: 0 };
const rowD = new Float64Array(H), rowN = new Float64Array(H);
let horizon = 0;
const heat = new Float32Array(W * H);
for (let k = k0; k < k1; k++) {
  const m = M.mask(k);
  const { band, hero } = bandFromMask(m, W, H, 3);
  // first row with a lake pixel
  let top = H;
  for (let y = 0; y < H && top === H; y++) for (let x = 0; x < W; x++) if (m[y * W + x] & 1) { top = y; break; }
  horizon += top;
  const fa = A.frame(k), fb = B.frame(k);
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, p = i * 4;
      const d = Math.max(Math.abs(fa[p] - fb[p]), Math.abs(fa[p + 1] - fb[p + 1]), Math.abs(fa[p + 2] - fb[p + 2]));
      const r = hero[i] ? acc.hero : y < top - 4 ? acc.sky : acc.lake;
      r[0] += d; r[1]++; r[2] = Math.max(r[2], d);
      if (!hero[i]) { rowD[y] += d; rowN[y]++; }
      // G4
      let ex = 0, sgn = 0;
      for (let c = 0; c < 3; c++) {
        let mn = 255, mx = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = fb[((y + dy) * W + x + dx) * 4 + c]; if (v < mn) mn = v; if (v > mx) mx = v; }
        const v = fa[p + c];
        if (v > mx + 4 && v - mx > ex) { ex = v - mx; sgn = 1; }
        if (v < mn - 4 && mn - v > ex) { ex = mn - v; sgn = -1; }
      }
      g4.px++;
      if (ex > 0) {
        g4.all++; if (band[i]) g4.band++; if (sgn < 0) g4.dark++; else g4.bright++;
        g4.maxEx = Math.max(g4.maxEx, ex);
        g4.hist[Math.min(7, Math.floor((ex - 4) / 2))]++;
        heat[i] += 1;
      }
    }
}
const n = k1 - k0;
const f = (r) => ({ mean: +(r[0] / Math.max(1, r[1])).toFixed(4), max: r[2] });
horizon = Math.round(horizon / n);
const rows = [];
for (let y = Math.max(0, horizon - 12); y < Math.min(H, horizon + 30); y++) rows.push(`${y}:${(rowD[y] / Math.max(1, rowN[y])).toFixed(3)}`);
const res = { frames: n, G5: { hero: f(acc.hero), skyAboveHorizon: f(acc.sky), lakeRegion: f(acc.lake), horizonRow: horizon, rowsMeanDiff: rows.join(" ") }, G4: { ...g4, perMpxFrame: +((1e6 * g4.all) / g4.px).toFixed(2), histNote: "excess bins 4-6,6-8,...,>18" } };
console.log(JSON.stringify(res, null, 1));
if (opt.out) {
  fs.mkdirSync(opt.out, { recursive: true });
  const img = new Uint8Array(W * H * 4);
  const base = A.frame(k0);
  for (let i = 0; i < W * H; i++) {
    const l = (0.2126 * base[i * 4] + 0.7152 * base[i * 4 + 1] + 0.0722 * base[i * 4 + 2]) * 0.4;
    const h = Math.min(1, heat[i] / Math.max(1, n * 0.05));
    img[i * 4] = Math.min(255, l + 255 * h); img[i * 4 + 1] = l * (1 - h) + 80 * h; img[i * 4 + 2] = Math.min(255, l + 255 * h); img[i * 4 + 3] = 255;
  }
  png(img, W, H, opt.out + "/g4heat.png");
  fs.writeFileSync(opt.out + "/g45.json", JSON.stringify(res, null, 1));
}
