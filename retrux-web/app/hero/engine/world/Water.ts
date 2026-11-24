import * as THREE from "three";
import { WATER } from "../config";
import { GLSL_AA_RESOLVE, GLSL_COMMON, GLSL_ENV } from "../shaders/chunks";
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
#ifdef SHORE_AA
  // (the map is bilinear-filtered under SHORE_AA: the same four texels, fetched exactly)
  ivec2 n = textureSize(u${P}Depth, 0) - 1;
  ivec2 j = ivec2(i0);
  vec4 L = vec4(texelFetch(u${P}Depth, clamp(j, ivec2(0), n), 0).b, texelFetch(u${P}Depth, clamp(j + ivec2(1, 0), ivec2(0), n), 0).b,
                texelFetch(u${P}Depth, clamp(j + ivec2(0, 1), ivec2(0), n), 0).b, texelFetch(u${P}Depth, clamp(j + ivec2(1), ivec2(0), n), 0).b);
#else
  vec2 b = (i0 + 0.5) * t;
  vec4 L = vec4(textureLod(u${P}Depth, b, 0.0).b, textureLod(u${P}Depth, b + vec2(t.x, 0.0), 0.0).b,
                textureLod(u${P}Depth, b + vec2(0.0, t.y), 0.0).b, textureLod(u${P}Depth, b + t, 0.0).b);
#endif
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
 * Hotfix 2 (smooth waterline, SHORE_AA): one extra projector's lake sample at the lookup point kpw (projected at kclip, seen
 * with visibility visK), added to (acc, wsum, extraCover) with weight wt. The same terms as GLSL_WATER_PROJECTOR_BLEND, with
 * the raised test reaching the far floes (uShoreFar) and a soft ripple guard (a uv blend instead of a per-pixel switch).
 */
const GLSL_EXTRA_SHORE = EXTRA_PROJECTORS.map(
  (e) => /* glsl */ `
#ifdef ${e.define}
void ${e.p}ShoreK(vec3 kpw, vec4 kclip, float visK, float awayK, vec2 offs, float lodX, float wt, inout vec3 acc, inout float wsum, inout float extraCover) {
  vec2 k = kclip.xy / kclip.w * 0.5 + 0.5;
  vec2 ke = min(k, 1.0 - k);
  float inK = smoothstep(-0.005, 0.035, min(ke.x, ke.y)) * step(0.0, kclip.w);
  if (awayK > 0.02) {
    float kdz = ${e.p}DepthAt(clamp(k, vec2(0.0), vec2(1.0)));
    float kfz = -(u${e.P}View * vec4(kpw, 1.0)).z;
    vec3 kseen = u${e.P}CamPos + (kpw - u${e.P}CamPos) * (kdz / max(kfz, 1e-3));
    visK *= 1.0 - smoothstep(0.05, 0.12, kseen.y - kpw.y) * (1.0 - smoothstep(uShoreFar.x, uShoreFar.y, kfz));
  }
  float wK = u${e.P}Mix * visK * inK;
  extraCover += u${e.P}Mix * inK * visK * wt;
  if (wK > 0.0005) {
    vec2 kc = clamp(k, vec2(0.0005), vec2(0.9995));
    vec2 kq = clamp(k + offs, vec2(0.0005), vec2(0.9995));
    kq = mix(kq, kc, max(smoothstep(0.03, 0.07, ${e.p}SeenY(kq) - vWorldPos.y),
      shoreRatio(shoreNearest(u${e.P}Depth, kq).r, shoreNearest(u${e.P}Depth, kc).r, ${e.p}DepthAt(kq), ${e.p}DepthAt(kc))));
    acc += textureLod(u${e.P}Plate, kq, lodX).rgb * (u${e.P}Gain / uPlateGain) * (wK * wt);
    wsum += wK * wt;
  }
}
#endif`,
).join("");

/**
 * SHORE_AA version of GLSL_WATER_PROJECTOR_BLEND: the straight / re-aimed choice is a weight (sK, anti-aliased over the pixel)
 * and both lookups are blended where it is fractional, instead of a per-pixel switch on the depth map.
 */
const GLSL_WATER_PROJECTOR_BLEND_AA = EXTRA_PROJECTORS.map(
  (e) => /* glsl */ `
#ifdef ${e.define}
    if (u${e.P}DepthOn > 0.5 && u${e.P}Mix > 0.001) {
      vec4 kclip0 = u${e.P}ViewProjF * vec4(vWorldPos, 1.0);
      float awayK = distance(cameraPosition, u${e.P}CamPos);
      float sK = 1.0;
      float visR = 1.0;
      vec3 mpK = vWorldPos;
      vec4 mcK = kclip0;
      if (awayK > 0.02) {
        mpK = ${e.p}MirrorPoint(vWorldPos);
        mcK = u${e.P}ViewProjF * vec4(mpK, 1.0);
        vec2 muv = mcK.xy / mcK.w * 0.5 + 0.5;
        float behindK = -(u${e.P}View * vec4(mpK, 1.0)).z - (${e.p}DepthAt(clamp(muv, vec2(0.0), vec2(1.0))) * 1.06 + 0.8);
        visR = 1.0 - smoothstep(0.0, 2.5, behindK);
        vec2 suv = kclip0.xy / kclip0.w * 0.5 + 0.5;
        float sBehindK = -(u${e.P}View * vec4(vWorldPos, 1.0)).z - (${e.p}DepthAt(clamp(suv, vec2(0.0), vec2(1.0))) * 1.06 + 0.8);
        sK = shoreAA(behindK) * shoreAA(-sBehindK);
      }
      if (sK < 1.0) ${e.p}ShoreK(mpK, mcK, visR, awayK, offs, lodX, 1.0 - sK, acc, wsum, extraCover);
      if (sK > 0.0) ${e.p}ShoreK(vWorldPos, kclip0, 1.0, awayK, offs, lodX, sK, acc, wsum, extraCover);
    }
#endif`,
).join("");

/**
 * Round 11, user-priority round (WATER lane): the artist's water, reproduced (`LAKE_R12`, the default lake on the baked
 * environment; `?envlake=plate` keeps the re-aimed plate lake, `?envlake=mirror` the ENV lane's mirror model).
 *
 * The Cycles water (forensics 3.3) is a white conductor mirror whose normal is the Bump node (strength 1, distance 0.07,
 * filter width 1) of a 2-stop B-spline ColorRamp of a 3D fBm Noise Texture (scale 3, detail 4, roughness 0.5, lacunarity 2,
 * normalized) on object coordinates. Cycles evaluates the height at P, P + dPdx and P + dPdy (the pixel's ray differentials)
 * and builds N' = normalize(|det| N - 0.07 sign(det) surfgrad). This port:
 * - Cycles' own Perlin noise and fBm, bit for bit (hash_uint3, grad3, fade, tri_mix, 0.982 scale): the numpy twin of this code
 *   matches Blender's own noise values to 3e-6 and its ColorRamp exactly (WORK tools/cyc_noise.py, gn_noise.py), so the
 *   wavelets near the camera are the Cycles render's own pattern, fixed on the water (nothing swims when the camera moves).
 * - The same finite differences per octave at the pixel centre, each octave split into the share that is coherent over the
 *   pixel (the visible streak texture) and the incoherent rest (a blur), from a simulation of Cycles' 64 Blackman-Harris
 *   filtered samples per pixel (tools/octave_sim.py, engine_model_sim.py: the per-row elevation / azimuth spreads of this model
 *   are within ~10-15 % of the simulated Cycles pixels from 13 m to 73 m).
 * - The reflected ray is looked up in LakeMirror's planar mirror of the real scene (baked meshes, sky, live clouds) with a
 *   short parallax search on the mirror path length: a tilted ray from the lake point reaches a near floe or rock long before
 *   the mirror camera's ray in the same direction would (the floes' and rocks' reflections stay attached, as in Cycles).
 */
