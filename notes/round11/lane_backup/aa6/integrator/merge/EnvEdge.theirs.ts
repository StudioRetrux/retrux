import * as THREE from "three";
import { GLSL_AA_RESOLVE } from "../shaders/chunks";

/**
 * Round 11 fix round (ENV lane, baked environment only): soft environment silhouettes, as the plates had them.
 *
 * The projected plates drew every skyline from the Cycles image itself: anti-aliased, then blurred by the plate's DOF mip.
 * The baked meshes draw the skyline as a geometric edge: only the MSAA resolve softens it, so the ridge, the massif, the
 * iceberg, the far range, the floes and the rocks showed 1-px stair-stepped outlines and a faint light rim against the plate
 * look (judge1, E-G1 diff map: 529 px > 20 levels above y 440).
 *
 * The baked materials and the water write the view distance into alpha (BAKED_EDGE). A pixel whose 3x3 neighbourhood spans
 * a depth jump takes a 3x3 Gaussian of its neighbourhood; every other pixel is discarded, so the interior stays exactly as
 * drawn. The blur runs in the plates' own encoding (sRGB of the HDR value / plate gain), the space the plate's DOF mip
 * filtered in: blurring the linear HDR value instead (the first version) let the bright sky bleed into the dark ridge and
 * moved the skyline about 0.4 px into it. Sigma 0.6 px fits the baseline's mean skyline profile best (fix round 2,
 * WORK/fix2/edgefit: offset +0.07 px, px > 20 vs the baseline 425 -> 348).
 *
 * Cost (fix round 2): the first version copied the image and drew its own pass into the 4x MSAA target, which on this
 * tile-based GPU loads, stores and resolves the whole MSAA image once more (+9 % of the T1 frame). Now `arm()` (called right
 * after the environment pass) only arms a full-screen triangle that lives in the scene: it is drawn first inside the next
 * render into the main target (the rings' far half at T1 / T2), before any hero object, and samples `main.texture`, which
 * holds the environment pass's resolve. With three's renderbuffer MSAA that texture is not attached to the draw framebuffer,
 * so there is no feedback loop. Where the browser offers WEBGL_multisampled_render_to_texture (the texture IS the attachment),
 * the image is first copied into a target of its own (the first version's copy).
 *
 * Per frame and screen-space: nothing can ghost when the camera moves. `?envedge=0` (or `?envfix=0`) turns it off.
 *
 * aaresolve (19 Nov, chunks.ts GLSL_AA_RESOLVE): below the horizon line the environment pass resolved tone-compressed samples,
 * so the same triangle also writes the expanded resolve into every pixel there (still before any hero object, still inside
 * an existing render pass); a silhouette pixel blurs the expanded taps as before. Without the edge blur (`?envedge=0`) it
 * only expands.
 */

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const COPY_FRAG = /* glsl */ `
uniform sampler2D uSrc;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(uSrc, vUv);
}
`;

