# A1: Environment audit for the UV-bake rebuild (replace plate projection with baked real geometry)

Written 2026-11-13 by workflow sub-agent A1. This is a read-only audit. No Blender, Chrome, node, python or ffmpeg was run, and no .blend was opened.

**Sources**
- Logs:
  - `scratchpad/blend/v2build8/proxy.stdout.txt` (the export that produced the published `public/hero/env_proxy.glb`, 1,018,176 B, 15:44)
  - `scratchpad/blend/v2build7/{plate_*.json, plate_*_s*.json, status.txt, render_*_log.txt, stitch_*.stdout.txt}`
  - `scratchpad/blend/proxy_v3/{list,v7far,rc}.stdout.txt`
- Inventories:
  - `scratchpad/blend/v2build9/inspect_v7.json` (plate_scene_v7.blend: 57 objects, UV layers, modifiers, materials)
  - `scratchpad/blend/inspect_env.json` (AABB screen boxes at the rest camera)
- Scripts in `scratchpad/pipeline/`: `prep_plate_scene.py`, `prep_v7.py`, `prep_v4b.py`, `render_plates_v3.py`, `stitch_plate_v2.py`, `export_env_v3.py`, `export_env_v4.py`, `render_v7_all.ps1`, `finalize_v7.ps1`, `test_v7.ps1`, `inspect_env_v7.py`, `raycast_plate.py`
- Research: `hero-pipeline/research/blender_forensics.md` §1-§5 and `video_choreography.md`
- Engine: every file under `retrux-web/app/hero/engine`. Line numbers below are from the files as they are today.
- Images: the published plates `plate_rest/hold/orbN/orbP.webp`, `ref_F000`, `ref_F420`, `qc/round10/q00_rest.png`, `qc/b69qc/p06_sustain.png` and `qc/holdref/sheet_hold.jpg`
- QC: `qc/round10/plan_round10.json` (T02-T06, T22)

**Conventions**
- **Axes.** Blender is Z-up. three.js (x, y, z) = (x_b, z_b, -y_b).
  - Rest camera: Blender (0.2318, -11.7875, 2.9040), three (0.2318, 2.9040, 11.7875).
  - Rest forward, three: (-0.011732, -0.000846, -0.999931).
- **"Frame px"** is the 1440x766 reference frame, with f = 1690.12 px, x from the left and y from the top.
- **"Plate px"** is a 2340x1273 plate, y from the top. The rest frame sits inside the rest plate at x 270-2070, y 191.5-1149, i.e. 1.25 plate px per frame px:
  - x_f = (x_p - 270) / 1.25
  - y_f = (y_p - 191.5) / 1.25
- **Plate projection.** All 5 plate cameras use lens 32.5023 mm, a 36 mm horizontal-fit sensor, shift_y 0.0143216 and 2340x1273. In Blender camera space (z_c < 0 in front):
  - `u = 0.5 + 0.902842 * x_c/(-z_c)`
  - `v_from_bottom = 0.5 + 1.838178 * (0.902842 * y_c/(-z_c) - 0.0143216)`
  - Check: the orb (0, 9.137568, 3.053807) projects to rest plate px (1171.4, 653.1), i.e. frame (721.1, 369.3). That is the solved orb position.
- **Distances.**
  - "near" is the closest point of the object's world AABB to the rest camera (`export_env_v4.py` L63-68). It is a lower bound.
  - "ctr" is the distance to the AABB centre (`inspect_env_v7.py` L22-26).
- **Native plate density** is ρ_N(d) = 1.25 x 1690.12 / d = **2112.65 / d texels per metre** for a surface facing the camera at distance d.

---

## 0. Key findings

1. **The GLB holds 34 meshes and 200,473 triangles.** The file is 1,018,176 B, of which 990,106 B is Draco payload.
   - The two halves of the old left mountain are exported undecimated: V2_Ridge has 29,609 tris and V2_Massif has 36,038. Together they take 257 KB of Draco data.
   - Object_2.009 and Object_2.010 are decimated from 65.6k to 16k tris each.
   - The remaining 30 meshes are floes, rocks, the iceberg, the shore strip, the mound and the sky card.
   - The proxies keep only the original UV maps (`export_texcoords=True`, `export_materials='NONE'`).
