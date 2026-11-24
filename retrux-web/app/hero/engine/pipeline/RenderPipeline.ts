import * as THREE from "three";
import { iceR11 } from "../hero/IceMaterial";
import { GLSL_AA_RESOLVE } from "../shaders/chunks";
import { LAYER, type QualityProfile } from "../types";
import type { SharedUniforms } from "../uniforms";

/**
 * p4perf (22 Nov, client: "focus on everything optimization", look identical): on the MSAA tiers' behind-ice path (T1 / T2) the
 * near rings and the shards go into ONE render into `main` instead of two back-to-back ones. Nothing reads `main` between them
 * (only the rings' depth function flips back), so the second render's MSAA load / store / resolve was pure overhead (each render
 * into the 4x HDR target costs a full tile load + store + resolve, see EnvEdge's note). The shards keep drawing after every ring
 * (renderOrder 1, HeroEngine), exactly as before. `?p4perf=0` restores the two renders exactly.
 */
export const P4PERF = typeof location === "undefined" || new URLSearchParams(location.search).get("p4perf") !== "0";

/**
 * Frame graph (scene-linear HDR until the post chain):
 *   1. reflection : hero from the camera mirrored about the lake -> `reflection` (alpha = coverage)
 *   2. env        : plate proxies + water + clouds                -> `main`
 *   3. copy       : main -> `refraction` (smaller, mip-mapped; every copy soft-knees highlights at 1.5)
 *   4. orb        : volumetric orb reading `refraction`           -> `main`
 *   5. copy       : main -> `refraction` (so the rings see the orb)
 *   6. back depth : ring back faces, linear view depth             -> `back` (optional)
 *   7. rings      : ice reading `refraction` and `back`           -> `main`
 *                   (T1+: far half, copy main -> `refraction`, near half: the front refracts the back)
 *   8. shards     : cobalt crystals, depth-tested against ice + orb -> `main`
 *   9. post       : bloom + AgX + grade                            -> screen
 *
 * aaresolve (MSAA tiers, `?aaresolve=0` off; chunks.ts GLSL_AA_RESOLVE): during step 2 the environment writes its samples
 * below the horizon line tone-compressed, so the 4x resolve averages them perceptually. Two readers expand that resolve
 * before anything else sees it, without a render pass of their own: the first copy into `refraction` (each texel expanded,
 * then filtered) and EnvEdge's triangle at the start of the next render into `main`, which writes the expanded resolve back
 * into every one of those pixels before the first hero object. From there on `main` is scene-linear as before.
 */

export type PassHooks = {
  /** Called around the mirrored pass so materials can switch to env-only refraction. */
  setReflectionPass(on: boolean): void;
  /** Swap rings to the back-depth material. */
  setBackPass(on: boolean): void;
  /** Near half of the ice-behind-ice split: rings take a strict depth test (see Rings.setNearPass). */
  setRingNearPass(on: boolean): void;
  /** Round 11 (ENV fix round): right after the environment pass, with `main` holding the environment only (EnvEdge). */
  afterEnv?: (main: THREE.WebGLRenderTarget) => void;
};

