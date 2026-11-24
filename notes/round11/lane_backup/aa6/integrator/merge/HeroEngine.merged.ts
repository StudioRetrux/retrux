import * as THREE from "three";
import { loadHeroAssets } from "./assets";
import { CameraRig } from "./CameraRig";
import { Choreography, type Phase } from "./Choreography";
import { WATER } from "./config";
import { CAM_TARGETS } from "./curves";
import { aPhaseFromUrl, HOLD_CURVES, HOLD_SPIN, HOLD_TUNE, holdCurvesChanged, holdModeFromUrl, idleModeFromUrl, P2B_F1, P2B_F2, shardRateFromSpin, SPIN_P2B, type HoldMode } from "./hero/HoldR11";
import { ICE_R11A, iceR11 } from "./hero/IceMaterial";
import { Orb } from "./hero/Orb";
import { Rings } from "./hero/Rings";
import { Shards } from "./hero/Shards";
import { clamp, ease, smoothstep } from "./math";
import { DEFAULT_POST, PostChain, type PostParams } from "./pipeline/PostChain";
import { createAAUniforms, RenderPipeline, type PassHooks } from "./pipeline/RenderPipeline";
import { AdaptiveScale, detectTier, PROFILES } from "./quality";
import { createHeroState, LAYER, type HeroState, type QualityProfile, type TierName } from "./types";
import { createSharedUniforms, cubeUVDefines } from "./uniforms";
import { EnvEdge } from "./world/EnvEdge";
import { LakeMirror } from "./world/LakeMirror";
import { LakeHeight } from "./world/LakeHeight";
import { LakeSchedule } from "./world/LakeSchedule";
import { PlateEnvironment } from "./world/PlateEnvironment";
import { Water } from "./world/Water";

export type HeroEngineOptions = {
  canvas: HTMLCanvasElement;
  /** URL prefix of the hero assets, e.g. "/hero/". */
  assetBase: string;
  onProgress?: (p: number) => void;
  /** A press became a hold (true) / the hold ended (false). Clicks never fire it. */
  onHoldChange?: (holding: boolean) => void;
  /** Force a quality tier (also `?tier=T0|T1|T2`). */
  tier?: TierName;
  debug?: boolean;
};

/** Seconds of the opening move after the loader hands over. */
const INTRO_DURATION = 3.4;

/** Tumble speed during the opening move (eased intro progress 0..1 -> speed multiplier). */
const introSpinAt = (introK: number) => 0.25 + 0.75 * smoothstep(0.0, 0.8, introK);

/** Tumble-clock seconds that elapse during the opening move. */
function introSpinIntegral() {
  const n = 340;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += introSpinAt(ease.inOutSoft((i + 0.5) / n)) * (INTRO_DURATION / n);
  return sum;
}
/** Panorama radiance clamp before prefiltering; the sun glint comes from the analytic light. */
const PANO_CLAMP = 64;
/** AA3: the lake-edge TAA's history weight while the camera moves (EnvEdge TAA_FRAG). */
const LAKE_EDGE_TAA_WEIGHT = 0.5;
/**
 * AA5a glide (EnvEdge EdgeGlideOptions), tuned on the slow / medium sweeps against the 16-sample reference: history 0.85 at
 * <= 0.15 px per frame of the pixel's own motion (where the 4 samples' coverage steps are farthest apart in time and the
 * Catmull-Rom resample blurs least) down to 0.7 at >= 0.5 px; AA3's clip and resample; no silhouette blur on the TAA's band
 * pixels while it runs (sigma 0.3 px: neighbour weight 0.004; the GT's own edge is ~0.3 px, EnvEdge's 0.6 px came on top of
 * the TAA's averaging), back to 0.6 px over the still tail. (AA3: 0.5 at any speed, 0.6 px blur.)
 */
const GLIDE = { wSlow: 0.85, wFast: 0.7, v0: 0.15, v1: 0.5, gamma: 1.25, clip: 0, sigmaBand: 0.3, sharp: -0.5 };

