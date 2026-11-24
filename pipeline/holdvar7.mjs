// Hold (F420): the pieces sit ~300-350 px from the orb like ours, but each arc is turned its own way (upper-left piece a
// high near-horizontal arc, right piece a long arc down the right side, bottom piece low-right, a short left piece) so
// they no longer line up on one circle. Per-slot in-plane spin about each piece's centre + wider uneven slides.
// Slots: top, left, bottom, right.
const T = (o) => ({ tune: o, tau: 2.6 });
const SL = [24, -14, 22, -26];
export default {
  // Determinism check: must equal "none".
  none2: T({}),
  s1: T({ aSlotSpin: [20, -15, 25, -20], aSlotSlide: SL }),
  s2: T({ aSlotSpin: [35, -25, 35, -30], aSlotSlide: SL, aSlotTilt: [60, -45, 50, -60], aLowerTiltCap: 40 }),
  s3: T({ aSlotSpin: [35, -25, 35, -30], aSlotSlide: SL, aSlotTilt: [60, -45, 50, -60], aLowerTiltCap: 40, aOutBase: -0.05, aOutAmp: 0.25 }),
  s4: T({ aSlotSpin: [-30, 25, -30, 30], aSlotSlide: SL, aSlotTilt: [60, -45, 50, -60], aLowerTiltCap: 40, aOutBase: -0.05, aOutAmp: 0.25 }),
};
