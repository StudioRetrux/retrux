// Bisect the hold ghost: raw = the projector blend's colour straight out (no grade, haze, fog, bank, mist). If the ghost
// is in raw, it is the projection (which plate texel / proxy); if not, it is a post-blend effect.
// raw0: the rest projector's own sample only (before the blend).
const BLEND_END = "    col = acc / wsum;\n  }\n#endif";
const PRE_BLEND = "#ifdef EXTRA_PROJECTORS\n  // Extra projectors (hold pose, orbit extremes)";
export default {
  raw: { plate: [[BLEND_END, "    col = acc / wsum;\n    gl_FragColor = vec4(col * 0.35, 1.0); return;\n  }\n#endif"]] },
  raw0: { plate: [[PRE_BLEND, "  gl_FragColor = vec4(col * 0.35, 1.0); return;\n" + PRE_BLEND]] },
};
