import * as THREE from "three";
import { CLOUDS, HERO_CENTER, PLATE, REF_ASPECT, REST_CAMERA } from "../config";
import { CAM_TARGETS } from "../curves";
import { GLSL_AA_RESOLVE, GLSL_COMMON, GLSL_ENV } from "../shaders/chunks";
import type { SharedUniforms } from "../uniforms";
import {
  ATMOS_BANK_HI_MIST3,
  ATMOS_BANK_TOP_MIST3,
  ATMOS_BANK_LO_MIST3,
  ATMOS_BANK_MIST3,
  ATMOS_BANK_T0_MIST3,
  ATMOS_CARD_WHITE,
  ATMOS_SHADE_SWELL,
  ATMOS_VEIL_AMOUNT,
  ATMOS_VEIL_HI,
  ATMOS_VEIL_LO_BLUE,
  ATMOS_VEIL_SHADE,
  atmosFromUrl,
  buildCardField,
  CARD_FIELD,
  CARD_KAPPA,
  CARD_REF_END_T,
  cardGeom,
  cardLightDefines,
  CLOUD_F000_PX,
  CLOUD_F000_T,
  CLOUD_SOFT_BIAS,
  CLOUDS_EXTRA,
  cloudLane,
  cloudOmega,
  cloudShift,
  cloudWrapFade,
  createAtmosMistUniforms,
  GLSL_ATMOS_BERG,
  GLSL_ATMOS_LAKE,
  GLSL_ATMOS_MIST,
  GLSL_CARD_LIGHT_FRAG,
  GLSL_CARD_LIGHT_VERT,
  hazeEnvelopeT,
  RANGE_DEPTH,
  rangeCrestTable,
  wispPuff,
  type AtmosFlags,
  type CardGeom,
  type CloudLane,
} from "./Atmos";

/** Round 11 ATMOS: this lane's URL switches at module load (GLSL_PLATE_MIST is built here; Atmos.ts). */
const ATMOS_URL = atmosFromUrl();

/**
 * The static arctic world: a Cycles render of the scene (hero hidden) projected
 * from the rest camera onto decimated copies of the Blender geometry. Because the
 * texture comes from the same camera we look through, the environment reads
 * exactly like the offline render, while still occluding and parallaxing as 3D.
 */

/** Rest-camera orientation from the solved Blender yaw/pitch (zero roll). */
export function restQuaternion(out = new THREE.Quaternion()) {
  const yaw = THREE.MathUtils.degToRad(REST_CAMERA.yawDeg);
  const pitch = THREE.MathUtils.degToRad(REST_CAMERA.pitchDeg);
  const fwd = new THREE.Vector3(-Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.cos(yaw));
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), fwd, new THREE.Vector3(0, 1, 0));
  return out.setFromRotationMatrix(m);
}

/** tan(half vertical FOV) of the reference 1440x766 frame. */
export const REF_TAN_V = Math.tan(THREE.MathUtils.degToRad(REST_CAMERA.hfovDeg) / 2) / REF_ASPECT;

/** Plate metadata (written next to the plate by the render pipeline). */
export type PlateMeta = {
  overscanX: number;
  overscanTop: number;
  overscanBottom: number;
  exposureStops: number;
};

/** Plate extent in units of the rest frame's half-size (1 = exactly the rest frame). */
export type PlateCoverage = { side: number; top: number; bottom: number };

export const plateCoverage = (m: PlateMeta): PlateCoverage => ({
  side: 1 + 2 * m.overscanX,
  top: 1 + 2 * m.overscanTop,
  bottom: 1 + 2 * m.overscanBottom,
});

/** The camera the plate was rendered from: rest pose with an (asymmetric) overscan frustum. */
export function createPlateCamera(meta: PlateMeta) {
  const cam = new THREE.PerspectiveCamera(25, 2, 0.05, 5000);
  cam.position.fromArray(REST_CAMERA.position);
  restQuaternion(cam.quaternion);
  return withPlateFrustum(cam, meta);
}

/** Azimuth of the orbit-extreme projectors (Choreography's pointer orbit reaches 5 deg x nx). */
const ORBIT_PROJECTOR_AZ = 5.0;

/**
 * The camera an extra plate was rendered from (scratchpad pipeline render_plates_v3.py, same lens and overscan as
 * the rest plate): CameraRig's construction (spherical offset around the orb, lookAt, then the absolute pitch;
 * no handheld drift). "hold" = the press-and-hold pose (CAM_TARGETS.expand, rest azimuth); "orbN" / "orbP" = the
 * rest pose orbited to -5 / +5 deg of azimuth (the pointer's left / right extremes); "tilt" = the hover push-in
 * (CAM_TARGETS.tilt at the rest azimuth).
 */
export function createProjectorCamera(key: ProjectorKey, meta: PlateMeta) {
  const cam = new THREE.PerspectiveCamera(25, 2, 0.05, 5000);
  const DEG = Math.PI / 180;
  const T = CAM_TARGETS;
  // The poses the extra plates were RENDERED from, frozen (framing edits, a hold pitch trim or the debug camTargets must
  // never move a projector away from its plate).
  const pose =
    key === "hold"
      ? { r: 12.7, az: T.rest.az, el: -3.3, pitch: 4.55 }
      : key === "tilt"
        ? { r: 18.7, az: T.rest.az, el: -1.43, pitch: 1.5 }
        : { r: T.rest.r, az: T.rest.az + (key === "orbP" ? ORBIT_PROJECTOR_AZ : -ORBIT_PROJECTOR_AZ), el: T.rest.el, pitch: T.rest.pitch };
  const orb = new THREE.Vector3().fromArray(HERO_CENTER);
  const az = pose.az * DEG;
  const el = pose.el * DEG;
  cam.position.set(orb.x + pose.r * Math.cos(el) * Math.sin(az), orb.y + pose.r * Math.sin(el), orb.z + pose.r * Math.cos(el) * Math.cos(az));
  cam.up.set(0, 1, 0);
  cam.lookAt(orb);
  cam.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pose.pitch * DEG + el));
  return withPlateFrustum(cam, meta);
}

/** A projector camera's projection terms for the shaders' <p>SeenY: x p00, y p11, z p20, w p21 (makePerspective). */
function projectionTerms(cam: THREE.PerspectiveCamera) {
  const e = cam.projectionMatrix.elements;
  return new THREE.Vector4(e[0], e[5], e[8], e[9]);
}

function withPlateFrustum(cam: THREE.PerspectiveCamera, meta: PlateMeta) {
  const near = 0.05;
  const tanH0 = Math.tan(THREE.MathUtils.degToRad(REST_CAMERA.hfovDeg) / 2);
  const c = plateCoverage(meta);
  cam.updateMatrixWorld(true);
  cam.projectionMatrix.makePerspective(
    -tanH0 * c.side * near,
    tanH0 * c.side * near,
    REF_TAN_V * c.top * near,
    -REF_TAN_V * c.bottom * near,
    near,
    5000,
  );
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  return cam;
}

/**
 * Projection shadows. Camera projection only knows the first surface along each projector ray, so a surface
 * hidden behind it (the sky backdrop behind a mountain, the lake behind a rock) receives a copy of the
 * occluder, which shows up as a doubled mountain or rock as soon as the camera moves. A depth map of the
 * proxies seen from the plate camera finds those fragments; each one then takes the nearest projector pixel
 * to its side (left / right first, then up / down) that sees background at least as far away.
 */
/** The projection-shadow helpers for one projector: uniforms u<P>Depth / View / ViewProjF / DepthTexel /
 * DepthOn / CamPos and functions <p>DepthAt / Visible, plus (full) Rim / DepthSolid / Unoccluded. Extra
 * projectors only sample where they see the fragment, so they skip the fill (its 60-step loop per copy made the
 * plate and lake shaders slow to compile on ANGLE / D3D). */
const occlusionGLSL = (P: string, p: string, full = true) => {
  const src = /* glsl */ `
uniform sampler2D u${P}Depth;   // r: projector depth, g: nearest depth within ~40 texels (rim dilation), b: mirror ray length
uniform mat4 u${P}View;
uniform mat4 u${P}ViewProjF;
uniform vec2 u${P}DepthTexel;
uniform float u${P}DepthOn;
uniform vec3 u${P}CamPos;
uniform vec4 u${P}Frustum;
#ifndef DEPTH_TAP
#ifdef DEPTH_EXACT
// (hotfix 2: the maps are bilinear for the lake (depthLinear); every other reader takes its texel exactly, as before)
#define DEPTH_TAP(t, uv) texelFetch(t, clamp(ivec2((uv) * vec2(textureSize(t, 0))), ivec2(0), textureSize(t, 0) - 1), 0)
#else
#define DEPTH_TAP(t, uv) textureLod(t, uv, 0.0)
#endif
#endif
float ${p}DepthAt(vec2 uv) {
  return DEPTH_TAP(u${P}Depth, uv).r;
}
// How much of a fragment at projector depth fz around uv the projector sees, 0..1: five depth taps 1.5 texels apart
// (percentage-closer filtering). A single binary test drew dot-grid hatching and dashed seams along rock edges
// wherever the depth map and the proxy met at grazing angles (QC round 4, cursor orbit).
float ${p}Visible(vec2 uv, float fz) {
  vec2 t = u${P}DepthTexel * 1.5;
  float lim = fz - 0.8;
  float v = step(lim, ${p}DepthAt(uv) * 1.06);
  v += step(lim, ${p}DepthAt(uv + vec2(t.x, 0.0)) * 1.06);
  v += step(lim, ${p}DepthAt(uv - vec2(t.x, 0.0)) * 1.06);
  v += step(lim, ${p}DepthAt(uv + vec2(0.0, t.y)) * 1.06);
  v += step(lim, ${p}DepthAt(uv - vec2(0.0, t.y)) * 1.06);
  return v * 0.2;
}
// Height (world y) of the surface this projector saw at uv, rebuilt along its ray from the depth map (u<P>Frustum: the
// projection terms p00, p11, p20, p21). A lake lookup must land on the water: a ripple-bent one that reaches a rock or
// floe just in front of the lake point (13.5 m vs 14 m) passed every depth-ratio rule and drew a dark, rippling copy of
// its edge 5-6 px out on the water (QC rounds 7-8, T06: the mid-left mound in the left orbit).
float ${p}SeenY(vec2 uv) {
  vec2 n = uv * 2.0 - 1.0;
  vec3 v = vec3((n.x + u${P}Frustum.z) / u${P}Frustum.x, (n.y + u${P}Frustum.w) / u${P}Frustum.y, -1.0) * ${p}DepthAt(uv);
  return (transpose(mat3(u${P}View)) * (v - u${P}View[3].xyz)).y;
}
// @@FULL@@
// The decimated mountain proxies are smaller than the mountains in the plate, so their rims are painted on
// the sky backdrop and would slide against their bodies when the camera moves. A backdrop fragment near a
// mountain is therefore sampled as if it lay at that mountain's depth (the sky around is a smooth gradient,
// so its own small shift does not show).
vec2 ${p}Rim(vec2 uv, inout vec3 worldPos, inout float fz) {
  if (fz < 330.0) return uv;
  float g = DEPTH_TAP(u${P}Depth, uv).g;
  if (g >= 300.0) return uv;
  // The point on the camera ray at projector depth g (exact off the projector too: the hold dolly is 8 m from it).
  float ez = -(u${P}View * vec4(cameraPosition, 1.0)).z;
  worldPos = cameraPosition + (worldPos - cameraPosition) * clamp((g - ez) / max(fz - ez, 1e-3), 0.0, 1.0);
  fz = g;
  vec4 c = u${P}ViewProjF * vec4(worldPos, 1.0);
  return c.xy / c.w * 0.5 + 0.5;
}
// Nearest depth around uv: a fill source must be background on every side, never the anti-aliased rim of
// a silhouette (which would draw a dotted outline).
float ${p}DepthSolid(vec2 uv) {
  vec2 t = u${P}DepthTexel * 2.0;
  float m = ${p}DepthAt(uv);
  m = min(m, ${p}DepthAt(uv + vec2(t.x, 0.0)));
  m = min(m, ${p}DepthAt(uv - vec2(t.x, 0.0)));
  m = min(m, ${p}DepthAt(uv + vec2(0.0, t.y)));
  m = min(m, ${p}DepthAt(uv - vec2(0.0, t.y)));
  return m;
}
// force > 0.5: the caller knows the fragment is hidden (the lake behind a floe within the depth tolerance), so the
// fill runs whatever the depth test says.
vec2 ${p}Unoccluded(vec2 uv, vec3 worldPos, float force) {
  // At the projector itself nothing can be hidden from it: skip the whole test.
  if (u${P}DepthOn < 0.5 || distance(cameraPosition, u${P}CamPos) < 0.02) return uv;
  float fz = -(u${P}View * vec4(worldPos, 1.0)).z;
  uv = ${p}Rim(uv, worldPos, fz);
  // Real occlusions here are large (rock 10 m vs lake 15 m, mountain 150 m vs sky 359 m); a generous
  // tolerance keeps grazing mountain slopes from shadowing themselves.
  if (force < 0.5 && fz <= ${p}DepthAt(uv) * 1.06 + 0.8) return uv;
  float need = fz * 0.985 - 0.25;
  // A source must also lie at a plausible depth: a fold of a mountain hidden behind a nearer fold took the
  // sky beside the ridge as its fill and drew bright seams whenever the camera moved (QC round 3). The sky
  // revealed beside a mountain (fz ~ the backdrop) still finds sky. Nearer than 150 m the band is tight: lake hidden
  // behind a rock at 15 m took floes and snow mounds up to 44 m away and drew ghost copies of them (QC round 4).
  float far = fz < 150.0 ? fz * 1.15 + 1.5 : fz * 1.6 + 20.0;
  vec2 sx = vec2(u${P}DepthTexel.x * 4.0, 0.0);
  for (int i = 1; i <= 40; i++) {
    float s = float(i);
    vec2 a = uv - sx * s;
    float da = ${p}DepthAt(a);
    if (da >= need && da <= far && ${p}DepthSolid(a) >= need) return a;
    vec2 b = uv + sx * s;
    float db = ${p}DepthAt(b);
    if (db >= need && db <= far && ${p}DepthSolid(b) >= need) return b;
  }
  vec2 sy = vec2(0.0, u${P}DepthTexel.y * 4.0);
  for (int i = 1; i <= 20; i++) {
    float s = float(i);
    vec2 a = uv + sy * s;
    float da = ${p}DepthAt(a);
    if (da >= need && da <= far && ${p}DepthSolid(a) >= need) return a;
    vec2 b = uv - sy * s;
    float db = ${p}DepthAt(b);
    if (db >= need && db <= far && ${p}DepthSolid(b) >= need) return b;
  }
  // Nothing plausible beside it: say so (vec2(-1)) instead of returning the occluder's own texel, which drew a
  // copy of the rock or floe in front (callers blur it away or hand the lake to the live mirror).
  return vec2(-1.0);
}
`;
  return full ? src.replace("// @@FULL@@\n", "") : src.slice(0, src.indexOf("// @@FULL@@"));
};
export const GLSL_PLATE_OCCLUSION = occlusionGLSL("Plate", "plate");

