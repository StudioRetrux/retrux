/**
 * Shared GLSL. Shaders are plain strings so the engine has no build-time
 * dependency on a GLSL loader (works in Next/Turbopack and the esbuild lab).
 * All shading happens in scene-linear Rec.709; tone mapping runs once at the end.
 */

export const GLSL_COMMON = /* glsl */ `
#ifndef RX_COMMON
#define RX_COMMON
#define PI 3.14159265359
#define TAU 6.28318530718

float saturate(float x) { return clamp(x, 0.0, 1.0); }
vec3 saturate(vec3 x) { return clamp(x, 0.0, 1.0); }
float pow5(float x) { float x2 = x * x; return x2 * x2 * x; }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// Hash without sine (Dave Hoskins), stable for small coordinates.
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}

// Interleaved gradient noise, for per-pixel jitter and dithering.
float ign(vec2 px, float frame) {
  px += 5.588238 * mod(frame, 64.0);
  return fract(52.9829189 * fract(dot(px, vec2(0.06711056, 0.00583715))));
}

// Value noise with analytic derivatives (quintic). x: value in [-1,1], yzw: gradient.
vec4 noised(vec3 x) {
  vec3 i = floor(x);
  vec3 w = fract(x);
  vec3 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
  vec3 du = 30.0 * w * w * (w * (w - 2.0) + 1.0);
  float a = hash13(i + vec3(0.0, 0.0, 0.0));
  float b = hash13(i + vec3(1.0, 0.0, 0.0));
  float c = hash13(i + vec3(0.0, 1.0, 0.0));
  float d = hash13(i + vec3(1.0, 1.0, 0.0));
  float e = hash13(i + vec3(0.0, 0.0, 1.0));
  float f = hash13(i + vec3(1.0, 0.0, 1.0));
  float g = hash13(i + vec3(0.0, 1.0, 1.0));
  float h = hash13(i + vec3(1.0, 1.0, 1.0));
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

float vnoise(vec3 x) { return noised(x).x; }

const mat3 RX_OCT = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
const mat3 RX_OCT_INV = mat3(0.00, -0.80, -0.60, 0.80, 0.36, -0.48, 0.60, -0.48, 0.64);

// fBm with derivatives. x: value (~[-1,1]), yzw: gradient w.r.t. the input.
vec4 fbmd(vec3 x, int octaves) {
  float a = 0.0, b = 0.5;
  vec3 d = vec3(0.0);
  mat3 m = mat3(1.0);
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    vec4 n = noised(x);
    a += b * n.x;
    d += b * (m * n.yzw);
    b *= 0.5;
    x = RX_OCT * x * 2.02;
    m = 2.02 * RX_OCT_INV * m;
  }
  return vec4(a, d);
}

float fbm(vec3 x, int octaves) {
  float a = 0.0, b = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    a += b * vnoise(x);
    b *= 0.5;
    x = RX_OCT * x * 2.02;
  }
  return a;
}

// 3D Voronoi. Returns (F1, F2) distances; cellOut = offset to the nearest feature point.
vec2 voronoi3(vec3 x, out vec3 cellOut) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  float d1 = 8.0, d2 = 8.0;
  cellOut = vec3(0.0);
  for (int k = -1; k <= 1; k++)
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec3 b = vec3(float(i), float(j), float(k));
    vec3 r = b + hash33(p + b) - f;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; cellOut = r; }
    else if (d < d2) { d2 = d; }
  }
  return sqrt(vec2(d1, d2));
}

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
vec3 linearToSrgb(vec3 c) {
  c = max(c, 0.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

vec3 fresnelSchlick(float cosTheta, vec3 f0) { return f0 + (1.0 - f0) * pow5(1.0 - cosTheta); }
float fresnelSchlick(float cosTheta, float f0) { return f0 + (1.0 - f0) * pow5(1.0 - cosTheta); }

// GGX specular lobe (D * V), roughness = perceptual roughness.
float ggxSpec(vec3 n, vec3 v, vec3 l, float roughness) {
  vec3 h = normalize(v + l);
  float a = max(roughness * roughness, 0.002);
  float a2 = a * a;
  float nh = saturate(dot(n, h)), nv = saturate(dot(n, v)) + 1e-4, nl = saturate(dot(n, l));
  float dd = nh * nh * (a2 - 1.0) + 1.0;
  float D = a2 / (PI * dd * dd);
  float gv = nl * sqrt(nv * nv * (1.0 - a2) + a2);
  float gl = nv * sqrt(nl * nl * (1.0 - a2) + a2);
  float V = 0.5 / max(gv + gl, 1e-4);
  return D * V * nl;
}

// Builds an orthonormal basis around n (Frisvad / Duff et al.).
void basis(vec3 n, out vec3 t, out vec3 b) {
  float s = n.z >= 0.0 ? 1.0 : -1.0;
  float a = -1.0 / (s + n.z);
  float bb = n.x * n.y * a;
  t = vec3(1.0 + s * n.x * n.x * a, s * bb, -s * n.x);
  b = vec3(bb, s + n.y * n.y * a, -n.y);
}
#endif
`;

