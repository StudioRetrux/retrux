// Round-9 plan T03: tearing / stair-steps at in-between cameras. <p>Visible() = 5 binary step() taps on a nearest depth map,
// so each projector's weight jumps by 0.2 on the depth-texel grid (2-3 px in the dolly) and neighbours flip between plates.
// pcf: a bilinear PCF on texel centres, each tap smoothstep(lim - 0.4, lim + 0.4, depth x 1.06) (continuous; 4 taps).
// pcfBlur: pcf + the fill blur keyed to any camera offset (plate: filled x smoothstep(0.02, 0.3, camAway) instead of
// (1, 4); lake: the moved lookup blurred +3 like 'raised').
const PAIRS = [["Plate", "plate"], ["Hold", "hold"], ["OrbN", "orbN"], ["OrbP", "orbP"], ["Tilt", "tilt"]];
const oldVis = (P, p) => `float ${p}Visible(vec2 uv, float fz) {
  vec2 t = u${P}DepthTexel * 1.5;
  float lim = fz - 0.8;
  float v = step(lim, ${p}DepthAt(uv) * 1.06);
  v += step(lim, ${p}DepthAt(uv + vec2(t.x, 0.0)) * 1.06);
  v += step(lim, ${p}DepthAt(uv - vec2(t.x, 0.0)) * 1.06);
  v += step(lim, ${p}DepthAt(uv + vec2(0.0, t.y)) * 1.06);
  v += step(lim, ${p}DepthAt(uv - vec2(0.0, t.y)) * 1.06);
  return v * 0.2;
}`;
const newVis = (P, p) => `float ${p}Visible(vec2 uv, float fz) {
  vec2 t = u${P}DepthTexel;
  vec2 st = uv / t - 0.5;
  vec2 i0 = floor(st);
  vec2 f = st - i0;
  vec2 b = (i0 + 0.5) * t;
  float lim = fz - 0.8;
  float v00 = smoothstep(lim - 0.4, lim + 0.4, ${p}DepthAt(b) * 1.06);
  float v10 = smoothstep(lim - 0.4, lim + 0.4, ${p}DepthAt(b + vec2(t.x, 0.0)) * 1.06);
  float v01 = smoothstep(lim - 0.4, lim + 0.4, ${p}DepthAt(b + vec2(0.0, t.y)) * 1.06);
  float v11 = smoothstep(lim - 0.4, lim + 0.4, ${p}DepthAt(b + t) * 1.06);
  return mix(mix(v00, v10, f.x), mix(v01, v11, f.x), f.y);
}`;
const VIS = PAIRS.map(([P, p]) => [oldVis(P, p), newVis(P, p)]);
const PLATE_FILL = "  float filled = step(1e-5, distance(uv, uv0)) * smoothstep(1.0, 4.0, distance(cameraPosition, uPlateCamPos));";
const PLATE_FILL_N = "  float filled = step(1e-5, distance(uv, uv0)) * smoothstep(0.02, 0.3, distance(cameraPosition, uPlateCamPos));";
const LAKE_LOD = "  float lod = lodX + 3.0 * raised;";
const LAKE_LOD_N = "  float lod = lodX + 3.0 * max(raised, step(1e-5, distance(puv, puv0)) * smoothstep(0.02, 0.3, camAway));";
export default {
  pcf: { plate: VIS, water: VIS },
  pcfBlur: { plate: [...VIS, [PLATE_FILL, PLATE_FILL_N]], water: [...VIS, [LAKE_LOD, LAKE_LOD_N]] },
};
