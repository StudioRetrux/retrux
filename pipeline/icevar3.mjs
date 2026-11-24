// Ice variants, batch 3: clamp the orb's HDR in the refraction copy (soft knee), so the mip blur does not
// flood the rings with its 16-32x core.
const BLIT = "void main() { gl_FragColor = texture2D(uSrc, vUv); }";
const knee = (M) => `const bm = h.pipeline.blitMaterial; bm.dispose();
bm.fragmentShader = window.__blitOrig.replace(${JSON.stringify(BLIT)}, "void main() { vec4 c = texture2D(uSrc, vUv); float m = max(max(c.r, c.g), c.b); const float K = 0.8; const float M = ${M.toFixed(2)}; if (m > K) c.rgb *= (K + (M - K) * (1.0 - exp(-(m - K) / (M - K)))) / m; gl_FragColor = c; }");
bm.needsUpdate = true;`;
const TINT = "tint = mix(vec3(dot(tint, vec3(0.2126, 0.7152, 0.0722))), tint, 0.55);";
export default {
  k15: { js: knee(1.5) },
  k25: { js: knee(2.5) },
  k4: { js: knee(4.0) },
  k25blue: { js: knee(2.5), frag: [[TINT, "tint = mix(vec3(dot(tint, vec3(0.2126, 0.7152, 0.0722))), tint, 0.85);"]] },
};
