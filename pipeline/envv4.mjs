// v4 rest plate (lower / dimmer / bluer baked base mist) swapped in at runtime vs the published v2 plate, with the
// mountain-base de-haze (baseK, tuned for v2's white band) at full / half / off.
export const reset = `const u = h.env.plateMaterial.uniforms.uPlate.value;
if (window.__origPlate && u.image !== window.__origPlate) { u.image = window.__origPlate; u.needsUpdate = true; }`;
const V4 = `const u = h.env.plateMaterial.uniforms.uPlate.value; window.__origPlate = window.__origPlate || u.image;
const img = new Image(); img.onload = () => { u.image = img; u.needsUpdate = true; }; img.src = "/dist/test_plate_rest_v4.webp";`;
const BASE = "baseK *= (1.0 - smoothstep(0.3, 0.4, restFrame(uv0).x))";
export default {
  v4: { js: V4 },
  v4half: { js: V4, plate: [[BASE, "baseK *= 0.5 * (1.0 - smoothstep(0.3, 0.4, restFrame(uv0).x))"]] },
  v4off: { js: V4, plate: [[BASE, "baseK *= 0.0 * (1.0 - smoothstep(0.3, 0.4, restFrame(uv0).x))"]] },
};
