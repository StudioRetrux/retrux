// Glitch batch 2: the new build (extra-projector rim, cloud cull by the extra projectors, press / release orbit swing)
// against the old camera path (holdOrbitEnd 0 = orbit linear in the dolly).
export const reset = "h.rig.holdOrbitEnd = 0.35;";
export default {
  oldcam: { js: "h.rig.holdOrbitEnd = 0;" },
};
