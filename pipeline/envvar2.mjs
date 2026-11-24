// T06: ray-step cloud cull (envvar1 winner) + a crack rule in the plate shader (fragments seen through cracks in the
// decimated mountain proxies take the occluder's texel instead of a fill from the massif's snow).
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
const crack = (mark) => `${NOFILL}  float crackK = 0.0;
  {
    float oz0 = textureLod(uPlateDepth, clamp(uv0, vec2(0.0), vec2(1.0)), 0.0).r;
    float fz0 = -(uPlateView * vec4(vWorldPos, 1.0)).z;
    vec2 dTex = (uv - uv0) / uPlateDepthTexel;
    if (uPlateDepthOn > 0.5 && oz0 > 40.0 && oz0 < 300.0 && fz0 > oz0 * 1.02 + 0.5 && (nofill > 0.5 || dot(dTex, dTex) > ${mark.far})) {
      float ez = -(uPlateView * vec4(cameraPosition, 1.0)).z;
      vec3 P = cameraPosition + (vWorldPos - cameraPosition) * clamp((oz0 - ez) / max(fz0 - ez, 1e-3), 0.0, 1.0);
      vec4 pp = uPlateViewProjF * vec4(P, 1.0);
      vec2 q = clamp(pp.xy / pp.w * 0.5 + 0.5, vec2(0.0), vec2(1.0));
      if (plateDepthAt(q) < -(uPlateView * vec4(P, 1.0)).z * 1.05 + 0.5) { uv = uv0; nofill = 0.0; crackK = 1.0; }
    }
  }
`;
const FINAL = "gl_FragColor = vec4(mix(col, MIST_COLOR, min(mist, 0.85)), 1.0);";
export default {
  raycull: { cloud: [[CULL, RAYCULL]] },
  crack: { cloud: [[CULL, RAYCULL]], plate: [[NOFILL, crack({ far: "36.0" })]] },
  crack0: { cloud: [[CULL, RAYCULL]], plate: [[NOFILL, crack({ far: "-1.0" })]] },
  crack_dbg: { cloud: [[CULL, RAYCULL]], plate: [[NOFILL, crack({ far: "36.0" })], [FINAL, `${FINAL}\n  if (crackK > 0.5) gl_FragColor.rgb = vec3(1.0, 0.0, 1.0);`]] },
};
