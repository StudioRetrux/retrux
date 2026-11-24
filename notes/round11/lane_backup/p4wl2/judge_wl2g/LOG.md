# judge_wl2g (adversarial judge of lane wl2g, lab :5164; base :5163 = p4wl frozen, MAIN water :5162) - 22 Nov 2026
## 19:49 start. Read p4r4_common, p4pri2_common, p4wl-water args (build / judge / LEAD DECISION), p4wl2-water args.common + lanes.wl2g,
   rejudge_p4wl LOG, builder report + LOG. Lane source: only Water.ts differs from LANES/p4wl (sha d94c26c2, mtime 19:11:38; lab built
   19:11:45 = build 4). Read the live diff (anchor VP walk pass, 2-azimuth lattice, scissor, re-anchor probe; WL2G_READ opt-in).
   Builder naming: st/d?_L = :5163 (p4wl), d?_G4 = lane build 4. Slots: all 3 busy (judge_wl2b, judge_wl2f).
## 19:59 chain A started (own lane d1 / d2 same-pose captures, ident, FAIR fast + reverse, real loop T1 DPR 2).
## 19:53-19:56 (correction: chain A started 19:53) own same-pose lane captures (cap.mjs fast, T1, 120 frames): st/d1_L and st/d2_L are
   BYTE-IDENTICAL (120/120 frames) to the builder's st/d1_G4 / d2_G4 = deterministic, builder's same-pose set trusted.
   Own blip counter (tools/jst.py, thr 12/6/4; 2x GT area-resampled), MAIN | p4wl | lane | px | GT (st/d1_blips_builder_caps.txt, st/d2_blips.txt):
   DPR 1: left 774 | 590 | 577 | 711 | 325 (lane +78 % vs GT); shelf 216 | 206 | 205 | 222 | 192 (+7 %); far 1101 | 990 | 977 | 1173 | 920.
   DPR 2: left 1305 | 1075 | 1053 | 1270 | 861 (+22 %; builder's GT resampling 818 -> +29 %); shelf 345 | 329 | 328 | 340 | 323 (+2 %);
   far 1782 | 1581 | 1569 | 1891 | 1645 (<= p4wl).
   LOOK img/d1_shelfzoom_x6.png (CSS 285-405 x 450-495, contrast x4, frames 98-100 + |diff| x8; MAIN | p4wl | lane | GT) and
   img/d2_shelfzoom_x5.png (DPR 2, + px): MAIN and p4wl redraw the dark crenellated teeth each frame (filled diff patches); the lane
   keeps one outline that slides (diffs = thin edge lines). The lane's outline is still stair-stepped at quarter-texel scale (GT has a
   soft diffuse reflection, no hard blob) but it no longer reshapes. => WL-RJ1 morphing FIXED at DPR 1 and 2.
## 19:57 ident (id/ident_summary.txt, own run): fresh :5163 T1 == builder ref; ?wl2g=0 == :5163 IDENTICAL at T1 / T2 / T0 / expand 2.97 /
   release 0.33 (and vs the fresh :5163 T1); ?p4wl=0 == :5162 IDENTICAL at the same five; lane ON T0 == :5163. logs 0/0 everywhere.
## 19:59 FAIR fast (lane vs own 16-sample 2x GT, popscan minpx 6): 43 events / 555 px = builder's exactly; MAIN's own 63 / 748. PASS.
## 20:02 rest look (shoot_ripple t = 100 s, debug-frozen, T1 1440x766; rest/, img/rest_T1_lane_vs_p4wl.png, rest_T1_far_* / rest_T1_left_*
   (p4wl | lane | diff x8, zoom 2), looked): outside the lake only the floating shards differ (they differ between ANY two page loads:
   p4wl vs MAIN shows the same); mountains, sky, rings, orb identical. Lake: lane vs p4wl +-1-3 levels in the slab reflections, a few
   5-12-level spots at slab corners; far crop mean |d| 1.03, left 1.14. Nothing reads worse at 1x. T2 rest: same pattern (mean 1.18).
## 20:03 perf chain re-armed: starts after real loop + hold captures and after other lanes' perf jobs leave the slots (max 6 min wait).
## 20:04 FAIR reverse (lane vs own GT): 77 events / 1217 px (= builder's); MAIN's own 103 / 1427. PASS (fast + reverse).
## 20:04 hold (stepped cap.mjs path hold, T1, 300 frames = press + dolly + held; hold/holdan.txt): lake blips/frame p4wl 5796 | lane 5795
   (every 60-frame block equal within 0.2 %); walk not drawn once fully held. No hold regression (release not covered by my 300 frames;
   ?wl2g=0 / ?p4wl=0 idents at release 0.33 identical).
