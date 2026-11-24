# WATER lane (round 11 P2b, user-priority) HANDOFF

Builder log: `$SP/work2/water/LOG.md` (every attempt, number and decision). Evidence: `$SP/work2/water/{an,rb,caps,gt,perf,qc,seq}`.
(`$SP` = `/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad`;
paths below without a prefix are under `$SP/work2/water/`.)

STATUS: built and verified on the lab (see "Verification", "Perf" and "Gates"); open items at the end.
Resume 5 (17 Nov 20:12-22:xx) added the lake's frame schedule (`LakeSchedule`, section "Frame budget") and its proofs.
Resume 7 (18 Nov 00:12-): the schedule's settled test on speeds (robust under GPU contention); the light water under the right
front slabs traced to the quarter-size walk spilling the values of lake points UNDER the slabs into the visible water at their
feet (fix `LK_WALKSEL`) and to face lookups below the faces' feet (fix `LK_HMIN`); a merged build (MAIN + this lane) for the perf
A/B and the switch-off proofs; the gates and open issues.

## What the user saw and the cause
The integrated lake (MAIN, `?envlake=plate`) re-aims the REST plate's baked reflections (slab faces, floe columns) through a
coarse mirror-length map with side fills. At the rest camera and at the orbit extremes it is close to Cycles; in the in-between
pointer / dolly poses it breaks (captured in `caps/base_T1`, the user's complaint reproduced):
1. The right front slab's dark face reflection detaches and slides as a dark diagonal band behind the slab while the camera
   orbits = the "shadowing" on the foreground ice (`an/v4f_lr_consec.png` left column, consecutive frames; `an/v4f_lr_rfA.png`).
2. Tears: a white stair-step edge in the water under the slab's bright face (lr_132, `an/ab_rf_132_144.png`); white slivers at
   the left floes' edges (`an/r4_lr_leftfloes.png` left column, lr 60-180).
3. Floe reflections that are lighter, detached and broken horizontally where Cycles keeps them attached as columns (same camera:
   `an/gt_lr132_144_rf.png`, rows plate / Cycles at lr_132 and lr_144).
The slab and floe meshes are identical with every lake (`an/ab_rf_132_144.png`: default / `?envlake=mirror` / `?proj=0`): the
defect is in the water. Ground truth: Cycles renders of the artist's water at the same cameras keep every reflection attached.

Fix: the lake is a true planar mirror of the real scene with the Cycles water's own bump reproduced (`LAKE_R12`, lake v4):
nothing baked is re-aimed, every floe / rock / iceberg reflection is attached by construction.

## The lake (default at T1 / T2 on the baked environment)
1. LakeMirror: the scene drawn from the mirrored camera (rgb + path length). When it is drawn: see "Frame budget".
2. The Cycles bump, exact (the artist's water, forensics 3.3: Perlin fBm scale 3, detail 4, roughness 0.5, lacunarity 2,
   B-spline ColorRamp, Bump distance 0.07 strength 1; verified against Blender's own noise to 1e-3): per pixel a coherent normal
   (the wavelets, fixed on the water) and the incoherent spread from Cycles' compact ray differentials (measured in Cycles with
   synthetic worlds, `tools/gt_elev.py`, `tools/step_sim.py`), with Cycles' ensure_valid_specular_reflection lift.
3. The low rays: a static max-mip heightfield of the baked meshes (`LakeHeight`, built once at load) walked from the lake point
   along the reflected azimuth; every face that rises above the running horizon takes the pixel's rays between the old and new
   horizon elevation (normal CDF), its colour from the mirror target. Up to 4 rises, out to 320 m. This draws the floe / iceberg
   / shore reflection columns. Drawn by a separate pass at 1/4 x 1/4 resolution (`Water.renderWalk`); the water samples it
   bilinearly at the lake point's place in the walk's own frame (`LK_WALKREPROJ`). Resume 7: the walk pass marks lake points
   inside a heightfield footprint (under a floe / slab / rock, hidden from the camera; alpha -1) and the water filters the walk
   from the unmarked texels only (manual 4-tap bilinear, renormalized; the walk computed for the pixel where nearly all the
   weight is marked) (`LK_WALKSEL`); each face is looked up at the texel's entry and no lower than 5 cm above the water (at most
   half its height there) (`LK_HMIN`).
4. The rest of the rays (over every face): three strata of equal share, each a short parallax march in the target.
5. `LK_GAIN` 1.12: the level against the Cycles water at the same camera (band means).
6. The water's other terms (orb ripples, glint, orb / hero reflections) are unchanged.

## Frame budget: LakeSchedule (resume 5)
Why: with the previous schedule (mirror reused 2 frames at T1, the walk with each mirror render, the reflection term computed
every frame) the lab missed the vsync budget where MAIN met it (`perf/gated_final.txt` round 4, low contention: MAIN rest 60.0
fps, lab plate 59.9, lab v4 28.1). A first prototype (WORK `opt/`, mirror reused 30 frames under a tight still test) would have
redrawn mirror + walk + cache together every ~8-30 frames, because the rig's handheld drift (CameraRig.apply, +-0.1 deg sines)
turns the camera up to ~0.0002 deg per frame even at rest.
What it does (`world/LakeSchedule.ts`, called by HeroEngine.render before the main pass):
- The water reads the mirror through the matrices it was drawn with (as before) and the walk through the view-projection it
  was drawn with (`uLkWalkVP`): both stay exact when drawn a frame earlier or before a pure turn of the camera.
