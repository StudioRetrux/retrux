import * as THREE from "three";
import { GLSL_COMMON, GLSL_ENV } from "../shaders/chunks";
import type { SharedUniforms } from "../uniforms";

/**
 * Thick frozen-ice shader for the gyroscope rings.
 *
 * The scene behind (environment, shards, orb) is refracted from a mip-mapped
 * copy of the frame. Thickness comes from a back-face depth pass when available,
 * giving Beer-Lambert absorption (cyan where thick) and a milky scattering term.
 * A short march through the ice volume adds crack sheets and trapped bubbles,
 * which is what makes the rings read as carved ice rather than glass.
 */

export type IceQuality = {
  /** Steps of the internal crack / bubble march. */
  marchSteps: number;
  /** 3 = per-channel dispersion, 1 = single refraction sample. */
  dispersionTaps: 1 | 3;
  /** Evaluate bubbles (second Voronoi) inside the march. */
  bubbles: boolean;
  /**
   * Compile the ice-behind-ice half split (QualityProfile.iceBehindIce). Only then does the shader contain a
   * discard, which costs early-z on many GPUs.
   */
  split?: boolean;
};

const ICE_VERT = /* glsl */ `
${GLSL_COMMON}
uniform float uObjScale;
uniform vec3 uNoiseOffset;  // piece rest offset in the ring frame, so noise is continuous across pieces
uniform float uDisplace;    // Blender: Voronoi F1 displacement, midlevel 0.5, scale 0.05 x object scale
uniform float uSectionRadius; // ring centre-line radius (ring frame, axis +Z), for the displacement direction
uniform vec2 uSectionHalf;    // section half-extents (radial a, axial b), m, measured from the mesh
uniform float uSquare;        // 0: the mesh's lens section, 1: a squarer superellipse slab (n = 4)
uniform float uCrease;        // depth of the chipped grooves along the facet borders (mesh units)
uniform float uSeed;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vObjPos;
varying vec3 vObjNormal;
varying vec3 vObjView;
varying float vViewZ;
varying vec2 vSec;   // position across the slab section (radial, axial), -1..1 at the extremes
varying vec3 vCamRing;  // the camera in the ring frame (mesh units, constant per piece): the TIR bar's line of sight

// Ice.004 displaces by a Voronoi F1 at scale 5 in Blender object space (1 unit = 1.975 m). On this
// mesh density F1's creases light up the quad rows as dashes and make the half-res thickness pass
// blocky, so a smooth two-octave noise of the same scale stands in: same amplitude, same irregular
// silhouette. Returns (height in [0,1], gradient).
vec4 iceHeight(vec3 p) {
  const float k = 5.0 / 1.975;
#ifdef ICE_SILHOUETTE
  // T1+ (the pieces are subdivided x4 at load, Rings): a third octave and ridged chips at 2.2x the scale, so the outline
  // breaks into the reference's angular lumps instead of a smooth wave (QC round 8, ice CRITICAL "extruded acrylic").
  vec4 n = fbmd(p * k, 3);
  vec4 c = noised(p * (k * 2.2) + 17.0);
  float r = 1.0 - abs(c.x);
  vec3 rg = -sign(c.x) * c.yzw * (k * 2.2);
  // (Chips -0.3 until QC round 9: "edges torn like paper / frilled like a pie crust"; the low-frequency lumps were the part
  // that read hand-carved. -0.12 keeps a little angular break.)
  return vec4(0.5 + 0.42 * n.x - 0.12 * (r * r - 0.45), 0.42 * k * n.yzw - 0.24 * r * rg);
#else
  vec4 n = fbmd(p * k, 2);
  return vec4(0.5 + 0.5 * n.x, 0.5 * k * n.yzw);
#endif
}
// Chipped grooves along the borders of the same Voronoi cells the fragment shader chisels (chiselNormal,
// object space + seed), so the silhouette breaks up where the facets meet: carved ice, not a smooth tube.
// Position only (the shading normal comes from the fragment's facets), so the creases draw no dashed rows.
float iceCrease(vec3 objP) {
  vec3 off;
  vec2 v = voronoi3(objP * (9.0 / 1.975), off);
  // Broad, soft dips (a narrow profile notched the silhouette like a saw).
  return 1.0 - smoothstep(0.0, 0.45, v.y - v.x);
}

void main() {
  vec3 pr = position + uNoiseOffset;
  vec3 n = normalize(normal);
  vec3 pos = position;
  vSec = vec2(0.0);
  // Slab section: the mesh's rounded lens section reads as a pipe. Push each vertex of the section
  // outwards onto a superellipse (n = 8) through the same extremes, so the broad faces turn flat and
  // only the corners stay rounded; the radial / axial extents (and ring clearances) do not change.
  // Position-only, so split vertices stay welded. The cut faces of the pieces keep their own normal.
  // (n = 4 still read as round tubes in the dolly; the reference's arcs are chamfered blocks, F420.)
  if (uSquare > 0.0 && uSectionHalf.x > 0.0) {
    float rl0 = length(pr.xy);
    vec2 rdir = rl0 > 1e-4 ? pr.xy / rl0 : vec2(1.0, 0.0);
    vec2 sec = vec2(rl0 - uSectionRadius, pr.z);
    vec2 q = sec / uSectionHalf;
    float n2 = length(q);
    float n4 = pow(pow(abs(q.x), 8.0) + pow(abs(q.y), 8.0), 0.125);
    float k = n4 > 1e-4 ? mix(1.0, n2 / n4, uSquare) : 1.0;
    vec2 sec2 = sec * k;
    vSec = sec2 / uSectionHalf;
    vec3 prNew = vec3(rdir * (uSectionRadius + sec2.x), sec2.y);
    pos += prNew - pr;
    pr = prNew;
    vec3 tang = vec3(-rdir.y, rdir.x, 0.0);
    if (abs(dot(n, tang)) < 0.7) {
      vec2 qa = sec2 / uSectionHalf;
      vec2 g = vec2(sign(qa.x) * pow(abs(qa.x), 7.0) / uSectionHalf.x, sign(qa.y) * pow(abs(qa.y), 7.0) / uSectionHalf.y);
      vec3 ns = vec3(rdir * g.x, g.y);
      if (dot(ns, ns) > 1e-10) n = normalize(mix(n, normalize(ns), uSquare));
    }
  }
  if (uDisplace > 0.0) {
    vec4 hg = iceHeight(pr);
    // Push along the cross-section's outward direction, which depends on position only: the mesh
    // has hard edges (split vertices), and moving each copy along its own normal tears it open.
    float rl = length(pr.xy);
    vec3 dir = pr - (rl > 1e-4 ? vec3(pr.xy / rl * uSectionRadius, 0.0) : vec3(0.0));
    float dl = length(dir);
    dir = dl > 1e-4 ? dir / dl : n;
#ifdef ICE_CREASE
    pos += dir * ((hg.x - 0.5) * uDisplace - iceCrease(pr * uObjScale + uSeed * 13.7) * uCrease);
#else
    pos += dir * (hg.x - 0.5) * uDisplace;
#endif
    // (0.6 until QC round 6: the low-frequency normal wobble read as melted, watery glass through the refraction.)
    n = normalize(n - (hg.yzw - n * dot(hg.yzw, n)) * uDisplace * 0.18);
#ifdef ICE_SILHOUETTE
    // Broken ends (QC round 8: "end caps flat machine cuts"): a tangential field along the ring. The side faces slide along
    // themselves; the cut faces turn uneven (+-4.5 cm). One position field for every vertex, so caps and sides stay welded.
    vec3 tangT = vec3(-pr.y, pr.x, 0.0);
    float tlen = length(tangT);
    if (tlen > 1e-4) pos += (tangT / tlen) * vnoise(pr * (3.4 / 1.975) + 31.0) * 0.045;
#endif
  }
  vec4 wp = modelMatrix * vec4(pos, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * n);
  vObjPos = pr * uObjScale;
  vObjNormal = n;
  vec3 camObj = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
  vObjView = (camObj - pos) * uObjScale;
  vCamRing = camObj + uNoiseOffset;
  vec4 vp = viewMatrix * wp;
  vViewZ = -vp.z;
  gl_Position = projectionMatrix * vp;
}
`;

