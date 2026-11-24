// Grade batch 1 (round 6 plan T19): a gentle mid pull, cool highlights / slate shadows, fine grain. Patched into
// h.post.grade (PostChain GRADE_FRAG); restored before every variant.
export const reset = `const gm = h.post.grade;
if (!window.__gradeOrig) window.__gradeOrig = gm.fragmentShader;
if (gm.fragmentShader !== window.__gradeOrig) { gm.dispose(); gm.fragmentShader = window.__gradeOrig; gm.needsUpdate = true; }`;
const SAT = "col = max(mix(vec3(l), col, uSaturation), 0.0);";
const GRAIN = "srgb += g * uGrain * (1.0 - 0.6 * luma(srgb));";
const patch = (pairs) => `const gm = h.post.grade; let s = window.__gradeOrig || gm.fragmentShader;
for (const [a, b] of ${JSON.stringify(pairs)}) { if (!s.includes(a)) throw new Error("grade missing " + a.slice(0, 60)); s = s.split(a).join(b); }
gm.dispose(); gm.fragmentShader = s; gm.needsUpdate = true;`;
const tone = (pull) => [SAT, `${SAT}
  float lm = luma(col);
  col *= 1.0 - ${pull.toFixed(3)} * smoothstep(0.25, 0.6, lm) * (1.0 - smoothstep(0.75, 0.92, lm));
  col = mix(col, col * vec3(0.985, 1.0, 1.035), smoothstep(0.7, 0.9, lm));
  col = mix(col, mix(vec3(lm), col, 0.85) * vec3(0.97, 1.0, 1.04), 1.0 - smoothstep(0.08, 0.25, lm));`];
const grain = (k) => [GRAIN, `srgb += g * ${k.toFixed(3)} * (1.0 - 0.6 * luma(srgb));`];
export default {
  t3: { js: patch([tone(0.03)]) },
  t5: { js: patch([tone(0.05)]) },
  t3g: { js: patch([tone(0.03), grain(0.012)]) },
};