/**
 * Extra projectors: plates rendered from other camera poses of the same scene. One plate seen from one point
 * cannot show what its near objects hide, so as soon as the camera moves the hidden lake and snow had to be
 * filled from the side (QC round 4: torn floes and stretched ice under the hold dolly; doubled slabs, mounds and
 * rocks when the pointer orbits the camera). A plate from the hold pose and one from each orbit extreme show those
 * areas as they really are. Each fragment blends the projectors that see it, weighted by the camera's proximity
 * to each (u<P>Mix, with the rest plate taking uRestMix; they sum to 1). A projector that sees what the others
 * cannot wins it even with a small proximity weight.
 */
export const EXTRA_PROJECTORS = [
  { key: "hold", P: "Hold", p: "hold", define: "PROJ_HOLD" },
  { key: "orbN", P: "OrbN", p: "orbN", define: "PROJ_ORBN" },
  { key: "orbP", P: "OrbP", p: "orbP", define: "PROJ_ORBP" },
  // The hover push-in (pointer over the orb, the most common hover spot): a 2.2 m dolly with a 0.31 m drop tore the
  // near rocks and doubled the floes (QC round 5).
  { key: "tilt", P: "Tilt", p: "tilt", define: "PROJ_TILT" },
] as const;
export type ProjectorKey = (typeof EXTRA_PROJECTORS)[number]["key"];

export const GLSL_EXTRA_PROJECTORS =
  /* glsl */ `uniform float uRestMix;\n` +
  EXTRA_PROJECTORS.map(
    (e) => `#ifdef ${e.define}
${occlusionGLSL(e.P, e.p, false)}
uniform sampler2D u${e.P}Plate;
uniform float u${e.P}Gain;
uniform float u${e.P}Mix;
#endif
`,
  ).join("");

/** Plate shader: adds each extra projector's sample to (acc, wsum) (vWorldPos, lodDof in scope). */
const GLSL_PLATE_PROJECTOR_BLEND = EXTRA_PROJECTORS.map(
  (e) => /* glsl */ `
#ifdef ${e.define}
  if (u${e.P}DepthOn > 0.5 && u${e.P}Mix > 0.001) {
    float kz = -(u${e.P}View * vec4(vWorldPos, 1.0)).z;
    vec4 kc = u${e.P}ViewProjF * vec4(vWorldPos, 1.0);
    vec2 k0 = kc.xy / kc.w * 0.5 + 0.5;
    // Rim, as the rest projector's: a backdrop fragment beside a nearer silhouette in this projector's view is sampled at
    // that silhouette's depth (on the camera ray), so the anti-aliased rim this plate drew around it moves with it. Taken
    // at its own depth, the rim was painted on the sky at the sky's parallax: a ghost contour 15-40 px beside the iceberg
    // and the left shoulder in pop / hold, right where this projector's view of the sky began (QC round 6).
    if (kz >= 330.0) {
      float kg = DEPTH_TAP(u${e.P}Depth, clamp(k0, vec2(0.0), vec2(1.0))).g;
      if (kg < 300.0) {
        float kez = -(u${e.P}View * vec4(cameraPosition, 1.0)).z;
        vec3 kw = cameraPosition + (vWorldPos - cameraPosition) * clamp((kg - kez) / max(kz - kez, 1e-3), 0.0, 1.0);
        kz = kg;
        kc = u${e.P}ViewProjF * vec4(kw, 1.0);
        k0 = kc.xy / kc.w * 0.5 + 0.5;
      }
    }
    vec2 ke = min(k0, 1.0 - k0);
    float inK = smoothstep(0.0, 0.015, min(ke.x, ke.y)) * step(0.0, kc.w);
    float visK = ${e.p}Visible(clamp(k0, vec2(0.0), vec2(1.0)), kz);
    // Only where this projector sees the fragment (no fill of its own: what nobody sees keeps the rest fill).
    float wK = u${e.P}Mix * visK * inK;
    if (wK > 0.0005) {
      acc += textureLod(u${e.P}Plate, clamp(k0, vec2(0.0005), vec2(0.9995)), lodDof).rgb * u${e.P}Gain * wK;
      wsum += wK;
    }
  }
#endif`,
).join("");

/**
 * The reference's shaded snow, ice and rock sit much lower and bluer than this plate while the highlights
 * match (QC region stats: rock 97 -> 66, iceberg face 160 -> 137, sky and snow equal). A power curve below
 * an anchor (scene-linear luma) deepens the lower half of the tone curve, and the shadows shift to slate blue.
 */
export const GLSL_PLATE_GRADE = /* glsl */ `
uniform vec3 uPlateGrade;   // x: anchor luma, y: power below it, z: shadow blue shift
vec3 plateGrade(vec3 c) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float a = uPlateGrade.x;
  float lt = l < a ? a * pow(max(l, 0.0) / a, uPlateGrade.y) : l;
  // Toe: the darkest rocks already match, so the curve fades out below them (no crushed blacks).
  lt = mix(l, lt, smoothstep(0.03, 0.16, l));
  c *= lt / max(l, 1e-5);
  float sh = 1.0 - smoothstep(0.04, a * 0.75, l);
  return mix(c, c * vec3(0.74, 0.88, 1.1), sh * uPlateGrade.z);
}
// The reference environment is more chromatic and a touch cooler than this plate (QC round 1: frame
// saturation 11.8 vs ~13.5, iceberg shadow chroma 47 vs 62): chroma x1.12, up to x1.25 in the shadows, and
// a slight cool white balance. Plate and lake both (the lake skips plateGrade itself).
vec3 envChroma(vec3 c) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = mix(1.06, 1.12, smoothstep(0.0, 0.18, l));
  c = max(vec3(l) + (c - vec3(l)) * k, vec3(0.0));
  return c * vec3(0.985, 1.0, 1.015);
}
`;

/**
 * The far-shore mist shared by the plate and the lake, so the band runs on across the water: drifting wisps
 * (world-anchored noise) and a thin layer, dense below ~2 m, from ~35 m out.
 */
export const GLSL_PLATE_MIST = /* glsl */ `
${ATMOS_URL.mist ? "#define ATMOS_STEADY_WISP" : ""}
${ATMOS_URL.berg ? "#define ATMOS_BERG" : ""}
${ATMOS_URL.bergDrift ? "#define BERG_DRIFT" : ""}
#ifdef ATMOS_BERG
${GLSL_ATMOS_BERG}
#endif
float plateMistWisp(vec3 p, float time) {
#ifdef ATMOS_STEADY_WISP
  // Round 11 ATMOS: the band's wisps as drifting structure, not regional breathing. The old field (one 28 m octave, x0.9 around
  // 0.55) ran from -0.35 to 1.45: whole regions brightened and darkened over minutes and went negative (the iceberg's face
  // swung 86 -> 105 R, the far range 176 -> 197, the dark ridge 72 -> 95 luma) while the reference holds them (berg face
  // 111-114, far range 172-173, ridge 85-89 over 16 s). Same mean, ~11 m wisps (2 octaves, +-0.22), carried by the wind
  // (0.44 m/s towards -x, the clouds' and the bank's). Shared by the plate and the water (the band runs on across the lake).
#ifdef ATMOS_BERG
  // Fix round 1: at the iceberg's foot the band comes and goes like the reference's (Atmos.ts GLSL_ATMOS_BERG): x the envelope,
  // scaled so the F000 knot (0.74) leaves the attempt-3 band unchanged; fog and band alike (both take this wisp).
  // (Attempt 4: the envelope only inside the berg's region; outside it bergK is exactly 1, as before.)
  float bergR = bergRegion(p);
  float bergK = bergR > 0.0 ? mix(1.0, mix(BERG_LO, BERG_HI, BERG_ENV(p, time)), bergR) : 1.0;
  return (0.55 + 0.3 * fbm(vec3(p.x * 0.09 + time * 0.04, p.y * 0.2, p.z * 0.09), 2)) * bergK;
#else
  return 0.55 + 0.3 * fbm(vec3(p.x * 0.09 + time * 0.04, p.y * 0.2, p.z * 0.09), 2);
#endif
#else
  return 0.55 + 0.9 * vnoise(vec3(p.x * 0.035 + time * 0.012, p.y * 0.08, p.z * 0.035));
#endif
}
float plateMist(float d, float y) {
  // (x0.66 before the v2 plate's baked mist.)
  return smoothstep(35.0, 70.0, d) * exp(-max(y, 0.0) / 1.6) * 0.45;
}
// Bluer and darker than the aerial-perspective fog (uFogColor shows ~204,210,221 after the grade, which
// lifted the far shore +20 with this band); aims at ~150,168,195 (reference band 131-150, 153-166, 179-190).
const vec3 MIST_COLOR = vec3(0.48, 0.73, 1.28);
// Hold fog bank (reference F358-F460): while the camera dollies in, a soft bank rises from the far shore over
// the mountain bases (F420: the lower ~15 m of the left mountain, x 0-500, y 480-590), broken into the same
// drifting wisps; zero at rest. Mixed towards the aerial fog colour.
// The bank's billow (0.6-1.0) at the last plateBank call: the mix colour follows it (darker swirls in the lows).
float plateBankBillow = 1.0;
float plateBank(float d, vec3 p, float hold, float time) {
  if (hold <= 0.0) return 0.0;
  // (QC round 5: a 1.5-10 m bank washed the massif out; F420's fog sea covers only its lower part.)
  // (0.8-6 m since QC round 5; round 7 with the v4 plates: "far too thin", F420's bank swallows the lower ~45 % of the
  // mountain: 1-18 m.)
  // QC round 8 (T05): a dense, billowy bank with a ragged top at ~11 +- 4 m and a soft 8 m transition (a linear 1-18 m ramp
  // had no top), reaching in to the far floes and the iceberg foot on the water (35 m) and from 60 m higher up. p06: band
  // L168 sd 15 vs F420's 159 / 16.
  // QC round 10: F420 is a dark slate massif over a LIGHTER bank (face L117, bank L162); ours covered the mid face with its
  // 5-13 m edge (face L153 = bank L152, "a flat thin gradient"). Top at 7 +- 3 m with a 5 m edge; the face above darkens.
  float top = 7.0 + 3.0 * fbm(vec3(p.xz * 0.015 + vec2(time * 0.02, 0.0), 1.7), 2);
  float hgt = 1.0 - smoothstep(top - 3.5, top + 1.5, p.y);
  plateBankBillow = 0.6 + 0.4 * fbm(p * 0.035 + vec3(time * 0.014, 0.0, time * 0.006), 3);
  float reach = mix(smoothstep(35.0, 90.0, d), smoothstep(60.0, 120.0, d), smoothstep(2.0, 4.0, p.y));
  return hold * reach * step(d, 330.0) * hgt * plateBankBillow;
}
${ATMOS_URL.shore ? GLSL_ATMOS_LAKE : ""}
`;

/** An extra projector (EXTRA_PROJECTORS): its camera, depth map and the uniforms the shaders read. */
export type ExtraProjector = {
  key: ProjectorKey;
  define: string;
  camera: THREE.PerspectiveCamera;
  viewProj: THREE.Matrix4;
  coverage: PlateCoverage;
  target: THREE.WebGLRenderTarget | null;
  /** u<P>Depth, View, ViewProjF, CamPos, DepthTexel, DepthOn, Plate, Gain, Mix. */
  uniforms: Record<string, { value: unknown }>;
};

/** The uniforms and defines of every extra projector plus uRestMix, for the plate and the lake materials. */
export type ExtraProjectorBinding = { uniforms: Record<string, { value: unknown }>; defines: Record<string, string> };

/** Uniforms of GLSL_PLATE_OCCLUSION, shared by the plate and the lake materials. */
export type PlateOcclusionUniforms = {
  uPlateDepth: { value: THREE.Texture | null };
  uPlateView: { value: THREE.Matrix4 };
  uPlateViewProjF: { value: THREE.Matrix4 };
  uPlateCamPos: { value: THREE.Vector3 };
  uPlateDepthTexel: { value: THREE.Vector2 };
  uPlateDepthOn: { value: number };
  /** The plate camera's projection terms (p00, p11, p20, p21), to rebuild what it saw along a ray (plateSeenY). */
  uPlateFrustum: { value: THREE.Vector4 };
  /** GLSL_PLATE_GRADE (shared by the same two materials). */
  uPlateGrade: { value: THREE.Vector3 };
};

/**
 * Bake pass over the projector depth map (r: view depth). For every lake texel, marches the mirror ray
 * (the plate camera's view ray reflected off the water) through the depth map: the first point the plate
 * camera sees something in front of is where the ray meets the floe, rock or mountain the plate shows
 * reflected there. Writes (r, g, distance from the lake point; 60000 for sky or off-plate; 0 off the lake).
 */
const GLSL_REFLECTION_DISTANCE = /* glsl */ `
uniform sampler2D uSrc;
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform mat4 uView;
uniform mat4 uViewProj;
uniform vec3 uCamPos;
varying vec2 vUv;
bool occludedAt(vec3 q) {
  vec4 c = uViewProj * vec4(q, 1.0);
  vec2 uq = c.xy / c.w * 0.5 + 0.5;
  float zq = -(uView * vec4(q, 1.0)).z;
  return texture2D(uSrc, uq).r < zq * 0.995 - 0.05;
}
void main() {
  vec4 c = texture2D(uSrc, vUv);
  float L = 0.0;
  if (c.r < 300.0) {
    vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
    vec3 dv = normalize(v.xyz / v.w);
    vec3 P = (uCamWorld * vec4(dv * (c.r / max(-dv.z, 1e-4)), 1.0)).xyz;
    if (abs(P.y) < 0.05) {
      vec3 d = normalize(P - uCamPos);
      vec3 rd = vec3(d.x, -d.y, d.z);
      L = 60000.0;
      float tPrev = 0.0;
      float t = 0.15;
      for (int i = 0; i < 60; i++) {
        vec3 q = P + rd * t;
        vec4 qc = uViewProj * vec4(q, 1.0);
        vec2 uq = qc.xy / qc.w * 0.5 + 0.5;
        if (qc.w <= 0.0 || uq.x < 0.0 || uq.x > 1.0 || uq.y < 0.0 || uq.y > 1.0) break;
        if (occludedAt(q)) {
          float a = tPrev, b = t;
          for (int k = 0; k < 6; k++) {
            float m = 0.5 * (a + b);
            if (occludedAt(P + rd * m)) b = m; else a = m;
          }
          L = b;
          break;
        }
        tPrev = t;
        t *= 1.15;
      }
    }
  }
  gl_FragColor = vec4(c.r, c.g, L, 1.0);
}
`;

const DEPTH_VERT = /* glsl */ `
varying float vViewZ;
void main() {
  vec4 v = modelViewMatrix * vec4(position, 1.0);
  vViewZ = -v.z;
  gl_Position = projectionMatrix * v;
}
`;
const DEPTH_FRAG = /* glsl */ `
varying float vViewZ;
void main() {
  gl_FragColor = vec4(vViewZ, 0.0, 0.0, 1.0);
}
`;

export const DEFAULT_PLATE_META: PlateMeta = {
  overscanX: PLATE.overscanX,
  overscanTop: PLATE.overscanY,
  overscanBottom: PLATE.overscanY,
  exposureStops: PLATE.exposureStops,
};

