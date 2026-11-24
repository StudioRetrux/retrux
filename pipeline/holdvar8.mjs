// s4 from holdvar7 at p05 / p06, at two other press moments too (the spins are latched per slot).
const T = (o, tau = 2.6) => ({ tune: o, tau });
const S4 = { aSlotSpin: [-30, 25, -30, 30], aSlotSlide: [24, -14, 22, -26], aSlotTilt: [60, -45, 50, -60], aLowerTiltCap: 40, aOutBase: -0.05, aOutAmp: 0.25 };
export default {
  s4: T(S4),
  s4t09: T(S4, 0.9),
  none09: T({}, 0.9),
  s4t19: T(S4, 1.9),
  none19: T({}, 1.9),
};
