// T06 ridge halo: is the pale band above the ridge (cursor orbit) the cloud cull's parallax, or plate ridge texels on
// the backdrop? Debug tints + a ray-step cloud cull.
const CULL = "if (plateDepthSolid(puv) < fz * 0.9) discard;";
const RAYCULL = `float oz = plateDepthSolid(puv);
      if (oz < fz * 0.9) {
        // From a moved camera the projector's occluder only hides the cloud if the camera's own ray meets it: test
        // the ray at the occluder's depth (at rest this is the same texel).
        float ez = -(uPlateView * vec4(cameraPosition, 1.0)).z;
        float s = clamp((oz - ez) / max(fz - ez, 1e-3), 0.0, 1.0);
        vec3 P = cameraPosition + (vCloudWorld - cameraPosition) * s;
        vec4 pp = uPlateViewProjF * vec4(P, 1.0);
        vec2 q = clamp(pp.xy / pp.w * 0.5 + 0.5, vec2(0.0), vec2(1.0));
        float pzP = -(uPlateView * vec4(P, 1.0)).z;
        if (plateDepthAt(q) < pzP * 1.1 + 1.0) discard;
      }`;
const FINAL = "gl_FragColor = vec4(mix(col, MIST_COLOR, min(mist, 0.85)), 1.0);";
const DBG = `${FINAL}
  // debug: red = backdrop fragment in the ridge region; green = proxy fragment the projector sees as sky (overhang);
  // blue = fragment hidden from the projector behind the ridge (crack / disocclusion).
  if (fz > 300.0 && plateRidgeArea(uv0) > 0.01) gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.0, 0.0), 0.6);
  if (fz < 150.0 && pz > 300.0) gl_FragColor.rgb = vec3(0.0, 1.0, 0.0);
  if (fz > occZ * 1.02 + 0.5 && occZ < 96.0) gl_FragColor.rgb = vec3(0.0, 0.3, 1.0);`;
export default {
  nocull: { cloud: [[CULL, "if (false) discard;"]] },
  raycull: { cloud: [[CULL, RAYCULL]] },
  dbg: { plate: [[FINAL, DBG]] },
};
