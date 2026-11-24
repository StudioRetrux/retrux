// Ice diagnostics (T09): which term makes the rings milky white? Isolate the components.
const COL = "vec3 col = body * (1.0 - F) + refl * F + spec;";
const BODY = "vec3 body = mix(trans, scatterLight, s);";
const PROX = "col += vec3(0.9, 0.95, 1.0) * uOrbGlow * 0.15 * prox * mix(0.35, 1.0, 1.0 - thick) * (0.3 + 0.7 * facing) * (1.0 - F);";
const LANT = "col += vec3(0.72, 0.94, 1.0) * uOrbGlow * 1.05 * lantern * (1.0 - F) * mix(0.6, 1.0, 1.0 - thick);";
export default {
  bodyOnly: { frag: [[COL, "vec3 col = body;"]] },
  transOnly: { frag: [[BODY, "vec3 body = trans; vec3 trans0 = trans;"], [COL, "vec3 col = trans0;"]] },
  reflOnly: { frag: [[COL, "vec3 col = refl * F + spec;"]] },
  noOrbLight: { frag: [[PROX, ""], [LANT, ""]] },
};
