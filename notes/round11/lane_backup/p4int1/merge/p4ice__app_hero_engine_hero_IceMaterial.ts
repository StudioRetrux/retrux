import * as THREE from "three";
import { ORB_RADIUS } from "../config";
import { GLSL_COMMON, GLSL_ENV } from "../shaders/chunks";
import type { SharedUniforms } from "../uniforms";

/**
 * Round-11 ice is the default. `?ice=r10` restores the round-10 ice exactly: the old shader path (no ICE_R11 define), the
 * old uniforms, the superellipse slab and the ring back-depth pass (RenderPipeline).
 */
export const ICE_R10 = typeof location !== "undefined" && new URLSearchParams(location.search).get("ice") === "r10";
/**
 * `?ice=r11a`: the round-11 ice exactly as judge 1 saw it (15 Nov), i.e. every fix-round option (uR11J, uR11K) off and
 * the round-11 defaults of that build. For A/B captures; `?ice=r10` still restores round 10.
 */
export const ICE_R11A = typeof location !== "undefined" && new URLSearchParams(location.search).get("ice") === "r11a";

/**
 * P4 ice lane (P3 panel tasks G5, Q3, Q4 ice part, Q6, Q10), T1 / T2 only (T0 keeps MAIN's ice). `?p4ice=0` restores MAIN
 * exactly (no ICE_P4 define, no new uniforms). Sub-switches, uniform-level in the same program: `?iceaa=r11` (G5 band
 * limit), `?icefrost=r11` (Q3 frost), `?icecap=0` (Q6 caps / joints), `?orbice=r11` (Q4 orb light in the ice),
 * `?icehold=r11` (Q10 hold drama / rim / cracks / cast).
 */
const P4Q = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;
export const P4ICE = !!P4Q && P4Q.get("p4ice") !== "0";
const P4_AA = !!P4Q && P4Q.get("iceaa") !== "r11";
const P4_FROST = !!P4Q && P4Q.get("icefrost") !== "r11";
const P4_CAP = !!P4Q && P4Q.get("icecap") !== "0";
const P4_ORB = !!P4Q && P4Q.get("orbice") !== "r11";
const P4_HOLD = !!P4Q && P4Q.get("icehold") !== "r11";
function p4On(quality: { marchSteps: number }) {
  return P4ICE && iceR11(quality) && quality.marchSteps >= 4;
}
/**
 * The fragment source without the P4 lane's `#ifdef ICE_P4` blocks (their `#else` parts kept): with the lane off (and on T0)
 * the program text is MAIN's exactly, not only its output (tools/ident hashes every linked program's source).
 */
function stripP4(src: string) {
  const out: string[] = [];
  let mode = 0; // 0 outside, 1 the P4 part, 2 its #else part (no nested conditionals inside these blocks)
  for (const line of src.split("\n")) {
    const t = line.trim();
    if (mode === 0 && t === "#ifdef ICE_P4") mode = 1;
    else if (mode === 1 && t === "#else") mode = 2;
    else if (mode !== 0 && t === "#endif") mode = 0;
    else if (mode !== 1) out.push(line);
  }
  return out.join("\n");
}

/**
 * Round-11 ice on this tier? T0 (ice march steps <= 2) keeps the round-10 ice, orb and back-depth pass: the traced
 * section costs x1.26-1.45 of the round-10 T0 ice in GPU frame time (round-11 batch s41), above T0's budget.
 */
export function iceR11(ice: { marchSteps: number }) {
  return !ICE_R10 && ice.marchSteps > 2;
}

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

#ifdef ICE_R11
// Round 11 (default; ?ice=r10 restores the code below the #else). The ring frame for the fragment's section trace.
varying vec3 vRingC;  // ring centre (world)
varying vec3 vRingA;  // ring axis (world)
uniform float uR11Ramp; // width of the step between two cells' heights (Voronoi distance units)
// Ice.004's displacement: a Voronoi F1 at scale 5 in Blender object space (1 unit = 1.975 m), its cell COLOUR (luminance,
// mean 0.5, sd 0.216) through a Displacement node (midlevel 0.5), applied at the SubD-L1 render vertices, so every cell
// is a flat plateau and the steps between cells are spread over one L1 edge: the chiselled polyline outline of the
// Cycles twin. Returns the height - 0.5.
float r11Plateau(vec3 p) {
  vec3 x = p * (5.0 / 1.975);
  vec3 ip = floor(x);
  vec3 f = fract(x);
  float d1 = 8.0, d2 = 8.0;
  vec3 c1 = ip, c2 = ip;
  for (int k = -1; k <= 1; k++)
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec3 b = vec3(float(i), float(j), float(k));
    vec3 r = b + hash33(ip + b) - f;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; c2 = c1; d1 = d; c1 = ip + b; }
    else if (d < d2) { d2 = d; c2 = ip + b; }
  }
  float h1 = luma(hash33(c1 + 17.31));
  float h2 = luma(hash33(c2 + 17.31));
  float k = smoothstep(0.0, uR11Ramp, sqrt(d2) - sqrt(d1));
  return mix(0.5 * (h1 + h2), h1, k) - 0.5;
}

void main() {
  vec3 pr = position + uNoiseOffset;
  vec3 n = normalize(normal);
  vec3 pos = position;
  vSec = vec2(0.0);
  if (uDisplace > 0.0) {
    // Along the cross-section's outward direction (position only: split vertices stay welded).
    float rl = length(pr.xy);
    vec3 dir = pr - (rl > 1e-4 ? vec3(pr.xy / rl * uSectionRadius, 0.0) : vec3(0.0));
    float dl = length(dir);
    dir = dl > 1e-4 ? dir / dl : n;
    pos += dir * r11Plateau(pr * uObjScale + uSeed * 13.7) * uDisplace;
  }
  vec4 wp = modelMatrix * vec4(pos, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * n);
  vObjPos = pr * uObjScale;
  vObjNormal = n;
  vec3 camObj = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
  vObjView = (camObj - pos) * uObjScale;
  vCamRing = camObj + uNoiseOffset;
  vRingC = (modelMatrix * vec4(-uNoiseOffset, 1.0)).xyz;
  vRingA = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  vec4 vp = viewMatrix * wp;
  vViewZ = -vp.z;
  gl_Position = projectionMatrix * vp;
}
#else
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
#endif
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

#ifdef ICE_R11
// ---------------------------------------------------------------------------------------------------------------------
// Round 11 ice (default; ?ice=r10 compiles the round-10 main below instead). Matched to a Cycles twin of the artist's
// scene (Ice.004: Principled, IOR 1.5, transmission 1, roughness 0.233-1.0 from Noise A, two bumps, tint IceColor at
// every transmission). The rings' rendered section is the SubD-L1 pointed octagon, and most of the look comes from it: a
// face-on ring totally reflects the view inside its roof slopes and pipes the orb's light (outer half) or the sky / lake
// in the ring plane (inner half) to the camera; an edge-on band is a cylinder lens that magnifies the orb behind it and
// turns steeply (dark) at its slopes. Each fragment traces its view ray through that octagon in 2D (radial, axial).
// ---------------------------------------------------------------------------------------------------------------------
uniform mat4 modelMatrix;
uniform vec4 uR11A;      // x far projection depth (m), y facet tilt, z fine-bump strength, w far blur per roughness^2
uniform vec4 uR11B;      // x lobe growth per internal bounce, y reflection gain, z joint depth, w chroma gain
uniform vec4 uR11C;      // x frost-bump strength, y trapped-light level (only with uR11G.x 0), z orb-edge softness, w panorama gain
uniform vec4 uR11D;      // x IOR, y transmitted gain, z diffuse share of frosted transmission, w orb hit gain
uniform vec4 uR11E;      // x 1 = exact trace through the revolved octagon (0 = straight prism in the entry frame), y max blur mip,
                         // z lobe widening of grazing exits, w panorama blur floor for transmitted rays
uniform vec4 uR11F;      // x orb seen through the ice: share of its mean radiance, y mip of its sharp sample, z corner rounding,
                         // w 1 = stop the trace after two exits (the first round-11 batches)
uniform vec4 uR11G;      // x 1 = light still trapped after the trace leaves as frosted transmission (0 = the dim rough panorama
                         // along the last direction), y its lobe roughness, z its gain, w the panorama's share of frosted
                         // transmission (a roughness-1 lobe gathers the sky above, not only the screen behind)
uniform vec4 uR11I;      // cost: x stop the trace when less than this share of the energy is left inside, y max walls (<= 5),
                         // z 1 = that small remainder reuses the last exit's radiance (else it is dropped / looked up as trapped)
uniform vec4 uR11H;      // x 1 = facets from the displacement's own cell plateaus (0 = the smooth tilt field), y their slope gain
                         // (1 = Blender's amplitude), z exit-face tilt gain, w 1 = the exit face's facets from the plateaus too
// Fix round (judge 1: hard-edged "camouflage" islands = per-pixel switches of the trace). Every option 0 = the judged build.
uniform vec4 uR11J;      // x 1 = continuous energy bookkeeping (soft stop; whatever is left inside always leaves as the trapped
                         // lookup, from the fragment), y critical-angle smoothing: Fresnel averaged over +-y x the lobe's alpha,
                         // z corner rounding per lobe footprint (section units per alpha x path / w), w 1 = a bounce widens the
                         // lobe by its incidence (a grazing touch of a wall does not)
uniform vec4 uR11K;      // x 1 = Bump.001's ramp ends filtered at the pixel footprint, y entry corners rounded over this many pixel
                         // footprints, z frost: share of the transmitted light scattered by the fine bump's visible octaves,
                         // w lobe growth scale at face-on entries (1 = uR11B.x everywhere)
uniform vec4 uR11L;      // x share of the light still inside after the last wall that is dropped (Cycles' glossy bounce limit,
                         // 4 in the artist's file: a path that reflects inside more often ends black), y 1 = the critical-angle
                         // smoothing is one-sided (no light leaves beyond the critical angle), z the trapped lookup's
                         // direction: 0 = -V, 1 = the light's last direction inside the ring, w its tilt along the ring's
                         // tangent (x the view's own run along it)
// Fix round, second part (judge 1 findings e / h / d): every option 0 = the first fix-round state.
uniform vec4 uR11M;      // x Cycles' sample_clamp_indirect for the orb seen through or off the ice (limit on r + g + b of the
                         // sample after the ice's throughput; the artist's file: 10; 0 = off), y extra IceColor tint on the
                         // trapped lookup (0..1), z frost: GGX alpha of the fine bump's sub-pixel scatter (everywhere), w frost:
                         // GGX alpha of Bump.001's sub-pixel scatter inside its ramp window (both added to the roughness)
uniform vec4 uR11N;      // x the critical-angle ramp widened by this many times the entry normal's change across the pixel
                         // (pixel-footprint anti-aliasing of the trace's zones), y the wall-corner rounding widened likewise,
                         // z the orb's sharp sample blurred by the lobe's footprint at the orb (scale; 0 = uR11F.y's fixed mip),
                         // w reserved
uniform float uR11Ramp;  // (vertex) width of the step between two cells' heights (Voronoi distance units)
uniform float uDisplace; // (vertex) displacement amplitude (m)
uniform vec4 uPieceCuts; // x, y cut angles of this piece (ring frame, rad), z 1 = piece has cut ends, w 1 = joined
uniform vec3 uR11Tint;   // Blender IceColor
uniform float uOrbRadius;
uniform float uR11Dbg;   // debug view (0 off): 1 orb hit / exit / TIR count, 2 entry / exit face, 3 transmitted, 4 reflected, 5 untinted, 6 flat (masks),
                         // 7 the first exit's orb impact parameter / orb radius (green < 0.15, yellow < 0.35, orange < 0.6, red, blue = no orb)
