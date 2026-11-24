// Orb (round 5 orb judge): 0 clipped px vs 900-7700 in the reference; a flat pearl (no smoke structure); lavender
// fringe instead of mint-cyan. Variants patch the orb shader through probe_icevar's js hook (restored per variant).
const FILL = "col += vec3(0.84, 1.0, 0.95) * 0.5 * uGain * (1.0 - smoothstep(0.7, 0.98, bImp)) * (1.0 - fIn);";
const PK = "float pk2 = peak < 3.0 ? peak : 3.0 + (uMaxRadiance - 3.0) * (1.0 - exp(-(peak - 3.0) / (uMaxRadiance - 3.0)));";
const patch = (pairs) => `const m = h.orb.material; let s = m.fragmentShader;
for (const [a, b] of ${JSON.stringify(pairs)}) { if (!s.includes(a)) throw new Error("orb missing " + a.slice(0, 60)); s = s.split(a).join(b); }
m.dispose(); m.fragmentShader = s; m.needsUpdate = true;`;
// Hotter centre (radial), the fill modulated by the plasma's own emission so the gaps between the sheets read as
// darker smoke; mint-cyan mid radius.
const FILL_HOT = (k, smoke) => `float coreK = pow(1.0 - smoothstep(0.0, 0.97, bImp), 0.6);
  float emL = dot(emit, vec3(0.2126, 0.7152, 0.0722)) / max(uGain, 1e-3);
  float smokeK = mix(1.0, smoothstep(0.0, 6.0, emL), ${smoke.toFixed(2)});
  col += mix(vec3(0.82, 1.0, 0.96), vec3(1.0), coreK * coreK) * ${k.toFixed(2)} * uGain * coreK * smokeK * (1.0 - fIn);`;
const PK6 = "float pk2 = peak < 6.0 ? peak : 6.0 + (uMaxRadiance - 6.0) * (1.0 - exp(-(peak - 6.0) / max(uMaxRadiance - 6.0, 1e-3)));";
export default {
  hot1: { js: patch([[FILL, FILL_HOT(1.4, 0.0)], [PK, PK6]]) },
  hot1s: { js: patch([[FILL, FILL_HOT(1.6, 0.35)], [PK, PK6]]) },
  hot2s: { js: patch([[FILL, FILL_HOT(2.4, 0.4)], [PK, PK6]]) },
};
