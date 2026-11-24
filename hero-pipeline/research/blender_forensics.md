# Blender forensics: `Home - EXPORT.blend` (Retrux hero)

Written 2026-11-10 from data that earlier agents had already extracted. No Blender, EEVEE or Cycles was run for this report. The only new work was light Python/JSON parsing and six single-frame ffmpeg crops of `Default Loop.mp4`.

**Legend.** **[F]** is a fact read directly from the extracted data. **[D]** is derived from facts by arithmetic. **[I]** is an inference or hypothesis; the confidence is given each time.

**Axes.** Blender is Z-up, right-handed, and the hero camera looks along +Y. three.js is Y-up. The conversions are:
- position: `(x, y, z)_three = (x_b, z_b, -y_b)`
- rotation quaternion: `(w, x, y, z)_three = (w, x_b, z_b, -y_b)`; for three.js (x, y, z, w) order, `q_three = (x_b, z_b, -y_b, w)`
- a rotation about Blender +Z is a rotation about three +Y; about Blender +Y it is about three −Z; about Blender +X it is about three +X
- units are metres in both

**Time base.** "frame" means the Blender frame. Both reference videos and the GLB exports run at 30 fps, so use `frame = 30·t + 1` [I, high]. The .blend itself now says 24 fps; see §4.

