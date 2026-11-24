# P4 VERIFIER of int1 (21 Nov 2026, Asia/Jakarta; started 04:10, time box 45 min)
Role: independent verifier of the integration lane int1 (lab :5173, read only; :5173 / :5199 never restarted).
WORK = $SP/work_p4/verify_int1 ; mirror = MAIN/notes/round11/lane_backup/p4int1/verify/. Inputs: the integrator's report,
LANES/int1, $SP/work_p4/int1 (LOG, HANDOFF, tools), $SP/p3/r11_2 (int1 capture set), $SP/p3/r11_1 (MAIN capture set, judged by
the P3 panel; NOTE: captured 20 Nov 22:38 = MAIN before AA8, so lake / waterline differences vs r11_1 include AA8's own polish),
the lanes' final capture sets ($SP/work_p4/p4env/qc_fix, p4ice/qc_fix, p4orb/qc_fix, p4hold/qc_final), the P3 panel verdicts
(MAIN/notes/round11/p3/r11_1_panel.json: glitch boxes of glitch_cursor_orbit / glitch_hold_sweep).

## 04:11 patch + asset hashes
- int1_vs_main.patch in WORK/int1 and in the MAIN mirror: both sha256 31f06f9e...8246 (= the report), 1730 lines.
- Object_2_010_p4.webp in LANES/int1 and LANES/p4env: both sha256 3ce65b26...7e (= the report), 117,944 B.
- aa8 app/ == MAIN retrux-web/app (diff -rq clean). public/: MAIN has an extra public/models/home-full.glb (not referenced by
  app/ code; pre-existing aa8-vs-MAIN difference, outside the hero).
- diff -rq LANES/aa8/retrux-web vs LANES/int1/retrux-web (no node_modules / dist / tsbuildinfo / log): exactly the 11 changed
  files + p4env.ts + the asset that the patch / report list. Nothing else.

## 04:12 apply test (tools/applytest.sh -> ana/applytest.txt)
Fresh `cp -c -R LANES/aa8` into WORK/apply/clone, patch -p1 with the MAIN-mirror copy of the patch:
dry run rc 0, apply rc 0 (12 files, 0 fuzz / offset lines), 0 .orig / .rej; + the asset (taken from LANES/p4env):
app/ == int1 app/, public/ == int1 public/, hero-lab main.ts / index.html same; tsc in the clone: hero rc 0 (0 lines), project
rc 0 (0 lines). Extra: the clone built with the lab's own esbuild options (tools/buildlab.mjs) gives a main.js byte-identical to
the bundle :5173 serves (sha256 49960a37aefc645e both; = LANES/int1 dist). Clone removed.

## 04:14 tsc in LANES/int1/retrux-web: tsconfig.hero.json --noEmit rc 0 (0 lines), tsconfig.json --noEmit --incremental false
rc 0 (0 lines); tsconfig.tsbuildinfo untouched (mtime same).

## 04:12-04:16 switch proofs (one slot batch, tools/bIdent.sh -> ident/*.json, ana/ident.txt)
OFF = p4env=0&p4ice=0&p4orb=0&p4hold=0 on :5173 vs :5199.
- identP (the integrator's tool, 20 moving frames; final + every target + every linked program's source):
  rest T1 IDENTICAL (14 targets, 16 programs); T0 phone 390x844 DPR3 IDENTICAL (9 / 12).
- identV (mine: another pointer path (-0.6 cos(2 pi i/37), 0.45 sin(2 pi i/23)), 40 frames, the final image hashed every 10
  frames as well, target-presence flags, read errors flagged, ALL console types kept):
  rest T1 IDENTICAL (14 targets, 16 programs, 4/4 mid-run finals); T0 phone IDENTICAL (9 / 12, 4/4); T2 IDENTICAL (15 / 16, 4/4);
  ?envlake=plate IDENTICAL (10 / 12, 4/4); hold p06 (expand 2.97) IDENTICAL (14 / 16, 4/4). 0 read errors.
- negative controls: int1 default T1 DIFFERS (mirror, walk, reflection, main, refraction, bloom0-4, final, all 4 mid finals;
  programs rx-plate-baked, rx-cloud, rx-ice, rx-orb, rx-shards, rx-plate-baked-mirror, rx-bloom-down, rx-bloom-up, rx-grade) ->
  the test is live. int1 default T0 phone: final + all 9 targets + 4 mid finals SAME as :5199, programs rx-plate-baked / rx-cloud
  differ in source (env lane not tier-gated; = the report).
- console: 0 errors / warnings / page errors in all 16 sessions; the only line (identV keeps every type) is MAIN's own
  `console.info [hero] GPU "... Apple M4 ..." -> T1 (forced by ?tier=)`, present identically on :5199 (1 / 1 in every pair).

## 04:17-04:30 glitch hunt on $SP/p3/r11_2 (int1) vs $SP/p3/r11_1 (MAIN) (tools/sheets_ptr.py, sheets_hold.py, sheet_leftline.py)
- img/S1_ptr_overview_int1.png (10 spots, row-major rest, left, right / top, bottom, top_left / top_right, bottom_left,
  bottom_right / orb): single massif / summit / ridges in every spot, no doubled silhouettes, no holes, clean frame edges.
- img/S2_ptr_diff_int1_vs_main_x6.png (|int1 - MAIN| x6, max-pooled): differences only on the rings / orb / crystals (ice + orb
  lanes; crystal phase not deterministic in the harness), the left massif's card light (drifting cards: session time), the ghost
  boxes right of the iceberg (env G1), a crest line in the left views (env G1: S3f) and the lake (ripple phase + AA8). Numbers:
  ana/ptr_diff_stats.txt.
- img/S3a_ghost_right_MAIN_vs_INT1_2x_str.png (x1180-1440 y290-430, 2x, common percentile stretch; rows right / top_right /
  bottom_right): MAIN's translucent iceberg double on the sky in all three, int1 clean in all three (P3 critical, env G1).
- img/S3b_leftorbit_far_MAIN_vs_INT1_1x_str.png + img/S3c_hairlines_MAIN_vs_INT1_3x_str.png (left / top_left / bottom_left):
  MAIN's bright 1-px scribbles on the far range face at the mound's foot, int1 none (P3 major, env G4).
- img/S3f_leftviews_crestline_MAIN_ENV_INT1_2x_str.png: the left-view diff line = MAIN's pale ghost band along the iceberg top,
  gone in the env lane and int1 alike (env G1). Not a new artefact.
- img/S3d_lakecorr_shelf_MAIN_vs_INT1_3x_str.png: LAKE_CORR ghost (ptr_right x480-640 y440-520) and the far-left shelf box
  (ptr_rest x260-440 y450-500): present in MAIN and int1 alike (P3 minor items, open, no lane touched them).
- img/S3e_bottomstrip_10spots_MAIN_vs_INT1.png (y656-766, all 10 spots): clean, same as MAIN.
- sweep: $SP/p3/r11_2/sweep/sweep.jpg (34 frames) looked at; sw_hold_T.png at full res (frosted rings, clean background, no
  ghost); img/S4_hold_MAIN_HOLD_INT1.png (6 hold frames: MAIN | hold lane | int1).
  The sweep's ring phase is not session-deterministic (ana/sweep_phase_check.txt: the env lane, which does not touch the rings,
  differs from MAIN by 9.9-15.2 L in the ring area, int1 by 16-17), so int1's knot / log moments fall on other frames (hold_T in
  int1, hold_TR / hold_B in MAIN): the panel's open "edge-on log" item, not an integration change (det check below).
