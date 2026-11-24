// Ice batch 24 (T09 decision): b35 (icevar23) with the surface dimples halved (clearer ice shows the bump texture more).
import B from "./icevar23.mjs";
const DIMPLE = "vec3 g = b1.yzw * (0.07 * (0.35 + 0.65 * frost)) + b2.yzw * 0.015;";
export default {
  b35: B.b35,
  b35d: { frag: [...B.b35.frag, [DIMPLE, "vec3 g = (b1.yzw * (0.07 * (0.35 + 0.65 * frost)) + b2.yzw * 0.015) * 0.5;"]], uniforms: B.b35.uniforms },
};
