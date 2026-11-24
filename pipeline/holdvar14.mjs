// T16 round 4: pp20 + B a little flatter (bTiltDeg -86) at several press moments, free phase vs A phase locked at 22.
const T = { holdPitchDeg: 20, bTiltDeg: -86 };
const L = { ...T, aPhaseOn: 1, aPhaseDeg: 22 };
export default {
  f050: { tau: 0.5, tune: T }, f175: { tau: 1.75, tune: T }, f250: { tau: 2.5, tune: T }, f375: { tau: 3.75, tune: T },
  l050: { tau: 0.5, tune: L }, l175: { tau: 1.75, tune: L }, l250: { tau: 2.5, tune: L }, l375: { tau: 3.75, tune: L },
};
