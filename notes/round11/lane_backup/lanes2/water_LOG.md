# WATER lane (round 11 P2b user-priority), builder LOG

Paths: LANE = $SP/lanes2/water, BASE = $SP/lanes2/base (never edit), WORK = $SP/work2/water, lab :5175.
User asks (15 Nov ~19:20): water realistic, no fragmenting under camera motion, 1:1 with reference; foreground floes "shadowing" while the mouse moves the camera.

## 2026-11-15 19:4x start
- No previous attempt (WORK empty, no HANDOFF). Read SPEC 0-3, AUTOPILOT, handoff_env (all 3 steps), int LOG.
- Next: read Water.ts / LakeMirror.ts / PlateEnvironment.ts / assets.ts, start lab :5175, reproduce floes shadowing + water fragmenting.
- 19:36 lab :5175 started (PID 21464, log WORK/lab.log).
- 19:40-20:05 Tools: WORK/tools/cap_sweep.mjs (deterministic sweeps: pointer pinned per step, settle n/60, freeze, screenshot + camera json),
  tflick.py (temporal 2nd difference), sheet.py (crop sheets). Baseline (= MAIN integrated) captures caps/base_T1: lr (ny -0.35,
  nx -0.98..0.98, 4 s, every 2nd frame, 121 shots), ud (nx 0.35), hold (pointer 0.12,-0.08, press 4.4 s + release 3 s, every 3rd),
  still (rest 1 s). Looked at: lr extremes, right-floe strips (an/strip_lr_rf.png, strip_lr_rf2.png x2), hold lunge sheet,
  lake halves at lr_000. First reading: the right front slab's dark face reflection on the water is a re-aimed PLATE reflection;
  it tears (white stair-step edge under the slab's bright face, lr_132) and detaches / slides from the slab (lr_144-156) while the
  camera orbits + pushes in = the "shadowing". Next: A/B the same sweep with ?envlake=mirror and ?proj=0 to confirm.
- 20:00-20:15 A/B at lr_132 / lr_144 (an/ab_rf_132_144.png, rows: default plate lake / ?envlake=mirror / ?proj=0): the slab
  meshes are identical in all three; the dark "shadow" under the right front slab and the white stair-step tear are in the
  water of the plate lake (default and proj=0); the round-11 mirror lake shows no slab reflection at all (flat pale sheet).
  => root cause of the floe "shadowing": the plate lake's baked (rest-camera) reflections of the slabs' dark front faces,
  re-aimed through a coarse mirror-length map with side fills, detach / tear / slide against the real floes while the camera
  moves. The fix is a true planar reflection of the real floe geometry (ground truth below confirms).
- Blender GT: copy WORK/blend/plate_scene_v7_copy.blend (water material = forensics 3.3 exactly: noise 3D fBm scale 3 detail 4
  rough 0.5 lac 2, B-spline ramp, bump distance 0.07 strength 1 filter 1, Principled metallic 1 rough 0.03455 MULTI_GGX).
  tools/cams_export.mjs -> gt/cams (rest, left, right, top, bottom = shoot_pointer +-0.98, hold = pose expand 2.97) and
  gt/cams_all.json (+ lr_132, lr_144, lunge066 from the sweeps). tools/gt_render.py: three -> Blender camera (orb projects to
  (723.37, 371.61) in both: exact), plate render settings, multilayer EXR (Combined, Depth, IndexOB) + AgX PNG.
  Test 50 % 16 spp rest: 14.6 s, looks right (floe columns, ridge reflection). Next: batches at 64 spp, lower 47 %.
- 20:15 GT batch A (gt/r1: rest, left, right, top, bottom calm, lower 47 %, 64 spp, ~18 s each) + batch B (hold, lr_132,
  lr_144, lunge066 calm; rest/left/hold/lr_144 mirror = bump 0; rest wave + clouds0). Engine vs Cycles at lr_132 / lr_144
  (an/gt_lr132_144_rf.png, same camera, geometry registers exactly): Cycles' slab reflection is attached to the slab, the dark
  front face continues down as dark vertical columns, the bright face as white columns; the engine's plate lake shows a lighter
  detached smear with a horizontal break and a white stair-step under the bright face. ROOT CAUSE CONFIRMED (floe shadowing =
  plate-lake re-aim of baked reflections). At the orbit extreme (left) the plate lake is close to Cycles (an/gt_left_rf.png):
  the breaks live in the in-between poses (re-aim + projector blends + fills).
  Design decision: new default lake = true planar mirror of the real scene (LakeMirror pass) + the Cycles bump reproduced
  (Blender's exact Perlin fBm for the near-field distortion, the finite-difference footprint statistics as a vertical blur
  that keeps the columns), calibrated on the GT bump-vs-mirror renders. ?envlake=plate = today's default exactly.
- 21:00-22:05 R12 v0 (Water.ts LAKE_R12: exact Cycles Perlin fBm + bump FD + LakeMirror parallax lookup; assets.ts default lake =
  R12 at T1/T2, `?envlake=plate|mirror|r12`). GPU noise verified vs numpy/Blender (fBm 1e-3, octaves exact, debug uLakeDebug 5);
  lake points register to 0.1 px (debug 3); GPU coherent offsets = numpy model (corr 0.96-0.99 with Cycles' upward raster dPdy).
  Readback vs Cycles calm (rb/v0, an/rbv0_*_sbs.png): engine lake 0.72-1.03x Cycles, floe/iceberg COLUMNS MISSING, texture
  coarser. Measured Cycles directly with a synthetic world (tools/gt_elev.py: radiance = reflected elevation; mode=step:
  fraction below 1 / 2.5 deg): row 515 (e0 4.5 deg) 27 % of Cycles' reflected rays are below 1 deg (my model 9 %).
  FOUND: Cycles' Bump node uses the COMPACT ray differentials (isotropic footprint radius t * pixel angle along the fixed
  make_orthonormals tangents (1,-1,0)/sqrt2, (1,1,0)/sqrt2), not the anisotropic pixel footprint, plus
  ensure_valid_specular_reflection (rays lifted to dot(Ng,R) >= min(0.9 Iz, 0.01)). tools/step_sim.py: hypothesis B matches
  Cycles' fractions at every row (515: 0.268/0.366 vs 0.290/0.383; 680: 0.084/0.125 vs 0.081/0.124); A (anisotropic) fails.
  => per-sample tilts ~ the true gradient (reflection elevation rms ~7 deg), pixel means = the anisotropic FD texture (v0's
  coherent part, which matched), so the incoherent spread is ~5-6.7 deg (not 1-2) and up to ~27 % of rays are clamped to the
  horizon: that is what draws the long floe / iceberg columns and washes the clouds. Next: v1 = wide vertical kernel
  (vertical-blur atlas of the mirror target) + the clamped horizon term with parallax.
- 22:05-22:40 v1 (wide kernel): incoherent spread from the compact footprint (tools/model_b_check.py: v1 matches Cycles per row:
  fraction < 1 deg 0.374/0.303/0.086 vs Cycles 0.347/0.268/0.084 at rows 470/515/680, mean elevation 4.13/5.28/11.29 vs
  4.11/5.30/10.70); lookup = the clamped share (Phi((emin - mu)/sigma)) at the horizon elevation with a parallax march +
  the unclamped rays as a wide textureGrad box at their conditional mean. Engine flat mirror (debug 6) vs Cycles mirror:
  structurally the same (iceberg, massif, floes; clouds drift). Horizon term (debug 7): columns appear under the far floes
  (16 march steps needed: a floe face is ~4 texel rows on the projected path) but rows alternate hit / miss = horizontal
  stripes on the left (an/rbv1b_rest_H_sbs.png). Next: soft front-to-back march (partial coverage) for the horizon rays.
- 22:40-23:05 v1c: soft front-to-back horizon march (partial coverage) removes most stripes (an/rbv1c_rest_H_sbs.png).
  Column profiles (x 1078/1112/1150, y 476-564): just under a floe Cycles is 1.05-1.62 luma where its flat mirror is 0.1
  (the bump sends ~60 % of the pixel's rays into the floe's bright upper face, which towers over a nearby lake point);
  v1c 0.3-0.6: one parallax factor for the whole wide box cannot do that. Next: stratified multi-ray (the clamped ray +
  3 quantile rays of the truncated Gaussian, each its own soft parallax march).
- 23:05-23:35 v2 = stratified multi-ray (clamped ray + 3 conditional-quantile rays, each a soft front-to-back parallax march with
  quadratic step spacing + a secant hit test for thin faces). Cycles probe from a lake point (tools/gt_probe.py, an/probe_1078_492.png):
  from P (row 492) the far floes' sunlit faces fill 0-2.5 deg, the iceberg's dark face 2.5-12 deg, sky above: ~42 % of the
  pixel's rays take the bright faces = the column (Cycles 1.25; model estimate 1.2). Readback vs Cycles (rb/v2c): box luma
  ratios rest far_L 1.39 far_C 1.05 far_R 0.85 mid 0.83/1.03/0.98 near 0.73/0.96/0.92; column under the floe x 1078 rows
  484-500: 0.77-0.91 vs Cycles 1.05-1.62 (was 0.3-0.6 in v0). Next: display captures + sweeps (floes), then perf.
- (clock note: the times above after 20:15 were estimates and run ahead; real clock now ~21:25.)
- 21:00-21:25 v2c display captures at the exact GT cameras (tools/cap_cams.mjs: rig update disabled, camera set): gt/disp/{plate,
  r12c}. Residual vs Cycles after a per-channel colour map fitted at rest (tools/gt_resid.py, water outside the hero/ring zone,
  blurred 1.5 px): plate 4.38-5.27 (rest 4.55, lr_132 5.26, lr_144 5.27), r12c 6.10-8.66 (rest 6.31, lr_144 7.00, right 8.66):
  r12c is stable across cameras but farther from Cycles' look (weaker columns, darker far right). Floe strip (an/r12c_strip_rf.png,
  an/r12c_rf_132_144.png): the slab reflection stays attached through the sweep, no white tear, no detached dark smear.
  Perf (tools/perf_pair.mjs, SLOT_BG=0, 12 reps, my lab ?envlake=plate vs default): moving camera 52.9 vs 58.0 ms = 1.160.
  Next: cut the shader cost (alpha-first march, fewer steps), then the column brightness.