const ICE_FRAG = /* glsl */ `
${GLSL_COMMON}
${GLSL_ENV}
// three declares projectionMatrix for the vertex stage only; it is set per camera for the program.
uniform mat4 projectionMatrix;
uniform sampler2D uRefraction;
uniform vec2 uRefractionSize;
uniform sampler2D uBackDepth;
uniform float uUseBackDepth;
uniform vec2 uRingSplit;       // x: 1 = far half only (ICE_SPLIT); y: split view depth (m)
uniform vec2 uResolution;
uniform float uTime;
uniform float uFrame;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uIor;
uniform vec3 uAbsorb;
uniform vec3 uIceColor;
uniform vec3 uFrostTint;
uniform float uFrost;          // overall milkiness 0..1
uniform float uScatter;
uniform float uCrack;          // crack density / brightness
uniform float uBaseThickness;  // analytic fallback (m)
uniform float uRefrScale;      // (unused since the thick-lens model; kept for tuning hooks)
uniform float uLens;           // exit-ray swing per unit surface tilt (two IOR 1.5 interfaces)
uniform float uLensDepth;      // how far behind the ice the bent ray is projected (m)
uniform float uSeed;
uniform float uEnergy;         // hover / hold excitement 0..1
uniform float uFracture;       // > 0 on fresh fracture pieces while shattered
uniform float uReflectionPass; // 1 while rendering from the mirrored camera (no screen refraction)
uniform vec3 uOrbCenter;
uniform float uOrbGlow;
uniform vec2 uSectionHalf;
uniform float uSectionRadius;
uniform float uObjScale;
varying vec3 vCamRing;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vObjPos;
varying vec3 vObjNormal;
varying vec3 vObjView;
varying float vViewZ;
varying vec2 vSec;

vec2 projectUv(vec3 wp) {
  vec4 c = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  return c.xy / c.w * 0.5 + 0.5;
}

vec3 refractSample(vec2 uv, float lod) {
  return textureLod(uRefraction, clamp(uv, vec2(0.001), vec2(0.999)), lod).rgb;
}

// Chipped facets: Ice.004 displaces by a Voronoi F1 (scale 5 in local units, ~0.4 m), so every cell is a
// shallow cone dimple (the surface rises away from its feature point) with a sharp ridge at the cell border:
// scalloped chips, as on the reference's carved rings. A small per-cell tilt keeps neighbours apart.
vec3 chiselNormal(vec3 p, vec3 n, out float edgeMask, out float cellRand) {
  vec3 off;
  // (5 / 1.975 until QC round 6: ~0.4 m cells, a section wide; ~0.22 m now, the reference's chips.)
  const float CELL = 9.0 / 1.975;
  vec2 v = voronoi3(p * CELL, off);
  vec3 feature = p * CELL + off;
  vec3 rnd = hash33(floor(feature * 7.0) + 0.5) - 0.5;
  cellRand = hash13(floor(feature * 7.0) + 3.1);
  vec3 t, b;
  basis(n, t, b);
  // (QC round 4: plateaus alone left a smooth cylinder lens, read as satin / chrome tubes. 0.22 read as hammered
  // metal at rest, 0.14 as chipped ice in the dolly.)
  // (QC round 6, T10: the cone term, offT / |offT| * 0.14, made every cell a dimple: hammered chrome at rest. Planar chips
  // only now, tilted twice as far, with crisp borders.)
  vec3 tilt = (t * rnd.x + b * rnd.y) * 0.16;
  float e = v.y - v.x;
  float aa = fwidth(e) * 1.5 + 1e-4;
  edgeMask = 1.0 - smoothstep(0.0, 0.06 + aa, e);
  // The facet tilt holds right up to the crease and only fades inside the pixel footprint there (a wider
  // fade rounded the creases off: the melted-wax read).
  float keep = smoothstep(0.0, 0.04 + aa, e);
  return normalize(n + tilt * keep);
}

void main() {
#ifdef ICE_SPLIT
  // Ice behind ice: the far half of the cage is drawn first, the near half then refracts it (RenderPipeline).
  if (uRingSplit.x > 0.5 && vViewZ < uRingSplit.y) discard;
#endif
  vec3 Ng = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  if (dot(Ng, V) < 0.0) Ng = -Ng;

  vec3 p = vObjPos + uSeed * 13.7;
  float edgeMask, cellRand;
  vec3 N = chiselNormal(p, Ng, edgeMask, cellRand);
  vec3 Nf = N;

  // Frosted vs clear patches: Blender's roughness is Noise A (scale 4.2 local, detail 8) through a
  // ramp 0.542 -> 0.233 ... 0.766 -> 1.0, i.e. ~0.5 m patches with fractal edges. uFrost biases it.
  float nA = 0.5 + 0.5 * fbm(p * (4.2 / 1.975) + 4.0, FROST_OCTAVES);
  // (uFracture * 0.5 until QC round 6: the held A / B pieces all frosted over, the hold's frosted wax.)
  float frost = saturate(smoothstep(0.542, 0.766, nA + (uFrost - 0.6) * 0.35) + cellRand * 0.08 + uFracture * 0.1);
  // Whiteness stays on the chamfers and the end blocks; the broad faces clear (QC round 4: the faces read milky and
  // near-opaque, the reference's are clear azure with frosted edges).
  // Corners only: both section coordinates near their extremes. (max(): one coordinate sits at ~1 over a whole broad face,
  // so every face carried frost >= 0.35 -> blur, scatter and a frosted sheen: the milky veil of QC round 5.)
  float frostE = smoothstep(0.55, 0.95, min(abs(vSec.x), abs(vSec.y)));
  frost = max(frost * mix(0.82, 1.0, frostE), 0.35 * frostE);

  // Blender's two bump layers: a broad one where the ice is frosted (Bump.001, strength 0.2 on
  // Noise A at scale 4.2) and a fine one everywhere (Bump, 0.06 on Noise B at scale 4, detail 8).
  vec4 b1 = fbmd(p * (4.2 / 1.975), 3);
  vec4 b2 = fbmd(p * (4.0 / 1.975) * 2.6 + 11.0, FINE_OCTAVES);
  // (Broad layer at 0.07: 0.1 turned the slab faces into hammered, lumpy metal under the sky reflection.)
  // (Halved in QC round 5: through clearer ice the dimples read as hammered metal.)
  // (0.07 until QC round 6, T10: 70 % less low-frequency undulation.)
  vec3 g = (b1.yzw * (0.02 * (0.35 + 0.65 * frost)) + b2.yzw * 0.015) * 0.5;
  N = normalize(N - (g - Ng * dot(g, Ng)));

  float NdotV = saturate(dot(N, V));
  // Refraction: each chipped facet bends the view by its own tilt, so the scene behind breaks into the
  // reference's mosaic of light and dark patches (carved ice), and the bumps mottle it like frosted glass.
  // (At 0.55 / 0.12 the smooth section acted as one cylinder lens: dark-to-light gradients across every ring.)
  vec3 Nr = normalize(mix(Ng, Nf, 0.85) + (N - Nf) * 0.4);

  // Thickness along the view ray.
  float t;
  if (uUseBackDepth > 0.5) {
    // The back-depth pass is half resolution: at a silhouette the texel under this fragment can belong to
    // the background or another ring, which spiked the thickness into a 1 px periwinkle fringe. Take the
    // nearest back face of the 2x2 footprint, and never more than the slab can be thick at this angle.
    vec2 bt = 0.5 / vec2(textureSize(uBackDepth, 0));
    vec2 buv = gl_FragCoord.xy / uResolution;
    float back = 1e9;
    for (int k = 0; k < 4; k++) {
      float bk = texture2D(uBackDepth, buv + bt * vec2(k == 1 || k == 3 ? 1.0 : -1.0, k >= 2 ? 1.0 : -1.0)).r;
      if (bk > vViewZ) back = min(back, bk);
    }
    t = back < 1e8 ? max(back - vViewZ, 0.02) : uBaseThickness;
    t = min(t, 4.4 * max(uSectionHalf.x, uSectionHalf.y) / max(NdotV, 0.25));
  } else {
    t = uBaseThickness;
  }
  // Near the silhouette the half-res, half-float back depth alternates per 2x2 block at the inner rim (2-3 px dashes, the
  // "zipper" of QC round 7, T05): prefer the analytic slab there.
  float tSlab = 2.0 * max(uSectionHalf.x, uSectionHalf.y) / max(NdotV, 0.25);
  t = mix(t, min(t, tSlab), 1.0 - smoothstep(0.15, 0.4, NdotV));
  t = clamp(t * (1.0 + 0.6 * (1.0 - NdotV)), 0.02, 1.6);

  // Refraction. Two curved interfaces (IOR 1.5) act like a thick lens: the exit ray swings with the
  // surface tilt across the view, so the rings show the lake, the mountains and an inverted horizon
  // (the reference's dark #4870a8 bands), not just the sky right behind them. In-frame content
  // (orb, shards, world) comes from the screen copy; beyond the frame, the panorama.
  vec3 trans;
  // Rough transmission. The frost patches decide the clarity: clear ice shows the sky, clouds and plate
  // refracted through it (F000's top arc), frosted patches scatter. Thickness only softens a little. The
  // smooth lens normal keeps the clear patches from turning into liquid blotches.
  float thick = smoothstep(0.12, 0.45, t);
  float rough = max(frost, 0.3 * thick);
  // Frosted patches blur the scene behind but keep its coarse light / dark structure (a full blur turned
  // the frosted majority into a uniform milky fill).
  // (Clear ice at lod 0.9 turned refracted shards into saturated ink blotches: QC round 2.)
  // (1.6-3.8 blurred the back walls, the orb and the dark lake bands out of the faces: no see-through.)
  // (QC round 5: 1.3-3.4 smoothed the refraction into a structureless milky field; the transmitted image alone, unblurred,
  // already reads as the reference's clear refracting ice.)
  float lod = mix(0.0, 1.6, rough);
  vec3 tilt = Nr - V * dot(Nr, V);
  // Outer and inner walls are near-concentric, a weak meniscus (f ~ -46 m): the ring's own curvature must not bend the
  // view. Bent by the full wall tilt it was a 3.2x converging lens, and band A only ever showed the flattened centre of
  // the orb, a flat milky sheet (QC round 7, icevar40: sd 9 -> 19 vs the reference's 19). Facets and bumps only, plus the
  // grazing band ends and the rounded section corners (where the two faces are not parallel).
  vec3 tiltMacro = Ng - V * dot(Ng, V);
  float macroW = max(smoothstep(0.35, 0.75, 1.0 - dot(Ng, V)), smoothstep(0.72, 0.95, min(abs(vSec.x), abs(vSec.y))));
  tilt -= tiltMacro * (1.0 - macroW);
  float lens = uLens * (0.6 + 0.4 * saturate(t / 0.6));
  vec3 rdG = normalize(-V - tilt * lens);
  vec3 te = envRadiance(rdG, 0.18 + 0.55 * frost);
  if (uReflectionPass > 0.5) {
    trans = te;
  } else {
    vec2 uvG = projectUv(vWorldPos + rdG * uLensDepth);
    vec2 e = min(uvG, 1.0 - uvG);
    float inFrame = smoothstep(0.0, 0.05, min(e.x, e.y));
#if DISPERSION_TAPS == 3
    // A hint of dispersion only (wider spreads fringed dark refracted features with rainbows).
    vec3 rdR = normalize(-V - tilt * lens * 0.985);
    vec3 rdB = normalize(-V - tilt * lens * 1.018);
    trans.r = refractSample(projectUv(vWorldPos + rdR * uLensDepth), lod).r;
    trans.g = refractSample(uvG, lod).g;
    trans.b = refractSample(projectUv(vWorldPos + rdB * uLensDepth), lod).b;
#else
    trans = refractSample(uvG, lod);
#endif
    trans = mix(te, trans, inFrame);
  }
  // The blurred copy spreads the clipped orb over the slab in front of it; compress its highlights so the
  // orb reads as a bright patch through the ice, not a white-hot band, and keep its heat neutral (the hot
  // samples turned mint through the tint).
  // (Eased from 0.3: the orb should glow through the bands, QC round 2.)
  trans /= 1.0 + 0.12 * max(max(trans.r, trans.g), trans.b);
  float tl = dot(trans, vec3(0.2126, 0.7152, 0.0722));
  trans = mix(trans, vec3(tl), 0.15 * smoothstep(0.8, 2.5, tl));
  // Refracted colour is muted by the ice (shards and sky read as soft hints, not cobalt / mint stains); the chroma
  // gate below handles saturated stains, so less blanket muting (QC round 4: a third of the reference's blue).
  trans = mix(vec3(tl), trans, 0.75);
  // Saturated refracted colour (the cobalt shards smeared by the lens) turns slate: the reference ice never shows
  // saturated blue inside, only slate-blue refracted bands (QC round 4: 12-15 % violet blotches in q01 / p05).
  float chroma = max(trans.b - trans.r, 0.0) / max(tl, 1e-3);
  trans = mix(trans, vec3(tl) * vec3(0.86, 0.95, 1.08), smoothstep(0.2, 0.55, chroma));
  // Dark refracted content (lake, inverted horizon) turns steel blue, not neutral chrome bands (QC round 6, T08).
  trans = mix(trans, trans * vec3(0.84, 0.95, 1.14), (1.0 - smoothstep(0.25, 0.7, tl)) * 0.7);

  // Blender's ice colour tints the light at each of the two interfaces, then Beer-Lambert
  // deepens it where the slab is thick.
  // Thin ice stays nearly clear; the blue belongs to the long paths (QC round 5: the ring rim over the sky measured
  // 130,155,184 vs the reference's 173,194,219 with the full interface tint): weak absorption plus more past ~0.5 m.
  // (Long-path term (1.2, 0.55, 0.15) on t up to its 1.6 m clamp until QC round 9, T10: looking along the ring it reached
  // ~(0.15, 0.42, 0.80), the flat saturated cobalt end caps. Capped path, softer coefficients.)
  float tAbs = min(t, 0.9);
  vec3 T = exp(-uAbsorb * t - vec3(0.55, 0.32, 0.14) * max(tAbs - 0.5, 0.0));
  // Blender's tint squared is (0.42, 0.69, 1.0), a third of it at the interfaces. (Full strength until QC round 5: face-on
  // ice passed ~57 % of the background luma and read as grey glass.)
  // (0.35 in deploy #36 read "less blue than its own sky": round 6 wants bluer AND more luminous, not whiter -> 0.7,
  // with blue light added inside the clear ice below.)
  // Luminance-preserving (QC round 6, T08): the plain tint darkened the faces ~30 % to reach its hue.
  vec3 tcI = pow(uIceColor, vec3(1.5));
  tcI /= mix(1.0, dot(tcI, vec3(0.2126, 0.7152, 0.0722)), 0.65);
  vec3 tint = mix(vec3(1.0), tcI, 0.7) * T;
  tint = mix(vec3(dot(tint, vec3(0.2126, 0.7152, 0.0722))), tint, 1.0);
  trans *= tint;

  // Light that scatters inside the ice: sky irradiance plus backlit sun.
  vec3 L = normalize(uSunDir);
  vec3 irr = envIrradiance(N);
  float back = pow(saturate(dot(-V, L)), 3.0);
  float wrap = saturate((dot(N, L) + 0.6) / 1.6);
  // Light scattered by the rough interfaces, half-tinted by the ice colour: pale grey-white with a
  // cool cast in F082, a mid blue (#a6bcd9) where the rings are thick and seen against bright sky.
  // (Ice-colour share 0.35 -> 0.55: the faces measured B-R ~30-37 vs the reference's 45-58, QC round 5.)
  // (Ice-colour squared, 0.9: round 6, the scattered light read silver-grey.)
  vec3 scatterLight = uFrostTint * mix(vec3(1.0), uIceColor * uIceColor, 0.9) * (irr * 0.72 + uSunColor * (0.06 * wrap + 0.18 * back));
  // Scatter mostly where the ice is frosted; clear ice stays see-through.
  // Clear patches stay glassy (frost squared): the hold read milky and waxy at a linear frost weight.
  float s = uScatter * (0.08 + 0.92 * frost * frost) * (1.0 - exp(-t * (0.7 + 3.4 * frost)));
  // The orb's light reaches the ice in front of it as a local lantern: less milky scatter there, so the glow stays
  // a bright patch instead of whitening the whole band.
  vec3 rayL = normalize(vWorldPos - cameraPosition);
  float lantern = 0.0;
  if (dot(uOrbCenter - vWorldPos, rayL) > 0.0) {
    float dRayL = length(cross(uOrbCenter - cameraPosition, rayL));
    lantern = exp(-pow(dRayL / (1.15 * 0.8255), 2.0));
  }
  s *= 1.0 - 0.5 * lantern;

  // Crack sheets and bubbles, marched through the slab in object space.
  vec3 objV = normalize(vObjView);
  vec3 objN = normalize(vObjNormal);
  vec3 objRd = refract(-objV, objN, 1.0 / uIor);
  float tObj = t;
  // Static, gentle dither (a per-frame one crawls as a 2 px hatch without TAA).
  // (A 0.35 IGN dither stippled the transmission with 1 px dots, QC round 6: no jitter.)
  float jitter = 0.5;
  float crackAcc = 0.0;
  float bubbleAcc = 0.0;
  for (int i = 0; i < MARCH_STEPS; i++) {
    float f = (float(i) + jitter) / float(MARCH_STEPS);
    vec3 q = p + objRd * (tObj * (0.08 + 0.84 * f));
    vec3 o1;
    // Internal fracture planes, 1-2 per ring section (the reference's dark veins); denser read as a busy web.
    vec2 v1 = voronoi3(q * 0.5 + 2.0, o1);
    // Each sheet as one soft event: a thin sheet sampled at 4 march depths drew 3-4 dotted parallel copies.
    float sheet = 1.0 - smoothstep(0.0, 0.07, v1.y - v1.x);
    crackAcc = max(crackAcc, sheet * 0.6);
#ifdef ICE_BUBBLES
    vec3 o2;
    vec2 v2 = voronoi3(q * 7.0, o2);
    float bub = 1.0 - smoothstep(0.04, 0.085, v2.x);
    bubbleAcc += bub * (1.0 - bubbleAcc) * 0.35 * step(0.82, hash13(floor(q * 7.0 + o2)));
#endif
  }
  crackAcc *= uCrack;

  // Glacier ice glows pale blue from the sky light it carries: added, so the transmitted image stays clear (round 6:
  // band A B-R 27 -> 37 and L188 -> 192 vs the reference's 43 / 202; "bluer and more luminous, not whiter").
  // (Cyan in-scatter albedo #B4C8E4 since QC round 6, T08: iceColor^2 * 0.4.)
  // (QC round 9, T11: the add was uniform, lifting every dark tone, p5 145 vs the reference's 115; now directional, weaker on
  // down-facing faces, and thickness-weighted. With the stronger absorption: q03 ring A side L193 sd 17.6 -> L182 sd 20.1,
  // q00 inner rings sd 12.8 -> 15.1, p06 top arc sd 9.4 -> 12.3; the sculpture's mean 194 -> 191.)
  vec3 body = mix(trans, scatterLight, s) + vec3(0.456, 0.578, 0.776) * irr * 0.5 * mix(0.3, 1.3, smoothstep(-0.3, 0.6, N.y)) * (1.0 - exp(-2.5 * t));
  // TIR bar (QC round 6-7, icevar41; ring frame, axis +Z, mesh units). A wall whose normal has no axial part keeps
  // n (p x d).z and n d.z through refraction, so a ray entering through the OUTER wall meets the inner wall past the
  // critical angle exactly where its unrefracted line of sight passes the axis farther out than rIn. The bar is the strip
  // just inside that boundary (grazing exit: a long skim through the ice, Fresnel -> 1): the inner wall's silhouette,
  // F000's dark steel bars at the band ends. Past it the ray is totally reflected: frosted end blocks. (An earlier test
  // compared the refracted ray's closest approach with rIn: it can never reach it, dmin <= rOut / n < rIn.)
  vec3 tbI = -normalize(vObjView);
  float tbLenI2 = max(length(tbI.xy), 1e-4);
  float tbB = abs(vCamRing.x * tbI.y - vCamRing.y * tbI.x) / tbLenI2;
  float tbRin = uSectionRadius - uSectionHalf.x;
  float tbX = tbB - tbRin;
  float tbAA = fwidth(tbB) + 1e-4;
  vec2 tbP = vObjPos.xy / max(uObjScale, 1e-4);
  float tbR = max(length(tbP), 1e-4);
  // Entered through the outer wall (radial normal: not an axial face, chamfer or cut face), on the near side (inwards).
  float tbOuter = smoothstep(0.55, 0.8, dot(normalize(vObjNormal).xy, tbP / tbR));
  float tbHead = 1.0 - smoothstep(-0.25, -0.05, dot(tbP, tbI.xy) / (tbR * tbLenI2));
  // Still inside the slab when it reaches the inner radius (a tilted ring's ray can leave through an axial face first).
  float tbDz = tbI.z / uIor;
  float tbD2 = sqrt(max(1.0 - tbDz * tbDz, 1e-4));
  float tbBi = tbB * tbLenI2 / (uIor * tbD2);
  float tbRun = sqrt(max(tbR * tbR - tbBi * tbBi, 0.0)) - sqrt(max(tbRin * tbRin - tbBi * tbBi, 0.0));
  float tbZ = vObjPos.z / max(uObjScale, 1e-4) + tbDz / tbD2 * tbRun;
  float tbOn = tbOuter * tbHead * (1.0 - smoothstep(0.97, 1.03, abs(tbZ) / max(uSectionHalf.y, 1e-3))) * smoothstep(0.08, 0.2, tbLenI2);
  // ~9 px at the rest framing: x in [-0.13, -0.02] m (q00 right bar 135,166,199 vs the reference's 135,164,200).
  // (QC round 10, hold sweep: the flat [-0.13, -0.02] bar, 9-20 px of uniform cobalt with straight parallel edges, read as
  // a mesh / UV seam across the bands in idle, pop and hold. F000's lines are thin, dark and follow the lumpy ice: the
  // coordinate wobbles with the surface noise (+-~3.5 cm), a soft tent profile 3 cm either side of -5.5 cm, and the frosted
  // end block's edge follows the same wobble.)
  float tbXw = tbX + b1.x * 0.018 + (nA - 0.5) * 0.045;
  float tirBar = (1.0 - smoothstep(0.0, 1.0, abs(tbXw + 0.055) / 0.03)) * tbOn;
  float tirZone = smoothstep(-tbAA - 0.01, tbAA + 0.01, tbXw) * tbOn;
  // Internal fractures read as dark steel-blue veins in the reference (they refract the darker world).
  body = mix(body, body * vec3(0.5, 0.6, 0.74), crackAcc * 0.7);
  body += scatterLight * bubbleAcc * 0.6;
  // The reference's dark slate-blue band along the inside of every ring (#4870a8): the thick section
  // refracts the darker lake and mountains there. It sits on the inward-curving surfaces (ring frame,
  // axis +Z) and leaves a light lip right at the inner wall.
  vec2 radial = normalize(vObjPos.xy + vec2(1e-5));
  float inward = saturate(-dot(normalize(vObjNormal).xy, radial));
  // (fwidth-widened lip, and faded where it would be narrower than ~1.5 px: 1 px aliased lines that crawl in the tumble,
  // QC round 7, T05.)
  float aI = fwidth(inward);
  float band = smoothstep(0.12, 0.5, inward) * (1.0 - smoothstep(0.9 - aI, 0.99 + aI, inward)) * (0.6 + 0.4 * thick);
  band *= smoothstep(1.0, 2.0, 0.09 / max(aI, 1e-4));
  // Total internal reflection: where thick ice is seen at a grazing angle (the ends of an edge-on band,
  // its top edge) the reference shows dark steel-blue bars.
  // Both fade at the silhouette (the reference rims go light, not navy) and the band only shows where the
  // ice refracts something dark: a fixed geometric mask drew dark periwinkle tubes with contour lines.
  // (x(1 - 0.7 tirZone): the totally reflecting end blocks read frosted, not navy.)
  float aN = fwidth(NdotV);
  float tir = smoothstep(0.5, 0.85, 1.0 - dot(Nr, V)) * thick * smoothstep(0.06 - aN, 0.22 + aN, NdotV) * (1.0 - 0.7 * tirZone);
  band *= 1.0 - smoothstep(0.3, 0.6, tl);
  // (TIR at 0.55 drew dark navy contour lines along every ring edge: the chrome-tube read, QC round 4.) Stronger only on
  // the inner-radius walls where the ice refracts something dark: the reference's double-wall read (its band's end
  // walls draw dark vertical lines that split it into frosted end blocks and a clearer middle).
  float innerW = smoothstep(0.4, 0.6, inward) * (1.0 - smoothstep(0.3, 0.5, tl));
  body = mix(body, vec3(0.065, 0.16, 0.39) * (0.5 + 0.5 * irr.b), max(band * mix(0.25, 0.38, innerW), tir * mix(0.15, 0.22, innerW)));
  // Long paths through the slab (along the ring, near its ends) turn the reference's navy #4870a8.
  float pathK = smoothstep(1.2, 2.5, t / (2.0 * max(max(uSectionHalf.x, uSectionHalf.y), 1e-3))) * (1.0 - 0.6 * tirZone);
  body = mix(body, vec3(0.066, 0.162, 0.392) * (0.6 + 0.4 * irr.b), pathK * 0.3);
  // Chisel edges catch a little light (anti-aliased with fwidth in chiselNormal). (0.02-0.06 drew the cell
  // borders as a honeycomb web across the bands.)
  body += scatterLight * edgeMask * (0.008 + 0.012 * cellRand);
  // The TIR bar in the reference's steel blue, and milky end blocks beyond it (light bounced off the inner wall and left
  // through frosted faces; the saturated cornflower end caps of QC round 7).
  // (Dark slate since QC round 10, like F000's inner-wall lines; the cobalt 0.14 / 0.27 / 0.68 read as a painted stripe.)
  body = mix(body, vec3(0.09, 0.17, 0.36) * (0.6 + 0.4 * irr.b), tirBar * 0.8);
  body = mix(body, scatterLight * 1.1 + vec3(0.456, 0.578, 0.776) * irr * 0.3, tirZone * 0.3);
  {
    // End blocks frosted and broken up, not flat saturated cobalt (QC round 9, T10: q00 cap 98,142,191 -> 143,164,192, F000
    // 160,179,207; the steel TIR bar beside it unchanged).
    float lb = dot(body, vec3(0.2126, 0.7152, 0.0722));
    body = mix(body, mix(vec3(lb), body, 0.6) * 1.45, 0.85 * tirZone);
    body *= 1.0 + (nA - 0.5) * 0.16 * tirZone;
  }

  // Surface reflection. Rough (frosted) faces lose the grazing Fresnel peak (Lagarde's roughness-aware
  // Schlick): the full peak drew a continuous silver sheen along every quarter, which read as plastic.
  // Ice: F0 ~0.02 (n 1.31), so transmission dominates face-on.
  float F = 0.02 + (max(1.0 - mix(0.12, 0.45, frost), 0.02) - 0.02) * pow(1.0 - NdotV, 5.0);
  // The last pixel or two of the silhouette take no Fresnel spike (a 1 px white rim, dotted where it aliased).
  float sil = smoothstep(0.0, max(fwidth(NdotV) * 2.0, 0.02), dot(Ng, V));
  F *= mix(0.25, 1.0, sil);
  F *= 1.0 - 0.6 * tirBar;
  // Frosted faces at grazing angles (the back ring behind the cross) lose a third of the peak: they whitened into a
  // milky halo (QC round 4, q02).
  F *= mix(1.0, 0.65, frost * smoothstep(0.55, 0.7, 1.0 - NdotV));
  vec3 R = reflect(-V, N);
  // Frosted reflections (at 0.08-0.5 the sky and horizon mirrored as crisp lines: polished chrome, QC round 4).
  vec3 refl = envRadiance(R, mix(0.3, 0.7, frost));
  // Thick grazing edges read steel-blue in the reference, not as a uniform white sky rim; white survives
  // only on the chipped creases.
  refl = mix(refl, vec3(0.43, 0.55, 0.71) * dot(irr, vec3(0.2126, 0.7152, 0.0722)), tir * 0.15 * (1.0 - edgeMask));
  // Specular anti-aliasing: widen the lobe where the normal changes fast across the pixel (no fireflies or
  // dashed rim highlights).
  float nVar = dot(dFdx(N), dFdx(N)) + dot(dFdy(N), dFdy(N));
  // (Clear-patch floor 0.34: sharper lobes read as wet gel tubes with continuous highlight stripes.)
  float rSpec = sqrt(pow(mix(0.34, 0.5, frost), 2.0) + 0.35 * nVar);
  // Capped (the cut ends facing the sun blew out to a paper-white crescent, L247).
  vec3 spec = min(uSunColor * ggxSpec(N, V, L, rSpec), vec3(2.5)) * sil;

  // (x0.7 since QC round 5: the frosted sky reflection and the specular on the dimpled normal were the hammered sheen.)
  // (QC round 6, T08: a bluer and weaker grey sky reflection, x0.7 -> x0.5.)
  refl = mix(refl, refl * vec3(0.88, 0.96, 1.1), 0.6);
  // Up-facing faces carry more of the sky reflection (highlights hold the mean while the darks deepen, QC round 9).
  float fw = mix(0.5, 0.7, smoothstep(0.3, 0.6, N.y));
  vec3 col = body * (1.0 - F * fw) + refl * F * fw + spec * 0.7;
  // The orb is a light: its cyan-white glow reaches the ice around it, most on thin ice and faces turned
  // to it, plus a tight glint (the reference's lit inner edges, F000 / F420).
  vec3 toO = uOrbCenter - vWorldPos;
  float dO = length(toO);
  vec3 lO = toO / max(dO, 1e-4);
  float prox = exp(-max(dO - 0.8255, 0.0));
  float facing = saturate(dot(Nr, lO));
  col += vec3(0.9, 0.95, 1.0) * uOrbGlow * 0.07 * prox * mix(0.35, 1.0, 1.0 - thick) * (0.3 + 0.7 * facing) * (1.0 - F);
  col += vec3(2.6, 2.8, 3.3) * 0.05 * uOrbGlow * ggxSpec(N, V, lO, rSpec + 0.04);
  // Light of the orb behind this fragment coming through the ice: a soft disc around the view ray's closest
  // approach to the orb (QC round 2: ring A over the orb +13 L vs the reference's +44 L). The refraction copies
  // no longer carry the orb's full HDR (RenderPipeline knee), so this carries its glow through the ice (x0.6).
  // (QC round 4: a wider, stronger lantern, sigma 0.8 -> 1.15 orb radii, x0.6 -> x0.75: the reference band in front of
  // the orb is +35-60 L over its sides.)
  // (x0.75 measured the band centre L202 vs the reference's 228 with the v2 environment: x1.05.)
  // (x0.5 since QC round 5, with the prox glow above: both washed every ring near the orb white-cyan.)
  // (x0.25 in round 6; off since QC round 7: the copies carry the orb's own brightness now, see RenderPipeline's blit.
  // The lantern still lowers the scatter in front of the orb above.)
  {
    // Orb light carried by the ice (QC round 8, orb CRITICAL: the orb read as a dark soap bubble / pearl whenever a band hid
    // its core). A FLOOR, not an add: ice in front of the orb (view ray within ~1.15 orb radii of its centre) never reads
    // darker than a white-aqua glow peaking near the bloom threshold, filled in only where the transmitted image is darker
    // (thick, frosted or totally reflecting ice that cannot show the orb). Modulated by the frost patches so the band keeps
    // its texture (a uniform floor flattened it: q00 box sd 9 -> 4.5). q00 band L222 (F000 222), eye L208 (207).
    float dRayG = 1e3;
    if (dot(uOrbCenter - vWorldPos, rayL) > 0.0) dRayG = length(cross(uOrbCenter - cameraPosition, rayL));
    float lanternG = exp(-pow(dRayG / (1.15 * 0.8255), 2.0));
    float carry = mix(0.55, 1.0, max(frost, max(tirZone, pathK)));
    vec3 glowC = vec3(0.82, 1.0, 0.97) * uOrbGlow * 2.4 * lanternG * carry;
    float lg = dot(glowC, vec3(0.2126, 0.7152, 0.0722));
    float lc = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col += glowC * clamp((lg - lc) / max(lg, 1e-4), 0.0, 1.0) * mix(0.45, 1.2, frost);
  }
  // Energy (hover / hold): a faint cold inner glow, mostly in the cracks (more turned the hold to porcelain).
  // (A flat 0.04 until QC round 9: a uniform milky lift in the pop / hold.)
  col += uFrostTint * irr * uEnergy * (0.1 * crackAcc);

  // The round-9 absorption deepened the darks; the sculpture's mean is held near the reference by a small lift (local
  // structure stays, the global value does not drop: "do not darken globally", QC round 9).
  col *= 1.035;
  {
    // x1.35 chroma (QC round 10: grey-white ice, ring saturation 11-18 vs the reference's 19-27; the eye-pose ring side 0.092
    // -> 0.110 vs 0.157. x1.6 matched more boxes but read as tinted acrylic.)
    float lc2 = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = max(vec3(lc2) + (col - vec3(lc2)) * 1.35, vec3(0.0));
  }
  gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);
}
`;

