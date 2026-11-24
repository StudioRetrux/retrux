# p4atmos LOG (P4 round 3, lane 'atmos', builder)

## 21 Nov 2026 05:03 WIB - start
- Read the binding brief p4r3_common.md; plan Q5 + Q14 (r11_1_plan.json); panel environment items 1, 3, 6 and color_grade item 1;
  handoff_atmos.md.
- LANES/p4atmos = cp -c -R LANES/int1 (app/ identical to int1). Lab :5178. WORK = $SP/work_p4/p4atmos.

## 05:18 - baseline + first build
- Baseline captures (cap.mjs: engine RAF off, frame stepping, handheld off): caps/base_rest (t 3.4 / 4.6 / 5.4 / 7.4 / 9.4 / 8.7 /
  11.8 / 13.3 = F000 / F036 / L015 / L030 / L045 / F160 / F252 / F297), caps/base_hold (p04, p05, p06, release 0.15 / 0.33 /
  0.57 / 0.9 / 1.4 / 2.2). Box stats an/base_boxes.txt (tools/boxes.py). Rest-framed reference frames: F000, L015, L030, L045,
  F297 (F036 / F160 / F252 are other framings).
- Findings: berg_base (x950-1150 y420-455) engine 127/116/140/131/97 vs ref 148/127/124/143/116 (F000/L015/L030/L045/F297), lap
  7.4 vs 2.2. Row profile x1000-1150: ref lifts rows 408-450 to 139-150 under a soft top near row 405 (F000, L045); F297 thin
  phase: only rows 438-456 lifted (+15..+20). The handoff's berg_foot box matched only because its right part (x1150-1240) is
  +20 too bright while its left part is -25 (they cancel).
- far_rangeR / x1250-1300 band: engine +8..+20 BRIGHTER than ref: the plan's "aerial perspective toward the horizon sky colour"
  would move it further away from the reference -> not built (documented).
- Stripe: ablation caps/stripe (t 13.3 / 9.4): the hard band across the massif = the HAZE_VEIL's top (full density up to its
  white-blue top at 10-12.3 m); uAtmosHaze.x = 0 removes it.
- Left base at matched misty times (L045 t9.4, F297 t13.3): engine darker and greyer (139,154,176 vs 151,168,193); the panel's
  "+14,+9,+2 too grey" compared a misty q00 (t ~11-13) with the clear F000.
- Built p4atmos.ts (flags, uniforms, GLSL splices) + PlateEnvironment hunks; tsc hero 0.