const GLSL_LAKE_R12 = /* glsl */ `
uniform mat4 uMirrorViewProj;   // the hero reflection's mirror camera (RenderPipeline.mirrorViewProj)
uint lkRot(uint x, uint k) { return (x << k) | (x >> (32u - k)); }
// Cycles util/hash.h hash_uint3 (Jenkins lookup3 final()); an int is cast to uint as in C (two's complement).
uint lkHash(ivec3 k) {
  uint a = 0xdeadbf08u;
  uint b = a;
  uint c = a;
  c += uint(k.z + 1073741824) - 1073741824u;
  b += uint(k.y + 1073741824) - 1073741824u;
  a += uint(k.x + 1073741824) - 1073741824u;
  c ^= b; c -= lkRot(b, 14u);
  a ^= c; a -= lkRot(c, 11u);
  b ^= a; b -= lkRot(a, 25u);
  c ^= b; c -= lkRot(b, 16u);
  a ^= c; a -= lkRot(c, 4u);
  b ^= a; b -= lkRot(a, 14u);
  c ^= b; c -= lkRot(b, 24u);
  return c;
}
float lkGrad(uint hash, vec3 f) {
  uint h = hash & 15u;
  float u = h < 8u ? f.x : f.y;
  float vt = (h == 12u || h == 14u) ? f.x : f.z;
  float v = h < 4u ? f.y : vt;
  return ((h & 1u) != 0u ? -u : u) + ((h & 2u) != 0u ? -v : v);
}
// Cycles perlin_3d. z2 = false on the near plane: its object z is 0, so the upper lattice layer has weight fade(0) = 0.
float lkPerlin(vec3 p, bool z2) {
  vec3 fl = floor(p);
  vec3 f = p - fl;
  ivec3 I = ivec3(fl);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = mix(mix(lkGrad(lkHash(I), f), lkGrad(lkHash(I + ivec3(1, 0, 0)), f - vec3(1.0, 0.0, 0.0)), u.x),
                mix(lkGrad(lkHash(I + ivec3(0, 1, 0)), f - vec3(0.0, 1.0, 0.0)), lkGrad(lkHash(I + ivec3(1, 1, 0)), f - vec3(1.0, 1.0, 0.0)), u.x), u.y);
  if (!z2) return a;
  float b = mix(mix(lkGrad(lkHash(I + ivec3(0, 0, 1)), f - vec3(0.0, 0.0, 1.0)), lkGrad(lkHash(I + ivec3(1, 0, 1)), f - vec3(1.0, 0.0, 1.0)), u.x),
                mix(lkGrad(lkHash(I + ivec3(0, 1, 1)), f - vec3(0.0, 1.0, 1.0)), lkGrad(lkHash(I + ivec3(1, 1, 1)), f - vec3(1.0)), u.x), u.y);
  return mix(a, b, u.z);
}
// perlin_3d inside one lattice cell from its corner hashes (lower layer ha: 000, 100, 010, 110; upper hb: 001, 101, 011, 111).
float lkCell(vec3 f, uvec4 ha, uvec4 hb, bool z2) {
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = mix(mix(lkGrad(ha.x, f), lkGrad(ha.y, f - vec3(1.0, 0.0, 0.0)), u.x),
                mix(lkGrad(ha.z, f - vec3(0.0, 1.0, 0.0)), lkGrad(ha.w, f - vec3(1.0, 1.0, 0.0)), u.x), u.y);
  if (!z2) return a;
  float b = mix(mix(lkGrad(hb.x, f - vec3(0.0, 0.0, 1.0)), lkGrad(hb.y, f - vec3(1.0, 0.0, 1.0)), u.x),
                mix(lkGrad(hb.z, f - vec3(0.0, 1.0, 1.0)), lkGrad(hb.w, f - vec3(1.0)), u.x), u.y);
  return mix(a, b, u.z);
}
// The noise at p, p + ox and p + oy (the Bump node's three heights). When all three fall in one lattice cell (the coarse
// octaves, nearly always) the cell's corner hashes are computed once; otherwise three full evaluations. Same values.
vec3 lkPerlin3(vec3 p, vec3 ox, vec3 oy, bool z2) {
  vec3 fl = floor(p);
  if (all(equal(floor(p + ox), fl)) && all(equal(floor(p + oy), fl))) {
    ivec3 I = ivec3(fl);
    uvec4 ha = uvec4(lkHash(I), lkHash(I + ivec3(1, 0, 0)), lkHash(I + ivec3(0, 1, 0)), lkHash(I + ivec3(1, 1, 0)));
    uvec4 hb = z2 ? uvec4(lkHash(I + ivec3(0, 0, 1)), lkHash(I + ivec3(1, 0, 1)), lkHash(I + ivec3(0, 1, 1)), lkHash(I + ivec3(1, 1, 1))) : uvec4(0u);
    vec3 f = p - fl;
    return vec3(lkCell(f, ha, hb, z2), lkCell(f + ox, ha, hb, z2), lkCell(f + oy, ha, hb, z2));
  }
  return vec3(lkPerlin(p, z2), lkPerlin(p + ox, z2), lkPerlin(p + oy, z2));
}
#ifdef LK_BUMPAXIS
// The noise at p and p + o only (fix round 2, LK_BUMPAXIS): one lattice cell's corner hashes when both fall in it.
vec2 lkPerlin2(vec3 p, vec3 o, bool z2) {
  vec3 fl = floor(p);
  if (all(equal(floor(p + o), fl))) {
    ivec3 I = ivec3(fl);
    uvec4 ha = uvec4(lkHash(I), lkHash(I + ivec3(1, 0, 0)), lkHash(I + ivec3(0, 1, 0)), lkHash(I + ivec3(1, 1, 0)));
    uvec4 hb = z2 ? uvec4(lkHash(I + ivec3(0, 0, 1)), lkHash(I + ivec3(1, 0, 1)), lkHash(I + ivec3(0, 1, 1)), lkHash(I + ivec3(1, 1, 1))) : uvec4(0u);
    vec3 f = p - fl;
    return vec2(lkCell(f, ha, hb, z2), lkCell(f + o, ha, hb, z2));
  }
  return vec2(lkPerlin(p, z2), lkPerlin(p + o, z2));
}
#endif
// Per octave (unit lattice frequency), as functions of the footprint L in lattice units (tools/octave_sim.py): the coherent
// share of the pixel-mean finite-difference slope along one axis (relative to the octave's slope rms), the averaging factor
// of the other axis' footprint, and the rms of a single sample's finite difference.
float lkCoh(float L) { float x = L / 0.95; return 1.0 / (1.0 + x * x); }
float lkAvg(float L) { float x = max(L - 0.3, 0.0) / 2.2; return inversesqrt(1.0 + pow(x, 1.3)); }
float lkFd(float L) { float x = L / 0.567; return pow(1.0 + x * x * x, -1.0 / 3.0); }
// The bump at lake point Pw (three.js world) with the pixel footprint vectors dPx, dPy (world, one screen pixel). kDof widens
// the coherence footprint by the lake's DOF blur (in pixels), as averaging over the blur circle does. Returns the perturbed
// normal (three.js) and, in sig, the incoherent slope rms (per metre of height per metre) along the screen x / y footprints.
vec3 lkBump(vec3 Pw, vec3 dPx, vec3 dPy, float kDof, out vec2 sig) {
  // Blender coordinates (x, -z, y), then the object coordinates of the plane Cycles shows there (Plane.013, 1.7 mm higher,
  // covers Plane.011 from y 11.92 m on).
  vec3 pb = vec3(Pw.x, -Pw.z, Pw.y);
  bool farP = pb.y > 11.920909;
  vec3 co = farP ? vec3(pb.x, pb.y - 34.2286, 0.10754) : vec3(pb.x, pb.y, 0.0);
  vec3 dcx = vec3(dPx.x, -dPx.z, 0.0);
  vec3 dcy = vec3(dPy.x, -dPy.z, 0.0);
  float Lx0 = length(dcx.xy);
  float Ly0 = length(dcy.xy);
  float amp = 0.2534194;   // 0.5 * 0.982 / (1 + 0.5 + 0.25 + 0.125 + 0.0625)
  float f = 3.0;
  float nc = 0.0, hx = 0.0, hy = 0.0, vx = 0.0, vy = 0.0;
  for (int i = 0; i < 5; i++) {
    float Lx = Lx0 * f;
    float Ly = Ly0 * f;
    float Tx = lkFd(Lx);
    float Ty = lkFd(Ly);
    float cx = lkCoh(Lx * kDof) * lkAvg(Ly * kDof);
    float cy = lkCoh(Ly * kDof) * lkAvg(Lx * kDof);
    // Octaves whose coherent share is negligible only add their variance (no noise evaluation).
#ifdef LK_BUMPAXIS
    // Fix round 2 (frame budget while the camera moves): LK_BUMPCUT per AXIS. Seen at a grazing angle the along-view footprint
    // spans many cells of the fine octaves (cy small) while the across one does not: the third height (p + oy, several cells
    // away: three full noise evaluations) only fed a slope share under LK_BUMPCUT, which joins the spread as in LK_BUMPCUT.
    bool lkEx = cx > LK_BUMPCUT;
    bool lkEy = cy > LK_BUMPCUT;
    if (lkEx != lkEy) {
      float s0 = amp * f * 0.6888;
      vec2 n2 = lkPerlin2(co * f, lkEx ? dcx * f : dcy * f, farP);
      nc += amp * n2.x;
      if (lkEx) {
        hx += amp * min(cx / Tx, 1.0) * (n2.y - n2.x);
        vy += cy * cy * s0 * s0;
      } else {
        hy += amp * min(cy / Ty, 1.0) * (n2.y - n2.x);
        vx += cx * cx * s0 * s0;
      }
    } else
#endif
#ifdef LK_BUMPCUT
    // Fix round 1 (frame budget while the camera moves: the bump's noise was ~2 ms of the frame): an octave whose coherent
    // share is under LK_BUMPCUT is not evaluated; its coherent share joins the incoherent spread instead (same slope variance,
    // so the rays' spread and the columns stay; only that octave's per-pixel wavelet, <= LK_BUMPCUT of its slope, is dropped).
    if (max(cx, cy) > LK_BUMPCUT) {
#else
    if (max(cx, cy) > 0.01) {
#endif
      vec3 n3 = lkPerlin3(co * f, dcx * f, dcy * f, farP);
      nc += amp * n3.x;
      hx += amp * min(cx / Tx, 1.0) * (n3.y - n3.x);
      hy += amp * min(cy / Ty, 1.0) * (n3.z - n3.x);
    }
#ifdef LK_BUMPCUT
    else {
      float s0 = amp * f * 0.6888;
      vx += cx * cx * s0 * s0;
      vy += cy * cy * s0 * s0;
    }
#endif
    // Each Cycles sample takes its finite differences over the COMPACT ray differential: an isotropic footprint of radius
    // ~ distance x pixel angle (= the across footprint Lx0), not the elongated pixel (WORK tools/step_sim.py: this, and only
    // this, reproduces Cycles' share of rays near the horizon at every row). So a sample sees nearly the true slope of every
    // octave coarser than ~1 cm; the pixel's mean is the coherent share above, the rest spreads the pixel's rays.
    float Tr = lkFd(Lx);
    float s = amp * f * 0.6888;   // the octave's slope rms per axis (Perlin slope rms 0.6888 per lattice unit)
    vx += max(Tr * Tr - cx * cx, 0.0) * s * s;
    vy += max(Tr * Tr - cy * cy, 0.0) * s * s;
    amp *= 0.5;
    f *= 2.0;
  }
  // ColorRamp (B-spline, 0 black, 1 white) slope at the noise value: 0.5 + n (1 - n).
  float n = 0.5 + nc;
  float rp = 0.5 + n * (1.0 - n);
  sig = rp * sqrt(vec2(vx, vy));
  // svm_node_set_bump on the plane (normal +z), Blender coordinates.
  vec3 Rx = vec3(dcy.y, -dcy.x, 0.0);   // cross(dcy, z)
  vec3 Ry = vec3(-dcx.y, dcx.x, 0.0);   // cross(z, dcx)
  float det = dot(dcx, Rx);
  vec3 sg = (rp * hx) * Rx + (rp * hy) * Ry;
  vec3 No = normalize(abs(det) * vec3(0.0, 0.0, 1.0) - 0.07 * sign(det) * sg);
  return vec3(No.x, No.z, -No.y);
}
// Normal CDF (logistic approximation, |error| < 0.01) and density.
float lkPhi(float x) { return 1.0 / (1.0 + exp(-1.702 * x)); }
// (lab calibration: the parts of the last lkReflect)
vec3 lkDbgU;
vec3 lkDbgH;
float lkDbgPc;
float lkDbgSH;
float lkPdf(float x) { return 0.3989423 * exp(-0.5 * x * x); }
// One stratum of the pixel's rays: the ray from P in direction dir (its share of the pixel's elevation spread: boxE rad of
// elevation, sA rad of azimuth), marched front to back along its projection in the mirror target with partial coverage:
// the ray reaches a surface seen at distance D beyond P at the fraction D / (t + D) of the way from uv0 to dir's vanishing
// point (the mirror camera sees it from t + D); "how far past the surface the ray is, in steps" is the coverage, so a grazing
// ray's hit / miss blends instead of flipping from row to row (the pixel's ~64 Cycles samples are spread over the pixel and
// in azimuth). Each step takes the target with a box filter: the stratum's elevation span and the azimuth spread, both
// scaled by the step's parallax fraction, plus the screen footprint (gx, gy: the target uv's derivatives x the DOF).
vec3 lkRay(vec2 uv0, vec2 p0, float t, vec3 dir, float boxE, float sA, vec2 gx, vec2 gy, int steps) {
  vec4 c1 = uEnvMirrorViewProj * vec4(dir, 0.0);
  if (c1.w <= 1e-4) return lakeSky(dir);
  vec2 p1 = c1.xy / c1.w;
  vec2 duv = (p1 - p0) * 0.5;
  float e = asin(clamp(dir.y, -1.0, 1.0));
  vec2 hz = normalize(dir.xz + vec2(1e-6, 0.0));
  const float DE = 0.02;
  vec4 cu = uEnvMirrorViewProj * vec4(hz.x * cos(e + DE), sin(e + DE), hz.y * cos(e + DE), 0.0);
  vec2 J = (cu.xy / max(cu.w, 1e-4) - p1) * (0.5 / DE);
  vec2 hz2 = vec2(hz.x * cos(DE) - hz.y * sin(DE), hz.x * sin(DE) + hz.y * cos(DE));
  vec4 ca = uEnvMirrorViewProj * vec4(hz2.x * cos(e), sin(e), hz2.y * cos(e), 0.0);
  vec2 K = (ca.xy / max(ca.w, 1e-4) - p1) * (0.5 / DE);
  float lj = max(length(J), 1e-6);
  float lk = max(length(K), 1e-6);
  vec3 acc = vec3(0.0);
  float T = 1.0;
  float sPrev = 0.0;
#ifdef LK_SKYUP
  // Fix round 1: a ray that leaves the target over its top (35 deg; the Wave modifier's flanks send rays to 40-60 deg) sees the
  // sky by direction, not the target's clamped top row (the 35 deg sky, lighter than the deep blue overhead).
  bool lkUp = uv0.y + duv.y < 0.0005;
#endif
  // Steps dense near the lake point (s = (i / steps)^2): a floe or rock a metre or two beyond it sits at s ~ 0.03-0.1.
  for (int i = 1; i <= 16; i++) {
    if (i > steps || T < 0.02) break;
    float u = float(i) / float(steps);
    float sv = u * u;
    float ds = sv - sPrev;
    sPrev = sv;
    // Depth first (plain bilinear); the filtered colour only where the ray reaches a surface (w > 0).
    vec2 uvS = clamp(uv0 + duv * sv, vec2(0.0005), vec2(0.9995));
    float k = max(1.0 - t / max(textureLod(uEnvMirror, uvS, 0.0).a, 1e-3), 0.0);
    float w = i == steps ? 1.0 : clamp((sv - k) / ds + 0.5, 0.0, 1.0);
    if (w < 1.0 && i < steps) {
      // Secant: the surface seen here is reached at s = k; when that comes before the next step, test it there. A thin
      // floe face just beyond the lake point covers only a few target rows of the path, between two steps.
      float uN = float(i + 1) / float(steps);
      if (k > sv && k < uN * uN) {
        vec2 uvK = clamp(uv0 + duv * k, vec2(0.0005), vec2(0.9995));
        float k2 = max(1.0 - t / max(textureLod(uEnvMirror, uvK, 0.0).a, 1e-3), 0.0);
        if (k >= k2 - 0.01) {
          vec2 dyK = (J / lj) * sqrt(dot(gy, gy) + pow(boxE * k * lj, 2.0));
          vec2 dxK = (K / lk) * sqrt(dot(gx, gx) + pow(3.46 * sA * k * lk, 2.0));
          acc += T * (1.0 - w) * textureGrad(uEnvMirror, uvK, dxK, dyK).rgb;
          T *= w;
        }
      }
    }
#ifdef LK_SKYUP
    if (lkUp && i == steps) {
      acc += T * w * lakeSky(dir);
      break;
    }
#endif
    if (w > 0.0) {
      vec2 dy = (J / lj) * sqrt(dot(gy, gy) + pow(boxE * sv * lj, 2.0));
      vec2 dx = (K / lk) * sqrt(dot(gx, gx) + pow(3.46 * sA * sv * lk, 2.0));
      acc += T * w * textureGrad(uEnvMirror, uvS, dx, dy).rgb;
      T *= 1.0 - w;
    }
  }
  return acc;
}
// Inverse of lkPhi.
float lkPhiInv(float p) { p = clamp(p, 1e-4, 1.0 - 1e-4); return log(p / (1.0 - p)) / 1.702; }
// The reflection of lake point P (camera distance t) through the Cycles bump: N = the pixel's coherent normal, sig = the
// incoherent slope rms (screen x / y). The pixel's rays spread in elevation (2 x 0.07 x slope) around the coherent ray and in
// azimuth (that x tan of the grazing angle); Cycles lifts every ray that would leave under the horizon to
// dot(Ng, R) = min(0.9 Iz, 0.01) (ensure_valid_specular_reflection): that share looks along the water at the horizon (the far
// floes', the iceberg's and the shore's faces: the reflection columns). So: the clamped share at the horizon elevation, plus
// the rest as a wide vertical lookup centred on the mean elevation of the unclamped rays.
vec3 lkReflect(vec2 uv0, vec2 gx, vec2 gy, float t, vec3 V, vec3 N, vec2 sig, vec2 extra, out float sHit) {
  uv0 += extra;
  vec4 c0 = uEnvMirrorViewProj * vec4(-V.x, V.y, -V.z, 0.0);
  vec2 p0 = c0.xy / max(c0.w, 1e-4);
  vec3 rc = reflect(-V, N);
  float mu = asin(clamp(rc.y, -1.0, 1.0));
  vec2 hz = normalize(rc.xz + vec2(1e-6, 0.0));
  float sigE = max(2.0 * 0.07 * sig.y, 1e-4);
  float sinA = clamp(V.y, 0.002, 0.99);
  float sigA = 2.0 * 0.07 * sig.x * sinA / sqrt(1.0 - sinA * sinA);
  float emin = asin(min(0.9 * sinA, 0.01));
  float pc = lkPhi((emin - mu) / sigE);
  sHit = pc;
  // The unclamped rays in 3 strata of equal share (conditional quantiles 1/6, 1/2, 5/6; boxes between 0, 1/3, 2/3, 1).
  float b1 = mu + sigE * lkPhiInv(pc + (1.0 - pc) / 3.0);
  float b2 = mu + sigE * lkPhiInv(pc + (1.0 - pc) * 2.0 / 3.0);
  float top = max(mu + 2.5 * sigE, b2 + 0.01);
  vec3 col = vec3(0.0);
  for (int k = 0; k < 3; k++) {
    float lo = k == 0 ? emin : (k == 1 ? b1 : b2);
    float hi = k == 0 ? b1 : (k == 1 ? b2 : top);
    float q = mu + sigE * lkPhiInv(pc + (1.0 - pc) * (float(k) + 0.5) / 3.0);
    float eq = clamp(q, lo, hi);
    vec3 d = vec3(hz.x * cos(eq), sin(eq), hz.y * cos(eq));
    col += lkRay(uv0, p0, t, d, max(hi - lo, 1e-4), sigA, gx, gy, 7);
  }
  col *= (1.0 - pc) / 3.0;
  lkDbgU = col;
  lkDbgPc = pc;
  lkDbgH = vec3(0.0);
  if (pc > 0.004) {
    vec3 dirH = vec3(hz.x * cos(emin), sin(emin), hz.y * cos(emin));
    lkDbgH = lkRay(uv0, p0, t, dirH, 0.0, sigA, gx, gy, 10);
    lkDbgSH = 0.0;
    col += pc * lkDbgH;
  }
  return col;
}
// v3 (default; v2 above with ?lkv=2): the pixel's rays split by the first obstacle behind the lake point. The v2 strata (3
// fixed quantile rays) could not resolve the share of a pixel's rays that hit the first face behind P: Cycles, just in front
// of a far floe, sends ~40-60 % of them into its sunlit face (WORK an/farR4.png, col_prof.py: columns 0.9-1.9 vs v2 0.4-0.9).
// 1. The horizon ray (elevation emin, where Cycles lifts every ray that would leave under the horizon) finds the surface
//    nearest P in the reflected azimuth: d beyond P.
// 2. Its top: the hit point raised by 0.15-5.6 m stays on the obstacle while the mirror target sees nothing behind it.
// 3. Every ray of the pixel below the top's elevation from P, e_top = atan(h / d), hits that face (the clamped ones too):
//    the share F = Phi((e_top - mu) / sigE) takes the face's colour, its footprint the face's height x the azimuth spread.
// 4. The rest go over it: one short parallax march at their conditional mean elevation, box-filtered over their spread.
uniform vec3 uMirrorCamPos;   // LakeMirror's mirrored camera (the target's alpha is the path length from it)
float lkK(vec2 uv, float t) {
  return max(1.0 - t / max(textureLod(uEnvMirror, clamp(uv, vec2(0.0005), vec2(0.9995)), 0.0).a, 1e-3), 0.0);
}
vec2 lkProj(vec3 X) {
  vec4 c = uEnvMirrorViewProj * vec4(X, 1.0);
  return c.xy / max(c.w, 1e-4) * 0.5 + 0.5;
}
vec3 lkReflect3(vec2 uv0, vec2 gx, vec2 gy, float t, vec3 V, vec3 N, vec2 sig, vec2 extra, vec3 P, out float sHit) {
  uv0 += extra;
  vec4 c0 = uEnvMirrorViewProj * vec4(-V.x, V.y, -V.z, 0.0);
  vec2 p0 = c0.xy / max(c0.w, 1e-4);
  vec3 rc = reflect(-V, N);
  float mu = asin(clamp(rc.y, -1.0, 1.0));
  vec2 hz = normalize(rc.xz + vec2(1e-6, 0.0));
  float sigE = max(2.0 * 0.07 * sig.y, 1e-4);
  float sinA = clamp(V.y, 0.002, 0.99);
  float sigA = 2.0 * 0.07 * sig.x * sinA / sqrt(1.0 - sinA * sinA);
  float emin = asin(min(0.9 * sinA, 0.01));
  float pc = lkPhi((emin - mu) / sigE);
  vec3 dirH = vec3(hz.x * cos(emin), sin(emin), hz.y * cos(emin));
  // Target uv per radian of azimuth around the horizon direction (the azimuth spread's direction and scale in the target).
  vec2 K0;
  float lk0;
  {
    const float DA = 0.02;
    vec4 cH = uEnvMirrorViewProj * vec4(dirH, 0.0);
    vec2 hz2 = vec2(hz.x * cos(DA) - hz.y * sin(DA), hz.x * sin(DA) + hz.y * cos(DA));
    vec4 ca = uEnvMirrorViewProj * vec4(hz2.x * cos(emin), sin(emin), hz2.y * cos(emin), 0.0);
    K0 = (ca.xy / max(ca.w, 1e-4) - cH.xy / max(cH.w, 1e-4)) * (0.5 / DA);
    lk0 = max(length(K0), 1e-6);
  }
  // 1. The horizon ray's first surface (s: the parallax fraction d / (t + d); sky = none). Steps of ~1 target texel along its
  // path (uv is linear in s), up to 24: a far floe's face is 1-4 texel rows tall in the target (10 quadratic steps stepped
  // over it on every other row of lake). Long paths (near water, big rocks) take bigger steps. A soft front-to-back
  // coverage (how far past the surface the step is, in steps): the ray grazes a gently sloping shore (s ~ k), where a hard
  // hit / miss flipped from row to row (v3c / v3d: horizontal stripes on the far-left water).
  vec4 c1 = uEnvMirrorViewProj * vec4(dirH, 0.0);
  vec2 duv = (c1.xy / max(c1.w, 1e-4) - p0) * 0.5;
  float nH = clamp(ceil(length(duv * uEnvMirrorSize)), 6.0, 24.0);
  float ds = 1.0 / nH;
  float rows = uEnvMirrorSize.y;
  float Tr = 1.0;
  vec3 accC = vec3(0.0);
  float accS = 0.0;
  float accW = 0.0;
  for (int i = 1; i <= 24; i++) {
    if (float(i) > nH || Tr < 0.03) break;
    float sv = float(i) * ds;
    vec2 uvS = uv0 + duv * sv;
    float k = lkK(uvS, t);
    if (k >= 0.995) continue;
    float w = clamp((sv - k) / ds + 0.5, 0.0, 1.0);
    if (w <= 0.0 && k < sv + ds) {
      // Secant: the surface seen here is reached at s = k, before the next step (a thin face just beyond P).
      vec2 uvK = uv0 + duv * k;
      if (k >= lkK(uvK, t) - 0.01) {
        uvS = uvK;
        w = 1.0;
      }
    }
    if (w > 0.0) {
      // The face's own colour where the march met it: the texel row (a far floe's face is ~1 row; a filtered lookup mixed in
      // the background above its top edge), across the azimuth spread at its distance. Not the lake's DOF: the screen blur
      // of a column is not a blur of the face in the mirror target.
      float dI = t * k / max(1.0 - k, 1e-3);
      vec2 uvA = vec2(uvS.x, (floor(uvS.y * rows) + 0.5) / rows);
      vec2 dxF = (K0 / lk0) * (1.73 * sigA * dI / (t + dI)) * lk0;
      vec3 cI = textureGrad(uEnvMirror, clamp(uvA, vec2(0.0005), vec2(0.9995)), dxF, vec2(0.0, 0.05 / rows)).rgb;
      float a = Tr * w;
      accC += a * cI;
      accS += a * k;
      accW += a;
      Tr *= 1.0 - w;
    }
  }
  float cov = accW;
  float sH = cov > 0.01 ? accS / cov : 1.0;
  sHit = sH;
  float F = pc;
  float Fface = pc;
  vec3 cFace = vec3(0.0);
  float hTop = 0.0;
  if (cov > 0.01) {
    cFace = accC / cov;
    float d = t * sH / max(1.0 - sH, 1e-3);
    vec3 X = P + dirH * d;
    // 2. The obstacle's top: probes at doubling heights; "on" while the target sees a surface no farther than the probe.
    // The probes on the face also give its colour up its height (the march met it at its foot, often darker than the sunlit
    // face and rim the pixel's rays see over its whole height); each weighted by the height it stands for.
    float hOn = 0.0;
    float hOff = 0.12;
    vec3 accP = cFace * 0.12;
    float accPw = 0.12;
    for (int j = 0; j < 7; j++) {
      vec3 Xq = X + vec3(0.0, hOff, 0.0);
      vec4 q = textureLod(uEnvMirror, clamp(lkProj(Xq), vec2(0.0005), vec2(0.9995)), 0.0);
      if (q.a > distance(uMirrorCamPos, Xq) * 1.005 + 0.25) break;
      accP += q.rgb * hOff;
      accPw += hOff;
      hOn = hOff;
      hOff *= 2.0;
    }
    {
      float hM = 0.5 * (hOn + hOff);
      vec3 Xq = X + vec3(0.0, hM, 0.0);
      vec4 q = textureLod(uEnvMirror, clamp(lkProj(Xq), vec2(0.0005), vec2(0.9995)), 0.0);
      if (q.a > distance(uMirrorCamPos, Xq) * 1.005 + 0.25) hOff = hM;
      else {
        accP += q.rgb * (hM - hOn);
        accPw += hM - hOn;
        hOn = hM;
      }
    }
    hTop = 0.5 * (hOn + hOff);
    cFace = accP / accPw;
    // 3. Every ray below the top's elevation from P hits the face (the clamped ones too).
    float eTop = atan(hTop + emin * d, d);
    Fface = max(lkPhi((eTop - mu) / sigE), pc);
  }
  // The horizon rays that met nothing see the far field at the horizon.
  vec4 cE = textureLod(uEnvMirror, clamp(uv0 + duv, vec2(0.0005), vec2(0.9995)), 0.0);
  vec3 cFar = cE.a > 59000.0 ? lakeSky(dirH) : cE.rgb;
  F = cov * Fface + (1.0 - cov) * pc;
  vec3 col = cov * Fface * cFace + (1.0 - cov) * pc * cFar;
  lkDbgH = cov > 0.01 ? cFace : cFar;
  lkDbgPc = F;
  lkDbgSH = hTop;
  lkDbgU = vec3(0.0);
  if (F < 0.995) {
    // 4. The rays over the obstacle (the Gaussian above e_top) in two strata of equal share, each looked up at its conditional
    // median and box-filtered between its quantile bounds. The upper box ends at the 90 % quantile: a box out to mu + 2.5 sigma
    // spread the thin upper tail evenly and gave the sky the weight of the massif (far-left water 1.4-1.5x Cycles; Cycles'
    // far-left lake is barely brighter than its flat mirror of the massif).
    float eLo = mu + sigE * lkPhiInv(F);
    float eMid = mu + sigE * lkPhiInv(F + 0.5 * (1.0 - F));
    float eHi = max(mu + sigE * lkPhiInv(F + 0.9 * (1.0 - F)), eMid + 0.002);
    for (int k = 0; k < 2; k++) {
      float lo = k == 0 ? eLo : eMid;
      float hi = k == 0 ? eMid : eHi;
      float eq = clamp(mu + sigE * lkPhiInv(F + (1.0 - F) * (k == 0 ? 0.25 : 0.7)), lo, hi);
      vec3 dR = vec3(hz.x * cos(eq), sin(eq), hz.y * cos(eq));
      lkDbgU += lkRay(uv0, p0, t, dR, max(hi - lo, 1e-4), sigA, gx, gy, 4);
    }
    lkDbgU *= 0.5;
    col += (1.0 - F) * lkDbgU;
  }
  return col;
}
#ifdef LK_HGT
// v4 (default with the heightfield; v3 above with ?lkv=3): the low rays' obstacles from the static max-mip heightfield
// (LakeHeight) instead of the target march. v3's march stepped over thin faces on some rows and overshot them on others, so the
// face and its colour flipped from row to row (WORK an/hstripe_modes*.png: horizontal stripes from the low hold camera).
uniform highp sampler2D uLkHgt;   // highest surface (world y) per texel; level L = maxima of 2^L x 2^L texels
uniform vec4 uLkHgtG;             // x: grid x origin, y: grid z at row 0 (rows toward -z), z: 1 / cell (1/m), w: size (texels)
uniform float uLkHgtTop;          // top level of the walk
#ifdef LK_HALF
uniform sampler2D uLkWalk;        // the walk term at half resolution (Water.renderWalk)
uniform vec2 uLkWalkInv;          // 1 / the main target's size (px)
#ifdef LK_WALKREPROJ
uniform mat4 uLkWalkVP;           // the camera's view-projection when the walk was drawn (LakeSchedule)
#endif
#endif
#ifdef LK_CACHE
uniform highp sampler2D uLkCache; // the reflection term (lkReflect4) cached while the camera is still (Water.renderCache)
uniform float uLkCacheOn;         // 1 when the cache holds this frame's camera, DOF, mirror and walk
#endif
#if defined(LK_CACHEN) && defined(LK_CACHE)
// (Declared only for the water itself: the cache passes draw into these targets, a bound sampler of the target is a feedback
// loop that ANGLE rejects.)
uniform highp sampler2D uLkCacheN; // the bump's coherent normal (x, z), cached with the term (fix round 1: the hero's chop)
#endif
#ifdef LK_CACHEPASS
uniform vec2 uLkZero;             // (0, 0) at run time: the cache pass's "no bend", not a constant the compiler could fold
#endif
float lkWalkIt;                   // (lab) iterations of the last walk
float lkHits;                     // (lab) obstacles met
float lkWalkD = 1.0;              // (lab) the first face's parallax fraction d / (t + d) (1: none)
float lkWalkE = 0.0;              // (lab) the final horizon elevation (rad)
vec4 lkDbgE = vec4(0.0);          // (lab) the horizon lookup: uv, a / 60000, luma
// The heightfield's surface height, bilinear (level 0).
float lkHgtAt(vec2 xz) {
  vec2 g = vec2(xz.x - uLkHgtG.x, uLkHgtG.y - xz.y) * uLkHgtG.z;
  return textureLod(uLkHgt, g / uLkHgtG.w, 0.0).r;
}
// The normal CDF with honest tails (tanh form, |error| < 3e-4; lkPhi's logistic overstates Phi(-3) 4x, which gave tall far
// faces several times their share of rays from the near water).
float lkPhiT(float x) { return 0.5 + 0.5 * tanh(0.7978846 * (x + 0.044715 * x * x * x)); }
// Mean elevation of the pixel's rays (Gaussian mu, sigE) between ea and eb; the first band also holds the share lifted to
// emin = ea (Cycles' ensure_valid_specular_reflection).
float lkBandMean(float ea, float eb, float mu, float sigE, float Fa, float Fb, bool first) {
  float pa = lkPdf((ea - mu) / sigE);
  float pb = lkPdf((eb - mu) / sigE);
  float lifted = first ? Fa : 0.0;
  float share = first ? Fb : Fb - Fa;
  return clamp((lifted * ea + mu * (Fb - Fa) - sigE * (pb - pa)) / max(share, 1e-5), ea, eb);
}
// The obstacle part (the walk): rgb = the share-weighted colours of the faces met, a = the share of the pixel's rays they take
// (0: nothing rose above the horizon ray). Independent of time (static bump, static scene) and of the ring waves: the
// half-resolution pass (LK_HALF, Water.renderWalk) draws it only when the camera moved.
vec4 lkWalkTerm(float t, vec3 V, vec3 N, vec2 sig, vec3 P) {
  vec3 rc = reflect(-V, N);
  float mu = asin(clamp(rc.y, -1.0, 1.0));
  vec2 hz = normalize(rc.xz + vec2(1e-6, 0.0));
  float sigE = max(2.0 * 0.07 * sig.y, 1e-4);
  float sinA = clamp(V.y, 0.002, 0.99);
  float sigA = 2.0 * 0.07 * sig.x * sinA / sqrt(1.0 - sinA * sinA);
  float emin = asin(min(0.9 * sinA, 0.01));
  float pc = lkPhiT((emin - mu) / sigE);
  // The walk takes the pixel's coherent azimuth (the bumped reflection's): the column edges come out wavy, as Cycles' (v4b,
  // the flat azimuth: straight, hard-edged columns; ?lkhaz=0).
#if LK_HAZ == 1
  vec2 hz0 = hz;
#else
  vec2 hz0 = normalize(-V.xz + vec2(1e-6, 0.0));
#endif
  vec3 dirH = vec3(hz0.x * cos(emin), sin(emin), hz0.y * cos(emin));
  // Target uv per radian of azimuth around the horizon direction (the azimuth spread's footprint at a face).
  vec2 K0;
  {
    const float DA = 0.02;
    vec4 cH = uEnvMirrorViewProj * vec4(dirH, 0.0);
    vec2 hz2 = vec2(hz0.x * cos(DA) - hz0.y * sin(DA), hz0.x * sin(DA) + hz0.y * cos(DA));
    vec4 ca = uEnvMirrorViewProj * vec4(hz2.x * cos(emin), sin(emin), hz2.y * cos(emin), 0.0);
    K0 = (ca.xy / max(ca.w, 1e-4) - cH.xy / max(cH.w, 1e-4)) * (0.5 / DA);
  }
  // The horizon profile seen from P along that azimuth: a quadtree walk of the heightfield (a cell the current horizon ray
  // clears at its entry, being lowest there, is skipped whole; one it may reach is split) with the ray starting at Cycles'
  // lifted elevation emin. Every texel whose surface rises above the current horizon raises it (its top seen from P: bilinear
  // samples into it, continuous as P moves): the pixel's rays between the old and the new horizon elevation hit that face,
  // looked up in the target at the heights they reach there. All obstacles in one consistent pass: when a near floe sinks
  // under the horizon ray, the share it gave up goes to what is behind it.
  float ic = uLkHgtG.z;
  float cell = 1.0 / ic;
  float Ng = uLkHgtG.w;
  vec2 g0 = vec2(P.x - uLkHgtG.x, uLkHgtG.y - P.z) * ic;
  vec2 dg = vec2(hz0.x, -hz0.y) * ic;
  dg = vec2(abs(dg.x) < 1e-5 ? 1e-5 : dg.x, abs(dg.y) < 1e-5 ? 1e-5 : dg.y);
  vec2 idg = 1.0 / dg;
  ivec2 st = ivec2(step(0.0, dg));
  int top = int(uLkHgtTop + 0.5);
  float y0 = P.y;
  float m = tan(emin);
  float Fc = 0.0;
  float Fa = 0.0;
  float eC = emin;
  vec3 acc = vec3(0.0);
  float d = 0.05;
  int L = 0;
  float hits = 0.0;
  float dFirst = -1.0;
  lkDbgH = vec3(0.0);
  for (int i = 0; i < LK_WALK_N; i++) {
    lkWalkIt = float(i + 1);
    vec2 g = g0 + dg * d;
    if (d > LK_DMAX || g.x < 0.0 || g.y < 0.0 || g.x >= Ng || g.y >= Ng) break;
    // The finest level the walk descends to grows with the distance (0.31 m to 12 m, 0.63 m to 30 m, 1.25 m beyond): far
    // faces need no finer place (their tops and colours come from bilinear samples), near ones do.
    int Lmin = d < 12.0 ? 0 : (d < 30.0 ? 1 : 2);
    L = max(L, Lmin);
    ivec2 gi = ivec2(g);
    ivec2 cl = gi >> L;
    float H = texelFetch(uLkHgt, cl, L).r;
    vec2 tb = (vec2((cl + st) << L) - g) * idg;
    float dExit = d + max(min(tb.x, tb.y), 0.0) + 0.003;
    if (y0 + m * d > H) {
      // Past the cell; climb only out of the parents it left (a parent still around the ray was split: its other children
      // are tested at this level, not re-split from above).
      ivec2 gN = ivec2(g0 + dg * dExit);
      d = dExit;
      for (int u = 0; u < 8; u++) {
        if (L >= top || (gN >> (L + 1)) == (gi >> (L + 1))) break;
        L++;
      }
      continue;
    }
    if (L > Lmin) {
      L--;
      continue;
    }
    // A texel whose top reaches the horizon ray: how high its surface rises seen from P.
    float tN = m;
    float cL = cell * exp2(float(L));
    for (int k = 0; k < 4; k++) {
      float dk = d + cL * (k == 0 ? 0.25 : (k == 1 ? 0.75 : (k == 2 ? 1.5 : 3.0)));
      tN = max(tN, (lkHgtAt(P.xz + hz0 * dk) - y0) / dk);
    }
    if (tN > m + 1e-6) {
      float eN = atan(tN);
      float FN = lkPhiT((eN - mu) / sigE);
      bool first = hits < 0.5;
      float share = first ? FN : FN - Fc;
      if (share > 0.002) {
        // The band's rays: their mean elevation, the face looked up there, box-filtered over the heights of the band (at most
        // +-1 sigma around the mean) and the azimuth spread at its distance.
        float eM = lkBandMean(eC, eN, mu, sigE, first ? pc : Fc, FN, first);
        float eLo = max(eC, eM - sigE);
        float eHi = min(eN, eM + sigE);
#ifdef LK_HMIN
        // The face looked up at the texel's entry (the face stands at or behind it) and no lower than LK_HMIN above the water
        // (at most half the face's height there): lower, the mirrored camera sees under the face's foot into the floe's inside,
        // which the double-sided bake shows sunlit where the Cycles water shows the face's dark foot and the waterline slit
        // (resume 7: |log| against Cycles under the right front slabs 0.607 -> 0.549 at rest, every GT camera better).
        float dF = d;
        float hMin = min(LK_HMIN, 0.5 * dF * tan(eN));
        float hM = max(dF * tan(eM), hMin);
        float hLo = max(dF * tan(eLo), hMin);
        float hHi = max(dF * tan(eHi), hM);
        vec3 X = vec3(P.x + hz0.x * dF, 0.0, P.z + hz0.y * dF);
        vec2 uvM = lkProj(X + vec3(0.0, y0 + hM, 0.0));
        vec2 dyF = lkProj(X + vec3(0.0, y0 + hHi, 0.0)) - lkProj(X + vec3(0.0, y0 + hLo, 0.0));
#else
        float dF = d + 0.25 * cL;
        vec3 X = vec3(P.x + hz0.x * dF, 0.0, P.z + hz0.y * dF);
        vec2 uvM = lkProj(X + vec3(0.0, y0 + dF * tan(eM), 0.0));
        vec2 dyF = lkProj(X + vec3(0.0, y0 + dF * tan(eHi), 0.0)) - lkProj(X + vec3(0.0, y0 + dF * tan(eLo), 0.0));
#endif
        dyF += normalize(dyF + vec2(0.0, 1e-6)) * (0.5 / uEnvMirrorSize.y);
        vec2 dxF = K0 * (3.46 * sigA * dF / (t + dF)) + vec2(0.5 / uEnvMirrorSize.x, 0.0);
        vec3 cF = textureGrad(uEnvMirror, clamp(uvM, vec2(0.0005), vec2(0.9995)), dxF, dyF).rgb;
        // (Lab: with a short ?lkdmax the faces near its end fade over to the remainder's target march.)
        float w = 1.0 - smoothstep(0.9 * LK_DMAX, LK_DMAX, d);
        acc += share * w * cF;
        Fa += share * w;
        if (first) { lkDbgH = cF; dFirst = d; }
        hits += 1.0;
      }
      Fc = max(Fc, FN);
      m = tN;
      eC = eN;
      if (Fc > 0.995 || hits > 3.5) break;
    }
    // Past this texel (its box maximum may still stand above the raised ray).
    d = dExit;
  }
  lkHits = hits;
  lkWalkD = dFirst > 0.0 ? dFirst / (t + dFirst) : 1.0;
  lkWalkE = eC;
  return vec4(acc, Fa);
}
#ifdef LK_STRATAFAR
// Water lane fix round 1: one stratum of the rays over every obstacle, looked up where it ends. The walk has already given the
// rays below the obstacles' horizon to the faces they meet, so within LK_DMAX a stratum ray (above that horizon) meets nothing
// the heightfield holds; it ends on the sky, a cloud card or a far surface. The target at the ray's vanishing point gives that
// surface's path a from the mirrored camera; one parallax step (the lake point reaches it at s = 1 - t / a of the way, as the
// march's secant did) and the box filter of the stratum (elevation span x azimuth spread, plus the screen footprint). lkRay's
// 3-step march tested near rocks and floes that the walk had already counted (hits by point samples of the depth, flipping
// from row to row) and cost 3-9 fetches per stratum; this costs 2 (lab ?lkfar=1; rejected, see the defines).
vec3 lkFar(vec2 uv0, vec2 p0, float t, vec3 dir, float boxE, float sA, vec2 gx, vec2 gy) {
  vec4 c1 = uEnvMirrorViewProj * vec4(dir, 0.0);
  if (c1.w <= 1e-4) return lakeSky(dir);
  vec2 p1 = c1.xy / c1.w;
  vec2 duv = (p1 - p0) * 0.5;
  float e = asin(clamp(dir.y, -1.0, 1.0));
  vec2 hz = normalize(dir.xz + vec2(1e-6, 0.0));
  const float DE = 0.02;
  vec4 cu = uEnvMirrorViewProj * vec4(hz.x * cos(e + DE), sin(e + DE), hz.y * cos(e + DE), 0.0);
  vec2 J = (cu.xy / max(cu.w, 1e-4) - p1) * (0.5 / DE);
  vec2 hz2 = vec2(hz.x * cos(DE) - hz.y * sin(DE), hz.x * sin(DE) + hz.y * cos(DE));
  vec4 ca = uEnvMirrorViewProj * vec4(hz2.x * cos(e), sin(e), hz2.y * cos(e), 0.0);
  vec2 K = (ca.xy / max(ca.w, 1e-4) - p1) * (0.5 / DE);
  float lj = max(length(J), 1e-6);
  float lk = max(length(K), 1e-6);
  float a = textureLod(uEnvMirror, clamp(uv0 + duv, vec2(0.0005), vec2(0.9995)), 0.0).a;
  float s = a > 59000.0 ? 1.0 : clamp(1.0 - t / max(a, 1e-3), 0.0, 1.0);
  vec2 uvS = clamp(uv0 + duv * s, vec2(0.0005), vec2(0.9995));
  vec2 dy = (J / lj) * sqrt(dot(gy, gy) + pow(boxE * s * lj, 2.0));
  vec2 dx = (K / lk) * sqrt(dot(gx, gx) + pow(3.46 * sA * s * lk, 2.0));
  return textureGrad(uEnvMirror, uvS, dx, dy).rgb;
}
#define LK_STRATUM(dR, boxE, steps) lkFar(uv0, p0, t, dR, boxE, sigA, gx, gy)
#else
#define LK_STRATUM(dR, boxE, steps) lkRay(uv0, p0, t, dR, boxE, sigA, gx, gy, steps)
#endif
// The full lake reflection (v4): the walk term W (own or from the half-resolution pass), the lifted rays the walk did not
// account for (nothing rose above the horizon ray: they see the sky and clouds at the horizon), and the rays over every
// obstacle (as v3's remainder): two strata of equal share at their conditional quantiles, each a short parallax march
// box-filtered between its quantile bounds (the upper box ends at the 90 % quantile).
vec3 lkReflect4(vec2 uv0, vec2 gx, vec2 gy, float t, vec3 V, vec3 N, vec2 sig, vec2 extra, vec4 W, out float sHit) {
#ifdef LK_STALEFIX
  // Fix round 2 (judge2: the slab feet flashed on every mirror redraw while the camera moved). While the camera moves the
  // target is drawn every 3rd frame and read through the matrices it was drawn with. The marches below run from P's place to
  // a ray's vanishing point; they took P's place as the projection of the mirrored VIEW direction and P's distance from the
  // CURRENT camera, both exact only for the camera the target was drawn from: with an older target every reflection beyond P
  // slid with the water and snapped back on the redraw. P's own projection (uv0) and its distance from the target's mirrored
  // camera keep the marches on the true rays of this frame in an older target (identical for a fresh one).
  vec2 p0 = uv0 * 2.0 - 1.0;
  t = distance(uMirrorCamPos, vWorldPos);
  uv0 += extra;
#else
  uv0 += extra;
  vec4 c0 = uEnvMirrorViewProj * vec4(-V.x, V.y, -V.z, 0.0);
  vec2 p0 = c0.xy / max(c0.w, 1e-4);
#endif
  vec3 rc = reflect(-V, N);
  float mu = asin(clamp(rc.y, -1.0, 1.0));
  vec2 hz = normalize(rc.xz + vec2(1e-6, 0.0));
  float sigE = max(2.0 * 0.07 * sig.y, 1e-4);
  float sinA = clamp(V.y, 0.002, 0.99);
  float sigA = 2.0 * 0.07 * sig.x * sinA / sqrt(1.0 - sinA * sinA);
  float emin = asin(min(0.9 * sinA, 0.01));
  float pc = lkPhiT((emin - mu) / sigE);
  vec3 col = W.rgb;
  float Fc = max(W.a, pc);
  float pFree = max(pc - W.a, 0.0);
  lkDbgH = W.rgb / max(W.a, 1e-4);
  if (pFree > 1e-4) {
    // The lifted rays the walk saw meet nothing within LK_DMAX: what they reach beyond (the far shore, the icebergs, the sky)
    // from the target along the horizon ray, with one parallax step (the surface the target shows at the horizon's vanishing
    // point is reached at s = 1 - t / a of the way from the lake point's mirror point; no closer than LK_DMAX). (v4g took the
    // sky wherever the target showed a mesh there: the iceberg beyond 60 m went dark, WORK an/slab760.png.)
    vec3 dirH = vec3(hz.x * cos(emin), sin(emin), hz.y * cos(emin));
    vec4 c1 = uEnvMirrorViewProj * vec4(dirH, 0.0);
    vec2 duvE = (c1.xy / max(c1.w, 1e-4) - p0) * 0.5;
    vec4 cE = textureLod(uEnvMirror, clamp(uv0 + duvE, vec2(0.0005), vec2(0.9995)), 0.0);
    vec3 cFar = cE.rgb;
    if (cE.a < 59000.0) {
      float sE = clamp(1.0 - t / max(cE.a, 1e-3), LK_DMAX / (t + LK_DMAX), 1.0);
      vec4 cS = textureLod(uEnvMirror, clamp(uv0 + duvE * sE, vec2(0.0005), vec2(0.9995)), 0.0);
      cFar = cS.rgb;
    }
    col += pFree * cFar;
    if (W.a < 1e-4) lkDbgH = cFar;
    lkDbgE = vec4(uv0 + duvE, cE.a / 60000.0, dot(cE.rgb, vec3(0.2126, 0.7152, 0.0722)));
  }
  sHit = lkWalkD;
  lkDbgPc = Fc;
  lkDbgSH = lkWalkE;
  lkDbgU = vec3(0.0);
  if (Fc < 0.995) {
#if LK_STRATA == 3
    // Three strata of equal share (boxes between the conditional quantiles 0, 1/3, 2/3 and 0.975, each looked up at its
    // conditional median, 3 parallax steps): the sky brightens steeply with elevation toward the sun's side (sky_world.exr:
    // 0.04 at 0.5 deg, ~1 at 5 deg, ~2 at 12-20 deg), so the upper tail carries much of the pixel's light (2 strata ending at
    // the 90 % quantile left the near water 20-28 % under Cycles on the left, clouds off: WORK tools/bandcmp.py).
    float b0 = mu + sigE * lkPhiInv(Fc);
    float b1 = mu + sigE * lkPhiInv(Fc + (1.0 - Fc) / 3.0);
    float b2 = mu + sigE * lkPhiInv(Fc + (1.0 - Fc) * 2.0 / 3.0);
    float b3 = max(mu + sigE * lkPhiInv(Fc + (1.0 - Fc) * 0.975), b2 + 0.002);
    for (int k = 0; k < 3; k++) {
      float lo = k == 0 ? b0 : (k == 1 ? b1 : b2);
      float hi = k == 0 ? b1 : (k == 1 ? b2 : b3);
      float eq = clamp(mu + sigE * lkPhiInv(Fc + (1.0 - Fc) * (float(k) + 0.5) / 3.0), lo, hi);
      vec3 dR = vec3(hz.x * cos(eq), sin(eq), hz.y * cos(eq));
      lkDbgU += LK_STRATUM(dR, max(hi - lo, 1e-4), 3);
    }
    lkDbgU *= 1.0 / 3.0;
#else
    float eLo = mu + sigE * lkPhiInv(Fc);
    float eMid = mu + sigE * lkPhiInv(Fc + 0.5 * (1.0 - Fc));
    float eHi = max(mu + sigE * lkPhiInv(Fc + 0.9 * (1.0 - Fc)), eMid + 0.002);
    for (int k = 0; k < 2; k++) {
      float lo = k == 0 ? eLo : eMid;
      float hi = k == 0 ? eMid : eHi;
      float eq = clamp(mu + sigE * lkPhiInv(Fc + (1.0 - Fc) * (k == 0 ? 0.25 : 0.7)), lo, hi);
      vec3 dR = vec3(hz.x * cos(eq), sin(eq), hz.y * cos(eq));
      lkDbgU += LK_STRATUM(dR, max(hi - lo, 1e-4), 4);
    }
    lkDbgU *= 0.5;
#endif
    col += (1.0 - Fc) * lkDbgU;
  }
  return col;
}
#endif
`;

/**
 * Live lake surface. The Cycles plate already contains the calm water (mirror
 * reflections of sky and mountains, rendered without the Blender Wave modifier);
 * this shader animates it: concentric ripples under the hero, travelling impulse
 * rings on press/release, moving micro-ripples, the live reflection of the hero
 * and small sun glints.
 */

/**
 * AA5b (20 Nov, the far-floe pale block; `?ffblock=0` = AA3 exactly: this text is not in the shader then). The walk's face
 * colour is looked up in the mirror target LK_HMIN (5 cm) above the water at the face's entry X, with a filter footprint as tall
 * as the band of heights its rays reach. Right under a face's foot the target shows the floe's INSIDE (the mirrored camera,
 * under the water, looks into the floe through the oblique clip at the water line: the double-sided bake's sunlit insides).
 * On T1's half-size target a far floe's face is 1-2 texel rows tall (~8 cm per row at 45 m), so the lookup's filter taps
 * reached that row; as the camera moved, the foot line slid across the target's rows and every lake pixel reading that face
 * texel turned pale at once (a block under the floe that pops in; the 2x render shows the same on thinner faces).
 * Where a SMALL footprint (top within LK_FFB + 1..2 texels of X's foot) comes within LK_FFB texels of X's foot (X's foot
 * projects onto the face, at or above its true foot), the lookup point stays where the walk puts it, but its two bracketing
 * target rows are read separately and a row that lies farther than the front-most of the two (path length, the target's
 * alpha; scale LK_FFBT m) takes the front-most row's colour: the face is the nearest surface there, the inside under its foot
 * and whatever stands behind a short face over its top are farther. Both conditions fade over a texel (smoothstep): nothing
 * switches. Taller footprints (the far faces' bands, many texels: averages a single row would change) are left as they were.
 */
const LK_FFB_ANCHOR = "        vec3 cF = textureGrad(uEnvMirror, clamp(uvM, vec2(0.0005), vec2(0.9995)), dxF, dyF).rgb;\n";
const LK_FFB_GLSL = /* glsl */ `        {
          // AA5b: a small footprint near X's foot: the face's two bracketing rows; a row behind the front-most one takes its colour.
          vec2 uvFt = lkProj(X + vec3(0.0, y0, 0.0));
          float aFt = length((uvM - uvFt) * uEnvMirrorSize);
          float hFt = 0.5 * length(dyF * uEnvMirrorSize);
          float gFt = (1.0 - smoothstep(LK_FFB, LK_FFB + 1.0, aFt - hFt)) * (1.0 - smoothstep(LK_FFB + 1.0, LK_FFB + 2.0, aFt + hFt));
#ifdef LK_FFB_TOG
          if (uLkFfbOn < 0.5) gFt = 0.0;
#endif
          if (gFt > 0.0) {
            float vR = clamp(uvM.y, 0.0005, 0.9995) * uEnvMirrorSize.y - 0.5;
            float j0 = floor(vR);
            float ux = clamp(uvM.x, 0.0005, 0.9995);
            vec4 r0 = textureGrad(uEnvMirror, vec2(ux, (j0 + 0.5) / uEnvMirrorSize.y), dxF, vec2(0.0));
            vec4 r1 = textureGrad(uEnvMirror, vec2(ux, (j0 + 1.5) / uEnvMirrorSize.y), dxF, vec2(0.0));
            float pm = min(r0.a, r1.a);
            vec3 cN = r0.a <= r1.a ? r0.rgb : r1.rgb;
            // AA6 fix (pre-judges R-1 / R-2): only a row that can be the floe's own sunlit inside takes the front row's colour:
            // at most LK_FFBD0..1 m behind it (a band of 2-4 m brought the pale block back under the near far floe, 8-16 m and
            // 20-40 m remove it alike; the far shore or sky seen over a low face lies farther) and brighter than it (LK_FFBL:
            // not a tiny object's dark face behind a nearer, brighter surface)
            vec3 lW = vec3(0.2126, 0.7152, 0.0722);
            float lN = dot(cN, lW);
            float k0 = (1.0 - exp(-(r0.a - pm) / LK_FFBT)) * (1.0 - smoothstep(LK_FFBD0, LK_FFBD1, r0.a - pm)) * smoothstep(0.0, LK_FFBL, dot(r0.rgb, lW) - lN);
            float k1 = (1.0 - exp(-(r1.a - pm) / LK_FFBT)) * (1.0 - smoothstep(LK_FFBD0, LK_FFBD1, r1.a - pm)) * smoothstep(0.0, LK_FFBL, dot(r1.rgb, lW) - lN);
            vec3 c0 = mix(r0.rgb, cN, k0);
            vec3 c1 = mix(r1.rgb, cN, k1);
            cF = mix(cF, mix(c0, c1, vR - j0), gFt);
          }
        }
`;
/** The water's fragment source with the AA5b face-lookup guard (throws if the anchor moved). */
function waterFragFF(src: string) {
  const i = src.indexOf(LK_FFB_ANCHOR);
  if (i < 0 || src.indexOf(LK_FFB_ANCHOR, i + 1) >= 0) throw new Error("Water: AA5b anchor");
  return src.slice(0, i + LK_FFB_ANCHOR.length) + LK_FFB_GLSL + src.slice(i + LK_FFB_ANCHOR.length);
}

