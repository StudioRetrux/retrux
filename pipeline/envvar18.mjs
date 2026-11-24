// T16 lake ripples: F000 shows 3-4 crisp, saturated blue trough bands with scalloped edges; ours 1-2 soft bands (the
// envelope exp(-r / 4 m) with a 6-9 m cut-off, shading clamped at +-0.42). Slower decay / longer reach, stronger troughs,
// an angular wobble of the ring phase for the scallops.
const ENV = "float env = smoothstep(0.4, 1.8, r) * exp(-r / (uWaveReach * 0.45)) * (1.0 - smoothstep(uWaveReach * 0.7, uWaveReach, r));";
const XPH = "float x = r - uWave.z * uTime;";
const K = "float k = clamp((dot(rRip, LUMA) - dot(rFlat, LUMA)) / max(dot(rFlat, LUMA), 1e-3) * uRippleShade, -0.42, 0.42);";
const slow = [ENV, "float env = smoothstep(0.4, 1.8, r) * exp(-r / (uWaveReach * 0.7)) * (1.0 - smoothstep(uWaveReach * 0.8, uWaveReach, r));"];
const scallop = [XPH, "float x = r - uWave.z * uTime + 0.09 * sin(atan(d.y, d.x) * 7.0 + r * 1.3) + 0.05 * sin(atan(d.y, d.x) * 13.0 - r * 0.9);"];
const strong = [K, "float k = clamp((dot(rRip, LUMA) - dot(rFlat, LUMA)) / max(dot(rFlat, LUMA), 1e-3) * uRippleShade * 1.35, -0.55, 0.55);"];
export default {
  slow: { water: [slow] },
  slowStrong: { water: [slow, strong] },
  slowStrongScal: { water: [slow, strong, scallop] },
  slowStrongScalReach: { water: [slow, strong, scallop], js: "h.water.material.uniforms.uWaveReach.value = 11;" },
};
