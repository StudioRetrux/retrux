# judge_wl3b LOG (round-3 water, independent adversarial JUDGE of lane wl3b, lab :5168 read-only)
## 23 Nov 05:16 start (time box 45 min -> ~06:01). Read briefs p4r4 / p4pri2, args p4wl / p4wl2 / p4wl3 (common + lanes.wl3b.judge), builder LOG / report.
- 05:20 own gate chain started (chain.sh): ident (11 runs) -> real loop T1 DPR 2 left + lip band (alternated L/M/B) -> rest T1/T2 -> stepped fast DPR 2
  (lip sheets) -> perf STRICT 8 pairs -> real loop T1 DPR 1 / T2 -> FAIR fast + reverse. judge_wl3a runs in parallel (slot contention).
- 05:22 ident (own, identP 20 moving frames): ?wl3b=0 == :5167 IDENTICAL at T1, T2, expand 2.97; ?p4wl=0 == :5162 IDENTICAL T1; lane ON T0 == :5162
  IDENTICAL (phones unchanged); control lane ON T1 differs only in programs rx-water / rx-water-walk (targets walk, main, ... downstream). logs 0/0.
  Served :5168 bundle carries wl3b* switches, no shift mode; lane vs LANES/wl2: only Water.ts differs (sha 5f98cfae, diff 149 lines).
- 05:23-05:25 REAL LOOP T1 DPR 2 (1440x766, CSS 0-480 x 440-620, alternated L/M/B x 2; machine loaded by judge_wl3a -> dt 50 in run a):
  left water CSS 0-160 blips/frame, dt 48-52 (n 156 / 145 / 140): MAIN 1410 | lane 2049 (+45 %) | wl2 1716 (+22 %); dt 26-40 (n 81 / 35 / 93,
  under-sampled): 685 | 1257 | 913. Sub-columns (rlj, dt 26-40): left +66 %, shelf -36 %, right +4 % vs MAIN. LOOK img/rlb_T1d2_leftwater_sheet.png,
  img/rlzoom_left_M_L_B_3x.png: the lane's long pale left-slab columns + broad patch flips in the open water left of the slabs.
