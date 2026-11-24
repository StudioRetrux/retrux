# ENV lane, round 11, step 1 of 2 (bake v9): hand-off

Builder: env-bake, 2026-11-14. Lane worktree `LANE` = `$SP/lanes/env` (detached at 7ddac0d), work folder `WORK` = `$SP/work/env`,
where `$SP` = `/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad`.
Every attempt, number and decision, in order, is in `WORK/LOG.md`. My lab (:5174) is stopped; :5173 was never touched.

## What this step delivers

SPEC 4.1 work items 1, 2, 3 and 5, plus the two Blender renders the next step needs (sky equirect, summit wisp card):

- The bake pipeline runs on this Mac with Cycles on the Metal GPU (`run_bake_m9.zsh`, one Blender session per stage, all
  through the slot, time-boxed, memory-checked). A full bake of the 34 environment objects takes about 20 minutes.
- The root cause of every v8 defect, with evidence (below).
- Bake v9, 24.1 M texels (A1's Balanced budget), published in `LANE/retrux-web/public/hero` and loaded by default.
  At rest it matches the projected plates region by region within 2 levels; the seam, the cut range and almost all the
  specks are gone.
- Engine changes for v9 live only in the baked path (`#ifdef BAKED_ENV` and the baked materials). `?env=projected` is
  verified identical to the baseline.

## Root causes of the v8 defects (evidence in `WORK/evidence/`, `WORK/caps/`)

1. **Hard diagonal seam and lost base mist at the foot of the far-left ridge.** At rest, v8 drew the light bake instead of
   the plate on 93 % of the shore Plane.014 and on 37.8 % of the V2_Ridge pixels. I re-ran m8's own visibility rule per
   rest pixel (`evidence/evidence_v8.json`, `evidence/d1_v8_classification_left.png`). `visible()` in m8:
   - needed |N.V| > 0.15 (the shore is seen at 2-3 deg: |N.V| median 0.038, 90 % failed);
   - compared 3-D positions with a 0.6 % + 5 cm tolerance against a NEAREST lookup of a HALF-resolution position map of
     the ORIGINAL geometry (60 % of the shore failed this too);
   - eroded every 3 % depth jump between posmap pixels, which cut along the ridge's creases.
   Two more problems made those light-baked texels look wrong:
   - **The light bake read scrambled textures.** m8 deleted every UV layer before baking (`prep()` L332-335). The
     mountain materials (Material.003, V5_Material.003), gfsw and Snow Ground all sample their textures through the active
     render UV (`WORK/blend/mats.json`), so they read their 4096/2048 photo textures through the bake UVs.
   - **One global gain per object** could not carry the plates' spatially varying base mist (ridge gain 1.50 / 1.30 / 1.15).
2. **Bright specks on the dark ridge.** Thin 1-3 px streaks along the ridge's creases (69 in the v8 ridge region, 1 in
   the baseline). They are rasterization artefacts, not texture: they survived in the first v9 build on plate-sourced
   texels, and they are pixel-crisp inside a DOF-blurred surface. Mesh cracks are ruled out: only 9 of 80 specks lie
   within 1 px of the repaired meshes' open edges (base rate 5 %), and there are no T-junctions (`tools/open_edges.py`).
   - **Main cause: back-face culling.** The environment material is FrontSide. Cycles (the plates, and every visibility
     map) is two-sided, so folded or inverted triangles of the photogrammetry scans are surfaces in the plates but holes in
     the engine, showing the sky or the massif behind. Drawing the baked meshes double-sided cut the strong specks from 80
     to 23 (66 to 10 on the ridge).
   - **Second cause: sub-pixel slivers.** The engine draws them at pixel centres where the finer plate saw their
     neighbours, so their texels failed the visibility test and took the fill. Fixed for the mountains by a relaxed
     tier (below).
   - I first read the overlap of specks with v8's light-baked creases (82 %) as a light-bake cause. The v9 test refuted
     that: both occur along the creases. `WORK/LOG.md` keeps the correction.
3. **Dark horizontal line through the far-right range.** m8 deleted every face below z -0.05 ("the lake is opaque").
   The engine's lake ends at y_b 56.5 m, but Object_2.009 / .010 stand at z -11 to -12 far beyond it. That removed
   10,644 rest-visible plate pixels of their lower slopes, and BG.001 showed below a jagged cut at y ~403, x 1240-1335;
   the cut edge read as the dark line (`caps/v8/far_cmp3.png`: baseline / v8 / cut overlay). The lead's estimate of
   x 1340-1440 is about 100 px to the right of the cut; there is no other horizontal line in that area.
4. **Softness.** v8 had 20-25 % less gradient energy than the projected path in the right half (iceberg 3.48 vs 4.44,
   far range 1.61 vs 2.07, mound 5.13 vs 6.63; `evidence/d4_v8_regions.json`). Two causes:
   - low texel density (Plane.015, gfsw, Object_2.009 at 512 px, Object_2.010 at 256 px);
   - the shader added the DOF level as a mip BIAS on the texture's own mip (`texture2D(uBaked, uv, lod)`), while the
     projected path samples the plate at that ABSOLUTE mip.

## Changes (files, and why)

**Pipeline (new; the .ps1 runners and m8 stay for history)**
- `pipeline/bake_env_m9.py`: the Blender side, in stages.
  - `prep`: modifiers applied; the materials' own UV layers kept; the texture space frozen; repair as m8. Only faces
    entirely under the engine's lake footprint are deleted.
  - `maps`: distance maps of the SHIPPED meshes plus the engine lake occluder, from the 5 plate cameras at 2340 x 1273 and
    from 22 engine probe views over the camera envelope (orbit arc, tilt, collapse, hold +-1 deg, the dolly path at the
    pointer extremes, intro).
  - `uv`: per-triangle visibility from all views. Texel need = the largest screen stretch of each triangle (grazing faces)
    with half of the engine DOF credited. Seams at visible/hidden borders, hidden islands x0.2, textures cropped to the
    packed box (non-square).
  - `raster`: texel world positions, with an `rscale` resolution multiplier (1.6 used, BG.001 1.0).
  - `light`: COMBINED, Metal, 128 spp, at most 1024 px.
  - `export`: GLB with the bake UV as TEXCOORD_0, Draco.