/**
 * P4 round 2, lane water (21 Nov 2026; plan MAIN/notes/round11/p3/r11_1_plan.json). `?p4water=0` = MAIN exactly: none of the
 * text below reaches the shader and no uniform is added. Each task is a set of edits of the water's source (a whole function
 * swapped, or an anchor line replaced; every anchor must occur exactly as often as expected, or the constructor throws), made
 * only while the task is on:
 * - G2 (`?lkchop=0` off): the hold's near water. (1) A near-field chop: two octaves of world-space value-noise slopes on the
 *   crests' tilt, weighted by the dolly and fading out with the distance (F402 / F420's bottom strip: irregular dark-blue
 *   wavelets with bright tips, where the crest train alone mirrored one smooth sky patch per flank: a frame-wide 'glass plate'
 *   arc). (2) The train itself irregular: phase +-LK_P4WP m and amplitude x(1 +- LK_P4WA) from a low-frequency value noise of the
 *   world position (taken once per pixel), so no crest is a compass arc. (3) The march catches a crest top that the ray grazes
 *   between two steps (the slope of H - y changes sign inside the step: its maximum is tested): the dotted line along the crest
 *   silhouettes came from pixels where the 12 steps skipped the top. (4) On the tilted water the strata lookups take at least
 *   LK_P4FP texels along the target's rows (the flanks magnify the half-size target: texel staircases on the mirrored edges).
 *   (6) Specular anti-aliasing on the tilted water: the tilt's change across the pixel joins the slope spread (the grazing top
 *   of every crest silhouette reflects the low horizon on a sub-pixel line, caught on one pixel per row step: the dotted line;
 *   it persists with 48 march steps, so it is not the march). (The plan's (5), a rest-ring fade within 6 m of the camera, has
 *   nothing to act on: the nearest visible water is 13 m away at rest and 16.5 m in the hold.)
 * - Q8 (`?lkring=r11` off): the rest ring as physical waves: a phase-steepened (Gerstner-like) profile, narrow deep troughs and
 *   broad crests, amplitude x(1 +- 0.3) around the ring from 3- and 5-lobe terms, the crest clamp raised; the orb's glint on the
 *   ring zone cyan-white (MAIN's luma) and x1.3 (its GGX lobe can be anisotropic: uLkP4G.xy; default MAIN's isotropic alpha).
 * - Q9 (OFF by default since the fix round; `?lkglass=1` on): the bump's alias guard beyond ~30-40 m: an octave whose footprint reaches 0.15..0.45 lattice cells
 *   (x the DOF) gives up its coherent share (the pixel-centre sample of a sub-pixel wavelet aliases into 1-2 px row stripes, the
 *   'corduroy'); its variance joins the incoherent spread (lkBump's own bookkeeping: Tr^2 - c^2), so the rays' spread and the
 *   columns keep the Cycles-fitted slope variance.
 */
type P4Edit = { find: string; repl: string; count?: number; fnEnd?: string };
function p4Apply(src: string, edits: P4Edit[], tag: string) {
  for (const e of edits) {
    if (e.fnEnd !== undefined) {
      // a whole function: from `find` (unique) to the first `fnEnd` after it
      const i = src.indexOf(e.find);
      if (i < 0 || src.indexOf(e.find, i + 1) >= 0) throw new Error(`Water: P4 ${tag} anchor ${e.find.slice(0, 40)}`);
      const j = src.indexOf(e.fnEnd, i);
      if (j < 0) throw new Error(`Water: P4 ${tag} end ${e.fnEnd.slice(0, 40)}`);
      src = src.slice(0, i) + e.repl + src.slice(j + e.fnEnd.length);
      continue;
    }
    const n = src.split(e.find).length - 1;
    if (n !== (e.count ?? 1)) throw new Error(`Water: P4 ${tag} anchor x${n} ${e.find.slice(0, 40)}`);
    src = src.split(e.find).join(e.repl);
  }
  return src;
}
const P4_G2: P4Edit[] = [
  {
    find: "vec3 lkWaveH(vec2 xz, float R) {",
    fnEnd: "\n}\n",
    repl: /* glsl */ `// P4 water G2 (2): the train's irregularity at the pixel (lkWaveGrad): x phase (m), yz its xz gradient, w amplitude; amplitude
// gradient. (MAIN: 0, 0, 0, 1 / 0.)
vec4 lkWm = vec4(0.0, 0.0, 0.0, 1.0);
vec2 lkWmA = vec2(0.0);
uniform float uLkP4E;   // P4 water G2 (7): the tilted reflection's floor (lkWaveTilt)
vec3 lkWaveH(vec2 xz, float R) {
  if (abs(xz.x) > 14.85 || abs(xz.y) > 14.85) return vec3(0.0);
  vec2 d = vec2(xz.x, xz.y + 8.6);
  float r = length(d);
  if (r >= R) return vec3(0.0);
  const float WB = 1.358483;
  const float NW = 1.808;
  float a = mod(r + lkWm.x - 1.115 * uTime + WB, 2.0 * WB) - WB;
  float e = 1.0 - smoothstep(R - 2.0, R, r);
  float z0 = 0.173 * exp(-(NW * a) * (NW * a));
  float z = z0 * lkWm.w;
  vec2 n = d / max(r, 1e-3);
  vec2 g = (-2.0 * NW * NW * a * z) * (n + lkWm.yz) + z0 * lkWmA;
  float de = (smoothstep(R - 2.0, R, r + 0.01) - smoothstep(R - 2.0, R, r)) * 100.0;
  return vec3(z * e, g * e - z * de * n);
}
`,
  },
  {
    find: "vec2 lkWaveGrad(vec3 P) {",
    fnEnd: "  return hit.yz;\n}\n",
    repl: /* glsl */ `uniform vec4 uLkP4W;    // P4 water G2 (2): x phase (m), y amplitude share, z noise frequency (1/m); w: (6)
vec2 lkWaveGrad(vec3 P) {
  float R = mix(8.2, 21.5, smoothstep(0.0, 1.0, uHold));
  {
    // P4 water G2 (2): the train's phase and amplitude from a value noise of the world position (cells of 1 / uLkP4W.z m), taken
    // here once: the march's samples lie within ~0.5 m of P.
    vec4 nP = noised(vec3(P.xz * uLkP4W.z, 7.31));
    vec4 nA = noised(vec3(P.xz * uLkP4W.z + vec2(19.7, -4.3), 3.17));
    lkWm = vec4(uLkP4W.x * nP.x, (uLkP4W.x * uLkP4W.z) * nP.yz, 1.0 + uLkP4W.y * nA.x);
    lkWmA = (uLkP4W.y * uLkP4W.z) * nA.yz;
  }
  float yT = 0.173 * (1.0 + uLkP4W.y);   // the march starts over the highest crest
  vec2 toC = (cameraPosition.xz - P.xz) / max(cameraPosition.y - P.y, 0.05);
  vec2 x0 = P.xz + toC * yT;
  vec2 c = vec2(0.0, -8.6);
  if (min(distance(P.xz, c), distance(x0, c)) - length(toC) * yT > R) return vec2(0.0);
  float yPrev = yT;
  vec3 hit = vec3(0.0);
#ifdef LK_WAVE2
  // P4 water G2 (3): g(y) = H - y along the ray (y: height on the ray, from the top down) and its slope dg/dy = grad H . toC - 1.
  // A step whose ends both pass over the water can still graze a crest's top between them: there dg/dy turns from < 0 (g rising
  // as the ray descends) to > 0; the maximum, where the slope's linear interpolation is 0, is tested. Continuous silhouettes.
  float dPrev = dot(lkWaveH(x0, R).yz, toC) - 1.0;
  for (int i = 1; i <= LK_WAVE2_N; i++) {
    float y = yT * (1.0 - float(i) / float(LK_WAVE2_N));
    vec3 w = lkWaveH(P.xz + toC * y, R);
    float dg = dot(w.yz, toC) - 1.0;
    float ya = yPrev;
    float yb = y;
    bool found = w.x >= y;
    if (!found && dPrev < 0.0 && dg > 0.0) {
      float ym = yPrev + (y - yPrev) * dPrev / (dPrev - dg);
      if (lkWaveH(P.xz + toC * ym, R).x >= ym) {
        yb = ym;
        found = true;
      }
    }
    if (found) {
      for (int k = 0; k < 5; k++) {
        float yh = 0.5 * (ya + yb);
        if (lkWaveH(P.xz + toC * yh, R).x >= yh) yb = yh;
        else ya = yh;
      }
      hit = lkWaveH(P.xz + toC * (0.5 * (ya + yb)), R);
      break;
    }
    yPrev = y;
    dPrev = dg;
  }
#else
  float gPrev = lkWaveH(x0, R).x - yPrev;
  for (int i = 1; i <= 8; i++) {
    float y = yT * (1.0 - float(i) / 8.0);
    vec3 w = lkWaveH(P.xz + toC * y, R);
    float g = w.x - y;
    if (g >= 0.0) {
      float t = gPrev / min(gPrev - g, -1e-6);
      float yh = mix(yPrev, y, clamp(t, 0.0, 1.0));
      hit = lkWaveH(P.xz + toC * yh, R);
      break;
    }
    yPrev = y;
    gPrev = g;
  }
#endif
  return hit.yz;
}
`,
  },
  {
    // (1) + (4): the chop and the footprint floor, declared after lkWaveTilt (inside LK_WAVEB)
    find: "  if (R.y < 0.0) Nt = normalize(vec3(R.x, -R.y, R.z) + V);\n#endif\n  return Nt;\n}\n",
    repl: /* glsl */ `  if (R.y < 0.0) Nt = normalize(vec3(R.x, -R.y, R.z) + V);
#endif
  {
    // P4 water G2 (7): no tilted reflection lower than ~uLkP4E x the flat water's own elevation. Just behind every crest's top
    // the back flank turns the reflection through the horizon (elevation 0 where its slope is half the view's), a sub-pixel
    // sliver that the one sample per pixel caught on one pixel per row step of the silhouette: a dotted dark line (the walk's
    // faces and the far shore at the horizon; it stays with 48 march steps and with any slope spread). Clamped, the crest's
    // back reflects as the water around it (a smooth floor: back flanks fold up onto it without an outline).
    vec3 R2 = reflect(-V, Nt);
    float eF = uLkP4E * V.y;
    float eS = 0.5 * (R2.y + eF + sqrt((R2.y - eF) * (R2.y - eF) + 0.25 * eF * eF));   // a soft floor (no kink, no outline)
    Nt = normalize(normalize(vec3(R2.x, eS, R2.z)) + V);
  }
  return Nt;
}
// P4 water G2 (1): the near water's chop in the hold (F402 / F420: the bottom strip, 16-25 m from the hold camera, shows
// irregular dark-blue wavelets 50-200 px wide). Slopes (dh/dx, dh/dz) of two value-noise octaves (uLkP4CF.xy cycles/m, the
// second turned 37 deg; a third at 2.4 x the second's, turned -23 deg, 0.42 x its amplitude), drifting with the wind
// (uLkP4CF.zw m/s) and evolving slowly, amplitudes uLkP4C.xy (slope per unit
// noise gradient per cycle/m), x the dolly, fading out between uLkP4C.z and uLkP4C.w m from the camera. Band-limited: an
// octave fades out where the pixel's footprint on the water (fp, m: fwidth) x the lake's DOF blur (kDof px) reaches 0.2-0.45 of
// its wavelength.
uniform vec4 uLkP4C;
uniform vec4 uLkP4CF;
uniform float uLkP4K;
// P4 water fix (judge W3 / W4 / W5): x / y the octaves' band limit (footprint x frequency; was 0.2-0.45: the finer octaves aliased
// into 1-2 px streaks that flickered in the press and the hold), z the third octave's share (was 0.42), w the slope's soft limit
// (the deepest tilts mirrored the uniform deep-blue sky: flat-filled, hard-edged, over-saturated troughs).
uniform vec4 uLkP4B;
// P4 water fix: x the chop's own slope change per px at which it is damped (judge W3; 0 off), y the onset feather (m) inside the
// crest train's hard cuts (its front at R and the |x|, |z| 14.85 m square; judge W5: a stepped edge where the chop began).
uniform vec4 uLkP4D;
vec2 lkChop(vec3 P, float dist, vec2 fp, float kDof) {
  float w = smoothstep(0.0, 1.0, uHold) * (1.0 - smoothstep(uLkP4C.z, uLkP4C.w, dist));
  if (w <= 0.0) return vec2(0.0);
  {
    float R = mix(8.2, 21.5, smoothstep(0.0, 1.0, uHold));
    float rP = length(vec2(P.x, P.z + 8.6));
    float mP = max(abs(P.x), abs(P.z));
    w *= (1.0 - smoothstep(R - 0.5 - uLkP4D.y, R - 0.5, rP)) * (1.0 - smoothstep(14.55 - uLkP4D.y, 14.55, mP));
    if (w <= 0.0) return vec2(0.0);
  }
  float L = max(fp.x, fp.y) * mix(1.0, kDof, uLkP4K);   // (uLkP4K: the share of the lake's DOF blur in the band limit)
  float a1 = uLkP4C.x * (1.0 - smoothstep(uLkP4B.x, uLkP4B.y, L * uLkP4CF.x));
  float a2 = uLkP4C.y * (1.0 - smoothstep(uLkP4B.x, uLkP4B.y, L * uLkP4CF.y));
  float f3 = 2.4 * uLkP4CF.y;
  float a3 = uLkP4C.y * uLkP4B.z * (1.0 - smoothstep(uLkP4B.x, uLkP4B.y, L * f3));
  vec4 n1 = noised(vec3(P.xz * uLkP4CF.x + vec2(uLkP4CF.z, 0.3 * uLkP4CF.z) * uTime * uLkP4CF.x, 0.21 * uTime));
  const float CS = 0.7986355;   // cos 37 deg
  const float SN = 0.6018150;
  vec2 q = vec2(CS * P.x + SN * P.z, -SN * P.x + CS * P.z);
  vec4 n2 = noised(vec3(q * uLkP4CF.y + vec2(-uLkP4CF.w, 0.4 * uLkP4CF.w) * uTime * uLkP4CF.y, 5.3 + 0.37 * uTime));
  vec2 g2 = vec2(CS * n2.y - SN * n2.z, SN * n2.y + CS * n2.z);
  vec2 s = w * (a1 * uLkP4CF.x * n1.yz + a2 * uLkP4CF.y * g2);
  if (a3 > 0.0) {
    // a third, finer octave (x2.4, turned -23 deg) where the footprint resolves it
    const float C3 = 0.9205049;
    const float S3 = -0.3907311;
    vec2 q3 = vec2(C3 * P.x + S3 * P.z, -S3 * P.x + C3 * P.z);
    vec4 n3 = noised(vec3(q3 * f3 + vec2(0.5 * uLkP4CF.w, -uLkP4CF.z) * uTime * f3, 11.7 + 0.55 * uTime));
    s += w * a3 * f3 * vec2(C3 * n3.y - S3 * n3.z, S3 * n3.y + C3 * n3.z);
  }
  if (uLkP4B.w > 0.0) s *= inversesqrt(1.0 + dot(s, s) / (uLkP4B.w * uLkP4B.w));   // (fix W4: soft limit)
  return s;
}
// P4 water G2 (4): the strata lookups' screen footprint along the target's rows, at least LK_P4FP texels on the tilted water.
vec2 lkP4Floor(vec2 g, float w) {
  float lv = length(g * uEnvMirrorSize);
  if (lv < 1e-5) return vec2(0.0, w * LK_P4FP / uEnvMirrorSize.y);
  return g * mix(1.0, max(1.0, LK_P4FP / lv), w);
}
// P4 water G2 (6): specular anti-aliasing on the tilted water. The tilt's change across the pixel (fwidth: a crest's silhouette,
// where the hit jumps from the flank's grazing top to the water behind it, and the chop) joins the incoherent slope spread as
// its rms (uLkP4W.w of the change), so a sub-pixel feature (the grazing top's horizon reflection along every silhouette, which
// the one sample per pixel caught on one pixel per row step: a dotted line) is averaged over the pixel, not point-sampled.
vec2 lkP4SpecAA(vec2 sig, vec2 dw) {
  float s = uLkP4W.w * max(dw.x, dw.y) / 0.07;
  return sqrt(sig * sig + vec2(s * s));
}
`,
  },
  {
    find: "  vec2 lkWv = lkHw > 0.0 ? lkWaveGrad(vWorldPos) * lkHw : vec2(0.0);\n",
    repl:
      "  vec2 lkP4Fp = fwidth(vWorldPos.xz);   // P4 water G2 (1): the pixel's footprint on the water (derivatives before any branch)\n" +
      "  vec2 lkWv = lkHw > 0.0 ? lkWaveGrad(vWorldPos) * lkHw : vec2(0.0);\n" +
      "  // P4 water G2 (1): the chop rides on the water the crest train already tilts (a tilted pixel skips the cached term: chop\n" +
      "  // beyond the train front tilted more of the hold's water), so it spreads with the wave front from the press; the per-pixel\n" +
      "  // walk keeps the train's tilt alone (lkP4Wt: a normal coherent across the pixels; the chop's made the walks diverge).\n" +
      "  // Measured: the chop cost +0.83 ms per hold frame with both, ~0 with its amplitude at 0 (WORK/LOG.md 03:21).\n" +
      "  vec2 lkP4Wt = lkWv;\n" +
      "  vec2 lkP4Ch = lkChop(vWorldPos, dist, lkP4Fp, kDof);   // (every pixel: its derivatives below)\n" +
      "  if (uLkP4D.x > 0.0) {\n" +
      "    // P4 water fix W3: where the chop's own slope changes by more than ~uLkP4D.x per px, the reflection's lookups alias\n" +
      "    // (frame-to-frame sign-reversal flicker in the press and the hold): its amplitude falls there.\n" +
      "    vec2 lkP4Dc = fwidth(lkP4Ch);\n" +
      "    float lkP4Q = max(lkP4Dc.x, lkP4Dc.y) / uLkP4D.x;\n" +
      "    lkP4Ch *= inversesqrt(1.0 + lkP4Q * lkP4Q);\n" +
      "  }\n" +
      "  if (lkWv.x != 0.0 || lkWv.y != 0.0) lkWv += lkP4Ch;\n" +
      "  vec2 lkP4Dw = fwidth(lkWv);   // P4 water G2 (6)\n",
    count: 2,
  },
  {
    // (6) on the tilted water (the cached-path water, LK_CACHEN default; the plain path); the walk's normal (the train's tilt)
    find: "    if (lkWv.x != 0.0 || lkWv.y != 0.0) lkN = lkWaveTilt(lkN, lkWv, V);\n",
    repl:
      "    vec3 lkP4Nw = lkN;   // P4 water G2: the per-pixel walk's normal (the train's tilt alone)\n" +
      "    if (lkWv.x != 0.0 || lkWv.y != 0.0) {\n      lkP4Nw = lkWaveTilt(lkN, lkP4Wt, V);\n      lkN = lkWaveTilt(lkN, lkWv, V);\n      lkSig = lkP4SpecAA(lkSig, lkP4Dw);   // P4 water G2 (6)\n    }\n",
  },
  {
    find: "  if (lkWv.x != 0.0 || lkWv.y != 0.0) lkN = lkWaveTilt(lkN, lkWv, V);\n",
    repl:
      "  vec3 lkP4Nw = lkN;   // P4 water G2: the per-pixel walk's normal (the train's tilt alone)\n" +
      "  if (lkWv.x != 0.0 || lkWv.y != 0.0) {\n    lkP4Nw = lkWaveTilt(lkN, lkP4Wt, V);\n    lkN = lkWaveTilt(lkN, lkWv, V);\n    lkSig = lkP4SpecAA(lkSig, lkP4Dw);   // P4 water G2 (6)\n  }\n",
  },
  {
    // the per-pixel walk on the tilted water takes the train's tilt alone (cached path; plain path)
    find: "    if (lkWv.x != 0.0 || lkWv.y != 0.0) lkW = lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);\n",
    repl: "    if (lkWv.x != 0.0 || lkWv.y != 0.0) lkW = lkWalkTerm(dist, V, lkP4Nw, lkSig, vWorldPos);   // P4 water G2: the train's tilt\n",
  },
  {
    find: "  if (lkWv.x != 0.0 || lkWv.y != 0.0) lkW = lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);   // (as the cached path above)\n",
    repl: "  if (lkWv.x != 0.0 || lkWv.y != 0.0) lkW = lkWalkTerm(dist, V, lkP4Nw, lkSig, vWorldPos);   // (as the cached path above; P4 water G2: the train's tilt)\n",
  },
  {
    // (4) the cached-path water (LK_CACHEN, default) and the plain LK_CACHE path
    find: "    base = lkReflect4(muv, lkGx, lkGy, dist, V, lkN, lkSig, moffsW, lkW, lkS) * (uMirrorGain * LK_GAIN);\n",
    repl:
      "    if (lkWv.x != 0.0 || lkWv.y != 0.0) lkGy = lkP4Floor(lkGy, lkHw);   // P4 water G2 (4)\n" +
      "    base = lkReflect4(muv, lkGx, lkGy, dist, V, lkN, lkSig, moffsW, lkW, lkS) * (uMirrorGain * LK_GAIN);\n",
  },
  {
    find: "  else base = lkReflect4(muv, lkGx, lkGy, dist, V, lkN, lkSig, moffsW, lkW, lkS) * (uMirrorGain * LK_GAIN);\n",
    repl:
      "  else {\n" +
      "#ifdef LK_WAVEB\n" +
      "    if (lkWv.x != 0.0 || lkWv.y != 0.0) lkGy = lkP4Floor(lkGy, lkHw);   // P4 water G2 (4)\n" +
      "#endif\n" +
      "    base = lkReflect4(muv, lkGx, lkGy, dist, V, lkN, lkSig, moffsW, lkW, lkS) * (uMirrorGain * LK_GAIN);\n" +
      "  }\n",
  },
];
const P4_G6: P4Edit[] = [
  {
    // the helper, before the walk read (LK_CACHEN path's function and the inline read both follow it)
    find: "#if defined(LAKE_R12) && defined(LK_CACHEN) && defined(LK_HALF) && defined(LK_WALKREPROJ)\n",
    repl: /* glsl */ `#if defined(LAKE_R12) && defined(LK_HALF)
// P4 water G6: the quarter-size walk's four taps disagree (a thin face feature, e.g. a sunlit edge the low rays meet, that only
// some walk texels sample): smoothstep(uLkP4WJ.x, uLkP4WJ.y) of their spread (share-weighted luma and share), x a fade-in
// over uLkP4WJ.z..w m from the camera (the far water), blends to the pixel's own walk. Interpolated, such a texel painted a blocky pale blotch on open water in the orbit views (the panel's
// 'LAKE_CORR ghost': it follows the walk's resolution, ?lkwdiv=1 and ?lkhalf=0 remove it; not the cache, the mirror or a pose
// jump). (lab: uLakeDebug 12 shows the blend weight)
uniform vec4 uLkP4WJ;
float lkP4Wj = 0.0;
float lkP4WalkJump(vec4 a, vec4 b, vec4 c, vec4 d) {
  vec4 l = vec4(dot(a.rgb, LUMA), dot(b.rgb, LUMA), dot(c.rgb, LUMA), dot(d.rgb, LUMA));
  vec4 s = vec4(a.a, b.a, c.a, d.a);
  float dl = max(max(l.x, l.y), max(l.z, l.w)) - min(min(l.x, l.y), min(l.z, l.w));
  float ds = max(max(s.x, s.y), max(s.z, s.w)) - min(min(s.x, s.y), min(s.z, s.w));
  return dl + 0.25 * ds;
}
#endif
#if defined(LAKE_R12) && defined(LK_CACHEN) && defined(LK_HALF) && defined(LK_WALKREPROJ)
`,
  },
  {
    find: "  if (dot(wt, 1.0 - wv) > 0.01) lkW = lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);\n  else lkW = t00 * wt.x + t10 * wt.y + t01 * wt.z + t11 * wt.w;\n",
    repl:
      "  if (dot(wt, 1.0 - wv) > 0.01) lkW = lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);\n" +
      "  else {\n" +
      "    lkW = t00 * wt.x + t10 * wt.y + t01 * wt.z + t11 * wt.w;\n" +
      "    lkP4Wj = smoothstep(uLkP4WJ.x, uLkP4WJ.y, lkP4WalkJump(t00, t10, t01, t11)) * smoothstep(uLkP4WJ.z, uLkP4WJ.w, dist);   // P4 water G6\n" +
      "    if (lkP4Wj > 0.0) lkW = mix(lkW, lkWalkTerm(dist, V, lkN, lkSig, vWorldPos), lkP4Wj);\n" +
      "  }\n",
  },
  {
    find: "    if (dot(wt, 1.0 - wv) > 0.01) lkW = lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);\n    else lkW = t00 * wt.x + t10 * wt.y + t01 * wt.z + t11 * wt.w;\n",
    repl:
      "    if (dot(wt, 1.0 - wv) > 0.01) lkW = lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);\n" +
      "    else {\n" +
      "      lkW = t00 * wt.x + t10 * wt.y + t01 * wt.z + t11 * wt.w;\n" +
      "      lkP4Wj = smoothstep(uLkP4WJ.x, uLkP4WJ.y, lkP4WalkJump(t00, t10, t01, t11)) * smoothstep(uLkP4WJ.z, uLkP4WJ.w, dist);   // P4 water G6\n" +
      "      if (lkP4Wj > 0.0) lkW = mix(lkW, lkWalkTerm(dist, V, lkN, lkSig, vWorldPos), lkP4Wj);\n" +
      "    }\n",
  },
  {
    find: "  if (uLakeDebug > 10.5) {\n",
    repl: "#ifdef LK_HALF\n  if (uLakeDebug > 11.5) {\n    gl_FragColor = vec4(lkP4Wj, 0.0, 0.0, 1.0);   // (lab) P4 water G6: the per-pixel walk's share\n    return;\n  }\n#endif\n  if (uLakeDebug > 10.5) {\n",
    count: 2,
  },
];
const P4_Q8: P4Edit[] = [
  {
    find: "vec2 ringSlope(vec2 d, float r) {",
    fnEnd: "\n}\n",
    repl: /* glsl */ `// P4 water Q8: x the profile's steepening Q (< 0: steep faces at the crests, broad troughs), y the amplitude's variation,
// z / w the shading clamp of the troughs / crests.
uniform vec4 uLkP4R;
// P4 water Q8: the orb's glint on the ring zone: x / y GGX alpha across / along the view, z the tint's share of cyan-white.
uniform vec4 uLkP4G;
vec2 ringSlope(vec2 d, float r) {
  float th = atan(d.y, d.x);
  float x = r - uWave.z * uTime + 0.09 * sin(th * 7.0 + r * 1.3) + 0.05 * sin(th * 13.0 - r * 0.9);
  float k = 6.2831853 / uWave.y;
  // P4 water Q8: h = 0.55 A cos(kx - Q sin kx) (MAIN: Q = 0). Q < 0 (default -0.35): the phase runs fast over the crests and
  // slowly through the troughs, so the steep faces gather at each crest: the face toward the camera (a dark band) and right
  // behind it the far face (a thin bright rim), with broad calm troughs between (F000: "each dark trough has a thin bright rim
  // on its far side"; the plan's Q = +0.6, narrow troughs, moved the ring box away from F000: p10 165 -> 157 vs F000 172).
  // The amplitude varies around the ring with 3 and 5 lobes that drift with the radius (F000's rings vary along their length).
  float kx = k * x;
  float dh = -uWave.x * k * 0.55 * sin(kx - uLkP4R.x * sin(kx)) * (1.0 - uLkP4R.x * cos(kx));
  dh *= 1.0 + uLkP4R.y * (0.6 * sin(th * 3.0 + 1.3 + 0.21 * r) + 0.4 * sin(th * 5.0 - 0.7 - 0.13 * r));
  float env = smoothstep(0.4, 1.8, r) * exp(-r / (uWaveReach * 0.7)) * (1.0 - smoothstep(uWaveReach * 0.8, uWaveReach, r));
  return d / max(r, 1e-3) * dh * env;
}
// P4 water Q8: anisotropic GGX (D x a Smith-like visibility, as ggxSpec), the lobe wide across the view (the reference's glint band
// is twice as wide as tall on the ring zone).
float p4GgxAniso(vec3 n, vec3 v, vec3 l, float ax, float ay) {
  vec3 h = normalize(v + l);
  vec3 t = normalize(cross(n, v) + vec3(1e-6, 0.0, 0.0));
  vec3 b = cross(t, n);
  float th = dot(h, t), bh = dot(h, b), nh = saturate(dot(n, h));
  float dd = th * th / (ax * ax) + bh * bh / (ay * ay) + nh * nh;
  float D = 1.0 / (PI * ax * ay * dd * dd);
  float a = sqrt(ax * ay);
  float a2 = a * a;
  float nv = saturate(dot(n, v)) + 1e-4, nl = saturate(dot(n, l));
  float gv = nl * sqrt(nv * nv * (1.0 - a2) + a2);
  float gl = nv * sqrt(nl * nl * (1.0 - a2) + a2);
  return D * (0.5 / max(gv + gl, 1e-4)) * nl;
}
`,
  },
  {
    find: "  float k = clamp((dot(rRip, LUMA) - dot(rFlat, LUMA)) / max(dot(rFlat, LUMA), 1e-3) * uRippleShade, -0.48, 0.48);\n",
    repl: "  float k = clamp((dot(rRip, LUMA) - dot(rFlat, LUMA)) / max(dot(rFlat, LUMA), 1e-3) * uRippleShade, -uLkP4R.z, uLkP4R.w);   // P4 water Q8\n",
  },
  {
    find: "    col += vec3(0.7, 0.88, 1.0) * uOrbGlow * 0.5 * ggxSpec(Ns, V, lO, 0.28) * (0.6 + 0.4 * spark) * zone;\n",
    repl:
      "    // P4 water Q8: the glint anisotropic and cyan-white (F000 / loop F030: a wide band, ~200,235,245 at its core).\n" +
      "    // (fix W1: the cyan-white keeps MAIN's tint's luma, 0.850; uLkP4G.w a gain on the glint: the lane's first lobe was dimmer than MAIN's)\n" +
      "    col += mix(vec3(0.7, 0.88, 1.0), vec3(0.630, 0.901, 0.989), uLkP4G.z) * (uOrbGlow * 0.5 * uLkP4G.w) * p4GgxAniso(Ns, V, lO, uLkP4G.x, uLkP4G.y) * (0.6 + 0.4 * spark) * zone;\n",
  },
];
const P4_Q9: P4Edit[] = [
  {
    find: "vec3 lkBump(vec3 Pw, vec3 dPx, vec3 dPy, float kDof, out vec2 sig) {\n",
    repl:
      "uniform vec4 uLkP4Gl;   // P4 water Q9: the alias guard's footprint band (lattice cells), and the distance band it fades in over (m)\n" +
      "float lkP4GJw = 0.0;   // P4 water fix W2: the guard's step-back at this pixel (lkP4GlassJump; 0 in the walk pass)\n" +
      "vec3 lkBump(vec3 Pw, vec3 dPx, vec3 dPy, float kDof, out vec2 sig) {\n" +
      "  // (the ring zone, 13-28 m at rest, keeps its wavelets: F000's rings are agitated)\n" +
      "  float lkGd = smoothstep(uLkP4Gl.z, uLkP4Gl.w, distance(cameraPosition, Pw)) * (1.0 - lkP4GJw);\n",
  },
  {
    find: "    float cx = lkCoh(Lx * kDof) * lkAvg(Ly * kDof);\n    float cy = lkCoh(Ly * kDof) * lkAvg(Lx * kDof);\n",
    repl:
      "    float cx = lkCoh(Lx * kDof) * lkAvg(Ly * kDof);\n    float cy = lkCoh(Ly * kDof) * lkAvg(Lx * kDof);\n" +
      "    // P4 water Q9: an octave whose footprint spans uLkP4Gl.x..y cells gives up its coherent share (the pixel-centre sample of a\n" +
      "    // sub-pixel wavelet aliases into row stripes); the spread below takes the variance (Tr^2 - c^2).\n" +
      "    float lkGa = 1.0 - smoothstep(uLkP4Gl.x, uLkP4Gl.y, max(Lx, Ly) * kDof) * lkGd;\n" +
      "    cx *= lkGa;\n" +
      "    cy *= lkGa;\n",
  },
  {
    // fix W2 (judge: Q9's glassier far water unmasked the orbit ghost, a quarter-size walk texel interpolated over 4 x 4 px, that
    // MAIN's corduroy hid): where the walk's four taps disagree (G6's measure) the guard steps back to MAIN's bump.
    find: "#if defined(LAKE_R12) && defined(LK_CACHEN) && defined(LK_HALF) && defined(LK_WALKREPROJ)\n",
    repl: /* glsl */ `#if defined(LAKE_R12) && defined(LK_CACHEN) && defined(LK_HALF) && defined(LK_WALKREPROJ) && !defined(LK_WALKPASS)
// P4 water fix W2: smoothstep(uLkP4GJ.x, uLkP4GJ.y) of the walk taps' spread at this pixel (share-weighted luma + 0.25 x the
// share spread); uLkP4GJ.z 0 turns it off.
uniform vec4 uLkP4GJ;
float lkP4GlassJump() {
  if (uLkP4GJ.z <= 0.0) return 0.0;
  vec4 c = uLkWalkVP * vec4(vWorldPos, 1.0);
  vec2 wsz = vec2(textureSize(uLkWalk, 0));
  vec2 q = (c.xy / c.w * 0.5 + 0.5) * wsz - 0.5;
  ivec2 i0 = ivec2(floor(q));
  ivec2 mx = ivec2(wsz) - 1;
  vec4 a = texelFetch(uLkWalk, clamp(i0, ivec2(0), mx), 0);
  vec4 b = texelFetch(uLkWalk, clamp(i0 + ivec2(1, 0), ivec2(0), mx), 0);
  vec4 d = texelFetch(uLkWalk, clamp(i0 + ivec2(0, 1), ivec2(0), mx), 0);
  vec4 e = texelFetch(uLkWalk, clamp(i0 + ivec2(1, 1), ivec2(0), mx), 0);
  vec4 l = vec4(dot(a.rgb, LUMA), dot(b.rgb, LUMA), dot(d.rgb, LUMA), dot(e.rgb, LUMA));
  vec4 s = vec4(a.a, b.a, d.a, e.a);
  float dl = max(max(l.x, l.y), max(l.z, l.w)) - min(min(l.x, l.y), min(l.z, l.w));
  float ds = max(max(s.x, s.y), max(s.z, s.w)) - min(min(s.x, s.y), min(s.z, s.w));
  return uLkP4GJ.z * smoothstep(uLkP4GJ.x, uLkP4GJ.y, dl + 0.25 * ds);
}
#endif
#if defined(LAKE_R12) && defined(LK_CACHEN) && defined(LK_HALF) && defined(LK_WALKREPROJ)
`,
  },
  {
    find: "    lkN = lkBump(vWorldPos, lkDPx, lkDPy, kDof, lkSig);\n",
    repl:
      "#if defined(LK_HALF) && defined(LK_WALKREPROJ) && !defined(LK_WALKPASS)\n" +
      "    lkP4GJw = lkP4GlassJump();   // P4 water fix W2\n" +
      "#endif\n" +
      "    lkN = lkBump(vWorldPos, lkDPx, lkDPy, kDof, lkSig);\n",
  },
];
/**
 * P4 round 4, lane p4w4 (21 Nov 2026; plan MAIN/notes/round11/p3/r11_3_plan.json). `?p4w4=0` = int2 exactly (no text, no
 * define, no uniform, no asset fetched). Same mechanism as the P4 water lane above (source edits that throw on a moved anchor).
 * - G1 (`?w4chop=0` off; needs P4 water G2): the hold's near-water chop from a tileable wind-wave SLOPE tile (public/hero/
 *   lake_chop.png, 256 x 256 RGB8, 81,568 B, one 10 m tile; generated offline by tools/gen_chop.py in the lane's WORK: a
 *   wind-sea spectrum, peak 1.8 m, energy only at 0.55-5 m, wide cos^3 spreading, Stokes-sharpened crests, slopes by the
 *   periodic spectral derivative) sampled with
 *   textureGrad, the pixel's own footprint, trilinear mips and the anisotropic filter, instead of int2's analytic value-noise
 *   octaves (fwidth-faded, soft-limited: the strip's flat bands with stair-stepped patch edges). The mip chain band-limits the
 *   chop by construction; what a footprint averages away (the tile's mean square minus the square of its mean) joins the
 *   slope spread (LEAN-style), so the reflection widens instead of aliasing. Measured first (WORK/LOG.md): the hero reflection
 *   is not in the hold strip (switched off: <= 8 px change by <= 3 levels at p06 / hold L / pop B), so its target is unchanged.
 *   Its weight: W4_BAND's dolly band (the camera's final approach) instead of int2's smoothstep(0, 1, uHold), so during the
 *   dolly the water has no chop (int2's noise chop added the pop's streaks) and the tile's crisp crests never crawl.
 * - G1c (`?w4guard=0` off): W4_GUARD below. Every p4w4 term is 0 at rest (bit-identical frames) and during the dolly.
 */
