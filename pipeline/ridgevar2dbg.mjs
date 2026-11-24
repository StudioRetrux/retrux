export default {
  dbg: { js: `const u = h.env.plateMaterial.uniforms.uPlate.value; window.__origPlate = window.__origPlate || u.image;
const img = new Image();
img.onload = () => { u.image = img; u.needsUpdate = true; console.error("v5 loaded " + img.naturalWidth + "x" + img.naturalHeight + " ver " + u.version); };
img.onerror = (e) => console.error("v5 load error");
img.src = "/dist/test_plate_probe_v5.webp";
console.error("v5 swap start, current image " + (u.image && (u.image.src || u.image.width)));` },
};
