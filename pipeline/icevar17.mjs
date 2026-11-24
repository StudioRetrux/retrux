// Ice diagnostics 3: on top of icevar16 v1 (no scatter, F x0.5, spec x0.6, lens 0.15, lod 0.3-1.4), remove each
// remaining layer to find what still whitens the rings vs the transmission alone (icevar15 t0lens15).
const COL = "vec3 col = body * (1.0 - F) + refl * F + spec;";
const LOD = "float lod = mix(1.3, 3.4, rough);";
const PROX = "col += vec3(0.9, 0.95, 1.0) * uOrbGlow * 0.15 * prox * mix(0.35, 1.0, 1.0 - thick) * (0.3 + 0.7 * facing) * (1.0 - F);";
const GLINT = "col += vec3(2.6, 2.8, 3.3) * 0.05 * uOrbGlow * ggxSpec(N, V, lO, rSpec + 0.04);";
const LANT = "col += vec3(0.72, 0.94, 1.0) * uOrbGlow * 1.05 * lantern * (1.0 - F) * mix(0.6, 1.0, 1.0 - thick);";
const ENERGY = "col += uFrostTint * irr * uEnergy * (0.04 + 0.2 * crackAcc);";
const BANDMIX = "body = mix(body, vec3(0.065, 0.16, 0.39) * (0.5 + 0.5 * irr.b), max(band * mix(0.25, 0.38, innerW), tir * mix(0.15, 0.22, innerW)));";
const PATH = "body = mix(body, vec3(0.066, 0.162, 0.392) * (0.6 + 0.4 * irr.b), pathK * 0.45);";
const CRACK = "body = mix(body, body * vec3(0.5, 0.6, 0.74), crackAcc * 0.7);";
const BUB = "body += scatterLight * bubbleAcc * 0.6;";
const EDGE = "body += scatterLight * edgeMask * (0.008 + 0.012 * cellRand);";
const base = [[LOD, "float lod = mix(0.3, 1.4, rough);"], [COL, "vec3 col = body * (1.0 - F * 0.5) + refl * F * 0.5 + spec * 0.6;"]];
const U = { uScatter: 0.0, uLens: 0.15 };
export default {
  noRefl: { frag: [[LOD, "float lod = mix(0.3, 1.4, rough);"], [COL, "vec3 col = body;"]], uniforms: U },
  noOrbLight: { frag: [...base, [PROX, ""], [GLINT, ""], [LANT, ""], [ENERGY, ""]], uniforms: U },
  noBands: { frag: [...base, [BANDMIX, ""], [PATH, ""]], uniforms: U },
  noDetail: { frag: [...base, [CRACK, ""], [BUB, ""], [EDGE, ""]], uniforms: U },
};
