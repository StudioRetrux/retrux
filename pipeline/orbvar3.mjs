// Orb batch 3: orbvar2's hot2s (k 2.4) clipped 656 px at p05 vs the reference's 7320 (23 % of the disc) and the median
// luma sits 15-20 levels low; mint pixels 49 vs 1958. Stronger hot core, mint mid radius.
const FILL = "col += vec3(0.84, 1.0, 0.95) * 0.5 * uGain * (1.0 - smoothstep(0.7, 0.98, bImp)) * (1.0 - fIn);";
const PK = "float pk2 = peak < 3.0 ? peak : 3.0 + (uMaxRadiance - 3.0) * (1.0 - exp(-(peak - 3.0) / (uMaxRadiance - 3.0)));";
const patch = (pairs) => `const m = h.orb.material; let s = m.fragmentShader;
for (const [a, b] of ${JSON.stringify(pairs)}) { if (!s.includes(a)) throw new Error("orb missing " + a.slice(0, 60)); s = s.split(a).join(b); }
m.dispose(); m.fragmentShader = s; m.needsUpdate = true;`;
const FILL_HOT = (k, smoke, mid) => `float coreK = pow(1.0 - smoothstep(0.0, 0.97, bImp), 0.6);
  float emL = dot(emit, vec3(0.2126, 0.7152, 0.0722)) / max(uGain, 1e-3);
  float smokeK = mix(1.0, smoothstep(0.0, 6.0, emL), ${smoke.toFixed(2)});
  col += mix(vec3(${mid}), vec3(1.0), coreK * coreK * coreK) * ${k.toFixed(2)} * uGain * coreK * smokeK * (1.0 - fIn);`;
const PK6 = "float pk2 = peak < 6.0 ? peak : 6.0 + (uMaxRadiance - 6.0) * (1.0 - exp(-(peak - 6.0) / max(uMaxRadiance - 6.0, 1e-3)));";
export default {
  k35: { js: patch([[FILL, FILL_HOT(3.5, 0.4, "0.80, 1.0, 0.93")], [PK, PK6]]) },
  k5: { js: patch([[FILL, FILL_HOT(5.0, 0.4, "0.80, 1.0, 0.93")], [PK, PK6]]) },
  k5m: { js: patch([[FILL, FILL_HOT(5.0, 0.4, "0.72, 1.0, 0.88")], [PK, PK6]]) },
};
