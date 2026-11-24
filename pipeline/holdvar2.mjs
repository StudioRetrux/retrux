// Hold variants, round 5 (r5a p06 vs F420): B too open (bbox ratio ~0.54 vs 0.41; the +-0.15 m half split makes
// the ellipse taller) and the orb dome exposed; ring A's quarters tucked into a near-intact ring (the reference keeps
// big gaps between separated slabs).
export default {
  bFlat: { tune: { bTiltDeg: -76, bSplitHeld: 0.1 } },
  bFlatLift: { tune: { bTiltDeg: -76, bSplitHeld: 0.1, bowlLift: 0.42 } },
  bFlatLiftA: { tune: { bTiltDeg: -76, bSplitHeld: 0.1, bowlLift: 0.42, aOutBase: -0.05, aOutAmp: 0.16 } },
  bEdgeLiftA: { tune: { bTiltDeg: -80, bSplitHeld: 0.08, bowlLift: 0.45, aOutBase: -0.02, aOutAmp: 0.14 } },
};
