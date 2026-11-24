// judge-artrefl G5: X vs R (full frames) changed px (max channel > t) per 32-row band, split hero (mask bit2 dilated 2) / lake+band
// (+-6) / other; the topmost changed row per class; an accumulated change map PNG (red = X darker, green = X brighter) on frame kv.
//   node g5rows.mjs MASKSEQ X R [--t 2] [--k0 0] [--k1 N] [--kv K] [--out F.png]
import { loadSeq, png, bandFromMask } from "./lib.mjs";
const a = process.argv.slice(2), o = (k, d) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const M = loadSeq(a[0]), X = loadSeq(a[1]), R = loadSeq(a[2]); const W = X.W, H = X.H;
const t = +o("t", 2), k0 = +o("k0", 0), k1 = Math.min(+o("k1", 1e9), X.n, R.n, M.n), kv = +o("kv", k0);
const rows = {}, top = { hero: 1e9, lake: 1e9, other: 1e9 }, mx = { hero: 0, lake: 0, other: 0 };
const acc = new Int32Array(W * H);
for (let k = k0; k < k1; k++) {
  const m = M.mask(k); const { band, lake, hero } = bandFromMask(m, W, H, 6);
  const fx = X.frame(k), fr = R.frame(k);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, q = i * 4, mi = (y + X.y0 - M.y0) * W + x;
    const ds = (fx[q] + fx[q + 1] + fx[q + 2]) - (fr[q] + fr[q + 1] + fr[q + 2]);
    const d = Math.max(Math.abs(fx[q] - fr[q]), Math.abs(fx[q + 1] - fr[q + 1]), Math.abs(fx[q + 2] - fr[q + 2]));
    if (d <= t) continue;
    const c = hero[mi] ? "hero" : lake[mi] || band[mi] ? "lake" : "other";
    const yy = y + X.y0, b = Math.floor(yy / 32) * 32;
    rows[b] = rows[b] || { hero: 0, lake: 0, other: 0 }; rows[b][c]++;
    top[c] = Math.min(top[c], yy); mx[c] = Math.max(mx[c], d);
    acc[i] += ds > 0 ? 1 : -1;
  }
}
console.log(`frames ${k0}-${k1 - 1}, t ${t}: topmost changed row hero ${top.hero} lake ${top.lake} other ${top.other}; max d ${JSON.stringify(mx)}`);
for (const b of Object.keys(rows).map(Number).sort((p, q) => p - q)) console.log(`  rows ${b}-${b + 31}: ${JSON.stringify(rows[b])}`);
if (o("out")) {
  const f = X.frame(kv), img = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const g = (f[i * 4] * 0.2126 + f[i * 4 + 1] * 0.7152 + f[i * 4 + 2] * 0.0722) * 0.5;
    if (acc[i] > 0) { img[i * 4] = 40; img[i * 4 + 1] = 255; img[i * 4 + 2] = 40; }
    else if (acc[i] < 0) { img[i * 4] = 255; img[i * 4 + 1] = 40; img[i * 4 + 2] = 40; }
    else { img[i * 4] = img[i * 4 + 1] = img[i * 4 + 2] = g; }
    img[i * 4 + 3] = 255;
  }
  png(img, W, H, o("out")); console.log("wrote " + o("out"));
}
