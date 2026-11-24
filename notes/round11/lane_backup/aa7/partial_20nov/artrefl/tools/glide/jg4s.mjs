// A-2 recheck: G4 (lane px > 4 lv outside OFF's neighbourhood range) per render-scale segment, with display windows of
// radius 1 (3x3, the original metric), 2 (5x5) and 3 (7x7). At scale s one main texel spans 1/s display px; the TAA clip is the
// MAIN 3x3, so the scale-correct display window is about radius ceil(1.5/s)..ceil(2/s). Also |lane-off| stats.
//   node jg4s.mjs LANE OFF
import { loadSeq } from "./lib.mjs";
const [ld, od] = process.argv.slice(2);
const L = loadSeq(ld), O = loadSeq(od), W = L.W, H = L.H;
const seg = {};
for (let k = 0; k < Math.min(L.n, O.n); k++) {
  const inf = L.meta.info[k];
  const s = +(inf.main[0] / inf.W).toFixed(2);
  const S = (seg[s] = seg[s] || { frames: 0, r1: 0, r2: 0, r3: 0, max1: 0, max2: 0, max3: 0, dark1: 0 });
  S.frames++;
  const fl = L.frame(k), fo = O.frame(k);
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
    const p = (y * W + x) * 4;
    let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(fl[p + c] - fo[p + c]));
    if (d <= 4) continue;
    for (const r of [1, 2, 3]) {
      let ex = 0, sg = 0;
      for (let c = 0; c < 3; c++) {
        let mn = 255, mx = 0;
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const v = fo[((y + dy) * W + x + dx) * 4 + c]; if (v < mn) mn = v; if (v > mx) mx = v; }
        const v = fl[p + c];
        if (v > mx + 4 && v - mx > ex) { ex = v - mx; sg = 1; }
        if (v < mn - 4 && mn - v > ex) { ex = mn - v; sg = -1; }
      }
      if (!ex) break; // a wider window only contains the narrower one
      S["r" + r]++; S["max" + r] = Math.max(S["max" + r], ex); if (r === 1 && sg < 0) S.dark1++;
    }
  }
}
for (const [s, S] of Object.entries(seg).sort((a, b) => b[0] - a[0])) console.log(`scale ${s}: frames ${S.frames} | 3x3 ${S.r1} px (${(S.r1 / S.frames).toFixed(2)}/frame, max ${S.max1}, darker ${S.dark1}) | 5x5 ${S.r2} (${(S.r2 / S.frames).toFixed(2)}/frame, max ${S.max2}) | 7x7 ${S.r3} (${(S.r3 / S.frames).toFixed(2)}/frame, max ${S.max3})`);
