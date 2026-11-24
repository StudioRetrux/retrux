// Round 8 T14 / round-9 orb judge: "shards show flat paper-white facets and lack deep cobalt darks; the palette is
// compressed into light periwinkle" (dark facets should reach ~45-60, 100-110, 190-200; light ~130, 160, 235).
// s1: the facet reflection capped at 40 % (grazing facets went paper-white), the frosted crystals less white (0.62 -> 0.35,
//     bluer), the dark facets deeper (x0.62 -> x0.45 floor). s2: s1 with the frosted crystals off (0.62 -> 0.15).
// Applied to the shard material through js (probe_envvar), restored by zbase.
const REFL = "  vec3 col = body * (1.0 - F) + refl * F + uSunColor * glint;";
const REFL_N = "  float Fc = min(F, 0.4);\n  vec3 col = body * (1.0 - Fc) + refl * Fc + uSunColor * glint;";
const FROST = "  body = mix(body, irr * vec3(0.86, 0.88, 1.0) * 0.95 + T * 0.08, frosty * 0.62);";
const FROST_N = (k) => `  body = mix(body, irr * vec3(0.78, 0.84, 1.0) * 0.85 + T * 0.1, frosty * ${k});`;
const FACET = "  body *= mix(0.62, 1.12, fh.z);";
const FACET_N = "  body *= mix(0.45, 1.12, fh.z);";
const patch = (pairs) => `const m = h.shards.material; let s = window.__shardOrig || m.fragmentShader; window.__shardOrig = s;
for (const [a, b] of ${JSON.stringify(pairs)}) { if (!s.includes(a)) throw new Error("shard missing " + a.slice(0, 60)); s = s.split(a).join(b); }
if (m.fragmentShader !== s) { m.dispose(); m.fragmentShader = s; m.needsUpdate = true; }`;
export default {
  s1: { js: patch([[REFL, REFL_N], [FROST, FROST_N("0.35")], [FACET, FACET_N]]) },
  s2: { js: patch([[REFL, REFL_N], [FROST, FROST_N("0.15")], [FACET, FACET_N]]) },
  zbase: { js: `const m = h.shards.material; if (window.__shardOrig && m.fragmentShader !== window.__shardOrig) { m.dispose(); m.fragmentShader = window.__shardOrig; m.needsUpdate = true; }` },
};
