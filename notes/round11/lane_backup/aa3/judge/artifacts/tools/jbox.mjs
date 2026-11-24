// Region-boundary check: per frame, the aaIn region of the lane (plane + cloud-card box) and where the G4-vs-off pixels and the
// |lane - off| > T pixels sit relative to its boundary (distance <= 1.5 px) vs elsewhere; also the band pixels inside the box.
//   node jbox.mjs --base D --lane D --off D [--t 8]
import { loadSeq, bandFromMask } from "../../../aa3/tools/lib.mjs";
const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].slice(2)] = argv[i + 1];
const B = loadSeq(opt.base), L = loadSeq(opt.lane), O = loadSeq(opt.off);
const W = B.W, H = B.H, y0 = B.y0, T = +(opt.t || 8);
const tot = { g4: 0, g4edge: 0, big: 0, bigEdge: 0, bandInBox: 0, band: 0, edgeBandPx: 0, edgeBandMeanAbs: 0, nearBandPx: 0, nearBandMeanAbs: 0 };
const perFrame = [];
for (let k = 0; k < Math.min(B.n, L.n, O.n); k++) {
  const inf = L.meta.info[k];
  if (!inf.aa || inf.main[0] !== inf.W) continue;
  const P = inf.aa.plane, E = inf.aa.exc;
  // signed distances (px) to each half-plane boundary
  const lin = (a, b, c, x, y) => (a * x + b * y + c) / Math.hypot(a, b);
  const m = B.mask(k);
  const { band } = bandFromMask(m, W, H, 3);
  const fl = L.frame(k), fo = O.frame(k);
  let g4 = 0, g4e = 0, big = 0, bigE = 0;
  for (let y = 1; y < H - 1; y++) {
    const gy = inf.H - (y + y0) - 0.5;
    for (let x = 1; x < W - 1; x++) {
      const gx = x + 0.5;
      const i = y * W + x, p = i * 4;
      const dp = lin(P[0], P[1], P[2], gx, gy);
      const d0 = lin(E[0], E[1], E[2], gx, gy), d1 = lin(E[3], E[4], E[5], gx, gy), d2 = lin(E[6], E[7], E[8], gx, gy);
      const inBox = d0 >= 0 && d1 >= 0 && d2 >= 0;
      const inReg = dp < 0 && !inBox;
      // distance to the region's boundary: the plane, or the box's edges where they bound the box
      let db = Math.abs(dp);
      if (dp < 0) {
        // box edges: distance to the box boundary (only the edge segments that bound the box)
        const dBox = inBox ? Math.min(d0, d1, d2) : Math.max(-Math.min(0, d0), -Math.min(0, d1), -Math.min(0, d2));
        db = Math.min(db, Math.abs(dBox));
      }
      const edge = db <= 1.5;
      if (band[i]) { tot.band++; if (inBox) tot.bandInBox++; }
      const d = Math.max(Math.abs(fl[p] - fo[p]), Math.abs(fl[p + 1] - fo[p + 1]), Math.abs(fl[p + 2] - fo[p + 2]));
      if (band[i] && inReg) {
        if (edge) { tot.edgeBandPx++; tot.edgeBandMeanAbs += d; } else if (db <= 12) { tot.nearBandPx++; tot.nearBandMeanAbs += d; }
      }
      if (d > T) { big++; if (edge) bigE++; }
      if (d > 4) {
        let ex = 0;
        for (let c = 0; c < 3; c++) {
          let mn = 255, mx = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = fo[((y + dy) * W + x + dx) * 4 + c]; mn = Math.min(mn, v); mx = Math.max(mx, v); }
          ex = Math.max(ex, fl[p + c] - mx - 4, mn - fl[p + c] - 4);
        }
        if (ex > 0) { g4++; if (edge) g4e++; }
      }
    }
  }
  tot.g4 += g4; tot.g4edge += g4e; tot.big += big; tot.bigEdge += bigE;
  if (g4 || bigE) perFrame.push(`k${k}: g4 ${g4} (edge ${g4e}), |l-o|>${T} ${big} (edge ${bigE})`);
}
tot.edgeBandMeanAbs = +(tot.edgeBandMeanAbs / Math.max(1, tot.edgeBandPx)).toFixed(3);
tot.nearBandMeanAbs = +(tot.nearBandMeanAbs / Math.max(1, tot.nearBandPx)).toFixed(3);
console.log(JSON.stringify(tot));
console.log(perFrame.join("\n"));