const BLIT_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
// The copies the ice refracts (and the shards, a frame late) are mip-mapped and read blurred: the orb's 16-32x core
// averaged into those mips flooded every ring with white light, so the ice read milky (QC round 4: ring faces
// 25-47 L too bright, with a third of the reference's blue). A soft knee compresses everything above 0.8 into
// 0.8..uKnee (hue kept); the orb still glows through the ice right in front of it (IceMaterial, analytic term).
// QC round 7 (icevar40): the 1.5 ceiling squeezed sky (2-3), clouds (~4) and the orb (5-16) into one plateau (~1.5), so the
// ice showed no highlights and the orb's plasma veins vanished through it. Above 0.8 a half-contrast power now,
// m' = 0.8 sqrt(m / 0.8): sky within +-8 % of before, clouds +20 %, the orb core 6 -> 2.2 and 16 -> 3.6. The ice reads
// at most 1.6 mips into the copy (IceMaterial), so the old mip flood (up to 3.4) cannot come back. uKnee > 0.8 = on.
const BLIT_FRAG = /* glsl */ `
uniform sampler2D uSrc;
uniform float uKnee;
#ifdef AA_RESOLVE
${GLSL_AA_RESOLVE}
// 1 for the first copy after the environment pass (its resolve is compressed below the horizon line)
uniform float uAAExpand;
uniform vec2 uSrcSize;
vec4 aaFetch(ivec2 q) {
  q = clamp(q, ivec2(0), ivec2(uSrcSize) - 1);
  vec4 c = texelFetch(uSrc, q, 0);
  if (aaIn(vec2(q) + 0.5)) c.rgb = aaExpand(c.rgb);
  return c;
}
#endif
varying vec2 vUv;
void main() {
  vec4 c = texture2D(uSrc, vUv);
#ifdef AA_RESOLVE
  if (uAAExpand > 0.5) {
    // Each texel expanded first, then the bilinear footprint the sampler would have taken.
    vec2 st = vUv * uSrcSize - 0.5;
    vec2 f = fract(st);
    ivec2 q = ivec2(floor(st));
    c = mix(mix(aaFetch(q), aaFetch(q + ivec2(1, 0)), f.x), mix(aaFetch(q + ivec2(0, 1)), aaFetch(q + ivec2(1, 1)), f.x), f.y);
  }
#endif
  float m = max(max(c.r, c.g), c.b);
  const float K = 0.8;
  if (uKnee > K && m > K) c.rgb *= K * sqrt(m / K) / m;
  gl_FragColor = c;
}
`;

/** aaresolve's region uniforms (chunks.ts GLSL_AA_RESOLVE). */
export type AAUniforms = { uAAPlane: { value: THREE.Vector3 }; uAAExc: { value: THREE.Matrix3 }; uAAKnee: { value: number } };
/** Where the blended surfaces reach below the eye (ray-slope box; see PlateEnvironment.cloudDip). */
export type AADip = (cam: THREE.Vector3, box: { x0: number; x1: number; y: number }) => boolean;
/** `knee`: the compression's K (one object shared by the writers and the readers). */
export const createAAUniforms = (knee: { value: number }): AAUniforms => ({ uAAPlane: { value: new THREE.Vector3(0, 0, 1) }, uAAExc: { value: new THREE.Matrix3() }, uAAKnee: knee });

/** Ceiling of the soft knee in the refraction copies (scene-linear). */
const REFRACTION_KNEE = 1.5;

export class RenderPipeline {
  main: THREE.WebGLRenderTarget;
  refraction: THREE.WebGLRenderTarget;
  back: THREE.WebGLRenderTarget | null = null;
  reflection: THREE.WebGLRenderTarget | null = null;
  readonly mirrorCamera = new THREE.PerspectiveCamera();
  readonly mirrorViewProj = new THREE.Matrix4();