**Sources.** All are under `C:\Users\fvldi\AppData\Local\Temp\claude\dc2ac90effee4131\570a569a-5122-4ff1-b51f-d34d42e5fde3\scratchpad\research\`:
- in `blender\`: `inventory_static.json`, `forensics_final.json`, `eval_analysis.json`, `post_analysis.json`, `glb_probe.json`, `glb_anim_extract.json`, `camera_solve_*.json`, `overscan_calc.json`, `cam_cfg_*.json`, the `logs\` folder and the generating scripts
- renders in `blend_renders\`
- my helper scripts and frame crops in `fx_writer\`

---

## 0. Executive summary (most important for the implementer)

1. **[F] The file has no camera, no lights and no light probes, and all 18 actions are empty.** Every action has 1 layer, 1 strip and 1 channelbag, with 0 groups, 0 F-curves and frame_range [0,0]. Sampling every 2nd frame over 1-250 shows a range of 0.0 on every hero object, `Empty.006` and all clouds.
   - The only things that change over time in the .blend are 2 drivers on the orb material and the Wave modifier on `Plane.011`.
2. **[F] The hero is stored as a flat "bullseye".** All 4 rings are concentric and face the camera (ring axis = Blender +Y = three −Z) around the orb at Blender (0, 9.137568, 3.053807), which is three (0, 3.053807, −9.137568).
   - Neither reference video shows this pose. The loop frames show the rings tumbled (for example ring 4 seen edge-on as a horizontal band).
   - Ring rotation therefore has to come from the video, not from Blender.
3. **[F] The rings are scaled copies of each other.** Inner to outer, the evaluated cross-section is a rounded octagon (centre radius / radial width / axial depth):

   | ring | objects | centre radius | radial width | axial depth |
   |---|---|---|---|---|
   | C | Circle.027 | 1.140 | 0.212 | 0.440 |
   | B | Circle.026 | 1.425 | 0.265 | 0.550 |
   | A | Circle.025 + .032 halves | 1.782 | 0.331 | 0.688 |
   | 4 | Circle.028-.031 quarters | 2.183 | 0.406 | 0.843 |

   - Each ring is about 1.25× the next one inward. Each section is about 2× deeper along the axis than it is wide.
4. **[F] The only surviving keyframes are in `Home - Full.glb`, and only for ring A.** `Circle.025` (upper half) moves +0.47 m and `Circle.032` (lower half) moves −0.57 m along Blender Z (three Y) in 4 eased segments.
   - The segments are frames 230-270 open, 290-300 close, 350-365 open and 443-463 close, at 30 fps.
   - This lines up with the zoom events of `State 2 to 5.mp4`, so the GLB shares the state-video timeline (±1 frame) [I, high].
   - There are no tracks for the ring-4 quarters, rings B and C, the shards or the clouds.
5. **[F] The ice material's Material Output sits inside node group `Ice.004`.** `get_output_node()` returns None for both ice materials, yet Cycles 5.2 still renders the full ice. The as-is render D1 matches the re-wired render D2.
   - The Material Output inside the group acts as the material's output. This is a Cycles/EEVEE group-flattening quirk.
   - The glTF exporter does not see it, so every GLB ice material is exported as plain white, roughness 1.0, transmission 1.
6. **[F] The water is not physical water.** It is a Principled BSDF with **Metallic 1.0, base colour white and roughness 0.0345**: a 100% reflective mirror at all angles with no Fresnel falloff.
   - Its normal is a Bump node: noise scale 3 on object coordinates, bump distance 0.07, strength 1.
   - The Wave modifier is exactly `z = 0.226·exp(-(2.362·a)²)` inside an expanding front. Crests are 2.717 m apart and move at 0.03716 m per frame (1.115 m/s at 30 fps). The ripple centre is Blender (0, 8.6), almost directly under the orb.
7. **[F] The sky the camera sees is `BG.001`, not the world.** `BG.001` is a 449 × 286 m vertical card at y = 359 m with emission (0.1659, 0.2714, 0.5516) × 4 = linear **(0.664, 1.086, 2.206)**, plus 6 PNG cloud cards with emission white × 2.0.
   - `BG.001` is glossy-invisible, so reflections see the world instead.
   - The world is a Nishita ("SINGLE_SCATTERING" in 5.2) sky: sun elevation 18.70°, sun rotation −61.0°, air 0.231, aerosol 10, ozone 10, sun intensity 0.3, background strength 0.4.
   - The sun direction is three (−0.828, 0.321, −0.459): front-left of the camera and outside the 46° horizontal field of view.
8. **[F] Colour management is AgX, look None, exposure 0, gamma 1, sRGB display, Linear Rec.709 working space.** Cycles is set to 4096 spp with adaptive threshold 0.01 and OIDN. The file resolution is 1920×1080, while the videos are 1440×766.
9. **[D] The solved rest camera** (fitted to the video; the file has no camera):

   | | position | rotation | focal length |
   |---|---|---|---|
   | Blender | (0.2318, −11.7875, 2.9040) | Euler (89.9515°, 0, 0.6722°) | 42.253 mm, 36 mm horizontal-fit sensor |
   | three.js | (0.2318, 2.9040, 11.7875) | order 'YXZ', x = −0.000846 rad, y = 0.011732 rad | vertical FOV 25.536° at 1440×766 |

   - The camera is 20.93 m from the orb, which projects to pixel (721.1, 369.5). Fit error is 2.83 px RMS.
10. **[D] Cycles CPU throughput on this laptop.** With 4 threads, the environment plate costs about **2.08 µs per pixel-sample** plus about 1.8 s fixed overhead. 480×256 renders took 5.9 s at 16 spp and 18.1 s at 64 spp.
    - Adaptive sampling at 0.01 never converges here (184 s at 480×256 with max 512 spp). Use fixed samples.
    - EEVEE renders this scene **all black** on the Iris Plus 640. Do not use EEVEE.
11. **[D] Recommended plate (Plate A):** 1672×958 with margins L 8 / R 8 / T 20 / B 5 %, lens 36.390 mm, shift_y +0.0341, 128 spp fixed, OIDN.
    - Hide the hero and clouds, make `BG.001` camera-invisible, turn the Wave modifier off and enable transparent film.
    - Expect about 10-12 min with 2 threads and a peak Blender process of about 1.1-1.4 GB. Render only when free RAM is at least 1.6 GB.
12. **[F] Do not use `world_sky_equirect_512x256_from_orb.exr` as an environment map.** It contains the red +X marker sphere: emission 50, about 3° radius at pixel (383, 127). Re-render it clean (recipe in §5).

---

## 1. Render settings, colour management, world/sky and cameras

### 1.1 File and scene
| item | value |
|---|---|
| file | `E:\Retrux Hero R&D\Home - EXPORT.blend`, 105,286,233 B, saved 2026-04-19 12:25. Saved with Blender 4.4 (file_version 4.4.32), read with Blender 5.2.3 LTS [F] |
| other exports (dates) [F] | `Home - Dyson Sphere.glb` 04-16 20:17 · `State 2 to 5.mp4` 04-16 20:21 · `Default Loop.mp4` 04-16 20:22 · `Home - Full.glb` 04-18 21:20 · `Home - EXPORT.zip` 04-19 12:29 · `HOME - Assets\*.glb` 04-26 · `Ring 4.x.glb` with `Normal 4.1-4.4.png` 05-24 |
| scene | 1 scene, frames 1-250, fps 24 (fps_base 1.0), current frame 1, no markers, camera **None**, world "World", 54 objects, 1 collection "Collection", 1 view layer "ViewLayer" [F] |
| datablocks | 49 meshes, 13 materials, 8 node groups, 17 images (16 packed), 18 actions, 1 texture (Voronoi), 0 lights, 0 cameras, 0 probes, 0 particles, 0 libraries [F] |
| add-on leftovers | Geo-Scatter (`scatter5` props and a `.Geo-Scatter` text block), BlenderKit, KeenTools, zform, flip_fluid, graswald. None of these affect rendering [F] |

### 1.2 Render and Cycles settings stored in the file [F]
- **Engine:** CYCLES, device GPU (stored only). This laptop has no CUDA/OptiX; the log says "CUEW initialization failed", so Cycles falls back to CPU.
- **Output:** 1920×1080 at 100%, pixel aspect 1:1, PNG 8-bit, dither 1.0. Film transparent off, motion blur off (shutter 0.5), compositing on (no compositor tree), sequencer on (empty), persistent data off, simplify off. The stored filepath was overwritten in memory by the earlier agents' safety redirect.
- **Sampling:** 4096 spp, adaptive on (threshold 0.01, min 0), time limit 0, seed 0 (not animated), preview 32 spp.
- **Denoise:** OIDN, input passes RGB_ALBEDO_NORMAL, prefilter ACCURATE, quality HIGH.
- **Light paths:**
  - bounces: max 12, diffuse 4, glossy 4, transmission 12, **volume 0**, transparent 8
  - caustics reflective and refractive both on, filter glossy 1.0
  - clamp direct 0 (off), clamp indirect 10
  - light tree on, light threshold 0.01, fast GI off, path guiding off
- **Film and pixels:** film exposure 1.0, Blackman-Harris filter 1.5 px, texture limit OFF, auto tile on with tile size 2048, layer samples USE.
- **Volume:** step rate 1.0, max steps 1024.
- **View layer passes:** Combined only. The "cryptomatte accurate" flag is set, but no cryptomatte pass is enabled.
- **EEVEE block (not relevant):** TAA 64 render samples, fast GI on, raytracing off, shadows on, volumetrics 0.1-100 m.

### 1.3 Colour management [F]
- view transform **AgX**, look **None** (base contrast)
- exposure **0.0**, gamma **1.0**
- curve mapping off; white balance off (stored 6500 K, tint 10, unused)
- display sRGB, sequencer colour space sRGB, working space **Linear Rec.709**

**three.js:** use `renderer.toneMapping = THREE.AgXToneMapping`, `toneMappingExposure = 1.0`, `outputColorSpace = SRGBColorSpace`. Keep all inputs, including the plates, scene-linear. [I] three.js AgX approximates Blender AgX (base look); expect small hue and contrast differences on saturated blues.

### 1.4 World and sky [F unless marked]
**World "World" node tree.** It is `Sky Texture → Background (Strength 0.4) → World Output`. The world's viewport colour is 0.0509, which is unused.
- sky_type `SINGLE_SCATTERING` (Blender 5.x name of the 4.4 Nishita model) [I, high]
- sun disc **on**, sun_size **0.009512 rad (0.545°)**, sun_intensity **0.3**
- sun_elevation **0.3263766 rad (18.700°)**, sun_rotation **−1.064651 rad (−61.000°)**
- altitude **0 m**, air_density **0.231**, aerosol (dust) density **10.0**, ozone density **10.0**
- Turbidity 2.2 and ground albedo 0.3 are Preetham/Hosek parameters and are unused.
- World Cycles settings: sampling AUTOMATIC, map resolution 1024, max bounces 1024, all ray visibilities on. Mist off.

**Sun direction** [D; the measured equirect agrees to 0.2°]. Blender = (sin r·cos e, cos r·cos e, sin e).

| | nominal | measured |
|---|---|---|
| Blender | **(−0.8284, 0.4592, 0.3206)** | (−0.8295, 0.4590, 0.3182) |
| three.js | **(−0.8284, 0.3206, −0.4592)** | |

The sun is 61° to the left of the view axis and 18.7° up, so it is behind and left of the hero as seen from the camera and outside the frame.

**Sky radiance measured from the world-only equirect** (`post_analysis.json`). These are linear RGB values that already include Strength 0.4 [F].

| elevation | toward camera forward (+Y_b) | opposite (−Y_b) | toward sun azimuth |
|---|---|---|---|
| 0.5° | 0.0064, 0.0091, 0.0155 | 0.0017, 0.0026, 0.0050 | 0.192, 0.265, 0.430 |
| 5° | 0.152, 0.234, 0.457 | 0.040, 0.078, 0.196 | 5.69, 7.95, 13.3 |
| 10° | 0.233, 0.373, 0.788 | 0.062, 0.130, 0.363 | 12.3, 17.4, 29.9 |
| 20° | 0.238, 0.387, 0.844 | 0.060, 0.127, 0.372 | 16.5, 23.5, 41.1 (aureole) |
| 45° | 0.168, 0.275, 0.610 | 0.045, 0.092, 0.261 | 1.50, 2.20, 4.04 |
| 89° (zenith) | 0.069, 0.121, 0.299 | 0.064, 0.115, 0.286 | 0.071, 0.125, 0.307 |

Integrated values:
- sun irradiance on a surface facing the sun: **(9.92, 8.41, 7.12)**, luminance about 8.6. In three.js this is a DirectionalLight with colour (1, 0.848, 0.718) and intensity about 9.9, in the same units as the HDR.
- sky irradiance on a horizontal plane, sun excluded: **(1.575, 2.348, 4.495)**
- sun irradiance on a horizontal plane: (3.157, 2.676, 2.265)
- mean upper-hemisphere radiance, sun excluded: (0.710, 1.000, 1.862)
- lower hemisphere: about black (0.021, 0.001, 0.002)

The very high aerosol value makes the horizon dark and the aureole huge.

### 1.5 What each ray type sees (important for matching) [F]
- **Camera rays see `BG.001`** where no geometry is in the way. `BG.001` is an emissive card:
  - linear **(0.664, 1.086, 2.206)** plus about (0.02, 0.04, 0.12) diffuse from the world [D], so about **(0.68, 1.13, 2.33)**
  - it is uniform: no gradient
  - it spans Blender x ±224.4, z −115 to +171 at y = 359.14, which covers every solved camera's frustum [D]
  - the cloud cards are drawn in front of it
- **Glossy (reflection) rays** skip `BG.001` (its glossy visibility is off), so they see the **Nishita world** (table above), the cloud cards and the geometry. The mirror water therefore reflects the darker, more saturated world sky, not the pale card.
- **Transmission (refraction) rays through the ice and orb** do see `BG.001` and the clouds.

### 1.6 Cameras solved from the videos (the .blend has none)
The solver used a 36 mm horizontal-fit sensor, roll 0, principal point at the image centre (720, 383) and square pixels. Lens = f_px·36/1440 [F, from `camera_solve_*.json`]. In three.js: `camera.rotation.order='YXZ'; rotation.x = pitch; rotation.y = yaw; rotation.z = 0` [D, derived: R_three = Ry(yaw)·Rx(pitch)].

| state (video time) | Blender location (x, y, z) | Blender Euler XYZ deg | three.js position | three.js rot x / y (rad) | f_px (1440 wide) | lens mm | HFOV / VFOV (766 px) | dist to orb | RMS |
|---|---|---|---|---|---|---|---|---|---|
| **rest** (loop t0 = s25 t0) | (0.231839, −11.787529, 2.903973) | (89.951543, 0, 0.672221) | (0.231839, 2.903973, 11.787529) | −0.000846 / 0.011732 | 1690.122 | 42.253 | 46.148° / 25.536° | 20.927 m | 2.83 px |
| s25 t = 2.5 s | (1.565954, −13.263533, 3.498360) | (87.929273, 0, 4.159333) | (1.565954, 3.498360, 13.263533) | −0.036141 / 0.072594 | 1772.191 | 44.305 | 44.222° / 24.390° | 22.460 m | 2.15 px |
| s25 t = 8.5 s | (0.054532, −12.574571, 2.659869) | (91.195256, 0, 0.144012) | (0.054532, 2.659869, 12.574571) | 0.020861 / 0.002514 | 1847.802 | 46.195 | 42.577° / 23.420° | 21.716 m | 0.35 px |
| s25 t = 13.0 s (**low confidence**: orb radius assumed 130 px) | (0.044146, −1.529962, 2.257814) | (95.451435, 0, 0.237008) | (0.044146, 2.257814, 1.529962) | 0.095145 / 0.004137 | 1703.541 | 42.589 | 45.823° / 25.342° | 10.697 m | 1.03 px |
| mirror of rest (for the reflection plate) | (0.231839, −11.787529, −2.903973) | (90.048457, 0, 0.672221) | (0.231839, −2.903973, 11.787529) | +0.000846 / 0.011732 | same | same | same | — | — |

- **Rest forward vector** [F]: Blender (−0.011732, 0.999931, −0.000846), three (−0.011732, −0.000846, −0.999931).
  - The camera does **not** point at the orb; the orb is 13.5 px above the image centre. Use the rotation values, not `lookAt(orb)`.
- **Landmarks used** (Blender world → loop t0 pixel) [F]:
  - orb centre (0, 9.137568, 3.053807) → (721.5, 368.5)
  - ring-4 band ends x = ±2.3858 → u = 527.5 / 915.0
  - mountain summit (−30.7261, 105.238, 14.557) → (294, 210)
  - iceberg top (17.9649, 54.523, 5.19406) → (1198.5, 326)
  - sand-pile top (22.464, 43.9843, 2.68767) → (1412, 390)
  - Residuals: iceberg −5.2/−3.0 px, sand pile +4.8/−1.8 px, all others < 1.2 px.
- **Caveat** [F, D]: without the ring-band constraint, the 4-point solve (pass 1) is degenerate. It gives y = −17.21, f = 1815 px, 26.35 m distance at 0.95 px RMS.
  - The chosen solve depends on ring 4 being at its rest radius and edge-on in loop t0.
  - It is corroborated by the t2.5 and t8.5 solves, which use the measured orb radius (68-70 px) instead. Their px/m at the orb, 78.9 and 85.1, bracket the rest value of 80.75.
- **[I]** The video was most likely rendered at 1920×1080 or similar, with only horizontal fit matching. If it is a vertically cropped 16:9 render, the principal point could be off-centre by a few px. This is unverified.
- **[D] The zoom is part dolly, part focal length.** Rest to t8.5 goes from 42.25 to 46.20 mm and 0.79 m closer. t2.5 moves 1.33 m right, 0.60 m up and 1.48 m back, with yaw +4.16° and pitch −2.07°. t13 is a 10.3 m dolly forward with pitch +5.45°.

---

## 2. Semantic map of every object

### 2.1 Hero (all pivots at the orb centre unless noted) [F]
All hero objects have object scale **1.975013**, except the orb (3.302118). Their materials use object-space texture coordinates, so patterns move with the objects.

| object | role | base mesh → evaluated (render level) | modifiers | rotation (Blender Euler XYZ) | span (θ in the camera-facing XZ plane: 0° = +X right, 90° = +Z up) | notes |
|---|---|---|---|---|---|---|
| **Icosphere.011** | orb (glass shell + emissive volume) | 2562 v / 5120 tris, unchanged | none | (0, 0, 0) | — | world radius **0.82553 m** (local 0.25). Material `magick_ball_01.002` |
| **Circle.027** | ring C (innermost), closed | 128 v / 128 quads → 512 v / 1024 tris | SubD Catmull-Clark L1 (render L1, limit surface, quality 3, creases on) + Smooth by Angle 30° | (50°, 0, 0); the mesh is pre-tilted so it faces the camera | closed, 32 segments of 11.25° (64 after SubD) | `Ice Floes.004`. GLB `ring_01.glb` |
| **Circle.026** | ring B, closed | 128 v / 128 quads → 512 v / 1024 tris | same | (125°, 0, 0), pre-tilted, faces the camera | closed, 32 segments | `Ice Floes.004`. GLB `ring_02.glb` |
| **Circle.025** | ring A upper half | 68 v / 66 quads → 266 v / 528 tris | same; 8 creased edges (end caps) | (90°, 0, 0) | 0°-180° (top) | GLB: splits +0.47 m up (§4). `ring_03.glb` |
| **Circle.032** | ring A lower half | 68 v / 66 quads → 266 v / 528 tris | same; 8 creased edges | (90°, 0, 0) | 180°-360° (bottom) | GLB: splits −0.57 m down |
| **Circle.028** | ring 4 quarter, top | 36 v / 34 quads → 138 v / 272 tris | same; 8 creased edges, has a `uv_seam` attribute | (0, 0, 0); mesh in local XZ | 45°-135° | `ring_04.glb`. The earlier agent mapped it to "Ring 4.1" [I, unverified] |
| **Circle.029** | ring 4 quarter, right | same | same | (0, 0, 0) | 315°-45° | "Ring 4.2" [I] |
| **Circle.030** | ring 4 quarter, left | same | same | (0, 0, 0) | 135°-225° | "Ring 4.4" [I] |
| **Circle.031** | ring 4 quarter, bottom | same | same | (0, 0, 0) | 225°-315° | "Ring 4.3" [I] |
| **Cube.009** | shard belt 1 (9 crystals) | 234 v / 288 faces (144 tris + 144 quads) → 432 tris | Smooth by Angle 30° only (faceted) | (0, **+15.32463°**, 0) | belt normal Blender (0.26429, 0, 0.96444), three (0.26429, 0.96444, 0) | pivot Blender (0, 8.940067, 2.946589), three (0, 2.946589, −8.940067). That is the orb centre + (0, −0.1975, −0.1072) in Blender. `Ice Floes blue.002` |
| **Cube.010** | shard belt 2 (9 crystals) | identical local mesh to Cube.009 | same | (0, **−24.67538°**, 0) | normal Blender (−0.41748, 0, 0.90869), three (−0.41748, 0.90869, 0) | same pivot |

**Ring axes in the stored pose** [F, D]. All 8 ring objects have their axis along world **Blender +Y (three −Z)**, so they are coplanar and camera-facing.
- In three.js a belt tilt of θ about Blender +Y becomes `rotation.z = −θ`: Cube.009 → −15.32°, Cube.010 → +24.68°.

**Hero bounding volume** [D]: rings extend to 2.42 m (2.53 m with ring A split), shards to about 3.8 m from the belt pivot. A bounding sphere of about 3.9 m around the orb is enough.

**Real-time triangle budget at the stored subdivision** [F]:

| part | tris |
|---|---|
| rings | 4,192 |
| orb | 5,120 |
| shards | 864 |
| **total** | about **10.2k** |

You can afford SubD L2-L3 or displacement on the web.

### 2.2 Ring cross-sections in metres, world scale [F]
Measured from the evaluated (SubD L1) mesh at mid-span. r is the distance from the ring axis; a is the offset along the axis (Blender Y, three −Z).

| ring | cage rectangle (r_in-r_out × axial) | evaluated octagon (r, ±a) vertices | r_in / r_out | radial width | axial depth | centre r |
|---|---|---|---|---|---|---|
| C (027) | 1.0312-1.2640 × ±0.2402 | (1.0342, 0) (1.0632, ±0.1601) (1.1403, ±0.2202) (1.2174, ±0.1601) (1.2463, 0) | 1.034 / 1.246 | 0.212 | 0.440 | 1.140 |
| B (026) | 1.2890-1.5800 × ±0.3002 | (1.2928, 0) (1.3289, ±0.2001) (1.4253, ±0.2752) (1.5217, ±0.2001) (1.5578, 0) | 1.293 / 1.558 | 0.265 | 0.550 | 1.425 |
| A (025/032) | 1.6113-1.9750 × ±0.3753 | (1.6160, 0) (1.6612, ±0.2502) (1.7817, ±0.3440) (1.9021, ±0.2502) (1.9473, 0); r_max 1.960 at the creased ends | 1.616 / 1.947 | 0.331 | 0.688 | 1.782 |
| 4 (028-031) | 1.9738-2.4195 × ±0.4597 | (1.9796, 0) (2.0350, ±0.3065) (2.1826, ±0.4214) (2.3302, ±0.3065) (2.3855, 0) | 1.980 / 2.386 | 0.406 | 0.843 | 2.183 |

[D] Centre-radius ratios are 1.250, 1.250 and 1.225, and the depth ratios match: the rings are scaled copies. The SubD-smoothed rectangle becomes a pointed octagon, a "lens" with its depth about 2.08× its width.

Fragments: the quarters and halves have creased end-cap edges (crease 1.0), giving flat cut faces. The full rings have no creases.

[F] `Circle.008`, found only in the GLBs, is the **full, un-split, unscaled ring 4** at the world origin (outer radius 1.2078 local = 2.3855/1.975). It is a prototype that no longer exists in the .blend.

### 2.3 Shards (both belts use the identical local mesh) [F]
- Each crystal has 26 vertices and 32 faces (16 tris + 16 quads): an elongated faceted bipyramid.
- Sizes (long × mid × short, metres):
  - 7 crystals: 0.837 × 0.223 × 0.203
  - index 0: 0.586 × 0.156 × 0.142 (0.70×)
  - index 5: 0.474 × 0.126 × 0.115 (0.566×)
- Radius from the belt pivot: 3.355-3.367 m.
- Distance to the orb centre: 3.16-3.55 m.

**In-belt angle φ.** 0° is belt-local +X, and +90° is Blender +Y (away from the camera) = three −Z. Position is `R(n, φ)·(+X_belt)·r`.
- The crystals sit at φ = −167.29, −143.34, −119.35, −47.19, −0.12, 48.00, 72.22, 96.30 and 120.37°.
- There are two empty 72° gaps, centred at −83.3° (straight toward the camera, so the orb is never covered in the stored pose) and at 156.5° (back-left) [D].

**Long-axis orientation** [F]:
- shards 0, 1, 6, 7, 8: about tangent (|dot| 0.80-0.89)
- shards 2, 3, 4: 0.788 radial and 0.616 along the normal
- shard 5: along the normal (0.981)

Centroids and orientations in three.js coordinates (generated by `fx_writer\shard_table.py`) [D]:

Cube.009 (belt normal three (0.26429, 0.96444, 0)):

| idx | φ° | r m | long×mid×short | centroid three | long axis three | quat three (x, y, z, w) of principal frame |
|---|---|---|---|---|---|---|
| 5 | −167.29 | 3.355 | 0.474×0.126×0.115 | (−3.147, 3.846, −8.202) | (0.136, 0.980, 0.147) | (0.7408, 0.6211, 0.2151, 0.1385) |
| 6 | −143.34 | 3.358 | 0.837×0.223×0.203 | (−2.588, 3.692, −6.935) | (0.856, 0.126, 0.501) | (0.6232, −0.1559, 0.2182, 0.7347) |
| 7 | −119.35 | 3.358 | 0.837×0.223×0.203 | (−1.577, 3.420, −6.014) | (0.816, 0.235, 0.528) | (0.8675, −0.0023, 0.3034, 0.3943) |
| 8 | −47.19 | 3.367 | 0.837×0.223×0.203 | (2.215, 2.376, −6.470) | (0.720, 0.400, −0.567) | (0.7264, 0.3588, −0.1051, 0.5767) |
| 0 | −0.12 | 3.367 | 0.586×0.156×0.142 | (3.257, 2.093, −8.933) | (−0.002, 0.467, −0.884) | (−0.7041, −0.2776, 0.6509, 0.0586) |
| 1 | 48.00 | 3.363 | 0.837×0.223×0.203 | (2.180, 2.386, −11.439) | (−0.236, 0.612, −0.755) | (−0.4515, 0.0554, 0.7842, 0.4220) |
| 2 | 72.22 | 3.358 | 0.837×0.223×0.203 | (0.998, 2.709, −12.137) | (0.395, 0.530, −0.750) | (−0.3731, 0.2601, 0.4847, 0.7471) |
| 3 | 96.30 | 3.358 | 0.837×0.223×0.203 | (−0.346, 3.077, −12.277) | (−0.079, −0.617, 0.783) | (0.5635, −0.6989, 0.2262, 0.3779) |
| 4 | 120.37 | 3.358 | 0.837×0.223×0.203 | (−1.628, 3.428, −11.837) | (−0.221, 0.699, −0.680) | (0.6200, 0.6174, −0.4791, 0.0694) |

Cube.010 (belt normal three (−0.41748, 0.90869, 0)):

| idx | φ° | centroid three | long axis three | quat three (x, y, z, w) |
|---|---|---|---|---|
| 5 | −167.29 | (−2.989, 1.613, −8.202) | (−0.526, 0.838, 0.147) | (−0.0566, −0.2495, 0.8370, 0.4837) |
| 6 | −143.34 | (−2.462, 1.853, −6.935) | (0.575, 0.647, 0.501) | (0.6389, 0.0667, 0.4563, 0.6158) |
| 7 | −119.35 | (−1.512, 2.295, −6.014) | (0.474, 0.705, 0.528) | (0.8159, 0.2946, 0.4199, 0.2667) |
| 8 | −47.19 | (2.064, 3.933, −6.470) | (0.295, 0.770, −0.567) | (0.5598, 0.5856, 0.0985, 0.5779) |
| 0 | −0.12 | (3.044, 4.387, −8.933) | (0.302, −0.357, 0.884) | (−0.6317, −0.1675, −0.5667, 0.5017) |
| 1 | 48.00 | (2.030, 3.918, −11.439) | (−0.574, 0.317, −0.755) | (0.1283, 0.8812, 0.1024, 0.4433) |
| 2 | 72.22 | (0.917, 3.406, −12.137) | (0.038, −0.660, 0.750) | (0.7110, −0.5363, 0.4395, 0.1168) |
| 3 | 96.30 | (−0.349, 2.824, −12.277) | (−0.336, 0.523, −0.783) | (−0.3418, 0.2778, 0.7685, 0.4641) |
| 4 | 120.37 | (−1.557, 2.269, −11.837) | (−0.619, 0.393, −0.680) | (−0.2291, 0.4265, 0.7922, 0.3715) |

(Cube.010's r and dimensions per index are the same as Cube.009's.)

### 2.4 Environment and everything else [F]
Locations are object origins. "bbox" is the evaluated world bounding box in Blender coordinates. Three.js location = (x, z, −y).

| object | role | base → evaluated tris | location Blender (x, y, z) | rotation / scale | world bbox (Blender) | material; modifiers |
|---|---|---|---|---|---|---|
| Plane.011 | **near water** (64×64 grid, 0.4647 m spacing, 29.74 m square) | 4096 quads → 131,072 tris | (0, 0, 0) | 0 / 1 | x ±14.87, y ±14.87, z 0-0.173 (frame 1) | Procedural Water Surface; **Wave** → SubD L2 → Smooth by Angle |
| Plane.013 | **far water** (64×64, 44.62 m square) | 4096 → 131,072 | (0, 34.2286, −0.1058); mesh lies at world z **+0.00174** | 0 / 1 | x ±22.31, y 11.92-56.54 | same material; SubD L2 (no wave). Overlaps Plane.011 for y 11.92-14.87 and sits 1.7 mm higher |
| Plane.014 | far snow shore / ground strip (horizon band) | 1748 → 3496 | (6.271, 50.154, 0) | 0 / 1 | x −70.0-58.9, y 39.1-93.9, z −2.1-0.1 | Snow Ground |
| Plane.015 | **iceberg** (right of hero) | 2968 → 23,616 | (13.063, 55.029, 0.080) | 0 / 0.598 | x 6.2-19.5, y 50.7-59.7, z −0.50-**5.194**; summit (17.965, 54.523, 5.194) | Snow Ground; Displace (legacy Voronoi "Texture": Chebychev, w1 1.0, w2 1.2407, noise scale 0.29; strength 4.7, mid 0.5, normal, vertex group "Ice crush") → SubD L1 → Smooth by Angle |
| Retopo_Plane.012 | **largest near ice floe**, foreground right, under the hero | 10,105 → 20,208 | (6.600, 1.887, 0.118) | 0 / 1 | x 0-9.78, y −2.50-11.74, z −0.11-0.23 | Snow Ground; Smooth by Angle |
| Retopo_Plane.007 | ice floe, mid-left | 10,105 → 20,208 | (−10.939, 21.629, 0.118) | z −97.11° | x −14.6 to −1.2, y 17.7-28.2 | Snow Ground |
| Retopo_Plane.005 / .006 | big far floes, right / left | 3574 → 7148 each | (18.673, 41.181, 0.273) / (−22.010, 42.717, 0.181) | .006 z 103.48° | x 10.9-31.1, y 32.8-52.3 / x −32.8 to −12.9, y 33.9-55.5 | Snow Ground |
| Retopo_Plane.008 / .010 | small floes | 1064 → 2128 each | (10.224, 41.077, 0.273) / (−13.075, 34.838, 0.273) | .010 z 85.57° | — | Snow Ground |
| Retopo_Plane.009 / .011 | small floes | 269 → 536 each | (16.273, 31.774, 0.273) / (−3.333, 40.151, 0.273) | .011 z 85.57° | — | Snow Ground |
| rock_big_3.004 / 3.005 | snowy foreground rocks, left | 8000 each | (−4.529, 0.981, −0.500) / (−5.646, 4.671, −0.500) | scale (9.045, 7.509, 7.509) | x −6.9 to −2.1 / −8.0 to −3.0 | Snow Ground |
| rock_big_4.003 / .004 / .005 | snowy rocks: right-mid, near-right, left | about 8000 each | (7.062, 8.046, −0.284) / (3.469, 3.186, −0.068) / (−6.483, 6.531, −0.068) | non-uniform scale | — | Snow Ground |
| rock_big_1.001, rock_medium_3.002/.003 | near rocks, bottom centre-left | 7894-8000 | (−1.927, 1.437, −0.226) / (1.703, 1.344, −0.061) / (1.236, 1.392, −0.061) | — | — | Snow Ground |
| rock_big_2.002 / 2.003, rock_medium_1.001 / 2.001 | rocks (moss-rock scans) | 7928 / 9826 / 8000 | (16.699, 47.098, 1.400) / (9.191, 28.985, 0.168) / (4.470, 8.609, −0.208) / (−2.330, 2.021, −0.075) | — | — | **Rock** (texture remapped to near-white) |
| Rock.005-.009 | small **dark** procedural rocks, bottom centre (closest to the camera) | 16 quads → 8192 tris each ("Geometry Rock" GN: subdivide + Voronoi/noise displace) | y 0.3-2.3, z ≈ −0.4 | — | — | **Rock Material** (Procedural Rock Mat, near-black) |
| Object_2.008 | **left mountain** (snowy) | 275,812 → 524,288 | (−56.397, 94.881, −3.648) | z 187.29° / 4.728 | x −109.3 to −3.5, y 42-148, top z 14.557 at (−30.726, 105.238) | Material.003 (mesh shared with .010) |
| Object_2.009 | far mountain range, centre-right | 524,288 | (38.948, 184.710, −11.344) | z 62.27° / 5.347 | x −33-111, y 112-257, top 9.25 | Material.003 |
| Object_2.010 | far mountain, right | 524,288 | (103.602, 247.123, −11.983) | z 57.67° / 4.728 | x 38-169, y 182-312, top 6.22 | Material.003 |
| **gfsw.001** | **Not fog or a cloud sea.** A BlenderKit photo-scan "Scan Stone sand pile" mesh, textured white = **snowy mound on the right shore** beside the iceberg (screen x 1261-1439, y 388-468 at rest) | 30,050 tris | (21.955, 45.537, −0.176); parent empty "Scan Stone sand pile.001" at (21.728, 44.009, −0.176), z −127.54°, scale 1.782 | — | x 16.2-28.3, y 38.5-51.5, top 2.688 | gfsw_u1_v1 |
| **BG.001** | **sky backdrop card** (the visible sky) | 1 quad | (0, 359.138, 27.950) | X 270°, scale (−224.37, −143, −143) | x ±224.4, z −115.05 to 170.95, plane y = 359.14 | Sky; ray visibility **glossy off** |
| pngimg cloud_PNG112207.008 / .009 / .010 | cloud cards (44.56 × 15.40 m), PNG 8000×2765 | 2 tris | (21.289, 104.224, 16.458) / (−45.644, 84.937, 12.200) / (31.108, 83.952, 25.294) | X 90° / −90° (scale −15.40, mirrored) / −90° (mirrored) | z 8.8-24.2 / 4.5-19.9 / 17.6-33.0 | cloud_PNG112207.001 |
| pngimg cloud_PNG112221.004 / .005 / .006 | cloud cards, PNG 8000×3235 | 2 tris | (−15.900, 110.417, 11.588) 32.7×13.2 m / (59.667, 127.998, 8.035) 57.6×23.3 m / (−19.897, 127.998, 31.007) 57.6×23.3 m | X 90° | z 5.0-18.2 / −3.6-19.7 / 19.4-42.6 | cloud_PNG112221.001 |
| **Empty.006** | **cloud rig parent** of all 6 cloud cards (plain axes) | — | (2.694, 107.321, 25.677) | scale 4.211 | — | holds an empty action (cloud drift existed once, §4) |
| Scan Stone sand pile.001 | empty parent of gfsw.001 (BlenderKit asset root) | — | see above | — | — | — |

**Totals:** 2,108,825 evaluated triangles [F]. The three mountains are 1.57 M of them (75%), and the two water planes 262k.

**GLB-only objects** [F]:
- `Curve`: 218,156 vertices, 0.26 × 0.30 × 0.10 m at the origin, material Ice Floes.001; purpose unknown.
- `Circle.008`: the ring-4 prototype.
- `Retopo_Plane.001/.002`: in `Environment.glb` only.
- `Home - Dyson Sphere.glb` holds an older copy of the hero, in which rings A/B/C are rotated exactly 180° about X compared with this file (visually identical).

**Packed images** [F]. The cloud PNGs on disk at `E:\Retrux Hero R&D\HOME - Assets\Environment\Textures\pngimg.com - cloud_PNG1122{07,21}.png` are byte-identical in size to the packed ones (2,322,236 B and 1,460,849 B).
- Mountain textures: `Material.001_baseColor.png` and `_specularf0.png`, 4096², packed only.
- Rock and snow textures: 2048² JPEGs, packed. `rock_moss_set_02_nor_gl` is a 1024² float EXR, packed.

### 2.5 Screen coverage at the rest camera (Workbench ID pass, 1440×766, AA off) [F]
**Environment only** (hero, BG card and clouds hidden):

| object | % of frame | screen location |
|---|---|---|
| sky (BG card + clouds area) | **43.74** | — |
| Plane.013, far water | 11.68 | y 461-588 |
| Plane.011, near water | 10.85 | y 567-765 |
| Object_2.008, left mountain | 8.10 | x 0-618, y 214-453 |
| Retopo_Plane.012 | 4.35 | x 709-1439, y 582-765 |
| rock_big_3.004 | 3.02 | — |
| Plane.015, iceberg | 2.48 | x 887-1229, y 323-456 |
| Object_2.009 | 2.05 | — |
| rock_big_3.005 | 1.90 | — |
| Plane.014 | 1.63 | — |
| rock_big_4.003 | 1.61 | — |
| Retopo_Plane.007 | 1.09 | — |
| gfsw.001 | 0.94 | — |

Water in total is **22.5%** of the frame.

**With the hero:**

| hero part | % of frame | bbox (x, y) |
|---|---|---|
| rings, total | about 8.6 | — |
| Circle.026 | 1.40 | x 595-846, y 244-494 |
| Circle.025 | 1.06 | x 563-878, y 212-368 |
| Circle.032 | 1.07 | — |
| Circle.027 | 0.90 | — |
| ring-4 quarters | 0.77-0.83 each | top quarter: y 177-255 |
| orb | 1.27 | x 654-787, y 303-435 |
| shards | 0.51 | — |

The hero spans x 451-992 and y 177-561. ID images are in `blend_renders\idpass_{env,all}_*.png`.

---

## 3. Material recipes (node by node)

Defaults omitted unless relevant. Colours are linear RGB.

### 3.1 Ring and shard ice: materials `Ice Floes.004` (8 rings) and `Ice Floes blue.002` (2 belts), group `Ice.004` [F]
**Top-level tree** (both materials). It holds a `Value` node "TextureScale" = 1.0 feeding group input `Scale`, and the group node "Ice" (Ice.004) with:
- `IceColor`: rings **(0.6476259, 0.8329854, 1.0)**; shards **(0.1073555, 0.2339853, 1.0)** (cobalt)
- `DisplacementScale` = 0.05
- **There is no Material Output at the top level.**

Material settings: displacement_method **BOTH** (true displacement plus bump), backface culling off, EEVEE blend HASHED / render method DITHERED.

**Inside Ice.004** (group interface: inputs only, no outputs). Coordinates are `Texture Coordinate.Object` → `Mapping` (Point; location 0, rotation 0; Scale = group `Scale` = 1). That is mesh-local space, unscaled by the 1.975 object scale, so 1 local unit = 1.975 m.
1. **Noise A** (3D fBm, normalised): Scale 4.2, Detail 8, Roughness 0.5, Lacunarity 2, Distortion 0 → Factor `nA`.
   - `ColorRamp` (linear) **0.5422994 → 0.233, 0.7657271 → 1.0** → Principled **Roughness**. So roughness is 0.233 where nA ≤ 0.542 and rises linearly to 1.0 at nA ≥ 0.766.
   - `ColorRamp.001` (linear) **0.468 → 0.0, 0.773 → 0.222** → Bump.001 Height.
2. **Bump.001**: Strength 0.2, Distance 1.0, Filter Width 1.0, Normal = geometry → output feeds **Bump.Normal**.
3. **Noise B** (3D fBm, normalised): Scale 4.0, Detail 8, Roughness 0.8, Lacunarity 2 → **Bump** Height. Bump has Strength 0.06, Distance 1.0 and Normal = Bump.001 output. Bump.Normal → Principled **Normal**.
4. **Voronoi** (3D, F1, Euclidean, Scale 5.0, Randomness 1.0, Detail 0.05, Roughness 0.3, not normalised) → **Color** → **Displacement** node (OBJECT space, Midlevel 0.5, Scale = DisplacementScale 0.05) → nested Material Output Displacement.
   - [D] Each Voronoi cell, about 0.2 local = **0.395 m**, gets a constant random height. The colour-to-float conversion uses luminance, mean 0.5, σ 0.216.
   - Offsets are ±0.025 local = **±4.9 cm** world (σ 2.1 cm) along the normal, applied to the SubD-L1 render vertices.
   - The result is the lumpy, chiseled facets.
5. **Principled BSDF** (MULTI_GGX):
   - Base Color = IceColor, Metallic 0, Roughness = ramp (0.233-1.0)
   - **IOR 1.5**, Alpha 1, **Transmission Weight 1.0**
   - Specular IOR Level 0.5, Specular Tint white
   - Subsurface weight 0 (radius 1/0.2/0.1, scale 0.05, Random Walk legacy: unused), Coat 0, Sheen 0, Emission 0, Thin Film 0
6. **Material Output (inside the group)**: Surface ← BSDF, Displacement ← Displacement.

**What Cycles renders** [F + D]:
- `material.node_tree.get_output_node()` is None for both materials, so the static analysis flagged them.
- Cycles' group sync maps the Material Output inside the group to the material output. The as-is Cycles render (`cycles_hero_asis_crop_8spp.png`) shows the full transmissive ice, matching the explicitly re-wired version (`cycles_hero_fixedmat_crop_24spp_oidn.png`) apart from noise.
- The glTF exporter does not follow it, so `Home - Full.glb` / `ring_0x.glb` export the ice as `{metallic 0, transmission 1}`, with the glTF defaults base colour white and **roughness 1.0**. Do not use the GLB ice material.

[D] **For three.js / GLSL:**
- Transmission 1, IOR 1.5, roughness from the noise map (0.233-1.0), tint = IceColor.
- Blender applies the base-colour tint at every interface, so a ray passing through gets about the tint squared: (0.42, 0.69, 1.0) for rings, (0.0115, 0.055, 1.0) for shards.
- Use object-space noise in mesh-local units so the frost moves with each ring.
- The 4 quarters share one object frame (identity rotation), as do the 2 halves, so the frost pattern runs continuously across fragments until they separate.
- Get the chiseled silhouette from per-vertex displacement on a finer mesh (Voronoi F1 cell-constant) plus the two bump layers. Baked normal maps for the ring-4 quarters exist at `E:\Retrux Hero R&D\HOME - Assets\Object and Texture EXPORT\Textures\Dyson Sphere - Ring 4\Normal 4.1-4.4.png` (made 05-24, after the .blend, not inspected).

### 3.2 Orb: `magick_ball_01.002` (Icosphere.011) [F]
Material Output: Surface ← Principled BSDF, Volume ← Principled Volume, displacement none.

**Surface (glass shell)**
- Principled (MULTI_GGX): Base Color 1, Metallic 0, **IOR 1.25**, **Transmission 0.9949091**, Alpha 1, Coat 0 (coat roughness 0), Emission 0.
- **Specular IOR Level = Fresnel(IOR 2.0)**, which is about 0.11 at normal incidence and rises to 1 at grazing angles. Reflections are therefore weak face-on and strong at the rim. [D] For IOR 1.25, F0 = 0.0123.
- **Roughness** chain, on `TexCoord.001.Object` → `Mapping.001` (identity):
  - `Noise.002` (3D fBm, **not** normalised, so signed): Scale 2.36, Detail 15, Roughness 0.6, Lacunarity 2.22 → `ColorRamp.003` (**B-spline**: 0.1709 → 0, 0.3164 → 0.0934, 0.6473 → 0) → Mix.002 A
  - `Noise.003` (3D fBm, normalised): Scale 11.06, Detail 12.4, Roughness 0.2867, Lacunarity 3.12, Distortion 0.2 → `ColorRamp.002` (0.6764 → 0, 1.0 → 0.1362) → Mix.002 B
  - `Mix.002` (MIX, factor 0.7133) → `ColorRamp.004` (0 → 0.01, 0.5273 → 1.0) → Roughness
  - [D] The result is clear glass (roughness 0.01) with faint frosty patches up to about 0.24.

**Volume (the glowing core).** p = object coordinates (mesh-local; radius 0.25 at the shell); r = |p|.
- `Mapping` (Point, Rotation Z = **frame/200 rad**, driver): pm = Rz(frame/200)·p
- `Noise.005` (3D fBm, not normalised; **Color** output): Scale 0.83, Detail 7.79, Roughness 0.1336, Lacunarity 5.59, Distortion 0.1 on pm → c5
- `Mix (Legacy).001` (MIX, factor 0.5): q = 0.5·c5 + 0.5·pm (domain warp)
- `Noise` (**4D** fBm, not normalised): **W = frame/800** (driver), Scale 7.57, Detail 4, Roughness 0.8733, Lacunarity 1.14 on q → n (signed)
- `Noise.001` (3D fBm, normalised, Detail 0, Roughness 0, Lacunarity 0, Scale 2.6) on the vector (n, n, n) → n1, a smooth 1-D function of n
- `ColorRamp` (linear tent: **0.6254545 → 0, 0.7018185 → 1, 0.7418184 → 0**) → A. A is non-zero only on thin iso-sheets of n1, which read as filaments.
- `Math` (×5.07) then `Math.001` (power −1): B = 1/(5.07·r)
- `Mix` (MULTIPLY, factor 0.8, clamp factor): M = A·(0.2 + 0.8·B)
- `Math.002` (×4.73) then `Math.003` (power 5.5): S = (4.73·r)^5.5
- `Mix.001` (SUBTRACT, factor 1, no clamp): **D = M − S**
- **Principled Volume:**
  - Density = D (Cycles clamps negative density to 0)
  - Color = Emission Color = `ColorRamp.001(D)`
  - **Emission Strength = 1000·D**
  - anisotropy 0, absorption colour black, blackbody 0
- `ColorRamp.001` (linear):

  | stop | linear RGB | colour |
  |---|---|---|
  | 0.0 | (0.0688, 0, 0.2045) | dark violet |
  | 0.3891 | (0, 0.0093, 0.2045) | dark blue |
  | 0.6618 | (0, 1.0, 0.4234) | green-cyan |
  | 0.9055 | (0.2211, 0.6979, 1.0) | sky blue |
  | 1.0 | (0.8818, 0.9879, 1.0) | near white |

- [D] S makes D negative at r ≥ 0.21 local (0.69 m world, 84% of the radius), so the plasma never touches the shell. B diverges toward the centre, so D > 1 there (r = 0.05 local gives D up to 3.4) and the colour saturates to near white.
  - With emission 1000·D the core is extremely bright and becomes a white-hot ball under AgX, with cyan-blue filaments outside the core.
  - Volume bounces are 0 in the file, so emission and extinction only, no scattered light.
- **Driver rates at 30 fps:**
  - Mapping rotation Z +0.15 rad/s (8.59°/s, 0.0239 rev/s, period 41.9 s). The pattern turns the opposite way, clockwise seen from above, about the orb's vertical axis (three +Y).
  - W rises 0.0375 per second.
  - The drivers are scripted `frame/200` and `frame/800`; each driver F-curve is identity (keys (0,0) and (1,1), linear extrapolation).
  - Neither is periodic over the 120-frame loop.
- **GLB:** exports only IOR 1.25 / transmission 0.9949, with no volume. Do not use it.

### 3.3 Water: `Procedural Water Surface` (Plane.011 and Plane.013) and group `NodeGroup` [F]
Top level: group "Group" (NodeGroup) → BSDF → Material Output Surface; no displacement. Group inputs set:
- Scale 3.0, Detail 4.0, Waviness 0.0, Strength 1.0, **Contrast 0.07** (group default 0.05)
- Roughness 0.0 (not wired inside), Liquid Color (1, 1, 1), Liquid IOR 1.33, Liquid Glow (0, 0, 0)

Inside NodeGroup:
- `TexCoord.Object` → `Noise` (3D fBm, normalised; Scale ← 3.0, Detail ← 4.0, Roughness 0.5, Lacunarity 2.0, Distortion ← Waviness 0)
- → `ColorRamp` (B-spline, 0 → black, 1 → white; about identity)
- → `Bump` (Strength ← 1.0, **Distance ← Contrast 0.07**, Filter Width 1.0) → Normal
- **Principled BSDF** (MULTI_GGX):
  - Base Color ← Liquid Color **(1, 1, 1)**, **Metallic 1.0**, **Roughness 0.03454545** (GGX alpha about 0.0012), IOR 1.33 (inactive at metallic 1)
  - Transmission 1.0 (overridden by metallic 1), Specular IOR Level 0.5, Specular Tint white
  - Emission Color ← Liquid Glow (0, 0, 0) × Strength 1.0 = none; Subsurface Burley, weight 0

[D] **Effective model:** a perfect white conductor mirror, reflectance 1.0 at every angle, Blender's F82 tint white. Do not apply water Fresnel (F0 0.02); that would make the lake far too dark.
- Normal perturbation is about N' = normalize(N − 0.07·∇h), with h = fbm(3·p_object) in [0, 1]. Features are about 0.33 m; tilts are typically 7-14°, so reflections deflect 14-28°.
- Object coordinates are world metres for Plane.011 and world − (0, 34.2286, −0.1058) for Plane.013. The noise is therefore discontinuous where the planes overlap (y 11.92-14.87), and Plane.013 is the one visible there.
- **GLB warning:** the exported water has `emissiveFactor (1, 1, 1)`, metallic left at the glTF default 1.0, and transmission 1. It would glow white. Do not use it.

**Wave modifier on Plane.011** [F] (modifier order: Wave → Subdivision L2 → Smooth by Angle):
- time_offset **−123.3** frames, speed **0.03716218** m/frame, height **0.2259753** m, width **1.358483** m, narrowness **2.362112**
- start position (x, y) = **(0.0, 8.6)** in local = world (Plane.011 at the origin, scale 1)
- use_x, use_y on (radial), cyclic on, use_normal off (moves along local Z), lifetime 0, damping 10, falloff radius 0, no texture, no vertex group

Exact formula, verified against the evaluated base grid to within 2.9 mm (which is exactly the verifier's own minfac typo) [F, D]:
```glsl
// pB = Blender (x,y) of the water point; three.js: pB = vec2(p.x, -p.z). frame f (30 fps: f = 30.0*t + 1.0)
const float SPEED=0.03716218, HEIGHT=0.2259753, WIDTH=1.358483, NARROW=2.362112, TOFF=-123.3;
float waveZ(vec2 pB, float f){
  float a = length(pB - vec2(0.0, 8.6)) - (f - TOFF)*SPEED;
  a = (a - WIDTH) - 2.0*WIDTH*trunc((a - WIDTH)/(2.0*WIDTH)) + WIDTH;   // C fmodf; GLSL mod() is WRONG here
  if (abs(a) >= WIDTH) return 0.0;                                       // zero outside the expanding front
  float x = a*NARROW;
  return HEIGHT*(exp(-x*x) - exp(-(WIDTH*NARROW)*(WIDTH*NARROW)));       // >= 0 crests only, no troughs
}
```
[D] Derived numbers:
- crest spacing 2·width = **2.717 m**
- speed 1.115 m/s at 30 fps (0.892 m/s at 24 fps)
- temporal period **73.1 frames = 2.437 s at 30 fps**
- crest FWHM 0.705 m before SubD
- front radius **R(f) = (f + 123.3)·0.03716 + 1.358**: 5.98 m at f = 1, 10.44 m at f = 121, 14.49 m at f = 230
- The front passes Plane.011's far edge (y = 14.87) by frame 9 and reaches the camera's ground point (y = −11.8) at frame about 389.
- SubD L2 smoothing of the 0.4647 m grid reduces the peak to **0.173 m** (−23%, evaluated at frame 1); scale by about 0.77 or blur the profile.
- Geometric waves exist only on Plane.011, the 29.7 m square around the origin.
- Not periodic over 120 frames (120/73.1 = 1.64 periods).

**Drivers** [F]: there are only two in the file, both on the orb material (§3.2). The water has none; its only animation is the Wave modifier's built-in frame dependence.

### 3.4 Snow Ground (19 objects: floes, iceberg, shore, white rocks) [F]
- `TexCoord.UV` → `Mapping` (Scale 2, 2, 2) feeds every image.
- **Mask:** `Noise` (3D fBm, normalised, Vector unlinked = Generated coordinates; Scale 1, Detail 2, Roughness 0.5, **Lacunarity 10.1**) → `ColorRamp` (0.5227 → 0, 0.5727 → 1).
- **Base:** Mix(rock-69_diffuse, stone-71_diffuse; mask) → `ColorRamp.001` (linear) **0 → (0.3966, 0.4631, 0.4944), 1 → (0.6204, 0.8345, 1.0)**. The texture luminance is remapped to a cold blue-white.
- **Roughness:** Mix(rock-69_height, stone-71_smooth; mask).
- **Normal:** NormalMap (tangent, strength 1) of Mix(rock-69_normals, stone-71_normals; mask).
- **Displacement:** Mix(rock-69_height, stone-145_height) → Displacement (Object space, mid 1.0, **scale 0**), so no displacement.
- **Principled** (GGX): **Metallic 0.2**, **Specular IOR Level 0.2**, IOR 1.45, emission black.
- The textures are 2048² JPEGs (packed).

### 3.5 Rocks [F]
- **Rock** (rock_big_2.002/.003, rock_medium_1.001/2.001):
  - UV → Mapping (identity) → `rock_moss_set_02_diff` (270² JPEG) → `ColorRamp` **0 → 0.8061, 0.15 → 1.0** → Base Color, i.e. near-white snowy rock.
  - The roughness and normal-map nodes exist but their **outputs are unlinked**, so roughness is a constant **0.5** and there is no normal map.
  - GGX, IOR 1.45, emission black.
- **Rock Material** (Rock.005-.009) → group **Procedural Rock Mat** with Scale (1, 1, 1), Rock Color 1 **0.016**, Rock Color 2 **0**, Edge Light **0.0605**, Noise Detail 15, Roughness 0.8, "Rougness value" 1.0, "Nomal" **0.5**. Inside, on Object coordinates → Mapping (Scale input):
  - **Masks:** `Noise` (Scale 55, Detail ← 15, Roughness ← 0.8) → ramp 0.4591-0.5227; `Noise.001` (Scale 10) → ramp 0.3773-0.8 → `Mix` (factor 0.7) = Mr.
  - **Base:** Mix(RockColor1, RockColor2; Mr) mixed with Edge Light by `Mix.002` (LINEAR_LIGHT, factor 0.4). Mix.002 combines Pointiness → ramp 0.5136-0.5818 with Noise.002 (Scale 9.5, Detail 15, Roughness 0.63) → ramp 0-1.
  - **Roughness:** HSV(Value ← 1.0) of ramp.004 (0 → 0.6514, 1 → 1.0) of Mr, i.e. 0.65-1.0.
  - **Normal:** Bump (Strength ← 0.5, Distance 1, Height = Noise.003 at Scale 10, Detail 15) → Bump.001 (Strength 0.3, Height = Mr).
  - The result is near-black, rough rocks with pointiness edge highlights.

### 3.6 Mountains and mound [F]
- **Material.003** (Object_2.008/.009/.010):
  - `Material.001_baseColor.png` (4096², sRGB) → `ColorRamp` **0.3227 → (0.0408, 0.0479, 0.0587), 0.7136 → 1.0** → Base: dark blue-grey rock and white snow.
  - `Material.001_specularf0.png` alpha × 1.0 → Specular IOR Level.
  - Roughness 0.5, IOR 1.5.
- **gfsw_u1_v1** (gfsw.001):
  - 2048² diffuse → `ColorRamp` **0 → 0.0592, 0.15 → 1.0** → Base, i.e. almost all white.
  - NormalMap (strength 1) of the 2048² normal map.
  - GGX, Roughness 0.9293, IOR 1.45, **Specular IOR Level 0**.

### 3.7 Clouds, sky card and world [F]
- **pngimg.com - cloud_PNG112207.001** (3 cards): Image (Linear, CLIP, UV) **Alpha** → ColorRamp (0 → 0, 1 → 1) → Alpha. Base Color **0.8 grey (not the image colour)**, Roughness 0.5, **Emission white × 2.0**.
- **pngimg.com - cloud_PNG112221.001** (3 cards): Image **Color** → Base Color, Image Alpha → Alpha, **Emission white × 2.0**.
- Both are double-sided. Cycles alpha is stochastic and needs transparent bounces (8).
- [D] Cloud radiance is about 2.0 + 0.8·E/π. They are brighter than the sky card (luminance about 1.08), so they read as white.
- **Sky** (BG.001): Principled Base 0.8, Roughness 0.5, **Emission (0.1659122, 0.2714285, 0.5516212) × 4.0**. The object's glossy ray visibility is off. The GLB value (0.3008, 0.4921, 1.0) × 2.2065 is the same colour.
- **World:** see §1.4.

### 3.8 GLB material reliability (for anyone tempted to use `Home - Full.glb` / `Environment.glb`) [F]
The exporter drops ColorRamps, groups and volumes:
- Ice: white, roughness 1.
- Orb: no volume.
- Water: emissive white.
- Snow Ground, Rock, Material.003 and gfsw: the raw, un-remapped textures (darker, wrong hue).
- Correct: Sky and clouds only.

Geometry, transforms and UVs in the GLBs are fine. Rebuild all materials from §3.

---

## 4. Animation: what actually moves

### 4.1 In the .blend [F]
| item | finding |
|---|---|
| actions | 18, all empty (1 layer, 1 KEYFRAME strip, 1 channelbag with 0 groups and 0 F-curves, frame_range [0,0]). Each is still assigned to a slot on its user, which shows what **was** animated: rings A halves (CircleAction.009/.010), B (Circle.001Action.007), C (Circle.002Action.007), ring-4 quarters (Circle.003Action.013-.016), both shard belts (Cube.002Action.009/.010), the cloud rig `Empty.006` (Empty.002Action.001), all 6 cloud cards (…Action.003/.005/.006/.007/.008/.009) and the orb node tree (magick_ball_01Action.002) |
| evaluated motion, frames 1-250 every 2nd frame | range 0.0 in location, rotation and scale for all 11 hero objects, Empty.006 and the 6 clouds |
| drivers | 2, on the orb material: `nodes["Mapping"].inputs[2][2] = frame/200` and `nodes["Noise Texture"].inputs[1] = frame/800` |
| modifiers depending on time | Wave on Plane.011 only |
| constraints / NLA / particles / simulation caches | none |
| timeline | 1-250 at 24 fps. [I, high] This is not the production timing: the GLB exported two days earlier from the same lineage samples at 1/30 s, and both videos are 30 fps |

[I, high] The keys were cleared, not lost when Blender 5.2 read the file. The channelbags exist but are empty, groups are gone too, and the GLB from 04-18 already lacked tracks for everything except ring A and Circle.008.

### 4.2 Baked tracks in `Home - Full.glb` (glTF I/O 4.4.56, LINEAR, 1 key per frame, t = frame/30) [F]
Shown in Blender and three.js:
- **Circle.025 (ring A upper half) translation, frames 230-463.** Only +Z_b moves (three **+Y**); x and y are constant at the orb centre.

  | frames | time | motion |
  |---|---|---|
  | 230 → 270 | 7.667-9.000 s | open to **+0.47 m**: about linear 0.0128 m/frame, ease-out over the last 6 frames |
  | 270 → 290 | | hold |
  | 290 → 300 | 9.667-10.000 s | close, ease-in, profile 0.47 / 0.468 / 0.463 / 0.452 / 0.436 / 0.410 / 0.371 / 0.309 / 0.198 / 0.037 / 0 |
  | 300 → 350 | | hold closed |
  | 350 → 365 | 11.667-12.167 s | snap open: 0, 0.001, 0.003, 0.008, 0.017, 0.030, 0.053, 0.103, **0.371**, 0.418, 0.440, 0.454, 0.462, 0.467, 0.469, 0.47 (peak speed 8.05 m/s at f 357-358) |
  | 365 → 443 | | hold open |
  | 443 → 463 | 14.767-15.433 s | snap closed: 0.47 … 0.387, **0.235**, 0.083 … 0 |

- **Circle.032 (lower half):** the same frames and shapes with **−0.57 m** (three −Y); peak speed 9.76 m/s.
- [I, high] **Timeline reconciliation.** The `State 2 to 5.mp4` frame registration (`video\work\register_dense.txt`) shows zoom-ins starting at video frames 231 (t 7.70 s, back to rest by 9.9 s) and 336 (t 11.2 s, back by 15.5 s). Those match the split segments, so the GLB's frame numbers are the state video's frames (±1).
  - The split is the ring-A response to press-and-hold, keyed together with the camera zoom.
  - The earlier events in the same video have **no** split track: a pan at F18-F108 (0.6-3.6 s, up to −133 px far-layer shift) and a first zoom at F138-F196 (4.6-6.5 s, scale up to 1.16 in the near layer).
  - The ring-4 "shatter" visible at t = 13 s (`video_frames\s25_t13.000.png`) has **no surviving data** (its actions are empty and it is not in the GLB). Measure it from the video.
- **Circle.008 rotation, frames 1-52** (prototype full ring 4 at the origin, not in the .blend). Blender Euler XYZ goes linearly from (90°, 0, 0) to (517.795°, 0, 360°):
  - X: **+8.388°/frame = 251.64°/s = 0.699 rev/s**
  - Z: **+7.059°/frame = 211.76°/s = 0.588 rev/s** (exactly 360° in 51 frames)
  - composite angular speed 328.77°/s
  - In three.js: `rotation.order = 'YZX'`, rotation.x = 90° + 251.64°/s·t, rotation.y = 211.76°/s·t (Blender X → three X, Blender Z → three Y).
  - [I] This is a test spin, much faster than anything in the videos. Do not use it for the hero.
- `Home - Dyson Sphere.glb` (04-16) has only the same Circle.008 track.

### 4.3 Procedural time-based motion (exact, from the file) [F, D]
| what | rate at 30 fps | axis (three.js) | loopable in 120 frames? |
|---|---|---|---|
| orb plasma noise-space rotation (Mapping Z = frame/200 rad) | 0.15 rad/s = 8.59°/s = 0.0239 rev/s; the pattern appears to turn −8.59°/s | orb local Z = world vertical = three +Y | no (0.6 rad per 120 frames) |
| orb 4D noise W (frame/800) | +0.0375 per second | — | no |
| water ripples (Wave) | crests out at 1.115 m/s, period 2.437 s, front +1.115 m/s | radial from three (x, z) = (0, −8.6) on y = 0 | no |

### 4.4 Rig conventions and what must come from the video
- **Pivots** [F]:
  - all rings and the orb: three (0, 3.053807, −9.137568)
  - both shard belts: three (0, 2.946589, −8.940067), 0.1975 m nearer the camera and 0.107 m lower than the orb
  - clouds: `Empty.006` at three (2.694, 25.677, −107.321), scale 4.211
- **Ring spin axes and periods:** cannot be recovered from Blender data. [I, medium] The rig's own rotation channel was Euler X. Every stored ring rotation is pure X, the two GLB exports differ by exactly 180° about X for rings A/B/C (0° for ring 4), and in loop t0 ring 4 is seen edge-on, i.e. 90° about X from its stored pose.
  - In three.js, Blender X = three X, the horizontal axis in the image plane.
  - The Figma frame and loop t = 0.5 s show tilts about other axes too, so combined axes are likely.
- **Shards** [F by visual comparison, from my 6 single-frame crops of `Default Loop.mp4` (hero crop x 460-980, y 160-560), saved in `fx_writer\frames\`]:
  - Shard positions are visually identical at t = 0.0 and 2.0 s, and at 1.0 and 3.0 s, but differ at 0.5 s.
  - Loop t = 0 shard positions match the stored .blend pose (compared with `idpass_all_rest.png`), for example (447-455, 280-315), (900-922, 252-305) and (905-955, 412-442) px. The rings at loop t = 0 do **not** match the stored pose.
  - [I] So the belt rotation phase is 0 at loop frame 1, and the stored ring rotations are not loop frame 1.
  - [D] The 9-crystal layout has no rotational symmetry (two 72° gaps), so a rigid belt that repeats every 2.0 s must turn a whole number of turns per 2.0 s.
  - [I, medium] The simplest consistent answer is **1 turn per 2.0 s = 0.5 rev/s about each belt normal**: Cube.009 normal three (0.264, 0.964, 0) and Cube.010 normal three (−0.417, 0.909, 0). That is about 10.6 m/s tangential at 3.36 m (about 28 px/frame at the orb distance), consistent with the video-agent optical-flow p90 of 22.7 px/frame.
  - Direction (sign) is unknown.
- **Ring poses in the loop** [F, visual]:
  - t = 0: ring 4 edge-on as a horizontal band; ring A face-on (radius about 153 px)
  - t = 0.5: a tall ellipse (a ring rotated about the vertical axis) plus a horizontal ring
  - t = 1.0 ≈ t = 3.0: band plus a diagonal ring
  - t = 2.0: band plus a smaller face-on ring
  - Ring rates must come from video tracking (the video agent).
- **Loop lengths** [F, D]:
  - `Default Loop.mp4` is 4.033 s = 121 frames at 30 fps. Comparing hero crops, t = 0 vs 4.0 gives PSNR 28.1 dB, against 27.3 dB between adjacent frames. [I, high] So it is a 120-frame (4.0 s) loop whose last frame repeats the first.
  - `State 2 to 5.mp4` is 16.67 s = 500 frames.
  - The .blend range 1-250 at 24 fps is not meaningful.
- **Clouds:** all 7 cloud-related objects had actions (drift), all keys gone, and nothing is in the GLB. Measure drift from the video or design it.

---

## 5. Cycles timing facts and plate-render recipe

### 5.1 Measured (Blender 5.2.3, CPU i7-7660U, 2 cores / 4 threads at 2.5 GHz, 8 GB RAM, Iris Plus 640) [F]
Unless noted, these runs used threads AUTO (= 4), texture limit 2048, clouds hidden, tile 512 and persistent data off.

| test | resolution / region | settings | wall time |
|---|---|---|---|
| D0 world-only equirect (from the orb, red +X marker present) | 512×256 | 16 spp | 0.77 s |
| D1 hero crop, as-is | 288×245 region of 720×383 | 8 spp | 17.54 s |
| D2 hero crop, ice re-wired | same | 24 spp + OIDN | 29.34 s |
| D3 env plate (hero hidden, BG/clouds camera-invisible / hidden, Wave off, film transparent) | 480×256 | 16 spp | **5.87 s** |
| D4 env plate | 480×256 | 64 spp | **18.13 s** |
| D5 env plate | 480×256 | adaptive 0.01, max 512, OIDN (240 s limit) | **184.09 s** (never converged) |
| Workbench ID passes | 1440×766 | flat, AA off | 0.58-2.4 s each |
| EEVEE (`eevee_scene_diag.json`) | — | 4 variants incl. flat world | **all-black output**; first render 77.6 s. A factory-cube probe renders, so the problem is scene-specific. Do not use |

**RAM:** free RAM was 2099 MB after the file loaded and fell to a minimum of 1390 MB during the Cycles tests. That is about **0.71 GB transient** at ≤ 720×383; per-process RSS was not captured. Today, with the lead's Blender running, about 1.17 GB is free.

[D] Throughput model:
- marginal environment cost **2.08 µs per pixel-sample at 4 threads**, fixed overhead about 1.8 s
- at 2 threads, assume about 0.70× throughput, so about **3.0 µs per pixel-sample**
- the hero is about 5× costlier per sample (glass, volume, 12 transmission bounces), but it is not in the plates

### 5.2 Plate A: environment plate from the rest camera (recommended)
- **Camera:** the solved rest pose (§1.6). Sensor 36 mm, HORIZONTAL fit, **lens 36.390 mm** (= 1690.122·36/1672), **shift_x 0.0, shift_y +0.03409** (= 57/1672), clip 0.05-5000 m.
- **Resolution 1672×958.**
  - Margins: **L 116 px (8.06%), R 116 px, T 153 px (20.0%), B 39 px (5.09%)**. These cover the measured overscan needs from `overscan_calc.json` with headroom: s25 t2.5 needs L 6.0 / R 6.94 / B 3.65 %, t8.5 needs T 0.88 %, and the t13 dolly needs T 18.9 %.
  - The rest frame is exactly plate pixels x 116-1555, y 153-918 (measured from the top).
  - Projection in three.js, from the rest camera's NDC: **U = (836 + 720·ndc.x)/1672, V = (422 + 383·ndc.y)/958**, with V measured from the bottom.
  - [I] Camera projection from the rest position shows parallax and disocclusion errors for near and mid objects (floes and rocks within 50 m) during the t13 dolly. Project onto decimated proxy meshes, or cross-fade to a second plate.
- **Visibility:**
  - `hide_render = True`: the 11 hero objects (Circle.025-.032, Cube.009, Cube.010, Icosphere.011). Hidden rather than camera-invisible, so they leave no static shadows or reflections of the hero.
  - `hide_render = True`: the **6 cloud cards**. They are live, and this saves about 190 MB of 8000-px image buffers.
  - `BG.001.visible_camera = False`, so the sky is alpha 0. Keep it for diffuse and transmission light; its glossy visibility is already off.
  - Keep both water planes, with **`Plane.011.modifiers["Wave"].show_render = False`** for calm water.
- **Film:** `film_transparent = True`, `film_transparent_glass = False`.
- **Sampling:**
  - **128 spp fixed** (`use_adaptive_sampling = False`; 0.01 does not converge here)
  - OIDN, RGB_ALBEDO_NORMAL, prefilter ACCURATE, quality HIGH; seed 0
  - keep the file's light paths (12/4/4/12/0/8, caustics on, clamp indirect 10, filter glossy 1.0) so the look matches; they do not dominate cost
- **Performance:** `device = 'CPU'`, `threads_mode = 'FIXED'`, `threads = 2`, `texture_limit_render = '2048'` (as tested), `use_auto_tile = True`, `tile_size = 512`, `use_persistent_data = False`, `time_limit = 1500` as a safety cap.
- **Output:** OpenEXR half (`color_depth '16'`), RGBA, DWAA or ZIP. This is scene-linear; let three.js apply AgX. If file size matters, ship it as RGBM/RGBE or KTX2-HDR rather than an AgX-baked PNG, so the live layers composite in the same space.
- **Optional RAM savers, no visual change at plate distance:**
  - turn off the Subdivision modifier on the flat Plane.011 and Plane.013 (−262k tris) [I, low risk]
  - add Decimate 0.25 to Object_2.008/.009/.010 (−1.18 M tris, about −150-200 MB BVH) [I]
  - texture limit 1024 (−about 100 MB)
- **Expected time** [D, ±30%]:
  - 128 spp: 1.602 MP × 128 × 3.0 µs ≈ **615 s render, plus about 20 s sync and about 30-60 s OIDN, ≈ 11-12 min**
  - 64 spp: about 6 min
  - half-res preview (836×479, 32 spp): about 1 min
- **Expected RAM** [D/I]: about +0.7 GB measured scene working set, plus about 0.1 GB film buffers and about 0.15 GB OIDN, on top of the base process with the file loaded. Peak Blender process about **1.1-1.4 GB**.
  - Start only when free RAM is at least 1.6 GB and no other heavy app is running (the lead's Blender, Chrome, Next).
  - Abort if free RAM drops below 0.5 GB.

### 5.3 Plate B: mirror-reflection plate (only if live water distortion is large)
- **Camera:** the mirrored rest camera, Blender (0.231839, −11.787529, **−2.903973**), Euler (**90.048457°**, 0, 0.672221°). Same lens, **shift_y −0.03409**, same 1672×958.
- **Region:** render only the border **min_y 0.60 → max_y 1.0**. That region holds rest-frame rows of about 426-766 (the water) once the image is flipped. Flip vertically afterwards.
- **Visibility:** hide Plane.011 and Plane.013. Clip geometry below the water: in memory, add a Geometry Nodes modifier to every environment mesh that deletes faces with world z < 0 (Self Object → Object Info → Transform Point on Position → Compare z < 0 → Delete Geometry).
  - Otherwise the underwater skirts of Plane.014 (down to −2.1 m), the floe bottoms and the rocks occlude the reflection.
  - Hero and clouds hidden, film transparent.
- [F] In Blender, the mirror water reflects the Nishita world, not BG.001, plus the clouds. For the live water, composite the reflected sky from the world equirect (below) and live cloud reflections.
- **Cost:** 0.64 MP × 128 × 3 µs ≈ 4 min + about 1 min overhead. RAM like Plate A.
- **Cheaper alternative** [I]: reuse Plate A's calm-water pixels (they already contain the exact Cycles mirror and bump image) and distort their lookup with the live ripple normals; add the live hero reflection.

### 5.4 Plate C: clean world equirect and hero IBL probe
- **World-only, for sky IBL and sun separation:**
  - pano equirect camera at the orb centre, all objects hidden, **no marker**
  - 2048×1024, 64 spp, no denoise
  - optionally with `sun_disc = False`, adding the sun as a DirectionalLight: three dir (−0.8284, 0.3206, −0.4592), colour (1, 0.848, 0.718), intensity about 9.9 in the HDR's units
  - about 1 min, trivial RAM beyond the loaded file
- **Equirect mapping of Blender pano renders** [F]: centre column = +Y_b (three −Z), u = 0.75 = +X_b (three +X), top = +Z_b. three.js puts +X at u = 0.5, so the map is offset 90° about Y. [I] `scene.environmentRotation.y = -Math.PI/2`. Check the sign against a known direction; the red marker in the old EXR sits at +X, pixel (383.4, 127.5).
- **Hero reflection probe (optional):**
  - same pano camera, hero hidden, clouds visible, BG.001 camera-invisible (emulating glossy-invisible), calm water
  - 1024×512, 64 spp + OIDN
  - about 2 min, +about 0.2 GB (cloud images)

### 5.5 Plate D: masks
Run a Workbench ID pass at the Plate A camera: flat object colours, AA off, Standard view. The method is the one in `forensics_final.py` `id_coverage`, at about 2-3 s. It gives exact water, floe, rock and mountain masks for limiting live water to water pixels.

### 5.6 Safe run procedure for this laptop
1. One heavy job at a time. Close Chrome and Next, and make sure the lead's Blender session is finished.
2. Run:
   ```
   & "<blender.exe>" -b "E:\Retrux Hero R&D\Home - EXPORT.blend" -t 2 -P plate_A.py
   ```
   Then set the process to BelowNormal priority (`(Get-Process blender).PriorityClass = 'BelowNormal'`).
   - The script changes everything **in memory only** and **never saves the .blend**.
   - It redirects `render.filepath` and the preferences temp directory to the scratchpad.
3. Minimal script core:
   ```python
   import bpy, math
   sc = bpy.context.scene
   for n in ["Circle.025","Circle.026","Circle.027","Circle.028","Circle.029","Circle.030","Circle.031","Circle.032",
             "Cube.009","Cube.010","Icosphere.011"] + [o.name for o in bpy.data.objects if o.name.startswith("pngimg")]:
       bpy.data.objects[n].hide_render = True
   bpy.data.objects["BG.001"].visible_camera = False
   bpy.data.objects["Plane.011"].modifiers["Wave"].show_render = False
   cd = bpy.data.cameras.new("plateA"); cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36.0
   cd.lens = 1690.1218 * 36.0 / 1672; cd.shift_x = 0.0; cd.shift_y = 57.0 / 1672; cd.clip_start = 0.05; cd.clip_end = 5000.0
   cam = bpy.data.objects.new("plateA", cd); sc.collection.objects.link(cam)
   cam.rotation_mode = 'XYZ'; cam.rotation_euler = (math.radians(89.951543), 0.0, math.radians(0.672221))
   cam.location = (0.231839, -11.787529, 2.903973); sc.camera = cam
   r = sc.render; r.engine = 'CYCLES'; r.resolution_x, r.resolution_y, r.resolution_percentage = 1672, 958, 100
   r.film_transparent = True; r.threads_mode = 'FIXED'; r.threads = 2; r.use_persistent_data = False
   cy = sc.cycles; cy.device = 'CPU'; cy.samples = 128; cy.use_adaptive_sampling = False; cy.use_denoising = True
   cy.denoiser = 'OPENIMAGEDENOISE'; cy.denoising_input_passes = 'RGB_ALBEDO_NORMAL'; cy.denoising_prefilter = 'ACCURATE'
   cy.texture_limit_render = '2048'; cy.use_auto_tile = True; cy.tile_size = 512; cy.time_limit = 1500
   im = r.image_settings; im.file_format = 'OPEN_EXR'; im.color_mode = 'RGBA'; im.color_depth = '16'; im.exr_codec = 'DWAA'
   r.filepath = r"<scratchpad>\research\plates\plateA_rest_1672x958_128spp.exr"
   bpy.ops.render.render(write_still=True)   # never bpy.ops.wm.save_mainfile()
   ```

---

## 6. Open questions and risks
- Ring spin axes and rates, the ring-4 shatter trajectory, shard direction and phase, and cloud drift are not in any Blender or GLB data. They need video tracking (the video agent's `research\video\` work is ongoing).
- The rest camera depends on the ring-4 band-width constraint. If ring 4 in loop t0 is not exactly edge-on at its rest radius, the distance/focal pair moves along the degenerate family (pass 1: 26.35 m / 1815 px). The t2.5 and t8.5 solves support the current choice.
- The video's principal point and sensor fit are assumed (centre, horizontal). A 16:9-crop origin would shift v slightly.
- Blender 5.2 "SINGLE_SCATTERING" is assumed identical to the Nishita model in 4.4, which produced the videos.
- The material output inside the ice group renders in Cycles 5.2, as tested. That 4.4 behaved the same is inferred from identical code paths and the video look.
- The 2-thread throughput (0.70× of 4 threads) and the RAM peaks for 1.6 MP plates are extrapolated from small tests, not measured.
- `Ring 4.x.glb` / `Normal 4.x.png` (05-24) and `Environment\Textures\Mountain 1.png` and `stone-71_diffuse - Edit 2.png` postdate the .blend and were not inspected.

**Helper outputs from this session**, all in `C:\Users\fvldi\AppData\Local\Temp\claude\dc2ac90effee4131\570a569a-5122-4ff1-b51f-d34d42e5fde3\scratchpad\research\fx_writer\`:
- `object_table.md`
- scripts: `keys.py`, `dump_mods.py`, `glb_summary.py`, `glb_ring_pose.py`, `circle008_euler.py`, `split_segments.py`, `shard_table.py`, `object_table.py`, `eval_summary.py`, `shardflow_stats.py`
- `frames\loop_t{0.0,0.5,1.0,2.0,3.0}_hero.png`