- `pipeline/comp_env_m9.py`: the colour compositor (Blender's python, numpy + OpenImageIO), working on the plate EXRs.
  - Per texel and plate: bilinear depth test against the shipped-mesh distance map (0.3 % + 3 cm). Texels on the FAR
    side of a depth edge are excluded within 2 px (anti-aliased rims would ghost when the camera moves); the near side is
    kept. Plate alpha must be 1. Colour from 4 sub-samples over the texel footprint.
  - Priority rest > tilt > hold > orbN > orbP, each weight feathered over 3 texels inside its own region (static weights
    in UV space, so no camera pose can double anything).
  - On the four photogrammetry mountains only: a depth-matched tier, then a relaxed tier (1.5 % + 0.3 m: folded slivers;
    parallax error sub-pixel by construction).
  - Fill: the plates extrapolated by push-pull near plate texels, and the light bake (3x3 median against fireflies) times
    a spatial gain map blur(plate)/blur(light) farther away. The gutter is dilated 16 texels, then push-pull.
  - Writes linear EXRs, a source map per object (`tex/*_src.png`: rest green, tilt blue, hold magenta, orbN yellow,
    orbP cyan, fill dark red, gap bright red) and per-object stats.
- `pipeline/encode_env_m9.py` + `pipeline/finalize_bake_m9.zsh`: the plates' encoding (Standard view, exposure -2.158,
  16-bit PNG, ffmpeg-static `-sws_dither ed`, libwebp q92 compression level 6, engine gain 4.4633), the manifest, and the
  publish into `public/hero`.
- `pipeline/run_bake_m9.zsh`: the zsh runner (slot, `perl alarm` time box, >= 15 % free memory, Blender
  `--python-exit-code 1`, light bake in batches of 8).
- `pipeline/render_plates_m9.py`: the macOS / Metal port of render_plates_v3.py (same camera construction and settings),
  for extra plate cameras. Checked against the old CPU rest plate on a 702 x 407 crop: ratio 0.999-1.000, mean |diff|
  0.23 levels. No extra plates were needed in the end (coverage gaps are small, mostly the smooth sky).
- `pipeline/render_sky_equirect.py` (rewritten in place): Metal; the wisp lit with the rest of the scene present but
  camera-invisible; card crop plus world quad.

**Engine (baked path only; shared file: `retrux-web/app/hero/engine/world/PlateEnvironment.ts`)**
- `PLATE_FRAG`, under `#ifdef BAKED_ENV` / `BAKED_LOD_GRAD`: `samplePlate` uses `textureGrad` with the bake UV's screen
  derivatives (taken once in `main`) scaled by k = 2^lod * uResolution.x / 1800, i.e. the projected path's DOF blur in
  screen pixels (A1 3.2), with anisotropic filtering kept.
- Baked materials: `side: DoubleSide` (as Cycles saw the scans), the `uResolution` uniform, and the defines.
- About 25 lines in total. The projected material's source is unchanged after preprocessing.

**Assets (new, `retrux-web/public/hero/`; every projected asset kept)**
- `env_baked.glb`: 1,079,076 B, 34 meshes.
- `env_baked.json`: 12,854 B. Node names follow three's sanitizer; it records sizes and the plate shares per object.
- `baked/*.webp`: 34 files, 960,214 B, 24,105,376 texels. Largest: Retopo_Plane.012 and Plane.014 (2048^2),
  V2_Ridge 1196 x 1524, BG.001 1720^2.

## Switches (all restore older behaviour exactly)

- `?env=projected`: the projected plates (the way back to the baseline; E-G4 below). `?env=baked` insists on the bake.
- `?envlod=bias`: v8's mip-bias sampling of the baked textures.
- `?envside=front`: back-face culling of the baked meshes, as in v8.

## Verification (T1, scale 1, 1440 x 766, captures with a pinned engine clock DETT=100)

`WORK/tools/shoot_qc.mjs` is MAIN's validator plus a query string (QS), a pinned clock (DETT) and a JS hook. Shards
integrate per frame and stay non-deterministic, so the shard zone is excluded from the diffs.

- **E-G1 rest fidelity: PASS, with 2 tiny marks open.**
  - Region means vs the projected baseline (18 boxes: sky x3, dark ridge, ridge foot, massif, shore mist, foothills,
    iceberg, far-right range, mound, far floes L/R, lake, 4 corners):
    - q00: worst 2.0 levels (far_floes_left); full-frame mean |diff| 1.43;
    - q03: worst 1.3; mean |diff| 1.47.
  - Sharpness (mean |Sobel|) v9 / projected: 1.00-1.08.
  - Distance to the reference over the boxes: F000 10.05 (projected 10.21), F045 9.50 (projected 9.37).
  - The diff map (`caps/eg1_v9e_q00_diff_small.png`) shows faint 1-px outlines along silhouettes (v9's meshes are less
    decimated than the v4 proxy) and texture-grain noise on the iceberg (box mean -0.6). No seam, mist break or line.
  - Bright specks over a 5x5 median by more than 28 levels and over the baseline by more than 20: 24 in the
    environment band, 8 of them on the ridge (v8: 62-66 there).
  - Files: `caps/final_v9g_q00_rest_regions.json`, `caps/final_v9g_q03_eye_regions.json`, `caps/v9e_ridge_right_vs_base.png`,
    `caps/sbs_v9a_q00_*.jpg` (baseline / v9 / reference).
- **E-G2: partial check only (the full 10 spots and the sweep belong to step 2 and the judges).** The pointer extremes
  left / right / top_right / bottom_right and the hold p06 look clean: base mist kept, no seam, no doubled silhouette, and
  the far-right range continues behind the mound. Files: `caps/ptr_v9e/`, `caps/ptr_left_v8_v9e.png`,
  `caps/ptr_right_v8_v9e.png`, `caps/p06_base_v9e.png`.
- **E-G3 budget: assets PASS, frame time inconclusive.**
  - Environment assets: 2.05 MB (budget about 6 MB).
  - perf_probe under the slot's background QoS is throttled for every build, the baseline included (5-8 fps, worst
    216 ms). Interleaved runs show baked at least as fast as the baseline (rest 7.3 / 6.2 fps vs 5.9 / 4.7), but they
    cannot resolve 10 %. A normal-priority perf run is needed (`WORK/perf/`).
  - No shader compile errors in the captures' console logs.
