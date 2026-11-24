import * as THREE from "three";
import { HERO_CENTER, ORB_NAME, ORB_RADIUS } from "../config";
import { clamp, damp, lerp } from "../math";
import { laneSource } from "../quality";
import { GLSL_COMMON, GLSL_ENV } from "../shaders/chunks";
import { ICE_R10, ICE_R11A } from "./IceMaterial";
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

/**
 * P4 round 1, lane orb (20 Nov, panel P3 tasks Q2 / Q4): `?p4orb=0` turns the whole lane off (MAIN exactly: no ORB_P4 define,
 * MAIN's uniform values and Orb.update gain). Sub-switches: `?orbglass=r11` drops Q2 (the glass lens, rim and hold exposure),
 * `?orbcharge=r11` drops Q4's orb part (the hold's light build-up). T0 never takes it (HeroEngine passes `p4` only on T1 / T2).
 */
const P4Q = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;
export const P4ORB = P4Q?.get("p4orb") !== "0";
const P4_GLASS = P4ORB && P4Q?.get("orbglass") !== "r11";
export const P4_CHARGE = P4ORB && P4Q?.get("orbcharge") !== "r11";
/**
 * P4 round 3, lane orb (21 Nov, rejudge p4orb F2 / R2 / F4): `?p4orb3=0` drops round 3 only (MAIN = int1 byte for byte); `?p4orb=0`
 * drops rounds 1 and 3. Sub-switches: `?orbhit=0` (F2, the plasma's Cycles sample clamp), `?orbrim3=0` (R2, the hold rim).
 */
export const P4ORB3 = P4ORB && P4Q?.get("p4orb3") !== "0";
const P4_HIT = P4ORB3 && P4Q?.get("orbhit") !== "0";
const P4_RIM3 = P4ORB3 && P4Q?.get("orbrim3") !== "0";
/**
 * P4 lane orbd (21 Nov, the client's orb note of 12:40: "jangan kaya cincin sekilas, ada outline tebal ... jadi looks bola ...
 * tinggal pinggirannya aja, gausah ada outline cahaya tebal"): the orb reads as a glass ball whose glow reaches nearly to a thin,
 * soft glass edge (ref F000 / F045 / F402), not a bright disc inside a thick pale outline ring. `?p4orbd=0` turns the lane off
 * (MAIN exactly: no ORB_D define, MAIN's uniforms). Orb.ts only (PostChain / HeroEngine untouched). T1 / T2 with the P4 orb only
 * (T0 unchanged); `?p4orb=0` drops it too.
 */
export const P4ORBD = P4ORB && P4Q?.get("p4orbd") !== "0";

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
#ifdef ORB_R11
// Round 11 (?ice=r10 compiles without it): scales of the fills added over the Cycles plasma (x whole-disc core glow,
// y hot radial core, z cyan limb, w hold outer glow), fitted to the Cycles twin (WORK/LOG.md).
uniform vec4 uR11Orb;
uniform vec4 uR11OrbB;  // x rim pre-filter strength (sheet coverage -> its mean towards the silhouette), y where it starts
                        // (impact parameter / radius; 0 = 0.7, the first round-11 value), z the cyan limb's scale in the hold
                        // (uR11Orb.z is its scale at rest; mixed by uRim)
uniform vec4 uR11OrbC;  // fix round: x the whole-disc core glow in the hold (uR11Orb.x at rest; mixed by uRim), y where the glass-
                        // shell band starts (impact parameter / radius; 0 = 0.88, judged), z where the cyan limb starts
                        // (0 = 0.5, judged), w the limb's inner end (0 = 0.88, judged)
