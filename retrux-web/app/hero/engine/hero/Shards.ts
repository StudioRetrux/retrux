import * as THREE from "three";
import { HERO_CENTER, ORB_RADIUS, SHARD_BELT_NAMES, WATER } from "../config";
import { clamp, lerp, smoothstep } from "../math";
import { GLSL_COMMON, GLSL_ENV } from "../shaders/chunks";
import { LAYER, type QualityProfile } from "../types";
import type { SharedUniforms } from "../uniforms";

/**
 * The cobalt crystal swarm around the gyroscope.
 *
 * The 18 authored crystals (Blender Cube.009 / Cube.010, two tilted belts of 9) are kept and topped up
 * with procedural crystals on the same belts and on a looser outer swirl. Everything is merged into one
 * non-indexed geometry (flat facet normals, per-vertex crystal data): one draw call, all motion in the
 * vertex shader. The CPU only advances wrapped phases, so speed changes never make anything jump.
 *
 * Shading follows the Blender material (Principled, transmission 1, IOR 1.5, base colour
 * (0.107, 0.234, 1.0)): Beer-Lambert absorption against the base colour along an estimated path,
 * last frame's scene copy seen through a bent exit ray, PMREM reflection, GGX sun glints, the low sun
 * behind the hero as back-light, light from the orb, and lighter crystal ridges.
 */

const TAU = Math.PI * 2;

/**
 * Belt speed: one turn per 4.03 s reference loop (the ring speeds are commensurate with it). The dense
 * optical flow of the idle loop gives a median shard speed of 9.9 px/frame at 30 fps (p90 14.5) at
 * 1440 px, which is what belts of ~3.4 m radius seen from 21 m produce at this rate.
 */
const BELT_RATE = TAU / 4.03;

/** The shard clock wraps every CLOCK_PERIOD s; every clock-driven motion is an integer harmonic of it. */
const CLOCK_PERIOD = 60;
const CLOCK_W = TAU / CLOCK_PERIOD;
const ROCK_W = 9 * CLOCK_W;
const BOB_W = 5 * CLOCK_W;
const BREATH_W = 6 * CLOCK_W;

/** Orbit speed factor at full hold: the swarm hangs in the air while it spreads out. */
const HOLD_SLOW = 0.35;
/** Lowest height of a crystal centre (soft floor), metres above the lake. */
const FLOOR_Y = WATER.level + 0.45;

type Orbit = {
  /** Radius factor applied to the authored layout. */
  radiusScale: number;
  /** Initial phase, rad. */
  phase: number;
  /** Angular speed in units of BELT_RATE. */
  rate: number;
  /** Extra radius at full hold; larger for outer orbits, so spreading out never closes a gap. */
  spread: number;
};

/**
 * Belt A (Cube.009), belt B (Cube.010) and the procedural swirl. The authored belts cross along the view
 * axis. Turning both the same way at the same rate, with B 13 deg ahead and 18 % wider than A, keeps every
 * pair of authored crystals >= 0.18 m apart over a whole turn (capsule test, robust to +-3 deg); equal
 * radii or counter-rotation make crystals pass through each other at the crossing.
 */
// Tracked front-of-belt crystals in the reference move 29-33 px/frame in opposite directions:
// the belts counter-rotate at ~0.49 rev/s (two turns per 4 s loop). B stays 13 deg out of phase
// and 18 % wider so the crossings read as passes rather than collisions.
const ORBITS: Orbit[] = [
  { radiusScale: 0.97, phase: 0, rate: 2, spread: 0.36 },
  { radiusScale: 1.15, phase: THREE.MathUtils.degToRad(13), rate: -2, spread: 0.42 },
  { radiusScale: 1, phase: 0.6, rate: 0.5, spread: 0.45 },
];
const SWIRL = 2;
/**
 * Outer swirl: a thick band rising ~7 deg to the right (between belt A at -15 deg and B at +25 deg) and
 * opened ~12 deg towards the camera; flat enough to stay above the lake when spread out.
 */
const SWIRL_AXIS = new THREE.Vector3(-0.12, 0.97, 0.21).normalize();
const SWIRL_RADIUS = [4.15, 4.7] as const;
const SWIRL_HEIGHT = 0.45;

/** Belt normals and origin measured in the .blend (three.js frame), used if the GLB nodes are missing. */
const FALLBACK_BELT_NORMALS = [new THREE.Vector3(0.26429, 0.96444, 0), new THREE.Vector3(-0.41748, 0.90869, 0)];
const FALLBACK_BELT_ORIGIN = new THREE.Vector3(0, 2.946589, -8.940067);
const AUTHORED_RADIUS = 3.36;

/** Placement of procedural crystals: samples over two belt turns, required gap between capsules (m). */
const SAMPLES = 180;
const MARGIN = 0.12;
const TRIES = 28;
/** Triangles meeting at less than this angle are halves of one facet (no ridge between them). */
const RIDGE_COS = Math.cos(THREE.MathUtils.degToRad(12));

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

