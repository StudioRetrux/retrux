// Orb variants (QC round 4 orb lens 6.5): idle cap too dim / lavender (ref mint, 62 % clipped); hold = a featureless
// clipped bulb (ref keeps grey-teal plasma structure); rim a dull grey shell.
const FILL = "col += vec3(0.82, 0.93, 1.0) * 0.35 * uGain * (1.0 - smoothstep(0.7, 0.98, bImp)) * (1.0 - fIn);";
const CLAMP = "float peak = max(max(col.r, col.g), col.b);\n  if (peak > uMaxRadiance) col *= uMaxRadiance / peak;";
const patch = (pairs) => `const m = h.orb.material; m.dispose(); let s = window.__orbOrig;
${pairs.map(([a, b]) => `s = s.split(${JSON.stringify(a)}).join(${JSON.stringify(b)});`).join("\n")}
m.fragmentShader = s; m.needsUpdate = true;`;
const mint = [FILL, "col += vec3(0.84, 1.0, 0.95) * 0.5 * uGain * (1.0 - smoothstep(0.7, 0.98, bImp)) * (1.0 - fIn);"];
const shoulder = [CLAMP, `float peak = max(max(col.r, col.g), col.b);
  // Soft shoulder above 3: the plasma's bright tongues keep their structure instead of clipping into a flat bulb.
  float pk2 = peak < 3.0 ? peak : 3.0 + (uMaxRadiance - 3.0) * (1.0 - exp(-(peak - 3.0) / (uMaxRadiance - 3.0)));
  col *= pk2 / max(peak, 1e-4);`];
export default {
  mint: { js: patch([mint]) },
  shoulder: { js: patch([shoulder]) },
  mintShoulder: { js: patch([mint, shoulder]) },
  mintShoulderHi: { js: patch([mint, shoulder]) + "\nh.orb.intensity = window.__orbInt * 1.3;" },
};
