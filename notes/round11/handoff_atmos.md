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
| `?atmoswind=0` | (fix round 1) the attempt-3 cloud speed 7.1 px/s, period 404.76 s |
| `?atmoscardlight=0` | (fix round 1) the environment's light frozen as baked (no light from the drifting cards) |
| `?atmosrange=0` | (fix round 1) the low cloud card drawn over the far ranges (no crest occluder) |
| `?atmosmist3=0` | (fix round 1) the attempt-3 ground mist (also drops the swell) |
| `?atmosberg=0` | (fix round 1) the steady band at the iceberg's foot |
| `?atmosswell=0` | (fix round 1, attempt 3) the bank's top stays low at the massif's foot, shaded band 0.16 (= attempt 2) |

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

Three fixer attempts (the user paused the round twice): attempt 1 (16 Nov 07:42-08:05) the Blender card test; attempt 2 (17 Nov
07:48-09:05) the card light, the far-range occluder, the denser bank, the berg-foot mist and the wind; attempt 3 (17 Nov 20:12-)
re-verified all of it on fresh captures, found the bank still a flat band at the horizon line and added the bank's swell up the
massif's foot (F2, `?atmosswell`), then the perf numbers attempt 2 never got (its lab was stopped by the pause). Work in WORK `fx1/` (tools,
py2, py3, caps, an2, perf); LOG.md "FIX ROUND 1" (attempts 1-3) has every step and number.
Changed files vs BASE: `world/Atmos.ts` (new; flags, wind, card light, crest table, berg envelope, mist3 + swell GLSL and
constants) and `world/PlateEnvironment.ts` (PLATE_VERT / PLATE_FRAG / CLOUD_FRAG hunks behind defines, constructor wiring,
`updateAtmos`); `HeroEngine.ts` keeps the one line of the build. No assets. Typecheck hero 0 / app 0. `git merge-file` onto the
current MAIN (BASE as ancestor; MAIN's PlateEnvironment.ts == BASE, its HeroEngine.ts carries the RINGS merge): 0 conflicts
(`fx1/merge_a3/`).

### F1. What the reference really does (re-measured; `fx1/py2/refseries.py`, `loopstate.py`, `mistfit.py`, `fx1/py3/rowprof.py`)
- The Default Loop is not the State video at one time scale: L000 == S000, its mist / berg / massif series match the State's
  static windows at **4x** (L050-L057 == S200-S228, L077-L082 == S306-S330), its clouds run **2.65x**. Engine time = 3.4 + S/30.
- **Cloud speed** (judge nit): from S000 over 7-11 s baselines the clouds move -60.0 / -56.3 (S210), -62.0 / -63.2 (S228),
  -92.0 / -91.8 px (S330) = **8.36 px/s**, the same screen rate for the cards at ~96 and ~116 m (the rigid conveyor is right).
- **Massif lower-mid face** (180-360 x 300-390): its darkening is two things. (i) The cards' **emission** (white x2): in Blender
  (v7 scene, cards camera-invisible at the .blend / F000 / F000+12 s places, `fx1/an/cardtest.jpg`) the cards' shadows never reach
  the massif's face (`fx1/an/shadowfp.jpg`: only the dark ridge, the far shore line and a foothill strip), their light does (-14
  lower face, -9 upper-left, F000 -> +12 s); the reference agrees at equal mist (Loop L080 vs State S320 share the mist, not the
  clouds: -4.0 for 31 px more drift). (ii) The **bank** and a darker band of the face just above its top.
- **The bank's top rises and falls** (attempt 3; row profiles `fx1/an2/a3_ref_rowprof.txt` + the rest plate's position map
  `fx1/an2/a3_rowpos.txt`; the visible top = the highest rows not darker than S000, since the face just above the fog reads darker):
  x 360-540 (world x -23..-14, z -96) 3.3 m at S180-S240, 4.5-5.3 m at S300-S360 (L075, S330, L090), thin at L105-L120; x 180-360
  (x -31..-25, z -91) 2.2-3.0 m until S360, 5.0-5.5 m at L105-L120; at the dark ridge's foot (x 0-180) it never rises above row
  ~395. The attempt-2 bank (top 2.4-3.2 m +-1.2) sat at the camera's own height (2.9 m), so its top was always the horizon line:
  a flat band, with the darker band above it as a stripe (`fx1/an2/a3_band_2x.jpg`, `a3_eng_fogtop.jpg` vs `a3_ref_fogtop.jpg`,
  `a3_ref_loopseq.jpg`).