varying vec3 vRingC;
varying vec3 vRingA;
#ifdef ICE_P4
// P4 ice lane (P3 panel tasks G5 / Q3 / Q4 / Q6 / Q10). ?p4ice=0 compiles none of this: MAIN's program exactly.
uniform vec4 uP4A;  // G5: x Bump.001 ramp-end filter per pixel footprint (MAIN 1.5), y its floor in Noise A units (MAIN 0.004),
                    // z octave fade start in cycles per pixel, gone at 2 z (MAIN 0.3), w the trace's finest octave in px (MAIN 2)
uniform vec4 uP4B;  // Q3: x / y roughness ramp lo / hi (MAIN 0.233 / 1), z Noise A stretched along the ring this many times
                    // (0 = MAIN's isotropic noise), w 1 = the noise values band-limited like their gradients (G5; MAIN 0)
uniform vec4 uP4C;  // Q4: x indirect clamp scale on direct orb paths (MAIN 1), y their lobe floor (MAIN 0.012), z orb-through
                    // variation (MAIN 0), w periwinkle hue of the orb's light inside the ice (MAIN 0)
uniform vec4 uP4D;  // Q6: x 1 = cut caps traced from their own plane (MAIN 0), y joint seam width (m, MAIN 0.012), z cap edge
                    // chamfer width (section units, 0 off), w cap glint gain
uniform vec4 uP4E;  // Q10, reached at full hold (uHold 1): x face-on lobe growth (MAIN uR11K.w), y TIR smoothing scale of the
                    // one-bounce paths (MAIN 1), z transmitted gain (MAIN uR11D.y), w chroma gain (MAIN uR11B.w)
uniform vec4 uP4F;  // Q10: x orb share of the grazing reflection tinted by IceColor (MAIN 0), y steel-blue inner rim line,
                    // z spare (the crack sheets were dropped in the fix round: invisible in every judged pose, F4), w ice-only
                    // blue cast (all MAIN 0)
uniform vec4 uP4G;  // Q4 / Q10: x orb-through gain at full hold (MAIN 1), y facet glint gain at full hold (MAIN 0), z the mean's share
                    // of the orb seen along a direct path (MAIN uR11F.x 0.3), w spare
uniform vec4 uP4H;  // Q3: x / y the trace's own roughness ramp lo / hi (MAIN = the material roughness, 0.233 / 1); G5 fix round:
                    // z the critical-angle ramp's width at full hold, every wall (MAIN 1), w spare
uniform vec4 uP4I;  // Q10 scrape streaks: x the fine bump's Noise B stretched along the ring this many times (0 = MAIN's isotropic
                    // noise), y / z / w spare
uniform vec4 uP4J;  // Q6 fix round, joints: x 1 = V profile (0 = the round-1 / MAIN collar formula with uP4D.y metres), y its depth
                    // share, z spare, w bright far-wall line gain
uniform float uHold;
float gP4Direct = 0.0;  // 1 while the trace looks up a first exit after <= 1 internal wall (Q4)
float gP4OrbMod = 1.0;  // orb-through modulation after the clamp (Q4: variation, hold charge)

// Value noise (chunks noised) on a lattice periodic in x with an integer period: Noise A along the ring has no seam at +-pi.
vec4 p4NoisedP(vec3 x, float per) {
  vec3 i = floor(x);
  vec3 w = fract(x);
  vec3 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
  vec3 du = 30.0 * w * w * (w * (w - 2.0) + 1.0);
  float i0 = mod(i.x, per), i1 = mod(i.x + 1.0, per);
  float a = hash13(vec3(i0, i.y, i.z));
  float b = hash13(vec3(i1, i.y, i.z));
  float c = hash13(vec3(i0, i.y + 1.0, i.z));
  float d = hash13(vec3(i1, i.y + 1.0, i.z));
  float e = hash13(vec3(i0, i.y, i.z + 1.0));
  float f = hash13(vec3(i1, i.y, i.z + 1.0));
  float g = hash13(vec3(i0, i.y + 1.0, i.z + 1.0));
  float h = hash13(vec3(i1, i.y + 1.0, i.z + 1.0));
  float k0 = a, k1 = b - a, k2 = c - a, k3 = e - a;
  float k4 = a - b - c + d, k5 = a - c - e + g, k6 = a - b - e + f;
  float k7 = -a + b + c - d + e - f - g + h;
  float v = k0 + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z;
  vec3 g3 = du * vec3(
    k1 + k4 * u.y + k6 * u.z + k7 * u.y * u.z,
    k2 + k5 * u.z + k4 * u.x + k7 * u.z * u.x,
    k3 + k6 * u.x + k5 * u.y + k7 * u.x * u.y);
  return vec4(v * 2.0 - 1.0, 2.0 * g3);
}
#endif

// Octagon edges: outward normal (x radial, y axial) and offset h (n.q <= h inside), in units of the radial half-width.
const vec3 R11_OCT[8] = vec3[8](
  vec3(0.98404, 0.17791, 0.98404), vec3(0.61500, 0.78855, 1.63782),
  vec3(-0.61500, 0.78855, 1.63782), vec3(-0.98404, 0.17791, 0.98404),
  vec3(-0.98404, -0.17791, 0.98404), vec3(-0.61500, -0.78855, 1.63782),
  vec3(0.61500, -0.78855, 1.63782), vec3(0.98404, -0.17791, 0.98404));

// Shading normal of edge i at q: the two side faces of each wall are smooth-shaded (Smooth by Angle 30 deg: they meet at
// 20.4 deg), so their normal turns from radial at mid-depth to the face's own +-10.25 deg at the slope edge; the four
// slopes are flat.
vec2 r11OctNormalRaw(int i, vec2 q) {
  if (i == 1 || i == 2 || i == 5 || i == 6) return R11_OCT[i].xy;
  float a = 0.1789 * clamp(q.y / 1.510, -1.0, 1.0);
  return vec2((i == 0 || i == 7) ? cos(a) : -cos(a), sin(a));
}
// The real corners (side face / slope 28 deg, slope / slope at the apex 75.6 deg) rounded over uR11F.z (section units):
// with sharp corners the first exit flipped between two walls along iso-lines of the facet field, drawing closed
// contour lines (batch s18-s19); in Cycles the lumpy displaced corners and the rough lobe break them up.
vec2 r11OctNormalW(int i, vec2 q, float width) {
  vec2 n = r11OctNormalRaw(i, q);
  if (width <= 0.0) return n;
  int ia = (i + 7) % 8, ib = (i + 1) % 8;
  // walls 7 / 0 and 3 / 4 are the smooth-shaded halves of one side face: no corner between them
  bool ca = !((i == 0 && ia == 7) || (i == 4 && ia == 3));
  bool cb = !((i == 7 && ib == 0) || (i == 3 && ib == 4));
  float da = R11_OCT[ia].z - dot(R11_OCT[ia].xy, q);
  float db = R11_OCT[ib].z - dot(R11_OCT[ib].xy, q);
  float ka = ca ? 0.5 * (1.0 - smoothstep(0.0, width, da)) : 0.0;
  float kb = cb ? 0.5 * (1.0 - smoothstep(0.0, width, db)) : 0.0;
  return normalize(n * (1.0 - ka - kb) + R11_OCT[ia].xy * ka + R11_OCT[ib].xy * kb);
}
vec2 r11OctNormal(int i, vec2 q) { return r11OctNormalW(i, q, uR11F.z); }

// Cycles' fresnel_dielectric_cos (unpolarised), eta = n_transmitted / n_incident.
float r11Fresnel(float cosi, float eta) {
  float c = abs(cosi);
  float g2 = eta * eta - 1.0 + c * c;
  if (g2 <= 0.0) return 1.0;
  float g = sqrt(g2);
  float a = (g - c) / (g + c);
  float b = (c * (g + c) - 1.0) / (c * (g - c) + 1.0);
  return 0.5 * a * a * (1.0 + b * b);
}

// The displacement's height field (ICE_VERT r11Plateau: Voronoi F1 cell colour, scale 5 / 1.975 per metre, steps spread over
// uR11Ramp) and its analytic gradient per metre: flat plateaus inside the cells, ramps along their borders. Its slope is
// the smooth-shaded displaced SubD-L1 surface's tilt in Cycles: calm windows inside the cells, chiselled ridges between.
vec4 r11PlateauGrad(vec3 p) {
  const float S = 5.0 / 1.975;
  vec3 x = p * S;
  vec3 ip = floor(x);
  vec3 f = fract(x);
  float d1 = 8.0, d2 = 8.0;
  vec3 c1 = ip, c2 = ip, r1 = vec3(0.0), r2 = vec3(0.0);
  for (int k = -1; k <= 1; k++)
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec3 b = vec3(float(i), float(j), float(k));
    vec3 r = b + hash33(ip + b) - f;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; c2 = c1; r2 = r1; d1 = d; c1 = ip + b; r1 = r; }
    else if (d < d2) { d2 = d; c2 = ip + b; r2 = r; }
  }
  float D1 = sqrt(d1), D2 = sqrt(d2);
  float h1 = luma(hash33(c1 + 17.31));
  float h2 = luma(hash33(c2 + 17.31));
  float t = clamp((D2 - D1) / uR11Ramp, 0.0, 1.0);
  float k = t * t * (3.0 - 2.0 * t);
  float dk = 6.0 * t * (1.0 - t) / uR11Ramp;
  vec3 gE = r1 / max(D1, 1e-5) - r2 / max(D2, 1e-5);
  return vec4(mix(0.5 * (h1 + h2), h1, k) - 0.5, 0.5 * (h1 - h2) * dk * S * gE);
}

// The copies are soft-kneed above 0.8 (RenderPipeline, for the orb and the shards); the ice undoes it per sample.
vec3 r11Copy(vec2 uv, float lod) {
  vec3 c = textureLod(uRefraction, clamp(uv, vec2(0.001), vec2(0.999)), lod).rgb;
  float m = max(max(c.r, c.g), c.b);
  return m > 0.8 ? c * (m / 0.8) : c;
}

// Fine bump (Noise B: scale 4 local, detail 8, roughness 0.8) and frost bump (Bump.001 on Noise A's ramp) gradients,
// per metre, octaves faded out below the pixel footprint (they would only alias; Cycles averages them into roughness).
vec3 r11FbmGrad(vec3 x, float freq, float gain, int octaves, float pix, float lowPix, out float val, out vec3 gLow) {
  vec3 g = vec3(0.0);
  gLow = vec3(0.0);
  float a = 1.0, f = freq, s = 0.0;
  val = 0.0;
  mat3 m = mat3(1.0);
  vec3 y = x * freq;
  for (int i = 0; i < 7; i++) {
    if (i >= octaves) break;
    vec4 n = noised(y);
    float fade = 1.0 - smoothstep(0.3, 0.6, f * pix);
    val += a * n.x;
    g += a * fade * f * (m * n.yzw);
    gLow += a * (1.0 - smoothstep(0.3, 0.6, f * lowPix)) * f * (m * n.yzw);
    s += a;
    a *= gain;
    f *= 2.02;
    y = RX_OCT * y * 2.02;
    m = RX_OCT_INV * m;
  }
  val = 0.5 + 0.5 * val / s;
  gLow *= 0.5 / s;
  return 0.5 * g / s;
}

