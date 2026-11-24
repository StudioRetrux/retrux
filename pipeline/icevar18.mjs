// Ice batch 18 (T09): frost coverage is the hidden driver: uFrost 0.74-0.84 makes nearly every pixel "rough", so even a
// light blur smooths the refraction away. Low frost (most of the surface clear, lod 0 there), frosted patches up to
// lod 1.6, weaker lens, less milk on top.
const COL = "vec3 col = body * (1.0 - F) + refl * F + spec;";
const LOD = "float lod = mix(1.3, 3.4, rough);";
const v = (frost, lens, scat, f, sp) => ({
  frag: [[LOD, "float lod = mix(0.0, 1.6, rough);"], [COL, `vec3 col = body * (1.0 - F * ${f.toFixed(2)}) + refl * F * ${f.toFixed(2)} + spec * ${sp.toFixed(2)};`]],
  uniforms: { uFrost: frost, uLens: lens, uScatter: scat },
});
export default {
  c35: v(0.35, 0.2, 0.06, 0.7, 0.7),
  c45: v(0.45, 0.2, 0.06, 0.7, 0.7),
  c35L3: v(0.35, 0.3, 0.06, 0.7, 0.7),
  c25: v(0.25, 0.2, 0.05, 0.6, 0.6),
};
