// Glitch batch 1 (round 6 glitch_hold_sweep: grey cut-out patches beside the iceberg in hold / pop, ghost contours in
// open sky). Diagnostics first: which projector paints what, and whether the rest-plate-only post terms (farBand local
// contrast, base de-haze, fog-at-projector-surface) draw the patches on extra-projector colour.
const MAIN = "void main() {\n  vec2 uv0 = vPlateClip.xy / vPlateClip.w * 0.5 + 0.5;";
const OUT = "gl_FragColor = vec4(mix(col, MIST_COLOR, min(mist, 0.85)), 1.0);";
export default {
  dbgw: {
    plate: [
      [MAIN, "void main() {\n  float dbgH = 0.0; float dbgO = 0.0; float dbgW0 = 1.0; float dbgWs = 1.0;\n  vec2 uv0 = vPlateClip.xy / vPlateClip.w * 0.5 + 0.5;"],
      ["acc += textureLod(uHoldPlate", "dbgH += wK; acc += textureLod(uHoldPlate"],
      ["acc += textureLod(uOrbNPlate", "dbgO += wK; acc += textureLod(uOrbNPlate"],
      ["acc += textureLod(uOrbPPlate", "dbgO += wK; acc += textureLod(uOrbPPlate"],
      ["acc += textureLod(uTiltPlate", "dbgO += wK; acc += textureLod(uTiltPlate"],
      ["col = acc / wsum;", "col = acc / wsum; dbgW0 = w0; dbgWs = wsum;"],
      [OUT, "gl_FragColor = vec4(vec3(dbgW0, dbgH, dbgO) / dbgWs * (1.0 - 0.6 * filled) + vec3(nofill, 0.0, nofill) * 0.6, 1.0);"],
    ],
  },
  nofar: { plate: [["float farBand = smoothstep(55.0, 70.0, pz)", "float farBand = 0.0 * smoothstep(55.0, 70.0, pz)"]] },
  nobase: { plate: [["baseK *= (1.0 - smoothstep(0.3, 0.4, restFrame(uv0).x))", "baseK *= 0.0 * (1.0 - smoothstep(0.3, 0.4, restFrame(uv0).x))"]] },
  nofp: { plate: [["if (uPlateDepthOn > 0.5 && pz < 300.0 && fz > pz * 1.02 + 0.5) fp =", "if (false) fp ="]] },
};