const EDGE_FRAG = /* glsl */ `
uniform sampler2D uSrc;
uniform vec2 uTexel;
// x: relative depth jump, y: absolute jump (m) between the nearest and the farthest of the 3x3 that marks a silhouette
uniform vec2 uEdge;
// Gaussian weights of the edge-adjacent and the diagonal neighbours (centre 1)
uniform vec2 uW;
// the plates' gain (HDR = decoded plate x gain)
uniform float uGain;
varying vec2 vUv;
#ifdef AA_RESOLVE
${GLSL_AA_RESOLVE}
vec3 aaTap(vec3 c, vec2 o) { return aaIn(gl_FragCoord.xy + o) ? aaExpand(c) : c; }
#endif
vec3 enc(vec3 c) {
  vec3 x = max(c / uGain, 0.0);
  return mix(x * 12.92, 1.055 * pow(x, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, x));
}
vec3 dec(vec3 e) {
  return mix(e / 12.92, pow((max(e, 0.0) + 0.055) / 1.055, vec3(2.4)), step(0.04045, e)) * uGain;
}
void main() {
  vec4 c0 = texture2D(uSrc, vUv + vec2(-1.0, -1.0) * uTexel);
  vec4 c1 = texture2D(uSrc, vUv + vec2(0.0, -1.0) * uTexel);
  vec4 c2 = texture2D(uSrc, vUv + vec2(1.0, -1.0) * uTexel);
  vec4 c3 = texture2D(uSrc, vUv + vec2(-1.0, 0.0) * uTexel);
  vec4 c4 = texture2D(uSrc, vUv);
  vec4 c5 = texture2D(uSrc, vUv + vec2(1.0, 0.0) * uTexel);
  vec4 c6 = texture2D(uSrc, vUv + vec2(-1.0, 1.0) * uTexel);
  vec4 c7 = texture2D(uSrc, vUv + vec2(0.0, 1.0) * uTexel);
  vec4 c8 = texture2D(uSrc, vUv + vec2(1.0, 1.0) * uTexel);
  float dmin = min(min(min(c0.a, c1.a), min(c2.a, c3.a)), min(min(c4.a, c5.a), min(min(c6.a, c7.a), c8.a)));
  float dmax = max(max(max(c0.a, c1.a), max(c2.a, c3.a)), max(max(c4.a, c5.a), max(max(c6.a, c7.a), c8.a)));
  // alpha 0 = nothing drawn there (never in the env pass: the sky card covers the frame); <= 1 = a surface without BAKED_EDGE
#ifdef AA_RESOLVE
#ifdef EDGE_BLUR
  if (dmin <= 1.0 || dmax < dmin * (1.0 + uEdge.x) + uEdge.y) {
#endif
    // Not a silhouette: the expanded resolve where the environment wrote compressed samples, nothing elsewhere.
    if (!aaIn(gl_FragCoord.xy)) discard;
    gl_FragColor = vec4(aaExpand(c4.rgb), c4.a);
    return;
#ifdef EDGE_BLUR
  }
#endif
  // A silhouette: every tap expanded where it was compressed (the alpha distances are not), then blurred as before.
  c0.rgb = aaTap(c0.rgb, vec2(-1.0, -1.0));
  c1.rgb = aaTap(c1.rgb, vec2(0.0, -1.0));
  c2.rgb = aaTap(c2.rgb, vec2(1.0, -1.0));
  c3.rgb = aaTap(c3.rgb, vec2(-1.0, 0.0));
  c4.rgb = aaTap(c4.rgb, vec2(0.0));
  c5.rgb = aaTap(c5.rgb, vec2(1.0, 0.0));
  c6.rgb = aaTap(c6.rgb, vec2(-1.0, 1.0));
  c7.rgb = aaTap(c7.rgb, vec2(0.0, 1.0));
  c8.rgb = aaTap(c8.rgb, vec2(1.0, 1.0));
#else
  if (dmin <= 1.0 || dmax < dmin * (1.0 + uEdge.x) + uEdge.y) discard;
#endif
  vec3 s = enc(c4.rgb) + uW.x * (enc(c1.rgb) + enc(c3.rgb) + enc(c5.rgb) + enc(c7.rgb))
    + uW.y * (enc(c0.rgb) + enc(c2.rgb) + enc(c6.rgb) + enc(c8.rgb));
  gl_FragColor = vec4(dec(s / (1.0 + 4.0 * uW.x + 4.0 * uW.y)), c4.a);
}
`;

/**
 * AA3 (20 Nov, user: "benerin anti aliasing water yaa, ensure everything perfect"): temporal AA of the WATERLINE BAND only.
 *
 * Even with the tone-compressed resolve, 4 samples give a pixel 5 coverage levels, so as the camera moves a floe's, slab's or
 * rock's outline against the bright lake steps through them (the "low-quality anti-aliasing" crawl). This pass gathers more
 * coverage levels over time on the pixels whose 3x3 (+ 4 taps 2 px out) holds both lake and a solid surface, and nowhere else:
 *   - lake vs solid without touching the water shader: a pixel is lake when its view distance (alpha, BAKED_EDGE) is the
 *     analytic distance to the lake plane along its ray (+-0.4 %), solid when nearer (or above the horizon);
 *   - history reprojected by the camera of the previous frame at the NEAREST distance of the 3x3 (the silhouette moves with
 *     the surface in front), sampled Catmull-Rom (5 bilinear taps) and clamped to its own 2x2 texel footprint (no ringing),
 *     then clipped to the current 3x3 (variance box intersected with min / max, per channel) in the compressed space of the
 *     resolve: no ghost beyond the current neighbourhood, no dark or bright outline (measured: fast sweeps 0.33 px per Mpx and
 *     frame more than 4 levels outside the TAA-off frame's 3x3 range, at most 10 levels, isolated: EnvEdge's silhouette blur
 *     runs on the blended taps);
 *   - no history where the hero's reflection (its own target's coverage within ~10 px of the lake point's mirror point) or, in
 *     the hold, the Wave modifier's crest train (its reach around the ripple centre) change the water by themselves (the rest
 *     ring bands are 4 m broad and slow: the clip absorbs them);
 *   - the same weight at any speed; only a camera that stands still (< 0.012 CSS px per 1/60 s, so the handheld drift and a
 *     Retina / 30 fps page count as still) hands over, after 24 frames in which the output has converged on the current frame,
 *     and the pass is then skipped (the frame is exactly the resolve, as without it). A resize or a jump (> 96 px) restarts it.
 * The output (every pixel: band pixels blended, the rest copied) is EnvEdge's source instead of `main`'s resolve, and the next
 * frame's history. `?lktaa=0` turns it off (the triangle reads the resolve as before).
 */
