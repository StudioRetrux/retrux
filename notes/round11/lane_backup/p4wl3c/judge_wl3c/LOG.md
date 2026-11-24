# judge_wl3c LOG (independent judge of the complaint-1 release candidate LANES/wl3a after fix3c, lab :5169; MAIN water :5162; wl2 :5167)
- 06:47 start. Read p4r4_common, p4pri2_common, p4wl / p4wl2 / p4wl3 args (common + judge3c), the fixer's report. Served main.js: :5169 276d3049 (= fixer's final), :5167 7bed38e9, :5162 445b1f6c. Slot empty, load 3.4. diff -rq app/: wl3a vs p4ph and vs wl2 = Water.ts only.
- 06:49 chain T launched alone (real loops T1 DPR 2 M/L x4, perf STRICT sweep + rest, real loops T1 DPR 1 x3, T2 x2).
- 06:53 real loop T1 DPR 2 (rl.mjs 1512x860, canvas 1890x1075, M/L alternated x4, 150 fr, alone; tables/rl_d2_T1dpr2.txt): per run left MAIN 334/343/347/346 | lane 331/332/335/336;
  region 1181/1214/1229/1215 | 1214/1215/1211/1209; near 213-221 | 223-225; dt p50 MAIN 30.2-31.2 | lane 32.2-32.4 ms (+1.1..+2.0 ms, ~+4.5-6.6 %).
  dt-matched (n 478 | 521): left -19 % / -13 %, region -14 % / -9 %, near -13 % / -4 %; real gap: left -21 / -14 %. Pooled 28-36 ms: left 349 vs 332, region 1234 vs 1210,
  near 223 vs 225 (lane dt mean +1.2 ms). => left water <= MAIN (better when dt-matched); region / near at MAIN's level. LOOKED img/rl_T1dpr2_left_M2_L2_M3_L3_x2.png:
  no blocky shapes in any row; lane diffs MAIN-like or calmer.
- 07:00 PERF STRICT sweep (perfab, T1 1440x766, A :5162 / B :5169, 6 s, alone, load 3.5-4.6; perf/sweep.txt): 9 / 9 VALID. B/A of run medians
  1.025 1.025 1.020 1.025 1.036 1.000 1.015 1.051 1.000 -> paired median 1.025 (+2.5 %), mean +2.2 %. A medians 19.5 (x2) / 19.8-20.2 (x7), B 20.2-20.5.
  Mean frame time ratio (every pair B > A): paired median +3.9 %, mean +3.6 %. PASS (<= +5 %). Note: T1 DPR 2 real loop dt p50 +4.8 % on average (above).
- 07:05 PERF STRICT rest (perf/rest.txt): 6 / 6 VALID, B/A 1.028 1.000 0.989 1.000 1.006 1.006 -> paired median +0.3 % (tool +0.6 %), mean-ft +0.6 %. A 17.8 / B 17.8 ms. PASS.
- 07:08 real loop T1 DPR 1 (1512x860, M/L x3 alternated, 200 fr; tables/rl_d1_T1dpr1.txt): per run left MAIN 114/113/114 | lane 112/110/110; region 501/505/503 |
  516/510/513; near 80/79/80 | 80/80/79; dt p50 MAIN 22.8-23.2 | lane 24.0 (+4.7 %). dt-matched (n 523 | 543): left -29 % / -23 %, region -12 % / -11 %, near -26 % / -20 %.
  Pooled 18-30 ms: left 115 vs 112, region 510 vs 519, near 81 vs 81. => <= MAIN (left better).
- 07:10 real loop T2 DPR 2 (M/L x2, 150 fr; tables/rl_t2_T2dpr2.txt): per run left MAIN 706/712 | lane 664/649; region 2618/2615 | 2530/2519; near 370/372 | 362/351;
  dt p50 41.5-41.9 | 43.0-43.4 (+3.6 %, not clamped). dt-matched: left -14 % / -19 %, region -9 % / -13 %, near -15 % / -16 %. => better than MAIN at T2.
