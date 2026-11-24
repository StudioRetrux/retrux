// Orb batch 7: m2's saturated mint, brighter (the reference disc is brighter overall: L50 227-242 vs ours 210, with
// 900-7300 clipped px and mint in the bright non-clipped zone).
import V from "./orbvar6.mjs";
const js = (k) => V.m2.js.replace("* 2.2 * uGain", `* ${k.toFixed(1)} * uGain`);
export default {
  m2: V.m2,
  m2k3: { js: js(3.0) },
  m2k4: { js: js(4.0) },
  m2i12: { js: V.m2.js + "\nh.orb.intensity = h.orb.intensity * 1.2;" },
};
