// T06: the white strip along the mid-left mound's edge (left orbit) is LAKE: the extra projector's "raised" test reads
// ONE depth texel, which at the silhouette belongs to the mound (depth map rasterised at its own resolution), so lake
// points the projector does see are rejected (visK 0 -> extraCover 0) and fall back to the rest projector's fill / the
// live mirror (a bright, rippled sky reflection: time-dependent). rx1: the raised test takes the FARTHEST depth of a
// 1-texel cross (any neighbour seeing past the raised surface = visible). rx2: rx1 for the rest projector's raised test
// too. lakeW: diagnostic tint (red = live mirror, green = plate weight, blue = extra coverage).
const KEYS = [["Hold", "hold"], ["OrbN", "orbN"], ["OrbP", "orbP"], ["Tilt", "tilt"]];
const rx = KEYS.map(([P, p]) => [
  `        float kdz = ${p}DepthAt(clamp(k, vec2(0.0), vec2(1.0)));`,
  `        vec2 kt1 = u${P}DepthTexel;
        vec2 kcl = clamp(k, vec2(0.0), vec2(1.0));
        float kdz = max(max(${p}DepthAt(kcl), ${p}DepthAt(kcl + vec2(kt1.x, 0.0))), max(max(${p}DepthAt(kcl - vec2(kt1.x, 0.0)), ${p}DepthAt(kcl + vec2(0.0, kt1.y))), ${p}DepthAt(kcl - vec2(0.0, kt1.y))));`,
]);
const RX_REST = [
  "    float dz = plateDepthAt(ruv);",
  "    float dz = max(max(plateDepthAt(ruv), plateDepthAt(ruv + vec2(uPlateDepthTexel.x, 0.0))), max(max(plateDepthAt(ruv - vec2(uPlateDepthTexel.x, 0.0)), plateDepthAt(ruv + vec2(0.0, uPlateDepthTexel.y))), plateDepthAt(ruv - vec2(0.0, uPlateDepthTexel.y))));",
];
const LAKE_END = "  gl_FragColor = vec4(col, 1.0);\n}";
const LAKEW = [LAKE_END, "  gl_FragColor = vec4(mix(col, vec3(1.0 - plateW, plateW, extraCover), 0.6), 1.0);\n}"];
export default {
  rx1: { water: rx },
  rx2: { water: [...rx, RX_REST] },
  rx1W: { water: [...rx, LAKEW] },
};
