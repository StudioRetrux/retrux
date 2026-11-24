# Retrux Ice Hero — Asset & Render Pipeline Guide

**Audience:** 3D Artist + Web Developer
**Reference:** `Iglo 2/` folder (local clone of [igloo.inc](https://www.igloo.inc/))
**Context:** Current website is at `retrux-web/`, latest tag `v1.4`. Visual target is the Blender render `Default Loop.mp4`.

---

## TL;DR

Kita mau hero 3D yang visual-nya mendekati `Default Loop.mp4` (Blender render), dengan kualitas produksi setara igloo.inc.

**Kesimpulan setelah beberapa iterasi di three.js murni:** Visual gap utama (organic ice look, refraction quality, mood) **tidak bisa ditutup** hanya dengan procedural shader di three.js. Kuncinya adalah **asset pipeline yang proper dari Blender ke web**.

Iglo.inc mencapai kualitas itu dengan **pre-bake segalanya di Blender**, compress, dan render tipis-tipis di three.js. Kita harus mengikuti cara yang sama.

---

## Bagian 1 — Gap analysis: apa yang iglo.inc lakukan vs kita

### Yang iglo.inc lakukan

Lihat folder `Iglo 2/assets/`:

```
geometries/
  igloo.drc                 (220K — ice dome, Draco-compressed)
  shattered_ring.drc        (40K  — ring dengan crack pattern)
  shattered_ring2.drc       (44K  — ring variant kedua)
  shattered_ring_smoke.drc  (12K  — partikel smoke trail)
  mountain.drc              (12K)
  floor.drc                 (40K)

images/ (semua .ktx2 — GPU-compressed)
  shattered_ring_color.ktx2    (baked color di ring)
  shattered_ring_ao.ktx2       (baked ambient occlusion)
  frost-datatexture.ktx2       (animated frost pattern)
  caustics.ktx2                (caustics underwater-ish lighting)
  perlin-datatexture.ktx2      (pre-computed perlin noise)
  clouds_noise.ktx2            (noise untuk awan animasi)
  wind_noise.ktx2              (noise untuk wind effect)
  igloo_color.ktx2             (baked color dari igloo mesh)
  igloo_exploded_color.ktx2    (variant untuk transition)
  mountain_color.ktx2          (baked mountain)

cubes_env.exr                  (HDR environment — high-dynamic-range)
```

Dan dari bundle JS mereka (minified tapi extractable), mereka punya custom ShaderMaterial dengan uniforms seperti:
`uColorFrost`, `uColorDark`, `uColorFast`, `uColorLight`, `uColorInitial`, `uAdditionalNoise`, `uRingProximity`, `uRotationTime`, `uShowNoise`, `uChromaticAberration`, `uBlueOffset`, `uCurl`, `uAnimationProgress`, `uAnimationDirection`, `uBlink`.

### Yang kita lakukan di `retrux-web` (v1.4)

| Aspek | Kita (v1.4) | Iglo.inc |
|---|---|---|
| GLB ukuran | 73 MB (`home-full.glb`) — uncompressed | Total <3 MB — Draco + KTX2 |
| Geometry ring | **Procedural `torusGeometry`** — smooth perfect | **Modeled `shattered_ring.drc`** — pecah organic |
| Ring texture | Tidak ada — pure material | `shattered_ring_color.ktx2` + `_ao.ktx2` baked |
| Ice surface | MeshTransmissionMaterial (drei default) | Custom ShaderMaterial dengan baked maps + frost animation |
| Environment | drei preset `city` — sintetis generik | `cubes_env.exr` — real HDR custom |
| Noise | Tidak pakai | 4 noise data-textures, UV-scrolled setiap frame |
| Loading | Main thread | Web Workers parallel (EXR, KTX2, Draco decoder) |

### Mengapa hasilnya beda jauh

**Yang bikin iglo look premium itu BUKAN three.js skill** — tapi **kualitas aset yang masuk ke three.js**. Rumusnya:

1. **Detail organic di surface** → datang dari **baked normal/AO/color map**, bukan dari prosedural shader
2. **"Shattered" look di ring** → **geometry-nya emang sudah dipecah di Blender** (pakai Cell Fracture atau Boolean)
3. **Glow di block tertentu** → **emissive map** yang di-paint di Blender, bukan global bloom
4. **Reflection ice yang convincing** → **HDR environment map EXR**, bukan cubemap fake
5. **Load cepat padahal high-detail** → **Draco + KTX2 compression**

---

## Bagian 2 — Tugas 3D Artist (di Blender)

File kerja: `Home - EXPORT.blend`

Target: export asset yang siap di-consume three.js dengan kualitas iglo-tier.

### 2.1 — Re-model ring geometry jadi "shattered"

Saat ini di GLB kita ring-nya adalah `torusGeometry` perfect smooth (atau flat circle `Circle.025`–`Circle.032`). Ini yang bikin look-nya kaku seperti gear, bukan organic seperti ice.

**Cara shatter:**

Option A — **Cell Fracture addon** (built-in):
1. `Edit → Preferences → Add-ons → cari "Cell Fracture" → enable`
2. Pilih ring mesh
3. `Object → Quick Effects → Cell Fracture`
4. Atur `Source Limit` ke 8–16 (jumlah pecahan), `Noise` ke 0.3
5. Apply → ring jadi pecah dengan crack natural

Option B — **Boolean + noise displacement**:
1. Tambah **Subdivision Surface modifier** (level 3)
2. Tambah **Displace modifier** → texture = Clouds/Noise, strength 0.05
3. Apply semua modifier → surface jadi organic bumpy

Option C — **Sculpt ice detail**:
1. Tab → Sculpt Mode
2. Pakai **Crease brush** dengan stroke Random untuk bikin crack lines
3. Bake normal map dari high-poly hasil sculpt → apply ke low-poly

**Tips:** Bikin 2 ring variants (horizontal equator + diagonal ~45°) — reference video `Default Loop.mp4` menunjukkan 2 ring dengan tilt berbeda.

### 2.2 — UV unwrap semua mesh yang akan dikasih texture

Supaya bisa di-bake:
1. Select mesh → Edit Mode → `U → Smart UV Project` (atau manual unwrap untuk control lebih bagus)
2. Pastikan UV island tidak overlap (kecuali intentional)
3. Pack UV rapat (`U → Pack Islands`)

### 2.3 — Bake texture maps di Blender

Di `Render Properties → Render Engine: Cycles` (quality lebih bagus daripada Eevee untuk baking).

Untuk setiap unique mesh (ring, sphere core, glass orb), bake:

| Map | Resolusi | Bake type |
|---|---|---|
| **Base Color** | 2048×2048 | Diffuse (Color only, uncheck Direct/Indirect) |
| **Normal** | 2048×2048 | Normal (Space: Tangent) |
| **Ambient Occlusion** | 1024×1024 | AO |
| **Roughness** | 1024×1024 | Roughness |
| **Emissive** (jika ada) | 1024×1024 | Emit |
| **Metalness** | 512×512 | Metal |

**Langkah bake:**
1. Di Shader Editor, tambah **Image Texture node** baru, buat image kosong dengan resolusi target
2. Pilih node itu (harus active, jangan connected ke apapun)
3. `Render Properties → Bake → Type: [sesuai map] → Bake`
4. Save image yang sudah ter-bake (header Image Editor → Image → Save As)
5. Repeat untuk semua map type
6. Ulangi untuk setiap mesh yang unik

Output file:
```
ring_color.png
ring_normal.png
ring_ao.png
ring_roughness.png
orb_color.png
orb_normal.png
orb_ao.png
...
```

### 2.4 — Export HDR environment map

Untuk reflection yang realistic:

1. `Render Properties → Output → File Format: OpenEXR` (16-bit atau 32-bit float)
2. Pastikan World HDR sudah di-setup di Blender
3. `View → Viewport Render Image` dengan camera set ke **Equirectangular projection** (pano 2:1)
4. Atau pakai HDRI existing dari [Polyhaven](https://polyhaven.com/hdris) (gratis, pilih "snowy", "overcast", atau "ice" category)

Output: `env_hero.exr` (ukuran 2048×1024 atau 4096×2048 sudah cukup)

### 2.5 — Export final

Export GLB dengan setting yang benar:

`File → Export → glTF 2.0 (.glb)`:
- **Include: Selected Objects** (atau pilih collection hero saja)
- **Transform: +Y Up** ✓
- **Geometry:**
  - Apply Modifiers ✓
  - UVs ✓
  - Normals ✓
  - Tangents ✓ (penting untuk normal map)
  - Vertex Colors ✓
- **Material: Export**
- **Animation:** sesuai kebutuhan
- **Compression:** Draco, level 6 (kalau available)

Output per asset (jangan satu mega-GLB):
```
ring_shattered.glb       (ring 1 dengan baked textures embedded)
ring_shattered_2.glb     (ring 2)
ice_orb.glb              (center sphere)
environment.glb          (mountain + ground + water)
env_hero.exr             (HDR environment)
```

File structure final:
```
retrux-web/public/
  models/
    ring_01.glb
    ring_02.glb
    ice_orb.glb
    environment.glb
  textures/
    ring_color.png → akan di-convert ke .ktx2 oleh pipeline
    ring_normal.png
    ring_ao.png
    ring_roughness.png
    orb_color.png
    ...
    env_hero.exr
```

---

## Bagian 3 — Tugas Developer (di three.js)

### 3.1 — Install compression pipeline tools

```bash
npm install -g @gltf-transform/cli
# atau lokal:
npm install --save-dev @gltf-transform/cli
```

Optional, untuk KTX2 encoding standalone:
```bash
# macOS
brew install ktx
# atau basisu:
# download dari https://github.com/BinomialLLC/basis_universal
```

### 3.2 — Compress aset yang sudah di-export artist

Untuk setiap GLB:

```bash
# Optimize + Draco mesh compression + KTX2 texture compression (UASTC untuk quality)
gltf-transform optimize public/models/ring_01.glb public/models/ring_01_packed.glb \
  --compress draco --texture-compress ktx2
```

Rule of thumb: `home-full.glb 73MB` harusnya bisa turun ke ~3-5MB setelah compression.

### 3.3 — Update loaders di `retrux-web`

Saat ini `retrux-web/app/components/HomeScene.tsx` pakai `useGLTF` dari drei (vanilla). Kita perlu attach DRACOLoader + KTX2Loader.

**File baru: `retrux-web/app/lib/loaders.ts`**

```typescript
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import * as THREE from "three";

let loaderSingleton: GLTFLoader | null = null;

export function getGLTFLoader(gl: THREE.WebGLRenderer): GLTFLoader {
  if (loaderSingleton) return loaderSingleton;

  const loader = new GLTFLoader();

  const draco = new DRACOLoader();
  draco.setDecoderPath("/draco/"); // host decoder di public/draco/
  draco.setDecoderConfig({ type: "js" });
  loader.setDRACOLoader(draco);

  const ktx2 = new KTX2Loader();
  ktx2.setTranscoderPath("/basis/"); // host basis di public/basis/
  ktx2.detectSupport(gl);
  loader.setKTX2Loader(ktx2);

  loader.setMeshoptDecoder(MeshoptDecoder);

  loaderSingleton = loader;
  return loader;
}
```

Host decoder static files di `public/draco/` dan `public/basis/` — copy dari `node_modules/three/examples/jsm/libs/draco/gltf/*` dan `node_modules/three/examples/jsm/libs/basis/*`.

### 3.4 — Load HDR environment

**File baru: `retrux-web/app/components/EnvHDR.tsx`**

```typescript
"use client";
import { Environment } from "@react-three/drei";

// Ganti "city" preset (generic) dengan EXR HDR kita.
export function EnvHDR() {
  return (
    <Environment
      files="/textures/env_hero.exr"
      background={false} // kita punya background solid color sendiri
      environmentIntensity={0.6}
    />
  );
}
```

Replace `<Environment preset="city" ... />` di `Scene.tsx` dengan `<EnvHDR />`.

### 3.5 — Custom ice shader template

Saat artist sudah bake `ring_color`, `ring_normal`, `ring_ao`, `ring_roughness`, pakai via MeshPhysicalMaterial langsung (paling sederhana):

```tsx
const [colorMap, normalMap, aoMap, roughnessMap] = useTexture([
  "/textures/ring_color.ktx2",
  "/textures/ring_normal.ktx2",
  "/textures/ring_ao.ktx2",
  "/textures/ring_roughness.ktx2",
]);

<mesh geometry={ringGeometry}>
  <meshPhysicalMaterial
    map={colorMap}
    normalMap={normalMap}
    aoMap={aoMap}
    roughnessMap={roughnessMap}
    transmission={0.8}
    thickness={0.4}
    ior={1.33}
    envMapIntensity={1.2}
  />
</mesh>
```

Untuk animated frost effect (iglo-style), pakai onBeforeCompile:

```glsl
// Inject ke fragment shader via onBeforeCompile:
uniform sampler2D uFrostMap;
uniform float uTime;
uniform vec3 uFrostColor;

// Sample frost dengan UV scroll lambat
vec2 frostUv = vUv + vec2(uTime * 0.01, uTime * 0.005);
float frost = texture2D(uFrostMap, frostUv).r;
diffuseColor.rgb = mix(diffuseColor.rgb, uFrostColor, frost * 0.35);
```

### 3.6 — Optional: Web Workers untuk decode

Untuk load yang benar-benar snappy (iglo-tier), pindahkan decoding ke worker:

```typescript
const draco = new DRACOLoader();
draco.setDecoderConfig({ type: "wasm" });
draco.setWorkerLimit(4); // 4 worker threads parallel
```

KTX2Loader dan GLTFLoader akan otomatis pakai worker kalau available.

### 3.7 — Checklist file host di `public/`

Setelah semua setup:

```
retrux-web/public/
  draco/                    ← copy dari three/examples/jsm/libs/draco/gltf/
    draco_decoder.js
    draco_decoder.wasm
    draco_wasm_wrapper.js
  basis/                    ← copy dari three/examples/jsm/libs/basis/
    basis_transcoder.js
    basis_transcoder.wasm
  models/
    *.glb                   ← dari artist, sudah di-compress dengan gltf-transform
  textures/
    env_hero.exr            ← HDR dari artist
    *.ktx2                  ← texture baked, sudah di-compress
```

---

## Bagian 4 — Urutan kerja yang saya rekomendasikan

### Minggu 1 — Setup pipeline (developer)

Tanpa asset baru dari artist, developer bisa:

1. [ ] Install `@gltf-transform/cli`
2. [ ] Copy draco + basis decoder ke `public/draco/` dan `public/basis/`
3. [ ] Tulis `lib/loaders.ts` (DRACOLoader + KTX2Loader)
4. [ ] Compress GLB existing: `gltf-transform optimize home-full.glb home-packed.glb --compress draco --texture-compress ktx2` — lihat berapa banyak size turunnya
5. [ ] Switch `useGLTF` ke loader baru — harus masih works, just more efficient
6. [ ] Pick an HDRI dari Polyhaven (e.g. "snowy_forest_path_01") → download .exr → drop ke `public/textures/env_hero.exr`
7. [ ] Replace `<Environment preset="city" />` dengan `<Environment files="/textures/env_hero.exr" />`

Ini sudah akan upgrade quality **signifikan** tanpa wait artist.

### Minggu 2 — Re-bake assets (artist)

Artist kerjakan paralel di Blender:

1. [ ] Pilih ring mesh → Cell Fracture / noise displacement
2. [ ] UV unwrap ring + orb + core sphere
3. [ ] Setup Cycles material proper di Blender (SSS, roughness variation, noise)
4. [ ] Bake: color, normal, AO, roughness untuk tiap mesh
5. [ ] Export GLB per asset dengan tangent + UV
6. [ ] Export EXR environment kalau perlu custom

### Minggu 3 — Integration

Developer:

1. [ ] `gltf-transform optimize` setiap GLB baru
2. [ ] Convert PNG texture → KTX2 dengan `toktx` atau `gltf-transform`
3. [ ] Attach baked maps ke material di `HomeScene.tsx`
4. [ ] Test frame rate, load time
5. [ ] Tune post-processing (bloom threshold, tone mapping)

### Minggu 4 — Polish

1. [ ] Custom frost shader (animated)
2. [ ] Caustics effect kalau ada water di scene
3. [ ] Performance profiling — pastikan 60fps di laptop standard

---

## Bagian 5 — Risiko & alternatif

**Risiko:** Re-baking di Blender butuh waktu. Kalau ini mega-effort, alternatif realistis:

**Plan B:** Pakai existing GLB geometry as-is tapi apply baked textures HANYA ke ring mesh yang sudah ada (tanpa re-shatter geometry). Ini hilangkan "organic shattered" look tapi tetap naikkan quality significantly.

**Plan C (minimum viable):** Hanya upgrade environment HDR + compress existing GLB + tune materials lebih aggressive. Skip baking. Result: 40% gap closed, 20% effort.

**Plan D (nuclear):** Pakai Blender render video `Default Loop.mp4` sebagai video-texture hero. 100% pixel-perfect match tapi kehilangan interactivity kecuali di-layer dengan effect overlay. **Anda sempat bilang "jangan video", jadi saya tidak prioritaskan ini.**

---

## Bagian 6 — References

- **igloo.inc clone lokal:** `Iglo 2/` (jalankan `python3 -m http.server 3457 & open http://localhost:3457/`)
- **Polyhaven HDRI:** https://polyhaven.com/hdris/snowy
- **glTF-Transform docs:** https://gltf-transform.dev/
- **three.js DRACOLoader:** https://threejs.org/docs/#examples/en/loaders/DRACOLoader
- **KTX2 / Basis Universal:** https://github.com/BinomialLLC/basis_universal
- **Blender baking guide:** https://docs.blender.org/manual/en/latest/render/cycles/baking.html
- **Cell Fracture addon:** bundled with Blender, `Preferences → Add-ons → "Cell Fracture"`

---

## Kontak / pertanyaan

File ini hidup di:
`01. Assets Handling/ICE_HERO_PIPELINE.md`

Website kerja di:
`01. Assets Handling/retrux-web/` (branch `main`, tag terakhir `v1.4`)

Reference video:
`01. Assets Handling/Default Loop.mp4`

Iglo clone reference:
`01. Assets Handling/Iglo 2/`
