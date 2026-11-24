import * as THREE from "three";

/**
 * Round 11 user-priority round (WATER lane, lake v4): a static max-mip heightfield of the baked environment, for the lake's
 * low reflected rays (Water.ts LAKE_R12 + LK_HGT).
 *
 * The Cycles water's bump sends a share of every pixel's rays along the water (the rays lifted to the horizon by
 * ensure_valid_specular_reflection, and the low ones): they meet the first floe, rock, shore or iceberg face beyond the lake
 * point, which draws the reflection columns. v3 found that face by marching the mirror target in up to 24 steps; the step
 * skipped thin faces on some rows and overshot them on others, so the face and its colour flipped from row to row (horizontal
 * stripes, worst from the low hold camera). The environment never moves, so its geometry is taken once from above: the
 * highest surface (world y) of the baked meshes on a 1024 x 1024 grid (0.31 m) over every mesh near the lake, with a pyramid
 * of maxima (each texel of level L = the highest of its 2 x 2 children). The water traverses it exactly (a quadtree walk: a
 * cell the rising ray clears is skipped whole, a cell it might enter is split) and never steps over a face.
 * Built at load: one top-down render of the meshes (their own geometry with a height material, in a scratch scene) into a
 * transient 1024^2 RGBA float target (16 MB, disposed) and one read-back; kept: ~2.7 MB of R16F with mips on the GPU. Null when
 * float render targets are not readable (the water then keeps v3).
 */
export class LakeHeight {
  /** R16F, levels 0..levels-1 (maxima); texelFetch for the walk, LINEAR at level 0 for smooth samples. */
  readonly texture: THREE.DataTexture;
  /** x: grid x origin (m), y: grid z at row 0 (m, rows go to -z), z: 1 / cell (1/m), w: size (texels). */
  readonly grid: THREE.Vector4;
  /** Top pyramid level the walk climbs to. */
  readonly top: number;

  private constructor(texture: THREE.DataTexture, grid: THREE.Vector4, top: number) {
    this.texture = texture;
    this.grid = grid;
    this.top = top;
  }

  /** Grid: x in [X0, X0 + N c], z in [Z0 - N c, Z0] (rows from z = Z0 toward -z). */
  static readonly X0 = -128;
  static readonly Z0 = 16;
  static readonly N = 1024;
  static readonly CELL = 0.3125;
  /** Height stored for open water and submerged surfaces (m). */
  static readonly FLOOR = -0.01;

  static build(renderer: THREE.WebGLRenderer, meshes: THREE.Mesh[]): LakeHeight | null {
    const N = LakeHeight.N;
    const c = LakeHeight.CELL;
    const X0 = LakeHeight.X0;
    const Z0 = LakeHeight.Z0;
    const ext = renderer.extensions;
    if (!ext.has("EXT_color_buffer_float")) return null;
    const target = new THREE.WebGLRenderTarget(N, N, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      generateMipmaps: false,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    const material = new THREE.ShaderMaterial({
      name: "rx-lake-height",
      vertexShader: /* glsl */ `
        varying float vY;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vY = w.y;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        varying float vY;
        void main() { gl_FragColor = vec4(vY, 1.0, 0.0, 1.0); }`,
      side: THREE.DoubleSide,
    });
    const scene = new THREE.Scene();
    for (const m of meshes) {
      m.updateWorldMatrix(true, false);
      const copy = new THREE.Mesh(m.geometry, material);
      copy.matrixAutoUpdate = false;
      copy.matrix.copy(m.matrixWorld);
      copy.matrixWorld.copy(m.matrixWorld);
      copy.frustumCulled = false;
      scene.add(copy);
    }
    // Looking straight down; camera x = world x, camera y = world -z.
    const cam = new THREE.OrthographicCamera(X0, X0 + N * c, -Z0 + N * c, -Z0, 1, 2000);
    cam.position.set(0, 600, 0);
    cam.up.set(0, 0, -1);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    // (After lookAt the view's x is world +x and its y world -z: left / right = x, bottom / top = -z.)
    const prevTarget = renderer.getRenderTarget();
    const prevColor = new THREE.Color();
    renderer.getClearColor(prevColor);
    const prevAlpha = renderer.getClearAlpha();
    const prevAuto = renderer.autoClear;
    const raw = new Float32Array(N * N * 4);
    try {
      renderer.autoClear = false;
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, false);
      renderer.render(scene, cam);
      renderer.readRenderTargetPixels(target, 0, 0, N, N, raw);
    } catch (e) {
      console.warn("[hero] lake heightfield unavailable", e);
      return null;
    } finally {
      renderer.setRenderTarget(prevTarget);
      renderer.setClearColor(prevColor, prevAlpha);
      renderer.autoClear = prevAuto;
      target.dispose();
      material.dispose();
    }
    // readPixels rows go bottom-up and the image bottom (NDC y -1, camera y = bottom = -Z0) is z = Z0: GL row r covers
    // z = Z0 - (r + 0.5) c, which is texelFetch row r of the uploaded level 0 (rows from z = Z0 toward -z). Open water and
    // anything under it: 1 cm below the water (the walk's rays start at the water: never reached), so a bilinear sample at a
    // floe's edge ramps from its top to the water over one texel (a -4 m "no surface" dragged thin floes' edges under the ray).
    const levels: { data: Uint16Array; width: number; height: number }[] = [];
    let cur = new Float32Array(N * N);
    let any = false;
    for (let r = 0; r < N; r++) {
      const j = r;
      for (let i = 0; i < N; i++) {
        const k = (r * N + i) * 4;
        const h = raw[k + 1] > 0.5 ? Math.max(raw[k], LakeHeight.FLOOR) : LakeHeight.FLOOR;
        if (raw[k + 1] > 0.5) any = true;
        cur[j * N + i] = h;
      }
    }
    if (!any) return null;
    let n = N;
    const toHalf = THREE.DataUtils.toHalfFloat;
    const push = (a: Float32Array, w: number) => {
      const d = new Uint16Array(w * w);
      // Rounded up to the next representable half so a maximum never drops under the true height.
      for (let i = 0; i < a.length; i++) {
        let hv = toHalf(a[i]);
        if (THREE.DataUtils.fromHalfFloat(hv) < a[i]) hv = toHalf(a[i] + Math.abs(a[i]) * 0.001 + 1e-4);
        d[i] = hv;
      }
      levels.push({ data: d, width: w, height: w });
    };
    push(cur, n);
    while (n > 1) {
      const m = n >> 1;
      const nxt = new Float32Array(m * m);
      for (let j = 0; j < m; j++) {
        for (let i = 0; i < m; i++) {
          const a = (2 * j) * n + 2 * i;
          nxt[j * m + i] = Math.max(cur[a], cur[a + 1], cur[a + n], cur[a + n + 1]);
        }
      }
      cur = nxt;
      n = m;
      push(cur, n);
    }
    const tex = new THREE.DataTexture(levels[0].data, N, N, THREE.RedFormat, THREE.HalfFloatType);
    tex.mipmaps = levels as unknown as THREE.DataTexture["mipmaps"];
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearMipmapNearestFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.flipY = false;
    tex.unpackAlignment = 2;
    tex.colorSpace = THREE.NoColorSpace;
    tex.needsUpdate = true;
    return new LakeHeight(tex, new THREE.Vector4(X0, Z0, 1 / c, N), Math.log2(N) - 3);
  }

  dispose() {
    this.texture.dispose();
  }
}
