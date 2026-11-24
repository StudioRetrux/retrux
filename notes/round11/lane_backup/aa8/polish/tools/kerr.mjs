// AA8 polish (knee study, L11): error vs the 16-sample GT on THIN DARK features, in one pass for several lanes.
//   S1 "thin-dark"  = jgt2's set: px off the lake, off the +-3 px waterline band, off the hero (6 px dilated), where the GT's luma
//                     is >= 12 lv below the max of its 3x3 (a thin dark feature of the GT); the judges' L10 numbers.
//   S2 "wl-lines"   = the same GT test ON the waterline band (the floes' / rocks' thin dark waterline lines of AR-2).
// Per lane and set: px-frames, mean |lane - GT| (luma, 8-bit levels), mean signed (lane - GT), and on S2 the AR-2 count of px
// brighter than max(GT, BASE) + 12. Plus jgt2's own count (px off lake / band / hero > 4 lv outside BASE's 3x3, any channel).
//   node kerr.mjs BASE(with mask) GT k0 k1 NAME=SEQ ...      (BASE is also reported as a lane)
import { loadSeq, bandFromMask } from "./ar/lib.mjs";
const [bd, gd, a, b, ...rest] = process.argv.slice(2);
const B = loadSeq(bd), G = loadSeq(gd), W = B.W, H = B.H;
const lanes = rest.map((s) => { const [n, p] = s.split("="); return { n, s: loadSeq(p) }; });
const k0 = +a, k1 = Math.min(+b, B.n, G.n, ...lanes.map((l) => l.s.n));
const lum = (f, p) => 0.2126 * f[p] + 0.7152 * f[p + 1] + 0.0722 * f[p + 2];
const acc = () => ({ n: 0, abs: 0, sgn: 0, ob: 0 });
const R = Object.fromEntries([["BASE", null], ...lanes.map((l) => [l.n, null])].map(([n]) => [n, { s1: acc(), s2: acc(), out3: 0, out3dark: 0 }]));
for (let k = k0; k < k1; k++) {
  const { lake, hero, band } = bandFromMask(B.mask(k), W, H, 3);
  const fb = B.frame(k), fg = G.frame(k);
  const fl = lanes.map((l) => l.s.frame(k));
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, p = i * 4;
    if (hero[i]) continue;
    const onBand = band[i] === 1;
    if (!onBand && lake[i]) continue;
    let gmax = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) gmax = Math.max(gmax, lum(fg, ((y + dy) * W + x + dx) * 4));
    const lg = lum(fg, p), lB = lum(fb, p);
    const thin = gmax - lg >= 12;
    let mn = null, mx = null;
    if (!onBand) {
      mn = [255, 255, 255]; mx = [0, 0, 0];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const q = ((y + dy) * W + x + dx) * 4;
        for (let c = 0; c < 3; c++) { const v = fb[q + c]; if (v < mn[c]) mn[c] = v; if (v > mx[c]) mx[c] = v; }
      }
    }
    const put = (name, f) => {
      const r = R[name], l = lum(f, p);
      if (thin) {
        const s = onBand ? r.s2 : r.s1;
        s.n++; s.abs += Math.abs(l - lg); s.sgn += l - lg;
        if (onBand && l > Math.max(lg, lB) + 12) s.ob++;
      }
      if (!onBand) {
        let ex = 0, sg = 0;
        for (let c = 0; c < 3; c++) {
          if (f[p + c] > mx[c] + 4 && f[p + c] - mx[c] > ex) { ex = f[p + c] - mx[c]; sg = 1; }
          if (f[p + c] < mn[c] - 4 && mn[c] - f[p + c] > ex) { ex = mn[c] - f[p + c]; sg = -1; }
        }
        if (ex) { r.out3++; if (sg < 0) r.out3dark++; }
      }
    };
    put("BASE", fb);
    lanes.forEach((l, j) => put(l.n, fl[j]));
  }
}
const f4 = (v) => +v.toFixed(4);
for (const [n, r] of Object.entries(R)) {
  const o = (s) => ({ n: s.n, meanAbs: f4(s.abs / Math.max(1, s.n)), meanSigned: f4(s.sgn / Math.max(1, s.n)), overBright12: s.ob });
  console.log(JSON.stringify({ lane: n, frames: k1 - k0, thinDark: o(r.s1), wlLines: o(r.s2), jgt2OutsideBase3x3: r.out3, jgt2Darker: r.out3dark }));
}
