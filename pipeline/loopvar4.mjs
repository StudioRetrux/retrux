// Round 7 composition: q01 (loop F015) shows the orb as a full white dome; the reference shows only a glowing slit (its
// inner ring a thick near-edge-on band across the orb). The t 0.5 tips of B / C (13 / 20, round 5 "too flat") now open
// them too far: smaller tips, and D 8 vs 0.
const T = (b, c, dd) => ({ tune: { loopTipDeg: [5, b, c, dd], loopTipAt: [0, 0.5, 0.5, 0.5], loopTipWidth: 0.45 } });
export default {
  b6c10: T(6, 10, 8),
  b0c8: T(0, 8, 8),
  b0c0: T(0, 0, 8),
  bm6c0: T(-6, 0, 8),
};