const PLATE_VERT = /* glsl */ `
uniform mat4 uPlateViewProj;
varying vec4 vPlateClip;
varying vec3 vWorldPos;
#ifdef BAKED_ENV
varying vec2 vBakeUv;
#endif
#ifdef ATMOS_CARDLIGHT
uniform vec3 uPlateCamPos;
${GLSL_CARD_LIGHT_VERT}
#endif
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vPlateClip = uPlateViewProj * wp;
#ifdef BAKED_ENV
  vBakeUv = uv;
#endif
#ifdef ATMOS_CARDLIGHT
  // Round 11 ATMOS fix round 1: the drifting cards' light (Atmos.ts). The world normal, turned towards the rest camera (the
  // photogrammetry meshes carry folded triangles; the fit took the face the rest view sees).
  vec3 wn = normalize((vec4(normalMatrix * normal, 0.0) * viewMatrix).xyz);
  if (dot(wn, uPlateCamPos - wp.xyz) < 0.0) wn = -wn;
  vCardDE = cardLightDelta(wp.xyz, wn);
#endif
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const PLATE_FRAG = /* glsl */ `
${GLSL_COMMON}
${GLSL_PLATE_OCCLUSION}
#ifdef EXTRA_PROJECTORS
${GLSL_EXTRA_PROJECTORS}
#endif
${GLSL_PLATE_GRADE}
${GLSL_PLATE_MIST}
${GLSL_ATMOS_MIST}
#ifdef ATMOS_CARDLIGHT
${GLSL_CARD_LIGHT_FRAG}
#endif
#ifdef AA_RESOLVE
${GLSL_AA_RESOLVE}
#endif
uniform sampler2D uPlate;
uniform float uPlateGain;
uniform float uDofBlur;     // max extra mip level while the camera is dollied in
uniform float uFocusDist;   // distance of the hero from the camera
uniform float uFocusRange;
uniform vec3 uFog;          // x: start distance, y: full distance, z: amount
uniform float uFogHeight;
uniform vec3 uFogColor;
uniform float uTime;
uniform float uHold;        // dolly progress (0 at rest)
uniform float uFogHold;     // the hold fog bank (follows the dolly in, lingers after a release)
varying vec4 vPlateClip;
varying vec3 vWorldPos;
#ifdef BAKED_ENV
// Baked environment (QC round 10 / the client: projected plates doubled the mountains whenever the camera moved): every
// surface carries ONE texture in its own UV space (scratchpad pipeline bake_env_m8.py: the plates projected where a plate
// camera saw the texel, a Cycles light bake elsewhere), in the plates' encoding, so the grade below is unchanged.
uniform sampler2D uBaked;
uniform vec3 uBakedGain;
// Round 11: 1 while LakeMirror draws the environment from the mirrored camera (raw colour, alpha = path length).
uniform float uMirrorPass;
varying vec2 vBakeUv;
#ifdef BAKED_LOD_GRAD
// Main HDR target size in px (RenderPipeline.setSize), and the bake UV's screen derivatives taken once in main (uniform
// control flow; samplePlate is also called inside branches).
uniform vec2 uResolution;
vec2 gBakeDx;
vec2 gBakeDy;
#endif
#ifdef BAKED_WISP
// Round 11 step 2: the summit wisp (V2_SummitWisp, A1 2.1 #2). A Blender card (render_sky_equirect.py: premultiplied
// scene-linear RGBA, alpha = 1 - transmittance, rendered alone from the rest plate camera at the plates' texel density) on a
// quad through the volume's centre facing the rest camera. The bake of BG.001 / V2_Massif has no wisp, so the card is
// composited here, into the surface's own texel BEFORE the grade, as the plates had it in their pixels: every grade, mask,
// fog and DOF term below sees the projected path's input. From a moved camera the wisp keeps its own depth (~116 m), in front
// of the 372 m sky card: one wisp, no double.
uniform sampler2D uWisp;
uniform vec3 uWispO;   // quad corner bottom-left (world)
uniform vec3 uWispU;   // bottom-right - bottom-left
uniform vec3 uWispV;   // top-left - bottom-left
#ifdef ATMOS_WISP
uniform vec4 uAtmosWisp; // Round 11 ATMOS spindrift: x envelope, y downwind uv shift, z erosion threshold, w puff seed
#endif
vec3 gWisp;            // xy: the card uv where the camera ray to this fragment crosses the quad; z: its weight (0 = none)
#endif
#endif

vec3 samplePlate(vec2 uv, float lod) {
#ifdef BAKED_ENV
#ifdef BAKED_LOD_GRAD
  // Round 11 (bake v9): the projected path samples the plate at the ABSOLUTE mip lodDof, i.e. a blur of 2^lod plate texels,
  // = 2^lod * W / 1800 screen px (1800 plate texels span the rest frame width). The same screen-space blur from any baked
  // texture density: its own screen gradients scaled by that footprint (A1 3.2; anisotropic filtering kept). v8 added lod as
  // a bias on the texture's own mip: 0.3 mip softer at 1440 px, more on denser textures (defect 4).
  float k = exp2(lod) * uResolution.x / 1800.0;
  vec3 c = textureGrad(uBaked, vBakeUv, gBakeDx * k, gBakeDy * k).rgb * uPlateGain * uBakedGain;
#else
  // (v8, ?envlod=bias) The plate's absolute DOF mips as a bias on the texture's own mip.
  vec3 c = texture2D(uBaked, vBakeUv, lod).rgb * uPlateGain * uBakedGain;
#endif
#ifdef ATMOS_CARDLIGHT
  c = cardLit(c, CARD_K);
#endif
#ifdef BAKED_WISP
  // The card is at the plates' texel density, so the plate's absolute DOF mip is its own (blurred exactly as the plate's wisp).
  if (gWisp.z > 0.0) {
    vec4 w = textureLod(uWisp, gWisp.xy, lod) * gWisp.z;
    c = w.rgb + (1.0 - w.a) * c;
  }
#endif
  return c;
#else
  return textureLod(uPlate, clamp(uv, vec2(0.0005), vec2(0.9995)), lod).rgb * uPlateGain;
#endif
}
#if defined(BAKED_ENV) && defined(BAKED_LOD_GRAD)
// Round 11 step 2: the grade's blurred re-samples (local contrast, ridge clamp, base mist: lod + 1.5 .. 3) are isotropic, as
// the projected path's textureLod of the plate: the level of the screen footprint's longer axis. An anisotropic textureGrad
// there cost ~0.4-0.8 ms at T1 for no visible gain; the main sample above keeps it (lead decision a).
vec3 samplePlateBlur(vec2 uv, float lod) {
  vec2 ts = vec2(textureSize(uBaked, 0));
  float k = exp2(lod) * uResolution.x / 1800.0;
  float l = log2(max(max(length(gBakeDx * ts), length(gBakeDy * ts)) * k, 1.0));
  vec3 c = textureLod(uBaked, vBakeUv, l).rgb * uPlateGain * uBakedGain;
#ifdef ATMOS_CARDLIGHT
  c = cardLit(c, CARD_K);
#endif
#ifdef BAKED_WISP
  if (gWisp.z > 0.0) {
    vec4 w = textureLod(uWisp, gWisp.xy, lod) * gWisp.z;
    c = w.rgb + (1.0 - w.a) * c;
  }
#endif
  return c;
}
#else
#define samplePlateBlur samplePlate
#endif
// Plate uv -> the rest frame (0..1, y up), so the region masks below do not depend on the plate's overscan
// (uPlateOver = x, top, bottom; v1 was 0.12 / 0.20 / 0.05, v2 0.15 / 0.20 / 0.13).
uniform vec3 uPlateOver;
vec2 restFrame(vec2 uv) {
  return vec2(uv.x * (1.0 + 2.0 * uPlateOver.x) - uPlateOver.x, uv.y * (1.0 + uPlateOver.y + uPlateOver.z) - uPlateOver.z);
}
// The region that may hold the far-left ridge (rest frame x < 0.24-0.32). The ridge itself is picked out by its depth
// band and height in main (geometry-following): the old rectangle (x < 0.07-0.12, y 0.40-0.74) ended in a vertical
// curtain across the ridge's flank at rest and left the flank pale in orbit views (QC round 5, T03).
float plateRidgeArea(vec2 uv) {
  vec2 f = restFrame(uv);
  return 1.0 - smoothstep(0.24, 0.32, f.x);
}

