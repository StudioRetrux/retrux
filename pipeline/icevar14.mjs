// Ice batch 14 (T09): icevar13 isolated the milkiness: the transmitted image is a blurred field displaced by up to ~2.4 m
// at the ring (uLens 0.4 x uLensDepth 6, ~280 px), so the background never reads through the ice; and the hammered look is
// the reflection on the dimpled normal. Weaker lens displacement, less blur and muting, half the dimples.
const LOD = "float lod = mix(1.3, 3.4, rough);";
const MUTE = "trans = mix(vec3(tl), trans, 0.75);";
const DIMPLE = "vec3 g = b1.yzw * (0.07 * (0.35 + 0.65 * frost)) + b2.yzw * 0.015;";
const TINT = "vec3 tint = pow(uIceColor, vec3(1.5)) * T;";
const clearer = [
  [LOD, "float lod = mix(0.5, 2.0, rough);"],
  [MUTE, "trans = mix(vec3(tl), trans, 0.92);"],
];
const halfDimple = [DIMPLE, "vec3 g = (b1.yzw * (0.07 * (0.35 + 0.65 * frost)) + b2.yzw * 0.015) * 0.45;"];
export default {
  L1: { frag: clearer, uniforms: { uLens: 0.18 } },
  L2: { frag: clearer, uniforms: { uLens: 0.18, uLensDepth: 3 } },
  L3: { frag: [...clearer, halfDimple], uniforms: { uLens: 0.18, uLensDepth: 3 } },
  L4: { frag: [...clearer, halfDimple, [TINT, "vec3 tint = mix(vec3(1.0), pow(uIceColor, vec3(1.5)), 0.6) * T;"]], uniforms: { uLens: 0.18, uLensDepth: 3, uFrost: 0.5 } },
};
