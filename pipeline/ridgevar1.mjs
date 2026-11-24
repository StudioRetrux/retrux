// Ridge batch 1 (round 6 plan T06): the far-left navy ridge mask. r1 = one detail source (the rest plate sharp / blurred,
// clamped 0.6-1.12, faded out where the extra projectors paint: restShare), r2 = r1 + soft depth gates, r3 = r2 + a
// smaller footprint (0.20-0.27) and a darker top (0.55).
const LUMA = "vec3(0.2126, 0.7152, 0.0722)";
const P = {
  shareDecl: ["vec2 uv = plateUnoccluded(uv0, vWorldPos, 0.0);", "vec2 uv = plateUnoccluded(uv0, vWorldPos, 0.0);\n  float restShare = 1.0;"],
  shareSet: ["    col = acc / wsum;\n  }\n#endif", "    col = acc / wsum;\n    restShare = w0 / max(wsum, 1e-4);\n  }\n#endif"],
  det: [`float ridgeDet = clamp(dot(col, ${LUMA}) / max(dot(ridgeBlur, ${LUMA}), 1e-4), 0.7, 1.3);`,
    `vec3 ridgeSharp = plateGrade(samplePlate(uv, lod));
  float ridgeDet = clamp(dot(ridgeSharp, ${LUMA}) / max(dot(ridgeBlur, ${LUMA}), 1e-4), 0.6, 1.12);
  ridgeDet = mix(1.0, ridgeDet, restShare);`],
  gate1: ["float ridge = max(plateRidgeArea(uv), plateRidgeArea(uv0) * step(fz, occZ * 1.3 + 5.0));", "float ridge = max(plateRidgeArea(uv), plateRidgeArea(uv0) * (1.0 - smoothstep(occZ * 1.3 + 3.0, occZ * 1.3 + 7.0, fz)));"],
  gate2: ["ridge *= step(pz, 300.0) * smoothstep(40.0, 50.0, rz)", "ridge *= (1.0 - smoothstep(290.0, 310.0, pz)) * smoothstep(40.0, 50.0, rz)"],
  area: ["return 1.0 - smoothstep(0.24, 0.32, f.x);", "return 1.0 - smoothstep(0.20, 0.27, f.x);"],
  top: ["mix(1.0, 0.62, smoothstep(0.525, 0.65, restFrame(uv0).y))", "mix(1.0, 0.55, smoothstep(0.525, 0.65, restFrame(uv0).y))"],
};
const r1 = [P.shareDecl, P.shareSet, P.det];
const r2 = [...r1, P.gate1, P.gate2];
const r3 = [...r2, P.area, P.top];
export default {
  r1: { plate: r1 },
  r2: { plate: r2 },
  r3: { plate: r3 },
};
