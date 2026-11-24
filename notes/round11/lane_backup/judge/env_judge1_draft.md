# judge1, round 11, lane ENV (verdict draft, written as I go)

Judge: judge1 (independent), started 2026-11-15 06:59 WIB.
Lane lab :5174 (started by me), baseline :5173 (lead's, untouched).

## Progress
- 06:59 read SPEC 0-3 + 4.1, AUTOPILOT, HANDOFF (claims only), LOG (claims only). Load 2.97, mem free 59 %.

## Attempt 2 (fresh start, 2026-11-15 08:57 WIB)
- 08:57 Re-read SPEC 0-3 + 4.1, AUTOPILOT, HANDOFF (steps 1+2, claims only), LOG step 2 (claims only). Load 3.5, slot free (n 3).
  Old judge1/lab5174.pid 27074 is dead, nothing on :5174; :5173 (pid 1914) up. Starting my own lab on :5174.
  Lane diff: HeroEngine.ts, assets.ts, PlateEnvironment.ts, Water.ts, render_sky_equirect.py modified; LakeMirror.ts new;
  public/hero: env_baked.glb/json, baked/*.webp, sky_world.exr, wisp_card.exr, lake_corr.png new.
  Switches to test: ?env=projected (E-G4), ?envlake=plate|mirror, ?envlakecorr=0, ?envmirrorrate=1, ?envwisp=0, ?envlod=bias, ?envside=front.
  Plan: (1) shoot_qc q00,q03 lane/base pinned clock; region boxes + full diff map; (2) shoot_pointer 10 spots lane/base; (3) shoot_sweep lane/base;
  (4) E-G4 env=projected vs base; (5) perf_probe 6 interleaved pairs SLOT_BG=0; (6) assets size, console errors; (7) glitch hunt crops.

## Attempt 3 (resume, 2026-11-15 09:09 WIB)
- 09:09 Lane sources unchanged since 06:57 (newest: HANDOFF 06:57, HeroEngine.ts 06:27, LakeMirror.ts 06:47), so attempt-2 captures
  (qc/base_a, base_b, lane_a, lane_b, laneproj_a, made 09:01-09:02 with DETT=100 pinned clock) are fresh captures of the same build.
  Old lab pid 28096 dead. Started my lab on :5174 (pid in lab5174.pid). Load 4.8, mem free 43 %, slot free.
  Lead decision 6 (user's hold priority) is judged in this ENV lane as a REGRESSION check: the env lane must not change ring motion;
  I measure per-ring angular velocity sign/smoothness during live holds on lane vs baseline (env lane owns no ring code).
- 09:12 E-G4 (re-measured from attempt-2 captures, tools/eg14.py, out an3/): ?env=projected (laneproj_a) vs base_a / base_b outside a
  shard mask (4.6 % / 3.9 % of frame): q00 0.4665 / 0.4761 (max 5), q03 0.4523 / 0.0023 (max 5-6). Baseline own repeat 0.0441 (q00),
  0.4527 (q03): the 0.45 level is the post dither, same sky ripple pattern in an3/rep_base_q03_eye.png and an3/eg4_projA_vs_baseA_q00_rest.png
  (looked at both). => E-G4 PASS.
- 09:12 E-G1 box means (DETT=100, T1, an/eg1_q00_boxes_r3.json; lane - base luma): sky/ridge/massif/iceberg/far range/mound/corners
  within +-0.5 (massif_base +0.5, far_right_range +0.4); LAKE: far_floes_right -4.4 (rgb -4.0/-4.5/-4.7), lake_mid_left -13.2
  (rgb -15.9/-12.8/-9.3), lake_near_centre +3.4, lake_right -3.0, far_floes_left -0.8, lake_far_left +0.7. Lane vs F000:
  lake_mid_left lane -11.3/-7.1/-4.0 vs ref (base +4.6/+5.7/+5.2), far_floes_right lane -5.0/-4.0/-4.2 (base -1.0/+0.6/+0.5).
  => 3 lake boxes outside +-3 at the gate's own pose. Repeat lane_a vs lane_b identical boxes (deterministic with DETT).
- 09:12 E-G1 diff map an3/eg1_lane_vs_base_q00_rest.png (gain 8): above y 440 mean 0.71, px>20: 529 (1-px silhouette outlines on
  ridge, massif, iceberg, far range; faint round blob at the summit wisp ~ (165, 230)); lake + fg rocks: mean 7.9, px>20: 47,035.
- 09:13 FINDING (major, E-G1/E-G2 lake): the mirror lake drops the floe reflections. crops3/q00_lakeR_BLR.png (base / lane / F000,
  x 900-1440, y 440-610): F000 and the baseline show bright vertical reflection columns under every far floe and the iceberg; the
  lane shows flat grey water with fine horizontal ripple lines, NO floe columns. crops3/q00_lakeL_BLR.png (x 0-560): F000 and base
  show the dark waterline + short columns under the left floes; lane floes sit on flat lighter water (pasted-on look).
  crops3/q00_near_BLR.png: near ripple rings similar in both, lane a bit smoother/glossier; neither matches F000's textured rings.
- 09:16 batch2 (slot env:judge1-eg2, 2m40s): eg2/ptr_lane, ptr_base (10 spots, DETT=100, no fill-off shots), eg2/sweep_lane,
  sweep_base (intro x8, hold/pop/rel at L R T B BL TR, tau x8). Next: inspect them (contact sheets + full-res crops).
- 09:18 E-G2 inspection (eg2/crops/mtnL_*, mtnR_*, bot_* = base | lane, all 10 spots made; looked at mtnL_left, mtnL_top_left,
  mtnR_right, mtnR_bottom_right, bot_bottom_left, bot_orb, sweep sheets, sw_hold_L/R/B lane + base, ref F420):
  mountains, ridge, massif, iceberg, far range, wisp: identical read to the baseline in every spot looked at, ONE wisp at the
  summit, no doubled silhouette, tear, hole or bottom band seen. Lane console: no errors (baseline has one 404).
  The lake: in EVERY view (rest, pointer spots, hold L/R/B) the lane has no floe / iceberg reflection columns; F000 and F420 both
  show them (F420: under the floes at x 470-560 and 1150-1440, y 640-700). crops3/q00_floesR_x2_BLR.png (2x, base / lane / F000,
  x 1000-1360, y 470-580): even the small floating floe at ~(1180, 495) has NO reflection in the lane; lane water = regular
  horizontal wave lines (CG read). Baseline hold frames have tall columns (plausible vs F420). Ring poses differ lane vs base in
  the sweep hold frames: the sweep does not pin the ring tumble at the press (the builder found base-vs-base 2.63 at p06 too);
  checked separately with live-hold ring probes below.
  Water.ts mirrorTex(): symmetric box spread of 3.46 sig in elevation around the coarse-tilted ray + uLakeFar far-field spread:
  a thin bright floe near the horizon is averaged with sky over the whole box -> washed out (builder's own diag says the Cycles bump
  washes the MOUNTAINS out; F000 shows the floes' columns survive).
- 09:22 batch3 (slot env:judge1-qc3, 3m23s; qc3/): lake at other clock times, lane - base luma:
  t200: far_floes_right -3.5, lake_mid_left -3.4, lake_near_centre +9.7, lake_right -7.5, lake_far_left +2.7
  t300: far_floes_right -2.5, lake_mid_left -4.1, lake_near_centre +5.9, lake_right -7.6, lake_far_left +2.4
  (t100: -4.4 / -13.2 / +3.4 / -3.0 / +0.7). => lake boxes outside +-3 at every time (an3/boxes_t200.json, boxes_t300.json).
  Vs F000 (sum of mean |rgb - ref| over 6 lake boxes): base 30.1 / 30.3 / 41.7, lane 33.4 / 26.3 / 27.5 at t 100/200/300: mixed;
  far_floes_right always closer in the baseline (0.5-0.7 vs lane 3.7-4.4 at t100/200).
  ?envlake=plate (lane, t100): every box within +-1.5 of the baseline (an3/boxes_lakeplate.json); crops3/q00_lakeR_mirror_vs_lakeplate.png
  (mirror / plate lake): the plate lake has the floe columns, the mirror none. So the baked ENVIRONMENT passes E-G1; the MIRROR LAKE fails it.
  T2 (mirror, full-size target): same lake deltas as T1 (lake_mid_left -12.8, far_floes_right -4.2), rest within +-0.5 (an3/boxes_T2.json).
  T0 (plate lake): every box within +-1.6 (an3/boxes_T0.json).
  Hold p06 (crops3/p06_lake_BLR.png, base / lane / F420): F420 + base show floe columns; lane: flat gradient water, at most faint
  traces under the left floes.
- 09:26 Live hold ring probe (tools/holdrings.mjs: real mouse presses at the centre, T1; rest 4 s, hold 1 s, rel 3 s, hold 6 s,
  rel 3 s, hold 20 s, rel 0.5 s, re-press 4 s, rel 4 s; per-frame ring quaternions; tools/holdan.py; hold/an_1.txt;
  slot env:judge1-hold 3m07s). Median |w| (deg/s) base / lane: rest A 201/196 B 162/158 C 81/78 D 30/27;
  hold20 A 42/32, B 2.4/2.4, C 16/8.5, D 0.6/0.7 (D's spin sign flips 14/13 times in 20 s = jitter around zero);
  release frames: max per-frame step 45 deg in both (MAX_TURN clamp hit), hitch counts similar.
  => In BOTH builds B and D are practically frozen in a long hold and C crawls: the user's 09:05 complaint is reproduced on the
  baseline; the ENV lane does not change ring code (git diff: HeroEngine.ts only adds LakeMirror create/render/resize/dispose and
  skips bakeDepth; Rings/Choreography/CameraRig untouched) and its ring statistics match within press-phase noise -> no ring-motion
  regression from ENV. Frame time differs (sequential runs: rest dt med base 24 ms vs lane 50 ms, hold6 33 vs 59 ms, hold20 35 vs
  33 ms): load-dependent, to be settled by the interleaved perf pairs (bigger frame times = bigger per-frame ring steps in the hold).
- 09:29 E-G3 assets (ls, public/hero in LANE): default baked+mirror download = env_baked.glb 1,079,076 + env_baked.json 13,643 +
  34 webp 957,870 + sky_world.exr 394,365 + wisp_card.exr 87,087 + lake_corr.png 3,663 = 2,535,704 B (<= 6 MB: PASS). Way-back-only
  extras baked/*_v9g.webp 72,634 B. Lane console: no errors in any capture (qc, ptr, sweep, hold probe); baseline logs one 404.
- 09:29 Ridge marks at rest (crops3/ridge_marks_x4_BLR.png, 4x, base | lane | F000; x 20-180, y 290-380): lane shows a 1-px bright
  dash at ~(80, 327) and a bright 'V' at (127-128, 342-343) (+59 luma over its 7x7 median, tools/specks.py), plus bright notches on
  the ridge's top silhouette at (91, 309) +55 and (103, 308) +54; none in the baseline. Same in lane_b and at t200 (deterministic).
  => E-G1 'no speck at rest' not met (minor). Right mound / iceberg 4x (crops3/right_mound_x4_BLR.png): lane = base (both have
  the iceberg's stair-stepped right edge vs a soft F000; pre-existing).
- 09:30 Lake texture at the frame edges (eg2/crops/edgeL_x2_left.png, edgeR_x2_right.png; 2x, base | lane): the lane's water under
  the floes = regular horizontal wave lines and short bright horizontal dashes (left spot, x 0-320, y 545-610), no floe columns;
  the baseline's water has the floe columns and an irregular texture. Reads as a CG ripple texture next to F000 (CG tell).
- 09:32 Summit wisp (crops3/wisp_x2_BLR.png, base | lane | F000, x 110-310, y 170-300): one wisp, lane = base within mean |d| 1.15
  (signed +0.4) in the card box (134,184)-(281,281); lane edge marginally softer. PASS. Typecheck tsc -p tsconfig.hero.json in LANE:
  0 errors (exit 0). Waiting for ice:judge1-perf (exclusive pairs) to finish before my perf pairs.
- 09:31 Perf started in background (tools/perf2.zsh, task bsbxyo4gs): 6 interleaved pairs of MAIN perf_probe (T1 scale 1), then 6
  pairs of tools/perfmotion.mjs (live cursor sweep + real press + release: the mirror renders every frame when the camera moves);
  each run its own slot, SLOT_BG=0, started only with no other holder and load < 6. Results -> perf/probe.txt, perf/motion.txt.
- 09:32 Silhouettes at 4x (crops3/ridge_top_x4_BL.png, iceberg_top_x4_BL.png; base above lane): the lane's ridge top is the raw
  rasterized mesh edge: crisper, with more stair-steps than the plate path's Cycles-anti-aliased edge (x 0-240, y 270-340); this is
  the 1-px outline structure in an3/eg1_lane_vs_base_q00_rest.png above y 440 (px>20: 529). Iceberg top: lane = base. Minor.
- 09:33 Under the hero (crops3/q00_heroRefl_BLR.png, base / lane / F000, x 460-980, y 450-600): F000 + base show floe columns at
  both sides; lane flat water with fine horizontal lines. Consistent with the main lake finding.

### PROVISIONAL VERDICT (09:33, perf pending; if I am cut off, this stands with E-G3 = FAIL-by-default until perf is measured)
- E-G1 FAIL: lake boxes outside +-3 vs projected at t100/200/300 (lake_mid_left -13.2/-3.4/-4.1, lake_near_centre +3.4/+9.7/+5.9,
  lake_right -3.0/-7.5/-7.6, far_floes_right -4.4/-3.5/-2.5); floe reflection columns lost (crops3/q00_floesR_x2_BLR.png);
  2 bright ridge specks + 2 silhouette notches at rest (crops3/ridge_marks_x4_BLR.png). Outside the lake every box within +-0.5.
- E-G2 FAIL (lake plausibility only): no doubled silhouettes / tears / holes / bands in 10 spots + sweep; one wisp everywhere;
  but no floe/iceberg reflections in any view while F000 / F420 show them; CG horizontal wave lines (eg2/crops/edge*_x2_*.png).
- E-G3: assets PASS 2,535,704 B; tsc 0 errors; no console errors; frame time: pending (perf/probe.txt, perf/motion.txt).
- E-G4 PASS: 0.4665 / 0.4761 (q00), 0.4523 / 0.0023 (q03) outside the shard mask, = the baseline's own dither repeat.
- Hold (lead decision 6): no ring-motion regression from ENV (code untouched; stats match); the user's complaint reproduces on
  BOTH builds (hold20: B 2.4 deg/s, D 0.6 deg/s with 13-14 sign flips) -> HOLD lane's job.
- Findings: MAJOR mirror lake drops floe reflections + CG ripple lines (fix: keep ?envlake=plate as default at rest, or model the
  Cycles bump streak (one-sided vertical kernel / several taps toward the horizon) so floe columns form; verify floes are drawn
  in the mirror target by dumping it). MINOR ridge specks/notches at rest. MINOR aliased geometric silhouettes vs plate AA.
  lens_score provisional 7.6.
- 09:35 Lake structure numbers (tools/orient.py on an3/o/*: gx = mean |dL/dx| = vertical structures, gy = mean |dL/dy| = horizontal
  lines, col = std of column means = reflection columns):
  water under the right floes (940,500,500,60): F000 gx 1.86 gy 1.85 col 21.8 | base 2.05 / 2.00 / 14.6 | ?envlake=plate 2.05 / 2.00 /
  14.6 | lane t100 0.82 / 4.63 / 9.0 | lane t200 0.84 / 5.01 / 7.8.  Left floes (60,525,270,35): col F000 15.1, base 14.9, lane 7.7-9.7.
  Near centre (500,600,400,60): gx F000 2.50, base 2.70, lane 0.79-0.80.
  => the mirror lake has ~0.4x the vertical structure and ~2.5x the horizontal-line energy of F000 under the floes, and ~0.3x the
  near-water detail; the plate lake (base, ?envlake=plate) is close to F000 on both. Quantifies the major lake finding.
- 09:36 Ridge specks also in pointer views (tools/specks.py thr 30 on eg2/ptr_*): ptr_top lane has the 'V' at (127-128, 368-369)
  +59..+68 and the notches at (91-92, 335) +54, (103-104, 334) +53 (camera-shifted copies of the rest marks), absent in the
  baseline. eg2/crops/ridge_right_x4_BL.png (base above lane, x 30-230, y 245-335 of ptr_right): the lane's ridge top has a faint
  light 1-px rim against the bright sky where the plate path has a dark anti-aliased edge, and a small light streak at ~(206, 326).
  => E-G2's 'zero specks / hairlines' is not met either (minor, deterministic, same meshes).
- 09:39 Perf attempt 1 aborted: at 09:34:16 my perf_probe and ice:judge1-perf's started in the same second; both node processes
  then sat 4+ min with no browser child (only orphaned crashpad handlers). Killing my process was refused by the permission
  classifier, so I stopped my own background task (TaskStop bsbxyo4gs). perf2.zsh now time-boxes each run (perl alarm 150 s) and
  needs zero holders on two checks 2-4 s apart. Restarting the pairs.
- 09:43 BLOCKER FOUND (qc5/flash_lane.log, flash_lane.json; tools/resizeflash.mjs; T1 without ?scale, camera still, canvas
  readback in a rAF after the engine's render; lake band = rows 22-27 of a 64x34 downscale, centre excluded):
  after every render-size change the lane's lake goes near-black for 1-2 frames: steady 165 -> 60.45 (adaptive scale step, target
  648->576, no input at all), 164 -> 56.22 / 56.27 (window 766->760), 163 -> 60.31 / 60.32 / 60.31 (window back to 766 + another
  adaptive step 576->504). The dark frames are exactly the frames with lakeMirror.reused = 1 / 2 right after LakeMirror.setSize:
  THREE.WebGLRenderTarget.setSize disposes the target, and render() REUSES it (camera unchanged) -> the water samples an empty
  mirror. Baseline under the same events: lake moves <= 2 levels (qc5/flash_base.log). The adaptive scale is live for visitors
  (only the captures pin ?scale=1), so this fires after load, on adaptive steps, on window / mobile-toolbar resizes.
  Fix: in LakeMirror.setSize (or when the target size changes) force the next render (lastPos.set(Infinity,0,0); reused = 0).
- 09:45 Visual proof (tools/resizeflash2.mjs, qc5/flash2_lane_flash.png vs qc5/flash2_lane_before.png, full frames from the canvas in
  the rAF after the engine's render): the WHOLE lake (y ~455-766 outside the floes / rocks) is black in the flash frame, with a row
  of white dashes at y ~565 and the orb glint left; the frame before is normal. Reproduced 3x in this run (window 766->760: 56.26;
  760->766: 60.84; adaptive scale 0.85->1 via resize(): 59.33) and 4x in the first run. The baseline never flashes.
  => BLOCKER (a full-lake black flicker for 1-2 frames on every render-size change; the visitor's adaptive scale and any resize
  trigger it; mobile toolbar collapse resizes the viewport while scrolling).
- 09:45 Lake root cause (qc5/diag_lakeR_lane_nospread_flat_base.png, x 720-1440, y 430-630; rows: lane default / lane with
  uLakeBump.w = 0 and uLakeFar.x = 0 / lane with no bump at all / baseline): with the bump off the mirror shows every floe and the
  iceberg crisply (they ARE in the mirror target; the T1 0.5x0.5 target gives stair-stepped edges); with only the coarse tilt the
  floes come back as broken striations with dark specks; the default's fine-octave + far-field elevation spread (one textureGrad
  lookup with a 3.46-sigma box, sig ~ 2*s.z*1.4 and 0.05 rad far) averages them into the sky -> no columns. The Cycles / baseline
  look is a vertical streak below each floe. Fix: model the bump as a streak kernel (several taps toward the horizon / below the
  reflected point, weighted by the slope distribution, narrower far-field spread for low-elevation features) instead of one wide
  symmetric mip lookup; or keep ?envlake=plate at rest.
- 09:45 Phone (qc5/portrait_BL_restBL_hold.png: base rest | lane rest | base hold | lane hold, 390x844 @2x, touch hold; T1 scale
  0.9 both): no environment glitch, one wisp; lane lake calmer (no floe columns). Lane console clean, baseline 404 x2.

### VERDICT v2 (09:47, perf still running; replaces the provisional one above)
- pass = false. Blocker: the mirror lake flashes black for 1-2 frames on every render-size change (qc5/flash2_lane_flash.png).
- E-G1 FAIL (lake boxes, floe columns, ridge specks). E-G2 FAIL (lake plausibility in every view, ridge specks; geometry otherwise
  clean, no doubles). E-G3: assets PASS 2.54 MB, tsc 0, no console errors; frame time pending (perf/probe.txt, perf/motion.txt).
  E-G4 PASS (<= 0.48 outside the shard mask = the baseline's own dither repeat). Hold regression check PASS (ENV changes no ring
  code; the user's hold complaint reproduces on the baseline and the lane alike).
- Findings: BLOCKER lake black flash (fix: invalidate reuse in LakeMirror.setSize). MAJOR lake loses floe/iceberg columns + CG
  horizontal wave lines (fix: streak kernel / narrower far spread / ?envlake=plate at rest). MINOR ridge specks + notches at rest and
  in pointer views. MINOR aliased ridge silhouettes (raw mesh edge vs Cycles AA). lens_score 7.0 (env geometry = baseline 8.1 level,
  the lake regressed from the reference and the flash is a glitch the user forbids).
- 09:49 Perf attempt 2 stopped (TaskStop bo2rgrtqv): the HOLD builder (hold:spin-*) keeps a slot busy almost continuously,
  so 'zero holders' never came and every run waited 5 min. Its partial output kept as perf/probe_attempt2_partial.txt (pair 1 base was
  contaminated by my flash probe). Attempt 3 (task b1h3fvdyn): same 6+6 interleaved pairs, load < 6 only, holder count logged per run.
- 09:59 perf_probe pairs 1-4 done (perf/probe.txt): heavy contention (ice:judge1-perf + hold captures concurrently, 1-min load
  up to 7.0 at 09:56): lane pair-4 rest 17.5 fps vs base 33.7 two minutes later -> rAF-based numbers dominated by other jobs. Plan:
  finish the 6 perf_probe pairs (required), skip the motion pairs, and decide E-G3 with the contention-robust paired synchronous
  timing (copy of the builder's tool: tools/perf_pair_copy.mjs; base and lane alternating within seconds, median of per-rep ratios):
  rest (mirror reuse on), rest with ?envmirrorrate=1 (= the camera-moving cost), hold with ?envmirrorrate=1.
- 10:06 perf_probe 6 interleaved pairs DONE (perf/probe.txt; tools/perfan.py): median fps base / lane: rest 26.1 / 31.9, hold 28.8 /
  27.3, collapse 34.8 / 33.7 -> frame time lane/base 0.82 / 1.05 / 1.03; per-pair ratio medians 0.94 / 1.16 / 1.12 with ranges
  0.67-1.93 / 0.65-1.48 / 0.84-1.71; worst frame base 66.8 / 66.8 / 50.0 ms, lane 83.4 / 83.4 / 83.3 ms. Contention from other lanes
  (holders 1-2 at most starts, load up to 7) makes these inconclusive at the 10 % level. Motion pairs skipped (task stopped).
  Next: paired synchronous timing (batch6, one slot per configuration).
- 10:11 Paired synchronous timing (tools/perf_pair_copy.mjs, T1 scale 1, 15 reps x 12 frames, base page A and lane page B
  alternating; perf/pair_*.txt): rest, mirror reuse on (camera still): ratio lane/base median 1.068 (1.050-1.220; A 38.8 ms, B 42.7 ms);
  rest with ?envmirrorrate=1 (the mirror every frame = any camera motion: cursor orbit, hover dolly, hold dolly, release, intro):
  1.121 (0.935-1.260; A 55.5, B 60.5 ms). => > 10 % frame-time regression whenever the camera moves (the builder's own 1.12-1.16).
- 10:17 Paired hold with the mirror every frame: 1.154 (started at load 11.3, perf/pair_hold_rate1.txt) and re-run at load 5.86:
  1.124 (0.966-1.254; A 64.4, B 69.4 ms; perf/pair_hold_rate1_b.txt).

## FINAL VERDICT (10:17)
- pass = false; lens_score 6.6.
- Gates: E-G1 FAIL; E-G2 FAIL; E-G3 FAIL (assets 2,535,704 B PASS, tsc 0, no console errors, but frame time +12.1 % rest / +12.4-15.4 %
  hold when the camera moves (mirror every frame), +6.8 % with the camera still; perf_probe 6 pairs inconclusive under contention,
  worst frame lane 83.4 vs base 66.8 ms); E-G4 PASS; hold regression check PASS (ENV changes no ring code; the user's complaint
  reproduces on both builds: hold20 B 2.4 deg/s, D 0.6 deg/s with 13-14 spin sign flips, C 8.5-16 deg/s).
- Findings: BLOCKER black-lake flash on render-size change; MAJOR lake floe columns lost + CG wave lines (+ boxes outside +-3);
  MAJOR frame time +12-15 % while the camera moves; MINOR ridge specks / notches; MINOR aliased ridge silhouettes.
- Lab :5174 stopped next (pid file lab5174.pid).
- 10:17 Lab :5174 (pid 32948, mine) stopped; :5173 untouched and listening. No background task of mine left running. Judgement complete.
