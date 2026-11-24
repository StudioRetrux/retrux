# wl3a HANDOFF (water round 3, lane wl3a = complaint 1), 23 Nov 2026 03:49-05:10 WIB
Lab :5169 (left running for the judge; served main.js sha256 9becab9a...). Lane LANES/wl3a = APFS clone of LANES/wl2 (frozen base, :5167).
WORK $SP/work_p4/wl3a (LOG.md has every number); mirror MAIN/notes/round11/lane_backup/p4wl3/wl3a/ (LOG, HANDOFF, patch, tools/, img/, tables).

## VERDICT: ok = false
Complaint 1 (the left water popping more than MAIN while the camera moves) is FIXED at its root cause in the same-pose test at the
real loop's step, and in the real loop at T1 DPR 2 (the client's Mac) the lane pops LESS than MAIN. The contour stays stable, and the hard
stepped outline (WL2-FJ5) is mostly gone. ok = false because three items are not met:
1. Goal "the stepped far box <= :5163 again": NOT met. 1715 vs 1599 at DPR 2 and 1060 vs 990 at DPR 1 (+7 %, the same as wl2, still below
   MAIN). The excess is WL2FJ's band-limited mu itself, and the real-loop left water needs it: no WL2FJ_Q meets both (table below).
2. BAR (4) perf: NOT MEASURED. 0 STRICT pairs were valid in the time box, because lane wl3b's gate chain held slots during every run.
3. BAR (1) at T2 is not proven: the real loop at T2 looked worse at the 50 ms dt clamp, which is a confound (see below). The same-pose T2 test and
   the gap-matched real loop both show it at or below MAIN. Also, every lane T2 run had a 3-4 ms longer real frame gap (cost or load: open).