const TAA_FRAG = /* glsl */ `
uniform sampler2D uCur;
uniform sampler2D uHist;
// the (unnormalized) world ray through pixel px is uRayO + px.x uRayX + px.y uRayY (affine in px for a perspective camera)
uniform vec3 uRayO;
uniform vec3 uRayX;
uniform vec3 uRayY;
uniform mat4 uPrevVP;
uniform vec3 uCamPos;
uniform vec2 uSize;
uniform float uHistW;
uniform sampler2D uRefl;
uniform mat4 uReflVP;
uniform float uReflOn;
uniform vec4 uRipple;
${GLSL_AA_RESOLVE}
vec3 taaRay(vec2 px) {
  return uRayO + px.x * uRayX + px.y * uRayY;
}
// 1: lake, 2: solid, 0: nothing drawn
int taaKind(vec2 px, float a) {
  if (a <= 1.0) return 0;
  vec3 d = taaRay(px);
  if (d.y > -1e-5 * length(d)) return 2;
  float tw = -uCamPos.y * length(d) / d.y;
  if (abs(a - tw) <= 0.004 * tw + 0.03) return 1;
  return a < tw ? 2 : 0;
}
vec3 taaHist(vec2 uv) {
  // Catmull-Rom from 5 bilinear taps, then clamped to the 2x2 texel footprint it interpolates (no overshoot at an edge)
  vec2 sp = uv * uSize;
  vec2 tp = floor(sp - 0.5) + 0.5;
  vec2 f = sp - tp;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 t12 = (tp + w2 / w12) / uSize;
  vec2 t0 = (tp - 1.0) / uSize;
  vec2 t3 = (tp + 2.0) / uSize;
  vec3 r = texture2D(uHist, vec2(t12.x, t0.y)).rgb * (w12.x * w0.y) + texture2D(uHist, vec2(t0.x, t12.y)).rgb * (w0.x * w12.y)
    + texture2D(uHist, t12).rgb * (w12.x * w12.y) + texture2D(uHist, vec2(t3.x, t12.y)).rgb * (w3.x * w12.y)
    + texture2D(uHist, vec2(t12.x, t3.y)).rgb * (w12.x * w3.y);
  r /= w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y;
  ivec2 q = ivec2(floor(sp - 0.5));
  ivec2 n = ivec2(uSize) - 1;
  vec3 a = texelFetch(uHist, clamp(q, ivec2(0), n), 0).rgb;
  vec3 b = texelFetch(uHist, clamp(q + ivec2(1, 0), ivec2(0), n), 0).rgb;
  vec3 c = texelFetch(uHist, clamp(q + ivec2(0, 1), ivec2(0), n), 0).rgb;
  vec3 d = texelFetch(uHist, clamp(q + ivec2(1, 1), ivec2(0), n), 0).rgb;
  return clamp(r, min(min(a, b), min(c, d)), max(max(a, b), max(c, d)));
}
void main() {
  ivec2 ip = ivec2(gl_FragCoord.xy);
  ivec2 n = ivec2(uSize) - 1;
  vec4 c = texelFetch(uCur, ip, 0);
  gl_FragColor = c;
  if (uHistW <= 0.0 || !aaIn(gl_FragCoord.xy)) return;
  bool lake = false;
  bool solid = false;
  vec3 mn = c.rgb, mx = c.rgb, m1 = vec3(0.0), m2 = vec3(0.0);
  float dNear = 1e9;
  for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      ivec2 q = clamp(ip + ivec2(i, j), ivec2(0), n);
      vec4 t = texelFetch(uCur, q, 0);
      int k = taaKind(vec2(q) + 0.5, t.a);
      lake = lake || k == 1;
      solid = solid || k == 2;
      mn = min(mn, t.rgb);
      mx = max(mx, t.rgb);
      m1 += t.rgb;
      m2 += t.rgb * t.rgb;
      if (t.a > 1.0) dNear = min(dNear, t.a);
    }
  for (int i = 0; i < 4; i++) {
    ivec2 o = i == 0 ? ivec2(2, 0) : (i == 1 ? ivec2(-2, 0) : (i == 2 ? ivec2(0, 2) : ivec2(0, -2)));
    ivec2 q = clamp(ip + o, ivec2(0), n);
    int k = taaKind(vec2(q) + 0.5, texelFetch(uCur, q, 0).a);
    lake = lake || k == 1;
    solid = solid || k == 2;
  }
  if (!(lake && solid) || dNear > 1e8) return;
  vec3 dir = normalize(taaRay(gl_FragCoord.xy));
  vec4 pc = uPrevVP * vec4(uCamPos + dir * dNear, 1.0);
  if (pc.w <= 1e-4) return;
  vec2 puv = pc.xy / pc.w * 0.5 + 0.5;
  if (any(lessThan(puv, vec2(0.5) / uSize)) || any(greaterThan(puv, 1.0 - vec2(0.5) / uSize))) return;
  vec3 h = taaHist(puv);
  vec3 mu = m1 / 9.0;
  vec3 sd = sqrt(max(m2 / 9.0 - mu * mu, 0.0));
  h = clamp(h, max(mn, mu - 1.25 * sd), min(mx, mu + 1.25 * sd));
  float w = uHistW;
  if (dir.y < -1e-5) {
    // the lake point on this pixel's ray: no history where the hero's reflection or the ring waves change the water
    vec3 P = uCamPos + dir * (-uCamPos.y / dir.y);
    if (uRipple.w > 0.0) w *= smoothstep(uRipple.w, uRipple.w + 1.5, distance(P.xz, uRipple.xz));
    if (uReflOn > 0.5) {
      vec4 rc = uReflVP * vec4(P, 1.0);
      vec2 ruv = rc.xy / rc.w * 0.5 + 0.5;
      float ra = 0.0;
      for (int i = 0; i < 5; i++) {
        vec2 o = i == 0 ? vec2(0.0) : (i == 1 ? vec2(0.008, 0.0) : (i == 2 ? vec2(-0.008, 0.0) : (i == 3 ? vec2(0.0, 0.008) : vec2(0.0, -0.008))));
        ra = max(ra, texture2D(uRefl, clamp(ruv + o, vec2(0.0), vec2(1.0))).a);
      }
      w *= 1.0 - smoothstep(0.01, 0.1, ra);
    }
  }
  gl_FragColor.rgb = mix(c.rgb, h, w);
}
`;

