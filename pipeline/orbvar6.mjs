// Orb batch 6: AgX bleaches the near-white mint fill to neutral white (mint px 6-74 vs the reference's 355-1958). More
// saturated mint at the core, and a dimmer fill so the hue survives the tone curve. On top of orbvar5 o2 (fill 2.2,
// smokeK 0.6, veins 0.6, cyan limb + lilac band, rough caps).
const FILL = "col += mix(vec3(0.8, 1.0, 0.93), vec3(1.0), coreK * coreK * coreK) * 5.0 * uGain * coreK * smokeK * (1.0 - fIn);";
const SMOKEK = "float smokeK = mix(1.0, smoothstep(0.0, 6.0, emL), 0.4);";
const RIM = "col = mix(col, col * mix(vec3(1.0), rimTint, 0.35), rimG) + vec3(0.63, 0.71, 0.88) * rimG * 0.1 * uGain;";
const REFL = "vec3 refl = fIn > 1e-4 ? envRadiance(reflect(rd, N1), rough) * fIn : vec3(0.0);";
const fill = (k, a, b) => `col += mix(vec3(${a}), vec3(${b}), coreK * coreK * coreK) * ${k.toFixed(1)} * uGain * coreK * smokeK * (1.0 - fIn);
  float vein = (1.0 - smoothstep(0.0, 3.5, emL)) * smoothstep(0.15, 0.55, coreK);`;
const rim = `col *= mix(vec3(1.0), vec3(0.5, 0.64, 0.66), vein * 0.6);
  col += vec3(0.62, 0.86, 1.0) * uGain * 0.28 * smoothstep(0.5, 0.88, bImp) * (1.0 - smoothstep(0.965, 1.0, bImp)) * (1.0 - fIn);
  col += vec3(0.78, 0.74, 1.0) * 0.12 * uGain * smoothstep(0.955, 0.972, bImp) * (1.0 - smoothstep(0.975, 0.99, bImp));`;
const patch = (pairs) => `const m = h.orb.material; let s = m.fragmentShader;
for (const [a, b] of ${JSON.stringify(pairs)}) { if (!s.includes(a)) throw new Error("orb missing " + a.slice(0, 60)); s = s.split(a).join(b); }
m.dispose(); m.fragmentShader = s; m.needsUpdate = true;`;
const v = (k, a, b) => ({ js: patch([
  [FILL, fill(k, a, b)],
  [RIM, rim],
  [REFL, "vec3 refl = fIn > 1e-4 ? envRadiance(reflect(rd, N1), max(rough, 0.18)) * fIn : vec3(0.0);"],
  [SMOKEK, "float smokeK = mix(1.0, smoothstep(0.0, 6.0, emL), 0.6);"],
]) });
export default {
  o2: v(2.2, "0.78, 1.0, 0.92", "0.86, 1.0, 0.97"),
  m1: v(2.2, "0.6, 1.0, 0.82", "0.75, 1.0, 0.9"),
  m2: v(2.2, "0.5, 1.0, 0.78", "0.66, 1.0, 0.86"),
  m3: v(1.6, "0.6, 1.0, 0.82", "0.75, 1.0, 0.9"),
};
