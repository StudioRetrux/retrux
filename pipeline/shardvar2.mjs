// Round-10 orb / shards: "white or chalky facets (some whole shards read as white chips)". #56 capped the facet Fresnel at
// 0.4, but the reflection itself is the untinted sky, so sky-facing facets still read white. s2a: the reflection tinted by
// the crystal's own body colour (pale cobalt), max 0.35; s2b: s2a + frosted crystals 0.35 -> 0.15.
const REFL = "  float Fc = min(F, 0.4);\n  vec3 col = body * (1.0 - Fc) + refl * Fc + uSunColor * glint;";
const reflT = `  float Fc = min(F, 0.35);
  // Sky-facing facets read pale cobalt, never white (QC round 10).
  refl *= mix(vec3(1.0), normalize(tint + 1e-3) * 1.45, 0.55);
  vec3 col = body * (1.0 - Fc) + refl * Fc + uSunColor * glint;`;
const FROST = "  body = mix(body, irr * vec3(0.78, 0.84, 1.0) * 0.85 + T * 0.1, frosty * 0.35);";
const FROST_N = "  body = mix(body, irr * vec3(0.78, 0.84, 1.0) * 0.85 + T * 0.1, frosty * 0.15);";
const patch = (pairs) => `const m = h.shards.material; let s = window.__shardOrig || m.fragmentShader; window.__shardOrig = s;
for (const [a, b] of ${JSON.stringify(pairs)}) { if (!s.includes(a)) throw new Error("shard missing " + a.slice(0, 60)); s = s.split(a).join(b); }
if (m.fragmentShader !== s) { m.dispose(); m.fragmentShader = s; m.needsUpdate = true; }`;
export default {
  s2a: { js: patch([[REFL, reflT]]) },
  s2b: { js: patch([[REFL, reflT], [FROST, FROST_N]]) },
  zbase: { js: `const m = h.shards.material; if (window.__shardOrig && m.fragmentShader !== window.__shardOrig) { m.dispose(); m.fragmentShader = window.__shardOrig; m.needsUpdate = true; }` },
};