- **E-G4 way back: PASS.** `?env=projected` on :5174 vs :5173, outside the shard zone: q00 0.4368 (max 1), exactly the
  baseline's own repeat difference (0.4368); q03 0.0000 (max 1). Files: `tools/eg4b.py`, `caps/laneD_proj_final`,
  `caps/baseD_1`, `caps/baseD_2`.
- **Typecheck:** `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.hero.json`: 0 errors. Only engine code
  changed, so `-p .` was not needed.

## Outputs for the next step (in WORK, not published)

- `WORK/sky/sky_world.exr`: world-only Nishita sky, 2048 x 1024 half float.
  - Camera at the lake (0, 8.6, 0.3), pano_orb.exr / three.js equirect orientation; row means by elevation in
    `sky_world.json`.
  - The sun disc saturates at the half-float max 65504. Clamp or tone it for the mirror if needed.
  - It contains no BG.001 and no cloud cards (the lake must mirror the world plus the live clouds).
- `WORK/sky/wisp_card.exr`: summit wisp card, 183 x 121 RGBA, premultiplied scene-linear, alpha max 0.54.
  - Rendered with 256 spp and OIDN from the rest plate camera, with the scene present for light and shadow but invisible
    to the camera.
  - `wisp_card.json` gives its world quad (Blender and three.js) through the wisp centre, facing the rest camera; it lands
    on rest-frame box (134, 184)-(281, 281).
  - **The v9 BG.001 and V2_Massif textures still contain the wisp** (it is in the plates). Before drawing the card, rebake
    those two from no-wisp plate crops (`render_plates_m9.py ... nowisp crop:...` for each plate camera around the wisp,
    then `comp_env_m9.py only=BG.001,V2_Massif`), or the wisp will double.
- Rebuilding the bake: `SLOT=$SP/slot/slot.mjs SRC_BLEND=WORK/blend/plate_scene_v7_copy.blend
  run_bake_m9.zsh WORK/bake9 prep,maps,uv,light` (raster with `rscale=1.6 rscale_BG.001=1.0`), then
  `comp_env_m9.py WORK/bake9`, `run_bake_m9.zsh WORK/bake9 export`, and
  `FF=MAIN/hero-pipeline/tools/node_modules/ffmpeg-static/ffmpeg finalize_bake_m9.zsh WORK/bake9 LANE/retrux-web/public/hero`.
  Intermediates are in `WORK/bake9` (prep/bake scene .blend copies, maps, rasters, light EXRs, final linear EXRs).

## Still open

1. **Two tiny marks on the ridge at rest:** frame (79, 325), 1 px, and (126-130, 341-344), an 8-px "V".
   - Blender ray casts hit dark, front-facing ridge triangles there (24242, 25832), and every pixel of the 3x3 around
     them hits the same triangle.
   - The decoded GLB has the same 29,534 triangles and 923 open edges as Blender.
   - With the env meshes hidden at capture time the area is empty.
   - So the rasterized mesh draws them and the ray tracer does not. The likely cause is z-fighting with an overlapping
     folded layer of the scan. To try: remove self-overlapping fold faces around those triangles in `prep`, or a small
     polygon offset per fold.
   - The baseline shows a very faint mark at the same spot.
2. **Engine-side items for step 2 (work item 4):**
   - the lake is still Water.ts re-aiming the projected plate (a faint horizontal line in the lake diff map at y ~567
     comes from that);
   - the planar mirror with `sky_world.exr`; the wisp card (see above); region masks; dropping the projection-only GPU
     work, including bakeDepth, in baked mode.
3. **Frame time at T1** has to be measured at normal priority.
4. **The far-left floes** are the region furthest from the baseline: +2.0 levels at q00, from 1-px silhouette
   differences against the water (finer v9 meshes than the v4 proxy).

## Shared-file hunks for the lead

- `PlateEnvironment.ts`:
  - the `BAKED_LOD_GRAD` block in `samplePlate`;
  - `gBakeDx/gBakeDy` at the top of `main`;
  - `qs` / `lodBias` / `bakedDefines` / `bakedSide` in the constructor;
  - `side` and `uResolution` in the baked material.
- No changes in HeroEngine.ts, RenderPipeline.ts, config.ts, types.ts or assets.ts.


---

# ENV lane, round 11, step 2 of 2 (SPEC 4.1 work item 4, gates E-G1..E-G4): hand-off

Builder: env-engine, 2026-11-14 21:30 to 2026-11-15 07:00 (three sessions; the first two were cut off by the usage limit and
a network outage). Every attempt, number and decision is in `WORK/LOG.md` (step 2 starts at "Step 2 of 2"). My lab (:5174)
is stopped; :5173 and :3000 were never touched. No commits, deploys or uploads.

## What this step delivers

All in the baked path. `?env=projected` is unchanged and verified against the baseline (E-G4).

- **The lake is a true planar mirror** of the baked environment, the live cloud cards and a world-only Nishita sky dome rendered
  in Blender. It keeps the ripples, crest bands, glint, orb terms and the hero reflection, and its rest look is fitted to the
  Cycles plate lake. T0 keeps the re-aimed plate lake (lead decision e).
- **No projection-only GPU work with the mirror lake:** no rest plate, no extra plates, no depth bakes, no extra projectors
  (`assets.ts` does not even download the plates).
- **The summit wisp is a Blender card.** BG.001 and V2_Massif were re-baked from no-wisp plates, and the card is composited
  inside the baked shader before the grade. At rest it lands where the plates had it. From every pointer spot and hold pose
  there is one wisp, at the summit.
- **A regression of step 2 found and fixed:** with no depth bake, the baked materials' rest-camera depth was wrong
  (`uPlateView` stayed the identity). The massif and the iceberg were graded 8-19 levels too dark at rest; now every box outside
  the lake is within ±0.3 levels of the baseline.
- **Region masks via the rest camera (A1 3.7):** the baked materials' gates read the fragment's own rest-camera projection
  (`uv0`) and depth (`fz`), with `uPlateDepthOn` = 1 of their own. No mask depends on a plate texture or a depth bake.
- **DOF:** step 1's textureGrad emulation is kept for the main sample (lead decision a: sharper and no farther from the
  projected plates than `?envlod=bias`). The grade's blurred re-samples are now isotropic, as in the projected path.

## Changes (files, and why)