- 05:27 lip band real loop (CSS 860-1440 x 420-600; lips = y 460-530): dt 48-52 (n 108 / 103): MAIN 1629 | lane 1592 (= MAIN); dt 26-40 under-sampled.
- 05:28 rest cols.py (own captures; = the builder's numbers): T1 REF 82 / 22.3 | MAIN 50 / 16.2 | wl2 47 / 16.8 | lane 57 / 21.6; T2 MAIN 57 / 15.0 | lane 58 / 17.3.
  colmatch rows 510-585: sum ratio MAIN 0.09 | wl2 0.21 | lane 0.90, BUT mean |build-REF| per column MAIN 6.96 | wl2 7.25 | lane 6.70 (T1),
  T2 7.44 | 7.64 (lane worse): the lane overshoots x 906-952 (16.8 / 24.7 / 24.8 vs REF 10.9 / 12.1 / 12.8) and x 1151 (11.7 vs 4.5).
  LOOK img/rest_T1_farleft_3x: x ~950 column = a long crisp bright stripe to the bottom (REF: soft, fades, broken); img/rest_T1_farmid_3x:
  pale blob lobes at the column ends under the small floe; img/rest_T1_notch1062_8x: NEW hard-edged pale notch under the slab end CSS ~1061 x 483-490.
- 05:29 stepped fast T1 DPR 2 (own, 48 fr, lipan vs the lane's per-pixel 2x GT FGTpx), b12 blips MAIN | wl2 | lane | GTpx: left 1609 | 1443 | 1415 | 867;
  shelf 335 | 334 | 333 | 326; far 1095 | 1072 | 1132 | 1169; lips 234 | 234 | 241 | 243 (b6: 753 | 735 | 824 | 793); cols 167 | 144 | 199 | 233.
  LOOK img/lips4x_R_f40-43 / lips4x_notch_f40-43 (MAIN | wl2 | lane | GTpx, frames 40-43, not the builder's 30-33): lane lips ~= GT, no new tooth;
  the slab-end step is in the GT too.
- 05:31 rest diff lane vs wl2 (img/rest_T1_far_wl2_lane_diff_2x.png): only the lake changes (top 0-430 max |d| 1.0); brighter lip rows under every
  slab foot, columns brighter / gaps darker (water median 183 -> 182). img/rest_T1_floerefl_4x: the floe's mirrored 'V' reflection is longer / crisper.
- 05:32 STREAK (CSS x ~1256, fast path; img/streak1256_f38-42_M_B_L_GTpx_4x.png + scripts/streak.py, line excess vs 11-px neighbourhood, fr 30-46):
  MAIN mean 1.4 / max 2.0 | wl2 3.4 / 6.0 | lane 5.2 / 9.8 | GTpx 2.0 / 2.5. A thin bright wavy vertical line that MAIN and the GT do not have;
  inherited from wl2, made ~1.5x stronger by the lane = REGRESSION (the client's 'vertical line' words).
- 05:30-05:33 perf: pair 0 invalid (judge_wl3a:hold beside it); machine quiet from 05:33.
- 05:34 SLAB-FOOT LOOK (rest T1, profiles every 2 rows, scripts in LOG cmds): the lane brightens the 1-2 px dark band right under the far slab feet
  (diff map: red line under every foot). x 960-1010 row 480: REF 128 | MAIN 130 | wl2 130 | lane 159; x 1310-1390 rows 490-492: REF 97 / 100 |
  MAIN 119 / 126 | lane 133 / 135. The slab's dark reflection band gets ~2 px shorter while REF's is deeper than MAIN's = AWAY from REF.
  At the slab end CSS ~1056-1068 x 483-491 it is a pale notch with a crisp curved edge: mean luma T1 MAIN 141 | wl2 144 | lane 156 (REF 126),
  edge gradient 15.5 -> 21; T2 141 -> 156; stable in all 3 rest frames (img/rest_T1_notch1062_8x_REF_MAIN_WL2_LANE.png).
- 05:30-05:40 PERF (own; perfab STRICT=1 SLOT_BG=0 GATE_S=120, T1 1440x766 pointer sweep, A :5162 | B :5168, 6 s runs; perf/sweep.txt, sweep_summary.txt):
  8 VALID pairs + 1 invalid (judge_wl3a:hold). Paired median B/A 1.076 (+7.6 %), valid range 1.046-1.109. A: low mode 19.2-20.0 (all 8 valid);
  B: low 20.5 (1 run, +4.6 % vs its A), high 21.1-21.4 (7 runs). Builder's own: 1.065. => THE BAR (4) FAILS (> +5 %), reproduced.
- 05:40-05:41 REAL LOOP, quiet machine: T1 DPR 1 (1440x766) left water dt 20-26 (n 70 / 131): MAIN 166 | lane 245 (+48 %);
  T2 DPR 2 dt 26-40 (n 101 / 142): MAIN 463 | lane 1050 (+127 %), region 2224 | 2938 (+32 %). => complaint 1 WORSE at every setting I ran
  (T1 DPR 2 +45 % at dt 48-52, T1 DPR 1 +48 %, T2 +127 %); matches the builder's +73 % (T1 DPR 2 dt 28-34), +35 %, +93 %.
- 05:43 tsc (own, --noEmit --incremental false, nothing written): tsconfig.hero.json exit 0, tsconfig.json exit 0, output empty.
- 05:43 FAIR fast (own, lane vs its own 16-sample 2x GT, 240 fr): 44 events / 603 px (= builder's byte-for-byte; MAIN's own 63 / 748): PASS.
- 05:46 FAIR reverse (own): 70 events / 938 px (= builder's; MAIN's own 103 / 1427): PASS. FAIR captures deleted by the chain.
- 05:46 extra real loops started on a quiet machine (load 2.7, no other slot holder): T1 DPR 2 left water L/M/B x 2 + lip band L/M/B (chain2.sh).
- 05:47-05:49 REAL LOOP T1 DPR 2, QUIET machine (client regime), left water CSS 0-160, 2 runs each alternated L/M/B (rl_left_T1d2_quiet.txt):
  dt 26-40 (n 203 / 283 / 282): MAIN 549 | lane 1043 (+90 %) | wl2 694 (+26 %); dt 26-30 (n 181 / 137 / 233): 545 | 1058 (+94 %) | 662;
  region CSS 0-480: 2394 | 2935 (+23 %) | 2582. => THE BAR (1) FAILS decisively (lane +50 % over its own base wl2). BLOCKER.
- 05:50 lip band real loop, quiet (1 run each; rl_lips_T1d2_quiet.txt): dt 26-40 (n 94 / 140 / 131): lips CSS 860-1440 x 460-530 MAIN 384 |
  lane 568 (+48 %) | wl2 546 (+42 %); whole band CSS 860-1440 x 420-600 2433 | 3353 (+38 %) | 3253. Builder: 502 | 597 | 485. At dt 50 = MAIN.
  => the lip crawl is NOT fixed in the real loop; worse than MAIN (mostly inherited from wl2, lane +4 % here, +23 % in the builder's run).
- 05:51 60 fps sparkle at rest (own, 40 fr 1/60 s, T1 DPR 2; s60_rest.txt) b12 MAIN | wl2 | lane: left 15.4 | 15.2 | 15.8, far 389 | 389 | 389,
  lips 2.6 | 2.7 | 3.0, cols 0.1 | 0.2 | 0.1 = MAIN: PASS. LOOK img/rest_T1_far_{1x,2x}_REF_MAIN_WL2_LANE.png: lane columns longer / brighter,
  closer to REF at 1x; the floe's reflection is a long pale mirror shape with blobby ends (REF: soft streaks).
## 05:52 VERDICT pass = false.
  Complaints: (1) left-sheet flicker WORSE (real loop T1 DPR 2 quiet dt 26-40 +90 % vs MAIN, +50 % vs wl2; loaded dt 48-52 +45 %; T1 DPR 1 +48 %;
  T2 +127 %) = BLOCKER. (2) far columns BETTER, not fixed (len 57 vs REF 82, exc 21.6 vs 22.3; sum ratio 0.90; but 2x over-bright at x 906-952,
  smooth crisp-sided bands not broken like REF, x~1208 not dimmer = ok). (3) lips SAME / slightly worse: 4x sheet no new tooth (~GT), but real-loop
  lip band worse than MAIN (+48 %, mostly wl2's), the dark band under the slab feet lighter (away from REF) + a pale crisp notch at x ~1061.
  BAR: (1) FAIL, (2) partial, (3) FAIL (real loop), (4) FAIL perf +7.6 % (8 valid), (5) PASS (s60 = MAIN, FAIR fast 44/603, reverse 70/938),
  (6) PASS ident, (7) PASS (rings / T0 unchanged, tsc clean, 0 console errors). Also: wl2's thin vertical streak at x ~1256 1.5x stronger.
  Scores MAIN | lane: environment 8.0 | 8.2, color_grade_post 8.2 | 8.2, glitch_cursor_orbit 7.8 | 7.1, awwwards_jury 7.6 | 7.4.
  The lane must stay out of the merge by default (switch ?wl3b=0 = wl2 exactly).
- 05:53 analysed capture sets deleted (st, caps, s60, rl frames); tables + images kept and mirrored.
