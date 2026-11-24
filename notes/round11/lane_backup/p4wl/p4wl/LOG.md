# p4wl LOG (water lane: waterline flicker + far-slab reflections), builder, 22 Nov 2026

## 11:45 start
- Lane LANES/p4wl = clone of MAIN (= LANES/p4ph, :5162), app/ identical (diff -rq). No earlier LOG. Lab :5163.

## 11:50-12:10 reproduce (A)
- Tool tools/rl.mjs: REAL loop (engine's own rAF, real dt, governor live), synthetic mouse circle each frame, every engine render
  blitted GPU-side into a texture array (no readback stall; first version with PBO+fence stalled 80-190 ms: rejected), per-frame
  meta (dt, scale, lake schedule counts, camera). Analysis tools/rla.py (one-frame blips), zoom.py, jump.py.
- Client video (flk/fr) zoomed: dark BLOCKY rectangles under the long left shelf and on the open water left of the floes, a new
  shape every frame (caps/client_zoom.png, client_full3.png).
- T1 real loop (1512x860 DPR 2, ~50 fps headless): blips present but no big blocks. ?tier=T2 (an M Pro / Max Mac is T2 by
  quality.ts RULES): 4-6x more blips per px along the floe waterlines (caps/w_t2/heat.png).
- Bisect T2 real loop: lktaa=0, lkglide=0, ffblock=0 no change; envedge=0 worse; lkhalf=0 not lower in COUNT (frame rate differs
  between runs: real-loop counts are confounded by fps and by natural motion of thin features).

## 12:10-12:20 root cause (deterministic, stepped T2 fast path, same poses for every variant: tools/cap.mjs + capa.py + cmp2.py)
- MAIN T2 stepped: the client's artifact reproduced exactly: crenellated dark/pale 4x4-px blocks under the long shelf's
  waterline, morphing every frame (caps/st_def_vs_half0.png, st_sel.png).
- Variants (same frames 40-41): lkwsel=0, lkwnear=0, lkwedge=0 (walk read logic): blocks stay. lkwdiv=2: smaller blocks, stay.
  lkwalkj=1 (P4 G6 blend): fewer, stay. lkwpx=1: broken (pale bands). lkhalf=0 (walk per pixel): NO blocks.
- ROOT CAUSE: the quarter-size walk pass (LK_HALF, walkDiv 4). The walk term (low rays' faces: share + colour) depends on the
  pixel's own bumped reflection (elevation, azimuth) and the heightfield cell the ray enters: it varies per pixel. The quarter
  pass point-samples it at 1/16 of the pixels and the water interpolates the texels; each camera step moves the screen-aligned
  texel grid over new lake points -> 4x4 blocks that change shape every frame along every waterline (worse at T2: the floes are
  more pixels, the mirror target full-width).

## 12:20 fix
- Water.ts: `?p4wl` (default on): the water's lkWalkRead (LK_CACHEN path, also the rest cache pass) returns the pixel's own
  lkWalkTerm; Water.renderWalk returns early (quarter pass not drawn). Off = no text change.
- Stepped T2 fast: lane frames == lkhalf=0 look (st_fix.png: MAIN | lane | lkhalf=0): blocks gone.
- tsc both configs clean.

## 12:20-12:37 cost of the fix, cheaper variants (perfab STRICT, T1 1440x766, pointer sweep; quick 1-2 pair checks)
- v1 full per-pixel walk, quarter pass skipped: pair 0 20.4 -> 22.7 ms (+11 %).
- H: per pixel where any quarter tap holds a face (share > 0.002), quarter pass kept: 2 pairs +13.9 % (most of the lake has a
  share > 0: the far shore always takes some of the low rays). Rejected.
- S: per pixel where the four taps disagree (luma + 0.25 share spread > 0.006): +9.2 % (2 pairs); blocks gone at 0.006, back
  at 0.03 / 0.1 (st_fix4.png). Rejected.
- Q: the per-pixel band (marked taps) walked with the quarter pass's bump footprint (x4 derivatives): blocks STAY (st_fix5.png):
  the blocks are the quarter sampling of a discontinuous field (heightfield cell entries / Lmin levels), not a level mismatch.
- Sanity: ?p4wl=0 on :5163 vs :5162 sweep 0.995 (1 pair).
- 12:37: v1 (full per-pixel, pass skipped) is the candidate; 6-pair STRICT perfab sweep + rest running (perf/ab_*.txt).

## 12:43 final candidate = v1 (full per-pixel walk, quarter pass skipped); Water.ts sha f9cd2cfc...; tsc both clean
- (a) ident (id/ident_summary.txt): ?p4wl=0 vs :5162 IDENTICAL at T1 (14 targets / 16 programs), T2 (15 / 16), T0 phone
  (10 / 14), p04 expand 0.9, p06 expand 2.97, p07 release 0.33. Lane ON T0 phone IDENTICAL (T0 has no walk). Control lane ON T1
  DIFFER (walk, main, ... final; rx-water programs).
- Stepped fast path, own 2x GT each (lkmeach=1), box CSS 0-420 x 500-620 (tools/gtpop.py):
  T1 MAIN pops vs GT 2349/frame, lane 2021 (-14 %); blips seq/GT MAIN 825/576, lane 908/574.
  T2 MAIN pops vs GT 2614/frame, lane 1821 (-30 %); blips seq/GT MAIN 1225/906, lane 1283/922.
  => the block morphing is gone (pops vs GT down), but the per-pixel walk adds pixel-scale one-frame blips (wavelet / heightfield
  point sampling): blips are NOT at the GT's level (gate b as written: not passed).
- Real loop (tools/rl.mjs, 150 frames, pointer circle), blips/frame MAIN -> lane: T1 DPR1 68 -> 43; T1 DPR2 114 -> 113;
  T2 DPR2 773 -> 1250 (lane ran at 39.4 vs 35.6 ms/frame: bigger steps, confounded); T0 phone 15989 -> 15977 (unchanged).
- Rest far-slab crops REF | lane | MAIN (caps/slab_T1_far_*.png): lane == MAIN at rest. (B) NOT done.
- Deliverables: refs_user/wl_flicker_T2_MAIN_left_LANE_right.{jpg,mp4}, wl_farslabs_{1x,2x}_REF_LANE_MAIN.jpg,
  wl_leftslabs_1x_REF_LANE_MAIN.jpg, wl_client_video_blocks.jpg.

## 13:08 perf (final build, perfab STRICT, T1 1440x766, 6/6 VALID pairs each)
- sweep: paired median 1.087 (mean 1.097), 19.7 -> 21.5 ms: FAIL (> +5 %). rest: 1.022 (mean 1.027), 18.2 -> 18.4 ms: pass.
- Stage: done with the time box. ok = false: (b) blips not at GT level (pops vs GT -14 / -30 %), (c) / (d) not run, (e) sweep
  +8.7 %, (B) not done. Lab :5163 left running on the final source. Next: band-limit the walk (continuous face elevation in the
  heightfield walk) so the quarter pass can stay; then (B).

## 13:47 continuation (time box 60 min). Found an unlogged round-2 edit (13:14, P4WL_SS: the quarter texel = mean of 4 / 9 walks
over its footprint, optional per-sample bump) built into nothing yet.
- T2 stepped fast path, one common reference = the per-pixel walk at 2x (wlwalk=px, lkmeach=1; caps/v_gtpx), box CSS 0-420 x 500-620,
  pops vs GT per frame: MAIN 3507 | px 1821 (-48 %) | ss4 + own bump 2978 (-15 %) | ss9 2965 | lkwdiv=2 3120 | lkwdiv=2 + ss4 2666 |
  full-size walk target (lkwdiv=1) 1826 | lkwdiv=1 every 2nd moving frame 2054 | px + lkwalk=96 1821 (loop bound never reached).
- Perf quick check (2 pairs T1 sweep): lkwdiv=1 + lkweach=2 +11 % (worse than px +8.7 %): the cost is not the walk cadence.
- Decision: the prefilter variants do not remove the blocks (the walk is discontinuous: cell entries), the per-pixel walk does
  but costs +8.7 % at T1. => per-pixel walk is the DEFAULT ON T2 only (opts.walkPx from HeroEngine: T2 = Apple M Pro / Max /
  RTX class by quality.ts RULES, where the blocks are strongest and the GPU has the headroom), opt-in on any tier `?wlwalk=px`,
  `?wlwalk=q` off. SS code removed (lean patch: Water.ts + 1 line HeroEngine.ts). tsc both clean.
- 14:02 ident (id/ident_summary.txt): ?p4wl=0 == :5162 at T1, T2, T0 phone, p04 / p06 / p07; lane ON == :5162 at T1, T0 phone,
  p04 / p06 / p07 (T1 default unchanged); controls DIFFER: lane T2, ?wlwalk=px T1.
- 14:03 final T2 stepped (caps/v_fin == v_px numbers): left box pops 3507 -> 1821; full width (CSS 0-1512 x 480-640) pops 20553 ->
  14504 (-29 %), one-frame blips 13326 -> 14319 (GT 13215: excess 111 -> 1104); far box (880-1440) pops 3912 -> 2633, blips
  2475 -> 3100 (GT 2584). Look (caps/fin_strip_T2.png, fin_far_T2.png): MAIN's crenellated blocks under the shelf are gone, the
  lane = the GT; under the far slabs the columns are now broken by fine ripples like the GT / REF (MAIN: smooth smears); the blip
  excess is that ripple detail moving at pixel scale.
- Client file: refs_user/wl_flicker_T2_final_MAIN_LANE_GT.jpg (cols MAIN | lane | GT, 4 consecutive frames, 2x).
- 14:08 T1 check (stepped fast, own per-pixel 2x GT, left box): DPR 1 MAIN 1837 -> px 1404 (-24 %), DPR 2 2907 -> 2021 (-30 %);
  blips DPR1 472 -> 508 (GT 315), DPR2 825 -> 908 (GT 574). Look (caps/t1d1_strip.png): MAIN's morphing dark blob / blocks
  gone with px, pixel-scale speckle at DPR 1. NOTE: the client's Mac is (memory) an Apple M4 base = T1 by RULES, so the T2-only
  default does not reach it: lead decision (HANDOFF).
- 14:09 T2 rest slab crops REF | lane | MAIN (caps/slabT2_far_{1x,2x}.png): the lane's far columns are broken by fine ripples
  (MAIN: smooth); still shorter / dimmer than ref_F000 ((B) open). Client files refs_user/wl_farslabs_T2_{1x,2x}_REF_LANE_MAIN.jpg,
  wl_farslabs_T2_motion_MAIN_LANE_GT.jpg, wl_flicker_T1dpr1_MAIN_PXOPTIN_GT.jpg.
- 14:09 final perf chain started (T1 sweep 6, T1 rest 6, T2 sweep 4 pairs).
- 14:23 final perf (perfab STRICT SLOT_BG=0, 1440 x 766): T1 sweep 6/6 paired median 1.025 (20.1 -> 20.3 ms), T1 rest 6/6 1.000
  (18.6 -> 18.4), T2 sweep 4/4 1.041 (44.4 -> 45.6 ms, +2.7 %). Identical code is bimodal per run (20.1 / 21.5 ms).
- STAGE: done (time box). ok = false: (b) blips not at GT level and T1 default = MAIN (client's M4 = T1: lead decision), (d) at T2
  likely over (ripple detail blips), (c) at T2 not run, (B) length / brightness of the far columns open. Lab :5163 running.

## FIXER (judge WL-J1..J5, lead decision 16:43), 22 Nov 16:45-17:50
- 16:45-16:49 (first fixer attempt, cut off by a session restart, unlogged; recovered from WORK): P4WL_BAND written in Water.ts
  (`?wlwalk=b`): the quarter pass stores (faces' mean colour, the horizon elevation they raise) = MAIN's LK_WALKPX layout, walked along
  the UNBUMPED reflection (a function of the lake point alone); the water takes ITS OWN rays' share under each tap's horizon
  (lkPhiT((eT - mu) / sE), its own bumped elevation mu and spread sE) and interpolates the four shares. Marked taps (-1 under / -0.5
  next to a footprint) walk per pixel (MAIN's LK_WALKEDGE). Same quarter pass, same targets, no new pass. Stepped T1 DPR 2 left box
  vs the per-pixel 2x GT: b 1955 pops / 824 blips, + per-pixel walk where the taps disagree (WLB_HYB 1 / 0.5): 1949 / 832, 1931 / 850
  (no gain, extra cost): dropped. WORK/Water_v3_fixstart.ts = that state.
- 16:54 FINAL source: P4WL_BAND is the DEFAULT on every tier with the quarter walk (T1 AND T2; T0 has no walk); the per-pixel walk is
  opt-in only (`?wlwalk=px`, WL-J3); `?wlwalk=q` = MAIN's quarter read; `?p4wl=0` = MAIN. HeroEngine.ts hunk REMOVED (file == base),
  opts.walkPx removed, the lab variants (WLB_HYB / WLB_HNPX / wlbn) removed. Patch = Water.ts only (115 lines). tsc both clean.
- Stepped fast path (same poses for all; GT = per-pixel walk 2x, lkmeach=1; fix2/stepped.txt), pops vs GT / one-frame blips (GT):
  T1 DPR 2 left box: MAIN 2907 / 825 | px 2021 / 908 | LANE 1963 / 825 (GT 574)   -> pops -32 %, blips = MAIN (px: +10 %)
  T1 DPR 1 left box: MAIN 1837 / 472 | px 1404 / 508 | LANE 1332 / 464 (GT 315)   -> pops -27 %, blips -2 %
  T2 full width:     MAIN 20553 / 13326 | px 14504 / 14319 | LANE 14554 / 13273 (GT 13215) -> excess over GT 111 -> 58
  T2 far box:        MAIN 3912 / 2475 | px 2633 / 3100 | LANE 2772 / 2540 (GT 2584)   -> pops -29 %, blips +2.6 % vs MAIN, < GT
  T2 left box:       MAIN 3507 / 1225 | px 1821 / 1283 | LANE 1873 / 1201 (GT 922)
- Look (fix2/z_t1d1_shelf.png, z_t1d2_shelf.png, ev/*): MAIN's morphing dark crenellated blob under the left shelf (a new shape every
  frame) is replaced by a stable, softer dark reflection; no pixel speckle (px's grain). Residual: the dark patch's outer contour still
  shows quarter-texel stair steps at DPR 1 (stable frame to frame, not morphing); the GT is smoother and lighter there.
  T2 far columns: band = MAIN-like smooth columns (px's ripple breaks were the J4 pops); not longer / brighter (J2 open).
- 17:00 ident (fix2/id/ident_summary.txt): ?p4wl=0 == :5162 at T1 (14 / 16), T2 (15 / 16), T0 phone (10 / 14), p04 expand 0.9,
  p06 expand 2.97, p07 release 0.33; ?wlwalk=q T1 == :5162; lane ON T0 == :5162. Controls DIFFER (lake only: walk / main / bloom /
  final, programs rx-water + rx-water-walk): lane ON T1, T2, p04, p06, p07.
- 17:06-17:09 real loop (judge's rl.mjs + rla.py thr 12; fix2/rl/rla_summary.txt), blips / frame MAIN -> LANE:
  T1 DPR 2 left box 135 -> 70 (dt 21.9 / 19.1 ms, scale 0.8 / 0.8-0.7); T1 DPR 1 176 -> 51 (dt 21.7 / 20.5);
  T2 far box (1440 x 766) 2482 -> 2132 (dt 31.7 / 28.8; was 2361 -> 3843 with px); T0 phone WATERLINE box (CSS 0-414 x 495-720,
  below the rings: near rocks + floe + open water, fix2/rl/sheet_T0wl.png) 800 -> 809 (lane ident-identical on T0: run noise).
  Real-loop counts stay dt / governor-confounded; the stepped numbers above are the controlled ones.
- 17:10 rest (T1 / T2 1440 x 766): lane vs MAIN differs only in the lake (bbox y 469-763), signed luma mean far +0.8, left -0.7,
  near +0.1 (ripple-scale +-; fix2/rest_T1_diff_x8.png). Slab crops REF | lane | MAIN: fix2/slab_T{1,2}_{far,left}_{1x,2x}.png.
- Client files refreshed (refs_user): wl_flicker_T1dpr{1,2}_MAIN_LANE_GT.jpg, wl_flicker_T1dpr2_MAIN_left_LANE_right.mp4,
  wl_flicker_T1dpr2_realloop_MAIN_LANE.jpg, wl_flicker_T2_final_MAIN_LANE_GT.jpg, wl_farslabs_{1x,2x}_REF_LANE_MAIN.jpg (T1),
  wl_leftslabs_{1x,2x}_REF_LANE_MAIN.jpg (T1), wl_farslabs_T2_{1x,2x,motion}*.jpg. The old px-based T2 clip renamed
  wl_flicker_T2_MAIN_left_PXOPTIN_right.{jpg,mp4}.
- 17:12 T1 poses (shoot_poses p00 / p04 / p06 / p07; fix2/poses): the shooter's ring / crystal pixels differ run to run (both builds,
  judge noted the same); the lake in the hold (p06_lake_LANE_MAIN.png) is equivalent, no new artefact.
- 17:10-17:23 FAIR fast at T1, each vs its own 16-sample GT (fix2/fair/fair_fast.txt): MAIN 63 events / 748 px -> lane 39 / 535: pass.
  Reverse (and the other four paths) stopped at 17:23: ~4.5 min per 120-frame GT here, the time box goes to perf.
- 17:25 60 fps sparkle T1 far clip (fix2/s60/s60_far.txt): farwater 2.1 -> 1.8, lips 1.2 -> 1.1 blips / frame (GT 0): pass.
- 17:25 perf chain started (perfab STRICT SLOT_BG=0 1440 x 766: T1 sweep 8 pairs, T1 rest 6, T2 sweep 4; perf/x_*.txt).
- 17:25-17:40 perf (perf/x_*.txt): T1 sweep 8/8 VALID paired median 1.010 (mean 1.001), 19.8 -> 19.9 ms (modes: low A 19.1-19.8 /
  B 19.3-19.9 n 5, high A 21.0-21.2 / B 20.7-20.9 n 3); T1 rest 6/6 1.000, 18.1 -> 18.1; T2 sweep 4/4 1.005, 20.0 -> 19.8. T0 = ident.
- STAGE 17:41: DONE (fixer). WL-J1 / J3 / J4 / J5 fixed and re-measured on the final build (Water.ts sha 4bd8ccf0, HeroEngine.ts ==
  base); gates (a) (b) (d) (e) (f) (g) pass, (c) fast path at T1 passes, the other five FAIR paths not run (time box). WL-J2 (job B,
  far columns longer / brighter, the notched lips) NOT built: plan in HANDOFF. Lab :5163 running the final source.
