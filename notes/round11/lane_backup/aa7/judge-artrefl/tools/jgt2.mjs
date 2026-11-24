// A-3 thin dark features, band excluded (the judge's jgt.mjs + exclusions): solid-interior px (not lake, not the +-3 px
// waterline band, not hero; inside the compressed region = rows below y_min) where LANE is > 4 lv outside BASE's 3x3 range.
// Also the THIN-DARK subset: px where GT's luma is >= 12 lv below the max of its 3x3 (a thin dark feature in the GT).
//   node jgt2.mjs BASE(mask) LANE GT [k0 k1]
import { loadSeq, bandFromMask } from "./lib.mjs";
const [bd, ld, gd, a, b] = process.argv.slice(2);
const B = loadSeq(bd), L = loadSeq(ld), G = loadSeq(gd), W = B.W, H = B.H;
const k0 = +(a || 0), k1 = Math.min(+(b || 1e9), B.n, L.n, G.n);
const lum = (f, p) => 0.2126 * f[p] + 0.7152 * f[p + 1] + 0.0722 * f[p + 2];
let n = 0, dark = 0, closerL = 0, sumL = 0, sumB = 0;
let tn = 0, tdark = 0, tsL = 0, tsB = 0, tsdL = 0, tsdB = 0, tall = 0;
for (let k = k0; k < k1; k++) {
  const m = B.mask(k); const { lake, hero, band } = bandFromMask(m, W, H, 3);
  const fb = B.frame(k), fl = L.frame(k), fg = G.frame(k);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, p = i * 4;
    if (lake[i] || hero[i] || band[i]) continue;
    // thin dark in GT: luma >= 12 below its 3x3 max
    let gmax = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) gmax = Math.max(gmax, lum(fg, ((y + dy) * W + x + dx) * 4));
    const lg = lum(fg, p), lL = lum(fl, p), lB = lum(fb, p);
    if (gmax - lg >= 12) { tall++; tsdL += lL - lg; tsdB += lB - lg; tsL += Math.abs(lL - lg); tsB += Math.abs(lB - lg); }
    let ex = 0, sg = 0;
    for (let c = 0; c < 3; c++) {
      let mn = 255, mx = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = fb[((y + dy) * W + x + dx) * 4 + c]; mn = Math.min(mn, v); mx = Math.max(mx, v); }
      if (fl[p + c] > mx + 4 && fl[p + c] - mx > ex) { ex = fl[p + c] - mx; sg = 1; }
      if (fl[p + c] < mn - 4 && mn - fl[p + c] > ex) { ex = mn - fl[p + c]; sg = -1; }
    }
    if (!ex) continue;
    n++; if (sg < 0) dark++;
    const eL = Math.abs(lL - lg), eB = Math.abs(lB - lg);
    sumL += eL; sumB += eB; if (eL < eB) closerL++;
    if (gmax - lg >= 12) { tn++; if (sg < 0) tdark++; }
  }
}
console.log(JSON.stringify({ frames: k1 - k0, outsideBase3x3: n, darker: dark, laneCloserToGT: closerL, meanErrLane: +(sumL / n).toFixed(2), meanErrBase: +(sumB / n).toFixed(2),
  thinDarkPx: tall, thinDark_meanSignedLaneMinusGT: +(tsdL / tall).toFixed(2), thinDark_meanSignedBaseMinusGT: +(tsdB / tall).toFixed(2), thinDark_meanAbsLane: +(tsL / tall).toFixed(2), thinDark_meanAbsBase: +(tsB / tall).toFixed(2), thinDarkOutside: tn, thinDarkOutsideDarker: tdark }));