#endif
#ifdef ORB_P4
// P4 lane orb (Q2): x strength of the glass-shell band's lavender multiply (0.35 before), y / z the lens shading's weight / floor
// in the hold (uHoldFill.z / uShadeFloor at rest; mixed by uRim), w where the hold's cool rim tint starts (impact parameter /
// radius).
uniform vec4 uP4Orb;
// Q2 (fix round): the hold's cool tint of the grazing-exit annulus (a multiply, reached at 0.97 of the radius; mixed by uRim).
uniform vec3 uP4Rim;
#endif
#ifdef ORB_P4HIT
// P4 round 3 (F2): Cycles clamps each SAMPLE's volume emission (indirect clamp, r + g + b <= 10) and point-samples the volume once
// per step (procedural volumes: step = 1/10 of the bounds). A sample that lands in a sheet saturates the clamp; one that misses
// adds nothing, so a pixel is E[clamp] = P(hit) x clamp, not clamp(E). x / y: weight at rest / in the hold (mixed by uRim),
// z: 2 / (Cycles step in radii) (the share of a step inside a sheet ~ 2 x its mean coverage), w: the hits' gain over the clamp
// (they sit above AgX's white anyway; it keeps the disc's mean radiance, which the ice reads from the copy, near MAIN's).
uniform vec4 uP4Hit;
// x / y: the hit share's levels (smoothstep lo / hi): the reference's core is bimodal, clipped tongues and lens-image gaps;
// z / w: the model fades out towards the glass edge (impact parameter / radius), where the faint outer shell's sheets would leave
// a dark annulus (F402 glows to ~0.9 of its edge): MAIN's clamp there.
uniform vec4 uP4HitB;
// F2 fixer: x the chord normalisation exponent (0 = the hits' total along the chord; 1 = their mean, so the gaps follow the field,
// not the chord length), y the chord (radii) where both agree, z the hold weight (uRim) at which the model is fully on (0 = linear).
uniform vec4 uP4HitC;
#endif
#ifdef ORB_P4RIM
// P4 round 3 (R2): the hold rim. x the band lift (0.86-0.96 R), y where the hairline peaks (impact parameter / radius), z its width,
// w its strength; uP4RimC the hairline's lavender colour (added).
uniform vec4 uP4RimB;
uniform vec3 uP4RimC;
#endif
#ifdef ORB_D
// P4 lane orbd: the glass ball. uOD: the glow that carries the core's light out to the limb (x strength over uGain at rest; the
// hold's: 3.6, y full until, z zero at (impact parameter / radius), w modulation depth by the plasma's smoke and the limb field);
// it lifts the pale gap between the core and the edge up to
// the glow (a max, so the plasma's own structure stays where it is brighter). uODE: the glass edge's thin dark line (x centre,
// y half-width, z depth toward uODC) and w where the outer zone starts at rest (odOut; the hold's: 0.93; also the start of the
// hold's cool tint). uODK: MAIN's outline terms kept (x cyan limb, y rim desaturation, z the hold's band lift + hairline, w the
// plasma emission and the TIR pass in the outer zone).
uniform vec4 uOD;
uniform vec4 uODE;
uniform vec3 uODC;
uniform vec4 uODK;
// uODB: the clear glass edge beyond the glow (x its weight, rising from uODE.w to w (impact parameter / radius), y the scene
// behind, z the reflection).
uniform vec4 uODB;
// (No smoke of its own: the lane's smoke level after the shoulder was invisible, <= 169 px > 8 L, judge orbd-J1; the idle
// orb's internal structure is p4o4's R4-Q10.)
#endif
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
#ifdef ORB_R11
  // Rays that graze the thin emission sheets near the silhouette hit or miss them pixel by pixel (coloured speckle);
  // Cycles averages them over its samples into a smooth edge: towards the rim the sheet coverage tends to its mean.
  float rimSm = uR11OrbB.x * smoothstep(uR11OrbB.y > 0.0 ? uR11OrbB.y : 0.7, 0.95, bImp);
  vec4 smRim = sheetMean(-0.75, 0.75, h / S);
#endif
#ifdef ORB_P4HIT
  float lam = 0.0;   // sum of mean sheet coverage x path length (metres) along the chord
#endif
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
#ifdef ORB_R11
      sm = mix(sm, smRim, rimSm);
#endif
#ifdef ORB_P4HIT
      lam += sm.a * ds;
#endif
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
#ifdef ORB_P4HIT
  // Expected clamped sample: Poisson hits with mean lam * z / R; every hit in the plasma saturates the clamp, so the pixel is
  // P(hit) x limit (or the unclamped mean when that is smaller). Rays that cross no sheet show the lens image of the scene: the
  // dark refracted structure inside F402 / F453's clipped core (clamp(E) filled the whole hold disc at the cap, HDR p50 ~10).
  float hitW = mix(uP4Hit.x, uP4Hit.y, uP4HitC.z > 0.0 ? smoothstep(0.0, uP4HitC.z, uRim) : uRim) * (1.0 - smoothstep(uP4HitB.z, uP4HitB.w, bImp));
  float chordN = pow(uP4HitC.y * R / max(2.0 * w, 1e-3 * R), uP4HitC.x);
  float pHit = smoothstep(uP4HitB.x, uP4HitB.y, 1.0 - exp(-lam * chordN * uP4Hit.z / R)) * uP4Hit.w;
  float eSum = emit.r + emit.g + emit.b;
  col = mix(col, emit * min(1.0, limit * pHit / max(eSum, 1e-6)), hitW);
