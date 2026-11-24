// Round-9 plan T07 (orb interior). o9a: (1) a soft smoke field (fbm at the chord midpoint, drifting with uW) instead of
// gating the glow by the plasma's thin emission sheets (hard "paper" edges, 15 % lanes); (2) hot core x4.0 -> x2.6, radius
// 0.55 -> 0.6; (3) limb (0.62, 0.86, 1.0) -> (0.70, 1.0, 0.94) (B > G read blue-white); (4) the lilac hairline -> a mild
// shell band. o9b: o9a + hold: core radius 0.6 -> 0.8 and smoke floor 0.47 -> 0.7 with uRim.
const SMOKE = "  float smokeK = mix(1.0, smoothstep(0.5, 4.0, emL), 0.85);";
const SMOKE_N = `  vec3 pMid = o + d * (s0 + w);
  float smoke = smoothstep(0.35, 0.75, 0.5 + 0.5 * fbm(pMid * 3.0 + vec3(0.0, 0.0, uW * 0.6), 3));
  float smokeK = mix(1.0, 0.72, smoke) * mix(1.0, smoothstep(0.3, 3.0, emL), 0.35);`;
const SMOKE_H = `  vec3 pMid = o + d * (s0 + w);
  float smoke = smoothstep(0.35, 0.75, 0.5 + 0.5 * fbm(pMid * 3.0 + vec3(0.0, 0.0, uW * 0.6), 3));
  float smokeK = max(mix(1.0, 0.72, smoke) * mix(1.0, smoothstep(0.3, 3.0, emL), 0.35), mix(0.47, 0.7, uRim));`;
const HOT = "  col += vec3(0.85, 1.0, 0.97) * 4.0 * uGain * pow(1.0 - smoothstep(0.0, 0.55, bImp), 2.0) * smokeK * (1.0 - fIn);";
const HOT_N = "  col += vec3(0.85, 1.0, 0.97) * 2.6 * uGain * pow(1.0 - smoothstep(0.0, 0.6, bImp), 2.0) * smokeK * (1.0 - fIn);";
const HOT_H = "  col += vec3(0.85, 1.0, 0.97) * 2.6 * uGain * pow(1.0 - smoothstep(0.0, mix(0.6, 0.8, uRim), bImp), 2.0) * smokeK * (1.0 - fIn);";
const LIMB = "  col += vec3(0.62, 0.86, 1.0) * uGain * (0.28 + 0.4 * uRim)";
const LIMB_N = "  col += vec3(0.70, 1.0, 0.94) * uGain * (0.28 + 0.4 * uRim)";
const LILAC = "  col += vec3(0.78, 0.74, 1.0) * 0.12 * uGain * smoothstep(0.955, 0.972, bImp) * (1.0 - smoothstep(0.975, 0.99, bImp));";
const LILAC_N = "  col *= mix(vec3(1.0), vec3(0.84, 0.87, 1.0), 0.35 * smoothstep(0.88, 0.97, bImp));";
const patch = (pairs) => `const m = h.orb.material; let s = window.__orbOrig || m.fragmentShader; window.__orbOrig = s;
for (const [a, b] of ${JSON.stringify(pairs)}) { if (!s.includes(a)) throw new Error("orb missing " + a.slice(0, 60)); s = s.split(a).join(b); }
if (m.fragmentShader !== s) { m.dispose(); m.fragmentShader = s; m.needsUpdate = true; }`;
export default {
  o9a: { js: patch([[SMOKE, SMOKE_N], [HOT, HOT_N], [LIMB, LIMB_N], [LILAC, LILAC_N]]) },
  o9b: { js: patch([[SMOKE, SMOKE_H], [HOT, HOT_H], [LIMB, LIMB_N], [LILAC, LILAC_N]]) },
  zbase: { js: `const m = h.orb.material; if (window.__orbOrig && m.fragmentShader !== window.__orbOrig) { m.dispose(); m.fragmentShader = window.__orbOrig; m.needsUpdate = true; }` },
};