#ifdef ICE_P4
// G5: r11FbmGrad with the octave fade starting at fLo cycles per pixel (gone at 2 fLo; MAIN 0.3), and with vBand 1 the value
// band-limited too (MAIN sums every octave's value at full weight: Noise A's finest octaves switched roughness / the bump
// window at 2-3 px and boiled while the rings turned). fLo 0.3, vBand 0 = r11FbmGrad.
vec3 p4FbmGrad(vec3 x, float freq, float gain, int octaves, float pix, float lowPix, float fLo, float vBand, out float val, out vec3 gLow) {
  vec3 g = vec3(0.0);
  gLow = vec3(0.0);
  float a = 1.0, f = freq, s = 0.0;
  val = 0.0;
  mat3 m = mat3(1.0);
  vec3 y = x * freq;
  for (int i = 0; i < 7; i++) {
    if (i >= octaves) break;
    vec4 n = noised(y);
    float fade = 1.0 - smoothstep(fLo, 2.0 * fLo, f * pix);
    val += a * mix(1.0, fade, vBand) * n.x;
    g += a * fade * f * (m * n.yzw);
    gLow += a * (1.0 - smoothstep(fLo, 2.0 * fLo, f * lowPix)) * f * (m * n.yzw);
    s += a;
    a *= gain;
    f *= 2.02;
    y = RX_OCT * y * 2.02;
    m = RX_OCT_INV * m;
  }
  val = 0.5 + 0.5 * val / s;
  gLow *= 0.5 / s;
  return 0.5 * g / s;
}
// Q3: Noise A in ring coordinates (arc length / S, rho - R, axial), so its clear / frosted patches stretch S times along the
// ring (streaks, not isotropic cloud blobs). The lattice is periodic in theta (an integer cell count per revolution), octaves
// double exactly. Same outputs as p4FbmGrad: value, gradient per metre in the ring frame (gLow: the trace's octaves).
vec3 p4FbmRing(vec3 pr, float freq, float S, float gain, int octaves, float pix, float lowPix, float fLo, float vBand, out float val, out vec3 gLow) {
  float rho = max(length(pr.xy), 1e-4);
  float th = atan(pr.y, pr.x);
  float per = max(floor(6.2831853 * uSectionRadius * freq / S + 0.5), 1.0);
  vec3 ex = vec3(-pr.y, pr.x, 0.0) * (per / (6.2831853 * rho * rho));
  vec3 ey = vec3(pr.xy / rho, 0.0) * freq;
  vec3 ez = vec3(0.0, 0.0, freq);
  vec3 y = vec3(th * (per / 6.2831853) + uSeed * 7.0, (rho - uSectionRadius) * freq + 4.0 + uSeed * 13.7, pr.z * freq + 4.0 - uSeed * 5.3);
  vec3 g = vec3(0.0);
  gLow = vec3(0.0);
  float a = 1.0, f = freq, k = 1.0, s = 0.0;
  val = 0.0;
  for (int i = 0; i < 7; i++) {
    if (i >= octaves) break;
    vec4 n = p4NoisedP(y, per * k);
    float fade = 1.0 - smoothstep(fLo, 2.0 * fLo, f * pix);
    vec3 gp = k * (n.y * ex + n.z * ey + n.w * ez);
    val += a * mix(1.0, fade, vBand) * n.x;
    g += a * fade * gp;
    gLow += a * (1.0 - smoothstep(fLo, 2.0 * fLo, f * lowPix)) * gp;
    s += a;
    a *= gain;
    f *= 2.0;
    k *= 2.0;
    y = y * 2.0 + vec3(0.37, 1.71, 3.13);
  }
  val = 0.5 + 0.5 * val / s;
  gLow *= 0.5 / s;
  return 0.5 * g / s;
}
#endif
// Share of a Gaussian lobe of width sig (rad) around D, from X, that a sphere (centre C, the orb's radius) covers.
float r11Cover(vec3 X, vec3 D, vec3 C, float sig) {
  vec3 oc = C - X;
  float dc = max(length(oc), uOrbRadius * 1.001);
  float beta = asin(uOrbRadius / dc);
  float th = acos(clamp(dot(oc, D) / dc, -1.0, 1.0));
  return (1.0 - exp(-beta * beta / (2.0 * sig * sig))) * exp(-pow(max(th - beta, 0.0), 2.0) / (2.0 * sig * sig));
}
// The orb's mean radiance over its disc (the copy, un-kneed, at the mip that averages the disc).
vec3 r11OrbMean() {
  vec2 oUv = projectUv(uOrbCenter);
  vec2 eUv = projectUv(uOrbCenter + vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]) * uOrbRadius);
  return r11Copy(oUv, log2(max(length((eUv - oUv) * uRefractionSize), 1.0)) + 0.5);
}
// Cycles' sample_clamp_indirect (the artist's file: 10, forensics 1.3): a path that reaches the orb's plasma through or off
// the ice is an indirect sample, scaled so that r + g + b of its contribution stays under the limit. thr = the ice's
// throughput on that path. Seen through a band the orb's core (16-32 in the copy) otherwise blew out to white where the
// twin's band reads pale teal (p06 band over the orb, twin linear (0.72, 1.86, 3.05), fix round 2 batch g04).
vec3 r11ClampOrb(vec3 c, vec3 thr) {
  if (uR11M.x <= 0.0) return c;
  float s = dot(c * thr, vec3(1.0));
  return s > uR11M.x ? c * (uR11M.x / s) : c;
}
// The orb mirrored in the lake (y = 0, the Cycles water is a mirror): the panorama was rendered without the hero, so rays
// leaving the ice steeply downwards would read its near lake (the zenith's dark blue) where Cycles shows the orb's image.
vec3 r11LakeOrb(vec3 X, vec3 D, vec3 col, float sig) {
  if (D.y < -0.02 && X.y > 0.0) {
    vec3 H = X + D * (-X.y / D.y);
    float cm = r11Cover(H, vec3(D.x, -D.y, D.z), uOrbCenter, sig + 0.03);
    if (cm > 1e-3) col = mix(col, r11ClampOrb(r11OrbMean() * uR11D.w * 0.85, uR11Tint * 0.92), cm);
  }
  return col;
}

float gR11Dmin = -1.0;  // debug 7: the last orb lookup's impact parameter / orb radius
// Radiance arriving along (X, D), world space: the orb (analytic hit, read from the copy at the same impact parameter, so
// its plasma shows), else the copy at a far projection, else the panorama.
vec3 r11Radiance(vec3 X, vec3 D, float rough, float lodFar, out float hitOut) {
  hitOut = 0.0;
  // (The floor uR11E.w: the panorama's clouds stayed legible through the bands next to the orb at 0.18, batch s18.)
  vec3 col = envRadiance(D, max(rough, uR11E.w)) * uR11C.w;
  if (uReflectionPass > 0.5) return col;
  vec3 Xf = X + D * uR11A.x;
  vec4 clip = projectionMatrix * viewMatrix * vec4(Xf, 1.0);
  if (clip.w > 0.0) {
    vec2 uv = clip.xy / clip.w * 0.5 + 0.5;
    vec2 e = min(uv, 1.0 - uv);
    float inF = smoothstep(0.0, 0.04, min(e.x, e.y));
    // Where the camera's line of sight to the far point crosses the orb, the copy shows the orb, not what this ray sees.
    float occl = 0.0;
    if (uRingSplit.x < 0.5) {
      vec3 cv = normalize(Xf - cameraPosition);
      vec3 co = uOrbCenter - cameraPosition;
      float tca = dot(co, cv);
      float dd = sqrt(max(dot(co, co) - tca * tca, 0.0));
      occl = tca > 0.0 ? 1.0 - smoothstep(uOrbRadius * 0.98, uOrbRadius * 1.2, dd) : 0.0;
    }
    col = mix(col, r11Copy(uv, lodFar), inF * (1.0 - occl));
  }
  // The orb, through the ice's roughness lobe: the share of a Gaussian lobe (width from the roughness) that the orb's disc
  // covers. Clear ice sees it only straight through (sharp, at the same impact parameter, so its plasma shows); frosted ice
  // (roughness up to 1) gathers it from a wide cone, the twin's teal orb light on rings B / C / D (20-28 % at q00).
  // The far half of the cage is drawn before the orb (its copy has no orb, and the orb lies in front of it).
  if (uRingSplit.x < 0.5) {
#ifdef ICE_P4
    float sig = mix(0.012, uP4C.y, gP4Direct) + uR11C.z * rough * rough;
#else
    float sig = 0.012 + uR11C.z * rough * rough;
#endif
    col = r11LakeOrb(X, D, col, sig);
    vec3 oc = uOrbCenter - X;
    float dc = max(length(oc), uOrbRadius * 1.001);
    float beta = asin(uOrbRadius / dc);
    float cov = r11Cover(X, D, uOrbCenter, sig);
    if (cov > 1e-3) {
      vec2 oUv = projectUv(uOrbCenter);
      vec3 Vo = normalize(cameraPosition - uOrbCenter);
      float tc = max(dot(oc, D), 0.0);
      float dmin = min(sqrt(max(dot(oc, oc) - tc * tc, 0.0)), uOrbRadius);
      vec3 off = X + D * tc - uOrbCenter;
      off -= Vo * dot(off, Vo);
      float ol = length(off);
      vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
      vec3 side = ol > 1e-4 ? off / ol : up;
      vec2 eUv = projectUv(uOrbCenter + side * uOrbRadius);
      gR11Dmin = dmin / uOrbRadius;
      vec2 sUv = oUv + (eUv - oUv) * min(dmin / uOrbRadius, 0.97);
      float rTex = length((eUv - oUv) * uRefractionSize);
      // (Fix round 2, uR11N.z: the lobe's footprint at the orb, sig x distance, in copy texels sets the mip of the sharp sample;
      // at uR11F.y's fixed 0.5 the plasma's thin sheets showed through the bands as hard 1-px lines, judge 1 (a) / (b).)
      float lodS = uR11N.z > 0.0 ? max(uR11F.y, log2(max(uR11N.z * sig * dc / uOrbRadius * rTex, 1.0))) : uR11F.y;
      vec3 sharpL = r11Copy(sUv, lodS);
      vec3 meanL = r11OrbMean();
      // (uR11F.x: Cycles' band lens magnifies the orb ~3.7x, so its plasma reads as an even glow through the ice, not as
      // tongues at their own scale, batch s19.)
#ifdef ICE_P4
      // (Q4: a direct path keeps more of the orb's sharp sample - its plasma structure - than the 0.3 share of the mean.)
      float dK = gP4Direct * (1.0 - smoothstep(0.45, 0.75, dmin / uOrbRadius));
      vec3 orbL = mix(sharpL, meanL, max(mix(uR11F.x, uP4G.z, dK), smoothstep(0.25, 1.2, sig / beta)));
#else
      vec3 orbL = mix(sharpL, meanL, max(uR11F.x, smoothstep(0.25, 1.2, sig / beta)));
#endif
#ifdef ICE_P4
      // (Q4: a direct path - first exit after <= 1 internal wall, through the orb's inner 0.45-0.75 radii - is clamped at
      // uP4C.x x the indirect limit: Cycles clamps each sample, and a straight path's samples stay together, so the band over
      // the orb keeps its lift and its structure. The ramp keeps the switch continuous. Then the orb's light keeps a
      // periwinkle hue inside the ice (luma-neutral) and its variation / hold charge, gP4OrbMod.)
      vec3 thrO = uR11Tint * 0.92;
      float lim = uR11M.x * mix(1.0, uP4C.x, dK);
      vec3 cO = orbL * uR11D.w;
      float sO = dot(cO * thrO, vec3(1.0));
      if (uR11M.x > 0.0 && sO > lim) cO *= lim / sO;
      cO *= mix(vec3(1.0), vec3(1.0325, 0.9808, 1.0944), uP4C.w) * gP4OrbMod;
      col = mix(col, cO, cov);
#else
      col = mix(col, r11ClampOrb(orbL * uR11D.w, uR11Tint * 0.92), cov);
#endif
      hitOut = cov;
    }
  }
  return col;
}

