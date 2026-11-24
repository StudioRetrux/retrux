// Ice batch 30 (round 6): F000's dark steel-blue bars sit where band A's front face turns into its sides (the smooth
// geometric view angle crossing ~0.25-0.4), and its edges; ours are light there (grazing Fresnel sky). A crisp bar on the
// geometric NdotV, on thick ice, with the reflection suppressed inside it.
import B from "./icevar28.mjs";
const COL = "vec3 col = body * (1.0 - F * 0.7) + refl * F * 0.7 + spec * 0.7;";
const bar = (a, b, c, d, k) => [COL, `float ndvG = saturate(dot(Ng, V));
  float tirBar = smoothstep(${a.toFixed(2)}, ${b.toFixed(2)}, ndvG) * (1.0 - smoothstep(${c.toFixed(2)}, ${d.toFixed(2)}, ndvG)) * thick;
  body = mix(body, vec3(0.2, 0.33, 0.54) * (0.55 + 0.45 * irr.b), tirBar * ${k.toFixed(2)});
  vec3 col = body * (1.0 - F * 0.7 * (1.0 - tirBar)) + refl * F * 0.7 * (1.0 - tirBar) + spec * 0.7;`];
export default {
  g40: B.g40,
  bar1: { frag: [...B.g40.frag, bar(0.18, 0.24, 0.34, 0.42, 0.75)] },
  bar2: { frag: [...B.g40.frag, bar(0.22, 0.27, 0.3, 0.36, 0.85)] },
};
