# judge_wl3a LOG (round 3 water, independent judge of lane wl3a :5169; base wl2 :5167, MAIN water :5162)
- 05:06 start. Read p4r4_common, p4pri2_common, p4wl / p4wl2 / p4wl3 args (common + wl3a judge), builder report + LOG, the patch (73 lines,
  Water.ts only; `diff -rq` app/ wl2 vs wl3a: Water.ts only). Served main.js: :5169 9becab9a (= builder's final), :5167 7bed38e9, :5162 445b1f6c.
- 05:09 chains started, then PAUSED 05:10 by me (my jobs invalidated wl3b's STRICT perf pair 2); relaunched 05:15:17 after wl3b's perf (8/8).
- 05:15 tsc in LANES/wl3a/retrux-web: hero + app configs exit 0 (mine).
- 05:16 ident (mine, identP medium 20 frames): wl3a=0 vs :5167 T1 IDENTICAL (final, 14 targets, 16 programs, 0 logs); p4wl=0 vs :5162 T1 IDENTICAL.
- 05:12 far columns, builder's rest caps (cols.py 900 1440 498 640 6; calibrated: REF 82 / 22.3, MAIN 50 / 16.2 = the BAR's numbers):
  T1 len med MAIN 50 | wl2 48 | lane 41; the x~1334 column 67 | 67 | 44 (lane: rows ~526-558 2-6 luma lower, E 6.9 -> 3.2 at row 542);
  x~1207 67 (wl2) = 67 (lane). T2: lane == wl2 (57 / 13.3). To confirm on my own rest capture.
- 05:18 ident (mine, id/ident_summary.txt): wl3a=0 vs :5167 IDENTICAL at T1, T2, p06 (expand 2.97); p4wl=0 vs :5162 T1 IDENTICAL; lane ON vs
  :5162 T0 phone IDENTICAL; control lane ON vs :5167 T1 DIFFERS (rx-water + rx-water-walk programs only). PASS.
- 05:18 real loop T1 DPR 2 (mine; rl.mjs 1512x860, M L M L M L alternated, 150 fr each, CSS 0-480 x 440-620; tables/rl_a2_T1dpr2.txt):
  per run left water MAIN 402 / 384 / 440 | lane 403* / 358 / 390 (*L1 overlapped a duplicate run of mine for ~15 s, gap p90 70 ms).
  dt-matched 1-ms bins (n 384 | 398): left -22 % (MAIN weights) / -23 % (lane weights); region -12 % / -12 %; near water -22 / -26 %;
  on the real gap: left -21 / -27 %. Without L1: left -14 / -22 %, region -9 / -12 %. Pooled dt 28-38: left 401 (n 413) | 346 (n 341),
  lane dt mean higher (35.4 vs 34.2). => complaint 1 at T1 DPR 2: lane BELOW MAIN. LOOKED img/rl_T1dpr2_left_MAIN2_LANE2_MAIN3_LANE3_x2.png:
  no blocky shapes in either; the lane's open-water diffs are calmer than MAIN's in run 3, similar in run 2.
- 05:19 far columns on MY rest caps T1 (cols.py): MAIN 50 | wl2 48 | lane 41 (median len); x~1334 column 67 | 67 | 44. Sub-switches:
  ?wl3aw=0 -> 67 (len med 48 = wl2); ?wl3ae=0 -> 44; ?wl3as=0 -> 44. => part (W) (walk-pass share gate 0) shortens the far column.
  LOOKED img/far1300-1390_T1rest_MAIN_WL2_LANE_LANEw0_x5_row2stretch182-210.png: stretched, the column under the left small slab fades
  ~1/3 earlier in the lane than in MAIN / wl2 / lane_w0; plain colour: barely visible (2-6 luma levels in its lower half).
- 05:21 same-pose dt 1/30 (capdt circle, T1 DPR 2 1512x860, 150 fr; tables/st_c30_blips.txt), MAIN | wl2 | lane | px (lane ?wlwalk=px&lkmeach=1,
  same res, NOT a 2x GT): left 340 | 394 | 332 | 586; region 1192 | 1252 | 1146 | 1494; right 852 | 858 | 814; near water (0-100 x 575-620)
  198 | 261 | 215 (lane +9 % vs MAIN in that sub-box). = builder's numbers exactly. LOOKED img/st_contour_T1dpr2_c30_..._MAIN_WL2_LANE_GTpx_x3_f40.png
  (luma-stretched, frames 40-43 + diffs x6): no reshaping blob in any row; lane's open-water diffs = MAIN / wl2 or calmer; nothing new.
- 05:22 real loop T2 DPR 2 (M L M L; tables/rl_t2_T2dpr2.txt): both builds near the 50 ms clamp. Engine-dt matched (n 183 | 240): left +1 % /
  -6 %, region +4 % / -2 %, shelf 18 -> 22 (+21-24 %, small counts). => T2 ~ MAIN, not shown better. EVERY lane T2 run slower: real gap p50
  M 47.0 / 45.3 vs L 49.7 / 49.2 ms (means 54.7 / 45.1 vs 61.3 / 58.5); same as the builder saw (+3-4 ms).
- 05:23 real loop T1 DPR 1 (a1 M L M L 150 fr + a1b 300 fr; 2 a1b runs hit the 50 ms clamp: judge_wl3b's chain + my FAIR GT ran beside):
  MAIN runs at ~25 ms: left 87 / 172 (2x apart: 150 fr < 1 pointer revolution at 25 ms, phase coverage differs); lane at ~27 ms: 131 / 105 / 147.
  dt-matched left +0 % / +17 %, real-gap matched -10 % / +27 %: INCONCLUSIVE; same-pose DPR 1 capture queued (deterministic).
- Frame time in the real loops (all alternated, same configs): every lane run slower than every MAIN run: T1 DPR 2 dt p50 M 34.3 / 33.6 / 33.4
  vs L 35.8* / 34.7 / 35.9; T1 DPR 1 M 25.1 / 25.6 vs L 26.8 / 26.6 / 27.2; T2 M 47.0 / 45.2 vs L 49.5 / 49.3 (clamped). ~+4-7 % at T1.
- 05:25 same-pose T1 DPR 1 (capdt circle dt 0.025 = the DPR 1 real loop's step, 1512x860, 150 fr; tables/st_d1_blips.txt), MAIN | lane:
  left 105 | 107 (+2 %), region 469 | 461 (-2 %), right 365 | 354, near water 68 | 78 (+15 %). With the real loop (all 8 runs, dt-matched
  left +1 % / +1 %, real-gap -7 % / -3 %; tables/rl_a1_T1dpr1_all.txt): T1 DPR 1 = MAIN's level (wl2 was +10-20 % in round 2).
- 05:25 FAIR fast (lane vs its own 16-sample 2x GT, popscan minpx 6): 39 events / 488 px (= builder's); MAIN's own 63 / 748. PASS.
- 05:25-05:27 perf A/B (perfab T1 sweep, A :5162 / B :5169, non-STRICT): pair 0 A 43.4 ms (beside judge_wl3b's real loop + my FAIR 2x GT) vs
  B 21.0 ms; pair 1 B 20.8. Load 10-12 the whole time: no valid pair possible (the parallel judge's chain + mine). STOPPED by me at 05:27 so
  judge_wl3b's own STRICT perf can run. BAR (4) NOT MEASURED by me either. Proxy (alternated real-loop runs, same configs, tables above):
  every lane run slower than every MAIN run: T1 DPR 2 +1.1..+2.5 ms (+3-7 %), T1 DPR 1 +1.0..+2.1 ms (+4-8 %), T2 +2.3..+4.3 ms (+5-9 %, clamped).
- 05:28 chain S cut short (hold of MAIN dropped): FAIR reverse popscan, s60 (MAIN, lane), hold path wl2 vs lane (330 fr) via chainS2.
- 05:29 FAIR reverse (lane vs own 16-sample 2x GT): 68 events / 968 px (= builder's); MAIN's own 103 / 1427. PASS (fast + reverse). Captures deleted.
- 05:30 60 fps sparkle (shoot_ripple 40 fr dt 1/60 T1 rest; tables/s60.txt), blips/frame MAIN | lane: far water 2.0 | 1.6, lips 1.1 | 1.1,
  left water 2.0 | 2.2, shelf water 0.3 | 0.3 (max 6 / 6). = MAIN within noise: PASS.
- 05:32 hold path (cap.mjs --path hold, press at capture frame 0, release at 300, T1 1440x766, lake rows 380-766; tables/hold_wl2_lane.txt):
  blips/frame wl2 | lane: hold L 1519 | 1511, C 3991 | 3988, R 1530 | 1530; release L 11332 | 11269, C 12592 | 12567, R 14190 | 14200 (=).
  Per-frame lane vs wl2: <= 80 px > 16 levels during the hold (789 at the press frame), mean |d| 0.13. LOOKED img/hold_f000_WL2_LANE_dx8_x2_*.png:
  same look; diffs = ripple speckle + a thin lip line. Hold / release = wl2: no new glitch.
- 05:33 judge_wl3b's STRICT perf running: I run nothing more (a perf of mine now would invalidate theirs and be invalid itself).
## 05:34 VERDICT pass = false.
  Complaint 1 (the deciding test, T1 DPR 2 real loop): lane BELOW MAIN (left -14..-23 %, region -9..-12 % dt-matched; same pose 332 vs 340),
  i.e. round 2's residual (+10 %) is gone; T1 DPR 1 and T2 at MAIN's level (+-7 %); contour stable, softer. FAIR fast / reverse, s60, ident,
  tsc, T0, ice, hold: pass.
  OPEN: J1 major (regression): part (W) shortens the far slab column at x~1334 at T1 rest (cols.py 67 -> 44 px; far median 48 -> 41, MAIN 50,
  REF 82), ?wl3aw=0 restores it. J2 major: BAR (4) perf unproven (no valid STRICT pair by the builder or me) and the alternated real loops
  point to a cost (+3-7 % T1 frame time, +5-9 % T2). J3 minor (carried): stepped far box goal (<= :5163) not met (= wl2). J4 nit: near-water
  sub-box (0-100 x 575-620) still above MAIN same-pose (DPR 2 +9 %, DPR 1 +15 %) though the full left box is at / below MAIN.
  Scores (MAIN | lane): glitch_cursor_orbit 7.0 | 7.2, environment 7.8 | 7.7, glitch_hold_sweep 7.7 | 7.7, awwwards_jury 7.6 | 7.6.
