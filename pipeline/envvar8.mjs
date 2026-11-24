// Vertical-orbit slab ghost (it is on the LAKE): the re-aimed lake lookup passes the projector's x1.06 + 0.8 m
// tolerance just behind the near floe slab and samples the slab's top. Reconstruct what the projector saw at the
// lookup along its ray; above the water plane -> hidden (live mirror / an extra projector that sees it).
const ANCHOR = "  vec2 puv0 = pclip.xy / pclip.w * 0.5 + 0.5;\n  vec2 puv = plateUnoccluded(puv0, pw);";
const RAISED = (lo, hi) => `  float raised = 0.0;
  if (uPlateDepthOn > 0.5 && camAway > 0.02) {
    vec2 ruv1 = clamp(pclip.xy / pclip.w * 0.5 + 0.5, vec2(0.0), vec2(1.0));
    float dz = plateDepthAt(ruv1);
    float fzw = -(uPlateView * vec4(pw, 1.0)).z;
    vec3 sw = uPlateCamPos + (pw - uPlateCamPos) * (dz / max(fzw, 1e-3));
    raised = smoothstep(${lo}, ${hi}, sw.y - pw.y) * step(dz, fzw);
  }
${ANCHOR}`;
const NOF = "  if (nofill > 0.5) puv = puv0;\n  float lod";
const NOF2 = "  if (nofill > 0.5) puv = puv0;\n  nofill = max(nofill, raised);\n  vis0 *= 1.0 - raised;\n  float lod";
const WFINAL = "  gl_FragColor = vec4(col, 1.0);\n}";
export default {
  raised: { water: [[ANCHOR, RAISED("0.05", "0.12")], [NOF, NOF2]] },
  raised_dbg: { water: [[ANCHOR, RAISED("0.05", "0.12")], [NOF, NOF2], [WFINAL, "  gl_FragColor = vec4(mix(col, vec3(1.0, 0.0, 1.0), raised * 0.7), 1.0);\n}"]] },
};
