// The g50f orb-light floor (deploy #50) reaches well past the orb's disc: lanternG = exp(-(dRay / (1.15 R))^2) is 0.47 at
// the orb's edge and 0.18 at 1.5 R, so ring A's sides beside the orb get filled towards a bright glow (q03 ring A right
// side L193 vs F045's 163: the milky band the round-9 judge flags). It also hid icevar57's darker streaks there.
// f58a: sigma 1.15 -> 0.85 orb radii and a cut at the orb's silhouette (0.95-1.1 R).
// f58b: f58a + the along-ring steel-blue streaks (icevar57 d57c).
import v57 from "./icevar57.mjs";
const LANT = "    float lanternG = exp(-pow(dRayG / (1.15 * 0.8255), 2.0));";
const LANT_N = "    float lanternG = exp(-pow(dRayG / (0.85 * 0.8255), 2.0)) * (1.0 - smoothstep(0.95 * 0.8255, 1.1 * 0.8255, dRayG));";
export default {
  f58a: { frag: [[LANT, LANT_N]] },
  f58b: { frag: [[LANT, LANT_N], ...v57.d57c.frag] },
};