- 21:32-21:42 (reconstructed on resume; the attempt was cut before logging it) v2d = the perf cut: alpha-first march (depth by
  plain bilinear, filtered colour only where w > 0), 7 steps per stratum, 10 for the horizon ray. Readback rb/v2d (rest, lr_144):
  box luma ratios rest far_L 1.31 far_C 0.99 far_R 0.78 mid 0.80/0.99/0.89 near 0.71/0.96/1.04 (v2c: 1.39/1.05/0.85,
  0.83/1.03/0.98, 0.73/0.96/0.92). Not perf-measured yet.

## 2026-11-16 02:18 RESUME (previous attempt cut off ~21:45 15 Nov)
- State: LANE has Water.ts (LAKE_R12 v2d), assets.ts (default lake = r12 at T1/T2, ?envlake=plate|mirror|r12), HeroEngine.ts
  (r12 flag passed). No HANDOFF yet. Slot full power (user idle, AC). Next: start lab :5175, perf A/B of v2d, sweep captures.
- 02:20-02:55 Lab :5175 up (PID 78646). Perf of v2d (tools/perf_pair.mjs, move, 12 reps): plate 33.8 ms vs r12 41.4 = x1.238
  (load 4.2; other lanes' Chromes share the GPU, ratios spread 1.04-1.32). Split (PATCH_B = mirror pass removed): mirror pass
  ~6 %, water shader ~3.5 % (noisy, load 6.3). info: the mirror pass draws all 40 env meshes (225k tris, 40 calls).
  q00 T1 rest captures (qc/r12d_T1, qc/plate_T1) + tools/lake_boxes.py vs F000: r12 and plate both off F000 by > 3 levels in
  most lake boxes (plate far_R +15, r12 far_R +14; r12 near_L -16). Far-right crop (an/farR4.png: F000 / Cycles calm / plate /
  r12): F000, Cycles and the plate show long bright floe-face columns; r12's are weak, the water grey and flat.
  Column profiles (tools/col_prof.py, x 960/1078/1200, rb/v2e debug 6/7/8): under the floes Cycles 0.9-1.9, engine 0.4-0.9;
  the engine's clamped share pc ~0.27-0.33 x horizon term 0.8-1.7. A zoom (an/rb_flat_zoom.png) shows the v2 strata march
  also draws blocky stair-steps under the floes. DIAGNOSIS: the 3 fixed strata cannot resolve the share of rays that hit the
  first face behind the lake point (Cycles: ~40-60 % just in front of a floe). Next: v3 = analytic face share.
- 03:00-03:35 (reconstructed on resume 04:07; the attempt was cut before logging it) v3 = lkReflect3 (default; v2 strata behind
  ?lkv=2): horizon-ray march (<= 24 steps, ~1 texel each, soft coverage + secant) finds the first face behind P, probes its top
  (doubling heights), the share Phi((e_top - mu)/sigE) of the pixel's rays takes the face colour, the rest go over it (2 strata x
  4 steps). Iterations v3a-v3h (rb/v3*, an/rbv3*): v3h box luma vs Cycles calm rest far_L 1.43 far_C 0.98 far_R 0.85 mid
  0.81/0.98/0.94 near 0.74/0.96/1.05; left far_R 1.25; lr_144 far_R 0.75. Perf bisection tools (perf_multi.mjs, mask_cost.mjs,
  comp_cost.mjs: PERFKNOB uLakeDebug = -mask) were run, results not logged.

