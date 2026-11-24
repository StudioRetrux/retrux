# judge_wl2b LOG (independent judge of lane wl2b, lab :5166; job B = WL-J2 far columns + slab-foot lips)
## 22 Nov 19:35 start. Read p4r4_common, p4pri2_common, p4wl args (round 1), p4wl2 args (round 2, common + lanes.wl2b.judge), lane HANDOFF + LOG + patch.
   Patch (148 lines, 2 files) == live diff LANES/p4wl -> LANES/wl2b (cmp equal); lab :5166 started 19:02:30 after the last edit (19:02:27) = serves the final source.
## 19:38 ident (own, fresh captures of :5163 / :5162): ?wl2b=0 == :5163 IDENTICAL at T1 (14 targets, 16 programs), T2 (15 targets), expand 2.97;
   ?p4wl=0 == :5162 IDENTICAL at T1; lane ON at T0 phone == :5163 IDENTICAL; control lane ON T1 differs (walk, main, refraction, bloom*, final;
   programs rx-water, rx-water-walk). logs 0 everywhere. (id/ident_summary.txt)
## 19:40 rest T1 / T2 captures (caps/rest_*): lane vs p4wl T1 full-frame |d| mean 0.16, only below y 465 (sky 0): left water mean 0.86 (max 25),
   mid 0.11, far 0.13 (132 px > 8 lv). Columns (tools/cols.py, x 900-1440, ya 498, thr 6; len med / exc20):
   REF 82 / 22.3 | T1 MAIN 50 / 16.2 | p4wl 53 / 16.1 | lane 53 / 16.1 | T2 MAIN 57 / 15.0 | lane 55 / 15.7  -> the default does NOT lengthen /
   brighten the far columns (look: img/rest_T1_far_2x_REF_5162_5163_5166.png: lane == p4wl == MAIN, REF columns long + bright to the crop bottom).
## 19:41 stepped fast path T1 DPR 2 (1800 x 957 buffer, 40 frames, same poses), one-frame blips / frame (thr 12) MAIN | p4wl | lane:
   left 0-420x470-620 1829.8 | 1617.2 | 1027.4 (-36 % vs p4wl); shelf 280-480x440-520 335.3 | 333.2 | 332.5; far 880-1440x430-590 1024.7 | 995.1 | 993.9;
   far lips 880-1440x470-520 132.3 | 132.8 | 132.3; far cols 880-1440x520-590 199.0 | 168.9 | 168.3; mid 480-880x440-620 4199.8 | 4544.5 | 4513.9.
   LOOK: img/leftshelf_f19-20_MAIN_p4wl_lane_2x.png: the far-left shelf reflection's pale crenellated holes (MAIN, p4wl) mostly gone in the lane
   (a few streaks remain x ~230-330); img/notch_right_f18-21_MAIN_p4wl_lane_6x.png + lips_*_3x.png: the slab-foot tooth / step at the slab ends
   is the same in MAIN, p4wl and lane in every frame = 'bibir air' NOT fixed; client video frame cv/bibir_t4_2x.png shows the same steps.
## 19:44 perf A/B: my first run collided with wl2g:perf-sweep (its pair 1 B read 40.3 ms beside mine) and with an ORPHANED perfab of the wl2b
   builder (pid 65802, PPID 1, outside the slot, :5162 vs :5166, 12 pairs, invisible to STRICT gates). Killed MY run (aborted file kept), re-queued it
   to start when wl2g's perf and the orphan end (max 14 min wait). Did not touch 65802 (not mine).
## 19:49-19:59 perf A/B (own; perfab STRICT=1 SLOT_BG=0 GATE_S=45, T1 1440x766 pointer sweep, interleaved A :5162 | B :5166, 6 s runs):
   4 pairs, 0 VALID (judge_wl2f / judge_wl2g FAIR, ident, captures and judge_wl2f:perf-sweep held slots the whole time; loads 4-14).
   Medians A | B: 21.6 | 21.7, 22.9 | 21.4, 21.0 | 47.4 (collision), 21.0 | 21.2 -> paired median B/A 1.007 (n 4, all in the 21+ ms mode;
   the 20.1 / 21.5 bimodality cannot be separated). Stopped at 4 pairs to stop loading judge_wl2f's perf run. (perf/ab_sweep_summary.txt)
   Context, not a gate: the builder's orphan run (12 pairs, all invalid, 18:44-19:49, pairs 0-3 partly on the pre-19:02 build) paired median 1.017;
   the builder's final_sweep (3 invalid) 1.043. => THE BAR (3) is UNPROVEN; the indications are about +1 to +4 %, inside the +5 % bar, not proven.
## 20:00 hold poses (tools/posecap.mjs, stepped, T1): lane vs p4wl expand 2.97 |d| mean 0.08 (max 21), release 0.33 mean 0.15 (max 39): lake only
   (top 0-430 = 0.000-0.001: rings / orb / sky unchanged). img/hold_release_0.33_p4wl_lane_diffx8.png looked at: nothing new.
## 20:01 T2 columns: REF 82 / 22.3 | MAIN 57 / 15.0 | p4wl 57 / 15.6 (mean 55.4, max 102) | lane 55 / 15.7 (mean 50.5, max 89).
## 20:02 REGRESSION found in the far columns: the column under the slab end at x ~1208 (REF x 1213) is dimmer / shorter in the lane:
   cols.py length T1 61 -> 34 px, T2 102 -> 50 px; excess profile rows 522-582 3-7 levels lower (colprof_bisect.txt); matched mean excess rows
   510-585 (tools/colmatch.py) REF 10.4 | MAIN 7.8 | p4wl 9.0 | lane 5.6. All other far columns within 0.6 levels of p4wl.
   Look: img/col1208_3x_stretch160-235_REF_T1p4wl_T1lane_T2p4wl_T2lane.png (contrast-stretched; subtle at 1:1).
   BISECT (rest T1): ?wl2bh=3.5 (cap 4, lip on) 8.6 = p4wl; ?wl2blip=0 (cap 8, no lip) 6.1 -> the FACE CAP 8 causes it (the same edit that
   calms the left shelf). Faces 5-8 behind the slab end now take the rays that went to the brighter remainder.
## 20:06 VERDICT pass = false. Open: job B not met by default (major); the cap-8 far-column dimming (major regression); lips not fixed, root cause
   (tN samples anchored to the max-mip cell entry d) not addressed (major); THE BAR (3) perf unproven (major); (5) FAIR not run (major);
   scope / merge-anchor risk (minor); orphaned perfab left outside the slot by the builder (minor). Gains: left box blips -36 % vs p4wl (look:
   pale holes in the far-left shelf reflection mostly gone), ident all IDENTICAL, T0 unchanged, rings unchanged.
