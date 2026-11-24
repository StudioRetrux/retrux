import * as THREE from "three";
import { HERO_CENTER, ORB_NAME, ORB_RADIUS } from "../config";
import { clamp, damp, lerp } from "../math";
import { GLSL_COMMON, GLSL_ENV } from "../shaders/chunks";
import { LAYER, type QualityProfile } from "../types";
import type { SharedUniforms } from "../uniforms";

/**
 * The glowing orb: Blender material `magick_ball_01.002` on Icosphere.011, a clear glass shell
 * (Principled IOR 1.25, Specular IOR Level = Fresnel(2.0), transmission 0.995) around an
 * emission-only Principled Volume.
 *
 * The sphere mesh is only a proxy; the optics are analytic per pixel: refraction into the shell,
 * a march through the plasma ball in Blender object space, Fresnel at the exit (total internal
 * reflection near the rim keeps light circling inside, which is what gives the orb its bright,
 * iridescent edge), then the panorama behind it and the shell's reflection.
 *
 * The volume follows the node tree: a domain-warped 4D fBm whose thin iso-sheets (a tent colour
 * ramp on a 1D noise of the fBm) are shaped by two radial falloffs; Density = D, Emission
 * Strength = 1000 D, colour = ColorRamp.001(D), with Cycles' indirect sample clamp (10). The
 * sheets are much thinner than a march step, so their coverage along each step is pre-integrated
 * on the CPU (exact Blender Perlin for the 1D noise). That keeps 8 steps clean and temporally
 * stable without jitter.
 */

/** Production timing: one Blender frame per 30 fps video frame (frame = 30 t + 1). */
const BLENDER_FPS = 30;
/** Icosphere.011 local radius: Blender object coordinates are 0.25 at the shell. */
const SHELL_RADIUS_OBJ = 0.25;
/** Object-space radius beyond which D = M - S cannot be positive (0.69 m in the world). */
const R_VOL = 0.21;
/** Proxy mesh radius relative to the analytic shell, leaving room for the AA ramp. */
const PROXY_SCALE = 1.05;

/** Domain-warp texture (Noise Texture.005 colour) resolution over [-R_VOL, R_VOL]^3. */
const WARP_N = 16;
/** Pre-integrated sheet table: noise value range, columns, radius rows, sub-samples per column. */
const SHEET_F = 3;
const SHEET_NF = 1024;
const SHEET_NR = 48;
const SHEET_SS = 8;

/**
 * Our 4D simplex fBm stands in for Blender's 4D Perlin fBm (16 corners per octave is too costly).
 * Measured on 500 random points: Blender fBm std 0.450 with d/ds std 1.41; raw simplex fBm
 * 0.0208 and 0.0971. These factors match both the amplitude and the feature size.
 */
const NOISE_AMP = 21.63;
const NOISE_FREQ = 0.67;

/** Blender's random_float3_offset(3) and (4): domains of the G and B channels of a colour noise. */
const OFFSET_G: [number, number, number] = [165.445278, 162.768214, 193.408404];
const OFFSET_B: [number, number, number] = [155.580915, 177.154631, 138.140035];

/** ColorRamp.001 (linear): density -> volume / emission colour. */
const RAMP_POS = [0, 0.3890908, 0.6618182, 0.9054545, 1];
const RAMP_COL: [number, number, number][] = [
  // Blender has 0.0688 red here; that violet shows as a lavender rim on the grazing paths, which
  // the reference frames do not have. Kept at the same blue.
  [0.02, 0, 0.2044736],
  [0, 0.009318269, 0.2045414],
  [0, 1, 0.4234163],
  [0.2210912, 0.6978849, 1],
  [0.8818006, 0.9878998, 1],
];

const glslFloat = (x: number) => x.toFixed(8);

// ---------------------------------------------------------------------------------------------
// CPU side: Blender's Perlin noise, used to bake the two lookup textures once.

const rot32 = (x: number, k: number) => (x << k) | (x >>> (32 - k));

/** Cycles `hash_uint3` (Bob Jenkins' lookup3 final mix), the lattice hash of Blender's Perlin noise. */
function hashUint3(kx: number, ky: number, kz: number) {
  let a = (0xdeadbeef + (3 << 2) + 13) | 0;
  let b = a;
  let c = (a + kz) | 0;
  b = (b + ky) | 0;
  a = (a + kx) | 0;
  c = ((c ^ b) - rot32(b, 14)) | 0;
  a = ((a ^ c) - rot32(c, 11)) | 0;
  b = ((b ^ a) - rot32(a, 25)) | 0;
  c = ((c ^ b) - rot32(b, 16)) | 0;
  a = ((a ^ c) - rot32(c, 4)) | 0;
  b = ((b ^ a) - rot32(a, 14)) | 0;
  c = ((c ^ b) - rot32(b, 24)) | 0;
  return c >>> 0;
}

