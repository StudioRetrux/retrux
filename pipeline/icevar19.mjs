// Ice batch 19 (T09): the chamfer frost used max(|vSec.x|, |vSec.y|), which is ~1 over the whole broad faces (one section
// coordinate sits at its extreme there), so every face got frost >= 0.35 (blur, scatter, frosted Fresnel). Corners need
// both coordinates large: min. Alone, and with the low-frost / clearer settings of icevar18, and with the inner-wall band
// halved (q00 ring top L152 vs 191 did not move with any other change).
const FE = "float frostE = smoothstep(0.55, 0.95, max(abs(vSec.x), abs(vSec.y)));";
const FE_MIN = "float frostE = smoothstep(0.55, 0.95, min(abs(vSec.x), abs(vSec.y)));";
const COL = "vec3 col = body * (1.0 - F) + refl * F + spec;";
const LOD = "float lod = mix(1.3, 3.4, rough);";
const BANDMIX = "body = mix(body, vec3(0.065, 0.16, 0.39) * (0.5 + 0.5 * irr.b), max(band * mix(0.25, 0.38, innerW), tir * mix(0.15, 0.22, innerW)));";
const clearer = [[LOD, "float lod = mix(0.0, 1.6, rough);"], [COL, "vec3 col = body * (1.0 - F * 0.7) + refl * F * 0.7 + spec * 0.7;"]];
const halfBand = [BANDMIX, "body = mix(body, vec3(0.065, 0.16, 0.39) * (0.5 + 0.5 * irr.b), max(band * mix(0.12, 0.2, innerW), tir * mix(0.15, 0.22, innerW)));"];
export default {
  feMin: { frag: [[FE, FE_MIN]] },
  feMinClear: { frag: [[FE, FE_MIN], ...clearer], uniforms: { uFrost: 0.45, uLens: 0.2, uScatter: 0.06 } },
  feMinClearBand: { frag: [[FE, FE_MIN], ...clearer, halfBand], uniforms: { uFrost: 0.45, uLens: 0.2, uScatter: 0.06 } },
  feMinBand: { frag: [[FE, FE_MIN], halfBand] },
};