#endif
#ifdef ORB_D
  // The glass zone beyond the glow: the grazing chords cross only the plasma's faint outer shell, whose ramp end is deep blue
  // (without MAIN's limb fills over it, a saturated blue ring). The ball's edge shows the scene through the glass instead.
  // (In the hold the glow reaches further out, F402: mint-white to ~0.93 of the glass, then a thin line.)
  float odOut = smoothstep(mix(uODE.w, 0.93, uRim), mix(uODB.w, 0.975, uRim), bImp);
  col *= mix(1.0, uODK.w, odOut);
#endif
  if (chain > 1.001 && w > 0.0) {
    float rEff = sqrt(h * h + w * w / 3.0) / S;
    float c = 0.2 + 0.8 / (5.07 * max(rEff, 0.008));
    vec4 sm = sheetMean(-0.75, 0.75, rEff);
    float sigma = c * sm.a;
    float len = 2.0 * w;
    vec3 eps = (1000.0 * c * uGain) * sm.rgb;
    vec3 inner = clampSample(eps * (sigma > 1e-4 ? (1.0 - exp(-sigma * len)) / sigma : len), limit);
#ifdef ORB_P4HIT
    vec3 innerRaw = eps * (sigma > 1e-4 ? (1.0 - exp(-sigma * len)) / sigma : len);
    float pIn = smoothstep(uP4HitB.x, uP4HitB.y, 1.0 - exp(-sm.a * len * chordN * uP4Hit.z / R)) * uP4Hit.w;
    inner = mix(inner, innerRaw * min(1.0, limit * pIn / max(innerRaw.r + innerRaw.g + innerRaw.b, 1e-6)), hitW);
#endif
    // Bounced light mixes the whole ball's colours: mostly neutral, a little of the ramp.
    inner = mix(vec3(dot(inner, vec3(0.2126, 0.7152, 0.0722))), inner, 0.4);
#ifdef ORB_D
    // (A neutral, structureless fill that is strongest at the rim (chain -> 2): part of the flat pale band.)
    col += inner * (chain - 1.0) * mix(1.0, uODK.w, odOut);
#else
    col += inner * (chain - 1.0);
#endif
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
#ifdef ORB_D
  // The glass edge is clear (F045 / F000 / F402: the scene shows right up to a thin line at the silhouette): beyond the glow the
  // ball shows what is behind it (the refracted sample, near the rim the scene just behind the edge) and a little of its
  // reflection, instead of MAIN's pale fills (the bright outline) or the bare TIR zone (a dark grey ring once they are gone).
  col = mix(col, bg * uODB.y + refl * uODB.z, uODB.x * odOut);
#endif
  // Grazing paths run through the plasma's low-density shell, where the ramp is deep blue; the
  // reference rim reads pale and soft, so the colour fades towards neutral at the silhouette.
  float rimK = smoothstep(0.55, 1.0, bImp);
#ifdef ORB_D
  col = mix(col, vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), 0.25 * uODK.y * rimK);
#else
  col = mix(col, vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), 0.25 * rimK);
#endif
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
#ifdef ORB_R11
  // (Fix round, uR11OrbC.x: in the hold the bare plasma read busy, sd 37 vs F420's 15 and the twin's 29, judge 1 (f); a part of
  // the round-10 core glow evens it out there. Rest keeps uR11Orb.x.)
  col += mix(vec3(0.62, 1.0, 0.90), vec3(0.80, 1.0, 0.95), coreK * coreK * coreK) * 1.1 * uGain * coreK * smokeK * (1.0 - fIn) * holdFill * mix(uR11Orb.x, uR11OrbC.x, uRim);
  col += vec3(0.85, 1.0, 0.97) * 2.6 * uGain * pow(1.0 - smoothstep(0.0, mix(0.6, 0.8, uRim), bImp), 2.0) * smokeK * (1.0 - fIn) * uR11Orb.y;
#else
  col += mix(vec3(0.62, 1.0, 0.90), vec3(0.80, 1.0, 0.95), coreK * coreK * coreK) * 1.1 * uGain * coreK * smokeK * (1.0 - fIn) * holdFill;
  // (x4.0 within 0.55 until QC round 9: ~10 scene-linear, a fully exposed disc above the tone curve's shoulder.)
  col += vec3(0.85, 1.0, 0.97) * 2.6 * uGain * pow(1.0 - smoothstep(0.0, mix(0.6, 0.8, uRim), bImp), 2.0) * smokeK * (1.0 - fIn);
