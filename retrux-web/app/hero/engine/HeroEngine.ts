import * as THREE from "three";
import { loadHeroAssets } from "./assets";
import { CameraRig } from "./CameraRig";
import { Choreography, type Phase } from "./Choreography";
import { WATER } from "./config";
import { CAM_TARGETS } from "./curves";
import { Orb } from "./hero/Orb";
import { Rings } from "./hero/Rings";
import { Shards } from "./hero/Shards";
import { clamp, ease, smoothstep } from "./math";
import { DEFAULT_POST, PostChain, type PostParams } from "./pipeline/PostChain";
import { RenderPipeline } from "./pipeline/RenderPipeline";
import { AdaptiveScale, detectTier, PROFILES } from "./quality";
import { createHeroState, LAYER, type HeroState, type QualityProfile, type TierName } from "./types";
import { createSharedUniforms, cubeUVDefines } from "./uniforms";
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
  private rings?: Rings;
  private orb?: Orb;
  private shards?: Shards;
  /** World Y of the hero parts at load, for the dolly lift (Rings.tune.holdLift). */
  private heroBase: { rings: number; orb: number; shards: number; center: number } | null = null;
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
  private hooks = {
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

    this.water = new Water(assets.plate, this.env.plateViewProj, this.env.plateGain, this.shared, envDefines, this.env.occlusion, {
      glitter: this.profile.tier !== "T0",
      projectors: this.env.projectorBinding,
    });
    this.water.material.uniforms.uMirrorViewProj.value = this.pipeline.mirrorViewProj;
    this.water.material.uniforms.uReflection.value = this.pipeline.reflection?.texture ?? null;
    this.water.material.uniforms.uReflectionOn.value = this.pipeline.reflection ? 1 : 0;
    setLayer(this.water.group, LAYER.ENV);
    this.scene.add(this.water.group);
    // Projector depth (once): no doubled mountains or rocks when the camera moves off the plate camera.
    this.env.bakeDepth(this.renderer, [this.water.group]);

    this.rings = new Rings(assets.hero.scene, this.shared, envDefines, { ...this.profile.ice, split: this.profile.iceBehindIce });
    setLayer(this.rings.root, LAYER.RINGS);
    this.scene.add(this.rings.root);

    this.orb = new Orb(assets.hero.scene, this.shared, envDefines, this.profile.orb);
    // The reference core clips to #feffff and glows (a soft bloom shoulder), keeping some swirl at
    // its edge; the QC panel found 1.2 a flat, dim 240-247 plateau.
    // QC round 2: too dim at rest and at the eye (x1.4), while the hold's boost clipped it flat (see Orb.update).
    this.orb.intensity = 2.5;
    setLayer(this.orb.mesh, LAYER.ORB);
    this.scene.add(this.orb.mesh);

    this.shards = new Shards(assets.hero.scene, this.shared, envDefines, this.profile.shards);
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
    this.rings?.update(0, 0, d);
    this.pipeline.render(this.scene, this.rig.camera, this.hooks, WATER.level);
    Object.assign(d, saved);
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
  };
  private frozen = false;

  private frame(dt: number, warm: boolean) {
    this.update(this.frozen ? 0 : dt, warm);
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
    this.rig.update(dt, s.time, d, introK);
    // The hero rises with the dolly (Rings.tune.holdLift); the camera stays on the hold plate's pose, so the plate stays
    // registered. The shared orb centre follows (ice lantern, ring split depth, lake glint and reflection occlusion).
    if (this.rings && this.heroBase) {
      const lift = this.rings.tune.holdLift * d.camExpand;
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
    this.shards?.update(dt, introSpin, d.camExpand * 0.2, s.shatter * 0.25, d.camExpand);

    const u = this.shared;
    u.uTime.value = s.time;
    u.uFrame.value = (u.uFrame.value + 1) % 65536;
    u.uOrbGlow.value = ((this.orb?.intensity ?? 1.8) / 1.8) * (1 + 0.15 * d.energy) * (0.3 + 0.7 * intro);
    u.uHold.value = d.camExpand;
    // Rises with the dolly and lingers ~2 s after a release (QC rounds 7-8: the reference keeps the bank through F453 / F460).
    // Choreography times it from the release itself, so debug poses and captures show the real value.
    u.uFogHold.value = d.fogHold;
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
