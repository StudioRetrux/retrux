// Ice variants, batch 4: copy knee (no orb flood) + the orb's own light through the ice in front of it,
// structured by the ice (facet cells, cracks), + a bluer tint.
const BLIT = "void main() { gl_FragColor = texture2D(uSrc, vUv); }";
const knee = (M) => `const bm = h.pipeline.blitMaterial; bm.dispose();
bm.fragmentShader = window.__blitOrig.replace(${JSON.stringify(BLIT)}, "void main() { vec4 c = texture2D(uSrc, vUv); float m = max(max(c.r, c.g), c.b); const float K = 0.8; const float M = ${M.toFixed(2)}; if (m > K) c.rgb *= (K + (M - K) * (1.0 - exp(-(m - K) / (M - K)))) / m; gl_FragColor = c; }");
bm.needsUpdate = true;`;
const TINT = "tint = mix(vec3(dot(tint, vec3(0.2126, 0.7152, 0.0722))), tint, 0.55);";
const THRU = "col += vec3(0.72, 0.94, 1.0) * uOrbGlow * 0.25 * exp(-pow(dRay / (0.8 * 0.8255), 2.0)) * (1.0 - F) * mix(0.6, 1.0, 1.0 - thick);";
const thru = (k, structured) => structured
  ? `col += vec3(0.72, 0.94, 1.0) * uOrbGlow * ${k.toFixed(2)} * exp(-pow(dRay / (0.85 * 0.8255), 2.0)) * (1.0 - F) * mix(0.6, 1.0, 1.0 - thick) * (0.45 + 1.1 * smoothstep(0.15, 0.85, cellRand)) * (1.0 - 0.7 * crackAcc) * (0.75 + 0.5 * edgeMask);`
  : `col += vec3(0.72, 0.94, 1.0) * uOrbGlow * ${k.toFixed(2)} * exp(-pow(dRay / (0.8 * 0.8255), 2.0)) * (1.0 - F) * mix(0.6, 1.0, 1.0 - thick);`;
export default {
  k15t: { js: knee(1.5), frag: [[THRU, thru(0.6, false)]] },
  k15ts: { js: knee(1.5), frag: [[THRU, thru(0.6, true)]] },
  k2tsb: { js: knee(2.0), frag: [[THRU, thru(0.5, true)], [TINT, TINT.replace("0.55);", "0.8);")]] },
  k15tsb: { js: knee(1.5), frag: [[THRU, thru(0.6, true)], [TINT, TINT.replace("0.55);", "0.85);")]] },
};
