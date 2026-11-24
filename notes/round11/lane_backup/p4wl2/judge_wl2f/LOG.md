# judge_wl2f (adversarial judge of lane wl2f, lab :5165) - 22 Nov 2026
## 19:42 start. Read p4r4_common, p4pri2_common, p4wl-water args (build/judge), p4wl2-water args.common + lanes.wl2f; builder report,
   HANDOFF, LOG. Lane source: only Water.ts differs from LANES/p4wl (sha f5156bb6, mtime 19:01; lab built 19:03:15). Chains started:
   chain1 (slot serial: own same-pose lane d1/d2, FAIR fast+reverse lane vs own GT, s60 lane, real loop T1 DPR 2 M/P/L),
   ident (light, outside slot), look (shoot_poses p00/p04/p06/p07/p08 T1+T2 base/lane, MAIN T1). Perf last (STRICT, 8 pairs).
## 19:46 same-pose stepped fast path, T1 (my own lane captures d1J / d2J; byte-identical to the builder's d1F / d2F, 120 / 120
   frames: deterministic; baselines M / P / X / G = the builder's frozen-build captures). Blips/frame (thr 12), DPR 1:
   left M 774 | P 590 | LANE 688 | px 711 | GT 325; shelf water 216 | 206 | 212 | 222 | 192; far 1101 | 990 | 1121 | 1173 | 920.
   DPR 2: left 1305 | 1075 | 1274 | 1270; shelf 345 | 329 | 346 | 340; far 1797 | 1599 | 1829 | 1906. => bar (2): shelf +10 % vs
   GT ok; left +112 % vs GT (+17 % vs p4wl); far +13 % vs :5163 (DPR 2 +14 %) and above MAIN: FAIL.
   LOOK st/c_d1_MPJ_r12.png (shelf water, frames 98-99), st/shelf_d2_M_P_J_z2.png (DPR 2): MAIN and p4wl show the crenellated
   outline re-shaping every frame; the LANE has none (soft tonal shading). Bar (1) MET at DPR 1 and 2.
   LOOK st/leftzoom_d1_P_J_G.png: NEW darker blue wedge of contrasty ripple stripes in the water below the left floe (CSS x ~70-140,
   y ~543-573), frames 99-101, not in p4wl or GT. st/pop52z_d1_P_J_G.png: NEW thin dark horizontal streak ~4 px below the floe foot
   (CSS x ~190-238, y ~553) in frames 50-53 that shrinks to a dash at 54-55 and goes: a pop in the client's area (p4wl / GT none).
   st/farnotch_d1_M_P_J_G.png: NEW detached dark bars under the far slab foot (CSS x ~1115-1180, y ~490-500) in frames 100-102.
## 19:48 FAIR fast (lane vs own 16-sample GT, popscan minpx 6): 71 events / 849 px (= builder); MAIN 63 / 748 (rejudge), gate
   69.3: FAIL (+13 %); p4wl 39 / 535. Top events sit at the left floe feet (x 98-137 y 542-549 emax 132; x 160-172 y 545 emax 142).
## 19:50 T2 same-pose fast (stepped, DPR 1): left M 621 | P 498 | LANE 595; shelf 206 | 200 | 204; far 1068 | 977 | 1118 =>
   the lane puts T2 far-water pops ABOVE MAIN again (+4.7 %; round 1's WL-J4 had fixed this). Contour gone at T2 too
   (t2/shelf_T2_M_P_J.png).
## 19:52 IDENT (id/ident_summary.txt, own run): ?wl2f=0 == :5163 and ?p4wl=0 == :5162 IDENTICAL (final, every target, every program)
   at T1, T2, T0 phone, p04 expand 0.9, p06 expand 2.97, p07 release 0.33; lane ON at T0 == :5163. Bar (6) PASS.
## 19:52 FAIR reverse (lane vs own GT): 133 events / 1757 px (= builder) vs MAIN 103 / 1427 (gate 113): FAIL (+29 %); p4wl 81 / 1241.
   Top events again at the left floe feet (x 80-159 y 537-550, emax 124-150). Together with fast: the lane makes the client's
   #1 complaint (pops at the left ice sheets' waterline in motion) worse than MAIN and much worse than its base p4wl.
## 19:53 REST (stepped rest path, T1, last frame; rest/): lane vs p4wl changes only the lake: rows < 469 max 1 level (ring box
   max 1), lake mean |d| 1.94, p99 20, max 72, signed luma -0.09. LOOK rest/rest_T1_seam_P_J.png + rest_T1_seamz_P_J.png:
   a NEW lighter blocky rectangle (4 px stair-step edges) around the mid-lake floe (CSS x ~1100-1160, y ~490-515) and
   rectangular steps at the far slab feet: the quarter-grid marker seam (per-pixel walk near footprints vs the ensemble band)
   now has visible contrast at rest; p4wl is smooth there.