**Engine (`retrux-web/app/hero/engine/`)**
- `world/LakeMirror.ts` (new).
  - Every frame it renders the environment from the camera mirrored about the water, with an oblique near plane at the water
    level, into a half-float target. The target holds rgb = scene-linear radiance and alpha = mirror path length.
  - Contents: a full-screen world-sky pass from `sky_world.exr`, folded at the horizon; the baked meshes in raw plate-space
    colour; the live clouds. BG.001 and the water are left out.
  - Frustum: reflected elevations -2..35 deg, horizontal margin 1.1.
  - Size relative to the main target: T1 0.5 x 0.5, T2 1 x 0.75.
  - T1 reuses the target for up to 2 frames while the camera has moved less than 3 mm and 0.02 deg since the last mirror render
    (live engine at rest and in the hold: 0 mm and 0.0001-0.0004 deg per frame).
- `world/Water.ts`, `BAKED_MIRROR` only (the plate path's code is unchanged; it sits in the `#else`):
  - One anisotropic `textureGrad` lookup per lake pixel. Its footprint along the elevation direction is the screen footprint
    plus the bump's elevation spread; across it, the screen footprint. Both are scaled by the lake's DOF in screen pixels.
  - Coarse bump octaves the pixel resolves tilt the ray (wavelets near the camera); the far-field spread is `uLakeFar`.
  - Above the target's frustum the lookup reads the sky equirect by direction.
  - `LAKE_CORR`: a static far-water correction, multiplied at the lake point's rest-plate projection. It is fixed on the water
    plane, so it cannot ghost.
  - Gain 1.03. The hero reflection is occluded with the mirror path length (alpha).
- `world/PlateEnvironment.ts`, baked materials only:
  - `uMirrorPass`: raw colour and path length for the mirror pass.
  - `setLakeMirrorPass`: during the mirror pass, hides BG.001 and keeps the clouds' blend from writing alpha.
  - `BAKED_WISP`: the card composited in `samplePlate` / `samplePlateBlur`, before the grade.
  - `samplePlateBlur`: isotropic blurred re-samples. In the projected path it is `#define`d to `samplePlate`.
  - Own `uPlateDepthOn` = 1.
  - The `uPlateView` / `uPlateViewProjF` / `uPlateCamPos` fix in the constructor.
- `assets.ts`:
  - Loads `sky_world.exr`, `lake_corr.png` and the wisp card with the bake. Skips the plates when the mirror lake is used.
  - `mirrorLakeAllowed` (T0 false); `?envlake=` and `?envwisp=0` handling; `exr()` can build a mipmapped texture.
- `HeroEngine.ts`:
  - Creates, renders, resizes and disposes LakeMirror and wires it into the water.
  - No `bakeDepth` with the mirror lake; T0 and the reuse setting.

**Pipeline (`pipeline/`)**
- `encode_sky_m9.py` (new): the sky equirect for the mirror. The sun disc is clamped to luminance 30 with its hue kept (lead
  decision c), then 2x downsampled to 1024 x 512 half ZIP.
- `encode_wisp_m9.py` (new): the card plus the manifest's `wisp` entry. It also keeps the step-1 textures that contain the wisp
  as `baked/*_v9g.webp` (`textureWithWisp`) for the way back.
- `finalize_bake_m9.zsh`: runs `encode_wisp_m9.py` when `WISP_CARD` is set, and copies the card.
- `lake_corr_m9.py` (new): the far-water rest correction.
  - Mask: water pixels, from a capture with the water material invisible.
  - Ratio: plate / mirror, mask-normalized Gaussian blur with sigma 24 px, averaged over clock times 100 / 200 / 300 s
    (t = 0 is the intro and is excluded).
  - Clamped to 0.8-1.3, far water only (rows above 565).
  - Stored on the rest plate's uv grid (144 x 96) as log2 + 0.5.
- `pipeline/render_sky_equirect.py` from step 1 is unchanged here.

**Assets (`retrux-web/public/hero/`)**

| file | bytes | note |
|---|---|---|
| env_baked.glb | 1,079,076 | unchanged from step 1 |
| env_baked.json | 13,643 | adds `wisp` and `textureWithWisp` |
| baked/*.webp (34) | 957,870 | BG_001 and V2_Massif re-baked without the wisp; the other 32 byte-identical to step 1 |
| baked/BG_001_v9g.webp, V2_Massif_v9g.webp | 25,934 + 46,700 | the way back only (`?envwisp=0`) |
| sky_world.exr | 394,365 | world-only Nishita sky, sun clamped |
| wisp_card.exr | 87,087 | 183 x 121 RGBA half, premultiplied |
| lake_corr.png | 3,663 | far-water rest correction |

- Default download of the baked path with the mirror lake: **2.54 MB** (no plates).
- T0 (plate lake) also loads the plates: +1.69 MB.

## Switches (each restores the earlier behaviour exactly)

- `?env=projected`: the projected plates (the baseline; E-G4).
- `?envlake=plate`: step 1's lake (plates, extra projectors, depth bakes) with the baked environment. `?envlake=mirror` forces the
  mirror even at T0.
- `?envlakecorr=0`: no far-water rest correction.
- `?envmirrorrate=1`: render the mirror every frame (no reuse).
- `?envwisp=0`: step 1's textures with the wisp baked in, no card.
- From step 1: `?envlod=bias` (v8's mip bias), `?envside=front` (back-face culling of the baked meshes).

## Gates (T1, scale 1, 1440 x 766)

Captures use `WORK/tools/shoot_qc.mjs` (MAIN's validator plus a pinned engine clock, DETT=100), MAIN's `shoot_sweep.mjs`, and
`WORK/tools3/shoot_pointer.mjs`. The pointer copy differs from MAIN's in one way: MAIN's forces
`env.occlusion.uPlateDepthOn = 1` after each spot. With the mirror lake that uniform is legitimately 0, and forcing it would
switch on the clouds' plate-depth test against an empty texture, so the copy restores the original value.

- **E-G1 rest fidelity: PASS outside the lake. In the lake, PASS on the 3-time mean but not at every single time.**
  - q00 and q03 against the projected baseline: every box outside the lake is within ±0.3 levels (sky, dark ridge, ridge foot,
    massif, shore mist, foothills, iceberg -0.3/-0.2, far-right range, mound, corners TL/TR/BL). Sharpness is 1.00-1.14x the
    projected path.
  - Lake boxes at t = 100: lake -0.4 / -0.5, far floes right -2.3, corner BR +3.4 (0.4 over), far floes left -9.5 / -9.2.
  - Far floes left swings with the live clouds (the mirror follows them; the plate lake's reflections are frozen):
    -6.9 / -0.9 / -1.1 at t = 100 / 200 / 300, mean -3.0. Over those three times: far floes R -2.0, lake +2.5, corner BR +1.7.
  - Against the reference F000, the mirror lake is closer than the baseline: 8 lake boxes sum |d| 23.9 vs 27.7. The reference's
    own F045 is 42.9 from F000.
  - Full-frame mean |diff| 4.19 (q00) / 3.83 (q03), almost all of it in the lake. No seam, mist break or line at rest.
  - Files: `WORK/gate/eg1_q00_rest_regions.json`, `eg1_q03_eye_regions.json`, `WORK/gate/final_q00_base_over_lane.png`,
    `WORK/caps3/corr/lane2c_t*`, `WORK/caps3/corr/lakeband_t100_base_vs_lane2c.png`, `WORK/caps3/lake_left_ref.png`.
- **E-G2 no glitches from any view: PASS by inspection, with 2 tiny ridge marks open.**
  - All 10 pointer spots and the full sweep (intro; hold, pop and release at the pointer extremes; tumble), baseline | lane:
    no doubled silhouettes, tears, holes, stretched texels or bottom bands. One summit wisp in every view. The lake is
    plausible in every view, smoother than the plate lake's re-aimed streaks.
  - Speck counts per spot are not meaningful there: the pointer captures are not clock-pinned, and a repeat of the same build
    moved edges by 1-2 px and changed one count from 69 to 216.
  - Files: `WORK/gate/ptr_sheet_1..4.png`, `WORK/gate/sweep_sheet_1..2.png`, `WORK/gate/sweep_lane/sweep.jpg`,
    `WORK/gate/ptr_lane/`, `WORK/gate/ptr_base/`.
- **E-G3 budget: assets PASS (2.54 MB); frame time within 10 % by the paired measure, with a caveat.**
  - Other lanes' perf runs and an unidentified load outside the slot made `perf_probe` unusable on this machine. The same lane
    build read 18.0 and 40.4 fps in two exclusive rounds, and the baseline 28-45 fps.
  - `perf_probe`, 6 pairs (`WORK/perf5/T1/summary.txt`): rest 34.9 vs 31.6 fps median (+10.3 %).
  - Paired measure (`WORK/tools3/perf_pair.mjs`): the baseline and the lane open in two browsers, short synchronous timing reps
    alternate between them, and the result is the median ratio lane / baseline.
    - Final build: rest **1.057**, hold **1.084**.
    - The previous build with alternate-frame reuse: 1.048 / 1.103.
    - Before the optimizations: 1.12-1.16.
    - The baked environment alone (`?envlake=plate`): 0.992.
  - T0 (plate lake): **0.982**.
  - While the camera moves, T1 renders the mirror every frame. Measured without reuse (half-size target): 1.12-1.16. The
    adaptive render scale exists for that.
  - No shader compile errors or console errors in any capture.
- **E-G4 way back: PASS.** `?env=projected` on :5174 against :5173, outside the shard zone, pinned clock:
  - q00 **0.463** (max 1); q03 **0.332** (max 2). The baseline's own repeat is 0.299 / 0.444.
  - p06 is not comparable: the baseline differs from itself by 2.63 there (the hold is not deterministic).
  - The projected program and the plate water are unchanged by construction: every edit is under `BAKED_*` / `LAKE_CORR`
    defines, the `samplePlateBlur` macro maps to `samplePlate`, and the constructor fix runs only in baked mode.
- **Typecheck:** `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.hero.json`: 0 errors. Only engine files changed.

## Lead decisions (a)-(f)

- (a) DOF: textureGrad kept for the main sample.
  - Sharpness against projected: ridge foot 0.89 vs bias 0.82 vs projected 0.78; massif 2.04 / 2.00 / 1.97.
  - Means are equal; bias was no closer. The blurred re-samples are now isotropic (textureGrad overall cost about 0.7-0.8 ms
    more than bias at T1; the share of the re-samples was not measured on its own).
- (b) Done before the card was drawn: BG.001 and V2_Massif re-baked from no-wisp plate crops.
  - The crops register at offset (0, 0); median |diff| on the edge ring 0.0033-0.0039 linear.
  - Single wisp at rest and from every view.
- (c) Done: the sun disc is clamped to luminance 30 with its hue kept (`encode_sky_m9.py`).
- (d) Polygon offset tried: no effect. Other variants: front/back split with offset, sharp sampling, massif hidden, sky card
  hidden; none changes the 2 marks. They are not z-fighting, pinholes or mip bleeding: the ridge mesh itself draws them.
  Fold-face removal (Blender analysis plus a re-export) is open, see below.
- (e) The mirror at T1 fits only with half-size targets plus reuse while the camera is still. T0 keeps the re-aimed plate
  lake and is protected.
- (f) Done as asked (SLOT_BG=0, 6 pairs, load < 6), plus the paired method, because the slot's exclusivity was not enough.

## Still open

1. **Two tiny marks on the dark ridge at rest:** (79, 325), a 1-px dash, and (128, 342), an 8-px "V".
   - Evidence: `WORK/caps3/ridge_marks.png` and `nobg_marks.png`, and the speck tables in `WORK/LOG.md`.
   - Next step: Blender multi-hit ray casts around triangles 24242 / 25832 from the rest camera, to find the sliver or fold
     that the rasterizer draws. Then delete it in a copy of `WORK/bake9/bake_scene.blend` and run only the export stage. The
     UVs and textures stay valid.
2. **Lake at rest vs the plate lake:** the open water left of centre is 7-10 levels darker (midL); the near centre is 8-12
   brighter (nearC). The single-time far floes left is -9.5 at t = 100.
   - The live-cloud drift is part of it. The rest is the engine's clouds (dimmer than Cycles' by 13-22 % in the readback) and
     how the Cycles bump washes reflections.
   - Possible next steps: extend the rest correction to the near water with a rock-aware mask, or relight the live clouds.
3. **Frame time while the camera moves at T1:** the mirror renders every frame then. A lower-polygon mirror pass or a cheaper
   water lookup would give margin.
4. Baseline note for the lead: MAIN's `shoot_pointer.mjs` forces `uPlateDepthOn = 1`. With the mirror lake, use the WORK copy
   or fix the validator.

## Shared-file hunks for the lead

- `HeroEngine.ts`:
  - the import;
  - `lakeMirror` / `lakeMirrorSize` / `lakeMirrorPass` fields;
  - LakeMirror creation, reuse setting and water wiring in `load()`;
  - `if (!mirror) bakeDepth`;
  - `this.lakeMirror?.render(...)` in `render()`;
  - resize and dispose;
  - the 7th argument to `loadHeroAssets`.
- `assets.ts`:
  - the `sky` and `lakeCorr` fields;
  - `ENV_BAKED` files;
  - `exr(…, mips)`;
  - the `mirrorLakeAllowed` parameter;
  - lake / wisp query handling;
  - the plates-or-sky promises;
  - the return fields.
- `PlateEnvironment.ts`: step 1's hunks plus:
  - `uMirrorPass`;
  - `BAKED_WISP` and `samplePlateBlur` in `PLATE_FRAG`;
  - the mirror early return;
  - the wisp uniforms;
  - `mirrorHidden` / `setLakeMirrorPass`;
  - the constructor's `uPlateView` fix.
- `Water.ts`: the `BAKED_MIRROR` / `LAKE_CORR` blocks and the `mirror` option.
- New: `world/LakeMirror.ts`.
- No changes in RenderPipeline.ts, config.ts or types.ts.

## Rebuilding

- **No-wisp textures:**
  1. `WORK/tools3/wisp_boxes.py` gives the crop boxes.
  2. `WORK/tools3/run_nowisp.zsh` renders the crops (`render_plates_m9.py … nowisp`).
  3. `WORK/tools3/patch_plates.py` patches copies of the plates into `WORK/plates_nowisp/`.
  4. Make `WORK/bake9w`: bake9's maps, raster and light, plus a `cams.json` pointing at the patched plates.
  5. Run `comp_env_m9.py WORK/bake9w only=BG.001,V2_Massif`.
  6. Publish with `FF=… WISP_CARD=WORK/sky/wisp_card.exr WISP_META=WORK/sky/wisp_card.json WISP_KEEP=WORK/bake9/webp
     finalize_bake_m9.zsh WORK/bake9w LANE/retrux-web/public/hero`.
- **Sky:** `BPY -I pipeline/encode_sky_m9.py WORK/sky/sky_world.exr public/hero/sky_world.exr 30 2`.
- **Lake correction:**
  1. Capture q00 at t = 100 / 200 / 300 for the baseline and for the lane with `?envlakecorr=0`, plus one capture with
     `__hero.water.material.visible=false`.
  2. Run `pipeline/lake_corr_m9.py out.png mask.png lane_t100.png base=… lane=… sigma=24`; see the commands in
     `WORK/LOG.md`, 04:25-04:40.

# ENV lane, round 11: fix round (after judge1: pass false, lens 6.6)

Fixers: env-fix, 15 Nov 10:21-11:10 (cut off by the usage limit) and 13:56-15:25 (this session). Every attempt, number and
decision is in `WORK/LOG.md` from "Fix round" on; the evidence is in `WORK/fix/` (first session) and `WORK/fix2/` (second).
My lab (:5174) is stopped; :5173 and :3000 were never touched. No commits, deploys or uploads.

## What the fix round delivers (one line per judge1 finding)

| judge1 finding | fix | verified |
|---|---|---|
| BLOCKER black-lake flash after every render-size change | `LakeMirror.setSize` invalidates the reuse when the size really changes; the default no longer draws the mirror at all | 0 frames < 150 (lake band) on desktop T1 and phone 390x844@2x, default and `?envlake=mirror`, through window, toolbar and adaptive-scale changes (judged build: 53.9-60.5) |
| MAJOR mirror lake: floe / iceberg columns lost, CG ripple lines, boxes outside +-3 | default lake = the re-aimed plate lake on the baked environment at every tier (the judge's interim fix); the mirror stays behind `?envlake=mirror` | lake boxes within +-0.5 and far-floe boxes within +-1.6 at t100 / t200 / t300, T2 and T0; under the right floes col 14.6 / gy 2.00 = baseline (judged 9.0 / 4.63) |
| MAJOR frame time +12-15 % with a moving camera | no mirror pass by default; EnvEdge rebuilt without its own render pass | paired lane / base: rest still 1.061, rest moving 0.997, hold moving 1.060; perf_probe hold -6 % fps |
| MINOR ridge specks / notches at rest and in pointer views | back faces of the 4 photogrammetry mountains carry Cycles' own colour along their rest ray (new textures `baked/*_f1.webp`); EnvEdge softens the rim notches | the V, the dash and the notches are gone at rest (T1 / T2 / T0) and in all 10 pointer views; lane speck counts below the baseline's in every view |
| MINOR raw-raster skylines (stair-steps, light 1-px rim) | `world/EnvEdge.ts`: a 3x3 Gaussian (sigma 0.6) at depth discontinuities, in the plates' encoding | mean skyline profile within 0.02 of the baseline's, offset +0.07 px; px > 20 above y 440 465 -> 350; 4x crops read like the baseline |

## Changes (files, and why)

**Engine (`retrux-web/app/hero/engine/`)**
- `world/LakeMirror.ts`: `refreshOnResize` (default true): `setSize` resets the reuse state (`lastPos = Infinity`, `reused = 0`)
  when the target size changes, so the first frame after a resize renders the mirror into the new target (the blocker's root
  cause: `WebGLRenderTarget.setSize` disposes the target and the reuse then showed an empty mirror).
- `assets.ts`:
  - The default lake is the re-aimed plate lake on every tier (the plates and extra projectors load again by default);
    `?envlake=mirror` draws the mirror; `?envfix=0` restores step 2's choice (mirror at T1 / T2) exactly.
  - Texture choice per object: `texture` (the patched `_f1` files) by default; `textureS2` (step 2's files) with `?envtex=s2`
    or `?envfix=0`; `?envwisp=0` still restores step 1.
- `world/EnvEdge.ts` (new):
  - The baked materials (`PlateEnvironment.setEdgeAlpha`, define `BAKED_EDGE`) and the water (`BAKED_EDGE`) write the view
    distance into alpha. A pixel whose 3x3 spans a depth jump (max > min x 1.06 + 0.5 m) takes a 3x3 Gaussian (sigma 0.6 px)
    computed in the plates' encoding (sRGB of HDR / plate gain); every other pixel is discarded. Only on MSAA tiers with the
    baked environment (T1 / T2); T0 is untouched.
  - Cost: `arm()` (the `afterEnv` hook) only arms a full-screen triangle that lives in the scene (all layers, renderOrder -1e9,
    no depth test or write). The scene's `onBeforeRender` shows it only for the first render into the main target after the
    environment pass (the rings' far half at T1 / T2); its `onAfterRender` disarms it. It samples `main.texture` (the env
    pass's resolve). With three's renderbuffer MSAA that texture is not attached to the draw framebuffer, so there is no
    feedback loop; Chrome / ANGLE Metal does not offer `WEBGL_multisampled_render_to_texture` (checked), and where a browser
    does, EnvEdge first copies the image into a target of its own.
  - Why this kernel: 12 kernels were fitted on the GPU to the baseline's ridge skyline (`WORK/fix2/edgefit/`). Blurring the
    linear HDR value (the first session's version, sigma 0.9) let the sky bleed into the ridge (+0.42 px, worse than no blur);
    the plates' own encoding with sigma 0.6 matches best.
  - Why this structure: the first version drew its own pass into the 4x MSAA HDR target plus a full-frame copy, which on this
    tile-based GPU loads, stores and resolves the whole MSAA image once more: +9.4 % of the T1 frame. Armed: +0.3 % / +2.3 %.
- `world/PlateEnvironment.ts`: `BAKED_EDGE` (alpha = view distance) at the end of the baked fragment shader; `setEdgeAlpha()`;
  the clouds blend without touching alpha (blendSrcAlpha Zero / blendDstAlpha One) whenever the edge alpha is on, as they
  already did in the mirror pass.
- `world/Water.ts`: `BAKED_EDGE` (alpha = view distance) at the end of the water's fragment shader.
- `HeroEngine.ts`: `refreshOnResize` from `?envfix`; EnvEdge creation (`new EnvEdge(renderer, scene, plateGain)`), the
  `afterEnv` hook, resize and dispose.
- `pipeline/RenderPipeline.ts`: the optional `PassHooks.afterEnv` hook, called right after the environment pass (6 lines).

**Pipeline (`pipeline/`)**
- `patch_backfaces_m9.py` (new; a copy of `WORK/tools4/patch_backfaces.py`): every texel of V2_Ridge, V2_Massif,
  Object_2.009 and Object_2.010 that faces away from the rest camera (N.V < -0.05) takes the rest plate's colour along its own
  rest ray (3x3 mean), except within 3 px of a sky / far discontinuity; the gutter is rebuilt with comp_env_m9.py's algorithm
  and the texture encoded as encode_env_m9.py does (the encoder reproduces the published V2_Ridge WebP byte for byte).
  Root cause it fixes: the bright V, the dash and the streak were back faces seen through hairline cracks and holes of the
  scans, carrying light-bake fill (3.3x the front's luma); Cycles renders those back faces as dark as their surroundings.

**Assets (`retrux-web/public/hero/`)**

| file | bytes | note |
|---|---|---|
| baked/V2_Ridge_f1.webp | 87,410 | back faces patched (68,184 texels) |
| baked/V2_Massif_f1.webp | 58,468 | from the no-wisp bake (bake9w), 55,312 texels |
| baked/Object_2_009_f1.webp | 58,316 | 40,021 texels |
| baked/Object_2_010_f1.webp | 28,652 | 16,411 texels |
| env_baked.json | 14,036 (was 13,643) | `texture` -> the `_f1` files, `textureS2` = step 2's files |

- Default environment download: env_baked.glb 1,079,076 + env_baked.json 14,036 + 34 textures 1,002,126 + wisp_card.exr
  87,087 + the 5 plates for the lake 1,687,406 = **3.87 MB** (the mirror's sky_world.exr and lake_corr.png load only with
  `?envlake=mirror`). Every step-1 / step-2 file is kept for the switches.

## Switches (each restores the earlier behaviour exactly)

- `?envfix=0`: the judged build (step 2) exactly: mirror lake at T1 / T2, no resize refresh, step 2's textures, no EnvEdge.
  Verified: vs judge1's own capture of the judged build, outside the hero zone, mean |d| 0.140, max 1.
- `?envlake=mirror`: the mirror lake (with the resize fix); `?envlake=plate` the plate lake (now also the default).
- `?envedge=0`: no EnvEdge. `?envtex=s2`: step 2's textures (no back-face patch).
- Unchanged from earlier steps: `?env=projected`, `?envwisp=0`, `?envlakecorr=0`, `?envmirrorrate=1`, `?envlod=bias`,
  `?envside=front`.

## Gates (T1, scale 1, 1440 x 766, pinned clock DETT=100 unless noted; judge1's own tools)

- **E-G1 rest fidelity: PASS.**
  - Region means, lane - base luma (`WORK/fix2/an/eg1v2_*.json`): q00 and q03 at t100, q00 at t200 and t300, q00 at T2 and
    T0: every box within +-1.6. Worst: far_floes_right -1.2 to -1.6, far_floes_left -1.0 / -1.1, massif_base +0.5 / +0.6;
    lake boxes -0.5 to +0.1; corners within 0.1. (Judged build: lake_mid_left -13.2, lake_near_centre +9.7, lake_right -7.6.)
  - Specks at rest (specks.py thr 30 on the ridge): base 11, lane 1 (a skyline notch the baseline has at the same pixel).
  - Diff map above y 440 outside the shard zone: px > 8 / > 20 = 1698 / 350 (judged 1974 / 465; the baseline's own repeat
    0 / 0). What remains is a faint 1-px outline along the skylines from sub-pixel silhouette positions (ridge offset p10
    -0.21 / p90 +0.31 px): the bake meshes were decimated before the unwrap, Cycles rendered the full scans. Not visible in
    side-by-sides (`WORK/fix2/an/ridgetop_x4_base_judged_v2.png`, base / judged / final).
- **E-G2 no glitches from any view: PASS.**
  - All 10 pointer spots and the full sweep (intro x8; hold, pop, release at L R T B BL TR; tau x8), lane vs fresh baseline
    (`WORK/fix2/eg2/`, `WORK/fix2/an/eg2ptr_v2.txt`, `eg2sweep_v2.txt`): no page errors; lake mean |d| 1.37-2.02 in the
    pointer spots (lake luma within 0.9), 0.94-1.33 in pop / release / tau; one environment, one wisp, the floe columns, no
    double, hole, band or hairline in any view (sheets `WORK/fix2/an/ptr_TR_base_lane_v2.png`,
    `sw_hold_B_base_lane_diff8_v2.png`; first-session frames `WORK/fix/eg2/`).
  - Ridge specks per pointer spot, base / lane: rest 11/1, top 8/2, right 14/5, top_right 20/8, bottom 6/4, bottom_right 7/3,
    orb 5/1, left, top_left, bottom_left 0/0. The judge's ptr_top V and notches and the ptr_right streak are gone
    (`WORK/fix2/an/ptr_top_ridge_x3_base_final_judged.png`, `ptr_right_ridge_x3_base_final_judged.png`).
  - Resize flash (`WORK/fix2/flash/`, judge1's probe): lake-band minimum 167.3 / 162.4 / 167.0 / 168.4 (desktop default,
    desktop mirror, phone default, phone mirror), 0 frames < 150. EnvEdge across window and scale changes: identical frames
    before and after, no console warning (`WORK/fix2/edgeresize/`).
- **E-G3 budget: PASS.**
  - Assets: 3.87 MB by default (above); no shader or console errors in any capture; typecheck 0 errors.
  - Paired synchronous frame cost (judge1's method + camera motion, 15 reps x 12 frames, SLOT_BG=0; `WORK/fix2/perf_v2/`):
    lane / base rest still **1.061**, rest moving **0.997**, hold moving **1.060**; EnvEdge alone 1.003 (rest) / 1.023 (hold
    moving). Before (`WORK/fix2/perf/`): 1.154 / 1.137 / 1.159 with the first EnvEdge (1.094 by itself); judged build 1.12-1.15
    while moving.
  - MAIN's perf_probe, 6 interleaved pairs, every run at 1-min load 4.4-6.0 (`WORK/fix2/probe_summary.txt`): median fps base
    / lane rest 57.3 / 59.8 (vsync-capped), hold 49.9 / 46.9, collapse 58.9 / 59.0; worst frame rest 50.1 / 50.0, hold 66.6 /
    116.6 (one lane run; the other five 33.5-66.6), collapse 50.0 / 33.4 ms. The hold lane's judge ran its own perf_probe in
    the other slot during several of these runs.
- **E-G4 way back: PASS.** `?env=projected` vs two baseline captures, outside the hero zone: q00 0.362 / 0.149, q03 0.448 /
  0.476, max 1. EnvEdge, the patched textures and the lake choice exist only in the baked path.
- **Lead decision 6 (hold), as an ENV regression check: no change.** `git diff` touches nothing under `hero/`, Choreography,
  CameraRig, config, curves, quality or types. judge1's holdrings.mjs (real presses; `WORK/fix2/hold/an_1.txt`; the slot's
  background QoS gave 5 fps in both builds): rest |w| lane / base A 49 / 46, B 40 / 37, C 27 / 25, D 12 / 11 deg/s; the 20 s
  hold varies run to run in both builds as before (A 7 / 36 here, 19 / 19 in the first session, 32 / 42 for judge1). The
  user's 09:05 complaint is the HOLD lane's work.
- **Typecheck:** `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.hero.json`: 0 errors.

## Still open

1. **The mirror lake (`?envlake=mirror`) still has the judged look problems** (no floe / iceberg columns, regular wave lines,
   boxes 3-13 levels off) and costs 1.21x while the camera moves (`WORK/fix/perf1.out`). Root cause (judge1): `mirrorTex()`
   spreads the reflection over one symmetric textureGrad box (fine-octave sigma plus a far-field spread), which averages the
   thin floe reflections into the sky. Next step if the lead wants the mirror back: model the Cycles bump as a vertical
   streak below each reflected feature, narrow the far-field spread for low-elevation features, fit to F000 (col ~20, gy ~2
   under the right floes), and cheapen the pass while the camera moves (single-sided raster, fewer objects, a smaller target
   while moving). Until then the plate lake is the default, as judge1 suggested.
2. **1-px skyline outlines in the diff map** (px > 20 = 350 above y 440): sub-pixel silhouette positions of the decimated bake
   meshes. A larger polygon budget for the skyline objects (V2_Ridge, V2_Massif, the iceberg, the far range) needs a new
   unwrap and bake; not visible in side-by-sides.
3. The default loads the 5 lake plates again (+1.69 MB, 3.87 MB in all), as the baseline does.

## Shared-file hunks for the lead (fix round only; step 1 / step 2 hunks are listed above)

- `HeroEngine.ts`: the EnvEdge import and field; `refreshOnResize` from `?envfix`; the EnvEdge block after the water (`new
  EnvEdge(this.renderer, this.scene, this.env.plateGain)`, `setEdgeAlpha(true)`, the water's `BAKED_EDGE`, `hooks.afterEnv`);
  `envEdge?.setSize` in resize; `envEdge?.dispose()`. `private hooks: PassHooks` (type import).
- `pipeline/RenderPipeline.ts`: `afterEnv?` in `PassHooks` and its call after the environment pass.
- `assets.ts`: `fixOff`, the lake default, the `textureS2` pick.
- `world/PlateEnvironment.ts`: `BAKED_EDGE` alpha in `PLATE_FRAG`, `edgeAlpha` / `setEdgeAlpha`, the clouds' alpha-preserving
  blend in `setLakeMirrorPass` (`keep = on || this.edgeAlpha`).
- `world/Water.ts`: `BAKED_EDGE` alpha.
- New: `world/EnvEdge.ts`, `pipeline/patch_backfaces_m9.py`, `public/hero/baked/*_f1.webp`.

## Rebuilding the patched textures

`BPY -I pipeline/patch_backfaces_m9.py WORK/bake9y FFMPEG V2_Ridge=WORK/bake9 V2_Massif=WORK/bake9w Object_2.009=WORK/bake9
Object_2.010=WORK/bake9 check=WORK/bake9:V2_Ridge:public/hero/baked/V2_Ridge.webp` (through the slot), then copy
`WORK/bake9y/webp/*.webp` to `public/hero/baked/<name>_f1.webp` and point each object's `texture` at it in env_baked.json, with
the previous file as `textureS2` (`WORK/bake9y/env_baked.json.before_fix` / `.after_fix` show the exact edit).
