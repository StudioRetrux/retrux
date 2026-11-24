- 21:35 FIXER start (WL2-FJ1..5). Fix 1 = WL2FJ: P4WL_BAND share sE' = sqrt(sE^2 + (k fwidth(mu))^2), mu + fwidth before the walk branch; ?wl2fj=0 off, ?wl2fjk= lab. :5167 rebuilt 21:34. Real loop T1 DPR 2 chain: M / k1 / k2 alternated.
- 21:38 k = 1 / 2 (fwidth widening) real loop T1 DPR 2 (rl/rl1_T1d2.txt): left water 532 / 530 vs MAIN 332 blips per frame: NO effect. Hypothesis
  "share too narrow" wrong.
- 21:43 bisect in the real loop (rl/rl2_bisect.txt; MAIN 320): ?wlwalk=q (MAIN's read, rest of p4wl on) 319 = MAIN -> P4WL_BAND's read is the
  whole cause; k 8: 589 (wider = worse); mu with half the bump (+ its deviation as spread) 431; px walk 674; ?wl2fj=0 538 (= the judge's wl2).
- ROOT CAUSE: the share took mu / sE from the PIXEL's bump, whose finest octaves are coherent at the pixel footprint -> a face's reflection
  broken by ripple stripes a few px wide; the camera step between real frames (dt ~33 ms) moves them by > half a period (temporal
  aliasing) and they flip every frame. MAIN's quarter pass took the share from the bump at the quarter texel's footprint.
- 21:46 FIX (WL2FJ, final): lkBump keeps a second set of coherent sums with the coherence of WL2FJ_Q (4) x its footprint (min with the
  pixel's own; same noise samples, no extra noise evaluation), the coherent variance it drops goes into a second spread (LEAN); the
  share takes mu / sE from that normal / spread (wlN4 / wlSig4). Shading keeps the pixel's normal. Switch ?wl2fj=0; lab ?wl2fjq=, ?wl2fjs=.
- 21:49-21:52 deciding test, CLEAN (no other slot holder; M F M F M F; rl/rl4_T1d2.txt), T1 DPR 2 1512x860 canvas 1890x1075 scale 1,
  left water CSS 0-160, blips / frame:
  dt 28-31 (n 286 | 80): MAIN 317 | fix 289 (-9 %); dt 30-33 (n 141 | 208): 351 | 365 (+4 %); dt 28-34 (n 416 | 342): 339 | 373 (+10 %);
  dt 30-36 (n 176 | 341): 354 | 418 (+18 %, MAIN n thin above 33 ms); pooled all 331 | 386. Before the fix 532-538 vs ~332 (+60 %).
  Shelf (CSS 160-320): 231 | 215 (dt 28-34). Right (320-480): 625 | 661 (+6 %).
  Looked: img/rl_leftwater_zoom_MAIN_PREFIX_FIX.png (rows MAIN / wl2 pre-fix / fix, x3, dt 29-34): pre-fix has dark high-contrast
  ripple stripes and bright diffs over the whole open water; the fix's water tone and diffs are MAIN's (slightly busier in places).
- 21:53-21:57 ident on the Q4 build (id/ident_summary.txt): all 10 switch-off comparisons IDENTICAL (wl2g=0 vs :5163 T1 / T2 / release;
  p4wl=0 vs :5162 T1 / T0 / expand 2.97; wl2fj=0 vs :5164 T1 / T2 / expand 0.9; ON vs :5162 at T0); control ON vs :5164 DIFFERS.
  Stepped: ?wl2fj=0 d2 capture byte-identical to wl2g's d2_G4 (120 / 120, st/bytecmp.txt). tsc both configs exit 0.
- 21:54-22:07 same-pose stepped BAR (2) (st/d1_blips.txt, d2_blips.txt; MAIN | p4wl | pre | fix (S1) | fix S0 | px | GT):
  DPR 1 left 774 | 590 | 577 | 760 | 718 | 711 | 325; shelf 216 | 206 | 205 | 212 | 212 | 222 | 192 (+10 % vs GT, pass);
  far 1101 | 990 | 977 | 1065 | 1055 | 1173 | 920 (fix +7 % vs :5163: the bar's far item FAILS, still < MAIN).
  DPR 2 (S0) left 1201 vs pre 1053 / MAIN 1305; shelf 342 (+10 % vs GT 312); far 1711 vs :5163 1599 (+7 %), MAIN 1797.
  The stepped harness and the real loop disagree: the band-limited share brings the stepped boxes back toward MAIN. Narrow spread
  (S0) vs LEAN spread (S1) barely matters there. Distance fade rejected: left water 30-60 m and far box 25-90 m overlap (tools/dist.mjs).
- 22:08 final default S = 1 (LEAN spread, the variant proven in the deciding loop); rebuilt :5167; chain final.sh: far real loop,
  T1 DPR 1 real loop, STRICT perf (9 valid pairs wanted), ident on the final bundle; post.sh: d2 final capture, FAIR fast + reverse.
- 22:10-22:12 far real loop T1 DPR 2 1440x766 CSS 860-1440 x 420-600 (rl/rlfar_all.txt, rlfar.txt; 2 x M | F): whole region 2257 / 2247
  vs fix 2291 / 2284 (+1.5 %: P4WL_BAND's far-water gain of -20-27 % is given up, the band-limited share is MAIN's there); slab-foot lip
  band (buffer 90-450 x 58-118) 43 / 41 vs 49 / 44. T1 DPR 1 real loop (rl/rl5_T1d1.txt, 1512x860): left water dt 20-23 (n 178 | 66)
  55 | 49, dt 22-26 (n 109 | 195) 106 | 95, dt 22-28 111 | 99 (-10 %; the judge had +30-48 %).
- 22:11-22:19 STRICT perf T1 sweep 1440x766, A :5162, B :5167 (perf/sweep.txt): 9 / 9 VALID, no other holder, load 1.9-3.5: paired
  median B/A 1.015 (+1.5 %), mean 1.006; A bimodal low 19.8 (n 7) / high 21.2 (n 2); B unimodal 20.1 (n 9). PASS. (DPR 2 client config
  not re-run: the real-loop dt p50 at DPR 2 is pre-fix wl2's, 31.1-33.0 vs 31.2-31.3 ms.)
- 22:19-22:21 ident on the FINAL bundle (idF/ident_summary.txt): all 10 switch-off comparisons IDENTICAL; control ON vs :5164 DIFFERS.
- 22:19 d2_FIN (final build) = the earlier S1 capture: left 1262, shelf 342, far 1729 (st/d2_blips_final.txt).
  LOOKED client/wl2_merged_contour_T1dpr2_x4 (rows MAIN / p4wl / fix): MAIN and p4wl redraw the teeth (filled diff patches); the fix
  keeps one outline that slides (thin-line diffs), lower contrast; the stair-step shape remains (FJ5). BAR (1) holds.
- 22:21-22:25 FAIR vs the fixed build's own 2x GT (fair/fair_X.txt): fast 55 / 712 (MAIN 63 / 748, pre-fix 43 / 555), reverse 85 / 1253
  (MAIN 103 / 1427, pre-fix 77 / 1217): PASS (< MAIN). slow / medium / diag / leave NOT re-run (time box). 60 fps sparkle NOT re-run.
- 22:22 client files refreshed in MAIN/notes/round11/refs_user (pre-fix copies kept in refs_user/wl2_prefix_2140/): wl2_merged_1x / 2x
  (stepped d1, MAIN | fixed; looked at 1x: same), contour sheets, the mp4 (stepped fast path T1 DPR 2, MAIN left), and NEW
  wl2_merged_realloop_T1dpr2_leftwater_x3_MAIN_PREWL2_FIXED.jpg (the deciding test's look: rows MAIN / pre-fix / fixed).
- 22:24 patch WORK/wl2_vs_p4ph.patch (496 lines, Water.ts only; applied to a copy of p4ph it reproduces wl2's Water.ts, sha 5e429185;
  MAIN's Water.ts == p4ph's) and wl2fix_vs_wl2prefix.patch (93 lines). tsc both configs exit 0 (the final source).
## 22:26 RESULT: FJ1 fixed at its root cause in the deciding loop (T1 DPR 2 left water 532-538 -> 373-386 vs MAIN 331-339; equal dt
   bands -9 % to +10 %; T1 DPR 1 -10 %). Price: the stepped harness's left / far boxes move back toward MAIN (far +7 % vs :5163 = the
   BAR (2) far item FAILS; left box vs GT worse, FJ4) and the far real-loop gain is gone (+1.5 % vs MAIN). FJ2 / FJ3 / FJ4 / FJ5 not fixed.