## ROOT CAUSE (bisected same-pose, not guessed)
Instrument: tools/capdt.mjs = cap.mjs stepping the engine at the real loop's step (dt 1/30) on rl.mjs's pointer circle, T1 DPR 2
1512x860 (canvas 1890x1075), 150 frames, CSS 0-480 x 440-620. Same poses for every build, so differences are the builds' only. It
reproduces the real loop: left water (CSS 0-160) blips/frame MAIN 340 | wl2 394 (+16 %) | wl2fj=0 530 (the round-2 FJ1 level).
- `?wlwalk=q` (MAIN's read) = 340 = MAIN: P4WL_BAND's read is still the whole cause.
- The share's mu is NOT the cause any more: WL2FJ_Q 8 / 16 -> 395 / 396; a flat (unbumped) mu -> 396; widening sE by the four taps'
  horizon disagreement (k 0.5-2) -> 394-396.
- The excess sat in the near open water at the bottom left (CSS y 575-620, x 0-100: MAIN 146 | wl2 202), where the band walk's taps
  held NO face: P4WL_BAND's walk pass walks with the flat normal and records a face only where its share of the FLAT reflection
  exceeds 0.002 (lkWalkTerm's gate). The low floes in front of that water sit far below the flat reflection, so the taps said
  "no face" while the pixel's own rays (rippled, wide spread) reach them; those rays went to the remainder (lkReflect4's strata,
  looked up with the pixel's full-resolution normal). MAIN's quarter walk used the bumped normal, so its taps recorded those faces.
  Walk gate 0 -> 364 (zone 202 -> 179).
- Two smaller parts of the same read: the marked taps' per-pixel walk used the pixel's own normal / spread (FJ1's temporal aliasing
  along every waterline; with WL2FJ's band-limited wlN4 / wlSig4: 346, shelf 251 -> 215); the read's spread from WL2FJ's widened
  wlSig4 (the pixel's own spread lkSig: 332).
- Final: left 332 (MAIN 340, wl2 394), shelf 213 (252, 251), right 600 (601, 607), whole region 1146 (1192, 1252).

## THE FIX (file: retrux-web/app/hero/engine/world/Water.ts ONLY; no asset, no new pass, IceMaterial untouched)
- (W) wl3aWalkFrag: in the walk pass ONLY, lkWalkTerm's share gate `share > 0.002` -> `share > 0.0` (every face that rises above the
  horizon ray is recorded with its colour and horizon; the read's own Phi gives the pixel's share). `?wl3aw=0` off.
- (E) wl3aReadEdits: P4WL_BAND's marked-tap fallback walks with wlN4 / wlSig4 (WL2FJ's band-limited normal / spread). `?wl3ae=0` off.
- (S) the WL2FJ call takes S = 0 (the read's spread = the pixel's own lkSig, = `?wl2fjs=0`); WL2FJ's band-limited mu kept. `?wl3as=0` off.
- `?wl3a=0` = wl2 exactly (no shader text change). wl3a needs WL2FJ (its edits sit on WL2FJ's text): with `?wl2fj=0` none applies.
- Hunks: one new block after wl2fjEdits (wl3aOn / wl3aReadEdits / wl3aWalkFrag), 7 lines at the WL2FJ call, the walk material's
  fragmentShader line, one class field (wl3aWalk). No HeroEngine / LakeMirror / LakeSchedule / RenderPipeline change.
- Patch vs LANES/wl2/retrux-web/app: WORK/wl3a_vs_wl2.patch (Water.ts only). Lane wl3b owns the far columns / lips: no overlap
  expected (wl3a touches P4WL_BAND's read / the walk pass gate / the WL2FJ call).

## THE BAR on the final build
(1) Complaint 1, left water CSS 0-160 (and the region CSS 0-480 x 440-620), blips / frame (thr 12, 3-frame sign flip):
  - same pose, dt 1/30, rl's circle, T1 DPR 2 (st/c30_*): MAIN 340 | wl2 394 | lane 332; region 1192 | 1252 | 1146. T2 DPR 2: 483 | 521 | 432;
    region 1832 | 1878 | 1736 (right box 928 | 950 | 950 = wl2's, pre-existing).
  - real loop T1 DPR 2 (rl.mjs 1512x860, canvas 1890x1075, alternating M / L; lane wl3b ran real loops at the same time, so 7 of 8 runs sat at
    the 50 ms dt clamp): dt 28-34 pooled n 266 | 177: left 312 | 241, shelf 220 | 154, right 615 | 589; dt-matched (1-ms bins, both n >= 10)
    left -37 % (MAIN weights) / -19 % (lane weights), shelf -40 % / -23 %, right -6 % / -5 %. dt 50 band (n 519 | 454): left 622 | 568 (-9 %),
    shelf -9 %, right +1 %. (rl/e2_28-34.txt, e2_45-51.txt)
  - real loop T1 DPR 1 (n 260 | 349, dt 21-28): dt-matched left -8 % / +0 %, shelf -20 % / -20 %, right +1 % / +7 % (rl/e1_21-28.txt).
  - real loop T2 DPR 2: at dt 45-51, left +2 %, shelf +9 to +14 %, right +15 to +18 %. CONFOUNDED: dt clamps at 50 ms while the pointer moves in
    real time, and the lane's real gaps were longer. Matched on the REAL frame gap (40-70 ms): left -12 % / +2 % (lane-weighted n 72), shelf
    -12 % / +1 %, right -2 % / 0 % (rl/t2_gap40-70.txt).
  - contour (img/contour_d2_MAIN_WL2_LANE_x3.png, contour_d1_MAIN_WL2_LANE_GT_x4.png, stepped fast path frames 98-101 + diffs): MAIN
    redraws the dark teeth every frame; wl2 keeps one hard stepped blob that slides; the lane's dark stepped blob is mostly gone. What is
    left is a faint, stable outline with thin diffs, like the GT row. STABLE (and softer: WL2-FJ5 better).
(2) Stepped boxes (cap.mjs fast path 120 fr, thr 12), MAIN | :5163 | wl2 | lane | GT:
  DPR 2 left 1305 | 1075 | 1262 | 1216 | 761; shelf 345 | 329 | 342 | 344 | 312; far 1797 | 1599 | 1729 | 1715 | 1596.
  DPR 1 left 774 | 590 | 760 | 725 | 325; shelf 216 | 206 | 212 | 210 | 192; far 1101 | 990 | 1065 | 1060 | 920.
  WL2FJ_Q sweep on the lane (c30 left at T1 DPR 2 / stepped far DPR 2): Q 4 (default) 332 / 1715; Q 2 349 / 1625; Q 1.5 388 / 1607.
  => the far box cannot get back to <= :5163 with this share; `?wl2fjq=2` is a compromise for the lead (c30 left +2.6 % over MAIN).
(3) not this lane's item (wl3b owns the lips).
(4) perf: NOT MEASURED. 0 of 3 pairs were valid (perf/sweep.txt; the invalid pairs gave B/A 1.179 and 0.946 under other lanes' load). I stopped the
  job at 05:05 because lane wl3b's own STRICT perf comes next, and two STRICT jobs invalidate each other.
(5) 60 fps sparkle (shoot_ripple 40 fr dt 1/60 T1 rest, blips / frame), MAIN | wl2 | lane: far water 2.0 | 1.9 | 1.7, lips 1.2 | 1.1 | 1.1,
  left water 2.1 | 2.2 | 2.2, shelf water 0.2 | 0.3 | 0.4 (max 3 / frame; i.e. 16 vs 8 blip-pixels in 40 frames); mean |dL| lowest for
  the lane in every box (s60/s60.txt). The shelf's +0.2 / frame is at noise level, but it is above MAIN: flag for the judge.
  FAIR, lane vs its own 16-sample 2x GT (events >= 6 px / px in them; MAIN vs its own GT from round 2): slow 41 / 296 (MAIN 41 / 293),
  medium 49 / 589 (73 / 910), fast 39 / 488 (63 / 748), diag 30 / 422 (39 / 527), reverse 68 / 968 (103 / 1427), leave 41 / 476 (52 / 645):
  PASS on all six (<= MAIN + 10 %). Slow is at MAIN's level again (wl2 had 31 / 217).
(6) ident (id/ident_summary.txt; final image + every target + every linked program, 20 moving frames): `?wl3a=0` == :5167 IDENTICAL at T1,
  T2, T0 phone, p04 (expand 0.9), p06 (expand 2.97), p07 (release 0.33); `?p4wl=0` == :5162 IDENTICAL at the same six; lane ON == :5162
  at T0 phone (T0 has no walk); control lane ON vs :5167 at T1 DIFFERS (program rx-water only; walk / main / post targets). 0 console
  logs in every ident run, 0 errors in every capture log.
(7) Ice rings unchanged: IceMaterial untouched; rest frames above y 430: lane vs MAIN max 1 level, lane vs wl2 no pixel > 2 levels (only the
  water differs: lane vs wl2 px > 8: 6133, max 77, T1; img/rest_T1_wl2_lane_absdiff_x8.png). T0 identical to MAIN. tsc: tsconfig.hero.json and tsconfig.json (--incremental false)
  exit 0 on the final source; that source builds to the served main.js byte for byte (sha256 9becab9a).

## CLIENT FILES (MAIN/notes/round11/refs_user/wl3_wl3a_*), looked at
- wl3_wl3a_T1dpr2_realstep_MAIN_left_LANE_right.mp4: 150 frames of the same-pose capture at the real loop's step (dt 1/30, so it plays at real
  speed at 30 fps), T1 DPR 2, CSS 0-560 x 440-620, MAIN left, lane right.
- wl3_wl3a_T1dpr2_realstep_nearwater_x2_rows_MAIN_WL2_LANE.jpg: CSS 0-120 of the band, frames 34-37 (a burst of the circle), then the
  frame diffs x6. wl2's near open-water diffs are brighter and larger than MAIN's; the lane's are MAIN-like or calmer.
- wl3_wl3a_contour_T1dpr1_x4_rows_MAIN_WL2_LANE_GT.jpg and wl3_wl3a_contour_T1dpr2_x3_rows_MAIN_WL2_LANE.jpg: the shelf contour (item 1).
- wl3_wl3a_rest_T{1,2}_REF_MAIN_LANE_left_{1x,2x}.jpg, wl3_wl3a_rest_T1_REF_MAIN_LANE_far_1x.jpg: at rest the lane looks like MAIN
  (looked at T1 left 1x / 2x).

## OPEN / for the lead
- Far stepped box +7 % vs :5163 (= wl2, below MAIN): a design decision. The real loop's left water needs WL2FJ's band-limited mu at Q 4.
  Q 2 trades +2.6 % on the left water (same pose) for +1.6 % on the far box.
- Perf: run the STRICT A/B (>= 8 pairs, T1 sweep and the DPR 2 client config) on a quiet machine. (W) records more faces in the quarter
  walk pass (one textureGrad per face, at most 4 faces), so the walk pass can cost a little more. The T2 real-loop gaps (+3-4 ms) need that check.
- 60 fps shelf water 0.4 vs MAIN 0.2 blips / frame (noise level, flagged).
- Sub-switch contributions (same pose, dt 1/30, T1 DPR 2, left / shelf): W 364 / 252, W+E 346 / 215, W+E+S 332 / 213 (wl2 394 / 251).
- Lab files kept in WORK/tools: capdt.mjs (same-pose capture at any dt, circle path), capa.py / pf.py / zone.py / heatrow.py (the
  bisection), rla.py / rlagap.py (real loop, dt- or gap-matched), contour.py, strip.py, crop3.py, farbox.py.
