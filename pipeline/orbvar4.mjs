// Orb batch 4 (round 6 orb judge 7.0: "a flat clipped white disc", the k5 hot core overshot; the reference: mint-cyan
// plasma with grey-teal smoke veins and a lilac rim, a clipped centre WITH structure). Less hot fill, and smoke veins as a
// grey-teal multiply where the plasma's own emission is low, applied after the fill so the clip cannot wash them out.
const FILLK = "* 5.0 * uGain * coreK * smokeK * (1.0 - fIn);";
const SMOKEK = "float smokeK = mix(1.0, smoothstep(0.0, 6.0, emL), 0.4);";
const RIM = "col = mix(col, col * mix(vec3(1.0), rimTint, 0.35), rimG) + vec3(0.63, 0.71, 0.88) * rimG * 0.1 * uGain;";
const patch = (pairs) => `const m = h.orb.material; let s = m.fragmentShader;
for (const [a, b] of ${JSON.stringify(pairs)}) { if (!s.includes(a)) throw new Error("orb missing " + a.slice(0, 60)); s = s.split(a).join(b); }
m.dispose(); m.fragmentShader = s; m.needsUpdate = true;`;
const veins = (k, depth) => [RIM, `${RIM}
  // Grey-teal smoke veins through the core (F402 / F045): darker where the plasma's emission is low.
  float vein = (1.0 - smoothstep(0.0, 3.5, emL)) * smoothstep(0.15, 0.55, coreK);
  col *= mix(vec3(1.0), vec3(0.5, 0.64, 0.66), vein * ${depth.toFixed(2)});`];
export default {
  k3v: { js: patch([[FILLK, "* 3.0 * uGain * coreK * smokeK * (1.0 - fIn);"], veins(3, 0.6)]) },
  k3v8: { js: patch([[FILLK, "* 3.0 * uGain * coreK * smokeK * (1.0 - fIn);"], veins(3, 0.8)]) },
  k2v: { js: patch([[FILLK, "* 2.2 * uGain * coreK * smokeK * (1.0 - fIn);"], [SMOKEK, "float smokeK = mix(1.0, smoothstep(0.0, 6.0, emL), 0.6);"], veins(2.2, 0.6)]) },
};
