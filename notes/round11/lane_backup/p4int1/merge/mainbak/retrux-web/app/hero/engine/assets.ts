import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { ASSETS } from "./config";
import { DEFAULT_PLATE_META, EXTRA_PROJECTORS, type PlateMeta, type ProjectorKey } from "./world/PlateEnvironment";

export type HeroAssets = {
  envProxy: GLTF;
  hero: GLTF;
  plate: THREE.Texture;
  plateMeta: PlateMeta;
  /** Plates from other camera poses (extra projectors: hold pose, orbit extremes), the ones published. */
  extraPlates: Partial<Record<ProjectorKey, { plate: THREE.Texture; meta: PlateMeta }>>;
  clouds: Record<string, THREE.Texture>;
  /** Equirectangular HDR panorama (before PMREM). */
  panorama: THREE.DataTexture;
  /**
   * Round 11: the world-only sky equirect for the lake mirror (baked environment with the mirror lake only; null when the
   * plates are projected or `?envlake=plate`). Then nothing projects and no plate is loaded (`plate` is a 1 px stand-in).
   */
  sky: THREE.DataTexture | null;
  /**
   * Round 11 step 2: the mirror lake's static rest correction (pipeline/lake_corr_m9.py: a blurred plate / mirror ratio of the
   * far water at rest, on the rest plate's uv grid, log2 + 0.5 per channel). Null without the mirror lake or with
   * `?envlakecorr=0`.
   */
  lakeCorr: THREE.Texture | null;
  /**
   * Round 11 user-priority round (WATER lane): the lake is the Cycles water reproduced on the planar mirror (Water.ts LAKE_R12).
   * Default on the baked environment wherever the mirror is allowed (T1 / T2); `?envlake=plate` keeps the re-aimed plate lake
   * (the integrated round-11 default, exactly), `?envlake=mirror` the ENV lane's mirror model, `?envlake=r12` forces it at T0.
   */
  lakeR12: boolean;
};

/** The baked environment's files (pipeline bake_env_m9.py), under the asset base. */
const ENV_BAKED = { glb: "env_baked.glb", manifest: "env_baked.json", sky: "sky_world.exr", skyLake: "sky_lake.exr", lakeCorr: "lake_corr.png" };

/** Expected sizes, only used to weight the progress bar before Content-Length arrives. */
const WEIGHTS: Record<string, number> = {
  plate: 1.6,
  plate_hold: 1.4,
  plate_orbN: 1.4,
  plate_orbP: 1.4,
  plate_tilt: 1.4,
  envProxy: 0.85,
  hero: 0.85,
  panorama: 2.2,
  cloud_a: 0.35,
  cloud_b: 0.3,
};