const W4_G1: P4Edit[] = [
  {
    find: "vec2 lkChop(vec3 P, float dist, vec2 fp, float kDof) {",
    fnEnd: "  return s;\n}\n",
    repl: /* glsl */ `// p4w4 G1: the chop tile (lake_chop.png: R, G = dh/dx, dh/dz as 128 + 127 s / S; B = (sx^2 + sz^2) / 2 S^2), x tile A (m),
// y tile B (m, turned 37 deg), z the slope at code 1 (S), w B's share; uLkW4D: x / y drift (m/s) of A / B, z the averaged-away
// variance's share in the spread, w 1 once the tile is loaded. lkW4Dx / Dy: the lake point's screen derivatives (xz), taken in
// uniform control flow before the call.
uniform sampler2D uLkW4Chop;
uniform vec4 uLkW4C;
uniform vec4 uLkW4D;
// (uLkW4H, declared before lkBump by W4_BAND: the dolly band every p4w4 term fades in over)
vec2 lkW4Dx = vec2(0.0);
vec2 lkW4Dy = vec2(0.0);
float lkW4Var = 0.0;
vec2 lkW4Rot(vec2 v) { return vec2(0.7986355 * v.x + 0.6018150 * v.y, -0.6018150 * v.x + 0.7986355 * v.y); }
vec2 lkChop(vec3 P, float dist, vec2 fp, float kDof) {
  lkW4Var = 0.0;
  float w = smoothstep(uLkW4H.x, uLkW4H.y, uHold) * (1.0 - smoothstep(uLkP4C.z, uLkP4C.w, dist)) * uLkW4D.w;
  if (w <= 0.0) return vec2(0.0);
  {
    float R = mix(8.2, 21.5, smoothstep(0.0, 1.0, uHold));
    float rP = length(vec2(P.x, P.z + 8.6));
    float mP = max(abs(P.x), abs(P.z));
    w *= (1.0 - smoothstep(R - 0.5 - uLkP4D.y, R - 0.5, rP)) * (1.0 - smoothstep(14.55 - uLkP4D.y, 14.55, mP));
    if (w <= 0.0) return vec2(0.0);
  }
  // (explicit gradients: valid in this non-uniform branch)
  float iA = 1.0 / uLkW4C.x;
  vec3 a = textureGrad(uLkW4Chop, (P.xz + vec2(0.0, uLkW4D.x * uTime)) * iA, lkW4Dx * iA, lkW4Dy * iA).rgb;
  float iB = 1.0 / uLkW4C.y;
  vec3 b = textureGrad(uLkW4Chop, (lkW4Rot(P.xz) + vec2(0.0, uLkW4D.y * uTime)) * iB, lkW4Rot(lkW4Dx) * iB, lkW4Rot(lkW4Dy) * iB).rgb;
  vec2 sa = (a.rg * 255.0 - 128.0) / 127.0;
  vec2 sb = (b.rg * 255.0 - 128.0) / 127.0;
  vec2 sbW = vec2(0.7986355 * sb.x - 0.6018150 * sb.y, 0.6018150 * sb.x + 0.7986355 * sb.y);   // back to world axes
  // per-axis variance the footprint averaged away (filtered mean square minus half the filtered mean's square), code units^2
  float va = max(a.b - 0.5 * dot(sa, sa), 0.0);
  float vb = max(b.b - 0.5 * dot(sb, sb), 0.0);
  float A = w * uLkW4C.z;
  vec2 s = A * (sa + uLkW4C.w * sbW);
  lkW4Var = A * A * (va + uLkW4C.w * uLkW4C.w * vb);
  if (uLkP4B.w > 0.0) s *= inversesqrt(1.0 + dot(s, s) / (uLkP4B.w * uLkP4B.w));   // (int2's soft limit)
  return s;
}
`,
  },
  {
    find: "vec2 lkP4SpecAA(vec2 sig, vec2 dw) {",
    fnEnd: "\n}\n",
    repl: /* glsl */ `vec2 lkP4SpecAA(vec2 sig, vec2 dw) {
  float s = uLkP4W.w * max(dw.x, dw.y) / 0.07;
  // p4w4 G1: + the chop variance its footprint averaged away (slope^2; the spread's unit is a slope rms of 0.07)
  return sqrt(sig * sig + vec2(s * s + lkW4Var * uLkW4D.z / 0.0049));
}
`,
  },
  {
    find: "  vec2 lkP4Ch = lkChop(vWorldPos, dist, lkP4Fp, kDof);   // (every pixel: its derivatives below)\n",
    repl:
      "  lkW4Dx = dFdx(vWorldPos.xz);   // p4w4 G1: the chop tile's footprint (uniform control flow)\n" +
      "  lkW4Dy = dFdy(vWorldPos.xz);\n" +
      "  vec2 lkP4Ch = lkChop(vWorldPos, dist, lkP4Fp, kDof);   // (every pixel: its derivatives below)\n",
    count: 2,
  },
];
/**
 * p4w4 G1c (`?w4guard=0` off): in the hold, the lake bump's alias guard on the near water. Seen from the hold camera (2.4 m up,
 * the strip 16-25 m away, ~7 deg grazing) a pixel spans ~1.2 cm across the view but ~10 cm along it, so the bump's 8-33 cm
 * octaves keep most of their coherent share (lkAvg falls slowly) while one sample per row lands every ~10 cm: aliased into
 * 1 px-tall, 5-40 px-long bars inside every tilted patch (lab: uLakeDebug 9 / 7 show them in the strata and the walk; a full-
 * size mirror target, the hero reflection off, the march supersampled: unchanged). As P4 water Q9 does beyond 30-40 m: an
 * octave whose footprint spans uLkW4G.x..y cells gives up its coherent share, which joins the incoherent spread (lkBump's own
 * Tr^2 - c^2 bookkeeping: the slope variance is kept). Plus (with P4 water G2) its specular-AA share 0.3 -> uLkP4W.w 1.0: the
 * tilt's change across a pixel widens the spread, so the tilted patches' outlines (the walk's / strata's hit-miss along each
 * row) fade over ~1-2 px. Both x W4_BAND's dolly band: at rest and during the dolly the factor is exactly 1 / the share 0.3
 * (int2's numbers; during the dolly the guard made the near water a smooth glass bowl of crest-train rings, F358 shows chop).
 */
const W4_GUARD: P4Edit[] = [
  {
    find: "    float cx = lkCoh(Lx * kDof) * lkAvg(Ly * kDof);\n    float cy = lkCoh(Ly * kDof) * lkAvg(Lx * kDof);\n",
    repl:
      "    float cx = lkCoh(Lx * kDof) * lkAvg(Ly * kDof);\n    float cy = lkCoh(Ly * kDof) * lkAvg(Lx * kDof);\n" +
      "    {\n" +
      "      // p4w4 G1c: in the hold, the near water's sub-row octaves give up their coherent share (variance kept below)\n" +
      "      float lkW4g = 1.0 - smoothstep(uLkW4G.x, uLkW4G.y, max(Lx, Ly) * kDof) * smoothstep(uLkW4H.x, uLkW4H.y, uHold) * (1.0 - smoothstep(uLkW4G.z, uLkW4G.w, distance(cameraPosition, Pw)));\n" +
      "      cx *= lkW4g;\n" +
      "      cy *= lkW4g;\n" +
      "    }\n",
  },
  {
    find: "vec3 lkBump(vec3 Pw, vec3 dPx, vec3 dPy, float kDof, out vec2 sig) {\n",
    repl: "uniform vec4 uLkW4G;   // p4w4 G1c: the hold guard's footprint band (lattice cells) and its distance fade-out (m)\nvec3 lkBump(vec3 Pw, vec3 dPx, vec3 dPy, float kDof, out vec2 sig) {\n",
  },
  {
    // (with P4 water G2) its specular-AA share: int2's 0.3 until the band, uLkP4W.w (1.0) in the settled hold
    find: "  float s = uLkP4W.w * max(dw.x, dw.y) / 0.07;\n",
    repl: "  float s = mix(0.3, uLkP4W.w, smoothstep(uLkW4H.x, uLkW4H.y, uHold)) * max(dw.x, dw.y) / 0.07;   // p4w4 G1c\n",
  },
];
/**
 * p4w4: the dolly band (uHold) every p4w4 term fades in over: the camera's final approach (0.92-1.0; the steady hold sits at
 * ~0.97). During the dolly itself the guard turned the near water into a smooth glass bowl of crest-train rings (F358 shows
 * fine chop there) and the textured chop's crisp crests crawled (60 fps hold path k80-82): both wait for the camera to settle.
 */
const W4_BAND: P4Edit[] = [
  {
    find: "vec3 lkBump(vec3 Pw, vec3 dPx, vec3 dPy, float kDof, out vec2 sig) {\n",
    repl: "uniform vec2 uLkW4H;   // p4w4: the dolly band the lane's terms fade in over\nvec3 lkBump(vec3 Pw, vec3 dPx, vec3 dPy, float kDof, out vec2 sig) {\n",
  },
];
/**
 * p4w4: the lane's tasks (`?p4w4=0` all off = int2; per task: `?w4chop=0` int2's noise chop back, `?w4guard=0`; opt-in
 * `?w4tile=1`: the chop tile in the settled hold, the builder's G1a, off by default since the fix round, judge W4J-2).
 */
function p4w4Tasks(lq: URLSearchParams | null) {
  const on = lq?.get("p4w4") !== "0";
  const g1 = on && lq?.get("w4chop") !== "0";
  return {
    g1,
    tile: g1 && lq?.get("w4tile") === "1",
    guard: on && lq?.get("w4guard") !== "0",
  };
}
/** p4w4 G1: the chop tile, linear (no colour conversion, no premultiplication), repeating, trilinear mips + anisotropy. */
export async function loadLakeChop(url: string, maxAnisotropy: number): Promise<THREE.Texture> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`lake chop ${res.status}`);
  const bmp = await createImageBitmap(await res.blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
  const t = new THREE.Texture(bmp as unknown as HTMLImageElement);
  t.flipY = false;
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = maxAnisotropy;
  t.needsUpdate = true;
  return t;
}
/** p4wl: the lane switch (`?p4wl=0` off = MAIN exactly). */
export function p4wlOn(lq: URLSearchParams | null) {
  return lq?.get("p4wl") !== "0";
}
/**
 * p4wl: the water's walk read (lkWalkRead: LK_CACHEN + LK_HALF + LK_WALKREPROJ; used by the moving frames and by the rest
 * cache pass alike) is the pixel's own walk (lkWalkTerm, the quarter pass's own function), and the quarter pass is not drawn.
 * Tried and rejected (lane LOG 12:20-12:43): per pixel only where a quarter tap holds a face (+14 % T1 sweep frame), only where
 * the four taps disagree (+9-11 %), the pixel walk with the quarter pass's bump footprint (blocks stay), the quarter texel as the
 * mean of 4 / 9 walks over its footprint (-15 % pops only), a full-size walk target on every 2nd moving frame (+10 %). This one
 * removes the blocks but costs +8.7 % of the T1 sweep frame and adds pixel speckle (judge WL-J3): opt-in only (`?wlwalk=px`).
 */
const P4WL_WALK: P4Edit[] = [
  {
    find: "vec4 lkWalkRead(float dist, vec3 V, vec3 lkN, vec2 lkSig) {\n",
    repl: "vec4 lkWalkRead(float dist, vec3 V, vec3 lkN, vec2 lkSig) {\n  return lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);   // p4wl: per pixel (no quarter-size texels)\n",
  },
];
/**
 * p4wl fixer (judge WL-J1 / J3: the fix must reach T1 at MAIN's cost): the band-limited quarter walk. The quarter pass stores what
 * is smooth over the lake (LK_WALKPX: the faces' mean colour and the horizon elevation they raise, -0.2 no face, -1 / -0.5 under /
 * next to a footprint) and the water takes the share of its OWN rays under each tap's horizon (its own coherent elevation and
 * spread: the steep part, per pixel), then interpolates those shares. MAIN interpolated the share itself, a steep function of the
 * quarter pixel's own bump, point-sampled at 1 / 16 of the pixels: the 4 x 4 px blocks. Taps under / next to a footprint: the
 * pixel walks itself (MAIN's LK_WALKEDGE). Same quarter pass and cost as MAIN. The default on every tier with the quarter walk
 * (T1, T2; T0 has no walk); `?wlwalk=q` = MAIN's quarter read, `?wlwalk=px` = the per-pixel walk (P4WL_WALK).
 */
const P4WL_BAND: P4Edit[] = [
  {
    // the quarter pass walks the unbumped reflection's azimuth (the horizon is then a function of the lake point alone)
    find: "    vec4 wT = lkWalkTerm(dist0, V0, n0, sg0, vWorldPos);\n",
    repl: "    vec4 wT = lkWalkTerm(dist0, V0, vec3(0.0, 1.0, 0.0), sg0, vWorldPos);   // p4wl: P4WL_BAND\n",
  },
  {
    find: "vec4 lkWalkRead(float dist, vec3 V, vec3 lkN, vec2 lkSig) {\n",
    fnEnd: "\n}\n",
    repl: /* glsl */ `vec4 lkWalkRead(float dist, vec3 V, vec3 lkN, vec2 lkSig) {
  // p4wl: the band-limited read (P4WL_BAND)
  vec4 lkWc = uLkWalkVP * vec4(vWorldPos, 1.0);
  vec2 wsz = vec2(textureSize(uLkWalk, 0));
  vec2 q = (lkWc.xy / lkWc.w * 0.5 + 0.5) * wsz - 0.5;
  ivec2 i0 = ivec2(floor(q));
  vec2 f = q - floor(q);
  ivec2 mx = ivec2(wsz) - 1;
  vec4 t00 = texelFetch(uLkWalk, clamp(i0, ivec2(0), mx), 0);
  vec4 t10 = texelFetch(uLkWalk, clamp(i0 + ivec2(1, 0), ivec2(0), mx), 0);
  vec4 t01 = texelFetch(uLkWalk, clamp(i0 + ivec2(0, 1), ivec2(0), mx), 0);
  vec4 t11 = texelFetch(uLkWalk, clamp(i0 + ivec2(1, 1), ivec2(0), mx), 0);
  vec4 wt = vec4((1.0 - f.x) * (1.0 - f.y), f.x * (1.0 - f.y), (1.0 - f.x) * f.y, f.x * f.y);
  vec4 ta = vec4(t00.a, t10.a, t01.a, t11.a);
  if (dot(wt, 1.0 - step(-0.35, ta)) > 0.01) return lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);
  vec3 rcW = reflect(-V, lkN);
  float mu = asin(clamp(rcW.y, -1.0, 1.0));
  float sE = max(2.0 * 0.07 * lkSig.y, 1e-4);
  vec4 F4 = step(-0.15, ta) * vec4(lkPhiT((ta.x - mu) / sE), lkPhiT((ta.y - mu) / sE), lkPhiT((ta.z - mu) / sE), lkPhiT((ta.w - mu) / sE));
  vec4 a4 = wt * F4;
  return vec4(t00.rgb * a4.x + t10.rgb * a4.y + t01.rgb * a4.z + t11.rgb * a4.w, a4.x + a4.y + a4.z + a4.w);
}
`,
  },
];
/**
 * wl2g (round 2 of the water lane, 22 Nov; re-judge WL-RJ1): the quarter walk ANCHORED IN LAKE SPACE. `?wl2g=0` = p4wl exactly.
 * Root cause of the remaining crenellated contour (the shelf's dark reflection right of the left shelf reshaping every frame): the
 * quarter pass rasterised the lake with the frame's own camera, so its texel grid lived in screen space and slid across the lake
 * with every camera step; each tap point-samples a horizon / face colour that jumps where the walk changes obstacle cell, and the
 * sliding grid put new lake points under the taps every frame. Here the pass rasterises the lake through a FIXED anchor
 * view-projection (the camera at the anchor time, its frustum widened by the guard WL2G_GUARD, the target enlarged by the same
 * factor: the texel footprint equals the quarter texel there) while it still walks from the frame's own camera (cameraPosition):
 * every lake point keeps its texel while the camera moves, its value changes only with the view (smooth, except where a face's
 * silhouette really crosses it). The water reads the texels through the same anchor matrix (uLkWalkVP), bilinear, P4WL_BAND's
 * per-pixel share kept. The anchor is re-taken only when the frame's lake leaves the guard or the anchor texel grows past the
 * frame's quarter texel by WL2G_TOL (the hold's dolly; a resize). A scissor keeps the pass to the frame's own lake (+ a margin),
 * so it draws the same texels as the quarter pass. Lab: `?wl2gg=` guard, `?wl2gt=` scale tolerance.
 */
export function wl2gOn(lq: URLSearchParams | null) {
  return lq?.get("wl2g") !== "0";
}
const WL2G_GUARD = 1.25;
const WL2G_OVER = 1.35;
const WL2G_TOL = 1.0;
const WL2G_AZ = 0.004;
/**
 * wl2g (build 2): the anchored texel keeps its lake point, but its walk still followed the frame's azimuth (the view's, camera to
 * lake point), and the walk's horizon jumps wherever a slightly turned ray enters other heightfield cells: same-pose sheets showed
 * the contour reshaping as before with the grid fixed (WORK st/E_d1_shelf.png). So the walk pass walks two FIXED azimuths of a
 * lattice (step WL2G_AZ rad) that bracket the view's azimuth and blends them by its fraction: every texel's horizon and face
 * colour is then a continuous function of the camera (two fixed samples while the camera stays in a bin; the blend weight hands
 * over continuously at the bin edges). A walk without a face counts as the start elevation emin (no share). Walk pass only.
 */
function wl2gWalkFrag(src: string) {
  const a = "    vec4 wT = lkWalkTerm(dist0, V0, vec3(0.0, 1.0, 0.0), sg0, vWorldPos);   // p4wl: P4WL_BAND\n    gl_FragColor = lkHits > 0.5 ? vec4(wT.rgb / max(wT.a, 1e-4), lkWalkE) : vec4(0.0, 0.0, 0.0, -0.2);\n";
  if (src.split(a).length !== 2) throw new Error("wl2g: walk pass anchor moved");
  return src.replace(
    a,
    /* glsl */ `    // wl2g: two fixed azimuths around the view's, blended (wl2gWalkFrag)
    vec2 wlH = normalize(-V0.xz + vec2(1e-6, 0.0));
    float wlA = atan(wlH.y, wlH.x) / WL2G_AZ;
    float wlA0 = floor(wlA);
    float wlF = wlA - wlA0;
    float wlR = length(V0.xz);
    float wlEmin = asin(min(0.9 * clamp(V0.y, 0.002, 0.99), 0.01));
    vec3 wlVa = vec3(-cos(wlA0 * WL2G_AZ) * wlR, V0.y, -sin(wlA0 * WL2G_AZ) * wlR);
    vec4 wA = lkWalkTerm(dist0, wlVa, vec3(0.0, 1.0, 0.0), sg0, vWorldPos);
    float wlHa = lkHits;
    float wlEa = lkWalkE;
    vec3 wlVb = vec3(-cos((wlA0 + 1.0) * WL2G_AZ) * wlR, V0.y, -sin((wlA0 + 1.0) * WL2G_AZ) * wlR);
    vec4 wB = lkWalkTerm(dist0, wlVb, vec3(0.0, 1.0, 0.0), sg0, vWorldPos);
    float wlHb = lkHits;
    float wlEb = lkWalkE;
    if (wlHa < 0.5 && wlHb < 0.5) gl_FragColor = vec4(0.0, 0.0, 0.0, -0.2);
    else {
      vec3 cA = wA.rgb / max(wA.a, 1e-4);
      vec3 cB = wB.rgb / max(wB.a, 1e-4);
      if (wlHa < 0.5) { cA = cB; wlEa = wlEmin; }
      if (wlHb < 0.5) { cB = cA; wlEb = wlEmin; }
      gl_FragColor = vec4(mix(cA, cB, wlF), mix(wlEa, wlEb, wlF));
    }
`,
  );
}
/**
 * wl2g (build 3): the water's read interpolates the HORIZON of the four lake-fixed taps and takes its own rays' share under it
 * once (P4WL_BAND took a share per tap, a steep step of each tap's horizon against the pixel's own elevation, then blended the
 * steps: the contour was quantised to the texel grid and advanced tap by tap as the elevation moved with the camera, crenellated).
 * A smooth iso-line of a lake-fixed field moves continuously. Taps without a face count as the start elevation emin (no share);
 * the colour is the face taps' mean. Marked taps (under / next to a footprint) still walk per pixel. OPT-IN `?wl2gread=1` (the
 * default keeps P4WL_BAND's per-tap read: on the lake-fixed taps it is as stable, with less 60 fps sparkle at rest).
 */
const WL2G_READ: P4Edit[] = [
  {
    find: "  vec4 F4 = step(-0.15, ta) * vec4(lkPhiT((ta.x - mu) / sE), lkPhiT((ta.y - mu) / sE), lkPhiT((ta.z - mu) / sE), lkPhiT((ta.w - mu) / sE));\n  vec4 a4 = wt * F4;\n  return vec4(t00.rgb * a4.x + t10.rgb * a4.y + t01.rgb * a4.z + t11.rgb * a4.w, a4.x + a4.y + a4.z + a4.w);\n",
    repl: /* glsl */ `  // wl2g: the horizon interpolated over the lake-fixed taps, the pixel's share under it once (WL2G_READ)
  vec4 hv = step(-0.15, ta);
  float hs = dot(wt, hv);
  if (hs < 1e-4) return vec4(0.0);
  float eMin = asin(min(0.9 * clamp(V.y, 0.002, 0.99), 0.01));
  float eT = dot(wt, mix(vec4(eMin), ta, hv));
  vec4 cw = wt * hv;
  vec3 cF = (t00.rgb * cw.x + t10.rgb * cw.y + t01.rgb * cw.z + t11.rgb * cw.w) / hs;
  float FW = lkPhiT((eT - mu) / sE);
  return vec4(cF * FW, FW);
`,
  },
];
/**
 * wl2 fixer (final judge WL2-FJ1, 22 Nov): in the real loop (dt ~33 ms, the camera moving) the open water in front of the left ice
 * sheets popped +66-106 % more than MAIN at T1 DPR 2. Bisected in that loop (fix WORK rl/rl2_bisect.txt): `?wlwalk=q` (MAIN's read,
 * the rest of p4wl on) = MAIN, so P4WL_BAND's read is the whole cause; widening its share by the pixel's footprint of mu
 * (sE' = sqrt(sE^2 + (k fwidth mu)^2), k 1-8) did not help. Root cause: the share Phi((tap horizon - mu) / sE) took mu and sE from
 * the PIXEL's bump, whose finest octaves are coherent at the pixel's footprint: a face's reflection broken by ripple stripes a few
 * px wide that the camera's step between real frames moves by more than half a period (temporal aliasing), so they flip every
 * frame. MAIN's quarter pass took the share from the bump at the quarter texel's footprint (those octaves incoherent: in the
 * spread). Fix at the source, no extra noise: lkBump keeps a second set of coherent sums with the coherence of a footprint
 * WL2FJ_Q times the pixel's (min with the pixel's own), moves the variance it drops into a second spread (LEAN), and the share
 * takes mu and sE from that band-limited normal / spread (wlN4 / wlSig4). The shading keeps the pixel's own normal.
 * `?wl2fj=0` = wl2 before this fix (wl2g :5164) exactly; lab `?wl2fjq=` (Q), `?wl2fjs=` (0: the pixel's own spread sE with the
 * band-limited mu; 1 = default: the band-limited spread too).
 */
