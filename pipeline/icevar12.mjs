// Ice batch 12 (T09, "glass"): the reference rings are clear ice (background visible and refracted, blue depth on the
// thick edges, white only on frost patches and edges); ours are milky white with a hammered look. Per-ring frost is
// 0.74-0.84 (most of the surface frosted), the transmitted image is blurred (lod 1.3-3.4) and muted, and the faceted
// refraction normal mosaics it. Less frost, less blur and muting, smoother refraction, absorption on the excess path.
const NR = "vec3 Nr = normalize(mix(Ng, Nf, 0.85) + (N - Nf) * 0.4);";
const LOD = "float lod = mix(1.3, 3.4, rough);";
const MUTE = "trans = mix(vec3(tl), trans, 0.75);";
const TINT = "vec3 tint = pow(uIceColor, vec3(1.5)) * T;";
const TABS = "vec3 T = exp(-uAbsorb * t);";
const base = [
  [LOD, "float lod = mix(0.6, 2.4, rough);"],
  [MUTE, "trans = mix(vec3(tl), trans, 0.9);"],
  [TINT, "vec3 tint = mix(vec3(1.0), pow(uIceColor, vec3(1.5)), 0.5) * T;"],
];
const smoothNr = [NR, "vec3 Nr = normalize(mix(Ng, Nf, 0.5) + (N - Nf) * 0.2);"];
const pathAbs = [TABS, "vec3 T = exp(-uAbsorb * max(t - 0.25, 0.0) * 2.2);"];
export default {
  g1: { frag: base, uniforms: { uFrost: 0.45 } },
  g2: { frag: [...base, smoothNr], uniforms: { uFrost: 0.45 } },
  g3: { frag: [...base, smoothNr], uniforms: { uFrost: 0.3 } },
  g4: { frag: [...base, smoothNr, pathAbs], uniforms: { uFrost: 0.4 } },
};
