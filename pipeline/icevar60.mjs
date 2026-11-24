// Round-9 ice CRITICAL (compressed range: q03 ring A side L193 sd 17.6 vs F045 L163 sd 28.2; p06 arc sd 9 vs 30). Round 7's
// shell fix removed the ring's wall-curvature lens (a 3.2x converging lens that flattened the band in front of the orb into a
// milky sheet) everywhere except at grazing angles and section corners. That macro lens is also what refracts the darker
// parts of the scene into the light / dark bands of the reference. m35 / m55: keep 35 % / 55 % of it on the face-on parts.
const MACRO = "  tilt -= tiltMacro * (1.0 - macroW);";
export default {
  m35: { frag: [[MACRO, "  tilt -= tiltMacro * (1.0 - macroW) * 0.65;"]] },
  m55: { frag: [[MACRO, "  tilt -= tiltMacro * (1.0 - macroW) * 0.45;"]] },
};