/**
 * AA5a GLIDE (20 Nov, user: "make it smooth"): the lake-edge TAA tuned so the waterline GLIDES like the 16-sample reference
 * instead of stepping through the 4 samples' coverage levels. Applied to AA3's sources by exact text replacement, only when
 * on (`?lkglide=0`: AA3's TAA_FRAG / EDGE_FRAG text and uniforms, unchanged):
 *   - the history weight follows the pixel's own reprojection motion: wSlow (slow / still: the coverage steps are farthest
 *     apart in time and the history is most accurate) down to wFast (fast motion);
 *   - the clip box (variance gamma; min / max intersected or not) as a parameter;
 *   - the still tail ramps the weight to 0 (and the band's blur back to EnvEdge's sigma) over the 24 still frames, so the
 *     hand-over to the plain resolve is seamless;
 *   - band pixels are flagged by a negative alpha in the TAA output, so EnvEdge's silhouette blur can use its own sigma there.
 */
export type EdgeGlideOptions = {
  /** History weight at / below v0 px per frame of reprojection motion, and at / above v1. */
  wSlow: number;
  wFast: number;
  v0: number;
  v1: number;
  /** Variance clip gamma, and 0: variance box intersected with min / max (AA3), 1: variance only, 2: min / max only,
   *  3: min / max intersected with +-gamma 4x-coverage steps (a quarter of the 3x3 range) around the current value. */
  gamma: number;
  clip: number;
  /** Silhouette blur sigma on TAA band pixels while the TAA runs (EnvEdge.sigma elsewhere / at rest). */
  sigmaBand: number;
  /** Ramp the weight / band sigma out over the still tail (else AA3's constant weight until the hand-over). */
  tail: boolean;
  /** History resampling: Keys cubic parameter (-0.5 = AA3's Catmull-Rom; -0.75 / -1 sharper). */
  sharp: number;
};

function glideReplace(src: string, pairs: [string, string][]) {
  let o = src;
  for (const [a, b] of pairs) {
    if (o.split(a).length !== 2) throw new Error("EnvEdge glide: anchor not found once: " + a.slice(0, 60));
    o = o.replace(a, b);
  }
  return o;
}