/**
 * AgX view transform, matching Blender's default "AgX" (look None, exposure 0).
 * Polynomial approximation after Troy Sobotka's AgX via Filament / three.js
 * (MIT licence). Input scene-linear Rec.709, output display-linear Rec.709.
 */
export const GLSL_AGX = /* glsl */ `
const mat3 RX_SRGB_TO_REC2020 = mat3(
  vec3(0.6274, 0.0691, 0.0164),
  vec3(0.3293, 0.9195, 0.0880),
  vec3(0.0433, 0.0113, 0.8956));
const mat3 RX_REC2020_TO_SRGB = mat3(
  vec3(1.6605, -0.1246, -0.0182),
  vec3(-0.5876, 1.1329, -0.1006),
  vec3(-0.0728, -0.0083, 1.1187));
const mat3 RX_AGX_INSET = mat3(
  vec3(0.856627153315983, 0.137318972929847, 0.11189821299995),
  vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903),
  vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
const mat3 RX_AGX_OUTSET = mat3(
  vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826),
  vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294),
  vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));

vec3 agxContrast(vec3 x) {
  vec3 x2 = x * x;
  vec3 x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
}

vec3 agx(vec3 color) {
  const float minEv = -12.47393;
  const float maxEv = 4.026069;
  color = RX_SRGB_TO_REC2020 * color;
  color = RX_AGX_INSET * color;
  color = max(color, 1e-10);
  color = log2(color);
  color = (color - minEv) / (maxEv - minEv);
  color = clamp(color, 0.0, 1.0);
  color = agxContrast(color);
  color = RX_AGX_OUTSET * color;
  color = pow(max(vec3(0.0), color), vec3(2.2));
  color = RX_REC2020_TO_SRGB * color;
  return clamp(color, 0.0, 1.0);
}
`;

/** Prefiltered environment lookup via three's CubeUV (PMREM) chunk. */
export const GLSL_ENV = /* glsl */ `
#include <cube_uv_reflection_fragment>
uniform sampler2D uEnvMap;
uniform float uEnvIntensity;
vec3 envRadiance(vec3 dir, float roughness) {
  return textureCubeUV(uEnvMap, dir, roughness).rgb * uEnvIntensity;
}
// Diffuse irradiance approximation: the roughest PMREM level.
vec3 envIrradiance(vec3 n) {
  return textureCubeUV(uEnvMap, n, 1.0).rgb * uEnvIntensity;
}
`;

/**
 * Tone-compressed MSAA resolve (`?aaresolve`, 19 Nov: "the water's edge by the ice looks like low-quality anti-aliasing when
 * the camera moves"). The 4x resolve averaged scene-linear HDR: bright water against a dark floe is ~10:1 there, so after AgX
 * the first covered sample moved a waterline pixel ~60 % of the way and the outline stepped like 1-2 AA levels. Below the
 * horizon line the environment pass now writes x = c / (K + luma c) per sample, the hardware resolve averages x, and the
 * readers expand c = K x / (1 - luma x), which is sum(c w) / sum(w) with w = 1 / (K + luma c) (Karis' weighting): a
 * perceptual average at an edge, the exact inverse wherever a pixel's samples agree. K (uAAKnee, HeroEngine) is 0.5, not
 * Karis' 1: the lake is 0.5-1.5 here and the dark faces 0.015-0.2, where 1 + luma still left ~50 % of a waterline pixel's
 * change in its first covered sample (linear: ~60 %). Display-even steps would need K ~ 0.18 (AgX's mid grey), but that also
 * darkens every 1-sample sliver of a thin dark line, which then flickers more; in same-session sweeps K = 0.5 cut the
 * waterline jumps > 48 levels by 65-74 % and > 32 by 26-37 % (K = 1: 40-49 / 20-29 %, K = 0.18: flicker energy up 0-9 %).
 * The region (set per frame by RenderPipeline) is decided once per
 * pixel centre, the same way in every writer and reader, so no pixel mixes the two spaces: below the horizon line
 * (uAAPlane, a half-plane in pixels) and outside the box where a cloud card reaches below it (uAAExc: inside where all three
 * half-planes, its columns, are >= 0). Nothing blended draws there, so blending keeps working in scene-linear values.
 */
export const GLSL_AA_RESOLVE = /* glsl */ `
uniform vec3 uAAPlane;
uniform mat3 uAAExc;
uniform float uAAKnee;
bool aaIn(vec2 px) {
  vec3 q = vec3(px, 1.0);
  return dot(q, uAAPlane) < 0.0 && !all(greaterThanEqual(q * uAAExc, vec3(0.0)));
}
vec3 aaCompress(vec3 c) { return c / (uAAKnee + max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 0.0)); }
vec3 aaExpand(vec3 x) { return uAAKnee * x / max(1.0 - max(dot(x, vec3(0.2126, 0.7152, 0.0722)), 0.0), 1.0 / 4096.0); }
`;
