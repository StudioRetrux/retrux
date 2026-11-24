// Orb lens over the far rings + the refracted cage shading the glow (uHoldFill.z), several strengths.
const U = (sb, hf) => `
  const u = h.orb.material.uniforms;
  u.uScreenBg.value.set(${sb.join(", ")});
  u.uHoldFill.value.set(${hf.join(", ")});
`;
export default {
  v1: { js: U([1, 2.5, 1.0, 1], [1, 0.72, 0.7, 1.0]) },
  v2: { js: U([1, 2.5, 1.0, 1], [0.7, 0.55, 0.9, 1.0]) },
  v3: { js: U([1, 2.0, 1.5, 1], [0.7, 0.55, 0.9, 0.8]) },
};
