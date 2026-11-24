# ATMOS lane (round 11, P2c): sky, clouds, atmosphere — hand-off

Builder: atmos. Attempt 1: 15 Nov 2026 20:05-21:54 WIB (cut by the usage limit). Attempt 2: 16 Nov 02:19-~03:55 (grade, perf,
tiers; cut). Attempt 3: 16 Nov 04:08- (cloud layout registered to F000, the summit puff, final verification and perf).
LANE = `$SP/lanes2/atmos` (APFS clone of the integrated MAIN), BASE = `$SP/lanes2/base`, WORK = `$SP/work2/atmos` (`LOG.md` there
has every step, number and decision). Lab :5176 (stopped at the end). No commits, deploys, uploads or `.blend` writes; MAIN,
:5173 and :3000 untouched.

User request this lane answers (15 Nov 19:55): "ensure itu si awan ga ilang ... kalo di diemin dia ilang ... ensure itu loop
... ada kabut or angin, looks natural ... realistic ... angin kabut awan everything looks really magnificent", under the
19:25 rule "jangan ngide" (nothing that the reference does not show).

## 1. What was wrong (measured)

1. **The clouds left the sky when the page idled.** `CLOUD_VERT` drifted every card by `uTime * 0.035 * (0.6 + aSeed)` m with no
   wrap (plus an invented +-2.4 m sway, a 0.5 m "breath" and a UV boil). Clock jumps (WORK `caps/idle0`,
   `an/idle0_sky_sheet.jpg`): sky cloud cover vs t = 0: 1.00 / 1.03 / 1.01 / 0.56 at 60 s / 5 / 10 / 30 min, median 0.05 over
   2 h (`py/cloudsim.py`). The engine also drifted them RIGHT; the reference drifts LEFT.
2. **The reference's wind and mist were missing, and the haze "breathed" in the wrong places.** Measured from the videos
   (`py/drift_chain.py`, `py/regtime.py`, static-camera stretches):
   - clouds translate left at ~0.43-0.45 m/s (State 2 to 5: 7.8 px/s at 97 m, 6.3 px/s at 116 m; also through the hold
     F382-F440); the Default Loop runs ~3x faster (a time-compressed 4 s loop);
   - a low **ground-mist bank rolls over the plain** between the dark ridge and the massif: clear at F0 (= F000), rolled in by
     F200 (6.7 s), still in at F320 (ridge foot luma 124 -> 162, shore 161 -> 181-184, foothills 156 -> 181, massif's lower face
     160 -> 134-152); the dark ridge body (85-89), iceberg face (111-114 R), far range, mound and sky do not move.
   The engine had a static half-misty base and a fog / mist "wisp" field of `0.55 + 0.9 vnoise` that ran from -0.35 to 1.45
   (negative = un-fogging): whole regions brightened and darkened over minutes (dark ridge 72-95 luma, iceberg face 108-135,
   far range 180-206).
3. **The clouds were not where the video has them, and the summit "wisp" was a double** (attempt 3). Every cloud action in
   the artist's file was emptied (forensics §4), so the `.blend` positions in `config.ts CLOUDS` are wherever the drift left
   them, not F000's. Each card rendered alone and fitted to F000 (`py/cardfit.py`, WORK `caps/cards1`): the left card
   (`CLOUDS[1]`) sat 42-50 px right of F000 and covered the summit; the others 1-36 px off, all 2-16 px low. With the left card
   where the video has it, its lower-right lobe lies on the summit's left flank exactly like F000's "summit puff" (same place,
   size and shape, incl. the thin veil down the flank: `an/g/summit_zoom_F000_t34.jpg`), and it slides off as the card drifts
   left: gone by ~4 s in both videos (Loop F0-F40 at 3x, `an/g/loop_summit_tile.jpg`; State F000 / F036 / F082 puff, F160+
   clear, `an/g/state_summit_seq.jpg`); F420 (hold) shows the summit clear. The artist's file has no wisp volume (forensics:
   the only volume is the orb's; world mist off): the summit wisp card is the team's `V2_SummitWisp` (prep_v2.py, 12 Nov), made
   to fake that puff in cloudless plates. Drawn on top of the live cards it doubled the puff (static in the integrated build,
   a gust every ~14 s in attempt 1, a rhythm the reference does not show) and put a puff on the summit in the hold.

## 2. What changed (files relative to LANE)

- `retrux-web/app/hero/engine/world/Atmos.ts` (new, ~275 lines): the switches (`atmosFromUrl`, `WispMode`), the wind constants,
  the cloud conveyor (`CLOUD_WIND`, `CLOUDS_EXTRA`, `cloudLane`, `cloudShift`), the F000 registration (`CLOUD_F000_PX`,
  `CLOUD_F000_T`), the cloud softness bias, the ground-mist GLSL chunk and its uniforms (`GLSL_ATMOS_MIST`,
  `createAtmosMistUniforms`), the attempt-1 spindrift schedule (`wispPuff`, only with `?atmoswisp=gust`).
