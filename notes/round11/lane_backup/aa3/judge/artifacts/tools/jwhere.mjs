// Where do the differences sit? Over frames k0..k1 accumulate, on BASE frame kref (dimmed):
//   red   = |lane - off| > T outside the mask band (C changing pixels away from the waterline)
//   green = |lane - off| > T inside the band (C's intended work)
//   blue  = |lane - base| > T above the horizon (sky / mountains) or in the hero mask
//   white = lane px > 4 lv outside off's 3x3 range (G4)
// Also prints the top clusters (16 px cells) of red and blue with counts.
//   node jwhere.mjs --base D --lane D --off D --out F.png [--t 4] [--k0 --k1 --kref]
import { loadSeq, bandFromMask, png } from "../../../aa3/tools/lib.mjs";
const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].slice(2)] = argv[i + 1];
const B = loadSeq(opt.base), L = loadSeq(opt.lane), O = loadSeq(opt.off);
const W = B.W, H = B.H, T = +(opt.t || 4);
const k0 = +(opt.k0 || 0), k1 = Math.min(+(opt.k1 || 1e9), B.n, L.n, O.n), kref = +(opt.kref || k0);
const red = new Float32Array(W * H), green = new Float32Array(W * H), blue = new Float32Array(W * H), white = new Float32Array(W * H);
const cells = { red: new Map(), blue: new Map(), white: new Map() };
const bump = (m, x, y, k, v) => { const key = `${x >> 4},${y >> 4}`; const e = m.get(key) || { n: 0, ks: new Set(), max: 0 }; e.n++; e.ks.add(k); e.max = Math.max(e.max, v); m.set(key, e); };
for (let k = k0; k < k1; k++) {
  const m = B.mask(k);
  const { band, hero } = bandFromMask(m, W, H, 3);
  let top = H;
  for (let y = 0; y < H && top === H; y++) for (let x = 0; x < W; x++) if (m[y * W + x] & 1) { top = y; break; }
  const fb = B.frame(k), fl = L.frame(k), fo = O.frame(k);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, p = i * 4;
    const dO = Math.max(Math.abs(fl[p] - fo[p]), Math.abs(fl[p + 1] - fo[p + 1]), Math.abs(fl[p + 2] - fo[p + 2]));
    const dB = Math.max(Math.abs(fl[p] - fb[p]), Math.abs(fl[p + 1] - fb[p + 1]), Math.abs(fl[p + 2] - fb[p + 2]));
    if (dO > T) { if (band[i]) green[i]++; else { red[i]++; bump(cells.red, x, y, k, dO); } }
    if (dB > T && (hero[i] || y < top - 4)) { blue[i]++; bump(cells.blue, x, y, k, dB); }
    if (dO > 4) {
      let ex = 0;
      for (let c = 0; c < 3; c++) {
        let mn = 255, mx = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = fo[((y + dy) * W + x + dx) * 4 + c]; mn = Math.min(mn, v); mx = Math.max(mx, v); }
        ex = Math.max(ex, fl[p + c] - mx - 4, mn - fl[p + c] - 4);
      }
      if (ex > 0) { white[i]++; bump(cells.white, x, y, k, ex + 4); }
    }
  }
}
const ref = B.frame(kref);
const img = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const p = i * 4;
  const l = (0.2126 * ref[p] + 0.7152 * ref[p + 1] + 0.0722 * ref[p + 2]) * 0.3;
  let r = l, g = l, b = l;
  if (green[i]) g = 200;
  if (red[i]) { r = 255; g = 40; b = 40; }
  if (blue[i]) { r = 60; g = 120; b = 255; }
  if (white[i]) { r = g = b = 255; }
  img[p] = r; img[p + 1] = g; img[p + 2] = b; img[p + 3] = 255;
}
png(img, W, H, opt.out);
for (const [name, m] of Object.entries(cells)) {
  const top = [...m.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 12);
  console.log(name, "cells:", m.size, "top:", top.map(([key, e]) => `${key.split(",").map((v) => v * 16).join(",")}(+${B.y0}) n${e.n} f${e.ks.size} max${e.max}`).join(" | "));
}
