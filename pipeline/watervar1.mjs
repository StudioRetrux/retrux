// Round 7 env: the ripple rings read as smooth, over-dark painted stripes across the whole frame; F000's are a compact
// field of light water with a few thin darker rings. Smaller reach, weaker trough shading and blue tint.
export const reset = "h.water.material.uniforms.uWaveReach.value = 11;";
const K = "float k = clamp((dot(rRip, LUMA) - dot(rFlat, LUMA)) / max(dot(rFlat, LUMA), 1e-3) * uRippleShade * 1.35, -0.55, 0.55);";
const TINT = "base = mix(base, base * vec3(0.6, 0.77, 1.16), clamp(-k * 1.9, 0.0, 0.8));";
const soft = (m, c, t, cap) => [
  [K, `float k = clamp((dot(rRip, LUMA) - dot(rFlat, LUMA)) / max(dot(rFlat, LUMA), 1e-3) * uRippleShade * ${m.toFixed(2)}, -${c.toFixed(2)}, ${c.toFixed(2)});`],
  [TINT, `base = mix(base, base * vec3(0.6, 0.77, 1.16), clamp(-k * ${t.toFixed(2)}, 0.0, ${cap.toFixed(2)}));`],
];
export default {
  r8: { js: "h.water.material.uniforms.uWaveReach.value = 8;" },
  r8s: { js: "h.water.material.uniforms.uWaveReach.value = 8;", water: soft(1.0, 0.4, 1.2, 0.5) },
  r9s: { js: "h.water.material.uniforms.uWaveReach.value = 9;", water: soft(1.0, 0.4, 1.2, 0.5) },
  r8ss: { js: "h.water.material.uniforms.uWaveReach.value = 8;", water: soft(0.8, 0.32, 1.0, 0.4) },
};
