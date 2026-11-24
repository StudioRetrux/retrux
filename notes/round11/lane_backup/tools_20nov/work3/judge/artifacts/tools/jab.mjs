// non-lake, non-hero pixels of X more than 4 lv outside BASE's 3x3 range: count, darker share, max (X = lane, off)
import { loadSeq, bandFromMask } from "../../../aa3/tools/lib.mjs";
const [bd, ...xs] = process.argv.slice(2);
const B = loadSeq(bd), W = B.W, H = B.H;
const X = xs.map((d) => loadSeq(d));
const res = X.map(() => ({ n: 0, dark: 0, max: 0 }));
const n = Math.min(B.n, ...X.map((s) => s.n));
for (let k = 0; k < n; k++) {
  const m = B.mask(k); const { lake, hero } = bandFromMask(m, W, H, 3);
  const fb = B.frame(k), fx = X.map((s) => s.frame(k));
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, p = i * 4;
    if (lake[i] || hero[i]) continue;
    const mn = [255, 255, 255], mx = [0, 0, 0];
    for (let c = 0; c < 3; c++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = fb[((y + dy) * W + x + dx) * 4 + c]; if (v < mn[c]) mn[c] = v; if (v > mx[c]) mx[c] = v; }
    fx.forEach((f, j) => {
      let ex = 0, sg = 0;
      for (let c = 0; c < 3; c++) { if (mn[c] - f[p + c] - 4 > ex) { ex = mn[c] - f[p + c] - 4; sg = -1; } if (f[p + c] - mx[c] - 4 > ex) { ex = f[p + c] - mx[c] - 4; sg = 1; } }
      if (ex > 0) { res[j].n++; if (sg < 0) res[j].dark++; res[j].max = Math.max(res[j].max, ex + 4); }
    });
  }
}
xs.forEach((d, j) => console.log(d, JSON.stringify({ frames: n, ...res[j], perFrame: +(res[j].n / n).toFixed(1) })));
