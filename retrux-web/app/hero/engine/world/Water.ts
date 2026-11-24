import * as THREE from "three";
import { WATER } from "../config";
import { GLSL_COMMON, GLSL_ENV } from "../shaders/chunks";
import type { SharedUniforms } from "../uniforms";
import {
  EXTRA_PROJECTORS,
  GLSL_EXTRA_PROJECTORS,
  GLSL_PLATE_GRADE,
  GLSL_PLATE_MIST,
  GLSL_PLATE_OCCLUSION,
  type ExtraProjectorBinding,
  type PlateOcclusionUniforms,
} from "./PlateEnvironment";

/**
 * The mirror-ray length at uv, filtered: a manual 2x2 bilinear lookup on texel centres (invalid taps, L <= 0, skipped),
 * and across an edge (max > 1.25 min) the nearest reflector instead of a mean. A single nearest texel made the re-aimed
 * lookup jump row by row wherever L jumps (a floe's reflection next to the sky's): long broken horizontal hairlines and
 * dashes under the near floes at every in-between camera (pop, release, intro; QC round 9, hold-sweep MAJOR).
 */
const mirrorLGLSL = (P: string, p: string) => /* glsl */ `
float ${p}MirrorL(vec2 uv) {
  vec2 t = u${P}DepthTexel;
  vec2 st = uv / t - 0.5;
  vec2 i0 = floor(st);
  vec2 f = st - i0;
  vec2 b = (i0 + 0.5) * t;
  vec4 L = vec4(textureLod(u${P}Depth, b, 0.0).b, textureLod(u${P}Depth, b + vec2(t.x, 0.0), 0.0).b,
                textureLod(u${P}Depth, b + vec2(0.0, t.y), 0.0).b, textureLod(u${P}Depth, b + t, 0.0).b);
  vec4 ok = step(1e-4, L);
  vec4 w = vec4((1.0 - f.x) * (1.0 - f.y), f.x * (1.0 - f.y), (1.0 - f.x) * f.y, f.x * f.y) * ok;
  float ws = w.x + w.y + w.z + w.w;
  if (ws < 1e-4) return 0.0;
  vec4 Lm = mix(vec4(1e9), L, ok);
  float mn = min(min(Lm.x, Lm.y), min(Lm.z, Lm.w));
  float mx = max(max(L.x * ok.x, L.y * ok.y), max(L.z * ok.z, L.w * ok.w));
  return mx > mn * 1.25 ? mn : dot(w, L) / ws;
}
`;

/** The lake's mirror-point re-aim (see plateMirrorPoint) for each extra projector. */
const GLSL_EXTRA_MIRROR = EXTRA_PROJECTORS.map(
  (e) => /* glsl */ `
#ifdef ${e.define}
${mirrorLGLSL(e.P, e.p)}
vec3 ${e.p}MirrorPoint(vec3 P) {
  vec3 Cp = u${e.P}CamPos;
  vec3 dir = normalize(P - cameraPosition);
  vec3 Pp = P;
  for (int i = 0; i < 2; i++) {
    vec4 c = u${e.P}ViewProjF * vec4(Pp, 1.0);
    vec2 uv = clamp(c.xy / c.w * 0.5 + 0.5, vec2(0.0), vec2(1.0));
    float L = min(${e.p}MirrorL(uv), 4000.0);
    if (L <= 0.0) break;
    vec3 X = P + dir * L;
    Pp = Cp + (X - Cp) * ((Cp.y - P.y) / max(Cp.y - X.y, 1e-3));
  }
  return Pp;
}
#endif`,
).join("");

