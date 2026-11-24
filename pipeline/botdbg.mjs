// Round-9 cursor-orbit CRITICAL: with the pointer low (a pure pan at the rest position: only plate_rest, camAway 0), the
// last 10-20 px under the foreground rocks turn into a near-black navy band (~3-8, 19-25, 41-46) with a hard top edge and
// stair-stepped / dotted ends. Which surface paints it, and which term darkens it?
// lakeR: the lake tinted red. noRip: the lake's crest shading and trough tint off. noHero: the live hero reflection off.
const LAKE_END = "  gl_FragColor = vec4(col, 1.0);\n}";
export default {
  lakeR: { water: [[LAKE_END, "  gl_FragColor = vec4(col * vec3(1.0, 0.25, 0.25) + vec3(0.25, 0.0, 0.0), 1.0);\n}"]] },
  noRip: { water: [["  k *= plateW;", "  k *= 0.0;"]] },
  noHero: { water: [["  if (uReflectionOn > 0.5) {", "  if (uReflectionOn > 1e9) {"]] },
};
