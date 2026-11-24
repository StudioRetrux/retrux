// Which mesh carries the slab ghost? Water tinted cyan, plate fragments banded by their projector depth.
const WFINAL = "  gl_FragColor = vec4(col, 1.0);\n}";
const PFINAL = "gl_FragColor = vec4(mix(col, MIST_COLOR, min(mist, 0.85)), 1.0);";
export default {
  mesh: {
    water: [[WFINAL, "  gl_FragColor = vec4(mix(col, vec3(0.0, 1.0, 1.0), 0.5), 1.0);\n}"]],
    plate: [[PFINAL, `${PFINAL}
  vec3 band = fz < 16.0 ? vec3(1.0, 0.0, 0.0) : fz < 20.0 ? vec3(1.0, 0.6, 0.0) : fz < 25.0 ? vec3(1.0, 1.0, 0.0) : fz < 35.0 ? vec3(0.0, 1.0, 0.0) : fz < 60.0 ? vec3(0.0, 0.3, 1.0) : vec3(0.6);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, band, 0.45);`]],
  },
};
