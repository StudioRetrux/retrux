// Orb batch 5 (round 6 plan T07): a flat clipped disc -> plasma with grey-teal smoke veins, a mint top end (never pure
// white), a luminous cyan limb with a thin additive lilac band (instead of the grey rimTint multiply), rough cap
// reflections (no seams). o1 fill 3 + veins 0.6; o2 fill 2.2 + smokeK 0.6; o3 = o1 with veins 0.8.
const FILL = "col += mix(vec3(0.8, 1.0, 0.93), vec3(1.0), coreK * coreK * coreK) * 5.0 * uGain * coreK * smokeK * (1.0 - fIn);";
const SMOKEK = "float smokeK = mix(1.0, smoothstep(0.0, 6.0, emL), 0.4);";
const RIM = "col = mix(col, col * mix(vec3(1.0), rimTint, 0.35), rimG) + vec3(0.63, 0.71, 0.88) * rimG * 0.1 * uGain;";
const REFL = "vec3 refl = fIn > 1e-4 ? envRadiance(reflect(rd, N1), rough) * fIn : vec3(0.0);";
const fill = (k) => `col += mix(vec3(0.78, 1.0, 0.92), vec3(0.86, 1.0, 0.97), coreK * coreK * coreK) * ${k.toFixed(1)} * uGain * coreK * smokeK * (1.0 - fIn);
  float vein = (1.0 - smoothstep(0.0, 3.5, emL)) * smoothstep(0.15, 0.55, coreK);`;
const rim = (depth) => `col *= mix(vec3(1.0), vec3(0.5, 0.64, 0.66), vein * ${depth.toFixed(2)});
  // Luminous cyan limb and a thin additive lilac band at the glass edge.
  col += vec3(0.62, 0.86, 1.0) * uGain * 0.28 * smoothstep(0.5, 0.88, bImp) * (1.0 - smoothstep(0.965, 1.0, bImp)) * (1.0 - fIn);
  col += vec3(0.78, 0.74, 1.0) * 0.12 * uGain * smoothstep(0.955, 0.972, bImp) * (1.0 - smoothstep(0.975, 0.99, bImp));`;
const patch = (pairs) => `const m = h.orb.material; let s = m.fragmentShader;
for (const [a, b] of ${JSON.stringify(pairs)}) { if (!s.includes(a)) throw new Error("orb missing " + a.slice(0, 60)); s = s.split(a).join(b); }
m.dispose(); m.fragmentShader = s; m.needsUpdate = true;`;
const base = (k, depth, smoke) => [
  [FILL, fill(k)],
  [RIM, rim(depth)],
  [REFL, "vec3 refl = fIn > 1e-4 ? envRadiance(reflect(rd, N1), max(rough, 0.18)) * fIn : vec3(0.0);"],
  ...(smoke ? [[SMOKEK, `float smokeK = mix(1.0, smoothstep(0.0, 6.0, emL), ${smoke.toFixed(2)});`]] : []),
];
export default {
  o1: { js: patch(base(3.0, 0.6, 0)) },
  o2: { js: patch(base(2.2, 0.6, 0.6)) },
  o3: { js: patch(base(3.0, 0.8, 0)) },
};