const SHARD_VERT = /* glsl */ `
${GLSL_COMMON}
uniform vec3 uBeltAxis[3];
uniform vec3 uBeltOrigin[3];
uniform vec3 uBeltSpread;
uniform vec3 uOrbit;
uniform float uClock;
uniform float uHold;
uniform float uShatter;
uniform float uContract;   // camera dolly progress (0 at rest)
uniform vec2 uResolution;
attribute vec3 aPivot;   // crystal centre relative to its orbit origin, phase 0
attribute vec3 aAxis;    // long axis
attribute vec4 aShard;   // seed, orbit id, spin (rad per clock second), half length (m)
attribute float aRadius; // largest distance of the surface from the long axis (m)
attribute vec3 aBary;    // barycentrics, non-ridge edges offset by 1
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vRestNormal;
varying vec3 vLocal;
varying vec3 vAxis;
varying vec3 vBary;
varying vec4 vShard;     // seed, 1 / radius, projected length (px), variation
varying vec3 vOrbPos;

const float ROCK_W = ${ROCK_W.toFixed(6)};
const float BOB_W = ${BOB_W.toFixed(6)};
const float BREATH_W = ${BREATH_W.toFixed(6)};
const float FLOOR_Y = ${FLOOR_Y.toFixed(3)};

// Rodrigues rotation of v about the unit axis k.
vec3 rotateAbout(vec3 v, vec3 k, float a) {
  float c = cos(a);
  float s = sin(a);
  return v * c + cross(k, v) * s + k * (dot(k, v) * (1.0 - c));
}

void main() {
  float seed = aShard.x;
  int orbit = int(aShard.y + 0.5);
  vec3 axisO = uBeltAxis[orbit];
  float phase = orbit == 0 ? uOrbit.x : (orbit == 1 ? uOrbit.y : uOrbit.z);
  float spreadK = orbit == 0 ? uBeltSpread.x : (orbit == 1 ? uBeltSpread.y : uBeltSpread.z);
  vec3 h = hash33(vec3(seed * 97.0, seed * 57.0 + 3.1, seed * 31.0 + 7.7));

  // Shatter: each crystal leaves a little later (h.x) and decelerates (cubic ease-out).
  float d = h.x * 0.35;
  float s = smoothstep(d, d + 0.45, uShatter);
  float burst = 1.0 - (1.0 - s) * (1.0 - s) * (1.0 - s);

  // Roll about the long axis; the burst adds a fast extra turn.
  float roll = aShard.z * uClock + seed * TAU + burst * (2.5 + 3.0 * h.y) * sign(aShard.z);
  vec3 q = rotateAbout(position, aAxis, roll);
  vec3 n = rotateAbout(normal, aAxis, roll);

  // Slow rocking across the crystal, a tumble during the burst.
  vec3 rk = cross(aAxis, axisO);
  float rl = length(rk);
  rk = rl > 0.2 ? rk / rl : normalize(cross(aAxis, normalize(aPivot)));
  float rock = 0.08 * sin(uClock * ROCK_W + seed * 23.0) + burst * (0.7 + 1.3 * h.z) * (h.y > 0.5 ? 1.0 : -1.0);
  q = rotateAbout(q, rk, rock);
  n = rotateAbout(n, rk, rock);

  // Orbit, with a breathing shared by all crystals (so the gaps between orbits are kept).
  float ang = phase + burst * (0.25 + 0.25 * h.y);
  vec3 cen = rotateAbout(aPivot, axisO, ang) * (1.0 + 0.025 * sin(uClock * BREATH_W));
  // Hold spreads the swarm across the view more than towards the camera; the burst throws it outwards.
  cen *= 1.0 + spreadK * uHold * vec3(1.0, 1.0, 0.35);
  // As the camera dollies in the belt tightens around the sculpture (QC round 1: at full dolly it spread
  // across the frame and the nearest crystals filled it).
  cen *= 1.0 - 0.18 * uContract;
  cen += normalize(cen) * vec3(1.0, 0.8, 0.5) * (burst * (0.8 + 1.1 * h.z));
  cen += axisO * (0.035 * sin(uClock * BOB_W + seed * 31.0) + burst * (h.x - 0.5) * 0.7);
  vec3 cw = (modelMatrix * vec4(uBeltOrigin[orbit] + cen, 1.0)).xyz;
  // Soft floor above the lake, only reached in extreme hold + shatter poses (C1-continuous).
  float below = cw.y - (FLOOR_Y + 0.6);
  if (below < 0.0) cw.y = FLOOR_Y + 0.6 * exp(below / 0.6);
  // Crystals that come within 9 m of the camera shrink a little (no shard ever fills the frame).
  float near = 1.0 - 0.35 * (1.0 - smoothstep(6.0, 9.0, max(-(viewMatrix * vec4(cw, 1.0)).z, 0.05)));
  q *= near;

  vec3 wp = cw + mat3(modelMatrix) * rotateAbout(q, axisO, ang);
  vWorldPos = wp;
  vNormal = normalize(mat3(modelMatrix) * rotateAbout(n, axisO, ang));
  vRestNormal = normal;
  vLocal = position;
  vAxis = aAxis;
  vBary = aBary;
  vOrbPos = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  // Projected crystal length in pixels: the refraction lookup is kept at least this far away.
  float depth = max(-(viewMatrix * vec4(cw, 1.0)).z, 0.05);
  vShard = vec4(seed, 1.0 / max(aRadius * near, 1e-3), aShard.w * near * projectionMatrix[1][1] * uResolution.y / depth, h.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const SHARD_FRAG = /* glsl */ `
