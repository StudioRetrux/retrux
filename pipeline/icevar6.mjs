// Ice variants, batch 6 (on top of batch 5 "frosted"): the chrome tube look is the thick-lens refraction of a
// smooth section (a cylinder lens: dark-to-bright gradients across every ring); the reference is frosted.
import B5 from "./icevar5.mjs";
const F = B5.frosted;
const LENSU = (k) => ({ uLens: k });
const LOD2 = "float lod = mix(1.6, 3.8, rough);";
export default {
  lens15: { js: F.js, frag: F.frag, uniforms: LENSU(0.15) },
  lens15blur: { js: F.js, frag: [...F.frag.filter(([a]) => a !== "float lod = mix(1.3, 3.8, rough);"), ["float lod = mix(1.3, 3.8, rough);", "float lod = mix(2.4, 4.6, rough);"]], uniforms: LENSU(0.15) },
  lens08blur: { js: F.js, frag: [...F.frag.filter(([a]) => a !== "float lod = mix(1.3, 3.8, rough);"), ["float lod = mix(1.3, 3.8, rough);", "float lod = mix(2.4, 4.6, rough);"]], uniforms: LENSU(0.08) },
  lens25blur: { js: F.js, frag: [...F.frag.filter(([a]) => a !== "float lod = mix(1.3, 3.8, rough);"), ["float lod = mix(1.3, 3.8, rough);", "float lod = mix(2.0, 4.4, rough);"]], uniforms: LENSU(0.25) },
};
void LOD2;
