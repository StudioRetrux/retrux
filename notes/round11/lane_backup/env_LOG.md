# ENV lane, round 11, step 1 of 2 (bake v9): work log

Builder: env-bake. Lane worktree `LANE` = `$SP/lanes/env`, work folder `WORK` = `$SP/work/env`, lab port 5174.
Baseline lab: MAIN on :5173 (projected plates). Reference: `hero-pipeline/reference/ref_F000.png`, `loop_F045.png`.

## 2026-11-14

- 16:45 Read SPEC sections 0-3 and 4.1, A1_env_audit.md in full, bake_env_m8.py, env_repair.py, export_env_v4.py,
  render_plates_v3.py, render_sky_equirect.py, run_bake_m8.ps1, finalize_bake_m8.ps1, blender/bake_v8/bake_log.txt and
  env_baked.json, the BAKED_ENV code in PlateEnvironment.ts and assets.ts. Looked at the lead's crops
  ($SP/cmp_mtn.jpg, cmp_right.jpg, cmp_rocks.jpg) and the q00 frames (qc_baked8 vs qc_base) and F000.
  Machine: memory free 37 %, load ~9, slot free. MAIN lab :5173 up; my lab :5174 not started yet.
- 16:50 Inventory of plate_scene_v7 (copy in WORK/blend; `tools/inspect_v7.py`): Metal device "Apple M4 (GPU - 10 cores)"
  found. BG.001 is glossy-invisible but diffuse-visible (emission (0.166, 0.271, 0.552) x4). World: Nishita single
  scattering, strength 0.4. Volumes V2_BaseMist (205 x 110 x 11 m) and V2_SummitWisp are shadow-invisible.
