# judge_wl2 LOG (final judge of merged lane wl2 :5167)
- 21:02 start. Base :5163 (p4wl), MAIN water :5162. Time box 45 min (to ~21:47).
- 21:03 read p4r4_common, p4pri2_common, p4wl-water args (build/judge/lead decision), p4wl2-water args (common + LEAD NOTE 20:30, final_judge),
  integrator report + LOG + HANDOFF, judge_wl2g LOG. Sources: LANES/wl2 vs LANES/p4wl differs ONLY in Water.ts (sha d94c26c2 = LANES/wl2g);
  IceMaterial.ts == MAIN's; MAIN Water.ts == p4ph's. Served /dist/main.js sha256: :5167 849d7909 == :5164 (wl2g build 4); :5163 2306d059; :5162 445b1f6c.
- 21:03-21:07 OWN IDENT vs FRESH refs (id/ident_summary.txt; final + every target + every linked program, 20 moving frames):
  ?wl2g=0 == fresh :5163 IDENTICAL at T1, T2, release 0.33; ?p4wl=0 == fresh :5162 IDENTICAL at T1, T0 phone, expand 2.97;
  merged ON == fresh :5162 at T0 phone (phones unchanged vs MAIN); controls: merged ON vs :5163 T1 differs only in rx-water-walk,
  vs :5162 T1 only in rx-water + rx-water-walk (ice program untouched). logs 0/0 in all 15 runs. PASS.
- 21:07 same-pose shelf sheet (wl2g's stored d?_M / d?_G4 [= :5167 bytes per integrator] / GT; img/d2_shelf_MAIN_WL2_GT_x2.png, d1_*_x4.png;
  CSS 285-405 x 450-495, contrast x4, frames 98-100 + |diff| x10). LOOKED (d2): MAIN redraws the crenellated teeth each frame (filled diff
  patches); wl2 keeps one outline that slides (thin diff lines) = RJ1 morph gone; the outline is still a hard quarter-texel staircase
  the soft GT does not have. mean|d| over the band MAIN 1.95 | wl2 1.74 | GT 1.54 (DPR 2); 2.02 | 1.82 | 1.44 (DPR 1).
- 21:07 STRICT perf (8 valid wanted, max 11) started in the slot; then own same-pose d2/d1 captures, real loop T1 DPR 2 (3 M + 3 W alternated), far-slab real loop.
- 21:07-21:13 OWN PERF (perf/sweep.txt, sweep_summary.txt): STRICT perfab, SLOT_BG=0, T1 pointer sweep 6 s, 1440x766, A = :5162, B = :5167,
  interleaved; 8 / 8 VALID (no other slot holder in any run, 1-min load 2.3-3.2; nothing else of mine running).
  B/A per pair: 0.975 0.961 0.985 1.020 0.995 0.958 1.052 0.943 -> paired median 0.980 (-2.0 %), mean 0.986. A med 20.4 / B med 20.1 ms.
  Modes: A spans 19.3-21.2 (19.3 / 19.7 low; 20.3-20.5 mid; 21.2 x2 high); B tight 19.6-20.3 (one mode). Pairs where A hit 19.3 / 19.7:
  +5.2 % / +2.0 %; else B <= A. => cost between ~-2 % and ~+5 %; BAR (3) PASS (same picture as the integrator's 12 pairs).
- 21:14 OWN same-pose captures of :5167 (cap.mjs fast, T1, 120 frames, DPR 1 + 2): BYTE-IDENTICAL to wl2g's d1_G4 / d2_G4 (120 / 120 each,
  st/bytecmp.txt). Blips thr 12, MAIN | p4wl | wl2 | px | GT (st/d1_blips.txt, d2_blips.txt; GT area-resampled to the buffer):
  DPR 1: left 774 | 590 | 577 | 711 | 325 (wl2 +78 % over GT: BAR (2) FAIL, pre-existing, MAIN +138 %); shelf 216 | 206 | 205 | 222 | 192 (+7 %);
         far 1101 | 990 | 977 | 1173 | 920 (<= p4wl).
  DPR 2: left 1305 | 1075 | 1053 | 1270 | 761 (+38 %: FAIL, MAIN +71 %); shelf 345 | 329 | 328 | 340 | 312 (+5 %); far 1797 | 1599 | 1586 | 1906 | 1596.