/** Adds each extra projector's lake sample to (acc, wsum) and its good coverage to extraCover (offs, lodX in scope). */
const GLSL_WATER_PROJECTOR_BLEND = EXTRA_PROJECTORS.map(
  (e) => /* glsl */ `
#ifdef ${e.define}
    if (u${e.P}DepthOn > 0.5 && u${e.P}Mix > 0.001) {
      vec3 kpw = vWorldPos;
      vec4 kclip = u${e.P}ViewProjF * vec4(vWorldPos, 1.0);
      float visK = 1.0;
      float awayK = distance(cameraPosition, u${e.P}CamPos);
      if (awayK > 0.02) {
        vec3 mp = ${e.p}MirrorPoint(vWorldPos);
        vec4 mc = u${e.P}ViewProjF * vec4(mp, 1.0);
        vec2 muv = mc.xy / mc.w * 0.5 + 0.5;
        float behindK = -(u${e.P}View * vec4(mp, 1.0)).z - (${e.p}DepthAt(clamp(muv, vec2(0.0), vec2(1.0))) * 1.06 + 0.8);
        visK = 1.0 - smoothstep(0.0, 2.5, behindK);
        bool straight = false;
        if (behindK > 0.0) {
          vec2 suv = kclip.xy / kclip.w * 0.5 + 0.5;
          straight = -(u${e.P}View * vec4(vWorldPos, 1.0)).z - (${e.p}DepthAt(clamp(suv, vec2(0.0), vec2(1.0))) * 1.06 + 0.8) <= 0.0;
        }
        if (straight) visK = 1.0;
        else {
          kpw = mp;
          kclip = mc;
        }
      }
      // No fill of its own (visK weights it out where it cannot see the point).
      vec2 k = kclip.xy / kclip.w * 0.5 + 0.5;
      vec2 ke = min(k, 1.0 - k);
      float inK = smoothstep(-0.005, 0.035, min(ke.x, ke.y)) * step(0.0, kclip.w);
      // The rest projector's "raised" test: where the surface this projector saw at the lookup stands above the water,
      // the lake point is hidden behind it, however close the depths. The x1.06 + 0.8 m tolerance and the 2.5 m ramp let
      // a lookup that landed on a near rock or floe paint it on the water beside it (QC round 6, release with the pointer
      // at an edge: a dark rock-coloured slab beside the left rock, a translucent copy of a floe's end).
      if (awayK > 0.02) {
        float kdz = ${e.p}DepthAt(clamp(k, vec2(0.0), vec2(1.0)));
        float kfz = -(u${e.P}View * vec4(kpw, 1.0)).z;
        vec3 kseen = u${e.P}CamPos + (kpw - u${e.P}CamPos) * (kdz / max(kfz, 1e-3));
        visK *= 1.0 - smoothstep(0.05, 0.12, kseen.y - kpw.y) * (1.0 - smoothstep(40.0, 60.0, kfz));
      }
      float wK = u${e.P}Mix * visK * inK;
      extraCover += u${e.P}Mix * inK * visK;
      if (wK > 0.0005) {
        vec2 kc = clamp(k, vec2(0.0005), vec2(0.9995));
        vec2 kq = clamp(k + offs, vec2(0.0005), vec2(0.9995));
        // The ripple-bent lookup must land on the water (<p>SeenY), not on a rock or floe just in front of the lake point.
        kq = mix(kq, kc, max(step(0.05, ${e.p}SeenY(kq) - vWorldPos.y), step(${e.p}DepthAt(kq), ${e.p}DepthAt(kc) * 0.92 - 0.3)));
        acc += textureLod(u${e.P}Plate, kq, lodX).rgb * (u${e.P}Gain / uPlateGain) * wK;
        wsum += wK;
      }
    }
#endif`,
).join("");

/**
 * Live lake surface. The Cycles plate already contains the calm water (mirror
 * reflections of sky and mountains, rendered without the Blender Wave modifier);
 * this shader animates it: concentric ripples under the hero, travelling impulse
 * rings on press/release, moving micro-ripples, the live reflection of the hero
 * and small sun glints.
 */

const WATER_VERT = /* glsl */ `
uniform mat4 uPlateViewProj;
uniform mat4 uMirrorViewProj;
varying vec4 vPlateClip;
varying vec4 vMirrorClip;
varying vec3 vWorldPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vPlateClip = uPlateViewProj * wp;
  vMirrorClip = uMirrorViewProj * wp;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const WATER_FRAG = /* glsl */ `
${GLSL_COMMON}
${GLSL_ENV}
${GLSL_PLATE_OCCLUSION}
#ifdef EXTRA_PROJECTORS
${GLSL_EXTRA_PROJECTORS}
#endif
${GLSL_PLATE_GRADE}
${GLSL_PLATE_MIST}
uniform sampler2D uPlate;
uniform float uPlateGain;
uniform sampler2D uReflection;   // hero seen from the mirrored camera, premultiplied alpha
uniform float uReflectionOn;
uniform float uTime;
uniform float uFrame;
uniform vec3 uRippleCenter;
uniform float uRippleAmp;        // base ripple slope amplitude
uniform vec4 uImpulse;           // x: start time, y: amplitude, z: speed, w: width
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uDofBlur;
uniform float uFocusDist;
uniform float uDistortion;       // plate distortion strength (uv units per unit slope)
uniform float uMirror;           // reflectance used for the live hero reflection
uniform float uHold;             // dolly progress (0 at rest)
uniform float uFogHold;          // the hold fog bank (lingers after a release)
uniform float uRippleShade;
uniform vec3 uFog;               // x: start distance, y: full distance, z: amount
uniform vec3 uFogColor;
uniform vec3 uOrbCenter;
uniform float uOrbGlow;
varying vec4 vPlateClip;
varying vec4 vMirrorClip;
varying vec3 vWorldPos;