- img/S5a_hold_bottomstrip_p05_p06_MAIN_over_INT1.png: the pale crescent band at the bottom in both (P3 major, water lane, not
  in int1); int1 bottom sd 14.1-14.3 vs MAIN 11.4-11.5 (F420 15.9-18.8).
- img/S5b_pop_corners_MAIN_INT1_2x_str.png: pop dark wedge (bottom-left) and grey smudge (bottom-right) in both, same.
- img/S5c_farpeak_smudge_MAIN_INT1_3x_str.png: beige rim on the far peak during the hold in both (env J3, open) and the p06
  bottom-right smudge in both. No new artefact anywhere.

## 04:25-04:30 lane effects (tools/sheets_lanes.py; 2 x 3 grids MAIN | ENV | ICE / ORB | HOLD | INT1; ana/lane_region_stats.txt)
- env: img/S6d_env_ghost_hairline_MAIN_ENV_INT1_str.png: ghost and hairlines gone in env lane and int1 alike.
- ice: img/S6b_p05_hero_*.png: int1's arcs are the ice lane's smooth frosted arcs (no agate isolines); p05 right-arc box
  x880-1070 y150-550 Laplacian MAIN 11.10 / ENV 10.33 / ICE 6.75 / ORB 10.89 / HOLD 10.87 / INT1 6.29.
  img/S6a_q00_hero_*.png: int1's band = the ice lane's frosted band; img/S6e_q03_hero_*.png: ice outer ring (lighter, the ice
  lane's open F3) + ring D over the orb lane's orb (the report's q03 note): reads as ice in front of the orb, not a glitch.
- orb: S6a / S6b: int1's crystals = the orb lane's paler crystals; p05 orb clipped with a pale cool rim as in the orb lane;
  q00 orb box B-R MAIN +43.2 / ORB +43.4 / INT1 +45.2 (box includes ring + crystals: coarse), clip>=250 5.7 / 6.0 / 6.0 %.
- hold: img/S6c_p06_full_*.png: int1's hold framing = the hold lane's; deterministic check below.

## 04:35-04:39 batch 2 (one slot run, tools/bDet.sh)
- Deterministic qc poses (int1's detq.mjs: RAF off, frame stepping, the same sim time t=8.517 at q00 in every lab; det/*/log.txt
  show identical t / phase / camera per pose): **int1 hold-only (?p4env=0&p4ice=0&p4orb=0) vs the hold lane :5178: max 0 at q00,
  q01, q03, p05, p06** (pixel-identical incl. the ring phase in the hold); hold lane vs :5199: max 0 at the three rest poses (rest
  frames untouched), different at p05 / p06 (its hold camera: cam y 2.166 vs 2.356). int1 all-on vs hold-only: rest poses differ
  in y >= 177-215 (rings / orb / crystals / their reflection, env), p05 / p06 more (ice + orb on the open rings). ana/det_cmp.txt;
  img/det_p05_M_HOLD_HOLDONLY_INT1.png (2 x 2: MAIN, hold lane / hold-only int1, int1): the same ring phase in all four; int1 =
  frosted rings (ice) + paler crystals (orb) + the hold lane's framing. => the sweep's different knot / log frames are session
  timing, not the merge.
- Later session time (pre: settle 90 s): OFF T1 vs :5199 IDENTICAL (14 targets, 16 programs, 4/4 mid finals) -> the switch proof
  also holds away from the tested time. int1 DEFAULT on T0 phone vs :5199: DIFFERS (final, main, refraction, bloom0-3, ldr; programs
  rx-plate-baked, rx-cloud) -> the env lane changes T0 frames at other session times (the report's caveat, now measured):
  hard rule 4 says "T0 unchanged unless your task is T0". Inherited from the env lane (its judge accepted it), switchable with
  ?p4env=0; size of the change: see t0/ below.
- Console probe (tools/consoleprobe.mjs: the visitor URL without debug / tier, every console type + page errors + failed requests,
  through boot, a 40-step pointer sweep, a real 3.5 s press-hold, release, 3 s idle; phone: T0 auto + tap): **0 lines** on int1
  desktop, int1 phone, MAIN desktop, MAIN phone (ana/console.txt, console/*.json).

## 04:45 T0 at a later session time (tools/t0shot.mjs, t0ana.py -> ana/t0_late.txt; one slot run)
T0 phone (390x844, ?tier=T0, buffer 390x844), settle 90 s + 6 s + 20 frames, read back from GL: int1 DEFAULT vs :5199 max 8 levels,
78 px > 2 (of 329,160), all in x349-389 y432-436 (a short segment of the far crest at the right edge: env G1's crest occluder);
int1 ALL-OFF vs :5199 max 0. img/T0_t90_MAIN_INT1_diffx8.png (crop 3x: MAIN | int1 | diff x8): a faint line on the horizon,
invisible at 1x. => T0 is not bit-unchanged with the env lane on (rule 4), but the change is 78 px / max 8 levels; minor.

## 04:17-04:45 perf re-measure (int1's perfab.mjs, A = :5199, B = :5173, interleaved AB / BA, 6 pairs per mode, SLOT_BG=0,
## 1-min load 2.5-9.3 throughout; ana/perf_summary.txt, perf/ab_{rest,move,hold}.txt, ana/perf_rest_r2_contended.txt)
The machine was NOT quiet: p4water:perf5 ran concurrently 04:19-04:26 (my rest pairs 2-5, move pairs 0-2), then a renderer of
the user's own (non-headless) Chrome (pid 75958, parent 643, started ~04:29) kept the GPU at 93-99 % "Device Utilization"
(ioreg) until the end; frame intervals doubled on both sides (17-21 ms -> 31-38 ms). Pairs that straddle the regime change
(one run clean, one contended) are dropped; pairs with both runs in the same regime are kept.
- REST: valid pairs 1.058, 1.023 (clean), 1.054, 1.052, 1.092 (both contended) -> median 1.054 (+5.4 %); paired median of the
  run means 1.033.
- MOVE: valid pairs 1.021, 0.943, 1.064 (clean), 1.038 (contended) -> median 1.030 (+3.0 %).
- HOLD (camExpand 0.967 both): 1.047, 0.962, 1.064, 1.040, 1.099 (all contended) -> median 1.047 (+4.7 %); means 1.035.
- A second REST run (04:39-04:45, r2) was fully contended with a strong order effect (the second run of every pair ~50 ms,
  the first ~31 ms, whichever lab): pair ratios 1.68 / 0.58 / 1.74 / 0.64 ...; unusable (paired median 1.038).
- Pooled REST, the integrator's 14 clean pairs + my 5 valid pairs: n 19, median 1.036, mean 1.031.
Reading: no demonstrated > 5 % regression; my contended numbers sit higher than the integrator's clean ones (+2.0 / +1.0 / -0.7 %)
and REST / HOLD come close to the 5 % budget. Minor watch item: re-measure REST and HOLD on a quiet machine (no other GPU user)
before ship; the ice lane's per-fragment ALU is the known REST cost (+0.8..4.3 % in its own A/B).

## VERDICT (04:47)
ok = true: every switch proof holds (identP T1 / T0; identV T1 / T0 / T2 / plate / p06 / T1 at t+90 s; live negative controls),
the patch applies to a fresh aa8 clone and reproduces int1 (app/, public/, tsc 0 / 0, and a byte-identical bundle), tsc 0 / 0 in
int1, console 0 lines (visitor URL, desktop + phone, through a real hold), every lane's effect is in int1 (env ghost + hairlines
gone; ice smooth frosted arcs, lap 6.29 vs MAIN 11.10; orb paler crystals / pale clipped orb; hold lane pixel-identical in int1
at the same sim state), and the glitch hunt found no new glitch (every P3 glitch box that is still present is present in MAIN
identically). No blocker / major. Minor: T0 not bit-unchanged with the env lane on (78 px, max 8, at t+90 s); perf near the
budget under contention (re-measure quiet). Nits: the sweep has 34 frames (report says 32); the sweep's ring phases are
session-timed, so int1's knot / log moments fall on other frames than MAIN's (hold_T / pop_B here): the next panel should not
read that as a merge change (det: hold-only int1 == hold lane, max 0).
