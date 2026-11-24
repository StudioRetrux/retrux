// T16 round 5 on s06: hold-frame roll (F402's diagonal wrap, an eye) and the portal tilt (C / D ellipses ~0.75 h/w).
const S = { holdPitchDeg: 20, bTiltDeg: -86, aPhaseOn: 1, aPhaseDeg: 22, holdCompact: 0.85, aLowerLift: 0.7, aOutBase: -0.22, aOutAmp: 0.15, aLowerTiltCap: 18, bPortalSplit: 0.6 };
export default {
  s06: { tune: S },
  rp15: { tune: { ...S, holdRollDeg: 15 } },
  rm15: { tune: { ...S, holdRollDeg: -15 } },
  pt20: { tune: { ...S, portalTiltDeg: 20 } },
  ptm20: { tune: { ...S, portalTiltDeg: -20 } },
  rm15pt20: { tune: { ...S, holdRollDeg: -15, portalTiltDeg: 20 } },
};
