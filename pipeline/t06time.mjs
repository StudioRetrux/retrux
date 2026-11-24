// T06 time sweep at the left spot. lakeR: lake tinted red. lakeW: lake sources (red = live mirror, green = plate
// weight, blue = extra-projector coverage). wx1: the ripple-bent lake lookup falls back to the straight one when ANY tap
// of a 2-texel cross is nearer, for the rest projector (plateDepthSolid) AND every extra projector (their non-full
// occlusion block has no DepthSolid, so the cross is inlined): at the orbit extremes an extra projector supplies the lake,
// so the rest-only check (lakevar1 w1) changed nothing there.
const LAKE_END = "  gl_FragColor = vec4(col, 1.0);\n}";
const KEYS = [["Hold", "hold"], ["OrbN", "orbN"], ["OrbP", "orbP"], ["Tilt", "tilt"]];
const wx = KEYS.map(([P, p]) => [
  `kq = mix(kq, kc, step(${p}DepthAt(kq), ${p}DepthAt(kc) * 0.92 - 0.3));`,
  `{ vec2 kt = u${P}DepthTexel * 2.0;
          float kmin = min(min(${p}DepthAt(kq), ${p}DepthAt(kq + vec2(kt.x, 0.0))), min(min(${p}DepthAt(kq - vec2(kt.x, 0.0)), ${p}DepthAt(kq + vec2(0.0, kt.y))), ${p}DepthAt(kq - vec2(0.0, kt.y))));
          kq = mix(kq, kc, step(kmin, ${p}DepthAt(kc) * 0.92 - 0.3)); }`,
]);
const W1 = ["quv = mix(quv, cuv, step(plateDepthAt(quv), plateDepthAt(cuv) * 0.92 - 0.3));", "quv = mix(quv, cuv, step(plateDepthSolid(quv), plateDepthAt(cuv) * 0.92 - 0.3));"];
export default {
  lakeR: { water: [[LAKE_END, "  gl_FragColor = vec4(col * vec3(1.0, 0.25, 0.25), 1.0);\n}"]] },
  lakeW: { water: [[LAKE_END, "  gl_FragColor = vec4(mix(col, vec3(1.0 - plateW, plateW, extraCover), 0.6), 1.0);\n}"]] },
  wx1: { water: [W1, ...wx] },
};