- **Berg foot** (finding 1c; `fx1/an2/ref_bergfoot_loop.jpg`): a pale layer over the berg's lower face comes and goes, berg foot
  128.8 / 115 / 139 / 100 / 130 at L000 / L015 / L035 / L075 / L120 (State S000 128.7, S210-S228 123 -> 114, S306-S330 100).

### F2. Changes (each behind its own switch; all off with `?atmos=r10`)
| part | switch (restores the previous state) | what |
|---|---|---|
| wind | `?atmoswind=0` | `CLOUD_OMEGA_FIX1` 0.00495 u/s = 8.36 px/s (was 0.0042 = 7.1); loop period 343.434 s (was 404.762) |
| card light | `?atmoscardlight=0` | `ATMOS_CARDLIGHT`: each card's irradiance vector field (32x16x24, from a 24-column grid of its alpha; built on the CPU at load, ~8-20 ms) in a RGBA16F 3D texture; per vertex 18 taps (9 live cards minus the same cards at their F000 places, so F000 is unchanged); the raw texel x (1 + kappa dE / luma), kappa 2.2; the lake mirror pass too; BG.001 (an emitter in the artist's file) excluded |
| far ranges | `?atmosrange=0` | `CLOUD_RANGE`: cards deeper than 118 m fade out 2-6 px below the rest plate's skyline (256-sample table from `plate_rest.exr`, `fx1/an2/crest.jpg`), along the camera's own ray at ~250 m |
| mist | `?atmosmist3=0` | `ATMOS_MIST3`: dense core, top at the massif's foot 3.2 m, white bank (low 0.50/0.63/0.90, thick up 0.37/0.47/0.67), thin parts bright (0.34/0.43/0.60), the face above a thick bank darker (shaded band), a bright veil while the bank rolls in / out (4 env (1 - env)), darker in the ridge's lee (x0.6), roll-in re-timed (offset 800.0); `?atmosmist3=0` also drops the swell |
| berg | `?atmosberg=0` | `ATMOS_BERG`: `bergEnvelope(t)` = 13 knots every 1.33 s from the reference's berg-foot series, then 1D noise of the same ~8 s quasi-period; it scales the band and fog at the berg's foot (shared chunk: the plate and the water) and a weak milky layer (x0.2, only above the F000 knot's density) |
| **swell** (attempt 3) | `?atmosswell=0` (= attempt 2 exactly) | `ATMOS_SWELL` (rides on MIST3): behind z -84 (the massif's foot) the bank's top rises by 0..3.5 m (2-octave noise, 30 m cells, drifting 1.0 m/s towards -x, evolving 0.12 cells/s, smoothstep(-0.15, 0.3)), capped at 6.0 m (the reference's highest visible top 5.5 m + 0.5); the shaded band over a thick bank x(1 - 0.20) instead of 0.16. Fitted (`fx1/py3/swellfit4.py`, the engine's noise ported to numpy, 4 points across each screen band, grid over speed / cell / rate / amplitude / offset) to the visible tops above: band means x 360-540 3.8 3.8 3.9 4.2 4.4 5.5 5.4 5.4 5.4 5.5 4.9 m at t 9.4 / 10.07 / 10.57 / 11.07 / 11.4 / 13.4 / 13.9 / 14.4 / 15.4 / 17.4 / 19.4 vs targets (visible + 0.5) 3.8 3.8 3.8 3.9 3.9 5.0 5.5 5.8 5.2 5.2 4.9; x 180-360 3.6-3.8 until t 15.4 (targets 2.7-3.5: the attempt-2 base top, the swell only adds), 5.1 / 6.0 at t 17.4 / 19.4 (5.5 / 6.0). Over 2 h the top there is p10 2.8 / p50 4.2 m, above 5 m ~40 % of the time (reference samples: x 360-540 tall in 6 of 11, x 180-360 in 2 of 11), changing at up to ~1.1 m/s (p95). One more 2-octave noise per bank fragment. |

Capture knobs: as section 3, plus the F000 layout at t = 3.4 + k x 343.434 s (the card light's zero there; the berg envelope's
F000 knot only at t = 3.4; the swell is not periodic: its fit holds for session time t 9.4-19.4); `__hero.env.bakedMaterials[0].uniforms.uCardKappa`,
`__hero.env.atmosUniforms.uAtmosVeil / uAtmosVeilC / uAtmosVeil2 / uAtmosBerg / uAtmosBergC / uAtmosSwell / uAtmosSwellT` are
runtime-tunable. For the P3 panel's F000 boxes (judge nit 4): `fx1/tools/qc_f000_pin.json` (a `jcap.mjs` / `fcap.mjs` plan: t 3.4,
handheld off, bank pinned clear) and the live look at t 10.4 / 14.07 / 15.4 / 19.4 = S210 / S320 / L090 / L120.

### F3. Numbers (8-bit luma, rest framing, handheld off, everything live; the final build, fresh captures `fx1/caps/a3_fin_series`)
Engine t = 3.4 + State seconds; reference = State S000 / S215 / S320 / S330 and the Loop at 4x (L090 = 15.4, L105 = 17.4, L120 = 19.4):
| box | S000 / t3.4 | S215 / t10.57 | S320 / t14.1 | S330 / t14.4 | L090 / t15.4 | L105 / t17.4 | L120 / t19.4 |
|---|---|---|---|---|---|---|---|
| base (0-420 x 380-440) ref / eng | 138.1 / 140.4 | 146.1 / 142.7 | 157.7 / 158.2 | 158.4 / 159.1 | 160.8 / 161.2 | 159.5 / 163.5 | 154.2 / 163.8 |
| base fine detail hp | 2.23 / 3.29 | 2.47 / 2.73 | 1.13 / 1.27 | 1.11 / 1.24 | 0.97 / 1.19 | 1.02 / 1.11 | 1.20 / 1.10 |
| massif lower-mid face | 155.5 / 153.7 | 151.9 / 146.4 | 137.6 / 139.7 | 137.1 / 139.1 | 141.8 / 138.4 | 145.0 / 140.7 | 151.7 / 147.7 |
| ridge foot | 99.8 / 105.8 | 94.3 / 104.3 | 115.8 / 128.3 | 118.1 / 130.5 | 126.0 / 136.1 | 130.1 / 141.6 | 125.9 / 142.2 |
| berg foot (1060-1240 x 400-440) | 128.7 / 126.7 | 120.5 / 119.9 | 100.5 / 106.2 | 100.8 / 106.8 | 104.7 / 109.3 | 119.9 / 119.7 | 129.9 / 128.1 |
| far range right of the berg | 184.6 / 191.7 | 185.1 / 191.2 | 184.6 / 190.8 | 184.5 / 190.8 | 184.9 / 190.7 | 184.8 / 190.7 | 184.5 / 190.7 |
(`fx1/an2/a3_final_boxes.txt`; with attempt 2's shaded band 0.16 the massif face read 141.1 / 140.4 / 139.8 / 142.2 / 148.8 at t 14.1 /
14.4 / 15.4 / 17.4 / 19.4, `a3_sw3`; attempt 2 itself (no swell) 137.8 at t 19.4 vs the reference's 151.7.)
Judge1's items:
- (a) the massif's face, as the judge's own reference deltas (S320 - S000 -17.9, S330 -18.4, L090 - L000 -13.7): engine minus its
  t 3.4 value **-14.0 / -14.6 / -15.3** at t 14.1 / 14.4 / 15.4 (attempt 3: -4; attempt 2: -12.6 / -13.3 / -13.9). NOTE for the
  re-judge: judge1's own method (bank pinned clear vs misty at t 30) no longer measures this: most of the reference's change is the
  cards' light, which moves with TIME (the drift), not with the bank; pinned at one time the bank alone gives -1.3 (judge1's lane
  -4.0), and the reference's bank-only share is ~-3..-4 by the Blender decomposition. The swell is what makes the fog visibly
  climb the massif's foot (x 360-540 rows 300-400 at t 14.1 within -9..+9 of S320; attempt 2 -25..+5; `fx1/an2/a3_sw3_rowprof.txt`)
  and rise at the left late in the Loop (x 180-360 rows 330-380 at t 19.4 within -9..+1 of L120; attempt 2 -16..-33).
- (b) the plain under the full bank: hp **1.19-1.27** at S320 / S330 / L090 times (reference 0.97-1.13; judge1's lane 1.80), base
  158-161 (reference 158-161).
- (c) the berg foot follows the reference within +-6 at every time (judge1's lane: static 127).
- (d) the cards' light moves with them (massif face -8.7 / -12.1 / -17.1 at t 10.4 / 14.1 / 30 with the bank pinned clear).
- Far range (minor): the low card no longer veils the range left of the iceberg at t 75-150 (`fx1/an2/a3_far_range_veil_1to1.jpg` =
  judge1's crop: F000 | judge1 t 90 | final t 90 (handheld off / judge1's plan) | t 150 | t 3.4; `a3_range_zoom.jpg`,
  `a3_range_t34.jpg`, `a3_farrange_series.jpg`: judge1's t 90 and `?atmosrange=0` still show the veil); no crest rim.
  far_range_R 190.7-191.7 at t 3.4-19.4, 188.2 / 188.9 at t 90 / 150 (judge1 196.5 at every layout; F000 184.6): the bake's range
  itself is +4.6 (no cloud cards at all: 189.2, WORK `caps/cards1/none.png`), paler than F000's grey shaded faces at every time;
  the card still adds <= +2.5 there (it fades out 2-6 px under the skyline so no rim shows along the crest).
- Wind (nit): engine 8.39 / 8.44 / 8.50 px/s (t 3.4 -> 13.4 / 19.4 / 9.4, judge1 `py/pcorr.py` on the sky box 900-1300 x 60-200)
  vs the reference's 8.37 (S000 -> S330, same tool and box).
Row profiles rows 300-440, final build vs attempt 2 (`fx1/an2/a3_final_rowprof.txt`, `a3_attempt2_rowprof.txt`), mean |eng - ref|
(max): x 180-360 S320 3.4 -> 2.6, L090 6.1 -> 6.3, L120 11.9 (-32.9) -> 5.7 (-10.7); x 360-540 S320 8.0 (-21.9) -> 5.3 (-9.9), L090
9.4 (-23.8) -> 6.7 (-13.7), L120 9.1 -> 7.4.
1:1 crops looked at: `fx1/an2/a3_sw3_fogtop.jpg` (reference | engine | `?atmosswell=0` at S215 / S320 / S330 / L090 / L105 / L120),
`a3_shade_2x.jpg`, `a3_mist_1to1_L090.jpg` (judge1's crop: REF L090 | final t 15.4, L000 | t 3.4, S320 | pinned misty t 30),
`a3_final_1to1.jpg`, `a3_mist_1to1.jpg`, `a3_loop_vs_eng.jpg`.

### F4. Verification (attempt 3, fresh; all through the slot, T1 1440x766 unless noted; 0 page / console errors in every run)
- Judge1's own mist plan with the five attempt-2 switches off (`fx1/caps/a3_mist_off` vs `judge1/caps/mist`, judge1 `py/wbdiff.py`):
  identical outside the rings / shards / ripples (own clocks; `fx1/an2/a3_off_vs_judge1.txt`, diff maps `a3_off_dm_*.jpg`).
  `?atmosswell=0` == attempt 2 (`a3_swoff_ver4` vs `a3_ver`): masked mean 0.02-0.51, max 1-3, the rest shards (`a3_swoff_dm_pBR90.jpg`).
- Way back: lane `?atmos=r10` vs MAIN :5173 (judge1 plan `wb.json`): mean 0.05-0.36, max 1 in 4 of 6 shots; L t100 / TR t100
  291 / 416 px > 2 = MAIN's merged rings and shards (`fx1/an2/a3_wb_dm.jpg`).
- The swell's motion: 15 fps through its fastest rise (t 11.4 -> 13.4, `fx1/an2/a3_seqS.jpg`): shard-free boxes step mean |d| 0.32-
  0.65, p99 <= 2.0, 2nd difference max 0.97: smooth, no pop.
- Pointer L / R / TL / BR / BL (`a3_fin_ptr.jpg`), long idle t 300 .. 86400 at rest / TL / BR and misty (`a3_fin_idle.jpg`), press /
  hold / release with a real mouse (`a3_fin_seqH.jpg`; region steps only at the camera's dolly start / release, the same frames as
  attempt 2), T0 / T2 / phone 390x844 / 2560x1080 (`a3_fin_tiers.jpg`, `a3_fin_phone.jpg`): clouds and the bank on every path,
  no edges, holes or artefacts.

### F5. Frame time
Method: judge1's paired synchronous cost (`judge1/tools/perf_pair.mjs`; copy `fx1/tools/perf_pair2.mjs` adds a js hook for page A and a
bounded browser close), 15 reps x 12 frames, T1 1440x766, both pages on the lane's lab :5176, `SLOT_BG=0`, each pair started only
when no other lane's timing run held a slot (`fx1/tools/perf_a3.zsh` -> `fx1/perf/pairs_a3.txt`). Attempt 2's batch never ran (its
lab was stopped by the user's pause), so these are the fix round's first timings.
- calib (lane `?atmos=r10` vs itself, the method's noise): 0.981 (per-rep 0.74-1.26; frames ~73 ms: the GPU is shared with other
  projects' Chromes).
- (STATUS 21:39: the other pairs are held by the slot's load gate: from 21:35 the machine swapped heavily, load 1-min 550, free pages
  ~4k; timing under swapping would be meaningless. Results are added here if the load recovers before this attempt ends.)
Expected cost from the code (for the reviewer): per vertex of the baked environment 18 taps of a 32x16x24 RGBA16F 3D texture (the
card light; the env GLBs are ~1 MB, i.e. tens of thousands of vertices), and in the bank's box (x -80..-6, z -118..-58, below 13.6 m:
~10 % of the rest frame) one more 3-octave + two 2-octave value noises than attempt 3 (MIST3 veil, swell) plus the berg layer's
2-octave noise in its small box; nothing per pixel elsewhere, no extra pass. Judge1 measured the pre-fix lane at ~+3 % vs `?atmos=r10`.

### F6. Still open
1. The bank's base top at x 180-360 sits ~0.5-1 m over the reference's low phase until t 15.4 (the swell only adds); the ridge
   foot under a full bank stays +10..+16 over the reference (judge1: keep the left columns); the reference's bank at x 360-540
   THINS at L105-L120 (rows 370-440 166-174) where ours stays dense (174-182).
2. The bright veil phase comes ~2 s later than the reference's (S210: rows 280-320 +9..+14; engine at t 10.4 +0..+3), and the
   bank's lower part at x 360-540 rolls in later (t 10.57 rows 380-440 151-171 vs S215 178-186).
3. The far-left berg foot (1000-1100 x 405-440) is darker than the reference's in its misty phases (F000 121 vs 154): the bake /
   berg grade there, not the envelope (its thin phase matches).
4. Far range right of the iceberg +4..+7 over F000 at every time: +4.6 is the ENV bake's painted range on BG.001 (no cards: 189.2),
   <= +2.5 the card's soft fade under the skyline.
5. Judge1's out-of-lane nit stands (summit / ridge rock faces read smooth: the ENV bake); the card light leaves F000 unchanged.
6. QC timing: the F000 layout is at t = 3.4 (+ k x 343.434 s for the clouds); use `fx1/tools/qc_f000_pin.json` for F000 boxes.
