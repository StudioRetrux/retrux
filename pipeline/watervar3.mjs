// Round-9 T04, second try: F420's near water carries broad, irregular wind swells (dark troughs, lighter crests), not one
// regular ripple ring (watervar2 w2 drew a single compass arc across the bottom). w3: an fbm swell field stretched across
// the view (x 0.5 / z 1.1 per m, drifting), bending the live mirror's normal and darkening its troughs, only in the hold
// and only in the near water (< 10-22 m).
const SL = "    vec2 sl = waveS * 0.25 + m1.yw * vec2(0.55, 0.9) * 0.035;";
const SL_N = `    vec2 sl = waveS * 0.25 + m1.yw * vec2(0.55, 0.9) * 0.035;
    vec4 swl = fbmd(vec3(vWorldPos.x * 0.5, vWorldPos.z * 1.1, uTime * 0.25), 2);
    float swK = uHold * (1.0 - smoothstep(10.0, 22.0, dist));
    sl += vec2(swl.y, swl.w) * 0.08 * swK;`;
const LIVE = "    vec3 live = rLive * vec3(0.62, 0.7, 0.8);";
const LIVE_N = "    vec3 live = rLive * vec3(0.62, 0.7, 0.8);\n    live *= 1.0 - 0.28 * smoothstep(0.0, 0.6, -swl.x) * swK;";
export default {
  w3: { water: [[SL, SL_N], [LIVE, LIVE_N]] },
};
