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
};

/** The baked environment's files (scratchpad pipeline bake_env_m8.py), under the asset base. */
const ENV_BAKED = { glb: "env_baked.glb", manifest: "env_baked.json" };

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
  const exr = async (key: string, file: string) => {
    const buf = await fetchBytes(base + file, track(key), signal);
    const loader = new EXRLoader().setDataType(THREE.HalfFloatType);
    const d = loader.parse(buf) as { width: number; height: number; data: Uint16Array; format: THREE.PixelFormat; type: THREE.TextureDataType };
    const t = new THREE.DataTexture(d.data, d.width, d.height, d.format, d.type);
    t.colorSpace = THREE.LinearSRGBColorSpace;
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
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
  const extras = Promise.all(EXTRA_PROJECTORS.map((e) => extraPlate(e.key)));

  // Baked environment (QC round 10: projected plates doubled the mountains whenever the camera moved): real geometry with one
  // texture per surface, from the Blender bake (env_baked.glb + env_baked.json + baked/*.webp). Default when published;
  // `?env=projected` keeps the projected plates for A/B captures, `?env=baked` insists.
  const envParam = typeof location !== "undefined" ? new URLSearchParams(location.search).get("env") : null;
  const bakedEnv = async (): Promise<GLTF | null> => {
    if (envParam === "projected") return null;
    try {
      const res = await fetch(base + ENV_BAKED.manifest, { signal });
      if (!res.ok) return null;
      const man = (await res.json()) as { objects: Record<string, { node: string; texture: string }> };
      const scene = await glb("envProxy", ENV_BAKED.glb);
      const entries = Object.values(man.objects);
      const texs = await Promise.all(entries.map((o) => tex(`baked_${o.node}`, o.texture, true)));
      const map: Record<string, THREE.Texture> = {};
      entries.forEach((o, i) => {
        // glTF UVs: no flip (the PNG's top row is v = 1 before the exporter's 1 - v).
        texs[i].flipY = false;
        texs[i].needsUpdate = true;
        map[o.node] = texs[i];
      });
      scene.scene.userData.baked = map;
      return scene;
    } catch (e) {
      if (envParam === "baked") throw e;
      console.warn("[hero] baked environment unavailable, projecting the plates", e);
      return null;
    }
  };

  const [envProxy, hero, plate, panorama, cloudA, cloudB, plateMeta, extraList] = await Promise.all([
    bakedEnv().then((b) => b ?? glb("envProxy", ASSETS.envProxy)),
    glb("hero", ASSETS.hero),
    tex("plate", ASSETS.plate, true),
    exr("panorama", ASSETS.panorama),
    tex("cloud_a", ASSETS.clouds.cloud_a, true),
    tex("cloud_b", ASSETS.clouds.cloud_b, true),
    meta(ASSETS.plateMeta),
    extras,
  ]);
  draco.dispose();
  onProgress(1);
  const extraPlates: HeroAssets["extraPlates"] = {};
  EXTRA_PROJECTORS.forEach((e, i) => {
    const x = extraList[i];
    if (x) extraPlates[e.key] = x;
  });
  return {
    envProxy,
    hero,
    plate,
    plateMeta: plateMeta ?? DEFAULT_PLATE_META,
    extraPlates,
    panorama,
    clouds: { cloud_a: cloudA, cloud_b: cloudB },
  };
}