## 20:12 60 fps sparkle at rest (own build-4 captures s60/far_lane4, left_lane4 vs the builder's same-tool MAIN / p4wl / GT frames;
   s60/s60_far.txt, s60_left.txt): far water / lips MAIN 2.0 / 1.2 | p4wl 1.7 / 1.2 | lane 1.6 / 1.1 (GT 0.0); left water 2.1 | 2.0 | 2.1,
   shelf water 0.2 | 0.2 | 0.2. PASS (build 4's own numbers = the builder's build-3 ?wl2gread=0 numbers).
## 20:05-20:13 real loop T1 DPR 2 (rl.mjs, 1512x860, canvas 1890x1075, scale 1, pointer circling, CSS 0-480 x 440-620):
   first lane run was invalid (ran beside my own s60 capture: every dt clamped at 50 ms) - re-run alone.
   Timing (nocap, 300 frames, alternated M L M L): dt p50 32.5 / 31.9 / 30.8 / 32.3 ms = same (headless DPR 2 runs at ~31 fps for both).
   Blips (rla.py thr 12): MAIN 1255 | lane 1349 per frame (all); dt band 30-36 ms: 1244 (n 126) | 1435 (n 131) (+15 %); 31-34: 1018 | 1370;
   28-31: 1533 | 994. => the real loop does NOT show the stepped same-pose gain over MAIN (stepped DPR 2 left box: 1305 -> 1053); the
   real-loop metric is noisy (not same-pose; the round-1 re-judge found p4wl +28 % over MAIN in the same kind of band); no clear regression.
## 20:11-20:20 PERF (own STRICT perfab, SLOT_BG=0, T1 pointer sweep 1440x766, A = :5162, B = :5164, interleaved; perf/sweep.txt + .json):
   9 pairs, 8 VALID (pair 0 invalid: ran beside my own real-loop jobs), loads 1.6-4.3, no other slot holder in any valid pair.
   Per pair B/A: 1.025 1.010 1.117 1.015 1.000 1.010 1.026 0.953 -> paired median 1.013 (perfab's upper-median 1.015), mean 1.020;
   A med 19.5 / B med 19.7 ms. Modes (split 20.8 ms): A low 19.4 (n 7) / high 21.2 (n 1); B low 19.7 (n 7) / high 21.9 (n 1).
   => +1.3-1.5 % (low mode +1.5 %): BAR (3) PASS. (Matches the builder's +1.5-2 % estimate.) T0: ident-identical to :5163 = unchanged.
## 20:20-20:24 real-loop calibration T1 DPR 2 (3 runs MAIN, 3 lane, 2 p4wl, each alone; rl/rlcols.txt; blips/frame by column band of
   the CSS 0-480 x 440-620 region at 1512x860; dt p50 30.4-32.5 ms except lane_c 35.2):
   left water (CSS 0-160, in front of the left ice sheets): MAIN 350 / 355 / 332 | p4wl 530 / 528 | lane 549 / 554 / 689
   shelf water (CSS 160-320): MAIN 247 / 240 / 229 | p4wl 159 / 154 | lane 161 / 153 / 211
   CSS 320-480: MAIN 658 / 635 / 610 | p4wl 610 / 610 | lane 640 / 627 / 711; whole region MAIN 1170-1255 | p4wl 1292-1299 | lane 1333-1349.
   LOOK img/rl_T1d2_leftwater_MAIN_P4WL_LANE.png (frames, |diff| x6, 150-frame blip heat) + img/rl_T1d2_heat_MAIN_LANE.png: p4wl and the
   lane pop in larger, blotchier patches in the left open water than MAIN; lane = p4wl. => in the REAL loop at the client's config the
   left water pops ~+55 % vs MAIN (inherited from p4wl's P4WL_BAND, lane +4 % vs p4wl), while the shelf water is -35 % (WL-RJ1 gain).
   The stepped harness shows the opposite in the left box (lane 1053 < MAIN 1305), so it misses this real-dt behaviour.
## tsc: not re-run (time box); the builder's tsc (19:16, after the final source mtime 19:11:38) is empty = clean in both configs.
## VERDICT 20:26: pass = false.
- WL-RJ1 (the morphing contour): FIXED at T1 DPR 1 and DPR 2 (same-pose sheets; real-loop shelf water -35 % vs MAIN). The outline is
  still a static quarter-texel staircase (minor). Re-anchors redraw it once each (nit).
- MAJOR (inherited from p4wl, not caused by wl2g): real loop T1 DPR 2, left water in front of the left ice sheets pops ~+55 % vs MAIN.
- MAJOR (pre-existing, BAR 2): stepped left box vs GT +78 % (DPR 1) / +22-29 % (DPR 2) > +15 %.
- BAR 3 perf PASS (8 valid STRICT pairs, +1.3 %); BAR 4 s60 PASS; BAR 5 FAIR fast + reverse PASS; BAR 6 ident PASS; BAR 7 (ice untouched,
  T0 identical, 0 console errors; tsc per builder) PASS. Rest look lake-only +-1-3 levels; hold = p4wl.
