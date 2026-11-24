// Ice batch 27 (round 6 ice judge: 5.5): "bluer and more luminous, clearer and chiselled, NOT whiter". Band A face B-R
// 17-26 vs 47-56 (the reference ice is bluer than its own sky), ring bodies 17-30 L darker. Keep the clarity fixes
// (frost, blur, lens); a bluer interface tint again, and luminosity from blue-tinted scattered sky light (not white milk).
const TINT = "vec3 tint = mix(vec3(1.0), pow(uIceColor, vec3(1.5)), 0.35) * T;";
const SCAT = "vec3 scatterLight = uFrostTint * mix(vec3(1.0), uIceColor, 0.55) * (irr * 0.72 + uSunColor * (0.06 * wrap + 0.18 * back));";
const BODY = "vec3 body = mix(trans, scatterLight, s);";
const tint = (k) => [TINT, `vec3 tint = mix(vec3(1.0), pow(uIceColor, vec3(1.5)), ${k.toFixed(2)}) * T;`];
const blueScat = [SCAT, "vec3 scatterLight = uFrostTint * mix(vec3(1.0), uIceColor * uIceColor, 0.9) * (irr * 0.72 + uSunColor * (0.06 * wrap + 0.18 * back));"];
// Luminous: blue sky light added inside the clear ice (not a mix that replaces the transmitted image).
const glow = (g) => [BODY, `vec3 body = mix(trans, scatterLight, s) + uIceColor * uIceColor * irr * ${g.toFixed(3)} * (1.0 - frost);`];
export default {
  t70: { frag: [tint(0.7)] },
  t70g: { frag: [tint(0.7), blueScat, glow(0.06)] },
  t85g: { frag: [tint(0.85), blueScat, glow(0.08)] },
  t70g12: { frag: [tint(0.7), blueScat, glow(0.1)], uniforms: { uScatter: 0.1 } },
};
