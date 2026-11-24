// Round-9 ice: the flat saturated end caps are the TIR end blocks (tirZone ~1) over a transmitted image that the long-path
// absorption (t up to 1.6 m) turns dark saturated blue (debug: trans x0.6 = 31,84,133). F000's end blocks read frosted and
// lighter (L174, B-R 61, sd 13.9). More of the frosted scatter there (0.3 -> 0.45 / 0.6), which also varies with the frost.
const TZ = "  body = mix(body, scatterLight * 1.1 + vec3(0.456, 0.578, 0.776) * irr * 0.3, tirZone * 0.3);";
export default {
  t45: { frag: [[TZ, "  body = mix(body, scatterLight * 1.1 + vec3(0.456, 0.578, 0.776) * irr * 0.3, tirZone * 0.45);"]] },
  t60: { frag: [[TZ, "  body = mix(body, scatterLight * 1.1 + vec3(0.456, 0.578, 0.776) * irr * 0.3, tirZone * 0.6);"]] },
};