- 21:14-21:17 REAL LOOP T1 DPR 2 set 1 (rl.mjs, 1512x860, canvas 1890x1075, scale 1, pointer circling 4 s/rev, CSS 0-480 x 440-620;
  M W M W M W alternated, 150 frames each; CAVEAT: my stan.py ran on the CPU during runs b / c of both builds). rl/rl1_T1d2.txt:
  all frames (n 444 each): left water (CSS 0-160) MAIN 396 | wl2 710 (+79 %); shelf water (160-320) 287 | 231 (-20 %); 320-480 689 | 738.
  dt-banded (both steps of the blip in band): 30-36 ms n 328 | 196: left 409 | 699 (+71 %), shelf 300 | 226; 33-36 n 179 | 112: left 415 | 831;
  30-33 n 61 | 40 (too few): left 338 | 340. LOOKED img/rl1_T1d2_leftwater_sheet.png + img/rl1_leftwater_zoom_MAIN_WL2.png (CSS 0-128 x
  528-620, x3, 3 frames + |diff| x6, dt 33-36): wl2's open water left of / in front of the left ice sheets carries darker, higher-contrast
  horizontal ripple stripes that jump frame to frame (diffs = streaks over the whole open water); MAIN's water there is smoother (diffs
  dark except a few bright glint dashes). Not blocky shapes: a shimmer of the ripple stripes. => wl2 pops MORE than MAIN in the client's
  config (confirms WL2G-J1). Clean re-run queued (chain3).
- 21:17-21:18 REAL LOOP far slabs T1 DPR 2 (1440x766, CSS 860-1440 x 420-600, 100 frames each): far water (buffer 90-725 x 70-225)
  MAIN 710 | wl2 569 blips/frame (dt 26-40: 825 | 603, n 81 | 92) = -20 to -27 %; slab-foot lips (90-450 x 58-118) 46 | 48 (equal).
  LOOKED img/rlfar_T1d2_MAIN_WL2.png and img/rlfar_lips_x2_MAIN_WL2.png: columns and lips look the same in both (short soft columns, thin
  stepped lip lines at the slab feet that crawl with the camera): complaints (2) and (3) unchanged = not fixed, not worse.
