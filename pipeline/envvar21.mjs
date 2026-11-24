// v4 environment shader pass: the v4 rest plate's far-shore band matches F000 (L152 vs 153) but the massif's lower
// slopes (box 150-450 x 340-385) read 142 vs 157, too clear: a soft blue haze over far slopes 2-15 m up, 100-330 m out.
// js swaps in the v4 rest plate (/dist/test_plate_rest_v4.webp) as envv4.mjs; reset restores the published one.
export const reset = `const u = h.env.plateMaterial.uniforms.uPlate.value;
if (window.__origPlate && u.image !== window.__origPlate) { u.image = window.__origPlate; u.needsUpdate = true; }`;
const V4 = `const u = h.env.plateMaterial.uniforms.uPlate.value; window.__origPlate = window.__origPlate || u.image;
const img = new Image(); img.onload = () => { u.image = img; u.needsUpdate = true; }; img.src = "/dist/test_plate_rest_v4.webp";`;
const FOG = "  float fog = smoothstep(uFog.x, uFog.y, d)";
const haze = (k) => [FOG, `  float slopeH = smoothstep(100.0, 160.0, d) * (1.0 - smoothstep(320.0, 335.0, d)) * smoothstep(1.5, 4.0, fp.y) * (1.0 - smoothstep(10.0, 22.0, fp.y)) * uPlateDepthOn;
  col = mix(col, uFogColor * vec3(0.9, 0.95, 1.02), slopeH * ${k.toFixed(2)});
${FOG}`];
export default {
  v4: { js: V4 },
  v4h15: { js: V4, plate: [haze(0.15)] },
  v4h25: { js: V4, plate: [haze(0.25)] },
  v4h35: { js: V4, plate: [haze(0.35)] },
};