const TAA_FRAG_GLIDE = () =>
  glideReplace(TAA_FRAG, [
    ["uniform vec4 uRipple;\n", "uniform vec4 uRipple;\n// AA5a glide: (wSlow, wFast, v0, v1), (gamma, clip mode, tail scale, history cubic's Keys parameter a)\nuniform vec4 uGlideW;\nuniform vec4 uGlideC;\n"],
    [
      "  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));\n  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);\n  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));\n  vec2 w3 = f * f * (-0.5 + 0.5 * f);\n",
      "  // Keys cubic, a = uGlideC.w (-0.5: Catmull-Rom; more negative: sharper, less blur accumulated by the history)\n" +
        "  float ka = uGlideC.w;\n  vec2 g1 = 1.0 - f;\n  vec2 w0 = ka * f * g1 * g1;\n  vec2 w1 = ((ka + 2.0) * f - (ka + 3.0)) * f * f + 1.0;\n" +
        "  vec2 w2 = ((ka + 2.0) * g1 - (ka + 3.0)) * g1 * g1 + 1.0;\n  vec2 w3 = ka * f * f * g1;\n",
    ],
    [
      "  h = clamp(h, max(mn, mu - 1.25 * sd), min(mx, mu + 1.25 * sd));\n  float w = uHistW;\n",
      "  vec3 lo = mu - uGlideC.x * sd, hi = mu + uGlideC.x * sd;\n" +
        "  if (uGlideC.y < 0.5) { lo = max(mn, lo); hi = min(mx, hi); } else if (uGlideC.y > 2.5) {\n" +
        "    // step clamp: the history within kappa (= gamma) 4x-coverage steps of the local range around the current value\n" +
        "    vec3 st = uGlideC.x * 0.25 * (mx - mn);\n" +
        "    lo = max(mn, c.rgb - st); hi = min(mx, c.rgb + st);\n" +
        "  } else if (uGlideC.y > 1.5) { lo = mn; hi = mx; }\n" +
        "  h = clamp(h, lo, hi);\n" +
        "  // the history weight follows this pixel's own reprojection motion (main-target px per frame)\n" +
        "  float mv = length(puv * uSize - gl_FragCoord.xy);\n" +
        "  float w = uHistW > 0.0 ? mix(uGlideW.x, uGlideW.y, smoothstep(uGlideW.z, uGlideW.w, mv)) * uGlideC.z : 0.0;\n",
    ],
    ["  gl_FragColor.rgb = mix(c.rgb, h, w);\n", "  gl_FragColor.rgb = mix(c.rgb, h, w);\n  // band flag for EnvEdge's blur (it reads |alpha|)\n  gl_FragColor.a = -c.a;\n"],
  ]);

const EDGE_FRAG_GLIDE = () =>
  glideReplace(EDGE_FRAG, [
    ["uniform vec2 uW;\n", "uniform vec2 uW;\n// AA5a glide: the weights on the TAA's band pixels (negative alpha)\nuniform vec2 uWb;\n"],
    [
      "  float dmin = min(",
      "  bool gBand = c4.a < 0.0;\n  c0.a = abs(c0.a); c1.a = abs(c1.a); c2.a = abs(c2.a); c3.a = abs(c3.a); c4.a = abs(c4.a);\n  c5.a = abs(c5.a); c6.a = abs(c6.a); c7.a = abs(c7.a); c8.a = abs(c8.a);\n  vec2 gw = gBand ? uWb : uW;\n  float dmin = min(",
    ],
    ["  vec3 s = enc(c4.rgb) + uW.x * (enc(c1.rgb) + enc(c3.rgb) + enc(c5.rgb) + enc(c7.rgb))\n    + uW.y * (", "  vec3 s = enc(c4.rgb) + gw.x * (enc(c1.rgb) + enc(c3.rgb) + enc(c5.rgb) + enc(c7.rgb))\n    + gw.y * ("],
    ["  gl_FragColor = vec4(dec(s / (1.0 + 4.0 * uW.x + 4.0 * uW.y)), c4.a);\n", "  gl_FragColor = vec4(dec(s / (1.0 + 4.0 * gw.x + 4.0 * gw.y)), c4.a);\n"],
  ]);

/** Lake-edge TAA inputs (HeroEngine, see TAA_FRAG). */
export type EdgeTAAOptions = {
  camera: THREE.PerspectiveCamera;
  /** The hero's mirrored reflection (RenderPipeline.reflection, alpha = coverage) and its view-projection. */
  reflection: THREE.WebGLRenderTarget | null;
  reflectionViewProj: THREE.Matrix4;
  /** xyz: the ring waves' centre (world), w: their reach (m); the engine updates w (the hold's crest train reaches further). */
  ripple: THREE.Vector4;
  /** History weight while the camera moves. */
  weight: number;
  /** AA5a glide (null / absent: AA3 exactly). */
  glide?: EdgeGlideOptions | null;
};

type SceneHook = {
  onBeforeRender: (r: THREE.WebGLRenderer, s: THREE.Scene, c: THREE.Camera, rt: THREE.WebGLRenderTarget | null) => void;
};

/** Below this screen motion (CSS px per 1/60 s) the camera counts as still (handheld drift included). */
const TAA_STILL = 0.012;
/** Still frames before the pass hands over to the plain resolve (its output has converged on the current frame by then). */
const TAA_TAIL = 24;
/** A jump (debug pose, a resumed tab): more than this many main-target px restarts the history. */
const TAA_JUMP = 96;