// Slope (dh/dx, dh/dz) of Blender's Wave modifier as used on the lake: a train of positive
// Gaussian crests leaving the centre (spacing 2.717 m, 1.115 m/s, 0.173 m after subdivision).
uniform vec4 uWave;   // x: amplitude, y: spacing, z: speed, w: crest sigma
uniform float uWaveReach;
vec2 ringSlope(vec2 d, float r) {
  // Broad rolling rings (a full sinusoid at the modifier's spacing and speed) under a smooth envelope: the
  // reference reads as a few wide waves with blue troughs, not thin contour lines (Gaussian crests did).
  // The ring phase wobbles a little with the angle: F000's wave fronts are scalloped, not drawn with a compass.
  float x = r - uWave.z * uTime + 0.09 * sin(atan(d.y, d.x) * 7.0 + r * 1.3) + 0.05 * sin(atan(d.y, d.x) * 13.0 - r * 0.9);
  float k = 6.2831853 / uWave.y;
  float dh = -uWave.x * k * 0.55 * sin(k * x);
  // (exp(-r / 4 m) with a 6-9 m cut-off left one or two soft bands; F000 shows three or four, QC round 5.)
  float env = smoothstep(0.4, 1.8, r) * exp(-r / (uWaveReach * 0.7)) * (1.0 - smoothstep(uWaveReach * 0.8, uWaveReach, r));
  return d / max(r, 1e-3) * dh * env;
}

vec2 impulseSlope(vec2 d, float r) {
  float t = uTime - uImpulse.x;
  if (t < 0.0 || t > 6.0) return vec2(0.0);
  float c = uImpulse.z * t;
  float x = (r - c) / uImpulse.w;
  // derivative of a gaussian ring, fading as it travels
  float g = -2.0 * x / uImpulse.w * exp(-x * x);
  float fade = exp(-t * 0.55) * smoothstep(0.0, 0.25, t);
  return d / max(r, 1e-3) * g * uImpulse.y * fade;
}

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

// The plate's lake is a mirror image baked for the plate camera. Sampled where a lake point projects, it
// paints those reflections onto the surface: as the camera moves (the hold dolly) the floes' long
// reflection streaks fan out across the lake like light shafts. Re-aim the lookup through the mirror image
// instead: what P reflects lies a distance L beyond P on the straight-through view ray (L traced at bake,
// uPlateDepth.b), and the plate shows that mirror point through the lake point on the line from the plate
// camera. Identity at the plate camera; one refinement with L read at the new point.
${mirrorLGLSL("Plate", "plate")}
vec3 plateMirrorPoint(vec3 P) {
  vec3 Cp = uPlateCamPos;
  vec3 dir = normalize(P - cameraPosition);
  vec3 Pp = P;
  for (int i = 0; i < 2; i++) {
    vec4 c = uPlateViewProjF * vec4(Pp, 1.0);
    vec2 uv = clamp(c.xy / c.w * 0.5 + 0.5, vec2(0.0), vec2(1.0));
    float L = min(plateMirrorL(uv), 4000.0);
    if (L <= 0.0) break;
    vec3 X = P + dir * L;
    Pp = Cp + (X - Cp) * ((Cp.y - P.y) / max(Cp.y - X.y, 1e-3));
  }
  return Pp;
}
${GLSL_EXTRA_MIRROR}

