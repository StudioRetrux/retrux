import * as THREE from "three";
import type { TierName } from "../types";

/**
 * Round 11 (ENV lane, baked environment only): the lake as a true planar mirror.
 *
 * The artist's water is a perfect white conductor mirror (Principled metallic 1, roughness 0.035, reflectance 1 at every
 * angle) with a fine bump (forensics 3.3). Its glossy rays see the Nishita world, the cloud cards and the geometry, but not
 * the emissive sky card BG.001 (glossy-invisible, forensics 1.5). With real geometry (bake v9) the lake no longer re-aims
 * the rest plate's baked reflections: every frame the environment is drawn from the camera mirrored about the water plane
 * into `target`:
 *   - the world sky, from Blender's world-only equirect (pipeline/render_sky_equirect.py -> encode_sky_m9.py: sun disc
 *     clamped), as a full-screen pass;
 *   - the baked meshes in their raw, ungraded plate-space colour (PlateEnvironment.setLakeMirrorPass), because the
 *     Cycles lake mirrored the ungraded scene and the water applies its own grade, as it did to the plate's lake;
 *   - the live cloud cards.
 * Geometry below the water is cut by an oblique near plane at the water level (no shader change, no discard).
 * rgb = scene-linear radiance, a = the mirror path length from the mirrored camera (60000 = sky): the water hides the
 * hero's reflection behind nearer reflected surfaces with it (Water.ts, BAKED_MIRROR).
 * The x / y rows of the clipped projection are the camera's own, so the water samples the target with the same
 * vMirrorClip as the hero reflection (RenderPipeline.mirrorViewProj, built from the same camera every frame).
 */

/** Mirror target size relative to the main HDR target (x, y). The Cycles bump streaks reflections vertically, so the
 * vertical resolution can be lower than the horizontal (floe columns keep crisp sides). (Step 2, third session: y 0.6 -> 0.75
 * with the frustum's top at 35 instead of 50 deg: the 0-12 deg band that holds the floes, mountains and clouds had ~110 of
 * 460 rows, ~13 screen px per texel at the lake's DOF mip, and the reflections showed blocky stair-steps.) */
const MIRROR_SCALE: Record<TierName, [number, number]> = { T0: [0.5, 0.35], T1: [0.5, 0.5], T2: [1, 0.75] };
// (T1 0.5 x 0.5 for the frame budget, E-G3: at rest the lake's boxes moved <= 2.2 levels vs the full-size target, the
// reflection being blurred by the lake's DOF and the bump spread anyway. T0 does not use the mirror unless forced:
// assets.ts mirrorLakeAllowed.)

/**
 * The mirror target's own frustum, in reflected-ray elevation (deg): from just under the horizon (ripple offsets, the
 * spread's footprint) up to 35 deg (clouds reach ~21 deg from the lake; above the frustum the water reads the sky equirect
 * by direction). Horizontally the camera's own extent plus a margin for the ripple offsets.
 */
const MIRROR_ELEV = { min: -2, max: 35 };
const MIRROR_SIDE_MARGIN = 1.1;

