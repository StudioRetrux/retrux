# WATER lane (round 11 P2b, user-priority) HANDOFF

Builder log: `$SP/work2/water/LOG.md` (every attempt, number and decision). Evidence: `$SP/work2/water/{an,rb,caps,gt,perf,qc}`.
(`$SP` = `/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad`;
paths below without a prefix are under `$SP/work2/water/`.)

STATUS: built and verified on the lab (see "Verification" and "Gates"); open items at the end.

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
1. LakeMirror (unchanged): the scene drawn from the mirrored camera (rgb + path length), every frame the camera moves (T1 reuses
   it for up to 2 frames while the camera is still, as before).
2. The Cycles bump, exact (the artist's water, forensics 3.3: Perlin fBm scale 3, detail 4, roughness 0.5, lacunarity 2,
   B-spline ColorRamp, Bump distance 0.07 strength 1; verified against Blender's own noise to 1e-3): per pixel a coherent normal
   (the wavelets, fixed on the water) and the incoherent spread from Cycles' compact ray differentials (measured in Cycles with
   synthetic worlds, `tools/gt_elev.py`, `tools/step_sim.py`), with Cycles' ensure_valid_specular_reflection lift.
3. The low rays: a static max-mip heightfield of the baked meshes (`LakeHeight`, built once at load) walked from the lake point
   along the reflected azimuth; every face that rises above the running horizon takes the pixel's rays between the old and new
   horizon elevation (normal CDF), its colour from the mirror target. Up to 4 rises, out to 320 m. This draws the floe / iceberg
   / shore reflection columns. Drawn by a separate pass at 1/4 x 1/4 resolution (`Water.renderWalk`) only when the mirror
   re-rendered; the water samples it bilinearly.
4. The rest of the rays (over every face): three strata of equal share, each a short parallax march in the target.
5. `LK_GAIN` 1.12: the level against the Cycles water at the same camera (band means).
6. The water's other terms (orb ripples, glint, orb / hero reflections) are unchanged.

## Files (relative to LANE)
- `retrux-web/app/hero/engine/world/Water.ts`: `GLSL_LAKE_R12` (bump; v2 / v3 / v4 reflection models; lab debug modes 1-11 via
  `uLakeDebug`), the walk pass (material sharing the water's uniforms, target, `renderWalk`, `setWalkSize`, `disposeWalk`,
  `walkDiv`); r12 water meshes drawn after the env meshes (renderOrder 1: the depth test rejects lake fragments under near rocks
  and floes before shading). The temporary perf-bisection knob of the previous attempt is removed (proven a no-op, LOG 08:03).
- `retrux-web/app/hero/engine/world/LakeHeight.ts` (new): the static heightfield (one top-down render of the baked meshes at
  load into a transient 16 MB float target, read back, CPU max pyramid, kept as R16F 1024^2 + mips, ~2.7 MB GPU; grid x
  -128..192 m, z 16..-304 m, 0.3125 m). Null (the water keeps v3) when float targets are not renderable.
- `retrux-web/app/hero/engine/HeroEngine.ts`: builds the heightfield (r12 only), draws the walk pass after the lake mirror when it
  re-rendered, sizes it on resize (adaptive scale included), disposes it. Shared-file hunks: 6 small ones (import, field, build
  block in load, `renderWalk` call in the frame, `setWalkSize` in resize, dispose).
- `retrux-web/app/hero/engine/assets.ts`: `lakeR12` (default lake = r12 where the mirror is allowed: T1 / T2, baked env); when on,
  the projected plates are not loaded (as the mirror lake already did) and `lakeCorr` is skipped.