${GLSL_COMMON}
${GLSL_ENV}
uniform mat4 projectionMatrix;
uniform sampler2D uRefraction;
uniform vec2 uResolution;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uReflPass;
uniform vec3 uTint;        // transmission colour of one pass (Blender base colour)
uniform vec3 uTintAlt;     // per-crystal variation towards this
uniform float uDensity;
uniform float uIor;
uniform float uRoughness;
uniform float uRefrDist;   // m behind the crystal where the exit ray meets the scene copy
uniform float uRefrLod;
uniform float uScreenMix;  // scene copy vs PMREM for the transmitted light
uniform vec3 uOrbColor;
uniform float uOrbRadius;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vRestNormal;
varying vec3 vLocal;
varying vec3 vAxis;
varying vec3 vBary;
varying vec4 vShard;
varying vec3 vOrbPos;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  if (dot(N, V) < 0.0) N = -N;
  float NdotV = max(dot(N, V), 1e-3);
  vec3 L = normalize(uSunDir);
  float seed = vShard.x;
  // Per-facet random from the rest-frame facet normal: each facet keeps its own look while it turns.
  vec3 fh = hash33(vRestNormal * 19.0 + seed * 73.0 + 11.0);

  // Path through the crystal: ~0 at the tips, largest mid-body, normalised per crystal so small shards
  // keep the colour. Beer-Lambert against the authored base colour.
  vec3 ax = normalize(vAxis);
  float radial = saturate(length(vLocal - ax * dot(vLocal, ax)) * vShard.y);
  float cosT = sqrt(saturate(1.0 - (1.0 - NdotV * NdotV) / (uIor * uIor)));
  float grain = vnoise(vLocal * 7.0 + seed * 37.0);
  float path = (0.22 + 1.3 * radial) * (0.55 + 0.45 * cosT) * (1.0 + 0.2 * grain);
  vec3 tint = mix(uTint, uTintAlt, vShard.w);
  vec3 T = pow(tint, vec3(uDensity * path));

  // Exit ray, bent towards the prism base, plus a per-facet tilt standing in for the far facet.
  vec3 ex = normalize(refract(-V, N, 1.0 / uIor) - N * 0.4 + (fh - 0.5) * 0.55);
  vec3 behind = envRadiance(ex, 0.3);
  if (uReflPass < 0.5) {
    vec4 clip = projectionMatrix * viewMatrix * vec4(vWorldPos + ex * uRefrDist, 1.0);
    vec2 px = gl_FragCoord.xy;
    vec2 off = (clip.xy / max(clip.w, 1e-4) * 0.5 + 0.5) * uResolution - px;
    float m = length(off);
    vec2 dir = m > 0.5 ? off / m : normalize(fh.xy - 0.5 + 1e-3);
    // The copy is last frame's and contains the shards: never look closer than this crystal's own
    // length, so a crystal cannot see (and feed back into) itself.
    vec2 uv = (px + dir * max(m, vShard.z * 1.2 + 8.0)) / uResolution;
    vec2 edge = smoothstep(vec2(0.0), vec2(0.04), uv) * smoothstep(vec2(0.0), vec2(0.04), 1.0 - uv);
    // Thin edges let more of the scene through, the deep centres stay saturated (QC round 1: near-opaque).
    float w = min(uScreenMix * (1.0 + 1.2 * (1.0 - radial)), 1.0) * edge.x * edge.y * step(0.0, clip.w);
    behind = mix(behind, textureLod(uRefraction, clamp(uv, vec2(0.002), vec2(0.998)), uRefrLod).rgb, w);
  }
  // Tame the low sun's glow in the panorama (luma 20-40) without touching sky and clouds (luma < 2).
  behind /= 1.0 + 0.06 * luma(behind);
  // A crystal in front of the orb sampled the orb's bright copy and AgX bleached it grey-white (QC round 7, T07): the
  // light behind is capped before absorption, so it stays a backlit cobalt.
  behind *= min(1.0, 0.9 / max(luma(behind), 1e-3));

  // Inside: transmitted scene, sky light scattered inside (absorbed twice), the low sun behind the swarm
  // (broad forward scatter plus a flash when the exit ray finds it), the orb as a sphere light.
  vec3 irr = envIrradiance(N);
  float back = pow(saturate(dot(-V, L) * 0.5 + 0.5), 4.0);
  float flash = pow(saturate(dot(ex, L)), 12.0);
  vec3 toOrb = vOrbPos - vWorldPos;
  float d2 = max(dot(toOrb, toOrb), 0.01);
  float orbWrap = saturate(dot(N, toOrb * inversesqrt(d2)) * 0.5 + 0.5);
  vec3 body = behind * T + irr * (T * T) * 0.22
    + uSunColor * T * (0.05 * back + 1.2 * flash)
    + uOrbColor * T * (uOrbRadius * uOrbRadius / d2) * (0.35 + 0.65 * orbWrap) * 0.5;
  // The body's luminance capped at ~1 scene-linear, chroma kept (the glints and specular below stay uncapped).
  body *= min(1.0, 1.0 / max(luma(body), 1e-3));
  // Each facet its own value (the far facets differ in path and light): flat-shaded plastic otherwise.
  // (QC round 4: no facet went below B ~205, every crystal the same neon royal blue; the reference's shadow facets
  // sit at ~60,100,175: a deeper low end. Round 7: 0.38-1.2 read as random low-poly facets -> 0.62-1.12, plus a lighter
  // core and darker rims.)
  // (0.62 floor until QC round 9: the palette sat in light periwinkle; the reference's dark facets reach ~50,105,195.)
  body *= mix(0.45, 1.12, fh.z);
  body *= mix(0.75, 1.1, NdotV);
  // Per crystal: a value / hue jitter (+-12 %, a touch towards violet) and one in five frosted, catching the sky
  // as a pale lavender-white shard (reference F000 x878-910: near-white frosted crystals among the cobalt ones).
  float cr = fract(seed * 7.13 + 0.37);
  body *= 0.88 + 0.24 * fract(seed * 3.71);
  body = mix(body, body * vec3(1.06, 0.97, 1.0), step(0.5, fract(seed * 5.3)));
  float frosty = smoothstep(0.78, 0.82, cr);
  // (0.62 towards (0.86, 0.88, 1.0) x0.95 until QC round 9: "flat paper-white facets", the frosted ones read as paper.)
  body = mix(body, irr * vec3(0.78, 0.84, 1.0) * 0.85 + T * 0.1, frosty * 0.15);

  // Surface: PMREM reflection and GGX sun glints on the flat facets.
  float F = fresnelSchlick(NdotV, 0.04);
  float rough = uRoughness * (0.8 + 0.2 * grain);
  vec3 refl = envRadiance(reflect(-V, N), rough);
  vec3 H = normalize(V + L);
  // Wider lobe than the reflection: a turning facet then glints for a few frames instead of one.
  // (Tighter than before, 0.28 never reached white: a facet now flashes near-white as it turns.)
  float glint = min(ggxSpec(N, V, L, max(rough * 1.4, 0.18)) * fresnelSchlick(saturate(dot(V, H)), 0.04), 8.0);

  // Lighter crystal ridges (about 1 px, faded out on tiny facets) and a cool fresnel rim.
  float e = min(min(vBary.x, vBary.y), vBary.z);
  float ew = fwidth(e);
  float ridge = (1.0 - smoothstep(0.0, 1.25 * ew + 1e-5, e)) * saturate(1.0 - 5.0 * ew);
  float rim = pow(1.0 - NdotV, 3.0);
  vec3 edgeLight = irr * mix(vec3(1.0), tint, 0.15);

  // The facet reflection capped (grazing facets mirrored the sky as flat paper-white panels, QC round 9) and tinted by the
  // crystal's own body colour, so sky-facing facets read pale cobalt, never white chips (QC round 10).
  float Fc = min(F, 0.35);
  refl *= mix(vec3(1.0), normalize(tint + 1e-3) * 1.45, 0.55);
  vec3 col = body * (1.0 - Fc) + refl * Fc + uSunColor * glint;
  // A tight sun lobe as well: 1-3 px white glints on the facets that turn into the sun (the reference's tips flash
  // white, L 243-255; ours peaked at 220-237).
  col += uSunColor * min(ggxSpec(N, V, L, max(0.07, sqrt(fwidth(N.x) + fwidth(N.y)) * 0.5)), 40.0) * 0.06 * (1.0 - frosty);
  // (0.7 drew a pale outline on every facet edge: low-poly CG, QC round 2; 0.25 still read as edge lines, round 5.)
  col += edgeLight * (0.22 * rim + 0.12 * ridge);
  // One long specular streak along each crystal (Kajiya-Kay on its long axis): the reference's crystals each carry a
  // white streak, ours only scattered facet glints (QC round 7, T07).
  float thK = dot(ax, H);
  col += uSunColor * pow(sqrt(max(1.0 - thK * thK, 0.0)), 90.0) * 0.5 * smoothstep(0.0, 0.2, dot(N, L)) * (1.0 - frosty);
  // 15 % less chroma overall (the reference cobalt is a cornflower / periwinkle, not electric ultramarine).
  col = mix(vec3(luma(col)), col, 0.85);
  // Depth cue: crystals behind the orb lose some chroma and lift towards the haze (QC round 5: far shards were as
  // crisp and saturated as near ones). Relative to the orb's distance, so it holds at rest and in the hold.
  float orbDist = length(cameraPosition - vOrbPos);
  float haze = smoothstep(1.04, 1.3, length(cameraPosition - vWorldPos) / max(orbDist, 1e-3));
  col = mix(col, mix(vec3(luma(col)), col, 0.55) * 0.92 + vec3(0.06, 0.07, 0.09), haze * 0.45);
  gl_FragColor = vec4(min(col, vec3(24.0)), 1.0);
}
`;

type Island = { verts: THREE.Vector3[]; tris: number[] };

type Template = {
  /** Triangle corners in the crystal's principal frame (x = long axis), 9 floats per triangle. */
  corners: Float32Array;
  /** Barycentrics per corner; components of edges that are not crystal ridges are offset by 1. */
  bary: Float32Array;
  triCount: number;
  halfLength: number;
  /** Largest distance of a vertex from the long axis. */
  radius: number;
};

type IslandFrame = {
  template: Template;
  pivot: THREE.Vector3;
  axisX: THREE.Vector3;
  axisY: THREE.Vector3;
  axisZ: THREE.Vector3;
};

type Crystal = {
  template: Template;
  /** Rest orientation (x = long axis) and per-axis scale of the template. */
  axisX: THREE.Vector3;
  axisY: THREE.Vector3;
  axisZ: THREE.Vector3;
  scale: THREE.Vector3;
  /** Centre relative to its orbit origin, at phase 0. */
  pivot: THREE.Vector3;
  orbit: number;
  seed: number;
  /** Spin about the long axis, rad per clock second (an integer multiple of CLOCK_W). */
  spin: number;
};

/** A crystal's capsule sampled along its orbit, for the placement test. */
type Track = { pos: Float32Array; dir: Float32Array; seg: number; radius: number; orbit: number };

type PlaceContext = {
  rand: () => number;
  axes: THREE.Vector3[];
  bases: { e1: THREE.Vector3; e2: THREE.Vector3 }[];
  beltRadius: number[];
  template: Template;
  clearance: Clearance;
};

const wrap = (x: number, p: number) => x - Math.floor(x / p) * p;

/** Small deterministic PRNG, so the procedural layout is identical on every load. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomUnit(rand: () => number) {
  const z = rand() * 2 - 1;
  const a = rand() * TAU;
  const r = Math.sqrt(1 - z * z);
  return new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), z);
}

/** In-plane basis (e1, e2) with e1 x e2 = n, so a positive turn about n takes e1 to e2. */
function planeBasis(n: THREE.Vector3) {
  const e1 = new THREE.Vector3().crossVectors(n, Math.abs(n.z) < 0.9 ? Z_AXIS : X_AXIS).normalize();
  const e2 = new THREE.Vector3().crossVectors(n, e1);
  return { e1, e2 };
}

/** Spin about the long axis: an integer harmonic of the clock; smaller crystals spin faster. */
function spinRate(size: number, rand: () => number) {
  const k = Math.round(clamp(lerp(6, 13, rand()) / Math.sqrt(Math.max(size, 0.2)), 4, 24));
  return k * CLOCK_W * (rand() < 0.5 ? -1 : 1);
}

function compactIsland(verts: THREE.Vector3[], tris: number[]): Island {
  const map = new Map<number, number>();
  const out: THREE.Vector3[] = [];
  const remapped = tris.map((i) => {
    let j = map.get(i);
    if (j === undefined) {
      j = out.length;
      map.set(i, j);
      out.push(verts[i].clone());
    }
    return j;
  });
  return { verts: out, tris: remapped };
}

/**
 * Connected components of every mesh under `root`, in the hero frame (world transform baked). Vertices are
 * welded by position first: the glTF export splits them along UV seams and sharp edges.
 */
function findIslands(root: THREE.Object3D, center: THREE.Vector3): Island[] {
  const out: Island[] = [];
  const v = new THREE.Vector3();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.getAttribute("position");
    if (!pos) return;
    const index = mesh.geometry.getIndex();
    const ids = new Map<string, number>();
    const verts: THREE.Vector3[] = [];
    const weld = new Int32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).sub(center);
      const key = `${Math.round(v.x * 1e4)}|${Math.round(v.y * 1e4)}|${Math.round(v.z * 1e4)}`;
      let id = ids.get(key);
      if (id === undefined) {
        id = verts.length;
        ids.set(key, id);
        verts.push(v.clone());
      }
      weld[i] = id;
    }
    const parent = new Int32Array(verts.length).map((_, i) => i);
    const find = (x: number) => {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    };
    const corner = (i: number) => weld[index ? index.getX(i) : i];
    const triCount = Math.floor((index ? index.count : pos.count) / 3);
    const tris: number[] = [];
    for (let t = 0; t < triCount; t++) {
      const a = corner(t * 3);
      const b = corner(t * 3 + 1);
      const c = corner(t * 3 + 2);
      if (a === b || b === c || a === c) continue;
      tris.push(a, b, c);
      parent[find(b)] = find(a);
      parent[find(c)] = find(a);
    }
    const groups = new Map<number, number[]>();
    for (let t = 0; t < tris.length; t += 3) {
      const rep = find(tris[t]);
      let g = groups.get(rep);
      if (!g) {
        g = [];
        groups.set(rep, g);
      }
      g.push(tris[t], tris[t + 1], tris[t + 2]);
    }
    for (const g of groups.values()) {
      if (g.length >= 12) out.push(compactIsland(verts, g));
    }
  });
  return out;
}

/**
 * Principal frame of a crystal (long axis tip to tip, second axis towards the widest vertex), its outward
 * winding, and which edges are real ridges.
 */
function analyseIsland(island: Island): IslandFrame {
  const { verts, tris } = island;
  const pivot = new THREE.Vector3();
  for (const p of verts) pivot.add(p);
  pivot.divideScalar(Math.max(verts.length, 1));

  let ia = 0;
  let ib = 0;
  let best = -1;
  for (let i = 0; i < verts.length; i++) {
    for (let j = i + 1; j < verts.length; j++) {
      const d = verts[i].distanceToSquared(verts[j]);
      if (d > best) {
        best = d;
        ia = i;
        ib = j;
      }
    }
  }
  const axisX = new THREE.Vector3().subVectors(verts[ib], verts[ia]);
  if (axisX.lengthSq() < 1e-12) axisX.copy(X_AXIS);
  axisX.normalize();
  const axisY = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  let radius = 0;
  for (const p of verts) {
    tmp.subVectors(p, pivot);
    tmp.addScaledVector(axisX, -tmp.dot(axisX));
    const l = tmp.length();
    if (l > radius) {
      radius = l;
      axisY.copy(tmp);
    }
  }
  if (radius < 1e-6) axisY.crossVectors(axisX, Math.abs(axisX.y) < 0.9 ? Y_AXIS : X_AXIS);
  axisY.normalize();
  const axisZ = new THREE.Vector3().crossVectors(axisX, axisY);

  const triCount = tris.length / 3;
  const order = new Int32Array(tris.length);
  const normals: THREE.Vector3[] = [];
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const mid = new THREE.Vector3();
  for (let t = 0; t < triCount; t++) {
    const a = tris[t * 3];
    let b = tris[t * 3 + 1];
    let c = tris[t * 3 + 2];
    const fn = new THREE.Vector3().crossVectors(e1.subVectors(verts[b], verts[a]), e2.subVectors(verts[c], verts[a]));
    mid.copy(verts[a]).add(verts[b]).add(verts[c]).divideScalar(3).sub(pivot);
    if (fn.dot(mid) < 0) {
      const s = b;
      b = c;
      c = s;
      fn.negate();
    }
    normals.push(fn.normalize());
    order[t * 3] = a;
    order[t * 3 + 1] = b;
    order[t * 3 + 2] = c;
  }

  // Edges shared by two (nearly) coplanar triangles are quad diagonals, not crystal ridges.
  const edgeKey = (u: number, w: number) => (u < w ? u * 65536 + w : w * 65536 + u);
  const oppositeEdge = (t: number, k: number) => edgeKey(order[t * 3 + ((k + 1) % 3)], order[t * 3 + ((k + 2) % 3)]);
  const edges = new Map<number, number[]>();
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const key = oppositeEdge(t, k);
      const list = edges.get(key);
      if (list) list.push(t);
      else edges.set(key, [t]);
    }
  }
  const corners = new Float32Array(triCount * 9);
  const bary = new Float32Array(triCount * 9);
  const ridge = [1, 1, 1];
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const list = edges.get(oppositeEdge(t, k));
      const other = list ? list.find((x) => x !== t) : undefined;
      ridge[k] = other !== undefined && normals[t].dot(normals[other]) > RIDGE_COS ? 0 : 1;
    }
    for (let k = 0; k < 3; k++) {
      tmp.subVectors(verts[order[t * 3 + k]], pivot);
      const o = t * 9 + k * 3;
      corners[o] = tmp.dot(axisX);
      corners[o + 1] = tmp.dot(axisY);
      corners[o + 2] = tmp.dot(axisZ);
      for (let j = 0; j < 3; j++) bary[o + j] = (j === k ? 1 : 0) + (ridge[j] ? 0 : 1);
    }
  }
  return { template: { corners, bary, triCount, halfLength: Math.sqrt(best) * 0.5, radius }, pivot, axisX, axisY, axisZ };
}

/** Octagonal bipyramid like the authored crystals (26 verts, 48 tris, 0.84 m), if the GLB has none. */
function proceduralIsland(): Island {
  const verts = [new THREE.Vector3(-0.4187, 0, 0), new THREE.Vector3(0.4187, 0, 0)];
  const rings = [
    [-0.17, 0.09],
    [0, 0.112],
    [0.17, 0.09],
  ];
  for (const [x, r] of rings) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      verts.push(new THREE.Vector3(x, Math.cos(a) * r, Math.sin(a) * r * 0.9));
    }
  }
  const ring = (i: number, k: number) => 2 + i * 8 + (k % 8);
  const tris: number[] = [];
  for (let k = 0; k < 8; k++) {
    tris.push(0, ring(0, k), ring(0, k + 1), 1, ring(2, k), ring(2, k + 1));
    for (let i = 0; i < 2; i++) {
      tris.push(ring(i, k), ring(i, k + 1), ring(i + 1, k + 1), ring(i, k), ring(i + 1, k + 1), ring(i + 1, k));
    }
  }
  return { verts, tris };
}

/**
 * Belt plane (normal turned upwards) and centre from the authored crystal centres, which sit on a circle
 * around the Blender object origin. The node origin is used when it agrees with the circle fit, so a
 * re-export with applied transforms still works.
 */
function beltFrame(node: THREE.Object3D, pivots: THREE.Vector3[], center: THREE.Vector3, belt: number) {
  const nodeOrigin = node.getWorldPosition(new THREE.Vector3()).sub(center);
  const fallback = { origin: nodeOrigin, normal: FALLBACK_BELT_NORMALS[belt].clone() };
  if (pivots.length < 3) return fallback;
  const mean = new THREE.Vector3();
  for (const p of pivots) mean.add(p);
  mean.divideScalar(pivots.length);
  const normal = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < pivots.length; i++) {
    for (let j = i + 1; j < pivots.length; j++) {
      c.crossVectors(a.subVectors(pivots[i], mean), b.subVectors(pivots[j], mean));
      if (c.dot(normal) < 0) c.negate();
      normal.add(c);
    }
  }
  if (normal.lengthSq() < 1e-10) return fallback;
  if (normal.normalize().y < 0) normal.negate();

  // Kasa circle fit in the plane: x^2 + y^2 + D x + E y + F = 0, solved with Cramer's rule.
  const { e1, e2 } = planeBasis(normal);
  let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, sxz = 0, syz = 0, sz = 0;
  for (const p of pivots) {
    a.subVectors(p, mean);
    const x = a.dot(e1);
    const y = a.dot(e2);
    const z = x * x + y * y;
    sxx += x * x;
    sxy += x * y;
    syy += y * y;
    sx += x;
    sy += y;
    sxz += x * z;
    syz += y * z;
    sz += z;
  }
  const m = [sxx, sxy, sx, sxy, syy, sy, sx, sy, pivots.length];
  const rhs = [-sxz, -syz, -sz];
  const det3 = (q: number[]) =>
    q[0] * (q[4] * q[8] - q[5] * q[7]) - q[1] * (q[3] * q[8] - q[5] * q[6]) + q[2] * (q[3] * q[7] - q[4] * q[6]);
  const det = det3(m);
  if (Math.abs(det) < 1e-9) return { origin: nodeOrigin, normal };
  const solve = (col: number) => {
    const q = m.slice();
    q[col] = rhs[0];
    q[3 + col] = rhs[1];
    q[6 + col] = rhs[2];
    return det3(q) / det;
  };
  const fitted = mean.clone().addScaledVector(e1, -solve(0) / 2).addScaledVector(e2, -solve(1) / 2);
  return { origin: fitted.distanceTo(nodeOrigin) < 0.5 ? nodeOrigin : fitted, normal };
}

/** Out = (add ?? 0) + v turned about the unit axis k (Rodrigues, with precomputed cos / sin). */
function rotateInto(out: Float32Array, o: number, v: THREE.Vector3, k: THREE.Vector3, c: number, s: number, add?: THREE.Vector3) {
  const d = (k.x * v.x + k.y * v.y + k.z * v.z) * (1 - c);
  out[o] = v.x * c + (k.y * v.z - k.z * v.y) * s + k.x * d + (add ? add.x : 0);
  out[o + 1] = v.y * c + (k.z * v.x - k.x * v.z) * s + k.y * d + (add ? add.y : 0);
  out[o + 2] = v.z * c + (k.x * v.y - k.y * v.x) * s + k.z * d + (add ? add.z : 0);
}

/** Distance between the capsule axes of two tracks at sample offset i (closest points of two segments). */
function segmentDistance(ta: Track, tb: Track, i: number) {
  const d1x = ta.dir[i] * 2 * ta.seg, d1y = ta.dir[i + 1] * 2 * ta.seg, d1z = ta.dir[i + 2] * 2 * ta.seg;
  const d2x = tb.dir[i] * 2 * tb.seg, d2y = tb.dir[i + 1] * 2 * tb.seg, d2z = tb.dir[i + 2] * 2 * tb.seg;
  const p1x = ta.pos[i] - d1x * 0.5, p1y = ta.pos[i + 1] - d1y * 0.5, p1z = ta.pos[i + 2] - d1z * 0.5;
  const p2x = tb.pos[i] - d2x * 0.5, p2y = tb.pos[i + 1] - d2y * 0.5, p2z = tb.pos[i + 2] - d2z * 0.5;
  const rx = p1x - p2x, ry = p1y - p2y, rz = p1z - p2z;
  const a = d1x * d1x + d1y * d1y + d1z * d1z;
  const e = d2x * d2x + d2y * d2y + d2z * d2z;
  const f = d2x * rx + d2y * ry + d2z * rz;
  let s = 0;
  let t = 0;
  if (a > 1e-9 && e > 1e-9) {
    const b = d1x * d2x + d1y * d2y + d1z * d2z;
    const c = d1x * rx + d1y * ry + d1z * rz;
    const den = a * e - b * b;
    s = den > 1e-9 ? clamp((b * f - c * e) / den) : 0;
    t = (b * s + f) / e;
    if (t < 0) {
      t = 0;
      s = clamp(-c / a);
    } else if (t > 1) {
      t = 1;
      s = clamp((b - c) / a);
    }
  } else if (a > 1e-9) {
    s = clamp(-(d1x * rx + d1y * ry + d1z * rz) / a);
  } else if (e > 1e-9) {
    t = clamp(f / e);
  }
  const wx = p1x + d1x * s - p2x - d2x * t;
  const wy = p1y + d1y * s - p2y - d2y * t;
  const wz = p1z + d1z * s - p2z - d2z * t;
  return Math.sqrt(wx * wx + wy * wy + wz * wz);
}

/**
 * Keeps procedural crystals from ever touching another one: every crystal's capsule is sampled over two
 * belt turns (the period of the whole layout, the swirl turning at half speed). Crystals on the same orbit
 * move rigidly together and are tested once.
 */
class Clearance {
  private readonly tracks: Track[] = [];
  private readonly cos: Float32Array[] = [];
  private readonly sin: Float32Array[] = [];

  constructor(
    private readonly axes: THREE.Vector3[],
    private readonly origins: THREE.Vector3[],
  ) {
    ORBITS.forEach((o, b) => {
      const c = new Float32Array(SAMPLES);
      const s = new Float32Array(SAMPLES);
      for (let i = 0; i < SAMPLES; i++) {
        const a = o.phase + o.rate * ((2 * TAU * i) / SAMPLES);
        c[i] = Math.cos(a);
        s[i] = Math.sin(a);
      }
      this.cos[b] = c;
      this.sin[b] = s;
    });
  }

  track(cr: Crystal): Track {
    const k = this.axes[cr.orbit];
    const origin = this.origins[cr.orbit];
    const cos = this.cos[cr.orbit];
    const sin = this.sin[cr.orbit];
    const pos = new Float32Array(SAMPLES * 3);
    const dir = new Float32Array(SAMPLES * 3);
    for (let i = 0; i < SAMPLES; i++) {
      rotateInto(pos, i * 3, cr.pivot, k, cos[i], sin[i], origin);
      rotateInto(dir, i * 3, cr.axisX, k, cos[i], sin[i]);
    }
    const radius = cr.template.radius * Math.max(cr.scale.y, cr.scale.z);
    const seg = Math.max(cr.template.halfLength * cr.scale.x - 0.6 * radius, 0);
    return { pos, dir, seg, radius, orbit: cr.orbit };
  }

  /** Smallest surface gap (m) between `t` and every accepted track. */
  gap(t: Track) {
    let worst = Infinity;
    for (const o of this.tracks) {
      const n = o.orbit === t.orbit ? 1 : o.orbit !== SWIRL && t.orbit !== SWIRL ? SAMPLES / 2 : SAMPLES;
      const reach = t.seg + o.seg + t.radius + o.radius + MARGIN;
      const reach2 = reach * reach;
      for (let s = 0; s < n; s++) {
        const i = s * 3;
        const dx = t.pos[i] - o.pos[i];
        const dy = t.pos[i + 1] - o.pos[i + 1];
        const dz = t.pos[i + 2] - o.pos[i + 2];
        if (dx * dx + dy * dy + dz * dz > reach2) continue;
        const g = segmentDistance(t, o, i) - t.radius - o.radius;
        if (g < worst) worst = g;
      }
    }
    return worst;
  }

  add(t: Track) {
    this.tracks.push(t);
  }
}

/** A random crystal on an orbit, oriented like the authored ones (mostly along the orbit, tilted up). */
function proposeCrystal(orbit: number, ctx: PlaceContext): Crystal {
  const { rand } = ctx;
  const swirl = orbit === SWIRL;
  const n = ctx.axes[orbit];
  const { e1, e2 } = ctx.bases[orbit];
  const theta = rand() * TAU;
  const radius = swirl ? lerp(SWIRL_RADIUS[0], SWIRL_RADIUS[1], rand()) : ctx.beltRadius[orbit] * lerp(0.95, 1.05, rand());
  const height = (rand() * 2 - 1) * (swirl ? SWIRL_HEIGHT : 0.15);
  const radial = new THREE.Vector3().addScaledVector(e1, Math.cos(theta)).addScaledVector(e2, Math.sin(theta));
  const tangent = new THREE.Vector3().crossVectors(n, radial);
  const pivot = radial.clone().multiplyScalar(radius).addScaledVector(n, height);
  const tilt = rand() < 0.5 ? -1 : 1;
  const axisX = new THREE.Vector3();
  if (swirl) {
    axisX.copy(tangent).addScaledVector(randomUnit(rand), 0.85);
  } else if (rand() < 0.7) {
    axisX
      .copy(tangent)
      .multiplyScalar(lerp(0.65, 1, rand()))
      .addScaledVector(radial, lerp(-0.3, 0.3, rand()))
      .addScaledVector(n, tilt * lerp(0.3, 0.75, rand()));
  } else {
    axisX
      .copy(radial)
      .multiplyScalar(lerp(0.6, 0.85, rand()))
      .addScaledVector(tangent, lerp(-0.2, 0.2, rand()))
      .addScaledVector(n, tilt * lerp(0.5, 0.7, rand()));
  }
  axisX.normalize();
  const axisY = new THREE.Vector3().crossVectors(axisX, randomUnit(rand));
  if (axisY.lengthSq() < 1e-4) axisY.crossVectors(axisX, Math.abs(axisX.y) < 0.9 ? Y_AXIS : X_AXIS);
  axisY.normalize();
  const axisZ = new THREE.Vector3().crossVectors(axisX, axisY);
  const size = swirl ? lerp(0.3, 0.62, rand()) : lerp(0.42, 0.78, rand());
  const girth = size * lerp(0.8, 1.15, rand());
  const scale = new THREE.Vector3(size * lerp(0.85, 1.3, rand()), girth, girth * lerp(0.9, 1.1, rand()));
  return { template: ctx.template, axisX, axisY, axisZ, scale, pivot, orbit, seed: rand(), spin: spinRate(size, rand) };
}

function placeCrystal(orbit: number, ctx: PlaceContext): Crystal | null {
  let best: Crystal | null = null;
  let bestTrack: Track | null = null;
  let bestGap = -Infinity;
  for (let i = 0; i < TRIES && bestGap < MARGIN; i++) {
    const cr = proposeCrystal(orbit, ctx);
    const t = ctx.clearance.track(cr);
    const g = ctx.clearance.gap(t);
    if (g > bestGap) {
      bestGap = g;
      best = cr;
      bestTrack = t;
    }
  }
  if (!best || !bestTrack || bestGap < 0.02) return null;
  ctx.clearance.add(bestTrack);
  return best;
}

function buildGeometry(crystals: Crystal[]) {
  let triTotal = 0;
  for (const cr of crystals) triTotal += cr.template.triCount;
  const count = triTotal * 3;
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const pivot = new Float32Array(count * 3);
  const axis = new Float32Array(count * 3);
  const bary = new Float32Array(count * 3);
  const shard = new Float32Array(count * 4);
  const radius = new Float32Array(count);
  const q = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const fn = new THREE.Vector3();
  let v = 0;
  for (const cr of crystals) {
    const { corners, triCount, halfLength } = cr.template;
    const tb = cr.template.bary;
    const r = cr.template.radius * Math.max(cr.scale.y, cr.scale.z);
    for (let t = 0; t < triCount; t++) {
      for (let k = 0; k < 3; k++) {
        const o = t * 9 + k * 3;
        q[k]
          .set(0, 0, 0)
          .addScaledVector(cr.axisX, corners[o] * cr.scale.x)
          .addScaledVector(cr.axisY, corners[o + 1] * cr.scale.y)
          .addScaledVector(cr.axisZ, corners[o + 2] * cr.scale.z);
      }
      // Flat facet normal; the frame is right-handed and scales are positive, so winding stays outward.
      fn.crossVectors(e1.subVectors(q[1], q[0]), e2.subVectors(q[2], q[0]));
      if (fn.lengthSq() < 1e-14) fn.copy(cr.axisY);
      else fn.normalize();
      for (let k = 0; k < 3; k++, v++) {
        const i3 = v * 3;
        const i4 = v * 4;
        const o = t * 9 + k * 3;
        position[i3] = q[k].x;
        position[i3 + 1] = q[k].y;
        position[i3 + 2] = q[k].z;
        normal[i3] = fn.x;
        normal[i3 + 1] = fn.y;
        normal[i3 + 2] = fn.z;
        pivot[i3] = cr.pivot.x;
        pivot[i3 + 1] = cr.pivot.y;
        pivot[i3 + 2] = cr.pivot.z;
        axis[i3] = cr.axisX.x;
        axis[i3 + 1] = cr.axisX.y;
        axis[i3 + 2] = cr.axisX.z;
        bary[i3] = tb[o];
        bary[i3 + 1] = tb[o + 1];
        bary[i3 + 2] = tb[o + 2];
        shard[i4] = cr.seed;
        shard[i4 + 1] = cr.orbit;
        shard[i4 + 2] = cr.spin;
        shard[i4 + 3] = halfLength * cr.scale.x;
        radius[v] = r;
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
  geo.setAttribute("aPivot", new THREE.BufferAttribute(pivot, 3));
  geo.setAttribute("aAxis", new THREE.BufferAttribute(axis, 3));
  geo.setAttribute("aBary", new THREE.BufferAttribute(bary, 3));
  geo.setAttribute("aShard", new THREE.BufferAttribute(shard, 4));
  geo.setAttribute("aRadius", new THREE.BufferAttribute(radius, 1));
  return geo;
}

/**
 * Two belts of cobalt crystals (plus a looser outer swirl) orbiting the orb, in one draw call.
 *
 * Rendered after the rings (RenderPipeline step 8): it reads `shared.uRefraction` (this frame's last copy) for
 * what is seen through the crystals, and the depth test hides the crystals behind the ice and the orb.
 */
export class Shards {
  /** The whole swarm (LAYER.SHARDS), placed at the hero centre; add it to the scene as is. */
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly material: THREE.ShaderMaterial;
  /** Crystals actually built (authored + procedural). */
  readonly count: number;
  private readonly uOrbit = { value: new THREE.Vector3() };
  private readonly uClock = { value: 0 };
  private readonly uHold = { value: 0 };
  private readonly uShatter = { value: 0 };
  private readonly uContract = { value: 0 };
  private readonly uReflPass = { value: 0 };
  private readonly phase = ORBITS.map((o) => o.phase);
  private clock = 0;

  /**
   * @param gltfScene hero GLB scene (reads nodes SHARD_BELT_NAMES; the source meshes are left untouched)
   * @param envDefines cubeUVDefines() of the PMREM environment
   * @param quality target crystal count (the 18 authored ones are always kept)
   */
  constructor(gltfScene: THREE.Object3D, shared: SharedUniforms, envDefines: Record<string, string>, quality: QualityProfile["shards"]) {
    const center = new THREE.Vector3().fromArray(HERO_CENTER);
    gltfScene.updateMatrixWorld(true);
    const rand = mulberry32(0x9e3779b9);

    // Authored belts: bake world transforms, split into crystals, recover each belt's plane and centre.
    const axes: THREE.Vector3[] = [];
    const origins: THREE.Vector3[] = [];
    const beltRadius: number[] = [];
    const crystals: Crystal[] = [];
    let template: Template | null = null;
    for (let b = 0; b < SWIRL; b++) {
      const name = SHARD_BELT_NAMES[b] ?? "";
      const node = name ? gltfScene.getObjectByName(name) : undefined;
      const parts = node ? findIslands(node, center).map(analyseIsland) : [];
      if (!node || parts.length === 0) console.warn(`[hero] shard belt ${name} missing, using procedural crystals`);
      const frame = node
        ? beltFrame(node, parts.map((p) => p.pivot), center, b)
        : { origin: FALLBACK_BELT_ORIGIN.clone().sub(center), normal: FALLBACK_BELT_NORMALS[b].clone() };
      axes[b] = frame.normal;
      origins[b] = frame.origin;
      let radiusSum = 0;
      for (const p of parts) {
        const rel = p.pivot.clone().sub(frame.origin);
        radiusSum += rel.length();
        crystals.push({
          template: p.template,
          axisX: p.axisX,
          axisY: p.axisY,
          axisZ: p.axisZ,
          scale: new THREE.Vector3(1, 1, 1),
          pivot: rel.multiplyScalar(ORBITS[b].radiusScale),
          orbit: b,
          seed: rand(),
          spin: spinRate(1, rand),
        });
        if (!template || p.template.halfLength > template.halfLength) template = p.template;
      }
      beltRadius[b] = (parts.length ? radiusSum / parts.length : AUTHORED_RADIUS) * ORBITS[b].radiusScale;
    }
    axes[SWIRL] = SWIRL_AXIS.clone();
    origins[SWIRL] = new THREE.Vector3();
    const authored = crystals.length;

    // Procedural crystals: some on the belts, the rest on the swirl, never touching anything over time.
    const clearance = new Clearance(axes, origins);
    for (const cr of crystals) clearance.add(clearance.track(cr));
    const ctx: PlaceContext = {
      rand,
      axes,
      bases: axes.map((n) => planeBasis(n)),
      beltRadius,
      template: template ?? analyseIsland(proceduralIsland()).template,
      clearance,
    };
    const extras = Math.max(Math.floor(quality.count) || 0, authored) - authored;
    const onBelts = authored ? Math.min(Math.round(extras * 0.45), 18) : Math.round(extras * 0.6);
    for (let i = 0; i < extras; i++) {
      const cr = (i < onBelts ? placeCrystal(i % 2, ctx) : null) ?? placeCrystal(SWIRL, ctx);
      if (cr) crystals.push(cr);
    }
    this.count = crystals.length;

    const geometry = buildGeometry(crystals);
    let reach = 0;
    for (const cr of crystals) {
      const spread = 1.03 * (1 + ORBITS[cr.orbit].spread);
      reach = Math.max(reach, origins[cr.orbit].length() + cr.pivot.length() * spread + 2.4 + cr.template.halfLength * cr.scale.x);
    }
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), reach);

    this.uOrbit.value.set(this.phase[0], this.phase[1], this.phase[2]);
    this.material = new THREE.ShaderMaterial({
      name: "rx-shards",
      vertexShader: SHARD_VERT,
      fragmentShader: SHARD_FRAG,
      defines: { ...envDefines },
      uniforms: {
        uBeltAxis: { value: axes },
        uBeltOrigin: { value: origins },
        uBeltSpread: { value: new THREE.Vector3(ORBITS[0].spread, ORBITS[1].spread, ORBITS[2].spread) },
        uOrbit: this.uOrbit,
        uClock: this.uClock,
        uHold: this.uHold,
        uShatter: this.uShatter,
        uContract: this.uContract,
        uReflPass: this.uReflPass,
        uResolution: shared.uResolution,
        uRefraction: shared.uRefraction,
        uSunDir: shared.uSunDir,
        uSunColor: shared.uSunColor,
        uEnvMap: shared.uEnvMap,
        uEnvIntensity: shared.uEnvIntensity,
        // ~15 % less saturated than Blender's base colour (QC round 1: too saturated against the reference).
        // (0.17, 0.28, 0.95) / density 2.6 until QC round 7: royal ultramarine vs the reference's cornflower.
        uTint: { value: new THREE.Vector3(0.24, 0.36, 0.95) },
        uTintAlt: { value: new THREE.Vector3(0.2, 0.27, 0.97) },
        // Deep cobalt with navy facets (reference mean #5681cb, dark #295ba9); 1 read pale lilac.
        uDensity: { value: 2.3 },
        uIor: { value: 1.5 },
        uRoughness: { value: 0.14 },
        uRefrDist: { value: 5 },
        uRefrLod: { value: 2.2 },
        // Mostly the crystal's own colour, little of the scene behind (near-opaque cobalt).
        uScreenMix: { value: 0.25 },
        uOrbColor: { value: new THREE.Vector3(2.6, 2.8, 3.3) },
        uOrbRadius: { value: ORB_RADIUS },
      },
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.name = "shards";
    this.mesh.position.copy(center);
    // The vertex shader moves everything; the bounding sphere above covers the full range anyway.
    this.mesh.frustumCulled = false;
    this.mesh.layers.set(LAYER.SHARDS);
  }

  /**
   * @param dt seconds
   * @param spin gyroscope speed multiplier (1 = idle)
   * @param hold 0..1 press-and-hold: spreads the swarm out (x1.36-1.45 across the view) and slows it
   * @param shatter 0..1: outward burst with per-crystal delay and extra spin
   * @param contract 0..1 camera dolly progress: the belt tightens around the sculpture
   */
  update(dt: number, spin: number, hold: number, shatter: number, contract = 0) {
    const h = clamp(hold);
    const step = clamp(dt, 0, 0.25) * spin * lerp(1, HOLD_SLOW, smoothstep(0, 1, h));
    this.clock = wrap(this.clock + step, CLOCK_PERIOD);
    for (let i = 0; i < ORBITS.length; i++) {
      this.phase[i] = wrap(this.phase[i] + step * BELT_RATE * ORBITS[i].rate, TAU);
    }
    this.uOrbit.value.set(this.phase[0], this.phase[1], this.phase[2]);
    this.uClock.value = this.clock;
    this.uHold.value = h;
    this.uShatter.value = clamp(shatter);
    this.uContract.value = clamp(contract);
  }

  /** Mirror-camera pass for the water reflection: the screen-space scene copy is not valid there. */
  setReflectionPass(on: boolean) {
    this.uReflPass.value = on ? 1 : 0;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