2. **No mesh has a UV layout that can be baked into as it is.**
   - Snow Ground (19 objects) uses `UVMap` for *tiled* textures (Mapping scale 2).
   - Two pairs share mesh data: `moss rock 14.002` is used by rock_big_2.002 and rock_big_2.003, and `moss rock 11.003` by rock_big_3.003 and rock_big_3.004.
   - Six rocks have non-uniform object scale: rock_big_1.001, rock_big_3.004, rock_big_3.005 and rock_big_4.003/.004/.005.
   - V2_Ridge and V2_Massif split one photogrammetry atlas (Object_2.008's).
   - Every object needs a new single-user, scale-applied, modifier-applied `BakeUV` (§2.2 R2).
3. **What a surface bake cannot reproduce from the plates** (§2):
   - the in-scatter of the volumes V2_BaseMist and V2_SummitWisp. The wisp sits in front of the **sky**.
   - the lake. It is a view-dependent mirror that reflects the **Nishita world**, not BG.001, plus the cloud cards.
   - the view-dependent specular of Snow Ground (metallic 0.2), the iceberg and the rocks.
   - the plates' render look: 64 spp, OIDN FAST, `texture_limit_render` 1024 and simplify level 3.

   Handling:
   - projected plate colour baked into UV for texels a plate camera sees
   - a colour-matched light bake elsewhere
   - engine-side fog, mist and bank (kept as they are)
   - a separate wisp card
   - live cloud cards
   - a real-time planar reflection for the lake, using a new world-only sky render
4. **Engine audit (§3).** About 75 % of `PlateEnvironment.ts` and about 45 % of `Water.ts` exist only for projection, and these parts are **DROP**:
   - the depth bakes, the 60-step occlusion fill, the PCF visibility, the rim re-projection and the 4 extra projectors with proximity weights
   - the mirror-ray length and the lake re-aim, the straight fallback, the `raised` and `plateSeenY` guards, and the plate-coverage `plateW` logic
   - the cloud plate-depth cull

   All atmosphere and grade terms are world-space and are **KEEP**: grade, chroma, near lift, toe, far haze, slope haze, fog, mist and wisps, the hold bank, the `uHold` terms and the ripple and orb glint.
   Seven region masks read plate uv or rest-plate depth. They map **exactly** onto a fixed rest-camera projection of `vWorldPos` (`uRestViewProj`) plus `zRest = dot(p - C_rest, F_rest)` (§3.7).
5. **The DOF changes the budget.** The plate is sampled at the **absolute** LOD `lodDof` (L552). That is 1.5 mips for everything farther than ~50 m at rest, and at least 1.5 for everything the hold sees.
   - On screen, far objects therefore show only 2^-1.5 = 0.35x of the plate's native density.
   - Baked textures can be far smaller than "native" for the far field. The near rocks at 11-15 m are blurred by 0.5-1.1 mips too.
   - The DOF must be re-expressed for UV textures as `textureGrad(..., dFdx(uv)*k, dFdy(uv)*k)` with `k = max(1, 2^lodDof * W_render/1800)`.
6. **Budget (§4).**
   - **Balanced (recommended):** 24.3 M texels, about **3.9 MB WebP** (range 3.0-6.1 MB), about 129 MB VRAM.
   - **Lean (today's displayed sharpness, no headroom):** 11.1 M texels, about **1.8 MB** (1.4-2.8 MB), about 59 MB VRAM.
   - **Today:** the 5 plates are 1.69 MB, plus a 1.02 MB proxy. In VRAM that is about 79 MB of plates plus about 51 MB of projector depth targets.
7. **Hard prerequisites.**
   - **Weld and repair the mesh cracks before baking.** After repair V2_Ridge still has 917 open edges, V2_Massif 1,430 and Object_2.009 2,402. With baked textures a crack still shows the farther, correctly textured surface, so the T02 specks would survive.
   - **Do not combine projection with T22 (prep_v8) geometry or material edits** unless the 5 plates are re-rendered from the edited scene. A plate projects only onto the geometry it was rendered from.

---

## 1. Inventory

### 1.1 Lineage of the scene that produced the plates and the proxies

1. `Home - EXPORT.blend` (never touched)
2. `assets_build/plate_scene.blend`: `prep_plate_scene.py` decimates Object_2.008, .009 and .010 from 524,288 to 62,913 faces (ratio 0.12)
3. `plate_scene_v7a.blend`: `prep_v7.py`
   - splits Object_2.008 by face centroid at y = 88 m into **V2_Ridge** (y < 88) and **V2_Massif**
   - turns the massif yaw 1.53° and pitch 0.34° about the rest camera, faded over 12 m from the seam
   - scales the ridge heights x0.9 left of t = -0.37..-0.30
   - adds the volumes V2_BaseMist and V2_SummitWisp
   - log: ridge 15,836 v, massif 19,481 v, seam 204 v, 11,274 ridge vertices scaled, left tip (-33.7, 104.31, 15.27)
4. `plate_scene_v7.blend`: `prep_v4b.py` with mask -0.37/-0.33, streak 0.5 and rockK 1.5 (`test_v7.ps1` L13-16) gives V2_Ridge the material `V5_Material.003` (dark rock plus snow streaks)
5. The plates: `render_plates_v3.py` renders rest, tilt, orbN, orbP and hold, 4 strips each, into `blend/v2build7/plate_<cam>.exr|png|json`, which are then stitched. The run took 07:52-09:35 (`status.txt`).
6. The proxies: `export_env_v4.py` with `near=0 full=V2_Massif,V2_Ridge tol=0.03` writes `v2build8/env_proxy.glb`, which is published by copying.

**The bake must start from a copy of `plate_scene_v7.blend`.** It is the file both the plates and the proxies came from.

### 1.2 The 34 meshes in `env_proxy.glb` (`proxy.stdout.txt`, Draco lines in encoding order)

Column notes:
- **Tris**: EXPORT.blend evaluated → plate-scene v7 evaluated, after the T-junction repair for the 4 `fix` objects → in the GLB (decimate ratio).
- **Rest box**: the AABB projected into the rest frame (`inspect_env.json`, conservative), or the forensics ID pass where marked "ID". For V2_* the box comes from the q00 capture or the plate.
- **three node**: the node name after three's `sanitizeNodeName`, which strips "." (compare `RING_NAMES` "Circle027").

| # | Object (three node) | mesh datablock | role | tris: source → v7 → GLB (ratio) | Draco v / KB | near / ctr (m) | rest box, 1440x766 | material | UV layers / notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | BG.001 (BG001) | Plane.015 | sky backdrop card, 448.7 x 286 m, plane y = 359.14, z -115..171 | 2 → 2 → 2 (1.0) | 4 / 0.2 | 370.9 / 371.8 | whole frame (sky 43.74 % ID) | Sky: emission (0.1659, 0.2714, 0.5516) x4, glossy-invisible | UVMap |
| 2 | V2_Ridge | Object_0.001 | far-left dark ridge, plus the snowy foothills in front of the massif | (part of Object_2.008's 524,288) → 28,693 → **29,609** after repair → 29,609 (1.0, FULL) | 16,576 / 112.6 | 53.9 / 98.6 | dark part x 0-185, y 278-445; foothills x 185-560, y 380-455 | V5_Material.003 (prep_v4b rock mix) | UVMap (Object_2.008 atlas); 2,983 → 917 open edges after repair |
| 3 | V2_Massif | Object_0.004 | left massif, summit ≈ frame (287, 207) | (part of Object_2.008) → 34,220 → **36,038** → 36,038 (1.0, FULL) | 21,217 / 144.0 | 85.3 / 136.6 | x 100-530, y 205-440 | Material.003: baseColor and specularF0 4096² (the plates rendered it at 1024) | UVMap (same atlas as the ridge, complementary faces); 4,784 → 1,430 open edges |
| 4 | Object_2.009 (Object_2009) | Object_0.002 | far range, centre-right, behind the iceberg | 524,288 → 62,913 → 65,634 → 16,000 (0.2438) | 9,056 / 71.4 | 124.3 / 200.3 | AABB (415, 294)-(1602, 580); seen at x ≈ 905-1100, y 320-460 and right of the iceberg; 2.05 % ID | Material.003 | UVMap; 7,359 → 2,402 open edges |
| 5 | Object_2.010 (Object_2010) | Object_0.003 | farthest range, right | 524,288 → 62,913 → 65,656 → 16,000 (0.2437) | 8,901 / 70.2 | 197.3 / 278.8 | AABB (1004, 352)-(1789, 514); seen at x ≈ 1225-1440, y 355-400 | Material.003 | UVMap; 7,361 → 1,978 open edges |
| 6 | Plane.014 (Plane014) | Plane.016 | far snow shore / ground strip, x -70.0..58.9, y 39.1..93.9, z -2.1..0.1 | 1,748 quads → 3,496 → 3,496 (1.0) | 2,122 / 9.7 | 51.0 / 78.6 | horizon band y ≈ 426-550; 1.63 % ID | Snow Ground | UVMap, automap; skirts down to z -2.1 m (under water) |
| 7 | Plane.015 (Plane015) | Plane.017 | iceberg right of the hero, x 6.2-19.5, y 50.7-59.7, z -0.5..5.19 | 2,968 q → 23,616 (Displace → SubD L1) → 23,616 → 8,000 (0.3388) | 8,947 / 70.9 | 62.8 / 68.1 | x 887-1229, y 323-456 (ID); 2.48 % | Snow Ground | UVMap, automap; modifiers Displace → SubD → Smooth by Angle |
| 8 | gfsw.001 (gfsw001) | gfsw.001 | photo-scanned "sand pile", i.e. the white mound on the right shore; x 12.7-30.9, y 35.7-54.1, z -0.36..2.69 | 30,050 → 30,050 → 6,000 (0.1997) | 10,793 / 88.0 | 49.1 / 60.7 | x 1261-1439, y 388-468 (ID); 0.94 % | gfsw_u1_v1: diffuse and normal 2048² | UvCoordinatesAndMapping; parent empty "Scan Stone sand pile.001" (scale 1.7823) |
| 9 | Retopo_Plane.005 | mesh.008 | big far floe, right; x 10.9-31.1, y 32.8-52.3 | 3,574 q → 7,148 → 5,000 (0.6995) | 2,854 / 12.5 | 45.9 / 58.2 | (1021, 451)-(1922, 501) | Snow Ground | UVMap |
| 10 | Retopo_Plane.006 | mesh.009 | big far floe, left; x -35.7..-11.9, y 32.0-56.8 | 3,574 q → 7,148 → 5,000 (0.6995) | 2,844 / 15.1 | 45.5 / 61.2 | (-451, 443)-(323, 509) | Snow Ground | UVMap |
| 11 | Retopo_Plane.007 | mesh.010 | mid-left floe, big in the hold; x -15.7..-0.3, y 17.3-28.7 | 10,105 q → 20,208 → 5,000 (0.2474) | 3,621 / 23.4 | 29.2 / 35.9 | (-128, 494)-(715, 559); 1.09 % ID | Snow Ground | UVMap |
| 12 | Retopo_Plane.008 | mesh.011 | small floe; x 6.5-10.4, y 38.4-44.2 | 2,128 → 2,128 (1.0) | 1,272 / 6.9 | 50.6 / 53.8 | (928, 461)-(1084, 488) | Snow Ground | UVMap |
| 13 | Retopo_Plane.009 | mesh.012 | small floe; x 12.7-21.6, y 28.2-34.1 | 536 → 536 (1.0) | 466 / 3.3 | 42.0 / 46.3 | (1202, 479)-(1647, 512) | Snow Ground | UVMap |
| 14 | Retopo_Plane.010 | mesh.013 | small floe; x -16.5..-10.3, y 30.9-35.3 | 2,128 → 2,128 (1.0) | 1,272 / 8.6 | 44.0 / 47.0 | (87, 470)-(357, 513) | Snow Ground | UVMap |
| 15 | Retopo_Plane.011 | mesh.014 | small floe; x -5.9..0.6, y 36.4-45.6 | 536 → 536 (1.0) | 466 / 3.3 | 48.2 / 52.9 | (527, 459)-(751, 490) | Snow Ground | UVMap |
| 16 | Retopo_Plane.012 | mesh.015 | largest near floe, foreground right under the hero; x 0-9.8, y -2.5..11.7 | 10,105 q → 20,208 → 5,000 (0.2474) | 3,648 / 23.4 | 9.7 / 17.3 | x 709-1439, y 582-765 (ID); 4.35 % | Snow Ground | UVMap; probably holds T05's ice-sheet hole, seen in the bottom overscan (verify with `raycast_plate.py`) |
| 17-21 | Rock.005, .006, .007, .008, .009 | Cube.017-.021 | small near-black procedural rocks, bottom centre and left | 16 q → 8,192 each (GN "Geometry Rock") → 3,000 (0.3662) | 1,630 (.009: 1,644) / 13.6 (.009: 14.2) | 11.9-13.1 / 12.7-13.9 | .005 (930, 726)-(1113, 826); .006 (923, 752)-(1035, 838); .007 (483, 715)-(666, 814); .008 (445, 688)-(615, 777); .009 (210, 684)-(555, 832) | Rock Material (Procedural Rock Mat) | UVMap; apply the GN modifier; .005, .007 and .008 are identical, .006 is x0.875 |
| 22 | rock_big_1.001 | moss rock 12.001 | snowy near rock, bottom centre-left | 8,000 → 3,000 (0.375) | 1,668 / 14.6 | 12.4 / 13.7 | (327, 663)-(618, 846) | Snow Ground | UVMap; scale (4.21, 3.12, 3.12) |
| 23 | rock_big_2.002 | **moss rock 14.002 (shared)** | white rock beside the iceberg; x 14.6-18.7, y 45.8-48.9, z -1.3..2.9 | 7,928 → 3,000 (0.3784) | 1,671 / 14.7 | 59.3 / 61.4 | (1152, 382)-(1269, 503) | Rock (270² moss texture remapped near-white) | UVMap; make single-user |
| 24 | rock_big_2.003 | **moss rock 14.002 (shared)** | small rock, mid-right; x 8.4-9.9, y 28.7-29.6 | 7,928 → 3,000 (0.3784) | 1,671 / 14.7 | 41.4 / 42.0 | (1072, 470)-(1146, 538) | Rock | UVMap; make single-user |
| 25 | rock_big_3.003 | **moss rock 11.003 (shared)** | snowy rock, far right; x 14.8-19.3, y 41.7-46.6 | 8,000 → 3,000 (0.375) | 1,619 / 14.0 | 55.4 / 58.5 | (1174, 439)-(1330, 491) | Snow Ground | UVMap; make single-user |
| 26 | rock_big_3.004 | **moss rock 11.003 (shared)** | big snowy foreground rock, left; x -7.0..-1.9, y -0.65..2.8, z -0.9..1.3 | 8,000 → 6,000 (0.75) | 4,780 / 37.7 | 11.4 / 14.0 | (-309, 567)-(486, 940); 3.02 % ID | Snow Ground | UVMap; scale (9.05, 7.51, 7.51) |
| 27 | rock_big_3.005 | moss rock 11.004 | snowy rock, left; x -8.3..-2.9, y 2.8-6.8 | 8,000 → 6,000 (0.75) | 3,154 / 24.9 | 15.0 / 17.8 | (-165, 553)-(406, 791); 1.90 % ID | Snow Ground | UVMap; scale (9.05, 7.51, 7.51) |
| 28 | rock_big_4.003 | moss rock 13.003 | snowy rock, right-mid, at the focus distance; x 4.6-9.2, y 5.9-10.1 | 7,997 → 2,999 (0.3751) | 3,215 / 27.6 | 18.3 / 21.0 | (1110, 523)-(1527, 701); 1.61 % ID | Snow Ground | UVMap; scale (9.15, 6.95, 6.74) |
| 29 | rock_big_4.004 | moss rock 13.004 | near-right; x 2.5-4.3, y 2.4-3.9 | 7,999 → 2,999 (0.375) | 1,735 / 15.1 | 14.6 / 15.5 | (996, 647)-(1201, 740) | Snow Ground | UVMap; scale (3.79, 2.88, 2.79) |
| 30 | rock_big_4.005 | moss rock 13.005 | left; x -8.2..-5.0, y 5.2-7.7 | 7,999 → 2,999 (0.375) | 1,735 / 15.1 | 17.9 / 19.6 | (-52, 560)-(265, 681) | Snow Ground | UVMap; scale (6.68, 5.07, 4.91) |
| 31 | rock_medium_1.001 | low.002 | rock at the focus distance; x 3.8-5.1, y 8.1-9.1 | 9,826 → 3,000 (0.3053) | 1,675 / 14.6 | 20.4 / 21.0 | (1037, 595)-(1140, 652) | Rock | UVMap |
| 32 | rock_medium_2.001 | low.003 | x -2.75..-1.8, y 1.6-2.4 | 8,000 → 3,000 (0.375) | 1,612 / 14.2 | 13.8 / 14.3 | (364, 687)-(498, 757) | Rock | UVMap |
| 33 | rock_medium_3.002 | moss rock 10.003 | x 1.2-2.3, y 0.8-1.9 | 7,894 → 3,000 (0.38) | 1,616 / 13.8 | 12.9 / 13.5 | (863, 709)-(1004, 782) | Snow Ground | UVMap |
| 34 | rock_medium_3.003 | moss rock 10.004 | x 0.6-1.9, y 0.8-1.9 | 7,894 → 3,000 (0.38) | 1,616 / 13.8 | 12.8 / 13.5 | (784, 700)-(957, 784) | Snow Ground | UVMap |

The ID pass in forensics §2.5 found these shares of the rest frame (env only): sky 43.74 %, Plane.013 11.68 %, Plane.011 10.85 %, Object_2.008 8.10 % (now ridge plus massif, roughly 3.2 % plus 4.4 %), Retopo_Plane.012 4.35 %, rock_big_3.004 3.02 %, Plane.015 2.48 %, Object_2.009 2.05 %, rock_big_3.005 1.90 %, Plane.014 1.63 %, rock_big_4.003 1.61 %, Retopo_Plane.007 1.09 % and gfsw.001 0.94 %. Every other object is under 0.94 %.

### 1.3 Objects of plate_scene_v7.blend that are not in the GLB (57 objects in total = 34 + 23)

| object(s) | role | why skipped (`export_env_v4.py` L24-28) | role in the bake rebuild |
|---|---|---|---|
| Plane.011 (mesh "Plane.013") | near water, 29.74 m square, Wave → SubD L2 | WATER | Keep in the bake scene with Wave off, as in the plates: it occludes and bounces for the bake. **Not baked.** The engine draws its own water quads (`Water.ts` L548-554). |
| Plane.013 (mesh "Plane.014") | far water, x ±22.31, y 11.92-56.54 | WATER | as above |
| 6 x `pngimg.com - cloud_PNG112207.008/.009/.010`, `…112221.004/.005/.006` | cloud cards, emission 2.0, 8000 px PNGs | CLOUDS | In the plates they were camera-invisible but glossy-visible, and their shadow and diffuse visibility were left at the defaults. Keep the same flags in the bake scene. The engine already draws them live (`config.ts` L68-75). Add them to the lake mirror pass. |
| V2_BaseMist | volume box (-190..15, 40..150, -3..8) m | V2_* | Keep in the bake scene for lighting consistency. Its in-scatter reaches the result only through plate projection and engine fog (§2). |
| V2_SummitWisp | volume box (-41.2..-31.7, 101.3..107.3, 10.07..16.27) m | V2_* | Not a surface. Render it once on its own and ship it as an RGBA card (§2). |
| 8 rings, Icosphere.011, Cube.009, Cube.010 | hero | HERO | Hide them for render in every bake, as for the plates (`render_plates_v3.py` L123-124). |
| Empty.006, Scan Stone sand pile.001 | empties: the cloud rig and gfsw's parent | not meshes | — |

### 1.4 Gotchas for bake scripts
- **Object names and mesh names differ.** BG.001's mesh is "Plane.015"; object Plane.015's mesh is "Plane.017"; object Plane.014's mesh is "Plane.016"; Plane.013's is "Plane.014"; Plane.011's is "Plane.013". The exporter's "Extracting primitive: Plane.015" line is BG.001. Always address objects by object name.
- **Make meshes single-user before adding a BakeUV:** rock_big_2.002/2.003 and rock_big_3.003/3.004.
- **Apply transforms and modifiers before unwrapping.**
  - Apply the non-uniform scales; Smart UV Project works in local space.
  - Apply the modifier stacks: Plane.015's Displace (legacy Voronoi, strength 4.7) → SubD → Smooth by Angle; Rock.005-.009's GeometryNodes; and the Smooth by Angle node modifiers.
  - Then decimate, then unwrap. The bake target must be the exact mesh that ships.
- **Underwater faces:**
  - These are never visible: the lake is opaque, and Cycles' mirror rays start above z = 0.
  - Examples: Plane.014's skirt to z -2.1, the floe bottoms (z -0.11..-0.43) and the rock bottoms (rock_big_3.004 to z -0.89).
  - Delete faces whose vertices are all below z -0.05 to save UV area.
- **Faces outside every view:**
  - The union of the engine views is about t = (x_b - 0.23)/(y_b + 11.79) in [-0.56, +0.56].
  - orbP looks left 5.64° from x +2.06; orbN looks right 4.36° from x -1.59. The engine half-HFOV is 23.07° and the plate half-HFOV 28.98°.
  - Example: V2_Ridge west of x ≈ -40 m at y < 90 m is never seen.
  - Faces that face away from every camera, including the mirrored cameras at z = -h, can get minimal UV area.
  - The engine already culls back faces (ShaderMaterial FrontSide), so deleting them is visually neutral.
- **Cracks.** The decoded v3 proxy had 2,623 open edges on V2_Ridge, 564 of them unwelded seams (T02). Welding at 0.02 m plus `export_env_v4.repair()` must run before the unwrap. Decimating after the repair can reopen cracks.
- **three's GLTFLoader renames nodes**, for example `Object_2.009` → `Object_2009`, `Retopo_Plane.012` → `Retopo_Plane012`, `rock_big_3.004` → `rock_big_3004`. Any per-object texture manifest must use these keys.

---

## 2. What the plates contain that a surface bake would not reproduce, and how to handle each

### 2.1 Element by element

| # | Plate content | Where (rest frame px) | How it entered the plate | Reproduced by a surface bake? | Handling |
|---|---|---|---|---|---|
| 1 | **V2_BaseMist in-scatter**: an emissive, anisotropic volume | the left mountain feet and far shore: a band y ≈ 380-445 under the massif and ridge; the snowfield x 220-520, y 395-440; horizon haze in the gap x 530-670, y 400-430 | `prep_v7.py` L306-316:<br>- density 0.038 x height falloff 0.2-3.2 m (±1.35 m billow from noise scale 0.05) x noise remap (0.3-0.75 → 0.05-1.6) x y-fade 48→85 m<br>- side fades x > -42.4 m and y > 122.5 m<br>- colour (0.74, 0.82, 0.96), g 0.25<br>- glow emission 1.5·density·(0.9, 0.93, 1.0)<br>- `visible_shadow` False; plates use `volume_bounces` 0 | **No.** A bake has no camera ray; only the volume's small emission reaches surfaces, as indirect light. | Camera-visible texels inherit it through projection. It then stays on the surface, but every pose (rest to hold) is south of the box (y < -3.5 vs 40-150 m), so the path error is small.<br>Hidden texels: light bake times a colour-match gain map (R6), which carries the low-frequency tint.<br>Mist in front of the sky (the horizon gap): BG.001 stays constant, and the engine's `plateMist` on the BG card (L724, no skyGate) already draws that band.<br>Keep the volume in the bake scene. |
| 2 | **V2_SummitWisp** | left of the massif summit, x ≈ 160-285, y ≈ 195-260 (visible in all 5 plates, e.g. hold plate display (350-440, 505-550)) | `prep_v7.py` L318-322: ellipsoid in a 9.5 x 6 x 6.2 m box. The box centre is Blender (-36.45, 104.31, 13.17), three (-36.45, 13.17, -104.31). Density 0.4, glow 2.3, noise 0.45. | **No.** Most of it hangs in front of the **sky**, so projecting it would put it on BG.001 at 372 m, three times too far: wrong parallax and a ghost. | Remove it from every bake target. Render it once alone (all objects holdout, transparent film) from the rest camera. Ship a **256x128 RGBA card** (≈ 8-25 KB) placed at the volume centre and facing the rest camera. Draw it after the env, like a cloud. |
| 3 | Cloud cards | sky | Camera-invisible (`render_plates_v3.py` L125-128), so absent from the plate sky; glossy-visible, so present in the plate lake | sky: n/a; lake: no | Keep the engine cards: drift (L729-746) and lighting (emission 2 + 0.8·envIrradiance, L821-823). Drop their plate-depth culls. Render them in the lake mirror pass. |
| 4 | BG.001 sky | 43.7 % of the frame | Camera-visible emitter. The top strip (`plate_rest_s3.json`) has a linear max-channel p50 of 2.451. | Yes, trivially: it is constant | **No texture.** Use a constant emissive colour, about linear (0.68, 1.13, 2.33)·k with k fitted to the s3 strip (B ≈ 2.45).<br>It must **not** appear in the lake (glossy-invisible); the mirror pass needs a sky dome of the **Nishita world**.<br>BG.001 covers every engine frustum: the orbP frame's left edge reaches x -201 m and orbN's right edge +191 m, inside ±224.4 m. It does **not** cover the plates' overscan: orbN plate x ≥ ~2249 px, rows 0-731, and orbP x ≤ ~150 px, rows 0-480, are alpha-0 black. Projection must ignore alpha < 1. |
| 5 | Aerial haze | — | None in the scene apart from the V2 volumes (world mist off, volume bounces 0) | n/a | Engine-side, as now: `uFog` (40 → 160 m, x0.45, height scale 4.5 m), far haze, slopeH, plateMist and plateBank (§3, KEEP). |
| 6 | Exposure and encoding | — | Linear EXR (half, ZIP) → 16-bit PNG with view Standard, exposure -2.158, gamma 1 (`stitch_plate_v2.py` L51-59) → ffmpeg `-sws_dither ed` → WebP q92 (`finalize_v7.ps1` L19-22). The engine decodes sRGB and multiplies by 2^2.158 = **4.4633** (`PlateEnvironment.ts` L867). It clips at linear 4.46; bottom-strip p99.9 is 8.0 and max 39.4 (water glints). | A bake writes scene-linear float | Encode bake textures exactly the same way (`save_render` with Standard / -2.158 / gamma 1 → ED-dithered WebP), keeping a gain uniform of 4.4633.<br>**Project from the EXR plates** (`v2build7/plate_<cam>.exr`), never from the WebPs. |
| 7 | Colour management | — | The file's AgX (look None, exposure 0) is **not** in the EXR or the PNG. The engine applies AgX itself (`PostChain.ts` GLSL_AGX L166; renderer `NoToneMapping`, `HeroEngine.ts` L101). | — | Save bakes with view Standard, never AgX or Filmic. The image colour space stays Linear Rec.709. |
| 8 | Plate render look | — | `render_plates_v3.py` L174-205:<br>- **`texture_limit_render` 1024**: the 4096² mountain atlas and the 2048² Snow Ground and gfsw maps were rendered at 1024<br>- simplify subdivision 3<br>- 64 spp, adaptive 0.03, min 16; OIDN, prefilter FAST<br>- bounces max 6, diffuse 2, glossy 3, transmission 4, transparent 6, volume 0<br>- caustics off; clamp indirect 10<br>- Wave off; hero hidden | Only if replicated | Replicate these settings in the light bake. Otherwise the light-baked texels carry more texture detail and different noise than the projected texels next to them, and the mask boundaries show. |
| 9 | View-dependent specular | iceberg faces, floe edges, Snow Ground (**metallic 0.2**, spec 0.2), Rock (roughness 0.5) | camera rays from each plate pose | No. A Combined or Glossy bake evaluates glossy **along the normal**. | Projected texels keep the rest view's specular. Light-baked texels need the gain map (R6). Optional: bake DIFFUSE and GLOSSY separately and fit the glossy weight per material on the visible texels. |
| 10 | Darkened ridge from `prep_v4b` | x < 117-184 px, i.e. t from -0.37 to -0.33 | A world-space and object-space shader mix on V2_Ridge: DARK = 1.5·(0.012, 0.024, 0.052), LIGHT = 1.5·(0.046, 0.075, 0.130), noise 0.35, streaks scale (0.7, 0.7, 0.12) | **Yes.** It is a material property. | Nothing special. Note: any T22 restyle of the ridge (silhouette trim, slate rock, gully streaks) changes the content, so the plates must be re-rendered before projection (R1). |
| 11 | prep_v7 geometry edits | massif ~45 px left and ~10 px up; ridge crest y ≈ 277 | geometry | Yes | Bake on copies of plate_scene_v7; the proxies come from the same file. |
| 12 | **Lake reflections** | y 461-765, 22.5 % of the frame | Plane.011 and Plane.013 are a **perfect mirror**: Principled metallic 1, white, roughness 0.0345, bump noise scale 3 with distance 0.07, reflectance 1 at all angles. Glossy rays see the **world** (Nishita: dark and saturated at low elevation, e.g. (0.152, 0.234, 0.457) at 5°), the clouds and the geometry. They do **not** see BG.001. | **No.** It is view-dependent. | A **real-time planar reflection** (§3.6). It needs a new **world-only sky equirect** from Blender (all objects hidden, 2048x1024 half EXR, 64 spp, about 1 min, forensics §5.4).<br>Do not use `pano_orb.exr` for it: the pano sees BG.001, the clouds and the env geometry.<br>Optional: a static 256² water-plane correction map, a heavily blurred ratio of the plate lake to the engine reflection at rest. It is static in the water plane's UV space, so it cannot ghost. |
| 13 | Anti-aliased silhouette rims | every depth edge | Pixel filter (Blackman-Harris 1.5 px) | n/a | Visibility mask eroded by **≥ 2 plate px** at depth or ID discontinuities, plus a gate N·V ≥ 0.25. Those texels take the light bake. |
| 14 | Defects baked into the plates | T05: the ice-sheet hole in the bottom-right overscan (ptr_bottom x 1237-1440, y 743-766). T06: a stretched face behind the right white chunk (ptr_rest x 1240-1290, y 397-430). A warm, sunlit tan ground strip in the far-left overscan (rest plate ≈ px 0-150 x 720-760; orbP display 0-280 x 590-650), which can just enter the frame at x 0-40, y 400-455 when the pointer is at the right edge (orbP). | geometry and materials | n/a | Fix the geometry, or mask these regions out of the projection so they take the light bake. Locate them with `raycast_plate.py` before the bake. |
| 15 | Hero absent; calm water | — | Hero `hide_render`; Wave modifier off | — | Use the same state in every bake. |

### 2.2 Requirements for the bake that follow from the audit (R1-R10)

**R1 Source.**
- Work on a copy of `plate_scene_v7.blend` and never save over it.
- If any T22 / prep_v8 geometry or material change is wanted, either apply it **before** re-rendering all 5 plates, or give the edited objects a light bake only, with no projection.

**R2 Bake targets are the shipped meshes.** Per object, in this order:
1. make it single-user
2. apply scale and modifiers
3. delete underwater faces (optional: off-view and back faces, §1.4)
4. weld 0.02 m and run `repair()`
5. decimate with the §1.2 budgets
6. add `BakeUV`: Smart UV Project at about 66°, then pack per atlas with **≥ 8 px island margin** at the final size and uniform texel density inside an object
7. make `BakeUV` the active render UV so it exports as TEXCOORD_0. Use Draco texcoord quantization 12 bits up to 2048 and 14 bits at 4096.

**R3 Visibility per plate camera.**
- Test each texel against the **shipped** meshes. The exact method is ray-traced:
  - **either** a point light at the camera with a shadow-only or direct-diffuse bake, divided by the analytic N·L/r²,
  - **or** a position/ID pass rendered from the plate camera (filter width ~0) compared per texel with a tolerance of 0.5 % of distance + 2 cm.
- Also require N·V ≥ 0.25, ≥ 2 plate px from any depth or ID edge, and plate alpha = 1.

**R4 Source priority and blending.**
- Use the **rest** plate wherever it sees the texel; that keeps the rest view pixel-faithful.
- Otherwise use tilt, then hold, then orbN or orbP.
- Feather the source boundaries over 4-8 texels in UV space. The weights are baked, i.e. static, so no camera pose can produce a double image.
- Sample the plate EXRs bilinearly with the §0 projection formula.
- The camera extrinsics are in `v2build7/plate_<cam>.json`:

| plate | location (Blender) | rotation (deg) |
|---|---|---|
| rest | (0.2318, -11.7875, 2.9040) | (89.9515, 0, 0.6722) |
| tilt | (0.2088, -9.5554, 2.5871) | (91.50, 0, 0.64) |
| orbN | (-1.5911, -11.7313, 2.9040) | (89.952, 0, -4.36) |
| orbP | (2.0569, -11.6906, 2.9040) | (89.952, 0, 5.64) |
| hold | (0.1416, -3.5406, 2.3227) | (94.55, 0, 0.64) |

**R5 Light bake.**
- Cycles CPU, Combined, or Diffuse + Glossy.
- Use the §2.1 #8 settings.
- Keep the world, BG.001 (camera-visible), the clouds (camera-invisible, glossy-visible), the V2 volumes and the water planes. Hero hidden; Wave off.
- 32-64 spp plus denoise is enough: most visible texels take plate colour, and the light bake mainly fills hidden texels and disocclusions (for example the release with the pointer at an edge, QC round 6).

**R6 Colour match.**
- G = blur_σ(P) / blur_σ(L), with σ ≈ 16-32 texels, measured over plate-visible texels and extended into hidden texels by push-pull.
- final = m·P + (1 - m)·L·G, where m is the feathered visibility mask.

**R7 Encoding.** EXR → 16-bit PNG (Standard view, exposure -2.158) → ED-dithered WebP q90-92; gain 4.4633. Save the float EXRs for later re-encodes.

**R8 Extra Blender outputs:**
- a world-only sky equirect (lake)
- the wisp card (RGBA)
- optional: a water-plane correction map

**R9 Acceptance.**
- At the rest pose, the baked environment through the engine must match today's rest frame within ±2 levels in `region_stats` boxes.
- In the ptr_*, sw_hold_* and sw_rel_* sweeps there must be no duplicate silhouettes; by construction there can be none.
- Check the crest (T03), the ridge specks (T02) and the floe reflection columns (T04).

**R10 Safety.**
- One Blender at a time, through `hero-pipeline/blender/run_blender.ps1`: it refuses below 1500 MB free, uses `-t 3` and BelowNormal priority.
- Bake one atlas per process; the plate strips peaked at a 1,339 MB working set (`render_rest_strip_1_4_log.txt`).

---

## 3. Engine audit: what PlateEnvironment.ts and Water.ts do, and what survives

DROP means the code exists only because of projection or the plates. KEEP means it is still needed with baked textures. KEEP* means keep the behaviour but change its input from plate space to world space or texture space.

### 3.1 `world/PlateEnvironment.ts`: module level

| lines | what it does | verdict |
|---|---|---|
| 14-21 `restQuaternion()` | rest orientation from yaw 0.6722° / pitch -0.0485° | DROP for the plate camera. Reuse it to build `uRestViewProj` (§3.7). |
| 23-24 `REF_TAN_V` | tan of the reference half-VFOV (0.226632) | KEEP* only for `uRestViewProj` |
| 26-41 `PlateMeta`, `PlateCoverage`, `plateCoverage()` | overscan → frustum extent | DROP. `CameraRig.setCoverage` (§3.6) loses its input. |
| 43-49 `createPlateCamera`; 51-81 `createProjectorCamera` (hold r 12.7, el -3.3, pitch 4.55; tilt r 18.7, el -1.43, pitch 1.5; orbN/orbP ±5°); 83-87 `projectionTerms`; 89-104 `withPlateFrustum` | projector cameras with overscan frusta | DROP. The poses move into the offline bake (they already exist in `render_plates_v3.py` L79-98). |
| 106-220 `occlusionGLSL`:<br>`DepthAt` 126-128<br>`Visible` 132-141 (5-tap PCF, ×1.06 + 0.8 m)<br>`SeenY` 146-150<br>`Rim` 156-166 (sky within 40 texels of a silhouette re-projected at its depth, fz ≥ 330, g < 300)<br>`DepthSolid` 169-177<br>`Unoccluded` 180-217 (40 horizontal steps of 4 texels plus 20 vertical; need fz·0.985 - 0.25; far band fz·1.15 + 1.5 under 150 m, else fz·1.6 + 20) | projection shadows and the fill | DROP |
| 221 `GLSL_PLATE_OCCLUSION`; 232-252 `EXTRA_PROJECTORS`, `GLSL_EXTRA_PROJECTORS`; 255-287 `GLSL_PLATE_PROJECTOR_BLEND` | 4 extra plates and per-fragment visibility-weighted blending | DROP. This is the root of the ghosts T02, T03 and T06. |
| 294-305 `plateGrade()` | tone curve below anchor luma 1.3 with power 1.45 (`uPlateGrade` (1.3, 1.45, 0.3), L845), toe fade over luma 0.03-0.16, shadow shift ×(0.74, 0.88, 1.10) | KEEP. It is per texel, so it can be pre-baked, but keep it live with a `uMirrorPass` switch. The Cycles lake reflected the **ungraded** scene, and the water applies `envChroma` itself (L344). |
| 309-314 `envChroma()` | chroma x1.06 → x1.12 over luma 0-0.18; white balance ×(0.985, 1, 1.015) | KEEP (shared with the water) |
| 321-328 `plateMistWisp`, `plateMist` | drifting world noise 0.55 + 0.9·vnoise(x·0.035 + t·0.012, y·0.08, z·0.035); mist = smoothstep(35, 70, d)·exp(-y/1.6)·0.45 | KEEP |
| 331 `MIST_COLOR` (0.48, 0.73, 1.28); 336-352 `plateBankBillow`, `plateBank` | the hold fog bank: top 7 ± 3 m (fbm), edge -3.5/+1.5 m, billow 0.6-1.0, reach smoothstep(35, 90, d) below 2-4 m and (60, 120) above, gated at d ≤ 330 | KEEP. Move it to a shared chunk, because the water imports it. |
| 355-382 `ExtraProjector`, `ExtraProjectorBinding`, `PlateOcclusionUniforms` types | — | DROP. Move `uPlateGrade` into a new env uniform set. |
| 384-438 `GLSL_REFLECTION_DISTANCE` | marches the lake mirror ray through the depth map → channel b | DROP |
| 440-453 `DEPTH_VERT` / `DEPTH_FRAG`; 455-460 `DEFAULT_PLATE_META` | depth bake and stale defaults | DROP |
| 462-472 `PLATE_VERT` | `vPlateClip = uPlateViewProj·wp`, `vWorldPos` | KEEP* `vWorldPos`; replace `vPlateClip` with `vUv` (BakeUV) |

### 3.2 `PLATE_FRAG` (L474-726), line by line

| lines | term | verdict |
|---|---|---|
| 482-498 | `uPlate`, `uPlateGain`, `samplePlate(uv, lod)` = textureLod at the **absolute** lod | KEEP* → `uBake` (per atlas) times the gain 4.4633; the LOD becomes the `textureGrad` DOF below |
| 499-504 | `uPlateOver`, `restFrame(uv)` | KEEP* → `rf = (uRestViewProj·vWorldPos)` NDC·0.5 + 0.5 with a symmetric rest frustum (tanH 0.426031, tanV 0.226632, no overscan). This is identical to today's restFrame(uv0). |
| 505-511 | `plateRidgeArea` = 1 - smoothstep(0.24, 0.32, rf.x) | KEEP* (§3.7) |
| 514-536 | uv0, `plateUnoccluded`, nofill, crack test (oz0 40-300 m) | DROP |
| 537-539 | `filled` (blur the side fills) | DROP |
| 540-549 | pz, fz, fp: fog evaluated at the projector's surface, behind cracks | DROP. Use fp = vWorldPos and d = distance(cameraPosition, vWorldPos). |
| 550-552 | `lodDof` = uDofBlur(1.5)·smoothstep(0, mix(30, 10, uHold), \|d - uFocusDist\|) + 1.6·(1 - smoothstep(8 + 10·uHold, 16 + 12·uHold, d)) | KEEP*. It must keep the same screen-space blur: `textureGrad(uBake, vUv, dFdx(vUv)*k, dFdy(vUv)*k)` with `k = max(1.0, exp2(lodDof) * W_render/1800.0)`. 1800 is the number of plate texels across the rest frame width. This keeps the anisotropic filtering of grazing floes and matches today's look at any bake resolution or DPR. |
| 553 | + 3·filled + 4·nofill | DROP |
| 554-555 | col, `occZ` | KEEP* col; DROP occZ |
| 556-567 | extra-projector blend | DROP |
| 568-570 | `envChroma(plateGrade(col))` | KEEP |
| 571-577 | near crushed-black lift (nearK over 12-22 m, luma < 0.02-0.12, ×1.25 + (0.006, 0.008, 0.01), weight 0.8) | KEEP (it is distance-based) |
| 578-583 | `ovK`: plate bottom overscan rows (rf.y < 0) | DROP; fix the T05 hole in the geometry instead |
| 585-593 | crushed-black toe (luma < 0.045 → power 0.7, 25 % less chroma) | KEEP (can be pre-baked) |
| 594-602 | ridge = max(plateRidgeArea(uv), plateRidgeArea(uv0)·step(fz, occZ·1.3 + 5)) | KEEP* → `uIsRidge` (V2_Ridge material) × the world-space plateRidgeArea |
| 603-613 | rz = min(pz, fz); footGate (fragment y 0.1-0.5 m → 0.8-3 m, blended by rf.x 0.1-0.18); ridgeBody (pz 40-50 → 96-100 m) | KEEP*: ridgeBody = `uIsRidge` × world plateRidgeArea, and footGate uses world rf.x |
| 614-626 | navy overlay `col = mix(col, navy, 0.0 * ridge…)` | DROP (dead since v5: the ridge rock is baked by prep_v4b) |
| 627-634 | `berg`: iceberg shade (rf x 0.624-0.661 / 0.884-0.922, y 0.3625-0.40 / 0.60-0.65; pz 50-55 / 78-85 m; luma < 0.45-0.65; saturation mix(1.5, 0.88, uHold), gain mix(0.82, 0.95, uHold), weight ×(1 - 0.5·uHold)) | KEEP* live, because it depends on uHold. Mask from world rf plus zRest, or a flag on Plane.015, rock_big_2.002, rock_big_3.003 and gfsw.001; the luma gate stays live. |
| 635-639 | `rockR`: right foreground rock shadows ×(0.42, 0.60, 0.74) (rf.x > 0.7232-0.7976, rf.y < 0.3625-0.425, pz < 40 m, luma < 0.25-0.5) | KEEP*, static → **pre-bake** into the affected textures: rock_big_4.003/4.004, rock_medium_1.001, the right half of Retopo_Plane.012 and Rock.005/.006 |
| 640-647 | `farBand` unsharp mask (+22 % against a 2.5-mip blur, dark side capped at -0.03; pz 55-330 m, not the ridge) | KEEP*, static → pre-bake as offline sharpening, or keep it live on the bake texture's mips |
| 648-652 | ridge speck clamp `min(col, rbf·1.35 + 0.015)` | DROP (it fights crack and projection specks; welding removes them) |
| 653-655 | ridge slate: 35 % less chroma, ×(0.8, 0.86, 0.9) | KEEP (pre-bake into V2_Ridge, or live with `uIsRidge`) |
| 657-662 | `skyGate` = 1 - smoothstep(325, 340, distance(camera, vWorldPos)) | KEEP; it is already world-space. It becomes implicit when BG.001 has its own material. |
| 663-665 | far haze: mix to uFogColor·0.85 by smoothstep(60, 140, d)·0.17·(1 - 0.85·uHold)·(1 - 0.9·ridgeBody)·skyGate | KEEP |
| 666-675 | wisp, ridgeUp (smoothstep(0.3, 3.5, y)), shade, ridgeFoot, footC = MIST_COLOR·(0.62, 0.80, 1.0) | KEEP |
| 676-694 | `baseK`: left mountain feet (d 55-80 → 320-335, y 0.4-1.6 → 4-14 m, rf.x < 0.3-0.4, luma 0.3-0.55): local contrast ×0.6, multiply ×(0.52, 0.62, 0.78), highlight shoulder above luma 0.7 | KEEP*, almost static → pre-bake, or live with the world mask t < -0.1825..-0.0970 |
| 695-698 | `slopeH`: soft blue haze on the far lower slopes (d 100-160, y 1.5-4 → 10-22 m, ×0.15·(1 - 0.7·uHold)) | KEEP |
| 699-710 | hold: `upK` massif contrast (uHold, pz ≥ 96-104 m, y ≥ 3-6 m, chroma ×1.4, ×0.6); `nk` near-floe undercut lift (uHold, d < 20-30 m, luma < 0.06-0.12) | KEEP*. In upK, pz → zRest (or a flag on V2_Massif, Object_2.009 and Object_2.010). |
| 711-712 | fog = smoothstep(40, 160, d)·exp(-y/4.5)·0.45·wisp·shade·(1 - 0.33·uHold), cap 0.85, colour mix(uFogColor, footC, ridgeFoot) | KEEP |
| 713-721 | hold fog bank: plateBank(d, fp, uFogHold)·(1 - 0.45·ridgeBody·smoothstep(1, 6, y))·skyGate, two-tone bankC, cap 0.88 | KEEP |
| 722-725 | low mist band: plateMist·wisp·shade·0.7, colour mix(MIST_COLOR·(0.81, 0.9, 1.0), footC, ridgeFoot), cap 0.85 | KEEP |

### 3.3 Clouds and the class

| lines | what | verdict |
|---|---|---|
| 729-746 `CLOUD_VERT` | drift: sin·2.4 m + 0.035·(0.6 + seed) m/s; breath 0.5 m | KEEP |
| 754-774 `GLSL_CLOUD_PROJECTOR_OCC`; 794-812 the plate-depth cull in `CLOUD_FRAG` | hide clouds behind proxies and cracks using projector depth | DROP: the real env depth buffer occludes them, since the clouds are transparent, `depthTest` true and `renderOrder` 1 |
| 818-823 | UV turbulence; lighting = (2.0 + 0.8·envIrradiance)·tint | KEEP |
| 827-853 | fields: `plateCamera`, `coverage`, `plateGain`, `plateViewProj`, `occlusion`, `depthTarget`, `projectors`, `projectorBinding` | DROP (keep `group` and `cloudMaterials`) |
| 864-891 | projector set-up | DROP |
| 892-915 | one `rx-plate` ShaderMaterial for every proxy | REPLACE with per-atlas materials: `uBake`, gain, `uIsRidge`/`uObjFlags`, `uRestViewProj`, fog uniforms, `uMirrorPass` |
| 918-923 | traverse the proxies and assign the material | KEEP* (assign by sanitized node name) |
| 926-966 | cloud meshes from `CLOUDS` | KEEP |
| 973-999 `bakeDepth`; 1006-1021 `updateProjectors` (inverse 4th-power proximity weights); 1024-1156 `bakeProjector` (a 1536 x ~836 RGBA16F depth target, 40-texel min dilation, mirror-ray pass) | — | DROP |

### 3.4 `world/Water.ts`

| lines | what | verdict |
|---|---|---|
| 21-39 `mirrorLGLSL`; 42-61 `GLSL_EXTRA_MIRROR`; 64-115 `GLSL_WATER_PROJECTOR_BLEND` | the 2x2-filtered mirror-ray length, the per-projector mirror-point re-aim, and the blend with the `straight` fallback, the `raised` test and `extraCover` | DROP |
| 125-138 `WATER_VERT` | vPlateClip, vMirrorClip, vWorldPos | DROP vPlateClip; KEEP the other two |
| 175-189 `ringSlope` (`uWave` (0.26, 4.2 m, 1.115 m/s, 1.1), `uWaveReach` 8 m, scalloped phase) | the Wave-modifier crest train | KEEP |
| 191-200 `impulseSlope` | press and release rings (not fired: `HeroEngine.ts` L119) | KEEP |
| 204-224 `plateMirrorPoint` | re-aims the plate lookup through the plate's mirror image | DROP |
| 228-238 | V, ripple slope, breeze `fbmd` (×0.55 / ×0.9 · 0.006, calmer inside the ring zone) | KEEP |
| 241-242 | `offs` = slope·uDistortion(0.035)·mix(0.6, 1.4, smoothstep(6, 60, dist)) | KEEP*. It was in plate-uv units, which span 1.3 frame widths and 1.33 frame heights; scale it by about (1.3, 1.33) for a reflection render target in screen uv. |
| 246-277 | re-aim, `behind`/`occl`/`vis0`, the straight fallback (T04's tears) | DROP |
| 284-291 | `raised` (lake behind a floe or rock) | DROP |
| 292-297 | `plateUnoccluded` fill and nofill | DROP |
| 302 | `lodX` (lake DOF, the same formula as the plate) | KEEP* as a blur of the reflection lookup |
| 305-314 | lod + 3·raised; quv; the "land on water" guard with `plateSeenY` | DROP |
| 315 | `base = textureLod(uPlate, quv, lod)` | REPLACE with the planar reflection (§3.6) |
| 316-329 | `destreak` (vertical Gaussian against the plate's streak grain) | DROP, or repurpose as a vertical reflection stretch (Cycles' bump drew columns) |
| 330-343 | extra-projector lake blend | DROP |
| 344-347 | `envChroma(base·uPlateGain)`; ×1.1 (F000 open lake +7 %) | KEEP envChroma and ×1.1; drop the gain |
| 348-364 | near crushed-black lift (12-22 m) and toe | KEEP |
| 367-385 | `plateW` (inside plate, hold fade 0.15, texPerPx > 2x, occl, nofill, near-lake hold fade, extraCover) | DROP: the reflection covers the whole lake |
| 386-402 | `Nw`, `rRip`; the live env-map mirror fallback `rLive`·(0.62, 0.70, 0.80) | KEEP rRip (used by the crest bands); DROP the fallback |
| 403-415 | crest bands: k = clamp((luma(rRip) - luma(rFlat))/luma(rFlat)·uRippleShade 3.1, ±0.48); trough tint ×(0.6, 0.77, 1.16) | KEEP, but drop `k *= plateW` (L412). This is the "plate-dependent ripple shading". |
| 416-427 | distance haze; hold bank (uFogHold); far-shore mist band | KEEP |
| 432-451 | live hero reflection: chop, glint, Fresnel 0.02 + 0.98(1 - V·N)^5, ×mix(1, 0.75, uHold); `Lb = uPlateDepth.b` hides the hero behind nearer reflected things | KEEP the hero term; DROP `Lb` (L447-449), because a mirror pass with env depth occludes correctly. The Cycles water has **reflectance 1 with no Fresnel**, so the env reflection gets weight 1 (×1.1) while the hero keeps its Fresnel (QC round 7 choice). |
| 455-469 | orb glint (ggxSpec, rough 0.28, zone ≤ uWaveReach·0.95) | KEEP |
| 475-482, 548-554 | water quads: near ±14.87 m; far x ±22.31, three z -56.54..-14.87, trimmed | KEEP |
| 505-546 | uniforms | remove `uPlate*`, the occlusion uniforms and the projector uniforms |

### 3.5 uHold / uFogHold inventory (all of these stay live)
- **PLATE_FRAG:**
  - L552: lodDof focus range and near-blur edges
  - L634: berg saturation, gain and weight
  - L665: far haze ×(1 - 0.85·uHold)
  - L698: slopeH ×(1 - 0.7·uHold)
  - L706: upK
  - L708: nk
  - L711: fog ×(1 - 0.33·uHold)
  - L717: bank (uFogHold)
- **Water:**
  - L302: lodX
  - L422: bank (uFogHold)
  - L446: hero reflection ×mix(1, 0.75, uHold)
  - L371, L376 and L381 are `plateW` terms and are DROP.
- **Drivers:** `uHold` = camExpand (`HeroEngine.ts` L367). `uFogHold` = max(camExpand, linger) (`Choreography.ts` L426-427).

### 3.6 Other files touched by the change
- **`HeroEngine.ts`**
  - L177-188: env construction and `rig.setCoverage(env.coverage)`
  - L190-196: Water with the plate, plateViewProj, plateGain, occlusion and projectors
  - L199-200: `bakeDepth`
  - L389: `updateProjectors`. All of these are DROP or REPLACE.
  - L379 `uDofBlur` 1.5 stays (see the `textureGrad` k).
- **`CameraRig.ts`** L41, L50-71: the vertical FOV and pan clamp to the plate (panUp/panDown = (atan(tanV0·coverage) - half)·0.85). DROP the plate dependency and use fixed pan limits (±0.9° today = EL_PAN 0.75 × orbitEl 1.2, L27, L105).
  - `HOLD_PITCH_TRIM` (L29) and the hold pose are no longer bound to the hold plate, so composition tasks T12 and T15 can move the camera freely.
  - Without a coverage, `setAspect` (L61) falls back to a vertical cap of tanV0·1.04. On 16:10 screens that crops the sides: horizontal tan 0.377 instead of 0.426. With real geometry the cap can be raised (for example to tanV0·1.3). At VFOV 29.8° the frame bottom meets the water at y_b ≈ -0.9, which the near lake (y_b ≥ -14.87) and the rocks cover.
- **`Choreography.ts`** L311-312: the comment about the plates' bottom overscan is obsolete.
- **`assets.ts`** L21-32 (weights), L127-152 (`meta`, `extraPlate`), L154-163 (parallel loads): replace the plates with the env GLB plus a manifest of bake textures. `pano_orb.exr` stays for the hero's IBL; add `world_sky.exr`.
- **`config.ts`** L47-60 `PLATE`: stale values (2506 x 1287, overscan 0.08/0.06; the live plate is 2340 x 1273 with 0.15 / 0.20 / 0.13). DROP it. Update `ASSETS` L78-87.
- **`RenderPipeline.ts`** L190-200: the mirror pass renders only `[ORB, RINGS]` at `reflectionScale` 0.25 (T0) or 0.5 (T1/T2).
  - **ADD an env mirror pass:** the env meshes, the clouds and a world-sky dome; **not** BG.001 and **not** the water.
  - Put the water in its own layer and use a clip plane at y = 0.
  - Render into a second target, or keep the hero in the alpha channel.
  - The env is static, so the env mirror only needs re-rendering when the camera moves or every few frames (cloud drift).
  - Use ≥ 0.35 scale on T0 so the floe columns stay crisp.

### 3.7 Region masks that read plate uv or plate depth, with exact world-space replacements

Use t = (x - 0.2318)/(11.7875 - z) (three.js world coordinates). This is the rest camera's horizontal direction tangent; prep_v4b uses the same quantity in Blender form, (x_b - camX)/(y_b - camY). Its relation to frame pixels:
- `t = (-0.011732 + 0.999931·s)/(0.999931 + 0.011732·s)`
- `s = (x_px - 720)/1690.12`

Use zRest = dot(p - (0.2318, 2.9040, 11.7875), (-0.011732, -0.000846, -0.999931)) = the rest plate's depth `pz` for a point on the surface.

| mask | line | today | frame region | replacement |
|---|---|---|---|---|
| restFrame | 502-504 | plate uv → rest frame | — | rf from `uRestViewProj` (exact) |
| plateRidgeArea | 508-511, 602 | 1 - smoothstep(0.24, 0.32, rf.x) | x < 346-461 px | 1 - smoothstep(-0.2339, -0.1654, t) |
| ridge depth band | 612 | pz 40-50 → 96-100 m | V2_Ridge | `uIsRidge` (object) |
| footGate | 609 | rf.x 0.10-0.18 | x 144-259 | smoothstep(-0.3540, -0.2853, t) |
| prep_v4b rock mask (Blender) | — | t from -0.37 to -0.33 | x 117-184 | already world-space (baked) |
| navy gradient | 622 | rf.y 0.525-0.65 | y 268-364 | dead → DROP |
| ovK | 580 | rf.y < 0 | below the frame | DROP |
| berg | 630-632 | rf x 0.624-0.661 / 0.884-0.922, y 0.3625-0.40 / 0.60-0.65; pz 50-55 / 78-85 | x 899-1328, y 268-488 | t 0.0938-0.1253 / 0.3142-0.3464, plus rf.y, plus zRest 50-85 m; or object flags |
| rockR | 637 | rf.x > 0.7232-0.7976, rf.y < 0.3625-0.425, pz < 40 | x > 1041-1149, y > 440-488 | t > 0.1781-0.2411, zRest < 40 → pre-bake |
| farBand | 642 | pz 55-70 → 300-330 m, not ridge | — | zRest band → pre-bake |
| baseK | 681-682 | rf.x < 0.3-0.4 | x < 432-576 | t < -0.1825..-0.0970 |
| upK | 706 | pz ≥ 96-104 m | massif and far ranges | zRest ≥ 96-104 |
| cracks and fog point | 526, 545-548, 555 | pz, occZ, fz | — | DROP |
| Water plateW, texPerPx | 367-376 | puv edges, fwidth(puv) | — | DROP |

---

## 4. Texel-density budget

### 4.1 Method and constants
- **Native plate density** is ρ_N(d) = 2112.65/d texels/m (1.25 texels per 1440-frame px). A grazing surface needs the same density along its horizontal axis, because UV texels are isotropic.
- **Displayed density** is ρ_N / 2^L, where L is the absolute `lodDof` of L552.
  - **Rest** (focus 20.93 m, range 30 m): L = 1.12 at 12 m, 0.77 at 13, 0.45 at 14, 0.22 at 15, 0.07 at 17, 0 at 20, 0.08 at 25, 0.33 at 30, 0.68 at 35, 1.05 at 40, 1.35 at 45, **1.5 from about 50 m**.
  - **Hold** (focus 12.7 m, range 10 m, near blur 18-28 m): L = 2.66 at 20 m, 1.85 at 25 m, **≥ 1.5 for everything visible**.
  - **Tilt** (focus 18.7 m): L ≈ 1.6 at 10 m, 1.0 at 12, 0.35 at 14, ≈ 0 at 16-21, 0.28 at 27.
- **Poses:**
  - Rest, Blender (0.232, -11.788, 2.904).
  - Hold (0.142, -3.541, 2.323) with pitch 4.55 + 0.75°. Its frame bottom meets the water about 17.7 m ahead (y_b ≈ 14.2), so **nothing nearer than y_b ≈ 14 is in the hold frame**: no near rocks and no Retopo_Plane.012.
  - Tilt / hover (0.209, -9.555, 2.587): 2.2 m closer than rest, which magnifies the near rocks about 1.2x.
  - Orbit: ±1.8 m sideways, magnification about 1.0.
  - Intro (0.197, -8.451, 2.409): up to 1.33x, but it is washed out by the loader's exposure ramp.
- **Area** is estimated from the bounding boxes: domes and half-ellipsoids above the water for rocks, about 0.55-0.6 fill for floes, ×1.3 relief for scans; ±30-50 %. **The bake script should measure the real kept face area** and size each island by density.
  - S_native = ρ_N,max · sqrt(A/0.7), with 0.7 packing efficiency.
  - S_disp = (ρ_N/2^L)_max · sqrt(A/0.7).
- **Source-detail cap.** The plates rendered the mountains' 4096² atlas at 1024, which is about 9.6 texels/m over the ~107 m scan. The plates therefore hold no more than about 10 texels/m of mountain texture (plus mesh shading at ~0.6 m edges), even where their pixel density is 20-40/m.

### 4.2 Per object

Column notes:
- **cover**: rest values marked ID are from forensics §2.5; others are estimates. Hold values are estimates from `p06_sustain` / `plate_hold`.
- **M**: d_rest / d_hold.
- **disp / native**: required ρ in texels/m.

| object | rest d (m) | rest cover | hold: in frame, cover, d, M | worst pose | L rest (hold) | ρ need disp / native | A (m²), culled | S_disp / S_native | **recommended** | ρ delivered |
|---|---|---|---|---|---|---|---|---|---|---|
| V2_Ridge | 55-112 | ~3.2 % (35k px) | yes, ~3.4 % (x 0-112, y 342-600), 47-104, 1.08 | hold | 1.5 (1.5) | 15.9 / 45 | 5,300 (~2,700) | 1,383 / 3,915 (987 / 2,795) | **2048²** | 23.5 uncut (33 culled) |
| V2_Massif | 95-150 | ~4.4 % | yes, ~6.6 % (x 70-589, y 337-594), 87-142, 1.07 | hold | 1.5 (1.5) | 8.6 / 24.3 | 6,300 (~3,500) | 816 / 2,306 (608 / 1,718) | **2048²** | 21.6 (29) |
| Object_2.009 | 125-260 | 2.05 % ID | yes, ~2.3 % (x 664-1094, y 444-565), 1.06 | hold | 1.5 | 6.4 / 18.1 | 14,900 (~6,000) | 934 / 2,641 (593 / 1,676) | **1024²** | 7.0 (11.1) |
| Object_2.010 | 200-310 | ~0.4 % | yes, ~0.7 %, 1.03 | hold | 1.5 | 3.9 / 10.9 | 11,600 (~4,000) | 502 / 1,403 (295 / 824) | **512² culled** (1024² uncut) | 6.8 |
| Plane.014 (shore) | 51-106 | 1.63 % ID | yes, ~2.9 % (band y 577-614), 1.15 | hold | 1.5 | 17.4 / 49.1 | 4,250 (~2,100) | 1,355 / 3,825 (954 / 2,691) | **2048x1024** | 18.6 (26.4) |
| Plane.015 (iceberg) | 63-71 | 2.48 % ID | yes, ~3.2 % (x 902-1296, y 458-608), 1.13 | hold | 1.5 | 13.6 / 38.4 | 300 | 282 / 795 | **1024²** | 49.5 |
| gfsw.001 (mound) | 49-66 | 0.94 % ID | edge only, ~0.4 % (x 1366-1440), 1.14 | hold | 1.47 | 18.2 / 51.5 | 180 | 291 / 824 | **512²** | 32 |
| Retopo_Plane.005 | 46-64 | ~0.8 % | yes, ~0.8 %, 1.15 | hold | 1.39 | 19.7 / 55.6 | 215 | 345 / 973 | **512²** | 29 |
| Retopo_Plane.006 | 46-69 | ~0.6 % | yes, 1.15 | hold | 1.4 | 19.9 / 56 | 215 | 349 / 980 | **512²** | 29 |
| Retopo_Plane.007 | 29-41 | 1.09 % ID | yes, ~2.0 % (x 0-640, y 627-698), 21-33, **1.40** | tilt (disp) / hold (native) | 0.30 (2.66) | 64.4 / 101 | 107 | 799 / 1,252 | **1024²** | 82.8 |
| Retopo_Plane.008, .009, .010, .011 | 42-58 | ~1.1 % together | yes, ~1 %, 1.18-1.20 | hold | 1.2-1.5 | 15-22 / 50-62 | 15 / 28 / 15 / 28 | ≤ 139 / ≤ 392 | **4 x 256²** (shared 512²) | 40-55 |
| Retopo_Plane.012 | 12-24 (11.9 with the pointer low) | 4.35 % ID | **no** (below the frame) | tilt | 1.12 at 12 m → 0 at 20 m | 129 / 178 | 87 | 1,438 / 1,979 | **2048²** | 184 |
| rock_big_3.004 | 11.4-14.7 | 3.02 % ID | no | rest / tilt | 0.95-0.45 | 110 / 205 | 22 | 616 / 1,148 | **1024²** (atlas) | 183 |
| rock_big_3.005 | 15-18.7 | 1.90 % ID | no | tilt | 0.22-0.05 | 121 / 165 | 24 | 709 / 967 | **1024²** (atlas) | 175 |
| rock_big_4.003 | 18.3-21.8 | 1.61 % ID | no | tilt | ≈ 0 (focus) | 128 / 131 | 22 | 717 / 734 | **1024²** (atlas) | 183 |
| rock_big_4.004 | 14.6-15.6 | < 0.9 % | no | rest | 0.3 | 118 / 170 | 3.5 | 263 / 381 | **512²** (atlas) | 229 |
| rock_big_4.005 | 17.9-19.6 | < 0.9 % | no | tilt | ≈ 0.05 | 131 / 135 | 9.7 | 487 / 501 | **512²** (atlas) | 138 |
| rock_big_1.001 | 12.4-14.4 | < 0.9 % | no | rest | 1.0-0.45 | 110 / 207 | 6 | 322 / 606 | **512²** (atlas) | 175 |
| Rock.005-.009 (5) | 11.9-14.3 | ~1.5 % together | no | rest | 1.05-0.45 | 99 / 211 | 8 in total | 335 / 713 | **512² shared** (atlas) | 151 |
| rock_medium_1.001 | 20.4-21 | < 0.5 % | no | tilt | 0 | 116 / 116 | 2.4 | 215 / 215 | **256²** | 138 |
| rock_medium_2.001 | 13.8-14.3 | < 0.5 % | no | rest | 0.5 | 108 / 182 | 1.5 | 158 / 266 | **256²** | 175 |
| rock_medium_3.002 | 12.9-13.7 | < 0.5 % | no | rest | 0.8-0.6 | 103 / 197 | 1.6 | 156 / 297 | **256²** | 169 |
| rock_medium_3.003 | 12.8-13.7 | < 0.5 % | no | rest | 0.8-0.6 | 103 / 198 | 2.2 | 182 / 350 | **256²** | 145 |
| rock_big_2.002 | 59-61 | < 0.5 % | yes, 1.15 | hold | 1.5 | 14.6 / 41.4 | 30 | 96 / 271 | **256²** | 39 |
| rock_big_2.003 | 41-42 | ~0.1 % | yes, 1.24 | hold | 1.15 | 23 / 64 | 3.5 | 52 / 143 | **256²** (128² would do) | 114 |
| rock_big_3.003 | 55-58 | ~0.2 % | yes, 1.16 | hold | 1.5 | 15.9 / 45 | 20 | 85 / 241 | **256²** | 48 |
| BG.001 | 371 | 43.7 % ID | ~50 % | — | — | constant | — | — | **no texture** | — |
| wisp card (new) | ~122 | ~0.3 % | yes, 1.07 | hold | 1.5 | — | — | — | **256x128 RGBA** | — |

Reading the table:
- "Recommended" is at least 1.3x the displayed need everywhere. It reaches native density for everything nearer than ~25 m that is at the focus distance (rock_big_4.003, rock_big_4.005, rock_medium_1.001 and the far half of Retopo_Plane.012). That leaves headroom if the DOF is lowered later.
- The far field is deliberately below native: there, L = 1.5 and the plates' own texture limit (≈10 texels/m) caps the real detail anyway.

### 4.3 Atlases, download and memory

**Balanced (recommended).** 12 textures, 24.3 M texels:

| texture | contents | size |
|---|---|---|
| T01 | V2_Ridge | 2048² |
| T02 | V2_Massif | 2048² |
| T03 | Object_2.009 (1024²) + Object_2.010 (512²) | 1024x1536 |
| T04 | Plane.014 | 2048x1024 |
| T05 | Plane.015 | 1024² |
| T06 | gfsw.001 (512²) + Retopo .008-.011 (4 x 256²) + rock_big_2.002, rock_big_2.003, rock_big_3.003 (3 x 256²) | 1024² |
| T07 | Retopo .005 + .006 | 1024x512 |
| T08 | Retopo .007 | 1024² |
| T09 | Retopo .012 | 2048² |
| T10 | rock_big_3.004, rock_big_3.005, rock_big_4.003 (1024² each) + rock_big_4.004, rock_big_4.005, rock_big_1.001, Rock.005-.009 (512² each) | 2048² |
| T11 | rock_medium x4 (256² each) | 512² |
| T12 | wisp card (RGBA) | 256x128 |

**Lean (today's displayed sharpness, needs culling).** About 11.1 M texels:

| object(s) | size |
|---|---|
| ridge, massif | 1024² each |
| Object_2.009 | 1024x512 |
| Object_2.010 | 512x256 |
| Plane.014 | 2048x512 |
| Plane.015 | 512² |
| gfsw.001 | 512² |
| Retopo .005 / .006 | 512x256 each |
| small floes | 256² |
| Retopo .007 | 1024² |
| Retopo .012 | 1536² |
| near rocks atlas | 2048x1280 |
| small rocks | 512² |
| far rocks | 256² |

- **WebP size.**
  - The published plates average 0.97 bit/px: 361,504 B over 2.98 MP, about 1.7 bit/px on their non-sky half.
  - Bake atlases with 25-30 % padding should land around **1.3 bit/texel** (range 1.0-2.0) at q90-92.
  - Balanced: about **3.9 MB** (3.0-6.1). Lean: about **1.8 MB** (1.4-2.8).
  - Geometry: about 1.0 MB GLB with BakeUV as TEXCOORD_0; about 0.75 MB without normals, because the material is unlit.
  - Today's environment download is 1.69 MB of plates (rest 361 KB, hold 298, orbN 351, orbP 371, tilt 307) plus 1.02 MB of proxy. The pano (1.33 MB) and the clouds (0.30 MB) are unchanged.
  - Net change: balanced about **+2.2 MB**; lean about **+0.1 MB**.
- **VRAM** (WebP decodes to RGBA8; ×1.33 for mips).
  - Balanced about 129 MB; lean about 59 MB.
  - Today: about 79 MB of plates (5 x 2340 x 1273) plus about 51 MB of projector targets (5 x 1536 x 836 RGBA16F).
  - The balanced set therefore costs about what the engine already uses. KTX2/ETC1S would cut VRAM about 8x if T0 needs it.
- **Bake time.**
  - The v7 strips cost 9.4-10.5 µs per pixel-sample at 3 threads (`plate_rest_s0` 494.6 s and s1 551.6 s for 2340 x 350/382 px at 64 spp, with mirror water and volumes). Diffuse bakes should be cheaper, about 5-8 µs.
  - Light bake at 32 spp: balanced about 65-105 min; lean about 30-50 min.
  - Visibility passes for 5 cameras: about 10-20 min. Projection and colour match in numpy: minutes.
  - Bake one atlas per Blender process. The peak should stay near the plates' 1.34 GB working set.

---

## 5. Risks and checks before the bake
1. **Cracks.** Specks seen through cracks (T02) are not a projection artefact alone. Weld (0.02 m), repair, and confirm zero open edges inside the views before unwrapping.
2. **T22 content changes** (ridge trim and streaks, massif rock, iceberg, floe shift, the T05 hole, the T06 stretched face) invalidate the v7 plates for those objects. Either re-render the 5 plates from the v8 scene (about 2 h) or give those objects a light bake only.
3. **Areas.** The §4 areas are bounding-box estimates. Measure them, then pack by density. Do not reuse the Object_2.008 atlas unless an overlap check (UV > Select Overlap) passes; the ridge and the massif split it, so each half wastes about half of it.
4. **Lake.** A planar reflection will be close to, but not pixel-identical with, the Cycles lake at rest. Use the world-only sky, metallic reflectance 1 and the Blender bump look. The optional static correction map closes most of the gap without any ghosting.
5. **Mask seams.** Specular and OIDN differences show at projected / light-bake seams. The gain map (R6) and the same render settings (texture limit 1024, simplify 3, bounces) handle most of it. Check the iceberg and the floe edges at the orbit extremes.
6. **Grade in reflections.** Keep `plateGrade` and `envChroma` live with a `uMirrorPass` switch, or the lake gets graded twice (the water applies `envChroma` at L344).
7. **Names.** The texture manifest must use the three node names (§1.4). BG.001 gets a constant-colour material with the low mist band (`plateMist`). It must be excluded from the mirror pass.
