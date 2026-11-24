// Ice batch 16 (T09): icevar15 showed the transmitted image alone (lod 0, lens 0.15) already reads as clear refracted
// glass; the full shader at lod 0.3 is still milky -> the milk is the layers on top: scatter (s), the frosted sky
// reflection (refl * F) and the specular. Cut those, weaker lens, light blur.
const COL = "vec3 col = body * (1.0 - F) + refl * F + spec;";
const LOD = "float lod = mix(1.3, 3.4, rough);";
const lodLight = [LOD, "float lod = mix(0.3, 1.4, rough);"];
const colK = (r, sp) => [COL, `vec3 col = body * (1.0 - F * ${r.toFixed(2)}) + refl * F * ${r.toFixed(2)} + spec * ${sp.toFixed(2)};`];
export default {
  v1: { frag: [lodLight, colK(0.5, 0.6)], uniforms: { uScatter: 0.0, uLens: 0.15 } },
  v2: { frag: [lodLight, colK(0.6, 0.7)], uniforms: { uScatter: 0.06, uLens: 0.2 } },
  v3: { frag: [lodLight, colK(0.75, 0.8)], uniforms: { uScatter: 0.08, uLens: 0.25 } },
  v4: { frag: [lodLight, colK(0.6, 0.7)], uniforms: { uScatter: 0.06, uLens: 0.3 } },
};
