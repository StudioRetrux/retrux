// Round-8 T04: the far-left ridge's foot under a hard grey "lid", the ridge greyed by the hold bank. The ridge mask (now
// only a haze gate: the navy overlay is off) carries footGate = smoothstep(0.1, 0.5, y) at the far left, so fog and mist
// are full below ~0.4 m and halved above it: an ~8 px step at 87 m. Over dark rock the mist colour and the fog colour
// mix to neutral grey.
// r31: ridgeBody (no foot gate) for the haze gates; a soft ramp smoothstep(0.3, 3.5, y) instead of the step; aerial
//      (1 - 0.5 ridgeBody) at rest (the reference ridge is hazier than ours), (1 - 0.75 ridgeBody) in the hold; farBand
//      off on ridgeBody; foot fog / mist tinted steel blue (MIST_COLOR x (0.62, 0.80, 1.0)); the hold bank stays off the
//      ridge above its foot (x (1 - 0.75 ridgeBody smoothstep(1, 6, y))).
const R_DEF = "  ridge *= step(pz, 300.0) * smoothstep(40.0, 50.0, rz) * (1.0 - smoothstep(96.0, 100.0, rz)) * footGate * uPlateDepthOn;";
const R_DEF_N = `  float ridgeBody = ridge * step(pz, 300.0) * smoothstep(40.0, 50.0, rz) * (1.0 - smoothstep(96.0, 100.0, rz)) * uPlateDepthOn;
  ridge = ridgeBody * footGate;`;
const FARBAND = "* uPlateDepthOn * (1.0 - ridge);";
const FARBAND_N = "* uPlateDepthOn * (1.0 - ridgeBody);";
const AERIAL = "* (1.0 - 0.6 * uHold) * (1.0 - ridge * 0.9));";
const AERIAL_N = "* (1.0 - 0.6 * uHold) * (1.0 - ridgeBody * mix(0.5, 0.75, uHold)));";
const SHADE = "  float shade = 1.0 - ridge * 0.5;";
const SHADE_N = `  float ridgeUp = smoothstep(0.3, 3.5, fp.y);
  float shade = 1.0 - 0.5 * ridgeBody * ridgeUp;
  float ridgeFoot = ridgeBody * (1.0 - ridgeUp);
  vec3 footC = MIST_COLOR * vec3(0.62, 0.80, 1.0);`;
const FOG = "  col = mix(col, uFogColor, min(fog, 0.85));";
const FOG_N = "  col = mix(col, mix(uFogColor, footC, ridgeFoot), min(fog, 0.85));";
const BANK = "min(plateBank(d, fp, uFogHold, uTime) * 0.75, 0.68));";
const BANK_N = "min(plateBank(d, fp, uFogHold, uTime) * (1.0 - 0.75 * ridgeBody * smoothstep(1.0, 6.0, fp.y)) * 0.75, 0.68));";
const MIST = "  gl_FragColor = vec4(mix(col, MIST_COLOR, min(mist, 0.85)), 1.0);";
const MIST_N = "  gl_FragColor = vec4(mix(col, mix(MIST_COLOR, footC, ridgeFoot), min(mist, 0.85)), 1.0);";
export default {
  r31: { plate: [[R_DEF, R_DEF_N], [FARBAND, FARBAND_N], [AERIAL, AERIAL_N], [SHADE, SHADE_N], [FOG, FOG_N], [BANK, BANK_N], [MIST, MIST_N]] },
};
