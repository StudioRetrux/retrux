// Round-10 grade (measured), env tone package:
//  u1: the hold massif's slate term (upK) never reached the face: in the hold the face is at d 100-120 (camera distance) and
//      fp.y 3-12 (debug envvar42), the gate was d 100-130 x fp.y 12-16. Gated on the REST projector's depth instead
//      (pz >= ~100: the massif and the ranges, never the ridge / berg / floes) and fp.y 3-6; (x1.3) x0.85.
//  h1: the far-field aerial haze 0.24 -> 0.17 (massif flank +15 vs F000).
//  m1: the low mist over the bases / plain: steel-blue (half way to footC) and x0.7 (bases +16, plain +19 vs F000).
//  r1: the far-left ridge: 35 % less chroma, ~15 % darker, slate.
const AT = "  // Less of it in the hold: F420's massif is a crisp blue-grey face";
const RIDGE = `  if (ridgeBody > 0.0) {
    // Slate, not electric navy (QC round 10: B +28 vs F000, chroma +33 %).
    float lrd = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(col, mix(vec3(lrd), col, 0.65) * vec3(0.8, 0.86, 0.9), ridgeBody);
  }
${AT}`;
const UPK = "    float upK = uHold * smoothstep(100.0, 130.0, d) * (1.0 - smoothstep(320.0, 335.0, d)) * smoothstep(12.0, 16.0, fp.y) * uPlateDepthOn;\n    col = mix(col, (vec3(lm) + (col - vec3(lm)) * 1.15) * 0.9, upK);";
const UPK_N = "    float upK = uHold * smoothstep(96.0, 104.0, pz) * step(pz, 330.0) * smoothstep(3.0, 6.0, fp.y) * uPlateDepthOn * skyGate;\n    col = mix(col, (vec3(lm) + (col - vec3(lm)) * 1.3) * 0.85, upK);";
const HZ = "smoothstep(60.0, 140.0, d) * step(d, 330.0) * 0.24 * (1.0 - 0.85 * uHold)";
const HZ_N = "smoothstep(60.0, 140.0, d) * step(d, 330.0) * 0.17 * (1.0 - 0.85 * uHold)";
const MI = "  gl_FragColor = vec4(mix(col, mix(MIST_COLOR, footC, ridgeFoot), min(mist, 0.85)), 1.0);";
const MI_N = "  gl_FragColor = vec4(mix(col, mix(mix(MIST_COLOR, footC, 0.5), footC, ridgeFoot), min(mist * 0.7, 0.85)), 1.0);";
export default {
  u1: { plate: [[UPK, UPK_N]] },
  h1: { plate: [[HZ, HZ_N]] },
  m1: { plate: [[MI, MI_N]] },
  all: { plate: [[AT, RIDGE], [UPK, UPK_N], [HZ, HZ_N], [MI, MI_N]] },
};
