// Ice batch 50 (QC round 8, orb lens CRITICAL + awwwards #2): "the orb goes dark whenever a band hides the core: a soap
// bubble / silver pearl, no light inside the ice" (hold p06, pointer holds L / BL / TR, idle tau ~0.5-0.75 / 2.75-3.25).
// The reference's frosted ice in front of the orb glows white-cyan from inside (F420's bright slit, loop F015's glowing
// band): light carried and scattered by the ice. Round 7 switched the lantern add off (it whitened every ring near the
// orb at rest, where the refraction already shows the orb and the eye-pose band now matches: L195 vs 195).
// g50a: a glow FLOOR instead of an add: ice in front of the orb (view ray within ~1.15 orb radii of its centre) never
// reads darker than a soft aqua-white glow; it fills in only where the transmitted image is darker than that (thick,
// frosted or totally reflecting ice that cannot show the orb), so the clear eye-pose band is left as it is.
// g50b: the same, stronger (x1.4) and a little wider (1.35 radii). g50c: g50a plus a faint scatter of the core's light
// along the whole band near the orb (prox-weighted, frosted ice only).
const ANCHOR = "  // Energy (hover / hold): a faint cold inner glow, mostly in the cracks (more turned the hold to porcelain).";
const floorGLSL = (k, sigma, extra, texK = "1.0") => `  {
    // Orb light carried by the ice (QC round 8): a floor, not an add (see icevar50).
    float dRayG = 1e3;
    if (dot(uOrbCenter - vWorldPos, rayL) > 0.0) dRayG = length(cross(uOrbCenter - cameraPosition, rayL));
    float lanternG = exp(-pow(dRayG / (${sigma} * 0.8255), 2.0));
    float carry = mix(0.55, 1.0, max(frost, max(tirZone, pathK)));
    vec3 glowC = vec3(0.80, 0.97, 1.0) * uOrbGlow * ${k} * lanternG * carry;
    float lg = dot(glowC, vec3(0.2126, 0.7152, 0.0722));
    float lc = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col += glowC * clamp((lg - lc) / max(lg, 1e-4), 0.0, 1.0) * ${texK};
${extra}
  }
${ANCHOR}`;
const EXTRA_C = "    col += vec3(0.80, 0.97, 1.0) * uOrbGlow * 0.05 * prox * frost * (1.0 - lanternG);";
// (Round 9 probe: g50a-c barely moved the band over the orb, L214 -> 216: the band already sits above a 0.9 floor in linear
// terms. The missing read is GLOW: a lantern peaking at ~2.2-2.6 scene-linear passes the bloom threshold (2.0) as a halo.)
export default {
  g50a: { frag: [[ANCHOR, floorGLSL("0.9", "1.15", "")]] },
  g50b: { frag: [[ANCHOR, floorGLSL("1.26", "1.35", "")]] },
  g50c: { frag: [[ANCHOR, floorGLSL("0.9", "1.15", EXTRA_C)]] },
  g50d: { frag: [[ANCHOR, floorGLSL("2.4", "1.15", "")]] },
  g50e: { frag: [[ANCHOR, floorGLSL("3.2", "1.15", "")]] },
  // The floor flattened the band (q00 box sd 9.2 -> 4.7 vs the reference's 17.5): the scattered light follows the frost
  // patches instead (mix 0.45-1.2 by frost), so the glow keeps the band's texture.
  g50f: { frag: [[ANCHOR, floorGLSL("2.4", "1.15", "", "mix(0.45, 1.2, frost)")]] },
  g50g: { frag: [[ANCHOR, floorGLSL("2.8", "1.15", "", "mix(0.3, 1.3, frost * frost)")]] },
};