- 21:20-21:22 REAL LOOP T1 DPR 2 CLEAN re-run (M W M W, nothing else of mine on the CPU; dt p50 MAIN 34.3 / 31.0, wl2 32.6 / 32.1 ms):
  rl/rl3_T1d2_clean.txt: all frames (n 296 each) left water MAIN 387 | wl2 562 (+45 %); shelf 276 | 159 (-42 %); CSS 320-480 663 | 657.
  dt 30-36 (n 195 | 249): left 365 | 635 (+74 %); 28-34 (n 158 | 199): 356 | 673 (+89 %); 30-33 (n 85 | 138): 292 | 729; 33-36 (n 87 | 73): 398 | 475.
  ALL 10 runs pooled (rl/rlALL_T1d2.txt, n 740 each): left 392 | 651 (+66 %); dt 30-36 n 523 | 445: 393 | 663 (+69 %); dt 33-36 n 266 | 185:
  410 | 690 (+68 %); dt 30-33 n 146 | 178: 311 | 642 (+106 %); shelf 282 | 202 (-28 %); CSS 320-480 679 | 706 (+4 %).
  LOOKED img/rl3_T1d2_clean_leftwater_sheet.png: same picture as set 1 (wl2's blip heat covers the whole open water left of the sheets).
  => DECIDING TEST (lead note 20:30) FAILS: in every dt band with n >= 100 per build, wl2 pops +68 to +106 % more than MAIN in the water in
  front of the left ice sheets. Inherited from p4wl's P4WL_BAND (judge_wl2g: p4wl 530 / 528 vs MAIN 350 / 355 / 332 there).
- 21:18-21:20 REAL LOOP T1 DPR 1 (1512x860, 2 + 2 runs; rl/rl_T1d1.txt): left 79 | 109 (+38 %), shelf 53 | 35 (-34 %), right 320 | 303.
  T2 DPR 2 (canvas 2268x1290, 1 + 1; rl/rl_T2d2.txt): left 710 | 1225 (+73 %), shelf 646 | 590, right 1279 | 1372 (+7 %). dt distributions
  overlap little in these two (wl2 dt p50 +7 % / +10 % in the capture loop: single runs), so the DPR 1 / T2 rows are indicative only.
- 21:22 STRICT perf A/B at the client config (perfab_d2.mjs = perfab with viewport 1512x860 DPR 2, sweep re-centred, ?tier=T1&scale=1) started.
- 21:22-21:27 STRICT perf at the CLIENT config (perf/sweep_d2.txt, sweep_d2_summary.txt; T1 1512x860 DPR 2, canvas 1890x1075, scale 1,
  A = :5162, B = :5167; 6 / 6 VALID, no other slot holder, load 2.6-4.4): B/A 1.031 1.031 1.022 1.040 1.025 1.028 -> paired median 1.029
  (+2.9 %), unimodal (A 32.2-32.6, B 33.1-33.6 ms). Within +5 % (PASS) but a steady +3 % at the client's resolution (vs -2 % at 1440x766 DPR 1).
- 21:27 dt-overlapping bands (rl/rl_T1d1_bands.txt, rl_T2d2_bands.txt): T1 DPR 1 dt 22-26 (n 180 | 174) left water 92 | 136 (+48 %),
  22-28 (n 202 | 242) 90 | 117 (+30 %); shelf -32 to -39 %. T2 DPR 2 dt 40-50 (n 123 | 142) left 721 | 1267 (+76 %).
  => the left-water excess is on every desktop tier / DPR, not only the client's.
- Looked (all cited images): wl2_merged_slabs_T1_far_1x / 2x, T1_left_1x, T2_far_1x (REF | merged | MAIN), wl2_merged_2x_MAIN_MERGED.jpg,
  wl2_merged_contour_T1dpr2_x4, own img/d2_shelf_MAIN_WL2_GT_x2.png, d1_shelf_MAIN_WL2_GT_x4.png, rl1_T1d2_leftwater_sheet.png,
  rl1_leftwater_zoom_MAIN_WL2.png, rl3_T1d2_clean_leftwater_sheet.png, rl_T2d2_leftwater_sheet.png, rlfar_T1d2_MAIN_WL2.png,
  rlfar_lips_x2_MAIN_WL2.png; client evidence flk/heat2x.png, bibir/sheet.jpg; judge_wl2g rl_T1d2_leftwater / heat images.
- 21:28 tsc (own, --noEmit --incremental false, nothing written): tsconfig.hero.json exit 0, tsconfig.json exit 0 (tsc_hero.txt, tsc_app.txt).
- 21:28 LOOKED img/rl3_leftwater_zoom_MAIN_WL2_clean.png (clean runs, CSS ~0-128 x 528-620, x3, dt 33-35.5 both): wl2's open water in
  front of the left ice sheets has darker, higher-contrast horizontal ripple stripes and its frame diffs streak brightly over the whole
  area; MAIN's diffs there are much dimmer. Likely cause (code read, Water.ts P4WL_BAND lkWalkRead): the per-pixel share
  Phi((tap horizon - mu) / sE) uses mu from the pixel's own bumped ripple normal with a narrow sE (2 * 0.07 * lkSig.y), so wherever a face
  horizon is present it becomes a near-binary per-pixel mask of the ripples that jumps with the ripple phase step per real frame (~33 ms);
  MAIN interpolated quarter-res shares (smooth). The stepped harness (fixed small step) does not show it.
## 21:29 VERDICT: pass = false.
- BLOCKER WL2-FJ1: deciding test (lead note 20:30) fails - real loop T1 DPR 2, dt-controlled, n >= 100 per band: the water in front of the
  left ice sheets pops +68 to +106 % more than MAIN (pooled 10 runs: 392 | 651 /frame; clean set dt 30-36: 365 | 635). Also T1 DPR 1
  +30-48 %, T2 +76 %. Inherited from p4wl's P4WL_BAND (not from wl2g's anchoring).
- MAJOR WL2-FJ2: complaint (2) far reflection columns NOT addressed (merged == MAIN, REF's long bright ripple-broken columns not reached).
- MAJOR WL2-FJ3: complaint (3) the far slab lips / edges NOT addressed (same stepped lips crawling in motion; lips 46 | 48 blips/frame).
- MAJOR WL2-FJ4 (pre-existing): BAR (2) left box vs GT +78 % (DPR 1) / +38 % (DPR 2) > +15 % (MAIN +138 % / +71 %).
- MINOR WL2-FJ5: the shelf reflection outline is a static hard quarter-texel staircase the GT does not have (morphing itself is FIXED).
- NIT WL2-FJ6 (carried from judge_wl2g, not re-measured): each re-anchor redraws the contour once.
- PASS: own ident (fresh refs, 9 comparisons), tsc 0 / 0, perf T1 1440x766 -2.0 % (8 / 8) and T1 DPR 2 client config +2.9 % (6 / 6),
  same-pose bytes = wl2g (120 / 120 x 2), WL-RJ1 morph gone (looked), shelf / far boxes, far water real loop -20 to -27 %, FAIR six paths and
  60 fps sparkle (integrator / judge_wl2g on the byte-identical bundle 849d7909), ice untouched (IceMaterial == MAIN; ice program not in
  the ident diff), T0 phone IDENTICAL to MAIN.