- 16:55 Ported the plate renderer: `LANE/pipeline/render_plates_m9.py` (render_plates_v3.py settings, Metal GPU, camera
  from an old plate's json or from the engine rig). Test: a 702 x 407 crop of the rest plate (left ridge, mist and wisp)
  rendered on Metal in 154 s and compared with the old CPU plate in the same pixels (`tools/cmp_crop.py`): mean linear
  ratio (0.9989, 0.9996, 1.0000); 8-bit encoded mean |diff| 0.23 levels (p99 1.9); 8x8 block means 0.10 levels (max
  1.48); the x8 diff map is black except faint silhouette noise. Decision: new Metal plates register with the old CPU
  plates within noise, so extra plate cameras can be mixed with the v7 plates. Cost: about 10x the crop for a full plate.
- 17:00 Root-cause evidence so far (v8, `pipeline/bake_env_m8.py` + `blender/bake_v8/bake_log.txt`):
  * Light bake read scrambled textures. `tools/inspect_mats.py` -> `WORK/blend/mats.json`: Material.003 (V2_Massif,
    Object_2.009/.010), V5_Material.003 (V2_Ridge) and gfsw_u1_v1 sample their 4096/2048 photo textures through an
    UNLINKED vector (= the mesh's active render UV); Snow Ground reads Texture Coordinate:UV (same). m8 `prep()` removed
    every UV layer and added "bake" (L332-335), so the COMBINED light bake sampled the mountain atlas, the snow and the
    scan textures with the new bake UVs. Every light-baked texel therefore carried wrong texture detail.
  * The visibility test rejects grazing surfaces. v8 log: Plane.014 (the far snow shore at the foot of the ridge and the
    massif) "visible faces 0.0 %", "plate 0 %"; V2_Ridge visible faces 14.6 %, V2_Massif 11.7 %; floes 1-3 %. m8
    `visible()` (L258-277) needs |N.V| > 0.15 (full weight at 0.35) and a 3-D error < 0.006 L + 0.05 m against a
    NEAREST lookup of a HALF-resolution position map of the original (not the shipped) geometry. At 50-100 m the shore is
    seen at 2-3 deg (|N.V| ~ 0.05) and one posmap pixel spans 0.8-3 m in depth, so it always fails.
    Faces that fail get shrunk x0.25 in UV (L393-408) and take the light bake times ONE global gain per object (ridge
    gain (1.50, 1.30, 1.15): the plate's base mist is not in a surface bake), which is the seam + mist loss of defect 1.
  * Defect 3 (crop `WORK/caps/v8/right_cmp.png`, baseline top, v8 bottom, x 1140-1440 y 350-460 at 3x): the far range is
    cut along a jagged line at y ~403 and BG.001 shows below it. m8 `prep()` L310-319 deletes every face below z -0.05
    ("the lake is opaque"), but Object_2.009 / .010 stand at z -11 to -12 far beyond the lake (the engine water ends at
    y_b 56.5 m), so their visible lower slopes were deleted. The dark "line" is the cut edge.
- 17:25 m9 bake skeleton written (`LANE/pipeline/bake_env_m9.py`, `run_bake_m9.zsh`, `comp_env_m9.py`) and proven on a
  3-object subset (V2_Ridge, Object_2.010, Plane.014) in `WORK/bake9t`: prep 77 s, maps 175 s (5 plates at 2340 x 1273 +
  22 engine probe views at half res; registration check: orb -> rest plate px (1170.9, 652.6 from the top) = A1's
  value in the pixel-centre convention), uv 62 s, raster 14 s.
  m9 prep keeps what m8 cut: V2_Ridge 29,534 polys (75 under the lake; m8 kept 23,406), Object_2.010 0 under the lake
  (m8 kept 8,948 of 65,656 before decimation), Plane.014 235 under the lake (m8 deleted 1,397).
- 17:30 Evidence for the v8 defects (`tools/evidence_v8.py` -> `WORK/evidence/evidence_v8.json` + images), using the rest
  maps of the original geometry, the m8-equivalent repaired ridge, and m8's own visibility rule re-run per rest pixel:
  * D1 seam + mist loss: at rest v8 drew the LIGHT BAKE on 93 % of the shore Plane.014 (plate weight 0.07; |N.V| median
    0.038, 90 % fail the N.V gate, 60 % fail the depth tolerance) and on 37.8 % of the V2_Ridge pixels (folds and
    creases eroded by m8's 3 % depth-jump test on a half-res posmap, plus steep faces). Image
    `evidence/d1_v8_classification_left.png` (green plate, red light bake): the plate/light boundary runs diagonally along
    the ridge foot; the light bake there has no base mist (one global gain per object) and scrambled textures.
  * D2 specks: 69 bright specks (luma > 5x5 median + 28) in the v8 ridge region vs 1 in the baseline. They are thin
    streaks along the ridge creases (`evidence/d2_ridge_v8_specks_cracks_3x.png`). 55 of the 67 on ridge pixels lie on
    or within 1 px of v8 light-baked pixels (base rate 50 %); 0 lie at mesh cracks (only 8 crack pixels exist at rest in
    the repaired ridge). Cause: light-baked crease texels showing the photo atlas through the wrong UVs (white snow
    texels) times the ridge's global gain (1.50, 1.30, 1.15). Not cracks.
  * D3 dark line: m8 deleted 10,644 rest-visible plate px of Object_2.009 (7,162) and Object_2.010 (3,480) below
    z -0.05 outside the lake; `caps/v8/far_cmp3.png` (baseline / v8 / cut overlay, x 1240-1440 y 375-445, 5x): the
    range is cut along a jagged line at y ~403 (x 1240-1335) and BG.001 shows below it; the cut edge reads as the dark
    line. v8 also shows a few dark dots on the gfsw mound (light-baked scan texels).
- 17:35 Subset proof complete (WORK/bake9t, V2_Ridge + Object_2.010 + Plane.014): uv -> raster -> light (Metal,
  128 spp: 7.6 / 39 / 38 s per object once the kernels are cached; the first session paid ~14 min of Metal kernel
  compile while the ICE lane rendered) -> comp_env_m9.py (28 s). First comp: the 2-px band around every depth edge
  excluded BOTH sides from every plate, so 16.8 % of the ridge texels any engine probe sees had no plate (the "gap").
  Changed to exclude only the FAR side of an edge (texel farther than the nearest edge pixel within 2 px by > 1.5 %
  + 5 cm): the near side's anti-aliased rim moves with its own surface, the far side would carry a ghost of the edge.
  Gap of seen texels: ridge 16.8 % -> 5.2 %, Object_2.010 38.5 % -> 13.7 % (same depth tolerance for probes as plates).
  UV need now = the largest screen stretch per triangle (grazing faces need their horizontal density) x 2^(-lod/2)
  (half of the engine's DOF blur at that view credited); textures cropped to the packed UV box (non-square).
- 17:36 Engine fix for defect 4 (BAKED_ENV only): samplePlate used `texture2D(uBaked, uv, lod)` = the DOF level as a
  BIAS on the texture's own mip, while the projected path samples the plate at the ABSOLUTE mip lodDof. Now
  `textureGrad` with the bake UV's screen gradients x k, k = 2^lod * renderWidth / 1800 (the projected blur in screen
  px; A1 3.2), anisotropic filtering kept. `?envlod=bias` restores v8's sampling. tsc -p tsconfig.hero.json: 0 errors.
- 17:37 Full v9 run started: WORK/bake9, all 34 objects, prep,maps,uv,raster,light (spp 128, lsize 1024, cap 2048).
- 17:45 Stopped the full run in the uv stage: BG.001 got 120x120 (its 2 huge triangles are never fully inside a frame, so the need was 0). The need now requires the vertices in front of the camera, not inside the frame. Restarted uv,raster,light.
- 17:55 E-G4 (way back): lab :5174 started (PID 25002). `WORK/tools/shoot_qc.mjs` = MAIN's validator with an extra
  query string (QS) and an optional pinned engine clock (DETT: state.time set, one settle step, freeze), because shards,
  ripples, clouds and the handheld drift made two baseline captures differ by 1.0-1.2 levels mean. With DETT=100 at T1:
  baseline vs baseline outside the shard zone (x 360-1060, y 180-570) 0.437 (q00) / 0.476 (q03); lane `?env=projected`
  vs baseline 0.403 (max 1) / 0.332 (max 2): within the post chain's +-1 dither, PASS (`tools/eg4b.py`,
  caps/baseD_1, baseD_2, laneD_proj). The projected program is unchanged by construction (all edits are inside
  #ifdef BAKED_ENV / BAKED_LOD_GRAD).
- 17:50 Full run (WORK/bake9): prep 124 s, maps 139 s, uv 425 s, raster 33 s (34 objects), light running.
  v8 vs the projected baseline at rest (`evidence/d4_v8_regions.json`, T1, region means and mean |Sobel| sharpness):
  dark_ridge -21.7 levels, ridge_foot -24.8, left_shore_mist -11.5, foothills -8.6, right_iceberg +32.8, mound +9.5,
  far_right_range +5.4. Sharpness: v8 has 20-25 % less gradient energy than projected in the right half (iceberg 3.48
  vs 4.44, far range 1.61 vs 2.07, mound 5.13 vs 6.63, bottom-right 5.17 vs 6.20): defect 4 confirmed there (low
  densities, Plane.015 / gfsw / Object_2.009 512 px, Object_2.010 256 px, plus the mip bias). On the left the v8
  numbers are inflated by the seam and the specks themselves.
  The DOF-credited sizing gives 12.2 M texels; the SPEC asks for at least A1's Balanced budget (~24 M). The packed UV
  layout is resolution-independent and the light bake is resampled by the compositor, so the raster stage gained an
  `rscale` multiplier: rscale 1.6 (BG.001 1.0, cap 2048 per axis) = 24.1 M texels, no uv / light re-run needed.
- 17:59 Full bake finished: light 34 objects in ~4.5 min (Metal, kernels cached), raster at rscale 1.6 (BG.001 1.0):
  24.11 M texels; comp 218 s; export env_baked.glb 1,079,076 B (34 objects, Draco 14/10/14 bits).
  Plate coverage (`tools/gap_summary.py`): the texels some engine probe view sees but no plate covers are mostly the
  sky card BG.001 (smooth, filled by extrapolation); for the rest about 1-2 k plate px^2 per probe view (ridge, shore);
  the hold views have the largest total (4.6 % of a frame each, mostly sky). Decision: no extra plate cameras needed
  (each would cost ~10-25 min of GPU); the fill of those texels is the plates' colour extrapolated in UV space near
  plate texels and the Metal light bake x a spatial gain map (blur(plate)/blur(light), push-pull) elsewhere.
- 18:02 Encode + publish (`finalize_bake_m9.zsh`): Standard view, exposure -2.158, 16-bit PNG, ffmpeg-static
  `-sws_dither ed -vf format=rgb24 -c:v libwebp -quality 92 -compression_level 6` (the plates' exact settings).
- 18:04 v9a q00 (T1, DETT=100) vs the projected baseline: every region within +-1.5 levels except far_floes_left +6.2;
  full-frame mean |diff| 1.25 (v8: 10.26); sharpness equal or higher everywhere (defect 4 fixed). But the thin bright
  dashes on the ridge were still there, at the v8 positions, now on rest-plate texels: so they were NOT a light-bake
  effect (correction of my 17:30 reading of the 82 % overlap, which followed the creases where both occur).
  At 4x they are pixel-crisp inside a DOF-blurred surface = rasterization, not texture. Tested causes:
  * open edges / T-junctions of the shipped meshes projected into the rest frame (`tools/open_edges.py`): 923 open
    edges on V2_Ridge, 0 T-junction vertices; only 9 of 80 specks within 1 px of an open edge (base rate 5 %). Not cracks.
  * back-face culling: the env material was FrontSide while Cycles (plates, visibility maps) is two-sided, so folded /
    inverted triangles of the scans were holes onto the sky or massif. Double-sided baked materials (`?envside=front`
    restores culling): strong specks 80 -> 23 in the env band, 66 -> 10 on the ridge; far_floes_left +6.2 -> +2.5
    (culled floe faces showed the water). Kept.
  * remaining faint ridge dashes = folded sub-pixel slivers drawn at engine pixel centres where the finer plate saw their
    neighbours; their texels failed the strict test and took the fill. A relaxed tier (texel within 1.5 % + 0.3 m of
    the depth the plate saw takes that pixel; parallax error sub-pixel by construction) fixed them (ridge faint 58 ->
    25) but on rocks / floes / the mound it let far-side texels of small-depth silhouettes take the anti-aliased rim
    (env-band strong specks 23 -> 44). Kept it on the photogrammetry mountains only (V2_Ridge, V2_Massif, Object_2.009,
    Object_2.010): strong 23/9, faint 367/28 (v9e).
  * depth-matched bilinear sampling (only plate pixels whose local depth plane is at the texel's depth) globally: no gain
    (41 strong); kept as an off-by-default option (`match=1`) and as an extra mountain-only tier (v9f, neutral).
  * gutter: island-edge colours dilated 16 texels before the push-pull (v9g): dark edge specks 170 -> 151; kept
    (textures 0.80 -> 0.92 MB).
- 18:50 Last two marks on the ridge (frame (79,325) 1 px and (126-130, 341-344) an 8-px "V"): Blender ray casts from
  the rest camera hit front-facing ridge triangles 24242 / 25832 there with dark texels (same as their neighbours),
  every pixel of the 3x3 around them hits the same triangle (no UV seam), the decoded GLB has the same 29,534
  triangles and 923 open edges as Blender, and with the env meshes hidden at capture time the area is empty. So the env
  mesh itself draws them in the rasterizer but not in the ray tracer: most likely z-fighting with an overlapping folded
  layer of the scan (within depth precision at 94 m). The baseline shows a very faint mark at the same spot. Open.
- 18:52 Final published state = v9g. E-G1 (T1, DETT=100, `caps/final_v9g_*_regions.json`): q00 worst box 2.0 levels
  (far_floes_left), full mean |diff| 1.43; q03 worst 1.3, full 1.47; sharpness v9/projected 1.00-1.08; distance to the
  reference over the 18 boxes: F000 10.05 (projected 10.21), F045 9.50 (projected 9.37). Strong bright specks in the
  ridge region 8 (v8: 62-66). Pointer extremes left / right / top_right / bottom_right and the hold p06 look clean
  (`caps/ptr_v9e/`, `caps/ptr_left_v8_v9e.png`, `caps/ptr_right_v8_v9e.png`, `caps/p06_base_v9e.png`): base mist kept,
  no seam, the far-right range continues behind the mound.
  E-G3: env assets 34 WebP 960,214 B + GLB 1,079,076 B + manifest 12,854 B = 2.05 MB. perf_probe under the slot's
  background QoS is throttled for every build (5-8 fps, worst 216 ms, baseline included): baked >= baseline in
  interleaved runs (rest 7.3 / 6.2 fps vs 5.9 / 4.7) but this cannot resolve 10 %; needs a normal-priority run.
  E-G4 re-checked with the final code: `?env=projected` vs baseline outside the shard zone q00 0.4368 (max 1, equal to
  the baseline's own repeat), q03 0.0000 (max 1). tsc -p tsconfig.hero.json: 0 errors.
- 18:31 Blender renders for the next step (`pipeline/render_sky_equirect.py`, Metal, 32 s total): `WORK/sky/sky_world.exr`
  (2048 x 1024 half, world only, camera at the lake (0, 8.6, 0.3), pano_orb orientation; row means by elevation in
  sky_world.json; the sun disc saturates at the half-float max 65504) and the summit wisp card `WORK/sky/wisp_card.exr`
  (183 x 121 RGBA premultiplied, alpha max 0.54, 256 spp + OIDN; rest-frame box (134, 184)-(281, 281); its world quad in
  Blender and three.js coordinates in wisp_card.json, placed at the wisp centre facing the rest camera so it lands on the
  same pixels at rest). The v9 BG.001 / V2_Massif textures still contain the wisp (the plates do).
- 18:55 Lab :5174 (PID 25002) stopped. :5173 untouched.

# Step 2 of 2 (SPEC 4.1 work item 4 + gates E-G1..E-G4)

Builder: env-engine. Same LANE / WORK / lab port 5174.

- 21:30 Resumed. The first attempt at step 2 (18:57-19:08, cut off by the usage limit) only built the lab bundle
  (`retrux-web/hero-lab/dist/main.js`, 19:05); no source file changed after step 1 (checked mtimes and `git -C LANE diff`:
  only PlateEnvironment.ts and render_sky_equirect.py modified, both from step 1). No lab is listening on :5174. Slot free,
  load 2.8, memory free 64 %. The slot now honours SLOT_BG=0 (normal QoS for timing runs).
  Read SPEC 0-3 / 4.1, HANDOFF, this log, Water.ts, PlateEnvironment.ts, HeroEngine.ts, RenderPipeline.ts, assets.ts,
  quality.ts, A1 sections 0, 2, 3 and forensics 1.4, 1.5, 3.3, 3.7, 5.3, 5.4.
  Plan: (1) lake = planar mirror in baked mode: an env mirror pass (baked meshes in a raw "plate-space" mode with
  alpha = mirror path length, clouds, a world-sky dome from the clamped sky_world equirect; not BG.001, not the water)
  from the mirrored camera with an oblique clip at the water plane, sampled by a BAKED_MIRROR path in Water.ts that keeps
  the ripples, crest bands, fog / bank / mist, the hero reflection (occluded via the mirror alpha) and the orb glint;
  (2) no projection-only work in baked mode (no extra plates, no depth bake, own uPlateDepthOn = 1 for the region gates);
  (3) wisp: no-wisp re-bake of BG.001 / V2_Massif, then the card; (4) ridge specks; (5) gates.
- 21:35-22:05 Engine, baked path: `world/LakeMirror.ts` (new): the mirrored camera (as RenderPipeline.updateMirror) with an
  oblique near plane at the water (Lengyel; no shader change, no discard), a full-screen world-sky pass from the shipped
  `public/hero/sky_world.exr` (new, 394 KB: WORK/sky/sky_world.exr through `pipeline/encode_sky_m9.py`: the 18 sun-disc px
  that reached the half-float max clamped to luminance 30 with the hue kept, 2x box-downsampled to 1024 x 512, half ZIP; the
  sun lands at u 0.0803 / 18.7 deg, i.e. the three.js equirect orientation of pano_orb.exr), then the env layer: baked
  meshes in a raw mode (PlateEnvironment `uMirrorPass`: ungraded plate-space colour, alpha = mirror path length), the live
  clouds (alpha blend factors Zero/One in the pass so the path length survives), not BG.001 (glossy-invisible in Cycles), not
  the water. assets.ts: baked + mirror lake loads no plates at all (rest + 4 extras skipped) and the sky; HeroEngine: no
  depth bake when the mirror is on; baked materials get their own uPlateDepthOn = 1 (region gates no longer need the bake).
  `?envlake=plate` restores step 1's lake (plates, projectors, depth bakes).
- 22:05 First sharp mirror (caps2/m1): works (real reflections of massif, iceberg, floes, live clouds) but far too crisp vs
  the plate's lake. Smear sweeps in mirror-image space (sw1, sw2): far-left fixed but mid / near lake 20-30 levels dark.
- 22:15 Ground truth (Cycles, `tools2/diag_lake.py`, rest plate camera, lake band, 50 %, 9 s per variant on Metal, slot):
  A = plate state reproduces plate_rest.exr within ~3 %; B = clouds glossy-invisible: mid / near lake fall to the bare sky
  (ring 0.29/0.43/0.81 vs 0.71/0.82/1.16): the clouds are the lake's main light; C = bump off = perfect mirror (massif,
  iceberg, clouds, dark ridge all reflected; far-left 0.07); the bump washes the dark reflections out (far-left 0.07 -> 0.34,
  far-right 0.23 -> 0.43) and dims the cloud ones (ring 0.96 -> 0.71). Stack: diag_lake/stack_ABCD.png.
- 22:30 Readback of the engine's raw lookup (scene-linear, `uLakeDebug`, `tools2/lake_readback.mjs`) vs C: the sharp
  engine mirror matches Cycles' perfect mirror (far-right 0.238 vs 0.228, mid-right 0.132 vs 0.143; cloud areas 13-22 %
  dimmer: the live clouds' drift at the pinned clock and their shading). So the mirror pass is right; the bump is the work.
- 22:30-23:00 Bump model (Water.ts BAKED_MIRROR): Cycles' bump = finite-difference slope over each pixel's ray differentials,
  64 spp jittered inside the pixel: octaves coarser than the along-view footprint DISTORT the reflected ray (wavelets near
  the camera), finer ones SPREAD it in elevation (5 taps, the far mountains wash out). Static field (Cycles' noise is in
  object space). Engine value noise: gradient RMS 0.764 per axis (`tools2/noise_rms.py`). Mirror target re-framed to its own
  frustum over reflected elevations -2..50 deg (the old frustum lost the clouds above 12.75 deg; taps above 50 deg read the
  sky by direction). Fit: readback sweeps rb2/rb3 vs A (log-ratio RMS 0.20 raw at best), then display sweeps sw5/sw6 vs the
  baseline: chosen uLakeBump (0.008, 2.0, 0.7, 1.4), gain 1.15 (sw6 at gain 1.25: lake box +6.8 / +6.8 / +6.4, band mean
  |diff| 10.4 vs 17 for the sharp mirror; vertical texture energy 8-12 vs the baseline's 3-10). Remaining: far floe columns
  weaker than the plate's, a faint cloud patch mid-right, far-left corner 10-15 levels dark.
  NEXT: check gain 1.15 at rest, then p06 / pointer extremes / q03 for plausibility; then perf; then wisp.

## 2026-11-15 (step 2, third session)

Note on the times above: the step-2 entries of the second session (after 21:30) carry estimated clock times that run ahead of
the files; the real order (file mtimes) is: diag_lake 21:58, readbacks rb1-rb3 22:05-22:08, sweeps sw5 / sw6 22:09-22:11,
this log 22:11, view captures caps2/views_lane + views_base (q00, p06, pointer extremes) 22:12, a Water.ts edit 22:13
(uMirrorGain 1.08 in the code, the log said 1.15), one perf try each (perf2/try_base 27.4 fps rest vs try_lane 23.3 fps,
single runs), tools2/perf_ab.mjs and perf_gpu.mjs 22:16-22:21; the outage came at about 22:38.
- 03:50 Resumed (env-engine, third session). Read SPEC 0-3 / 4.1, HANDOFF (still step 1's), this log, the step-2 diffs
  (HeroEngine.ts, assets.ts, PlateEnvironment.ts, Water.ts, LakeMirror.ts). Machine: load 4.0, memory free 60 %, slot free
  (conf n 3, bg false). :5173 and :3000 up (not mine). Started my lab :5174 (PID in lab5174.pid), build ok.
  Plan for this session: (1) no-wisp re-bake of BG.001 / V2_Massif (Blender, background through the slot) while the
  engine work goes on; (2) wisp card composited inside the baked env shader before the grade; (3) mirror lake: gain at
  rest, plausibility at q03 / p06 / pointer spots, perf (6+ interleaved pairs, SLOT_BG=0); (4) ridge specks; (5) gates.
- 03:55-04:01 Wisp (lead decision b). No-wisp crops of the 5 plate cameras (`tools3/wisp_boxes.py`: the wisp volume's bounding
  sphere, r 6.42 m, projected with each plate's PV + 24 px; `tools3/run_nowisp.zsh`: render_plates_m9.py json:<plate> crop
  nowisp spp=64, Metal, 6-10 s each, one slot hold). `tools3/patch_plates.py` -> `WORK/plates_nowisp/`: every crop registers
  at offset (0, 0) (median |diff| on a 16-px ring 0.0033-0.0039 linear = noise); patched into copies of the plates with a 12-px
  edge ramp; previews `plates_nowisp/*_prev.png` (with | without | diff x8: only the wisp and render noise differ).
  `WORK/bake9w` = bake9's maps / raster / light (symlinks) + cams.json pointing at the patched plates; comp_env_m9.py
  only=BG.001,V2_Massif with the v9g defaults (26 s): same source shares as v9g, gains (1.006, 1.004, 1.004) / (0.988, 0.997,
  1.005). encode_env_m9.py: the other 32 textures encode byte-identical to the published ones; BG_001 25,934 -> 23,556 B,
  V2_Massif 46,700 -> 46,734 B.
  Card asset: WORK/sky/wisp_card.exr re-saved half ZIP = 87,087 B (exact half; outer 2 px rgb and alpha 0).
  New `pipeline/encode_wisp_m9.py` (card + manifest "wisp" {card, quad (three), restBox} + "textureWithWisp" = the v9g
  textures kept as baked/BG_001_v9g.webp, V2_Massif_v9g.webp); `finalize_bake_m9.zsh` runs it when WISP_CARD is set and copies
  the card. Published (backup of the previous manifest + 2 textures in WORK/pub_backup_v9g).
  Engine: assets.ts loads the card (half EXR with mips) unless `?envwisp=0` (then the v9g textures, no card); PlateEnvironment
  BAKED_WISP: the camera ray to each baked fragment against the card quad; the card (textureLod at the plate's absolute DOF
  mip: the card is at plate texel density) composited premultiplied INTO samplePlate, i.e. before the grade, as the plates had
  it; weight ramps over +-3 m around the card plane (surfaces inside the volume).
- 04:05-04:12 BUG found and fixed (from step 2's second session): with the mirror lake, bakeDepth is skipped, and bakeDepth
  was the only place that set the shared occlusion uniforms uPlateView / uPlateViewProjF / uPlateCamPos. uPlateView stayed
  the identity, so the baked materials' rest-camera depth fz = -(uPlateView p).z became -z world and every depth-gated grade
  term misfired on the massif and the iceberg. Evidence: q00 crop of the massif face (x 180-460, y 180-360): baseline vs lane
  mean |diff| 8.6 (lane -7 levels, crisper gullies), step 1's own capture 0.84; `?envlake=plate` 1.18; the mirror pass off at
  runtime 8.6; clouds hidden in both modes still 8.2 (so not the clouds); uniform dump (`tools3/uniform_dump.mjs`, caps3/
  dump_*.json): uPlateView identity, uPlateCamPos (0,0,0) in mirror mode. Fix (PlateEnvironment constructor, baked mode only):
  set the plate camera's constant view terms there (bakeDepth writes the same values where it still runs, so the projected
  path is untouched). After: q00 region boxes vs the baseline all within 0.3 levels outside the lake (massif 0.0, iceberg -0.2;
  caps3/fix1_reg_regions.json). The lake gain fit of session 2 was made with this bug present (the lake's own code does not
  read these uniforms, but the floes in its band do), so the lake is re-measured below.
  Lake after the fix (q00 vs baseline, uMirrorGain 1.08): lake +2.4, far_floes_left -7.9, far_floes_right -2.9, corner_BR +3.0,
  full-frame |diff| 4.63 (step 1's plate lake: 1.35).
  Wisp at q00: a live cloud card sits behind the summit, so the wisp reads faintly; card vs no card differs only inside the
  card box (caps3/wisp_cmp.png); no double. Numbers for the wisp box follow with the gates.
- 04:15-04:35 Lake model v2 (BAKED_MIRROR). Diagnosis at q00 vs the baseline and F000 (caps3/bump1*, lake_left_ref.png): the
  session-2 lake showed horizontal wavelet glitter over the mid lake (the reference and the plate lake are smooth there, with
  soft vertical columns under the far floes) and blocky stair-steps at the far left. Mirror-target readback
  (`tools3/mirror_dump.mjs`, caps3/mirror_target.png): 75 % of its 460 rows held elevations 10-50 deg (plain sky); the
  0-12 deg band with floes, mountains and clouds had ~110 rows, ~13 screen px per texel vertically at the lake's DOF mip
  (4 px horizontally): the stair-steps. Below the horizon the sky pass wrote black, which the spread averaged in.
  Changes: frustum top 50 -> 35 deg and vertical scale 0.6 -> 0.75 at T1/T2 (2.1x the vertical density); the sky pass folds
  at the horizon; the 5 discrete elevation taps replaced by ONE anisotropic textureGrad lookup (footprint along the
  elevation direction = screen footprint + a 3.46 sig box; across it the screen footprint; both x the lake DOF in screen px,
  uResolution added to the water); a far-field spread uLakeFar (std 0.05 rad reached over 15-45 m, in quadrature).
  Sweeps (caps3/bump2, far1, far2; `tools3/lakeboxes.py`): spread gain 1.4 and distortion thresholds (2, 0.7) kept; the
  far spread at (0.05, 15, 45): 8 lake boxes vs the baseline sum |d| 39.8 -> 32.6; vs F000 23.9 (the baseline itself is
  27.7 from F000, F045 42.9). Gate boxes vs the baseline: lake +1.4, far floes R -2.7, corner BR +2.9, far floes L -7.9
  (left water between the far floes reflects the massif foot and the floes' dark sides darker than Cycles' wash).
  Next: A1's static correction (blurred plate/engine ratio at rest, averaged over clock times 0/100/200/300 s, indexed by
  the lake point's rest-camera projection: fixed on the water plane, cannot ghost).
- 04:25-04:40 Lake rest correction (A1 2.1 #12) + gain. New `pipeline/lake_corr_m9.py`: mask = water pixels (a capture with
  the water MATERIAL invisible; hiding water.group does not stick, the mirror pass restores it every frame), mask-normalized
  Gaussian blur (sigma 24 px) of plate / mirror in linearized display space, averaged over the clock times 100/200/300 s
  (t = 0 is the intro: whole frame brighter, sky 240 vs 217, excluded), clamped 0.8-1.3, FAR WATER ONLY (rows above 565,
  faded over 40 px: near the rocks the two lakes disagree about near reflections that move with the camera, a static patch
  would show beside them), on the rest plate's uv grid 144 x 96, log2 + 0.5 in an 8-bit PNG: public/hero/lake_corr.png
  (3.4 KB). Water.ts LAKE_CORR multiplies the raw reflection by it at the lake point's rest-plate projection (vPlateClip):
  fixed on the water plane, no ghost. `?envlakecorr=0` skips it. uMirrorGain 1.08 -> 1.03 (the near/mid lake box ran +4 on
  average at t 100-300).
  Result vs the baseline (caps3/corr/lane2c_t*, gate boxes; per time t=100 / 200 / 300 and the mean):
  far_floes_left -6.9 / -0.9 / -1.1 (mean -3.0), far_floes_right -1.7 / -2.4 / -1.9 (-2.0), lake -0.1 / +4.5 / +3.2 (+2.5),
  corner_BR +2.7 / +1.7 / +0.7 (+1.7). The single-time swing is the live clouds' drift (the mirror follows them, the plate
  lake's reflections are frozen at the Blender cloud positions). Look: caps3/corr/lakeband_t100_base_vs_lane2c.png.
  Remaining lake differences: midL -7..-10 (open water left of centre, darker), nearC +8..+12 (near centre, brighter).
- 04:38-04:53 Perf E-G3, first batch (WORK/perf3/T1, `tools3/perf_batch.zsh`, SLOT_BG=0, triplets base :5173 / lane / lane
  envlake=plate, perf_probe tier=T1&scale=1): CONTAMINATED. All 3 slots were held by perf runs of three lanes at once
  (hold:perf, env:perf, ice:perf), so their headless Chromes shared the GPU: the baseline stayed steady (rest 26.1-26.6
  fps) but the lane swung 32.9 / 36.3 / 18.0 fps at rest and 32.3 / 21.9 / 14.7 in the hold, frame times on 16.7 ms vsync
  multiples. One of my probes hung after its samples (Chrome gone, node waiting; killed; `tools3/perf_watchdog.zsh` now kills
  such hangs). Stopped after 3 rounds. Re-run: `tools3/perf_batch2.zsh` waits before each round until no OTHER lane holds a
  slot and the 1-min load is < 6 (rounds.txt records exclusive=1/0): WORK/perf4/T1, 6 rounds base/lane, started 04:54.
  Also found: MAIN's shoot_pointer.mjs forces env.occlusion.uPlateDepthOn = 1 after each spot's fill-off shot; with the
  mirror lake that uniform is legitimately 0 (no depth bake) and forcing it would switch on the clouds' plate-depth test
  against an empty texture. WORK copy `tools3/shoot_pointer.mjs` restores the original value (and takes QS).
- 04:54-05:55 Perf E-G3 investigation. Exclusive perf_probe round 1 (WORK/perf4/T1): base rest 44.3 fps, lane 37.1 (+19 %
  frame time), hold +8.9 %, collapse +4.6 %; stopped to optimize. Synchronous render cost per configuration in one page
  (`tools2/perf_gpu.mjs`, h.render() + 1-px readPixels, interleaved): lane full 28.8 ms, mirror pass off 25.6, mirror target
  half size 26.8, water hidden 27.5; baseline 24.8 (separate page). Two-sided raster in the mirror pass ~2 ms (from below
  the water most terrain shows its undersides). Other lanes' perf runs held the other slots for long stretches and inflated
  everything (36-60 ms), so I wrote `tools3/perf_pair.mjs`: the baseline and the lane in two browsers side by side, short
  synchronous timing reps alternating, median of the per-pair ratio lane / baseline (contention hits both alike).
  Paired ratios at rest, T1 (noisy +-4 %): lane (half-size mirror) 1.164 and 1.124; mirror pass off 1.080; front-side
  culling 1.150; mirror off + front side 1.000; anisotropy 4 on baked textures and the mirror target 1.135 (no gain);
  `?envlake=plate` (baked env + re-aimed plate lake) 0.992. So the baked environment itself is free; the mirror lake costs
  12-16 %. Triangles: env_baked.glb 224,644 vs env_proxy.glb 200,469 (geometry is not the difference).
  Changes kept: (1) mirror target T1 [0.5, 0.5] (quality: lake boxes within 2.2 levels of the full-size target, caps3/msize);
  T2 keeps [1, 0.75]; (2) T0 keeps the re-aimed plate lake (lead decision e; assets mirrorLakeAllowed = tier != T0;
  `?envlake=mirror` forces the mirror at any tier); (3) the grade's blurred re-samples isotropic (samplePlateBlur: textureLod at
  the footprint's longer axis, as the projected path's textureLod), the main sample keeps textureGrad (q00 boxes outside the
  lake unchanged within 0.6, caps3/blur1_reg); (4) T1 reuses the mirror target on alternate frames while the camera moved
  < 3 mm and < 0.02 deg since the last mirror render (`?envmirrorrate=1` renders every frame).
  Official perf_probe batch (6 pairs, exclusive-wait) started 05:55: WORK/perf5/T1.
- 05:55-06:30 Perf results (T1, scale 1). Official perf_probe batch (WORK/perf5/T1, 6 pairs, rounds 2-4 and 6 with no other
  lane in the slot): rest base 34.9 / lane 31.6 fps median (+10.3 % frame time), but the same build read 18.0 and 40.4 fps
  in two exclusive rounds and the baseline 28.3-44.9: something outside the slot loaded the GPU, perf_probe cannot resolve
  10 % on this machine today (WORK/perf5/T1/summary.txt). Paired ratio lane / baseline (`tools3/perf_pair.mjs`, contention
  hits both): alternate-frame reuse rest 1.048, hold 1.103; then up to 2 reused frames when still: rest 1.057, hold 1.084
  (WORK/perf_pair4.log, perf_pair5.log). Live camera motion (`tools3/cam_motion.mjs`): 0 mm and 0.0001-0.0004 deg per frame
  at rest and in the hold sustain, the mirror reused 45 of 90 frames with reuse 1 -> the reuse works in the live engine.
- 06:30-06:50 Gate batch 1 (WORK/gate/qc_*, pinned clock DETT=100, `tools3/gate1_analyse.zsh`):
  E-G1 q00 / q03 vs the projected baseline: every box outside the lake within +-0.3 levels (sky, ridge, ridge foot, massif,
  shore mist, foothills, iceberg -0.3/-0.2, far-right range, mound, corners TL/TR/BL); lake -0.4 / -0.5; far floes R
  -2.3 / -2.3; corner BR +3.4 / +3.4; far floes L -9.5 / -9.2 (this box swings with the live clouds: -6.9 / -0.9 / -1.1 at
  t 100 / 200 / 300, mean -3.0). Full-frame mean |diff| 4.19 / 3.83 (the lake).
  E-G4 (?env=projected on :5174 vs :5173, outside the shard zone): q00 0.463 (max 1), q03 0.332 (max 2), both <= 0.5;
  the baseline's own repeat 0.299 / 0.444. p06 not comparable (baseline self-diff 2.63: the hold is not deterministic).
  DOF mode (lead decision a): textureGrad vs ?envlod=bias vs projected sharpness: ridge foot 0.89 / 0.82 / 0.78, massif
  2.04 / 2.00 / 1.97, iceberg 4.49 / 4.38 / 4.37; means equal; keep textureGrad (step 1 showed v8's bias 20-25 % softer).
  Ridge specks (lead decision d), strong bright env / ridge vs the baseline: lane 30 / 8; polygon offset on the ridge 31 / 9;
  front side only 86 / 66; back side only 45 / 24; massif hidden 30 / 9; sharp sampling (no DOF) 29 / 9; front faces + a
  back-face draw with polygon offset 1/4 and 2/16 (also on the massif and far ranges) 30 / 8; sky card hidden: the two marks
  unchanged (caps3/nobg_marks.png). So they are not front/back z-fighting, not pinholes onto BG.001 or the massif, not mip
  bleeding: the ridge mesh itself draws them. Open (needs the Blender multi-hit ray analysis of the fold around triangles
  24242 / 25832 and a fold-face removal + export).
- 06:40-06:50 E-G2 (WORK/gate/ptr_lane, ptr_base via `tools3/shoot_pointer.mjs`; sweep_lane, sweep_base via MAIN's
  shoot_sweep.mjs). Contact sheets baseline | lane at half size (gate/ptr_sheet_1..4.png, gate/sweep_sheet_1..2.png,
  gate/sweep_lane/sweep.jpg): all 10 pointer spots and the hold / pop / release at the extremes show no doubled mountain or
  rock, no tear, hole, stretched texel or bottom band; ONE summit wisp in every view, at the summit; the lake plausible in every
  view (smoother than the plate lake's re-aimed streaks, floe columns softer). Lane console: no errors.
  Speck counts per pointer spot (`tools/specks.py`, lane vs baseline at the same spot): 15-69 strong in the env band, 0-13 on
  the ridge; NOT clock-pinned captures, so they include cloud / shard / sub-pixel pose differences: a repeat of the lane alone
  moved every edge by 1-2 px and bottom_right went 69 -> 216 with identical content (gate/specks_br_zoom2.png). A try at a
  wider mirror side margin (1.1 -> 1.3) for the left-edge water dashes changed nothing visible: reverted (they are
  near-field ripple highlights, not clamped edge texels).
- 06:50-07:00 Tiers. T0 (keeps the re-aimed plate lake): paired ratio lane / baseline at rest 0.982 (T0 protected); q00 at T0
  vs the baseline at T0: every box within +-1.1 (lake 0.0, far floes L -0.6), full |diff| 1.46 (gate/tier_T0_*). T2 (mirror,
  full-size target): renders, no console errors, boxes as at T1 (far floes L -8.6 at t=100, corner BR +3.3), gate/tier_T2_*.
  Final q00 look: gate/final_q00_base_over_lane.png.
  Assets (public/hero): env_baked.glb 1,079,076; env_baked.json 13,643; 34 default baked WebP 957,870; sky_world.exr
  394,365; wisp_card.exr 87,087; lake_corr.png 3,663 => default download of the baked path with the mirror lake 2,535,704 B
  (no plates). Way-back only: baked/BG_001_v9g.webp 25,934 + V2_Massif_v9g.webp 46,700 (?envwisp=0). T0 also loads the
  plates (1,687,406 B). tsc -p tsconfig.hero.json: 0 errors.
- 07:05 Lab :5174 (PID 75898) stopped; :5173 and :3000 untouched. HANDOFF.md has the final step-2 section. Step 2 ends here.

# Fix round (after judge1: pass false, lens 6.6)

Fixer: env-fix, started 2026-11-15 10:21 WIB. Same LANE / WORK / lab port 5174. Judge files: `WORK/judge1/` (verdict_draft.md,
tools/, qc*/, an*/, crops3/, eg2/, perf/, hold/). Machine at start: 1-min load 19.6, memory free 49 %, slot n 3 (hold:perf and
ice:fix-f02 holding two). :5173 (baseline), :5175 (hold), :5176 (ice), :3000 (lead) are up; none of them is mine.

Findings to fix, in order: (1) BLOCKER black-lake flash after every render-size change; (2) MAJOR mirror lake loses the floe and
iceberg reflection columns, lake boxes outside +-3; (3) MAJOR frame time +12-15 % at T1 while the camera moves; (4) MINOR ridge
specks / notches at rest and in pointer views; (5) MINOR raw-raster skyline silhouettes (stair-steps, light 1-px rim).
Gates to re-run: E-G1, E-G2, E-G3 (all FAIL), plus E-G4 and the hold regression check (lead decision 6) as guards.

- 10:21 Read SPEC 0-3 + 4.1, HANDOFF (steps 1 and 2), this log, judge1/verdict_draft.md, the lane diff (LakeMirror.ts,
  HeroEngine.ts, Water.ts, assets.ts) and judge1/tools/resizeflash.mjs + qc5/flash_*.log.
- 10:24 Code (fix 1, the blocker): `LakeMirror.setSize` now invalidates the reuse when the target size really changes
  (`lastPos = Infinity`, `reused = 0`), so the next frame renders the mirror into the freshly allocated target.
  `refreshOnResize` (HeroEngine sets it from `?envfix`); `?envfix=0` restores step 2 exactly.
  Code (fix 2, the lake major, first part): `assets.ts` keeps the re-aimed plate lake on the baked environment at EVERY tier by
  default; `?envlake=mirror` draws the mirror lake; `?envfix=0` restores step 2's default (mirror at T1 / T2).
  tsc -p tsconfig.hero.json: 0 errors. Lab :5174 started (pid in lab5174.pid, log lab5174_fix.log).
- 10:28-10:33 Flash, reproduced then re-verified (`tools4/resizeflash_v.mjs` = the judge's resizeflash.mjs with a configurable
  viewport and lake band; `tools4/fixbatch1.zsh`; results `fix/flash/*.json|log`; one slot, load 12.6). Lake-band mean per
  frame across window 766->760->766, adaptive scale 1->0.85->1 and the adaptive steps that happened on their own:
  judged build (`?envfix=0`): T1 min 59.15 (4 frames < 150), phone 390x844@2x (toolbar 844->790) min 53.89 (3 frames < 150);
  fixed mirror (`?envlake=mirror`): T1 min 163.71 of 244 frames, phone min 168.25 of 456 frames, a second T1 run min 162.67
  (0 frames < 150; target widths 504 / 576 / 612 / 720 all seen); new default (plate lake): min 167.39, 0 frames < 150 (no
  mirror). => blocker fixed at the root; the default does not even have the mirror pass.
- 10:33-10:41 E-G1 with the new default (fresh captures, judge1's own qc.mjs, DETT pinned, T1 scale 1; `tools4/fixbatch2a.zsh`,
  `fix/qc/{base,lane}_{a,t200,t300}`; one slot, load up to 75 from the other lanes). judge1's imgs.py boxes, lane - base luma
  (`fix/an/eg1_q00_t100.json`, `eg1_q03_t100.json`, `eg1_q00_t200.json`, `eg1_q00_t300.json`):
  q00 t100: every box within +-1.5 (far_floes_right -1.5, far_floes_left -1.0, massif_base +0.5, far_right_range +0.4,
  lake_far_left -0.4, lake_mid_left 0.0, lake_near_centre 0.0, lake_right 0.0, corners 0.0); q03 t100: the same values;
  t200: worst -1.2 (far_floes_right), t300: worst -1.4. The judged build had lake_mid_left -13.2 / -3.4 / -4.1 etc.
  Lake structure (judge1's orient.py, `fix/an/orient_lake.txt`), col / gy / gx: under the right floes F000 21.8 / 1.85,
  baseline 14.6 / 2.00, lane default 14.6 / 2.00 (t200 14.4 / 2.02), judged lane 9.0 / 4.63; left floes col F000 15.1, base
  14.9, lane 15.1; near centre gx F000 2.50, base 2.70, lane 2.70, judged 0.79. => the floe columns are back, equal to the
  baseline (which is the Cycles plate's lake).
- 10:41-10:50 Batch 2b (`tools4/fixbatch2b.zsh`, `fix/qc/`): T2 lane vs base: every box within +-1.5 (the same values as T1;
  `fix/an/eg1_T2.json`). Way back: `?envfix=0` (fresh) vs judge1's own lane_a capture, outside judge1's shard mask: mean |d|
  0.385, and its lake boxes vs the baseline are exactly judge1's (lake_mid_left -13.2, far_floes_right -4.4, near_centre +3.4,
  lake_right -3.0): the switch restores the judged build. Hold p06 lake band (`fix/an/p06_lake_BLR.png`, base / lane / F420):
  the lane has the floe columns again, like the baseline and F420 (ring poses differ: the hold is not deterministic).
  Full-frame diff q00 (`fix/an/eg1_diff_q00_rest.png`, gain 8): outside the shards and the lake only 1-px outlines along the
  env silhouettes (ridge, massif, iceberg, far range, floes, rocks) and a faint blob at the summit wisp remain (the minors).
  (Clock note: the entries "10:41-10:50" above ran ahead of the clock; batch 2b really ran 10:38-10:41.)
- 10:42-10:46 Paired perf, first pass (`tools4/perf_pair_motion.mjs` = judge1's perf_pair_copy.mjs + MOTION=1, which nudges the
  camera +-1 cm every timed frame in both pages; `tools4/fixperf1.zsh`, SLOT_BG=0, `fix/perf/`): rest, camera still, lane
  default / base 1.061 (0.53-1.28, 1-min load 6.8 rising to 44: unusable spread); rest, camera moving 1.023 (0.95-1.19, load
  26). The judged build was 1.121-1.154 while moving. To be re-measured in a quieter window on the final build.
- 10:47-10:49 Code (fix 5, the silhouette minor): new `world/EnvEdge.ts`. Right after the env pass (before any hero pass) it
  copies the resolved env image into its own target, then draws a full-screen pass into the main target that discards every
  pixel whose 3x3 has no depth jump (max < min x 1.06 + 0.5 m) and gives silhouette pixels a 3x3 Gaussian (sigma 0.9 px, the
  plates' DOF footprint ~2.3 px). Depth comes from alpha: the baked materials (`BAKED_EDGE`, PlateEnvironment.setEdgeAlpha) and
  the water (`BAKED_EDGE`) write the view distance there; the clouds then blend without touching alpha (as in the mirror
  pass). Nothing downstream reads the main target's alpha (post chain and refraction readers use rgb). Hook:
  `PassHooks.afterEnv` (RenderPipeline, 4 lines). Only with the baked environment on MSAA tiers (T1 / T2; T0 untouched);
  `?envedge=0` or `?envfix=0` = step 2's edges. tsc 0 errors. Not yet measured.
- 10:51-10:57 Ridge specks, root cause (`tools4/ridge_probe.mjs` + `ridge_probe.py`: the V2_Ridge mesh alone from the pinned q00
  camera into a float target: triangle id, bake uv, view depth, raw texel lod 0 and facing; `fix/ridge/q00.json`, `ptrtop.json`).
  The bright "V" at (126-130, 341-344) is drawn by triangle 26, BACK-facing, at 92.4 m, through a hole in the front surface
  (front triangles 3209-3211 at 88.7-89.1 m); its texels are light-bake fill, 0.11-0.15 linear vs 0.005-0.03 around. In the
  window 32 of 35 back-facing pixels are such holes (deeper than the 5x5 nearest by > 1 m), lying on diagonal hairline cracks
  of the front surface: (42,298)-(52,309), (52,318)-(57,323), (77,323)-(79,325) = judge1's dash at ~(80,327); hole texels are
  3.3x the front's luma on average. Cycles' jittered pixel samples average a sub-pixel crack away; a raster sample hits it.
  The notches at (91,309) / (103,308) are tiny front-facing silhouette triangles (4427, 4432; 0.001 m2) whose texels carry
  the plate's sky-blended rim (0.057-0.087 vs 0.009-0.016 inside): the light-rim part of the silhouette finding.
- 10:53-10:58 EnvEdge measured (`tools4/fixbatch4.zsh`: q00 DETT=100 with sigma 0.6 / 0.9 / 1.2 and `?envedge=0`;
  `tools4/edgemetric.py`: above y 440 outside the fixed shard zone x 360-1060 y 180-570, vs the fresh baseline;
  `fix/an/edgemetric1.txt`): mean |d| / px>8 / px>20: edge off 0.472 / 1981 / 455 (judged build 0.685 / 1974 / 465),
  sigma 0.6 0.424 / 1747 / 398, sigma 0.9 0.395 / 1788 / 439, sigma 1.2 0.647 / 1841 / 456; baseline repeat 0.192 / 0 / 0.
  Interior sharpness (mean |dL| in ridge / massif / iceberg / far-range boxes) unchanged within 0.07. 4x crops
  (`fix/an/ridgetop_x4_B_N_06_09.png`, base / off / 0.6 / 0.9): the stair-steps and the light rim are gone at 0.9, which reads
  closest to the baseline's softness. Kept sigma 0.9. The remaining px count is mostly 1-px silhouette POSITION differences
  between the shipped mesh and the full scan Cycles rendered, not softness.
- 10:57 Weld script ready (`tools4/weld_cracks.py`): on a copy `WORK/bake9x/bake_scene.blend` of `WORK/bake9/bake_scene.blend`,
  stats of the nearest boundary partner per boundary vertex, `remove_doubles` on boundary vertices within a distance, degenerate
  faces dissolved, then the export stage's exact GLB export (first unwelded, to check it reproduces the published GLB).
- 10:58-11:00 Weld test (`tools4/weld_cracks.py` on the copy `WORK/bake9x/bake_scene.blend`, Blender through the slot,
  `bake9x/weld.stdout.txt`, `bake9x/weld_report.json`): the unwelded export reproduces the published GLB (1053.8 KB, 34
  objects). Nearest boundary partner per boundary vertex: V2_Ridge 5th percentile 8.8 cm, median 65 cm, none within 3 cm
  (V2_Massif the same; Object_2.009 / .010 12-16 vertices within 3 cm). So the ridge cracks are not near-coincident seams
  and a weld cannot close the V (a 25 x 15 cm hole). Not used; the GLB is unchanged.
- 10:59 Hold ring regression check (judge1's holdrings.mjs + holdan.py, real presses; `fix/hold/an_1.txt`): 20 s hold, median
  |w| lane / base: A 19.2 / 18.6, B 1.5 / 1.3, C 6.4 / 6.1, D 0.3 / 0.3 deg/s; rest A 101 / 98, B 81 / 79, C 38 / 39, D 10 / 11.
  Same structure: the ENV lane changes no ring motion (both runs throttled to ~100 ms frames by the machine, so only the
  comparison counts). E-G4 (`fix/an/eg4.txt`): `?env=projected` vs base_a / base_b outside judge1's mask AND the shard zone:
  q00 0.362 / 0.225, q03 0.429 / 0.393, max 1; the baseline's own repeat 0.192 / 0.485. T0 lane vs base: every box within
  +-1.6 (`fix/an/eg1_T0.json`; T0 has no EnvEdge, the plate lake as before).
- 11:00-11:05 Back-face texel patch (fix 4, the specks; `tools4/patch_backfaces.py`, BPY through the slot, `bake9y/`):
  orientation checked first (the raster is bottom-up in Blender v: GLB triangle 26 = Blender triangle 13415 at raster row 9;
  the EXR files are top-down). At the V the rest plate itself sees the back face through the hole (distance map 98.0 vs the
  front's 94.4) and Cycles renders it as dark as its surroundings (plate luma 0.04-0.06), while the shipped texels were
  bright. Rule: every texel of the 4 photogrammetry mountains that faces away from the rest camera (N.V < -0.05) takes the
  rest plate's colour along its own rest ray (3x3 mean), unless that ray lands within 3 px of a sky / far discontinuity
  (D > 1.3 x its distance); then the gutter is rebuilt with comp_env_m9.py's exact algorithm and the texture encoded as
  encode_env_m9.py does (encoder check: the unpatched V2_Ridge EXR encodes byte-identical to the published WebP). Patched
  texels: V2_Ridge 68,184 (9,214 of them > 2x brighter than Cycles' colour), V2_Massif (no-wisp, from bake9w) 55,312,
  Object_2.009 40,021, Object_2.010 16,411. Published as `baked/*_f1.webp` (+44 KB in total); the manifest keeps step 2's
  file as `textureS2`; assets.ts: `?envtex=s2` or `?envfix=0` = step 2's textures, `?envwisp=0` = step 1's.
- 11:05-11:10 Verification (`tools4/fixbatch6.zsh`): ridge probe on the final build: no speck > 30 in the window. judge1's
  specks.py thr 30 on the ridge (20,290)-(180,380): baseline 5, lane before the fix 14 (V +59, notches +55 / +54), old textures
  + EnvEdge 9 (notches gone, V +59 left), final 1 ((37,290) +40, a sky notch at the silhouette that the baseline also has at
  (38,290) +56). Final vs `?envtex=s2` (only the textures differ), outside the shard zone: 21 px > 8 levels, exactly the dash
  (79-82, 325-329), the V (126-130, 341-344) and one more crack (164-170, 343-346): the patch changes nothing else at rest.
  Final vs baseline boxes q00 / q03: every box within +-1.5 (dark_ridge +0.3). Crop `fix/an/ridge_marks_x3_B_J_F_R.png`
  (base | judged / final | F000): the V and the dash are gone, the skyline as soft as the baseline's.

## Fix round, second session (2026-11-15, from 13:56 WIB)

The first fix session (10:21-11:10) was cut off by the usage limit after the entry above. Its pointer / sweep captures of the
final build (`fix/eg2/`, 11:06-11:10, taken after the last lab rebuild at 11:04:58) exist but were not analysed, and
`tools4/fixperf2.zsh` (the final-build timing) was written but never run. Machine at start: 1-min load 6.3, memory free 32 %,
slot free. My lab :5174 restarted at 13:58 (pid in lab5174.pid, log lab5174_fix2.log); :5173 untouched.

Status of the five findings at the start of this session (from the entries above):
1. BLOCKER resize flash: fixed in code (LakeMirror.refreshOnResize) and verified 10:28-10:33, but before EnvEdge existed:
   re-verify on the final build.
2. MAJOR lake: the default is the plate lake on the baked environment (floe columns = baseline, boxes within +-1.5); the mirror
   lake itself (`?envlake=mirror`) is unchanged and still has the judged defects.
3. MAJOR frame time: the default has no mirror pass; measured only under load 13-26 and before EnvEdge: re-measure.
4. MINOR ridge specks: fixed by the back-face texel patch, verified at q00 only: check the pointer views.
5. MINOR silhouettes: EnvEdge (sigma 0.9) measured at q00 only: check the pointer, sweep and hold views.
Next: analyse fix/eg2 (specks in the pointer views, side-by-sides, lake), then the flash re-check, then timing.
- 14:00 E-G2 pointer / sweep captures of the final build (`fix/eg2/`, judge1's ptr.mjs / sweep.mjs, DETT=100), analysed now:
  - Ridge specks (judge1's specks.py thr 30 in x 0-300, y 270-430), base / lane per spot: rest 11 / 0, top 7 / 1, right 14 / 3,
    top_right 19 / 3, bottom 6 / 2, bottom_right 7 / 2, orb 5 / 1, left / top_left / bottom_left 0 / 0. The lane's remaining
    hits are sky notches on the skyline, fewer than the baseline's in every view. The judge's ptr_top V / notches and the
    ptr_right streak are gone: `fix2/an/ptr_top_ridge_x3_base_final_judged.png`, `ptr_right_ridge_x3_base_final_judged.png`
    (base / final / judged, 3x).
  - Lake, lane vs base outside the hero zone (`tools5/eg2an.py`; x 330-1110 y 120-640 excluded): pointer spots mean |d| 1.25-2.03,
    lake luma means within 0.8 levels in all 10 spots; sweep pop / release / tau frames 1.0-1.4; hold frames 1.5-2.6 (ring
    poses differ, the hold is not deterministic). The intro frames are live (not clock-pinned): base vs base across two runs
    differs as much as lane vs base (lake 28 at intro_0), so they were judged by eye (`fix2/an/sw_intro0123_lane.png`): one
    environment, floe columns, no double. 3x lake crop at the bottom-right spot (`fix2/an/ptr_BR_lake_y500_x3_base_lane.png`):
    lane = base. Diff map `fix2/an/ptr_BR_base_lane_diff8.png`: shards, 1-px silhouette outlines, rock / floe texture detail;
    nothing structured in the water.
- 14:04-14:09 Flash re-check on the final build (`tools5/fix2batch1.zsh`, `fix2/flash/`, summary `tools5/flashsum.py`; one
  slot, load 5.1): lake-band minimum / frames < 150: desktop T1 default 167.27 / 0, desktop `?envlake=mirror` 162.38 / 0
  (mirror widths 576-720 seen), phone 390x844@2x default 166.96 / 0, phone mirror 168.35 / 0; adaptive scales 0.8-1 occurred.
  The blocker stays fixed with EnvEdge in the build.
- 14:08-14:21 Paired frame cost of the final build (`tools5/fix2perf1.zsh`, `fix2/perf/*.txt`; judge1's method + MOTION, 15 reps x
  12 frames, SLOT_BG=0; the hold lane's judge held the other slot, 1-min load 8-62): lane / base median ratio rest still 1.154,
  rest moving 1.137, hold moving 1.159, hold still 1.132; EnvEdge alone (lane `?envedge=0` as A vs lane) **1.094**. So the
  plate-lake default is cheap (about 1.02-1.06 as measured before EnvEdge) and EnvEdge costs about 9 %: it is a second render
  pass into the 4x MSAA HDR target (load, store and resolve of the whole MSAA image on this tile-based GPU) plus a full-frame
  copy. E-G3 would fail again. Next: rebuild EnvEdge without the copy and without its own pass: an "armed" full-screen
  triangle drawn first inside the next render into the main target (the rings' far half at T1 / T2), sampling main.texture
  (the env pass's resolve; with three's renderbuffer MSAA the texture is not attached to the draw framebuffer, so no
  feedback loop; with WEBGL_multisampled_render_to_texture it keeps the copy path). At the same time fit the kernel to the
  baseline skyline (1-D model `tools5/edgefit1d.py`: the current 3x3 sigma 0.9 linear blur brightens offsets 0 / +1 by +7 / +21
  levels; the baseline's skyline 10-90 width is 4.27 px, the lane's 3.41 px with EnvEdge, 3.23 without).
- 14:22-14:24 EnvEdge kernel fit on the GPU (`tools5/edgefit.mjs`: q00 at the pinned clock, 12 kernels injected into
  __hero.envEdge's material in one page; `fix2/edgefit/*.png`). `WEBGL_multisampled_render_to_texture` is not offered (Chrome
  / ANGLE Metal), so three resolves the MSAA renderbuffer into main.texture by blit. Mean ridge-skyline profile error vs the
  baseline (offsets -3..+4, normalized): off 0.029, current (linear, sigma 0.9) 0.035 (worse than off: the sky bleeds into
  the ridge, +0.42 px), linear 0.45 / 0.6 about 0.02, plate-sRGB space sigma 0.6 **0.0115** (offset +0.07 px), 0.9 0.0145,
  log space 0.6 0.013. px > 8 / px > 20 above y 440 vs base_a: off 1966 / 447, current 1788 / 425, sRGB 0.6 **1674 / 348**,
  sRGB 0.9 1705 / 362, log 0.6 1743 / 356 (the mean |d| there is dominated by the frame-varying sky dither and is not used).
  4x crops `fix2/an/ridgetop_x4_base_off_cur_srgb06.png`, `farR_x4_base_off_cur_srgb06.png`: sRGB 0.6 reads closest to the
  baseline. Chosen: blur in the plates' encoding (sRGB of HDR / plate gain), 3x3, sigma 0.6.
- 14:24 Code: `world/EnvEdge.ts` rewritten. `arm()` (the afterEnv hook) only sets uniforms and arms a full-screen triangle that
  is in the scene (all layers, renderOrder -1e9, no depth test / write); the scene's onBeforeRender makes it visible only for
  the first render into the main target after the env pass (the rings' far half at T1 / T2), its onAfterRender disarms it.
  It samples main.texture directly (the copy is kept only for WEBGL_multisampled_render_to_texture). HeroEngine: the
  constructor call and `afterEnv = arm(...)`. tsc 0 errors.
- 14:25-14:28 Check (`tools5/fix2batch2.zsh`, `fix2/qc/lane_v2`, `lane_v2_noedge`): the armed pass gives exactly the fitted
  kernel's image (vs the injected variant outside the shard zone: 0 px > 8); ridge profile -1 / 0 / +1 / +2 = 0.883 / 0.721 /
  0.350 / 0.132 (baseline 0.875 / 0.701 / 0.332 / 0.140); px > 8 / > 20 vs baseline 1672 / 353 (previous EnvEdge 1788 / 428,
  none 1946 / 448). No page errors. Next: its cost (`tools5/fix2perf2.zsh` -> `fix2/perf_v2/`).
- 14:29-14:44 Cost of the armed EnvEdge (`tools5/fix2perf2.zsh`, `fix2/perf_v2/*.txt`, same paired method; the hold lane's judge
  ran its own perf at the same time, 1-min load 5-116): EnvEdge alone (lane `?envedge=0` as A vs lane) rest still **1.003**,
  hold moving **1.023** (was 1.094 with its own pass + copy). Lane vs baseline: rest still **1.061**, rest moving **0.997**,
  hold moving **1.060**. All under +10 %. The moving-camera case (the judged +12-15 %) is gone with the plate-lake default.
- 14:45 Started MAIN's perf_probe, 6 interleaved base / lane pairs, each run gated on 1-min load < 6 (`tools5/fix2probe.zsh`,
  `fix2/probe.txt`). Next: E-G1 / E-G2 / E-G4 captures of the final build (`tools5/fix2batch3.zsh`), after the probe.
- 14:44-15:05 MAIN's perf_probe, 6 interleaved pairs, SLOT_BG=0, every run started at 1-min load < 6 (4.4-6.0; the hold lane's
  judge ran its own perf_probe in the other slot during several runs) (`fix2/probe.txt`, `fix2/probe_summary.txt`): median fps
  base / lane: rest 57.3 / 59.8 (vsync-capped), hold 49.9 / 46.9, collapse 58.9 / 59.0; per-pair lane / base fps ratio medians
  1.049 / 0.933 / 1.008 (ranges 0.93-1.82 / 0.73-1.76 / 0.95-1.41: two runs of the baseline fell to 33 fps under contention).
  Worst frame base / lane: rest 50.1 / 50.0, hold 66.6 / 116.6 (one lane run; the other five lane holds 33.5-66.6), collapse
  50.0 / 33.4 ms. The hold median is -6 % fps (about +7 % frame time), inside the 10 % budget; the paired method above is the
  more robust number. Next: batch 3 captures.
- 15:06-15:15 Batch 3 on the final build (`tools5/fix2batch3.zsh`; one slot, load 4.4) and its analysis (`tools5/an3.zsh` ->
  `fix2/an/an3.txt`, boxes in `fix2/an/eg1v2_*.json`):
  - Baseline unchanged since 10:35: base_c vs base_a outside the hero zone mean |d| 0.433 / 0.102 (q00 / q03), max 1.
  - E-G1 boxes, lane - base luma: q00 t100, q03 t100, q00 t200, q00 t300, T2 and T0: every box within +-1.6 (worst
    far_floes_right -1.2 .. -1.6, far_floes_left -1.0 .. -1.1, massif_base +0.5 / +0.6; every lake box -0.5 .. +0.1; the four
    corners within 0.1). Lake structure (orient.py, under the right floes): F000 col 21.8 gy 1.85, base 14.6 / 2.00, lane 14.6 /
    2.00 (the judged build had 9.0 / 4.63).
  - Diff map above y 440 outside the shard zone (`fix2/an/eg1v2_diff_q00.png`, `eg1_diffmap_band_v2_vs_judged.png`): px > 8 /
    > 20 = 1698 / 350 (judged build 1974 / 465). What remains is a faint 1-px outline along the skylines from sub-pixel
    position differences (ridge skyline offset p10 -0.21 / p90 +0.31 px): the bake meshes were decimated before the unwrap
    (bake_env_m9.py prep stage) and Cycles rendered the full scans. Not visible in the 4x crops (`fix2/an/ridgetop_x4_base_
    judged_v2.png`: base / judged / final; the judged stair-steps, light rim, dash and V are gone).
  - Ridge specks thr 30: base 11, lane 1 ((54,300) +45, the skyline notch the baseline has at the same pixel, +52), T2 1, T0 3
    ((1,284) frame border +38, (82,305) +33 skyline notch; the pre-patch T0 also had the V at +68: gone).
  - E-G4: `?env=projected` vs base_c / base_a outside the hero zone: q00 0.362 / 0.149, q03 0.448 / 0.476, max 1 -> PASS.
  - Way back: `?envfix=0` now vs judge1's own lane_a capture of the judged build: 0.140, max 1.
  - E-G2 (`fix2/eg2/`, judge1's ptr.mjs / sweep.mjs, DETT=100; `fix2/an/eg2ptr_v2.txt`, `eg2sweep_v2.txt`): no page errors.
    Pointer spots lake mean |d| vs base 1.37-2.02, lake luma within 0.9; sweep pop / release / tau 0.94-1.33; hold frames
    1.41-2.81 (non-deterministic rings). Ridge specks base / lane per spot: rest 11/1, top 8/2, right 14/5, top_right 20/8,
    bottom 6/4, bottom_right 7/3, orb 5/1, left / top_left / bottom_left 0/0 (all lane hits are skyline notches at the same
    places as the baseline's). Looked at: `fix2/an/sw_hold_B_base_lane_diff8_v2.png`, `ptr_TR_base_lane_v2.png`: one
    environment, one wisp, floe columns, no double, no band.
- 15:16-15:19 Hold guard (judge1's holdrings.mjs, real presses, lane then base; `fix2/hold/an_1.txt`): the slot's background QoS
  gave 5 fps in both (dt 205-217 ms), so only the structure compares: rest |w| lane / base A 49 / 46, B 40 / 37, C 27 / 25,
  D 12 / 11 deg/s; the 20 s hold A 7 / 36, B 0.9 / 1.5, C 14 / 17, D 4.3 / 6.4 (run to run the hold varies as much: the first
  fix session measured A 19 / 19, judge1 32 / 42). `git diff` touches no file under hero/, Choreography, CameraRig, config,
  curves, quality or types: the ENV lane changes no ring motion.
- 15:20-15:22 EnvEdge across render-size changes (`tools5/edgeresize.mjs`, `fix2/edgeresize/`): window 766 -> 700 -> 766 and
  render scale 1 -> 0.85 -> 1 at rest: outside the hero zone the frames after equal the frame before (max 1 level, px > 8 = 0)
  and the edge pass is still applied (px > 20 vs base 346-350; without it 449). No console warning or error (no feedback loop).
- 15:23-15:28 HANDOFF.md: the provisional section replaced by the complete "fix round" section (findings table, files and why,
  switches, assets, gates with numbers, open items, shared-file hunks, rebuild of the patched textures).
  `pipeline/patch_backfaces_m9.py` added to the lane (a copy of tools4/patch_backfaces.py, which made the shipped `_f1`
  textures). Final typecheck `tsc --noEmit -p tsconfig.hero.json`: 0 errors.

### Fix round result (15:28)
- Gates on the final build: E-G1 PASS (every box within +-1.6 at t100 / t200 / t300, T2, T0; no speck, seam or line at rest;
  residual 1-px skyline outline in the diff map, px > 20 = 350 vs judged 465, sub-pixel mesh positions), E-G2 PASS (10 pointer
  spots + sweep: no double / speck / band, floe columns in every view, no resize flash), E-G3 PASS (3.87 MB; paired cost 1.061
  rest still, 0.997 rest moving, 1.060 hold moving; perf_probe hold -6 % fps; no errors), E-G4 PASS (0.149-0.476, max 1), hold
  guard unchanged (no ring code touched).
- Open: the mirror lake behind `?envlake=mirror` keeps the judged look and cost problems (streak kernel + cheaper pass is the
  next step if the lead wants it); the sub-pixel skyline outline needs a finer bake mesh.
- Lab :5174 (pid 10988, mine) stopped next; :5173 untouched.
