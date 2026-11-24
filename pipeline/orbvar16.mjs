// Debug: the orb's final scene-linear peak, banded: r = > 1.5, g = > 3, b = > 6 (before / after the bg shading).
const END = "  gl_FragColor = vec4(col * cov, cov);\n}";
const PATCH = (pairs) => `
  const P = ${JSON.stringify(pairs)};
  const m = h.orb.material;
  if (!m.userData.orig) m.userData.orig = m.fragmentShader;
  let s = m.userData.orig;
  for (const [a, b] of P) { if (!s.includes(a)) throw new Error("missing " + a.slice(0, 70)); s = s.replace(a, b); }
  m.fragmentShader = s;
  m.needsUpdate = true;
  m.uniforms.uScreenBg.value.set(1, 2.5, 1.0, 1);
  m.uniforms.uHoldFill.value.set(1, 0.72, 0.0, 1.0);
`;
const BAND = "  { float pk = max(max(col.r, col.g), col.b); gl_FragColor = vec4(vec3(step(1.5, pk), step(3.0, pk), step(6.0, pk)) * 0.6 * cov, cov); }\n}";
export default {
  peak: { js: PATCH([[END, BAND]]) },
};
