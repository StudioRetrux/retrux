// Ice batch 22 (T09): k15 (icevar20) + the orb-light terms reduced / removed: the lantern (orb glow carried through the
// ice) and the proximity glow wash every ring near the orb white-cyan, over the path-length blue.
import B from "./icevar20.mjs";
const K15 = B.k15;
const PROX = "col += vec3(0.9, 0.95, 1.0) * uOrbGlow * 0.15 * prox * mix(0.35, 1.0, 1.0 - thick) * (0.3 + 0.7 * facing) * (1.0 - F);";
const LANT = "col += vec3(0.72, 0.94, 1.0) * uOrbGlow * 1.05 * lantern * (1.0 - F) * mix(0.6, 1.0, 1.0 - thick);";
const LANTS = "s *= 1.0 - 0.5 * lantern;";
export default {
  k15noOrb: { frag: [...K15.frag, [PROX, ""], [LANT, ""]], uniforms: K15.uniforms },
  k15halfOrb: { frag: [...K15.frag, [PROX, PROX.replace("0.15 * prox", "0.07 * prox")], [LANT, LANT.replace("1.05 * lantern", "0.5 * lantern")]], uniforms: K15.uniforms },
  k15tightLant: {
    frag: [...K15.frag, [PROX, PROX.replace("0.15 * prox", "0.07 * prox")], [LANT, LANT.replace("1.05 * lantern", "0.8 * lantern * lantern")]],
    uniforms: K15.uniforms,
  },
};
