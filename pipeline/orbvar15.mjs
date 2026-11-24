// Debug: the screen background's luminance (scene-linear) inside the orb, as bands: r = L > 0.5, g = L > 1.0, b = L > 1.4.
const END = "  gl_FragColor = vec4(col * cov, cov);\n}";
const BG = "    bgShade = mix(1.0, saturate(dot(sbg, vec3(0.2126, 0.7152, 0.0722)) / max(uHoldFill.w, 1e-3)), sIn);";
const PATCH = (pairs) => `
  const P = ${JSON.stringify(pairs)};
  const m = h.orb.material;
  if (!m.userData.orig) m.userData.orig = m.fragmentShader;
  let s = m.userData.orig;
  for (const [a, b] of P) { if (!s.includes(a)) throw new Error("missing " + a.slice(0, 70)); s = s.replace(a, b); }
  m.fragmentShader = s;
  m.needsUpdate = true;
  m.uniforms.uScreenBg.value.set(1, 2.5, 1.0, 1);
  m.uniforms.uHoldFill.value.set(1, 0.72, 0.9, 1.0);
`;
export default {
  lum: { js: PATCH([[BG, BG + "\n    float dbgL = dot(sbg, vec3(0.2126, 0.7152, 0.0722));\n    dbgC = vec3(step(0.5, dbgL), step(1.0, dbgL), step(1.4, dbgL));"], ["  float bgShade = 1.0;", "  float bgShade = 1.0;\n  vec3 dbgC = vec3(0.0);"], [END, "  gl_FragColor = vec4(dbgC * 0.6 * cov, cov);\n}"]]) },
  shade: { js: PATCH([[END, "  gl_FragColor = vec4(vec3(bgShade) * 0.6 * cov, cov);\n}"]]) },
};
