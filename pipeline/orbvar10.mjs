// Round-10 Awwwards #2 / orb judge: the hold orb is "a flat, blown-out white disc / matte pearl". Measured (orbstruct.py,
// disc within 0.85 r): p05 luma p5/25/50/95 210/219/225/254, clip 6.7 %, high-pass sd 2.9, dark 1.9 % vs F402
// 169/202/218/255, clip 13.1 %, sd 5.2, dark 16.3 %: the reference has MORE clipped core and MORE dark structure. In the hold
// (uRim -> 1) the smoke floor rose to 0.7, the hot core grew to 0.8 r and an outer-zone fill was added: all flattening.
//  o1: smoke floor 0.47 in the hold too, deeper lanes (0.72 -> 0.55 at uRim 1), veins x1.0; hot core radius 0.8 -> 0.6;
//      outer zone x0.6 -> x0.35.
//  o2: o1 + the hold's limb 0.68 -> 0.5 and the plasma emission itself x1.25 in the hold (more structure under the glow).
const SMK = "  float smokeK = max(mix(1.0, 0.72, smoke) * mix(1.0, smoothstep(0.3, 3.0, emL), 0.35), mix(0.47, 0.7, uRim));";
const SMK_N = "  float smokeK = max(mix(1.0, mix(0.72, 0.55, uRim), smoke) * mix(1.0, smoothstep(0.3, 3.0, emL), 0.35), 0.47);";
const CORE = "pow(1.0 - smoothstep(0.0, mix(0.6, 0.8, uRim), bImp), 2.0)";
const CORE_N = "pow(1.0 - smoothstep(0.0, 0.6, bImp), 2.0)";
const VEIN = "  col *= mix(vec3(1.0), vec3(0.5, 0.64, 0.66), vein * 0.8);";
const VEIN_N = "  col *= mix(vec3(1.0), vec3(0.5, 0.64, 0.66), vein * mix(0.8, 1.0, uRim));";
const OUT = "  col += vec3(0.75, 1.0, 0.95) * 0.6 * uGain * smoothstep(0.55, 0.8, bImp)";
const OUT_N = "  col += vec3(0.75, 1.0, 0.95) * 0.35 * uGain * smoothstep(0.55, 0.8, bImp)";
const LIMB = "uGain * (0.28 + 0.4 * uRim) * smoothstep(0.5, 0.88, bImp)";
const LIMB_N = "uGain * (0.28 + 0.22 * uRim) * smoothstep(0.5, 0.88, bImp)";
const EM = "  vec3 col = clampSample(emit, limit);";
const EM_N = "  vec3 col = clampSample(emit * (1.0 + 0.25 * uRim), limit);";
const PATCH = (pairs) => `
  const P = ${JSON.stringify(pairs)};
  const m = h.orb.material;
  if (!m.userData.orig) m.userData.orig = m.fragmentShader;
  let s = m.userData.orig;
  for (const [a, b] of P) { if (!s.includes(a)) console.error("missing " + a.slice(0, 70)); s = s.replace(a, b); }
  m.fragmentShader = s;
  m.needsUpdate = true;
`;
const O1 = [[SMK, SMK_N], [CORE, CORE_N], [VEIN, VEIN_N], [OUT, OUT_N]];
export default {
  o1: { js: PATCH(O1) },
  o2: { js: PATCH([...O1, [LIMB, LIMB_N], [EM, EM_N]]) },
};
