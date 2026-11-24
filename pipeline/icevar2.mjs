// Ice variants, batch 2 (diagnostic): where does the milky brightness of the rings come from?
const LOD = "float lod = mix(1.3, 3.8, rough);";
const COMP = "trans /= 1.0 + 0.12 * max(max(trans.r, trans.g), trans.b);";
const ORB1 = "col += vec3(0.9, 0.95, 1.0) * uOrbGlow * 0.15 * prox";
const ORB3 = "col += vec3(0.72, 0.94, 1.0) * uOrbGlow * 0.25";
export default {
  // Refracted HDR clamped (the blurred mips spread the orb's 16-32x core over the rings).
  clampTrans: { frag: [[COMP, "trans = min(trans, vec3(1.0));"]] },
  // No scattered light (body = transmission only).
  noScatter: { uniforms: { uScatter: 0.0 } },
  // No orb glow / glint / see-through light terms.
  noOrb: { frag: [[ORB1, "col += 0.0 * vec3(0.9, 0.95, 1.0) * uOrbGlow * 0.15 * prox"], [ORB3, "col += 0.0 * vec3(0.72, 0.94, 1.0) * uOrbGlow * 0.25"]] },
  // Sharper refraction (lower mips).
  lowLod: { frag: [[LOD, "float lod = mix(0.5, 2.0, rough);"]] },
};