// The glossy reflection: the panorama (captured at the orb centre without the hero, so it has no orb) plus the orb itself
// through the reflection lobe; the rings' inner rims face the orb at grazing angles, where Fresnel is high.
vec3 r11Reflect(vec3 X, vec3 R, float rough) {
  vec3 col = envRadiance(R, rough) * uR11B.y;
  if (uReflectionPass < 0.5 && uRingSplit.x < 0.5) {
    float sig = 0.02 + 2.0 * uR11C.z * rough * rough;
    col = r11LakeOrb(X, R, col, sig);
    float cov = r11Cover(X, R, uOrbCenter, sig);
#ifdef ICE_P4
    // (Q10: the orb seen in the grazing reflection tinted by IceColor, luma kept: MAIN's untinted mean drew the uniform mint
    // rim, q03 B-G 5-14 vs F045's neutral 19-24.)
    vec3 tR = mix(vec3(1.0), uR11Tint / dot(uR11Tint, vec3(0.2126, 0.7152, 0.0722)), uP4F.x);
    if (cov > 1e-3) col = mix(col, r11ClampOrb(r11OrbMean() * uR11D.w, vec3(1.0)) * tR, cov);
#else
    if (cov > 1e-3) col = mix(col, r11ClampOrb(r11OrbMean() * uR11D.w, vec3(1.0)), cov);
#endif
  }
  return col;
}

// The first wall of the revolved octagon that the ray (P, d) leaves through. The walls are surfaces of revolution about
// the ring axis (cones and cylinders: n_x (r - R) + n_y a = h w, r = distance from the axis), so the straight 3D ray is
// followed exactly (its section is a hyperbola, not a line): a ray running along a curving band meets the inner wall at
// a growing angle and is piped along the ring, as in Cycles (the straight-prism trace let it out as a clear window).
// One quadratic per wall; returns the distance (m) and the wall index, or -1 when no wall is ahead.
float r11Wall(vec3 P, vec3 d, vec3 C, vec3 ea, float R, float w, out int fi) {
  vec3 rel = P - C;
  float a0 = dot(rel, ea);
  vec3 p0 = rel - ea * a0;
  float va = dot(d, ea);
  vec3 v = d - ea * va;
  float pp = dot(p0, p0), pv = dot(p0, v), vv = dot(v, v);
  float best = 1e9;
  fi = -1;
  for (int i = 0; i < 8; i++) {
    vec3 e = R11_OCT[i];
    float nx2 = e.x * e.x;
    float g0 = e.z * w + e.x * R - e.y * a0;
    float g1 = -e.y * va;
    float A = nx2 * vv - g1 * g1;
    float B = nx2 * pv - g0 * g1;
    float Cq = nx2 * pp - g0 * g0;
    float D = B * B - A * Cq;
    if (D < 0.0) continue;
    float qq = -(B + (B >= 0.0 ? 1.0 : -1.0) * sqrt(D));
    vec2 ts = vec2(abs(A) > 1e-9 ? qq / A : 1e9, abs(qq) > 1e-12 ? Cq / qq : 1e9);
    for (int k = 0; k < 2; k++) {
      float t = ts[k];
      if (t < 1e-3 || t >= best) continue;
      float g = g0 + g1 * t;
      if (g * e.x < 0.0) continue;  // the mirror branch (n_x r = -g)
      float r = sqrt(max(pp + (2.0 * pv + vv * t) * t, 1e-12));
      if (e.x * (pv + vv * t) / r - g1 <= 0.0) continue;  // entering this wall's half-space, not leaving it
      best = t;
      fi = i;
    }
  }
  return fi < 0 ? -1.0 : best;
}