export class HeroEngine {
  readonly state: HeroState = createHeroState();
  readonly profile: QualityProfile;
  readonly gpu: string;
  private renderer: THREE.WebGLRenderer;
  private shared = createSharedUniforms();
  private scene = new THREE.Scene();
  private rig = new CameraRig();
  private adaptive: AdaptiveScale;
  private pipeline: RenderPipeline;
  private post: PostChain;
  private choreo: Choreography;
  private env?: PlateEnvironment;
  private water?: Water;
  /** Round 11 (baked environment): the lake's planar mirror and its target size in texels (the water's uEnvMirrorSize). */
  private lakeMirror?: LakeMirror;
  /** Lake v4 (WATER lane): the static max-mip heightfield of the baked meshes (built once in load with the r12 lake). */
  private lakeHeight: LakeHeight | null = null;
  /** Lake v4 frame budget (WATER lane): when the mirror, the walk and the cached term are drawn (`?lkperf=0`: as before). */
  private lakeSched: LakeSchedule | null = null;
  private lakeMirrorSize = new THREE.Vector2(1, 1);
  /** Round 11 fix round (baked environment, MSAA tiers): soft environment silhouettes after the env pass. */
  private envEdge?: EnvEdge;
  /** AA3: the hold crest train's centre and reach for the lake-edge TAA (no history where its crests move the water). */
  private taaRipple = new THREE.Vector4();
  /** The simulation step of the frame being rendered (0 when frozen). */
  private lastDt = 0;
  /** AA3 step B: the lake mirror redrawn on every moving frame (`?slabflash=0`: every 3rd, as before). */
  private slabFlashFix = false;
  /** AA3 lake-edge TAA: no history inside the hold's crest train (lab `?debug&lktaacrest=0`: history there too). */
  private taaCrest = true;
  private lakeMirrorPass = (on: boolean) => {
    this.env?.setLakeMirrorPass(on);
    if (this.water) this.water.group.visible = !on;
  };
  private rings?: Rings;
  private orb?: Orb;
  private shards?: Shards;
  /** Rings fix round 1: the belts' per-belt, per-axis widening this frame (HOLD_SPIN.shardOutA / shardOutB x spreadA). */
  private readonly shardOut4 = [0, 0, 0, 0];
  /** Rings fix round 2: the same plus each belt's depth share in front of its origin (HOLD_SPIN.shardFrontA / shardFrontB). */
  private readonly shardOut6 = [0, 0, 0, 0, 0, 0];
  /** World Y of the hero parts at load, for the dolly lift (Rings.tune.holdLift). */
  private heroBase: { rings: number; orb: number; shards: number; center: number } | null = null;
  /** Press-and-hold version: "r11" (default) or "r10" (`?hold=r10`, the round-10 hold exactly). */
  readonly holdMode: HoldMode = holdModeFromUrl();
  private pmrem?: THREE.WebGLRenderTarget;
  private postParams: PostParams = { ...DEFAULT_POST, lensCenter: new THREE.Vector2() };
  private raf = 0;
  private running = false;
  private last = 0;
  private introStart = -1;
  private visible = true;
  private onScreen = true;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private tmpSize = new THREE.Vector2();
  private resizeObserver: ResizeObserver;
  private intersection?: IntersectionObserver;
  private disposers: (() => void)[] = [];
  private hooks: PassHooks = {
    setReflectionPass: (on: boolean) => {
      this.rings?.setReflectionPass(on);
      this.orb?.setReflectionPass(on);
      this.shards?.setReflectionPass(on);
    },
    setBackPass: (on: boolean) => this.rings?.setBackPass(on),
    setRingNearPass: (on: boolean) => this.rings?.setNearPass(on),
  };

  constructor(private opts: HeroEngineOptions) {
    const canvas = opts.canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      stencil: false,
      depth: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.debug.checkShaderErrors = !!opts.debug;

    const urlTier = typeof location !== "undefined" ? new URLSearchParams(location.search).get("tier") : null;
    const detected = detectTier(this.renderer.getContext() as WebGL2RenderingContext);
    const tier = (opts.tier ?? (urlTier as TierName | null) ?? detected.tier) as TierName;
    this.profile = PROFILES[tier] ?? PROFILES[detected.tier];
    // `?ibi=0` / `?ibi=1` forces the ice-behind-ice split off / on (A/B captures and perf comparisons).
    const ibi = typeof location !== "undefined" ? new URLSearchParams(location.search).get("ibi") : null;
    if (ibi === "0" || ibi === "1") this.profile = { ...this.profile, iceBehindIce: ibi === "1" };
    this.gpu = detected.gpu;
    this.state.tier = this.profile.tier;
    this.adaptive = new AdaptiveScale(this.profile);
    if (opts.debug) console.info(`[hero] GPU "${detected.gpu}" -> ${this.profile.tier} (${detected.reason})`);

    this.pipeline = new RenderPipeline(this.renderer, this.profile, this.shared);
    this.post = new PostChain(this.renderer, this.profile.post);

    // No lake impulse on press / release: the reference has none, and a click must do nothing.
    this.choreo = new Choreography(canvas, this.state, () => this.rig.camera);
    this.choreo.holdMode = this.holdMode;
    this.rig.holdMode = this.holdMode;
    this.choreo.onHoldChange = (on) => this.opts.onHoldChange?.(on);

    const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.rig.reducedMotion = reduced;
    this.choreo.reducedMotion = reduced;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    if (typeof IntersectionObserver !== "undefined") {
      this.intersection = new IntersectionObserver((e) => {
        this.onScreen = e[0]?.isIntersecting ?? true;
        this.updateRunning();
      });
      this.intersection.observe(canvas);
    }
    const onVis = () => {
      this.visible = document.visibilityState !== "hidden";
      this.updateRunning();
    };
    document.addEventListener("visibilitychange", onVis);
    this.disposers.push(() => document.removeEventListener("visibilitychange", onVis));
    const onLost = (e: Event) => {
      e.preventDefault();
      this.stop();
      console.warn("[hero] WebGL context lost");
    };
    canvas.addEventListener("webglcontextlost", onLost);
    this.disposers.push(() => canvas.removeEventListener("webglcontextlost", onLost));
    this.resize();
  }

