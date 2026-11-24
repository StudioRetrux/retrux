// Round-9 ice judge: "ring edges look torn like paper or frilled like a pie crust (high-frequency serration)" (q02 ring B
// top edge, the belt top edge, p06 stacked jagged white edges) while "the low-frequency lumpy outer outline of ring A ...
// matches the reference's hand-carved feel". The serration is ICE_SILHOUETTE's ridged chips (2.2x the lump scale, -0.3).
// c12: chips -0.3 -> -0.12. c0: no chips (3-octave lumps only). Both keep the tangential broken ends.
const CHIP = "  return vec4(0.5 + 0.42 * n.x - 0.3 * (r * r - 0.45), 0.42 * k * n.yzw - 0.6 * r * rg);";
export default {
  c12: { vert: [[CHIP, "  return vec4(0.5 + 0.42 * n.x - 0.12 * (r * r - 0.45), 0.42 * k * n.yzw - 0.24 * r * rg);"]] },
  c0: { vert: [[CHIP, "  return vec4(0.5 + 0.42 * n.x, 0.42 * k * n.yzw);"]] },
};