## 19:54 HOLD path (stepped, T1 DPR 1, press 30 / release 330, rows 300-766; hold/): blips/frame p4wl | lane: lake hold 8010 |
   8252 (+3 %), release 7861 | 8323 (+6 %); far box hold 1408 | 1493 (+6 %), RELEASE 638 | 914 (+43 %; frames 330-332:
   3042 vs 1808 ...); left hold 1211 | 1243, release 771 | 796. Diff outside the lake: max 9 at frame 347 x 664 y 468 (the lake's
   own top edge during the release; elsewhere <= 2). LOOK hold/rel_far_P_J.png: blocky lighter rectangles around the mid-lake
   floe and at the slab feet in the lane during the release.
## 19:54 60 fps sparkle at rest (far clip, vs own DPR-2 GT; s60/s60_far.txt): farwater lane 1.5 (p4wl 1.7, MAIN 2.1 rejudge),
   lips 1.1 (p4wl 1.0, MAIN 1.1). Bar (4) PASS.
## 19:56-20:00 REAL LOOP T1 DPR 2 (rl.mjs, 1512x860 -> buffer 1890x1075, scale pinned 1, pointer circling, left box 0-420 x
   500-620, 150 frames; rl/): run 1 lane dt p50 50 ms (load 11, 4 GPU jobs) = not comparable (1852 blips/frame). Re-run back to
   back (lane2, main2) at dt p50 34 / 33 ms. dt-banded blips/frame: dt 30-37 ms MAIN 827 / 883 (two runs) | p4wl 987 | lane 924;
   dt 32-35 MAIN 745 / 907 | p4wl 924 | lane 759. MAIN's own run-to-run spread (10-20 %) is larger than any build difference:
   the real loop does not separate the builds; the same-pose stepped numbers (controlled) decide.
## 20:03 T2 rest (stepped, last frame): rows < 469 max 1 (ring box max 1), lake mean |d| 1.87 p99 19 max 80. LOOK
   rest/rest_T2_seam_P_J.png: the same lighter blocky rectangle by the mid-lake floe as at T1; near ripple stripes a little more
   contrasty than p4wl. tsc (lane, read-only): hero exit 0, app exit 0. Console: 0 errors / warnings in every lane capture
   (st d1 / d2, FAIR fast / reverse, hold, T2).
## 20:08 PERF T1 pointer sweep (perfab STRICT=1 SLOT_BG=0, 1440x766, A = :5162, B = :5165, gate 60 s, deadline 13 min;
   perf/sweep.txt): every run had other lanes' captures on the slots (no STRICT-valid pair possible in the time box).
   Pairs (A | B ms): 0: 19.9 | 45.2 (B beside fair-fast-gt + poses + rl2), 1: 21.0 | 21.5 (1.024), 2: 20.1 | 63.7 (B beside
   rl + s60), 3: 20.0 | 20.3 (1.015, only one capture beside). The two B blow-ups happened beside GPU captures; A runs beside
   similar jobs (fair-reverse-gt) stayed 20-21 ms: unattributed, needs a STRICT re-run. Clean-ish pairs: ~+2 % (builder's
   8 non-strict pairs: 1.021). T0: lane ON is ident-identical to :5163 (same programs and targets) => no T0 cost.
