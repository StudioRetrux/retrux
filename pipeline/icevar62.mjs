// Round-9 plan T11 b-e combined (material, not refraction): (b) the uniform pale-blue in-scatter add becomes directional and
// thickness-weighted: x mix(0.35, 1, smoothstep(-0.3, 0.6, N.y)) x (1 - exp(-2.5 t)); (c) Beer-Lambert absorption
// (0.36, 0.17, 0.04) -> (0.8, 0.4, 0.16) per metre; (d) the energy's flat 0.04 off; (e) the mean held with highlights: spec
// cap 1.5 -> 2.5, the reflection weight F x 0.5 -> F x 0.7 on up-facing faces.
const BODY = "  vec3 body = mix(trans, scatterLight, s) + vec3(0.456, 0.578, 0.776) * irr * 0.5;";
const BODY_N = "  vec3 body = mix(trans, scatterLight, s) + vec3(0.456, 0.578, 0.776) * irr * 0.5 * mix(0.35, 1.0, smoothstep(-0.3, 0.6, N.y)) * (1.0 - exp(-2.5 * t));";
const ENERGY = "  col += uFrostTint * irr * uEnergy * (0.04 + 0.2 * crackAcc);";
const ENERGY_N = "  col += uFrostTint * irr * uEnergy * (0.1 * crackAcc);";
const SPEC = "  vec3 spec = min(uSunColor * ggxSpec(N, V, L, rSpec), vec3(1.5)) * sil;";
const SPEC_N = "  vec3 spec = min(uSunColor * ggxSpec(N, V, L, rSpec), vec3(2.5)) * sil;";
const MIXC = "  vec3 col = body * (1.0 - F * 0.5) + refl * F * 0.5 + spec * 0.7;";
const MIXC_N = "  float fw = mix(0.5, 0.7, smoothstep(0.3, 0.6, N.y));\n  vec3 col = body * (1.0 - F * fw) + refl * F * fw + spec * 0.7;";
const ALL = [[BODY, BODY_N], [ENERGY, ENERGY_N], [SPEC, SPEC_N], [MIXC, MIXC_N]];
// m62c / m62d: the mean held by brighter up-facing faces (the in-scatter ramp up to x1.3 / x1.5 on top faces).
const BODY_C = (hi) => "  vec3 body = mix(trans, scatterLight, s) + vec3(0.456, 0.578, 0.776) * irr * 0.5 * mix(0.3, " + hi + ", smoothstep(-0.3, 0.6, N.y)) * (1.0 - exp(-2.5 * t));";
const ALLC = (hi) => [[BODY, BODY_C(hi)], [ENERGY, ENERGY_N], [SPEC, SPEC_N], [MIXC, MIXC_N]];
export default {
  m62a: { frag: ALL, uniforms: { uAbsorb: [0.8, 0.4, 0.16] } },
  m62b: { frag: ALL, uniforms: { uAbsorb: [0.58, 0.28, 0.1] } },
  m62c: { frag: ALLC("1.3"), uniforms: { uAbsorb: [0.58, 0.28, 0.1] } },
  m62d: { frag: ALLC("1.5"), uniforms: { uAbsorb: [0.58, 0.28, 0.1] } },
};
