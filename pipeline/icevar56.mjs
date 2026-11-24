// Round-9 ice judge (6.4): CRITICAL "milky, low-contrast frosted acrylic body: no thick-ice optics (dark cobalt bands, wide
// value range)" (p06 top arc sd 6.7 vs F420 29.9; eye ring A right side mean 190 / B-R 41 vs 164 / 60) + MAJOR "surface reads
// as hammered metal / crumpled foil / topographic map, not streaky clear ice" (the chisel cells).
// b56a: the additive pale-blue body glow 0.5 -> 0.25 (a uniform veil that compresses the range) and the Beer-Lambert
//       absorption x1.6 (thick paths darken towards cobalt, thin rims stay bright).
// b56b: b56a + bigger, flatter chisel facets (CELL 9 -> 6, tilt 0.16 -> 0.08).
// b56c: b56b + frost streaks running along each ring (an fbm stretched ~6:1 along the ring angle).
const BODY = "  vec3 body = mix(trans, scatterLight, s) + vec3(0.456, 0.578, 0.776) * irr * 0.5;";
const BODY_N = "  vec3 body = mix(trans, scatterLight, s) + vec3(0.456, 0.578, 0.776) * irr * 0.25;";
const TILT = "  vec3 tilt = (t * rnd.x + b * rnd.y) * 0.16;";
const TILT_N = "  vec3 tilt = (t * rnd.x + b * rnd.y) * 0.08;";
const CELL = "  const float CELL = 9.0 / 1.975;";
const CELL_N = "  const float CELL = 6.0 / 1.975;";
const FROST = "  frost = max(frost * mix(0.82, 1.0, frostE), 0.35 * frostE);";
const FROST_N = `  frost = max(frost * mix(0.82, 1.0, frostE), 0.35 * frostE);
  {
    // Streaks along the ring (QC round 9: the reference's ice carries long streaks along each ring, not cells).
    float angS = atan(vObjPos.y, vObjPos.x);
    float rrS = length(vObjPos.xy);
    float stS = fbm(vec3(angS * 3.0, (rrS - uSectionRadius) * 9.0, vObjPos.z * 9.0) + uSeed, 3);
    frost = saturate(frost + stS * 0.18);
  }`;
const ABS = { uAbsorb: [0.58, 0.27, 0.064] };
export default {
  b56a: { frag: [[BODY, BODY_N]], uniforms: ABS },
  b56b: { frag: [[BODY, BODY_N], [TILT, TILT_N], [CELL, CELL_N]], uniforms: ABS },
  b56c: { frag: [[BODY, BODY_N], [TILT, TILT_N], [CELL, CELL_N], [FROST, FROST_N]], uniforms: ABS },
};
