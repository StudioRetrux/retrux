// Round-9 ice CRITICAL: a flat, milky body (p06 top arc sd ~9 vs F420's 29.9, bright top face + dark blue-grey underside).
// Since round 7 the refraction bends only by facets (the ring's wall curvature was a 3.2x lens that flattened the band in
// front of the orb), so every face sees the bright sky straight behind it. A thick ring's lower half acts like a prism that
// points the view DOWN (the darker lake), its upper half up (the sky): a world-space bias on the refracted direction by the
// geometric normal's vertical component, which the camera-facing facet bends cannot give.
// p59a: bias 0.22 (down-facing faces see ~12 deg lower). p59b: 0.4. p59c: 0.4, down only (up-facing faces unchanged).
const RD = "  vec3 rdG = normalize(-V - tilt * lens);";
const rd = (k, upK) => `  vec3 rdG = normalize(-V - tilt * lens);
  {
    // Prism bias (QC round 9): down-facing walls refract the lake, up-facing ones the sky.
    float ny = Ng.y;
    float prism = -smoothstep(0.1, 0.75, -ny) + ${upK} * smoothstep(0.1, 0.75, ny);
    rdG = normalize(rdG + vec3(0.0, ${k} * prism, 0.0));
  }`;
export default {
  p59a: { frag: [[RD, rd("0.22", "1.0")]] },
  p59b: { frag: [[RD, rd("0.4", "1.0")]] },
  p59c: { frag: [[RD, rd("0.4", "0.0")]] },
};