## VERDICT 20:10: pass = false (1 blocker, 3 major, 1 minor open). Images: MAIN/notes/round11/lane_backup/p4wl2/judge_wl2f/img/.
- MET: bar (1) the morphing contour is GONE in the lane at T1 DPR 1 and 2 and at T2 (c_d1_MPJ_r12, shelf_d2_M_P_J_z2,
  shelf_T2_M_P_J: MAIN / p4wl crenellated outlines re-shape each frame; lane soft like the GT). Shelf box 212 vs GT 192 (+10 %).
  (4) sparkle, (6) ident, (7) rings <= 1 level / T0 identical / tsc 0 0 / 0 console errors: PASS.
- WL2F-J1 BLOCKER: FAIR (lane vs own GT) fast 71 / 849 vs MAIN 63 / 748 (+13 %, gate +10 %), reverse 133 / 1757 vs 103 / 1427
  (+29 %); vs base p4wl 39 / 81 events (+82 % / +64 %); builder's slow / medium / diag / leave +33-59 % vs MAIN. Top events at
  the left floe feet (x 80-172, y 537-557, emax 124-150) = the client's 'flicker tulil' spot: the default makes the client's
  #1 complaint worse than what the client sees today.
- WL2F-J2 MAJOR: new artifacts at the left floes: a thin dark streak ~4 px below the floe foot (x ~190-238, y ~553) that
  changes length frame to frame (50-55) and vanishes (pop52z_d1_P_J_G; DPR 2 a shorter dash, pop52_d2_M_P_F); a darker
  wedge of contrasty ripple stripes below the left floe (x ~70-140, y ~543-573; leftzoom_d1_P_J_G). Left box 688 vs p4wl 590
  (+17 %), DPR 2 1274 vs 1075 (+19 %), T2 595 vs 498 (+19 %); bar (2) <= GT + 15 % (374) FAIL.
- WL2F-J3 MAJOR: far slabs worse: far box 1121 vs :5163 990 (+13 %) / DPR 2 1829 vs 1599 (+14 %), above MAIN at T1 (1101 /
  1797) and T2 (1118 vs 1068: undoes round 1's WL-J4 fix); hold release far 914 vs 638 (+43 %). Detached dark bars under the
  far slab foot (x ~1115-1180, y ~490-500) in frames 100-102 (farnotch_d1_M_P_J_G) = the 'bibir air' spot. Bar (2) FAIL.
- WL2F-J4 MAJOR (regression): the quarter-grid marker seam becomes visible at rest: a lighter block with 4 px stair-step
  edges around the mid-lake floe (x ~1100-1160, y ~490-515) and steps at the far slab feet, T1 and T2 (rest_T1_seam_P_J,
  rest_T1_seamz_P_J, rest_T2_seam_P_J); p4wl smooth; also in the release (rel_far_P_J).
- WL2F-J5 MINOR: bar (3) perf not proven (0 STRICT pairs; clean-ish pairs +1.5 / +2.4 %; two lane runs 45 / 64 ms beside GPU
  captures, unattributed).
- Real loop T1 DPR 2 (dt-banded): not separable (MAIN's own run-to-run spread 10-20 % > build differences).
- Scores (MAIN | lane): glitch_cursor_orbit 7.0 | 6.9, environment 7.8 | 7.7, glitch_hold_sweep 7.7 | 7.6, awwwards_jury 7.6 | 7.5.
- For the integrator (rule c): the lane is the one whose contour is gone, but its default must not merge as is; the cause
  is the +-3 sigma, sign-correlated 4-sample bump jitter (the builder's own diagnosis): try a physical +-1 sigma ensemble
  with a lake-anchored (not screen-anchored) pattern, then re-run FAIR on all six paths and the left / far same-pose boxes.
## 20:11 PERF final (deadline): pair 4: A 19.1 (low mode) | B 20.1 (B alone) = 1.052. Ratios of the 3 pairs without a
   blow-up: 1.024, 1.015, 1.052 (median 1.024); 2 lane runs at 45.2 / 63.7 ms beside GPU captures. 0 of 5 STRICT-valid.
   Bar (3) stays NOT PROVEN (WL2F-J5 minor). Captures analysed and deleted (WORK 65 MB); evidence mirrored to MAIN.
