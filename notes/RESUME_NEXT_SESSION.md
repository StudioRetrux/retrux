# Cara Resume — Next Session Retrux Hero

**Status terakhir:** `retrux-web` tag `v1.4` (commit `bb94bfa`), frosted ice orb + 2 flat ring bands. Belum 1:1 dengan `Default Loop.mp4`. Rencana lanjutan tertulis di `ICE_HERO_PIPELINE.md`.

Claude saya sudah menyimpan konteks session ini di memory — otomatis tau v1.4, gap iglo, Plan A/B/C/D, dan aturan "jangan video".

Untuk lanjut, ketik salah satu opsi di bawah ke Claude:

---

## Opsi 1 — Dev mulai pipeline (tanpa nunggu artist)

> **"Lanjut Retrux hero — mulai Plan A / Minggu 1 di ICE_HERO_PIPELINE.md. Setup DRACOLoader + KTX2Loader + EXR env, compress GLB existing pakai gltf-transform."**

Yang akan dikerjakan Claude:
- Install `@gltf-transform/cli`
- Tulis `retrux-web/app/lib/loaders.ts` (DRACO + KTX2 + Meshopt)
- Compress `home-full.glb` (73 MB → kemungkinan 3-5 MB)
- Download HDRI dari Polyhaven (snowy/overcast) → `public/textures/env_hero.exr`
- Swap `Environment preset="city"` → HDR custom

Result: quality naik signifikan tanpa nunggu artist re-bake.

---

## Opsi 2 — Artist sudah re-bake di Blender

> **"Lanjut Retrux hero — artist sudah export baked assets baru. File-nya di [path folder]. Attach ke HomeScene."**

Ganti `[path folder]` dengan lokasi GLB + texture baru.

Yang akan dikerjakan Claude:
- Compress GLB baru via gltf-transform
- Convert texture PNG → KTX2 kalau belum
- Update `HomeScene.tsx` apply baked color + normal + AO + roughness maps ke geometry
- Remove procedural tori (sudah diganti geometry asli dari artist)
- Test + capture comparison screenshots

---

## Opsi 3 — Scope kecilin dulu (minimum viable)

> **"Lanjut Retrux hero — ambil Plan C aja dulu. Compress GLB + HDR env, skip baking."**

Yang akan dikerjakan Claude:
- Compress existing `home-full.glb` (yang penting aja)
- HDRI dari Polyhaven sebagai env
- Tune materials lebih aggressive biar max out tanpa aset baru

~40% gap closed, ~20% effort. Cocok kalau artist lagi sibuk / timeline mepet.

---

## Opsi 4 — Shader-only approach

> **"Lanjut Retrux hero — masih belum puas sama v1.4. Coba pendekatan custom GLSL ShaderMaterial untuk ring, bukan MeshPhysicalMaterial."**

Yang akan dikerjakan Claude:
- Tulis custom ShaderMaterial dari scratch untuk ice
- Attempt frost animasi via noise data texture (generate noise texture code-side)
- Fresnel-based edge glow
- Subsurface-scattering approximation

**Honest note:** hasil akan tetap kalah dari proper baking dari Blender. Cocok kalau kamu mau explore tech boundaries, bukan kalau kamu mau hasil production-ready.

---

## Opsi 5 — Cuma review, nggak eksekusi

> **"Baca ICE_HERO_PIPELINE.md dan ringkas status terakhir, nggak usah kerjain apa-apa dulu."**

Yang akan dikerjakan Claude:
- Recap semua yang sudah dikerjain (v1.1 → v1.4)
- Highlight masalah utama yang masih ada
- Konfirmasi next step yang paling masuk akal
- Zero code changes

Cocok buat meeting prep / briefing ke tim.

---

## Shortcut paling simpel

Kalau lupa atau nggak yakin mau mana, cukup ketik:

> **"lanjut Retrux"**

Claude akan baca memory, recap singkat, lalu tanya balik kamu mau opsi berapa.

---

## Kalau beda konteks (bukan hero)

Kalau mau kerjain hal lain di project yang sama (misal ganti section di website, atau problem lain), langsung state aja:

> **"[apa yang mau dikerjain], konteks Retrux website."**

Misal: *"Bikin contact form di retrux-web, konteks Retrux website."* — Claude tetap tau ini project yang sama, tapi fokus di task baru.

---

## File penting untuk dibaca ulang

- **`ICE_HERO_PIPELINE.md`** — rencana kerja full untuk artist + dev
- **`RESUME_NEXT_SESSION.md`** — file ini
- **`retrux-web/`** — kode aplikasi
- **`Default Loop.mp4`** — referensi visual yang harus di-match
- **`Iglo 2/`** — benchmark quality (igloo.inc clone)