#endif
  float vein = (1.0 - smoothstep(0.0, 3.5, emL)) * smoothstep(0.15, 0.55, coreK);
  col *= mix(vec3(1.0), vec3(0.5, 0.64, 0.66), vein * 0.8);
  // A luminous cyan limb and a thin additive lilac band at the glass edge (the grey rimTint multiply, a lilac / mint
  // tint over rimG, read as a chrome shell, QC round 6).
#ifdef ORB_R11
#ifdef ORB_D
  // (The cyan limb, a flat bright annulus at 0.7-0.97 R: the "thick light outline". Replaced by the glow below.)
  col += vec3(0.70, 1.0, 0.94) * uGain * (0.28 + 0.4 * uRim) * smoothstep(uR11OrbC.z > 0.0 ? uR11OrbC.z : 0.5, uR11OrbC.w > 0.0 ? uR11OrbC.w : 0.88, bImp) * (1.0 - smoothstep(0.965, 1.0, bImp)) * (1.0 - fIn) * mix(uR11Orb.z, uR11OrbB.z, uRim) * uODK.x;
  // The ball's glow carried out to the limb: the reference's glass glows white nearly to its edge (F045, glass radius ~66 px: L
  // >= 248 to ~6 px inside the edge line, a ~4 px fall, a ~3 px darker line), the engine's plasma fades by ~0.75 R and left a
  // pale ~15 px glass band around a smaller bright disc. A target level, modulated by the smoke field so the limb is not a flat
  // ring, raised only where the pixel is dimmer (the plasma keeps its own brighter structure); 0 inside ~0.5 R (0.6 in the hold;
  // the core's own structure stays) and past uOD.z.
  // (The limb's own variation: a 2-octave field on the glass in the plasma's Mapping frame, so it drifts with the swirl; its
  // reach varies too, so the glow's edge is not a perfect circle.)
  float odN = smoothstep(0.25, 0.75, 0.5 + 0.5 * fbm(orbMapping(o) * 9.0 + vec3(0.0, 0.0, uW * 0.5), 2));
  // (In the hold the ramp starts further out: F402's dark central figure (the hit model's gaps) stays inside ~0.6 R.)
  float odR = smoothstep(mix(0.5, 0.6, uRim), mix(0.72, 0.78, uRim), bImp) * (1.0 - smoothstep(mix(uOD.y, 0.9, uRim) - 0.03 * odN, mix(uOD.z, 0.975, uRim) - 0.02 * odN, bImp));
  // (At rest: mint (the core's G > B > R) to 0.8 R, then a faint cyan-violet towards the edge: the cyan-white (0.62, 0.93, 1.0)
  // x 3.6 sat on AgX's shoulder as near-neutral white (B-R 10 at 0.85 R vs F000 22) and lifted the rest box's >= 245 count +17-28
  // %, judge orbd-J2; x uOD.x 3.0 keeps it within the R4-Q10 guard, count +-10 %, tint +-2 of MAIN, plasma frames 600 / 1500 /
  // 2400. In the hold (uRim 1) the cyan-white x 3.6 as before (the finding is about the idle orb; the rest colour there dimmed the
  // hold limb at 0.9-0.95 R by 3-4 L and made it bluer, toward the pale band the client asked to remove).)
  float odF = smoothstep(0.74, 0.95, bImp);
  vec3 odT = mix(mix(vec3(0.45, 0.92, 0.88), vec3(0.45, 0.68, 1.0), odF), mix(vec3(0.62, 0.93, 1.0), vec3(0.5, 0.8, 1.0), odF), uRim) * (mix(uOD.x, 3.6, uRim) * uGain * mix(1.0, 1.0 - uOD.w, max(smoke, odN))) * (1.0 - fIn);
  col = mix(col, max(col, odT), odR);
#else
  col += vec3(0.70, 1.0, 0.94) * uGain * (0.28 + 0.4 * uRim) * smoothstep(uR11OrbC.z > 0.0 ? uR11OrbC.z : 0.5, uR11OrbC.w > 0.0 ? uR11OrbC.w : 0.88, bImp) * (1.0 - smoothstep(0.965, 1.0, bImp)) * (1.0 - fIn) * mix(uR11Orb.z, uR11OrbB.z, uRim);
#endif
#else
  col += vec3(0.70, 1.0, 0.94) * uGain * (0.28 + 0.4 * uRim) * smoothstep(0.5, 0.88, bImp) * (1.0 - smoothstep(0.965, 1.0, bImp)) * (1.0 - fIn);
#endif
  // In the hold the outer zone glows (QC round 8, orb CRITICAL: the cap and lower arc that show around the bands read as an
  // empty glass shell / soap bubble; F420's orb glows white-mint to its rim). Zero at rest.
  // (0.35 + limb 0.3: the p06 cap L210 -> 221; target >= 235.)
