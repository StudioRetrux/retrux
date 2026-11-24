// Orb lens + refracted-cage shading, with AgX in mind (log curve: 3-4 stops for a grey shape on a near-white disc).
const U = (sb, hf, fl) => `
  const u = h.orb.material.uniforms;
  u.uScreenBg.value.set(${sb.join(", ")});
  u.uHoldFill.value.set(${hf.join(", ")});
  u.uShadeFloor.value = ${fl};
`;
export default {
  f1: { js: U([1, 2.5, 1.0, 1], [1, 0.72, 1.0, 0.85], 0.08) },
  f2: { js: U([1, 2.5, 1.0, 1], [1, 0.72, 1.0, 0.85], 0.04) },
  f3: { js: U([1, 2.0, 1.5, 1], [0.6, 0.55, 1.0, 0.95], 0.06) },
};
