// Round-10 env MAJOR: the rest ripple ring is faint and grainy; F000 has bold, smooth dark-blue troughs. Round 7 objected to
// the opposite (smooth, over-dark painted stripes at x1.35 / +-0.55): a middle setting, plus less breeze grain in the ring.
// r6a: uRippleShade 2.6 -> 3.1, k clamp +-0.4 -> +-0.48, trough tint x1.2 cap 0.5 -> x1.4 cap 0.55, breeze grain in the ring
// zone 0.55 -> 0.3. r6b: the same without the grain change.
export const reset = "h.water.material.uniforms.uRippleShade.value = 2.6;";
const K = "  float k = clamp((dot(rRip, LUMA) - dot(rFlat, LUMA)) / max(dot(rFlat, LUMA), 1e-3) * uRippleShade, -0.4, 0.4);";
const K_N = "  float k = clamp((dot(rRip, LUMA) - dot(rFlat, LUMA)) / max(dot(rFlat, LUMA), 1e-3) * uRippleShade, -0.48, 0.48);";
const TR = "  base = mix(base, base * vec3(0.6, 0.77, 1.16), clamp(-k * 1.2, 0.0, 0.5));";
const TR_N = "  base = mix(base, base * vec3(0.6, 0.77, 1.16), clamp(-k * 1.4, 0.0, 0.55));";
const GR = "  vec2 slope = waveS + m1.yw * vec2(0.55, 0.9) * 0.006 * (0.55 + 0.45 * smoothstep(4.0, 12.0, r));";
const GR_N = "  vec2 slope = waveS + m1.yw * vec2(0.55, 0.9) * 0.006 * (0.3 + 0.7 * smoothstep(4.0, 12.0, r));";
export default {
  r6a: { water: [[K, K_N], [TR, TR_N], [GR, GR_N]], js: "h.water.material.uniforms.uRippleShade.value = 3.1;" },
  r6b: { water: [[K, K_N], [TR, TR_N]], js: "h.water.material.uniforms.uRippleShade.value = 3.1;" },
};