function grad3(hash: number, x: number, y: number, z: number) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const vt = h === 12 || h === 14 ? x : z;
  const v = h < 4 ? y : vt;
  return (h & 1 ? -u : u) + (h & 2 ? -v : v);
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Blender's signed 3D Perlin noise (`snoise_3d`), roughly in [-1, 1]. */
function snoise3(x: number, y: number, z: number) {
  const X = Math.floor(x);
  const Y = Math.floor(y);
  const Z = Math.floor(z);
  const fx = x - X;
  const fy = y - Y;
  const fz = z - Z;
  const u = fade(fx);
  const v = fade(fy);
  const w = fade(fz);
  const x00 = lerp(grad3(hashUint3(X, Y, Z), fx, fy, fz), grad3(hashUint3(X + 1, Y, Z), fx - 1, fy, fz), u);
  const x10 = lerp(grad3(hashUint3(X, Y + 1, Z), fx, fy - 1, fz), grad3(hashUint3(X + 1, Y + 1, Z), fx - 1, fy - 1, fz), u);
  const x01 = lerp(grad3(hashUint3(X, Y, Z + 1), fx, fy, fz - 1), grad3(hashUint3(X + 1, Y, Z + 1), fx - 1, fy, fz - 1), u);
  const x11 = lerp(
    grad3(hashUint3(X, Y + 1, Z + 1), fx, fy - 1, fz - 1),
    grad3(hashUint3(X + 1, Y + 1, Z + 1), fx - 1, fy - 1, fz - 1),
    u,
  );
  return 0.982 * lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
}

/** Noise Texture.005 (signed fBm, Roughness 0.1336, Lacunarity 5.59); octaves past the 2nd add < 0.02. */
const warpFbm = (x: number, y: number, z: number) =>
  snoise3(x, y, z) + 0.133583 * snoise3(x * 5.59, y * 5.59, z * 5.59);

/**
 * The domain warp is static in Mapping space (the Mapping rotation turns the whole field), so the
 * colour output of Noise Texture.005 (Scale 0.83) is baked once into a small 3D texture.
 */
function bakeWarp() {
  const n = WARP_N;
  const data = new Uint16Array(n * n * n * 4);
  const step = (2 * R_VOL) / (n - 1);
  let i = 0;
  for (let z = 0; z < n; z++) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const px = 0.83 * (x * step - R_VOL);
        const py = 0.83 * (y * step - R_VOL);
        const pz = 0.83 * (z * step - R_VOL);
        data[i++] = THREE.DataUtils.toHalfFloat(warpFbm(px, py, pz));
        data[i++] = THREE.DataUtils.toHalfFloat(warpFbm(px + OFFSET_G[0], py + OFFSET_G[1], pz + OFFSET_G[2]));
        data[i++] = THREE.DataUtils.toHalfFloat(warpFbm(px + OFFSET_B[0], py + OFFSET_B[1], pz + OFFSET_B[2]));
        data[i++] = THREE.DataUtils.toHalfFloat(1);
      }
    }
  }
  const tex = new THREE.Data3DTexture(data, n, n, n);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.HalfFloatType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.wrapR = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** ColorRamp (linear tent 0.6254545 -> 0, 0.7018185 -> 1, 0.7418184 -> 0): the iso-sheets. */
function tent(g: number) {
  if (g <= 0.6254545 || g >= 0.7418184) return 0;
  return g < 0.7018185 ? (g - 0.6254545) / (0.7018185 - 0.6254545) : (0.7418184 - g) / (0.7418184 - 0.7018185);
}

function rampColor(d: number, out: [number, number, number]) {
  const last = RAMP_POS.length - 1;
  let i = 1;
  while (i < last && d >= RAMP_POS[i]) i++;
  const t = clamp((d - RAMP_POS[i - 1]) / (RAMP_POS[i] - RAMP_POS[i - 1]));
  for (let k = 0; k < 3; k++) out[k] = lerp(RAMP_COL[i - 1][k], RAMP_COL[i][k], t);
}

/**
 * Per radius row r (rows uniform in r^2), cumulative integrals over the 4D-noise value n of
 * x * ColorRamp.001(c x) (rgb) and x (a), where x = max(tent(Noise.001(n)) - tau, 0),
 * c = 0.2 + 0.8 / (5.07 r) and tau = (4.73 r)^5.5 / c, i.e. D = c x. The shader turns a march
 * step that sweeps n from n0 to n1 into exact mean density and emission with two lookups.
 * Stored detrended by a mean slope per channel so half floats keep the differences precise.
 */