void main() {
  vec2 uv0 = vPlateClip.xy / vPlateClip.w * 0.5 + 0.5;
#ifdef BAKED_ENV
#ifdef BAKED_LOD_GRAD
  gBakeDx = dFdx(vBakeUv);
  gBakeDy = dFdy(vBakeUv);
#endif
  // Round 11, the lake mirror pass (LakeMirror): the Cycles lake mirrored the UNGRADED scene, and the water grades what it
  // reflects itself (as it graded the plate's lake), so the mirror gets the raw plate-space colour, sharp at the mirror
  // target's own resolution (the water applies the lake's DOF), with the mirror path length in alpha (hero occlusion).
  if (uMirrorPass > 0.5) {
#ifdef ATMOS_CARDLIGHT
    // (The lake mirrors the same moving card light.)
    gl_FragColor = vec4(cardLit(texture2D(uBaked, vBakeUv).rgb * uPlateGain * uBakedGain, CARD_K), distance(cameraPosition, vWorldPos));
#else
    gl_FragColor = vec4(texture2D(uBaked, vBakeUv).rgb * uPlateGain * uBakedGain, distance(cameraPosition, vWorldPos));
#endif
    return;
  }
#ifdef BAKED_WISP
  {
    // The camera ray to this fragment against the card's plane (t: 0 at the camera, 1 at the fragment).
    vec3 dir = vWorldPos - cameraPosition;
    vec3 n = cross(uWispU, uWispV);
    float dn = dot(dir, n);
    float t = abs(dn) > 1e-9 ? dot(uWispO - cameraPosition, n) / dn : -1.0;
    vec3 q = cameraPosition + dir * t - uWispO;
    vec2 wuv = vec2(dot(q, uWispU) / dot(uWispU, uWispU), dot(q, uWispV) / dot(uWispV, uWispV));
    float inside = step(0.0, wuv.x) * step(wuv.x, 1.0) * step(0.0, wuv.y) * step(wuv.y, 1.0) * step(0.0, t);
    // A surface inside the volume (the summit) sees only the part of the wisp in front of it: full weight 3 m behind the
    // card's plane, none 3 m in front (the volume is ~6 m deep), instead of a hard line where a surface crosses the plane.
#ifdef ATMOS_WISP
    // Round 11 ATMOS: spindrift. The reference's summit wisp is a gust that blows off the summit, drifts downwind (-x) and
    // breaks up within ~4 s (Loop F0-F40 x3, State F0; none F170-F330). Each puff (Atmos.ts wispPuff, on the CPU): x the
    // envelope, the card's content shifted downwind by uAtmosWisp.y, eroded by a noise threshold that rises with its age.
    float wErode = 0.5 + 0.5 * vnoise(vec3(wuv * vec2(7.0, 4.5) + vec2(uAtmosWisp.y * 3.0, 0.0), uAtmosWisp.w * 17.0));
    float wKeep = smoothstep(uAtmosWisp.z - 0.12, uAtmosWisp.z + 0.12, wErode);
    gWisp = vec3(wuv + vec2(uAtmosWisp.y, 0.0), inside * smoothstep(-3.0, 3.0, (1.0 - t) * length(dir)) * uAtmosWisp.x * wKeep);
#else
    gWisp = vec3(wuv, inside * smoothstep(-3.0, 3.0, (1.0 - t) * length(dir)));
#endif
  }
#endif
  // No projection: nothing is hidden from a texture on its own surface (uv / uv0 only drive the region masks).
  vec2 uv = uv0;
  float nofill = 0.0;
#else
  vec2 uv = plateUnoccluded(uv0, vWorldPos, 0.0);
  // No plausible fill source: the projector's own texel, but heavily blurred (never a crisp copy of the occluder).
  float nofill = step(uv.x, -0.5);
  if (nofill > 0.5) uv = uv0;
#endif
  // A fragment hidden from the projector whose camera ray meets the occluder's surface (tested at the occluder's
  // depth) is seen through a crack in the decimated proxy, not revealed by parallax: it takes the occluder's own
  // texel. Its fill took the massif's snow and drew white streaks across the navy ridge in cursor-orbit views
  // (QC round 4, T06). At the projector itself every hidden fragment is such a crack. Far field only (> 40 m).
#ifndef BAKED_ENV
  if (uPlateDepthOn > 0.5) {
    float oz0 = DEPTH_TAP(uPlateDepth, clamp(uv0, vec2(0.0), vec2(1.0))).r;
    float fz0 = -(uPlateView * vec4(vWorldPos, 1.0)).z;
    if (oz0 > 40.0 && oz0 < 300.0 && fz0 > oz0 * 1.02 + 0.5) {
      float ez = -(uPlateView * vec4(cameraPosition, 1.0)).z;
      vec3 P = cameraPosition + (vWorldPos - cameraPosition) * clamp((oz0 - ez) / max(fz0 - ez, 1e-3), 0.0, 1.0);
      vec4 pp = uPlateViewProjF * vec4(P, 1.0);
      vec2 q = clamp(pp.xy / pp.w * 0.5 + 0.5, vec2(0.0), vec2(1.0));
      if (plateDepthAt(q) < -(uPlateView * vec4(P, 1.0)).z * 1.05 + 0.5) {
        uv = uv0;
        nofill = 0.0;
      }
    }
  }
#endif
  // Filled fragments (hidden from the projector, given texels from beside them) are sampled blurred: under
  // the hold dolly the sideways fill on near floes and rocks drew sharp stair-step tears (QC round 3).
  float filled = step(1e-5, distance(uv, uv0)) * smoothstep(1.0, 4.0, distance(cameraPosition, uPlateCamPos));
  // Cracks and slivers in the decimated proxies show a farther, lower surface (or the 372 m backdrop)
  // through them; its colour comes from the plate texel of the nearer surface the projector saw, but it
  // took the fog of its own (lower, farther) point and drew white ticks and hairlines over the far-left
  // ridge. Fog and haze are taken at the projector's surface whenever the fragment lies behind it (after
  // the occlusion fill, a moved camera's legit parallax samples background texels, so pz ~ fz there).
  float fz = -(uPlateView * vec4(vWorldPos, 1.0)).z;
#ifdef BAKED_ENV
  // Real geometry: the fragment is the surface (no proxy crack or fill to correct), so every depth gate, mask and the fog
  // take its own rest-projector depth / position (a massif face revealed behind the ridge is not the ridge).
  float pz = fz;
  vec3 fp = vWorldPos;
#else
  float pz = DEPTH_TAP(uPlateDepth, uv).r;
  vec3 fp = vWorldPos;
  if (uPlateDepthOn > 0.5 && pz < 300.0 && fz > pz * 1.02 + 0.5) fp = cameraPosition + (vWorldPos - cameraPosition) * (pz / fz);
#endif
  float d = distance(cameraPosition, fp);
  // + the near foreground (< ~12 m): F000's rocks and snow at the frame bottom are defocused, ours were crisp (QC round 7).
  // Hold DOF (QC round 8, T05): the focus range narrows to 10 m and the near blur moves out with the dolly.
  float lodDof = uDofBlur * smoothstep(0.0, mix(uFocusRange, 10.0, uHold), abs(d - uFocusDist)) + 1.6 * (1.0 - smoothstep(8.0 + 10.0 * uHold, 16.0 + 12.0 * uHold, d));
  float lod = lodDof + 3.0 * filled + 4.0 * nofill;
#ifdef HAZE_VEIL
  // Round 11 ATMOS fix round 2 (judge2 MAJOR 1, Atmos.ts atmosVeilSoftK): the face under the veil is soft, as the reference's (more
  // DOF there; it gives way to the hold's fog bank as the veil does).
  lod += atmosVeilSoftK(fp, uTime, 1.0 - smoothstep(0.0, 0.6, uFogHold));
#endif
  vec3 col = samplePlate(uv, lod);
#ifdef BAKED_ENV
  float occZ = fz;
#else
  float occZ = DEPTH_TAP(uPlateDepth, clamp(uv0, vec2(0.0), vec2(1.0))).r;
#endif
#ifdef EXTRA_PROJECTORS
  // Extra projectors (hold pose, orbit extremes): each fragment takes the plates that actually see it, weighted
  // by the camera's proximity to each; one that no projector sees keeps the proximity blend of their fills.
  {
    float vis1 = uPlateDepthOn > 0.5 ? plateVisible(clamp(uv0, vec2(0.0), vec2(1.0)), fz) : 1.0;
    float w0 = max(uRestMix, 0.001) * (vis1 + 0.02);
    vec3 acc = col * w0;
    float wsum = w0;
${GLSL_PLATE_PROJECTOR_BLEND}
    col = acc / wsum;
  }
#endif
  // The reference's shaded snow and ice sit lower and bluer than this plate (QC: P10 luma 105 vs 129,
  // half the saturation): deepen the lower half of the tone curve towards slate blue, keep the highlights.
  col = envChroma(plateGrade(col));
  {
    // Near crushed blacks (QC round 7: the bottom-left corner 39,75,119 vs F000's 60,89,125, a flat ultramarine): the
    // darkest near shadows lifted and desaturated a little (-21 -> -7; the mid shadows are left alone).
    float nearK = (1.0 - smoothstep(12.0, 22.0, d)) * uPlateDepthOn;
    float ln = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float shK = nearK * (1.0 - smoothstep(0.02, 0.12, ln));
    col = mix(col, mix(vec3(ln), col, 0.7) * 1.25 + vec3(0.006, 0.008, 0.01), shK * 0.8);
    // The plate's bottom overscan rows (only the low pointer's pan reaches them): their recesses read as holes; the darkest
    // lifted on a soft curve (QC round 8-9, T03).
    float ovK = (1.0 - smoothstep(-0.02, 0.0, restFrame(uv0).y)) * (1.0 - smoothstep(10.0, 14.0, d)) * uPlateDepthOn;
    float lo = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float lt = lo < 0.05 ? 0.05 * pow(max(lo, 0.0) / 0.05, 0.7) : lo;
    col = mix(col, mix(vec3(lt), col * (lt / max(lo, 1e-4)), 0.7), ovK);
  }
  {
    // Crushed-black toe at any distance (QC rounds 9-10: bottom-rock 1 % luma 24 vs F000's 45; pure-black slits): linear
    // luma below 0.045 on a 0.7 power, a quarter less chroma there. Nothing above the darkest ~1 % moves.
    float lz = dot(col, vec3(0.2126, 0.7152, 0.0722));
    if (lz < 0.045) {
      float lzt = 0.045 * pow(max(lz, 0.0) / 0.045, 0.7);
      col = mix(vec3(lzt), col * (lzt / max(lz, 1e-5)), 0.75);
    }
  }
  // The far-left ridge reads as a dark navy, shadowed mountain in the reference (F000 x 0-115); this plate
  // lights it like the others. Plate-space region (it moves with the mountain), mountain proxies only.
  // (QC box x 0-100, y 300-420: reference 52,78,111, was 99,113,133 at x0.26 / 0.36 / 0.54.)
  // Taken at the fragment's own projector position (uv0) as well as at its fill source (uv): off the rest
  // pose a fold hidden behind a nearer fold fills from 30+ texels to its right, past the region's soft right
  // edge, and drew bright double lines across the navy whenever the camera moved (seam probe: 93 -> 25 px).
  // Only for a fold of the ridge itself (within 30 % of the occluder's depth): a farther mountain revealed
  // beside the ridge keeps its own colour.
  float ridge = max(plateRidgeArea(uv), plateRidgeArea(uv0) * step(fz, occZ * 1.3 + 5.0));
  // Only the near ridge itself (its peak ~87 m from the projector): the v2 massif, moved left behind it, starts
  // at ~100 m and must keep its own snow. A fold of the ridge revealed by parallax keeps the navy even when its fill
  // came from the massif (fragment depth as well as the source's). Nearer than ~45 m (rocks, floes) it is not the
  // ridge. F000's ridge stays dark down to the shore only at the far left (x < ~120 px); further right its foot fades
  // into the base mist (a 0.8-3 m height gate there; everywhere it cut the navy off above the foot: mid left +30).
  float rz = min(pz, fz);
  float footGate = mix(smoothstep(0.1, 0.5, vWorldPos.y), smoothstep(0.8, 3.0, vWorldPos.y), smoothstep(0.1, 0.18, restFrame(uv0).x));
  // ridgeBody: the ridge without the foot gate, for the haze gates below (QC round 8, T04: the gate's 0.4 m step halved
  // the fog and mist above it, a hard grey "lid" ~8 px tall at 87 m).
  float ridgeBody = ridge * step(pz, 300.0) * smoothstep(40.0, 50.0, rz) * (1.0 - smoothstep(96.0, 100.0, rz)) * uPlateDepthOn;
  ridge = ridgeBody * footGate;
  // Navy with the plate's own rock detail kept (local luminance over a blurred copy, x1.6) and a top-to-base
  // gradient, darkest in the upper half (QC round 2: a flat multiply read as a cut-out; target ~31,51,83 up
  // top, ~52,78,111 overall). Filled fragments take plain navy: their texels come from another part of the
  // mountain, whose snow edges the detail ratio and the 5 % plate leak would still draw as faint lines.
  float moved = step(1e-5, distance(uv, uv0));
  vec3 ridgeBlur = plateGrade(samplePlateBlur(uv, lod + 3.0));
  float ridgeDet = clamp(dot(col, vec3(0.2126, 0.7152, 0.0722)) / max(dot(ridgeBlur, vec3(0.2126, 0.7152, 0.0722)), 1e-4), 0.7, 1.3);
  ridgeDet = mix(ridgeDet, 1.0, moved);
  vec3 navy = vec3(0.018, 0.038, 0.085) * mix(1.0, 0.62, smoothstep(0.525, 0.65, restFrame(uv0).y)) * ridgeDet;
  // Off since the v5 plates (2026-11-13): the ridge is baked dark in Blender (prep_v4.py), so the plate carries it in
  // every projector and it never misregisters (the overlay drew white slivers, a doubled crest and a fringe whenever the
  // camera moved, QC round 7). The ridge mask still keeps the fog and haze off it below (F000's ridge is crisp).
  col = mix(col, navy, 0.0 * ridge * mix(0.95, 1.0, moved));
  // The right iceberg's shaded faces are a deeper, saturated glacier blue in the reference (QC box: 124,146,176
  // vs 144,160,181; ~0.8x the luma, ~1.5x the chroma); its snow cap stays white. Plate region at its depth.
  float lumaI = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec2 fr = restFrame(uv);
  float berg = smoothstep(0.624, 0.661, fr.x) * (1.0 - smoothstep(0.884, 0.922, fr.x)) * smoothstep(0.3625, 0.4, fr.y) * (1.0 - smoothstep(0.6, 0.65, fr.y));
  berg *= smoothstep(50.0, 55.0, pz) * (1.0 - smoothstep(78.0, 85.0, pz)) * uPlateDepthOn * (1.0 - smoothstep(0.45, 0.65, lumaI));
  // (Half of it in the hold, a little desaturated: QC round 8, T05, the iceberg read too crisp and saturated there.)
#ifdef ATMOS_GRADE
  // Round 11 ATMOS: the rest chroma / gain re-fitted to F000 (Atmos.ts uAtmosGrade); the hold's own values unchanged.
  col = mix(col, max(mix(vec3(lumaI), col, mix(uAtmosGrade.x, 0.88, uHold)) * mix(uAtmosGrade.y, 0.95, uHold), vec3(0.0)), berg * (1.0 - 0.5 * uHold));
#else
  col = mix(col, max(mix(vec3(lumaI), col, mix(1.5, 0.88, uHold)) * mix(0.82, 0.95, uHold), vec3(0.0)), berg * (1.0 - 0.5 * uHold));
#endif
  // Right-side foreground rocks: their shadows are a deep cobalt in the reference (QC box x1300-1420,
  // y590-640: 30,69,112 vs 53,91,132). Plate region, near proxies, shadows only.
  float rockR = smoothstep(0.7232, 0.7976, fr.x) * (1.0 - smoothstep(0.3625, 0.425, fr.y)) * step(pz, 40.0) * uPlateDepthOn;
  rockR *= 1.0 - smoothstep(0.25, 0.5, dot(col, vec3(0.2126, 0.7152, 0.0722)));
  col = mix(col, col * vec3(0.42, 0.6, 0.74), rockR);
  // The far mountains read too white and flat: local contrast (an unsharp mask against a 2.5-mip blur, +60 %)
  // brings back the blue-grey ridges and gullies (QC round 2), then a lighter aerial perspective.
  float farBand = smoothstep(55.0, 70.0, pz) * (1.0 - smoothstep(300.0, 330.0, pz)) * uPlateDepthOn * (1.0 - ridgeBody);
  if (farBand > 0.0) {
    vec3 mb = plateGrade(samplePlateBlur(uv, lod + 2.5));
    // (Its dark side capped: around a bright patch the unsharp mask drew a dark halo, QC round 9 / v7 plates.)
    col = max(col + max(col - mb, vec3(-0.03)) * 0.22 * farBand, vec3(0.0));
  }
  if (ridgeBody > 0.0) {
    // 1-px bright specks along a diagonal on the ridge in the orbit views (QC round 9; engine-side pinholes along a proxy
    // seam, the raw plates are clean): each ridge pixel clamped against a 1.5-mip blur. Broad snow streaks stay.
    vec3 rbf = plateGrade(samplePlateBlur(uv, lod + 1.5));
    col = mix(col, min(col, rbf * 1.35 + vec3(0.015)), ridgeBody);
    // Slate, not electric navy (QC round 10: x10-90 y300-340 B +28 vs F000, chroma +33 %): 35 % less chroma, ~15 % darker.
    float lrd = dot(col, vec3(0.2126, 0.7152, 0.0722));
#ifdef ATMOS_GRADE
    // Round 11 ATMOS: on the ridge's body the chroma is kept and the tint re-fitted to F000 under the steady ridge fog (Atmos.ts
    // uAtmosGrade.z, uAtmosRidgeTint); its foot (below ~3.5 m, in the base haze) keeps the integrated slate.
    vec3 slateR10 = mix(vec3(lrd), col, 0.65) * vec3(0.8, 0.86, 0.9);
    vec3 slateR11 = mix(vec3(lrd), col, uAtmosGrade.z) * uAtmosRidgeTint;
#ifdef RIDGE_FIT
    // (Fix round 2, judge2 minor 3, Atmos.ts ATMOS_RIDGE_FIT: the re-fitted slate only low on the face; the integrated slate above.)
    float r11w = uAtmosRidgeFit.x * smoothstep(0.3, 3.5, fp.y) * (1.0 - smoothstep(uAtmosRidgeFit.y, uAtmosRidgeFit.z, fp.y));
    col = mix(col, mix(slateR10, slateR11, r11w), ridgeBody);
#else
    col = mix(col, mix(slateR10, slateR11, smoothstep(0.3, 3.5, fp.y)), ridgeBody);
#endif
#else
    col = mix(col, mix(vec3(lrd), col, 0.65) * vec3(0.8, 0.86, 0.9), ridgeBody);
#endif
  }
  // Less of it in the hold: F420's massif is a crisp blue-grey face (118,139,168), ours read pale and soft (171,180,194).
  // The far-field haze and bank below follow d / fp, i.e. the REST projector's surface. A sky (backdrop) fragment that the
  // rest plate sees behind the far range takes the range's ~180 m and got the mountains' haze and hold bank: the range's
  // rest-view silhouette showed as a flat, stair-stepped copy above the real range in the hold and the orbits (QC round 9,
  // "doubled mountains"). The sky never takes them: gated on the fragment's own distance as well.
  float skyGate = 1.0 - smoothstep(325.0, 340.0, distance(cameraPosition, vWorldPos));
  // (x(1 - 0.6 uHold) until QC round 8, T05: the massif kept most of its rest haze in the hold; F420 L148, was 177 -> 163.)
  // (0.24 until QC round 10: the massif flank +15 vs F000, the far-right range's peaks almost erased.)
  col = mix(col, uFogColor * 0.85, smoothstep(60.0, 140.0, d) * step(d, 330.0) * 0.17 * (1.0 - 0.85 * uHold) * (1.0 - ridgeBody * 0.9) * skyGate);
  // Low mist band: aerial perspective that gathers near the lake (mountain bases, far floes), broken into
  // slow drifting wisps (the reference's mist at the bases and the iceberg foot).
  float wisp = plateMistWisp(fp, uTime);
  // (x0.9 cut the fog at the old rectangular mask: a vertical curtain at rest. Some mist sits on the ridge's foot, F000.)
  // A soft ramp over the ridge's foot instead of the foot gate's step (the "lid"), and a steel-blue foot mist instead of the
  // neutral grey that the mist and fog colours made over the dark rock (QC round 8, T04).
  float ridgeUp = smoothstep(0.3, 3.5, fp.y);
  float shade = 1.0 - 0.5 * ridgeBody * ridgeUp;
  float ridgeFoot = ridgeBody * (1.0 - ridgeUp);
  vec3 footC = MIST_COLOR * vec3(0.62, 0.80, 1.0);
  float wispFog = wisp;
#ifdef ATMOS_MIST
  // Round 11 ATMOS: the aerial fog over the dark ridge's body holds still (the reference's ridge stays at luma 86-89 while its
  // base mist rolls in); the drifting wisps keep the bases and the low layer.
#ifdef RIDGE_FIT
  // (Fix round 2, judge2 minor 3: the steady fog thinner on the ridge's upper face, Atmos.ts ATMOS_RIDGE_FIT.w; it lifted the frame's
  // darkest anchor +15..+20 there.)
  wispFog = mix(wisp, mix(uAtmosBank.z, uAtmosRidgeFit.w, smoothstep(uAtmosRidgeFit.y, uAtmosRidgeFit.z, fp.y)), ridgeBody * ridgeUp);
#else
  wispFog = mix(wisp, uAtmosBank.z, ridgeBody * ridgeUp);
#endif
  // The bank (Atmos.ts): while it is out, the haze at the bases thins to the reference's clear F000 (x uAtmosBank.y), low down
  // inside the plain's box only; it gives way to the hold's own fog bank.
  float atmosHoldK = 1.0 - smoothstep(0.0, 0.6, uFogHold);
#ifdef ATMOS_MIST3
  atmosRidge = ridgeBody;
#endif
  // (Attempt 5, cost: not evaluated under the hold's own fog bank, atmosHoldK = 0, where every use of the bank and of its
  // globals is multiplied by 0; the globals keep their zero initialisers.)
  float atmosBk = 0.0;
  if (atmosHoldK > 0.0) atmosBk = atmosBank(fp, uTime) * skyGate * atmosHoldK;
  float atmosBaseK = mix(1.0, mix(uAtmosBank.y, 1.0, atmosEnv), atmosRegion * (1.0 - smoothstep(2.5, 4.0, fp.y)) * (1.0 - ridgeBody * ridgeUp) * atmosHoldK);
  wispFog *= atmosBaseK;
#endif
  // The mountain bases sit under a white band baked into the plate (the v2 volumetric mist: ~200,205,215 vs the
  // reference's 139,157,182 at 150-450 x 385-425, QC round 5): on the left mountains' feet (surfaces above the floes)
  // local contrast brings back the slopes and a blue-grey multiply takes the band down towards the reference.
  {
    float lumaH = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float baseK = smoothstep(55.0, 80.0, d) * (1.0 - smoothstep(320.0, 335.0, d)) * (1.0 - smoothstep(4.0, 14.0, fp.y)) * smoothstep(0.4, 1.6, fp.y);
    baseK *= (1.0 - smoothstep(0.3, 0.4, restFrame(uv0).x)) * uPlateDepthOn * smoothstep(0.3, 0.55, lumaH);
    if (baseK > 0.0) {
      vec3 mbl = plateGrade(samplePlateBlur(uv, lod + 2.5));
      // The local contrast's dark side is capped (-0.02): the v7 plates' lower ridge revealed a sunlit face on the massif's
      // left shoulder, and the full undershoot ringed it with a saturated dark-blue outline (QC round 9). Rock ribs keep
      // their texture (massif face sd 25.2 -> 25.1).
      col = max(col + max(col - mbl, vec3(-0.02)) * 0.6 * baseK, vec3(0.0));
      col = mix(col, col * vec3(0.52, 0.62, 0.78), baseK);
      // A soft highlight shoulder above luma 0.7 (that face read starkly white; F000 is a soft grey-white there).
      float lh = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col *= mix(1.0, (0.7 + (lh - 0.7) / (1.0 + 2.5 * max(lh - 0.7, 0.0))) / max(lh, 1e-4), step(0.7, lh) * baseK);
    }
  }
  // A soft blue haze over the far mountains' lower slopes (v4 plates: their baked base mist sits lower, so the massif's
  // mid face read 168 vs F000's 175; +0.15 brings it to 176).
  float slopeH = smoothstep(100.0, 160.0, d) * (1.0 - smoothstep(320.0, 335.0, d)) * smoothstep(1.5, 4.0, fp.y) * (1.0 - smoothstep(10.0, 22.0, fp.y)) * uPlateDepthOn;
  col = mix(col, uFogColor * vec3(0.9, 0.95, 1.02), slopeH * 0.15 * (1.0 - 0.7 * uHold) * skyGate);
  {
    // In the hold the massif above the bank keeps its slate contrast (F420: a crisp blue-grey face), and the near floes'
    // undercuts lift towards the fog (near-black outlines read as holes). QC round 8, T05.
    float lm = dot(col, vec3(0.2126, 0.7152, 0.0722));
    // (QC round 10: gated on d 100-130 and 12-16 m it never reached the face, which sits at d 100-120 / 3-12 m in the hold;
    // now the REST projector's depth (pz >= ~100: the massif and the ranges, never the ridge, berg or floes) above 3-6 m,
    // and x0.6 / x1.4 chroma: p06 upper face L174 -> 157, mid 154 -> 132 vs F420 153 / 117. A local "dehaze" read crunchy.)
    float upK = uHold * smoothstep(96.0, 104.0, pz) * step(pz, 330.0) * smoothstep(3.0, 6.0, fp.y) * uPlateDepthOn * skyGate;
    col = mix(col, (vec3(lm) + (col - vec3(lm)) * 1.4) * 0.6, upK);
    float nk = uHold * (1.0 - smoothstep(20.0, 30.0, d)) * (1.0 - smoothstep(0.06, 0.12, lm));
    col = mix(col, max(col * 1.6, uFogColor * 0.35), nk * 0.6);
  }
  float fog = smoothstep(uFog.x, uFog.y, d) * exp(-max(fp.y, 0.0) / uFogHeight) * uFog.z * wispFog * shade * (1.0 - 0.33 * uHold);
  col = mix(col, mix(uFogColor, footC, ridgeFoot), min(fog, 0.85));
  // (x0.6 / cap 0.65 before the hold plate, which carries the baked volumetric mist seen from the dolly.) A blue-grey
  // fog sea like F420's (148,165,186), not the near-white aerial colour (QC round 5).
  // (QC round 8, T05) Two-tone with the billow, cap 0.8; it leaves most of the ridge above its foot navy (F420 L101).
  {
    float bk = plateBank(d, fp, uFogHold, uTime) * (1.0 - 0.45 * ridgeBody * smoothstep(1.0, 6.0, fp.y)) * skyGate;
    vec3 bankC = mix(uFogColor * vec3(0.30, 0.37, 0.46), uFogColor * vec3(0.44, 0.54, 0.66), plateBankBillow);
    // (Denser and lighter since QC round 10, so the bank reads as fog under the darker face; the water matches.)
    col = mix(col, bankC * 1.08, min(bk, 0.88));
  }
  // A thin, dense layer on the water at the far shore (the blue-white band at the iceberg foot, F000).
  // (Steel blue, half way to footC, and x0.7 since QC round 10: the bases +16 and the plain +19 vs F000. The water matches.)
  float mist = plateMist(d, fp.y) * wisp * shade * 0.7;
#ifdef ATMOS_MIST
  {
    // Round 11 ATMOS: the reference's rolling ground mist over the left mountains' bases (Atmos.ts GLSL_ATMOS_MIST), on top of
    // the band; it gives way to the hold's own fog bank.
    col = mix(col, mix(MIST_COLOR * vec3(0.81, 0.9, 1.0), footC, ridgeFoot), min(mist * atmosBaseK, 0.85));
    mist = 0.0;
#ifdef ATMOS_BERG
    {
      // Fix round 1 (judge1 1c): the milky layer at the iceberg's foot (reference S000 / L040: a pale layer with a flat, slightly
      // ragged top over the berg's lower face and the floes before it; thin at S300-S330, Loop L070-L100), coming and going on
      // the reference's timing (Atmos.ts bergEnvelope); the band and the water take the same envelope through plateMistWisp.
      // (Attempt 4: only inside the berg's region, where it is non-zero; its two noises and the envelope ran for every environment
      // fragment. Outside the region the layer's weight is exactly 0, so nothing changes there.)
      float bergR = bergRegion(fp);
      if (bergR > 0.0) {
        float btop = uAtmosBerg.y + 0.5 * fbm(vec3(fp.x * 0.16 + uTime * 0.07, 2.3, fp.z * 0.16), 2);
        // (Its own density only above the F000 knot's: at F000 the attempt-3 band already holds the reference's box means, berg
        // foot 126 vs 129; the layer carries the thick phases, Loop L035-L045 139 vs the band alone's 131.)
        float bk = bergR * (1.0 - smoothstep(btop - 1.2, btop + 0.4, fp.y)) * smoothstep(0.72, 1.0, BERG_ENV(fp, uTime)) * skyGate * atmosHoldK;
        col = mix(col, uAtmosBergC * (0.94 + 0.12 * fbm(vec3(fp.x * 0.4 + uTime * 0.06, fp.y * 0.6, fp.z * 0.4), 2)), min(bk * uAtmosBerg.x, uAtmosBerg.z));
      }
    }
#endif
#ifdef ATMOS_MIST3
    // Fix round 1: the dense core may hide the plain (cap 0.97); a white, billowy mass like the reference's (S320, L090). Its
    // upper part takes the thin colour (uAtmosVeilC) where it is thin, the thick one (uAtmosBankLo) where dense. Low down at the
    // dark ridge's foot the full bank reads darker than over the plain (reference 126-130 vs 183: the ridge's lee),
    // uAtmosVeil2.x there. The face just above a thick bank darkens (uAtmosVeil2.y, multiplied: its gullies stay), and a bright
    // thin veil rides up the face while the bank rolls in or out (S210: rows 280-320 +9..+14 over S000; none at S320).
    float thickK = smoothstep(0.45, 0.95, atmosBk);
    vec3 bankUp = mix(uAtmosVeilC, uAtmosBankLo, thickK);
    float leeK = (1.0 - smoothstep(-31.0, -26.0, fp.x)) * (1.0 - smoothstep(2.5, 3.5, fp.y));
    vec3 bankC = mix(uAtmosBankHi, bankUp, smoothstep(1.5, 4.0, fp.y)) * (0.95 + 0.1 * smoothstep(-0.3, 0.4, atmosBillow)) * mix(1.0, uAtmosVeil2.x, leeK);
    col = mix(col, bankC, min(atmosBk * uAtmosBank.x, 0.97));
#ifdef ATMOS_HAZE
    // Fix round 1, attempt 5: the haze over the massif's foot above the bank (Atmos.ts ATMOS_HAZE), under the shaded band (the
    // reference's haze reads darker low down: V ~196 at 10.5 m -> ~110 at 6.4 m at S320).
#ifdef HAZE_VEIL
#ifdef HAZE_SHADOW
    {
      // Fix round 3 (judge3 MAJOR 1, Atmos.ts HAZE_SHADOW): the slopes under the fog layer lose white light (darker and bluer, as the
      // reference's S320 / L090 lower massif: R -30 G -24 B -17 from S000), broad (no wisps; the veil's time envelope x the bank's),
      // and the veil's low grey-blue in-scatter is cut back; its white-blue top and thick clumps stay over them (the white fog).
      // (Its upper edge rises / sinks with the veil's broad clumps, as the veil's top does: no level edge across the slopes.)
      // (Cost: only where it can act, the massif's foot inside the bank's box, the bank in, its height range; else hzS is 0.)
      if (atmosEnv * atmosRegion > 0.0 && fp.z < -80.0 && fp.y > uAtmosVeilSh2.x && fp.y < uAtmosVeilSh2.w + uAtmosVeilH2.x) {
        float shTop = uAtmosVeilH2.x * (2.0 * atmosHazeClump - 1.0);
        float hzS = pow(max(mix(uAtmosHazeT.x, uAtmosHazeT.y * atmosEnv, uAtmosHazeT.z), 1e-4), uAtmosVeilSh.w) * atmosEnv * atmosRegion
          * (1.0 - atmosRidge) * (1.0 - smoothstep(-86.0, -80.0, fp.z)) * smoothstep(uAtmosVeilSh2.x, uAtmosVeilSh2.y, fp.y)
          * (1.0 - smoothstep(uAtmosVeilSh2.z + shTop, uAtmosVeilSh2.w + shTop, fp.y)) * skyGate * atmosHoldK;
        float lv = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = max(col - vec3(uAtmosVeilSh.x * min(hzS, 1.0) * lv), col * uAtmosVeilSh.y);
      }
      float va = min(atmosHaze * uAtmosHaze.x * skyGate * atmosHoldK, 0.75);
      col = mix(col, mix(uAtmosHazeLo, uAtmosHazeC, atmosHazeH), va * mix(uAtmosVeilSh.z, 1.0, atmosHazeH));
    }
#else
    // (Fix round 2: the graded veil, blue-grey low down to white-blue near its top, Atmos.ts HAZE_VEIL.)
    col = mix(col, mix(uAtmosHazeLo, uAtmosHazeC, atmosHazeH), min(atmosHaze * uAtmosHaze.x * skyGate * atmosHoldK, 0.75));
#endif
#else
    col = mix(col, uAtmosHazeC, min(atmosHaze * uAtmosHaze.x * skyGate * atmosHoldK, 0.75));
#endif
#endif
    col *= 1.0 - uAtmosVeil2.y * atmosShade * skyGate * atmosHoldK;
    col = mix(col, uAtmosVeilC, min(atmosVeil * uAtmosVeil.x * 4.0 * atmosEnv * (1.0 - atmosEnv) * skyGate * atmosHoldK, 0.75));
#else
    col = mix(col, mix(uAtmosBankHi, uAtmosBankLo, smoothstep(1.5, 4.0, fp.y)) * (0.92 + 0.16 * smoothstep(-0.3, 0.4, atmosBillow)), min(atmosBk * uAtmosBank.x, 0.9));
#endif
  }
#endif
#ifdef BAKED_EDGE
  // Round 11 fix round: the view distance in alpha for EnvEdge (soft silhouettes); nothing downstream reads this alpha.
  gl_FragColor = vec4(mix(col, mix(MIST_COLOR * vec3(0.81, 0.9, 1.0), footC, ridgeFoot), min(mist, 0.85)), distance(cameraPosition, vWorldPos));
#else
  gl_FragColor = vec4(mix(col, mix(MIST_COLOR * vec3(0.81, 0.9, 1.0), footC, ridgeFoot), min(mist, 0.85)), 1.0);
#endif
#ifdef AA_RESOLVE
  // aaresolve: below the horizon line the 4x resolve averages tone-compressed samples (chunks.ts GLSL_AA_RESOLVE).
  if (aaIn(gl_FragCoord.xy)) gl_FragColor.rgb = aaCompress(gl_FragColor.rgb);
#endif
}
`;

const CLOUD_VERT = /* glsl */ `
uniform float uTime;
#ifdef CLOUD_R11
uniform vec3 uCloudShift;
#endif
attribute float aSeed;
varying vec2 vUv;
varying float vSeed;
varying vec3 vCloudWorld;
void main() {
  vUv = uv;
  vSeed = aSeed;
  vec3 p = position;
#ifdef CLOUD_R11
  // Round 11 ATMOS: the reference's wind, a rigid leftward conveyor wrapped off screen (Atmos.ts, per card on the CPU).
  p += uCloudShift;
#else
  // Slow, independent drift (a few metres per minute at 80-130 m), plus a breath.
  p.x += sin(uTime * 0.021 + aSeed * 6.0) * 2.4 + uTime * 0.035 * (0.6 + aSeed);
  p.y += sin(uTime * 0.017 + aSeed * 11.0) * 0.5;
#endif
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vCloudWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

/**
 * Cloud shader: occ = 1 where an extra projector near the camera confirms that the camera's ray to the cloud meets a
 * surface it saw in front of the cloud (the same ray-step test as the rest projector's, against its own depth map). The
 * rest projector cannot see what its near objects hide: under the hold dolly the low cloud bank right of the iceberg
 * (behind the far iceberg there) was drawn over that iceberg as a flat grey cut-out (QC round 6, hold / pop).
 */
const GLSL_CLOUD_PROJECTOR_OCC = EXTRA_PROJECTORS.map(
  (e) => /* glsl */ `
#ifdef ${e.define}
  if (u${e.P}DepthOn > 0.5 && u${e.P}Mix > 0.001) {
    vec4 kc = u${e.P}ViewProjF * vec4(vCloudWorld, 1.0);
    vec2 ku = kc.xy / kc.w * 0.5 + 0.5;
    if (kc.w > 0.0 && ku.x > 0.0 && ku.x < 1.0 && ku.y > 0.0 && ku.y < 1.0) {
      float kz = -(u${e.P}View * vec4(vCloudWorld, 1.0)).z;
      vec2 kt = u${e.P}DepthTexel * 2.0;
      float koz = min(min(${e.p}DepthAt(ku), ${e.p}DepthAt(ku + vec2(kt.x, 0.0))), min(${e.p}DepthAt(ku - vec2(kt.x, 0.0)), min(${e.p}DepthAt(ku + vec2(0.0, kt.y)), ${e.p}DepthAt(ku - vec2(0.0, kt.y)))));
      if (koz < kz * 0.9) {
        float kez = -(u${e.P}View * vec4(cameraPosition, 1.0)).z;
        vec3 kP = cameraPosition + (vCloudWorld - cameraPosition) * clamp((koz - kez) / max(kz - kez, 1e-3), 0.0, 1.0);
        vec4 kpp = u${e.P}ViewProjF * vec4(kP, 1.0);
        vec2 kq = clamp(kpp.xy / kpp.w * 0.5 + 0.5, vec2(0.0), vec2(1.0));
        if (${e.p}DepthAt(kq) < -(u${e.P}View * vec4(kP, 1.0)).z * 1.1 + 1.0) occ = max(occ, smoothstep(0.0, 0.08, u${e.P}Mix));
      }
    }
  }
#endif`,
).join("");

const CLOUD_FRAG = /* glsl */ `
${GLSL_COMMON}
${GLSL_ENV}
${GLSL_PLATE_OCCLUSION}
#ifdef EXTRA_PROJECTORS
${GLSL_EXTRA_PROJECTORS}
#endif
uniform sampler2D uCloud;
uniform float uTime;
uniform vec3 uCloudTint;
uniform float uCloudAlbedo;
uniform float uCloudEmission;
#ifdef CLOUD_RANGE
// Round 11 ATMOS fix round 1 (Atmos.ts RANGE_DEPTH): the rest plate's skyline (plate uv y per plate x) and 1 for a card behind
// the far ranges.
uniform sampler2D uRangeCrest;
uniform float uRangeOcc;
#endif
varying vec2 vUv;
varying float vSeed;
varying vec3 vCloudWorld;
#ifdef AA_RESOLVE
${GLSL_AA_RESOLVE}
#endif
void main() {
  // A card behind a mountain proxy showed through the proxy's mesh cracks as white ticks and hairlines on the
  // far-left ridge: where the projector saw a nearer surface, the cloud is hidden behind it.
  if (uPlateDepthOn > 0.5) {
    vec4 pc = uPlateViewProjF * vec4(vCloudWorld, 1.0);
    vec2 puv = pc.xy / pc.w * 0.5 + 0.5;
    if (pc.w > 0.0 && puv.x > 0.0 && puv.x < 1.0 && puv.y > 0.0 && puv.y < 1.0) {
      float fz = -(uPlateView * vec4(vCloudWorld, 1.0)).z;
      // Nearest of a small footprint: right at a silhouette the single texel can still read as sky.
      float oz = plateDepthSolid(puv);
      if (oz < fz * 0.9) {
        // From a moved camera the projector's occluder only hides the cloud if the camera's own ray meets it: the
        // ray is tested at the occluder's depth (at the projector this is the same texel). Culling by the projector
        // alone hid every cloud within the parallax of the ridge and drew a pale halo along its skyline (T06).
        float ez = -(uPlateView * vec4(cameraPosition, 1.0)).z;
        vec3 P = cameraPosition + (vCloudWorld - cameraPosition) * clamp((oz - ez) / max(fz - ez, 1e-3), 0.0, 1.0);
        vec4 pp = uPlateViewProjF * vec4(P, 1.0);
        vec2 q = clamp(pp.xy / pp.w * 0.5 + 0.5, vec2(0.0), vec2(1.0));
        if (plateDepthAt(q) < -(uPlateView * vec4(P, 1.0)).z * 1.1 + 1.0) discard;
      }
    }
  }
  float occ = 0.0;
#ifdef EXTRA_PROJECTORS
${GLSL_CLOUD_PROJECTOR_OCC}
#endif
  if (occ > 0.999) discard;
#ifdef CLOUD_R11
  // Round 11 ATMOS: no boil. The reference's clouds are rigid PNG cards (their per-4-frame shifts are constant to +-0.2 px, no
  // change of shape); only the wind moves them.
  vec2 w = vec2(0.0);
#else
  // Gentle UV turbulence so the silhouettes boil very slowly.
  vec2 w = vec2(vnoise(vec3(vUv * 3.0, uTime * 0.03 + vSeed * 9.0)), vnoise(vec3(vUv * 3.0 + 7.3, uTime * 0.03 + vSeed * 5.0)));
#endif
#ifdef CLOUD_SOFT
  // Round 11 ATMOS: the far field's photographic softness (F000's clouds are as soft as its mountains: the environment's
  // DOF, 2^uDofBlur plate texels = ~2.3 screen px at 1440), as a mip bias over the card's own screen-space mip.
  vec4 t = texture2D(uCloud, vUv + w * 0.004, CLOUD_SOFT);
#else
  vec4 t = texture2D(uCloud, vUv + w * 0.004);
#endif
  // Blender: white emission x2 plus a 0.8 diffuse lit by the world (panorama irradiance here).
  vec3 lit = (vec3(uCloudEmission) + uCloudAlbedo * envIrradiance(vec3(0.0, 0.25, 1.0))) * uCloudTint;
#ifdef CLOUD_RANGE
  if (uRangeOcc > 0.5) {
    // The camera's own ray through this fragment, out where the far ranges stand (~250 m), seen by the rest plate camera: below
    // the skyline there the range is in front of the card. The card fades out over 2-6 px BELOW the skyline (over the range's own
    // opaque, DOF-soft edge): cut at or above it, a sliver of bare sky showed along the crest (a blue rim, worst at the pointer
    // extremes where the ranges' 200-360 m depths parallax by ~3 px against the 250 m estimate).
    vec3 rd = normalize(vCloudWorld - cameraPosition);
    vec4 rc = uPlateViewProjF * vec4(cameraPosition + rd * (250.0 / max(-rd.z, 0.2)), 1.0);
    vec2 ruv = rc.xy / rc.w * 0.5 + 0.5;
    float crest = texture2D(uRangeCrest, vec2(clamp(ruv.x, 0.0, 1.0), 0.5)).r;
    occ = max(occ, 1.0 - smoothstep(crest - 0.0075, crest - 0.0025, ruv.y));
  }
#endif
  gl_FragColor = vec4(lit * t.a, t.a) * (1.0 - occ);
#ifdef AA_RESOLVE
  // (aaresolve: the region is below the horizon line, where the cards do not draw. Should one reach it, it blends over
  // compressed samples with the compression of its own radiance: exact where it is as bright as what it covers.)
  if (aaIn(gl_FragCoord.xy)) gl_FragColor.rgb = aaCompress(lit) * gl_FragColor.a;
#endif
}
`;

export class PlateEnvironment {
  readonly group = new THREE.Group();
  readonly plateCamera: THREE.PerspectiveCamera;
  readonly coverage: PlateCoverage;
  readonly plateGain: number;
  readonly plateMaterial: THREE.ShaderMaterial;
  /** Baked mode's per-surface materials (empty when projecting). */
  bakedMaterials: THREE.ShaderMaterial[] = [];
  /** Round 11: uMirrorPass of every baked material (LakeMirror's pass). */
  private readonly bakedMirrorPass = { value: 0 };
  /** Meshes the lake does not mirror (BG.001: glossy-invisible in the Cycles scene, forensics 1.5). */
  private readonly mirrorHidden: THREE.Object3D[] = [];
  readonly cloudMaterials: THREE.ShaderMaterial[] = [];
  readonly plateViewProj = new THREE.Matrix4();
  readonly occlusion: PlateOcclusionUniforms = {
    uPlateDepth: { value: null },
    uPlateView: { value: new THREE.Matrix4() },
    uPlateViewProjF: { value: new THREE.Matrix4() },
    uPlateCamPos: { value: new THREE.Vector3() },
    uPlateDepthTexel: { value: new THREE.Vector2(1 / 1024, 1 / 512) },
    uPlateDepthOn: { value: 0 },
    uPlateFrustum: { value: new THREE.Vector4(1, 1, 0, 0) },
    // Tuned with region stats against State F000 (iceberg face +25 -> +7, mid left +29 -> +11, sky equal).
    // z: shadow shift towards slate / cobalt (0.35 -> 0.45 with QC round 1's cooler shadows).
    uPlateGrade: { value: new THREE.Vector3(1.3, 1.45, 0.3) },
  };
  private depthTarget: THREE.WebGLRenderTarget | null = null;
  /**
   * Hotfix 2 (smooth waterline, Water.ts SHORE_AA): bake the projector depth maps bilinear-filtered (set before bakeDepth).
   * The lake's depth tests are then continuous across a texel instead of stepping at every one; nearest-filtered, their
   * edges along every floe and rock were texel staircases that crawled when the camera moved. The baked environment's
   * materials do not read these maps (the projected path does: it keeps them nearest); the clouds' and the plate
   * material's reads stay exact (DEPTH_EXACT: texelFetch, the same texel the nearest filter took). `?shoreaa=0` keeps
   * them nearest.
   */
  depthLinear = false;
  private envProxy: THREE.Object3D;
  private cloudGroup = new THREE.Group();
  /** Extra projectors (hold pose, orbit extremes) whose plates are available. */
  readonly projectors: ExtraProjector[] = [];
  /** Their uniforms and defines, for every material that samples the plates (plate, lake). */
  readonly projectorBinding: ExtraProjectorBinding = { uniforms: { uRestMix: { value: 1 } }, defines: {} };

  constructor(
    envProxy: THREE.Object3D,
    plate: THREE.Texture,
    meta: PlateMeta,
    clouds: Record<string, THREE.Texture>,
    shared: SharedUniforms,
    envDefines: Record<string, string | number>,
    extraPlates: Partial<Record<ProjectorKey, { plate: THREE.Texture; meta: PlateMeta }>> = {},
    /** Baked environment (assets `env=baked`): per mesh node name, its baked texture (the plates' encoding). */
    baked: Record<string, THREE.Texture> | null = null,
  ) {
    this.plateCamera = createPlateCamera(meta);
    this.occlusion.uPlateFrustum.value.copy(projectionTerms(this.plateCamera));
    this.coverage = plateCoverage(meta);
    this.plateGain = Math.pow(2, -meta.exposureStops);
    this.plateViewProj.multiplyMatrices(this.plateCamera.projectionMatrix, this.plateCamera.matrixWorldInverse);
    for (const e of EXTRA_PROJECTORS) {
      const src = extraPlates[e.key];
      if (!src) continue;
      const camera = createProjectorCamera(e.key, src.meta);
      const viewProj = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      const P = e.P;
      const uniforms: Record<string, { value: unknown }> = {
        [`u${P}Depth`]: { value: null },
        [`u${P}View`]: { value: new THREE.Matrix4() },
        [`u${P}ViewProjF`]: { value: new THREE.Matrix4() },
        [`u${P}CamPos`]: { value: new THREE.Vector3() },
        [`u${P}Frustum`]: { value: projectionTerms(camera) },
        [`u${P}DepthTexel`]: { value: new THREE.Vector2(1 / 1024, 1 / 512) },
        [`u${P}DepthOn`]: { value: 0 },
        [`u${P}Plate`]: { value: src.plate },
        [`u${P}Gain`]: { value: Math.pow(2, -src.meta.exposureStops) },
        [`u${P}Mix`]: { value: 0 },
      };
      this.projectors.push({ key: e.key, define: e.define, camera, viewProj, coverage: plateCoverage(src.meta), target: null, uniforms });
      Object.assign(this.projectorBinding.uniforms, uniforms);
      this.projectorBinding.defines[e.define] = "";
    }
    if (this.projectors.length) this.projectorBinding.defines.EXTRA_PROJECTORS = "";
    this.plateMaterial = new THREE.ShaderMaterial({
      name: "rx-plate",
      vertexShader: PLATE_VERT,
      fragmentShader: PLATE_FRAG,
      // (Round 11 ATMOS: ATMOS_MIST, the rolling ground mist; `?atmos=r10` / `?atmosmist=0` leave the program as it was.)
      defines: {
        ...this.projectorBinding.defines,
        ...(this.atmos.mist ? { ATMOS_MIST: "" } : {}),
        ...(this.atmos.mist3 ? { ATMOS_MIST3: "" } : {}),
        ...(this.atmos.swell ? { ATMOS_SWELL: "" } : {}),
        ...(this.atmos.haze ? { ATMOS_HAZE: "" } : {}),
        ...(this.atmos.hazeVeil ? { HAZE_VEIL: "" } : {}),
        ...(this.atmos.hazeVeil && this.atmos.blue ? { HAZE_SHADOW: "" } : {}),
        ...(this.atmos.grade ? { ATMOS_GRADE: "" } : {}),
        ...(this.atmos.ridgeFit ? { RIDGE_FIT: "" } : {}),
        ...(this.atmos.shore ? { ATMOS_SHORE: "" } : {}),
      },
      uniforms: {
        ...this.projectorBinding.uniforms,
        ...this.atmosUniforms,
        uPlate: { value: plate },
        uPlateGain: { value: this.plateGain },
        uPlateViewProj: { value: this.plateViewProj },
        uPlateOver: { value: new THREE.Vector3(meta.overscanX, meta.overscanTop, meta.overscanBottom) },
        uDofBlur: shared.uDofBlur,
        uFocusDist: shared.uFocusDist,
        // Wide: the sculpture's surroundings (10-40 m) stay crisp, the far shore and mountains soften.
        uFocusRange: { value: 30 },
        uFog: shared.uFog,
        uFogHeight: shared.uFogHeight,
        uFogColor: shared.uFogColor,
        uTime: shared.uTime,
        uHold: shared.uHold,
        uFogHold: shared.uFogHold,
        ...this.occlusion,
      },
    });
    this.envProxy = envProxy;

    // Baked mode: one material per surface with its own texture (same shader and grade, no projection, no extra
    // projectors; the uniforms are shared by reference with plateMaterial so every per-frame update reaches them).
    baked = baked ?? ((envProxy.userData?.baked as Record<string, THREE.Texture> | undefined) ?? null);
    const bakedMats = new Map<THREE.Texture, THREE.ShaderMaterial>();
    // Round 11: the baked texture reproduces the projected path's DOF blur in screen space (BAKED_LOD_GRAD);
    // `?envlod=bias` keeps v8's mip bias for A/B.
    const qs = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;
    const lodBias = qs?.get("envlod") === "bias";
    const bakedDefines: Record<string, string> = lodBias ? { BAKED_ENV: "" } : { BAKED_ENV: "", BAKED_LOD_GRAD: "" };
    if (this.atmos.mist) bakedDefines.ATMOS_MIST = "";
    if (this.atmos.grade) bakedDefines.ATMOS_GRADE = "";
    // (Fix round 2: the dark ridge's slate fitted per height, Atmos.ts ATMOS_RIDGE_FIT; `?atmosridge=0` keeps attempt 5's.)
    if (this.atmos.ridgeFit) bakedDefines.RIDGE_FIT = "";
    // Round 11 ATMOS fix round 1: the denser bank and its veil (ATMOS_MIST3, its amount raised with it), and the drifting cards'
    // light on the baked environment (ATMOS_CARDLIGHT; the projected fallback keeps its plates as rendered).
    if (this.atmos.mist3) {
      bakedDefines.ATMOS_MIST3 = "";
      this.atmosUniforms.uAtmosBank.value.x = ATMOS_BANK_MIST3;
      this.atmosUniforms.uAtmosBankReach.value.z = ATMOS_BANK_T0_MIST3;
      this.atmosUniforms.uAtmosBankLo.value.setRGB(...ATMOS_BANK_LO_MIST3);
      this.atmosUniforms.uAtmosBankHi.value.setRGB(...ATMOS_BANK_HI_MIST3);
      this.atmosUniforms.uAtmosBankShape.value.y = ATMOS_BANK_TOP_MIST3;
      // (Fix round 1, attempt 3: the bank's top swells up the massif's foot, Atmos.ts ATMOS_SWELL, with its shaded band at
      // ATMOS_SHADE_SWELL; `?atmosswell=0` leaves both out.)
      if (this.atmos.swell) {
        bakedDefines.ATMOS_SWELL = "";
        this.atmosUniforms.uAtmosVeil2.value.y = ATMOS_SHADE_SWELL;
      }
      // (Fix round 1, attempt 5: the haze over the massif's foot above the bank, Atmos.ts ATMOS_HAZE; `?atmoshaze=0` leaves it out.)
      if (this.atmos.haze) bakedDefines.ATMOS_HAZE = "";
      // (Fix round 2: the bank runs on over the far shore, Atmos.ts ATMOS_SHORE; the water takes it below; `?atmosshore=0` stops it at
      // the lake's far edge as attempt 5.)
      if (this.atmos.shore) bakedDefines.ATMOS_SHORE = "";
      // (Fix round 2: the haze as a graded veil with the face softened under it, Atmos.ts HAZE_VEIL; `?atmoshaze=band` keeps the
      // attempt-5 band.)
      if (this.atmos.hazeVeil) {
        bakedDefines.HAZE_VEIL = "";
        // (Fix round 3: the shade under the veil and its bluer low colour, Atmos.ts HAZE_SHADOW; `?atmosblue=0` keeps fix round 2's veil.)
        if (this.atmos.blue) {
          bakedDefines.HAZE_SHADOW = "";
          this.atmosUniforms.uAtmosHazeLo.value.setRGB(...ATMOS_VEIL_LO_BLUE);
        }
        this.atmosUniforms.uAtmosHaze.value.x = ATMOS_VEIL_AMOUNT;
        this.atmosUniforms.uAtmosHazeC.value.setRGB(...ATMOS_VEIL_HI);
        if (this.atmos.swell) this.atmosUniforms.uAtmosVeil2.value.y = ATMOS_VEIL_SHADE;
      }
    }
    const cardLight = this.atmos.cardLight && baked ? this.createCardLight() : null;
    if (cardLight) Object.assign(bakedDefines, cardLightDefines(cardLight.slots, this.atmos.cardClamp ? cardLight.live.length : 0));
    // (Fix round 1, attempt 4: the cards' light fades out with the hold's dolly, Atmos.ts GLSL_CARD_LIGHT_FRAG; `?atmoscardhold=0`
    // keeps it in the hold as attempt 3.)
    if (cardLight && this.atmos.cardHold) bakedDefines.CARD_HOLD_FADE = "";
    // (Fix round 2: the light's change kept inside the reference's range, soft field box, faded at a wrap in updateAtmos, Atmos.ts
    // CARD_CLAMP; `?atmoscardclamp=0` keeps attempt 5's light.)
    if (cardLight && this.atmos.cardClamp) bakedDefines.CARD_CLAMP = "";
    // (Fix round 3: the cards take WHITE light away, Atmos.ts CARD_WHITE; rides on CARD_CLAMP; `?atmosblue=0` keeps fix round 2's.)
    if (cardLight && this.atmos.cardClamp && this.atmos.blue) bakedDefines.CARD_WHITE = "";
    // Both faces, as Cycles saw them: the plates and the bake's visibility are ray traced without back-face culling, so a
    // folded / inverted triangle of the photogrammetry mountains is a surface there, and culled here it was a hole onto
    // the sky or the massif (bright 1-px dashes over the dark ridge, defect 2). `?envside=front` restores the culling.
    const bakedSide = qs?.get("envside") === "front" ? THREE.FrontSide : THREE.DoubleSide;
    // Round 11 step 2: the summit wisp card (assets: manifest `wisp`, absent with `?envwisp=0`), composited by every baked
    // material (BAKED_WISP), with its world quad (three.js corners bl, br, tl, tr).
    const wisp = envProxy.userData?.wisp as { texture: THREE.Texture; quad: number[][] } | undefined;
    const wispUniforms: Record<string, { value: unknown }> = {};
    // (Round 11 ATMOS, wisp "lobe": not drawn; F000's summit puff is the left cloud card's lobe, Atmos.ts WispMode.)
    if (baked && wisp && this.atmos.wisp !== "lobe") {
      bakedDefines.BAKED_WISP = "";
      const [bl, br, tl] = wisp.quad.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      wispUniforms.uWisp = { value: wisp.texture };
      wispUniforms.uWispO = { value: bl };
      wispUniforms.uWispU = { value: br.clone().sub(bl) };
      wispUniforms.uWispV = { value: tl.clone().sub(bl) };
      if (this.atmos.wisp === "gust") {
        bakedDefines.ATMOS_WISP = "";
        wispUniforms.uAtmosWisp = this.atmosWisp;
      }
    }
    // (Fix round 1: the sky card BG.001 is an emitter in the artist's scene, it takes no card light: its own materials.)
    const bakedMatsSky = new Map<THREE.Texture, THREE.ShaderMaterial>();
    const bakedMaterial = (t: THREE.Texture, sky = false) => {
      const cache = sky ? bakedMatsSky : bakedMats;
      let m = cache.get(t);
      if (!m) {
        m = new THREE.ShaderMaterial({
          name: "rx-plate-baked",
          vertexShader: PLATE_VERT,
          fragmentShader: PLATE_FRAG,
          defines: bakedDefines,
          side: bakedSide,
          uniforms: {
            ...this.plateMaterial.uniforms,
            uBaked: { value: t },
            uBakedGain: { value: new THREE.Vector3(1, 1, 1) },
            uResolution: shared.uResolution,
            // Round 11: the region gates (ridge, berg, rocks, far band, bases, hold terms) were switched on by the projector
            // depth bake (uPlateDepthOn); with real geometry they read the fragment's own rest-camera position (uv0, fz),
            // so they are always on and baked mode needs no depth bake.
            uPlateDepthOn: { value: 1 },
            uMirrorPass: this.bakedMirrorPass,
            ...wispUniforms,
            ...(cardLight ? { ...cardLight.uniforms, uCardOn: { value: sky ? 0 : 1 } } : {}),
          },
        });
        cache.set(t, m);
      }
      return m;
    };
    let unbaked = 0;
    envProxy.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const t = baked ? (baked[mesh.name] ?? (mesh.parent ? baked[mesh.parent.name] : undefined)) : undefined;
      if (baked && !t) unbaked++;
      const sky = mesh.name === "BG001" || mesh.parent?.name === "BG001";
      if (baked && sky) this.mirrorHidden.push(mesh);
      mesh.material = t ? bakedMaterial(t, sky) : this.plateMaterial;
      mesh.frustumCulled = true;
    });
    if (baked && unbaked) console.warn(`[hero] baked environment: ${unbaked} mesh(es) without a texture keep the projection`);
    this.bakedMaterials = [...bakedMats.values(), ...bakedMatsSky.values()];
    if (baked) {
      // Round 11 step 2: the baked materials' region gates take the fragment's own rest-camera depth, fz = -(uPlateView p).z.
      // uPlateView was only set by bakeDepth, which the mirror lake skips: it stayed the identity (fz = -z world) and every
      // depth gate (far haze, local contrast, berg, ...) misfired on the massif and the iceberg (-8 to -19 levels at rest).
      // The plate camera's view terms are constants; bakeDepth, where it still runs, sets the same values.
      this.occlusion.uPlateView.value.copy(this.plateCamera.matrixWorldInverse);
      this.occlusion.uPlateViewProjF.value.copy(this.plateViewProj);
      this.occlusion.uPlateCamPos.value.copy(this.plateCamera.position);
    }
    this.group.add(envProxy);

    const cloudGroup = this.cloudGroup;
    cloudGroup.name = "clouds";
    // Round 11 ATMOS (Atmos.ts): the conveyor adds the off-screen copies and moves every card on the CPU (CLOUD_R11);
    // CLOUD_SOFT gives the cards the far field's softness. `?atmos=r10` / `?atmosclouds=0` / `?atmoscloudsoft=0` restore them.
    const atmos = this.atmos;
    const cards = atmos.clouds ? [...CLOUDS, ...CLOUDS_EXTRA] : CLOUDS;
    const cloudDefines: Record<string, string> = {};
    if (atmos.clouds) cloudDefines.CLOUD_R11 = "";
    if (atmos.cloudSoft) cloudDefines.CLOUD_SOFT = CLOUD_SOFT_BIAS.toFixed(3);
    // Fix round 1: the far ranges hide the card behind them (Atmos.ts RANGE_DEPTH); one shared skyline table.
    let crest: THREE.DataTexture | null = null;
    if (atmos.range) {
      cloudDefines.CLOUD_RANGE = "";
      const tab = rangeCrestTable();
      const h = new Uint16Array(tab.length);
      for (let i = 0; i < tab.length; i++) h[i] = THREE.DataUtils.toHalfFloat(tab[i]);
      crest = new THREE.DataTexture(h, tab.length, 1, THREE.RedFormat, THREE.HalfFloatType);
      crest.minFilter = crest.magFilter = THREE.LinearFilter;
      crest.wrapS = crest.wrapT = THREE.ClampToEdgeWrapping;
      crest.needsUpdate = true;
    }
    const omega = cloudOmega(atmos);
    cards.forEach((c, i) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(c.verts.flat(), 3));
      // Blender quad vertex order: (0,0) (1,0) (0,1) (1,1).
      geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
      const seed = (i * 0.618034) % 1;
      geo.setAttribute("aSeed", new THREE.Float32BufferAttribute([seed, seed, seed, seed], 1));
      geo.setIndex([0, 1, 2, 2, 1, 3]);
      const mat = new THREE.ShaderMaterial({
        name: "rx-cloud",
        vertexShader: CLOUD_VERT,
        fragmentShader: CLOUD_FRAG,
        defines: { ...envDefines, ...this.projectorBinding.defines, ...cloudDefines },
        uniforms: {
          ...this.projectorBinding.uniforms,
          uCloudShift: { value: new THREE.Vector3() },
          uCloud: { value: clouds[c.image] },
          uTime: shared.uTime,
          uEnvMap: shared.uEnvMap,
          uEnvIntensity: shared.uEnvIntensity,
          uCloudTint: shared.uCloudTint,
          uCloudAlbedo: { value: 0.8 },
          uCloudEmission: { value: 2.0 },
          ...(crest ? { uRangeCrest: { value: crest }, uRangeOcc: { value: REST_CAMERA.position[2] - c.verts[0][2] > RANGE_DEPTH ? 1 : 0 } } : {}),
          ...this.occlusion,
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        // Premultiplied output.
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
      });
      this.cloudMaterials.push(mat);
      // (CLOUD_F000: the artist's six cards registered to F000 at the end of the intro; the extras keep their spacing.)
      const fit = atmos.cloudFit ? (CLOUD_F000_PX[i] ?? null) : null;
      this.cloudLanes.push(cloudLane(c.verts, fit, atmos.cloudFit ? CLOUD_F000_T : 0, omega));
      const xs = c.verts.map((v) => v[0]);
      this.cloudFloor.push({ y: Math.min(...c.verts.map((v) => v[1])), z: c.verts[0][2], x0: Math.min(...xs), x1: Math.max(...xs) });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 1;
      mesh.frustumCulled = false;
      cloudGroup.add(mesh);
    });
    this.group.add(cloudGroup);
    if (this.cardLight) {
      // (Fix round 1: the card light's zero = the F000 layout, Atmos.ts ATMOS_CARDLIGHT.)
      const pos = this.cardLight.uniforms.uCardPos.value as THREE.Vector4[];
      const n = this.cardLight.live.length;
      const t0 = atmos.cloudFit ? CLOUD_F000_T : 0;
      const info = this.cardLight.uniforms.uCardInfo.value as THREE.Vector4[];
      for (let i = 0; i < n; i++) {
        const g = this.cardLight.live[i];
        pos[n + i].set(g.x0 + cloudShift(this.cloudLanes[i], t0, omega), g.y0 + this.cloudLanes[i].dy, g.z, g.w);
        if (atmos.cardClamp) {
          // (Fix round 2, Atmos.ts CARD_CLAMP: the F000 slot takes the live card's wrap fade at that time, so F000 stays exactly
          // unchanged; the third set holds the cards where the reference leaves them, its darkest state.)
          const lane = this.cloudLanes[i];
          info[n + i].z = -cloudWrapFade(lane, t0, omega);
          pos[2 * n + i].set(g.x0 + cloudShift(lane, CARD_REF_END_T, omega), g.y0 + lane.dy, g.z, g.w);
          info[2 * n + i].z = cloudWrapFade(lane, CARD_REF_END_T, omega);
        }
      }
    }
    this.updateAtmos(0);
    if (this.atmos.shore) {
      // (Fix round 2, Atmos.ts GLSL_ATMOS_LAKE: the water, built after this with the projector binding, takes the bank over the far
      // lake; set last, so no material of this environment carries the define.)
      const u = this.atmosUniforms;
      this.projectorBinding.defines.ATMOS_LAKEBANK = "";
      Object.assign(this.projectorBinding.uniforms, {
        uAtmosBank: u.uAtmosBank,
        uAtmosBankShape: u.uAtmosBankShape,
        uAtmosBankReach: u.uAtmosBankReach,
        uAtmosBankHi: u.uAtmosBankHi,
        uAtmosVeil: u.uAtmosVeil,
        uAtmosShore: u.uAtmosShore,
      });
    }
  }

  /** Round 11 ATMOS: switches of this lane (Atmos.ts), read once from the URL. */
  readonly atmos: AtmosFlags = atmosFromUrl();
  /** Round 11 ATMOS: the ground mist's uniforms (shared by the plate and every baked material; runtime-tunable). */
  readonly atmosUniforms = createAtmosMistUniforms();
  /** Round 11 ATMOS: each cloud card's conveyor constants (same order as cloudMaterials). */
  private readonly cloudLanes: CloudLane[] = [];
  /** aaresolve: each card's lowest edge and x extent (world, before its lane shift) and its plane (z). */
  private readonly cloudFloor: { y: number; z: number; x0: number; x1: number }[] = [];

  /**
   * Round 11 ATMOS fix round 1 (Atmos.ts ATMOS_CARDLIGHT): the card light's shared uniforms, the live cards' geometry (same
   * order as cloudMaterials) and the slot count (live + the bake's six), or null.
   */
  private cardLight: { uniforms: Record<string, { value: unknown }>; live: CardGeom[]; slots: number } | null = null;
  private createCardLight() {
    const live = [...CLOUDS, ...CLOUDS_EXTRA].map((c) => cardGeom(c.verts, c.image));
    // The change is taken from the F000 layout (the first rest frame, t = CLOUD_F000_T), where the bake and the grade chain were
    // matched to the reference (QC rounds 1-10 against F000): every card at its F000 place, set once the lanes exist (the bake
    // itself held the six at the .blend's places, 0.6-2.9 m right of F000; taking that as the zero dimmed the massif's lower
    // face 4 levels below F000 at F000).
    const bake = live;
    // (Fix round 2, CARD_CLAMP: a third set, the cards at the reference's last layout; Atmos.ts CARD_REF_END_T.)
    const ends = this.atmos.cardClamp ? live : [];
    const slots = live.length + bake.length + ends.length;
    const field = (kind: "cloud_a" | "cloud_b") => {
      const f = buildCardField(kind);
      const h = new Uint16Array(f.length);
      for (let i = 0; i < f.length; i++) h[i] = THREE.DataUtils.toHalfFloat(f[i]);
      const t = new THREE.Data3DTexture(h, CARD_FIELD.nx, CARD_FIELD.ny, CARD_FIELD.nz);
      t.format = THREE.RGBAFormat;
      t.type = THREE.HalfFloatType;
      t.minFilter = t.magFilter = THREE.LinearFilter;
      t.wrapS = t.wrapT = t.wrapR = THREE.ClampToEdgeWrapping;
      t.needsUpdate = true;
      return t;
    };
    const pos = Array.from({ length: slots }, () => new THREE.Vector4());
    const info = Array.from({ length: slots }, () => new THREE.Vector4());
    [...live, ...bake, ...ends].forEach((g, i) => {
      pos[i].set(g.x0, g.y0, g.z, g.w);
      const kind = i < live.length ? 0 : i < live.length + bake.length ? 1 : 2;
      info[i].set(g.mirrored ? 1 : 0, g.b ? 1 : 0, kind === 1 ? -1 : 1, this.atmos.cardClamp ? kind : 0);
    });
    this.cardLight = {
      uniforms: {
        uCardFieldA: { value: field("cloud_a") },
        uCardFieldB: { value: field("cloud_b") },
        uCardPos: { value: pos },
        uCardInfo: { value: info },
        uCardKappa: { value: CARD_KAPPA },
        uCardWhite: { value: new THREE.Vector4(...ATMOS_CARD_WHITE) },
      },
      live,
      slots,
    };
    return this.cardLight;
  }

  /** Round 11 ATMOS: the summit wisp's spindrift puff (x envelope, y uv shift, z erosion, w seed); see Atmos.ts wispPuff. */
  readonly atmosWisp = { value: new THREE.Vector4(1, 0, 0, 0) };
  /** Round 11 ATMOS (captures): a fixed puff age in s for the summit wisp (null = live). */
  atmosWispAge: number | null = null;

  /** Round 11 ATMOS, per frame: the clouds' wrapped wind drift and the summit wisp's puff at engine time `time` (s). */
  updateAtmos(time: number) {
    if (this.atmos.wisp === "gust") wispPuff(time, this.atmosWisp.value, this.atmosWispAge);
    // (Fix round 1, attempt 5: the haze's envelope, a function of time only.)
    if (this.atmos.haze) hazeEnvelopeT(time, this.atmosUniforms.uAtmosHazeT.value);
    if (!this.atmos.clouds) return;
    const omega = cloudOmega(this.atmos);
    const cl = this.cardLight;
    const pos = cl ? (cl.uniforms.uCardPos.value as THREE.Vector4[]) : null;
    const info = cl && this.atmos.cardClamp ? (cl.uniforms.uCardInfo.value as THREE.Vector4[]) : null;
    for (let i = 0; i < this.cloudMaterials.length; i++) {
      const v = this.cloudMaterials[i].uniforms.uCloudShift.value as THREE.Vector3;
      v.x = cloudShift(this.cloudLanes[i], time, omega);
      v.y = this.cloudLanes[i].dy;
      // (Fix round 1: the card's light goes where the card goes.)
      if (cl && pos && i < cl.live.length) pos[i].set(cl.live[i].x0 + v.x, cl.live[i].y0 + v.y, cl.live[i].z, cl.live[i].w);
      // (Fix round 2: the card's light fades out before its wrap and back in after it, Atmos.ts cloudWrapFade.)
      if (cl && info && i < cl.live.length) info[i].z = cloudWrapFade(this.cloudLanes[i], time, omega);
    }
  }

  /**
   * Round 11 (baked mode): the lake mirror pass (LakeMirror). The baked meshes give their raw colour with the path length
   * in alpha, BG.001 is left out (the Cycles water reflects the world sky, not the card), and the clouds blend their
   * colour over the sky and meshes without touching that alpha.
   */
  setLakeMirrorPass(on: boolean) {
    this.bakedMirrorPass.value = on ? 1 : 0;
    for (const o of this.mirrorHidden) o.visible = !on;
    const keep = on || this.edgeAlpha;
    for (const m of this.cloudMaterials) {
      m.blendSrcAlpha = keep ? THREE.ZeroFactor : null;
      m.blendDstAlpha = keep ? THREE.OneFactor : null;
    }
  }

  /** Round 11 fix round: the baked materials write the view distance into alpha for EnvEdge. */
  private edgeAlpha = false;

  /**
   * Round 11 fix round (baked mode only, before the first render): the baked materials output the view distance in alpha
   * (BAKED_EDGE) and the clouds blend their colour without touching it, so EnvEdge can find the silhouettes.
   */
  setEdgeAlpha(on: boolean) {
    if (!this.bakedMaterials.length) return;
    this.edgeAlpha = on;
    for (const m of this.bakedMaterials) {
      if (on) m.defines.BAKED_EDGE = "";
      else delete m.defines.BAKED_EDGE;
      m.needsUpdate = true;
    }
    this.setLakeMirrorPass(this.bakedMirrorPass.value > 0.5);
  }

  /**
   * aaresolve (RenderPipeline.enableAAResolve, before the first render): every environment material writes its samples below
   * the horizon line tone-compressed (`plane` is the pipeline's writer plane, off outside the environment pass).
   */
  /**
   * aaresolve: where the cloud cards reach below the eye of `cam`, as one box in ray-slope space (x and rise per unit of forward
   * distance; the cards are planes of constant z, so the box is exact): false when every card stays above the eye. One of the
   * artist's cards hangs 3.6 m under the lake's level and shows below the horizon where nothing stands in front of it. The
   * r10 drift (in the shader, `?atmos=r10`) is not known here: its cards span every x, with 0.5 m of slack for its breath.
   */
  cloudDip(cam: THREE.Vector3, out: { x0: number; x1: number; y: number }) {
    let dip = false;
    out.x0 = Infinity;
    out.x1 = -Infinity;
    out.y = 0;
    for (let i = 0; i < this.cloudFloor.length; i++) {
      const f = this.cloudFloor[i];
      const dz = cam.z - f.z;
      if (dz <= 1) continue;
      const r11 = this.cloudMaterials[i].defines.CLOUD_R11 !== undefined;
      const shift = this.cloudMaterials[i].uniforms.uCloudShift.value as THREE.Vector3;
      const y = ((r11 ? f.y + shift.y : f.y - 0.5) - cam.y) / dz;
      if (y >= 0) continue;
      dip = true;
      out.y = Math.min(out.y, y);
      out.x0 = r11 ? Math.min(out.x0, (f.x0 + shift.x - cam.x) / dz) : -Infinity;
      out.x1 = r11 ? Math.max(out.x1, (f.x1 + shift.x - cam.x) / dz) : Infinity;
    }
    return dip;
  }

  setAAResolve(aa: Record<string, { value: unknown }>) {
    for (const m of [this.plateMaterial, ...this.bakedMaterials, ...this.cloudMaterials]) {
      m.defines.AA_RESOLVE = "";
      Object.assign(m.uniforms, aa);
      m.needsUpdate = true;
    }
  }

  /**
   * Renders the projectors' depth maps once (the proxies, the lake and the projectors never move) and switches
   * the projection-shadow fill on. `extra` holds the other plate-projected surfaces (the lake planes).
   */
  bakeDepth(renderer: THREE.WebGLRenderer, extra: THREE.Object3D[]) {
    const ext = renderer.extensions;
    if (!ext.has("EXT_color_buffer_float") && !ext.has("EXT_color_buffer_half_float")) return;
    const p1 = this.bakeProjector(renderer, extra, this.plateCamera, this.plateViewProj, this.coverage);
    this.depthTarget?.dispose();
    this.depthTarget = p1.target;
    const cam = this.plateCamera;
    this.occlusion.uPlateDepth.value = p1.target.texture;
    this.occlusion.uPlateView.value.copy(cam.matrixWorldInverse);
    this.occlusion.uPlateViewProjF.value.copy(this.plateViewProj);
    this.occlusion.uPlateCamPos.value.copy(cam.position);
    this.occlusion.uPlateDepthTexel.value.set(1 / p1.w, 1 / p1.h);
    this.occlusion.uPlateDepthOn.value = 1;
    for (const p of this.projectors) {
      const b = this.bakeProjector(renderer, extra, p.camera, p.viewProj, p.coverage);
      p.target?.dispose();
      p.target = b.target;
      const P = EXTRA_PROJECTORS.find((e) => e.key === p.key)!.P;
      const u = p.uniforms;
      u[`u${P}Depth`].value = b.target.texture;
      (u[`u${P}View`].value as THREE.Matrix4).copy(p.camera.matrixWorldInverse);
      (u[`u${P}ViewProjF`].value as THREE.Matrix4).copy(p.viewProj);
      (u[`u${P}CamPos`].value as THREE.Vector3).copy(p.camera.position);
      (u[`u${P}DepthTexel`].value as THREE.Vector2).set(1 / b.w, 1 / b.h);
      u[`u${P}DepthOn`].value = 1;
    }
  }

  /**
   * Per frame: each projector's share by the camera's proximity to it (inverse fourth power of the distance,
   * normalised with the rest projector), so a projector the camera sits on takes it all and the blend between two
   * runs evenly at the midpoint.
   */
  updateProjectors(cameraPosition: THREE.Vector3) {
    if (!this.projectors.length) return;
    const w = (d: number) => 1 / (d * d * d * d + 1e-4);
    const w0 = w(cameraPosition.distanceTo(this.plateCamera.position));
    let sum = w0;
    const ws = this.projectors.map((p) => {
      const v = w(cameraPosition.distanceTo(p.camera.position));
      sum += v;
      return v;
    });
    this.projectorBinding.uniforms.uRestMix.value = w0 / sum;
    this.projectors.forEach((p, i) => {
      const P = EXTRA_PROJECTORS.find((e) => e.key === p.key)!.P;
      p.uniforms[`u${P}Mix`].value = ws[i] / sum;
    });
  }

  /** One projector's depth map: r view depth, g rim dilation, b lake mirror-ray length. */
  private bakeProjector(
    renderer: THREE.WebGLRenderer,
    extra: THREE.Object3D[],
    cam: THREE.PerspectiveCamera,
    viewProj: THREE.Matrix4,
    c: PlateCoverage,
  ) {
    const tanH0 = Math.tan(THREE.MathUtils.degToRad(REST_CAMERA.hfovDeg) / 2);
    const aspect = (2 * tanH0 * c.side) / (REF_TAN_V * (c.top + c.bottom));
    const w = 1536;
    const h = Math.max(2, Math.round(w / aspect));
    const rt = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      depthBuffer: true,
    });
    rt.texture.colorSpace = THREE.NoColorSpace;
    const mat = new THREE.ShaderMaterial({ vertexShader: DEPTH_VERT, fragmentShader: DEPTH_FRAG, side: THREE.DoubleSide });

    const swapped: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [];
    const swap = (o: THREE.Object3D) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      swapped.push([m, m.material]);
      m.material = mat;
    };
    this.envProxy.traverse(swap);
    for (const e of extra) e.traverse(swap);
    const cloudsVisible = this.cloudGroup.visible;
    this.cloudGroup.visible = false;

    cam.layers.enableAll();
    const prevTarget = renderer.getRenderTarget();
    const prevColor = renderer.getClearColor(new THREE.Color());
    const prevAlpha = renderer.getClearAlpha();
    const prevAuto = renderer.autoClear;
    renderer.setRenderTarget(rt);
    // Empty texels are "infinitely" far (float targets keep clear values unclamped).
    renderer.setClearColor(new THREE.Color(60000, 0, 0), 1);
    renderer.clear(true, true, false);
    renderer.autoClear = false;
    this.group.updateMatrixWorld(true);
    renderer.render(this.group, cam);
    for (const e of extra) {
      e.updateMatrixWorld(true);
      renderer.render(e, cam);
    }
    renderer.autoClear = prevAuto;
    renderer.setClearColor(prevColor, prevAlpha);
    renderer.setRenderTarget(prevTarget);

    for (const [m, original] of swapped) m.material = original;
    this.cloudGroup.visible = cloudsVisible;
    mat.dispose();

    // Rim dilation: g = the nearest non-sky depth within RIM texels (two separable min passes, once).
    const RIM = 40;
    const makeTarget = () =>
      new THREE.WebGLRenderTarget(w, h, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        generateMipmaps: false,
        depthBuffer: false,
      });
    const tmp = makeTarget();
    const fin = makeTarget();
    fin.texture.colorSpace = THREE.NoColorSpace;
    const minPass = (horizontal: boolean, src: THREE.Texture) =>
      new THREE.ShaderMaterial({
        uniforms: { uSrc: { value: src }, uStep: { value: new THREE.Vector2(horizontal ? 1 / w : 0, horizontal ? 0 : 1 / h) } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uSrc;
          uniform vec2 uStep;
          varying vec2 vUv;
          void main() {
            vec4 c = texture2D(uSrc, vUv);
            float m = 60000.0;
            for (int i = -${RIM}; i <= ${RIM}; i++) {
              vec4 s = texture2D(uSrc, vUv + uStep * float(i));
              m = min(m, ${horizontal ? "s.r < 300.0 ? s.r : 60000.0" : "s.g"});
            }
            gl_FragColor = vec4(c.r, m, 0.0, 1.0);
          }`,
        depthTest: false,
        depthWrite: false,
      });
    const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), minPass(true, rt.texture));
    quad.frustumCulled = false;
    const prevTarget2 = renderer.getRenderTarget();
    renderer.setRenderTarget(tmp);
    renderer.render(quad, quadCam);
    (quad.material as THREE.ShaderMaterial).dispose();
    quad.material = minPass(false, tmp.texture);
    renderer.setRenderTarget(fin);
    renderer.render(quad, quadCam);
    (quad.material as THREE.ShaderMaterial).dispose();

    // Reflection distance: b = how far the lake's mirror ray travels before it meets what the plate shows
    // reflected there (a floe, a rock, a mountain; 60000 for sky), traced once against this depth map. The
    // lake uses it to re-aim its plate lookup when the camera leaves the plate camera (Water.ts).
    const refl = makeTarget();
    if (this.depthLinear) {
      refl.texture.minFilter = THREE.LinearFilter;
      refl.texture.magFilter = THREE.LinearFilter;
      for (const m of [this.plateMaterial, ...this.cloudMaterials]) {
        if (m.defines.DEPTH_EXACT === undefined) {
          m.defines.DEPTH_EXACT = "";
          m.needsUpdate = true;
        }
      }
    }
    refl.texture.colorSpace = THREE.NoColorSpace;
    quad.material = new THREE.ShaderMaterial({
      uniforms: {
        uSrc: { value: fin.texture },
        uInvProj: { value: cam.projectionMatrixInverse },
        uCamWorld: { value: cam.matrixWorld },
        uView: { value: cam.matrixWorldInverse },
        uViewProj: { value: viewProj },
        uCamPos: { value: cam.position },
      },
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: GLSL_REFLECTION_DISTANCE,
      depthTest: false,
      depthWrite: false,
    });
    renderer.setRenderTarget(refl);
    renderer.render(quad, quadCam);
    renderer.setRenderTarget(prevTarget2);
    (quad.material as THREE.ShaderMaterial).dispose();
    quad.geometry.dispose();
    tmp.dispose();
    fin.dispose();
    rt.dispose();
    return { target: refl, w, h };
  }

  dispose() {
    this.depthTarget?.dispose();
    for (const p of this.projectors) p.target?.dispose();
  }
}
