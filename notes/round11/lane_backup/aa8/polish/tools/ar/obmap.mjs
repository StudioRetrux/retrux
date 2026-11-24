// judge-artrefl: where is X over-bright (or over-dark) beyond BOTH the GT and BASE by > t (luma), and NEW vs REF (X-REF > d)?
// Accumulates per px over frames k0..k1, prints the top 16x16 cells (full-frame coords) and writes a heat overlay PNG on frame kv.
//   node obmap.mjs --x X --ref R --gt G --base B [--t 12] [--d 4] [--sign 1|-1] [--k0 0] [--k1 N] [--kv K] --out F.png
import { loadSeq, png } from "./lib.mjs";
const a = process.argv.slice(2), o = (k, d) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const X = loadSeq(o("x")), R = loadSeq(o("ref")), G = loadSeq(o("gt")), B = loadSeq(o("base"));
const t = +o("t", 12), d = +o("d", 4), sg = +o("sign", 1), k0 = +o("k0", 0), k1 = +o("k1", X.n - 1), kv = +o("kv", k0);
const W = X.W, H = X.H, y0 = X.y0;
const lum = (f, i) => 0.2126 * f[i] + 0.7152 * f[i + 1] + 0.0722 * f[i + 2];
const acc = new Float32Array(W * H); let tot = 0;
for (let k = k0; k <= k1; k++) {
  const fx = X.frame(k), fr = R.frame(k), fg = G.frame(k), fb = B.frame(k);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ix = (y * W + x) * 4, ir = ((y + y0 - R.y0) * R.W + x) * 4, ig = ((y + y0 - G.y0) * G.W + x) * 4, ib = ((y + y0 - B.y0) * B.W + x) * 4;
    const lx = lum(fx, ix), lr = lum(fr, ir), lg = lum(fg, ig), lb = lum(fb, ib);
    const hit = sg > 0 ? (lx > Math.max(lg, lb) + t && lx - lr > d) : (lx < Math.min(lg, lb) - t && lr - lx > d);
    if (hit) { acc[y * W + x]++; tot++; }
  }
}
const C = 16, cells = [];
for (let cy = 0; cy < H; cy += C) for (let cx = 0; cx < W; cx += C) {
  let s = 0; for (let y = cy; y < Math.min(H, cy + C); y++) for (let x = cx; x < Math.min(W, cx + C); x++) s += acc[y * W + x];
  if (s > 0) cells.push({ x: cx, y: cy + y0, s });
}
cells.sort((p, q) => q.s - p.s);
console.log(`px-frames ${tot} (frames ${k0}-${k1}, t ${t}, d ${d}, sign ${sg})`);
for (const c of cells.slice(0, 14)) console.log(`  cell x${c.x}-${c.x + C} y${c.y}-${c.y + C} ${c.s}`);
const f = X.frame(kv), img = new Uint8Array(W * H * 4); let mx = 0; for (const v of acc) mx = Math.max(mx, v);
for (let i = 0; i < W * H; i++) {
  const g = (0.2126 * f[i * 4] + 0.7152 * f[i * 4 + 1] + 0.0722 * f[i * 4 + 2]) * 0.6;
  const v = acc[i] > 0 ? Math.min(1, 0.3 + acc[i] / Math.max(1, mx) * 3) : 0;
  img[i * 4] = v ? 255 * v : g; img[i * 4 + 1] = v ? (sg > 0 ? 220 * v : 40) : g; img[i * 4 + 2] = v ? 40 : g; img[i * 4 + 3] = 255;
}
if (o("out")) { png(img, W, H, o("out")); console.log("wrote " + o("out")); }
