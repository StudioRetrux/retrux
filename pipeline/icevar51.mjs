// Ice batch 51 (QC round 8, ice lens 6.3): "polygon 'shattered glass / crumpled cellophane' cells in the refraction across
// band and ring faces" (major) + "transmission too clear and sharp: no frosted blur or scatter, the orb crisp through the
// ice instead of glowing aqua-white" (major) + "no frost grain" (part of the critical acrylic read).
// The cells: Nr = mix(Ng, Nf, 0.85) + bumps, i.e. each chisel cell's planar tilt bends the view by its own amount, so
// every cell shows its own shifted patch of the background with a hard border (a mosaic).
// r51a: facet share in the refraction 0.85 -> 0.4 (cells still tilt the specular / edges, but refract gently).
// r51b: r51a + frosted transmission blur (lod 0..1.6 -> 0.6..2.2 with frost) so the orb glows through instead of crisp.
// r51c: r51b + frost grain: fine 3D noise modulates the transmitted light +-6 % and adds tiny bright flecks on frosted
// faces (the reference's sugary frost sparkle), anti-aliased by its own fwidth.
const NR = "  vec3 Nr = normalize(mix(Ng, Nf, 0.85) + (N - Nf) * 0.4);";
const NR_A = "  vec3 Nr = normalize(mix(Ng, Nf, 0.4) + (N - Nf) * 0.4);";
const LOD = "  float lod = mix(0.0, 1.6, rough);";
const LOD_B = "  float lod = mix(0.6, 2.2, rough);";
const TINT = "  trans *= tint;\n";
const GRAIN = `  trans *= tint;
  {
    // Frost grain (QC round 8): fine sugary variation in the transmitted light, faded where it would alias.
    vec3 gq = vObjPos * 38.0;
    float gn = vnoise(gq) * 0.6 + vnoise(gq * 2.3 + 7.1) * 0.4;   // ~[-1, 1]
    float gAA = 1.0 - smoothstep(0.5, 1.2, fwidth(gn));
    trans *= 1.0 + gn * 0.06 * gAA * (0.4 + 0.6 * frost);
  }
`;
export default {
  r51a: { frag: [[NR, NR_A]] },
  r51b: { frag: [[NR, NR_A], [LOD, LOD_B]] },
  r51c: { frag: [[NR, NR_A], [LOD, LOD_B], [TINT, GRAIN]] },
};
