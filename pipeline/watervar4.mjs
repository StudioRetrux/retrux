// Round-9 T04, third try: in the hold the near lake is the HOLD PLATE's baked calm water (extraCover ~1 keeps plateW ~1), so
// live-mirror edits never show (watervar3). The crest shading (k, from the ripple normal Nw vs the flat mirror) shades the
// plate water itself: an irregular wind-swell slope field added to Nw, hold-only.
// The hold camera is 2.3 m above the water pitched up 4.55 deg: the frame bottom meets the water ~16 m out and the bottom
// 140 px span ~16-35 m (grazing ~4-8 deg), so the field reaches 25-45 m and needs larger slopes.
const NW = "  vec3 Nw = normalize(vec3(-waveS.x, 1.0, -waveS.y));";
const nw = (a, lo, hi) => `  vec4 swl = fbmd(vec3(vWorldPos.x * 0.35, vWorldPos.z * 0.8, uTime * 0.25), 2);
  float swK = uHold * (1.0 - smoothstep(${lo}, ${hi}, dist));
  vec3 Nw = normalize(vec3(-waveS.x - swl.y * ${a} * swK, 1.0, -waveS.y - swl.w * ${a} * swK));`;
export default {
  w4c: { water: [[NW, nw("0.25", "25.0", "45.0")]] },
  w4d: { water: [[NW, nw("0.4", "25.0", "45.0")]] },
};