const WL2FJ_Q = 4.0;
const WL2FJ_S = 1.0;
function wl2fjEdits(q: number, sv: number): P4Edit[] {
  const Q = q.toFixed(4);
  const S = sv.toFixed(4);
  return [
    {
      find: "vec3 lkBump(vec3 Pw, vec3 dPx, vec3 dPy, float kDof, out vec2 sig) {\n",
      repl:
        "vec3 wlN4 = vec3(0.0, 1.0, 0.0);   // wl2 fixer (WL2-FJ1): the last lkBump's normal / spread band-limited to WL2FJ_Q x its footprint\n" +
        "vec2 wlSig4 = vec2(0.0);\n" +
        "vec3 lkBump(vec3 Pw, vec3 dPx, vec3 dPy, float kDof, out vec2 sig) {\n",
    },
    {
      find: "  float nc = 0.0, hx = 0.0, hy = 0.0, vx = 0.0, vy = 0.0;\n",
      repl: "  float nc = 0.0, hx = 0.0, hy = 0.0, vx = 0.0, vy = 0.0;\n  float wlHx = 0.0, wlHy = 0.0, wlVx = 0.0, wlVy = 0.0;   // wl2 fixer\n",
    },
    {
      find: "    // Octaves whose coherent share is negligible only add their variance (no noise evaluation).\n",
      repl:
        `    float wlCx = min(cx, lkCoh(Lx * kDof * ${Q}) * lkAvg(Ly * kDof * ${Q}));   // wl2 fixer: the coherence at Q x the footprint\n` +
        `    float wlCy = min(cy, lkCoh(Ly * kDof * ${Q}) * lkAvg(Lx * kDof * ${Q}));\n` +
        "    float wlS2 = amp * f * 0.6888;\n    wlS2 *= wlS2;\n" +
        "    // Octaves whose coherent share is negligible only add their variance (no noise evaluation).\n",
    },
    {
      find: "        hx += amp * min(cx / Tx, 1.0) * (n2.y - n2.x);\n",
      repl: "        hx += amp * min(cx / Tx, 1.0) * (n2.y - n2.x);\n        wlHx += amp * min(wlCx / Tx, 1.0) * (n2.y - n2.x);\n        wlVx += (cx * cx - wlCx * wlCx) * wlS2;\n",
    },
    {
      find: "        hy += amp * min(cy / Ty, 1.0) * (n2.y - n2.x);\n",
      repl: "        hy += amp * min(cy / Ty, 1.0) * (n2.y - n2.x);\n        wlHy += amp * min(wlCy / Ty, 1.0) * (n2.y - n2.x);\n        wlVy += (cy * cy - wlCy * wlCy) * wlS2;\n",
    },
    {
      find: "      hx += amp * min(cx / Tx, 1.0) * (n3.y - n3.x);\n      hy += amp * min(cy / Ty, 1.0) * (n3.z - n3.x);\n",
      repl:
        "      hx += amp * min(cx / Tx, 1.0) * (n3.y - n3.x);\n      hy += amp * min(cy / Ty, 1.0) * (n3.z - n3.x);\n" +
        "      wlHx += amp * min(wlCx / Tx, 1.0) * (n3.y - n3.x);\n      wlHy += amp * min(wlCy / Ty, 1.0) * (n3.z - n3.x);\n" +
        "      wlVx += (cx * cx - wlCx * wlCx) * wlS2;\n      wlVy += (cy * cy - wlCy * wlCy) * wlS2;\n",
    },
    {
      find: "  vec3 No = normalize(abs(det) * vec3(0.0, 0.0, 1.0) - 0.07 * sign(det) * sg);\n  return vec3(No.x, No.z, -No.y);\n",
      repl:
        "  vec3 No = normalize(abs(det) * vec3(0.0, 0.0, 1.0) - 0.07 * sign(det) * sg);\n" +
        "  vec3 wlNo = normalize(abs(det) * vec3(0.0, 0.0, 1.0) - 0.07 * sign(det) * ((rp * wlHx) * Rx + (rp * wlHy) * Ry));   // wl2 fixer\n" +
        "  wlN4 = vec3(wlNo.x, wlNo.z, -wlNo.y);\n  wlSig4 = rp * sqrt(vec2(vx + wlVx, vy + wlVy));\n" +
        "  return vec3(No.x, No.z, -No.y);\n",
    },
    {
      // P4WL_BAND's read: the share's mu / sE from the band-limited normal / spread
      find: "  vec3 rcW = reflect(-V, lkN);\n  float mu = asin(clamp(rcW.y, -1.0, 1.0));\n  float sE = max(2.0 * 0.07 * lkSig.y, 1e-4);\n",
      repl:
        "  vec3 rcW = reflect(-V, wlN4);   // wl2 fixer (WL2-FJ1)\n  float mu = asin(clamp(rcW.y, -1.0, 1.0));\n" +
        `  float sE = max(2.0 * 0.07 * sqrt(mix(lkSig.y * lkSig.y, wlSig4.y * wlSig4.y, ${S})), 1e-4);\n`,
    },
  ];
}
/**
 * wl3a (round 3 of the water lane, 23 Nov; re-judge WL2-RJ1: the water in front of the left ice sheets still popped ~10 % more
 * than MAIN in the real loop at T1 DPR 2). `?wl3a=0` = wl2 exactly. Bisected same-pose at the real loop's step (dt 1/30, rl's
 * pointer circle, T1 DPR 2; WORK tools/capdt.mjs): the share's mu is NOT the cause any more (a flat mu, or WL2FJ_Q 8 / 16: no
 * change); the excess sat in the near open water (CSS y 575-620, x 0-100) where the band walk's taps held NO face. Root cause:
 * P4WL_BAND's walk pass walks with the flat normal and records a face only where its share of the FLAT reflection exceeds 0.002
 * (lkWalkTerm's gate); the low floes in front of the near water sit far below that reflection, so the taps said "no face" while
 * the pixel's own rays (rippled, wide spread) do reach them; those rays went to the remainder (lkReflect4's strata, looked up
 * with the pixel's full-resolution normal). MAIN's quarter walk used the bumped normal, so its taps recorded those faces
 * (near-water zone blips MAIN 146 | wl2 202 | gate 0: 179). Fix at the source: (W) the walk pass records every face that rises above its horizon ray (share
 * gate 0; the read's own Phi gives the pixel's share), (E) the marked taps' per-pixel walk takes the band-limited normal /
 * spread (WL2FJ's wlN4 / wlSig4) instead of the pixel's own, (S) the read's share takes the pixel's own spread (WL2FJ's mu kept).
 * Sub-switches `?wl3aw=0`, `?wl3ae=0`, `?wl3as=0` (each part off).
 */
export function wl3aOn(lq: URLSearchParams | null) {
  return lq?.get("wl3a") !== "0";
}
function wl3aReadEdits(lq: URLSearchParams | null): P4Edit[] {
  const e: P4Edit[] = [];
  if (lq?.get("wl3ae") !== "0")
    e.push({
      find: "  if (dot(wt, 1.0 - step(-0.35, ta)) > 0.01) return lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);\n",
      repl: "  if (dot(wt, 1.0 - step(-0.35, ta)) > 0.01) return lkWalkTerm(dist, V, wlN4, wlSig4, vWorldPos);   // wl3a (E)\n",
    });
  return e;
}
/**
 * wl3a (W): the walk pass records every face above its horizon ray (lkWalkTerm's share gate 0.002 -> 0), walk pass only.
 * wl3c (round 3c, judge WL3A-J1): with gate 0 alone the far column at x ~1334 shortened (T1 rest 67 -> 44 px). lkWalkTerm stops
 * after 4 recorded faces (hits > 3.5): the tiny-share faces in front of the far slabs used up that cap before the bright slab face,
 * so the stored horizon / colour ended early. The cap now has its own counter: a face counts when its share under wl2's own
 * first-face rule exceeds WL3C_G (wl2: 0.002). Measured (same pose, dt 1/30, T1 DPR 2): the left water's gain comes from the early
 * stop itself (WL3C_G 0.002: left 364 = W off; 0: 332 but the column cut), the column needs the cap to skip faces of share
 * < ~0.0004 (0.0003: cut); 0.0004: column 67, left 347 (MAIN 340, wl2 394). A camera-distance or walk-distance rule cannot separate
 * the two (same camera distance ~30-35 m; both sets of tiny faces lie 15-25 m along the walk). `?wl3c=0` = the round-3 wl3a (one
 * counter, gate 0); `?wl3cg=<g>` moves WL3C_G (lab).
 */
const WL3C_G = 0.0004;
function wl3aWalkFrag(src: string, capC: boolean, g = WL3C_G) {
  const e: P4Edit[] = [{ find: "      if (share > 0.002) {\n", repl: "      if (share > 0.0) {   // wl3a (W)\n" }];
  if (capC)
    e.push(
      { find: "  float hits = 0.0;\n", repl: "  float hits = 0.0;\n  float hitsC = 0.0;   // wl3c: the 4-face cap's own counter\n" },
      {
        find: "      float share = first ? FN : FN - Fc;\n",
        repl: `      float share = first ? FN : FN - Fc;\n      if ((hitsC < 0.5 ? FN : FN - Fc) > ${g.toFixed(5)}) hitsC += 1.0;   // wl3c\n`,
      },
      { find: "      if (Fc > 0.995 || hits > 3.5) break;\n", repl: "      if (Fc > 0.995 || hitsC > 3.5) break;   // wl3c\n" },
    );
  return p4Apply(src, e, "WL3AW");
}
/** wl2g: the walk pass's vertex shader (the lake through the anchor view-projection uLkWalkAP). */
function wl2gWalkVert(src: string) {
  const a = "varying vec3 vWorldPos;\n";
  const b = "  gl_Position = projectionMatrix * viewMatrix * wp;\n";
  if (!src.includes(a) || !src.includes(b)) throw new Error("wl2g: WATER_VERT anchor moved");
  return src.replace(a, a + "uniform mat4 uLkWalkAP;   // wl2g: the walk's anchor view-projection\n").replace(b, "  gl_Position = uLkWalkAP * wp;   // wl2g\n");
}
/** (P4 water G6) The water reads the quarter-size walk (LK_HALF: lake v4, `?lkhalf` not 0). */
function walkHalfWanted(lq: URLSearchParams | null) {
  return lq?.get("lkhalf") !== "0";
}
/**
 * P4 priority round 2, explorer rxa ('MAIN up'; 21 Nov 2026; client: "prio, ensure bagian ini sama kaya di design, gini yaa,
 * color dan reflectionnya" = the ripple rings under the sculpture, target MAIN/notes/round11/refs_user/ripple_target_2026-11-21.png).
 * `?p4rxa=0` = int3 exactly (none of this text, no uniform). Rides on P4 water Q8 (the r12 lake: T1 / T2), applied after every
 * other P4 / w4 edit. MAIN's ring shading kept and moved toward the target:
 * - ring: Q8's steepened sinusoid at the Wave modifier's spacing (2.717 m, uRxaW) with the slope amplitude kept, inside a
 *   front with a feather (uRxaE; Blender's front at F000 is 5.98 m) and less of MAIN's radial decay (the target's rings keep
 *   their strength out to the front).
 * - colour: MAIN's luma ratio (k) plus the HUE of the reflected sky at the tilted facet (rRip / rFlat, luma-neutral, x uRxaS.y):
 *   a camera-facing flank mirrors higher, bluer sky (cobalt / steel-blue troughs), a far flank the paler horizon (silvery crests).
 * - texture: the shading normal also takes the Cycles bump's coherent tilt inside the ring field (uRxaT.x), so the bands break
 *   into short strokes; static (the bump does not move), footprint-filtered by lkBump.
 * - glint: the orb's GGX lobe on the bumped ring water (granular: the bump's facets + the moving rings), widened by the bump's
 *   sub-pixel spread and the normal's change per pixel (no 60 fps sparkle; no time-varying sparkle noise), cyan-white before
 *   the tone map under a soft maximum (uRxaG / uRxaH / uRxaC).
 * - finisher (21 Nov 18:10-): every shading term is a crossfade to int3's own water by rxP (0 in the hold / release, uRxaR.z:
 *   p04-p07 are int3's water); the lane's ring, bump and glint fade to calm water near a face (the calm) and nearer than uRxaW.z..w m
 *   (the bottom rocks' top edge and the water seen just above it). The reflections' geometry always keeps int3's ring (waveS), the
 *   lane's ring only shades (rxWv). int3's ring, k clamp, tint, light and Q8 lobe (hold only) stay intact (uLkP4R untouched).
 * - fixer (21 Nov 19:45-, judge J-RXA-2..4): the shading ring IS int3's ring (its spacing, phase and profile, x the lane's slope
 *   gain): the explorer's second ring field swapped in place on every press / release. The lane's colour now fades out over the
 *   hold as int3's own ring shading does (uHold 0..uRxaR.z = 1). The waterline calm is continuous (the max-mip heightfield's
 *   bilinear block maxima; 9 point taps with step() drew fixed seams in open water) and hands the lane's extras back to int3's
 *   water (not to flat water). The far flank keeps int3's darkening and tint (uRxaT.z = 1): a dark band on each flank, so the
 *   bands keep int3's count (4-5) and average like int3's, and only the camera-facing flank turns cobalt.
 */
const P4_RXA: P4Edit[] = [
  {
    // the lane's uniforms and its own ring (int3's ringSlope above stays as it is: the water hands back to it per pixel)
    find: "vec2 impulseSlope(vec2 d, float r) {\n",
    repl: /* glsl */ `// P4 rxa: W x the shading ring's slope gain on int3's ring (1 = int3's), y the share of int3's radial decay removed from it,
// z / w the camera distance band (m) the lane's water fades in over (nearer: int3's water, the bottom rocks' waterlines);
// E x front radius (m), y feather (m), z share of MAIN's radial decay removed (the envelope of the lane's bump and glint)
uniform vec4 uRxaW;
uniform vec4 uRxaE;
// P4 rxa: S x luma gain on k, y hue gain, z MAIN's fixed trough tint share, w the k band the hue fades in over; T x bump share in
// the shading normal, y lookup roughness, z the far flank's share of int3's darkening and tint (1 = int3's)
uniform vec4 uRxaS;
uniform vec4 uRxaT;
// P4 rxa: G x glint alpha, y gain, z ring share, w bump share of its normal; H x the bump spread's share (LEAN), y the normal's
// change per pixel share (specular AA), z alpha along / across, w the light's drop under the orb centre (m); C the tint
// (rgb), w its soft maximum
uniform vec4 uRxaG;
uniform vec4 uRxaH;
uniform vec4 uRxaC;
// P4 rxa: Q x the waterline calm's heightfield level (0 off; level L = 0.3125 x 2^L m blocks), y / z the face measure (0 open
// water .. 1 at a face's block) over which the lane hands back to int3's water, w the distance (m) the lane's glint fades in by
uniform vec4 uRxaQ;
// P4 rxa: R x (unused), y the troughs' soft-knee limit, z the uHold by which the lane's colour is out (as int3's own ring
// shading, smoothstep(0, 1, uHold)), w int3's Q8 lobe on the near water (nearer than uRxaW.z..w m; 0 off)
uniform vec4 uRxaR;
float rxaEnv(float r) {
  float dec = mix(exp(-r / (uWaveReach * 0.7)), 1.0, uRxaE.z);
  return smoothstep(0.4, 1.8, r) * dec * (1.0 - smoothstep(uRxaE.x - uRxaE.y, uRxaE.x, r));
}
vec2 impulseSlope(vec2 d, float r) {
`,
  },
  {
    // rxP: the lane's share (0 = int3's water exactly): at rest only (uRxaR.z; the hold / release is int3's). rxCalm: the lane's ring,
    // bump and glint fade to calm water within uRxaQ.x m of a floe / rock / shore (8 taps of the static heightfield on a circle + the
    // point) and nearer than uRxaW.z..w m from the camera (the bottom rocks' top edge and the water seen just above it), so the
    // waterlines do not crawl or pop.
    find: "  vec2 waveS = ringSlope(rel, r) * uRippleAmp + impulseSlope(rel, r);\n",
    repl: /* glsl */ `  // P4 rxa: rest 1, fading out over the hold as int3's own ring shading does (uHold 0..uRxaR.z): the same ring, only the colour fades
  float rxW = 1.0 - smoothstep(0.0, max(uRxaR.z, 1e-4), uHold);
  float rxNear = uRxaW.w > uRxaW.z ? smoothstep(uRxaW.z, uRxaW.w, distance(cameraPosition, vWorldPos)) : 1.0;
  // the near water (uRxaE.w): 1 = int3's water (its ring, shading and Q8 lobe: the bottom rocks' top edge keeps int3's AA), 0 = calm
  // inside the lane's front only (uRxaE.x, feather uRxaE.y): beyond it int3's water exactly (its outer rings by the far floes and
  // the right slab: the lane's gain there popped / crawled at their reflections' edges)
  float rxP = rxW * mix(1.0, rxNear, uRxaE.w) * (1.0 - smoothstep(uRxaE.x - uRxaE.y, uRxaE.x, r));
  float rxCalm = mix(rxNear, 1.0, uRxaE.w);
#ifdef LK_HGT
  if (uRxaQ.x > 0.0 && rxP * rxCalm > 0.0 && rxaEnv(r) > 0.0) {
    // the waterline calm, continuous: the max-mip heightfield's level uRxaQ.x (bilinear block maxima) over the level above it (the
    // local face height), ~ 1 - (distance to the face's block) / block whatever the face's height (FLOOR -0.01 = open water)
    vec2 rxHg = vec2(vWorldPos.x - uLkHgtG.x, uLkHgtG.y - vWorldPos.z) * uLkHgtG.z / uLkHgtG.w;
    float rxH1 = textureLod(uLkHgt, rxHg, uRxaQ.x).r + 0.01;
    float rxH2 = textureLod(uLkHgt, rxHg, uRxaQ.x + 1.0).r + 0.01;
    rxCalm *= 1.0 - smoothstep(uRxaQ.y, uRxaQ.z, clamp(rxH1 / max(rxH2, 0.03), 0.0, 1.0));
  }
#endif
  vec2 rxS0 = ringSlope(rel, r);
  vec2 rxIm = impulseSlope(rel, r);
  // the reflections' geometry (mirror / plate bend, hero reflection, Fresnel, Q8's lobe) keeps int3's ring: a reflection edge (a
  // slab's or rock's mirrored top lies metres in front of it, beyond the calm) is bent exactly as in int3 (the crawl gate), calm at
  // rest nearer than uRxaW.z..w m (the rocks' reflections in the near water flickered at 60 fps); the lane's ring drives the shading
  // only (rxWv: the colour bands, hue, bump and the lane's glint)
  vec2 waveS = rxS0 * (uRippleAmp * mix(1.0, rxNear, rxW * (1.0 - uRxaE.w))) + rxIm;
  // the shading ring = int3's ring (its spacing, phase, profile), x the lane's slope gain and less of its radial decay where the
  // lane's share is (a calm or a hold hand-back fades the gain, never swaps the ring field)
  float rxSg = mix(1.0, uRxaW.x * mix(1.0, exp(r / (uWaveReach * 0.7)), uRxaW.y), rxP * rxCalm);
  vec2 rxWv = rxS0 * (uRippleAmp * rxSg) + rxIm;
`,
  },
  {
    find: "  vec3 rRip = min(envRadiance(reflect(-V, Nw), 0.2), vec3(6.0));\n",
    repl: /* glsl */ `  // P4 rxa: the shading normal = the ring's tilt + the bump's coherent tilt inside the ring field (static, footprint-filtered by
  // lkBump); the glint's normal and its widening (derivatives here: uniform control flow). rxP 0: int3's rRip exactly.
  vec3 rxNb = lkN / max(lkN.y, 0.05);
  float rxB = uRxaT.x * smoothstep(0.0, 0.3, rxaEnv(r)) * rxCalm * rxP;
  vec3 rxN = normalize(vec3(-rxWv.x + rxNb.x * rxB, 1.0, -rxWv.y + rxNb.z * rxB));
  float rxRo = mix(0.2, uRxaT.y, rxP);
  vec3 rRip = min(envRadiance(reflect(-V, rxN), rxRo), vec3(6.0));
  vec3 rxGn = normalize(vec3(-rxWv.x * uRxaG.z + rxNb.x * uRxaG.w, 1.0, -rxWv.y * uRxaG.z + rxNb.z * uRxaG.w));
  vec3 rxGw = fwidth(rxGn);
  // (each widening term bounded: a footprint's spread can be huge at the far plane's edge; 0 x inf would be NaN)
  float rxGa = sqrt(uRxaG.x * uRxaG.x + uRxaH.x * clamp(dot(lkSig, lkSig), 0.0, 0.04) + uRxaH.y * clamp(dot(rxGw, rxGw), 0.0, 0.04));
`,
  },
  {
    // Q8's hard clamp drew flat, posterized fills once the gain rose: the lane's share takes a soft knee (uRxaR.y / uLkP4R.w).
    find: "  float k = clamp((dot(rRip, LUMA) - dot(rFlat, LUMA)) / max(dot(rFlat, LUMA), 1e-3) * uRippleShade, -uLkP4R.z, uLkP4R.w);   // P4 water Q8\n",
    repl:
      "  float k = clamp((dot(rRip, LUMA) - dot(rFlat, LUMA)) / max(dot(rFlat, LUMA), 1e-3) * uRippleShade, -uLkP4R.z, uLkP4R.w);   // P4 water Q8\n" +
      "  if (rxP > 0.0) {   // P4 rxa: soft knee\n" +
      "    float rxKr = (dot(rRip, LUMA) - dot(rFlat, LUMA)) / max(dot(rFlat, LUMA), 1e-3) * uRippleShade;\n" +
      "    k = mix(k, rxKr < 0.0 ? -uRxaR.y * (1.0 - exp(rxKr / uRxaR.y)) : uLkP4R.w * (1.0 - exp(-rxKr / uLkP4R.w)), rxP);\n" +
      "  }\n",
  },
  {
    find: "  vec3 rFlat = min(envRadiance(reflect(-V, vec3(0.0, 1.0, 0.0)), 0.2), vec3(6.0));\n",
    repl: "  vec3 rFlat = min(envRadiance(reflect(-V, vec3(0.0, 1.0, 0.0)), rxRo), vec3(6.0));   // P4 rxa\n",
  },
  {
    find:
      "  base *= 1.0 + k;\n  // Troughs mirror the bluer sky higher up (QC round 4: trough B-R 42 vs the reference's 56).\n" +
      "  base = mix(base, base * vec3(0.6, 0.77, 1.16), clamp(-k * 1.4, 0.0, 0.55));\n",
    repl: /* glsl */ `  // P4 rxa: MAIN's k darkened BOTH flanks: the panorama (seen from the orb) is dark and warm (the massif's rock) just under the
  // flat water's mirror direction, so a far flank drew a grey / peach band too. Split by where the tilted ray goes: UP (the
  // camera-facing flank) mirrors higher, bluer sky: MAIN's luma ratio (x uRxaS.x) plus the sky's HUE there (rRip / rFlat,
  // luma-neutral, x uRxaS.y) and MAIN's fixed trough tint (x uRxaS.z): cobalt / steel-blue troughs. DOWN (a far flank) mirrors
  // the lower horizon. Fixer (J-RXA-4): the far flank keeps int3's darkening and fixed tint x uRxaT.z (1 = int3's: a dark band on
  // each flank, int3's band count; the bands average like int3's), the hue only on the camera-facing flank. rxP 0: int3's exactly.
  {
    float rxHold = plateW * rxP;
    float rxD = reflect(-V, rxN).y - reflect(-V, vec3(0.0, 1.0, 0.0)).y;
    float rxUp = smoothstep(-0.004, 0.004, rxD);
    base *= max(1.0 + k * mix(1.0, mix(uRxaT.z, uRxaS.x, rxUp), rxP), 0.25);
    vec3 rxQ = max(rRip, vec3(1e-4)) / max(rFlat, vec3(1e-4));
    vec3 rxH = clamp(rxQ / max(dot(rxQ, LUMA), 1e-4), vec3(0.5), vec3(2.0));
    base *= pow(rxH, vec3(uRxaS.y * rxUp * smoothstep(0.0, uRxaS.w, -k) * rxHold));
    base = mix(base, base * vec3(0.6, 0.77, 1.16), clamp(-k * 1.4, 0.0, 0.55) * mix(1.0, mix(uRxaT.z, uRxaS.z, rxUp), rxP));
  }
`,
  },
  {
    // the lane glint's light: the sculpture's lower body (uRxaH.w m under the orb centre), whose mirror points fall in the middle
    // of the rings (the target's band); int3's lobe keeps int3's light (the orb centre).
    find: "  vec3 lO = normalize(uOrbCenter - vWorldPos);\n",
    repl:
      "  vec3 lO = normalize(uOrbCenter - vWorldPos);\n" +
      "  vec3 rxLO = normalize(uOrbCenter - vec3(0.0, uRxaH.w, 0.0) - vWorldPos);   // P4 rxa\n",
  },
  {
    find:
      "    col += mix(vec3(0.7, 0.88, 1.0), vec3(0.630, 0.901, 0.989), uLkP4G.z) * (uOrbGlow * 0.5 * uLkP4G.w) * p4GgxAniso(Ns, V, lO, uLkP4G.x, uLkP4G.y) * (0.6 + 0.4 * spark) * zone;\n",
    repl: /* glsl */ `    // P4 rxa: the lane's glint (the orb's glitter on the bumped ring water, band-limited by rxGa, cyan-white under a soft maximum)
    // on the ring water at rest (none around a floe / rock or nearer than uRxaQ.w / uRxaW.zw: rxCalm); int3's lobe (Q8) in the hold /
    // release only (at rest int3's lobe drew MAIN's white sparkle low in the frame: white px, and the 60 fps rocks-right blips).
    float rxGs = rxP * smoothstep(uRxaQ.w - 2.0, uRxaQ.w, dist);
    vec3 rxGl = vec3(0.0);
    if (rxGs > 0.0) {
      rxGl = uRxaC.rgb * (uOrbGlow * 0.5 * uRxaG.y) * p4GgxAniso(rxGn, V, rxLO, rxGa, rxGa * uRxaH.z) * zone;
      rxGl *= uRxaC.w / (uRxaC.w + max(max(rxGl.r, rxGl.g), rxGl.b)) * smoothstep(0.0, 0.3, rxaEnv(r)) * rxCalm;
    }
    float rxQw = max(1.0 - rxW, uRxaR.w * (1.0 - rxNear));   // int3's lobe: the hold / release, and the near water (uRxaR.w)
    vec3 rxGq = vec3(0.0);
    if (rxQw > 0.0) rxGq = mix(vec3(0.7, 0.88, 1.0), vec3(0.630, 0.901, 0.989), uLkP4G.z) * (uOrbGlow * 0.5 * uLkP4G.w) * p4GgxAniso(Ns, V, lO, uLkP4G.x, uLkP4G.y) * (0.6 + 0.4 * spark) * zone;
    col += rxGl * rxGs + rxGq * rxQw;
`,
  },
];
/** P4 rxa on (`?p4rxa=0` off); lab knobs (with the engine's debug option): `rxaw= rxae= rxas= rxat= rxag= rxah= rxac= rxaq= rxar=` (4 numbers). */
function p4rxaOn(lq: URLSearchParams | null) {
  return lq?.get("p4rxa") !== "0";
}
/** P4 water: the lane's tasks on (each restores MAIN's text for its part when off). */
function p4WaterTasks(lq: URLSearchParams | null) {
  const on = lq?.get("p4water") !== "0";
  return {
    g2: on && lq?.get("lkchop") !== "0",
    q8: on && lq?.get("lkring") !== "r11",
    // Q9 is OFF by default since the fix round (`?lkglass=1` turns it on, with the W2 gate; `&lkglassj=0` without it): its glassier
    // far water unmasked the orbit ghost (judge W2, ptr_left / ptr_right) that MAIN's corduroy hides, and gated off where the
    // quarter-size walk's taps disagree (the judge's fallback) it keeps ~10 % of its gain: the taps disagree over most of the far
    // water (q00 right floes lap MAIN 9.05, Q9 5.84, gated 8.23 / 8.99 with the 0.01-0.04 / 0.004-0.016 band). WORK/LOG.md fix round.
    q9: on && lq?.get("lkglass") === "1",
    // G6 is OFF by default (`?lkwalkj=1` turns it on): it removes the orbit ghost, but the pixel's own walk it blends in flickers
    // at the far floes' feet where the quarter-size walk's bilinear read was steady: 5 new pop clusters >= 6 px over the six
    // AA paths (fast 1, reverse 2, leave 2; none with it off), which the waterline AA gate does not allow (WORK/LOG.md 03:47).
    g6: on && lq?.get("lkwalkj") === "1",
  };
}

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
#ifdef AA_RESOLVE
${GLSL_AA_RESOLVE}
#endif
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
#ifdef BAKED_MIRROR
// Round 11 (baked environment): the lake is a true planar mirror. LakeMirror draws the environment (world sky, the raw
// baked meshes, the clouds; not BG.001, not the water) from the mirrored camera every frame: rgb = scene-linear radiance,
// a = mirror path length from the mirrored camera (60000 = sky). Sampled at vMirrorClip, as the hero reflection.
uniform sampler2D uEnvMirror;
uniform vec2 uEnvMirrorSize;      // texels
uniform mat4 uEnvMirrorViewProj;  // the target's view-projection (its own frustum, without the oblique clip)
uniform sampler2D uSkyEq;         // the world-only sky equirect (LakeMirror's sky pass)
uniform vec2 uMirrorP;            // the target projection's p00, p11
uniform vec2 uResolution;         // main HDR target size (px): the DOF in screen px
// The Cycles water's bump (Noise Texture scale 3 on object coordinates, i.e. 0.33 m features, detail 4; Bump distance 0.07,
// filter width 1): N' = normalize(N - 0.07 grad h). It does not blur the mirror, it breaks it into fine horizontal wavelets,
// each reflecting another patch of cloud or sky (Blender diagnostic, WORK/diag_lake: bump off the lake is a clean mirror of
// the massif, the iceberg, the clouds and the dark ridge; with it the clouds' light spreads over the whole lake and the
// mountains leave no reflection). A tilt delta moves the reflected ray's elevation by 2 delta, its azimuth only by
// 2 sin(grazing) delta. Cycles takes the slope over each pixel's footprint (ray differentials x filter width), so the finer
// octaves fade where the footprint along the view reaches their wavelength: wavelets near the camera, a calm mirror far out.
// The field is static, as the Cycles water (only its Wave modifier moves, the engine's ripple rings).
// x: tilt per unit slope of this noise (rad), y / z: an octave fades out between wavelength / footprint = y and z, w: gain
// of the fine octaves' spread.
uniform vec4 uLakeBump;
// Far-field spread (std, rad) reached between distances y and z (m): within a few degrees of grazing, the bump's tilts send
// many rays under the horizon into second bounces, and the Cycles lake washes the far shore's reflections out (WORK
// diag_lake: far-left 0.07 with the bump off, 0.34 with it); the octave model alone left the massif's foot reflected.
uniform vec3 uLakeFar;
// The reflection's level against the Cycles lake (fit at rest, readback vs WORK/diag_lake variant A: the live clouds and the
// model's spread leave the mirror ~12 % under the plate's lake).
uniform float uMirrorGain;
uniform float uLakeDebug;
#ifdef LAKE_CORR
// The static rest correction of the far water (pipeline/lake_corr_m9.py, A1 2.1 #12): a blurred ratio of the plate's lake to
// this mirror at rest, averaged over 4 clock times, on the rest plate's uv grid (log2 + 0.5). Indexed by the lake point's
// rest-camera projection, it is fixed on the water plane (no ghost when the camera moves). Far water only (near the rocks the
// two lakes disagree about near reflections, which move with the camera).
uniform sampler2D uLakeCorr;
#endif
vec3 lakeSky(vec3 d) {
  vec2 e = vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, 0.0, 1.0)) * 0.31830989 + 0.5);
  return textureLod(uSkyEq, e, 0.0).rgb;
}
// The bump at a lake point, filtered by the along-view footprint fp (m): xy = the slope (d h / d x, d h / d z) per metre of
// the octaves coarser than the footprint (the pixel sees one tilt: a distortion), z = the RMS slope per axis of the finer
// ones (the pixel's samples spread over them: a blur). Each octave's slope RMS per axis is 1.5 x 0.764 (noised).
vec3 lakeBumpSlope(vec2 xz, float fp) {
  vec2 d = vec2(0.0);
  float v = 0.0;
  float b = 0.5;
  float f = 3.0;
  for (int i = 0; i < 4; i++) {
    float w = smoothstep(uLakeBump.z, uLakeBump.y, 1.0 / (f * fp));
    if (w > 0.0) d += b * f * w * noised(vec3(xz * f + float(i) * 17.31, float(i) * 3.7)).yz;
    v += 1.3133 * (1.0 - w * w);
    b *= 0.5;
    f *= 2.0;
  }
  return vec3(d, sqrt(v));
}
// The lake's reflection at a lake point P (step 2, third session; the 5 discrete elevation taps drew horizontal bands and the
// sub-pixel wavelets read as glitter that the Cycles lake, 64 jittered samples per pixel + OIDN, does not have): the ray
// reflected off the coarse tilt (the octaves the pixel resolves: wavelets near the camera), its elevation folded at the
// horizon (a ray tilted under it meets the water again and goes up), spread in elevation over the fine octaves as ONE
// anisotropic lookup: the footprint along the elevation's direction in the target is the screen footprint plus a box of
// 3.46 sig (the std of the spread), across it the screen footprint; both carry the lake's DOF (gx, gy: the target uv's
// screen derivatives x the DOF scale). Above the target's frustum (35 deg) the sky equirect by direction.
vec3 mirrorTex(vec2 uv0, vec2 gx, vec2 gy, float dist, vec3 V, vec3 P) {
  float sinA = clamp(V.y, 0.02, 0.99);
  vec3 r0 = vec3(-V.x, V.y, -V.z);
  vec4 c0 = uEnvMirrorViewProj * vec4(r0, 0.0);
  vec2 p0 = c0.xy / max(c0.w, 1e-4);
  vec3 s = lakeBumpSlope(P.xz, dist * 5.9e-4 / sinA) * uLakeBump.x;
  vec3 r = reflect(-V, normalize(vec3(-s.x, 1.0, -s.y)));
  float sig = 2.0 * s.z * uLakeBump.w;
  float sf = uLakeFar.x * smoothstep(uLakeFar.y, uLakeFar.z, dist);
  sig = sqrt(sig * sig + sf * sf);
  vec2 hz = normalize(r.xz + vec2(1e-6, 0.0));
  float e = max(abs(asin(clamp(r.y, -1.0, 1.0))), 0.0035);
  vec3 rc = vec3(hz.x * cos(e), sin(e), hz.y * cos(e));
  vec4 cc = uEnvMirrorViewProj * vec4(rc, 0.0);
  if (cc.w <= 1e-4) return lakeSky(rc);
  vec2 pc = cc.xy / cc.w;
  vec2 uv = uv0 + (pc - p0) * 0.5;
  if (uv.y < 0.0) return lakeSky(rc);
  // target uv per radian of elevation (the spread's direction and scale in the target)
  const float DE = 0.02;
  vec4 cu = uEnvMirrorViewProj * vec4(hz.x * cos(e + DE), sin(e + DE), hz.y * cos(e + DE), 0.0);
  vec2 J = (cu.xy / max(cu.w, 1e-4) - pc) * (0.5 / DE);
  float lj = max(length(J), 1e-6);
  vec2 dy = (J / lj) * (length(gy) + lj * 3.46 * sig);
  return textureGrad(uEnvMirror, clamp(uv, vec2(0.0005), vec2(0.9995)), gx, dy).rgb;
}
#ifdef LAKE_R12
${GLSL_LAKE_R12}
#endif
#endif

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