## 05:20-05:43 - tuning (all captures caps/*, sheets an/*; box tables an/*_boxes.txt)
- v1 (WL amount 0.62 over x > 4 m): berg_base overshoot +13..+47; veil reshaped (fall 5 m, top -2.2 m): stripe gone but the face
  darker. Veil sweep caps/veil (V0 = MAIN's profile reproduces MAIN's boxes; V1-V3): picked V2 = fall 3.0 m, top -0.5 m, wisp
  feather 1.6 m, shade top -0.5 m (an/veil_sweep.png: no level stripe, gradual build-up; mtn_upper -2..-4 vs MAIN's +-1).
- WL sweeps caps/wl, caps/wl2: right edge 18.5 m (the berg's right end stays dark as in F000/L045), amount 0.30 cap 0.40, top
  1.0 / 2.0 m (thin / thick envelope): berg_base mean |dL| 15.8 -> 9.9, berg_foot 4.6 -> 9.5 (MAIN's 4.6 was a cancellation of
  its left -25 and right +20 halves), L030 stays an outlier (+32: the reference's mist drifts to the right part there).
- Bank (hold): v2/v3 billow +-0.1 invisible (value-noise fBm sd ~0.2) -> v4 contrast-stretched puffs + lumpy top -> v5 top
  2.5 m lower: p06 x120-320 rows 440-480 126/132 (F420 123/119, MAIN 133/143), rows 480-520 sd 15-17 (F420 18-23, MAIN 8).
- Ridge fog sweep caps/ridge: 0.55/0.25 -> ridge +16 -> +14 (mean |d| 13.3 -> 11.4).
- Left blue shift (uP4Blue 0.94/0.99/1.10 on the bases' haze): left_hzn sat 0.25 -> 0.28-0.29 (ref 0.29-0.30), ridge_base sat
  0.34 -> 0.38-0.39 (ref 0.45-0.49).
- Berg-top gain tried (x0.88 / x0.5 on the bright berg faces): no measurable effect on berg_top (its bright top is outside the
  berg mask's depth band); removed.
- Release split done in the shader (uHold / uFogHold above 2-4 m), no Choreography.ts change.
- T0: environment hunks gated off (PlateEnvironment takes the tier; HeroEngine passes it: 1 hunk); the bank billows in the shared
  plate/water chunk stay on all tiers (only while the hold's fog is up).

## 05:43 code frozen; 05:44-05:55 ident (an/ident_A.txt, ident_B.txt, ident_C.txt)
- ident (identP, 20 moving frames, final + every target + every program): ?p4atmos=0 vs :5173 IDENTICAL at T1 / T2 / T0 phone /
  envlake=plate / p04 / p06 / p07 / p08; all four sub-switches off IDENTICAL (T1, p06); lane on: T1 / p06 differ (main, refraction,
  bloom, final; rx-plate-baked, rx-water*), T0 phone final + all 9 targets SAME (programs differ in text only). 0 console messages.
- patch: p4atmos_vs_int1.patch 324 lines (HeroEngine.ts 1 hunk, PlateEnvironment.ts 8 hunks, new p4atmos.ts); apply test on a fresh
  int1 app/ clone: dry run rc 0, apply rc 0, 0 .orig/.rej, app/ == lane app/ (an/applytest.txt).
- release sequence (an/release_seq.txt / .png): left patch x0-200 y300-380 MAIN / lane: 0.33 s 142 / 131 (F453 130), 0.57 s 123 / 99
  (F460 96), 0.9 s 120 / 97, 1.4 s 109 / 96, 2.2 s 97 / 94: monotonic, no pop; the low bank stays.

## 06:06-06:12 perf rest (perf/ab_rest.txt, an/perf_rest.txt)
- 6 pairs: paired median ratio med 0.993 / mean 0.995 (B lane / A :5173), but 4 of 6 pairs ran at 1-min load 10-26 (other lanes'
  jobs); the 2 clean pairs 0.965 / 1.188 (noise). Re-run (RUN=_r2, hold + rest) queued with the load gate.

## 06:18-06:30 perf run 2 (perf/ab_hold_r2.txt, ab_rest_r2.txt; an/perf_hold_r2.txt, perf_rest_r2.txt)
- HOLD 6 pairs: paired median ratio med 1.020 / mean 1.008 (4 pairs at load < 10: 0.985 / 0.980).
- REST run 2: all 6 pairs at load 10-50 (other lanes): 0.938 / 0.918, not evidence. Rest evidence = run 1 (0.993 / 0.995, 2 clean
  pairs) + the code's cost (waterline mist on ~1.7 % of the frame at F000: 2 extra 2-octave noises there; tools/area.py).

## 06:30 qc_r11.zsh -> qc_final (T1 1)
- 06:30-06:33 qc_final done (exit 0, 0 errors in qc / ptr / sweep logs). region_stats_q00 vs MAIN r11_2: mid left 6,2,-3 -> 2,1,0; all
  other boxes within 1-2 (crystals / clouds of the uncontrolled time). q00 berg base 77,108,149 -> 101,126,158 (F000 129,151,178),
  lap 7.4 -> 4.8; q00 is in the reference's thin berg-mist phase (rows 408-432 ~100-108, like S297's 99-101). Sheets:
  an/qc_q00_main_lane_ref.png, an/qc_hold_tri.png, an/qc_ptr.png, an/qc_sweep_small.jpg: nothing broken, no seam / double / hole.
- 06:35 final rest series on the final build (caps/final_rest, an/final_boxes.txt): same means as v6 (berg_base 15.8 -> 10.1,
  ridge 13.3 -> 11.4); saturation left_hzn 0.25 -> 0.29 (ref 0.30), ridge_base 0.34 -> 0.39 (ref 0.45).
- tsc hero 0 / app 0 (re-run 06:34); patch unchanged since the code freeze (sha256 dfcd9cba...).
- perf rest run 3 queued behind the load gate (another lane's perf holder, load ~10.5).
- 06:36 the harness p06 (qc_final) showed the bank's body rows 500-540 darker than F420 (137 / 148 vs 153 / 166). 06:37 tried the bank
  top +0.8 m (caps/v7_hold): deterministic p06 rows 440-560 |d| vs F420 6.7 (v6) -> 8.0 (v7) (MAIN 9.5): the two poses disagree (the
  top rides MAIN's time-dependent fBm) -> REVERTED at 06:37:57; patch sha256 back to dfcd9cba... (== the code the ident / perf / qc_final
  ran on); tsc hero 0 / app 0; lab rebuilt 06:38:04 from the final source, serving :5178.
- perf rest run 3: waited 06:33-06:37 behind the load gate (another lane's perf, load 8.7-10.6); stopped for the time box.

## 06:40 done: HANDOFF.md in LANES/p4atmos; patch WORK/p4atmos_vs_int1.patch; everything mirrored to
## MAIN/notes/round11/lane_backup/p4r3/p4atmos/. Lab :5178 left running for the judge.