async function fetchBytes(url: string, onBytes: (loaded: number, total: number) => void, signal?: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`[hero] ${url}: HTTP ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;
  if (!res.body || !total) {
    const buf = await res.arrayBuffer();
    onBytes(buf.byteLength, buf.byteLength);
    return buf;
  }
  const reader = res.body.getReader();
  const out = new Uint8Array(total);
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out.set(value, loaded);
    loaded += value.byteLength;
    onBytes(loaded, total);
  }
  return out.buffer;
}

async function decodeImage(buf: ArrayBuffer, mime: string) {
  const url = URL.createObjectURL(new Blob([buf], { type: mime }));
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // The decoded image keeps its pixels; the blob URL is no longer needed.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export async function loadHeroAssets(
  base: string,
  renderer: THREE.WebGLRenderer,
  onProgress: (p: number) => void,
  signal?: AbortSignal,
  skipExtra = false,
  maxAnisotropy = 4,
  /** Round 11: the tier may use the baked environment's planar-mirror lake (T0 keeps the re-aimed plate lake). */
  mirrorLakeAllowed = true,
): Promise<HeroAssets> {
  const done: Record<string, number> = {};
  const totalWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const report = () => {
    let sum = 0;
    for (const k in WEIGHTS) sum += WEIGHTS[k] * (done[k] ?? 0);
    onProgress(Math.min(0.999, sum / totalWeight));
  };
  const track = (key: string) => (loaded: number, total: number) => {
    done[key] = total ? loaded / total : 0;
    report();
  };

  const draco = new DRACOLoader();
  draco.setDecoderPath(base + ASSETS.dracoPath);
  draco.setWorkerLimit(1);
  const gltf = new GLTFLoader();
  gltf.setDRACOLoader(draco);

  const glb = async (key: string, file: string) => {
    const buf = await fetchBytes(base + file, track(key), signal);
    return gltf.parseAsync(buf, base);
  };
  const tex = async (key: string, file: string, srgb: boolean) => {
    const buf = await fetchBytes(base + file, key in WEIGHTS ? track(key) : () => {}, signal);
    const img = await decodeImage(buf, file.endsWith(".webp") ? "image/webp" : "image/png");
    const t = new THREE.Texture(img);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = Math.min(maxAnisotropy, renderer.capabilities.getMaxAnisotropy());
    t.needsUpdate = true;
    return t;
  };
  const exr = async (key: string, file: string, mips = false) => {
    const buf = await fetchBytes(base + file, track(key), signal);
    const loader = new EXRLoader().setDataType(THREE.HalfFloatType);
    const d = loader.parse(buf) as { width: number; height: number; data: Uint16Array; format: THREE.PixelFormat; type: THREE.TextureDataType };
    const t = new THREE.DataTexture(d.data, d.width, d.height, d.format, d.type);
    t.colorSpace = THREE.LinearSRGBColorSpace;
    if (mips) {
      // (Round 11, the wisp card: sampled at the plates' DOF mip.)
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.generateMipmaps = true;
    } else {
      t.mapping = THREE.EquirectangularReflectionMapping;
      t.minFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
    }
    t.magFilter = THREE.LinearFilter;
    t.flipY = false;
    t.needsUpdate = true;
    return t;
  };

  const meta = async (file: string): Promise<PlateMeta | null> => {
    try {
      const res = await fetch(base + file, { signal });
      if (!res.ok) return null;
      return { ...DEFAULT_PLATE_META, ...((await res.json()) as Partial<PlateMeta>) };
    } catch {
      return null;
    }
  };
  // Extra plates are optional (and skipped on request, e.g. the low tier): without one's metadata the engine
  // keeps the projectors it has.
  const extraPlate = async (key: ProjectorKey) => {
    const k = `plate_${key}`;
    const m = skipExtra ? null : await meta(`${k}.json`);
    if (!m) {
      done[k] = 1;
      return null;
    }
    try {
      return { plate: await tex(k, `${k}.webp`, true), meta: m };
    } catch {
      done[k] = 1;
      return null;
    }
  };
  // Baked environment (QC round 10: projected plates doubled the mountains whenever the camera moved): real geometry with one
  // texture per surface, from the Blender bake (env_baked.glb + env_baked.json + baked/*.webp). Default when published;
  // `?env=projected` keeps the projected plates for A/B captures, `?env=baked` insists.
  const qs = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;
  const envParam = qs?.get("env") ?? null;
  // Round 11: with the baked environment the lake is a planar mirror of it (LakeMirror) and nothing projects, so neither the
  // rest plate nor the 4 extra plates are loaded. `?envlake=plate` keeps round 11 step 1's lake (the rest plate re-aimed,
  // the extra projectors and their depth bakes) for A/B.
  // Lead decision (e): where the mirror's extra pass does not fit the frame budget (T0, protected) the tier keeps the re-aimed
  // plate lake; `?envlake=mirror` forces the mirror at any tier (measurements).
  const lakeParam = qs?.get("envlake") ?? null;
  // Fix round (judge1, major): the mirror lake lost the floe and iceberg reflection columns that F000 and the Cycles plate
  // lake have, and its live-cloud reflections put the lake boxes 3-13 levels off the plate lake; drawing it every frame while
  // the camera moves cost 12-15 % of the T1 frame. Until the mirror passes those gates, every tier keeps the re-aimed plate
  // lake on the baked environment (step 1's lake: every rest box within 1.5 levels of the projected baseline).
  // `?envlake=mirror` draws the mirror lake; `?envfix=0` restores step 2's default (mirror at T1 / T2) exactly.
  const fixOff = qs?.get("envfix") === "0";
  // Round 11 user-priority round (WATER lane, the user: the water broke into fragments and the near floes trailed shadows
  // whenever the camera moved, both from the plate lake's re-aimed baked reflections): the default lake is the planar mirror of
  // the real scene with the Cycles water's own bump (LAKE_R12). `?envlake=plate` and `?envfix=0` keep their earlier meaning.
  const lakeR12 = lakeParam === "r12" || (lakeParam === null && !fixOff && mirrorLakeAllowed);
  const mirrorLake = lakeR12 || lakeParam === "mirror" || (fixOff && mirrorLakeAllowed && lakeParam !== "plate");
  // Round 11 step 2: the summit wisp is a Blender card composited by the baked shader (PlateEnvironment BAKED_WISP); BG.001 and
  // V2_Massif are baked without it. `?envwisp=0` restores step 1 exactly: their previous textures (wisp baked in), no card.
  const wispOn = qs?.get("envwisp") !== "0";
  const bakedEnv = async (): Promise<GLTF | null> => {
    if (envParam === "projected") return null;
    try {
      const res = await fetch(base + ENV_BAKED.manifest, { signal });
      if (!res.ok) return null;
      const man = (await res.json()) as {
        objects: Record<string, { node: string; texture: string; textureWithWisp?: string; textureS2?: string }>;
        wisp?: { card: string; quad: number[][] };
      };
      const scene = await glb("envProxy", ENV_BAKED.glb);
      const entries = Object.values(man.objects);
      const wisp = wispOn && man.wisp ? man.wisp : null;
      // Fix round (judge1 minor, ridge specks): the 4 photogrammetry mountains' back faces, seen through the scans' holes and
      // hairline cracks, now carry Cycles' own colour along their rest ray (manifest `texture`); `textureS2` is step 2's
      // texture, used with `?envtex=s2` or `?envfix=0` (and by `?envwisp=0`, which restores step 1).
      const texS2 = fixOff || qs?.get("envtex") === "s2";
      const pick = (o: (typeof entries)[number]) =>
        wisp ? (texS2 ? (o.textureS2 ?? o.texture) : o.texture) : (o.textureWithWisp ?? o.textureS2 ?? o.texture);
      const texs = await Promise.all(entries.map((o) => tex(`baked_${o.node}`, pick(o), true)));
      const map: Record<string, THREE.Texture> = {};
      entries.forEach((o, i) => {
        // glTF UVs: no flip (the PNG's top row is v = 1 before the exporter's 1 - v).
        texs[i].flipY = false;
        texs[i].needsUpdate = true;
        map[o.node] = texs[i];
      });
      scene.scene.userData.baked = map;
      if (wisp) scene.scene.userData.wisp = { texture: await exr("wisp", wisp.card, true), quad: wisp.quad };
      return scene;
    } catch (e) {
      if (envParam === "baked") throw e;
      console.warn("[hero] baked environment unavailable, projecting the plates", e);
      return null;
    }
  };

  const baked = bakedEnv();
  const loadPlates = () => Promise.all([tex("plate", ASSETS.plate, true), Promise.all(EXTRA_PROJECTORS.map((e) => extraPlate(e.key)))]);
  const skipPlates = () => {
    for (const k of ["plate", ...EXTRA_PROJECTORS.map((e) => `plate_${e.key}`)]) done[k] = 1;
    report();
    return null;
  };
  // The plates start at once unless the mirror lake may replace them; then only if the bake is unavailable.
  const plates = envParam === "projected" || !mirrorLake ? loadPlates() : baked.then((b) => (b ? skipPlates() : loadPlates()));
  // Water lane fix round 1: the r12 lake's sky carries the Cycles scene's glossy-visible volumes (V2_BaseMist, V2_SummitWisp).
  // The Cycles water's lowest reflected rays (those ensure_valid_specular_reflection lifts to ~0.6 deg) cross the base mist
  // 33-150 m out and see its glow (a Cycles probe from a near-water point: 0.87 luma at 0.6 deg; the world alone 0.013), so the
  // world-only sky turned every pixel with many low rays into a dark streak (judge1 major: stripy near water, centre 13-18
  // levels dark). sky_lake.exr = sky_world.exr's render (same world, camera orientation, encoding) with the two volumes, from
  // the water at the ripple centre (WORK tools/fx_sky_mist.py); equal to sky_world.exr outside the mist (ratio 1.000).
  // `?lkmist=0` (or `?lkfix1=0`, `?lkperf=0`): the world-only sky as before.
  const skyFile = lakeR12 && qs?.get("lkmist") !== "0" && qs?.get("lkfix1") !== "0" && qs?.get("lkperf") !== "0" ? ENV_BAKED.skyLake : ENV_BAKED.sky;
  const sky = envParam === "projected" || !mirrorLake ? Promise.resolve(null) : baked.then((b) => (b ? exr("sky", skyFile) : null));
  const lakeCorr =
    envParam === "projected" || !mirrorLake || lakeR12 || qs?.get("envlakecorr") === "0"
      ? Promise.resolve(null)
      : baked.then((b) => (b ? tex("lakeCorr", ENV_BAKED.lakeCorr, false).catch(() => null) : null));

  const [envProxy, hero, plateSet, panorama, cloudA, cloudB, plateMeta, skyTex, lakeCorrTex] = await Promise.all([
    baked.then((b) => b ?? glb("envProxy", ASSETS.envProxy)),
    glb("hero", ASSETS.hero),
    plates,
    exr("panorama", ASSETS.panorama),
    tex("cloud_a", ASSETS.clouds.cloud_a, true),
    tex("cloud_b", ASSETS.clouds.cloud_b, true),
    meta(ASSETS.plateMeta),
    sky,
    lakeCorr,
  ]);
  draco.dispose();
  onProgress(1);
  const extraPlates: HeroAssets["extraPlates"] = {};
  EXTRA_PROJECTORS.forEach((e, i) => {
    const x = plateSet?.[1][i];
    if (x) extraPlates[e.key] = x;
  });
  // Without plates (the mirror lake), the projected material and the water keep a 1 px stand-in they never sample.
  const plate = plateSet?.[0] ?? new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  plate.needsUpdate = true;
  return {
    envProxy,
    hero,
    plate,
    plateMeta: plateMeta ?? DEFAULT_PLATE_META,
    extraPlates,
    panorama,
    clouds: { cloud_a: cloudA, cloud_b: cloudB },
    sky: skyTex,
    lakeCorr: lakeCorrTex,
    lakeR12: lakeR12 && !!skyTex,
  };
}
