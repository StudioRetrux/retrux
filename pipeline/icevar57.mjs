// Round-9 ice CRITICAL (milky, compressed range): the reference's rings carry dark steel-blue streaks running ALONG each
// ring inside the ice (F045 / F000 / F420), with bright crisp rims; ours are pale and uniform (the crack sheets are random
// Voronoi planes, not streaks). A streak field stretched ~6:1 along the ring angle darkens the body multiplicatively
// (steel blue), so the texture and contrast rise without a global darkening.
// d57a: streak mask smoothstep(0.15, 0.55) x0.55. d57b: thinner (0.3-0.6) and stronger (x0.75).
const CRACK = "  body = mix(body, body * vec3(0.5, 0.6, 0.74), crackAcc * 0.7);";
const streak = (lo, hi, k) => `${CRACK}
  {
    // Dark steel-blue streaks along the ring (QC round 9: the reference's internal structure runs along each ring).
    float angQ = atan(vObjPos.y, vObjPos.x);
    float rrQ = length(vObjPos.xy);
    float stQ = fbm(vec3(angQ * 2.5, (rrQ - uSectionRadius) * 7.0, vObjPos.z * 7.0) + uSeed * 1.7, 3);
    float mQ = smoothstep(${lo}, ${hi}, stQ) * (1.0 - frostE * 0.6);
    body = mix(body, body * vec3(0.55, 0.68, 0.88), mQ * ${k});
  }`;
// (Debug icevar57dbg: the 0.15-0.55 mask lit only ~10 % of the ring, sparse thin streaks: no measurable change. The
// reference's dark bands are wide.)
export default {
  d57a: { frag: [[CRACK, streak("0.15", "0.55", "0.55")]] },
  d57b: { frag: [[CRACK, streak("0.3", "0.6", "0.75")]] },
  d57c: { frag: [[CRACK, streak("-0.15", "0.3", "0.6")]] },
  d57d: { frag: [[CRACK, streak("-0.05", "0.35", "0.45")]] },
};