- Moving camera (pointer orbit, hold dolly, release; > 0.05 mm or 0.0004 deg per frame): the term is computed every frame, the
  walk is drawn every frame, the mirror (the scene's draw calls) every other frame; a jump > 20 cm / 1 deg (debug poses) or a
  resize draws both at once.
- Still camera (rest, the sustained hold): at most one lake pass per frame: a mirror or walk left behind by the motion
  (> 2 mm), then the reflection term into a full-float cache target (`Water.renderCache`, LK_CACHEPASS: the same shader up to the
  term, without the ring waves' bend; alpha tags the lake plane), which the water then reads by texelFetch wherever the ring
  waves / impulse do not bend it (`LK_CACHE`). The cache is redrawn after 0.5 mm / 0.003 deg (~0.09 px) of drift or when the
  DOF inputs change (focus 1 mm, hold 0.001); the mirror every 8 frames for the drifting clouds (<= 0.25 px steps), the cache
  on the frame after.
- Resume 7: "moving" / "still" is decided on SPEEDS in simulation time (the thresholds above are per 1/60 s; scaled by the
  squared step, at most 3 steps; a frozen clock keeps the per-frame test). With per-frame steps a page slowed to 20-30 fps by
  GPU contention read the handheld drift (up to 0.012 deg/s) as motion during its faster half-periods and ran the moving
  schedule (mirror + walk) on the frames that were already late (resume 6: 213 of 600 rest frames at load 6). Lab `?lkdt=0` =
  the resume-5 per-frame test.
- `?lkperf=0` = the previous v4 exactly (no new defines, the old 2-frame reuse); lab `?lkcache=0`, `?lkamort=0`, `?lkdt=0`.

## Files (relative to LANE)
- `retrux-web/app/hero/engine/world/Water.ts` (resume 7: `LK_WALKSEL` in the walk pass and the water's walk read, `LK_HMIN` in
  lkWalkTerm's face lookup, their defines): `GLSL_LAKE_R12` (bump; v2 / v3 / v4 reflection models; lab debug modes 1-11 via
  `uLakeDebug`), the walk pass (material sharing the water's uniforms, target, `renderWalk`, `setWalkSize`, `disposeWalk`,
  `walkDiv`); r12 water meshes drawn after the env meshes (renderOrder 1). Resume 5: `LK_WALKREPROJ` (uLkWalkVP, set in
  renderWalk), `LK_CACHE` / `LK_CACHEPASS` (cache target RGBA32F at the main target's size, `renderCache`, `setCacheOn`,
  `hasCache`, `scheduled`), all under `?lkperf` not 0 inside the r12 v4 branch.
- `retrux-web/app/hero/engine/world/LakeSchedule.ts` (new, resume 5): the frame schedule above (resume 7: `bySpeed`, the
  `time` argument of `frame`, the public `cloudFrames`).
- `retrux-web/app/hero/engine/world/LakeMirror.ts`: `render(..., force = false)` (LakeSchedule draws it when it decides);
  otherwise identical to BASE.
- `retrux-web/app/hero/engine/world/LakeHeight.ts` (new): the static heightfield (one top-down render of the baked meshes at
  load into a transient 16 MB float target, read back, CPU max pyramid, kept as R16F 1024^2 + mips, ~2.7 MB GPU; grid x
  -128..192 m, z 16..-304 m, 0.3125 m). Null (the water keeps v3) when float targets are not renderable.
- `retrux-web/app/hero/engine/HeroEngine.ts`: builds the heightfield (r12 only), creates the LakeSchedule when the water is
  scheduled (`?lkamort`), calls it in render() (else the previous mirror + walk lines), invalidates it in resize(), sizes and
  disposes the walk / cache targets. Small hunks: imports (LakeHeight, LakeSchedule), 2 fields, build block in load, schedule
  creation (+ `?lkdt`, resume 7), the render() branch (passes `s.time`, resume 7), setWalkSize + invalidate in resize, dispose.
- `retrux-web/app/hero/engine/assets.ts`: `lakeR12` (default lake = r12 where the mirror is allowed: T1 / T2, baked env); when on,
  the projected plates are not loaded (as the mirror lake already did) and `lakeCorr` is skipped.
- `retrux-web/app/hero/README.md` (resume 7): the Lake row describes the round-11 default lake and lists its files (one table
  row; `git merge-file` with MAIN's README (changed by the rings lane): 0 conflicts).
- No assets added (the heightfield is built at runtime from the shipped env meshes). GPU memory added by resume 5: the cache
  target, 16 bytes per main-target pixel (17.6 MB at 1440x766; scales with the adaptive render scale).
- Generated, do not merge: `retrux-web/hero-lab/dist/*` (lab build). `retrux-web/tsconfig.tsbuildinfo` was put back to BASE's copy
  after the last typecheck, so `diff -rq BASE LANE` (without node_modules, .git, dist, .next) lists exactly: HANDOFF.md, README.md,
  HeroEngine.ts, assets.ts, LakeMirror.ts, Water.ts, and the new LakeHeight.ts, LakeSchedule.ts.
- Merge (re-checked 18 Nov 01:00 against MAIN's HeroEngine.ts of 17 Nov 22:12): of these files MAIN changed only HeroEngine.ts
  since BASE; `git merge-file -p MAIN BASE LANE` of HeroEngine.ts is clean (0 conflicts); Water.ts, assets.ts, LakeMirror.ts and
  PlateEnvironment.ts are identical in MAIN and BASE (apply the lane's versions; PlateEnvironment.ts is NOT changed by this lane);
  LakeHeight.ts and LakeSchedule.ts are new. The merged result is built and served for the perf A/B and the switch-off proofs:
  WORK `merged7/retrux-web` (an APFS clone of MAIN's retrux-web + those files; `merged7/HeroEngine.merged.ts`), tsc hero 0.
- With the ATMOS lane (not in MAIN at the time of writing; INTEGRATION.md A2): HeroEngine.ts must keep its
  `this.env?.updateAtmos(s.time)` line (3-way merge); the lake mirror already draws the live cloud cards (they carry
  `uCloudShift`). Its conveyor moves the clouds at ~8.4 px/s: LakeSchedule redraws the mirror every `cloudFrames` (8) frames at
  rest, which then gives ~1.1 px steps of the cloud reflections every 133 ms (the current MAIN's clouds drift <= 1.7 px/s:
  <= 0.25 px). With the atmos clouds set `cloudFrames` to 2 (<= 0.28 px steps; the cache is then redrawn every other frame and
  saves little: `?lkcache=0` / `cache = false` may be cheaper) and re-measure.

## Switches
- default (T1 / T2, baked environment): lake v4 with LakeSchedule.
- `?lkperf=0`: lake v4 before resume 5, exactly (rest readback bit-identical to this morning's v4, see Verification).
- `?lkwsel=0&lkhmin=0`: lake v4 as at the end of resume 6 (bit-identical readbacks at rest and hold); `?lkwsel=0` / `?lkhmin=0`
  each alone; `?lkhmin=<m>` (lab) another minimum height.
- `?envlake=plate`: the integrated round-11 plate lake, exactly (BASE's default).
- `?envlake=mirror`: the ENV lane's mirror lake (as in BASE). `?envlake=r12`: forces r12 at T0 too. `?envfix=0`: as BASE.
- `?lkv=3`: lake v3h (the previous attempt's target-march model); `?lkv=2`: v2. `?lkorder=0`: r12 drawn before the env meshes.
- lab knobs: `?lkdt=0` (settled test per frame, as resume 5), `?lkcache=0` (schedule without the cache), `?lkamort=0` (mirror every moving frame), `?lkhalf=0` per-pixel walk,
  `?lkwdiv=N` walk target divisor (4), `?lkwalk=N` iteration cap (160), `?lkdmax=M` walk distance (320 m), `?lkhaz=0` flat
  azimuth, `?lkstrata=2` two remainder strata, `?lkgain=` level.
- `?env=projected`: round 10 (no mirror, plate lake). T0 keeps the plate lake (the cheaper path, unchanged).

## Verification (numbers; evidence under WORK)
### Lake v4 (previous attempts, unchanged by resume 5 except where noted)
- Ground truth: Cycles renders of the artist's water (COPY `blend/plate_scene_v7_copy.blend`, Metal GPU, plate settings,
  1440x766, lower 47 %) at the engine's exact cameras (`gt/cams_all.json`: rest, left, right, top, bottom = the shoot_pointer
  extremes, hold, lr_132, lr_144 (two intermediate pointer poses of the sweep), lunge066 (hold dolly)), calm / mirror (bump off)
  / clouds-off variants: `gt/r1/*.exr|png`; probes from lake points (`an/probe_760_500.png`, `an/probe_350_590.png`).
  GT rest vs F000 (`an/r4_gt_vs_F000.png`): same lake layout, floe columns and milky water; no orb ripple rings (not in the plate
  scene); box levels off F000 by 3-33 (F000's framing is ~20 px higher and its grade differs).
- Floes "shadowing" / tears gone: base vs v4 over the pointer sweep, every 2nd / 4th frame: right floes `an/v4f_lr_rfA.png`,
  consecutive frames `an/v4f_lr_consec.png`, T1 / T2 `an/v4z_lr_rf_T1T2.png`, left floes `an/r4_lr_leftfloes.png` (base: detached
  dark band, white slivers; v4: attached reflections, clean edges, frame to frame). Same camera as Cycles at rest around the right
  slab: `an/r4_nearR_gt.png` (plate | v4 | Cycles): v4 = Cycles.
- No fragmenting from any camera: the 10 shoot_pointer spots (`qc/final_ptr`, lake sheets `an/r4_ptr_lake_a.png`,
  `an/r4_ptr_lake_b.png`), the hold dolly + release (`an/r4_hold_seq.png` base | v4, `an/v4f_hold_near.png`), sweep extremes
  (`an/v4f_lr_lake.png`). The previous attempt's horizontal stripes from the hold camera: `an/hstripe_modes*.png` (v3h) -> gone
  (`an/v4f_hold_near_full.png`, v3h | v4).
- Texture vs Cycles: `an/r4_rest_tex3.png` (F000 | plate | v4 | Cycles, 2x) and `an/r4_midL_gt.png` (plate | v4 | Cycles): v4's
  wavelets = the Cycles water's in the mid water; the plate lake is smoother; F000 is softer (video). Near water: open issue 3.
- Against Cycles at the same camera (linear readback of the raw reflection, `tools/bandcmp.py`, water band means engine /
  Cycles, rest, clouds at their Blender places): left 0.81-0.89 (far row 1.18), centre 0.95-1.04 (far row 1.40), right
  0.98-1.17; the FLAT mirrors agree 0.82-1.13 (the target is right).
- Display at the exact GT cameras (`gt/disp/v4final_t0`, `tools/cap_cams.mjs`, pinTime 0) vs the plate lake (`gt/disp/plate_t0`),
  residual vs the Cycles render after a per-channel colour fit at rest (`tools/gt_resid.py`, `gt/r1/resid_final.json`, levels,
  plate / v4): water rest 5.45 / 6.48, left 5.33 / 5.86, right 5.31 / 8.22, lr_132 5.70 / 6.95, lr_144 5.78 / 7.07, hold 7.40 /
  5.17; floe band (under the right floes) rest 7.04 / 6.20, left 6.66 / 6.81, right 7.29 / 6.95, lr_132 7.26 / 6.67, lr_144
  6.60 / 6.14, hold 5.63 / 4.51. v4 is closer to Cycles in the floe band (5 of 6 cameras) and at the hold camera; further in
  the general water at the orbit cameras (the regional level bias above; right camera worst: `an/r4_right_gt.png`).
- Temporal (`tools/tflick.py`, 2nd difference, previous schedule): still camera base / v4 lake_mid 0.489 / 0.477, near 0.566 /
  0.666, floes 0.374 / 0.412, series max 1.53 / 1.53; moving (lr 100-160) lake_mid 3.85 / 6.34: the wavelets (fixed on the water)
  moving with the parallax, as in Cycles (the plate lake is blurred); no tear lines (`an/tf_lr_cmp.png`).
- Rest vs F000 (display, `tools/lake_boxes.py`, sRGB levels, `qc/final_T1/q00_rest.png`): far_L -2/-2/-3, far_C -7/-5/-4, far_R
  +18/+18/+14, mid_L -4/-2/-3, mid_C -9/-7/-4, mid_R -3/-1/0, near_L -11/-9/-8, near_C -11/-11/-11, near_R +26/+22/+13, ring
  -15/-17/-18 (mean |diff| 9.3). MAIN's plate lake (`qc/main_T1`): mean |diff| 6.9. T2 within 2 levels of T1. Neither lake
  passes +-3 everywhere (open issue 1). LakeSchedule does not change any still frame (cache = computed, below).
- Switch-off proofs (time-pinned captures at the GT cameras, shards excluded, `tools/imgdiff_noshard.py`): `?envlake=plate` vs
  BASE (APFS copy on :5195) rest 0.662 / right 0.011 / hold 0.867 mean levels; `?env=projected` vs BASE projected rest 0.893 /
  hold 0.826; the procedure's noise floor (BASE vs BASE) 0.878 / 0.854 / 0.522. Resume 5 touched only r12 code paths (the new
  defines and LakeSchedule exist only inside the r12 v4 branch; LakeMirror's `force` defaults to the old behaviour).

### LakeSchedule (resume 5)
- Cache = computed term (`tools/cache_probe.mjs` -> `rb/cacheE`, `tools/cachecmp.py`; same camera, computed frame vs cached
  frame; rest / lr_132 / hold / left; raw reflection and shaded): 0.02-0.03 % of pixels differ, all <= 0.2 % relative (one
  half-float ulp) except one pixel at 1.5 %; maps `an/r5_cache_*.png` (sparse dots; the near / far plane seam row is gone).
- `?lkperf=0` = the previous v4 (deterministic readbacks, camera from `gt/cams_all.json`, time 0, `rb/idC` vs this morning's
  `rb/idA`): rest BIT-IDENTICAL (0 of 1,103,040 px); hold 76 px <= 0.001; lr_132 60,153 px max 0.24 = that camera's known
  run-to-run sky / cloud noise (126,608 px, max 0.46).
- Paired LIVE sequences (`tools/seq_pair.mjs`: two browsers, the same deterministic per-frame simulation, one h.render per frame,
  canvas read; A = default, B = `?lkperf=0`; hero hidden; `tools/seq_cmp.py`, `seq_flick.py`, `seq_crop.py`):
  - pointer sweep (`seq/lr2`, still 12 / sweep 72 / settle 24 frames): moving frames with a fresh mirror A-B p99 1.0, with the
    mirror one frame old p99 avg 3.2 (max 6); temporal 2nd difference over consecutive frames 79-107 A / B far 3.60 / 3.59, mid
    3.77 / 3.75, near 3.59 / 3.59, its alternating (30 Hz) part 1.037 / 1.037, 0.916 / 0.905, 0.849 / 0.845.
  - hold dolly + sustained hold + release (`seq/hold3`, release saved every frame): release fresh frames p99 1.1 (max 3), stale-
    mirror frames p99 2.5 (max 5); temporal 231-336 far 4.77 / 4.73, mid 8.10 / 8.10, near 7.20 / 7.20, alternating 0.772 /
    0.768; release peak 285-312 far 4.87 / 4.84, alternating 1.296 / 1.286. Full res `an/r5_hold3_release_rf.png` (frames
    294-297, A / B / x4 diff): identical to the eye. Sustained hold: cache read, A-B p99 1, temporal identical.
    (An earlier variant drew the walk on alternate frames: stale-walk frames p99 8.8 (max 13), far alternating +4.9 % at the
    release peak, `seq/hold2`: replaced.)
  - still camera (`seq/still2`, 60 frames, handheld drift): cache read on most frames, mirror every 8th-9th, cache on the frame
    after; temporal A / B far 0.93 / 0.93, p99.9 4.8 / 6.1, mid 3.9 / 4.4 (A steadier: its quarter-res walk stays anchored to the
    lake under the drift, B's is re-rendered on a grid that turns with the screen: faint column-edge differences growing to
    ~700 px over the minute, `an/r5_still2_diff58.png`).
  - right slab during the sweep at full res (`an/r5_seq_lr_rf.png`, frames 79-82): A = B to the eye.
- Resize / adaptive scale (`tools/resize_probe.mjs`, new schedule, `perf/batch_r5b.txt`): 1440x766 -> 1200x700 -> 1440x766 ->
  900x900 -> 1440x766 -> 1600x800 (adaptive steps 1296x689, 1440x720) -> 1440x766: no black or stale lake frame.
### Resume 7
- Settled test on speeds (`world/LakeSchedule.ts`, `?lkdt=0` = per frame): `tools/rest_frames3.mjs` (RAFDIV=n emulates a 60/n fps
  page, TSET=57.1 puts the handheld drift at its fastest turn), rest pose, `perf7/rf_div*.txt`: at 20 fps the per-frame test ran
  the moving schedule (mirror + walk) on 118 of 159 frames, the speed test kept the still schedule on all of them (cache read,
  mirror every 8 frames, cache the frame after); at 30 / 60 fps both keep the still schedule. Moving frames are classified as
  before at 60 fps (one 1/60 s step: identical thresholds), so the paired sequences above stand.
- The light water under the right front slabs (Cycles: the faces' dark reflection), resume 7 (readbacks of the raw reflection
  at the 6 GT cameras vs the Cycles calm renders: `tools/under_cmp.py`, `slabzone7.py`, `coltab7.py`; `perf7/under_cmp_r7*.txt`;
  crops `an6/r7_slab_modes.png`, `an6/r7_ws_slab.png`):
  - Mirror-pass variants for the floes' insides (dark / left out / flagged), not adopted: dark = the slab right but the whole lake
    12 % dark; left out = flipped photogrammetry faces inside the slab show; flagged + sky fallback = |log| -0.01 but 2-6 % more
    frame-to-frame shimmer (`seq/lrf_u3`). PlateEnvironment.ts stays = BASE.
  - Cause found: the walk pass draws the whole lake plane at a quarter of the resolution with no occlusion, so the walk texels
    just above a slab's foot on screen belong to lake points UNDER the slab; their walk starts inside it and looks it up from within
    (the mirrored camera sees the slab's double-sided, sunlit-baked inside there), and the bilinear read spilled that into the
    visible water at the foot. `LK_WALKSEL` (marked texels skipped) + `LK_HMIN` (faces looked up no lower than 5 cm): at rest,
    x 1160 rows 652-655 0.08 / 0.09 / 0.08 / 0.08 (resume 6 0.54 / 0.42 / 0.30 / 0.18; Cycles 0.06 / 0.05 / 0.06 / 0.08); slab
    waterline zone |log| vs Cycles rest 0.659 -> 0.549, right camera 0.744 -> 0.659, lr_144 0.708 -> 0.623; whole lake |log| rest
    0.311 -> 0.303, lr_132 0.313 -> 0.306, lr_144 0.312 -> 0.305, hold 0.252 -> 0.248, right 0.326 -> 0.319, left 0.300 -> 0.293;
    waterline band (water within 12 rows under any floe / rock) 0.438 / 0.422 / 0.429 / 0.402 / 0.458 / 0.407 -> 0.391 / 0.376 /
    0.387 / 0.380 / 0.416 / 0.365; water means unchanged (0.665 vs 0.668; Cycles 0.692). Per-pixel walk (`?lkhalf=0`) for
    comparison: slab zone 0.672 (lake points in the heightfield's fringe start inside the slab; noisier).
  - Temporal, paired every-frame pointer sweep (`seq/wsh_lrf`, A = new default, B = resume 6): 2nd difference far 4.23 / 4.22,
    mid 4.01 / 4.03, near 5.85 / 5.86, alternating 0.920 / 0.927, 0.771 / 0.783, 1.133 / 1.132; settle 3.93 / 3.91, 4.18 / 4.21,
    4.01 / 4.01. Full res `an6/r7_wsh_sweep_rf.png`, `an6/r7_wsh_sweep_zoom.png` (frames 30-32, 60-61; A / B / x4 diff): the
    darker band stays attached to the slabs' feet frame to frame; the change is confined to a 3-8 px band there.
  - Identity: the lane with `?lkwsel=0&lkhmin=0` = the resume-6 lake BIT-IDENTICAL (rest, hold readbacks); the lane default =
    the tested variant bit-identical (rest, lr_144, hold, left).
  - Remaining under the slab's right end (x ~1200-1260): 0.5-0.7 vs Cycles 0.11-0.13 (the walk's share 0.57-0.79 and a bright
    face colour there: open issue 2).
- Final-code captures (18 Nov 01:51-01:56, `tools/final7.sh`, no page or console errors): `qc/r7_T1`, `qc/r7_T2` (q00),
  `qc/r7_ptr` (the 10 pointer spots), `caps/r7_T1` (lr every 4th frame, hold dolly + release every 6th), `caps/r7_T2` (lr every
  6th). Sheets: `an6/r7_lr_rf_T1T2.png` (right floes over the sweep: base plate lake | final T1 | final T2, lr 96-168),
  `an6/r7_ptr_lake.png` (the 10 spots' lake halves), `an6/r7_hold_lake.png` (hold frames 60-420): attached reflections, dark
  bands at the slabs' feet at both tiers, coherent water at every spot and through the hold. Rest boxes vs F000 within 0.5
  levels of resume 4 in every box (G3).
- Typecheck (final code, 18 Nov 01:52): `tsc --noEmit -p tsconfig.hero.json` 0 errors and `-p .` 0 errors (LANE); the merged
  build (WORK `merged7/retrux-web`) `-p tsconfig.hero.json` 0 errors.

## Perf
### Final code, gated interleaved A/B (resume 7, 18 Nov 01:42-01:51)
The merged build with the final lane files (LK_WALKSEL, LK_HMIN, cloudFrames) vs MAIN, `tools/perf_gated7b.sh` +
`perf_round7b.sh` -> `perf7/gated7b.txt`, `perf7/gated7b_sum.txt`; same probe and settings as below, 6 rounds (alternating order),
1-min load 2.3-4.5 at every round's start. Medians fps (worst frame of all runs):

| pose | A MAIN | B merged (MAIN + water) | frame-time ratio B/A, per round | median |
|---|---|---|---|---|
| rest | 60.1 (16.8 ms) | 60.1 (33.4 ms, one frame) | 1.01 1.00 1.00 1.00 1.00 1.00 | **1.000** |
| hold | 54.2 (33.4 ms) | 50.7 (33.4 ms) | 1.06 1.07 1.08 1.06 1.08 1.07 | **1.070** |
| collapse | 60.0 (16.8 ms) | 60.2 (16.8 ms) | 1.00 1.00 1.00 1.00 1.00 1.00 | **0.999** |

Within +10 % of MAIN at every pose: PASS. (At the hold the lake's term is computed live inside the ring waves' zone, which
covers most of the visible water there; the cache serves the rest.)

### Moving camera (not covered by perf_probe's still poses; final code)
- Live rAF loop while the pointer sweeps a slow sine path (`tools/move_frames.mjs` via `move7.sh`, 600 frames, 2 rounds, loads
  2.4-3.8, `perf7/move7.txt`): MAIN 60.0 / 60.0 fps with no frame over 20 ms; merged default 55.6 / 56.1 fps with 8 % / 6 % of
  frames over 20 ms (worst 33.5 / 83.3 ms; mirror + walk frames 8-9 %, walk-only frames 4-7 %); merged `?envlake=plate` 59.7 /
  60.0. Frame time by fps +7 % (inside +10 %), but the lake makes ~1 frame in 13-16 miss vsync while the camera moves.
- Synchronous paired frames during the sweep (`tools/perf_pair.mjs move`, render + 1-px read per frame, load 5.2,
  `perf7/pairs7.txt`): MAIN 33.4 ms vs merged 38.4 ms median, ratio 1.166 (1.05-1.25). Open issue 6.

### Gated interleaved A/B, five variants (resume 7, 18 Nov 01:01-01:25, before LK_WALKSEL / LK_HMIN)
`tools/perf_gated7.sh` + `perf_round7.sh` -> `perf7/gated7.txt`, summary `tools/perf_sum7.py` -> `perf7/gated7_sum.txt`: MAIN's
`hero-pipeline/validate/perf_probe.mjs` (rest 5 s, hold pose expand 2.97 5 s, collapse 1.67 3 s), T1, scale 1, 1440x766, headless
Chrome ANGLE Metal, `SLOT_BG=0`, 6 rounds in a rotating order, every run started at a 1-min load of 2.1-5.3.
A = MAIN :5173, B = the merged build :5198 (MAIN + this lane, default), E = merged `?envlake=plate`, C = this lane's lab, D = lane
`?envlake=plate`. Medians of the 6 runs, fps (worst frame of all runs):

| pose | A MAIN | B merged | E merged plate | C lane | D lane plate |
|---|---|---|---|---|---|
| rest | 60.1 (50.1) | 59.5 (33.4) | 60.1 (49.9) | 59.6 (33.5) | 60.1 (33.4) |
| hold | 52.6 (66.7) | 50.5 (50.0) | 53.0 (33.5) | 49.0 (33.5) | 50.7 (33.5) |
| collapse | 59.8 (50.1) | 60.1 (33.4) | 59.9 (33.4) | 60.1 (33.5) | 60.2 (33.4) |

Frame-time ratio per round (fps_A / fps_B), median of the 6 rounds: **merged / MAIN rest 1.006, hold 1.042, collapse 0.993
(within +10 %: PASS)**; merged default / merged plate 1.006 / 1.051 / 1.001 (the lake's own share); lane default / lane plate
1.008 / 1.048 / 1.000. (Round 1's MAIN run, 27.3 fps at rest, ran while the user's Chrome / Creative Cloud GPU helpers were busy;
the per-round ratios carry it as an outlier. The lane build vs MAIN at the hold, 1.101, also measures the rings lane's hold
changes that MAIN has and the lane lacks: the merged build is the comparison that counts.)
The worst frames are vsync multiples (33.4 / 50.0 ms) for all variants.

### Earlier measurements
- Live rAF timing at low load (2.9-4.4; `tools/rest_frames.mjs`, 600 frames, T1 scale 1, 1440x766; `perf7/rf0.txt`, `rf1.txt`):
  REST lab default 59.9 fps (1 frame > 20 ms of 600; the schedule's mirror / cache frames no longer than the others), lab
  `?envlake=plate` 60.0. HOLD pose: lab default 49.4-49.8 (long frames on cache-read frames as well: the hold frame itself),
  lab plate 50.2, MAIN 54.5 (MAIN = BASE + the rings lane, whose hold camera stops earlier: lab vs MAIN at the hold also
  measures that).
- Resume 6's failing gated run (`perf/gated_r5.txt`: lab default rest median 53.1 vs 60.1) ran under GPU contention, where
  the per-frame settled test read the handheld drift as motion (fixed in resume 7: see "Frame budget").

## Gates
(task items (0)-(5); PASS / FAIL with the numbers above and in "Perf")
- G0 foreground floes "shadowing": PASS. Cause = the plate lake re-aiming the rest plate's baked slab / floe reflections
  (detached dark band, stair-step tears; `an/ab_rf_132_144.png`, `an/gt_lr132_144_rf.png`); v4 draws them from the real geometry:
  attached in every frame of the pointer sweeps at T1 and T2 (`an/v4f_lr_consec.png`, `an/v4f_lr_rfA.png`,
  `an/v4z_lr_rf_T1T2.png`, `an/r4_lr_leftfloes.png`, live paired sequence `an/r5_seq_lr_rf.png`).
- G1 water does not fragment from any camera: PASS (10 pointer spots, lr / ud sweeps every 2nd frame, hold dolly + release,
  T1 and T2; evidence under "Verification"). Resume 7: the slabs' feet now carry their dark reflection band (LK_WALKSEL /
  LK_HMIN); a residual light patch under the right slab's end remains (open issue 2).
- G2 Blender ground truth at the engine's exact cameras: DONE (rest, the 4 pointer extremes, 2 intermediate sweep poses, the
  hold camera and a dolly pose; 1440x766, plate settings, Metal GPU; rest validated against F000: same layout and columns, levels
  off by 3-33 because F000's framing / grade differ).
- G3 region means vs F000 at rest within +-3 levels: FAIL (final code `qc/r7_T1/q00_rest.png`: OK only far_L and mid_R; mean |diff|
  9.4, within 0.5 levels of resume 4 in every box; MAIN's plate lake 6.9 also fails; the Cycles render of the artist's water at
  that camera is itself 3-33 levels off F000 in these boxes). Open issue 1.
- G4 region means vs the Blender renders at every exported camera: linear band means 0.81-1.17 except the far row (1.18-1.40);
  display residual after a colour fit: v4 closer than the plate lake in the floe band (5 of 6 cameras) and at the hold camera,
  further in the general water at the orbit cameras (5.9-8.2 vs 5.3-5.8 levels). Open issue 3.
- G5 temporal stability (still and moving): PASS (still: 2nd difference = the plate lake's / the grain floor; moving: no
  alternation or popping from the schedule, A-B p99 1-3 levels against computing everything every frame).
- G6 resize / adaptive scale: PASS (no black, stale or flashing lake frame across 7 size changes + 2 adaptive steps).
- G7 way back: PASS. Deterministic HDR readbacks (`tools/swoff7.sh`, `swcmp7.py`; camera from `gt/cams_all.json`, time pinned,
  hero hidden; `rb/sw_*`) of MAIN vs the merged build (MAIN + this lane): `?envlake=plate` rest IDENTICAL, right / hold / lr_132
  60-196 px differ by <= 0.007 linear (mean x255 0.0000), fewer than MAIN against itself in a second run (381-1236 px, <= 0.009);
  `?env=projected` rest IDENTICAL, hold 374 px <= 0.008 (= that noise). Earlier: lane `?envlake=plate` / `?env=projected` vs BASE
  display captures within the captures' run-to-run noise; `?lkperf=0` vs the pre-schedule v4 bit-identical at rest.
- G8 frame budget within +10 % of MAIN at T1: PASS for the merged build (MAIN + this lane, final code) vs MAIN, 6 interleaved
  perf_probe rounds: per-round frame-time ratio medians rest 1.000, hold 1.070, collapse 0.999; medians 60.1 / 50.7 / 60.2 fps vs
  MAIN 60.1 / 54.2 / 60.0; worst frames 33.4 / 33.4 / 16.8 ms vs 16.8 / 33.4 / 16.8 ms ("Perf"). T0 keeps the plate lake.
  Not in the gate's poses: with the camera moving the merged build runs 55.6-56.1 fps vs MAIN's 60.0 (6-8 % of frames miss vsync;
  synchronous +17 %): open issue 6.
- G9 typecheck: PASS (`tsc -p tsconfig.hero.json` and `-p .`: 0 errors, final code; merged build hero config 0 errors).

## Open issues
1. Rest levels vs F000 (display boxes): far_R +18, near_R +26/+22/+13, near_L -11, near_C -11, ring zone -15..-18 (v4); the plate
   lake is off too (mean 6.9). The Cycles render of the same water at the same camera is off F000 by up to 33 levels in these
   boxes (`an/r4_gt_vs_F000.png`): F000's framing (~20 px higher) and grade differ from the plate scene. Matching F000 here is a
   grade / framing question, not the water model's.
2. The right front slabs' dark reflection: fixed along most of their feet in resume 7 (LK_WALKSEL / LK_HMIN, numbers under
   "Verification"), but under the left slab's right end (x ~1200-1260 at the rest camera, rows 651-660) the water stays light
   (0.5-0.7 vs Cycles 0.11-0.13): there the walk gives only 57-79 % of the rays to the slab and a bright face colour (the slab's
   sunlit end face next to it in the mirror target), and the first row under each foot (row 651 at x 1160: 0.41 vs 0.06) sees the
   floe's sunlit inside in the mirror target (Cycles: the black waterline slit). The mirror target holds one layer; the floes'
   insides are the double-sided bake's top colour. Variants for the insides were measured and not adopted (patches
   `under_v2_*.diff`, `under_r7_*.diff`); an LK_CACHEBEND prototype (cached term at the ring waves' screen offset) was rejected.
3. Regional level bias against Cycles at the same camera (raw reflection / Cycles calm, water luma by rows x thirds, resume 7
   readbacks `rb/r7u0`, `tools/bandratio7.py`): rest left 0.81-0.92, centre 0.94-1.07, right 1.00-1.25 (near-right 1.25, partly
   open issue 2); right camera left 0.73-0.93, right up to 1.26; the orbit cameras' general water residual is higher than the
   plate lake's (right camera 8.2 vs 5.3 levels). Near-water
   wavelet contrast 1.2-1.4x Cycles' (`tools/texcon.py`; the bump normals match Cycles, the excess comes from the radiance
   integration, mostly the 3 remainder strata); far-right floe columns ~0.55x Cycles' and the water between them paler than
   Cycles and F000 (`an6/rest_far_R_4.png`: plate | v4 | Cycles calm | F000; visible side by side).
4. GPU memory: the cache target (RGBA32F at the main target's size: 17.6 MB at 1440x766) + the walk target + the heightfield
   (~2.7 MB).
5. T0 keeps the plate lake (the cheaper path; the plate lake's camera-move defects remain there).
6. Frame cost while the camera MOVES (pointer orbit, dolly, release): the term is computed live every frame, the walk drawn
   every frame and the mirror every other frame; with a sweeping pointer the merged build drops ~6-8 % of frames below 60 fps
   (55.6-56.1 fps vs MAIN 60.0; synchronous +17 %), see "Perf". perf_probe's still poses (the formal gate) pass. Options for a
   fixer: a cheaper live term (the 3 remainder strata are the main cost), the mirror every 3rd moving frame (staleness checked
   with `tools/seq_pair.mjs` as in resume 5), or the walk merged into the mirror frames. At the hold pose the merged build is +7 %
   (the term computed live in the ring waves' zone; the cache-bend prototype that would have read it was rejected).

## JUDGE1 (independent judge, round 1, 18 Nov 02:16-03:35): FAIL, lens 7.4
Full verdict, numbers and evidence: `$SP/work2/water/judge1/verdict_draft.md` (crops `judge1/an/`, every-frame captures
`judge1/seq/`, videos `judge1/video/`, tools `judge1/tools/`). Fresh captures only (lane lab, then a clone of `merged7` = MAIN +
this lane, sha-checked, both on :5175, now stopped).
- PASS: the user's motion complaints. Every-frame pointer sweeps, corner extremes, hover push-in, real press-and-hold (lunge,
  sustain, release), off-centre hold, T1 / T2 / DPR 1.25: no fragmenting, no detached / sliding dark bands, no tears at the
  slabs or floes (MAIN shows them). Way back `?envlake=plate` / `?env=projected` = MAIN within 1 LSB. Merge clean, no page errors.
- MAJOR 1 (1:1 look): at rest / hover / hold the lake is further from the reference than MAIN: fine stripy texture ~1.7x the
  reference (centre high-pass 14.1 vs F000 8.1, Cycles 8.6, MAIN 6.7); far-right floe columns weakest (column contrast rows
  500-515: lane 21.4, MAIN 24.3, Cycles 28.1, F000 34.1); the water channel under the right slabs light and flat (x1280-1420
  y668-690: lane 154 sd 18.7 vs Cycles at the same camera 141 sd 28.9, F000 100 sd 29.1); lake box mean |diff| vs 5 reference
  rest frames 10.3 (MAIN 8.4); hold near water plain vs the reference's rolling wave bands (F404-F436).
- MAJOR 2 (frame budget while the camera moves): synchronous frame cost merged / MAIN +8.6..+14.8 % in the pointer sweep, +7-10 %
  hold / dolly (two finely interleaved runs); live frame drops while moving (cleanest round: MAIN 59.4 fps vs merged 29.3).
- minor: a flat ~5x12 px light block at the left bottom rock's waterline during motion (walk texel; lr frames 58-64); T0 keeps
  the old fragmenting plate lake. nits: rest speckle on the schedule's redraw frames; 1-px light sliver under the right slab end.

## Fix round 1 (fixer after judge1 FAIL 7.4; 18 Nov 03:35-04:21 first fixer, cut by the usage limit; 04:25-08:10 fix1b)
Log: `$SP/work2/water/LOG.md` section "FIX ROUND 1". Evidence under `$SP/work2/water/fx1/`. Merged test build (MAIN + this lane,
`tools/fx_merge.sh`, HeroEngine.ts / README.md `git merge-file` 0 conflicts): `fx1/merged/retrux-web`. A copy of the lane AS
JUDGED: `fx1/judged/retrux-web`. All labs stopped (:5175 lane, :5198 merged, :5199 judged); :5173 / :3000 untouched.

### What changed (all in the r12 lake path; `?lkfix1=0` = the lane as judged, also off with `?lkperf=0`)
1. Lake sky with the Cycles scene's glossy-visible mist (first fixer, `public/hero/sky_lake.exr` 333 KB, `assets.ts`; `?lkmist=0`):
   the Cycles water's lowest rays cross V2_BaseMist and see its glow (Cycles probe 0.87 at 0.6 deg vs the world 0.013); the
   world-only sky made every pixel with many low rays a dark streak (the judge's stripy near water). Raw |log| vs Cycles calm:
   rest 0.303 -> 0.264, right 0.319 -> 0.280, lr_144 0.305 -> 0.266.
2. lkFar (the first fixer's unlogged LK_STRATAFAR) REJECTED and off (lab `?lkfar=1`): |log| 0.264 -> 0.294 and a bright fan at
   the far right (`fx1/st1_farR.jpg`), not cheaper.
3. `LK_WAVEB` (`?lkwave=0`): in the HOLD the Cycles water's own Wave modifier (forensics 3.3: Gaussian crests 0.173 m after SubD,
   2.717 m apart, 1.115 m/s, Plane.011 only, front 18-23 m at F328-F472) TILTS the water: the coherent normal takes the crest
   slope where the view ray meets the displaced crests (8-step march + refinement), so the near flanks stretch into the
   reference's broad blue rolling bands (F404-F436). It fades in with uHold (front 8.2 -> 21.5 m, 2 m soft edge); at rest the
   water is exactly as before (the crest tilt scored worse there: band-pass 5.9 vs 7.7, F000 6.9). The image bend and the
   crest-band shading fade out with it. `LK_SKYUP` (`?lkskyup=0`): rays over the mirror target's top (35 deg) see the sky by
   direction. Evidence: `fx1/an_hold_bottom_ref_old_new.jpg` (F420 | judged merged f200 / f300 | new merged f200 / f300),
   `fx1/st5h_bottom.jpg`.
4. `LK_WALKEDGE` (`?lkwedge=0`): a pixel with any marked walk tap computes its own walk (judge minor: the 4 x 12 px block at the
   left rock's waterline shrinks to ~3 x 4 px, `fx1/an_rockedge6x.jpg`; not gone). Waterline |log| vs Cycles 0.380 -> 0.370 (rest),
   0.411 -> 0.391 (right), 0.379 -> 0.365 (lr_144) together with 3.
5. Frame budget: `LK_BUMPCUT` 0.1 (`?lkbcut=0`; octaves under 10 % coherent share not evaluated, their share moved into the spread;
   raw readbacks vs Cycles identical to 3 decimals), the mirror on every 3rd moving frame (`LakeSchedule.mirrorEvery`, lab
   `?lkmeach=N`), `LK_CACHEN` (`?lkcachen=0`): where the cached term is read the bump and the walk read are skipped, the bump's
   normal (the hero reflection's chop) has its own RGBA16F cache (second cache pass `LK_CACHENPASS`; +8.8 MB GPU at 1440x766).
   Cache = computed with the hero visible (`tools/fx_cache_probe.mjs`): rest 132 / hold 114 / right 249 px differ, max rel 1.45 %
   in one px. (A feedback-loop slip, the N pass binding its own target, was found from a console warning and fixed.)

### Verification (fresh captures, merged build unless noted)
- Way back: `?lkfix1=0` vs the lane AS JUDGED, HDR readbacks: rest / hold BIT-IDENTICAL; lr_144 24,539 values <= 0.083 (that
  camera's own run-to-run noise: 279,203 values <= 0.54). `?envlake=plate` vs MAIN (hero hidden, pinned): mean 0.193, max 1 LSB,
  0 px > 2; `?env=projected` vs MAIN projected: mean 0.431, max 1 LSB (`fx1/seq/sw_*`).
- Motion (every frame, judge1 jseq.mjs, 0 console messages): lr sweep `fx1/seq/merged_lr`: temporal d2 RW / LW / CW 3.34 / 3.76 /
  6.10 (judged lane 3.32 / 3.87 / 6.65, MAIN 3.62 / 3.47 / 7.01); slab-foot band frame-to-frame |d1| 5.06 / p95 8.24 (judged lane
  5.06 / 8.22, MAIN 5.60 / 9.44); a weak period-3 trace of the mirror cadence (RW d2 by frame mod 3: 3.72 / 3.54 / 3.78); floes'
  reflections attached as before. Hold (real press 6 s) `fx1/seq/merged_hold`: rolling bands at the frame bottom through the
  sustain, no pop at release. T2, DPR 1.25, T0 sweeps: 0 errors (`fx1/an_tiers_f36.jpg`).
- Rest 1:1, the judge's protocol (`fx1/seq/merged_still`, frames 0 / 45 / 75): texture 8.06 / 7.11 / 7.54 (judged 14.10, F000 8.2,
  Cycles 8.6), rowhp 2.47 / 2.57 / 2.27 (judged 3.99), ring / texture 0.90 / 1.24 / 1.07 (judged 0.60, F000 0.83, Cycles 0.99);
  jboxes mean |diff| 7.23 / 6.58 (judged 10.26, MAIN 8.41) but far_R +16.6 (MAIN +14.2), near_R +32.6 / +27.9 (MAIN +23.2) and
  near_L -5.0 in frame 0 (MAIN -2.9) stay worse than MAIN; cols 21.4 / 10.9 / 9.0 (unchanged; Cycles 28 / 13 / 11); chan
  151.8-153.8 / 17.8-18.7 / 129-130 (judged 154.1 / 18.7 / 130.6; Cycles 141 / 29 / 107).
- Frame cost, judge1 jpair.mjs merged / MAIN (machine busy: the user's Figma / video, atmos judge captures; loads 2-12):
  `fx1/jpair_m2.log` (06:56, before LK_CACHEN) rest 1.103 sweep 1.094 hold 1.009 dolly 1.103; `jpair_m3.log` rest 1.064 sweep
  1.141 hold 1.018 dolly 1.079; `jpair_m4.log` (16 blocks) rest 1.102 sweep 1.142 hold 0.991 dolly 1.085. Moving-frame split
  (lane, `tools/fx_jpair.mjs`): the bump's noise ~1.5 ms per frame, the strata ~0.5, one mirror draw ~2.1 ms (40 draw calls,
  225k tris, not fill-bound), the walk pass ~0.
- Typecheck: `tsc --noEmit -p tsconfig.hero.json` 0, `-p .` 0 (tsbuildinfo put back to BASE's copy).
- Diff vs BASE: HANDOFF.md, README.md, HeroEngine.ts, assets.ts, LakeMirror.ts, Water.ts, new LakeHeight.ts, LakeSchedule.ts,
  public/hero/sky_lake.exr (MAIN changed only HeroEngine.ts / README.md since BASE; both merge with 0 conflicts).

### Still open after fix round 1
1. Moving-camera frame budget: sweep ~+9-14 % and dolly ~+8 % vs MAIN (target <= +5 %). The bump's exact Cycles noise (Jenkins
   hashes, 4-8 per octave and cell) is the cost; a linearised slow path was cheaper but moved 15 % of rest pixels > 5 % (|log| vs
   Cycles 0.263 -> 0.273): rejected. Next: a precomputed 4-bit hash lattice texture for the near plane (Plane.011, 1426^2 at
   48 / m) and corner sharing in the slow path; measure on an idle machine.
2. Far-right floe columns (display 21.4 / 10.9 / 9.0 vs Cycles 28 / 13 / 11): linear readbacks show the engine's profile =
   0.76-0.86 x (Cycles blurred 5-9 px) + a veil (gaps 25-35 % light, bright cores 30 % dim); the ray-elevation moments and the
   flat mirror match Cycles; a full-res mirror target (`?lkmscale=1,1`, +0.15 ms) improves it a little (col-std ratio 0.92-0.96).
   The water under the right slabs (chan) stays light (face share 0.89, face colour 0.30 vs the flat mirror's 0.24).
3. near_R / far_R boxes worse than MAIN (above); the T0 tier keeps the plate lake; the redraw speckle nit; the rock-edge block
   (smaller); hover F165 not re-checked.

## Fix round 2 (fixer after the judge FAIL; judge 2 was skipped by the lead, its partial notes used; 18 Nov 22:09 - 19 Nov 01:45)
Log: `$SP/work2/water/LOG.md` sections "FIX ROUND 2" and "FIX ROUND 2 RESUME" (the first fixer of this round was cut off ~23:35;
the resume continued from its state). Evidence under `$SP/work2/water/fx2/`. `?lkfix2=0` = the lane exactly as fix round 1 left
it (all fix-2 defines off, LK_BUMPCUT 0.1, mirror every 3rd moving frame, full mip chain).

### What changed (all in the r12 lake path)
1. `LK_STALEFIX` (`?lkstale=0`): the remainder marches start at P's own projection in the mirror target and use P's distance
   from the target's mirrored camera (exact for a target drawn 1-2 frames earlier; identical for a fresh one).
2. `LK_WAVE2` + `LK_WAVEW` (`?lkwave2=0` both, `?lkwavew=0` the second): the hold's crest march finds the first crossing on
   every pixel (12 steps + 5 bisections, lab `?lkw2n=N`; fix 1's 8 steps skipped crest tops = judge 2's dotted dark line); a ray
   the tilted water sends down is mirrored about the plane (Cycles' next glossy bounce) instead of taking the lifted horizon;
   where the crests tilt the water it walks with its own normal (no 4 x 4 px untilted walk blocks). Evidence: fx2/h1_right3x.jpg
   (fix2 | fix1: dots gone), fx2/H2_bottom.png (24 | 12 | 16 steps | fix 1), fx2/hold_final_cmp.png.
3. `LK_BUMPAXIS` (`?lkbaxis=0`): LK_BUMPCUT per axis (perf; P2: the sweep +3-4 % without it).
4. `LK_WALKNEAR` (`?lkwnear=0`): the walk per pixel one walk texel around every footprint edge (judge minor: the light patch
   beside the left rock shrinks a little, fx2/r2_rockedge6x_near.png; NOT gone).
5. Lab only: `?lkmeach=N` mirror cadence, `?lkmmax=N` mip levels (LakeMirror.mipMax), `?lkmmip=0`, `?lkweach=N` walk cadence,
   `?lkdofk=k` (DOF term x k), `?lkw2n=N`. Tools: fx2_gpuq.mjs (GPU timer queries per pass), fx2_merge.sh + fx2_resolve.py.

Tried and REVERTED (measured):
- Mirror on EVERY moving frame with mips to level 3 (the first fixer's last default, removes the 20 Hz slab-foot pulse): the
  sweep frame +9 % (fx2/p1.log); GPU timer queries (fx2/gpuq1.log): mips ~55 % of a mirror draw, level-3 mips save only ~15 %.
- LK_BUMPCUT 0.4: raw |log| vs Cycles a hair better, rest metrics unchanged, but in the hold the mid water's chop vanished and
  flat stair-edged patches showed (fx2/H25_refl.png: bcut 0.1 24 / 0.1 12 / 0.4 16 / 0.4 12 steps).
- LK_FACESNAP (face lookup moved along the pixel's ray onto the surface): worse at the slab feet. lkdofk (DOF) for the columns:
  no change.

### MAIN changed at 00:28 (hotfix 2 SHORE_AA + the ATMOS lane): merge note for the lead
`git merge-file MAIN BASE LANE` gives ONE conflict in `HeroEngine.ts` and ONE in `world/Water.ts`; both are adjacent
insertions: keep both blocks, MAIN's first (HeroEngine: MAIN's `shoreAA` const, then the lane's lake-v4 heightfield block;
Water.ts: MAIN's GLSL_EXTRA_SHORE / BLEND_AA block, then the lane's LAKE_R12 GLSL block with its own `/**` opener). Done by
`$SP/work2/water/tools/fx2_merge.sh` (calls fx2_resolve.py); the resolved merged build is `$SP/work2/water/fx1/merged/retrux-web`
(tsc hero 0; README merges clean).

### Verification (final code, merged build = new MAIN + lane, :5198 vs MAIN :5173)
- Way back: `?envlake=plate` vs MAIN (hero hidden, pinned, fx2/sw3): mean 0.334, max 1 LSB, 0 px > 2; `?env=projected`
  identical (mean 0.000).
- lr sweep every frame (fx2/seq/r2_lr, PNG, 0 errors): tflick d2 RW / LW / CW 3.35 / 3.74 / 6.08 (fix 1 3.34 / 3.76 / 6.10,
  judge1's MAIN 3.62 / 3.47 / 7.01); floe / slab reflections stay attached.
- Hold, real press 6 s (fx2/seq/f_hold, 0 errors): rolling crest bands at the frame bottom through the sustain (F404-F436), no
  dotted line, no blocky mid-water patches.
- Rest (fx2/seq/f_still): tex 7.2-8.5 (F000 8.2), rowhp 2.2-2.6 (MAIN 2.1-2.7), ring/tex 0.93-1.23; jboxes 7.47 / 9.27
  (MAIN 8.18 / 6.72); cols 21.0-21.4 / 9.6-9.9 / 7.5-8.0; chan 153-155 / 18-19 / 129-131.
- Frame cost, judge1 jpair merged / MAIN (12 x 30; the GPU was shared with the user's Chrome all night, MAIN 38-51 ms per sync
  frame, run-to-run spread ~+-5 %): fx2/jpair_final.log rest 1.035, sweep 1.135, hold 1.091, dolly 1.130 (an hour earlier:
  1.060 / 1.068 / 1.042 / 1.117). Lane variant runs fx2/p1-p4.log.
- tsc hero 0, app 0 (tsbuildinfo restored from BASE). Labs stopped: lane :5175 and merged :5198 (PIDs 64431 / 64432, started by
  this round's first fixer); :5173 / :3000 untouched and listening.

### Still open after fix round 2
1. G6 frame budget: sweep / dolly ~1.07-1.14 vs MAIN (target <= 1.05; gate <= 1.10). Costs per moving frame (idle estimates):
   the exact bump noise ~1.3 ms, one mirror draw ~2 ms (fixed pass + mip generation, not fill; every 3rd moving frame), the
   strata ~0.5 ms, the hold crests (12-step march + per-pixel walk) ~1-2 % of the dolly. A further cut needs a structural change
   (e.g. a world-space lattice cache for the noise) and a quiet GPU to measure.
2. The slab-foot pulse on mirror redraws (judge 2: 20 Hz; fx2_flash by frame mod 3 746 / 554 / 552 px): exact only with a
   fresh target (every-frame mirror, +9 % sweep). Open trade-off.
3. 1:1 at rest: far-right columns (rows 2-3 ~9.7 / 7.8 vs Cycles 13 / 11, MAIN 13.5 / 10.8) and the water under the right
   slabs (chan ~154 vs Cycles 141, F000 100; near_R +29..+36 vs Cycles +11, MAIN +15..+23) unchanged in the lake model. NEW
   interaction: with the ATMOS lane in MAIN the r12 lake reflects its drifting cards / mist: far_R +20..+23 unpinned vs +10.8
   at t = 1000, columns rows 2-3 drop from 10.8 / 9.0 (`?atmos=r10`) to 9.7 / 7.8 (fx2/seq/at_*, fx2/at). Needs a joint
   decision (which atmos parts the lake mirror should see).
4. Release: a dark streaky blotch beside the right rocks at frames ~368-376 (fx2/release_br3x.png); the Cycles GT at the hold
   camera shows blue chop there (fx2/h1_br2x.jpg).
5. Minors: the light patch beside the left rock (smaller, not gone); T0 keeps the plate lake (MAIN's hotfix 2 SHORE_AA now
   smooths the plate lake's waterline at every tier); the redraw speckle nit.

## JUDGE3 (independent judge, round 3, 19 Nov 01:31-01:58): FAIL, lens 7.8
Full verdict, numbers and evidence: `$SP/work2/water/judge3/verdict_draft.md` (crops `judge3/an/`, every-frame sequences
`judge3/seq/`, live screencasts `judge3/live/`, tools `judge3/tools/`, perf `judge3/jpair1.log`, `jpair2.log`). Judged build: own
merged clone `judge3/merged/retrux-web` (MAIN of 00:28 + this lane; byte-identical to `fx1/merged`), tsc hero 0.
- PASS: foreground floes / slabs keep their reflections attached in every frame of lr / diag / hover / hold / release at T1 and T2
  and in a live screencast with a real mouse (MAIN: stair-step slivers, black slits, torn far columns: `an/lr_farwater_2x.jpg`);
  rest temporal stability; way back (`?envlake=plate` = MAIN, 0 px); no regression outside the water; 0 page / console errors.
- MAJOR 1: rest 1:1 on the right half regressed vs MAIN: far-right floe / iceberg columns faint and short (cols 21.4 / 9.5 / 7.4 vs
  MAIN 25.7 / 13.5 / 10.7, Cycles 28.1 / 13.0 / 10.7, F000 34.1 / 21.5 / 17.2) and the water under the right front slabs washed light
  (chan 153-155 sd 19 vs MAIN 142 sd 24, Cycles 141 sd 29, F000 100 sd 29); `an/rest_farR_2x.jpg`, `an/farR_time_2x.jpg`,
  `an/rest_slabs_2x.jpg`. Fix hints: the columns' blur + veil (fix-1 note: 0.76-0.86 x Cycles blurred 5-9 px + a 25-35 % veil) are
  cheapest to attack at rest, where the cached term is computed once (full-res mirror / walk for the cache pass only); for the
  slab channel, take the reflected face colour from the face's own lookup at the reflected height instead of the single-layer
  mirror target's neighbouring sunlit end face, and check against gt/r1/rest_calm.exr in linear.
- MAJOR 2: moving-camera frame cost +13..+16 % vs MAIN (jpair sweep 1.160 / 1.134, dolly 1.134 / 1.134; hold 1.03-1.05, rest
  1.05-1.08). Fix hint: the bump noise is fixed on the water plane (object coordinates, constant z), so bake the Cycles fBm height
  once into a 2D texture over Plane.011 (48 texels / m, with LOD by the pixel footprint) and replace the per-pixel Perlin hashing
  (~1.3-1.5 ms per moving frame by fix 1's split) with 3 fetches (P, P + dPdx, P + dPdy); verify raw |log| vs Cycles (rest 0.263).
- MINOR: (1) brown-grey streaky blotch at the right edge (x ~1380-1440, y ~690-745) through the hold sustain and release, from
  LK_WAVEB (`?lkwave=0` alone removes it, `an/pose_hold_br_switches.jpg`); (2) hold near water smooth broad bands vs F404-F436's
  dark-blue chop; (3) 20 Hz waterline flash at the right slab feet in motion (mirror every 3rd moving frame; mod-3 flash 565 / 739 /
  552 vs MAIN 530 / 515 / 520, rows 644-646 / 657-659); (4) T0 (Intel iGPU, iPhone / iPad, Adreno, Mali) keeps the plate lake.
