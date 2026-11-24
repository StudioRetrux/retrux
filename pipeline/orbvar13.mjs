// Debug: what the orb's refracted background holds (bg only), and how big the plasma and fills are.
const END = "  gl_FragColor = vec4(col * cov, cov);\n}";
const PATCH = (pairs, sb) => `
  const P = ${JSON.stringify(pairs)};
  const m = h.orb.material;
  if (!m.userData.orig) m.userData.orig = m.fragmentShader;
  let s = m.userData.orig;
  for (const [a, b] of P) { if (!s.includes(a)) throw new Error("missing " + a.slice(0, 70)); s = s.replace(a, b); }
  m.fragmentShader = s;
  m.needsUpdate = true;
  m.uniforms.uScreenBg.value.set(${sb.join(", ")});
`;
export default {
  bgPano: { js: PATCH([[END, "  gl_FragColor = vec4(bg * cov, cov);\n}"]], [0, 2.5, 1.5, 1]) },
  bgScreen: { js: PATCH([[END, "  gl_FragColor = vec4(bg * cov, cov);\n}"]], [1, 2.5, 1.0, 1]) },
  // trans (plasma transmittance) and the bg weight as grey
  trans: { js: PATCH([[END, "  gl_FragColor = vec4(vec3((1.0 - fOut) * trans * chain) * cov, cov);\n}"]], [1, 2.5, 1.0, 1]) },
};