const BACK_FRAG = /* glsl */ `
uniform float uJoined;
varying float vViewZ;
varying vec3 vObjPos;
varying vec3 vObjNormal;
void main() {
  // While a ring's pieces sit together their end caps are inside the ice: as back faces they cut the thickness at
  // every joint, so one side of a cut came out milky and the other blue, a hard vertical seam across the band at rest
  // (QC round 5). Caps face along the ring's tangent; skip them until the pieces move apart.
  if (uJoined > 0.5) {
    vec2 tang = normalize(vec2(-vObjPos.y, vObjPos.x) + vec2(1e-6));
    if (abs(dot(normalize(vObjNormal).xy, tang)) > 0.85) discard;
  }
  gl_FragColor = vec4(vViewZ, 0.0, 0.0, 1.0);
}
`;

/** T1+ rings get subdivided pieces (Rings) and the chiselled vertex displacement (ICE_SILHOUETTE); T0 keeps the originals. */
export function iceSilhouette(quality: IceQuality) {
  return quality.marchSteps > 2;
}

export function createIceMaterial(
  shared: SharedUniforms,
  envDefines: Record<string, string>,
  quality: IceQuality,
  opts: { seed: number; objScale: number; frost?: number },
) {
  const defines: Record<string, string | number> = {
    ...envDefines,
    MARCH_STEPS: quality.marchSteps,
    DISPERSION_TAPS: quality.dispersionTaps,
    // Frost patch detail: Blender uses 8 octaves; 3 on T0 (2 march steps), 5 otherwise.
    FROST_OCTAVES: quality.marchSteps <= 2 ? 3 : 5,
    // Fine surface bump (Blender: detail 8): 5 octaves, 3 on T0.
    FINE_OCTAVES: quality.marchSteps <= 2 ? 3 : 5,
  };
  if (quality.bubbles) defines.ICE_BUBBLES = "";
  if (quality.split) defines.ICE_SPLIT = "";
  // Chipped silhouette grooves (a Voronoi per vertex, in the colour, back-depth and mirror passes): not on T0.
  if (quality.marchSteps > 2) defines.ICE_CREASE = "";
  // Chiselled silhouettes and broken ends on the subdivided pieces (iceSilhouette, Rings): not on T0.
  const silhouette = iceSilhouette(quality);
  if (silhouette) defines.ICE_SILHOUETTE = "";
  return new THREE.ShaderMaterial({
    name: "rx-ice",
    vertexShader: ICE_VERT,
    fragmentShader: ICE_FRAG,
    defines,
    uniforms: {
      uRefraction: shared.uRefraction,
      uRefractionSize: shared.uRefractionSize,
      uBackDepth: shared.uBackDepth,
      uUseBackDepth: shared.uUseBackDepth,
      uRingSplit: shared.uRingSplit,
      uResolution: shared.uResolution,
      uTime: shared.uTime,
      uFrame: shared.uFrame,
      uSunDir: shared.uSunDir,
      uSunColor: shared.uSunColor,
      uEnvMap: shared.uEnvMap,
      uEnvIntensity: shared.uEnvIntensity,
      uIor: { value: 1.31 },
      // Per metre; thick sections turn a deep blue (the reference's #4870a8 bands).
      // Periwinkle grey-blue, never teal or mint (QC panel): less red absorption than Blender's tint implies.
      // Azure (hue ~212, the reference's #a6bcd9), not lavender: green held a little above red.
      // (QC round 4: thick ice towards ~170,190,220, i.e. more red / green absorption: 0.68 / 0.38 -> 0.85 / 0.46.)
      // (QC round 5: 0.45 / 0.22 / 0.06 for thin ice plus a long-path term in the shader; 0.85 / 0.46 / 0.12 greyed it.)
      // (QC round 6, T08: 0.36 / 0.17 / 0.04, a 0.4 m path ~x(0.87, 0.93, 0.98), with the luminance-preserving tint.)
      // (QC round 9, T11: 0.58 / 0.28 / 0.10; a 0.4 m path passed 0.87 / 0.93 / 0.98, so faces never separated in value.)
      uAbsorb: { value: new THREE.Vector3(0.58, 0.28, 0.1) },
      uIceColor: { value: new THREE.Color(0.66, 0.79, 1.0) },
      uFrostTint: { value: new THREE.Color(0.78, 0.88, 1.0) },
      uFrost: { value: opts.frost ?? 0.55 },
      // Milky body like the reference ring bodies (#a6bcd9 / #d2dff1), cracks only as accents.
      // (0.3 kept the faces milky; QC round 4: transmission-dominant faces, whiteness on the edges.)
      // (0.06 since QC round 5: clear ice, whiteness on frost patches, chamfers and cracks.)
      uScatter: { value: 0.06 },
      // (0.85 until QC round 6: the crack sheets read as marble veins and a crackle net.)
      uCrack: { value: 0.6 },
      uBaseThickness: { value: 0.38 },
      uRefrScale: { value: 1.6 },
      // (0.4 displaced the refraction ~2.4 m at the ring: the background never read through the ice. QC round 5.)
      // (0.35 since round 6 with the planar chips: the band ends gain the reference's refracted structure, sd 18 vs 15.)
      uLens: { value: 0.35 },
      uLensDepth: { value: 6 },
      uSeed: { value: opts.seed },
      uObjScale: { value: opts.objScale },
      uNoiseOffset: { value: new THREE.Vector3() },
      // Blender's 0.05 x 1.975 (more read as melted wax); the slab section gives the chunky carved read.
      // x1.35 with the chiselled silhouettes (QC round 8: the subdivided outline needs the amplitude to read as lumps).
      uDisplace: { value: 0.05 * 1.975 * (silhouette ? 1.35 : 1) },
      // Chipped grooves at the facet borders, ~60 % of the lump displacement's half-range deep.
      uCrease: { value: 0.005 * 1.975 },
      uSectionRadius: { value: 0 },
      uSectionHalf: { value: new THREE.Vector2(0, 0) },
      uSquare: { value: 1 },
      uEnergy: { value: 0 },
      uFracture: { value: 0 },
      uReflectionPass: { value: 0 },
      uOrbCenter: shared.uOrbCenter,
      uOrbGlow: shared.uOrbGlow,
    },
  });
}

/** Writes linear view depth of back faces, for the thickness lookup (one per piece: same displacement). */
export function createBackDepthMaterial(front: THREE.ShaderMaterial) {
  return new THREE.ShaderMaterial({
    name: "rx-ice-back",
    vertexShader: ICE_VERT,
    fragmentShader: BACK_FRAG,
    // Same displacement as the front faces.
    defines: {
      ...(front.defines && "ICE_CREASE" in front.defines ? { ICE_CREASE: "" } : {}),
      ...(front.defines && "ICE_SILHOUETTE" in front.defines ? { ICE_SILHOUETTE: "" } : {}),
    },
    side: THREE.BackSide,
    uniforms: {
      /** 1 while the piece sits at its rest place in the ring (Rings.update). */
      uJoined: { value: 1 },
      uObjScale: front.uniforms.uObjScale,
      uNoiseOffset: front.uniforms.uNoiseOffset,
      uDisplace: front.uniforms.uDisplace,
      uCrease: front.uniforms.uCrease,
      uSeed: front.uniforms.uSeed,
      uSectionRadius: front.uniforms.uSectionRadius,
      uSectionHalf: front.uniforms.uSectionHalf,
      uSquare: front.uniforms.uSquare,
    },
  });
}
