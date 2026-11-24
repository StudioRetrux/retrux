// Slab ghost on the lake: raised test + forced sideways fill, sampled blurred (the per-row source jumps drew stripes).
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
const NOF = "  if (nofill > 0.5) puv = puv0;\n  float lod = uDofBlur * smoothstep(0.0, 30.0, abs(dist - uFocusDist));";
const v = (blur) => ({
  water: [
    [FN, `float gForce = 0.0;\n${FN}`],
    [EARLY, `if (gForce < 0.5 && fz <= plateDepthAt(uv) * 1.06 + 0.8) return uv;`],
    [ANCHOR, RAISED],
    [NOF, `${NOF}\n  vis0 *= 1.0 - raised;\n  lod += ${blur} * raised;`],
  ],
});
export default { rblur3: v("3.0"), rblur5: v("5.0") };