void main() {
#ifdef ICE_SPLIT
  if (uRingSplit.x > 0.5 && vViewZ < uRingSplit.y) discard;
#endif
  vec3 Ng = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  if (dot(Ng, V) < 0.0) Ng = -Ng;
  float ior = uR11D.x;
  mat3 toW = mat3(modelMatrix);

  // ---- the section frame and the entry point on the octagon
  vec3 ea = normalize(vRingA);
  vec3 rel = vWorldPos - vRingC;
  float aW = dot(rel, ea);
  vec3 rv = rel - ea * aW;
  float rW = max(length(rv), 1e-4);
  vec3 er = rv / rW;
  // The octagon's radial half-width from the axial depth (2.077 w): the split rings' radial extent includes their creased
  // end caps (+6.5 %). Measured: A 0.2029, B 0.1656, C 0.1325, D 0.1060 m, the forensics' values.
  float w = max(uSectionHalf.y / 2.077, 1e-3);
  float ky = 1.0;
  vec2 qf = vec2((rW - uSectionRadius) / w, aW / (w * ky));
  vec2 vel = vec2(dot(-V, er) / w, dot(-V, ea) / (w * ky));  // section velocity of the view ray, per metre
#ifdef ICE_P4
  // Q6: a fragment on a cut cap of a piece that has left its rest place. The cap is the piece's planar cut face; MAIN shaded it
  // as the revolved octagon's wall the view would have entered by (the entry moved back onto the infinite tube, outside the
  // piece), i.e. as a continuation of the curved tube: the domed 'bone' ends. capK 1 = enter through the cap's own plane.
  float capK = 0.0;
  vec3 capN = Ng;
  if (uP4D.x > 0.5 && uPieceCuts.z > 0.5 && uPieceCuts.w < 0.999) {
    vec3 tW = normalize(cross(ea, er));
    float dCut = 1e9;
    for (int c = 0; c < 2; c++) {
      float ang = c == 0 ? uPieceCuts.x : uPieceCuts.y;
      vec3 nc = normalize(toW * vec3(-sin(ang), cos(ang), 0.0));
      vec3 rc = toW * vec3(cos(ang), sin(ang), 0.0);
      if (dot(rel, rc) <= 0.0) continue;
      float dc0 = abs(dot(rel, nc));
      if (dc0 < dCut) { dCut = dc0; capN = dot(nc, V) >= 0.0 ? nc : -nc; }
    }
    capK = smoothstep(0.75, 0.92, abs(dot(Ng, tW))) * (1.0 - smoothstep(0.03, 0.06, dCut));
  }
#endif
  int face = 0;
  vec2 qe = qf;
  float sEnt = 0.0;  // distance (m) from the fragment to the analytic octagon's entry point along the view ray
  {
    float sIn = -1e9, sOut = 1e9, worst = -1e9;
    int fIn = 0, fW = 0;
    for (int i = 0; i < 8; i++) {
      vec3 e = R11_OCT[i];
      float dn = dot(e.xy, vel);
      float o = e.z - dot(e.xy, qf);
      if (-o > worst) { worst = -o; fW = i; }
      if (dn < -1e-5) {
        float s = o / dn;
        if (s > sIn) { sIn = s; fIn = i; }
      } else if (dn > 1e-5) {
        sOut = min(sOut, o / dn);
      } else if (o < 0.0) {
        sOut = -1e9;
      }
    }
    if (sIn <= sOut && sIn > -1e8) {
      face = fIn;
      qe = qf + vel * sIn;
      sEnt = sIn;
    } else {
      face = fW;
    }
  }
  // (Fix round: the entry corners rounded over uR11K.y pixel footprints, so the entry face never switches inside a pixel.)
  float pixE = max(length(fwidth(vWorldPos)), 1e-4);
  vec2 n2 = r11OctNormalW(face, qe, uR11F.z + uR11K.y * pixE / w);
  vec3 Nmac = normalize(n2.x * er + (n2.y / ky) * ea);
  // Keep the entry face towards the camera (the fallback face of a ray that misses the octagon may not be).
  Nmac = normalize(mix(Ng, Nmac, smoothstep(0.02, 0.15, dot(Nmac, V))));
#ifdef ICE_P4
  float capEdge = 0.0;
  if (capK > 0.0) {
    // The cap's own plane, entered at the fragment (the trace below follows the ray inside the revolved octagon from there).
    vec3 Nc = capN;
    if (uP4D.z > 0.0) {
      // A narrow chamfer along the cap's octagon outline: the normal turns towards the nearest wall (a crisp bright edge).
      float dW = 1e9;
      int iW = 0;
      for (int i = 0; i < 8; i++) {
        float o = R11_OCT[i].z - dot(R11_OCT[i].xy, qf);
        if (o < dW) { dW = o; iW = i; }
      }
      vec3 nWc = normalize(R11_OCT[iW].x * er + R11_OCT[iW].y * ea);
      capEdge = 1.0 - smoothstep(0.0, uP4D.z, dW);
      Nc = normalize(mix(Nc, nWc, 0.5 * capEdge));
      if (dot(Nc, V) < 0.05) Nc = capN;
    }
    Nmac = normalize(mix(Nmac, Nc, capK));
    sEnt *= 1.0 - capK;
    qe = mix(qe, qf, capK);
  }
#endif

  // ---- frost (Blender's roughness ramp), facets, bumps
  vec3 p = vObjPos + uSeed * 13.7;
  float pix = max(length(fwidth(vWorldPos)), 1e-4);
  float nA;
  vec3 gALow;
  // (The trace follows the smooth part of the surface: octaves finer than ~0.12 m flip refraction / total reflection per
  // pixel, which Cycles averages over its samples. They shade the reflection and nudge the exit ray instead.)
  // (Fix round, uR11K.z > 0: the trace sees Bump.001's octaves down to uR11K.z metres (at least two pixel footprints), not
  // only those above 0.12 m. Blender's frost bump tilts the normal by ~13 deg at every scale, so in Cycles the path inside
  // the ice changes at the frost's own scale: that is the twin's cloudy, granular transmission, judge 1 finding (d). With
  // the continuous trace above, those changes are soft, not islands.)
#ifdef ICE_P4
  // (G5: the trace's finest octave at uP4A.w pixel footprints, octaves faded from uP4A.z cycles per pixel, values band-limited
  // with uP4B.w. Q3: Noise A stretched along the ring, uP4B.z; the roughness ramp compressed to uP4B.x .. y.)
  float lowPixT = uR11K.z > 0.0 ? max(uR11K.z, uP4A.w * pix) : 0.12;
  vec3 gA = uP4B.z > 0.0
    ? p4FbmRing(vObjPos, 4.2 / 1.975, uP4B.z, 0.5, FROST_OCTAVES, pix, lowPixT, uP4A.z, uP4B.w, nA, gALow)
    : p4FbmGrad(p + 4.0 / (4.2 / 1.975), 4.2 / 1.975, 0.5, FROST_OCTAVES, pix, lowPixT, uP4A.z, uP4B.w, nA, gALow);
  float frostLin = clamp((nA - 0.5423) / (0.7657 - 0.5423) + (uFrost - 0.6) * 0.8, 0.0, 1.0);
  float rough = mix(uP4B.x, uP4B.y, frostLin);
  // (The trace's lobe keeps its own, narrower ramp: with the compressed material roughness (floor 0.45) its critical-angle
  // ramp and lobe growth washed out the oblique bands' dark steel-blue TIR zones, q03 outer ring lf 20 -> 10 vs F045 23.5.)
  float roughT = mix(uP4H.x, uP4H.y, frostLin);
#else
  float lowPixT = uR11K.z > 0.0 ? max(uR11K.z, 2.0 * pix) : 0.12;
  vec3 gA = r11FbmGrad(p + 4.0 / (4.2 / 1.975), 4.2 / 1.975, 0.5, FROST_OCTAVES, pix, lowPixT, nA, gALow);
  float frostLin = clamp((nA - 0.5423) / (0.7657 - 0.5423) + (uFrost - 0.6) * 0.8, 0.0, 1.0);
  float rough = 0.233 + 0.767 * frostLin;
#endif
  // Facets: Cycles displaces the SubD-L1 vertices (cells ~0.4 m, vertices ~0.2 m apart) and smooth-shades the result
  // (the facets meet at less than 30 deg), so the shading normal wanders smoothly by a few degrees at the L1 scale: a
  // smooth tilt field (two value-noise gradients in the object frame, so it moves with the ring). A Voronoi chisel with hard
  // cell borders broke the refraction into hard-edged blotches (round-11 batch 3).
  vec4 t1 = noised(p * (5.0 / 1.975) * 1.6 + 3.7);
  vec4 t2 = noised(RX_OCT * p * (5.0 / 1.975) * 3.3 + 9.1);
  vec3 tiltO = (t1.yzw + 0.5 * t2.yzw) * 0.5;
  vec3 tilt2O = (noised(p * (5.0 / 1.975) * 1.6 + 21.3).yzw + 0.5 * noised(RX_OCT * p * (5.0 / 1.975) * 3.3 + 33.9).yzw) * 0.5;
  vec3 tiltW = toW * tiltO;
#ifdef ICE_P4
  vec3 N = normalize(Nmac + (tiltW - Nmac * dot(tiltW, Nmac)) * (uR11A.y * (1.0 - capK)));
#else
  vec3 N = normalize(Nmac + (tiltW - Nmac * dot(tiltW, Nmac)) * uR11A.y);
#endif
  if (uR11H.x > 0.5) {
    // (Round-11 batch s28: the smooth tilt field drew rounded "liquid" blotches; the twin's facets are the plateaus.)
    vec3 gS = toW * r11PlateauGrad(p).yzw * (uDisplace * uR11H.y);
    N = normalize(Nmac - (gS - Nmac * dot(gS, Nmac)));
  }
  vec3 Nf = N;
  // Bump.001 (strength 0.2) on Noise A's ramp 0.468 -> 0 .. 0.773 -> 0.222, then the fine Bump (0.06) on Noise B.
  // (Fix round, uR11K.x: the ramp's ends filtered at the pixel footprint. Unfiltered, the frost bump switched on and off along
  // Noise A's iso-lines, which drew closed "drop" outlines and contour lines through the trace, judge 1 finding (d).)
#ifdef ICE_P4
  float fwA = fwidth(nA) * uP4A.x + uP4A.y;
#else
  float fwA = fwidth(nA) * 1.5 + 0.004;
#endif
  float rampK = uR11K.x > 0.5
    ? (0.222 / 0.305) * (smoothstep(0.468 - fwA, 0.468 + fwA, nA) - smoothstep(0.773 - fwA, 0.773 + fwA, nA))
    : ((nA > 0.468 && nA < 0.773) ? 0.222 / 0.305 : 0.0);
  vec3 gH1 = toW * gA * rampK;
  vec3 gH1L = toW * gALow * rampK;
  float nB;
  vec3 gBLow;
#ifdef ICE_P4
  // (Q10: F000's fine horizontal scrape streaks: the fine bump's Noise B in ring coordinates, stretched uP4I.x times along the
  // ring; band-limited like every octave here, so its finest surviving streaks are 3-7 px wide.)
  vec3 gB = toW * (uP4I.x > 0.0
    ? p4FbmRing(vObjPos + 11.0 * vec3(0.0, 0.0, 1.0), 4.0 / 1.975, uP4I.x, 0.8, FINE_OCTAVES + 2, pix, 0.12, uP4A.z, uP4B.w, nB, gBLow)
    : p4FbmGrad(p * 1.0 + 11.0, 4.0 / 1.975, 0.8, FINE_OCTAVES + 2, pix, 0.12, uP4A.z, uP4B.w, nB, gBLow));
#else
  vec3 gB = toW * r11FbmGrad(p * 1.0 + 11.0, 4.0 / 1.975, 0.8, FINE_OCTAVES + 2, pix, 0.12, nB, gBLow);
#endif
  vec3 Ntr = normalize(mix(N, normalize(N - (gH1L - N * dot(gH1L, N))), uR11C.x));
  vec3 Nb1 = normalize(N - (gH1 - N * dot(gH1, N)));
  N = normalize(mix(N, Nb1, uR11C.x));
  vec3 Nb2 = normalize(N - (gB - N * dot(gB, N)));
  N = normalize(mix(N, Nb2, uR11A.z));
  // (Fix round 2, uR11M.z / w: frost as roughness. Cycles averages the bumps' octaves finer than a pixel over its samples:
  // Bump.001 (strength 0.2 on Noise A's ramp, its tilt saturates at ~14 deg inside the ramp window) and the fine Bump (0.06
  // on Noise B, ~3.7 deg everywhere) spread every interface's lobe like GGX alphas of about 0.25 and 0.065. That spread is
  // what makes the twin's bands read frosted (matte, cloudy) where the trace read wet glass, judge 1 finding (d); it also
  // widens the critical-angle ramp, so the trace's zones meet softly. Combined with the material roughness in quadrature
  // (alpha = roughness^2).)
  if (uR11M.z > 0.0 || uR11M.w > 0.0) {
    float aB = uR11M.w * rampK / (0.222 / 0.305);
    float a2 = rough * rough * rough * rough + aB * aB + uR11M.z * uR11M.z;
    rough = min(sqrt(sqrt(a2)), 1.0);
  }
  if (dot(N, V) < 0.02) N = normalize(N + V * (0.02 - dot(N, V)));
  if (dot(Ntr, V) < 0.02) Ntr = normalize(Ntr + V * (0.02 - dot(Ntr, V)));
  float NdotV = saturate(dot(N, V));

  // ---- the trace: refract in, then at every wall split into the refracted part (looked up) and the Fresnel-reflected
  // part (followed), up to 5 walls or until less than 3 % of the energy is left inside; near the critical angle the split
  // is continuous, as in Cycles (no pixel flips).
  float lodFar = clamp(log2(1.0 + uR11A.w * rough * rough), 0.0, uR11E.y);
  vec3 d = refract(-V, Ntr, 1.0 / ior);
  vec3 bumpOff = (N - Ntr) * (1.0 - 1.0 / ior);
  bool revolved = uR11E.x > 0.5;
  vec3 P = revolved ? vWorldPos - V * sEnt : vWorldPos;
  vec2 q = qe;
  float wIn = 1.0;
  vec3 Lt = vec3(0.0);
  float nTir = 0.0;
  float orbHit = 0.0;
  int fExit = -1;
  int nOut = 0;
  float dmin0 = -1.0;
  vec3 P1 = P;  // end of the first internal segment (for the joints)
  vec3 d1 = d;
  // Every rough interface widens the lobe (a reflection about twice the microfacet spread): light that bounced inside
  // reads a wider, softer cone of the scene (Cycles' internal-reflection zones are soft, not sharp navy bands).
#ifdef ICE_P4
  float rb = roughT;
#else
  float rb = rough;
#endif
  // (Fix round, uR11K.w: lobe growth per bounce scaled to uR11K.w x uR11B.x where the ring faces the camera (view along its
  // axis), uR11B.x where it is seen edge-on or obliquely; 1 = uR11B.x everywhere.)
#ifdef ICE_P4
  // (Q10: the face-on lobe growth eases to uP4E.x in the hold, so the far-wall TIR line and the refracted orb strip stay crisp.)
  float kWh = mix(uR11K.w, uP4E.x, uHold);
  float growB = kWh == 1.0 ? uR11B.x : uR11B.x * mix(1.0, kWh, smoothstep(0.5, 0.85, abs(dot(V, ea))));
  // (Q4: the orb-through term keeps a variation - less behind frosted patches, the fine bump's value - and charges in the hold.)
  gP4OrbMod = mix(1.0, uP4G.x, uHold) * mix(1.0, 1.0 - 0.35 * smoothstep(0.35, 1.0, rough) * uR11D.z + 0.25 * (nB - 0.5), uP4C.z);
#else
  float growB = uR11K.w == 1.0 ? uR11B.x : uR11B.x * mix(1.0, uR11K.w, smoothstep(0.5, 0.85, abs(dot(V, ea))));
#endif
  vec3 lastL = vec3(0.0);
  float wTrap = 0.0;  // energy that stopped inside (uR11J.x): it leaves as the trapped lookup below
  float wOut = 0.0;   // energy that left through the walls so far
  bool noWall = false;
  float cosC = sqrt(max(1.0 - 1.0 / (ior * ior), 0.0));  // cos of the critical angle inside the ice
  // (Fix round 2, uR11N: the entry normal's change across this pixel (rad, outside the loop: uniform control flow). Where the
  // facet field turns fast, a zone of the trace (refracted out / totally reflected, one wall or the next) could start and
  // end inside a pixel: judge 1's dark 2-3 px specks on the hold's arcs (c) and the dotted "zipper" along band edges. Cycles
  // averages such zones over the pixel; widening the ramps by the pixel's own spread of incidence does the same.)
  float pxSpread = (uR11N.x > 0.0 || uR11N.y > 0.0) ? sqrt(dot(dFdx(Ntr), dFdx(Ntr)) + dot(dFdy(Ntr), dFdy(Ntr))) : 0.0;
  for (int b = 0; b < 5; b++) {
    if (float(b) >= uR11I.y) break;
    int fi = 0;
    vec3 nW;
    if (revolved) {
      float s = r11Wall(P, d, vRingC, ea, uSectionRadius, w, fi);
      if (s < 0.0) { noWall = true; break; }
      P += d * s;
      vec3 relH = P - vRingC;
      float aH = dot(relH, ea);
      vec3 rpH = relH - ea * aH;
      float rH = max(length(rpH), 1e-4);
      q = vec2((rH - uSectionRadius) / w, aH / w);
      // (Fix round, uR11J.z: near a corner the rough lobe straddles both walls; its footprint there is about alpha x path.)
      float cw = uR11J.z > 0.0 ? min(uR11F.z + uR11J.z * rb * rb * s / w + uR11N.y * pxSpread * s / w, 0.6) : uR11F.z;
      vec2 m2 = r11OctNormalW(fi, q, cw);
      nW = normalize(m2.x * (rpH / rH) + m2.y * ea);
    } else {
      vec2 dv = vec2(dot(d, er) / w, dot(d, ea) / (w * ky));
      float sMin = 1e9;
      for (int i = 0; i < 8; i++) {
        vec3 e = R11_OCT[i];
        float dn = dot(e.xy, dv);
        if (dn > 1e-5) {
          float s = (e.z - dot(e.xy, q)) / dn;
          if (s < sMin) { sMin = s; fi = i; }
        }
      }
      if (sMin > 1e8) break;  // running along the ring (no section wall ahead in this straight-prism model)
      sMin = max(sMin, 0.0);
      q += dv * sMin;
      P += d * sMin;
      vec2 m2 = r11OctNormal(fi, q);
      nW = normalize(m2.x * er + (m2.y / ky) * ea);
    }
    if (b == 0) {
      P1 = P;
      // The exit wall's own smooth facet field and a little of the fine bump.
      if (uR11H.w > 0.5) {
        vec3 gX = toW * r11PlateauGrad(p + transpose(toW) * (P - vWorldPos)).yzw * (uDisplace * uR11H.y * uR11H.z);
        nW = normalize(nW - (gX - nW * dot(gX, nW)));
      } else {
        vec3 t2W = toW * tilt2O;
        nW = normalize(nW + (t2W - nW * dot(t2W, nW)) * uR11A.y * uR11H.z);
      }
    }
    vec3 dt = refract(d, -nW, ior);
    float ci = dot(d, nW);
    float F = dot(dt, dt) > 1e-6 ? r11Fresnel(ci, 1.0 / ior) : 1.0;
    bool exits = dot(dt, dt) > 1e-6;
    if (uR11J.y != 0.0) {
      // (Fix round, uR11J.y: Cycles' rough interface spreads the incidence over the lobe, so the step from refraction to total
      // reflection at the critical angle is a ramp, not a per-pixel switch: Fresnel averaged over +-dc (1-2-1 taps); light
      // that still leaves just beyond the critical angle leaves grazing.)
      float dc = (uR11J.y > 0.0 ? uR11J.y * rb * rb * 0.667 : -uR11J.y * rough * rough * 0.667) + uR11N.x * pxSpread;
#ifdef ICE_P4
      if (b == 1) dc *= mix(1.0, uP4E.y, uHold);
      // (G5 fix round: in the hold the close-up arcs drew soft outlines along the internal-reflection zones' edges (p05);
      // their ramp widens to uP4H.z x at full hold only, so the idle crawl is untouched.)
      dc *= mix(1.0, uP4H.z, uHold);
#endif
      if (uR11L.y > 0.5) {
        // one-sided (uR11L.y 1): total reflection stays total; below the critical angle the reflected share falls from 1 to
        // Fresnel's over dc, so the step becomes a ramp without leaking light out grazing (that leak lightened the oblique
        // bands' dark internal-reflection zones, batches f02-f04).
        F = mix(1.0, F, smoothstep(cosC, cosC + dc, ci));
      } else {
        F = 0.25 * (r11Fresnel(max(ci - dc, 0.0), 1.0 / ior) + 2.0 * r11Fresnel(ci, 1.0 / ior) + r11Fresnel(min(ci + dc, 1.0), 1.0 / ior));
      }
      if (F < 0.9999 && dot(dt, dt) <= 1e-6) {
        float cE = cosC + 0.003;
        vec3 tg = d - nW * ci;
        float tl = length(tg);
        vec3 dIn = nW * cE + (tl > 1e-5 ? tg / tl : vec3(0.0)) * sqrt(max(1.0 - cE * cE, 0.0));
        dt = refract(dIn, -nW, ior);
      }
      exits = dot(dt, dt) > 1e-6 && F < 0.9999;
    }
    if (exits) {
      float hit;
      // Near the critical angle the exit grazes the wall and its lobe widens like 1 / cos (the refraction's Jacobian):
      // a single ray drew thin contour lines of the facet field there (batch s18); Cycles' rough lobe smears them.
      float gz = 1.0 - abs(dot(normalize(dt), nW));
      float rx = min(rb + uR11E.z * gz * gz * gz, 1.0);
#ifdef ICE_P4
      gP4Direct = b <= 1 ? 1.0 : 0.0;
#endif
      lastL = r11Radiance(P, normalize(normalize(dt) - bumpOff), rx, clamp(log2(1.0 + uR11A.w * rx * rx), 0.0, uR11E.y), hit);
#ifdef ICE_P4
      gP4Direct = 0.0;
#endif
      Lt += wIn * (1.0 - F) * lastL;
      wOut += wIn * (1.0 - F);
      if (nOut == 0) {
        orbHit = hit;
        fExit = fi;
        dmin0 = gR11Dmin;
      }
      nOut++;
    } else {
      nTir += 1.0;
    }
    wIn *= F;
    // Stop on the energy still inside, not on a count of exits: an exit just below the critical angle counted and one just
    // above did not, so the light left over for the trapped term jumped along iso-lines of the facet field (closed contour
    // lines on band A, batches s10-s20). uR11F.w > 0.5 restores the old two-exit stop.
    if (uR11J.x > 0.5) {
      // (Fix round: a soft stop. The share that stops moves to the trapped lookup continuously, so no pixel's light jumps
      // between "one more exit" and "stopped".)
      float cK = smoothstep(0.5 * uR11I.x, 1.5 * uR11I.x, wIn);
      wTrap += wIn * (1.0 - cK);
      wIn *= cK;
      if (wIn < 1e-4) break;
    } else if ((uR11F.w > 0.5 && nOut >= 2) || wIn < uR11I.x) break;
    d = reflect(d, nW);
    // (Fix round, uR11J.w: a wall touched at grazing incidence barely deflects the ray, so it should not widen the lobe; the
    // full growth at every touch made the lookup's blur jump where a ray starts to graze a curved wall.)
    float gG = uR11J.w > 0.5 ? smoothstep(0.0, 0.35, abs(ci)) : 1.0;
#ifdef ICE_P4
    rb = min(sqrt(rb * rb + gG * growB * growB * roughT * roughT), 1.0);
#else
    rb = min(sqrt(rb * rb + gG * growB * growB * rough * rough), 1.0);
#endif
  }
  // What is still inside is light guided along the ring: it leaves somewhere far along it. (The rough panorama along the last
  // direction drew dim islands with hard closed outlines wherever a band's curvature traps the view in a whispering-gallery
  // path, batch s23 debug 1; in Cycles every rough bounce widens the lobe, so that light leaves as frosted transmission of
  // what lies behind the ring, orb included.)
  if (uR11J.x > 0.5) {
    // (Fix round: always, with no threshold and from the fragment, so the result is continuous across pixels whose traces
    // differ by one exit near the critical angle; judge 1's "capsule" and "eyes" on band A were this switch.)
    float hT;
    float rT = uR11G.y;
    // x 2: the light still inside leaves much like the light that already left (the exits' mean), fading to the trapped
    // lookup as the exited share goes to 0 (a pure whispering-gallery path); continuous in both. (x 1 always took the
    // trapped lookup, which lightened the dark internal-reflection zones of the oblique bands, batch f02.)
    float kEx = uR11J.x > 1.5 ? smoothstep(0.0, 0.15, wOut) : 0.0;
    vec3 remL = vec3(0.0);
    // (Cost, fix round 2: where the exits already carry 15 % of the light or more, kEx is exactly 1 and the trapped lookup
    // has no weight in the mix below, so it is skipped: the same output, one r11Radiance less on most pixels.)
    if (kEx < 1.0) {
      // (uR11L.z: light trapped in a band runs along the ring, so it leaves somewhere along it, seeing what lies along the
      // ring's tangent, not straight behind the fragment; 0 = the frosted lookup towards -V. Behind a band in front of the
      // orb, -V saw the orb: the hold's ring B read white, batch f12 / f16.)
      vec3 dRem = normalize(mix(-V, d, uR11L.z));
      // (Fix round 2, uR11L.w: the same idea without the path: towards the ring's tangent, weighted by how far the view
      // already runs along it (continuous where it turns across the view, and it does not change from frame to frame the way
      // the last internal direction does: L.z 1 raised the tumble's motion-compensated residual 4.9 -> 6.8, batch g16).)
      if (uR11L.w > 0.0) {
        vec3 tg = cross(ea, er);
        dRem = normalize(dRem + uR11L.w * tg * dot(tg, -V));
      }
      remL = r11Radiance(vWorldPos, dRem, rT, clamp(log2(1.0 + uR11A.w * rT * rT), 0.0, uR11E.y), hT) * uR11G.z;
      // (Fix round 2, uR11M.y: light that leaves far along the band has mostly crossed more ice on its way: the twin's
      // internal-reflection zones pass the sky behind them as tint^2 (p06 band B left, linear ratio 0.33 / 0.56 / 0.81 vs
      // tint^2 0.42 / 0.69 / 1).)
      remL *= mix(vec3(1.0), uR11Tint, uR11M.y);
    }
    if (uR11J.x > 1.5) remL = mix(remL, Lt / max(wOut, 1e-4), kEx);
    // (uR11L.x: the light still inside after the last wall has reflected inside at least uR11I.y times; Cycles ends such a
    // path at the file's glossy bounce limit (4), so it is dark there. Not when the trace lost its wall: that light is real.)
    Lt += (wTrap + wIn * (noWall ? 1.0 : 1.0 - uR11L.x)) * remL;
  } else if (uR11I.z > 0.5 && nOut > 0) {
    // (Cost, batch s39: after an exit the energy left inside is small; it leaves much like the last exit did.)
    Lt += wIn * lastL;
  } else if (uR11G.x > 0.5) {
    if (wIn > 0.03) {
      float hT;
      float rT = uR11G.y;
      Lt += wIn * r11Radiance(P, -V, rT, clamp(log2(1.0 + uR11A.w * rT * rT), 0.0, uR11E.y), hT) * uR11G.z;
    }
  } else {
    Lt += wIn * envRadiance(d, 1.0) * uR11C.y;
  }
  // Frosted patches (roughness towards 1) transmit nearly diffusely: the light of a wide cone behind the ice, the orb's
  // included, instead of the sharp section path.
  float frostK = smoothstep(0.35, 1.0, rough) * uR11D.z;
  if (frostK > 0.0) {
    float hitD;
    vec3 Lf = r11Radiance(vWorldPos, -V, 1.0, 6.5, hitD);
    if (uR11G.w > 0.0) Lf = mix(Lf, envRadiance(-V, 1.0) * uR11C.w, uR11G.w * (1.0 - hitD));
    Lt = mix(Lt, Lf * 0.92, frostK);
  }
  bool out_ = nOut > 0;
  float wT = 1.0;
  // Blender 5.2's Principled tints a whole pass once (measured on the twin without the orb, ring / background per channel:
  // R/B 0.64-0.76, G/B 0.83-0.89 against IceColor's 0.648 / 0.833; squared would be 0.42 / 0.69).
#ifdef ICE_P4
  vec3 trans = Lt * (wT * mix(uR11D.y, uP4E.z, uHold)) * uR11Tint;
#else
  vec3 trans = Lt * (wT * uR11D.y) * uR11Tint;
#endif

  // ---- reflection at the entry (glossy rays see the Nishita world, the cloud cards and the geometry)
  float Fe = r11Fresnel(dot(N, V), ior);
  // Rough interfaces lose the grazing peak (multiscatter GGX keeps the energy in the transmitted lobe).
  Fe = mix(Fe, 0.04, smoothstep(0.233, 1.0, rough) * 0.6);
  vec3 R = reflect(-V, N);
  vec3 refl = r11Reflect(vWorldPos, R, rough);
  vec3 L = normalize(uSunDir);
  float nVar = dot(dFdx(N), dFdx(N)) + dot(dFdy(N), dFdy(N));
  float rSpec = sqrt(rough * rough + 0.35 * nVar);
  float sil = smoothstep(0.0, max(fwidth(dot(Ng, V)) * 2.0, 0.02), dot(Ng, V));
  vec3 spec = min(uSunColor * ggxSpec(N, V, L, rSpec), vec3(2.5)) * sil;
  Fe *= mix(0.35, 1.0, sil);
  vec3 col = trans * (1.0 - Fe) + refl * Fe + spec * Fe;
#ifdef ICE_P4
  {
    // (Q6 / Q10: a tight sun glint, GGX alpha 0.04, on the flat cut caps and, in the hold, on the facets; widened by the
    // normal's own spread over the pixel, so it cannot sparkle.)
    float gk = uP4D.w * capK + uP4G.y * uHold;
    if (gk > 0.0) {
      float rG = sqrt(0.04 + 0.35 * nVar);
      col += min(uSunColor * ggxSpec(N, V, L, rG), vec3(3.0)) * Fe * sil * gk;
    }
  }
  if (uP4F.y > 0.0) {
    // (Q10: F045's steel-blue line 3-5 px inside the silhouette, where the side face turns away: L 173-179, B-G 34-37.)
    float ndvG = dot(Ng, V);
    float lk = smoothstep(0.08, 0.16, ndvG) * (1.0 - smoothstep(0.22, 0.34, ndvG)) * (1.0 - capK);
    col *= mix(vec3(1.0), vec3(0.74, 0.83, 1.0), lk * uP4F.y);
  }
#endif

  // ---- the orb as a light: specular glint and the light scattered by frosted ice facing it
  vec3 toO = uOrbCenter - vWorldPos;
  float dO = length(toO);
  vec3 lO = toO / max(dO, 1e-4);

  // ---- joints: the pieces' cut planes, in the piece's own frame (they move with the ring). Two touching cut faces pass a
  // ray that meets them steeply (two Fresnel losses) but totally reflect one that meets them beyond the critical angle: a
  // thin dark seam where the first internal segment crosses the plane at a grazing angle (the twin's joint lines at q00,
  // x 666 / 798, 8-9 L deep). Off once the pieces separate (Rings: uPieceCuts.w).
  if (uPieceCuts.z > 0.5 && uPieceCuts.w > 0.5) {
    vec3 e0 = vWorldPos - vRingC;
    vec3 e1 = P1 - vRingC;
    float jk = 0.0;
    float wob = (nA - 0.5) * 0.03;  // a slightly irregular seam (Noise A), metres
#ifdef ICE_P4
    // (F2 fix round: the seam lines' pixel widths from derivatives taken here, in uniform control flow.)
    vec3 dE0x = dFdx(e0), dE0y = dFdy(e0), dE1x = dFdx(e1), dE1y = dFdy(e1);
    float jLine = 0.0;
#endif
    for (int c = 0; c < 2; c++) {
      float ang = c == 0 ? uPieceCuts.x : uPieceCuts.y;
      vec3 nc = normalize(toW * vec3(-sin(ang), cos(ang), 0.0));
      vec3 rc = toW * vec3(cos(ang), sin(ang), 0.0);
      if (dot(e0, rc) <= 0.0) continue;
      float se = dot(e0, nc) + wob, sx = dot(e1, nc) + wob;
#ifdef ICE_P4
      float crossK;
      if (uP4J.x > 0.5) {
        // (F2 fix round: F015 / F030 show a 2-3 px dark seam and a bright edge line, not a flat painted collar. Across the
        // band of rays whose first segment crosses the plane the shade is a V, deepest where the crossing is midway along the
        // segment and 0 at both ends (se -> 0 at the entry face, sx -> 0 at the far wall), so it has no hard edge and reads
        // as a line at any width; a bright line uP4D.y px either side of where the plane meets the far wall (sx -> 0).)
        float fS = abs(dot(dE0x, nc)) + abs(dot(dE0y, nc)) + 1e-5;
        float fX = clamp(abs(dot(dE1x, nc)) + abs(dot(dE1y, nc)), 0.5 * fS, 4.0 * fS);
        float tC = abs(se) / max(abs(se) + abs(sx), 1e-6);
        float vK = se * sx < 0.0 ? 1.0 - abs(2.0 * tC - 1.0) : 0.0;
        jLine = max(jLine, (1.0 - smoothstep(0.0, uP4D.y * fX, abs(sx))) * smoothstep(fS, 3.0 * fS, abs(se)));
        crossK = uP4J.y * vK;
      } else {
        crossK = se * sx < 0.0 ? 1.0 : 1.0 - smoothstep(0.0, uP4D.y, min(abs(se), abs(sx)));
      }
#else
      float crossK = se * sx < 0.0 ? 1.0 : 1.0 - smoothstep(0.0, 0.012, min(abs(se), abs(sx)));
#endif
      float tirK = 1.0 - smoothstep(0.62, 0.8, abs(dot(d1, nc)));  // cos 41.8 deg = 0.745
      jk = max(jk, crossK * mix(0.12, 1.0, tirK));
    }
#ifdef ICE_P4
    col *= (1.0 - uR11B.z * jk) * (1.0 + uP4J.w * jLine);
#else
    col *= 1.0 - uR11B.z * jk;
#endif
  }

#ifdef ICE_P4
  // (Q10: an ice-only cast towards blue at equal luma, against the residual cyan; the chroma eases to uP4E.w in the hold.)
  col *= mix(vec3(1.0), vec3(1.0083, 0.9931, 1.0436), uP4F.w);
  {
    float lc = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = max(vec3(lc) + (col - vec3(lc)) * mix(uR11B.w, uP4E.w, uHold), vec3(0.0));
  }
#else
  {
    float lc = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = max(vec3(lc) + (col - vec3(lc)) * uR11B.w, vec3(0.0));
  }
#endif
  if (uR11Dbg > 0.5) {
    if (uR11Dbg < 1.5) col = vec3(orbHit, out_ ? 1.0 : 0.0, nTir / 4.0);
    else if (uR11Dbg < 2.5) col = vec3(float(face) / 7.0, float(fExit) / 7.0, 0.0);
    else if (uR11Dbg < 3.5) col = trans;
    else if (uR11Dbg < 4.5) col = refl * Fe + spec * Fe;
    else if (uR11Dbg < 5.5) col = Lt;
    else if (uR11Dbg < 6.5) col = vec3(0.4);
    else col = dmin0 < 0.0 ? vec3(0.0, 0.0, 1.0) : dmin0 < 0.15 ? vec3(0.0, 1.0, 0.0) : dmin0 < 0.35 ? vec3(1.0, 1.0, 0.0)
      : dmin0 < 0.6 ? vec3(1.0, 0.35, 0.0) : vec3(1.0, 0.0, 0.0);
  }
  gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);
}
#else
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
#endif
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
  const r11 = iceR11(quality);
  if (r11) defines.ICE_R11 = "";
  const p4 = p4On(quality);
  if (p4) defines.ICE_P4 = "";
  const mat = new THREE.ShaderMaterial({
    name: "rx-ice",
    vertexShader: ICE_VERT,
    fragmentShader: p4 ? ICE_FRAG : stripP4(ICE_FRAG),
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
      // (Round 11: Blender's own 0.05 x 1.975 on the cell plateaus, r11Plateau.)
      uDisplace: { value: !r11 ? 0.05 * 1.975 * (silhouette ? 1.35 : 1) : 0.05 * 1.975 },
      // Chipped grooves at the facet borders, ~60 % of the lump displacement's half-range deep.
      uCrease: { value: 0.005 * 1.975 },
      uSectionRadius: { value: 0 },
      uSectionHalf: { value: new THREE.Vector2(0, 0) },
      // (Round 11: 0, the artist's lens section, which the twin shows is what makes the ice read as cut ice.)
      uSquare: { value: !r11 ? 1 : 0 },
      uEnergy: { value: 0 },
      uFracture: { value: 0 },
      uReflectionPass: { value: 0 },
      uOrbCenter: shared.uOrbCenter,
      uOrbGlow: shared.uOrbGlow,
      ...(!r11 ? {} : r11Uniforms()),
      ...(!p4 ? {} : { uHold: shared.uHold }),
    },
  });
  if (p4) p4Uniforms(mat);
  return mat;
}