  private blitScene = new THREE.Scene();
  private blitCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private blitMaterial: THREE.ShaderMaterial;
  private width = 1;
  private height = 1;
  private clearColor = new THREE.Color(0, 0, 0);
  private tmpFwd = new THREE.Vector3();
  private tmpOrb = new THREE.Vector3();
  /** aaresolve: the environment materials' region (off outside step 2), the readers' copy of it and where the cloud cards
   *  reach below the eye (see enableAAResolve). */
  private aa: { write: AAUniforms; read: AAUniforms; dip: AADip } | null = null;
  private aaBox = { x0: 0, x1: 0, y: 0 };
  private aaV = new THREE.Vector3();
  private aaE = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  /** aaresolve: how far below the horizon line (px at the frame centre) the compressed region starts. */
  aaMarginPx = 2;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private profile: QualityProfile,
    private shared: SharedUniforms,
  ) {
    this.main = this.makeMain(1, 1);
    this.refraction = this.makeColorTarget(1, 1, true);
    if (profile.backDepthScale > 0) this.back = this.makeColorTarget(1, 1, false, true);
    if (profile.reflectionScale > 0) this.reflection = this.makeColorTarget(1, 1, false, true);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.blitMaterial = new THREE.ShaderMaterial({
      name: "rx-blit",
      vertexShader: BLIT_VERT,
      fragmentShader: BLIT_FRAG,
      uniforms: { uSrc: { value: null }, uKnee: { value: REFRACTION_KNEE } },
      depthTest: false,
      depthWrite: false,
    });
    const tri = new THREE.Mesh(geo, this.blitMaterial);
    tri.frustumCulled = false;
    this.blitScene.add(tri);

    shared.uRefraction.value = this.refraction.texture;
    shared.uBackDepth.value = this.back ? this.back.texture : null;
    shared.uUseBackDepth.value = this.back ? 1 : 0;
  }

  private makeMain(w: number, h: number) {
    return new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      samples: this.profile.msaa,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
  }

  private makeColorTarget(w: number, h: number, mips: boolean, depth = false) {
    return new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      depthBuffer: depth,
      generateMipmaps: mips,
      minFilter: mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
  }

  /** Size of the main HDR target in pixels (drawing buffer x render scale). */
  setSize(width: number, height: number) {
    width = Math.max(2, Math.round(width));
    height = Math.max(2, Math.round(height));
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.main.setSize(width, height);
    const rs = this.profile.refractionScale;
    this.refraction.setSize(Math.max(2, Math.round(width * rs)), Math.max(2, Math.round(height * rs)));
    if (this.back) {
      const bs = this.profile.backDepthScale;
      this.back.setSize(Math.max(2, Math.round(width * bs)), Math.max(2, Math.round(height * bs)));
    }
    if (this.reflection) {
      const s = this.profile.reflectionScale;
      this.reflection.setSize(Math.max(2, Math.round(width * s)), Math.max(2, Math.round(height * s)));
    }
    this.shared.uResolution.value.set(width, height);
    this.shared.uRefractionSize.value.set(this.refraction.width, this.refraction.height);
  }

  get size() {
    return { width: this.width, height: this.height };
  }

  /** Mirrors `camera` about the water plane y = level. */
  updateMirror(camera: THREE.PerspectiveCamera, level: number) {
    const m = this.mirrorCamera;
    m.copy(camera, false);
    const p = camera.position;
    m.position.set(p.x, 2 * level - p.y, p.z);
    const fwd = this.tmpFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    fwd.y = -fwd.y;
    m.up.set(0, -1, 0);
    m.lookAt(m.position.x + fwd.x, m.position.y + fwd.y, m.position.z + fwd.z);
    m.updateMatrixWorld(true);
    m.projectionMatrix.copy(camera.projectionMatrix);
    m.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    this.mirrorViewProj.multiplyMatrices(m.projectionMatrix, m.matrixWorldInverse);
  }

  private blit(src: THREE.Texture, dst: THREE.WebGLRenderTarget | null, aaExpand = false) {
    const u = this.blitMaterial.uniforms;
    u.uSrc.value = src;
    if (this.aa) {
      u.uAAExpand.value = aaExpand ? 1 : 0;
      u.uSrcSize.value.set(this.width, this.height);
    }
    this.renderer.setRenderTarget(dst);
    this.renderer.render(this.blitScene, this.blitCamera);
  }

  /**
   * aaresolve (before the first render): `write` goes to every environment material (PlateEnvironment / Water.setAAResolve),
   * `read` to EnvEdge, which must be armed after the environment pass (hooks.afterEnv) to expand the resolve. `dip(camera
   * position, box)`: where the cloud cards (the only blended surfaces of that pass) reach below the eye, in ray-slope space.
   */
  enableAAResolve(write: AAUniforms, read: AAUniforms, dip: AADip) {
    this.aa = { write, read, dip };
    write.uAAPlane.value.set(0, 0, 1);
    const m = this.blitMaterial;
    m.defines.AA_RESOLVE = "";
    Object.assign(m.uniforms, read, { uAAExpand: { value: 0 }, uSrcSize: { value: new THREE.Vector2(1, 1) } });
    m.needsUpdate = true;
  }

  /**
   * The compressed region in `main`'s pixels (gl_FragCoord), for this frame's camera: the pixel centre's ray points below the
   * horizon by aaMarginPx, and outside the slope box of the cloud cards that hang below the eye (with the same margin). Each
   * bound is a world-space condition dot(d, v) on the ray d, i.e. a half-plane in pixels (aaHalf).
   */
  private aaRegion(camera: THREE.PerspectiveCamera, dip: AADip, out: AAUniforms) {
    camera.updateMatrixWorld();
    const p = camera.projectionMatrix.elements;
    const m = (this.aaMarginPx * 2) / (this.height * p[5]);
    // below the horizon: d.y < -m (-d.z)  <=>  dot(d, (0, 1, -m)) < 0
    this.aaHalf(camera, this.aaV.set(0, 1, -m), out.uAAPlane.value);
    const b = this.aaBox, [e0, e1, e2] = this.aaE;
    if (dip(this.tmpFwd.setFromMatrixPosition(camera.matrixWorld), b)) {
      // out of the region (all >= 0): above the cards' bottom, right of their left edge, left of their right edge
      this.aaHalf(camera, this.aaV.set(0, 1, b.y - m), e0);
      if (Number.isFinite(b.x0)) this.aaHalf(camera, this.aaV.set(1, 0, b.x0 - m), e1);
      else e1.set(0, 0, 1);
      if (Number.isFinite(b.x1)) this.aaHalf(camera, this.aaV.set(-1, 0, -(b.x1 + m)), e2);
      else e2.set(0, 0, 1);
    } else {
      e0.set(0, 0, -1);
      e1.set(0, 0, -1);
      e2.set(0, 0, -1);
    }
    out.uAAExc.value.set(e0.x, e1.x, e2.x, e0.y, e1.y, e2.y, e0.z, e1.z, e2.z);
  }

  /** The sign of dot(d, v) for the world ray d through the pixel centre (px, py) is that of dot((px, py, 1), out). */
  private aaHalf(camera: THREE.PerspectiveCamera, v: THREE.Vector3, out: THREE.Vector3) {
    const e = camera.matrixWorld.elements;
    const p = camera.projectionMatrix.elements;
    // v in view space; the view ray through NDC (nx, ny) is ((nx + p8) / p0, (ny + p9) / p5, -1).
    const ux = e[0] * v.x + e[1] * v.y + e[2] * v.z;
    const uy = e[4] * v.x + e[5] * v.y + e[6] * v.z;
    const uz = e[8] * v.x + e[9] * v.y + e[10] * v.z;
    out.set((2 * ux) / (this.width * p[0]), (2 * uy) / (this.height * p[5]), (ux * (p[8] - 1)) / p[0] + (uy * (p[9] - 1)) / p[5] - uz);
  }

  private pass(scene: THREE.Scene, camera: THREE.Camera, layers: number[]) {
    camera.layers.disableAll();
    for (const l of layers) camera.layers.enable(l);
    this.renderer.render(scene, camera);
  }

  /** Renders the HDR frame into `main`. The caller runs the post chain afterwards. */
  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, hooks: PassHooks, waterLevel: number) {
    const r = this.renderer;
    const prevAutoClear = r.autoClear;
    r.autoClear = false;
    r.setClearColor(this.clearColor, 0);

    // 1. Hero reflection from below the lake.
    if (this.reflection) {
      this.updateMirror(camera, waterLevel);
      hooks.setReflectionPass(true);
      r.setRenderTarget(this.reflection);
      r.clear(true, true, false);
      // (Shards dropped since QC round 7, T01: ~2 m above the water they mirrored into the frame's bottom rows as flat
      // half-res cobalt stains, over the baked reflections of the nearer rocks.)
      this.pass(scene, this.mirrorCamera, [LAYER.ORB, LAYER.RINGS]);
      hooks.setReflectionPass(false);
    }

    // 2. Environment. (The shards come after the rings, step 8.)
    const aa = this.aa && hooks.afterEnv ? this.aa : null;
    if (aa) {
      this.aaRegion(camera, aa.dip, aa.write);
      aa.read.uAAPlane.value.copy(aa.write.uAAPlane.value);
      aa.read.uAAExc.value.copy(aa.write.uAAExc.value);
    }
    r.setRenderTarget(this.main);
    r.clear(true, true, false);
    this.pass(scene, camera, [LAYER.ENV]);
    if (aa) aa.write.uAAPlane.value.set(0, 0, 1);
    if (hooks.afterEnv) {
      hooks.afterEnv(this.main);
      r.setRenderTarget(this.main);
    }

    // Ring back faces -> thickness (independent of the orb; the far half of the rings needs it before the orb).
    const backPass = () => {
      // (Round 11: the ice traces its own path through the section, so the thickness pass is skipped; ?ice=r10 and T0 keep it.)
      if (!this.back || iceR11(this.profile.ice)) return;
      hooks.setBackPass(true);
      r.setRenderTarget(this.back);
      r.clear(true, true, false);
      this.pass(scene, camera, [LAYER.RINGS]);
      hooks.setBackPass(false);
    };
    const split = this.shared.uRingSplit.value;
    const behind = this.profile.iceBehindIce;
    if (behind) {
      // T1+ (QC round 10, Awwwards #2: the hold orb read as "a flat, blown-out white disc / matte pearl"; F402's glass ball
      // shows the rings behind it, inverted and dark, through its glow): the far half of the cage first, so the orb's copy
      // holds it. Env, back depth, copy, far half (split at the orb's view depth), copy, orb (refracting env + far rings
      // along its exit rays), copy, near half (refracting all of it, as before: the front rings bend the back of the cage
      // and the orb). The far half no longer sees the orb in its copy: it lies behind the orb's centre plane.
      backPass();
      this.blit(this.main.texture, this.refraction, !!aa);
      split.set(1, -this.tmpOrb.copy(this.shared.uOrbCenter.value).applyMatrix4(camera.matrixWorldInverse).z);
      r.setRenderTarget(this.main);
      this.pass(scene, camera, [LAYER.RINGS]);
      split.set(0, 0);
      this.blit(this.main.texture, this.refraction);
      r.setRenderTarget(this.main);
      this.pass(scene, camera, [LAYER.ORB]);
      this.blit(this.main.texture, this.refraction);
      hooks.setRingNearPass(true);
      r.setRenderTarget(this.main);
      // (p4perf: + the shards, step 8, in the same render; they draw after every ring, renderOrder 1.)
      this.pass(scene, camera, P4PERF ? [LAYER.RINGS, LAYER.SHARDS] : [LAYER.RINGS]);
      hooks.setRingNearPass(false);
    } else {
      // 3-4. Orb over a copy of the environment; 5. copy again so the ice refracts the glowing orb too; 6-7. back depth,
      // rings.
      this.blit(this.main.texture, this.refraction, !!aa);
      r.setRenderTarget(this.main);
      this.pass(scene, camera, [LAYER.ORB]);
      this.blit(this.main.texture, this.refraction);
      backPass();
      r.setRenderTarget(this.main);
      this.pass(scene, camera, [LAYER.RINGS]);
    }

    // 8. Shards, last: the depth test hides the ones behind the ice and the orb. Inside the refraction copies the
    // lens smeared them into saturated violet blotches across the rings (QC round 4: 12-15 % of a band), and the
    // reference's ice never shows them (frosted, it would blur them away).
    if (!(P4PERF && behind)) this.pass(scene, camera, [LAYER.SHARDS]);

    camera.layers.enableAll();
    r.setRenderTarget(null);
    r.autoClear = prevAutoClear;
  }

  dispose() {
    this.main.dispose();
    this.refraction.dispose();
    this.back?.dispose();
    this.reflection?.dispose();
    this.blitMaterial.dispose();
  }
}
