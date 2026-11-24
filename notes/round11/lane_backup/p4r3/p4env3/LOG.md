# p4env3 LOG (P4 round 3, lane env) - started 21 Nov 2026 05:02 WIB
Brief: MAIN/notes/round11/workflows/briefs/p4r3_common.md. Tasks: J1-J7 of the round-1 env judge (lane_backup/p4r1/judge_p4env).
Lane = `cp -c -R LANES/int1 LANES/p4env3` (05:03; app/ == int1). Lab :5174. WORK = $SP/work_p4/p4env3.

## 05:03-05:12 setup, reading
- Read: brief, judge_p4env.json (J1-J7), p4r1/p4env HANDOFF + LOG (fixer attributions), plan G3 / G4, p4water HANDOFF / LOG
  (no mention of the J2 smudge), int1 HANDOFF. Tools copied from the round-1 lane / judge / int1 (shots.mjs, uvprobe.mjs,
  identP.mjs, perfab.mjs, im.py, rim.py).
## 05:08 J7 (lossy WebP)
- cwebp q95..100 (+/- sharp_yuv) and near-lossless 40/60/80 of the decoded lossless p4 texture (dwebp = libwebp, Chrome's decoder).
  q100 sharp_yuv: 39,074 B (vs 117,944 lossless, MAIN f1 28,652); repaired 5,729 texels: mean 1.50, p99 7, max 15, 95.3 % of
  the repair kept; other texels mean 0.55, p99 3, max 18. Frame A/B (ab1/webp vs ab1/r1, 38 deterministic shots): max 1 level
  in EVERY shot (ptr_*, sw_*, late*). Shipped as baked/Object_2_010_p4q.webp (`?p4webp=0` = the lossless file).
## 05:14-05:24 J3 (far-peak warm rim) + J6 first try
- Built: Atmos.ts CREST_P4_TOP (crest_ray2.json far.v per column = the far mesh's own top; 0 for the mist columns 115-128),
  RGBA crest table, CLOUD_FRAG_P4 occ = max(old band, 1 - smoothstep(top - 0.001, top + 0.0005, ruv.y)).
- ab1 (shots.mjs, same sim time per shot): warm-rim px (B-R < 22, luma 140-205) in x900-1200 y420-520, round 1 -> rim:
  hold_L 223 -> 102, hold_T 164 -> 12, hold_BL 77 -> 2, hold_R 211 -> 53, hold_TR 208 -> 60, hold_B 85 -> 34; pops
  (x850-1250 y380-520) 127-158 -> 6-25. ev/j3_ab1_hold.png (crisp grey top edge vs r1's beige rim), ev/j3_orbits.png (no blue
  sliver at ptr_left / top_left / orb / rel_L), ev/j3_rest_skyline.png (rest t=8.5: the card's light veil on the far right
  range's top edge gone; F000 shows that range unveiled). Rest changes only there: ptr_rest 881 px > 2, max 21, mean -5.6.
- J6 v1 (floor on the change's luma, 40 % uniform): slits fixed (ridge n<50 ptr_right 16 -> 1) but the face box at late90
  is IDENTICAL to round 1 (162.9 / p10 138.5): the cap was a 40 %-of-luma cap, not a per-channel artefact.
## 05:26-05:29 batch2: J6 floor shares, J5 attribution, J4 / J2 probes
- J6 (late90 face box x200-420 y220-400; MAIN = ?p4card=0): MAIN 161.4 / p10 135.3 / B-R 37.3; round 1 162.9 / 138.5 / 34.4;
  luma 0.4 162.9 / 138.5 / 35.9; luma 0.4 dark / 0.65 white-lit 161.5 / 135.8 / 36.8. Ridge n(L<50) late90_right MAIN 148,
  r1 1, 0.4/0.65 1; late150_right 50 / 1 / 1; late90_rest 92 / 0 / 0. -> default 0.4 / 0.65 (ev/j6_late90_face.png: MAIN's
  blue-violet blotches stay away, shadow depth back).
- J5: zig.mjs (late90 rest): the hairline is GONE with the cloud group hidden and stays with BG001 hidden
  (ev/j5_zig_attr.png); box x262-288 y236-250 sd 14.53 -> 12.42 without clouds. A drifting card through a raster crack in
  V2_Massif (the round-1 ray test hits V2_Massif at every pixel there, so a T-junction). Not fixed (mesh repair / cloud guard).
- J4: uvprobe rest x330-400 y467-480: direct rays Plane.014 (at / below the water line), mirrored rays V2_Massif (216 / 252):
  the box is the lake reflecting the massif; left of the cut (x300-330) the floe Retopo_Plane.006. The cut is the floe's end,
  also in ?env=projected (round-1 fixer) = in plate_rest: the v7 scene's floe / shelf is shorter than F000's band. Not fixed.
- J2: uvprobe hold_B x1390-1440 y731-753 (int1's hold camera): direct AND mirrored rays hit only BG001 (390 / 370 m; its texels
  there are plain sky blue, j2/bg_view.png): open water reflecting the sky, no floe, no back face. The grey patch (luma 136 vs
  173 beside it) is the R12 lake's own shading -> water lane (Water.ts LAKE_R12). Nothing for the env lane.
## 05:30-05:38 finals v1 (J3 + J6 0.4/0.65 + J7): tsc 0 / 0; ident (identP, 20 moving frames) ?p4env3=0 == :5173 at T1 / T2 / T0 /
   envlake=plate; ?p4env=0 identical on both labs at T1 / T2; qc_r11 -> qc_final (later replaced). Patch applied to an int1 clone.
## 05:38-05:47 J5 root cause (zig2.mjs: cards hidden one by one at t=92.5)
- Card 0 alone (z -104.2 m, rangeOcc 0) makes it: box x262-288 y236-250 mean / sd / hot px 145.69 / 15.84 / 19 -> 144.29 / 13.69 / 7
  without it (= all clouds hidden). uPlateDepthOn = 0 on every card with the mirror lake (bakeDepth runs only for the plate
  lake), so CLOUD_FRAG's projector guard is off on T1 / T2.
- First try: bake the plate depth for the cards (bakeCloudDepth) -> guard on: NO change (19 hot px). The round-1 ray data
  (jfix/uv_zig.json) puts the summit at 114.8-122.2 m along those rays and the card plane at ~119.5 m: NOT a crack, the card
  plane cuts through the summit and the depth test draws it wherever it lies just in front of the undulating surface.
- 05:47 perf run started then stopped by me before it took a slot (to rebuild); perf_aborted_0542 is empty of results.
## 05:53-06:13 J5 fix: soft intersection fade (soft particles) on the plate depth
- One-sided fade (surface behind the card within 10 m): 19 -> 16 hot px. Two-sided |sz - fz| 10 m: 15; 20 m: 11 (no clouds: 7);
  box mean 144.52 vs 144.30 without clouds. ev/j5_soft_zig.png (MAIN | 10 m | 20 m, 5x).
- Final form: the cards keep uPlateDepthOn 0 (MAIN's guard stays off), one extra fetch of their own uP4CloudDepth (bakeProjector
  once at start / after a context restore, mirror lake only; P4_CRACK define = 20 m). ab3/fin vs ab3/nocrack (38 shots, same
  sim time): changes only on the massif's upper part (bbox x50-520 y170-430): late90 the zig-zag (176-268 px, max 76-83, mean
  -13); elsewhere 3-346 px, max 4-16, mean -2..-4 (the card's veil right at the summit's top edge, ev/j5_holdB_s20.png:
  1 px crisper, no sliver); ptr_rest 11 px max 4; late150 none.
## 06:13-06:25 finals v2 (final code)
- tsc hero 0 / project 0 (tsc_*.log). Ident (identP, 20 moving frames; id/ident_summary.txt): ?p4env3=0 == :5173 IDENTICAL at T1
  (14 targets / 16 programs), T2 (15 / 16), T0 phone (9 / 12), envlake=plate (10 / 12); ?p4env=0 on :5174 == ?p4env=0 on :5173
  at T1 and T2; control: lane default differs at T1 (final, mirror, walk, main, refraction, bloom; rx-plate-baked, rx-cloud,
  rx-plate-baked-mirror); T0 default: final + all 9 targets SAME, program text of rx-plate-baked / rx-cloud differs.
- qc_r11.zsh -> qc_final (no page errors; 31 ptr files, 36 sweep files). region_stats_q00 vs MAIN r11_2 within 0-3 except
  mid left -9/-8/-6, water near +8/+6/+5 (capture time: the clouds sit elsewhere; ev/q00_dmap_vs_main_s.png). Same sim time
  (deterministic ptr_rest t=8.5, ab3/fin vs ab1/r1): all 15 boxes 0,0,0 (ev/rs_det_rest_fin_vs_r1.txt); late90 / late150 +-1.
- Patch WORK/p4env3_vs_int1.patch, 295 lines, 14 hunks, sha256 c58e6df7...; dry-run + apply on an int1 app clone: rc 0,
  0 .orig / .rej, app == lane app; int1 app == MAIN app (diff -r empty), so it applies to MAIN the same way.
## 06:24-06:58 perf
- perfwait (no other perf holder, load < 8) never opened 06:24-06:45 (3 other lanes' perf runs). Stopped it and ran bPerf.zsh rest
  move at 06:45 beside them: REST load 6.4-17.2, medians 30-65 ms; pair 0 (load < 10) 1.049 / 1.025, all pairs 1.101 / 1.069.
  Not a valid 5 % gate measurement; HANDOFF says so. MOVE ran after it (ab_move.*); HOLD not run (time box).
- 06:56 MOVE: paired 0.958 / 0.966; load < 10 pairs (3) 0.947 / 0.974. Lab :5174 left running (final code). DONE 06:57.