/** P4 ice lane uniforms (runtime-tunable through `__hero.rings.materials[i].uniforms`); each sub-switch restores MAIN's values. */
function p4Uniforms(mat: THREE.ShaderMaterial) {
  const u = mat.uniforms;
  // G5: ramp-end filter 4 px + 0.02, octave fade from 0.15 c/px, the trace's finest octave 3 px, values band-limited.
  u.uP4A = { value: P4_AA ? new THREE.Vector4(4, 0.02, 0.15, 3) : new THREE.Vector4(1.5, 0.004, 0.3, 2) };
  // Q3: roughness 0.45 .. 0.9, Noise A stretched 4x along the ring; w = G5's value band limit.
  u.uP4B = { value: new THREE.Vector4(P4_FROST ? 0.45 : 0.233, P4_FROST ? 0.9 : 1, P4_FROST ? 4 : 0, P4_AA ? 1 : 0) };
  if (P4_FROST) {
    // frosted-diffuse share 0.8 -> 0.5; transmitted panorama blur floor 0.45 -> 0.6 (no sky cloud shapes through a band);
    // transmitted gain 0.94 -> 0.92: the compressed frost lifted the band faces ~5 L (q00 face 216.5 vs F000 209.3, batch b5).
    u.uR11D.value.z = 0.5;
    u.uR11E.value.w = 0.6;
    u.uR11D.value.y = 0.92;
  }
  // Q4 (ice part): direct orb paths clamp 1.6x higher with a 0.008 lobe floor, variation on, periwinkle hue (x2 the plan's
  // (1, 0.95, 1.06): q03 ring D B-G +8 at x1). (2.2 put q03 ring D 14 L and the q00 band over the orb 7 L above the reference,
  // batch b2; 1.6: q00 229.3 vs F000 231.8, q03 ring D sd 14.3 vs MAIN 8.7 / F045 17.3, batch b3.)
  u.uP4C = { value: P4_ORB ? new THREE.Vector4(1.6, 0.008, 1, 2) : new THREE.Vector4(1, 0.012, 0, 0) };
  // Q6: caps from their own plane, joint seams 5 mm wide and 0.6 deep, a 4 % chamfer, cap glint.
  // (Fix round, F2: with the V profile (uP4J.x 1) uP4D.y is the far-wall line's half width in pixels: uP4J below.)
  u.uP4D = { value: P4_CAP ? new THREE.Vector4(1, 1.25, 0.04, 1) : new THREE.Vector4(0, 0.012, 0, 0) };
  u.uP4J = { value: P4_CAP ? new THREE.Vector4(1, 0.8, 0, 0.45) : new THREE.Vector4(0, 0, 0, 0) };
  if (P4_CAP) u.uR11B.value.z = 0.6;
  // Q10: at full hold face-on lobe growth 1.2, one-bounce TIR smoothing x0.7, transmitted gain 0.98, chroma 0.92 (the plan's
  // 1.02 / 0.85 overshot with the brighter orb paths: p06 band L 212.8 / sat 0.138 vs F420 206.9 / 0.162, batch b2).
  u.uP4E = { value: P4_HOLD ? new THREE.Vector4(1.2, 0.7, 0.98, 0.92) : new THREE.Vector4(u.uR11K.value.w, 1, u.uR11D.value.y, u.uR11B.value.w) };
  // Q10: rim tint, steel-blue inner line, crack sheets, blue cast x3 (x1: q02 B-G +22.8 vs F030 +29.3, q01 inner band +18 vs
  // F015 +22; x3: q02 +28.5, q03 ring D +16 vs F045 +14, outer ring +32 vs +33, batch b5).
  // (z: the crack sheets were dropped in the fix round, F4: hash-placed, invisible in every judged pose, paid on every fragment.)
  u.uP4F = { value: P4_HOLD ? new THREE.Vector4(1, 1.3, 0, 3) : new THREE.Vector4(0, 0, 0, 0) };
  // Q4 / Q10: orb-through x1.4 and a facet glint at full hold.
  u.uP4G = { value: new THREE.Vector4(P4_ORB ? 1.4 : 1, P4_HOLD ? 0.5 : 0, P4_ORB ? 0.15 : u.uR11F.value.x, 0) };
  // Q3: the trace's own roughness ramp: MAIN's 0.233 .. 1 (0.6 / 0.85 washed out the oblique bands' TIR zones or raised the
  // tumble crawl, batches b2 / b3: q03 outer ring L 186 / sd 30 / lf 21 at 1 vs F045 174 / 31 / 23.5; crawl 1.47 / 1.32 / 1.53
  // vs MAIN-equivalent 1.55 / 1.48 / 1.48). Only the frost terms take the compressed ramp above.
  // z (fix round, F1): the critical-angle ramp x2.5 at full hold (1 = MAIN): p05's TIR-zone outlines soften (right arc
  // Laplacian 8.7 -> 6.2 at x2, 5.6 at x3; F402 2.9), p06 band 208.6 -> 205.6 (x2) / 202.3 (x3) vs F420 206.9 (batch b2).
  u.uP4H = { value: new THREE.Vector4(0.233, 1, P4_AA ? 2.5 : 1, 0) };
  // Q10: scrape streaks, Noise B stretched 8x along the ring.
  u.uP4I = { value: new THREE.Vector4(P4_HOLD ? 8 : 0, 0, 0, 0) };
}

