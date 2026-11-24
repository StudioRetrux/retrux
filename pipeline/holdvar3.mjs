// Hold B variants: F420 shows B's halves as two stacked near-edge-on bands (GLB split +0.47 / -0.57 m held) with the
// orb behind them; ours holds 30 % of the split. Several press moments (tau) each.
const full = { bSplitHeld: 1.0, bTiltDeg: -74, bowlLift: 0.1 };
export default {
  full_t0: { tune: full, tau: 0.3 },
  full_t1: { tune: full, tau: 1.3 },
  full_t2: { tune: full, tau: 2.6 },
  base_t0: { tau: 0.3 },
  base_t1: { tau: 1.3 },
};
