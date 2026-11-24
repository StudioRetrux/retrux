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

type SceneHook = {
  onBeforeRender: (r: THREE.WebGLRenderer, s: THREE.Scene, c: THREE.Camera, rt: THREE.WebGLRenderTarget | null) => void;
};

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
  }

  /** Called right after the environment pass (`main` holds the environment only and has just been resolved). */
  arm(renderer: THREE.WebGLRenderer, main: THREE.WebGLRenderTarget) {
    const u = this.uniforms;
    const s2 = 2 * this.sigma * this.sigma;
    u.uW.value.set(Math.exp(-1 / s2), Math.exp(-2 / s2));
    u.uTexel.value.set(1 / main.width, 1 / main.height);
    this.main = main;
    if (this.tmp) {
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
    this.quad.geometry.dispose();
  }
}