  /** Loads and uploads everything, compiles every shader, renders one warm-up frame. */
  async load() {
    // `?proj=0` keeps the single rest projector (A/B captures); otherwise every published extra plate is used.
    const projOff = typeof location !== "undefined" && new URLSearchParams(location.search).get("proj") === "0";
    const assets = await loadHeroAssets(
      this.opts.assetBase,
      this.renderer,
      (p) => {
        this.state.loaded = p * 0.92;
        this.opts.onProgress?.(this.state.loaded);
      },
      undefined,
      projOff,
      // Grazing near-floe rims broke into dashes at 4x (QC round 7, T04); T0 keeps 4.
      this.profile.tier === "T0" ? 4 : 16,
      // Round 11: T0 keeps the re-aimed plate lake (the mirror pass is not in its budget).
      this.profile.tier !== "T0",
    );

    clampHalfFloat(assets.panorama, PANO_CLAMP);
    const gen = new THREE.PMREMGenerator(this.renderer);
    this.pmrem = gen.fromEquirectangular(assets.panorama);
    gen.dispose();
    assets.panorama.dispose();
    this.shared.uEnvMap.value = this.pmrem.texture;
    const envDefines = cubeUVDefines(this.pmrem.texture);

    this.env = new PlateEnvironment(
      assets.envProxy.scene,
      assets.plate,
      assets.plateMeta,
      assets.clouds,
      this.shared,
      envDefines,
      assets.extraPlates,
    );
    setLayer(this.env.group, LAYER.ENV);
    this.scene.add(this.env.group);
    this.rig.setCoverage(this.env.coverage);

    // Round 11: the baked environment's lake is a planar mirror of it (assets.sky is only set then). `?envlake=plate` keeps
    // round 11 step 1's lake (the rest plate re-aimed through the projector depth).
    if (assets.sky && assets.envProxy.scene.userData?.baked) {
      const lq = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;
      // AA3 step B (20 Nov, the 20 Hz "slab-foot flash"): while the camera moves, the mirror target is redrawn on every frame
      // instead of every 3rd (LakeSchedule.mirrorEvery 1, set below; MSAA tiers). A target drawn 1-2 frames earlier is exact
      // for the scene, but its own parallax lookups (the strata and far-field marches through the target's occlusion, and the
      // resampling of its texel grid) depend on the camera it was drawn from, so the reflections beside the waterline jumped
      // on each redraw (1/3-cycle peak 6-17x the spectrum's median on the waterline band). The still camera keeps its schedule
      // (the rest frame is unchanged). `?slabflash=0` keeps every 3rd moving frame.
      this.slabFlashFix = this.profile.msaa > 0 && lq?.get("slabflash") !== "0";
      this.lakeMirror = new LakeMirror(assets.sky, this.profile.tier);
      // Frame budget (E-G3): T1 reuses the target for up to 2 frames while the camera is still; `?envmirrorrate=1` disables it.
      const rate1 = lq?.get("envmirrorrate") === "1";
      this.lakeMirror.reuse = this.profile.tier === "T1" && !rate1 ? 2 : 0;
      // Fix round: a resize re-renders the mirror at once (no black lake); `?envfix=0` restores step 2 exactly.
      this.lakeMirror.refreshOnResize = lq?.get("envfix") !== "0";
      setLayer(this.lakeMirror.skyMesh, LAYER.ENV);
      this.scene.add(this.lakeMirror.skyMesh);
      this.lakeMirror.setSize(this.pipeline.size.width, this.pipeline.size.height);
      this.lakeMirrorSize.set(this.lakeMirror.target.width, this.lakeMirror.target.height);
    }
    const mirror = this.lakeMirror;
    // Hotfix 2 (smooth waterline, 18 Nov): the plate lake's choices beside floes and rocks are soft blends on bilinear projector
    // depth instead of per-pixel switches on nearest depth (Water SHORE_AA). `?shoreaa=0` keeps the switches exactly.
    const shoreAA = typeof location === "undefined" || new URLSearchParams(location.search).get("shoreaa") !== "0";
    // Lake v4 (WATER lane): the r12 lake finds the first floe / rock / shore face beyond each lake point in a heightfield of
    // the baked meshes (one top-down render + read-back, here). `?lkv=3` keeps v3 (no heightfield).
    if (mirror && assets.lakeR12 && (typeof location === "undefined" || new URLSearchParams(location.search).get("lkv") === null)) {
      const solids: THREE.Mesh[] = [];
      this.env.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || m.name === "BG001" || m.parent?.name === "BG001") return;
        for (let a: THREE.Object3D | null = m; a; a = a.parent) if (a.name === "clouds") return;
        solids.push(m);
      });
      this.lakeHeight = LakeHeight.build(this.renderer, solids);
    }
    this.water = new Water(assets.plate, this.env.plateViewProj, this.env.plateGain, this.shared, envDefines, this.env.occlusion, {
      glitter: this.profile.tier !== "T0",
      shore: shoreAA,
      projectors: this.env.projectorBinding,
      mirror: mirror ? { texture: mirror.target.texture, size: this.lakeMirrorSize, uniforms: mirror.lookup, corr: assets.lakeCorr, r12: assets.lakeR12, height: this.lakeHeight } : undefined,
    });
    this.water.material.uniforms.uMirrorViewProj.value = this.pipeline.mirrorViewProj;
    this.water.setWalkSize(this.pipeline.size.width, this.pipeline.size.height);
    if (mirror && this.water.scheduled) {
      this.lakeSched = new LakeSchedule(mirror, this.water);
      this.lakeSched.amortize = typeof location === "undefined" || new URLSearchParams(location.search).get("lkamort") !== "0";
      this.lakeSched.bySpeed = typeof location === "undefined" || new URLSearchParams(location.search).get("lkdt") !== "0";
      // (AA3 step B; the lab's `?lkmeach=N` still wins.)
      if (this.slabFlashFix && (typeof location === "undefined" || new URLSearchParams(location.search).get("lkmeach") === null)) this.lakeSched.mirrorEvery = 1;
    }
    this.water.material.uniforms.uReflection.value = this.pipeline.reflection?.texture ?? null;
    this.water.material.uniforms.uReflectionOn.value = this.pipeline.reflection ? 1 : 0;
    setLayer(this.water.group, LAYER.ENV);
    this.scene.add(this.water.group);
    // Projector depth (once): no doubled mountains or rocks when the camera moves off the plate camera. Only where something
    // projects: with the mirror lake (baked environment) nothing does.
    if (!mirror) {
      // (Bilinear only with the baked environment: the projected plates' own shader keeps its nearest depth tests.)
      this.env.depthLinear = shoreAA && !!assets.envProxy.scene.userData?.baked;
      this.env.bakeDepth(this.renderer, [this.water.group]);
    }
    // Round 11 fix round (judge1 minor): with the baked environment the skylines are geometric edges, crisper than the plates'
    // DOF-blurred ones; EnvEdge blurs the environment at its depth discontinuities, before any hero object (MSAA tiers only:
    // T0 is protected). The afterEnv hook only arms it: its full-screen triangle (in the scene) is drawn first inside the next
    // render into the main target, so it adds no render pass of its own. `?envedge=0` or `?envfix=0` keeps step 2's edges.
    const eq = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;
    const msaaBaked = this.env.bakedMaterials.length > 0 && this.profile.msaa > 0 && eq?.get("envfix") !== "0";
    const edges = msaaBaked && eq?.get("envedge") !== "0";
    // aaresolve (19 Nov, user: "the water's edge by the ice looks like low-quality anti-aliasing when the camera moves"): the
    // floes' and rocks' outlines against the bright lake are resolved from tone-compressed samples (chunks.ts GLSL_AA_RESOLVE,
    // RenderPipeline); EnvEdge's triangle writes the expanded resolve back. `?aaresolve=0` keeps the linear resolve exactly.
    // AA3 (20 Nov, user: "benerin anti aliasing water"): also with the mirror lake (the default lake at T1 / T2). Its own passes
    // (LakeSchedule: the mirror, the walk, the cache) all run before the environment pass, while the writer plane is off, and
    // the baked materials' mirror branch returns before the compression: the mirror, walk and cache targets are bit-identical
    // with the resolve on or off.
    const aaResolve = msaaBaked && eq?.get("aaresolve") !== "0";
    if (edges || aaResolve) {
      // (The compression's knee, chunks.ts GLSL_AA_RESOLVE; a uniform so it can be tuned live: __hero.pipeline.aa.read.uAAKnee.)
      const aaKnee = { value: 0.5 };
      const aaRead = createAAUniforms(aaKnee);
      const edge = new EnvEdge(this.renderer, this.scene, this.env.plateGain, aaResolve ? { uniforms: aaRead, edges } : undefined);
      edge.setSize(this.pipeline.size.width, this.pipeline.size.height);
      this.envEdge = edge;
      if (edges) {
        this.env.setEdgeAlpha(true);
        this.water.material.defines.BAKED_EDGE = "";
        this.water.material.needsUpdate = true;
      }
      this.hooks.afterEnv = (main) => edge.arm(this.renderer, main);
      if (aaResolve) {
        const aaWrite = createAAUniforms(aaKnee);
        this.env.setAAResolve(aaWrite);
        this.water.setAAResolve(aaWrite);
        const env = this.env;
        this.pipeline.enableAAResolve(aaWrite, aaRead, (cam, box) => env.cloudDip(cam, box));
      }
      // AA3 step C (20 Nov): temporal AA of the waterline band (EnvEdge TAA_FRAG), on the mirror lake; `?lktaa=0` off.
      // Lab only (with ?debug): `?lktaa=1` also on the plate lake, `?lktaaw=<w>` the history weight, `?lktaacrest=0` history
      // inside the hold's crest train too.
      const taaQ = eq?.get("lktaa");
      const lab = !!this.opts.debug;
      if (aaResolve && edges && (mirror ? taaQ !== "0" : lab && taaQ === "1")) {
        const tw = lab ? Number(eq?.get("lktaaw")) : NaN;
        this.taaCrest = !(lab && eq?.get("lktaacrest") === "0");
        this.taaRipple.set(WATER.rippleCenter[0], WATER.level, WATER.rippleCenter[2], 0);
<<<<<<< HeroEngine.ours.ts
        const tc = lab ? Number(eq?.get("lktaaclip") ?? NaN) : NaN;
=======
        // AA5a glide (20 Nov): motion-adaptive history weight, clip, band blur, still-tail ramp (EnvEdge EdgeGlideOptions);
        // `?lkglide=0` keeps AA3's TAA exactly. Lab only (with ?debug): lkgws / lkgwf / lkgv0 / lkgv1 (weights and their motion
        // range, px per frame), lkggam / lkgclip (clip), lkgsb (band sigma), lkgres (history cubic, Keys a), lkgtail=0.
        const gq = (k: string, d: number) => {
          const v = lab ? Number(eq?.get(k)) : NaN;
          return Number.isFinite(v) && eq?.get(k) !== null ? v : d;
        };
        const glide = eq?.get("lkglide") !== "0"
          ? {
              wSlow: gq("lkgws", GLIDE.wSlow),
              wFast: gq("lkgwf", GLIDE.wFast),
              v0: gq("lkgv0", GLIDE.v0),
              v1: gq("lkgv1", GLIDE.v1),
              gamma: gq("lkggam", GLIDE.gamma),
              clip: gq("lkgclip", GLIDE.clip),
              sigmaBand: gq("lkgsb", GLIDE.sigmaBand),
              tail: !(lab && eq?.get("lkgtail") === "0"),
              sharp: gq("lkgres", GLIDE.sharp),
            }
          : null;
>>>>>>> HeroEngine.theirs.ts
        edge.enableTAA({
          camera: this.rig.camera,
          reflection: lab && eq?.get("lktaarefl") === "0" ? null : this.pipeline.reflection,
          reflectionViewProj: this.pipeline.mirrorViewProj,
          ripple: this.taaRipple,
          weight: tw > 0 && tw < 1 ? tw : LAKE_EDGE_TAA_WEIGHT,
<<<<<<< HeroEngine.ours.ts
          ...(tc >= 0 && tc <= 8 ? { clip: tc } : {}),
          ...(lab && [2, 3, 4].includes(Number(eq?.get("lktaafar"))) ? { far: Number(eq?.get("lktaafar")) } : {}),
=======
          glide,
>>>>>>> HeroEngine.theirs.ts
        });
      }
    }

    this.rings = new Rings(assets.hero.scene, this.shared, envDefines, { ...this.profile.ice, split: this.profile.iceBehindIce });
    this.rings.holdMode = this.holdMode;
    // Rings C / D's idle tumble: the measured flips (round 11 P2b) or `?idle=r10` (also implied by the older-build switches).
    this.rings.idleMode = idleModeFromUrl();
    // The rotating hold's frame guard projects with the camera of the frame (CameraRig updates it before the rings).
    this.rings.camera = this.rig.camera;
    // Ring A's in-plane phase (round 11, measured from the reference's quarter joints); `?aphase=r10` / `?hold=r10`: 0.
    this.rings.tune.aLoopPhaseDeg = aPhaseFromUrl();
    setLayer(this.rings.root, LAYER.RINGS);
    this.scene.add(this.rings.root);

    this.orb = new Orb(assets.hero.scene, this.shared, envDefines, this.profile.orb);
    // The reference core clips to #feffff and glows (a soft bloom shoulder), keeping some swirl at
    // its edge; the QC panel found 1.2 a flat, dim 240-247 plateau.
    // QC round 2: too dim at rest and at the eye (x1.4), while the hold's boost clipped it flat (see Orb.update).
    this.orb.intensity = 2.5;
    setLayer(this.orb.mesh, LAYER.ORB);
    this.scene.add(this.orb.mesh);

    this.shards = new Shards(assets.hero.scene, this.shared, envDefines, this.profile.shards, {
      r11: iceR11(this.profile.ice) && !ICE_R11A,
    });
    setLayer(this.shards.mesh, LAYER.SHARDS);
    this.scene.add(this.shards.mesh);
    this.heroBase = {
      rings: this.rings.root.position.y,
      orb: this.orb.mesh.position.y,
      shards: this.shards.mesh.position.y,
      center: this.shared.uOrbCenter.value.y,
    };

    await this.warmUp();
    this.state.loaded = 1;
    this.state.ready = true;
    this.opts.onProgress?.(1);
  }

  private async warmUp() {
    const cam = this.rig.camera;
    cam.layers.enableAll();
    const r = this.renderer as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> };
    const compile = async () => {
      if (r.compileAsync) await r.compileAsync(this.scene, cam);
      else r.compile(this.scene, cam);
    };
    await compile();
    this.hooks.setBackPass(true);
    await compile();
    this.hooks.setBackPass(false);
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
      if (!m?.uniforms) return;
      for (const k in m.uniforms) {
        const v = m.uniforms[k].value;
        if (v && (v as THREE.Texture).isTexture) r.initTexture(v as THREE.Texture);
      }
    });
    // One full frame (and one with every hold driver on, so the first press never hitches).
    this.frame(1 / 60, true);
    const d = this.choreo.drivers;
    const saved = { ...d };
    Object.assign(d, { splitB: 1, spreadA: 1, tiltA: 1, splay: 1, flatten: 0.5, expandPose: 1, faceInner: 1, camExpand: 1 });
    const hold = { ...d.hold };
    if (this.holdMode === "r11a") Object.assign(d.hold, { wA: 1, wI: 1, phi: 80, pushT: 0.3, pushL: 0.6, pushB: 0.3, pushR: 0.6, splitB: 1 });
    this.rings?.update(0, 0, d);
    this.pipeline.render(this.scene, this.rig.camera, this.hooks, WATER.level);
    Object.assign(d, saved);
    Object.assign(d.hold, hold);
    this.rings?.update(0, 0, d);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.adaptive.reset();
    const tick = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(tick);
      const now = performance.now();
      const frameMs = now - this.last;
      const dt = Math.min(frameMs / 1000, 1 / 20);
      this.last = now;
      this.frame(dt, false);
      this.trackFps(frameMs, now);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private updateRunning() {
    if (!this.state.ready) return;
    if (this.visible && this.onScreen) this.start();
    else this.stop();
  }

  private trackFps(frameMs: number, now: number) {
    this.fpsAcc += frameMs;
    this.fpsFrames++;
    if (this.fpsAcc >= 500) {
      this.state.fps = (this.fpsFrames * 1000) / this.fpsAcc;
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
    if (this.state.intro >= 1 && this.adaptive.update(frameMs, now)) this.resize();
  }

  /** Debug / validation helpers (lab `?debug`, screenshot tests). */
  readonly debug = {
    /** Hold a choreography phase at a timeline position (null resumes live input). */
    pose: (phase: Phase | null, t = 0) => this.choreo.debugPose(phase, t),
    /** Pin the pointer at normalized coordinates, as if it kept moving there (null releases it). */
    pointer: (nx: number | null, ny = 0) => this.choreo.debugPointerAt(nx, ny),
    /** Stop time (every module sees dt = 0). */
    freeze: (on: boolean) => {
      this.frozen = on;
    },
    /** Advance the simulation by `seconds` without rendering (lets springs settle). */
    settle: (seconds: number) => {
      const steps = Math.ceil(seconds * 60);
      for (let i = 0; i < steps; i++) this.update(1 / 60, false);
    },
    /** The camera targets (mutable, read every frame): hold-framing captures tune `expand`. */
    camTargets: CAM_TARGETS,
    /** r11 hold key tables and knobs (mutable; call holdChanged() after editing the tables). */
    holdCurves: HOLD_CURVES,
    holdTune: HOLD_TUNE,
    holdChanged: () => holdCurvesChanged(),
    /** Rotating hold (r11) knobs (mutable, read every frame). */
    holdSpin: HOLD_SPIN,
  };
  private frozen = false;

  private frame(dt: number, warm: boolean) {
    this.lastDt = this.frozen ? 0 : dt;
    this.update(this.lastDt, warm);
    this.render();
  }

  private update(dt: number, warm: boolean) {
    const s = this.state;
    s.time += dt;
    if (!warm && this.introStart < 0) {
      this.introStart = s.time;
      // Start the tumble clock so its own cycle reaches the eye (every ring face-on) exactly as the
      // opening move ends: the eye reveal comes from the gyroscope's motion, not from a pull.
      if (this.rings) this.rings.clock = Rings.EYE_TIME - introSpinIntegral();
    }
    s.intro = this.introStart < 0 ? 0 : clamp((s.time - this.introStart) / INTRO_DURATION);
    const intro = ease.inOutSoft(s.intro);

    this.choreo.update(dt);
    const d = this.choreo.drivers;
    const p = s.pointer;
    const introK = warm ? 1 : intro;
    // Steady hold (default): the camera frames ring A opened by its full constant push (Rings.openRadiusA, cached per push).
    if (this.rings && this.holdMode === "r11" && HOLD_SPIN.steady) this.rig.holdRadius = this.rings.openRadiusA(HOLD_SPIN.pushA);
    this.rig.update(dt, s.time, d, introK);
    // The hero rises with the dolly (Rings.tune.holdLift); the camera stays on the hold plate's pose, so the plate stays
    // registered. The shared orb centre follows (ice lantern, ring split depth, lake glint and reflection occlusion).
    if (this.rings && this.heroBase) {
      // (r11: x the camera's hold-dolly share on this screen, 1 on landscape; fix round 2, narrow portrait screens. Steady hold:
      // the framing share, so the orb keeps its place in the frame; holdShare = holdFit otherwise.)
      const lift = (this.holdMode !== "r10" ? HOLD_TUNE.holdLift : this.rings.tune.holdLift) * d.camExpand * (this.holdMode === "r11" ? this.rig.holdShare : 1);
      this.rings.root.position.y = this.heroBase.rings + lift;
      if (this.orb) this.orb.mesh.position.y = this.heroBase.orb + lift;
      if (this.shards) this.shards.mesh.position.y = this.heroBase.shards + lift;
      this.shared.uOrbCenter.value.y = this.heroBase.center + lift;
    }

    // The gyroscope spins up as the scene appears.
    const introSpin = introSpinAt(introK);
    const spin = d.spin;
    d.spin = spin * introSpin;
    s.alignment = this.rings?.update(dt, s.time, d) ?? 0;
    d.spin = spin;
    // The reference keeps the orb and the shard belts steady through every state; only a hint.
    this.orb?.update(dt, d.energy * 0.5, d.camExpand * 0.5);
    if (this.holdMode === "r11" && SPIN_P2B) {
      // P2b: the crystals go into the reference's slow motion with the ring clock (shardRateFromSpin, 0.5 at full hold; their own
      // hold factor is bypassed), and their belt no longer contracts (HOLD_SPIN.shardContract 0) but widens with ring A's opening
      // (HOLD_SPIN.shardOut), so they stay outside the opened arcs. Older builds: the line below, unchanged.
      // (Rings fix round 1, P2B_F1: each belt widens by its own share across the view / in depth, HOLD_SPIN.shardOutA / B.)
      let out: number | number[] = HOLD_SPIN.shardOut * d.spreadA;
      if (P2B_F1) {
        const o4 = this.shardOut4, a = HOLD_SPIN.shardOutA, b = HOLD_SPIN.shardOutB;
        o4[0] = a[0] * d.spreadA;
        o4[1] = a[1] * d.spreadA;
        o4[2] = b[0] * d.spreadA;
        o4[3] = b[1] * d.spreadA;
        out = o4;
        if (P2B_F2) {
          // (Rings fix round 2: plus each belt's depth share in front of its origin.)
          const o6 = this.shardOut6;
          for (let i = 0; i < 4; i++) o6[i] = o4[i];
          o6[4] = HOLD_SPIN.shardFrontA * d.spreadA;
          o6[5] = HOLD_SPIN.shardFrontB * d.spreadA;
          out = o6;
        }
      }
      // (Rings fix round 2, P2B_F2: HOLD_SPIN.shardHoldFx 0 drops the round-10 hold spread and shatter throw of the crystals.)
      const fx = HOLD_SPIN.shardHoldFx;
      this.shards?.update(dt, introSpin * shardRateFromSpin(d.spin), d.camExpand * 0.2 * fx, s.shatter * 0.25 * fx, d.camExpand * HOLD_SPIN.shardContract, true, out);
    } else this.shards?.update(dt, introSpin, d.camExpand * 0.2, s.shatter * 0.25, d.camExpand);

    const u = this.shared;
    u.uTime.value = s.time;
    // Round 11 ATMOS: the clouds' wrapped wind drift (Atmos.ts; a no-op with ?atmos=r10).
    this.env?.updateAtmos(s.time);
    u.uFrame.value = (u.uFrame.value + 1) % 65536;
    u.uOrbGlow.value = ((this.orb?.intensity ?? 1.8) / 1.8) * (1 + 0.15 * d.energy) * (0.3 + 0.7 * intro);
    // Dolly progress for the environment (near-lake plate weight, DOF, haze, the fog bank): r11 x the camera's hold-dolly share
    // on this screen (exactly 1 on landscape), so a narrow portrait screen whose camera stays near the rest pose keeps the rest
    // look (with the full share the near-lake plate faded and the foreground rocks went flat grey; fix round 2).
    const holdFit = this.holdMode === "r11" ? this.rig.holdFit : 1;
    u.uHold.value = d.camExpand * holdFit;
    // Rises with the dolly and lingers ~2 s after a release (QC rounds 7-8: the reference keeps the bank through F453 / F460).
    // Choreography times it from the release itself, so debug poses and captures show the real value.
    u.uFogHold.value = d.fogHold * holdFit;
    u.uShatter.value = s.shatter;
    u.uHover.value = s.hover;
    u.uImpulse.value = s.impulse;
    u.uIntro.value = intro;
    // A photographic softness on the far background at rest (the reference is never razor-sharp out
    // there; F000's mountains, iceberg and far floes are ~3 px soft), stronger once dollied in (F420).
    // (1.5 + 0.9 camExpand until QC round 7, T04: 2.4 mips in the hold left blurred interiors inside the proxies' crisp
    // silhouettes, the paper-cut far range and the watercolour massif.)
    u.uDofBlur.value = 1.5;
    u.uFocusDist.value = this.rig.focusDistance;
  }

  private render() {
    const s = this.state;
    const d = this.choreo.drivers;
    const u = this.shared;
    const p = s.pointer;
    const intro = u.uIntro.value;
    this.env?.updateProjectors(this.rig.camera.position);
    if (this.lakeSched) {
      // Lake v4 frame budget: the mirror, the walk and the cached term, as LakeSchedule decides.
      this.lakeSched.frame(this.renderer, this.scene, this.rig.camera, WATER.level, LAYER.ENV, this.lakeMirrorPass, u.uFocusDist.value, u.uHold.value, u.uDofBlur.value, s.time);
    } else {
      this.lakeMirror?.render(this.renderer, this.scene, this.rig.camera, WATER.level, LAYER.ENV, this.lakeMirrorPass);
      // Lake v4: the half-resolution walk term follows the mirror (redrawn when the camera moved).
      if (this.lakeMirror && this.lakeMirror.reused === 0) this.water?.renderWalk(this.renderer, this.rig.camera);
    }
    if (this.envEdge) {
      // AA3 lake-edge TAA: in the hold, the crest train's reach (Water LK_WAVEB: its sharp crests move 1.1 m/s), else none;
      // and the frame's step / scale.
      this.taaRipple.w = u.uHold.value > 0 && this.taaCrest ? 8.2 + 13.3 * smoothstep(0, 1, u.uHold.value) : 0;
      this.envEdge.taaFrame(this.lastDt, this.renderer.getPixelRatio() * this.adaptive.scale);
    }
    this.pipeline.render(this.scene, this.rig.camera, this.hooks, WATER.level);

    const pp = this.postParams;
    pp.time = s.time;
    pp.frame = u.uFrame.value;
    // Intro: the scene emerges from the loader's pale white.
    pp.exposure = 1 + 2.2 * (1 - intro);
    // No chromatic aberration (the Cycles reference has none). The pop's kick split R / B ~4 px at the frame edges and drew
    // rainbow pixels along the dark ridge crest against the sky (QC round 7, T02).
    pp.chromatic = 0;
    const buf = this.renderer.getDrawingBufferSize(this.tmpSize);
    const rect = this.opts.canvas.getBoundingClientRect();
    const sx = buf.x / Math.max(1, rect.width);
    pp.lensCenter.set((p.x - rect.left) * sx, buf.y - (p.y - rect.top) * sx);
    pp.lensRadius = 40 * sx;
    pp.lensStrength = p.active && p.type === "mouse" ? s.hold : 0;
    this.post.render(this.pipeline.main.texture, pp);
  }

  resize() {
    const c = this.opts.canvas;
    const w = Math.max(1, c.clientWidth);
    const h = Math.max(1, c.clientHeight);
    const dpr = Math.min(typeof devicePixelRatio === "number" ? devicePixelRatio : 1, this.profile.maxDpr);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    const buf = this.renderer.getDrawingBufferSize(this.tmpSize);
    const scale = this.adaptive.scale;
    this.pipeline.setSize(buf.x * scale, buf.y * scale);
    this.post.setSize(this.pipeline.size.width, this.pipeline.size.height);
    if (this.lakeMirror) {
      this.lakeMirror.setSize(this.pipeline.size.width, this.pipeline.size.height);
      this.lakeMirrorSize.set(this.lakeMirror.target.width, this.lakeMirror.target.height);
    }
    this.water?.setWalkSize(this.pipeline.size.width, this.pipeline.size.height);
    this.lakeSched?.invalidate();
    this.envEdge?.setSize(this.pipeline.size.width, this.pipeline.size.height);
    this.rig.setAspect(w / h);
    this.state.renderScale = scale;
  }

  dispose() {
    this.stop();
    this.resizeObserver.disconnect();
    this.intersection?.disconnect();
    for (const d of this.disposers) d();
    this.choreo.dispose();
    this.pipeline.dispose();
    this.lakeMirror?.dispose();
    this.lakeHeight?.dispose();
    this.water?.disposeWalk();
    this.envEdge?.dispose();
    this.env?.dispose();
    this.post.dispose();
    this.pmrem?.dispose();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const sm = m as THREE.ShaderMaterial;
        if (sm?.uniforms) {
          for (const k in sm.uniforms) {
            const v = sm.uniforms[k].value;
            if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose();
          }
        }
        m?.dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

function setLayer(root: THREE.Object3D, layer: number) {
  root.traverse((o) => o.layers.set(layer));
}

/** Clamps an equirect HalfFloat texture in place (keeps PMREM free of the 40 000x sun disc). */
function clampHalfFloat(tex: THREE.DataTexture, max: number) {
  const data = tex.image.data as Uint16Array;
  if (!(data instanceof Uint16Array)) return;
  const limit = THREE.DataUtils.toHalfFloat(max);
  for (let i = 0; i < data.length; i++) {
    // Positive half floats sort like integers; channel 3 (alpha) is 1.0 and below the limit.
    if (data[i] > limit && data[i] < 0x8000) data[i] = limit;
  }
  tex.needsUpdate = true;
}
