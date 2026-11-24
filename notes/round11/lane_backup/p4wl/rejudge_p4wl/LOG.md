# rejudge_p4wl (water lane p4wl after its fix round; lab :5163 vs MAIN :5162) - 22 Nov 2026

## 17:42 start. Read p4r4_common.md, p4pri2_common.md, args p4wl-water (build + judge + LEAD DECISION 16:43), previous verdict, fixer report.
- Source: LANES/p4wl/retrux-web/app differs from LANES/p4ph/app only in hero/engine/world/Water.ts (sha 4bd8ccf0, 16:54);
  HeroEngine.ts == base. Patch WORK/p4wl/p4wl_vs_p4ph.patch == diff of the live files (labels only differ). Lab :5163 built 16:55:01.
- Code read: P4WL_BAND replaces lkWalkRead (the LK_CACHEN path) and walks the quarter pass along the UNBUMPED reflection; enabled
  when p4wl on + LK_CACHEN + LK_HALF + LK_WALKSEL and wlwalk != q (adds LK_WALKPX). ?wlwalk=px = old per-pixel walk.
## 17:44 chains started: FAIR fast + reverse at T1 (M and L, each vs own 16-sample 2x GT), ident (T1 / T2 / T0), real loop
   (T1 DPR 2 / 1 left box with scale pinned 1, T1 far box, T0 waterline box).
- tsc hero + app: exit 0 / exit 0 (tsc_hero.txt, tsc_app.txt).
## 17:46 ident (id/ident_summary.txt, builder's identP / identcmp): ?p4wl=0 == :5162 IDENTICAL at T1 (14 targets / 16 programs),
   T2 (15 / 16), T0 phone (10 / 14); lane ON at T0 IDENTICAL; control lane ON at T1 DIFFERS (walk / main / bloom / final; rx-water*).
## 17:46-17:50 FAIR at T1 (client tier), each vs own 16-sample 2x GT, popscan --minpx 6 (fair/fair_T1.txt):
   fast MAIN 63 events (748 px) | lane 39 (535); reverse MAIN 103 (1427) | lane 81 (1241). PASS on both paths.
## 17:47-17:52 real loop (rl.mjs, scale pinned 1, pointer circling; rl/rla_summary.txt; dt-banded rl/ via tools/dtband.py)
   T1 DPR 2 left box: MAIN 767 | lane 1212 blips/frame (lane had more 50 ms frames; dt 30-35 band: 802 | 1024 (n 140 | 46)).
   T1 DPR 1 left box: 396 | 372 (dt 22-27: 303 | 325). T1 far box (1440x766 DPR 2): 2813 | 1606 (dt 24-32: 2412 | 1636).
   T0 phone waterline box (0-414 x 495-720): 806 | 797 (T0 ident-identical: noise). Real loop stays dt-confounded.
## 17:53-18:00 same-pose check (the FAIR fast captures, T1 DPR 1 1440x766, frames 0-239; rl/stepped_T1d1.txt):
   left shelf box (x 0-420 y 470-620): MAIN 774 | lane 590 blips/frame (-24 %); far box (880-1440 x 430-590) 1101 | 990 (-10 %).
   LOOK rl/st_left.png: the open water left of the floes is cleaner than MAIN (MAIN: busy bright speckle), close to the GT.
   LOOK rl/st_shelfwater_d1.png + rl/bisect_shelfwater_M_L_px_h0.png (x 280-480 y 440-520, zoom 3-4, frames 100-104,
   columns MAIN | lane | ?wlwalk=px | ?lkhalf=0): the shelf's dark reflection in the open water right of the left shelf still has
   the crenellated / notched outline that changes shape from frame to frame in the lane, as in MAIN; with the per-pixel walk
   (px, lkhalf=0) the notched outlines are gone (diffuse grain instead). => the band read leaves part of the quarter-walk artefact
   (the per-tap horizon / colour is still point-sampled; the share is smooth but the stored horizon jumps between taps).
   Blips can't separate it (low contrast, thr 4/6/12: 118/59/4 | 108/57/3 | px 122/65/6; rl/bisect_lowthr.txt).
## 17:53-17:59 perf T1 pointer sweep (perfab STRICT SLOT_BG=0, 1440x766): 6/6 VALID, paired median 1.000 (mean 0.994),
   A 19.7 / B 19.9 ms (perf/sweep.txt). PASS. T0 phone 414x720 DPR 2 (rl nocap x2 each): frame gap p50 16.7 / 16.7 ms both, render
   p50 0.6-1.2 / 0.7 ms (perf/t0.txt). PASS.
## 18:00 60 fps sparkle at T1, far clip (860,420,580,200), 40 frames at 1/60 s, vs own DPR-2 GT (s60/s60_far.txt):
   farwater MAIN 2.1 | lane 1.7 blips/frame, lips 1.1 | 1.1 (GT 0.0 / 0.1). PASS.
## 18:01 T2 same-pose (stepped fast, 120 frames, fair/t2_stepped.txt): left box 621 | 498, far box 1068 | 977, shelf water
   206 | 200, full 10705 | 10555 => WL-J4 (T2 far pops above MAIN) is FIXED: the lane is at or below MAIN everywhere.
## 18:03-18:05 T1 DPR 2 same-pose (stepped fast at dsf 2, buffer 1800 wide; rl/stepped_T1d2.txt; note: my first px run lost its
   ?wlwalk=px through zsh word splitting = a 2nd lane run, byte-equal blips = deterministic; re-run correctly):
   left box MAIN 1287 | lane 1066 (-17 %) | px 1281; shelf water 324 | 309 | 318.
   LOOK rl/st_shelfwater_d2_M_L_px.png (zoom 2, frames 98-101): MAIN and lane both show the notched / crenellated dark contours
   of the left shelf's reflection, a new shape every frame; px has none (diffuse grain). Same as at DPR 1.
## Rest look (fixer's fix2/rest_T1_diff_x8.png, looked): lane vs MAIN differs only inside the lake, ripple-scale +-1-2 levels.
## VERDICT 18:08: pass = false.
- WL-J1 PARTLY fixed (now MAJOR, was blocker): the band read now runs by default on T1 (and T2) at MAIN's cost and cuts the
  floe-foot pops (same pose: DPR 1 left box -24 %, DPR 2 -17 %; FAIR fast 63 -> 39, reverse 103 -> 81), but the crenellated
  outline of the left shelf's dark reflection in the open water (CSS x ~280-480, y ~440-520 at 1440x766) still morphs frame to
  frame in the lane exactly like MAIN at DPR 1 and 2; only the per-pixel walk removes it. The lane's own client evidence
  (refs_user/wl_flicker_T1dpr{1,2}_MAIN_LANE_GT.jpg, middle column) shows the same notched top edge. Gate (b) not met
  (left box blips stay ~2x the GT; fixer's DPR 2: 825 = MAIN vs GT 574). The fixer's "stable, no longer changes shape" is wrong.
- WL-J2 (job B) NOT built: MAJOR stays open (far columns short / dim, notched lips; lane = MAIN in wl_farslabs_2x).
- WL-J3 FIXED (px opt-in only), WL-J4 FIXED (T2 lane <= MAIN), WL-J5 FIXED (T0 waterline box 806 | 797, ident-identical),
  WL-J6 moot by default (px path opt-in only).
- Gates: (a) PASS, (b) FAIL (partial), (c) PASS fast + reverse at T1 (others not run by anyone on the final build), (d) PASS,
  (e) PASS (T1 sweep 1.000 6/6; T0 16.7 / 16.7), (f) PASS (lake only), (g) PASS (tsc 0 / 0; 0 errors in every capture).
