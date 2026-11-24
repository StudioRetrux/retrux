// T06: the leftover streaks are ridge folds revealed by parallax whose fill took the massif's snow (100+ m, inside the
// fold's depth window) and so lost the navy gate. Gate the navy by the fragment's own depth too.
const CULL = "if (plateDepthSolid(puv) < fz * 0.9) discard;";
const RAYCULL = `float oz = plateDepthSolid(puv);
      if (oz < fz * 0.9) {
        float ez = -(uPlateView * vec4(cameraPosition, 1.0)).z;
        float s = clamp((oz - ez) / max(fz - ez, 1e-3), 0.0, 1.0);
        vec3 P = cameraPosition + (vCloudWorld - cameraPosition) * s;
        vec4 pp = uPlateViewProjF * vec4(P, 1.0);
        vec2 q = clamp(pp.xy / pp.w * 0.5 + 0.5, vec2(0.0), vec2(1.0));
        float pzP = -(uPlateView * vec4(P, 1.0)).z;
        if (plateDepthAt(q) < pzP * 1.1 + 1.0) discard;
      }`;
const NOFILL = "  if (nofill > 0.5) uv = uv0;\n";
const CRACK = `${NOFILL}  {
    float oz0 = textureLod(uPlateDepth, clamp(uv0, vec2(0.0), vec2(1.0)), 0.0).r;
    float fz0 = -(uPlateView * vec4(vWorldPos, 1.0)).z;
    if (uPlateDepthOn > 0.5 && oz0 > 40.0 && oz0 < 300.0 && fz0 > oz0 * 1.02 + 0.5) {
      float ez = -(uPlateView * vec4(cameraPosition, 1.0)).z;
      vec3 P = cameraPosition + (vWorldPos - cameraPosition) * clamp((oz0 - ez) / max(fz0 - ez, 1e-3), 0.0, 1.0);
      vec4 pp = uPlateViewProjF * vec4(P, 1.0);
      vec2 q = clamp(pp.xy / pp.w * 0.5 + 0.5, vec2(0.0), vec2(1.0));
      if (plateDepthAt(q) < -(uPlateView * vec4(P, 1.0)).z * 1.05 + 0.5) { uv = uv0; nofill = 0.0; }
    }
  }
`;
const GATE = "ridge *= step(pz, 300.0) * (1.0 - smoothstep(96.0, 100.0, pz)) * uPlateDepthOn;";
const GATE_FZ = "ridge *= step(pz, 300.0) * (1.0 - smoothstep(96.0, 100.0, min(pz, fz))) * uPlateDepthOn;";
export default {
  fzgate: { cloud: [[CULL, RAYCULL]], plate: [[GATE, GATE_FZ]] },
  crack_fzgate: { cloud: [[CULL, RAYCULL]], plate: [[NOFILL, CRACK], [GATE, GATE_FZ]] },
};
