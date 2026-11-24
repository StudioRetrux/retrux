// Round-9 T04, fourth try: F420's near swells are broad, soft, low-frequency undulations (darker troughs, slightly lighter
// crests), elongated across the view. Slopes in the crest-shading normal drew thin light contour lines (watervar4), so this
// shades the water directly from a low-frequency field (x 0.12 / z 0.45 per m), hold-only, 15-38 m.
const AT = "  // The plate's reflections are baked for the rest camera;";
const sw = (a, b) => `  {
    // Broad hold swells (QC round 9, T04: F420's near water carries soft dark troughs; ours was a featureless blur).
    vec4 swl = fbmd(vec3(vWorldPos.x * 0.12, vWorldPos.z * 0.45, uTime * 0.2), 2);
    float swK = uHold * (1.0 - smoothstep(22.0, 38.0, dist));
    base *= 1.0 - swK * (${a} * smoothstep(-0.1, 0.6, -swl.x) - ${b} * smoothstep(0.2, 0.8, swl.x));
  }
${AT}`;
export default {
  w5a: { water: [[AT, sw("0.16", "0.05")]] },
  w5b: { water: [[AT, sw("0.26", "0.07")]] },
};