#ifdef LK_WAVEB
// The Wave modifier of the Cycles water (forensics 3.3, Plane.011 only, |x|, |y| < 14.85 m): Gaussian crests
// 0.226 exp(-(2.362 a)^2), 2.717 m apart, moving out at 1.115 m/s from Blender (0, 8.6) = three (x 0, z -8.6) inside an
// expanding front; Subdivision L2 lowers the crest to 0.173 m (evaluated), i.e. 0.173 exp(-(1.808 a)^2) for the same area.
// The front: the Default Loop's 6.0-10.4 m (F1-F120) at rest, the State video's 18-23 m (F328-F472) in the hold, so the
// crests cover the near water there (F404-F436 bottom); it follows the dolly (uHold) with a 2 m soft edge (no pop).
// xyz = (height, dh/dx, dh/dz) at three.js (x, z).
vec3 lkWaveH(vec2 xz, float R) {
  if (abs(xz.x) > 14.85 || abs(xz.y) > 14.85) return vec3(0.0);
  vec2 d = vec2(xz.x, xz.y + 8.6);
  float r = length(d);
  if (r >= R) return vec3(0.0);
  const float WB = 1.358483;
  const float NW = 1.808;
  float a = mod(r - 1.115 * uTime + WB, 2.0 * WB) - WB;
  float e = 1.0 - smoothstep(R - 2.0, R, r);
  float z = 0.173 * exp(-(NW * a) * (NW * a));
  float dz = -2.0 * NW * NW * a * z * e - z * (smoothstep(R - 2.0, R, r + 0.01) - smoothstep(R - 2.0, R, r)) * 100.0;
  return vec3(z * e, d / max(r, 1e-3) * dz);
}
// The slope where the view ray meets the displaced water (not under the flat-plane point P): seen at a grazing angle the crests'
// near flanks stretch over the screen and hide the water behind them (the reference's broad blue bands), which a normal map
// alone cannot show. A short march down the ray from the crest height (0.173 m) to the plane, then a linear refinement.
vec2 lkWaveGrad(vec3 P) {
  float R = mix(8.2, 21.5, smoothstep(0.0, 1.0, uHold));
  vec2 toC = (cameraPosition.xz - P.xz) / max(cameraPosition.y - P.y, 0.05);
  vec2 x0 = P.xz + toC * 0.173;
  vec2 c = vec2(0.0, -8.6);
  // Neither end of the ray's span near the front's disk (the span is straight, so its distance is at least the smaller end's
  // minus its length): no wave there.
  if (min(distance(P.xz, c), distance(x0, c)) - length(toC) * 0.173 > R) return vec2(0.0);
  float yPrev = 0.173;
  float gPrev = lkWaveH(x0, R).x - yPrev;   // <= 0 at the top
  vec3 hit = vec3(0.0);
#ifdef LK_WAVE2
  // Fix round 2 (judge2: a dotted dark line along the crests in the hold): 8 steps let the ray skip a crest's top between two
  // samples on some pixels of every silhouette row and land on the back flank (a dotted line). 24 steps and a bisection of the
  // bracket find the first crossing on every pixel (a continuous silhouette).
  for (int i = 1; i <= LK_WAVE2_N; i++) {
    float y = 0.173 * (1.0 - float(i) / float(LK_WAVE2_N));
    float g = lkWaveH(P.xz + toC * y, R).x - y;
    if (g >= 0.0) {
      float ya = yPrev;
      float yb = y;
      for (int k = 0; k < 5; k++) {
        float ym = 0.5 * (ya + yb);
        if (lkWaveH(P.xz + toC * ym, R).x >= ym) yb = ym;
        else ya = ym;
      }
      hit = lkWaveH(P.xz + toC * (0.5 * (ya + yb)), R);
      break;
    }
    yPrev = y;
  }
#else
  for (int i = 1; i <= 8; i++) {
    float y = 0.173 * (1.0 - float(i) / 8.0);
    vec3 w = lkWaveH(P.xz + toC * y, R);
    float g = w.x - y;
    if (g >= 0.0) {
      float t = gPrev / min(gPrev - g, -1e-6);
      float yh = mix(yPrev, y, clamp(t, 0.0, 1.0));
      hit = lkWaveH(P.xz + toC * yh, R);
      break;
    }
    yPrev = y;
    gPrev = g;
  }
#endif
  return hit.yz;
}
// The water's normal tilted by the crests' slope wv. LK_WAVE2 (fix round 2): a ray the tilted water sends DOWN (a back flank
// seen just over a crest's top, a trough) meets the water again and leaves upward, as the Cycles mirror water's next glossy
// bounce does: mirrored about the plane (it took the lifted horizon before: the dark dots and smears in the hold).
vec3 lkWaveTilt(vec3 N, vec2 wv, vec3 V) {
  vec3 Nt = normalize(N / max(N.y, 0.05) + vec3(-wv.x, 0.0, -wv.y));
#ifdef LK_WAVE2
  vec3 R = reflect(-V, Nt);
  if (R.y < 0.0) Nt = normalize(vec3(R.x, -R.y, R.z) + V);
#endif
  return Nt;
}
#endif
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
#if defined(SHORE_AA) && !defined(BAKED_MIRROR)
// Hotfix 2 (smooth waterline; ?shoreaa=0 restores the per-pixel switches below exactly). Every choice the lake makes beside
// a floe or a rock (re-aimed or straight lookup, the projector's own texel or the occlusion fill, which projector, the
// ripple-bent or the plain lookup) was a per-pixel switch on a nearest-filtered depth map: texel staircases and 1-px
// flips along every waterline, crawling whenever the camera moved ("low-quality anti-aliasing", 18 Nov). The depth maps
// are now bilinear (PlateEnvironment.depthLinear), so each test is continuous and its edge the true sub-texel curve; each
// switch is a weight anti-aliased over the pixel, and the two candidates are blended where it is fractional (a 1-2 px band).
// uShoreFar: the raised test (a lookup that lands on ice) fades out between x and y metres from the projector (40-60 m
// before: the far floes' own texels were painted on the water beside them when the camera moved).
uniform vec2 uShoreFar;
// Coverage of the region x > 0 over this pixel (uniform control flow only).
float shoreAA(float x) {
  return clamp(0.5 + x / max(fwidth(x), 1e-4), 0.0, 1.0);
}
// A depth map read exactly as the nearest filter did (for the rules kept as they were: the open lake stays identical).
vec4 shoreNearest(sampler2D t, vec2 uv) {
  ivec2 n = textureSize(t, 0);
  return texelFetch(t, clamp(ivec2(uv * vec2(n)), ivec2(0), n - 1), 0);
}
// The ripple guard's depth-ratio rule (the bent lookup q nearer than the plain one c by > 8 % + 0.3 m: it hit a rock or a
// floe). On the open lake it also bends the ripple rings: there it stays the nearest-depth step it was (n*); across a depth
// edge (nearest and bilinear depth disagree) it ramps over the texel on the bilinear depth (b*) instead of dotting the
// outline of every near rock pixel by pixel.
float shoreRatio(float nq, float nc, float bq, float bc) {
  float hard = step(nq, nc * 0.92 - 0.3);
  float soft = smoothstep(-0.5, 0.5, (bc * 0.92 - 0.3 - bq) / max(0.25 * bc, 1e-3));
  return mix(hard, soft, smoothstep(0.02, 0.06, abs(nq - bq) / max(bq, 1e-3)));
}
// One rest-plate lookup at puv: ripple-bent, pulled back softly where the bent lookup would land on ice, destreaked.
vec3 shoreTap(vec2 puv, vec2 offs, float lod, float dist) {
  vec2 quv = clamp(puv + offs, vec2(0.0005), vec2(0.9995));
  if (uPlateDepthOn > 0.5) {
    vec2 cuv = clamp(puv, vec2(0.0005), vec2(0.9995));
    quv = mix(quv, cuv, max(smoothstep(0.03, 0.07, plateSeenY(quv) - vWorldPos.y),
      shoreRatio(shoreNearest(uPlateDepth, quv).r, shoreNearest(uPlateDepth, cuv).r, plateDepthAt(quv), plateDepthAt(cuv))));
  }
  vec3 c = textureLod(uPlate, quv, lod).rgb;
#ifdef WATER_GLITTER
  float destreak = smoothstep(12.0, 35.0, dist);
  if (destreak > 0.0) {
    float ty = 1.5 / float(textureSize(uPlate, 0).y);
    vec3 blur = c * 0.4026
      + (textureLod(uPlate, quv + vec2(0.0, ty), lod).rgb + textureLod(uPlate, quv - vec2(0.0, ty), lod).rgb) * 0.2442
      + (textureLod(uPlate, quv + vec2(0.0, 2.0 * ty), lod).rgb + textureLod(uPlate, quv - vec2(0.0, 2.0 * ty), lod).rgb) * 0.0545;
    c = mix(c, blur, destreak);
  }
#endif
  return c;
}
// The rest plate's lake for the lookup point pw (projected at pclip): the raised test, then the projector's own texel and
// the occlusion fill blended by it (step(0.5, raised) before). raised, nofill (0..1) and the main lookup uv come back.
vec3 restLake(vec3 pw, vec4 pclip, vec2 offs, float lodX, float camAway, float dist, out float raised, out float nofill, out vec2 puv) {
  raised = 0.0;
  if (uPlateDepthOn > 0.5 && camAway > 0.02) {
    vec2 ruv = clamp(pclip.xy / pclip.w * 0.5 + 0.5, vec2(0.0), vec2(1.0));
    float dz = plateDepthAt(ruv);
    float fzw = -(uPlateView * vec4(pw, 1.0)).z;
    vec3 seen = uPlateCamPos + (pw - uPlateCamPos) * (dz / max(fzw, 1e-3));
    raised = smoothstep(0.05, 0.12, seen.y - pw.y) * (1.0 - smoothstep(uShoreFar.x, uShoreFar.y, fzw));
  }
  vec2 puv0 = pclip.xy / pclip.w * 0.5 + 0.5;
  vec2 pa = plateUnoccluded(puv0, pw, 0.0);
  float nfa = step(pa.x, -0.5);
  if (nfa > 0.5) pa = puv0;
  float wF = smoothstep(0.3, 0.7, raised);
  vec2 pb = pa;
  float nfb = nfa;
  bool two = false;
  if (wF > 0.0 && nfa < 0.5 && distance(pa, puv0) < 1e-7) {
    // pa is the projector's own texel: the forced fill is a lookup of its own
    pb = plateUnoccluded(puv0, pw, 1.0);
    nfb = step(pb.x, -0.5);
    if (nfb > 0.5) pb = puv0;
    two = true;
  }
  nofill = mix(nfa, nfb, wF);
  puv = wF < 0.5 ? pa : pb;
  float lod = lodX + 3.0 * raised;
  vec3 c = wF < 1.0 || !two ? shoreTap(pa, offs, lod, dist) : vec3(0.0);
  if (two) c = mix(c, shoreTap(pb, offs, lod, dist), wF);
  return c;
}
${GLSL_EXTRA_SHORE}
#endif

#if defined(LAKE_R12) && defined(LK_CACHEN) && defined(LK_HALF) && defined(LK_WALKREPROJ)
// (Fix round 1, LK_CACHEN) The walk term at this lake point, as the water's inline read below (LK_HALF + LK_WALKREPROJ +
// LK_WALKSEL, with LK_WALKPX / LK_WALKEDGE), so the cached path can skip it.
vec4 lkWalkRead(float dist, vec3 V, vec3 lkN, vec2 lkSig) {
  vec4 lkWc = uLkWalkVP * vec4(vWorldPos, 1.0);
  vec4 lkW;
  vec2 wsz = vec2(textureSize(uLkWalk, 0));
  vec2 q = (lkWc.xy / lkWc.w * 0.5 + 0.5) * wsz - 0.5;
  ivec2 i0 = ivec2(floor(q));
  vec2 f = q - floor(q);
  ivec2 mx = ivec2(wsz) - 1;
  vec4 t00 = texelFetch(uLkWalk, clamp(i0, ivec2(0), mx), 0);
  vec4 t10 = texelFetch(uLkWalk, clamp(i0 + ivec2(1, 0), ivec2(0), mx), 0);
  vec4 t01 = texelFetch(uLkWalk, clamp(i0 + ivec2(0, 1), ivec2(0), mx), 0);
  vec4 t11 = texelFetch(uLkWalk, clamp(i0 + ivec2(1, 1), ivec2(0), mx), 0);
  vec4 wt = vec4((1.0 - f.x) * (1.0 - f.y), f.x * (1.0 - f.y), (1.0 - f.x) * f.y, f.x * f.y);
#ifdef LK_WALKPX
  wt *= vec4(step(-0.5, t00.a), step(-0.5, t10.a), step(-0.5, t01.a), step(-0.5, t11.a));
  float ws = wt.x + wt.y + wt.z + wt.w;
  if (ws > 0.05) {
    vec4 hw = wt * vec4(step(-0.15, t00.a), step(-0.15, t10.a), step(-0.15, t01.a), step(-0.15, t11.a));
    float hs = hw.x + hw.y + hw.z + hw.w;
    float eT = (t00.a * wt.x + t10.a * wt.y + t01.a * wt.z + t11.a * wt.w) / ws;
    vec3 cF = (t00.rgb * hw.x + t10.rgb * hw.y + t01.rgb * hw.z + t11.rgb * hw.w) / max(hs, 1e-5);
    vec3 rcW = reflect(-V, lkN);
    float FW = hs > 1e-5 ? lkPhiT((eT - asin(clamp(rcW.y, -1.0, 1.0))) / max(2.0 * 0.07 * lkSig.y, 1e-4)) : 0.0;
    lkW = vec4(cF * FW, FW);
  } else lkW = lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);
#else
  vec4 wv = vec4(step(0.0, t00.a), step(0.0, t10.a), step(0.0, t01.a), step(0.0, t11.a));
#ifdef LK_WALKEDGE
  if (dot(wt, 1.0 - wv) > 0.01) lkW = lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);
  else lkW = t00 * wt.x + t10 * wt.y + t01 * wt.z + t11 * wt.w;
#else
  wt *= wv;
  float ws = wt.x + wt.y + wt.z + wt.w;
  if (ws > 0.05) lkW = (t00 * wt.x + t10 * wt.y + t01 * wt.z + t11 * wt.w) / ws;
  else lkW = lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);
#endif
#endif
  return lkW;
}
#endif
void main() {
#ifdef LK_WALKPASS
  {
    // The half-resolution walk pass (Water.renderWalk): the obstacle term only, from the same view, DOF footprint and bump
    // as the water's own pass below (nothing else of the water is needed for it).
    vec3 V0 = normalize(cameraPosition - vWorldPos);
    float dist0 = distance(cameraPosition, vWorldPos);
    float lodX0 = LK_DOFK * uDofBlur * smoothstep(0.0, mix(30.0, 10.0, uHold), abs(dist0 - uFocusDist)) + 1.6 * (1.0 - smoothstep(8.0 + 10.0 * uHold, 16.0 + 12.0 * uHold, dist0));
    float kDof0 = max(exp2(lodX0) * uResolution.x / 1800.0, 1.0);
    vec2 sg0;
    vec3 wDx0 = dFdx(vWorldPos);   // (derivatives before any branch)
    vec3 wDy0 = dFdy(vWorldPos);
    vec3 n0 = lkBump(vWorldPos, wDx0, wDy0, kDof0, sg0);
#ifdef LK_WALKSEL
    // A lake point inside a floe's / slab's / rock's footprint lies under it, hidden from the camera: marked (alpha -1), so the
    // water's filtered read skips it. (Its walk starts inside the floe and looks the floe up from within: the mirrored camera
    // shows the floe's inside there, sunlit from the double-sided bake; filtered at a quarter of the resolution it spilled into
    // the visible water under the floe's foot, where Cycles shows the face's dark reflection.)
    if (lkHgtAt(vWorldPos.xz) > 0.02) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, -1.0);
      return;
    }
#ifdef LK_WALKNEAR
    // Fix round 2 (judge minor: a flat light block at the left rock's waterline while the camera moves): a texel next to a
    // footprint (one walk texel away) is marked too (-0.5), so the water walks per pixel along every waterline: interpolated
    // across the edge, this texel's walk (from its own centre, a few pixels from the face) painted its value over pixels whose
    // own walk differs steeply with the distance to the face.
    {
      if (max(max(lkHgtAt(vWorldPos.xz + wDx0.xz), lkHgtAt(vWorldPos.xz - wDx0.xz)), max(lkHgtAt(vWorldPos.xz + wDy0.xz), lkHgtAt(vWorldPos.xz - wDy0.xz))) > 0.02) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, -0.5);
        return;
      }
    }
#endif
#endif
#ifdef LK_WALKPX
    // Fix round 1: the faces' mean colour and the horizon they raise (the final horizon elevation, rad); no face: -0.2. The
    // water takes the share of its OWN rays under that horizon (its own coherent normal: the wavelets), as Cycles' pixels do.
    vec4 wT = lkWalkTerm(dist0, V0, n0, sg0, vWorldPos);
    gl_FragColor = lkHits > 0.5 ? vec4(wT.rgb / max(wT.a, 1e-4), lkWalkE) : vec4(0.0, 0.0, 0.0, -0.2);
#else
    gl_FragColor = lkWalkTerm(dist0, V0, n0, sg0, vWorldPos);
#endif
    return;
  }
#endif
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

#ifdef BAKED_MIRROR
  // Round 11 (baked environment): the planar mirror at this lake point, bent by the same ripple / breeze offsets. They were
  // tuned in plate uv (1.3 frame widths, 1.33 frame heights); the mirror image is the screen flipped left-right (the
  // mirrored camera's x axis is world -x). Nothing is hidden from a mirror: no fill, no re-aim, no plate coverage.
  vec4 mclip = uEnvMirrorViewProj * vec4(vWorldPos, 1.0);
  vec2 muv = mclip.xy / mclip.w * 0.5 + 0.5;
  // (In target uv: a frame width is tanH p00 of it, a frame height tanV p11; tanH 0.4263, tanV 0.2266 at the rest framing.)
  vec2 moffs = vec2(-offs.x * 1.3 * uMirrorP.x * 0.4263, offs.y * 1.33 * uMirrorP.y * 0.2266);
  // The lake's DOF as the plate's (QC round 8, T05): 2^lodX plate texels (1800 per frame width) = that many x W / 1800
  // screen px, applied to the target lookup's screen footprint (the specular point's uv, without the ripple offsets).
#ifdef LAKE_R12
  float lodX = LK_DOFK * uDofBlur * smoothstep(0.0, mix(30.0, 10.0, uHold), abs(dist - uFocusDist)) + 1.6 * (1.0 - smoothstep(8.0 + 10.0 * uHold, 16.0 + 12.0 * uHold, dist));
#else
  float lodX = uDofBlur * smoothstep(0.0, mix(30.0, 10.0, uHold), abs(dist - uFocusDist)) + 1.6 * (1.0 - smoothstep(8.0 + 10.0 * uHold, 16.0 + 12.0 * uHold, dist));
#endif
  float kDof = max(exp2(lodX) * uResolution.x / 1800.0, 1.0);
#ifdef LAKE_R12
  // The Cycles bump (GLSL_LAKE_R12) and the planar mirror with parallax. The ring waves keep their image-space bend (the
  // breeze grain m1 emulated the Blender bump on the plate: the bump itself is exact here).
  vec2 offsW = vec2(waveS.x, -waveS.y) * uDistortion * mix(0.6, 1.4, smoothstep(6.0, 60.0, dist));
  vec2 moffsW = vec2(-offsW.x * 1.3 * uMirrorP.x * 0.4263, offsW.y * 1.33 * uMirrorP.y * 0.2266);
#ifdef LK_CACHEN
  // Fix round 1 (judge1: frame budget): where the cached term is read, the bump (~1.5 ms of a T1 frame) and the walk read are
  // skipped; the bump's coherent normal (the hero reflection's chop) comes from its own cache, drawn with the term
  // (LK_CACHENPASS). Everything else as the path below. (Derivatives first: the branch is not uniform.)
  vec3 lkDPx = dFdx(vWorldPos);
  vec3 lkDPy = dFdy(vWorldPos);
  vec2 lkGx = dFdx(muv) * kDof;
  vec2 lkGy = dFdy(muv) * kDof;
  vec2 lkSig = vec2(0.0);
  vec3 lkN = vec3(0.0, 1.0, 0.0);
#ifdef LK_WAVEB
  float lkHw = smoothstep(0.0, 1.0, uHold);
  vec2 lkWv = lkHw > 0.0 ? lkWaveGrad(vWorldPos) * lkHw : vec2(0.0);
  moffsW *= 1.0 - lkHw;
  offsW *= 1.0 - lkHw;
  bool lkBent = lkWv.x != 0.0 || lkWv.y != 0.0 || moffsW.x != 0.0 || moffsW.y != 0.0;
#else
  bool lkBent = moffsW.x != 0.0 || moffsW.y != 0.0;
#endif
  float lkTag = vWorldPos.y > 0.00085 ? 2.0 : 1.0;
  vec4 lkC = vec4(0.0);
#ifdef LK_CACHE
  if (uLkCacheOn > 0.5 && !lkBent) lkC = texelFetch(uLkCache, ivec2(gl_FragCoord.xy), 0);
#endif
  float lkS = 0.0;
  vec3 base = vec3(0.0);
  if (abs(lkC.a - lkTag) < 0.5) {
#ifdef LK_CACHE
    vec4 cn = texelFetch(uLkCacheN, ivec2(gl_FragCoord.xy), 0);
    lkN = vec3(cn.x, sqrt(max(1.0 - cn.x * cn.x - cn.y * cn.y, 0.0)), cn.y);
#endif
    base = lkC.rgb;
  } else {
    lkN = lkBump(vWorldPos, lkDPx, lkDPy, kDof, lkSig);
#if defined(LK_WAVEB) && !defined(LK_CACHEPASS) && !defined(LK_CACHENPASS)
    if (lkWv.x != 0.0 || lkWv.y != 0.0) lkN = lkWaveTilt(lkN, lkWv, V);
#endif
#ifdef LK_CACHENPASS
    gl_FragColor = vec4(lkN.x, lkN.z, 0.0, lkTag);
    return;
#endif
#if defined(LK_HALF) && defined(LK_WALKREPROJ)
    vec4 lkW = lkWalkRead(dist, V, lkN, lkSig);
#if defined(LK_WAVEW) && !defined(LK_CACHEPASS) && !defined(LK_CACHENPASS)
    // Fix round 2 (judge2: blocky hatching and a dark smear in the hold's crests): the quarter-size walk pass knows only the
    // untilted water, so on the crests the water took the low rays' share and faces of the flat water's rays (the faces of the
    // rocks behind, in 4 x 4 px blocks). Where the crests tilt it, the water walks with its own normal.
    if (lkWv.x != 0.0 || lkWv.y != 0.0) lkW = lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);
#endif
#else
    vec4 lkW = lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);   // (the walk pass itself: never reached)
#endif
#ifdef LK_CACHEPASS
    gl_FragColor = vec4(lkReflect4(muv, lkGx, lkGy, dist, V, lkN, lkSig, uLkZero, lkW, lkS) * (uMirrorGain * LK_GAIN), lkTag);
    return;
#endif
    base = lkReflect4(muv, lkGx, lkGy, dist, V, lkN, lkSig, moffsW, lkW, lkS) * (uMirrorGain * LK_GAIN);
  }
  if (uLakeDebug > 10.5) {
    gl_FragColor = lkDbgE;
    return;
  }
  if (uLakeDebug > 9.5) {
    gl_FragColor = vec4(lkWalkIt, lkS, lkHits, 1.0);
    return;
  }
#else
  vec2 lkSig;
  vec3 lkN = lkBump(vWorldPos, dFdx(vWorldPos), dFdy(vWorldPos), kDof, lkSig);
#ifdef LK_WAVEB
  // Fix round 1 (judge1: the hold's rolling wave bands F404-F436 missing): in the hold the Cycles water's own Wave modifier
  // TILTS the water (its mesh is displaced): the coherent normal takes the crests' slope where the view ray meets them and
  // every ray of the pixel moves by twice it (the flanks reach ~0.27, i.e. ~30 deg: the troughs mirror the deep blue sky).
  // It fades in with the dolly (uHold); at rest the water is exactly as before (the rings' image bend and crest-band shading,
  // tuned on F000: band-pass 7.7 vs F000 6.9, where the crests' tilt gave 5.9). The bend and the shading fade out with it.
  float lkHw = smoothstep(0.0, 1.0, uHold);
  vec2 lkWv = lkHw > 0.0 ? lkWaveGrad(vWorldPos) * lkHw : vec2(0.0);
  moffsW *= 1.0 - lkHw;
  offsW *= 1.0 - lkHw;
  bool lkBent = lkWv.x != 0.0 || lkWv.y != 0.0 || moffsW.x != 0.0 || moffsW.y != 0.0;
#ifndef LK_CACHEPASS
  if (lkWv.x != 0.0 || lkWv.y != 0.0) lkN = lkWaveTilt(lkN, lkWv, V);
#endif
#else
  bool lkBent = moffsW.x != 0.0 || moffsW.y != 0.0;
#endif
  float lkS;
#if defined(LK_V2)
  vec3 base = lkReflect(muv, dFdx(muv) * kDof, dFdy(muv) * kDof, dist, V, lkN, lkSig, moffsW, lkS) * uMirrorGain;
#elif defined(LK_HGT)
#ifdef LK_HALF
#ifdef LK_WALKREPROJ
  // The walk at this lake point's place in the walk's own frame: it may have been drawn a frame earlier or before a pure turn
  // of the camera (LakeSchedule); for the frame it was drawn in this is the pixel's own place.
  vec4 lkWc = uLkWalkVP * vec4(vWorldPos, 1.0);
#ifdef LK_WALKSEL
  // Bilinear over the walk texels of visible lake points only (the marked ones under floes get no weight); where nearly all the
  // weight sits on marked texels (the visible water right at a floe's foot) the walk is computed for this pixel.
  vec4 lkW;
  {
    vec2 wsz = vec2(textureSize(uLkWalk, 0));
    vec2 q = (lkWc.xy / lkWc.w * 0.5 + 0.5) * wsz - 0.5;
    ivec2 i0 = ivec2(floor(q));
    vec2 f = q - floor(q);
    ivec2 mx = ivec2(wsz) - 1;
    vec4 t00 = texelFetch(uLkWalk, clamp(i0, ivec2(0), mx), 0);
    vec4 t10 = texelFetch(uLkWalk, clamp(i0 + ivec2(1, 0), ivec2(0), mx), 0);
    vec4 t01 = texelFetch(uLkWalk, clamp(i0 + ivec2(0, 1), ivec2(0), mx), 0);
    vec4 t11 = texelFetch(uLkWalk, clamp(i0 + ivec2(1, 1), ivec2(0), mx), 0);
    vec4 wt = vec4((1.0 - f.x) * (1.0 - f.y), f.x * (1.0 - f.y), (1.0 - f.x) * f.y, f.x * f.y);
#ifdef LK_WALKPX
    // (texels: rgb = the faces' mean colour, a = the horizon they raise, -0.2 = no face, -1 = under a floe)
    wt *= vec4(step(-0.5, t00.a), step(-0.5, t10.a), step(-0.5, t01.a), step(-0.5, t11.a));
    float ws = wt.x + wt.y + wt.z + wt.w;
    if (ws > 0.05) {
      vec4 hw = wt * vec4(step(-0.15, t00.a), step(-0.15, t10.a), step(-0.15, t01.a), step(-0.15, t11.a));
      float hs = hw.x + hw.y + hw.z + hw.w;
      float eT = (t00.a * wt.x + t10.a * wt.y + t01.a * wt.z + t11.a * wt.w) / ws;
      vec3 cF = (t00.rgb * hw.x + t10.rgb * hw.y + t01.rgb * hw.z + t11.rgb * hw.w) / max(hs, 1e-5);
      vec3 rcW = reflect(-V, lkN);
      float FW = hs > 1e-5 ? lkPhiT((eT - asin(clamp(rcW.y, -1.0, 1.0))) / max(2.0 * 0.07 * lkSig.y, 1e-4)) : 0.0;
      lkW = vec4(cF * FW, FW);
    } else lkW = lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);
#else
    vec4 wv = vec4(step(0.0, t00.a), step(0.0, t10.a), step(0.0, t01.a), step(0.0, t11.a));
#ifdef LK_WALKEDGE
    // Fix round 1 (judge1 minor: a flat light 4 x 12 px block at the left rock's waterline in the sweep): next to a footprint
    // the renormalised taps gave the strip between the texel centres one far texel's value. A pixel with any marked tap that
    // carries weight computes its own walk (the block shrinks to ~3 x 4 px; leaving the fringe pixels to the march instead drew a
    // light slit along the rock's waterline: rejected, WORK fx1/an_rockedge6x_b.jpg).
    if (dot(wt, 1.0 - wv) > 0.01) lkW = lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);
    else lkW = t00 * wt.x + t10 * wt.y + t01 * wt.z + t11 * wt.w;
#else
    wt *= wv;
    float ws = wt.x + wt.y + wt.z + wt.w;
    if (ws > 0.05) lkW = (t00 * wt.x + t10 * wt.y + t01 * wt.z + t11 * wt.w) / ws;
    else lkW = lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);
#endif
#endif
  }
#else
  vec4 lkW = texture2D(uLkWalk, lkWc.xy / lkWc.w * 0.5 + 0.5);
#endif
#else
  vec4 lkW = texture2D(uLkWalk, gl_FragCoord.xy * uLkWalkInv);
#endif
#else
  vec4 lkW = lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);
#endif
#if defined(LK_WAVEW) && defined(LK_HALF) && !defined(LK_CACHEPASS)
  if (lkWv.x != 0.0 || lkWv.y != 0.0) lkW = lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);   // (as the cached path above)
#endif
  // LK_GAIN: the level against the Cycles water at the same camera (rest, clouds at their Blender places: water band means
  // Cycles / engine 1.08-1.37 left and centre, 0.96-1.14 right, WORK tools/bandcmp.py; the flat mirrors agree within 10 %).
