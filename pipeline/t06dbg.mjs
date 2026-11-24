// T06 debug (round 7/8): where does the doubled contour at the mid-left mound's end (ptr_left 409-449, 652-685) come
// from? lakeR: the lake tinted red (which pixels are lake, which are plate proxies). plateW: plate pixels tinted by
// projector share (red = rest plate, green = extra projectors). lakeW: lake tinted by its sources (red = live mirror,
// green = plate weight, blue = extra-projector coverage). orbNonly / restonly: plate AND lake forced to one projector.
const LAKE_END = "  gl_FragColor = vec4(col, 1.0);\n}";
const PLATE_MIX = "    col = acc / wsum;";
const LAKE_MIX = "    if (wsum > 1e-4) base = acc / wsum;";
export default {
  lakeR: { water: [[LAKE_END, "  gl_FragColor = vec4(col * vec3(1.0, 0.25, 0.25), 1.0);\n}"]] },
  plateW: { plate: [[PLATE_MIX, "    col = acc / wsum; col = mix(col, vec3(w0 / wsum, 1.0 - w0 / wsum, 0.0), 0.55);"]] },
  lakeW: { water: [[LAKE_END, "  gl_FragColor = vec4(mix(col, vec3(1.0 - plateW, plateW, extraCover), 0.6), 1.0);\n}"]] },
  restonly: {
    plate: [["float w0 = max(uRestMix, 0.001) * (vis1 + 0.02);", "float w0 = 1.0 * (vis1 + 0.02);"], ["float wK = uOrbNMix * visK * inK;", "float wK = 0.0;"]],
    water: [["float w0 = max(uRestMix, 0.001) * (vis0 + 0.02)", "float w0 = 1.0 * (vis0 + 0.02)"], ["float wK = uOrbNMix * visK * inK;", "float wK = 0.0;"]],
  },
};
