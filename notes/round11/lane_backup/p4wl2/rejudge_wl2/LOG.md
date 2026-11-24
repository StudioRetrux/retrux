- 22:29 REJUDGE start (wl2 fix round). :5167 main.js 7bed38e9 (fixer's final), :5162 445b1f6c, :5163 2306d059, :5164 849d7909. Chain: T1d2 real loop MWMWMW -> ident fresh refs -> STRICT perf DPR2 -> T2d2 loop -> rest caps -> s60 -> T1d1 loop.
- 22:30-22:32 DECIDING TEST re-run, CLEAN (M W M W M W alone in the slot; rl.mjs 1512x860 DPR 2, canvas 1890x1075, scale 1, pointer circling;
  rl/rl_T1d2.txt, rl/rlbin_T1d2.txt). Left water (CSS 0-160) blips / frame, MAIN | wl2:
  all frames (n 444 | 444) 317 | 378 (+19 %, wl2 dt p50 +1.1 ms); dt 28-34 (n 379 | 396) 339 | 376 (+11 %); 30-33 (n 117 | 251) 364 | 402 (+10 %);
  30-36 (n 135 | 304) 370 | 422 (+14 %); 28-31 (n 269 | 138) 343 | 348 (+1.5 %). Per run, dt 28-34: MAIN 324 / 311 / 334, wl2 356 / 384 / 385
  (every wl2 run above every MAIN run). 1-ms bins: 30-31 (n 142 | 97) +3 %, 31-32 (n 74 | 119) +22 %, 32-33 (n 37 | 123) +15 %; linear fit:
  +2 % at 30 ms, +7 % at 31, +11 % at 32. Shelf (160-320) 234 | 218 (-7 %), right (320-480) 635 | 648 (+2 %).
  => FJ1's +66-106 % is gone (pre-fix judge: 392 | 651), but a residual +10 % (larger at dt >= 31 ms) remains: still more than MAIN.
  LOOKED img/rl_T1d2_leftwater_zoom_MAIN_WL2.png (x3, rows MAIN / wl2, matched dt 30-31.6): the dark high-contrast stripes of the pre-fix build
  are gone, the water tone and ripple stripes read like MAIN; wl2's diff maps are a little busier in the open water left of the sheets.
- 22:32-22:34 ident vs FRESH refs (id/ident_summary.txt): p4wl=0 == :5162 T1; wl2g=0 == :5163 T1 + T2; wl2fj=0 == :5164 T1; wl2 ON == :5162 at
  T0 phone; 0 console errors; controls differ (rx-water + rx-water-walk programs; vs :5164 the walk target differs too).
- 22:34-22:39 STRICT perf A/B at the CLIENT config (perfab_d2: T1 1512x860 DPR 2, canvas 1890x1075, scale 1, pointer sweep; A :5162, B :5167;
  perf/sweep_d2.txt, sweep_d2_summary.txt): 6 / 6 VALID, no other holder, load 1.9-2.9; B/A 1.035 1.028 1.038 1.044 1.025 1.047 -> paired median
  1.036 (+3.6 %), unimodal A 31.8 / B 33.0 ms. Within +5 % (PASS); the pre-fix wl2 measured +2.9 % here (judge_wl2), so the fix adds ~0.7 %.
- 22:39-22:41 real loop T2 DPR 2 (canvas 2268x1290, M W M W; rl/rl_T2d2.txt, rlbin_T2d2.txt): left water all (n 296 | 296) 699 | 754 (+8 %);
  dt 39-45 (n 208 | 239) 720 | 772 (+7 %); 40-44 (n 101 | 188) 818 | 723 (-12 %); 40-50 (n 124 | 237) 820 | 754 (-8 %); per run 709 / 706 vs
  792 / 759; linear fit +6 to +9 %. Shelf 620 | 581 (-6 %), right 1243 | 1299 (+5 %). Pre-fix judge: +76 %. => mostly fixed, residual ~+7 %.
- 22:41-22:42 rest captures T1 / T2 1440x766 (caps/rest_*; img/slabs_T{1,2}_REF_WL2_MAIN_{far,left}_{1x,2x}.png, rest_T{1,2}_absdiff_x8.png):
  MAIN vs wl2 differ only in the water (y 468-764; above y 430 no pixel > 2 levels: the rings / sky / berg unchanged, bloom spill <= 2).
  LOOKED far 2x T1 and left 1x T1: wl2 == MAIN at a glance; the far slabs still cast short soft columns, REF's long bright ripple-broken
  columns are not there (FJ2 open); left sheets same as MAIN.
- 22:42-22:43 60 fps sparkle at rest (shoot_ripple 40 frames dt 1/60, T1 DPR 1; s60/s60_far.txt, s60_left.txt), blips / frame MAIN | wl2:
  far water 2.0 | 1.8, lips 1.1 | 1.2, left water 2.1 | 2.2, shelf 0.2 | 0.2; mean |dL| lower for wl2 in every box. = MAIN within noise: PASS.
- 22:44-22:45 real loop T1 DPR 1 (1512x860, M W M W; rl/rl_T1d1.txt, rlbin_T1d1.txt): left water all (n 296 | 296) 76 | 86 (+13 %); dt 21-24
  (n 183 | 173) 73 | 82 (+12 %); 22-26 (n 122 | 199) 109 | 87 (-20 %, the fixer's band: MAIN's frames sit higher in it); 1-ms bins 22-23
  (n 92 | 75) +23 %, 23-24 (n 90 | 87) +8 %; per run dt 21-26: MAIN 72 / 71, wl2 89 / 84. Pre-fix judge: +30-48 %. => residual ~+10-20 % in
  matched bins, much smaller than before.
- 22:45-22:46 same-pose stepped (cap.mjs fast path 120 frames, own d2_W / d1_W of :5167 vs judge_wl2's d*_M / d*_L / d*_G4 / d*_PX / GT;
  st/d2_blips.txt, d1_blips.txt), blips at thr 12, MAIN | p4wl | pre-fix wl2 | wl2 | px | GT:
  DPR 2 left 1305 | 1075 | 1053 | 1262 | 1270 | 761 (wl2 +66 % vs GT, MAIN +71 %); shelf 345 | 329 | 328 | 342 | 340 | 312 (+9.6 %, pass);
  far 1797 | 1599 | 1586 | 1729 | 1906 | 1596 (+8.1 % vs :5163: BAR (2) far item FAILS; -4 % vs MAIN).
  DPR 1 left 774 | 590 | 577 | 760 | 711 | 325 (+134 % vs GT, MAIN +138 %); shelf 216 | 206 | 205 | 212 | 222 | 192 (+10 %, pass);
  far 1101 | 990 | 977 | 1065 | 1173 | 920 (+7.6 % vs :5163, FAIL; -3 % vs MAIN). d2_W numbers = the fixer's d2_FIN exactly.
  LOOKED img/d2_shelf_MAIN_PREFIX_WL2_GT_x3.png (rows MAIN / pre-fix / wl2 / GT, frames 98-100 + diffs): MAIN redraws the dark teeth
  (filled diff patches); wl2 keeps one outline that slides (thin-line diffs, like pre-fix): BAR (1) holds. The outline is still a hard
  stepped blob; GT is soft (FJ5 open). Band mean |d| MAIN 1.95 | pre 1.74 | wl2 1.86 | GT 1.54.
- 22:46-22:48 far real loop T1 DPR 2 (1440x766, CSS 860-1440 x 420-600, M W M W; rl/rlfar.txt): whole region MAIN 2337 / 2315 | wl2 2369 / 2340
  (+1.2 %); slab-foot lip band 45 / 44 | 47 / 50. LOOKED img/rlfar_lips_a.png: same thin stepped lips at the slab feet, same edge motion in
  the diffs, blips in the same places: FJ3 unchanged (not worse).
## 22:55 VERDICT pass = false. FJ1 mostly fixed (+66-106 % -> ~+10 % at T1 DPR 2; T2 +76 % -> ~+7 %; DPR 1 +30-48 % -> ~+10-20 % in matched
   bins), but wl2 still pops a little more than MAIN in front of the left ice sheets (lead's rule: not more than MAIN) = major (RJ-1).
   FJ2 / FJ3 open (major, unchanged), FJ4 open (major; BAR (2) left box at MAIN's level vs GT, and the far box is now +8 % vs :5163),
   FJ5 open (minor), FJ6 nit carried. Gates that pass: ident (fresh refs), tsc (fixer), 0 console errors, perf +3.6 % at DPR 2 (6/6),
   60 fps sparkle = MAIN, rest look = MAIN, T0 identical to MAIN, ice unchanged.
- 22:51 analysed capture sets deleted (rl/, caps/, s60/, st/d*_W); evidence images + tables kept and mirrored.
