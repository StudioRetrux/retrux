// Ice diagnostics 2: the transmitted image alone with NO blur (lod 0), at the current lens and weaker ones. Does the
// refraction carry readable structure (inverted horizon, mountains, lake bands like the reference) or is it a smooth field?
const COL = "vec3 col = body * (1.0 - F) + refl * F + spec;";
const BODY = "vec3 body = mix(trans, scatterLight, s);";
const LOD = "float lod = mix(1.3, 3.4, rough);";
const tOnly = [[BODY, "vec3 body = trans; vec3 trans0 = trans;"], [COL, "vec3 col = trans0;"], [LOD, "float lod = 0.0;"]];
export default {
  t0lens40: { frag: tOnly },
  t0lens15: { frag: tOnly, uniforms: { uLens: 0.15 } },
  t0lens40depth3: { frag: tOnly, uniforms: { uLensDepth: 3 } },
  full0: { frag: [[LOD, "float lod = 0.3;"]] },
};