## 2026-11-16 04:07 RESUME 2 (previous attempt cut off ~03:35)
- State: LANE Water.ts = v3h (+ a temporary PERFKNOB to remove), assets.ts / HeroEngine.ts as before. Lab :5175 still up (PID
  78646, started by the previous attempt: mine to stop). No HANDOFF yet. Load 3.4.
- Plan: (1) perf A/B v3h vs MAIN :5173 and vs ?envlake=plate; (2) cut cost to the +10 % budget; (3) display captures at the GT
  cameras + sweeps (floes, temporal stability); (4) gates, HANDOFF.
- 04:10-04:36 v3h measured. perf_pair (move, 12 reps, load 5-7, other lanes' Chromes on the GPU): plate 33.5 ms vs r12 39.3 =
  x1.111 (spread 1.04-1.42). comp_cost.mjs / mask_cost.mjs / pass_gpu.mjs numbers are garbage under this load (water 0.08 ms,
  GPU timer queries 46-70 ms per pass; masks off slower than on): new tools/comp_cost2.mjs (each batch closed by a read of the
  target it drew into) and perf_multi2.mjs (min + median). Display at the GT cameras (gt/disp/r12h, tools/cap_cams.mjs):
  gt_resid water rest 7.86 left 7.27 right 11.23 lr_144 8.86 hold 8.55 (plate 4.4-5.3, r12c 6.1-8.7): the display path after
  `base` (x1.1, near lift, crest bands from the panorama, fog) was tuned on the plate. Lake boxes vs F000 at rest (display):
  r12h OK far_L mid_L mid_R; far_C -6, far_R +14, mid_C -7, near_L -27, near_R +16, ring -4..-13; plate: far_C -12, far_R +15,
  mid_L +10, mid_R +8, near_L -11 (MAIN fails the +-3 gate too; Cycles AgX GT vs F000 is off 5-33 levels: F000's grade differs).
  Sweeps caps/r12h_T1 (lr, ud every 2nd, hold every 3rd, still): right-floe strip an/sw_lr_rf.png (plate | r12h, lr 120-168):
  plate has the detached dark band under the slab, r12h a thin attached dark line + fine wavelets.
- 04:37-04:50 cost split (tools/comp_cost2.mjs, 24 draws/batch, 5 reps, contended GPU, min ms): water pass plate 8.89 vs r12
  11.40 (masks: no horizon march 8.04, no face probes 8.40, no strata 9.61, all off 7.29); mirror pass 2.81 (mirror_split.mjs:
  baked meshes ~1.5 of 1.95, clouds ~0, sky 0.4, mips 0.3; 37 meshes 225k tris, target 720x383). So r12 = +2.5 water + 2.0-2.8
  mirror over a ~45 ms contended frame = ~+11 %. EYES: hold display (an/hold_near_vs.png: Cycles hold GT / plate / r12h, near
  water full res): r12h draws long, regular HORIZONTAL STRIPES across the near water (Cycles: irregular small wavelets) =
  defect. Suspects (binary decisions in lkReflect3 that flip as P moves): horizon-march secant hit, face-colour row snap
  (floor(uv.y*rows)), top probes' hard break, cov > 0.01 gates, lkRay's secant. Next: readbacks of debug modes 1/7/8/9 at hold
  + rest (tools/rb_modes.sh, rb_png.py) after the perf A/B (tools/perf_ab.sh, running; started at load 9.7: may need a redo).

## 2026-11-16 05:22 RESUME 3 (previous attempt cut off ~04:55)
- State: LANE Water.ts = v3h (+ PERFKNOB?), assets.ts / HeroEngine.ts as before. Lab :5175 NOT running (PID 78646 gone). No
  HANDOFF yet. perf/ab_v3h.txt: 4 pairs before the browser died in pair 5 (loads 4.6-9.7, too high: rest A 21.7/20.7/25.4/24.8
  vs B 25.8/19.1/25.5/29.0 fps; hold A 22.9/25.0/25.0/26.1 vs B 18.7/20.3/15.5/27.1): not usable. NOTE: MAIN :5173 now carries
  RINGS v1 + the 05:28 hotfix (hold camera stops earlier), so lane-vs-MAIN perf also measures ring changes: report both lab
  default vs lab ?envlake=plate (pure water delta) and lab vs MAIN.
- Next: (a) start lab; (b) fix the near-water HORIZONTAL STRIPES (an/hold_near_vs.png) via debug readbacks; (c) perf cut;
  (d) captures + gates + HANDOFF.
- 05:22 lab :5175 started (PID 33013).
- 05:30-05:50 STRIPES DIAGNOSED (rb/v3h_hold, an/hstripe_modes.png, hstripe_modes2.png, tools/vprof.py): at hold near water
  F 0.12-0.30 (the hold camera is low: pc ~0.2 even near), sH steps by exactly one march step (1/24) and inside each sH block
  the face colour cFace flips 0.9 <-> 0.13 in blocks of 4-5 rows: the horizon march's hit is the step position (overshoot up
  to one step, 1/24 of a ~200-texel path) and the colour is sampled there; the top probes give hTop 0.03 (false hit). All of
  v3's geometry decisions (target march, secant, probes at doubling heights) are binary and quantized.
  DECISION v4: the geometry of the low rays from a STATIC max-mip heightfield of the baked meshes (rendered once at load from
  above, CPU max pyramid, R16F with mips): exact quadtree traversal of the horizon ray (never skips a face), the obstacle top
  from bilinear samples (continuous), the face colour = the mirror target over the band of heights the pixel's rays hit.
  Scene extents (tools/glb_bounds.py): meshes x -114..169, z -312..2.5; lake x +-22, z -56..15; floes 0.2-0.44 m tall.
  Grid x -128..192, z -304..16, 1024^2, 0.3125 m.
- 05:50-06:25 v4 built: world/LakeHeight.ts (static heightfield: top-down render of the baked meshes once at load, CPU max
  pyramid, R16F 1024^2 + mips, grid x -128..192 z 16..-304, 0.3125 m), Water.ts lkReflect4 (LK_HGT; `?lkv=3` = v3h exactly,
  `?lkv=2` = v2), HeroEngine builds it (r12 only). Iterations (rb/v4*, tools/hist.py on mode 10 = walk iterations):
  v4a (first hit only, bumped azimuth, cap 64): mean 29-35 p90 64-67, cap hit -> speckles; stripes GONE (an/v4a_hold_near.png).
  v4b flat azimuth: clean but HARD vertical column edges + a hard bright block (an/v4b_hold_lin.png, linear-matched crops
  with tools/rb_crop.py EXPO=0.8: Cycles / v3h / v4b). v4c consistent horizon profile (every rise, shares Phi(e_k)-Phi(e_k-1),
  colour per band): same block, mean 78 iterations (too slow). v4d accurate Phi tails (lkPhiT, tanh form): block unchanged
  -> not the tails. Pixel table (tools/pix2.py) at the block: engine values within Cycles' range (Cycles 0.35-0.74 vs engine
  0.43-0.72): the block is the hard azimuth edge (Cycles' edges are soft / ragged by the bump). v4e = coherent (bumped)
  azimuth for the walk + 60 m walk (rises 40-60 m fade to the remainder): wavy columns like Cycles, no block, no stripes
  (an/v4e_hold_lin.png); mean 47-56 iterations. comp_cost2 (contended, load ~9, min ms per water draw): plate 5.08, v3h 6.93,
  v4e 10.45, v4e dmax40 9.13 (perf/v4e_cost2.txt). v4f = integer walk + finest level growing with distance (0.31 m <12 m,
  0.63 m <30 m, 1.25 m beyond) + 3 rises: looks the same as v4e (an/v4f_hold_lin.png), iterations mean 37-42 p90 54-59.
- 06:00-06:35 v4g/h: the walk term moved to a separate pass (Water.renderWalk, LK_WALKPASS early-out at the top of main, own
  ShaderMaterial sharing the water's uniforms, drawn into a 1/walkDiv-size RGBA16F target after the lake mirror and only when
  the mirror re-rendered, i.e. when the camera moved); the water samples it (LK_HALF, bilinear) and adds the lifted rays the walk
  did not account for (sky at the horizon) and the remainder strata at full res. `?lkhalf=0` = per-pixel walk; `?lkwdiv=`.
  comp_cost3 (contended, load 7-15, min ms): plate water 4.12-4.38; v3h water 6.30-6.63 + mirror 2.5; v4 water 6.03-6.25 +
  walk(div 2) 2.0-2.2 + mirror 2.2; per-pixel walk 9.74. Quarter-res walk (div 4) looks the same as per-pixel and half at
  rest far water and hold near water (an/v4q_rest_far.png, an/v4q_hold.png) -> default walkDiv 4.
  Clouds-off comparison (NOCLOUDS=1 in lake_rb, Cycles rest_clouds0): engine lake ~ Cycles in character (an/v4j_nocl_rest.png);
  box ratios 0.71-1.39 (near boxes are mostly rock reflections). Live clouds drift with time (pinTime 100 in older captures):
  display residual vs Cycles at pinTime 0 (tools/gt_resid.py): plate 5.3-7.4, v4 5.6-8.7 (v4 best at hold 5.62 vs 7.4).
  The world sky is dark at the horizon (sky_world.exr luma 0.037 at 0.5 deg, 0.94 at 5.5 deg, ~2 at 12-20 deg): the lifted
  rays that escape see that (consistent with Cycles' world).
  Next: sweeps (stability), base-copy lab for the switch-off proof, perf A/B, gates, HANDOFF.
- 06:38 basecopy lab :5195 (APFS clone of BASE retrux-web at WORK/basecopy) started for the switch-off proofs; mine to stop.
- 06:40-07:15 calibration vs Cycles (clouds on at pinTime 0 vs rest_calm; clouds off vs rest_clouds0; tools/bandcmp.py = water
  band means by rows x thirds): the FLAT mirror matches Cycles' (bands 0.82-1.13) -> the target is right; the bumped lake was
  20-29 % dark left/centre. Probes (Cycles camera at the lake point, tools/gt_probe.py: an/probe_760_500.png,
  an/probe_350_590.png): the lifted rays from the near-left water meet the massif base / snowy horizon (0.56-0.99) beyond 60 m,
  and from the mirror camera (2.9 m under the water) that direction is sky up to ~290 m: no target lookup can stand in. ->
  the walk now follows the lifted rays across the whole grid (LK_DMAX 320, 4 rises, 160 iterations), affordable at 1/16 of
  the pixels. Bands (clouds, t0): left 0.73-1.06, centre 0.85-1.24 (far row), right 0.79-1.04; (350,590) 0.51 vs Cycles 0.54
  (was 0.24). Remaining: the near-left still ~25 % dark, the near-right ~10 % dark with clouds / 30-44 % bright without.
  3-strata remainder (LK_STRATA 3, quantile boxes to 0.975) made no difference (kept: closer to the Gaussian).
  Heightfield verified (tools/hgt_dump.mjs -> an/hgt0.bin, an/hgt0_full.png): Plane.015 5.12 / 5.19 m, massif 15.12 / 15.27,
  Object_2.009 9.25 / 9.27, floes 0.21 (exact max per texel of the meshes).
  NOTE: the hold sweep of caps/v4_T1 failed (screenshot timeout after a lab rebuild during the run); re-run all sweeps at the end.
- 07:15-07:25 LK_GAIN 1.12 on the v4 base (GT-justified: Cycles / engine water band means at rest, clouds at t0, 1.08-1.37
  left / centre, 0.96-1.14 right). Display boxes vs F000 (tools/lake_boxes.py, qc/v4q_T1/q00_rest.png vs qc/plate_T1):
  far_L -2/-2/-3 (plate same), far_C -6/-5/-4 (plate -12/-10/-8), far_R +19/+19/+15 (plate +15/+14/+11), mid_L -4/-2/-3
  (plate +10/+10/+7), mid_C -5/-3/-2 (plate -7/-6/-5), mid_R +2/+4/+2 (plate +1/+1/-1), near_L -13/-11/-9 (plate -5/-3/-2),
  near_C -6/-7/-9 (plate -5/-7/-9), near_R +25/+21/+12 (plate +16/+14/+8), ring -11/-14/-16 (plate -11/-15/-17).
  vs Cycles (linear bands, rest, clouds t0): left 0.81-0.89 (far row 1.18), centre 0.95-1.04 (far row 1.39), right 0.88-1.17.
  Next: final sweeps T1 (+T2 lr), switch-off proofs vs basecopy :5195, perf A/B, HANDOFF.
- 07:15-07:30 final T1 sweeps caps/v4f_T1 (lr, ud every 2nd; hold every 3rd; still): 413 frames, no errors.
  Right front floes over the lr sweep (an/v4f_lr_rfA.png, base | v4f, lr 96-168; an/v4f_lr_consec.png consecutive frames):
  base shows the detached dark smear / diagonal band behind the floes moving with the camera; v4f's reflections stay attached,
  frame to frame. Hold near water (an/v4f_hold_near_full.png, v3h | v4f, h 228-240): v3h's regular horizontal stripes gone.
  Hold sequence sheet (an/v4f_hold_near.png) and sweep extremes (an/v4f_lr_lake.png): coherent water at every pose.
  Temporal 2nd difference (tools/tflick.py): still camera base / v4f lake_mid 0.489 / 0.477, lake_near 0.566 / 0.666, floes
  0.374 / 0.412, series max 1.526 / 1.53 (no flicker, the walk / mirror reuse never pops); lr 100-160 moving: lake_mid 3.85 /
  6.34, near 5.54 / 6.49 (the Cycles wavelet texture, fixed on the water, moving with the parallax: the plate lake is blurred),
  series max 6.69 / 8.93 at the same frame (common event). Maps an/tf_lr_cmp.png: diffuse texture energy, no tear lines.
- 07:22 slot back to light mode (user active; n 2, bg). Switch-off captures queued (rings / atmos hold both slots).
- 07:30-07:50 switch-off proofs (time-pinned cap_cams at the GT cameras; shards excluded: tools/imgdiff_noshard.py; the
  shards' state is not pinned): lane ?envlake=plate vs basecopy :5195 default: rest 0.662, right 0.011, hold 0.867 mean
  levels (p99.9 1.0); lane ?env=projected vs basecopy ?env=projected: rest 0.893, hold 0.826 (p99.9 3-4). Noise floor of the
  procedure (basecopy vs basecopy, two runs): rest 0.878, right 0.854, hold 0.522 (p99.9 1-2): the switched-off builds are
  identical to BASE within run-to-run noise (frame-seeded grain). Diff maps an/swp_diffs.png: only the unpinned shards.
  (The first shoot_qc attempt was not time-pinned: ripples / shards differ, an/sw_q00_diff.png; discarded.)
- 07:29 LakeHeight: open water / submerged surfaces stored at -0.01 m instead of -4 m (bilinear samples at a floe's edge
  were dragged under the ray: thin floes' rises missed). Measuring its effect next (the v4f sweeps predate it).
- 07:35-07:50 perf under contention (load 6.6-16, user active, other lanes): perf_pair move (lab plate vs lab v4) x1.20
  (0.97-1.54), rest x1.20 (0.76-1.88); v3h vs v4 move x1.12 (0.45-1.94): not usable (rule: load < 6). comp_cost3 (load 8):
  plate water 3.63; v4 water 5.37 + walk (1/16 px) 0.90 + mirror 2.30 (min ms). Change: the r12 lake drawn after the env
  meshes in the env pass (renderOrder 1; `?lkorder=0` = before): same image (rest 0.875 / hold 0.906 mean levels on vs off,
  the capture noise floor), lake under the near rocks / floes rejected by the depth test before shading.
- Floor change measured (rb/v4r_t0, bands vs Cycles calm): unchanged within 0.01 (left 0.81-0.89, centre 0.95-1.04, right
  0.98-1.17); columns at rest with clouds x620 / 700 / 760 / 1112 / 1150 within ~10 % of Cycles, x1078 0.63-0.73 vs 0.69-0.97.
- 07:49-07:55 final-code captures (floor + draw order included): caps/v4z_T1 (lr every 4th, hold every 6th), caps/v4z_T2
  (lr every 6th): no page errors; an/v4z_lr_rf_T1T2.png (base T1 | v4 T1 | v4 T2, lr 96-168): reflections attached at both
  tiers. Resize probe (tools/resize_probe.mjs: h.render wrapped, a lake block of the HDR target read after every frame,
  viewport 1440x766 -> 1200x700 -> 1440x766 -> 900x900 -> 1440x766 -> 1600x800 -> 1440x766, plus an adaptive-scale step to
  1296x689 under load): no black or stale lake frame; each new size's series is smooth (the block moves with the framing).
  Typecheck hero + app: 0 errors.

## 2026-11-17 07:47 RESUME 4 (paused by the user 16 Nov 07:58; resumed "lanjut, super power")
- State: LANE = v4 lake (final-code captures, resize probe, typecheck done 16 Nov 07:55). Labs :5175 / :5195 not running.
  HANDOFF lacks the perf section and the open items. Load 2.35, Mac on battery (Low Power Mode), slot full power.
- Next: start lab :5175; perf A/B (>= 6 interleaved pairs, SLOT_BG=0, load < 6) lab vs MAIN :5173 and lab default vs
  ?envlake=plate; eyes on the key evidence; finish HANDOFF; stop servers.
07:48 lab :5175 started PID 58962
07:54 final-code captures queued (tools/final_qc.sh: qc/final_T1 q00 q03 p06, final_T2 q00, final_ptr 10 spots, main_T1 q00 p06); gated perf next (tools/perf_gated.sh, load < 5.5 before each round).
- 07:48-07:53 perf_ab3 (ungated) stopped after 2.7 rounds: loads 7-13 (the user's IDE, contactsd, a rings-lane numpy job,
  another Chrome): only round 1 (loads 3.3-6.0) is valid (A rest 32.2 / hold 26.7 fps; B 30.8 / 25.6). New load-gated
  runner tools/perf_gated.sh + perf_round.sh (waits outside the slot until load < 5.5 before each round).
- 07:55 final-code captures (qc/final_T1 q00 q03 p06, final_T2 q00): lake boxes vs F000 T1 far_L -2/-2/-3, far_C -7/-5/-4,
  far_R +18/+18/+14, mid_L -4/-2/-3, mid_C -9/-7/-4, mid_R -3/-1/0, near_L -11/-9/-8, near_C -11/-11/-11, near_R +26/+22/+13,
  ring -15/-17/-18; T2 within 2 levels of T1 (an/r4_T1T2_lake.png). The Cycles GT of the artist's water at the same camera
  is itself off F000 by up to 33 levels in these boxes (near_R +33/+26/+12, far_C -20/-25/-28; an/r4_gt_vs_F000.png): F000's
  framing (rocks ~20 px higher) and grade differ, so +-3 vs F000 is not reachable by the water alone (MAIN's plate fails too).
  Eyes: an/r4_rest_lake3.png (F000 | plate | v4), r4_rest_centre3.png, r4_rest_tex3.png (F000 | plate | v4 | Cycles, 2x): v4's
  wavelet texture = the Cycles render's; F000's is softer (video encoding / DOF); far-right water paler than F000.
- 08:01 removed the temporary PERFKNOB (lab bisection on uLakeDebug < 0) from lkReflect3 / lkReflect4: with uLakeDebug >= 0 (production 0, debug modes > 0) every removed term was a no-op. Lab rebuilt; tsc hero 0 errors. Verify: time-pinned readback before/after (identity).
- 08:03 identity proof setup: WORK/prekb = APFS clone of LANE retrux-web with the knob re-inserted, lab :5196 (PID 66001, mine to stop).
- 08:03-08:06 knob removal = no-op, proven: deterministic readbacks (tools/rb_identity.sh: camera overridden from
  gt/cams_all.json, time pinned 0, raw reflection) lane vs the clone with the knob (:5196): rest and hold BIT-IDENTICAL
  (0 of 1,103,040 px differ); lr_132: 11,596 px differ, all in rows 0-292 (sky / cloud drift, not water), max 0.0625 linear,
  below the same lab's own run-to-run noise at lr_132 (126,608 px, max 0.46). Lab :5196 stopped.
  (Note: the earlier rb/v4r_t0 vs a new rest readback differed because the un-overridden rest camera depends on real elapsed
  time: z 11.79 vs 11.69; camera-overridden readbacks are deterministic: rest run1 vs run2 identical.)
- 08:02:52 gated perf round 1 started while my readbacks (08:03-08:06) ran: round 1 excluded (overlap); extra rounds 7-8 to be added. No heavy jobs of mine while the perf runner is active.
- 08:07 cap_cams final v4 at the 9 GT cameras (pinTime 0) -> gt/disp/v4final_t0 (perf gate closed: load > 20, rings holds 2 slots).
- 08:07-08:10 final v4 display at the exact GT cameras (gt/disp/v4final_t0, pinTime 0) + tools/gt_resid.py vs Cycles (rest colour
  fit; gt/r1/resid_final.json): water plate / v4 rest 5.45 / 6.48, left 5.33 / 5.86, right 5.31 / 8.22, lr_132 5.70 / 6.95,
  lr_144 5.78 / 7.07, hold 7.40 / 5.17; floe band plate / v4 rest 7.04 / 6.20, left 6.66 / 6.81, right 7.29 / 6.95, lr_132
  7.26 / 6.67, lr_144 6.60 / 6.14, hold 5.63 / 4.51. v4 closer to Cycles in the floe band (5 of 6) and at the hold camera;
  further in the general water at the orbit cameras (regional level bias, right camera worst).
- 08:11 typecheck hero + app: 0 errors (after the knob removal).
- 08:11 motion check far water (an/r4_far_consec.png, v4f lr 100-110 every 2nd frame, full res): floe columns fixed, wavelets coherent frame to frame, no sparkle / crawl. Gated perf round 2 started 08:10:58 (load 4.93).
- 08:13 merge dry run: MAIN changed only HeroEngine.ts of my files since BASE (rings P2b + hotfix, 18 lines); git merge-file MAIN/BASE/LANE HeroEngine.ts = clean (WORK/merge3/merged.ts). Water.ts, assets.ts, LakeMirror.ts identical in MAIN and BASE; LakeHeight.ts new.
- 08:13 perf round 2 done-ish (B rest 31.1 hold 26.9; C 35.1 / 28.9); waiting for rounds 3-6 (gate load < 5.5), then move pairs.
- 08:19 LakeHeight.ts comment corrected (memory: transient 16 MB float target, kept ~2.7 MB R16F + mips); comment only; lab rebuilt while no perf run was active; tsc 0.
- 08:20-08:30 up-down sweep (an/r4_ud_lake.png, base | v4, ud 0-240): both coherent, v4 floe columns attached. Texture check:
  display std per box (lake_boxes) v4 near_L 14.7 vs F000 4.9 / MAIN 10.7; 2x crops an/r4_nearL4.png (F000 | MAIN | v4 | Cycles):
  v4's near-water wavelet streaks are more contrasty than Cycles' at the same camera. Linear band-pass contrast (tools/texcon.py:
  luminance blur 1.5 px minus blur 6 px, std / box mean; Cycles rest_calm.exr vs the v4 raw-reflection readback rb/idA rest):
  Cycles / v4 far_L 0.156 / 0.130, far_C 0.147 / 0.122, far_R 0.155 / 0.085, mid_L 0.140 / 0.159, mid_C 0.115 / 0.100, mid_R
  0.172 / 0.185, near_L 0.064 / 0.079, near_C 0.075 / 0.104, near_R 0.220 / 0.172 (Cycles includes some 64-spp noise, so its
  true texture is a little lower). => near water wavelets ~1.2-1.4x (or more) Cycles', far-right columns ~0.55x: open issue
  (model-level: the pixel average over the per-sample normals; not retuned in this step).
- 08:30-08:36 where the extra near-water contrast comes from (tools/elevcmp.py: Cycles gt/elev/rest_elev_calm.exr = per-pixel MEAN
  elevation of the reflected rays vs the engine model's prediction from mode 2 (rb/v4p_f, same camera): E[max(e, emin)],
  e ~ N(e0 + de, sg)); band-pass std engine / Cycles: near_L x0.94 (1.5-6 px) / x1.00 (3-12 px), near_C x0.97 / x0.93, mid_L
  x0.93 / x0.68, mid_C x0.88 / x1.21, far_C x0.63 / x0.95 (Cycles includes 64-spp noise). => the bump's normals match Cycles;
  the near water's extra RADIANCE contrast (texcon 1.2-1.4x) comes from the radiance integration (the per-pixel spread's shape
  or the strata / walk lookups), not from the normals. Pointer for a fixer; no change made.
- perf: rounds 3 A / B started at loads 9.19 / 7.10 (the load rose after the gate opened): excluded by the rule; more rounds needed.
- (clock note: the two entries above labelled 08:20-08:30 and 08:30-08:36 actually ran 08:16-08:23; real clock 08:23.)
- 08:24-08:27 near-water contrast decomposition (rb/v4p_f rest, modes 1 / 7 / 8 / 9; band 1.5-6 px, std / box mean, linearized):
  near_C total 0.088 = remainder strata (1-Fc) dU 0.066 + walk share (H-U) dFc 0.020 + face colour Fc dH 0.020; near_L 0.057 =
  0.051 + 0.027 + 0.009; mid_L 0.084 = 0.060 + 0.026 + 0.026. => the strata term carries most of the near texture. With the mean
  elevations matching Cycles, the suspect is the 3-strata quadrature of the radiance integral (U follows the coherent
  elevation too closely). Next step for a fixer: readbacks with ?lkstrata=2 vs 3 (and a 5-strata build) at the rest camera; if
  the near CV moves toward Cycles' 0.064-0.075 with more strata, integrate the near field better (cost: more lookups).
- 08:37 perf: round 4 fully valid (5.22 / 3.53 / 4.93); valid rounds so far 2, 4 (+3C). Load then 22-28 (other lanes).
- 08:38 PERF FINDING: round 4 (gate load 5.2) A MAIN rest 60.0 fps / hold 55.7, C lab plate rest 59.9, B lab v4 rest 28.1: with
  low GPU contention MAIN and the plate lake fit the 16.7 ms vsync budget at rest, v4 does not (its extra cost, ~2.8 ms per rest
  frame from the pass split: water +1.7, mirror 2.3 + walk 0.9 every 3rd frame) and falls to the 30 fps cadence. Under contention
  (rounds 2-3) all three run at ~30 fps and B/A ~1.1. perf_probe's vsync-quantized fps cannot size the gap: added synchronous
  paired measurements (perf_pair rest + move, plate-vs-default and main-vs-default) to the gated runner's move rounds.
- 08:41 PLAN (perf): v4 does not fit the vsync budget at rest where MAIN does (round 4) and the T1 adaptive scale drops the
  render scale under 50 fps, so the extra cost is a visible quality risk on the user's M4 (T1). Prototype in WORK/opt (APFS
  clone of LANE retrux-web, lab :5197; LANE untouched while the perf runner measures it): (A) r12 at rest: lake mirror (and
  walk) reused up to 30 frames with tighter still-thresholds (pose error bound ~0.2 px); (B) cache the r12 reflection term in a
  screen target while the camera and DOF are still; pixels bent by the orb ripples / impulse recompute it. Both switchable.

## 2026-11-17 20:15 RESUME 5 (user "lanjutt" 20:12; previous attempt paused 08:52 by the user)
- State: LANE = v4 lake (unchanged since 08:19). WORK/opt = APFS clone of LANE retrux-web with the REST CACHE prototype
  (unlogged, 08:41-09:00): LakeMirror stillDist2/stillDot fields; HeroEngine: mirror.reuse 30 + tight still test at r12
  (`?lkrest=0` = 2-frame reuse), lkCache key (focus, hold, blur); Water.ts LK_CACHE / LK_CACHEPASS (the reflection term
  without the ring bend drawn into a full-float target on the first still frame, read by texelFetch where moffsW == 0 and the
  plane tag (alpha 1 near / 2 far) matches; `?lkcache=0` = computed). Probes rb/cacheA-C + an/r4_cache_outliers.png (scattered
  single px + a row at the plane seam z -14.87); the plane-tag + full-float fix (09:00 build) was never verified (cacheD not run).
- perf/gated_final.txt: 6 rounds of perf_probe (A MAIN, B lab v4, C lab plate); only rounds 2 and 4 fully valid; round 4 (low
  contention): A rest 60.0 / hold 55.7, C rest 59.9 / hold 30.6, B rest 28.1 / hold 21.1 -> v4 misses the vsync budget.
  perf/move_final.txt: the move pairs died (browser closed) in round 1.
- Now: load 12-13 (another project's headless Chrome at ~775 % CPU, not mine), slot full power (n 3). Labs :5175 / :5197 down.
- Plan: (1) verify + port the rest cache into LANE (switch ?lkcache=0 / ?lkrest=0); (2) cut the moving-camera cost (mirror
  resolution / draw list / walk); (3) perf A/B when load < 6; (4) near-water texture (strata) if time; (5) gates, HANDOFF.
- 20:17 PORTED the rest cache into LANE (WORK/patches/cache_*.diff; pre-port copies in WORK/pre_cache): LakeMirror.ts
  (stillDist2 / stillDot fields), HeroEngine.ts (r12: mirror.reuse 30 + still test 0.5 mm / 0.003 deg unless `?lkrest=0`;
  cache key focus / hold / blur; renderCache on the first still frame), Water.ts (LK_CACHE / LK_CACHEPASS, `?lkcache=0`).
  tsc hero 0. Identity (tools/cache_probe.mjs -> rb/cacheE, tools/cachecmp.py, computed frame vs cached frame, same camera):
  rest / lr_132 / hold / left, raw reflection and shaded: 0.02-0.03 % of px differ, all <= 0.2 % relative (1 half ulp)
  except one px at rest (1051,531) 1.5 %; maps an/r5_cache_*.png = sparse dots, the plane-seam row is gone.
- 20:25-20:36 LAKE SCHEDULE (replaces the prototype's 30-frame reuse + tight still test, which would have redrawn mirror +
  walk + cache together every ~8-30 frames because the rig's handheld drift turns the camera up to ~0.0002 deg/frame
  (CameraRig.apply: +-0.1 deg sines), i.e. +4.9 ms peaks at rest). New world/LakeSchedule.ts (frame(): which of mirror /
  walk / cache run this frame), Water.ts LK_WALKREPROJ (the water and the cache pass read the walk at the lake point's uv in
  the walk's own view-projection uLkWalkVP, set in renderWalk), LakeMirror.render(force) (BASE otherwise: the prototype's
  still fields reverted), HeroEngine (lakeSched created when water.scheduled; render() calls it; resize invalidates).
  Rules: jump (> 20 cm / 1 deg per frame) or fresh/resize: mirror + walk now; moving/settling (> 0.05 mm or 0.0004 deg per
  frame): term live, mirror and walk on alternate frames (`?lkamort=0`: both every frame); still: at most ONE pass per frame
  (stale mirror > 2 mm, then walk, then the cache; the cache is redrawn after 0.5 mm / 0.003 deg (~0.09 px) of drift or a DOF
  input change), mirror every 30 frames for the clouds (cache read once more, redrawn next frame).
  Switches: `?lkperf=0` = v4 before this step exactly (no LK_WALKREPROJ / LK_CACHE defines, mirror reuse 2 at T1, walk with
  each mirror render); lab `?lkcache=0`, `?lkamort=0`. tsc hero 0.
- 20:37 first paired live-sequence run (tools/seq_pair.mjs: two pages, same deterministic per-frame simulation, h.render()
  once per frame, canvas read) timed out waiting for heroReady (180 s, load 16-26): smoke test (tools/smoke.mjs) queued.
- 20:59 smoke (tools/smoke.mjs): default and ?lkperf=0 READY in 3-4 s, no console errors. The seq_pair timeout was a second
  page in the same headless browser counting as hidden: one browser per page now.
- 21:00-21:10 PAIRED LIVE SEQUENCE lr (seq/lr1, A = default schedule, B = ?lkperf=0; still 12 / sweep 72 / settle 24 frames,
  hero hidden; tools/seq_cmp.py, seq_flick.py, seq_crop.py). Schedule as designed: still -> cache drawn once ("cR") then read
  ("R"), redrawn after drift (frame 13); moving -> walk / mirror alternate. A vs B (lake rows, 8-bit): still frames mean 0.55
  (= the grain floor) p99 1, max 12-43 on <= 239 px growing with time = the clouds' reflections lagging the 30-frame mirror
  refresh (cloud cards drift <= ~0.1 m/s at 80-130 m ~ 1.7 px/s -> 0.85 px steps); moving: walk-frames p99 1-6, mirror-frames
  p99 5-9 (1-frame lag at ~2.5 cm/frame). Temporal 2nd difference over consecutive moving frames 79-107: A / B far 3.66 / 3.59,
  mid 3.81 / 3.75, near 3.61 / 3.59; alternating (30 Hz) component 1.051 / 1.037, 0.945 / 0.906, 0.860 / 0.844; p99.9 equal
  (66.3 / 66.1): no flicker from the alternation. Right slab full res (an/r5_seq_lr_rf.png, frames 79-82, A / B / x4 diff):
  indistinguishable; a thin diff line at the slab base on both frame kinds (lag, no alternation).
- 21:12 CLOUD_FRAMES 30 -> 8 (cloud reflection steps <= 0.25 px). Running still + hold paired sequences.
- 21:15-21:30 still + hold paired sequences (seq/still1, seq/hold1) found two schedule bugs: (1) the DOF key compared exactly:
  a settled spring still creeps ~1e-8 m per frame, so uFocusDist changed every frame and the cache was REDRAWN EVERY STILL
  FRAME (still1: "cR" on all 60 frames; the sustained hold too); (2) the cloud refresh sat after the cache branch, so with (1)
  it never ran and the clouds' reflections lagged without bound (A-B n>8 growing to ~800 px). Fix: focus / hold compared
  within 1 mm / 0.001 (no visible DOF change), cloud refresh before the cache redraw. tsc 0.
  Moving parts verified in hold1: alternation through the dolly and release; "mw" (both) at the lunge's jumps (frames 57-63,
  0.2-1.1 m/frame); release ~20 mm/frame: mirror-frames p99 5-12 levels, n>8 up to ~8k px (walk 1 frame stale), walk-frames
  p99 2-5 (an: seq/hold1/sheet_243_246_249.png: invisible at half size, x4 diff on the far floe columns). Re-running still +
  hold2 (release saved every frame) for the temporal check.
- Texture (display, tools/texdisp.py, band-pass sigma 0.8-3 px, levels): near_L F000 2.45 / MAIN 2.98 / v4 5.45 / Cycles
  3.49; near_C 4.61 / 4.67 / 8.29 / 3.89 (Cycles calm: no ring waves); mid / far close to Cycles (mid_C 8.57 vs 9.76, far_C
  6.59 vs 6.91); far_R v4 2.16 vs Cycles 4.97 / F000 3.95. Linear (texcon 1.5-6 px CV) clouds OFF near_L 0.056 vs Cycles 0.037,
  near_C 0.069 vs 0.068; clouds ON near_L 0.079 vs 0.064, near_C 0.104 vs 0.075: the near excess appears where the reflected
  scene has sharp structure (cloud edges, the massif) -> suspect: the near-field per-pixel spread of reflected elevations too
  narrow (the mean direction matched in elevcmp). Next: measure Cycles' per-pixel spread (synthetic world, 2nd moment).
- (clock note: entries above labelled 21:00-21:30 were estimates that ran ahead; real clock 21:09. The schedule fix was built 21:05:54.)