- No assets added (the heightfield is built at runtime from the shipped env meshes).
- Generated, do not merge: `retrux-web/tsconfig.tsbuildinfo` (tsc incremental cache), `retrux-web/hero-lab/dist/*` (lab build).
- Merge (17 Nov 08:13): of these files MAIN changed only HeroEngine.ts since BASE (rings P2b + hotfix); `git merge-file` MAIN /
  BASE / LANE of HeroEngine.ts is clean (WORK `merge3/merged.ts`); Water.ts, assets.ts, LakeMirror.ts are identical in MAIN and
  BASE (apply the lane's versions); LakeHeight.ts is new.

## Switches
- default (T1 / T2, baked environment): lake v4.
- `?envlake=plate`: the integrated round-11 plate lake, exactly (BASE's default).
- `?envlake=mirror`: the ENV lane's mirror lake (as in BASE). `?envlake=r12`: forces r12 at T0 too. `?envfix=0`: as BASE.
- `?lkv=3`: lake v3h (the previous attempt's target-march model); `?lkv=2`: v2. `?lkorder=0`: r12 drawn before the env meshes.
- lab knobs: `?lkhalf=0` per-pixel walk, `?lkwdiv=N` walk target divisor (4), `?lkwalk=N` iteration cap (160), `?lkdmax=M` walk
  distance (320 m), `?lkhaz=0` flat azimuth, `?lkstrata=2` two remainder strata, `?lkgain=` level.
- `?env=projected`: round 10 (no mirror, plate lake). T0 keeps the plate lake (the cheaper path, unchanged).

## Verification (numbers; evidence under WORK)
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
  wavelets = the Cycles water's; the plate lake is smoother than Cycles (blurred re-aim); F000 is softer (video encoding / DOF).
- Against Cycles at the same camera (linear readback of the raw reflection, `tools/bandcmp.py`, water band means engine /
  Cycles, rest, clouds at their Blender places): left 0.81-0.89 (far row 1.18), centre 0.95-1.04 (far row 1.40), right
  0.98-1.17; the FLAT mirrors agree 0.82-1.13 (the target is right).
- Display at the exact GT cameras, final code (`gt/disp/v4final_t0`, `tools/cap_cams.mjs`, pinTime 0) vs the plate lake
  (`gt/disp/plate_t0`), residual vs the Cycles render after a per-channel colour fit at rest (`tools/gt_resid.py`,
  `gt/r1/resid_final.json`, levels, plate / v4): water rest 5.45 / 6.48, left 5.33 / 5.86, right 5.31 / 8.22, lr_132 5.70 /
  6.95, lr_144 5.78 / 7.07, hold 7.40 / 5.17; floe band (under the right floes) rest 7.04 / 6.20, left 6.66 / 6.81, right 7.29 /
  6.95, lr_132 7.26 / 6.67, lr_144 6.60 / 6.14, hold 5.63 / 4.51. v4 is closer to Cycles in the floe band (5 of 6 cameras) and
  at the hold camera; further in the general water at the orbit cameras (the regional level bias above; right camera worst:
  `an/r4_right_gt.png` plate | v4 | Cycles, Cycles has more contrast between the columns and the mid-lake water).
- Temporal (`tools/tflick.py`, 2nd difference): still camera base / v4 lake_mid 0.489 / 0.477, near 0.566 / 0.666, floes
  0.374 / 0.412, series max 1.53 / 1.53 (no flicker or pops from the walk / mirror reuse); moving (lr 100-160) lake_mid 3.85 /
  6.34: the wavelets (fixed on the water) moving with the parallax, as in Cycles (the plate lake is blurred); no tear lines
  (`an/tf_lr_cmp.png`).
- Resize / adaptive scale (`tools/resize_probe.mjs`): 1440x766 -> 1200x700 -> 1440x766 -> 900x900 -> 1440x766 -> 1600x800 ->
  1440x766 and an adaptive step to 1296x689: no black or stale lake frame.
- Rest vs F000 (display, `tools/lake_boxes.py`, sRGB levels, final code `qc/final_T1/q00_rest.png`): far_L -2/-2/-3, far_C
  -7/-5/-4, far_R +18/+18/+14, mid_L -4/-2/-3, mid_C -9/-7/-4, mid_R -3/-1/0, near_L -11/-9/-8, near_C -11/-11/-11, near_R
  +26/+22/+13, ring -15/-17/-18 (mean |diff| 9.3). MAIN plate lake today (`qc/main_T1`): far_C -9/-7/-6, far_R +15/+14/+11,
  mid_L +10/+10/+7, mid_C -5/-5/-4, mid_R +2/+2/0, near_L -5/-3/-2, near_C -2/-4/-7, near_R +13/+11/+6, ring -9/-13/-16 (mean
  6.9). T2 within 2 levels of T1 (`an/r4_T1T2_lake.png`). Neither lake passes +-3 everywhere (see open issues).
- Switch-off proofs (time-pinned captures at the GT cameras, shards excluded, `tools/imgdiff_noshard.py`): `?envlake=plate` vs
  BASE (APFS copy served on :5195) rest 0.662 / right 0.011 / hold 0.867 mean levels; `?env=projected` vs BASE projected rest
  0.893 / hold 0.826; the procedure's own noise floor (BASE vs BASE) 0.878 / 0.854 / 0.522 (frame-seeded grain). Diff maps
  `an/swp_diffs.png`: only the unpinned shards. The r12-only changes made after these proofs (heightfield floor, draw order, knob
  removal) do not touch the plate / projected paths.
- PERF: see "Perf" below.
- Typecheck: `tsc -p tsconfig.hero.json` 0 errors (and `-p .`).

## Perf
(pending: load-gated interleaved perf_probe rounds and moving-camera pairs, `perf/gated_final.txt`, `perf/move_final.txt`)

## Gates
(pending perf)

## Open issues
1. Rest levels vs F000 (+-3 gate): not met by either lake. v4 mean |diff| 9.3 levels (worst near_R +26/+22/+13, far_R
   +18/+18/+14, ring zone -15/-17/-18, near_C / near_L -11), MAIN's plate lake 6.9. The Cycles render of the artist's water at
   the engine's rest camera is itself 3-33 levels off F000 in the same boxes (F000's framing ~20 px higher, its grade differs),
   so the water alone cannot close this; the ring zone (orb ripple rings, not changed here) is off by the same amount in both.
2. Regional level bias vs Cycles (linear bands after LK_GAIN 1.12): left 0.81-0.89, right up to 1.17, far row 1.18-1.40. It is
   why v4's general-water residual at the orbit cameras (5.9-8.2) is above the plate lake's (5.3-5.8) although its floe band is
   closer. A spatial gain map would only fit one camera; the cause is in the model (the share of low rays meeting the massif
   base / shore far out on the left, the sky near the horizon on the right) and was not closed in this step.
3. Texture: v4's wavelets have the Cycles water's pattern (fine horizontal streaks, `an/r4_rest_tex3.png`), but in the near
   water they are stronger than Cycles' at the same camera: linear band-pass contrast (`tools/texcon.py`, std / mean of the
   1.5-6 px band, Cycles / v4) near_L 0.064 / 0.079, near_C 0.075 / 0.104, mid 0.115-0.172 / 0.100-0.185 (close), far_R
   0.155 / 0.085 (columns weaker); Cycles' figures still hold some 64-spp noise, so the near gap is at least 1.2-1.4x. Seen at
   2x in `an/r4_nearL4.png` (F000 | MAIN | v4 | Cycles): darker, more defined streaks than Cycles; F000 is softer still
   (H.264 / DOF). Diagnosis so far: the per-pixel MEAN reflected elevation matches Cycles' (`tools/elevcmp.py` vs
   `gt/elev/rest_elev_calm.exr`: near band-pass std x0.93-1.00), so the normals are right; most of the near texture comes from
   the remainder-strata term (`rb/v4p_f` modes 1/7/8/9: near_C 0.066 of 0.088), i.e. the 3-strata quadrature of the radiance
   integral follows the coherent elevation too closely. Next step: readbacks with `?lkstrata=2` vs 3 vs a 5-strata build at the
   rest camera; if the near contrast moves toward Cycles with more strata, integrate the near field better. Not retuned here.
   Under camera motion
   the wavelets move with the water (temporal energy 6.3 vs the plate's blurred 3.9), as in Cycles; no sparkle or crawl seen
   (`an/r4_far_consec.png`). A judge should look at the near water at rest and in the sweep frames.
4. T0 keeps the plate lake (the cheaper path, task item 4): the floe "shadowing" and tears remain there. `?envlake=r12` runs v4
   at T0 but its cost was not measured on a T0-class GPU.
5. The heightfield is built at load on T1 / T2 (one 1024^2 float render of the env meshes, a 16 MB read-back, a CPU max pyramid):
   a one-off boot cost, not measured separately.