function bakeSheets() {
  const nS = (SHEET_NF - 1) * SHEET_SS + 1;
  const tents = new Float32Array(nS);
  for (let s = 0; s < nS; s++) {
    // Noise.001: normalised single-octave Perlin (Scale 2.6) on the vector (n, n, n).
    const t = 2.6 * (-SHEET_F + (2 * SHEET_F * s) / (nS - 1));
    tents[s] = tent(0.5 + 0.5 * snoise3(t, t, t));
  }
  const dn = (2 * SHEET_F) / (nS - 1);
  const cum = new Float32Array(SHEET_NF * SHEET_NR * 4);
  const col: [number, number, number] = [0, 0, 0];
  for (let row = 0; row < SHEET_NR; row++) {
    const r = Math.max(R_VOL * Math.sqrt(row / (SHEET_NR - 1)), 0.004);
    const c = 0.2 + 0.8 / (5.07 * r);
    const tau = Math.pow(4.73 * r, 5.5) / c;
    let ar = 0;
    let ag = 0;
    let ab = 0;
    let ax = 0;
    let pr = 0;
    let pg = 0;
    let pb = 0;
    let px = 0;
    for (let s = 0; s < nS; s++) {
      const x = Math.max(tents[s] - tau, 0);
      rampColor(c * x, col);
      const yr = x * col[0];
      const yg = x * col[1];
      const yb = x * col[2];
      if (s > 0) {
        ar += 0.5 * (yr + pr) * dn;
        ag += 0.5 * (yg + pg) * dn;
        ab += 0.5 * (yb + pb) * dn;
        ax += 0.5 * (x + px) * dn;
      }
      pr = yr;
      pg = yg;
      pb = yb;
      px = x;
      if (s % SHEET_SS === 0) {
        const i = (row * SHEET_NF + s / SHEET_SS) * 4;
        cum[i] = ar;
        cum[i + 1] = ag;
        cum[i + 2] = ab;
        cum[i + 3] = ax;
      }
    }
  }
  const slope = new THREE.Vector4();
  for (let row = 0; row < SHEET_NR; row++) {
    const i = ((row + 1) * SHEET_NF - 1) * 4;
    slope.x += cum[i];
    slope.y += cum[i + 1];
    slope.z += cum[i + 2];
    slope.w += cum[i + 3];
  }
  slope.multiplyScalar(1 / (SHEET_NR * 2 * SHEET_F));
  const k = [slope.x, slope.y, slope.z, slope.w];
  const data = new Uint16Array(cum.length);
  for (let row = 0; row < SHEET_NR; row++) {
    for (let j = 0; j < SHEET_NF; j++) {
      const span = (2 * SHEET_F * j) / (SHEET_NF - 1);
      const i = (row * SHEET_NF + j) * 4;
      for (let ch = 0; ch < 4; ch++) data[i + ch] = THREE.DataUtils.toHalfFloat(cum[i + ch] - k[ch] * span);
    }
  }
  const tex = new THREE.DataTexture(data, SHEET_NF, SHEET_NR, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return { texture: tex, slope };
}

// ---------------------------------------------------------------------------------------------
// GPU side.

const ORB_VERT = /* glsl */ `
varying vec3 vWorldPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const ORB_FRAG = /* glsl */ `
${GLSL_COMMON}
${GLSL_ENV}
uniform sampler2D uRefraction;
uniform vec2 uResolution;
// three declares projectionMatrix for the vertex stage only; it is set per camera for the program.
uniform mat4 projectionMatrix;
uniform sampler3D uWarp;
uniform sampler2D uSheets;
uniform vec4 uSheetSlope;
uniform vec3 uCenter;
uniform float uRadius;
uniform mat3 uToObj;          // world offset -> Blender object coordinates of Icosphere.011
uniform float uObjToWorld;    // metres per object unit
uniform vec2 uRot;            // cos / sin of the Mapping rotation (frame / 200)
uniform float uW;             // 4D noise W * Scale (7.57 * frame / 800)
uniform float uGain;
uniform float uRim;     // 0..1 the hold: a luminous outer zone (Orb.update)
uniform float uClamp;         // Cycles sample_clamp_indirect
uniform float uMaxRadiance;
uniform float uShell;         // 1: glass shell (Blender), 0: bare volume
uniform float uIor;
uniform float uIorLevel;      // 1: the Specular IOR Level also bends the refraction (Principled)
uniform float uReflectionPass;
// Screen-space background along the exit rays (QC round 10): 0 = the panorama only, 1 = the screen copy (T1+ holds the far
// half of the rings, RenderPipeline), x: weight, y: distance behind the exit point in radii, z: copy mip, w: gain.
uniform vec4 uScreenBg;
// Hold fills (QC round 10): x scales the flat self-luminous fills in the hold (1 = as before), y the smoke lane depth,
// z how much the refracted background's darkness shades the glow (0 = off), w the background luminance that counts as bright.
uniform vec4 uHoldFill;
// Darkest shading factor of the refracted cage (AgX is logarithmic up there: L245 -> L190 needs ~3-4 stops).
uniform float uShadeFloor;
varying vec3 vWorldPos;

// Cycles' film_clamp_light: scale a contribution so that r + g + b <= limit.
vec3 clampSample(vec3 c, float limit) {
  float s = c.r + c.g + c.b;
  return s > limit ? c * (limit / s) : c;
}

// Exact dielectric Fresnel (Cycles fresnel_dielectric_cos), eta = n_transmitted / n_incident.
float fresnelDielectric(float cosi, float eta) {
  float c = abs(cosi);
  float g = eta * eta - 1.0 + c * c;
  if (g <= 0.0) return 1.0;
  g = sqrt(g);
  float a = (g - c) / (g + c);
  float b = (c * (g + c) - 1.0) / (c * (g - c) + 1.0);
  return 0.5 * a * a * (1.0 + b * b);
}

// IOR of the glass lobe. Principled scales F0 by 2 * (Specular IOR Level) and converts it back to
// an IOR that also drives the refraction; the level is Fresnel(2.0): ~0.11 face-on, 1 at the rim.
float shellEta(float level) {
  float r0 = (uIor - 1.0) / (uIor + 1.0);
  float s = sqrt(min(r0 * r0 * 2.0 * level, 0.9));
  float etaLevel = (1.0 + s) / (1.0 - s);
  return mix(1.0, mix(uIor, etaLevel, uIorLevel), uShell);
}

uint orbHash(ivec4 c) {
  uvec4 v = uvec4(c);
  uint h = (v.x * 0x8da6b343u) ^ (v.y * 0xd8163841u) ^ (v.z * 0xcb1ab31fu) ^ (v.w * 0x165667b1u);
  h ^= h >> 16u;
  h *= 0x7feb352du;
  h ^= h >> 15u;
  h *= 0x846ca68bu;
  h ^= h >> 16u;
  return h;
}

// Blender's grad4: the low 5 bits pick three of the four axes and their signs.
float orbGrad(uint h, vec4 x) {
  h &= 31u;
  float u = h < 24u ? x.x : x.y;
  float v = h < 16u ? x.y : x.z;
  float s = h < 8u ? x.z : x.w;
  return ((h & 1u) != 0u ? -u : u) + ((h & 2u) != 0u ? -v : v) + ((h & 4u) != 0u ? -s : s);
}

// 4D simplex noise: 5 lattice corners instead of Perlin's 16.
float orbSimplex(vec4 p) {
  const float F4 = 0.309016994374947;
  const float G4 = 0.138196601125011;
  vec4 i = floor(p + dot(p, vec4(F4)));
  vec4 x0 = p - i + dot(i, vec4(G4));
  // Rank the components of x0 to find the simplex of the skewed hypercube that contains p.
  vec3 isX = step(x0.yzw, x0.xxx);
  vec3 isYZ = step(x0.zww, x0.yyz);
  vec4 rank = vec4(isX.x + isX.y + isX.z, 1.0 - isX);
  rank.y += isYZ.x + isYZ.y;
  rank.zw += 1.0 - isYZ.xy;
  rank.z += isYZ.z;
  rank.w += 1.0 - isYZ.z;
  vec4 i1 = clamp(rank - 2.0, 0.0, 1.0);
  vec4 i2 = clamp(rank - 1.0, 0.0, 1.0);
  vec4 i3 = clamp(rank, 0.0, 1.0);
  vec4 x1 = x0 - i1 + G4;
  vec4 x2 = x0 - i2 + 2.0 * G4;
  vec4 x3 = x0 - i3 + 3.0 * G4;
  vec4 x4 = x0 - 1.0 + 4.0 * G4;
  ivec4 c = ivec4(i);
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  float m4 = max(0.6 - dot(x4, x4), 0.0);
  m *= m;
  m *= m;
  m4 *= m4;
  m4 *= m4;
  vec4 g = vec4(
    orbGrad(orbHash(c), x0),
    orbGrad(orbHash(c + ivec4(i1)), x1),
    orbGrad(orbHash(c + ivec4(i2)), x2),
    orbGrad(orbHash(c + ivec4(i3)), x3));
  return dot(m, g) + m4 * orbGrad(orbHash(c + 1), x4);
}

// Mapping node: Rotation Z = frame / 200 about the object's vertical axis.
vec3 orbMapping(vec3 p) {
  return vec3(uRot.x * p.x - uRot.y * p.y, uRot.y * p.x + uRot.x * p.y, p.z);
}

// Noise (4D signed fBm, Scale 7.57, Detail 4, Roughness 0.8733, Lacunarity 1.14, W = frame / 800)
// on the domain warp q = 0.5 * (Noise.005 colour + p).
float magickNoise(vec3 pm) {
  vec3 warp = textureLod(uWarp, pm * WARP_SCALE + 0.5, 0.0).rgb;
  vec4 q = vec4(0.5 * (warp + pm) * 7.57, uW) * NOISE_FREQ;
  float n = 0.0;
  float amp = NOISE_AMP;
  for (int i = 0; i < 5; i++) {
    n += amp * orbSimplex(q);
    amp *= 0.8733333;
    q *= 1.14;
  }
  return n;
}

// Mean of (x * ramp(c x), x) while the noise sweeps n0 -> n1 at object radius r.
vec4 sheetMean(float n0, float n1, float r) {
  float mid = clamp(0.5 * (n0 + n1), SHEET_MIN - SHEET_F, SHEET_F - SHEET_MIN);
  float hw = clamp(0.5 * abs(n1 - n0), SHEET_MIN, SHEET_F - abs(mid));
  float v = saturate(r * r * SHEET_INV_RV2) * SHEET_V_SCALE + SHEET_V_BIAS;
  vec4 a = textureLod(uSheets, vec2((mid - hw) * SHEET_U_SCALE + 0.5, v), 0.0);
  vec4 b = textureLod(uSheets, vec2((mid + hw) * SHEET_U_SCALE + 0.5, v), 0.0);
  return max((b - a) / (2.0 * hw) + uSheetSlope, 0.0);
}

// Shell roughness chain (Noise.002 / Noise.003 -> ramps -> Mix.002 -> ColorRamp.004): clear glass
// with faint frosted patches up to ~0.24. Value-noise stand-ins, higher tiers only.
float shellRoughness(vec3 po) {
#ifdef ORB_SHELL_DETAIL
  float n2 = 1.6 * fbm(po * 2.36 + vec3(3.1, 7.7, 1.3), 3);
  float n3 = 0.5 + 0.4 * fbm(po * 11.06 + vec3(9.2, 2.4, 5.8), 2);
  float a = 0.0934 * smoothstep(0.171, 0.316, n2) * (1.0 - smoothstep(0.316, 0.647, n2));
  float b = 0.1362 * saturate((n3 - 0.6764) / 0.3236);
  return 0.01 + 0.99 * saturate(mix(a, b, 0.7133) / 0.5273);
#else
  return 0.03;
#endif
}

void main() {
  vec3 rd = normalize(vWorldPos - cameraPosition);
  vec3 oc = cameraPosition - uCenter;
  float tc = dot(oc, rd);
  vec3 perp = oc - rd * tc;               // centre -> closest point of the view ray
  float dPerp = length(perp);
  float aa = max(fwidth(dPerp), 1e-6);    // before any discard
  float R = uRadius;
  // Near half of the proxy only, whatever the winding (e.g. under a mirrored camera).
  if (tc > 0.0 || dot(vWorldPos - uCenter, cameraPosition - vWorldPos) < 0.0) discard;
  float cov = saturate((R - dPerp) / aa + 0.5);
  if (cov <= 0.0) discard;

  // Entry point on the shell; AA edge pixels shade as grazing hits.
  float bImp = min(dPerp, R * 0.9995) / R;
  vec3 side = dPerp > 1e-6 ? perp / dPerp : vec3(0.0);
  float cosI = sqrt(max(1.0 - bImp * bImp, 0.0));
  vec3 N1 = bImp * side - cosI * rd;

  float etaIn = shellEta(fresnelDielectric(cosI, 2.0));
  vec3 rd2 = refract(rd, N1, 1.0 / etaIn);
  float fIn = uShell * fresnelDielectric(cosI, etaIn);
  float cosT = saturate(-dot(rd2, N1));
  float sinT = sqrt(max(1.0 - cosT * cosT, 0.0));
  float etaOut = shellEta(fresnelDielectric(cosT, 0.5));    // Fresnel node seen from inside
  float fOut = uShell * fresnelDielectric(cosT, 1.0 / etaOut);
  vec3 N2 = N1 + 2.0 * cosT * rd2;                          // exit normal (chord of a sphere)

  // Chord through the plasma ball (radius R_VOL in object units), marched in object space.
  float S = uObjToWorld;
  float h = R * sinT;
  float rv = R_VOL * S;
  float w = sqrt(max(rv * rv - h * h, 0.0));
  vec3 o = uToObj * (N1 * R);
  vec3 d = uToObj * rd2;
  float s0 = R * cosT - w;
  int steps = uReflectionPass > 0.5 ? min(MARCH_STEPS, max(MARCH_STEPS / 2, 3)) : MARCH_STEPS;
  float ds = 2.0 * w / float(steps);

  vec3 emit = vec3(0.0);
  float trans = 1.0;
  if (w > 0.0) {
    vec3 pPrev = o + d * s0;
    float nPrev = magickNoise(orbMapping(pPrev));
    for (int k = 1; k <= MARCH_STEPS; k++) {
      if (k > steps) break;
      vec3 p = o + d * (s0 + ds * float(k));
      float n = magickNoise(orbMapping(p));
      float r = length(0.5 * (p + pPrev));
      float c = 0.2 + 0.8 / (5.07 * max(r, 0.008));
      vec4 sm = sheetMean(nPrev, n, r);
      float sigma = c * sm.a;                      // Density = D, per metre
      vec3 eps = (1000.0 * c * uGain) * sm.rgb;    // Emission Strength 1000 D, colour ramp(D)
      float tr = exp(-sigma * ds);
      emit += trans * eps * (sigma > 1e-4 ? (1.0 - tr) / sigma : ds);
      trans *= tr;
      pPrev = p;
      nPrev = n;
    }
  }

  // Each inner pass is clamped like a Cycles indirect sample. Internal reflection at the exit
  // (total near the rim) adds up to 4 more passes (glossy bounce limit); they are taken as
  // statistically like the first and use the mean sheet coverage at their radius.
  float limit = uClamp * uGain;
  float q = fOut * trans;
  // At most one extra pass: the 5-pass geometric sum over-brightens the rim, where the low-density
  // end of the ramp is violet, and the neutral bounced fill flattened the plasma tongues (QC round 1).
  float chain = min(q < 0.9999 ? (1.0 - q * q * q * q * q) / (1.0 - q) : 5.0, 2.0);
  vec3 col = clampSample(emit, limit);
  if (chain > 1.001 && w > 0.0) {
    float rEff = sqrt(h * h + w * w / 3.0) / S;
    float c = 0.2 + 0.8 / (5.07 * max(rEff, 0.008));
    vec4 sm = sheetMean(-0.75, 0.75, rEff);
    float sigma = c * sm.a;
    float len = 2.0 * w;
    vec3 eps = (1000.0 * c * uGain) * sm.rgb;
    vec3 inner = clampSample(eps * (sigma > 1e-4 ? (1.0 - exp(-sigma * len)) / sigma : len), limit);
    // Bounced light mixes the whole ball's colours: mostly neutral, a little of the ramp.
    inner = mix(vec3(dot(inner, vec3(0.2126, 0.7152, 0.0722))), inner, 0.4);
    col += inner * (chain - 1.0);
  }

  // Behind: the panorama (captured at the orb centre) along the refracted ray, or the screen copy
  // when the shell is off. In front: the shell's reflection.
  float rough = shellRoughness(o);
  vec3 rd3 = refract(rd2, -N2, etaOut);
  if (fOut >= 0.9999 || dot(rd3, rd3) < 0.25) rd3 = rd;
  // Soft: a sharp refracted horizon reads as crisp teeth at the limb (the reference shows soft forms).
  vec3 bg = (uShell > 0.5 || uReflectionPass > 0.5)
    ? envRadiance(rd3, max(rough, 0.32) * uShell)
    : textureLod(uRefraction, gl_FragCoord.xy / uResolution, 0.0).rgb;
  // The glass ball is a lens: F402 / F453 show the rings BEHIND it inverted inside the disc (dark grey-blue shapes in the white
  // glow), which the panorama (captured without the hero) cannot. Follow the exit ray a few radii into the scene and read
  // the screen copy there (T1+: env + the far half of the cage). Off the screen or in the mirror pass: the panorama.
  float bgShade = 1.0;
  if (uScreenBg.x > 0.0 && uReflectionPass < 0.5 && uShell > 0.5) {
    vec3 X = uCenter + (N1 + rd2 * (2.0 * cosT)) * R;
    vec4 sc = projectionMatrix * viewMatrix * vec4(X + rd3 * (uScreenBg.y * R), 1.0);
    vec2 suv = sc.xy / max(sc.w, 1e-4) * 0.5 + 0.5;
    vec2 se = min(suv, 1.0 - suv);
    float sIn = smoothstep(0.0, 0.03, min(se.x, se.y)) * step(0.0, sc.w);
    vec3 sbg = textureLod(uRefraction, clamp(suv, vec2(0.001), vec2(0.999)), uScreenBg.z).rgb * uScreenBg.w;
    bg = mix(bg, sbg, uScreenBg.x * sIn);
    bgShade = mix(1.0, smoothstep(uHoldFill.w * 0.3, uHoldFill.w, dot(sbg, vec3(0.2126, 0.7152, 0.0722))), sIn);
  }
  col += bg * ((1.0 - fOut) * trans * chain);
  // (Rough floor 0.18 since QC round 6: the crisp PMREM detail drew hard vertical seams on the visible caps in the hold.)
  vec3 refl = fIn > 1e-4 ? envRadiance(reflect(rd, N1), max(rough, 0.18)) * fIn : vec3(0.0);
  col = refl + (1.0 - fIn) * col;
  // Grazing paths run through the plasma's low-density shell, where the ramp is deep blue; the
  // reference rim reads pale and soft, so the colour fades towards neutral at the silhouette.
  float rimK = smoothstep(0.55, 1.0, bImp);
  col = mix(col, vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), 0.25 * rimK);
  // Self-luminous: the whole disc glows (the reference plasma fills the ball; the bare glass between the
  // tongues read as "a lamp in a marble", QC round 3), fading towards the rim, under the plasma structure.
  // Mint, G >= B > R (QC round 4: the reference core reads mint everywhere; B > G read lavender), and a little more
  // of it at rest (the cap above ring A was 3.8 % clipped vs the reference's 62 %).
  // QC round 5: no pixel clipped anywhere (reference 900-7700 per pose), a flat pearl. A hot radial core that clips
  // white in the middle and turns mint towards the rim, modulated by the plasma's own emission so the gaps between its
  // sheets read as darker smoke (q03: 2030 clipped px vs the reference's 2453).
  // QC round 6 (T07, orbvar5-7): the x5 white-topped fill read as a flat clipped disc and AgX bleached its near-white mint
  // to neutral (mint px 4-70 vs the reference's 355-1958): x3 with a saturated mint that survives the tone curve and never
  // tops out at pure white, deeper smoke modulation, and grey-teal smoke veins where the plasma's own emission is low.
  float coreK = pow(1.0 - smoothstep(0.0, 0.97, bImp), 0.6);
  float emL = dot(emit, vec3(0.2126, 0.7152, 0.0722)) / max(uGain, 1e-3);
  // QC round 7 (T10): at x3 (up to 7.5 scene-linear, >= 3 even in the gaps) most of the disc sat on AgX's flat white
  // shoulder and the sheets / smoke lanes vanished: x1.1 puts the gaps at ~0.4-1.0 and the mid-disc at ~1-2 (L165-220,
  // mint mid-tones), a small hot core clips in the middle, and the smoke lanes go deeper (grey-teal ~L150-190).
  // (QC round 9, T07: gating the glow by the plasma's thin emission sheets, mix(1, smoothstep(0.5, 4, emL), 0.85), cut it
  // out along the sheets into hard "paper" edges with 15 % lanes. A soft smoke field at the chord midpoint, drifting with the
  // plasma clock, carries the smoke now; the sheets keep a little of it. In the hold the floor rises so the cap keeps glowing.)
  vec3 pMid = o + d * (s0 + w);
  // (2 octaves on T0's 8 march steps.)
  float smoke = smoothstep(0.35, 0.75, 0.5 + 0.5 * fbm(pMid * 3.0 + vec3(0.0, 0.0, uW * 0.6), MARCH_STEPS <= 8 ? 2 : 3));
  float smokeK = max(mix(1.0, uHoldFill.y, smoke) * mix(1.0, smoothstep(0.3, 3.0, emL), 0.35), mix(0.47, 0.7, uRim));
  float holdFill = mix(1.0, uHoldFill.x, uRim);
  col += mix(vec3(0.62, 1.0, 0.90), vec3(0.80, 1.0, 0.95), coreK * coreK * coreK) * 1.1 * uGain * coreK * smokeK * (1.0 - fIn) * holdFill;
  // (x4.0 within 0.55 until QC round 9: ~10 scene-linear, a fully exposed disc above the tone curve's shoulder.)
  col += vec3(0.85, 1.0, 0.97) * 2.6 * uGain * pow(1.0 - smoothstep(0.0, mix(0.6, 0.8, uRim), bImp), 2.0) * smokeK * (1.0 - fIn);
  float vein = (1.0 - smoothstep(0.0, 3.5, emL)) * smoothstep(0.15, 0.55, coreK);
  col *= mix(vec3(1.0), vec3(0.5, 0.64, 0.66), vein * 0.8);
  // A luminous cyan limb and a thin additive lilac band at the glass edge (the grey rimTint multiply, a lilac / mint
  // tint over rimG, read as a chrome shell, QC round 6).
  col += vec3(0.70, 1.0, 0.94) * uGain * (0.28 + 0.4 * uRim) * smoothstep(0.5, 0.88, bImp) * (1.0 - smoothstep(0.965, 1.0, bImp)) * (1.0 - fIn);
  // In the hold the outer zone glows (QC round 8, orb CRITICAL: the cap and lower arc that show around the bands read as an
  // empty glass shell / soap bubble; F420's orb glows white-mint to its rim). Zero at rest.
  // (0.35 + limb 0.3: the p06 cap L210 -> 221; target >= 235.)
  col += vec3(0.75, 1.0, 0.95) * 0.6 * uGain * smoothstep(0.55, 0.8, bImp) * (1.0 - smoothstep(0.93, 0.99, bImp)) * (1.0 - fIn) * uRim * holdFill;
  // A mild glass-shell band instead of the detached lilac hairline (QC round 9, T07).
  col *= mix(vec3(1.0), vec3(0.84, 0.87, 1.0), 0.35 * smoothstep(0.88, 0.97, bImp));
  // The rings behind the ball shade its glow where the lens images them (F402 / F453: grey-blue shapes inside the white disc,
  // QC round 10). An emissive volume over a dark background would not darken; the reference's plasma is thin sheets with
  // gaps, so what shows between them is the refracted cage.
  // (The disc sits at 6-16 scene-linear, far up AgX's shoulder: a shape must drop ~5x to read grey, L ~190-210.)
  col *= mix(1.0, mix(uShadeFloor, 1.0, bgShade), uHoldFill.z * (1.0 - fOut));

  // Soft shoulder above 3, then the cap: the plasma's bright tongues keep their structure instead of clipping into
  // a flat bulb (QC round 4: 57 % of the hold orb clipped, uniform white, vs 46 % with grey-teal smoke inside).
  float peak = max(max(col.r, col.g), col.b);
  // (Shoulder at 3 until QC round 5: with it nothing clipped.)
  float pk2 = peak < 6.0 ? peak : 6.0 + (uMaxRadiance - 6.0) * (1.0 - exp(-(peak - 6.0) / max(uMaxRadiance - 6.0, 1e-3)));
  col *= pk2 / max(peak, 1e-4);
  gl_FragColor = vec4(col * cov, cov);
}
`;

/**
 * The emissive glass orb at the heart of the gyroscope. Render `mesh` (layer ORB) after the env +
 * shards into the HDR target. The mesh may be moved or uniformly scaled; the volume follows.
 */
export class Orb {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  /** Extra emission multiplier for choreography (for example the intro), 0..1+. */
  intensity = 1;
  private readonly warpTexture: THREE.Data3DTexture;
  private readonly sheetTexture: THREE.DataTexture;
  /** Blender frame driving the Mapping rotation and the 4D noise W. */
  private frame = 1;
  private speed = 1;
  private gain = 1;

  constructor(gltfScene: THREE.Object3D, shared: SharedUniforms, envDefines: Record<string, string>, quality: QualityProfile["orb"]) {
    const center = new THREE.Vector3().fromArray(HERO_CENTER);
    let radius = ORB_RADIUS;
    const src = gltfScene.getObjectByName(ORB_NAME) as THREE.Mesh | undefined;
    if (src && src.isMesh) {
      gltfScene.updateMatrixWorld(true);
      // GLTFLoader fills boundingSphere from the accessor box (radius = half diagonal, sqrt(3) too
      // large for a sphere); recompute the exact one.
      src.geometry.computeBoundingSphere();
      const bs = src.geometry.boundingSphere!.clone().applyMatrix4(src.matrixWorld);
      center.copy(bs.center);
      radius = bs.radius;
    } else {
      console.warn(`[hero] orb mesh ${ORB_NAME} missing, using config`);
    }

    this.warpTexture = bakeWarp();
    const sheets = bakeSheets();
    this.sheetTexture = sheets.texture;

    const steps = Math.max(2, Math.round(quality.marchSteps));
    const defines: Record<string, string | number> = {
      ...envDefines,
      MARCH_STEPS: steps,
      R_VOL: glslFloat(R_VOL),
      WARP_SCALE: glslFloat((WARP_N - 1) / (2 * R_VOL * WARP_N)),
      NOISE_AMP: glslFloat(NOISE_AMP),
      NOISE_FREQ: glslFloat(NOISE_FREQ),
      SHEET_F: glslFloat(SHEET_F),
      SHEET_MIN: glslFloat((2 * SHEET_F) / (SHEET_NF - 1)),
      SHEET_U_SCALE: glslFloat((SHEET_NF - 1) / (2 * SHEET_F * SHEET_NF)),
      SHEET_V_SCALE: glslFloat((SHEET_NR - 1) / SHEET_NR),
      SHEET_V_BIAS: glslFloat(0.5 / SHEET_NR),
      SHEET_INV_RV2: glslFloat(1 / (R_VOL * R_VOL)),
    };
    if (steps >= 12) defines.ORB_SHELL_DETAIL = "";

    this.material = new THREE.ShaderMaterial({
      name: "rx-orb",
      vertexShader: ORB_VERT,
      fragmentShader: ORB_FRAG,
      defines,
      uniforms: {
        uEnvMap: shared.uEnvMap,
        uEnvIntensity: shared.uEnvIntensity,
        uRefraction: shared.uRefraction,
        uResolution: shared.uResolution,
        uWarp: { value: this.warpTexture },
        uSheets: { value: this.sheetTexture },
        uSheetSlope: { value: sheets.slope },
        uCenter: { value: center.clone() },
        uRadius: { value: radius },
        uToObj: { value: new THREE.Matrix3() },
        uObjToWorld: { value: radius / SHELL_RADIUS_OBJ },
        uRot: { value: new THREE.Vector2(1, 0) },
        uW: { value: 0 },
        uGain: { value: 1 },
        uRim: { value: 0 },
        // The core clips (#feffff in the reference) but keeps its plasma structure at the edge.
        // ~AgX's white point (maxEv 4.03): the core still maps to white, without feeding twice the energy
        // into the bloom (QC round 1: 6.6k clipped pixels around the orb vs 1.7k in the reference).
        uClamp: { value: 16 },
        uMaxRadiance: { value: 16 },
        uShell: { value: 1 },
        uIor: { value: 1.25 },
        uIorLevel: { value: 1 },
        uReflectionPass: { value: 0 },
        // (weight, distance in radii, copy mip, gain): off until tuned (QC round 10).
        uScreenBg: { value: new THREE.Vector4(0, 2.5, 1.5, 1) },
        // (hold fill scale, smoke lane depth, background shading, bright background luminance): as before.
        uHoldFill: { value: new THREE.Vector4(1, 0.72, 0, 1) },
        uShadeFloor: { value: 0.15 },
      },
      // Premultiplied output; alpha is the analytic edge coverage.
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      transparent: false,
      depthWrite: true,
      depthTest: true,
      // Both sides rasterise; the shader keeps the near hemisphere, so any camera winding works.
      side: THREE.DoubleSide,
      forceSinglePass: true,
    });

    this.mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(PROXY_SCALE, 6), this.material);
    this.mesh.name = "orb";
    this.mesh.position.copy(center);
    this.mesh.scale.setScalar(radius);
    this.mesh.layers.set(LAYER.ORB);
    this.mesh.updateMatrixWorld(true);
    this.mesh.onBeforeRender = () => this.syncTransform();
    this.syncTransform();
    this.update(0, 0, 0);
  }

  /**
   * @param dt seconds
   * @param energy 0..1 hover / hold excitement: brightens and speeds up the swirl slightly
   * @param hold 0..1 press-and-hold progress: same, a little stronger
   */
  update(dt: number, energy: number, hold: number) {
    const e = clamp(energy);
    const h = clamp(hold);
    this.speed = damp(this.speed, 1 + 0.25 * e + 0.4 * h, 0.06, dt);
    // A gentle lift only: x1.6 at the hold clipped the orb to a flat bulb (QC round 2). Dollied in (h = 0.5 at the
    // hold), the disc is 1.65x larger and was mostly at the cap: x0.72 there (-0.47 EV), rest and eye unchanged.
    // (x0.72 at the hold until QC round 6: with the hot core, the hold orb had no clipped centre and ~5x fewer bright
    // pixels than F420: x0.85 now.)
    this.gain = damp(this.gain, (1 + 0.1 * e + 0.1 * h) * (1 - 0.3 * h), 0.06, dt);
    this.frame += Math.max(dt, 0) * BLENDER_FPS * this.speed;
    const u = this.material.uniforms;
    u.uW.value = (7.57 * this.frame) / 800;
    const rot = this.frame / 200;
    u.uRot.value.set(Math.cos(rot), Math.sin(rot));
    u.uGain.value = this.gain * Math.max(this.intensity, 0);
    // The hold's luminous outer zone (h = 0.5 at the full hold, as HeroEngine passes camExpand x 0.5).
    u.uRim.value = clamp(2 * h);
  }

  /** On while the mirrored camera renders the hero reflection: no screen copy, half the steps. */
  setReflectionPass(on: boolean) {
    this.material.uniforms.uReflectionPass.value = on ? 1 : 0;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.warpTexture.dispose();
    this.sheetTexture.dispose();
  }

  /** Centre, radius and object frame from the mesh's world matrix (runs before every draw). */
  private syncTransform() {
    const e = this.mesh.matrixWorld.elements;
    const u = this.material.uniforms;
    const sx = e[0] * e[0] + e[1] * e[1] + e[2] * e[2];
    const sy = e[4] * e[4] + e[5] * e[5] + e[6] * e[6];
    const sz = e[8] * e[8] + e[9] * e[9] + e[10] * e[10];
    const s = Math.sqrt(Math.max(sx, sy, sz));
    u.uCenter.value.set(e[12], e[13], e[14]);
    u.uRadius.value = s;
    u.uObjToWorld.value = s / SHELL_RADIUS_OBJ;
    // Inverse rotation and scale, then three (x, y, z) -> Blender (x, -z, y).
    const k = SHELL_RADIUS_OBJ / (s * s);
    u.uToObj.value.set(
      k * e[0], k * e[1], k * e[2],
      -k * e[8], -k * e[9], -k * e[10],
      k * e[4], k * e[5], k * e[6],
    );
  }
}
