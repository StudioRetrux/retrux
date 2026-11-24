// Round 7 T06: lake / near-proxy edge registration. p1: near proxies (< 40 m) sample 1.5 texels towards their nearer side
// where a neighbour depth is > 0.5 m farther (the plate's anti-aliased rim no longer rides on the proxy edge: no light
// double rim / dotted seam on the foreground rocks). w1: the lake's ripple-bent lookup falls back to the straight one when
// ANY of a 5-tap cross (plateDepthSolid) is nearer, not just the centre texel (rock rims copied onto the water as dots /
// a ghost contour).
const SAMPLE = "  vec3 col = samplePlate(uv, lod);";
const P1 = [SAMPLE, `  if (uPlateDepthOn > 0.5 && pz < 40.0) {
    vec2 rt = uPlateDepthTexel * 1.5;
    float dl = plateDepthAt(uv - vec2(rt.x, 0.0));
    float dr = plateDepthAt(uv + vec2(rt.x, 0.0));
    float dd = plateDepthAt(uv - vec2(0.0, rt.y));
    float du = plateDepthAt(uv + vec2(0.0, rt.y));
    if (max(max(dl, dr), max(dd, du)) > pz + 0.5) {
      vec2 gz = vec2(dr - dl, du - dd);
      uv -= gz / max(length(gz), 1e-4) * rt;
    }
  }
${SAMPLE}`];
const W1 = ["quv = mix(quv, cuv, step(plateDepthAt(quv), plateDepthAt(cuv) * 0.92 - 0.3));", "quv = mix(quv, cuv, step(plateDepthSolid(quv), plateDepthAt(cuv) * 0.92 - 0.3));"];
export default {
  p1: { plate: [P1] },
  w1: { water: [W1] },
  p1w1: { plate: [P1], water: [W1] },
};
