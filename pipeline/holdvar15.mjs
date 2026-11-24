// T16 + T05 candidate (c85t05): the hold seen from a little above (pitch 20), B flatter (-86), A phase locked at 22,
// pulled in (holdCompact 0.85) with the T05 drift / lift values. Several press moments.
const T = { holdPitchDeg: 20, bTiltDeg: -86, aPhaseOn: 1, aPhaseDeg: 22, holdCompact: 0.85, aLowerLift: 0.7, aOutBase: -0.22, aOutAmp: 0.15, aLowerTiltCap: 18 };
export default {
  c26: { tune: T },
  c05: { tau: 0.5, tune: T },
  c17: { tau: 1.75, tune: T },
  c37: { tau: 3.75, tune: T },
};
