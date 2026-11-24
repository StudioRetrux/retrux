# judge_p4wl (water lane p4wl, lab :5163 vs MAIN :5162) - 22 Nov 2026

## 14:24 start. Read p4r4_common.md, p4pri2_common.md, args p4wl-water (build + judge), builder report (ok=false).
- Source check: LANES/p4wl/retrux-web/app differs from LANES/p4ph/app only in Water.ts (sha eab9cb0c) and HeroEngine.ts (1 line)
  = the patch. p4ph Water.ts == MAIN Water.ts. tsc hero + app: exit 0 (tsc_hero.txt, tsc_app.txt).
- quality.ts RULES: /apple m\d (pro|max|ultra)/ -> T2, /apple m\d/ -> T1, Safari on any Apple Silicon Mac -> T1. The client's Mac
  (base M4) and every Safari Mac are T1, where the lane's default is MAIN.

## 14:35 ident (id/ident_summary.txt; builder's identP / identcmp, own run)
- ?p4wl=0 vs :5162: IDENTICAL at T1 (14 targets / 16 programs, final SAME) and T2 (15 / 16).
- lane DEFAULT at T1 vs :5162: IDENTICAL (final + all targets + all programs) => on the client's machine the lane is MAIN.

## 14:24-14:34 real loop (builder's rl.mjs, own runs; rla.py thr 12; left box CSS 0-420 x 500-620 at 1512x860; rl/run.log)
blips per frame (one-frame pops), MAIN | lane default | lane ?wlwalk=px:
- T1 DPR 2: 1486 | 1472 | 2192 (px +48 %); dt 50 ms clamp (headless ~17 fps), scale 1 in all three.
- T1 DPR 1: 338 (governor scale 0.8/0.9) | 782 (scale 1) | 1283 (scale 1): governor confound; lane default is code-identical.
- T2 DPR 2 left: 1312 | 1274 (lane default = per-pixel walk).  T2 far box (CSS 880-1440 x 430-590, 1440x766): 2361 | 3843 (+63 %,
  lane dt 39 vs 30 ms: confounded, but the builder's stepped far box also shows lane 3100 > GT 2584 > MAIN 2475).
- T0 phone: 18303 | 18010 (the box y 330-490 at 414x720 is mostly the moving rings: measures ring motion, not the waterline).
- LOOK (rl/sheetz_T1d2.png, rl/sheetz_T1d1.png, rl/sheetz_T2d2.png, rl/sheet_T2far.png):
  T1 DPR 2 / DPR 1: MAIN and lane default show the same dark notched / crenellated blobs under the left shelf waterline, changing
  shape frame to frame (= the client's flicker). ?wlwalk=px: the notched blobs are gone, finer ripple speckle instead.
  T2: lane's left waterline is clean (MAIN: crenellated contours); far columns broken by ripples (MAIN: smooth smears).

## 14:41 60 fps sparkle at T2 (hero frozen t 100, 40 frames 1/60 s, vs own DPR-2 GT; caps/s60_*)
- near clip (300,540,940,226), shimmerJ boxes: lane == MAIN (zone 0.4, glint 0.3, near 0.3, rockR 0.8/0.7, rockL 0.2/0.3 per frame).
- far clip (860,420,580,200), s60far.py: farwater 1.4 | 1.4 blips/frame, lips 1.0 | 0.9. GT 0.0. Gate (d) PASS (at rest).

## 14:46 FAIR gate at T2 (lane vs own 16-sample GT; MAIN vs own GT; popscan --minpx 6; fair/)
- fast: MAIN 41 events (482 px) | lane 22 (356 px).  reverse: MAIN 82 (1055 px) | lane 66 (838 px).  PASS at T2.
- At T1 the lane is ident-identical to :5162, so the FAIR numbers are MAIN's by construction.

## 14:43 T2 poses p00 / p04 / p06 / p07 (shoot_poses, poses/): ring / crystal pixels differ run to run (sub-pixel ring timing in
   the shooter, both builds); the patch touches only the water shader. Water crops (poses/water_T2_MAIN_LANE.png): no regression.

## 14:47-14:53 perf (perfab STRICT=1 SLOT_BG=0 MODE=rest, 1440x766, A = :5162 ?tier=T1, B = :5163 ?tier=T1; perf/rest.txt)
- 6/6 VALID pairs, paired median 0.989 (mean 0.991), 18.35 -> 18.2 ms. PASS (code-identical at T1, as expected).
- T0 phone (414x720 DPR 2, ?tier=T0, rl.mjs nocap, 3 interleaved runs each; perf/t0.txt): frame gap p50 16.7 / 16.6-16.7 ms
  (vsync bound, governor 0.6 / 0.8 both), render ms p50 0.6-0.7 both. PASS (T0 ident-identical per builder).

## VERDICT 14:55: pass = false.
- BLOCKER: the client's complaint (1) is not fixed where the client looks: lane default at T1 == MAIN (ident); real loop T1
  DPR 2 1486 vs 1472 blips/frame; the notched blobs are visible in both (rl/sheetz_T1d2.png). The fix runs only on T2 (Chrome on
  M Pro / Max / Ultra, RTX class); a base M4 or any Safari Mac is T1.
- MAJOR: job (B) not done (far columns' length / brightness, notched lips of 'bibir air jelek.mov'); at T1 nothing changed.
- MAJOR: the T1 opt-in ?wlwalk=px swaps blocks for pixel speckle: real loop T1 DPR 2 1472 -> 2192 blips/frame (+48 %); builder's
  stepped blips above GT (908 vs 574, 508 vs 315); +8.7 % T1 sweep (builder) > the 5 % gate. Not shippable as the T1 default.
- MAJOR (regression, T2 only): far water in motion has more one-frame pops than MAIN: builder's stepped far box 2475 -> 3100
  (own GT 2584), full width excess over GT 111 -> 1104 / frame; own real loop far box 2361 -> 3843 (dt-confounded).
- MINOR: the T0 phone flicker box (y 330-490 at 414x720) is mostly rings: the T0 waterline was not measured (ident-identical).
- NIT: at T2 the unused quarter walk target stays allocated and the walk program still compiles; dead code after the early return.
- Gates: (a) PASS, (b) FAIL (T1 unchanged; T2 better), (c) PASS at T2 (fast 41 -> 22, reverse 82 -> 66) and trivially at T1,
  (d) PASS at rest (60 fps, T2 near + far equal), motion excess at T2 noted above, (e) PASS (rest 0.989; T0 equal; builder sweep
  1.025), (f) PASS (water shader only), (g) PASS (tsc 0 + 0, 0 console errors in every capture).
