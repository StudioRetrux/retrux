// Round-9 hold-sweep MAJOR: at the pop camera (between the rest, tilt and hold projectors) the near floes tear into long
// horizontal hairlines and dashes (sw_pop_B x500-643 y657-670). Which surface and which projector paints them?
// lakeR: lake red. lakeW: lake sources (R = live mirror, G = plate weight, B = extra coverage).
// plateW: plate fragments, R = rest share, G = extras' share. vis: lake, R = vis0 (rest sees the point), G = raised.
const LAKE_END = "  gl_FragColor = vec4(col, 1.0);\n}";
const PLATE_MIX = "    col = acc / wsum;";
export default {
  lakeR: { water: [[LAKE_END, "  gl_FragColor = vec4(col * vec3(1.0, 0.25, 0.25) + vec3(0.25, 0.0, 0.0), 1.0);\n}"]] },
  lakeW: { water: [[LAKE_END, "  gl_FragColor = vec4(mix(col, vec3(1.0 - plateW, plateW, extraCover), 0.7), 1.0);\n}"]] },
  plateW: { plate: [[PLATE_MIX, "    col = acc / wsum; col = mix(col, vec3(w0 / wsum, 1.0 - w0 / wsum, 0.0), 0.7);"]] },
  vis: { water: [[LAKE_END, "  gl_FragColor = vec4(mix(col, vec3(vis0, raised, nofill), 0.7), 1.0);\n}"]] },
};
