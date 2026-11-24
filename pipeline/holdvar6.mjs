// Hold (F402 / F420): ring A is not face-on in the reference. Its pieces are swung ~55-60 deg out of the screen plane
// (F402: a thick ribbon from the upper-left across the top and down the right side), thick oblique slabs with
// their side faces showing, unevenly spaced and asymmetric. Slots: top, left, bottom, right.
const T = (o) => ({ tune: o, tau: 2.6 });
const Q = { aSlotTilt: [70, -60, 55, -75], aLowerTiltCap: 45, aSlotSlide: [24, -14, 22, -26] };
export default {
  aT55: T({ aHoldTiltDeg: 55, aHoldAxisDeg: 135 }),
  aTm55: T({ aHoldTiltDeg: -55, aHoldAxisDeg: 135 }),
  aT40: T({ aHoldTiltDeg: 40, aHoldAxisDeg: 135 }),
  quarters: T(Q),
  aT55q: T({ ...Q, aHoldTiltDeg: 55, aHoldAxisDeg: 135 }),
  aTm55q: T({ ...Q, aHoldTiltDeg: -55, aHoldAxisDeg: 135 }),
};
