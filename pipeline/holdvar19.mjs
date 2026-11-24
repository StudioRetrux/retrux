// Round-8 T09 (hold composition, F402-F420): one near-continuous arc wraps left / top and another the right, overlapping
// with no sky between them; B's halves part ~1 m so each lip is a thin ribbon and the core shows between; silhouette
// 630x520 vs F420's 775x635. Steps 3-5 of the plan (tunables only; the rig lift and the roll driver are code):
const A_OUT = { holdCompact: 1.0, aOutBase: 0.0, aOutAmp: 0.2, aOutPhaseDeg: 0, aOutH: 0.15, aLowerLift: 0.45 };
const B_LIPS = { bSplitHeld: 0.35, bowlLift: 0.0 };
const BROAD = { aSlotTilt: [70, -62, 66, -70], aLowerTiltCap: 40, aRoll: 0.12, aSpinAmp: 12, aSlotSlide: [10, -25, 18, -10] };
export default {
  h19a: { tune: { ...B_LIPS } },
  h19b: { tune: { ...A_OUT } },
  h19c: { tune: { ...B_LIPS, ...A_OUT } },
  h19d: { tune: { ...B_LIPS, ...A_OUT, ...BROAD } },
};
