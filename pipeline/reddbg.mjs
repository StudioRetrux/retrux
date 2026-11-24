export const reset = `const u = h.env.plateMaterial.uniforms.uPlate.value;
if (window.__origPlate && u.image !== window.__origPlate) { u.image = window.__origPlate; u.needsUpdate = true; }`;
export default {
  red: { js: `const u = h.env.plateMaterial.uniforms.uPlate.value; window.__origPlate = window.__origPlate || u.image;
const img = new Image(); img.onload = () => { u.image = img; u.needsUpdate = true; }; img.src = "/dist/test_red.webp";`,
    plate: [["col = mix(col, navy, ridge * mix(0.95, 1.0, moved));", "col = mix(col, navy, 0.0 * ridge * mix(0.95, 1.0, moved));"]] },
};
