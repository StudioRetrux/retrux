// Slab ghost on the lake: raised-surface test (envvar8) forcing the existing sideways fill (same image row = same
// lake distance) instead of the live mirror.
const ANCHOR = "  vec2 puv0 = pclip.xy / pclip.w * 0.5 + 0.5;\n  vec2 puv = plateUnoccluded(puv0, pw);";
const RAISED = `  float raised = 0.0;
  if (uPlateDepthOn > 0.5 && camAway > 0.02) {
    vec2 ruv1 = clamp(pclip.xy / pclip.w * 0.5 + 0.5, vec2(0.0), vec2(1.0));
    float dz = plateDepthAt(ruv1);
    float fzw = -(uPlateView * vec4(pw, 1.0)).z;
    vec3 sw = uPlateCamPos + (pw - uPlateCamPos) * (dz / max(fzw, 1e-3));
    raised = smoothstep(0.05, 0.12, sw.y - pw.y) * step(dz, fzw);
  }
  gForce = step(0.5, raised);
${ANCHOR}`;
const FN = "vec2 plateUnoccluded(vec2 uv, vec3 worldPos) {";
const EARLY = "if (fz <= plateDepthAt(uv) * 1.06 + 0.8) return uv;";
const NOF = "  if (nofill > 0.5) puv = puv0;\n  float lod";
const WFINAL = "  gl_FragColor = vec4(col, 1.0);\n}";
const base = [[FN, `float gForce = 0.0;\n${FN}`], [EARLY, `if (gForce < 0.5 && fz <= plateDepthAt(uv) * 1.06 + 0.8) return uv;`], [ANCHOR, RAISED]];
export default {
  rfill: { water: [...base, [NOF, "  if (nofill > 0.5) puv = puv0;\n  vis0 *= 1.0 - raised;\n  float lod"]] },
  rfill_dbg: { water: [...base, [NOF, "  if (nofill > 0.5) puv = puv0;\n  vis0 *= 1.0 - raised;\n  float lod"],
    [WFINAL, "  gl_FragColor = vec4(mix(col, nofill > 0.5 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0), raised * 0.6), 1.0);\n}"]] },
};
