// v5 probe: the rest plate with the dark slate-navy ridge material (25 %, 16 spp) swapped in, the shader's navy overlay
// on vs off. Ridge box x10-70 y300-330: F000 31,51,82; ridge overall x0-115 y300-420: ~52,78,111.
export const reset = `const u = h.env.plateMaterial.uniforms.uPlate.value;
if (window.__origPlate && u.image !== window.__origPlate) { u.image = window.__origPlate; u.needsUpdate = true; }`;
const V5 = `const u = h.env.plateMaterial.uniforms.uPlate.value; window.__origPlate = window.__origPlate || u.image;
const img = new Image(); img.onload = () => { u.image = img; u.needsUpdate = true; }; img.src = "/dist/test_plate_probe_v5.webp";`;
const OFF = ["col = mix(col, navy, ridge * mix(0.95, 1.0, moved));", "col = mix(col, navy, 0.0 * ridge * mix(0.95, 1.0, moved));"];
export default {
  v5: { js: V5 },
  v5off: { js: V5, plate: [OFF] },
  off: { plate: [OFF] },
};
