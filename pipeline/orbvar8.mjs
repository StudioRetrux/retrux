// Round-8 T13 (orb interior): a hotter mint core at rest and at the eye (q00 clipped 28 vs F000 900, mint 83 vs 591; q03
// 1308 / 159 vs 2453 / 1143), and a less lavender halo. Targets: q03 clipped ~2000-2500 with the core median ~240-249; q00
// clipped ~600-900, mint ~400-600.
// o8a: hot core x4 -> x4.6 within bImp 0.6 (was 0.55); smoke modulation 0.85 -> 0.7 (the gaps drop to 30 %, not 15 %).
// o8b: o8a + the lilac band (0.78, 0.74, 1.0) -> (0.72, 0.80, 1.0).
// o8c: o8b with the mint fill a touch stronger (x1.1 -> x1.3).
const HOT = "col += vec3(0.85, 1.0, 0.97) * 4.0 * uGain * pow(1.0 - smoothstep(0.0, 0.55, bImp), 2.0) * smokeK * (1.0 - fIn);";
const HOT_N = "col += vec3(0.85, 1.0, 0.97) * 4.6 * uGain * pow(1.0 - smoothstep(0.0, 0.6, bImp), 2.0) * smokeK * (1.0 - fIn);";
const SMOKE = "float smokeK = mix(1.0, smoothstep(0.5, 4.0, emL), 0.85);";
const SMOKE_N = "float smokeK = mix(1.0, smoothstep(0.5, 4.0, emL), 0.7);";
const LILAC = "col += vec3(0.78, 0.74, 1.0) * 0.12 * uGain";
const LILAC_N = "col += vec3(0.72, 0.80, 1.0) * 0.12 * uGain";
const FILL = "* 1.1 * uGain * coreK * smokeK * (1.0 - fIn);";
const FILL_N = "* 1.3 * uGain * coreK * smokeK * (1.0 - fIn);";
const patch = (pairs) => `const m = h.orb.material; let s = window.__orbOrig || m.fragmentShader; window.__orbOrig = s;
for (const [a, b] of ${JSON.stringify(pairs)}) { if (!s.includes(a)) throw new Error("orb missing " + a.slice(0, 60)); s = s.split(a).join(b); }
if (m.fragmentShader !== s) { m.dispose(); m.fragmentShader = s; m.needsUpdate = true; }`;
export default {
  o8a: { js: patch([[HOT, HOT_N], [SMOKE, SMOKE_N]]) },
  o8b: { js: patch([[HOT, HOT_N], [SMOKE, SMOKE_N], [LILAC, LILAC_N]]) },
  o8c: { js: patch([[HOT, HOT_N], [SMOKE, SMOKE_N], [LILAC, LILAC_N], [FILL, FILL_N]]) },
  // Last at every pose: the build's orb shader back for the next pose's "none".
  zbase: { js: `const m = h.orb.material; if (window.__orbOrig && m.fragmentShader !== window.__orbOrig) { m.dispose(); m.fragmentShader = window.__orbOrig; m.needsUpdate = true; }` },
};