export class EnvEdge {
  private copy: THREE.ShaderMaterial;
  private edge: THREE.ShaderMaterial;
  /** The full-screen triangle that applies the edge pass. It is added to the engine's scene (every layer) and drawn only
   *  when armed, in the first render into the main target after the environment pass. */
  readonly quad: THREE.Mesh;
  private copyScene = new THREE.Scene();
  private copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private copyQuad: THREE.Mesh;
  /** Only when the main target renders to its texture directly (WEBGL_multisampled_render_to_texture). */
  private tmp?: THREE.WebGLRenderTarget;
  private main: THREE.WebGLRenderTarget | null = null;
  private armed = false;
  private scene: SceneHook;
  private prevSceneHook: SceneHook["onBeforeRender"];
  /** The Gaussian's sigma in screen px (fit to the projected path's skyline profile). */
  sigma = 0.6;
  /** aaresolve's reader uniforms (constructor `aa`), for the lake-edge TAA. */
  private aaRead: Record<string, { value: unknown }> | null = null;
  /** AA3 lake-edge TAA (enableTAA), or null. */
  private taa: {
    opts: EdgeTAAOptions;
    material: THREE.ShaderMaterial;
    scene: THREE.Scene;
    targets: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
    cur: number;
    /** The history holds the previous frame's output (histVP: its camera). */
    valid: boolean;
    still: number;
    hasPrev: boolean;
    lastVP: THREE.Matrix4;
    histVP: THREE.Matrix4;
    vp: THREE.Matrix4;
    inv: THREE.Matrix4;
    dt: number;
    pxPerCss: number;
    /** (lab) the last frame's history weight, -1 = pass skipped, and the frames the pass ran */
    lastWeight: number;
    runs: number;
    /** AA5a glide: 1 while moving, ramping to 0 over the still tail (1 without glide's tail). */
    tail: number;
  } | null = null;
  /** AA5a glide: band blur weights (EDGE_FRAG_GLIDE's uWb). */
  private uWb = { value: new THREE.Vector2(0, 0) };
  private tv = new THREE.Vector4();
  private tc = new THREE.Vector3();
  readonly uniforms = {
    uSrc: { value: null as THREE.Texture | null },
    uTexel: { value: new THREE.Vector2(1, 1) },
    uEdge: { value: new THREE.Vector2(0.06, 0.5) },
    uW: { value: new THREE.Vector2(0, 0) },
    uGain: { value: 1 },
  };

