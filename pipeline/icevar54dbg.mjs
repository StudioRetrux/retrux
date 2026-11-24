// Which ice term paints the flat saturated end cap (q00 x885-905 y345-400)? Debug outputs.
const END = "  gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);\n}";
export default {
  dbgA: { frag: [[END, "  gl_FragColor = vec4(tirBar, tirZone, pathK, 1.0);\n}"]] },
  dbgB: { frag: [[END, "  gl_FragColor = vec4(band, tir, frost, 1.0);\n}"]] },
  dbgC: { frag: [[END, "  gl_FragColor = vec4(trans * 0.6, 1.0);\n}"]] },
};
