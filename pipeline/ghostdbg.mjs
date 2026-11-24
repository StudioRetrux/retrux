// Round-9 env major: a flat, stair-stepped ghost copy of the far range above the real one, right of the iceberg in the
// hold (p06 x1300-1440 y505-575; hold_L / hold_R; faint in ptr_left). The raw plate_hold shows one range: the double
// comes from the blend. Debug tints:
// wt: red = rest share, green = extra share (which projector paints it).
// dep: the rest projector depth band at the fragment (pz): R near < 150 m, G 150-330, B backdrop.
const BLEND_END = "    col = acc / wsum;\n  }\n#endif";
export default {
  wt: { plate: [[BLEND_END, "    col = acc / wsum; col = mix(col, vec3(w0 / wsum, 1.0 - w0 / wsum, 0.0), 0.7);\n  }\n#endif"]] },
  dep: { plate: [[BLEND_END, "    col = acc / wsum; col = mix(col, vec3(step(pz, 150.0), step(150.0, pz) * step(pz, 330.0), step(330.0, pz)), 0.7);\n  }\n#endif"]] },
};
