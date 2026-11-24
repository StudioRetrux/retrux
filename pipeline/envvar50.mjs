// Ridge specks, take 4. envvar49's march fired for EVERY hidden fragment (the ray always ends behind the rest projector's
// surface, the fragment being hidden): a parallax-revealed strip beside the ridge silhouette took the ridge's texel (a grey
// sliver along the edge). c3: the march looks for the first sample BEHIND the surface and calls it a crack only if the
// surface is continuous there (the ray crossed the surface itself); passing behind a silhouette shows as a depth jump
// (ridge 87 m vs massif 110 m) and is a legit reveal. The round-4 single test stays first.
const OLD = `      if (plateDepthAt(q) < -(uPlateView * vec4(P, 1.0)).z * 1.05 + 0.5) {
        uv = uv0;
        nofill = 0.0;
      }`;
const NEW = `      bool blocked = plateDepthAt(q) < -(uPlateView * vec4(P, 1.0)).z * 1.05 + 0.5;
      if (!blocked) {
        // March the camera ray through the depth map from just in front of the occluder to the fragment: the first sample
        // behind the surface is a crossing of the surface (a crack) when the depth map is continuous there.
        float s0 = oz0 * 0.9;
        float st = (fz0 - s0) / 8.0;
        float prevD = -1.0;
        for (int i = 0; i <= 8; i++) {
          float s = s0 + st * float(i);
          vec3 S = cameraPosition + (vWorldPos - cameraPosition) * clamp((s - ez) / max(fz0 - ez, 1e-3), 0.0, 1.0);
          vec4 ps = uPlateViewProjF * vec4(S, 1.0);
          float D = plateDepthAt(clamp(ps.xy / ps.w * 0.5 + 0.5, vec2(0.0), vec2(1.0)));
          if (D < s - 0.3) {
            blocked = prevD > 0.0 && abs(D - prevD) < max(0.06 * s, 2.0 * st);
            break;
          }
          prevD = D;
        }
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
const C3 = [[A, A_N], [OLD, NEW], [C, C_N], W("Hold"), W("OrbN"), W("OrbP"), W("Tilt")];
export default {
  c3: { plate: C3 },
  dc3: { plate: [...C3, [END, `${END}\n  if (crackK > 0.5) gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);`]] },
};
