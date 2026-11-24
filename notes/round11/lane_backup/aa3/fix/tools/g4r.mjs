// G4 outliers of LANE vs OFF (lane ?lktaa=0) with a (2r+1)^2 display neighbourhood, per frame scale: node g4r.mjs LANE OFF
import { loadSeq } from "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work3/judge/motion/tools/lib.mjs";
const [l, o] = process.argv.slice(2); const L = loadSeq(l), O = loadSeq(o); const W = L.W, H = L.H;
const seg = {};
for (let k = 0; k < Math.min(L.n, O.n); k++) {
  const a = L.frame(k), b = O.frame(k); const sc = JSON.stringify(L.meta.info[k].main);
  const s = (seg[sc] ??= { frames: 0, r1: 0, r2: 0 }); s.frames++;
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = (y * W + x) * 4;
    for (let c = 0; c < 3; c++) {
      const v = a[i + c];
      let mn1 = 255, mx1 = 0, mn2 = 255, mx2 = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const w = b[i + (dy * W + dx) * 4 + c]; if (w < mn2) mn2 = w; if (w > mx2) mx2 = w; if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) { if (w < mn1) mn1 = w; if (w > mx1) mx1 = w; } }
      if (v < mn1 - 4 || v > mx1 + 4) { s.r1++; if (v < mn2 - 4 || v > mx2 + 4) s.r2++; break; }
    }
  }
}
console.log(JSON.stringify(seg));
