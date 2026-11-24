// Lists the pixels of A more than T levels outside B's 3x3 per-channel range (frame, x, y, excess, sign, in band / hero, A vs B values)
//   node g4list.mjs --mask MASKSEQ --a SEQ --b SEQ [--t 4] [--max 60]
import { loadSeq, bandFromMask } from "./lib.mjs";
const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].slice(2)] = argv[i + 1];
const M = loadSeq(opt.mask), A = loadSeq(opt.a), B = loadSeq(opt.b);
const W = A.W, H = A.H, T = +(opt.t || 4), MAX = +(opt.max || 60);
const out = [];
for (let k = 0; k < Math.min(A.n, B.n, M.n); k++) {
  const m = M.mask(k);
  const { band, hero } = bandFromMask(m, W, H, 3);
  const fa = A.frame(k), fb = B.frame(k);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, p = i * 4;
    let ex = 0, sg = 0;
    for (let c = 0; c < 3; c++) {
      let mn = 255, mx = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = fb[((y + dy) * W + x + dx) * 4 + c]; mn = Math.min(mn, v); mx = Math.max(mx, v); }
      if (fa[p + c] > mx + T && fa[p + c] - mx > ex) { ex = fa[p + c] - mx; sg = 1; }
      if (fa[p + c] < mn - T && mn - fa[p + c] > ex) { ex = mn - fa[p + c]; sg = -1; }
    }
    if (ex) out.push({ k, x, y: y + A.y0, ex, sg, band: band[i], hero: hero[i], a: [fa[p], fa[p + 1], fa[p + 2]], b: [fb[p], fb[p + 1], fb[p + 2]] });
  }
}
console.log(out.length, "pixels");
for (const o of out.slice(0, MAX)) console.log(JSON.stringify(o));
