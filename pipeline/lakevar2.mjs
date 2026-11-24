// Round-8 T02 (glitch hunters: stair-stepped slab reflections + a boxy rock halo at in-between cameras: pop, release;
// floe mosaic / ghost rock with the pointer at the left in the release). Off every projector the lake re-aims each lookup
// through <p>MirrorPoint, which reads the mirror-ray length L from ONE nearest texel of a 1536 px HalfFloat map: L is
// constant per depth texel and jumps at slab edges, so the re-aimed reflection columns step by whole texels.
// fL: L from a manual 2x2 bilinear lookup on texel centres (invalid taps L <= 0 skipped); across an edge (max > 1.25 min)
//     the nearest reflector (min) instead of a mean, so no reflection smears between a floe and the sky behind it.
// fL2: fL + the "raised" fill blurred +2 mips instead of +5 (the +5 average of rock, snow and water was the boxy halo).
const KEYS = [["Hold", "hold"], ["OrbN", "orbN"], ["OrbP", "orbP"], ["Tilt", "tilt"]];
const fnL = (P, p) => `float ${p}MirrorL(vec2 uv) {
  vec2 t = u${P}DepthTexel;
  vec2 st = uv / t - 0.5;
  vec2 i0 = floor(st);
  vec2 f = st - i0;
  vec2 b = (i0 + 0.5) * t;
  vec4 L = vec4(textureLod(u${P}Depth, b, 0.0).b, textureLod(u${P}Depth, b + vec2(t.x, 0.0), 0.0).b,
                textureLod(u${P}Depth, b + vec2(0.0, t.y), 0.0).b, textureLod(u${P}Depth, b + t, 0.0).b);
  vec4 ok = step(1e-4, L);
  vec4 w = vec4((1.0 - f.x) * (1.0 - f.y), f.x * (1.0 - f.y), (1.0 - f.x) * f.y, f.x * f.y) * ok;
  float ws = w.x + w.y + w.z + w.w;
  if (ws < 1e-4) return 0.0;
  vec4 Lm = mix(vec4(1e9), L, ok);
  float mn = min(min(Lm.x, Lm.y), min(Lm.z, Lm.w));
  float mx = max(max(L.x * ok.x, L.y * ok.y), max(L.z * ok.z, L.w * ok.w));
  return mx > mn * 1.25 ? mn : dot(w, L) / ws;
}
`;
const REST_FIND = "vec3 plateMirrorPoint(vec3 P) {";
const REST_L = ["    float L = min(textureLod(uPlateDepth, uv, 0.0).b, 4000.0);", "    float L = min(plateMirrorL(uv), 4000.0);"];
const fL = [
  [REST_FIND, fnL("Plate", "plate") + REST_FIND],
  REST_L,
  ...KEYS.map(([P, p]) => [`vec3 ${p}MirrorPoint(vec3 P) {`, fnL(P, p) + `vec3 ${p}MirrorPoint(vec3 P) {`]),
  ...KEYS.map(([P, p]) => [`    float L = min(textureLod(u${P}Depth, uv, 0.0).b, 4000.0);`, `    float L = min(${p}MirrorL(uv), 4000.0);`]),
];
const RAISED = ["  float lod = lodX + 5.0 * raised;", "  float lod = lodX + 2.0 * raised;"];
export default {
  fL: { water: fL },
  fL2: { water: [...fL, RAISED] },
};
