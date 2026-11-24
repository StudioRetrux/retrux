// Ice variants, batch 1: what makes the hold read as plastic tubes instead of frosted, chiselled ice?
const NR = "vec3 Nr = normalize(mix(Ng, Nf, 0.55) + (N - Nf) * 0.12);";
const LOD = "float lod = mix(1.3, 3.8, rough);";
export default {
  // Frosted-glass mottling: the fine bump bends the refraction (Cycles' rough transmission through a bumpy
  // surface), and the refraction blur drops so the mottled distortion shows.
  mottle: {
    frag: [
      [NR, "vec3 Nr = normalize(mix(Ng, Nf, 0.55) + (N - Nf) * 0.6);"],
      [LOD, "float lod = mix(0.8, 2.6, rough);"],
    ],
  },
  // Stronger facets: bigger plateau tilt (0.2 -> 0.45) and the facet normal fully in the refraction.
  facets: {
    frag: [
      ["vec3 tilt = (t * rnd.x + b * rnd.y) * 0.2;", "vec3 tilt = (t * rnd.x + b * rnd.y) * 0.45;"],
      [NR, "vec3 Nr = normalize(Nf + (N - Nf) * 0.12);"],
    ],
  },
  // Less milk: half the scatter and a lower frost bias.
  clear: {
    uniforms: { uScatter: 0.15, uFrost: { per: [0.62, 0.62, 0.62, 0.62, 0.6, 0.6, 0.56, 0.52] } },
  },
  // All three together.
  combo: {
    frag: [
      ["vec3 tilt = (t * rnd.x + b * rnd.y) * 0.2;", "vec3 tilt = (t * rnd.x + b * rnd.y) * 0.4;"],
      [NR, "vec3 Nr = normalize(mix(Ng, Nf, 0.8) + (N - Nf) * 0.6);"],
      [LOD, "float lod = mix(0.8, 2.6, rough);"],
    ],
    uniforms: { uScatter: 0.18 },
  },
};
