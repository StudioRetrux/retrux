// Hold framing variants around the T07 defaults (bTiltDeg -70, bowlLift 0.3, bSplitHeld 0.3, A drift
// -0.17 + 0.20 cos(th - 65 deg), aLift 0.06). The camera pose stays frozen (the hold plate is rendered there).
export default {
  liftHi: { tune: { bowlLift: 0.38 } },
  tucked: { tune: { aOutBase: -0.22, aOutAmp: 0.22 } },
  tilt74: { tune: { bTiltDeg: -74 } },
  split15: { tune: { bSplitHeld: 0.15 } },
};
