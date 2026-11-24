// Debug: is there structure under the hold orb's white, or is the signal flat? Exposure-scaled copies of the final colour.
const END = "  gl_FragColor = vec4(col * cov, cov);\n}";
const PATCH = (pairs) => `
  const P = ${JSON.stringify(pairs)};
  const m = h.orb.material;
  if (!m.userData.orig) m.userData.orig = m.fragmentShader;
  let s = m.userData.orig;
  for (const [a, b] of P) { if (!s.includes(a)) console.error("missing " + a.slice(0, 70)); s = s.replace(a, b); }
  m.fragmentShader = s;
  m.needsUpdate = true;
`;
export default {
  e6: { js: PATCH([[END, "  gl_FragColor = vec4(col * 0.6 * cov, cov);\n}"]]) },
  e3: { js: PATCH([[END, "  gl_FragColor = vec4(col * 0.3 * cov, cov);\n}"]]) },
  // emission only / glow only (x0.5)
  em: { js: PATCH([["  vec3 col = clampSample(emit, limit);", "  vec3 col = clampSample(emit, limit);\n  vec3 dbgEm = col;"], [END, "  gl_FragColor = vec4(dbgEm * 0.5 * cov, cov);\n}"]]) },
};
