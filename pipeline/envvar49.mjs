// Ridge specks, take 3 (envvar48 debug: the round-4 crack test catches most crack pixels, but some specks escape it: its
// single sample sits at the occluder's depth along the camera ray, and on the grazing ridge face the surface there is
// already > 5 % farther). c2: march the camera ray through the rest projector's depth map from the occluder's depth to the
// fragment (8 samples): blocked anywhere = a crack (the camera's line of sight passes through the proxy surface). A crack
// counts as seen by the rest plate and takes no extra-projector weight (c1).
const OLD = `      if (plateDepthAt(q) < -(uPlateView * vec4(P, 1.0)).z * 1.05 + 0.5) {
        uv = uv0;
        nofill = 0.0;
      }`;
const NEW = `      bool blocked = plateDepthAt(q) < -(uPlateView * vec4(P, 1.0)).z * 1.05 + 0.5;
      for (int i = 0; i < 8; i++) {
        if (blocked) break;
        float s = mix(oz0, fz0, (float(i) + 0.5) / 8.0);
        vec3 S = cameraPosition + (vWorldPos - cameraPosition) * clamp((s - ez) / max(fz0 - ez, 1e-3), 0.0, 1.0);
        vec4 ps = uPlateViewProjF * vec4(S, 1.0);
        blocked = plateDepthAt(clamp(ps.xy / ps.w * 0.5 + 0.5, vec2(0.0), vec2(1.0))) < s * 0.985 - 0.3;
      }
      if (blocked) {
        uv = uv0;
        nofill = 0.0;
        crackK = 1.0;
      }`;
const A = "  if (uPlateDepthOn > 0.5) {\n    float oz0 = ";
const A_N = "  float crackK = 0.0;\n  if (uPlateDepthOn > 0.5) {\n    float oz0 = ";
const C = "    float w0 = max(uRestMix, 0.001) * (vis1 + 0.02);";
const C_N = "    float w0 = max(uRestMix, 0.001) * (max(vis1, crackK) + 0.02);";
const W = (P) => [`    float wK = u${P}Mix * visK * inK;`, `    float wK = u${P}Mix * visK * inK * (1.0 - crackK);`];
const END = "  gl_FragColor = vec4(mix(col, mix(MIST_COLOR * vec3(0.81, 0.9, 1.0), footC, ridgeFoot), min(mist, 0.85)), 1.0);";
const C2 = [[A, A_N], [OLD, NEW], [C, C_N], W("Hold"), W("OrbN"), W("OrbP"), W("Tilt")];
export default {
  c2: { plate: C2 },
  dc2: { plate: [...C2, [END, `${END}\n  if (crackK > 0.5) gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);`]] },
};
