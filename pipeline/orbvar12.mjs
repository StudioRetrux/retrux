// Orb as a lens over the far rings (RenderPipeline T1+: env, back, copy, far rings, copy, ORB, copy, near rings): the exit
// rays read the screen copy uScreenBg.y radii behind the exit point. Hold fills scaled by uHoldFill.x, lanes uHoldFill.y.
const U = (sb, hf) => `
  const u = h.orb.material.uniforms;
  u.uScreenBg.value.set(${sb.join(", ")});
  u.uHoldFill.value.set(${hf.join(", ")});
`;
export default {
  s1: { js: U([1, 2.5, 1.5, 1], [1, 0.72]) },
  s2: { js: U([1, 2.5, 1.5, 1], [0.6, 0.55]) },
  s3: { js: U([1, 2.0, 1.0, 1.3], [0.4, 0.5]) },
};