/**
 * Round-11 tunables (runtime-tunable through `__hero.rings.materials[i].uniforms`). The values are the Cycles twin's
 * (Ice.004) where the shader models the same thing, and fitted to the twin's measured boxes otherwise (WORK/LOG.md).
 */
function r11Uniforms() {
  return {
    // x far projection depth of the copy (m), y facet tilt, z fine bump strength (Blender Bump 0.06), w far blur per roughness^2
    // (w 4000 with the max mip 7.5: the twin's rough interfaces and fine bump scatter the transmitted view by a few degrees,
    // so nothing behind a band stays legible; round-11 batches s13 / s14)
    uR11A: { value: new THREE.Vector4(40, 0.12, 0.06, 4000) },
    // x lobe growth per internal bounce (2 = a reflection's 2x spread), y reflection gain, z joint depth, w chroma gain
    // (x 5: the twin's body contrast, batch s14: q00 ring C sd 19.3 vs 19.6, q03 ring B 20.7 vs 21.8)
    // (x 3 since batch s26: 5 averaged every internal reflection into a hemisphere, which lost the dark steel-blue zones of
    // the oblique bands at q03, ring A 8 L too light; 3 keeps them at +25 % face-on contrast)
    // (Fix round: x 1.5 where a ring is seen obliquely or edge-on, x 3 (uR11K.w 2) where it faces the camera; with the
    // continuous trace the oblique bands keep their steel-blue internal-reflection zones, batches f04 / f11 / f13.)
    uR11B: { value: new THREE.Vector4(ICE_R11A ? 3.0 : 1.5, 1.0, 0.35, 1.0) },
    // x frost bump strength (Blender Bump.001 0.2), y trapped-light level, z orb-edge softness, w panorama gain
    uR11C: { value: new THREE.Vector4(0.2, 0.5, 1.0, 1.0) },
    // x IOR (Principled 1.5), y transmitted gain, z diffuse share of frosted transmission, w orb hit gain
    // (w 0.85 since batch s29: the band in front of the orb sat above F000 at q00 and above the twin at q03 / p06 with 1.0;
    // q00 224 between F000 222 and the twin 232, q03 231 vs the twin 230)
    uR11D: { value: new THREE.Vector4(1.5, 0.94, 0.8, 0.85) },
    // x 1 = exact trace through the revolved octagon (0 = the straight-prism trace of the first round-11 batches), y max blur mip
    // (w 0.45 since batch s27: at 0.18 the panorama's clouds stayed legible through band A where the copy does not reach;
    // z 1 since batch s32: the bright outlines of the whispering-gallery islands soften, band A's right half sd 13.3 -> 10.8,
    // twin 10.7)
    uR11E: { value: new THREE.Vector4(1, 7.5, 1, 0.45) },
    // x orb through the ice: share of its mean radiance, y mip of its sharp sample, z corner rounding (section units)
    // (x 0.3 since batch s33: the orb's plasma read as blue cloud blotches through the bands in front of it; with a 30 % share
    // of its mean the bands read as the twin's even glow: q00 sd 25.6 -> 18.4, twin 21.7, F000 17.2; p06 34.5 -> 24.4, twin 23.5)
    // (Fix round: z 0.15, the octagon's corners rounded over 0.15 w: a sharp corner switched the exit wall inside a pixel,
    // the main source of judge 1's hard-edged islands; batch f01 q00 hard steps 300 -> 122 per 10k ring px.)
    uR11F: { value: new THREE.Vector4(0.3, 0.5, ICE_R11A ? 0 : 0.15, 0) },
    // x 1 = trapped light leaves as frosted transmission through the ring, y its lobe roughness, z its gain (round-11 batch s24)
    // (Fix round: z 0.6. The light still inside after the trace is about a third of a band's light at q03; at 0.9 it made
    // the oblique bands as light as the sky behind them, q03 ring A dL -1.3 vs the twin -7.3; 0.5 / 0.7: -9.6 / -6.4,
    // batch f13.)
    // (Fix round 2: z 0.45. With the pixel-footprint ramp (uR11N.x) a darker trapped term no longer costs hard steps; the dark
    // rim lines deepen, q00 band A 21 / 33 -> 23 / 38 L below the core (twin 46 / 59, F000 36 / 50), batch g11.)
    uR11G: { value: new THREE.Vector4(1, 0.5, ICE_R11A ? 0.9 : 0.45, 0) },
    // x 1 = entry facets from the displacement's cell plateaus, y slope gain, z exit-face tilt gain, w 1 = exit facets from the
    // plateaus too (round-11 batch s28)
    uR11H: { value: new THREE.Vector4(0, 1, 1, 0) },
    // Cost knobs: x stop threshold on the energy left inside, y max walls, z reuse of the last exit for the remainder.
    // ((0.03, 5, 0) until batch s39: GPU frame time x1.03-1.06 of round 10; (0.08, 5, 1) is x0.95-1.04 and changes the
    // hero box by 0.3-0.7 / 255 on average)
    uR11I: { value: new THREE.Vector4(0.08, 5, 1, 0) },
    // Fix round (judge 1, findings a / b / d): the trace made continuous. Off (0) with ?ice=r11a, the judged build.
    // x continuous energy bookkeeping, y critical-angle smoothing (x lobe alpha), z corner rounding per lobe footprint,
    // w incidence-weighted lobe growth.
    uR11J: { value: ICE_R11A ? new THREE.Vector4(0, 0, 0, 0) : new THREE.Vector4(2, 3, 1, 1) },
    // x filtered Bump.001 ramp, y entry corners rounded over this many pixel footprints, z frost (fine-bump scatter share),
    // w face-on lobe growth scale (1 = uR11B.x everywhere).
    // (Fix round 2: w 1.5. At 2 the hold's ring A, seen face-on, sat 6 L under the twin once the orb clamp (uR11M.x) took
    // the orb's excess out of it; 1 puts it on the twin but raises the face-on rings' contrast at q00, batches g12 / g13.)
    uR11K: { value: ICE_R11A ? new THREE.Vector4(0, 0, 0, 1) : new THREE.Vector4(1, 1.5, 0.03, 1.5) },
    // x share of the light left after the last wall that is dropped (Cycles' glossy bounce limit).
    // y 1: the critical-angle smoothing is one-sided (batch f11: hard steps 41 / 80 / 48 at q00 / q03 / p06).
    // (Fix round 2: w 1, the trapped light leaves tilted along the ring's tangent (by how far the view already runs along
    // it): q00 band A's rim lines 22 / 38 -> 24 / 41 L below the core (twin 46 / 59, F000 36 / 50). z 1 (along the light's last
    // direction inside) did more for the rims (29 / 55) and the steps (q00 50 -> 35) but that direction changes from frame to
    // frame: the tumble's motion-compensated residual rose 4.9 -> 6.8 (Cycles video 4.4-5.9), i.e. crawl; z stays 0,
    // batches g13 / g16.)
    uR11L: { value: ICE_R11A ? new THREE.Vector4(0, 0, 0, 0) : new THREE.Vector4(0, 1, 0, 1) },
    // Fix round 2 (judge 1 findings e / h / c / d). x Cycles' indirect clamp for the orb seen through / off the ice: 6 on the
    // lookups' means stands for the artist's 10 per sample (Cycles clamps each sample before averaging); p06 ring B dL -1.9 ->
    // -6.5, C +12.0 -> +2.9 (F420 -9.0 / +3.1), the band in front of the orb pale teal instead of white (batch g04).
    // y 1: one more IceColor tint on the trapped lookup (the twin's internal-reflection zones pass the sky as tint^2): q03
    // dB-R A +13.8 -> +16.5, B +9.9 -> +11.9 (twin +18.1 / +13.4). z / w: frost as roughness (the bumps' sub-pixel scatter
    // added to the GGX alpha), off: it smoothed the bands below the twin's contrast (batch g06).
    uR11M: { value: ICE_R11A ? new THREE.Vector4(0, 0, 0, 0) : new THREE.Vector4(6, 1, 0, 0) },
    // Fix round 2: x the critical-angle ramp widened by the entry normal's change across the pixel (1: q03 hard steps 84 ->
    // 75, p06 45 -> 39, batch g09; 2: q03 76 -> 67 on the final defaults, batch g17), y the corner rounding likewise (off: no
    // gain), z the orb's sharp sample blurred by the lobe's footprint at the orb (1: the plasma's thin sheets no longer show
    // through the bands as 1-px lines, batch g10).
    uR11N: { value: ICE_R11A ? new THREE.Vector4(0, 0, 0, 0) : new THREE.Vector4(2, 0, 1, 0) },
    // Cut angles of this piece in the ring frame (Rings), whether it has cut ends, whether it sits joined.
    uPieceCuts: { value: new THREE.Vector4(0, 0, 0, 1) },
    // Blender IceColor (forensics 3.1): tint at every transmission, so tint^2 for a straight pass.
    uR11Tint: { value: new THREE.Color(0.6476259, 0.8329854, 1.0) },
    uOrbRadius: { value: ORB_RADIUS },
    uR11Dbg: { value: 0 },
    // Plateau step width (Voronoi distance units, about one SubD-L1 edge).
    uR11Ramp: { value: 0.35 },
  };
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