- 07:10 chain T done; chain S (ident, FAIR fast + reverse, rest T1 / T2 caps, same-pose c30 M / W / L, s60, slow path M / W / L, hold M / L) started.
- 07:12 far columns, MY rest caps (cols.py 900 1440 498 640 6; REF 82 / 22.3 and MAIN 50 / 16.2 reproduce the BAR's calibration; tables/cols_T1.txt, cols_T2.txt):
  T1 len med / exc20 med: MAIN 50 / 16.2 | wl2 48 / 16.9 | lane 48 / 17.0; x~1334: 67 | 67 | 67 (round 3 had 44) -> WL3A-J1 FIXED; x~1353 60 | 60 | 60; x~1368 57 | 57 | 57;
  x~1207 50 | 67 | 67. Lane == wl2 column for column. (x1334-1368 exc20 11.6 / 10.4 / 13.3 vs MAIN 13.1 / 13.2 / 14.8: wl2's, pre-existing in the stack.)
  T2: MAIN 50 / 15.2 | wl2 57 / 13.3 | lane 57 / 13.3 (= wl2). LOOKED img/rest_T{1,2}_far_REF_MAIN_LANE_dx4_x1.png and rest_T{1,2}_farcols_1180-1440_REF_MAIN_LANE_dx6_x3.png:
  lane reads as MAIN (same soft columns; REF's are longer / brighter = complaint 2, out of scope); diffs = fine ripple speckle, nothing structural.
- 07:13 same pose c30 (capdt circle dt 1/30, T1 DPR 2 1512x860, 150 fr; tables/st_c30_blips.txt), MAIN | wl2 | lane: left 340 | 394 | 347 (+2 %), region 1192 | 1252 | 1164 (-2 %),
  shelf 16 | 16 | 16, near 198 | 261 | 230 (+16 %), right 852 | 858 | 816 (-4 %) = the fixer's numbers exactly (deterministic). LOOKED img/st_contour_T1dpr2_c30_shelf_MAIN_WL2_LANE_x3_f40.png
  (shelf band 280-480 x 440-520, frames 40-43 + diffs x6): thin waterline lines only in all rows, no reshaping blob: contour STABLE; img/st_left_T1dpr2_c30_MAIN_WL2_LANE_x2_f60.png: no blocky
  shapes, lane open-water diffs MAIN-like (wl2 busier).
- 07:15 FAIR (lane vs its own 16-sample 2x GT, popscan minpx 6; fair/fair_L.txt): fast 39 events / 491 px (MAIN's own 63 / 748), reverse 68 / 968 (MAIN's own 103 / 1427). PASS (= fixer's).
- 07:15 IDENT (mine; identP / identPose: final + every target + every linked program, 20 moving frames; id/ident_summary.txt): ?wl3a=0 == :5167 IDENTICAL at T1, T2, T0 phone,
  p04, p06, p07; ?p4wl=0 == :5162 IDENTICAL at the same six; lane ON == :5162 at T0 phone (T0 unchanged); CONTROLS: lane ON vs :5167 T1 DIFFERS and ?wl3c=0 vs lane T1 DIFFERS
  (rx-water-walk only, see below); 0 console logs in every run. PASS.
- 07:18 60 fps sparkle (shoot_ripple 40 fr dt 1/60, T1 rest; s60/), blips/frame MAIN | lane: far water 2.1 | 1.8 (max 5 | 6), lips 1.2 | 1.2, left water 2.1 | 2.3 (max 6 | 6),
  shelf water 0.4 | 0.4. Within run-to-run noise (s60 not bit-deterministic; fixer 2.1 | 2.1, judge_wl3a 2.0 | 2.2 on the left). PASS.
- 07:18 slow path (cap.mjs --path slow, T1 1440x766, 240 fr stepped; tables/cols_slow*.txt, slow_blips.txt): far columns over 12 poses, lane vs wl2: 160 matched, 3 shorter by >= 10 px,
  2 longer, mean dlen -0.2, dexc20 -0.01 (WL3C_G holds beyond the one rest pose); lane vs MAIN: 156 matched, 4 shorter / 13 longer, dlen +1.9, dexc20 -0.93 (= wl2 vs MAIN +2.1 / -0.91).
  Blips/frame MAIN | wl2 | lane: far 880-1440 333 | 332 | 330, lips 282 | 282 | 282, left 70 | 74 | 59, region 435 | 443 | 421, mid 2645 | 2639 | 2636. Far water = MAIN.
- 07:19 hold path (press 0, release 300, 330 fr; tables/hold_main_lane.txt, hold_blips.txt) MAIN | lane: hold L 1522 | 1512, C 3998 | 3987, R 1536 | 1529; release L 11272 | 11283,
  C 12699 | 12562, R 14218 | 14182; far box 1318 | 1308, lips 690 | 689. LOOKED img/hold_f150_MAIN_LANE_dx6.png, hold_f310_MAIN_LANE_dx6.png: same look; diffs only in the lake
  reflections (low amplitude, the stack's water), rings / sky black. No new glitch.
- 07:20 ice / sky: rest T1 and T2 rows 0-430 MAIN vs lane max 1 level, 0 px > 2. tsc (mine, --incremental false) hero + app exit 0. 0 errors in every capture log; ident 0 logs.
  LOOKED img/rest_T1_left_REF_MAIN_LANE_dx4_x2.png: lane = MAIN at 2x (diffs = ripple speckle, thin floe-foot lines).
## 07:21 VERDICT pass = true, mergeable = true (complaint-1 release candidate = whole stack p4wl + wl2g + WL2FJ + wl3a + wl3c vs MAIN :5162).
  Complaint 1: BETTER than MAIN. T1 DPR 2 real loop (alternated x4, alone): left water per run 331-336 vs 334-347, dt-matched -13..-21 %, region -9..-14 %, near -4..-15 %;
  T1 DPR 1 left -23..-29 %; T2 left -14..-19 %; no blocky shapes in any frame looked at; shelf contour stable (lake-anchored taps).
  WL3A-J1 FIXED: x~1334 column 67 px (MAIN 67, round 3 44), far median 48 (= wl2; MAIN 50 with one column fewer), robust over 12 slow-path poses.
  WL3A-J2 FIXED: STRICT sweep 9 / 9 valid, paired median +2.5 % (mean-ft +3.6-3.9 %), rest 6 / 6 +0.3-0.6 %.
  Ident, FAIR (39 / 491, 68 / 968), s60, hold, T0 identical, ice untouched, tsc: PASS.
  Open, nits only: N1 frame time at the client's T1 DPR 2 setup +4.8 % (real loop dt p50, +1.5 ms; DPR 1 +4.7 %, T2 +3.6 %), close to the 5 % line, mostly wl2's stack;
  N2 near-water sub-box same pose +16 % (230 vs 198) not seen in the real loop (raw +3 % at +4.8 % dt, dt-matched lower); N3 WL3C_G 0.0004 one notch above the cut point
  (0.0003 cuts the column): 0.0005 would add margin; N4 (pre-existing, wl2) far columns about 1 level dimmer at their top (dexc20 -0.9) and ~2 px longer than MAIN; T2 13.3 vs 15.2.
  Scores MAIN | lane: glitch_cursor_orbit 7.0 | 7.2, environment 7.8 | 7.8, glitch_hold_sweep 7.7 | 7.7, color_grade_post 8.2 | 8.2, awwwards_jury 7.6 | 7.6.
- 07:21 analysed capture sets deleted (WORK  10M); evidence mirrored to MAIN/notes/round11/lane_backup/p4wl3c/judge_wl3c/ (LOG, tables, perf, id, fair, tools, img).
