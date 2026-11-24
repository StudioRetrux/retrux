# wl3c LOG (round 3c fixer of lane wl3a, complaint 1 release candidate), lab :5169
- 05:59 start. Read p4r4_common, p4pri2_common, p4wl / p4wl2 / p4wl3 args (common + fix3c), judge_wl3a LOG, wl3a HANDOFF + patch.
  Machine alone (slot: no holders, load 2.2). Open: J1 (W's gate 0 shortens the far column x~1334 67 -> 44, median 48 -> 41), J2 perf unproven.
  Cause of J1 (code): lkWalkTerm stops after 4 recorded faces (hits > 3.5); with gate 0 the tiny-share faces in front of the far slabs use
  up the cap before the bright slab face. Fix: (W)'s gate = 0.002 * smoothstep(D-5, D+5, t), t = the lake point's camera distance, D 25 m
  (WL3C_D; `?wl3awd=<m>` lab, `?wl3c=0` = round-3 wl3a's gate 0 everywhere). Water.ts only (wl3aWalkFrag + 2 lines + 1 field).
- 06:01 tsc hero + app exit 0; lab :5169 restarted. Batch r1: T1 rest caps D 25 / 15 / 40 / wl3aw=0, c30 same-pose (T1 DPR 2) D 25 + wl3aw=0.
- 06:02 r1 (cols.py 900 1440 498 640 6, T1 rest; c30 = capdt circle dt 1/30 T1 DPR 2 1512x860, stj.py blips/frame): distance gate D 25 (ramp 20-30 m):
  x~1334 67 px, median 48 (= wl2) BUT c30 byte-equal to ?wl3aw=0: left 363 (MAIN 340, round-3 lane 332), near 245. D 15: column 48 ok;
  D 40: column 41 (= gate 0). => the left water and that column's water sit at the same camera distance (~30-35 m): a distance gate
  cannot separate them. REJECTED.
- 06:06 mechanism fix instead: the 4-face cap gets its own counter (hitsC) that counts only the faces wl2's gate records (share > 0.002
  with wl2's own first-face share): the walk stops where wl2's does (same horizon eC), every face above the ray still recorded (W).
  `?wl3c=0` = round-3 wl3a. tsc hero 0; lab restarted. r2: rest T1 cap / cap0, c30 cap.
- 06:05 r2 cap counter (g 0.002 = wl2's): column x~1334 67, median 48 (= wl2) BUT c30 left 364 (= W off): W's left-water gain comes from
  the EARLY STOP (4 faces of any share), not from recording the tiny faces.
- 06:07 r3 sweep (cap counts a face when its wl2-share > g; cap N), T1 rest cols x1334 / median | c30 left / near / region:
  g 0.0002: 44 / 41 | 345 / 227 / 1158;  g 0.0005: 67 / 48 | 349 / 231 / 1167;  g 0.001: 67 / 48 | 355 / 237 / 1174;
  g 0 + N 5: 67 / 48 | 353;  N 6: 67 / 48 | 382;  N 8: 67 / 46 (x1207 53) | 493.  (MAIN 340 / 198 / 1192; round-3 lane 332 / 215 / 1146; wl2 394)
  => more recorded faces = more left pops; the cap must skip the far column's tiny faces. g 0.0005 is the best so far (+2.6 % same-pose).
- 06:08 r4: the cap counts a tiny face only by walk distance d (near d < 1 / 3 / 8 m, or far d > 3 / 8 / 15 m), g 0.002 otherwise.
- 06:10 r4 walk-distance rule (tiny face counts toward the cap only if d < X / d > X): near-only (1 / 3 / 8 m) = wl2 (left 363-364,
  column 67); far-only d > 3 / 8 / 15 m = round-3 lane (left 332-335, column 44); d > 25: 359 / 67, d > 40 / 60: 363 / 67. Both sets
  of tiny faces lie ~15-25 m along the walk: REJECTED. g 0.0003: column 44 (left 346); g 0.0004: column 67, median 48, x1207 67, left 347.
- 06:12 DEFAULT = cap counter with WL3C_G 0.0004 (`?wl3cg=` lab, `?wl3c=0` = round-3 wl3a); d / N knobs removed. tsc hero + app exit 0.
  Default build == the g 0.0004 variant byte for byte (rest T1 f0002, c30 f0100). c30 (same pose T1 DPR 2) MAIN | wl2 | round-3 lane | wl3c:
  left 340 | 394 | 332 | 347 (+2.1 % vs MAIN), region 1192 | 1252 | 1146 | 1164 (-2.3 %), near 198 | 261 | 215 | 230, right 852 | 858 | 814 | 816.
  cols.py T1 rest: median 48 (MAIN 50, wl2 48), x~1334 67 (MAIN 67), x~1207 67 (MAIN 50). J1 fixed in the rest look.
- 06:14 real loop T1 DPR 2 (rl.mjs 1512x860, canvas 1890x1075, M L alternated x4, 150 fr, machine alone) running; then STRICT perf.
- 06:17 REAL LOOP T1 DPR 2 (rl.mjs 1512x860, canvas 1890x1075, M L x4 alternated, 150 fr each, nothing else running; tables/rl_d2_T1dpr2.txt):
  per run left water MAIN 337 / 340 / 344 / 339 | lane 324 / 322 / 322 / 327 (every lane run below every MAIN run, at a HIGHER dt:
  p50 MAIN 30.3-30.5, lane 31.6-31.9 ms, +4.5 %); region MAIN 1183-1198 | lane 1169-1199; near 214-219 | 214-222.
  dt-matched (1-ms bins, n 530 | 528): left -27 % (MAIN weights) / -22 % (lane weights), region -19 % / -13 %, near -19 % / -18 %;
  real-gap matched: left -26 % / -20 %. => complaint 1 at T1 DPR 2: lane <= MAIN. PASS.
- 06:18 STRICT perf (perfab T1 1440x766 pointer sweep 6 s, A :5162 / B :5169, want 10 max 13; then MODE=rest want 8) started, machine alone.
- 06:27 PERF sweep (perf/sweep.txt, sweep_summary.txt): 10 / 10 VALID STRICT pairs (+1 invalid: pair 3, 1-min load 11 from outside the
  slot), B/A 1.031 1.036 1.031 1.000 1.026 0.962 1.047 0.957 1.005 1.041 -> paired median 1.028 (+2.8 %), mean +1.4 %; A modes low 19.5
  (n 8) / high 21.1 (n 2); B 20.1 (n 10, one mode) = +3.1 % vs A's low mode. BAR (4) PASS (<= +5 %). Rest perf running.
- 06:34 PERF rest (perf/rest.txt, rest_summary.txt): 8 / 8 VALID STRICT, B/A 1.006 1.006 1.006 1.006 0.989 1.017 1.011 0.989 -> paired median
  1.006 (+0.6 %), A 17.6 / B 17.6 ms, one mode each. PASS.
- 06:34-06:40 chain G (machine: my jobs only): IDENT (id/ident_summary.txt; final + every target + every linked program, 20 moving frames):
  `?wl3a=0` == :5167 IDENTICAL at T1, T2, T0 phone, p04 (expand 0.9), p06 (expand 2.97), p07 (release 0.33); `?p4wl=0` == :5162 IDENTICAL
  at the same six; lane ON == :5162 at T0 phone; CONTROL lane ON vs :5167 T1 DIFFERS. Console logs 0 / 0 in all 14; 0 capture errors.
  FAIR (lane vs its own 16-sample 2x GT, popscan minpx 6): fast 39 events / 491 px (MAIN own 63 / 748), reverse 68 / 968 (103 / 1427). PASS.
  T2 rest cols: lane 57 / 13.3 = wl2 = round-3 lane (MAIN 50 / 15.2): T2's far columns unchanged by wl3c.
- 06:36-06:41 60 fps sparkle (shoot_ripple 40 fr dt 1/60 T1 rest; tables/s60.txt, s60_far_variants.txt), blips/frame far water | lips:
  MAIN 2.0 | 1.1 and 1.9 | 1.1 (2 runs); lane 2.2 | 1.6 (run 1, beside the FAIR 2x GT + ident jobs), 1.6 | 1.1 and 1.6 | 1.2 (runs 2-3, quieter);
  sub-switch runs g 0: 1.8 | 1.2, g 0.002: 1.7 | 1.2, wl3ae=0 1.6 | 1.2, wl3as=0 1.8 | 1.1, wl3a=0 1.9 | 1.2. s60 is not bit-deterministic
  (MAIN's runs differ too); run 1 is the outlier. Left water 2.1 | 2.1 (MAIN | lane), shelf water 0.2 | 0.3 (max 1 | 2). = MAIN: PASS.
- 06:36 client files (looked at): refs_user/wl3c_T1dpr2_realstep_MAIN_left_LANE_right.mp4 (c30 same pose at dt 1/30 = real speed at 30 fps,
  CSS 0-560 x 440-620, MAIN left, lane right); wl3c_leftwater_T1dpr2_c30_x2_rows_MAIN_WL2_LANE_f34.jpg (CSS 0-120, frames 34-37 + diffs x6:
  wl2's open-water diffs brighter / busier than MAIN's, lane's MAIN-like or calmer, no blocky shapes); wl3c_farcol_x1334_T1rest_x4_REF_MAIN_
  WL3A_WL3C_{plain,stretch_x6}.jpg (the faint column under the left small slab: round-3 wl3a fades early, wl3c reaches as far as MAIN);
  wl3c_rest_T1_REF_MAIN_LANE_{left_1x,left_2x,far_1x}.jpg (rest: above y 430 MAIN vs lane max 1 level: rings untouched).
- 06:41 served :5169 dist/main.js sha256 276d3049 (contains hitsC / 0.00040; built 06:13 from the final source); :5167 7bed38e9, :5162
  445b1f6c unchanged. Patches: wl3c_vs_p4ph.patch (whole stack p4wl + wl2g + WL2FJ + wl3a + wl3c, Water.ts only, 563 lines, sha 7b88e263),
  wl3c_vs_wl2.patch (100 lines), wl3c_vs_wl3a_round3.patch (65 lines). Capture sets deleted (kept tables, c30_fin, rest caps). WORK 157 MB.
- 06:44 shelf contour sheet (CSS 280-480 x 440-520, c30 T1 DPR 2 frames 40-43 + diffs x6; img/contour_T1dpr2_c30_x3_rows_MAIN_WL3A_WL3C_f40.png):
  looked: wl3c = round-3 wl3a, thin waterline diffs only, no reshaping blob. STABLE.
- 06:44 real loop T1 DPR 1 (M / L x3, 200 fr; tables/rl_d1_T1dpr1.txt): per run left MAIN 110 / 115 / 112 | lane 110 / 110 / 110 (lane dt
  p50 23.6-24.0 vs 22.6-23.1); dt-matched (n 561 | 550) left -15 % / -6 %, region -6 % / -3 %, near -12 % / -3 %. <= MAIN.
- 06:45 T2 DPR 2 same pose c30 (tables/c30_T2.txt) MAIN | wl2 | wl3c: left 483 | 521 | 453, region 1832 | 1878 | 1758, right 1349 | 1357 | 1305.
- 06:46 HANDOFF appended (LANES/wl3a/HANDOFF.md, 'ROUND 3c FIX'). ok = true. Lab :5169 left running (276d3049). Capture sets deleted.