  /**
   * `aa`: aaresolve's reader plane (RenderPipeline.enableAAResolve) and whether the silhouette blur runs too (`edges`); without
   * it the triangle is exactly the round 11 edge pass.
   */
  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, plateGain: number, aa?: { uniforms: Record<string, { value: unknown }>; edges: boolean }) {
    this.uniforms.uGain.value = plateGain;
    this.aaRead = aa?.uniforms ?? null;
    const common = { vertexShader: VERT, depthTest: false, depthWrite: false, blending: THREE.NoBlending };
    this.copy = new THREE.ShaderMaterial({ name: "rx-env-edge-copy", fragmentShader: COPY_FRAG, uniforms: { uSrc: this.uniforms.uSrc }, ...common });
    this.edge = new THREE.ShaderMaterial({
      name: "rx-env-edge",
      fragmentShader: EDGE_FRAG,
      uniforms: aa ? { ...this.uniforms, ...aa.uniforms } : this.uniforms,
      ...(aa ? { defines: aa.edges ? { AA_RESOLVE: "", EDGE_BLUR: "" } : { AA_RESOLVE: "" } } : {}),
      ...common,
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.quad = new THREE.Mesh(geo, this.edge);
    this.quad.frustumCulled = false;
    // First among the opaque objects of whatever pass draws it, before any hero object.
    this.quad.renderOrder = -1e9;
    this.quad.layers.enableAll();
    this.quad.visible = false;
    this.quad.onAfterRender = () => {
      this.armed = false;
      this.quad.visible = false;
    };
    this.copyQuad = new THREE.Mesh(geo, this.copy);
    this.copyQuad.frustumCulled = false;
    this.copyScene.add(this.copyQuad);
    if (renderer.extensions.has("WEBGL_multisampled_render_to_texture")) {
      this.tmp = new THREE.WebGLRenderTarget(2, 2, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        depthBuffer: false,
        generateMipmaps: false,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        colorSpace: THREE.LinearSRGBColorSpace,
      });
    }
    // Visibility is decided per render call, before three collects the scene's objects: only the first render into the
    // main target after the environment pass, never the environment pass itself (or any other target).
    // (three calls a Scene's onBeforeRender with the current render target as its 4th argument.)
    const hooked = scene as unknown as SceneHook;
    this.scene = hooked;
    this.prevSceneHook = hooked.onBeforeRender;
    hooked.onBeforeRender = (r, s, cam, rt) => {
      this.prevSceneHook.call(scene, r, s, cam, rt);
      this.quad.visible = this.armed && rt === this.main;
    };
    scene.add(this.quad);
  }

  /** Main HDR target size in pixels. */
  setSize(width: number, height: number) {
    this.tmp?.setSize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
    if (this.taa) {
      for (const t of this.taa.targets) t.setSize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
      this.taa.valid = false;
    }
  }

  /**
   * AA3: the lake-edge TAA (TAA_FRAG; needs aaresolve's reader uniforms, i.e. the constructor's `aa`). Call before the first
   * render; then `taaFrame` once per frame before the pipeline renders.
   */
  enableTAA(opts: EdgeTAAOptions) {
    if (!this.aaRead || this.taa) return;
    const target = () =>
      new THREE.WebGLRenderTarget(2, 2, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        depthBuffer: false,
        generateMipmaps: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        colorSpace: THREE.LinearSRGBColorSpace,
      });
    const g = opts.glide ?? null;
    const material = new THREE.ShaderMaterial({
      name: "rx-lake-edge-taa",
      vertexShader: VERT,
      fragmentShader: g ? TAA_FRAG_GLIDE() : TAA_FRAG,
      uniforms: {
        ...this.aaRead,
        uCur: { value: null },
        uHist: { value: null },
        uRayO: { value: new THREE.Vector3() },
        uRayX: { value: new THREE.Vector3() },
        uRayY: { value: new THREE.Vector3() },
        uPrevVP: { value: new THREE.Matrix4() },
        uCamPos: { value: new THREE.Vector3() },
        uSize: { value: new THREE.Vector2(1, 1) },
        uHistW: { value: 0 },
        uRefl: { value: null },
        uReflVP: { value: opts.reflectionViewProj },
        uReflOn: { value: 0 },
        uRipple: { value: opts.ripple },
        ...(g
          ? {
              uGlideW: { value: new THREE.Vector4(g.wSlow, g.wFast, g.v0, Math.max(g.v1, g.v0 + 1e-3)) },
              uGlideC: { value: new THREE.Vector4(g.gamma, g.clip, 1, g.sharp) },
            }
          : {}),
      },
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    });
    if (g) {
      // the silhouette blur reads |alpha| and uses its own weights on the TAA's band pixels
      this.edge.fragmentShader = EDGE_FRAG_GLIDE();
      this.edge.uniforms.uWb = this.uWb;
      this.edge.needsUpdate = true;
    }
    const scene = new THREE.Scene();
    const tri = new THREE.Mesh(this.quad.geometry, material);
    tri.frustumCulled = false;
    scene.add(tri);
    this.taa = {
      opts,
      material,
      scene,
      targets: [target(), target()],
      cur: 0,
      valid: false,
      still: 0,
      hasPrev: false,
      lastVP: new THREE.Matrix4(),
      histVP: new THREE.Matrix4(),
      vp: new THREE.Matrix4(),
      inv: new THREE.Matrix4(),
      dt: 1 / 60,
      pxPerCss: 1,
      lastWeight: -1,
      runs: 0,
      tail: 1,
    };
  }

  /** Per frame, before the pipeline renders: the simulation step (s; 0 when frozen) and main-target px per CSS px. */
  taaFrame(dt: number, pxPerCss: number) {
    if (!this.taa) return;
    this.taa.dt = dt;
    this.taa.pxPerCss = pxPerCss;
  }

  /** (lab) the lake-edge TAA's state: last history weight (-1: pass skipped), frames it ran, still frames. */
  get taaState() {
    const t = this.taa;
    return t ? { weight: t.lastWeight, runs: t.runs, still: t.still, valid: t.valid } : null;
  }

  /** The largest screen motion (main-target px) of probe points between two view-projections (near and far, centre / corners). */
  private probeMotion(prev: THREE.Matrix4, inv: THREE.Matrix4, camPos: THREE.Vector3, w: number, h: number) {
    let m = 0;
    const v = this.tv;
    for (let i = 0; i < 5; i++) {
      const nx = i === 0 ? 0 : i < 3 ? -0.8 : 0.8;
      const ny = i === 0 ? 0 : i % 2 ? -0.8 : 0.8;
      v.set(nx, ny, 1, 1).applyMatrix4(inv);
      const dx = v.x / v.w - camPos.x, dy = v.y / v.w - camPos.y, dz = v.z / v.w - camPos.z;
      const l = Math.hypot(dx, dy, dz);
      for (const d of [6, 300]) {
        v.set(camPos.x + (dx / l) * d, camPos.y + (dy / l) * d, camPos.z + (dz / l) * d, 1).applyMatrix4(prev);
        if (v.w <= 1e-6) return Infinity;
        m = Math.max(m, Math.hypot((v.x / v.w - nx) * 0.5 * w, (v.y / v.w - ny) * 0.5 * h));
      }
    }
    return m;
  }

  /** The TAA pass into its own target (right after the environment pass); returns its output, or null when skipped. */
  private runTAA(renderer: THREE.WebGLRenderer, main: THREE.WebGLRenderTarget): THREE.Texture | null {
    const t = this.taa!;
    const cam = t.opts.camera;
    const camPos = this.tc.setFromMatrixPosition(cam.matrixWorld);
    t.vp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    t.inv.copy(t.vp).invert();
    const motion = t.hasPrev ? this.probeMotion(t.lastVP, t.inv, camPos, main.width, main.height) : Infinity;
    t.lastVP.copy(t.vp);
    t.hasPrev = true;
    const css = motion / Math.max(1e-6, t.pxPerCss);
    const per60 = t.dt > 1e-6 ? css / (t.dt * 60) : css;
    const moving = Number.isFinite(motion) && per60 > TAA_STILL;
    t.still = moving ? 0 : t.still + 1;
    if (!moving && t.still > TAA_TAIL) {
      t.valid = false;
      t.lastWeight = -1;
      return null;
    }
    const weight = t.valid && motion <= TAA_JUMP ? t.opts.weight : 0;
    const g = t.opts.glide;
    // AA5a glide: the still tail ramps the history out (seamless hand-over at TAA_TAIL)
    t.tail = g && g.tail && !moving ? Math.max(0, 1 - t.still / TAA_TAIL) : 1;
    if (g) ((u0) => (u0.uGlideC.value as THREE.Vector4).setZ(t.tail))(t.material.uniforms);
    const out = t.targets[t.cur];
    const hist = t.targets[1 - t.cur];
    if (out.width !== main.width || out.height !== main.height) {
      for (const r of t.targets) r.setSize(main.width, main.height);
      t.valid = false;
    }
    const u = t.material.uniforms;
    u.uCur.value = main.texture;
    u.uHist.value = hist.texture;
    // the far-plane point of pixel (px, py) is affine in px, py: rays as O + px X + py Y (relative to the camera)
    const ray = (px: number, py: number, o: THREE.Vector3) => {
      const v = this.tv.set((px / main.width) * 2 - 1, (py / main.height) * 2 - 1, 1, 1).applyMatrix4(t.inv);
      return o.set(v.x / v.w - camPos.x, v.y / v.w - camPos.y, v.z / v.w - camPos.z);
    };
    const rO = ray(0, 0, u.uRayO.value as THREE.Vector3);
    ray(1, 0, u.uRayX.value as THREE.Vector3).sub(rO);
    ray(0, 1, u.uRayY.value as THREE.Vector3).sub(rO);
    (u.uPrevVP.value as THREE.Matrix4).copy(t.histVP);
    (u.uCamPos.value as THREE.Vector3).copy(camPos);
    (u.uSize.value as THREE.Vector2).set(main.width, main.height);
    u.uHistW.value = t.valid ? weight : 0;
    u.uRefl.value = t.opts.reflection?.texture ?? null;
    u.uReflOn.value = t.opts.reflection ? 1 : 0;
    renderer.setRenderTarget(out);
    // (every pixel is written: a clear lets a tile-based GPU skip loading the old contents)
    renderer.clear(true, false, false);
    renderer.render(t.scene, this.copyCamera);
    t.lastWeight = u.uHistW.value as number;
    t.runs++;
    t.histVP.copy(t.vp);
    t.valid = true;
    t.cur = 1 - t.cur;
    return out.texture;
  }

  /** Called right after the environment pass (`main` holds the environment only and has just been resolved). */
  arm(renderer: THREE.WebGLRenderer, main: THREE.WebGLRenderTarget) {
    const u = this.uniforms;
    const s2 = 2 * this.sigma * this.sigma;
    u.uW.value.set(Math.exp(-1 / s2), Math.exp(-2 / s2));
    u.uTexel.value.set(1 / main.width, 1 / main.height);
    this.main = main;
    // AA3: the lake-edge TAA's output (its own target: no feedback loop either way) replaces the resolve as the source.
    const taaOut = this.taa ? this.runTAA(renderer, main) : null;
    if (this.taa?.opts.glide) {
      // band sigma while the TAA runs, back to sigma over the still tail
      const sb = this.sigma + (this.taa.opts.glide.sigmaBand - this.sigma) * (taaOut ? this.taa.tail : 0);
      const b2 = 2 * sb * sb;
      this.uWb.value.set(Math.exp(-1 / b2), Math.exp(-2 / b2));
    }
    if (taaOut) {
      u.uSrc.value = taaOut;
    } else if (this.tmp) {
      if (this.tmp.width !== main.width || this.tmp.height !== main.height) this.tmp.setSize(main.width, main.height);
      u.uSrc.value = main.texture;
      renderer.setRenderTarget(this.tmp);
      renderer.render(this.copyScene, this.copyCamera);
      u.uSrc.value = this.tmp.texture;
    } else {
      u.uSrc.value = main.texture;
    }
    this.armed = true;
  }

  dispose() {
    this.scene.onBeforeRender = this.prevSceneHook;
    (this.scene as unknown as THREE.Scene).remove(this.quad);
    this.tmp?.dispose();
    this.copy.dispose();
    this.edge.dispose();
    if (this.taa) {
      for (const t of this.taa.targets) t.dispose();
      this.taa.material.dispose();
    }
    this.quad.geometry.dispose();
  }
}
