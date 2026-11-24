// Ice batch 34: structure through the clear ice. Band A in front of the orb: L matches the reference (214 vs 216) but
// sd 8 vs 19, a flat milky sheet. On top of icevar32 s1 (T10 surface + c5 colour): k1 lantern x0.5; k2 + clear ice
// refracts unblurred (no thickness floor on the blur); k3 + a stronger lens (0.2 -> 0.35); k4 + deeper planar facets.
import V from "./icevar32.mjs";
const s1 = V.s1;
const LANT = "col += vec3(0.72, 0.94, 1.0) * uOrbGlow * 0.5 * lantern";
const ROUGH = "float rough = max(frost, 0.3 * thick);";
const TILT = "vec3 tilt = (t * rnd.x + b * rnd.y) * 0.16;";
const k1 = [...s1.frag, [LANT, "col += vec3(0.72, 0.94, 1.0) * uOrbGlow * 0.25 * lantern"]];
const k2 = [...k1, [ROUGH, "float rough = frost;"]];
export default {
  k1: { frag: k1, vert: s1.vert, uniforms: s1.uniforms },
  k2: { frag: k2, vert: s1.vert, uniforms: s1.uniforms },
  k3: { frag: k2, vert: s1.vert, uniforms: { ...s1.uniforms, uLens: 0.35 } },
  k4: { frag: [...k2, [TILT, "vec3 tilt = (t * rnd.x + b * rnd.y) * 0.24;"]], vert: s1.vert, uniforms: { ...s1.uniforms, uLens: 0.35 } },
};
