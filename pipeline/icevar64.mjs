// Round-10 ice CRITICAL: grey-white, under-saturated ice (ring saturation 11-18 vs the reference's 19-27; the darkest tenth
// p10 143 vs 110 at the eye). The shader desaturates in several places (refracted colour x0.75, highlight desaturation,
// the chroma gate). s64a: the final ice colour x1.35 chroma around its luma. s64b: x1.6. s64c: x1.5 plus a gentle darkening
// of the darker half (the steel-blue cores), x(0.92 .. 1) by luma.
const END = "  col *= 1.035;";
const sat = (k, dark) => `  col *= 1.035;
  {
    float lc2 = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = max(vec3(lc2) + (col - vec3(lc2)) * ${k}, vec3(0.0));
    ${dark ? "col *= mix(0.9, 1.0, smoothstep(0.25, 0.9, lc2));" : ""}
  }`;
export default {
  s64a: { frag: [[END, sat("1.35", false)]] },
  s64b: { frag: [[END, sat("1.6", false)]] },
  s64c: { frag: [[END, sat("1.5", true)]] },
};
