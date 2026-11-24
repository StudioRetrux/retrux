// Ice variants, batch 5 (on top of the k15t base: copy knee 1.5 + orb light through x0.6): frosted, not chrome.
const BLIT = "void main() { gl_FragColor = texture2D(uSrc, vUv); }";
const knee = (M) => `const bm = h.pipeline.blitMaterial; bm.dispose();
bm.fragmentShader = window.__blitOrig.replace(${JSON.stringify(BLIT)}, "void main() { vec4 c = texture2D(uSrc, vUv); float m = max(max(c.r, c.g), c.b); const float K = 0.8; const float M = ${M.toFixed(2)}; if (m > K) c.rgb *= (K + (M - K) * (1.0 - exp(-(m - K) / (M - K)))) / m; gl_FragColor = c; }");
bm.needsUpdate = true;`;
const THRU = "col += vec3(0.72, 0.94, 1.0) * uOrbGlow * 0.25 * exp(";
const BASE = [[THRU, "col += vec3(0.72, 0.94, 1.0) * uOrbGlow * 0.6 * exp("]];
const REFL = "vec3 refl = envRadiance(R, mix(0.08, 0.5, frost));";
const RSPEC = "float rSpec = sqrt(pow(mix(0.22, 0.35, frost), 2.0) + 0.35 * nVar);";
const TIRMIX = "body = mix(body, vec3(0.065, 0.16, 0.39) * (0.5 + 0.5 * irr.b), max(band * 0.25, tir * 0.55));";
const TIRREFL = "refl = mix(refl, vec3(0.43, 0.55, 0.71) * dot(irr, vec3(0.2126, 0.7152, 0.0722)), tir * 0.5 * (1.0 - edgeMask));";
const NR = "vec3 Nr = normalize(mix(Ng, Nf, 0.55) + (N - Nf) * 0.12);";
const LOD = "float lod = mix(1.3, 3.8, rough);";
const rough = [
  [REFL, "vec3 refl = envRadiance(R, mix(0.3, 0.7, frost));"],
  [RSPEC, "float rSpec = sqrt(pow(mix(0.34, 0.5, frost), 2.0) + 0.35 * nVar);"],
];
const noTir = [
  [TIRMIX, "body = mix(body, vec3(0.065, 0.16, 0.39) * (0.5 + 0.5 * irr.b), max(band * 0.25, tir * 0.15));"],
  [TIRREFL, "refl = mix(refl, vec3(0.43, 0.55, 0.71) * dot(irr, vec3(0.2126, 0.7152, 0.0722)), tir * 0.15 * (1.0 - edgeMask));"],
];
const mottle = [
  [NR, "vec3 Nr = normalize(mix(Ng, Nf, 0.55) + (N - Nf) * 0.5);"],
  [LOD, "float lod = mix(1.6, 3.8, rough);"],
];
export default {
  base: { js: knee(1.5), frag: [...BASE] },
  rough: { js: knee(1.5), frag: [...BASE, ...rough] },
  roughNoTir: { js: knee(1.5), frag: [...BASE, ...rough, ...noTir] },
  frosted: { js: knee(1.5), frag: [...BASE, ...rough, ...noTir, ...mottle] },
};