#ifdef LK_CACHEPASS
  // The cache pass (Water.renderCache): this term without the ring waves' bend, i.e. exactly what the water computes at every
  // pixel the waves do not reach (it depends on the camera, the DOF, the mirror and the walk target only, not on time). The
  // same call as the water's below (derivatives first, a run-time zero bend), so both compile to the same arithmetic.
  {
    vec2 lkGx0 = dFdx(muv) * kDof;
    vec2 lkGy0 = dFdy(muv) * kDof;
    // alpha = which lake plane wrote it (1 near, 2 far: 1.7 mm higher), so each plane's fragments read only their own values.
    gl_FragColor = vec4(lkReflect4(muv, lkGx0, lkGy0, dist, V, lkN, lkSig, uLkZero, lkW, lkS) * (uMirrorGain * LK_GAIN), vWorldPos.y > 0.00085 ? 2.0 : 1.0);
    return;
  }
#endif
#ifdef LK_CACHE
  // Frame budget (T1 at rest): while the camera stands still the term is read from the cache; pixels the ring waves or a
  // press / release impulse bend compute it (moffsW is exactly 0 elsewhere). ?lkcache=0: always computed.
  // (The screen derivatives are taken before the branch: derivatives inside non-uniform control flow are undefined.)
  vec2 lkGx = dFdx(muv) * kDof;
  vec2 lkGy = dFdy(muv) * kDof;
  // The cache pass is single-sampled: it writes where it covered the pixel centre, alpha = the lake plane (1 near, 2 far). MSAA
  // also shades edge pixels whose centre lies just outside a quad, and both planes meet along one row (z -14.87 m): a
  // fragment reads the cache only where its own plane wrote it, else it computes the term.
  vec4 lkC = vec4(0.0);
  if (uLkCacheOn > 0.5 && !lkBent) lkC = texelFetch(uLkCache, ivec2(gl_FragCoord.xy), 0);
  vec3 base;
  lkS = 0.0;
  if (abs(lkC.a - (vWorldPos.y > 0.00085 ? 2.0 : 1.0)) < 0.5) base = lkC.rgb;
  else base = lkReflect4(muv, lkGx, lkGy, dist, V, lkN, lkSig, moffsW, lkW, lkS) * (uMirrorGain * LK_GAIN);
#else
  vec3 base = lkReflect4(muv, dFdx(muv) * kDof, dFdy(muv) * kDof, dist, V, lkN, lkSig, moffsW, lkW, lkS) * (uMirrorGain * LK_GAIN);
#endif
  if (uLakeDebug > 10.5) {
    gl_FragColor = lkDbgE;
    return;
  }
  if (uLakeDebug > 9.5) {
    // Calibration (lab): the heightfield walk's iterations, the first obstacle's parallax fraction, the obstacles met.
    gl_FragColor = vec4(lkWalkIt, lkS, lkHits, 1.0);
    return;
  }
#else
  vec3 base = lkReflect3(muv, dFdx(muv) * kDof, dFdy(muv) * kDof, dist, V, lkN, lkSig, moffsW, vWorldPos, lkS) * uMirrorGain;
#endif
#endif
  if (uLakeDebug > 8.5) {
    // Calibration (lab): the remainder (the rays over the first obstacle), scene-linear.
    gl_FragColor = vec4(lkDbgU * uMirrorGain, 1.0);
    return;
  }
  if (uLakeDebug > 7.5) {
    gl_FragColor = vec4(lkDbgPc, lkDbgSH, lkS, 1.0);
    return;
  }
  if (uLakeDebug > 6.5) {
    gl_FragColor = vec4(lkDbgH * uMirrorGain, 1.0);
    return;
  }
  if (uLakeDebug > 5.5) {
    // Calibration (lab): the flat mirror (no bump): LakeMirror's target at the lake point's own mirror point, the path
    // length beyond the lake point in alpha.
    vec4 fm = textureLod(uEnvMirror, muv, 0.0);
    gl_FragColor = vec4(fm.rgb * uMirrorGain, fm.a - dist);
    return;
  }
  if (uLakeDebug > 4.5) {
    // Calibration (lab): the noise itself (check against Blender's values): fBm of all octaves, octave 0, octave 4.
    vec3 pb = vec3(vWorldPos.x, -vWorldPos.z, vWorldPos.y);
    bool fp = pb.y > 11.920909;
    vec3 co = fp ? vec3(pb.x, pb.y - 34.2286, 0.10754) : vec3(pb.x, pb.y, 0.0);
    float s = 0.0, a = 1.0, f = 3.0;
    for (int i = 0; i < 5; i++) {
      s += a * 0.982 * lkPerlin(co * f, fp);
      a *= 0.5;
      f *= 2.0;
    }
    gl_FragColor = vec4(0.5 * s / 1.9375 + 0.5, lkPerlin(co * 3.0, fp), lkPerlin(co * 48.0, fp), 1.0);
    return;
  }
  if (uLakeDebug > 2.5) {
    // Calibration (lab): the lake point (registration check against the Cycles cameras).
    gl_FragColor = vec4(vWorldPos.x, -vWorldPos.z, uLakeDebug > 3.5 ? lkSig.x : lkSig.y, 1.0);
    return;
  }
  if (uLakeDebug > 1.5) {
    // Calibration (lab): r = the coherent elevation offset of the reflected ray (deg), g = the incoherent elevation spread
    // (deg), b = the parallax search's lookup fraction.
    float de = degrees(asin(clamp(reflect(-V, lkN).y, -1.0, 1.0)) - asin(clamp(V.y, -1.0, 1.0)));
    gl_FragColor = vec4(de, degrees(2.0 * 0.07 * lkSig.y), lkS, 1.0);
    return;
  }
#else
  vec3 base = mirrorTex(muv + moffs, dFdx(muv) * kDof, dFdy(muv) * kDof, dist, V, vWorldPos) * uMirrorGain;
#ifdef LAKE_CORR
  base *= exp2(texture2D(uLakeCorr, clamp(vPlateClip.xy / vPlateClip.w * 0.5 + 0.5, vec2(0.0), vec2(1.0))).rgb - 0.5);
#endif
#endif
  // Calibration (lab): the raw reflection, scene-linear, as the Cycles plate's lake (read back from the HDR target).
  if (uLakeDebug > 0.5) {
    gl_FragColor = vec4(base, 1.0);
    return;
  }
  float occl = 0.0;
#else
#ifdef SHORE_AA
  // Hotfix 2: as below, with every switch a blend (see restLake). sW: the straight lookup's weight (the re-aimed lookup's
  // mirror point hidden from the projector, the lake point itself seen), anti-aliased over the pixel.
  vec4 pclip = vPlateClip;
  vec3 pw = vWorldPos;
  float occl = 0.0;
  float vis0 = 1.0;
  float camAway = distance(cameraPosition, uPlateCamPos);
  float sW = 0.0;
  if (uPlateDepthOn > 0.5 && camAway > 0.02) {
    pw = plateMirrorPoint(vWorldPos);
    pclip = uPlateViewProjF * vec4(pw, 1.0);
    vec2 ruv = pclip.xy / pclip.w * 0.5 + 0.5;
    float behind = -(uPlateView * vec4(pw, 1.0)).z - (plateDepthAt(clamp(ruv, vec2(0.0), vec2(1.0))) * 1.06 + 0.8);
    vis0 = 1.0 - smoothstep(0.0, 2.5, behind);
    occl = smoothstep(0.0, 2.5, behind) * smoothstep(1.0, 4.0, camAway);
    vec2 suv = vPlateClip.xy / vPlateClip.w * 0.5 + 0.5;
    float sBehind = -(uPlateView * vec4(vWorldPos, 1.0)).z - (plateDepthAt(clamp(suv, vec2(0.0), vec2(1.0))) * 1.06 + 0.8);
    sW = shoreAA(behind) * shoreAA(-sBehind);
  }
  float lodX = uDofBlur * smoothstep(0.0, mix(30.0, 10.0, uHold), abs(dist - uFocusDist)) + 1.6 * (1.0 - smoothstep(8.0 + 10.0 * uHold, 16.0 + 12.0 * uHold, dist));
  float raised = 0.0;
  float nofill = 0.0;
  vec2 puv = vec2(0.5);
  vec3 base = vec3(0.0);
  if (sW < 1.0) base = restLake(pw, pclip, offs, lodX, camAway, dist, raised, nofill, puv);
  if (sW > 0.0) {
    float rS;
    float nS;
    vec2 uS;
    vec3 bS = restLake(vWorldPos, vPlateClip, offs, lodX, camAway, dist, rS, nS, uS);
    base = mix(base, bS, sW);
    raised = mix(raised, rS, sW);
    nofill = mix(nofill, nS, sW);
    if (sW >= 0.5) {
      puv = uS;
      pclip = vPlateClip;
    }
    vis0 = mix(vis0, 1.0, sW);
  }
  vis0 *= 1.0 - raised;
#else
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
#endif
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
#ifdef SHORE_AA
${GLSL_WATER_PROJECTOR_BLEND_AA}
#else
${GLSL_WATER_PROJECTOR_BLEND}
#endif
    if (wsum > 1e-4) base = acc / wsum;
  }
#endif
#endif
#ifdef BAKED_MIRROR
  base = envChroma(base);
#else
  base = envChroma(base * uPlateGain);
#endif
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
#ifdef BAKED_MIRROR
  float plateW = 1.0;
#else
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
#ifdef LK_WAVEB
  k *= 1.0 - smoothstep(0.0, 1.0, uHold);   // in the hold the r12 water reflects through the crests' tilt itself (LK_WAVEB)
#endif
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
#ifdef ATMOS_LAKEBANK
  // Round 11 ATMOS fix round 2: the ground-mist bank runs on over the far lake (Atmos.ts GLSL_ATMOS_LAKE, via GLSL_PLATE_MIST and the
  // projector binding; off with ?atmosshore=0 / ?atmos=r10).
  base = atmosLakeBank(base, vWorldPos, uTime, uFogHold);