#ifdef ORB_R11
  col += vec3(0.75, 1.0, 0.95) * 0.6 * uGain * smoothstep(0.55, 0.8, bImp) * (1.0 - smoothstep(0.93, 0.99, bImp)) * (1.0 - fIn) * uRim * holdFill * uR11Orb.w;
#else
  col += vec3(0.75, 1.0, 0.95) * 0.6 * uGain * smoothstep(0.55, 0.8, bImp) * (1.0 - smoothstep(0.93, 0.99, bImp)) * (1.0 - fIn) * uRim * holdFill;
#endif
  // A mild glass-shell band instead of the detached lilac hairline (QC round 9, T07).
#ifdef ORB_R11
  // (Fix round, uR11OrbC.y: the twin's and F045's rim is a thin iridescent line, 2-3 px; from 0.88 the band read as a broad
  // lavender limb, judge 1 (f).)
  float shell0 = uR11OrbC.y > 0.0 ? uR11OrbC.y : 0.88;
#ifdef ORB_P4
  // (Q2: 0.35 drew the lavender-blue outline of the "white plate"; F045's rim ramps mint-aqua, uP4Orb.x.)
  col *= mix(vec3(1.0), vec3(0.84, 0.87, 1.0), uP4Orb.x * smoothstep(shell0, max(0.97, shell0 + 0.02), bImp));
  // (Q2 fix round: in the hold the grazing exits read the scene through the lens, a pale neutral-grey annulus around the glow, B-R
  // +15 vs the ice's ~+29 and F402's +25..+28, judge p4orb F1; a cool tint there, uP4Rim from uP4Orb.w, mixed by uRim.)
#ifdef ORB_D
  // (From 0.75 R the hold's cool multiply turned the whole outer quarter into a blue-grey band around the glow: the edge only.)
  col *= mix(vec3(1.0), uP4Rim, uRim * smoothstep(max(uP4Orb.w, uODE.w), 0.985, bImp));
#else
  col *= mix(vec3(1.0), uP4Rim, uRim * smoothstep(uP4Orb.w, 0.97, bImp));
#endif
#else
  col *= mix(vec3(1.0), vec3(0.84, 0.87, 1.0), 0.35 * smoothstep(shell0, max(0.97, shell0 + 0.02), bImp));
#endif
#else
  col *= mix(vec3(1.0), vec3(0.84, 0.87, 1.0), 0.35 * smoothstep(0.88, 0.97, bImp));
#endif
  // The rings behind the ball shade its glow where the lens images them (F402 / F453: grey-blue shapes inside the white disc,
  // QC round 10). An emissive volume over a dark background would not darken; the reference's plasma is thin sheets with
  // gaps, so what shows between them is the refracted cage.
  // (The disc sits at 6-16 scene-linear, far up AgX's shoulder: a shape must drop ~5x to read grey, L ~190-210.)
#ifdef ORB_P4
  // (Q2: in the hold (uRim) the lens shades deeper, uP4Orb.y / z: F402's dark branching structure inside the dollied-in, clipped
  // disc; the rest keeps uHoldFill.z / uShadeFloor, so its level stays near MAIN's.)
  // (It fades out over the glass zone beyond the plasma ball, 0.85-0.97 R: shaded there, the shell read as a ~10 px grey bezel
  // around the glow, batch v8; F402 / F045 glow nearly to a thin edge.)
#ifdef ORB_D
  // (Not over the limb glow and the clear glass edge: shaded there (the dark cage behind, imaged by the lens) the limb read as a
  // grey trough ring around the hold orb.)
  col *= mix(1.0, mix(mix(uShadeFloor, uP4Orb.z, uRim), 1.0, bgShade), mix(uHoldFill.z, uP4Orb.y, uRim) * (1.0 - fOut) * (1.0 - smoothstep(0.72, 0.88, bImp)));
#else
  col *= mix(1.0, mix(mix(uShadeFloor, uP4Orb.z, uRim), 1.0, bgShade), mix(uHoldFill.z, uP4Orb.y, uRim) * (1.0 - fOut) * (1.0 - smoothstep(0.85, 0.97, bImp)));
#endif
#else
  col *= mix(1.0, mix(uShadeFloor, 1.0, bgShade), uHoldFill.z * (1.0 - fOut));
#endif
#ifdef ORB_P4RIM
  // (R2, hold only: F402 glows mint-white nearly to its glass edge, (235-244, 253-255, 252-255) at 0.9-0.95 of its bright radius,
  // then a thin pale lavender line, R ~ G < B, (223-229, 225-232, 250-252) at the lower left; the lane's band read 10-15 L dimmer
  // and its hairline grey-blue (197, 211, 230).)
  float bandK = smoothstep(0.78, 0.88, bImp) * (1.0 - smoothstep(0.95, 0.985, bImp));