void main() {
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec2 rel = vWorldPos.xz - uRippleCenter.xz;
  float r = length(rel);

  // The Wave modifier's crest train plus the press / release impulse: these shade the lake.
  vec2 waveS = ringSlope(rel, r) * uRippleAmp + impulseSlope(rel, r);
  // A light breeze (the Blender bump, noise scale 3): it only bends the reflections a little.
  vec4 m1 = fbmd(vec3(vWorldPos.x * 0.55, vWorldPos.z * 0.9, uTime * 0.12), 3);
  // Calmer inside the ring zone: the breeze grain masked the concentric bands (QC round 4: HF energy 2.37 vs 1.56).
  // (0.55 in the ring zone until QC round 10: the grain read through the rings.)
  vec2 slope = waveS + m1.yw * vec2(0.55, 0.9) * 0.006 * (0.3 + 0.7 * smoothstep(4.0, 12.0, r));

  // Distortion grows slightly with distance (reflections of far mountains bend more per slope).
  float dist = distance(cameraPosition, vWorldPos);
  vec2 offs = vec2(slope.x, -slope.y) * uDistortion * mix(0.6, 1.4, smoothstep(6.0, 60.0, dist));

  // Plate reflections re-aimed for this camera (see plateMirrorPoint); lake hidden from the projector
  // (behind a rock or a floe) takes the open water beside it.
  vec4 pclip = vPlateClip;
  vec3 pw = vWorldPos;
  float occl = 0.0;
  float vis0 = 1.0;   // the rest projector sees the point its lookup shows (extra-projector blend weight)
  float camAway = distance(cameraPosition, uPlateCamPos);
  if (uPlateDepthOn > 0.5 && camAway > 0.02) {
    pw = plateMirrorPoint(vWorldPos);
    pclip = uPlateViewProjF * vec4(pw, 1.0);
    vec2 ruv = pclip.xy / pclip.w * 0.5 + 0.5;
    float behind = -(uPlateView * vec4(pw, 1.0)).z - (plateDepthAt(clamp(ruv, vec2(0.0), vec2(1.0))) * 1.06 + 0.8);
    vis0 = 1.0 - smoothstep(0.0, 2.5, behind);
    // Far from the plate camera (the hold dolly, ~8 m) the lake hidden from the projector behind the near
    // floes and rocks is large, and the sideways fill smears it into stair-stepped streak bands (QC round 2,
    // p04-p06 bottom corners): there the live mirror takes over. Soft-edged: lake just behind an occluder's
    // shadow line blends over a couple of metres.
    occl = smoothstep(0.0, 2.5, behind) * smoothstep(1.0, 4.0, camAway);
    // A re-aimed lookup whose mirror point the projector could not see (behind a floe or a rock) took its
    // texels from the side, row by row: striped, floe-shaped bands and dark slabs on the near lake whenever the
    // pointer orbited the camera (pointer QC, right edge). Where the projector does see this lake point itself,
    // the straight lookup is clean, and an orbit of a metre or two barely moves the reflections it shows. (Lake
    // hidden both ways, the slivers between the foreground rocks, keeps the re-aimed fill: the straight fill
    // there drew vivid blue squiggles along the rock edges.)
    if (behind > 0.0) {
      vec2 suv = vPlateClip.xy / vPlateClip.w * 0.5 + 0.5;
      float sBehind = -(uPlateView * vec4(vWorldPos, 1.0)).z - (plateDepthAt(clamp(suv, vec2(0.0), vec2(1.0))) * 1.06 + 0.8);
      if (sBehind <= 0.0) {
        pw = vWorldPos;
        pclip = vPlateClip;
        vis0 = 1.0;
      }
    }
  }
  // The lake never takes a floe's or a rock's texel: where the surface the projector saw at the lookup stands above
  // the water (rebuilt along the projector ray), this lake point is hidden behind it, however close the depths. The
  // x1.06 + 0.8 m tolerance let the lake just behind the near floe slab show the slab's top as a second, translucent
  // layer when the pointer raised the camera (QC round 5). Such a point takes the fill (lake on the same row, so at
  // the same distance) sampled blurred (its per-row source jumps drew stripes), and gives way to an extra projector
  // that sees it. Near field only: the far lake's depth texels are too coarse for a 0.1 m test.
  float raised = 0.0;
  if (uPlateDepthOn > 0.5 && camAway > 0.02) {
    vec2 ruv = clamp(pclip.xy / pclip.w * 0.5 + 0.5, vec2(0.0), vec2(1.0));
    float dz = plateDepthAt(ruv);
    float fzw = -(uPlateView * vec4(pw, 1.0)).z;
    vec3 seen = uPlateCamPos + (pw - uPlateCamPos) * (dz / max(fzw, 1e-3));
    raised = smoothstep(0.05, 0.12, seen.y - pw.y) * (1.0 - smoothstep(40.0, 60.0, fzw));
  }
  vec2 puv0 = pclip.xy / pclip.w * 0.5 + 0.5;
  vec2 puv = plateUnoccluded(puv0, pw, step(0.5, raised));
  // No plausible fill source (it would have copied the rock or floe in front): the live mirror takes the lake there.
  float nofill = step(puv.x, -0.5);
  if (nofill > 0.5) puv = puv0;
  vis0 *= 1.0 - raised;
  // The +5 mips belong to the rest projector's fill only: the extra projectors see their lake points cleanly (lodX).
  // Shared, it turned every extra-projector sample behind a near floe or rock into a pale smooth slab outlined by the
  // rest projector's stair-stepped mask (QC round 6, release / cursor orbit).
  // Hold DOF as the plate (QC round 8, T05).
  float lodX = uDofBlur * smoothstep(0.0, mix(30.0, 10.0, uHold), abs(dist - uFocusDist)) + 1.6 * (1.0 - smoothstep(8.0 + 10.0 * uHold, 16.0 + 12.0 * uHold, dist));
  // (+5 until QC round 8, T02: a 5-mip average of rock, snow and water drew a boxy pale halo the shape of the depth texel
  // around small rocks at the in-between pop / release cameras; +3 still hides the fill's per-row jumps.)
  float lod = lodX + 3.0 * raised;
  vec2 quv = clamp(puv + offs, vec2(0.0005), vec2(0.9995));
  // The ripple-bent lookup must still land on the lake: beside a rock or a floe it fetched the rock itself and drew
  // a translucent copy of it on the water (QC round 4, idle sweep: a doubled snow-capped rock at the frame bottom).
  // (A depth-ratio rule alone let a lake point just behind a near rock or floe, 13.5 m vs 14 m, fetch the rock: a dark,
  // rippling copy of its edge 5-6 px out on the water, QC rounds 7-8. The surface seen at the lookup must be the water.)
  if (uPlateDepthOn > 0.5) {
    vec2 cuv = clamp(puv, vec2(0.0005), vec2(0.9995));
    quv = mix(quv, cuv, max(step(0.05, plateSeenY(quv) - vWorldPos.y), step(plateDepthAt(quv), plateDepthAt(cuv) * 0.92 - 0.3)));
  }
  vec3 base = textureLod(uPlate, quv, lod).rgb;
  // The plate's mid and far water carries fine horizontal streak grain (QC round 1: vertical |dL| 10 vs
  // a glassy reference): a small vertical Gaussian there keeps the vertical reflection columns.
#ifdef WATER_GLITTER
  float destreak = smoothstep(12.0, 35.0, dist);
#else
  float destreak = 0.0;   // T0: four extra plate fetches over most of the lake are not worth it
#endif
  if (destreak > 0.0) {
    float ty = 1.5 / float(textureSize(uPlate, 0).y);
    vec3 blur = base * 0.4026
      + (textureLod(uPlate, quv + vec2(0.0, ty), lod).rgb + textureLod(uPlate, quv - vec2(0.0, ty), lod).rgb) * 0.2442
      + (textureLod(uPlate, quv + vec2(0.0, 2.0 * ty), lod).rgb + textureLod(uPlate, quv - vec2(0.0, 2.0 * ty), lod).rgb) * 0.0545;
    base = mix(base, blur, destreak);
  }
#ifdef EXTRA_PROJECTORS
  // Extra projectors (hold pose, orbit extremes): their lakes show the near water, the floes and their reflections
  // as Cycles rendered them from (nearly) this camera, where the rest plate tore into stair-stepped bands or had to
  // fill from the side. Same re-aim and occlusion logic; weighted by proximity and by who sees the mirror point.
  float extraCover = 0.0;
  {
    vec2 e0 = min(puv, 1.0 - puv);
    float w0 = max(uRestMix, 0.001) * (vis0 + 0.02) * smoothstep(-0.005, 0.035, min(e0.x, e0.y)) * step(0.0, pclip.w);
    vec3 acc = base * w0;
    float wsum = w0;
${GLSL_WATER_PROJECTOR_BLEND}
    if (wsum > 1e-4) base = acc / wsum;
  }
#endif
  base = envChroma(base * uPlateGain);
  // The open lake reads a little brighter than this plate in the reference (F000 near water +7 %); the
  // shadow grade of the proxies is not applied here (it darkened the lake further).
  base *= 1.1;
  {
    // Near crushed blacks on the water, as the plate's near lift (QC round 9, cursor-orbit CRITICAL: with the pointer low,
    // the rocks' dark reflections at the frame bottom stayed near-black, L7-20, under rocks lifted to L28: a hard black
    // band at the waterline with a stair-stepped end). L20 -> 34.
    float nearKw = 1.0 - smoothstep(12.0, 22.0, dist);
    float lnw = dot(base, LUMA);
    float shKw = nearKw * (1.0 - smoothstep(0.02, 0.12, lnw));
    base = mix(base, mix(vec3(lnw), base, 0.7) * 1.25 + vec3(0.006, 0.008, 0.01), shKw * 0.8);
  }
  {
    // The same crushed-black toe as the plate (QC rounds 9-10: a pure-black slit under the right floe's overhang, p0.1 4.6).
    float lzw = dot(base, LUMA);
    if (lzw < 0.045) {
      float lzwt = 0.045 * pow(max(lzw, 0.0) / 0.045, 0.7);
      base = mix(vec3(lzwt), base * (lzwt / max(lzw, 1e-5)), 0.75);
    }
  }
  // The plate's reflections are baked for the rest camera; outside it (and as the camera dollies
  // in, when they would smear along the surface) the lake becomes a live mirror of the panorama.
  vec2 edge = min(puv, 1.0 - puv);
  float inside = smoothstep(-0.005, 0.035, min(edge.x, edge.y)) * step(0.0, pclip.w);
  // Dollied in, the plate keeps most of the lake: its reflections are re-aimed for the moving camera now
  // (plateMirrorPoint), so only a little live mirror is mixed in.
  float plateW = inside * (1.0 - 0.15 * smoothstep(0.05, 0.6, uHold));
  // Where the dolly magnifies the plate past ~2x (the near water at the frame's bottom corners), its texels
  // show as stair-stepped streaks: fade those to the live rippled mirror (QC round 2, p04-p06).
  vec2 tpp = fwidth(puv) * vec2(textureSize(uPlate, 0));
  float texPerPx = max(tpp.x, tpp.y);
  plateW *= mix(1.0, smoothstep(0.3, 0.6, texPerPx), smoothstep(0.02, 0.3, uHold));
  plateW *= 1.0 - occl;
  plateW *= 1.0 - nofill;
  // Dollied in, the near lake (< ~20 m) leaves what the plate can show without tearing: it becomes the live
  // rippled mirror (QC round 2: comb / stair-step texel stripes in p04-p06's foreground water).
  plateW *= 1.0 - smoothstep(0.1, 0.7, uHold) * (1.0 - smoothstep(14.0, 22.0, dist));
#ifdef EXTRA_PROJECTORS
  // Where an extra projector covers the lake, its texels are good from this camera: no fallback to the live mirror.
  plateW = max(plateW, extraCover);
#endif
  vec3 Nw = normalize(vec3(-waveS.x, 1.0, -waveS.y));
  // A soft lookup: at 0.05 every crest mirrored the panorama's clouds and ridges as thin contour lines; the
  // reference's rings are broad rolling bands.
  vec3 rRip = min(envRadiance(reflect(-V, Nw), 0.2), vec3(6.0));
  if (plateW < 1.0) {
    // Seen from low and close, regular crests mirror the panorama as hard stripes; the reference
    // (F420) shows soft, irregular waves there: weaker crests, broken up by the breeze.
    vec2 sl = waveS * 0.25 + m1.yw * vec2(0.55, 0.9) * 0.035;
    vec3 Nl = normalize(vec3(-sl.x, 1.0, -sl.y));
    vec3 rLive = min(envRadiance(reflect(-V, Nl), 0.16), vec3(6.0));
    // Water, not snow: the reference lake (F420) is a mid blue-grey under the dolly, not a white sheet.
    vec3 live = rLive * vec3(0.62, 0.7, 0.8);
    // Where the projector could not see the lake the mirror stands alone: a little darker, to sit with the
    // plate water around it (a blurred plate around the fill came out blocky, the fill jumps per row).
    live *= 1.0 - 0.12 * occl;
    base = mix(live, base, plateW);
  }
  // Crest bands (F082): a tilted facet reflects higher, bluer sky (dark band) or the pale horizon
  // (light band). Applied as a clamped brightness ratio so the plate keeps its own colours.
  vec3 rFlat = min(envRadiance(reflect(-V, vec3(0.0, 1.0, 0.0)), 0.2), vec3(6.0));
  // Symmetric, so the bands average out to the calm plate's brightness (as in F000).
  // The reference's concentric ring is strong: troughs #8da2c3 against crests #c8d1e0 (F000).
  // (x1.35 and +-0.55 since QC round 5: the reference's troughs are crisp, saturated blue bands.)
  // (x1.35 / +-0.55 in round 6 read as smooth, over-dark painted stripes in round 7: x1.0 / +-0.4, water L170 vs F000 170.)
  // (+-0.48 since QC round 10: "faint and grainy" vs F000's bold troughs; between round 7's +-0.55 stripes and +-0.4.)
  float k = clamp((dot(rRip, LUMA) - dot(rFlat, LUMA)) / max(dot(rFlat, LUMA), 1e-3) * uRippleShade, -0.48, 0.48);
  k *= plateW;
  base *= 1.0 + k;
  // Troughs mirror the bluer sky higher up (QC round 4: trough B-R 42 vs the reference's 56).
  base = mix(base, base * vec3(0.6, 0.77, 1.16), clamp(-k * 1.4, 0.0, 0.55));
  // Distance haze (the reference has more aerial perspective than the plate).
  float fogD = smoothstep(uFog.x, uFog.y, dist);
  base = mix(base, uFogColor, fogD * uFog.z);
  // The hold fog bank runs on over the far lake (the plate's field, so the shore line does not show).
  {
    // Two-tone with the bank's billow, cap 0.8 (QC round 8, T05; as the plate).
    float bk = plateBank(dist, vWorldPos, uFogHold, uTime);
    vec3 bankC = mix(uFogColor * vec3(0.30, 0.37, 0.46), uFogColor * vec3(0.44, 0.54, 0.66), plateBankBillow);
    base = mix(base, bankC * 1.08, min(bk, 0.88));
  }
  // The far-shore mist band continues across the water (same wisps, colour and strength as the plate's since QC round 10).
  base = mix(base, MIST_COLOR * vec3(0.81, 0.9, 1.0), min(plateMist(dist, 0.0) * plateMistWisp(vWorldPos, uTime) * 0.7, 0.85));

  // Live hero reflection (rendered from the mirrored camera). The reference lake is choppy where the
  // sculpture's image falls (F000), so it never reads as a clean arc: small moving facets break it into
  // glints and soft fragments.
  vec3 col = base;
  if (uReflectionOn > 0.5) {
    vec2 ruv = vMirrorClip.xy / vMirrorClip.w * 0.5 + 0.5;
    // Broad, gentle chop (finer painted the horizon with streaks), fading out beyond 25-35 m (0.009 until QC round 7: the
    // near reflection stayed a smooth smear).
    vec4 chop = fbmd(vec3(vWorldPos.x * 1.3, vWorldPos.z * 2.0, uTime * 0.45), 2);
    float chopK = 1.0 - smoothstep(25.0, 35.0, dist);
    vec2 rOffs = offs * 1.6 + vec2(chop.y, -chop.w) * 0.014 * chopK;
    vec4 refl = texture2D(uReflection, ruv + rOffs);
    float glint = mix(1.0, smoothstep(0.1, 0.75, chop.x * 0.5 + 0.5), chopK);
    // Fresnel-weighted (a flat 0.3-0.6 mirrored the hero as strongly at the frame bottom, ~13 deg to the water, as mid-lake)
    // and hidden where the plate already reflects something nearer than the hero along this mirror ray (a rock or floe
    // a few metres off: the hero's image belongs behind it). QC round 7, T01.
    float Fw = 0.02 + 0.98 * pow(1.0 - saturate(dot(V, Nw)), 5.0);
    float w = uMirror * Fw * mix(0.55, 1.0, glint) * mix(1.0, 0.75, uHold);
    float Lb = textureLod(uPlateDepth, clamp(puv, vec2(0.0), vec2(1.0)), 0.0).b;
    float Lh = distance(vWorldPos, uOrbCenter);
    w *= Lb <= 0.0 ? 1.0 : smoothstep(0.55, 0.8, Lb / max(Lh, 1e-3));
    col = col * (1.0 - refl.a * w) + refl.rgb * w;
  }
  // The orb is a light: its reflection on the rippled water under the sculpture is a band of glitter on the
  // crest faces (F000: x 700-800, y 660-720, ~186,203,222), not a soft glow. Every tier; the small facets
  // only exist in the ripple zone (elsewhere the speckle read as grain on glassy water).
  vec3 lO = normalize(uOrbCenter - vWorldPos);
  float zone = 1.0 - smoothstep(uWaveReach * 0.5, uWaveReach * 0.95, r);
  if (zone > 0.0) {
#ifdef WATER_GLITTER
    vec4 sp = fbmd(vec3(vWorldPos.x * 9.0, vWorldPos.z * 14.0, uTime * 1.3), 2);
    vec3 Ns = normalize(vec3(-waveS.x, 1.0, -waveS.y) + vec3(sp.y, 0.0, sp.w) * 0.12);
    float spark = smoothstep(0.35, 0.85, sp.x * 0.5 + 0.5);
#else
    // T0: the streak from the ripple normal alone (no facet noise).
    vec3 Ns = Nw;
    float spark = 0.6;
#endif
    // A soft cyan-white sheen with a little glitter in it (pinpoint sparkle alone read as sun glitter).
    col += vec3(0.7, 0.88, 1.0) * uOrbGlow * 0.5 * ggxSpec(Ns, V, lO, 0.28) * (0.6 + 0.4 * spark) * zone;
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

function quad(min: THREE.Vector3Tuple, max: THREE.Vector3Tuple, y: number, segments: number) {
  const w = max[0] - min[0];
  const d = max[2] - min[2];
  const geo = new THREE.PlaneGeometry(w, d, segments, segments);
  geo.rotateX(-Math.PI / 2);
  geo.translate((min[0] + max[0]) / 2, y, (min[2] + max[2]) / 2);
  return geo;
}

export class Water {
  readonly group = new THREE.Group();
  readonly material: THREE.ShaderMaterial;
  readonly mirrorViewProj = new THREE.Matrix4();

  constructor(
    plate: THREE.Texture,
    plateViewProj: THREE.Matrix4,
    plateGain: number,
    shared: SharedUniforms,
    envDefines: Record<string, string>,
    occlusion: PlateOcclusionUniforms,
    opts: { glitter?: boolean; projectors?: ExtraProjectorBinding } = {},
  ) {
    const defines: Record<string, string> = { ...envDefines, ...(opts.projectors?.defines ?? {}) };
    if (opts.glitter !== false) defines.WATER_GLITTER = "";
    this.material = new THREE.ShaderMaterial({
      name: "rx-water",
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
      defines,
      uniforms: {
        ...(opts.projectors?.uniforms ?? {}),
        uEnvMap: shared.uEnvMap,
        uEnvIntensity: shared.uEnvIntensity,
        uPlate: { value: plate },
        uPlateGain: { value: plateGain },
        // Crest sigma widened from the modifier's 0.42 m: the subdivided Cycles surface is smoother,
        // and the reference reads as a few broad soft bands (F000 / F082), not thin lines.
        // Spacing 4.2 m (the modifier's 2.717 read as fine grey rings; QC round 2 wants 2-3 broad bands).
        // The height scales with it (0.173 x 4.2 / 2.717) so the crest slopes, i.e. the shading, keep their strength.
        uWave: { value: new THREE.Vector4(0.26, 4.2, 1.115, 1.1) },
        // The Blender front keeps growing; 15 m keeps the bands gathered under the hero (F000-F082).
        // A few strong crests gathered under the hero, glassy water beyond (F000).
        // (11 since QC round 5's "3-4 bands"; 8 since round 7: the field ran across the whole frame, F000's is compact.)
        uWaveReach: { value: 8 },
        uPlateViewProj: { value: plateViewProj },
        uMirrorViewProj: { value: this.mirrorViewProj },
        uReflection: { value: null },
        uReflectionOn: { value: 0 },
        uTime: shared.uTime,
        uFrame: shared.uFrame,
        uRippleCenter: { value: new THREE.Vector3().fromArray(WATER.rippleCenter) },
        // 1 = the Blender crests (0.173 m after subdivision, slopes up to ~0.35).
        uRippleAmp: { value: 1.0 },
        uImpulse: { value: new THREE.Vector4(-100, 0, 3.2, 0.9) },
        uSunDir: shared.uSunDir,
        uSunColor: shared.uSunColor,
        uDofBlur: shared.uDofBlur,
        uFocusDist: shared.uFocusDist,
        uDistortion: { value: 0.035 },
        uMirror: { value: 1.0 },
        uHold: shared.uHold,
        uFogHold: shared.uFogHold,
        // (2.6 with the soft 0.2 lookup; 1.8 was tuned on the sharp one.)
        // (2.6 until QC round 10: the ring read faint; watervar6 r6a: water box sd 14.2 -> 16.7 vs F000 15.5.)
        uRippleShade: { value: 3.1 },
        uFog: shared.uFog,
        uFogColor: shared.uFogColor,
        uOrbCenter: shared.uOrbCenter,
        uOrbGlow: shared.uOrbGlow,
        ...occlusion,
      },
    });
    const near = new THREE.Mesh(quad(WATER.near.min, WATER.near.max, WATER.level, 1), this.material);
    // The Blender planes overlap by ~3 m; trim the far one so they never z-fight.
    const farMax: THREE.Vector3Tuple = [WATER.far.max[0], WATER.far.max[1], Math.min(WATER.far.max[2], WATER.near.min[2])];
    const far = new THREE.Mesh(quad(WATER.far.min, farMax, WATER.far.min[1], 1), this.material);
    near.name = "water-near";
    far.name = "water-far";
    this.group.add(near, far);
  }

  /** Fires a travelling ring from the ripple centre. */
  impulse(time: number, amplitude = 0.05, speed = 3.2, width = 0.9) {
    this.material.uniforms.uImpulse.value.set(time, amplitude, speed, width);
  }
}