#endif

  // Live hero reflection (rendered from the mirrored camera). The reference lake is choppy where the
  // sculpture's image falls (F000), so it never reads as a clean arc: small moving facets break it into
  // glints and soft fragments.
  vec3 col = base;
  if (uReflectionOn > 0.5) {
    vec2 ruv = vMirrorClip.xy / vMirrorClip.w * 0.5 + 0.5;
#ifdef LAKE_R12
    // The hero's reflection through the same Cycles bump (no invented chop): the tilted ray's direction offset in the hero
    // mirror target (the camera's own frustum), scaled by the hero's parallax factor D / (t + D) (D: lake point to the orb),
    // plus the ring waves' bend.
    vec3 rT = reflect(-V, lkN);
    rT.y = max(rT.y, min(0.9 * V.y, 0.01));
    vec4 hc0 = uMirrorViewProj * vec4(-V.x, V.y, -V.z, 0.0);
    vec4 hc1 = uMirrorViewProj * vec4(rT, 0.0);
    float Dh = distance(vWorldPos, uOrbCenter);
    vec2 rOffs = (hc1.xy / max(hc1.w, 1e-4) - hc0.xy / max(hc0.w, 1e-4)) * 0.5 * (Dh / (dist + Dh)) + offsW * 1.6;
    vec4 refl = texture2D(uReflection, ruv + rOffs);
    float glint = 1.0;
#else
    // Broad, gentle chop (finer painted the horizon with streaks), fading out beyond 25-35 m (0.009 until QC round 7: the
    // near reflection stayed a smooth smear).
    vec4 chop = fbmd(vec3(vWorldPos.x * 1.3, vWorldPos.z * 2.0, uTime * 0.45), 2);
    float chopK = 1.0 - smoothstep(25.0, 35.0, dist);
    vec2 rOffs = offs * 1.6 + vec2(chop.y, -chop.w) * 0.014 * chopK;
    vec4 refl = texture2D(uReflection, ruv + rOffs);
    float glint = mix(1.0, smoothstep(0.1, 0.75, chop.x * 0.5 + 0.5), chopK);
#endif
    // Fresnel-weighted (a flat 0.3-0.6 mirrored the hero as strongly at the frame bottom, ~13 deg to the water, as mid-lake)
    // and hidden where the plate already reflects something nearer than the hero along this mirror ray (a rock or floe
    // a few metres off: the hero's image belongs behind it). QC round 7, T01.
    float Fw = 0.02 + 0.98 * pow(1.0 - saturate(dot(V, Nw)), 5.0);
    float w = uMirror * Fw * mix(0.55, 1.0, glint) * mix(1.0, 0.75, uHold);
#ifdef BAKED_MIRROR
    // The mirror path beyond the lake point to what the mirror shows there (the target's alpha is the whole path from the
    // mirrored camera; 60000 = sky).
    float Lb = textureLod(uEnvMirror, clamp(muv, vec2(0.0), vec2(1.0)), 0.0).a - dist;
#else
#ifdef SHORE_AA
    float Lb = shoreNearest(uPlateDepth, clamp(puv, vec2(0.0), vec2(1.0))).b;
#else
    float Lb = textureLod(uPlateDepth, clamp(puv, vec2(0.0), vec2(1.0)), 0.0).b;
#endif
#endif
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

#ifdef BAKED_EDGE
  // Round 11 fix round (baked environment): the view distance in alpha for EnvEdge (floe and rock silhouettes on the water).
  gl_FragColor = vec4(col, dist);
#else
  gl_FragColor = vec4(col, 1.0);
#endif
#ifdef AA_RESOLVE
  // aaresolve: below the horizon line the 4x resolve averages tone-compressed samples (chunks.ts GLSL_AA_RESOLVE).
  if (aaIn(gl_FragCoord.xy)) gl_FragColor.rgb = aaCompress(gl_FragColor.rgb);
#endif
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
  /** p4w4 G1 (`?w4tile=1` only): the water samples the chop tile (HeroEngine loads lake_chop.png, hands it over: setChopTile). */
  w4Chop = false;
  setChopTile(t: THREE.Texture) {
    const u = this.material.uniforms;
    if (!u.uLkW4Chop) return;
    (u.uLkW4Chop.value as THREE.Texture).dispose();
    u.uLkW4Chop.value = t;
    (u.uLkW4D.value as THREE.Vector4).w = 1;
  }

  constructor(
    plate: THREE.Texture,
    plateViewProj: THREE.Matrix4,
    plateGain: number,
    shared: SharedUniforms,
    envDefines: Record<string, string>,
    occlusion: PlateOcclusionUniforms,
    opts: {
      glitter?: boolean;
      /** The engine's debug option (HeroEngineOptions.debug): gates the water's lab URL params (AA5b's ffb*). */
      debug?: boolean;
      /** Hotfix 2 (smooth waterline): the plate lake's soft shore switches (SHORE_AA; with PlateEnvironment.depthLinear). */
      shore?: boolean;
      projectors?: ExtraProjectorBinding;
      /**
       * Round 11 (baked environment): the planar mirror replaces the plate: LakeMirror's target, its size in texels and its
       * per-frame lookup uniforms (uSkyEq, uEnvMirrorViewProj, uMirrorP; the sky pass's uMirrorInvViewProj, uMirrorCamPos).
       */
      mirror?: {
        texture: THREE.Texture;
        size: THREE.Vector2;
        uniforms: Record<string, { value: unknown }>;
        /** The static rest correction of the far water (assets lakeCorr), or null. */
        corr?: THREE.Texture | null;
        /**
         * Round 11 user-priority round (WATER lane): the Cycles water reproduced (GLSL_LAKE_R12): exact bump, parallax lookup.
         * False = the ENV lane's mirror model (`?envlake=mirror`).
         */
        r12?: boolean;
        /** Lake v4: the static max-mip heightfield of the baked meshes (LakeHeight), or null (v3's target march). */
        height?: { texture: THREE.Texture; grid: THREE.Vector4; top: number } | null;
      };
    } = {},
  ) {
    const defines: Record<string, string> = { ...envDefines, ...(opts.projectors?.defines ?? {}) };
    if (opts.glitter !== false) defines.WATER_GLITTER = "";
    if (opts.shore && !opts.mirror) defines.SHORE_AA = "";
    const mirrorUniforms: Record<string, { value: unknown }> = {};
    let walkHalf = false;
    // AA5b: the water's source (with the face-lookup guard when the r12 walk runs and `?ffblock` is not 0).
    let frag = WATER_FRAG;
    let lkCache = false;
    if (opts.mirror) {
      defines.BAKED_MIRROR = "";
      Object.assign(mirrorUniforms, opts.mirror.uniforms);
      mirrorUniforms.uEnvMirror = { value: opts.mirror.texture };
      mirrorUniforms.uEnvMirrorSize = { value: opts.mirror.size };
      // Fit at rest against the Cycles lake (WORK/LOG.md 2026-11-14 22:20-23:00: Blender diagnostic + readback + display
      // sweeps): weak near-field wavelets, the fine octaves' spread washing the far mountains' reflections out.
      mirrorUniforms.uLakeBump = { value: new THREE.Vector4(0.008, 2.0, 0.7, 1.4) };
      mirrorUniforms.uMirrorGain = { value: 1.03 };
      mirrorUniforms.uLakeFar = { value: new THREE.Vector3(0.05, 15, 45) };
      mirrorUniforms.uLakeDebug = { value: 0 };
      mirrorUniforms.uResolution = shared.uResolution;
      if (opts.mirror.r12) {
        defines.LAKE_R12 = "";
        // (Lab: `?lkv=2` = the earlier strata model, for A/B.)
        const lq = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;
        const lkv = lq?.get("lkv") ?? null;
        if (lkv === "2") defines.LK_V2 = "";
        // v4 (default): the first obstacle from the heightfield; `?lkv=3` keeps v3's target march.
        else if (opts.mirror.height && lkv !== "3") {
          defines.LK_HGT = "";
          // The walk runs at 1/16 of the pixels (walkDiv 4): it can follow the lifted rays across the whole grid (the floes,
          // the shore, the ridge and massif bases, the icebergs out to 300 m). From the mirror camera, 2-3 m under the water,
          // the horizon direction shows only sky up to ~300 m (its line of sight stays under the water plane that long), so
          // no target lookup can stand in for these hits (v4h, 60 m: the near-left water 20-28 % under Cycles).
          defines.LK_WALK_N = String(Math.round(Number(lq?.get("lkwalk"))) || 160);
          defines.LK_DMAX = (Number(lq?.get("lkdmax")) || 320).toFixed(1);
          defines.LK_HAZ = lq?.get("lkhaz") === "0" ? "0" : "1";
          defines.LK_STRATA = lq?.get("lkstrata") === "2" ? "2" : "3";
          defines.LK_GAIN = (Number(lq?.get("lkgain")) || 1.12).toFixed(3);
          // (lab, fix round 2: the lake's DOF term x `?lkdofk=<k>`; 1 = as the environment's)
          defines.LK_DOFK = (Number(lq?.get("lkdofk") ?? 1) >= 0 ? Number(lq?.get("lkdofk") ?? 1) : 1).toFixed(3);
          // Resume 7: the walk's face colour no lower than 5 cm above the water (`?lkhmin=0`: as resume 6; `?lkhmin=<m>`: lab;
          // off with `?lkperf=0`, which keeps lake v4 as it was before resume 5).
          if (lq?.get("lkhmin") !== "0" && lq?.get("lkperf") !== "0") defines.LK_HMIN = (Number(lq?.get("lkhmin")) || 0.05).toFixed(3);
          // Fix round 1 (judge1 FAIL): `?lkfix1=0` = this lane as judged (also off with `?lkperf=0`); each part alone: `?lkwave=0`
          // (the hold's Wave-modifier tilt), `?lkskyup=0` (rays over the target's top see the sky), `?lkwedge=0` (own walk next to
          // a footprint), `?lkmist=0` (assets.ts: the world-only lake sky). Lab: `?lkfar=1` (the strata looked up where they end:
          // rejected, |log| vs Cycles 0.264 -> 0.294 and a bright fan at the far right), `?lkwpx=1` (the walk's share per pixel).
          const fix1 = lq?.get("lkfix1") !== "0" && lq?.get("lkperf") !== "0";
          if (lq?.get("lkfar") === "1") defines.LK_STRATAFAR = "";
          if (lq?.get("lkwpx") === "1") defines.LK_WALKPX = "";
          if (fix1 && lq?.get("lkwave") !== "0") defines.LK_WAVEB = "";
          if (fix1 && lq?.get("lkskyup") !== "0") defines.LK_SKYUP = "";
          if (fix1 && lq?.get("lkwedge") !== "0") defines.LK_WALKEDGE = "";
          // (frame budget: octaves under 10 % coherent share are not evaluated; `?lkbcut=<share>` lab, `?lkbcut=0` off)
          // (Fix round 2 resume tried 0.4: raw |log| vs Cycles a hair better and the rest metrics unchanged, but in the hold the
          // cut octaves' wavelets had masked flat, stair-edged patches of the mid water: WORK fx2/H25_refl.png. Kept at 0.1.)
          if (fix1 && lq?.get("lkbcut") !== "0") defines.LK_BUMPCUT = (Number(lq?.get("lkbcut")) || 0.1).toFixed(3);
          // Fix round 2 (after judge 2's notes): `?lkfix2=0` = the lane as left by fix round 1; each part alone: `?lkstale=0` (the
          // marches in a target drawn on an earlier frame).
          const fix2 = fix1 && lq?.get("lkfix2") !== "0";
          if (fix2 && lq?.get("lkstale") !== "0") defines.LK_STALEFIX = "";
          // (frame budget: the bump's per-axis cut, needs LK_BUMPCUT; `?lkbaxis=0` off)
          if (fix2 && defines.LK_BUMPCUT !== undefined && lq?.get("lkbaxis") !== "0") defines.LK_BUMPAXIS = "";
          // (the walk per pixel along every footprint's edge; `?lkwnear=0` off; needs LK_WALKSEL + LK_WALKEDGE)
          if (fix2 && lq?.get("lkwnear") !== "0" && lq?.get("lkwsel") !== "0" && lq?.get("lkwedge") !== "0") defines.LK_WALKNEAR = "";
          // (`?lkwave2=0`: the hold's crests as fix round 1 left them: 8-step march, down rays lifted, the quarter-size walk)
          if (fix2 && defines.LK_WAVEB !== undefined && lq?.get("lkwave2") !== "0") {
            defines.LK_WAVE2 = "";
            // (the march's step count: 12 (fix round 2 resume; the hold's crest silhouettes move <= 1-2 px against 24 steps and
            // stay continuous, WORK fx2/H2; the dolly frame ~3 % cheaper); lab `?lkw2n=N`, 24 = fix round 2 as first written)
            const w2n = Math.round(Number(lq?.get("lkw2n")));
            defines.LK_WAVE2_N = String(w2n >= 4 && w2n <= 48 ? w2n : 12);
            // (lab `?lkwavew=0`: the 24-step march and the down-ray mirror without the per-pixel walk on the tilted water)
            if (lq?.get("lkwavew") !== "0") defines.LK_WAVEW = "";
          }
          // (frame budget at rest / in the hold: the cached path skips the bump and the walk read; `?lkcachen=0` off)
          this.cacheN = fix1 && lq?.get("lkcachen") !== "0";
          // AA5b (the far-floe pale block, LK_FFB_GLSL): `?ffblock=0` = AA3 exactly (same source); lab (the engine's debug option,
          // like every other lab param; AA8, perf judge P-4: it was the URL's `?debug`, which the product page honoured) `ffb=<texels>`.
          if (lq?.get("ffblock") !== "0") {
            frag = waterFragFF(WATER_FRAG);
            const fb = opts.debug && lq && lq.get("ffb") !== null ? Number(lq.get("ffb")) : NaN;
            defines.LK_FFB = (fb >= 0 && fb <= 4 ? fb : 1).toFixed(3);
            const ft = opts.debug && lq && lq.get("ffbt") !== null ? Number(lq.get("ffbt")) : NaN;
            defines.LK_FFBT = (ft > 0 && ft <= 10 ? ft : 0.3).toFixed(3);
            // AA6 fix (R-1 / R-2): the replaced row's depth range behind the front row (m) and its luma margin over it; lab
            // (debug) `ffbd0=<m>&ffbd1=<m>&ffbl=<luma>`.
            const lab = (k: string, lo: number, hi: number, d: number) => {
              const v = opts.debug && lq && lq.get(k) !== null ? Number(lq.get(k)) : NaN;
              return (v >= lo && v <= hi ? v : d).toFixed(3);
            };
            defines.LK_FFBD0 = lab("ffbd0", 0, 50, 8);
            defines.LK_FFBD1 = Math.max(Number(lab("ffbd1", 0.01, 100, 16)), Number(defines.LK_FFBD0) + 0.01).toFixed(3);
            defines.LK_FFBL = lab("ffbl", 0.001, 1, 0.05);
            // (lab, G7: (debug) `ffbtoggle=1` = a run-time switch uLkFfbOn for one-session A/B timing; not in the product source)
            if (opts.debug && lq && lq.get("ffbtoggle") === "1") {
              defines.LK_FFB_TOG = "";
              frag = "uniform float uLkFfbOn;\n" + frag;
              mirrorUniforms.uLkFfbOn = { value: 1 };
            }
          }
          mirrorUniforms.uLkHgt = { value: opts.mirror.height.texture };
          mirrorUniforms.uLkHgtG = { value: opts.mirror.height.grid };
          mirrorUniforms.uLkHgtTop = { value: opts.mirror.height.top };
          // The walk term at half resolution, redrawn only when the camera moved (renderWalk); `?lkhalf=0` = per pixel.
          if (lq?.get("lkhalf") !== "0") {
            walkHalf = true;
            defines.LK_HALF = "";
            mirrorUniforms.uLkWalk = { value: null };
            mirrorUniforms.uLkWalkInv = { value: new THREE.Vector2(1, 1) };
            // Frame budget (LakeSchedule, default; `?lkperf=0` = lake v4 before it, exactly): the water reads the walk at the
            // lake point's place in the walk's own frame (so the walk may be drawn on another frame than the mirror, and a
            // turning camera needs no new walk), and the reflection term is cached while the camera stands still
            // (renderCache; lab `?lkcache=0`: computed every frame).
            if (lq?.get("lkperf") !== "0") {
              this.scheduled = true;
              defines.LK_WALKREPROJ = "";
              // Resume 7: the walk filtered from visible lake points only (`?lkwsel=0`: plain bilinear).
              if (lq?.get("lkwsel") !== "0") defines.LK_WALKSEL = "";
              mirrorUniforms.uLkWalkVP = { value: new THREE.Matrix4() };
              if (lq?.get("lkcache") !== "0") {
                lkCache = true;
                defines.LK_CACHE = "";
                mirrorUniforms.uLkCache = { value: null };
                if (this.cacheN) {
                  // Fix round 1: the cached path also skips the bump; its coherent normal has its own cache (LK_CACHENPASS).
                  defines.LK_CACHEN = "";
                  mirrorUniforms.uLkCacheN = { value: null };
                }
                mirrorUniforms.uLkCacheOn = { value: 0 };
                mirrorUniforms.uLkZero = { value: new THREE.Vector2(0, 0) };
              }
            }
          }
        }
        // P4 water (`?p4water=0` = MAIN exactly: no text, no define, no uniform; per task `?lkchop=0`, `?lkring=r11` off; Q9 only
        // with `?lkglass=1`, G6 only with `?lkwalkj=1`). The knobs are live uniforms (lab: __hero.water.material.uniforms.uLkP4*), shared by the walk /
        // cache passes.
        const p4 = p4WaterTasks(lq);
        if (p4.g2) {
          frag = p4Apply(frag, P4_G2, "G2");
          defines.LK_P4FP = "1.500";
          // chop: slope per unit noise gradient (octave 1, 2), fade-out band from the camera (m); frequencies (1/m), drift (m/s)
          mirrorUniforms.uLkP4C = { value: new THREE.Vector4(0.85, 0.36, 19.0, 26.0) };
          mirrorUniforms.uLkP4K = { value: 0.0 };
          mirrorUniforms.uLkP4CF = { value: new THREE.Vector4(0.3, 0.65, 0.35, 0.6) };
          // fix (judge W3 / W4 / W5): band limit 0.1-0.25 (was 0.2-0.45), no third octave (was 0.42), slope soft limit; the chop's
          // AA (its slope change per px) and the onset feather (m)
          mirrorUniforms.uLkP4B = { value: new THREE.Vector4(0.1, 0.25, 0.0, 0.3) };
          mirrorUniforms.uLkP4D = { value: new THREE.Vector4(0.07, 2.0, 0, 0) };
          // the train: phase (m), amplitude share, noise frequency (1/m); the specular AA's share of the tilt's change per pixel
          mirrorUniforms.uLkP4W = { value: new THREE.Vector4(0.25, 0.25, 0.33, 0.3) };
          // the tilted reflection's floor (x the flat water's elevation)
          mirrorUniforms.uLkP4E = { value: 1.0 };
        }
        if (p4.q8) {
          frag = p4Apply(frag, P4_Q8, "Q8");
          // (lab, with the engine's debug option: `lkringq=<Q>` the profile's steepening)
          const rq = opts.debug && lq && lq.get("lkringq") !== null ? Number(lq.get("lkringq")) : NaN;
          mirrorUniforms.uLkP4R = { value: new THREE.Vector4(rq >= -0.9 && rq <= 0.9 ? rq : -0.35, 0.3, 0.48, 0.55) };
          // the glint: GGX alpha across / along the view, cyan-white share, gain. Fix (judge W1): the builder's anisotropic lobe
          // (0.16 x 0.078) spread MAIN's glint (alpha 0.0784 = ggxSpec's 0.28^2) sideways and its tint lost 8 % luma: the near
          // glint was dimmer than MAIN (centre column x680-760 y640-700, frozen same-time A/B: MAIN 192.0, builder 188.4, F000 200.3).
          // Now MAIN's isotropic lobe, a cyan-white of MAIN's luma, x1.3: 196.5 (glint box x515-865 y665-710 190.7, F000 190.5).
          mirrorUniforms.uLkP4G = { value: new THREE.Vector4(0.0784, 0.0784, 0.6, 1.3) };
        }
        if (p4.g6 && walkHalfWanted(lq)) {
          frag = p4Apply(frag, P4_G6, "G6");
          // the taps' spread band, and the distance band (m) it fades in over (the far water: the near water's own walk is costly)
          mirrorUniforms.uLkP4WJ = { value: new THREE.Vector4(0.01, 0.04, 30.0, 40.0) };
        }
        if (p4.q9) {
          frag = p4Apply(frag, P4_Q9, "Q9");
          // (lab, with the engine's debug option: `lkglassg=<a>,<b>` the guard's band)
          const gg = opts.debug && lq?.get("lkglassg") ? (lq.get("lkglassg") as string).split(",").map(Number) : [];
          // (distance band 30-40 m: with 24-34 m the near far floes' waterlines at ~33 m got two new 6 px pops, fast / leave paths)
          mirrorUniforms.uLkP4Gl = { value: gg.length === 2 && gg[0] >= 0 && gg[1] > gg[0] ? new THREE.Vector4(gg[0], gg[1], 30, 40) : new THREE.Vector4(0.15, 0.45, 30, 40) };
          // fix W2: the guard steps back where the quarter-size walk's taps disagree (band of their spread; z 1 on)
          // (lab `?lkglassj=0`: off, the builder's Q9)
          mirrorUniforms.uLkP4GJ = { value: new THREE.Vector4(0.01, 0.04, lq?.get("lkglassj") === "0" ? 0 : 1, 0) };
        }
        // p4w4 (round 4; `?p4w4=0` = int2 exactly). G1 rides on P4 water G2's chop (its region, dolly weight and distance fade).
        const w4 = p4w4Tasks(lq);
        if ((w4.g1 && p4.g2) || w4.guard) {
          frag = p4Apply(frag, W4_BAND, "W4-BAND");
          mirrorUniforms.uLkW4H = { value: new THREE.Vector2(0.92, 1.0) };
        }
        if (w4.g1 && p4.g2) {
          frag = p4Apply(frag, W4_G1, "W4-G1");
          // a flat stand-in (code 128 = slope 0) until HeroEngine hands over the tile (uLkW4D.w 0: no chop until then)
          const flat = new THREE.DataTexture(new Uint8Array([128, 128, 0, 255]), 1, 1);
          flat.needsUpdate = true;
          mirrorUniforms.uLkW4Chop = { value: flat };
          // tile A 10 m along the wind, tile B 6.6 m turned 37 deg (no common period), slope at code 1, B's share
          mirrorUniforms.uLkW4C = { value: new THREE.Vector4(10.0, 6.6, 0.5, 0.6) };
          // drift A / B (m/s), the averaged-away variance's share in the spread, loaded
          mirrorUniforms.uLkW4D = { value: new THREE.Vector4(0.35, -0.5, 1.0, 0.0) };
          // the plan's soft limit for the textured chop (int2 0.3: the steepest tilts flattened into one colour)
          (mirrorUniforms.uLkP4B.value as THREE.Vector4).w = 0.45;
          // fix W4J-2: the tile only with `?w4tile=1`. By default no tile is fetched, so uLkW4D.w stays 0 and lkChop returns 0
          // at its first line: no chop in the dolly AND in the settled hold. The tile's crests turned the reflected rays'
          // elevation across the strata's floe silhouettes (a binary hit / miss per pixel): 1-px dashes that crawled with a
          // sideways cursor (judge holdptr path 1: strip flick4 0.570 -> 0.713 %, block x1080-1200 y733-766 0.78 -> 2.35 %);
          // a LOD bias (x2.83: 0.629 / 1.93), the W3 damping (0.02: 0.663 / 2.13) or amplitude 0.3 (0.626 / 1.95) did not
          // remove it; amplitude 0: 0.500 / 1.16, vertical path 0.602 -> 0.460 % (WORK/LOG.md fix round).
          this.w4Chop = w4.tile;
        }
        if (w4.guard) {
          frag = p4Apply(frag, p4.g2 ? W4_GUARD : W4_GUARD.slice(0, 2), "W4-GUARD");
          // the footprint band (lattice cells; Q9's 0.15-0.45) and the distance it fades out over (m): the hold's bottom strip
          // only (fix W4J-1: 20-25 m, was 30-40 m; the hold camera sees y700-766 at 17-25.5 m, y615-700 at 25-55 m: there the
          // glassier water unmasked the quarter-size walk's blocks as pale plateaus, the orbit-ghost mechanism; WORK/LOG.md)
          mirrorUniforms.uLkW4G = { value: new THREE.Vector4(0.15, 0.45, 20.0, 25.0) };
          // P4 water G2 (6)'s specular AA share in the settled hold stays int2's 0.3 (fix W4J-2: the builder's 1.0 widened the
          // spread there, which with the chop softened the patch outlines, p06 / pop B treads 169 / 251 -> 141 / 174; without
          // the chop it is statically neutral, treads within +-8 % at 8 hold poses, but it doubled the sideways-cursor crawl at
          // the bottom right, block x1080-1200 y733-766 0.58 -> 1.16 %, MAIN 0.78). The share stays a live knob (uLkP4W.w).
        }
        // P4 priority round 2, explorer rxa (`?p4rxa=0` = int3 exactly: no text, no uniform). Needs Q8's ring text.
        if (p4.q8 && p4rxaOn(lq)) {
          frag = p4Apply(frag, P4_RXA, "RXA");
          const rx = (name: string, d: number[]) => {
            const q = opts.debug && lq?.get(name) ? (lq.get(name) as string).split(",").map(Number) : [];
            return new THREE.Vector4().fromArray(q.length === 4 && q.every(Number.isFinite) ? q : d);
          };
          // ring: amplitude 0.22 m (MAIN 0.26 at 4.2 m: slope amplitude 0.214 -> 0.28) at the Wave modifier's 2.717 m; the lane's water
          // fades in from 15.5 to 17.5 m from the camera (nearer, i.e. below screen row ~700 at rest: int3's water, uRxaE.w, so the
          // bottom rocks' top edge and the water seen just above it keep int3's waterline AA); front 5.8 m with a 1.4 m feather, 80 % of
          // MAIN's radial decay removed. (Amplitude 0.24 / front 6.2 m, or a bump share of 0.8, added new waterline pops at the left
          // slab and the right floe: lab knobs only.)
          // fixer: the shading ring is int3's ring x1.3, half of its radial decay removed (judge J-RXA-2: no second ring field)
          mirrorUniforms.uRxaW = { value: rx("rxaw", [1.3, 0.5, 15.5, 17.5]) };
          // (E.w the near water: 1 = int3's water there, 0 = calm water: calm left two fast-path pop clusters above the bottom-left rocks)
          mirrorUniforms.uRxaE = { value: rx("rxae", [5.8, 1.4, 0.8, 1]) };
          // colour: luma x1.5 (soft knee to -0.6 / +0.55), the sky's hue x1.8 on the troughs (fading in over k 0..-0.25: no hard
          // band edge), 30 % of MAIN's fixed tint
          mirrorUniforms.uRxaS = { value: rx("rxas", [1.5, 1.8, 0.3, 0.25]) };
          // texture: half the bump's coherent tilt in the shading normal; lookup roughness 0.18 (MAIN 0.2); no far-flank lift
          // (fixer: z 1 = the far flank keeps int3's darkening and tint, judge J-RXA-4)
          mirrorUniforms.uRxaT = { value: rx("rxat", [0.5, 0.18, 1, 0]) };
          // glint: alpha 0.07 across x 0.4 along, gain 14, ring share 1, the bump's tilt x3 (granular), light 1.8 m under the
          // orb centre; cyan-white (0.3, 0.8, 1.0) under a soft maximum of 5
          mirrorUniforms.uRxaG = { value: rx("rxag", [0.07, 14, 1.0, 3.0]) };
          mirrorUniforms.uRxaH = { value: rx("rxah", [0.05, 0.05, 0.4, 1.8]) };
          mirrorUniforms.uRxaC = { value: rx("rxac", [0.3, 0.8, 1.0, 5.0]) };
          // waterline calm: taps 2.5 m out (1.4 m left the right slab feet's crawl at +33..+75 %: a reflection edge lies metres in
          // front of its slab); the lane's ring, bump and glint fade out as 0-25 % of the 9 taps land on a face (`rxaq=0,0,0,0` off);
          // the lane's glint fades in over 14-16 m from the camera
          // (fixer, judge J-RXA-3: continuous; level 3 = 2.5 m blocks, the lane hands back to int3's water over face measure 0..0.4:
          // 0.1..0.6 left the slow path's right-slab crawl at +14.5 %, 83 -> 95 events; 0..0.4: +7 %)
          mirrorUniforms.uRxaQ = { value: rx("rxaq", [3, 0.0, 0.4, 16.0]) };
          // the lane ring's profile Q -0.15 (int3 -0.35: broader bands), the troughs' soft knee to -0.6 (int3: a clamp at -0.48); the
          // lane is out by uHold 0.06 (p04-p07 are int3's water; p08 uHold 0.048 ~10 %); w 1: int3's Q8 lobe on the near water
          // (fixer: z 1, the lane's colour fades out over the hold as int3's own ring shading, smoothstep(0, 1, uHold); x unused)
          mirrorUniforms.uRxaR = { value: rx("rxar", [0, 0.6, 1, 1]) };
        }
        // p4wl (22 Nov, client: "masih ada flicker juga di desktop" + flicker tulil.mov): ROOT CAUSE of the waterline flicker while
        // the camera moves = the quarter-size walk (LK_HALF, walkDiv 4). The walk term depends on the pixel's own bumped reflection
        // (its coherent elevation and azimuth) and on the heightfield cell the low rays enter, i.e. it varies per pixel; the quarter
        // pass point-samples it at 1 / 16 of the pixels and the water interpolates those texels, so every camera step moves the
        // texel grid over new lake points and the faces' reflections (the left shelf / floe feet, x 0-420 at 1512 x 860) come out
        // as 4 x 4 px blocks that change shape every frame (T2 stepped capture: lane_backup/p4wl/p4wl/st_sel.png; ?lkhalf=0 has no
        // blocks). Fix at the source (P4WL_WALK): the water walks at its own pixel, in the moving frames and in the rest cache alike,
        // and the quarter pass is not drawn (renderWalk returns). `?p4wl=0` = MAIN exactly (no text change, the quarter pass as before).
        // That per-pixel walk costs +8.7 % of the T1 sweep frame and adds pixel speckle (judge WL-J3): opt-in `?wlwalk=px`.
        // The DEFAULT (fixer, judge WL-J1 / J3 / J4) is the band-limited quarter walk P4WL_BAND on every tier with the quarter
        // walk (T1, T2): the quarter pass stores the faces' colour and horizon (LK_WALKPX, walked along the unbumped reflection),
        // the water takes its own rays' share under each tap's horizon. `?wlwalk=q` = MAIN's quarter read.
        const wlw = lq?.get("wlwalk");
        if (p4wlOn(lq) && defines.LK_CACHEN !== undefined && defines.LK_HALF !== undefined && wlw === "px") {
          frag = p4Apply(frag, P4WL_WALK, "WL");
          this.walkPerPixel = true;
        } else if (p4wlOn(lq) && defines.LK_CACHEN !== undefined && defines.LK_HALF !== undefined && defines.LK_WALKSEL !== undefined && wlw !== "q") {
          defines.LK_WALKPX = "";
          frag = p4Apply(frag, P4WL_BAND, "WLB");
          // wl2g: the band walk's texels anchored in lake space (renderWalkAnchored); `?wl2g=0` = p4wl exactly.
          if (wl2gOn(lq)) {
            this.walkAnchored = true;
            // (WL2G_READ is opt-in, `?wl2gread=1`: same contour stability as P4WL_BAND's per-tap read on the anchored lake-fixed
            // taps (WORK st/s3_zoom.png), but a little more 60 fps sparkle at rest: shelf water 0.2 -> 0.4, lips 1.1 -> 1.3 blips / frame)
            if (lq?.get("wl2gread") === "1") frag = p4Apply(frag, WL2G_READ, "WL2G");
            // wl2 fixer (WL2-FJ1): the share from the band-limited bump (wl2fjEdits); `?wl2fj=0` = before the fix
            if (lq?.get("wl2fj") !== "0") {
              const qq = Number(lq?.get("wl2fjq"));
              const sq2 = Number(lq?.get("wl2fjs"));
              // wl3a (S): the share's spread is the pixel's own (= `?wl2fjs=0`); `?wl3a=0` / `?wl3as=0` keep WL2FJ_S
              const w3 = wl3aOn(lq);
              const s3 = w3 && lq?.get("wl3as") !== "0" ? 0 : WL2FJ_S;
              frag = p4Apply(frag, wl2fjEdits(qq >= 1 && qq <= 16 ? qq : WL2FJ_Q, lq?.get("wl2fjs") != null && sq2 >= 0 && sq2 <= 1 ? sq2 : s3), "WL2FJ");
              if (w3) {
                frag = p4Apply(frag, wl3aReadEdits(lq), "WL3A");
                this.wl3aWalk = lq?.get("wl3aw") !== "0";
                this.wl3aCap = lq?.get("wl3c") !== "0";
                const cg = Number(lq?.get("wl3cg"));
                if (lq?.get("wl3cg") != null && cg >= 0 && cg <= 0.01) this.wl3aCapG = cg;
              }
            }
            const gq = Number(lq?.get("wl2gg"));
            if (gq >= 1 && gq <= 2) this.walkGuard = gq;
            const tq = Number(lq?.get("wl2gt"));
            if (tq >= 0.5 && tq <= 4) this.walkTol = tq;
            const sq = Number(lq?.get("wl2gs"));
            if (sq >= 0.5 && sq <= 2) this.walkOver = sq;
            const aq = Number(lq?.get("wl2gaz"));
            if (aq > 0 && aq <= 0.1) this.walkAz = aq;
          }
        }
        // (No far-water rest correction: it was a fit of the ENV lane's model to the plate.)
      } else if (opts.mirror.corr) {
        defines.LAKE_CORR = "";
        mirrorUniforms.uLakeCorr = { value: opts.mirror.corr };
      }
    }
    this.material = new THREE.ShaderMaterial({
      name: "rx-water",
      vertexShader: WATER_VERT,
      fragmentShader: frag,
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
        ...mirrorUniforms,
        // Hotfix 2: the raised test's far fade (m from the projector; Water SHORE_AA only).
        uShoreFar: { value: new THREE.Vector2(120, 180) },
      },
    });
    const near = new THREE.Mesh(quad(WATER.near.min, WATER.near.max, WATER.level, 1), this.material);
    // The Blender planes overlap by ~3 m; trim the far one so they never z-fight.
    const farMax: THREE.Vector3Tuple = [WATER.far.max[0], WATER.far.max[1], Math.min(WATER.far.max[2], WATER.near.min[2])];
    const far = new THREE.Mesh(quad(WATER.far.min, farMax, WATER.far.min[1], 1), this.material);
    near.name = "water-near";
    far.name = "water-far";
    this.group.add(near, far);
    // The r12 lake is drawn after the environment's opaque meshes in the same pass (same image: opaque, depth-tested): the
    // lake under the near rocks and floes is then rejected by the depth test before its shader runs (the plate lake keeps
    // the default order; `?lkorder=0` restores it for r12).
    if (opts.mirror?.r12 && (typeof location === "undefined" || new URLSearchParams(location.search).get("lkorder") !== "0")) {
      near.renderOrder = 1;
      far.renderOrder = 1;
    }
    if (walkHalf) {
      const wq = typeof location !== "undefined" ? Number(new URLSearchParams(location.search).get("lkwdiv")) : 0;
      if (wq >= 1 && wq <= 8) this.walkDiv = wq;
      const wd: Record<string, string> = { ...defines, LK_WALKPASS: "" };
      // wl2g: the walk pass's azimuth lattice (wl2gWalkFrag; `?wl2gaz=0` keeps build 1's single walk at the view's azimuth)
      const wlAz = this.walkAnchored && (typeof location === "undefined" || new URLSearchParams(location.search).get("wl2gaz") !== "0");
      if (wlAz) wd.WL2G_AZ = this.walkAz.toFixed(6);
      delete (wd as Record<string, string>).LK_HALF;
      delete (wd as Record<string, string>).LK_CACHE;
      // wl2g: the anchor view-projection the walk pass rasterises the lake with (the water itself does not declare it).
      if (this.walkAnchored) this.material.uniforms.uLkWalkAP = { value: new THREE.Matrix4() };
      // Same uniforms object: every per-frame value the water gets, the walk pass gets.
      this.walkMaterial = new THREE.ShaderMaterial({
        name: "rx-water-walk",
        vertexShader: this.walkAnchored ? wl2gWalkVert(WATER_VERT) : WATER_VERT,
        fragmentShader: this.wl3aWalk ? wl3aWalkFrag(wlAz ? wl2gWalkFrag(frag) : frag, this.wl3aCap, this.wl3aCapG) : wlAz ? wl2gWalkFrag(frag) : frag,
        defines: wd,
        uniforms: this.material.uniforms,
        depthTest: false,
        depthWrite: false,
      });
      this.walkTarget = new THREE.WebGLRenderTarget(2, 2, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        depthBuffer: false,
        generateMipmaps: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        colorSpace: THREE.LinearSRGBColorSpace,
      });
      this.material.uniforms.uLkWalk.value = this.walkTarget.texture;
      this.walkScene = new THREE.Scene();
      for (const m of [near, far]) {
        const w = new THREE.Mesh(m.geometry, this.walkMaterial);
        w.frustumCulled = false;
        this.walkScene.add(w);
      }
      if (lkCache) {
        // The cache pass: the same shader up to the reflection term (LK_CACHEPASS), full resolution, same uniforms.
        const cd = { ...defines, LK_CACHEPASS: "" };
        delete (cd as Record<string, string>).LK_CACHE;
        this.cacheMaterial = new THREE.ShaderMaterial({
          name: "rx-water-cache",
          vertexShader: WATER_VERT,
          fragmentShader: frag,
          defines: cd,
          uniforms: this.material.uniforms,
          depthTest: false,
          depthWrite: false,
        });
        // Full float: a half-float cache rounded the term once more than the computed path (1-ulp differences in ~10 % of the
        // lake pixels after the later shading). Float targets are renderable wherever the heightfield (LakeHeight) is.
        this.cacheTarget = new THREE.WebGLRenderTarget(2, 2, {
          type: THREE.FloatType,
          format: THREE.RGBAFormat,
          depthBuffer: false,
          generateMipmaps: false,
          minFilter: THREE.NearestFilter,
          magFilter: THREE.NearestFilter,
          colorSpace: THREE.LinearSRGBColorSpace,
        });
        this.material.uniforms.uLkCache.value = this.cacheTarget.texture;
        this.cacheScene = new THREE.Scene();
        for (const m of [near, far]) {
          const c = new THREE.Mesh(m.geometry, this.cacheMaterial);
          c.frustumCulled = false;
          this.cacheScene.add(c);
        }
        if (this.cacheN) {
          const nd = { ...defines, LK_CACHENPASS: "" };
          delete (nd as Record<string, string>).LK_CACHE;
          this.cacheNMaterial = new THREE.ShaderMaterial({
            name: "rx-water-cache-n",
            vertexShader: WATER_VERT,
            fragmentShader: frag,
            defines: nd,
            uniforms: this.material.uniforms,
            depthTest: false,
            depthWrite: false,
          });
          this.cacheNTarget = new THREE.WebGLRenderTarget(2, 2, {
            type: THREE.HalfFloatType,
            format: THREE.RGBAFormat,
            depthBuffer: false,
            generateMipmaps: false,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            colorSpace: THREE.LinearSRGBColorSpace,
          });
          this.material.uniforms.uLkCacheN.value = this.cacheNTarget.texture;
          this.cacheNScene = new THREE.Scene();
          for (const m of [near, far]) {
            const c = new THREE.Mesh(m.geometry, this.cacheNMaterial);
            c.frustumCulled = false;
            this.cacheNScene.add(c);
          }
        }
      }
    }
  }

  /** Fix round 1 (LK_CACHEN): the cached path skips the bump; the bump's normal is cached by a second pass. */
  private cacheN = false;
  private cacheNMaterial?: THREE.ShaderMaterial;
  private cacheNTarget?: THREE.WebGLRenderTarget;
  private cacheNScene?: THREE.Scene;
  /** Frame budget (LK_CACHE): the reflection term cached while the camera stands still, its target and scene. */
  private cacheMaterial?: THREE.ShaderMaterial;
  private cacheTarget?: THREE.WebGLRenderTarget;
  private cacheScene?: THREE.Scene;

  /**
   * Lake v4 frame budget on (LK_WALKREPROJ, `?lkperf` not 0): the engine's LakeSchedule decides when the mirror, the walk
   * and the cache are drawn.
   */
  scheduled = false;

  /** True when the reflection term can be cached (r12 v4 with the walk pass, `?lkcache` not 0). */
  get hasCache() {
    return !!this.cacheTarget;
  }

  /**
   * Draws the reflection term (without the ring waves' bend) for the frame's camera into the cache (LakeSchedule: once the
   * camera stands still, again after it drifted ~0.1 px, the DOF inputs changed or the mirror was redrawn).
   */
  renderCache(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    if (!this.cacheTarget || !this.cacheScene) return;
    const prev = renderer.getRenderTarget();
    const prevAuto = renderer.autoClear;
    renderer.getClearColor(this.walkPrevClear);
    const prevAlpha = renderer.getClearAlpha();
    renderer.autoClear = false;
    renderer.setRenderTarget(this.cacheTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
    renderer.render(this.cacheScene, camera);
    if (this.cacheNTarget && this.cacheNScene) {
      renderer.setRenderTarget(this.cacheNTarget);
      renderer.clear(true, false, false);
      renderer.render(this.cacheNScene, camera);
    }
    renderer.setRenderTarget(prev);
    renderer.setClearColor(this.walkPrevClear, prevAlpha);
    renderer.autoClear = prevAuto;
  }

  /** The water reads the cache this frame (true) or computes the term (false). */
  setCacheOn(on: boolean) {
    const u = this.material.uniforms.uLkCacheOn;
    if (u) u.value = on ? 1 : 0;
  }

  /** Lake v4 (LK_HALF): the half-resolution walk term's own target and scene. */
  private walkMaterial?: THREE.ShaderMaterial;
  private walkTarget?: THREE.WebGLRenderTarget;
  private walkScene?: THREE.Scene;
  private walkPrevClear = new THREE.Color();

  /**
   * Walk target size divisor: a quarter of the main target's size (rb/v4q4 vs per-pixel and half: the same columns at rest
   * and in the hold; lab `?lkwdiv=`).
   */
  walkDiv = 4;
  /** p4wl: the water walks per pixel; the quarter-size walk pass is not drawn. */
  walkPerPixel = false;
  /** wl2g: the walk pass rasterises the lake through a fixed anchor (lake-space texels); its guard and scale tolerance. */
  walkAnchored = false;
  /** wl3a (W): the walk pass records every face above its horizon ray (wl3aWalkFrag). */
  wl3aWalk = false;
  /** wl3c: (W)'s 4-face cap counts only the faces whose wl2-rule share exceeds wl3aCapG (wl3aWalkFrag). */
  wl3aCap = false;
  wl3aCapG = WL3C_G;
  walkGuard = WL2G_GUARD;
  walkTol = WL2G_TOL;
  walkOver = WL2G_OVER;
  walkAz = WL2G_AZ;
  /** wl2g: the anchor (valid until the frame's lake leaves it), how many times it was taken (lab), the main target's size. */
  private wlAnchorOk = false;
  wlAnchors = 0;
  private wlMain = new THREE.Vector2(1, 1);
  private wlAP = new THREE.Matrix4();
  private wlCur = new THREE.Matrix4();
  private wlV = new THREE.Vector3();
  private wlX = new THREE.Vector4();
  private wlC = new THREE.Vector4();

  /** The main HDR target's size (px): the walk target is 1 / walkDiv of it. */
  setWalkSize(width: number, height: number) {
    if (!this.walkTarget) return;
    const k = this.walkDiv;
    if (this.walkAnchored) {
      // wl2g: the anchor's frustum is the guard wider, its target the guard larger (the quarter texel at the anchor's pose).
      const g = this.walkGuard * this.walkOver;
      this.walkTarget.setSize(Math.max(1, Math.ceil((width / k) * g)), Math.max(1, Math.ceil((height / k) * g)));
      this.wlMain.set(Math.max(1, width), Math.max(1, height));
      this.wlAnchorOk = false;
    } else this.walkTarget.setSize(Math.max(1, Math.ceil(width / k)), Math.max(1, Math.ceil(height / k)));
    (this.material.uniforms.uLkWalkInv.value as THREE.Vector2).set(1 / Math.max(1, width), 1 / Math.max(1, height));
    // The cache is read per pixel (texelFetch at gl_FragCoord): the main target's own size.
    this.cacheTarget?.setSize(Math.max(1, width), Math.max(1, height));
    this.cacheNTarget?.setSize(Math.max(1, width), Math.max(1, height));
  }

  /**
   * Draws the walk term (the floes', rocks', shore's and icebergs' faces the pixel's low rays meet) at half resolution with
   * the frame's camera. Static scene and bump: only needed when the camera moved (the lake mirror rendered this frame).
   */
  renderWalk(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    if (!this.walkTarget || !this.walkScene || this.walkPerPixel) return;
    if (this.walkAnchored && (camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      this.renderWalkAnchored(renderer, camera as THREE.PerspectiveCamera);
      return;
    }
    const prev = renderer.getRenderTarget();
    const prevAuto = renderer.autoClear;
    renderer.getClearColor(this.walkPrevClear);
    const prevAlpha = renderer.getClearAlpha();
    renderer.autoClear = false;
    renderer.setRenderTarget(this.walkTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
    renderer.render(this.walkScene, camera);
    // LK_WALKREPROJ: the water reads the walk through the view-projection it was drawn with (render() updated the inverse).
    const vp = this.material.uniforms.uLkWalkVP?.value as THREE.Matrix4 | undefined;
    vp?.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    renderer.setRenderTarget(prev);
    renderer.setClearColor(this.walkPrevClear, prevAlpha);
    renderer.autoClear = prevAuto;
  }

  /**
   * wl2g: the frame's lake seen through the anchor (A = its view-projection): whether it stays inside the anchor's target (2 texels
   * in), the largest anchor texel in the frame's quarter texels (scale), and its bounding box in anchor texels (the scissor). The
   * frame's screen on a 9 x 9 grid: below the horizon the ray's point on the lake plane (two views of a plane: a homography, so the
   * edges map to lines), above it the horizon direction (the lake's far edge lies below it).
   */
  private wlProbe(camera: THREE.PerspectiveCamera, A: THREE.Matrix4, box: number[] | null) {
    const tgt = this.walkTarget!;
    const Wt = tgt.width;
    const Ht = tgt.height;
    const Wq = this.wlMain.x / this.walkDiv;
    const Hq = this.wlMain.y / this.walkDiv;
    const cp = camera.position;
    const cam = this.wlCur;
    const v = this.wlV;
    const X = this.wlX;
    const c = this.wlC;
    let inside = true;
    let scale = 0;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const toT = (m: THREE.Matrix4, w: number, h: number, out: number[]) => {
      c.copy(X).applyMatrix4(m);
      if (c.w <= 1e-6) return false;
      out[0] = (c.x / c.w) * 0.5 * w;
      out[1] = (c.y / c.w) * 0.5 * h;
      return true;
    };
    const pa = [0, 0];
    const pb = [0, 0];
    const qa = [0, 0];
    const qb = [0, 0];
    const q0 = [0, 0];
    for (let j = 0; j <= 8; j++) {
      for (let i = 0; i <= 8; i++) {
        v.set(-1 + i / 4, -1 + j / 4, 0.5).unproject(camera).sub(cp).normalize();
        let lake = v.y < -1e-4 && (WATER.level - cp.y) / v.y < 5000;
        if (lake) {
          const t = (WATER.level - cp.y) / v.y;
          X.set(cp.x + v.x * t, WATER.level, cp.z + v.z * t, 1);
          // (only the lake's own points count: the plane beyond its planes holds no water)
          lake = X.x >= WATER.far.min[0] && X.x <= WATER.far.max[0] && X.z >= WATER.far.min[2] && X.z <= WATER.near.max[2];
        } else X.set(v.x, 0, v.z, 0);
        if (!toT(A, Wt, Ht, pa)) {
          inside = false;
          continue;
        }
        const tx = pa[0] + 0.5 * Wt;
        const ty = pa[1] + 0.5 * Ht;
        if (lake && (tx < 2 || ty < 2 || tx > Wt - 2 || ty > Ht - 2)) inside = false;
        x0 = Math.min(x0, tx);
        y0 = Math.min(y0, ty);
        x1 = Math.max(x1, tx);
        y1 = Math.max(y1, ty);
        if (!lake) continue;
        // scale: the largest stretch of one anchor texel in the frame's quarter texels (sigma_max of J = Jframe Janchor^-1,
        // from 2 cm steps along x and z on the lake)
        const px = X.x;
        const pz = X.z;
        const ax = pa[0];
        const ay = pa[1];
        X.set(px, WATER.level, pz, 1);
        if (!toT(cam, Wq, Hq, q0)) continue;
        X.set(px + 0.02, WATER.level, pz, 1);
        if (!toT(cam, Wq, Hq, qa) || !toT(A, Wt, Ht, pb)) continue;
        const c00 = qa[0] - q0[0], c10 = qa[1] - q0[1], a00 = pb[0] - ax, a10 = pb[1] - ay;
        X.set(px, WATER.level, pz + 0.02, 1);
        if (!toT(cam, Wq, Hq, qb) || !toT(A, Wt, Ht, pb)) continue;
        const c01 = qb[0] - q0[0], c11 = qb[1] - q0[1], a01 = pb[0] - ax, a11 = pb[1] - ay;
        const det = a00 * a11 - a01 * a10;
        if (Math.abs(det) < 1e-12) continue;
        const i00 = a11 / det, i01 = -a01 / det, i10 = -a10 / det, i11 = a00 / det;
        const j00 = c00 * i00 + c01 * i10, j01 = c00 * i01 + c01 * i11, j10 = c10 * i00 + c11 * i10, j11 = c10 * i01 + c11 * i11;
        const T = j00 * j00 + j01 * j01 + j10 * j10 + j11 * j11;
        const D = j00 * j11 - j01 * j10;
        scale = Math.max(scale, Math.sqrt(0.5 * (T + Math.sqrt(Math.max(0, T * T - 4 * D * D)))));
      }
    }
    if (box) {
      box[0] = x0;
      box[1] = y0;
      box[2] = x1;
      box[3] = y1;
    }
    return { inside, scale };
  }
  private wlBox = [0, 0, 0, 0];

  /** wl2g: the walk pass through the lake-space anchor (see wl2gOn): same texels as the quarter pass, fixed to the lake. */
  private renderWalkAnchored(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
    const tgt = this.walkTarget!;
    camera.updateMatrixWorld();
    this.wlCur.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const AP = this.material.uniforms.uLkWalkAP.value as THREE.Matrix4;
    let ok = this.wlAnchorOk;
    if (ok) {
      const r = this.wlProbe(camera, AP, this.wlBox);
      ok = r.inside && r.scale <= this.walkTol;
    }
    if (!ok) {
      // (re)anchor: the frame's camera, its frustum the guard wider (focal lengths and off-axis terms / guard)
      const g = this.walkGuard;
      const P = this.wlAP.copy(camera.projectionMatrix);
      const e = P.elements;
      for (const k of [0, 4, 8, 12, 1, 5, 9, 13]) e[k] /= g;
      AP.multiplyMatrices(P, camera.matrixWorldInverse);
      this.wlAnchorOk = true;
      this.wlAnchors++;
      this.wlProbe(camera, AP, this.wlBox);
    }
    // the frame's own lake (+ 4 texels: a later frame may read through this walk before the next draw)
    const b = this.wlBox;
    const sx0 = Math.max(0, Math.floor(b[0]) - 4);
    const sy0 = Math.max(0, Math.floor(b[1]) - 4);
    const sx1 = Math.min(tgt.width, Math.ceil(b[2]) + 4);
    const sy1 = Math.min(tgt.height, Math.ceil(b[3]) + 4);
    tgt.scissor.set(sx0, sy0, Math.max(0, sx1 - sx0), Math.max(0, sy1 - sy0));
    tgt.scissorTest = true;
    const prev = renderer.getRenderTarget();
    const prevAuto = renderer.autoClear;
    renderer.getClearColor(this.walkPrevClear);
    const prevAlpha = renderer.getClearAlpha();
    renderer.autoClear = false;
    renderer.setRenderTarget(tgt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
    renderer.render(this.walkScene!, camera);
    // the water reads the walk through the anchor (LK_WALKREPROJ)
    (this.material.uniforms.uLkWalkVP.value as THREE.Matrix4).copy(AP);
    renderer.setRenderTarget(prev);
    renderer.setClearColor(this.walkPrevClear, prevAlpha);
    renderer.autoClear = prevAuto;
  }

  disposeWalk() {
    this.walkTarget?.dispose();
    this.walkMaterial?.dispose();
    this.cacheTarget?.dispose();
    this.cacheMaterial?.dispose();
    this.cacheNTarget?.dispose();
    this.cacheNMaterial?.dispose();
  }

  /** aaresolve (RenderPipeline.enableAAResolve): the lake writes its samples below the horizon line tone-compressed. */
  setAAResolve(aa: Record<string, { value: unknown }>) {
    this.material.defines.AA_RESOLVE = "";
    Object.assign(this.material.uniforms, aa);
    this.material.needsUpdate = true;
  }

  /** Fires a travelling ring from the ripple centre. */
  impulse(time: number, amplitude = 0.05, speed = 3.2, width = 0.9) {
    this.material.uniforms.uImpulse.value.set(time, amplitude, speed, width);
  }
}
