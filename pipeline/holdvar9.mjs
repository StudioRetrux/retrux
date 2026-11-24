// The worst press moments of probe_holdbounds (tau 0.5, 1.75, 2.5): are arcs actually cut by the frame?
export default {
  t050: { tau: 0.5 },
  t175: { tau: 1.75 },
  t250: { tau: 2.5 },
  t050old: { tau: 0.5, tune: { aSlotTilt: [48, -30, 45, -48], aSlotSlide: [11, -9, 11, -9], aSpinAmp: 0, aLowerTiltCap: 25, aOutBase: -0.17, aOutAmp: 0.2, aOutPhaseDeg: 65 } },
  t175old: { tau: 1.75, tune: { aSlotTilt: [48, -30, 45, -48], aSlotSlide: [11, -9, 11, -9], aSpinAmp: 0, aLowerTiltCap: 25, aOutBase: -0.17, aOutAmp: 0.2, aOutPhaseDeg: 65 } },
};