- `retrux-web/app/hero/engine/world/PlateEnvironment.ts` (shared file; all hunks behind defines / flags that the switches leave out):
  - `ATMOS_URL` (module-level flags) and the `ATMOS_STEADY_WISP` branch in the shared `GLSL_PLATE_MIST` chunk (plate AND water);
  - `PLATE_FRAG`: the `GLSL_ATMOS_MIST` include; `ATMOS_WISP` spindrift where `gWisp` is computed (gust mode only); `ATMOS_MIST`
    steady ridge-body fog (`wispFog`), base-haze thinning while the bank is out (`atmosBaseK`), the bank composite after the band;
    `ATMOS_GRADE`: the iceberg's rest grade and the dark ridge's slate take `uAtmosGrade` / `uAtmosRidgeTint` (`#else` = the
    integrated lines verbatim);
  - `CLOUD_VERT` (`CLOUD_R11`: `p += uCloudShift`, else the old drift verbatim), `CLOUD_FRAG` (`CLOUD_SOFT` mip bias; `CLOUD_R11`:
    no UV boil, else the old turbulence verbatim);
  - constructor: defines `ATMOS_MIST`, `ATMOS_GRADE` (plate + baked); the wisp card (`BAKED_WISP`) only when the wisp mode is not
    "lobe", `ATMOS_WISP` in gust mode; the cloud cards + 3 extras, each with its conveyor lane (F000 fit + phase); the
    `uCloudShift` / atmos uniforms; fields `atmos`, `atmosUniforms`, `atmosWisp`, `atmosWispAge`, `cloudLanes`;
    `updateAtmos(time)` (x: the wrapped drift, y: the card's F000 height offset).
- `retrux-web/app/hero/engine/HeroEngine.ts`: one line in `update()` after `u.uTime.value = s.time`:
  `this.env?.updateAtmos(s.time);` (MAIN now carries the RINGS merge a few lines above it: a 3-way merge keeps both).
- No assets added (the 3 extra cloud cards reuse `cloud_a.webp` / `cloud_b.webp`). The wisp card (a 183 x 121 EXR) still loads
  (`assets.ts` picks the massif / BG.001 textures baked WITHOUT the wisp whenever the card exists), so the switches can draw it;
  in "lobe" mode it is simply not composited, which leaves no wisp anywhere (rest, orbit, hold, lake mirror).

### 2.1 Clouds: the reference's wind as a seamless loop, at the reference's places (`CLOUD_R11`)
- A rigid conveyor in the rest camera's tangent space (u = (x - x_cam) / depth): every card moves left at 0.0042 u/s (7.1 px/s at
  1440 px, 0.42 m/s at 100 m) and wraps by kappa = 1.70 when its right edge passes |u| = 0.60, to a left edge past +0.60. No view
  of the engine reaches |u| > 0.567 (hfov / 2 23.07 deg + the pointer orbit's 5.64 deg + its 1.8 m sideways), so the jump is never
  on screen and needs no fade. Computed on the CPU in double precision (exact for any session length); the shader gets the
  wrapped offset. Period 404.76 s.
- **F000 registration (attempt 3, `CLOUD_F000_PX`)**: the six cards sit where the video has them at F000, referred to the
  mountains (the environment itself sits (-8, -2) px from F000 at the rest camera: massif summit, iceberg, far range,
  `py/mtnreg2.py`; a camera yaw of ~0.27 deg that is not this lane's), as screen px: (-9, -12) (-50, -9) (+1, -16) (-36, -12)
  (-9, -4) (-20, -7). The F000 layout is reached at the end of the intro (`CLOUD_F000_T` = 3.4 s, the first rest frame, as F000
  is the State video's first) and every 404.76 s after. Sky error vs F000 (mean |d|, hero zone out, `py/skyerr.py`): all sky
  6.00 -> 5.27 (5.16 live at t 3.4), left third 9.44 -> 7.86, summit 13.97 -> 10.25 (9.27 live), top centre 3.28 -> 2.99, right
  4.48 -> 4.30. The fit repeats to ~+-7 px (card 4, low behind the berg, +-20).
- 3 off-screen copies of the artist's cards (same textures, emission and lighting; mirrored like his) fill the conveyor's gap so
  the sky keeps F000's cover: over a full period the rest view's sky-band cover is min 0.88 / p10 0.93 / median 1.03 / max 1.18 of
  the registered F000 layout's (`py/cloudsim4.py`; 6 cards alone: min ~0.36, median ~0.69).
- `CLOUD_SOFT`: the cards take the environment's far-field DOF (2^1.5 plate texels = 2.26 px at 1440, mip bias 1.178). Edge 10-90 %
  widths at the F000 layout (`py/edgew.py`): F000 8.0 / 10.5 / 8.0 / 10.0 px, old 6.0 / 7.0 / 7.0 / 10.0, new 7.0 / 5.5 / 8.0 /
  10.0 (no more cut-out edges against the soft mountains).
- The invented sway, breath and UV boil are gone (the reference's PNG cards never change shape: per-4-frame shifts constant to
  +-0.2 px, dy ~0); `?atmosclouds=0` restores all three.
- One screen rate for every card (7.1 px/s) instead of the reference's per-card 6.3-7.8 px/s (one wind in m/s, so ~1/depth): with
  per-card rates the cards bunch and open long gaps (`py/cloudsim3.py`, 3 h: cover / F000 min 0.46, p10 0.72 vs the rigid
  conveyor's 0.87 / 0.92), against the user's "always naturally there". Under the pointer orbit the cards keep their true depths
  (real 3D parallax). The clouds run on real time through the hold (the reference does not slow them).

### 2.2 Ground mist (`ATMOS_MIST`), world-anchored (the same from every camera)
- Box x -80..-6, z -118..-58 m (behind the lake's far edge at z -56.5, so the water's band is untouched); positions of the
  reference's boxes from the bake's rest-plate position map (`py/boxpos.py`), confirmed by CPU raycasts in the engine
  (`tools/raycast.mjs`).
- Density = envelope (3-octave fBm, 60 x 40 m cells, 0.04 cells/s evolution, wind 0.43 m/s towards -x) x a puffy top (2.4 m at
  the ridge -> 7.5 m at the massif's foot, +-1.2 m, 6 m cells) x cauliflower puffs (3-oct fBm, 3.5 m cells x 1.8 m, rising
  0.05/s); colour pale low down -> steel blue higher up, x (0.92 + 0.16 puff). Cheap early-outs outside the box / above any top /
  at zero envelope.
- While the bank is out, the bases' fog and low band thin to the reference's clear state (`uAtmosBank.y` = 0), not on the dark
  ridge's body (steady fog factor 0.7 there: reference 85-89). Both the bank and the thinning give way to the hold's own fog bank
  (`uFogHold`), so the hold looks as before.
- Timing (`py/mistenv.py`, a numpy port of the engine's hash13 / vnoise / fbm): clear while the intro ends (t 0-3.5 s), in over
  t 4-11 s (State F0 -> F200 -> F320), then in and out at random: over 2 h every box is clear 30-32 %, misty 32-33 %, mean 0.51.
- Numbers (8-bit luma, `caps/mist8`; ref clear S000 / misty S210, S320): ridge foot 133 / 161 (124 / 138, 162); shore 165 / 182
  (161 / 184, 181); foothills 163 / 182 (156 / 182, 181); foothill dark 163 / 185 (153 / 187, 183); plain 185 / 185 (175 / 188,
  184); massif low face 161 / 156 (160 / 152, 134). Live t 4..1800: dark ridge 84.6-95.5 (old 72-96).
- `ATMOS_STEADY_WISP` (shared band chunk, plate + water): same mean as before, `0.55 + 0.3 fbm2` (~11 m wisps, +-0.22, wind
  0.44 m/s -x) instead of `0.55 + 0.9 vnoise` (-0.35..1.45). Range of region luma over t 10..1800 s (`caps/stab1` vs old):
  iceberg face 9.1 (27.1), dark ridge 9.1 (23.8), massif low 5.3 (15.8), far floes right 1.7 (9.5).

### 2.3 The summit puff (attempt 3: wisp mode "lobe")
- Default: the summit wisp card is not drawn (`BAKED_WISP` not compiled); the puff F000 shows is the left card's lobe, placed by
  the F000 registration, and it leaves the summit as the card drifts (engine t 3.4 / 4.4 / 5.4 / 6.4 / 7.4 / 8.4 / 10.4 / 14.4 s:
  `an/g/engine_summit_seq.jpg`: on the flank at 3.4, thinning, off by ~7-8 s, the summit clear after; it returns with the card
  every 404.76 s).
- `?atmoswisp=gust`: attempt 1's spindrift (a puff every 14 +- 4 s, life 4.5 s, drifting 0.6 m/s, eroding); `?atmoswisp=0`: the
  integrated static card.

### 2.4 Grade re-fit under the steady haze (`ATMOS_GRADE`, attempt 2)
- Why: the iceberg's and the dark ridge's rest grades (berg: chroma x1.5, gain x0.82; ridge: 35 % less chroma, x(0.8, 0.86, 0.9))
  were tuned in QC rounds 1-10 against F000 with the OLD haze field, whose value at the QC instant happened to be high on the
  berg; with the steady field (`ATMOS_STEADY_WISP`, same mean) the berg's face read -15 R vs F000 (MAIN -7) and the ridge B -10.
- Fit (WORK `caps/fit1`, `caps/fit2`; bank clear, puff off; a linear model per channel from three parameter sets, least squares
  to F000's boxes): berg chroma **1.064**, gain **1.159** (hold values untouched); ridge body chroma **1.0**, tint
  **(0.83, 1.0, 0.98)**; the ridge's foot (below ~3.5 m, `smoothstep(0.3, 3.5, y)`) keeps the integrated slate.
- Result (`caps/fit4/g2_clear.png` vs F000, `an/g/fit4_regions.json`): berg face 115.8/140.3/170.2 vs 116.6/139.9/171.2 (was
  101.2/132.6/167.2); dark ridge 67.6/90.3/123.7 vs 67.1/91.3/124.0 (was 70.2/86.7/113.9); right iceberg box -4.8 (shards inside;
  was -14.7); far shore under the berg +7.6 (was +6.2); every other box unchanged. Crops `an/g/berg_F000_v0_f1.jpg`,
  `an/g/ridge_F000_v0_f1.jpg`; orbit views `an/g/ptr_g2_sheet.jpg`, `an/g/ptr_g2_zoom.jpg` (no mask edges from the pointer
  extremes).

## 3. Switches (each restores the previous behaviour of its part exactly)

| switch | restores |
|---|---|
| `?atmos=r10` | everything of this lane: the integrated build (verified, section 4) |
| `?atmosclouds=0` | the old unbounded cloud drift with sway, breath and boil, 6 cards (also no F000 fit) |
| `?atmoscloudfit=0` | the conveyor with the `.blend` positions at t = 0 (attempt 2's layout; verified identical) |
| `?atmoscloudsoft=0` | crisp cloud cards |
| `?atmosmist=0` | the old fog / band wisp field, no ground mist, no steady ridge fog |
| `?atmoswisp=0` | the integrated static summit wisp card |
| `?atmoswisp=gust` | attempt 1's spindrift gusts on the wisp card |
| `?atmosgrade=0` | the integrated berg / ridge grades (also implied by `?atmosmist=0`, whose old haze field they were tuned under) |

Capture knobs (debug API): `__hero.env.atmosUniforms.uAtmosBank.value.w = 0 | 1` pins the ground mist clear / misty (-1 live);
`__hero.env.atmosWispAge = <s>` pins the gust puff's age (gust mode). The cloud layout equals F000 at t = 3.4 + k x 404.762 s.
`__hero.env.atmosUniforms.uAtmosGrade` (berg chroma, gain, ridge chroma) and `.uAtmosRidgeTint` are runtime-tunable.
`__hero.rig.reducedMotion = true` removes the handheld drift for exact loop comparisons.

## 4. Verification (T1, scale 1, 1440 x 766, all through the slot; WORK paths)

Final build (attempt 3) unless marked:
- **Always there, at every view, up to 30 min:** clock jumps t 3.4 / 60 / 300 / 600 / 1200 / 1800 s at pointer rest, (-0.98, 0),
  (0.98, 0.98), (0, -0.98) (`caps/idle3`, `an/g/idle3_sheet.jpg`, lowest-cover frames `an/g/idle3_lowcover.jpg`): clouds in
  every frame, natural arrangements; cloud cover in the sky band above the rings x F000: 0.74-1.10 over the 24 frames, rest view
  0.78-0.95 (`py/cover.py`, `an/g/idle3_cover.txt`). Over a full period (simulation, `py/cloudsim4.py`): min 0.88 / median 1.03.
- **Seamless loop:** t vs t + 404.76 s with the handheld drift off and the bank pinned (`caps/boil1`, `py/loopchk.py`): sky band
  mean |d| 0.43 / 0.23 / 0.14 at t 30 / 1000 / 1404, max 1 (dither) (unrelated times: 5.4 mean, 32 max). Wrap moments at
  pointer +-0.98 and the top corners (attempt 1, `caps/wrap1`, `an/wrap1_sheet.jpg`): frame-edge columns change only by the
  0.2 s drift; the F000 registration moves cards by <= 0.03 u, inside the 0.033 u margin (bound 0.60 vs widest view 0.567).
- **F000 at the first rest frame** (`caps/fit5`): `an/g/F000_vs_t34.jpg` (full frame), `an/g/summit_F000_new_old.jpg`,
  `an/g/summit_zoom_F000_t34.jpg`; region table F000 | old | registered | live t 3.4 (`an/g/final_regions.json`): summit +30.5
  -> +5.0 (+6.4 live), massif +3.7 -> +0.6, sky_right +3.7 -> +2.1, far_right_range +13.8 -> +12.5 (section 6.4); sky_mid -4.2 ->
  -5.8 and sky_low_R +2.9 -> -4.6 live (single-cloud boxes inside the fit's +-7 px); full-frame mean |d| 14.05 -> 13.75 (13.31
  live). Sky boxes at the F000 layout: left +2.9, mid -5.8, right +2.1, corner TL +4.4, TR -2.6.
- **The summit puff over time** (`an/g/engine_summit_seq.jpg` vs `an/g/loop_summit_tile.jpg`, `an/g/state_summit_seq.jpg`): on
  the flank at the first rest frame, gone by ~7-8 s, the summit clear in the hold (`caps/qc2/cmp_p06_sustain.jpg` vs F420).
- **QC / pointer / sweep:** MAIN `shoot_qc` all poses + ui (`caps/qc2`), `shoot_pointer` 10 spots (`caps/ptr2`,
  `an/g/ptr2_sheet.jpg`, skies of the top corners `an/g/ptr2_tops.jpg`), `shoot_sweep` 34 frames (`caps/sweep2/sweep.jpg`,
  `an/g/sweep2_pair.jpg`): no page errors, no console errors or warnings; clouds and mist in every view, no doubles, bands, holes
  or card edges, summit clear outside the first seconds.
- **Temporal stability** (`caps/flick2`, 20 consecutive 1/30 s frames, `py/flick.py`, luma): 1st / 2nd temporal difference means
  0.33-0.36 / 0.65-0.67 in the sky, summit, left bases, right far and lake sides (p99.9 1.1-3.2 / 2.0-5.1) = the dither floor
  (attempt 1 with the boil: 0.39-0.41 / 0.73-0.75). No flicker.
- **Way back:** MAIN :5173 now carries the RINGS merge (rings C / D idle, shard slow-mo), so its hero differs from BASE; with the
  ring column and its lake reflection masked (`py/wbdiff2.py`, x 360-1100 below y 100) `?atmos=r10` on :5176 vs MAIN
  (`caps/wb3_lane` vs `caps/wb3_main`): q00 0.486, q03 0.361, q00 at 30 min 0.487, pointer L 0.265, pointer TR 0.052, all max 1,
  0 px > 2 (MAIN vs itself 0.00-0.33, max 1); diff maps `an/g/wb3_maps.jpg`: only rings + shards. `?atmoscloudfit=0` vs the
  attempt-2 build at the same state (`caps/wb3_cf0` vs `caps/boil1/g3_clear`): sky max 1. `?atmoswisp=gust` renders the
  attempt-1 puff (`an/g/gust_switch.jpg`). Attempt 2's checks stand for `?atmosgrade=0` (0.464, max 1, 0 px > 2).
- **Tiers / paths** (attempt 3 build, `tools/tier_batch3.zsh`, `caps/tier3_*`, `an/g/tier3_sheet.jpg`, `an/g/tier3_phone.jpg`):
  T0, T2, T1 `?env=projected`, T1 `?envlake=mirror`, phone portrait 390 x 844 (rest, misty, hold): no page errors, no console
  errors or warnings (shader compiles included, also the baked variant without `BAKED_WISP`); clouds, mist and the hold on every
  path, the portrait sky keeps its clouds.
- **Typecheck:** `tsc --noEmit -p tsconfig.hero.json` and `-p .`: 0 errors.
- **Debug-API note:** `__hero.debug.pointer(NaN)` leaves the camera NaN (black frames) for the rest of the session (found when
  a capture tool of mine passed NaN; a visitor's pointer is always finite). Worth a guard in the debug API, not changed here.

## 5. Frame time (T1, scale 1, 1440 x 766, `SLOT_BG=0`, lane :5176 vs MAIN :5173)

Attempt 2's code (with the wisp gusts; attempt 3 only removes GPU work: the wisp card's ray-quad and fetch per baked fragment,
plus a few CPU multiply-adds per card per frame), all runs at 1-min load < 6, the GPU shared with the rings / water lanes:
- `perf_probe`, 6 interleaved pairs (`perf/runs_T1_v2.txt`, `py/perfsum.py`): fps median lane / MAIN rest 29.2 / 19.6 (per-pair
  ratio median 1.435), hold 23.5 / 17.7 (1.133), collapse 29.9 / 24.0 (1.072); worst frame median rest 58.4 / 66.8 ms, hold 66.7
  / 83.3, collapse 50.1 / 58.4; max 83.3 / 83.4, 100.0 / 100.1, 83.4 / 100.1. The lane is never slower, but the contention
  (MAIN 17-24 fps, far below vsync) swamps this method.
- Paired synchronous cost (the ENV lane's `perf_pair.mjs`, 15 reps x 12 frames, B = lane, A = MAIN, median of the per-rep B/A;
  each lane ratio divided by its session's calibration = lane `?atmos=r10`, the same code as MAIN): session 1 (`perf/pair.txt`,
  calib 0.951) rest +7.7 %, misty rest +9.0 %, hold +13.5 % (started at load 6.8); session 2 (`perf/pair_v2.txt`, calib 0.971)
  rest +16.5 %, misty rest +10.2 %, hold +6.6 %; session 3 (`perf/pair_ablate.txt`, calibrations 1.010 / 1.060 bracketing) rest
  +3.7 % / +3.2 %, `?atmosmist=0` +1.6 %, clouds + softness + wisp off +3.0 %. Per-rep ratios span +-20 % inside every session
  and the calibration itself moves 0.95-1.06 between sessions, so single sessions are not conclusive; the median of the six rest
  estimates is +8 % (inside +10 %), the ablation attributes ~2 % to the mist bank and ~1 % to the clouds, and the added ALU (one
  extra noise per env / water fragment, ~8 in the bank's box, early-outs elsewhere) predicts a few percent.
**Attempt 3, final code** (MAIN :5173 now = BASE + the RINGS merge; every run started at load 3.0-6.0, other lanes' timing runs
excluded by `tools/quiet.zsh`):
- `perf_probe`, 6 interleaved pairs (`perf/runs_T1_v3.txt`): fps median lane / MAIN rest 27.4 / 31.6 (per-pair ratio median
  0.910: 1.10 0.76 0.89 0.83 0.93 0.96), hold 22.4 / 22.5 (1.007), collapse 28.0 / 31.4 (0.896); worst frame median rest 66.7 /
  58.4 ms, hold 83.4 / 83.3, collapse 58.3 / 50.1; max 83.4 / 83.4, 116.6 / 100.0, 83.4 / 66.7. Still GPU-contended (22-32 fps
  at T1 with vsync 60): this method swung from lane 1.43x faster (attempt 2) to 0.91x here on nearly the same code.
- Paired synchronous cost (`perf/pair_v3.txt`, `py/pairsum.py`), each normalised by the mean of the two bracketing rest
  calibrations (lane `?atmos=r10` = BASE vs MAIN: 0.970 and 1.045): **rest live 0.984 and 0.958, rest with the bank forced
  fully misty (the mist's worst case) 1.023; hold 0.979** (vs its own calibration 1.022). I.e. the lane's cost is inside the
  method's noise at rest and in the hold (-4 .. +2 %), +2 .. +6 % in the misty worst case: **within the +10 % budget**.
  T0 keeps the same cheap paths (no extra passes; the mist's early-outs; the clouds are 9 quads).

## 6. Open issues / notes for the lead and the other lanes

1. **QC timing vs F000.** The reference itself changes at rest: F000 is the CLEAR state with the summit puff; loop F045 / State
   F210-F320 are MISTY without it, and the clouds drift ~7 px/s. The engine reaches F000's cloud layout and clear bank at the end
   of the intro (t ~3.4 s); `shoot_qc` captures q00 at t ~9 s (mist rolling in, puff gone, clouds ~40 px left of F000) and q03 at
   ~16 s. For an F000 comparison pin the states (section 3 knobs) at t = 3.4 + k x 404.762 s.
2. **Lake reflections of the moving clouds:** the default plate lake shows the clouds' Cycles reflections frozen at the artist's
   positions; the WATER lane's planar mirror (LakeMirror pass) draws the live cards, which carry `uCloudShift` (x and y), so their
   reflections move with them. The mirror frustum (horizontal margin 1.1 + orbit) stays inside |u| 0.6.
3. **The rest camera sits ~(-8, -2) px off F000** (the massif summit, the iceberg and the far range all register at -8 px x,
   `py/mtnreg2.py` on `caps/cards1/none.png`; a yaw of ~0.27 deg; the handheld drift adds +-4 px). Not changed here (rest
   framing belongs to the camera owner); the clouds are registered relative to the mountains, so they stay right if it is fixed.
4. **Far-right range +10 levels vs F000** (`far_range_R` 1240-1340 x 360-390): the low right card (CLOUDS[4], cloud_b at 140 m,
   y -3.6..19.7 m) veils it; F000 shows the range unveiled. The range at y 355-375 is painted on the BG001 sky card (CPU raycast
   hit at 359 m), so no card depth can sit behind it (tried, reverted). Fix for the ENV bake: real geometry (or an occluder mask
   on BG001) for the far-right range nearer than 140 m-equivalent.
5. **Clear-state base haze**: at the bank's clear state the ridge foot is still +18 R vs F000 (120/134/154 vs 102/125/157),
   foothills +9, shore +6: baked into the env textures (the v2 `V2_BaseMist` in-scatter). The clean fix is a bake without
   `V2_BaseMist` (the engine's bank and band then carry all of the base mist, in and out like the reference).
6. **Sky tone and the engine's AgX**: the open sky is within ~+-4 levels of F000 (sides +2..+4, the right edge up to +7, the
   centre -1..-4: F000's sky is a little brighter in the middle and darker at the edges; `py/skygrid.py`, `py/skyprof.py`). Not
   corrected (a spatial fit to one frame for <= 4 levels). Root causes: three's polynomial AgX is within +-5 levels of Blender's
   AgX LUT in the mids / highs but up to 15 levels DARKER in deep shadows (`py/agx_cmp.py`), and the v7 plate's sky is flatter
   than the video's. A LUT-exact AgX would move every region and needs a full re-tune: proposed for the grade owner.
7. **The summit's own tone** (not this lane): with the puff right, the massif's summit still reads whiter / less blue-grey than
   F000 (`an/g/summit_zoom_F000_t34.jpg`): the env bake.
8. **Ice material** (not this lane): what holds it back visually against the reference is the frost (rough, cloudy patches) and
   the soft internal bands; the ICE lane's open items stand.
9. **Water's own band** uses the same steady wisp (shared chunk); if the WATER lane rewrites `Water.ts`, keep calling
   `plateMistWisp` so the band stays continuous at the shore.

## Fix round 1 (17 Nov; answers judge1 FAIL 7.6)

Fixer attempt 1 (16 Nov 07:42-08:05) did the Blender card test and stopped at the user's pause; attempt 2 (17 Nov 07:48-) built and
verified everything below. Work in WORK `fx1/` (tools, py2, caps, an2, perf); LOG.md "FIX ROUND 1" has every step and number.
Changed files: `world/Atmos.ts` (flags, wind, card light, crest table, berg envelope, mist3 GLSL and constants) and
`world/PlateEnvironment.ts` (PLATE_VERT / PLATE_FRAG / CLOUD_FRAG hunks behind defines, constructor wiring, `updateAtmos`).
`HeroEngine.ts` unchanged in this round. No assets. Typecheck hero 0 / app 0; `git merge-file` of PlateEnvironment.ts and
HeroEngine.ts onto MAIN (BASE as ancestor): 0 conflicts (`fx1/merge/`).

### F1. What the reference really does (re-measured; `fx1/py2/refseries.py`, `loopstate.py`, `mistfit.py`)
- The Default Loop is not the State video at one time scale: L000 == S000, its mist / berg / massif series match the State's
  static windows at **4x** (L050-L057 == S200-S228, L077-L082 == S306-S330), its clouds run **2.65x**. Engine time = 3.4 + S/30.
- **Cloud speed** (judge nit): from S000 over 7-11 s baselines the clouds move -60.0 / -56.3 (S210), -62.0 / -63.2 (S228),
  -92.0 / -91.8 px (S330) = **8.36 px/s**, the same screen rate for the cards at ~96 and ~116 m (the rigid conveyor is right).
- **Massif lower-mid face** (180-360 x 300-390): its darkening is two things. (i) The cards' **emission** (white x2): in Blender
  (v7 scene, cards camera-invisible at the .blend / F000 / F000+12 s places, `fx1/an/cardtest.jpg`) the cards' shadows never reach
  the massif's face, their light does (-14 lower face, -9 upper-left, F000 -> +12 s); the reference agrees at equal mist (Loop
  L080 vs State S320 share the mist, not the clouds: -4.0 for 31 px more drift). (ii) The **bank**: white, ending at rows
  375-380 = 2.7-3.3 m at the massif's foot (the rest plate's position map), the face above it (rows 320-370) darker, and a
  bright thin veil over the face while the bank rolls in (S210 rows 280-320 +9..+14). Attempt 3 had the top at 7.5 m.
- **Berg foot** (finding 1c; `fx1/an2/ref_bergfoot_loop.jpg`): a pale layer over the berg's lower face comes and goes, berg foot
  128.8 / 115 / 139 / 100 / 130 at L000 / L015 / L035 / L075 / L120 (State S000 128.7, S210-S228 123 -> 114, S306-S330 100).

### F2. Changes (each behind its own switch; all off with `?atmos=r10`)
| part | switch (restores judge1's lane) | what |
|---|---|---|
| wind | `?atmoswind=0` | `CLOUD_OMEGA_FIX1` 0.00495 u/s = 8.36 px/s (was 0.0042 = 7.1); loop period 343.434 s (was 404.762) |
| card light | `?atmoscardlight=0` | `ATMOS_CARDLIGHT`: each card's irradiance vector field (32x16x24, from a 24-column grid of its alpha; built on the CPU at load, ~8-20 ms) in a RGBA16F 3D texture; per vertex 18 taps (9 live cards minus the same cards at their F000 places, so F000 is unchanged); the raw texel x (1 + kappa dE / luma), kappa 2.2; the lake mirror pass too; BG.001 (an emitter in the artist's file) excluded |
| far ranges | `?atmosrange=0` | `CLOUD_RANGE`: cards deeper than 118 m fade out 2-6 px below the rest plate's skyline (256-sample table from `plate_rest.exr`, `fx1/an2/crest.jpg`), along the camera's own ray at ~250 m |
| mist | `?atmosmist3=0` | `ATMOS_MIST3`: dense core, top at the massif's foot 3.2 m, white bank (low 0.50/0.63/0.90, thick up 0.37/0.47/0.67), thin parts bright (0.34/0.43/0.60), the face above a thick bank x0.84, a bright veil while the bank rolls in / out (4 env (1 - env)), darker in the ridge's lee (x0.6), roll-in re-timed (offset 800.0) |
| berg | `?atmosberg=0` | `ATMOS_BERG`: `bergEnvelope(t)` = 13 knots every 1.33 s from the reference's berg-foot series, then 1D noise of the same ~8 s quasi-period; it scales the band and fog at the berg's foot (shared chunk: the plate and the water) and a weak milky layer (x0.2, only above the F000 knot's density) |
Capture knobs: as section 3, plus the F000 layout now at t = 3.4 + k x 343.434 s (the card light's zero there; the berg envelope's
F000 knot only at t = 3.4); `__hero.env.bakedMaterials[0].uniforms.uCardKappa`, `__hero.env.atmosUniforms.uAtmosVeil /
uAtmosVeilC / uAtmosVeil2 / uAtmosBerg / uAtmosBergC` are runtime-tunable.

### F3. Numbers (8-bit luma, rest framing, rings / shards excluded by the boxes; `caps/ver4`, handheld off, everything live)
Engine t = 3.4 + State seconds; reference = State S000 / S210 / S228 / S320 and the Loop at 4x (L030 = 4 s, L040 = 5.3 s, L065 =
8.7 s, L075 = 10 s, L090 = 12 s, L120 = 16 s):
| box | F000 t3.4 | t7.4 | t8.7 | t10.4 | t11.0 | t12.1 | t13.4 | t14.1 | t15.4 | t19.4 |
|---|---|---|---|---|---|---|---|---|---|---|
| base (0-420 x 380-440) eng / ref | 140.4 / 138.1 | 139.4 / 139.3 | 139.4 / 142.6 | 142.0 / 145.5 | 144.3 / 147.4 | 149.4 / 152.5 | 155.4 / 157.4 | 157.9 / 157.7 | 160.9 / 160.8 | 162.8 / 154.2 |
| base fine detail hp | 3.29 / 2.23 | | | 2.79 / 2.54 | | 2.02 / 1.86 | 1.43 / 1.28 | 1.27 / 1.13 | 1.19 / 0.97 | 1.16 / 1.20 |
| massif lower-mid face | 153.7 / 155.5 | 148.5 / 159.9 | 146.9 / 158.4 | 146.1 / 152.8 | 148.1 / 149.9 | 151.8 / 147.2 | 144.7 / 142.2 | 141.1 / 137.6 | 140.0 / 141.8 | 137.8 / 151.7 |
| berg foot (1060-1240 x 400-440) | 126.7 / 128.7 | 139.1 / 134.7 | 144.6 / 138.9 | 121.7 / 122.9 | 114.5 / 114.3 | 109.0 / 104.1 | 106.4 / 100.4 | 106.2 / 100.5 | 109.3 / 104.7 | 128.1 / 129.9 |
| ridge foot | 105.8 / 99.8 | | | 104.2 / 94.4 | | 110.8 / 103.3 | 122.4 / 114.9 | 128.3 / 115.8 | 136.1 / 126.0 | 142.2 / 125.9 |
| dark ridge body | 83.3 / 81.2 | | | 81.2 / 80.9 | | | | 80.8 / 80.6 | 80.8 / 79.7 | 80.8 / 78.6 |
Judge1's items: (a) the massif's face, time-aligned like the judge's reference numbers (S320 - S000 -17.9, L090 - L000 -13.7):
engine t14.1 - t3.4 **-12.6**, t15.4 - t3.4 **-13.7** (attempt 3: -4 at a pinned t30; the profile through rows 300-450 at
S320 vs t14.1 is within 1-2 levels in the bank (rows 370-430) and 5-9 short in the dark band, `fx1` LOG 08:55). (b) the plain
under the full bank: hp **1.13-1.27** (reference 0.97-1.13, attempt 3 1.80), base 161-163 (reference 158-161). (c) the berg
foot follows the reference within +-6 at every time (attempt 3: static 127). (d) the cards' light moves with them: massif face
-8.7 / -12.1 / -17.1 at t 10.4 / 14.1 / 30 with the bank pinned clear (model -7.1 / -11.2 / -20). Judge1's pinned metric at t30
(bank clear vs misty, same card light): base +25.7, massif face 0.0 (the white bank's top and the darker band cancel in the box).
Over a full period the card light ranges -20..+21 at the massif's lower face (`fx1/py2/cardlight_period.py`), the far field ~0;
the extremes come when a card itself hangs in front of the massif (t 290-320, `fx1/an2/ver1_long.jpg` looked at).
Far range: at t 90 / 150 the range left of the iceberg is unveiled (`fx1/an2/ver4_farrange.jpg`, `fin_crest_zoom.jpg`; judge1's
t 90 had it washed out); far_range_R at F000 190.5 (attempt 3 194.6, F000 184.6: the remaining +6 is the bake without clouds).
1:1 crops looked at: `fx1/an2/ver4_mist_1to1.jpg` (S000 / S210 / S320 vs t 3.4 / 10.4 / 14.1).

### F4. Verification (all through the slot, T1 1440x766 unless noted)
- 0 page / console errors: default, T0, T2, phone 390x844, 2560x1080, every new switch and all five together, `?atmos=r10`.
- Way back: lane `?atmos=r10` vs MAIN :5173, ring column masked (judge1 `py/wbdiff.py`, `caps/wb_lane_r10` vs `caps/wb_main`):
  mean 0.13-0.49, max 1, 0 px > 2 (rest t9 / t100 / t1800, L t100, TR t100, BL t300).
- Clouds: loop exact at 343.434 s (sky band t 30 vs 373.434 mean 0.18 max 1; t 1000 vs 1343.434 mean 0.04); engine drift 8.31 /
  8.42 px/s (reference 8.36); long idle t 600 / 1800 / 3600 / 86400 and TL / BR at 1800 (`fx1/an2/fin_idle.jpg`): clouds, bank,
  no artefacts; pointer L / R / TL / BR / TR at t 14.1 and 90 (`fx1/an2/ver4_ptr.jpg`): natural, no edges.
- Press / hold / release with a real mouse (`caps/fin1/seqH`, `fx1/an2/fin_seqH.jpg`): bank -> hold fog -> bank, no pops (every
  new term gives way to the hold's fog through `uFogHold`, like attempt 3's bank).
- Perf: section F5.

### F5. Frame time
(see the next block, filled when `fx1/perf/pairs.txt` completes)

### F6. Still open
1. The bright veil phase comes ~2 s later than the reference's (S210: rows 280-320 +9..+14; engine at t 10.4 +0..+3, at t 12.1
   +5): the veil follows the bank's own envelope at the massif. The ridge foot under a full bank stays +10..+16 over the reference
   (judge1: keep the left columns).
2. The far-left berg foot (1000-1100 x 405-440) is darker than the reference's in its misty phases (F000 121 vs 154): a static
   difference of the bake / berg grade there, not the envelope (its thin phase matches, 97 vs 106-110).
3. The massif's upper-right (300-420 x 240-300) swings +-5 in the reference (drifting haze); the engine's stays within 2.
4. Judge1's out-of-lane nit stands (summit / ridge rock faces: the ENV bake); the card light leaves F000 itself unchanged.
5. QC timing (section 6.1): with the new period the F000 layout is at t = 3.4 + k x 343.434 s; compare F000 at t = 3.4.
