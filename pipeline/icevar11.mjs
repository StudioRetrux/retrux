// Ice batch 11 (round 5 ice judge): the value-vs-path mapping is inverted. Face-on ice is ~40 L too dark (q00 ring
// top 152 vs 192) because the interface tint pow(iceColor, 1.5) = (0.54, 0.70, 1.0) times Beer-Lambert passes ~57 %
// of the background luma; edge-on ice is pale and neutral (q03 184,195,208 vs 140,168,204). Make the interfaces
// nearly clear and put the colour into the path length (saturated blue only where the path is long), with less
// blur / muting on the transmitted image.
const TINT = "vec3 tint = pow(uIceColor, vec3(1.5)) * T;";
const LOD = "float lod = mix(1.3, 3.4, rough);";
const MUTE = "trans = mix(vec3(tl), trans, 0.75);";
const tint = (k) => [[TINT, `vec3 tint = mix(vec3(1.0), pow(uIceColor, vec3(1.5)), ${k.toFixed(2)}) * T;`]];
export default {
  clear35: { frag: tint(0.35), uniforms: { uAbsorb: [0.59, 0.28, 0.053] } },
  clear35b: { frag: [...tint(0.35), [LOD, "float lod = mix(0.9, 2.8, rough);"], [MUTE, "trans = mix(vec3(tl), trans, 0.88);"]], uniforms: { uAbsorb: [0.59, 0.28, 0.053] } },
  clear35s: { frag: [...tint(0.35), [LOD, "float lod = mix(0.9, 2.8, rough);"], [MUTE, "trans = mix(vec3(tl), trans, 0.88);"]], uniforms: { uAbsorb: [0.59, 0.28, 0.053], uScatter: 0.12 } },
  clear50: { frag: [...tint(0.5), [LOD, "float lod = mix(0.9, 2.8, rough);"], [MUTE, "trans = mix(vec3(tl), trans, 0.88);"]], uniforms: { uAbsorb: [0.75, 0.36, 0.07] } },
};
