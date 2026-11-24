// T16 + T05 candidate with B's halves parting at the portal (bPortalSplit), B tilt / compactness variants.
const T = { holdPitchDeg: 20, bTiltDeg: -86, aPhaseOn: 1, aPhaseDeg: 22, holdCompact: 0.85, aLowerLift: 0.7, aOutBase: -0.22, aOutAmp: 0.15, aLowerTiltCap: 18 };
export default {
  s06: { tune: { ...T, bPortalSplit: 0.6 } },
  s10: { tune: { ...T, bPortalSplit: 1.0 } },
  s06b80: { tune: { ...T, bPortalSplit: 0.6, bTiltDeg: -80 } },
  s06c90: { tune: { ...T, bPortalSplit: 0.6, holdCompact: 0.9 } },
};