const SKY_VERT = /* glsl */ `
varying vec2 vNdc;
void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const SKY_FRAG = /* glsl */ `
uniform sampler2D uSky;
uniform mat4 uInvViewProj;
uniform vec3 uCamPos;
varying vec2 vNdc;
void main() {
  vec4 p = uInvViewProj * vec4(vNdc, 1.0, 1.0);
  vec3 dir = normalize(p.xyz / p.w - uCamPos);
  // Under the horizon (only the water's spread footprint reaches there) the sky folded at the horizon: a ray tilted under it
  // meets the water again and goes up (Cycles' second glossy bounce). It was black, which darkened the far water.
  // three.js equirect convention (as pano_orb.exr): u = atan(z, x) / 2pi + 0.5, v = asin(y) / pi + 0.5.
  vec2 uv = vec2(atan(dir.z, dir.x) * 0.15915494 + 0.5, asin(min(abs(dir.y), 1.0)) * 0.31830989 + 0.5);
  gl_FragColor = vec4(textureLod(uSky, uv, 0.0).rgb, 60000.0);
}
`;

export class LakeMirror {
  readonly target: THREE.WebGLRenderTarget;
  /** The mirrored camera with the water plane as its (oblique) near plane. */
  readonly camera = new THREE.PerspectiveCamera();
  /** Full-screen world-sky pass, drawn first in the mirror pass only (add it to the scene on the env layer). */
  readonly skyMesh: THREE.Mesh;
  readonly scale: [number, number];
  /**
   * The water's lookup terms (Water.ts BAKED_MIRROR), updated every frame: the sky, the mirrored camera's inverse plain
   * view-projection and position (sky beyond the target), the horizon's v in the target and the projection terms p00, p11.
   */
  readonly lookup: {
    uSkyEq: { value: THREE.Texture };
    /** The target's view-projection without the oblique clip (x, y, w rows are the same). */
    uEnvMirrorViewProj: { value: THREE.Matrix4 };
    uMirrorInvViewProj: { value: THREE.Matrix4 };
    uMirrorCamPos: { value: THREE.Vector3 };
    /** Highest reflected elevation inside the target (rad). */
    uMirrorElevMax: { value: number };
    uMirrorP: { value: THREE.Vector2 };
  };
  private skyMaterial: THREE.ShaderMaterial;
  private plainViewProj = new THREE.Matrix4();
  private tmpFwd = new THREE.Vector3();
  private plane = new THREE.Plane();
  private clip = new THREE.Vector4();
  private q = new THREE.Vector4();
  private prevClear = new THREE.Color();
  /**
   * Frame budget (E-G3, T1): while the camera moved less than ~3 mm and ~0.02 deg since the last mirror render, up to `reuse`
   * consecutive frames reuse the target (the live engine at rest and in the hold sustain moves 0 mm and ~0.0001-0.0004 deg per
   * frame). The reflected environment is static (the live clouds drift a few mm per frame at 100 m); the hero's reflection and
   * the ripples are drawn by the water every frame. Any real camera motion renders every frame. `?envmirrorrate=1` renders
   * every frame at every tier.
   */
  reuse = 0;
  private lastPos = new THREE.Vector3(Infinity, 0, 0);
  private lastQuat = new THREE.Quaternion();
  /** Consecutive frames that reused the target (lab: read by tools3/cam_motion.mjs). */
  reused = 0;
  /**
   * Fix round 2 (frame budget while the camera moves): the highest mip level generated after each draw (GL
   * TEXTURE_MAX_LEVEL), < 0 = all. gl.generateMipmap of the half-float target's full chain (10 levels, a pass each on ANGLE /
   * Metal) cost more than the mirror's own draw on the M4 (WORK fx2/mcost3-5.log: mirror every frame with the full chain 1.04-1.06
   * of the frame, without mips 0.99-1.00, up to level 3 ~ +1 % per level; GPU timer queries fx2/gpuq1.log: level 3 saves only
   * ~15 % of a draw). Lab only (`?lkmmax=N`); the default keeps the full chain.
   */
  mipMax = -1;

  constructor(sky: THREE.Texture, tier: TierName) {
    this.scale = MIRROR_SCALE[tier] ?? MIRROR_SCALE.T1;
    // (lab) `?lkmscale=sx,sy`: another target scale (water lane fix round 1 diagnostics).
    const ms = typeof location !== "undefined" ? new URLSearchParams(location.search).get("lkmscale") : null;
    const mm = typeof location !== "undefined" ? Number(new URLSearchParams(location.search).get("lkmmax") ?? NaN) : NaN;
    if (mm >= 0 && mm <= 12) this.mipMax = Math.round(mm);
    if (ms) {
      const v = ms.split(",").map(Number);
      if (v.length === 2 && v.every((x) => x > 0 && x <= 2)) this.scale = [v[0], v[1]];
    }
    this.target = new THREE.WebGLRenderTarget(2, 2, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
    // The water smears the image vertically (textureGrad with a tall footprint): anisotropic filtering keeps the floe columns'
    // sides crisp.
    this.target.texture.anisotropy = 16;
    // (lab, fix round 2: `?lkmmip=0` = no mipmaps, to measure what generating them costs per mirror draw; the lake then aliases)
    if (typeof location !== "undefined" && new URLSearchParams(location.search).get("lkmmip") === "0") {
      this.target.texture.generateMipmaps = false;
      this.target.texture.minFilter = THREE.LinearFilter;
    }
    sky.wrapS = THREE.RepeatWrapping;
    sky.needsUpdate = true;
    this.lookup = {
      uSkyEq: { value: sky },
      uEnvMirrorViewProj: { value: new THREE.Matrix4() },
      uMirrorInvViewProj: { value: new THREE.Matrix4() },
      uMirrorCamPos: { value: new THREE.Vector3() },
      uMirrorElevMax: { value: THREE.MathUtils.degToRad(MIRROR_ELEV.max) },
      uMirrorP: { value: new THREE.Vector2(1, 1) },
    };
    this.skyMaterial = new THREE.ShaderMaterial({
      name: "rx-lake-sky",
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: { uSky: { value: sky }, uInvViewProj: this.lookup.uMirrorInvViewProj, uCamPos: this.lookup.uMirrorCamPos },
      depthTest: false,
      depthWrite: false,
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.skyMesh = new THREE.Mesh(geo, this.skyMaterial);
    this.skyMesh.name = "lake-mirror-sky";
    this.skyMesh.frustumCulled = false;
    this.skyMesh.renderOrder = -1000;
    this.skyMesh.visible = false;
  }

  /**
   * Fix round (judge1 blocker): THREE.WebGLRenderTarget.setSize disposes the target when the size changes, and the reuse
   * above then let the water sample the empty target for 1-2 frames (a black lake after every adaptive-scale step, window or
   * phone-toolbar resize). A real size change now forces the next frame to render the mirror. `?envfix=0` restores step 2.
   */
  refreshOnResize = true;

  /** Main HDR target size in pixels. */
  setSize(width: number, height: number) {
    const w = Math.max(2, Math.round(width * this.scale[0]));
    const h = Math.max(2, Math.round(height * this.scale[1]));
    const changed = w !== this.target.width || h !== this.target.height;
    this.target.setSize(w, h);
    if (changed && this.refreshOnResize) {
      this.lastPos.set(Infinity, 0, 0);
      this.reused = 0;
    }
  }

  /**
   * The mirrored camera (pose as RenderPipeline.updateMirror) with its own frustum over the reflected elevations
   * MIRROR_ELEV and an oblique near plane at y = level (Lengyel).
   */
  private update(camera: THREE.PerspectiveCamera, level: number) {
    const m = this.camera;
    m.copy(camera, false);
    const p = camera.position;
    m.position.set(p.x, 2 * level - p.y, p.z);
    const fwd = this.tmpFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    // The camera's forward elevation phi; the mirrored camera looks at -phi with world-down as its up, so a reflected
    // direction of elevation e lies at camera-space y = -tan(e + phi).
    const phi = Math.asin(THREE.MathUtils.clamp(fwd.y, -1, 1));
    fwd.y = -fwd.y;
    m.up.set(0, -1, 0);
    m.lookAt(m.position.x + fwd.x, m.position.y + fwd.y, m.position.z + fwd.z);
    m.updateMatrixWorld(true);
    const ce = camera.projectionMatrix.elements;
    const n = camera.near;
    const half = ((n * (1 + Math.abs(ce[8]))) / ce[0]) * MIRROR_SIDE_MARGIN;
    const D = Math.PI / 180;
    const top = -Math.tan(MIRROR_ELEV.min * D + phi) * n;
    const bottom = -Math.tan(Math.min(MIRROR_ELEV.max * D + phi, 85 * D)) * n;
    m.projectionMatrix.makePerspective(-half, half, top, bottom, n, camera.far);
    this.plainViewProj.multiplyMatrices(m.projectionMatrix, m.matrixWorldInverse);
    const L = this.lookup;
    L.uEnvMirrorViewProj.value.copy(this.plainViewProj);
    L.uMirrorInvViewProj.value.copy(this.plainViewProj).invert();
    L.uMirrorCamPos.value.copy(m.position);
    L.uMirrorElevMax.value = Math.min(MIRROR_ELEV.max * D + phi, 85 * D) - phi;
    L.uMirrorP.value.set(m.projectionMatrix.elements[0], m.projectionMatrix.elements[5]);
    // Oblique near plane = the water plane (normal up, the mirrored camera below it): replaces the projection's z row.
    this.plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, level, 0));
    this.plane.applyMatrix4(m.matrixWorldInverse);
    const c = this.clip.set(this.plane.normal.x, this.plane.normal.y, this.plane.normal.z, this.plane.constant);
    const e = m.projectionMatrix.elements;
    const q = this.q.set((Math.sign(c.x) + e[8]) / e[0], (Math.sign(c.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14]);
    c.multiplyScalar(2 / c.dot(q));
    e[2] = c.x;
    e[6] = c.y;
    e[10] = c.z + 1;
    e[14] = c.w;
    m.projectionMatrixInverse.copy(m.projectionMatrix).invert();
  }

  /**
   * Renders the mirror target. `layer` = the environment layer; `setPass(on)` switches the scene into its mirror state
   * (water hidden, BG.001 hidden, baked meshes raw, clouds keeping the target's alpha) and back. `force` (lake v4's
   * LakeSchedule, which decides itself when the mirror is drawn) skips the reuse test.
   */
  render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    level: number,
    layer: number,
    setPass: (on: boolean) => void,
    force = false,
  ) {
    if (!force && this.reused < this.reuse && camera.position.distanceToSquared(this.lastPos) < 9e-6 && Math.abs(camera.quaternion.dot(this.lastQuat)) > 1 - 1.5e-8) {
      this.reused++;
      return;
    }
    this.reused = 0;
    this.lastPos.copy(camera.position);
    this.lastQuat.copy(camera.quaternion);
    this.update(camera, level);
    const r = renderer;
    const prevTarget = r.getRenderTarget();
    const prevAuto = r.autoClear;
    r.getClearColor(this.prevClear);
    const prevAlpha = r.getClearAlpha();
    r.autoClear = false;
    r.setRenderTarget(this.target);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, false);
    setPass(true);
    this.skyMesh.visible = true;
    const m = this.camera;
    m.layers.disableAll();
    m.layers.enable(layer);
    if (this.mipMax >= 0) {
      // (set on the GL texture each draw: three.js re-creates it on a resize; through three's state cache)
      const gl = r.getContext() as WebGL2RenderingContext;
      const tex = (r.properties.get(this.target.texture) as { __webglTexture?: WebGLTexture }).__webglTexture;
      if (tex) {
        r.state.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, this.mipMax);
      }
    }
    r.render(scene, m);
    this.skyMesh.visible = false;
    setPass(false);
    r.setRenderTarget(prevTarget);
    r.setClearColor(this.prevClear, prevAlpha);
    r.autoClear = prevAuto;
  }

  dispose() {
    this.target.dispose();
    this.skyMaterial.dispose();
    this.skyMesh.geometry.dispose();
  }
}
