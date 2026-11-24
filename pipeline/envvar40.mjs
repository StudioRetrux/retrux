// envvar39 toe2 on the plate, plus the same toe on the lake (the right floe's pure-black slit is lake, not plate).
import v39 from "./envvar39.mjs";
const LAKE_AT = "  // The plate's reflections are baked for the rest camera;";
const LAKE_TOE = `  {
    // Crushed-black toe on the water too (QC rounds 9-10: a pure-black slit under the right floe's overhang).
    float lzw = dot(base, LUMA);
    if (lzw < 0.045) {
      float lzwt = 0.045 * pow(max(lzw, 0.0) / 0.045, 0.7);
      base = mix(vec3(lzwt), base * (lzwt / max(lzw, 1e-5)), 0.75);
    }
  }
${LAKE_AT}`;
export default {
  toe2w: { plate: v39.toe2.plate, water: [[LAKE_AT, LAKE_TOE]] },
};
