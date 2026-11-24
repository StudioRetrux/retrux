// Orb lens + refracted-cage shading (smoothstep(0.3 w, w, L), floor x0.15): strengths / bright levels / distances.
const U = (sb, hf) => `
  const u = h.orb.material.uniforms;
  u.uScreenBg.value.set(${sb.join(", ")});
  u.uHoldFill.value.set(${hf.join(", ")});
`;
export default {
  w1: { js: U([1, 2.5, 1.0, 1], [1, 0.72, 0.8, 0.85]) },
  w2: { js: U([1, 2.5, 1.0, 1], [1, 0.72, 1.0, 1.0]) },
  w3: { js: U([1, 1.8, 1.5, 1], [1, 0.72, 1.0, 0.85]) },
};