#ifdef ORB_D
  // (The hold's band lift and lavender hairline drew the bright outline ring of the hold orb: uODK.z.)
  col += vec3(0.86, 1.0, 0.98) * uP4RimB.x * uGain * bandK * (1.0 - fIn) * uRim * uODK.z;
  float hairK = exp(-pow((bImp - uP4RimB.y) / uP4RimB.z, 2.0)) * uRim;
  col += uP4RimC * uP4RimB.w * uGain * hairK * uODK.z;
#else
  col += vec3(0.86, 1.0, 0.98) * uP4RimB.x * uGain * bandK * (1.0 - fIn) * uRim;
  float hairK = exp(-pow((bImp - uP4RimB.y) / uP4RimB.z, 2.0)) * uRim;
  col += uP4RimC * uP4RimB.w * uGain * hairK;
#endif
#endif
#ifdef ORB_D
  // The glass edge: a thin, soft darker line just inside the silhouette (F045: 10-30 L under the scene behind, ~3 px; blue),
  // instead of a bright outline.
  col *= mix(vec3(1.0), uODC, uODE.z * exp(-pow((bImp - uODE.x) / uODE.y, 2.0)));
#endif

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
  /** P4 lane orb on this tier (HeroEngine: T1 / T2 without `?p4orb=0`): Q2's hold exposure (see update). */
  private readonly p4Glass: boolean;
  /**
   * Q2: the hold's exposure cut per unit of `hold` (0.3 = MAIN; only with the lane on; a live knob). (Fix round: the builder's 1.1,
   * x0.45 at the full hold, made the open hold orb an unclipped grey plate, judge p4orb F1.)
   */
  holdCut = 0.3;

  /** @param opts.p4 P4 lane orb (T1 / T2 only; HeroEngine) */
  constructor(gltfScene: THREE.Object3D, shared: SharedUniforms, envDefines: Record<string, string>, quality: QualityProfile["orb"], opts: { p4?: boolean } = {}) {
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
    // Round 11 with the round-11 ice: not with ?ice=r10. T0 (orb march steps 8) joins it through quality.r11 since 19 Nov
    // (phones showed the round-10 hero); `?t0ice=r10` keeps T0 on round 10.
    const orbR11 = !ICE_R10 && (quality.marchSteps > 8 || quality.r11 === true);
    if (orbR11) defines.ORB_R11 = "";
    // P4 lane orb, Q2 (with the round-11 orb only): the glass lens, rim and hold exposure.
    const p4 = orbR11 && !!opts.p4 && P4_GLASS;
    if (p4) defines.ORB_P4 = "";
    this.p4Glass = p4;
    // P4 round 3 (T1 / T2 with the round-11 orb, like round 1): F2 the expected clamped sample, R2 the hold rim.
    const p4Hit = orbR11 && !!opts.p4 && P4_HIT;
    const p4Rim = orbR11 && !!opts.p4 && P4_RIM3;
    if (p4Hit) defines.ORB_P4HIT = "";
    if (p4Rim) defines.ORB_P4RIM = "";
    // P4 lane orbd (T1 / T2 with the round-11 P4 orb): the glass ball, see P4ORBD.
    const orbD = p4 && P4ORBD;
    if (orbD) defines.ORB_D = "";

    this.material = new THREE.ShaderMaterial({
      name: "rx-orb",
      vertexShader: ORB_VERT,
      // (P4: off, the ORB_P4 blocks are resolved away, so the source is MAIN's byte for byte; round 3 likewise.)
      fragmentShader: laneSource(laneSource(laneSource(laneSource(ORB_FRAG, "ORB_D", orbD), "ORB_P4HIT", p4Hit), "ORB_P4RIM", p4Rim), "ORB_P4", p4),
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
        // (P4 Q2: on, T1 / T2. The far half of the cage is in the copy (RenderPipeline), so the lens shows the rings behind the
        // ball inverted inside it (F402 / F453) and the grazing exits read the scene, not the panorama's deep blue: the dark
        // cobalt limb. Mip >= 2: a sharper copy draws the near rings' edges as busy teeth at the limb.)
        uScreenBg: { value: p4 ? new THREE.Vector4(0.65, 2.5, 2.0, 1) : new THREE.Vector4(0, 2.5, 1.5, 1) },
        // (hold fill scale, smoke lane depth, background shading, bright background luminance): as before.
        // (P4 Q2: z 0.5, the refracted cage shades the glow grey-blue, F402 / F453's nucleus; floor 0.35.)
        uHoldFill: { value: p4 ? new THREE.Vector4(1, 0.72, 0.5, 1) : new THREE.Vector4(1, 0.72, 0, 1) },
        uShadeFloor: { value: p4 ? 0.35 : 0.15 },
        ...(p4
          ? {
              // Q2 (ORB_P4): x lavender multiply 0.35 -> 0.15; y / z the hold's lens shading weight / floor (rest: uHoldFill.z 0.5 /
              // uShadeFloor 0.35); w where the hold's cool rim tint starts.
              // (Fix round, judge p4orb F1-F3: the builder's hold exposure cut (gain x(1 - 1.1 h), shoulder 4, sheet pre-filter 0.5)
              // turned the open hold orb into a flat unclipped grey-cream plate (box241 clipped 17.6 % -> 0 %, F402 16.2 %) and
              // dimmed the ice around it 3-4 L. The hold tone is MAIN's again; the glass reads through the lens shading inside the
              // clipped core instead of a global cut. The R / B dispersion taps (invisible at copy mip 2) are gone.)
              // (Fix round, deterministic A/B at the judge's open-orb p05 (ring clock 3.3 at the hold start; MAIN 17.6 / 13.0 % of
              // the orb box >= 248 / >= 250, F402 16.2 / 14.3 %), batches ab3-ab7: hold lens 0.8 / 0.25 with the skirt at K2 (PostChain
              // holdGlowK) 19.3 / 14.4 %, disc sd 19; 1.0 / 0.12 shaded the orb's copy and the ice around the half-hidden hold orb read
              // 0.4-1.4 L under MAIN's (judge F3 setup). The cool rim tint from 0.75 R: annulus 0.85-1.02 R B-R +22 -> +27, F402
              // +25..+28; (0.9, 0.98, 1.08) from 0.8 moved it by 1.)
              uP4Orb: { value: new THREE.Vector4(0.15, 0.8, 0.25, 0.75) },
              uP4Rim: { value: new THREE.Vector3(0.8, 0.93, 1.15) },
            }
          : {}),
        // P4 round 3 (F2): uP4Hit (weight at rest, weight in the hold, 2 / Cycles step in radii, the hits' gain over the clamp),
        // uP4HitB (levels lo / hi, fade towards the edge from / to). Rest unchanged (weight 0).
        // (Paired deterministic captures, ring clock 3.3 = the open hold orb, interior r < 0.75 R, crystals masked; MAIN -> lane,
        // F402: p05 share < 215 L 13.9 -> 19.1 % (21.7), < 235 26.9 -> 36.8 % (37.1), sd 21.2 -> 22.9 (24.4), box241 >= 248 18.9 ->
        // 13.3 % (16.2); HDR p50 inside 0.75 R ~10 (the cap) -> bimodal. Gain 1: the ice ring around the orb -0.7 L and the band in
        // front of the hidden orb -9 L (the orb's copy dimmer); gain 3 keeps them at -0.4 / -4 (the hits sit above AgX's white,
        // compressed by the shoulder). Levels 0.1 / 0.45 -> 0.15 / 0.5 and the hold core glow 0.4 -> 0.25 (uR11OrbC.x): the gaps
        // read as gaps. Without the edge fade the faint outer shell left a dark annulus inside the rim.)
        // (F2 fixer, judge p4orb3: the total along the chord made the long central chords clip and the gaps a ring at 0.5-0.8 R, the
        // radial inverse of F402's dark central figure inside a disc clipped to ~0.86 R. uP4HitC.x 1 = the mean coverage along the
        // chord (the gaps follow the field), the scale 10 -> 5.5 (the centre no longer saturates by length), the fade to MAIN's clamp
        // 0.7-0.95 -> 0.45-0.67 R (the outer disc at the clamp, as F402 / F453), the gain 3 -> 8 (the copy's mean, which the ice
        // reads), and the model full from uRim 0.5 (the release F453 shows the figure; it was 0.24 of it at p07). Fresh-page pairs
        // vs MAIN in LOG.md, F2 fixer.)
        ...(p4Hit ? { uP4Hit: { value: new THREE.Vector4(0, 1, 5.5, 8) }, uP4HitB: { value: new THREE.Vector4(0.15, 0.5, 0.45, 0.67) }, uP4HitC: { value: new THREE.Vector4(1, 1.68, 0.5, 0) } } : {}),
        // P4 round 3 (R2): (band lift, hairline centre, width, strength) and the hairline's lavender colour. (Batches e6-e8: a band
        // lift of 1.6-2.2 drew a uniform white ring around the structured core; 0.6 with the hit model faded out towards the edge
        // keeps the glow continuous: p05 band 0.86-0.96 R L 228 -> 238 (F402 245), hairline 0.97-1.0 R (197, 211, 230) -> (228, 231,
        // 243), R ~ G < B as F402's lower-left line.)
        ...(p4Rim ? { uP4RimB: { value: new THREE.Vector4(0.6, 0.975, 0.02, 1.4) }, uP4RimC: { value: new THREE.Vector3(0.62, 0.55, 1.0) } } : {}),
        // P4 lane orbd (ORB_D): the glow to the limb (strength, full until, zero at, smoke depth), the edge line (centre, half-width,
        // depth, outer-zone fade start) and its tint, MAIN's outline terms kept (cyan limb, rim desaturation, hold band lift +
        // hairline, plasma + TIR pass in the outer zone) and the clear edge (weight, scene behind, reflection, end of the fade).
        // (Paired fresh-page captures vs ?p4orbd=0 and the reference, WORK/LOG.md.)
        ...(orbD
          ? {
              uOD: { value: new THREE.Vector4(3.0, 0.84, 0.96, 0.45) },
              uODE: { value: new THREE.Vector4(0.975, 0.015, 0.4, 0.88) },
              uODC: { value: new THREE.Vector3(0.5, 0.62, 0.92) },
              uODK: { value: new THREE.Vector4(0, 0.5, 0, 0.15) },
              uODB: { value: new THREE.Vector4(1, 1, 0.5, 0.965) },
            }
          : {}),
        // Round 11 (ORB_R11): scales of the core glow, hot core, limb and hold glow over the Cycles plasma. All 0: the Cycles
        // twin's orb (the artist's magick_ball_01.002) is clear glass with plasma tongues, no added glow; with them the orb
        // read as a white disc (twin / engine L sd: q00 224 / 31 vs 236 / 19, p06 231 / 30 vs 246 / 10; batch s15).
        // (z 0.5 at rest since batch s36: the rim read as a thick saturated lavender band; orb L / sd q00 230 / 33 -> 235 / 24,
        // F000 233 / 24; q03 229 / 32 -> 234 / 23, F045 239 / 21. The hold keeps 0 (uR11OrbB.z): 0.5 there made a white disc,
        // p06 240 / 20, batch s37.)
        // (Fix round: these exist only when ORB_R11 is compiled, i.e. never with ?ice=r10 or on T0.)
        ...(orbR11
          ? {
              // (Fix round: z 1 with the limb narrowed to 0.7-0.9 of the radius (uR11OrbC.z / w): the lavender-grey limb at rest
              // turns into the twin's bright disc with a thin rim; q03 orb L / sd 236.3 / 21.3 -> 238.6 / 17.1, twin 240.5 / 21.8,
              // F045 240.3 / 19.6; batch f15. ?ice=r11a keeps 0.5 over 0.5-0.88.)
              uR11Orb: { value: new THREE.Vector4(0, 0, ICE_R11A ? 0.5 : 1.0, 0) },
              // x 1: the rim pre-filter on (without the fills the sheets' per-pixel speckle at the silhouette shows; batch s16).
              // (P4 Q2: z 1 = the rest's uR11Orb.z, the mint limb in the hold too: without it the hold's limb showed the plasma's
              // deep-blue grazing end, the cobalt ring around the "white plate"; F045 / F420 ramp mint-aqua into the glow.)
              uR11OrbB: { value: new THREE.Vector4(1, 0, p4 ? 1 : 0, 0) },
              // Fix round (judge 1, finding f): x hold core glow, y glass-shell band start, z / w cyan limb start / inner end.
              // ?ice=r11a (the judged build): all 0.
              // (P4 Q2: y 0.95 -> 0.975, the iridescent line thinner.)
              // (P4 round 3, F2: the hold core glow x 0.4 -> 0.25 with the hit model, so its gaps are not filled in.)
              uR11OrbC: { value: ICE_R11A ? new THREE.Vector4(0, 0, 0, 0) : new THREE.Vector4(p4Hit ? 0.25 : 0.4, p4 ? 0.975 : 0.95, 0.7, 0.9) },
            }
          : {}),
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
    // (P4 Q2: x(1 - holdCut h); fix round: holdCut as MAIN's 0.3 by default, see holdCut.)
    this.gain = damp(this.gain, (1 + 0.1 * e + 0.1 * h) * (1 - (this.p4Glass ? this.holdCut : 0.3) * h), 0.06, dt);
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
