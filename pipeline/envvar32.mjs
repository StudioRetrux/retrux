// Round-8 T05 (hold atmosphere), shader part (the deterministic linger is a Choreography change, not here). On top of T04
// (envvar31 r31). Plate AND lake (GLSL_PLATE_MIST is shared: both shaders carry plateBank).
// h5: bank with a billowy top at 11 +- 4 m (fbm), a soft 8 m transition, 3-octave billow drifting ~0.4 m/s, reaching in
//     from 35 m on the water level (far floes, the iceberg foot) and 60 m above 3 m; two-tone (dark swirls in the lows),
//     cap 0.8. Massif in the hold: aerial x(1 - 0.85 hold) (was 0.6), slope haze x(1 - 0.7 hold), and above 12 m at
//     100-330 m a little contrast back (x1.15 chroma, x0.9). Near floe undercuts (< 30 m, luma < 0.12) lifted towards the
//     fog in the hold. Iceberg grade halved in the hold. Hold DOF: focus range 30 -> 10 m and the near blur ramp moved
//     out with the dolly (8-16 m -> 18-28 m).
import r31 from "./envvar31.mjs";
const T04 = r31.r31.plate;
const BANK_FN = `float plateBank(float d, vec3 p, float hold, float time) {
  if (hold <= 0.0) return 0.0;
  // (QC round 5: a 1.5-10 m bank washed the massif out; F420's fog sea covers only its lower part.)
  // (0.8-6 m since QC round 5; round 7 with the v4 plates: "far too thin", F420's bank swallows the lower ~45 % of the
  // mountain: 1-18 m.)
  return hold * smoothstep(60.0, 120.0, d) * step(d, 330.0) * (1.0 - smoothstep(1.0, 18.0, p.y))
    * (0.55 + 0.45 * plateMistWisp(p * 0.6, time));
}`;
const BANK_FN_N = `float plateBankBillow = 1.0;
float plateBank(float d, vec3 p, float hold, float time) {
  if (hold <= 0.0) return 0.0;
  // QC round 8 (T05): a dense, billowy bank with a ragged top at ~11 +- 4 m and a soft 8 m transition, reaching in to the far
  // floes and the iceberg foot on the water (35 m) and from 60 m higher up.
  float top = 11.0 + 4.0 * fbm(vec3(p.xz * 0.015 + vec2(time * 0.02, 0.0), 1.7), 2);
  float hgt = 1.0 - smoothstep(top - 6.0, top + 2.0, p.y);
  plateBankBillow = 0.6 + 0.4 * fbm(p * 0.035 + vec3(time * 0.014, 0.0, time * 0.006), 3);
  float reach = mix(smoothstep(35.0, 90.0, d), smoothstep(60.0, 120.0, d), smoothstep(2.0, 4.0, p.y));
  return hold * reach * step(d, 330.0) * hgt * plateBankBillow;
}`;
const BANK_MIX_PLATE = "  col = mix(col, uFogColor * vec3(0.44, 0.54, 0.66), min(plateBank(d, fp, uFogHold, uTime) * (1.0 - 0.75 * ridgeBody * smoothstep(1.0, 6.0, fp.y)) * 0.75, 0.68));";
const BANK_MIX_PLATE_N = `  {
    float bk = plateBank(d, fp, uFogHold, uTime) * (1.0 - 0.75 * ridgeBody * smoothstep(1.0, 6.0, fp.y));
    vec3 bankC = mix(uFogColor * vec3(0.30, 0.37, 0.46), uFogColor * vec3(0.44, 0.54, 0.66), plateBankBillow);
    col = mix(col, bankC, min(bk * 0.85, 0.8));
  }`;
const BANK_MIX_WATER = "  base = mix(base, uFogColor * vec3(0.44, 0.54, 0.66), min(plateBank(dist, vWorldPos, uFogHold, uTime) * 0.75, 0.68));";
const BANK_MIX_WATER_N = `  {
    float bk = plateBank(dist, vWorldPos, uFogHold, uTime);
    vec3 bankC = mix(uFogColor * vec3(0.30, 0.37, 0.46), uFogColor * vec3(0.44, 0.54, 0.66), plateBankBillow);
    base = mix(base, bankC, min(bk * 0.85, 0.8));
  }`;
// T04's aerial line (already patched by r31) -> the massif keeps its slate in the hold.
const AERIAL_T04 = "* (1.0 - 0.6 * uHold) * (1.0 - ridgeBody * mix(0.5, 0.75, uHold)));";
const AERIAL_H5 = "* (1.0 - 0.85 * uHold) * (1.0 - ridgeBody * mix(0.5, 0.75, uHold)));";
const SLOPE = "  col = mix(col, uFogColor * vec3(0.9, 0.95, 1.02), slopeH * 0.15);";
const SLOPE_N = `  col = mix(col, uFogColor * vec3(0.9, 0.95, 1.02), slopeH * 0.15 * (1.0 - 0.7 * uHold));
  {
    // The massif above the bank keeps its slate contrast in the hold (F420: a crisp blue-grey face).
    float lm = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float upK = uHold * smoothstep(100.0, 130.0, d) * (1.0 - smoothstep(320.0, 335.0, d)) * smoothstep(12.0, 16.0, fp.y) * uPlateDepthOn;
    col = mix(col, (vec3(lm) + (col - vec3(lm)) * 1.15) * 0.9, upK);
    // Near floe undercuts: lifted towards the fog in the hold (near-black outlines read as holes).
    float nk = uHold * (1.0 - smoothstep(20.0, 30.0, d)) * (1.0 - smoothstep(0.06, 0.12, lm));
    col = mix(col, max(col * 1.6, uFogColor * 0.35), nk * 0.6);
  }`;
const BERG = "  col = mix(col, max(mix(vec3(lumaI), col, 1.5) * 0.82, vec3(0.0)), berg);";
const BERG_N = "  col = mix(col, max(mix(vec3(lumaI), col, mix(1.5, 0.88, uHold)) * mix(0.82, 0.95, uHold), vec3(0.0)), berg * (1.0 - 0.5 * uHold));";
const DOF_P = "  float lodDof = uDofBlur * smoothstep(0.0, uFocusRange, abs(d - uFocusDist)) + 1.6 * (1.0 - smoothstep(8.0, 16.0, d));";
const DOF_P_N = "  float lodDof = uDofBlur * smoothstep(0.0, mix(uFocusRange, 10.0, uHold), abs(d - uFocusDist)) + 1.6 * (1.0 - smoothstep(8.0 + 10.0 * uHold, 16.0 + 12.0 * uHold, d));";
const DOF_W = "  float lodX = uDofBlur * smoothstep(0.0, 30.0, abs(dist - uFocusDist)) + 1.6 * (1.0 - smoothstep(8.0, 16.0, dist));";
const DOF_W_N = "  float lodX = uDofBlur * smoothstep(0.0, mix(30.0, 10.0, uHold), abs(dist - uFocusDist)) + 1.6 * (1.0 - smoothstep(8.0 + 10.0 * uHold, 16.0 + 12.0 * uHold, dist));";
export default {
  r31: { plate: T04 },
  h5: {
    plate: [...T04, [BANK_FN, BANK_FN_N], [BANK_MIX_PLATE, BANK_MIX_PLATE_N], [AERIAL_T04, AERIAL_H5], [SLOPE, SLOPE_N], [BERG, BERG_N], [DOF_P, DOF_P_N]],
    water: [[BANK_FN, BANK_FN_N], [BANK_MIX_WATER, BANK_MIX_WATER_N], [DOF_W, DOF_W_N]],
  },
};
