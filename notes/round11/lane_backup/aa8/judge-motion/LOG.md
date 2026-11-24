# AA8 JUDGE, lens MOTION (20-21 Nov 2026, Asia/Jakarta), read-only
Lab AA8 :5199 (integrator's final build, pid 64433, not restarted), AA7 final :5197 (= MAIN), BASE :5182, AA6 :5196 (all up at
23:47, none restarted). WORK = $SP/work8/motion (tools/, caps/, ana/, img/, logs/). Backup = MAIN/notes/round11/lane_backup/aa8/judge-motion/.
Variants: a8 = AA8 default (knee 0.6 with the glide), a7 = AA7 final (knee 1.0; its six path caps are the AA7 motion judge's
$SP/work7/motion/caps/*_A7, deterministic stepped captures of the frozen build), g0 = AA8 ?lkglide=0 (== AA7 / AA6 ?lkglide=0 by the
integrator's ident), A6 = AA6 slow caps from the polish builder ($SP/work8/polish/caps/slow_A6), base = BASE (+ mask), GT = 16-sample BASE.
Tools = the AA7 motion judge's ($SP/work7/motion/tools; createRequire -> retrux-lanes/pw 1.49.1) + g1tab8.py / scsum.py (new) +
kerr.mjs (polish). Every browser via slot.mjs.

## 0. Static check (read-only)
- Lane aa8 app/ vs aa7 app/: 6 files differ (HeroEngine, chunks, EnvEdge, LakeMirror, PlateEnvironment, Water) = the polish patch.
- HeroEngine.ts:343 `const aaKnee = { value: 0.5 }`, :398 `if (glide) aaKnee.value = 0.6;` (AA7 :387 1.0). ?lkglide=0 keeps 0.5.

## 1. G1 (crawl.mjs, NEW masks $SP/work5/aa5a/caps/<path>_mask, stride 2, ref BASE; ana/crawl_<path>.txt, ana/g1tab8.txt)
- Captures 23:49-23:52 (cap.mjs :5199, rows 380-766, pre 30; medium 240 f, slow 160, reverse / fast / diag / leave 120): 0 console
  errors / warnings in all six. Crawls 23:51-23:58 with BASE / FIX / AA7 / AA8 / GT in one run per path. The crawl reproduces the
  AA7 motion judge's AA7 numbers exactly (slow FS -74 WR -74 DR -87 FF -83 FR -74 RS -90 tot -82 ...): the method is deterministic.
- MC32 % vs BASE, AA8 (AA7) per box FS / WR / DR / FF / FR / RS / tot:
  slow    -75.7 (-74.4) -73.9 (-73.9) -87.3 (-87.3) -83.3 (-83.0) -74.5 (-74.0) -90.2 (-90.2) -82.5 (-82.1)   gate 50: PASS
  medium  -83.7 (-82.4) -69.1 (-68.3) -87.3 (-86.4) -84.6 (-84.3) -73.7 (-72.6) -90.8 (-90.8) -82.5 (-82.0)   gate 50: PASS
  fast    -23.3 (-21.7) -52.4 (-51.7) -82.7 (-82.4) -84.4 (-84.1) -77.7 (-78.0) -85.1 (-84.9) -74.1 (-73.6)   gate 40, FS L9 20.2: PASS
  diag    -39.2 (-36.9) -59.1 (-58.0) -86.2 (-85.6) -86.0 (-85.6) -80.9 (-80.9) -84.3 (-82.0) -78.6 (-78.1)   gate 40, FS L9 29.4: PASS
  reverse -21.0 (-19.5) -65.4 (-64.7) -77.7 (-74.4) -83.9 (-83.5) -78.8 (-78.3) -83.5 (-82.2) -74.7 (-74.0)   gate 40, FS L9 14.4: PASS
  leave   -39.9 (-37.3) -67.1 (-66.4) -91.8 (-91.3) -83.8 (-83.3) -79.1 (-78.9) -92.1 (-90.7) -79.3 (-78.7)   gate 40, FS L9 28.5: PASS
  FS L9 margins: fast +3.0 (AA7 +1.5), diag +9.7, reverse +6.6, leave +11.4 points.
- FS MCE vs fixed AA3: slow 2.766 (FIX 3.000), medium 2.107 (2.281), fast 3.749 (3.936), diag 2.986 (3.216), reverse 3.838 (4.044),
  leave 2.732 (2.907): never worse, and lower than AA7's on all six (2.781 / 2.117 / 3.767 / 3.004 / 3.854 / 2.743). PASS.
- Texture (G3 info): lake 1.007-1.011 of BASE, solid 1.000-1.0005 (AA7 the same within 0.0004).
- L4 J rule (every box on all six paths; GT exists on all six): 0 misses. Exact J48 count of the M-1 cell (j48loc.mjs slow WR T48
  k1-159 stride 2, ana/j48loc_slow_WR48.txt): BASE 1071, GT 656 (-38.75 % -> floor -33.75 %), AA6 686 (-35.95, +2.20),
  AA7 733 (-31.56, -2.19 = the M-1 miss), AA8 691 (-35.48 %, margin +1.73) = the polish's K06 capture event for event (691; same
  16x8 cells: 1184,696=128 1200,704=122 1168,688=70 ...). M-1 CLOSED. Next tightest cells: fast FS MC32 (L9) +3.0, leave FS J32
  +3.9, fast FS J32 +4.0, reverse WR J48 +4.5, slow RS J48 +5.0.
- AA8 vs AA7, every cell (MC32 / J32 / J48 per box + total on six paths = 126 cells + 6 FS MCE): AA8 worse in 15 cells, all by
  <= 0.38 points (<= 0.07 per 1000 abs; the crawl rounds to 0.01 per 1000): leave FR J48 9.51 -> 9.56, diag FR J32 33.66 -> 33.79,
  fast FR MC32 1.32 -> 1.34, reverse FR J32 72.10 -> 72.35, reverse RS J48 0.89 -> 0.90, ... = noise. Better or equal in the other
  111 cells (FS MC32 by 1.2-2.6 points on every path, reverse DR MC32 by 3.3). PASS ('at least as good as AA7').

## 2. G1c glide (glide.mjs, sstride 6, GT / F1 / AA7 / AA8 in one run so the sample set is shared; ana/glide_<path>.raw)
- REL-to-GT jerk (area5) ALL / FS: slow AA8 0.2160 / 0.2080 vs AA7 0.2164 / 0.2080 (F1 0.2404; AA6 0.2159 in its own run);
  medium AA8 0.2000 / 0.1682 vs AA7 0.2008 / 0.1688 (F1 0.2225; AA6 0.2000). At or below F1, within 0.05 % of AA6. PASS.
- f(|d2|>0.1): slow 0.252 (AA7 0.254, AA6 0.252), medium 0.237 (0.240, AA6 0.235). ESF medium 2.07 / -0.11 (AA7 2.06 / -0.11,
  GT 1.94 / -0.11). Solid-side edge error ALL: slow 3.88 (AA7 4.05, AA6 3.83), medium 3.75 (3.91, AA6 3.70); DR slow 4.57
  (AA7 5.17, F1 4.46), medium 5.09 (5.63, F1 4.97) = the knee 0.6 gives back most of what 1.0 cost on the dark-rock side.

## 3. L11 (the knee choice)
- (a) every G1 / L4 cell >= 1 point inside its bar: on my own AA8 caps the smallest margin of ALL 126 cells is +1.73 (slow WR J48,
  exact count); every L11 cell (slow / medium / reverse all boxes, FS L9 on fast / diag / leave) >= +1.73. PASS.
- (b) the lowest summed GT error: kerr.mjs (polish's tool) on my medium caps, AA8 vs AA7 vs GT (ana/kerr_medium_A7A8.txt):
  thin-dark mean |lane - GT| AA8 1.4311 vs AA7 1.4334; waterline lines 4.2362 vs 4.3565 (signed +0.891 vs +1.249, BASE +3.577;
  AR-2 over-bright px 30607 vs 39482) = the polish's K06 / K10 numbers exactly. The rest numbers (polish) order the same
  (1.4106 / 4.2891 vs 1.4138 / 4.3189). 0.6 has the lowest sum of the five measured K, so it is the L11 pick whether or not 0.7
  (exact margin +0.89 per the polish) passes. The knee is 0.6 only with the glide (HeroEngine:398); ?lkglide=0 keeps 0.5.
  Info (artifacts lens): jgt2's over-darkening outliers rise with the lower knee: AA8 6810 vs AA7 3943 (AA6 8240).

## 4. L5 start / stop + G2 events (jcap.mjs stepped, 1440x766 rows 380-766, variants a8 / a7 / g0 / base(+mask); evt.mjs T 8 lv
##    3x3, BASE-mask band; stepcnt.mjs; scsum.py summaries). 0 console errors / warnings in all 12 jcap sessions.
- holdre (press 10, release 110, re-press 135, release 215): a8 vs a7 28 px outside a7's 3x3 in 240 frames, all darker, max 10 lv;
  a8 vs g0 4719 (max 43; AA7 vs g0 4685 in its judge run = the glide's own); a8>BASE 89084 vs a7>BASE 87698 (AA6 89764).
  |dF| press / release / re-press / release 2: a8 7.28 / 20.31 / 1.49 = a7 7.28 / 20.29 / 1.49 (BASE 7.58 / 20.96 / 1.57).
  START k13 a8 194 / 54 / 14 (> 4 / 8 / 16 lv) vs a7 195 / 56 / 11, g0 157 / 38 / 7, BASE 236 / 74 / 17; k14 218 / 92 / 29 vs
  217 / 90 / 29 vs 172 / 56 / 14 vs 227 / 96 / 44. Window k1-24 sums a8 4361 / 1768 / 658 vs a7 4338 / 1744 / 636; max per-frame
  a8 - a7 +7 px. grad2 ramp 241.0 -> 241.1 -> 241.9 -> 243.7 -> 244.9 -> 245.2 ... 247.6 (k22) = a7's (max |a8-a7| 0.1): the
  12-frame ramp, no snap. STOP (hand-over k5): a8 230 vs a7 229 vs g0 280. Release / re-press windows: a8 within 0.1 % of a7.
- fastrev (reversals, 3-frame flick): a8 vs a7 102 px in 120 f, all darker, max 10; a8>BASE 67635 vs a7>BASE 66354.
  START k1 a8 270 / 105 / 24 vs a7 265 / 99 / 25, g0 194 / 61 / 7, BASE 294 / 132 / 41 (= AA7's M-2 nit: > 16 lv 3.4x g0, < BASE).
  Reversal / flick windows k36-46, k66-100: a8 <= BASE on every frame; sums within 0.1 % of a7; grad2 max step 10.0 = a7.
- pump (sweep, stop 70-189, restart 190): a8 vs a7 173 px in 260 f, all darker, max 11; a8>BASE 140485 vs a7>BASE 138003.
  START k1 a8 232 / 71 / 13 vs a7 233 / 72 / 12, g0 179 / 42 / 8, BASE 238 / 91 / 17. Stop k66-106: a8 <= BASE every frame,
  grad2 max step 3.1 (a7 3.2) = no pumping.
- The only frames where a8 > BASE at > 16 lv outside the press / release frames that a7 shares: pump k5 a8 278 vs a7 260 / g0 265 /
  BASE 238, fastrev k4 149 vs 136 / 140 / 131: +13-18 px of an 84-104k px band, a7 and g0 above BASE there too = noise, not a
  finding.

## 5. G6 flash, stepped (rlana.mjs on the stepped medium caps, band = BASE OLD-mask union; ana/g6_stepped_medium.txt)
  AA8: mirror redrawn 240 / 240; 1/3 cycle ALL band 0.6x, P3 folded 0.008 lv (AA7 0.6x / 0.009, BASE 8.2x / 0.189); largest
  peak 6.7x @ 0.126 (P8 0.106 lv) = AA7's 6.6x @ 0.126 / P8 0.106 = scene content. PASS.

## 6. The look (stepped caps; columns BASE | AA7 | AA8 | GT; all looked at)
- img/rev_FS_k40-48s2_BASE_A7_A8_GT_z2.png, rev_FSfoot_k42-46_..._z4.png (FS foot through the reversal): BASE has a small light
  notch on the foot waterline; AA7 = AA8, one smooth waterline like the GT.
- img/rev_FSend_row690_x320-400_k0-119_..._z3.png (row time slice across the slab end, all 120 frames): BASE's stray light dash
  near k60; AA7 / AA8 / GT one clean smooth curve, AA8 = AA7.
- img/rev_WR_k42-46_..._z2.png, fast_WR_k57-60_..._z2.png: BASE steps on the rock's right foot and the far slab's line; AA7 = AA8
  smooth like the GT; the pale vertical column left is in the GT too (scene).
- img/rev_RS_x1030-1280_k42-46_..._z2.png, fast_RS_x1030-1280_k57-60_..._z2.png: BASE steps on the slab ends; AA7 = AA8 smooth.
- img/fast_FS_k56-62s2_..._z2.png, fast_FSfoot_k57-60_..._z4.png (peak speed): BASE stair-steps the slab's right end and has white
  dots on the foot; AA7 = AA8 smooth; the pale corner wedge is in the GT too.
- x1: img/rev_FS_k43-45_..._z1.png, rev_RSWR_k43-45_..._z1.png, fast_FS_k57-59_..._z1.png:
  at 1x all four read the same; no stepping, dash, hole, column or rim in AA8.
- img/slow_WRj48_k117-121_BASE_A6_A7_A8_GT_z5.png (the M-1 spot, x5): BASE stair-steps the rock's lower right edge; AA6 / AA7 / AA8
  alike, smooth like the GT, no rim or halo.
- img/rev_k44_diff_A8vsA7_full_z1.png (diffmap AA8 vs AA7, reverse k44: 38293 px differ, 500 > 4 lv, max 10; fast k58 34867 /
  328 / max 10): the differences are thin orange lines on the floes' / rocks' / slab feet waterline lines = the intended AR-2 change
  (those lines a little darker, toward the GT); nothing elsewhere.
- img/fast_RSspeck_x1190-1245_k56-60_..._z6.png: a 1-px dark speck on the snow slab top (x~1216 y~633, k57-60) in AA7 AND AA8 (and
  BASE at k60), averaged away in the 16-sample GT: sub-pixel snow geometry off the waterline band, unchanged by AA8 = info.
- img/fast_FSend_row690_x320-400_k0-119_..._z3.png (fast time slice): BASE stair-steps along the diagonal; AA7 = AA8 smooth like
  the GT; the white arcs bottom-left are in all four (scene).
- Exact J48 of the next low-count L4 cell (j48loc slow RS T48, ana/j48loc_slow_RS48.txt): BASE 191, GT 58 (floor -64.63 %),
  AA7 58 (+5.00), AA8 55 (-71.20 %, margin +6.57).

## 7. G6 real loop + G2 real loop (rl.mjs: engine's own rAF, CDP mouse, medium, 180 f; ana/g6_rl_medium.txt, g6_rl2_medium.txt)
- Run 1 (00:02-00:03, load 15-25, same batch a8 / a7 / base): AA8 28.3 / 35.1 / 45.0 ms (med / p90 / max), mirror 180 / 180, TAA
  every frame, 0 console lines. 1/3 cycle ALL band 2.1x median (box 2.0x), P3 folded 0.062 lv, largest peak 2.7x @ 0.112 (a flat
  spectrum); AA7 1.2x / 0.173 lv (32.5 ms med); BASE 3.0x / 0.693 lv, mirror 60 / 180.
- Run 2 (00:05-00:06, load 26): AA8 28.7 / 33.4 / 49.7 ms, 1/3 cycle 1.0x (box 0.9x), P3 0.258 lv, peak 2.8x @ 0.134;
  AA7 55.2 ms med (loaded), 0.7x / 0.094 lv. => run 1's 2.1x was periodogram scatter on a flat spectrum (a line would repeat; the
  folded amplitudes swing 4x between runs). AA8 redraws the mirror every frame, so the 20 Hz mechanism is gone. No 1/3-cycle line
  in either run. PASS.
- G2 in the real loop: img/rl_medium_A8_FS_stall_k44-48_z2.png and rl_medium_A8_RSWR_stall_k45-47_z2.png (around the 48 ms frame
  k46; white = outside the captured boxes): one clean waterline, no ghost, trail, smear or double edge. PASS.

## 8. L5 rims at 1x (l5g4.mjs fast: AA8 vs AA8 ?envedge=0 = the unblurred resolve; ana/l5g4_fast_a8_raw.txt)
  47 px in 118 f = 0.72 per Mpx-frame, 0 on the band, 33 darker / 14 brighter, max excess 15 lv (AA7: 1.64, 50 on the band, max
  18 = its M-3 nit; AA6 pre-judge 0.75). Hot cells looked at (x6): img/l5_fast_hot_k1-3_x533y469_A8_raw_A7_BASE_z6.png = the raw
  resolve's dark aliasing dash on the floe top next to the hero's blue shard, which AA8 / AA7 smooth (AA8 'brighter' = the dash
  removed); img/l5_fast_hot_k21-23_x635y501_..._z6.png = the hero's glass ring over a dark far-slab line, AA8 = raw = AA7, BASE
  steps; one px. No rim / outline at 1x. M-3 (AA7) CLOSED.

## 9. First-motion hitch (hitch.mjs, real rAF + CDP mouse, rest 8 s, SLOT_BG=0; ana/hitch.json, hitch2.json; machine load 22-38
##    from the other workflows' browsers, so wall-clock intervals are noisy)
- Run 1 (a8, a7, base; 1 rep): a8 boot 3342 ms, 24 programs linked before the first motion incl. the TAA program (a7 24, BASE 22);
  +2 programs later in all three (a8 26, a7 26, BASE 24 = not AA8-specific). CPU per frame first 10 a8 1.9-2.5 ms (a7 2.0-2.6,
  BASE 1.7-2.4); first-burst intervals a8 med 45 / max 59.8 (a7 35.1 / 58.3, BASE 21.7 / 28.5); after the rest a8 18.3-38.5,
  max 41.2 (a7 max 76.6, BASE 63.8). 0 console lines.
- Run 2 (a7, a8, a8, a7 = reversed order, 2 reps; load 22 -> 38): first-burst interval medians a7 23.4, a8 46.1, a8 24.3, a7 46.4;
  ivlMax a7 46.9 / 79.5, a8 71.9 / 43.3; CPU first-10 max a8 3.1 / 2.6, a7 2.8 / 2.8; programs 24 -> 26 in all four; 0 console lines.
  => each session runs at ~23 or ~46 ms per frame for its whole length (compositor pacing under load), for a7 and a8 alike; no
  spike at the first motion or after the rest beyond the session's own level; no program linked at first motion that AA7 does not
  link too. No first-motion hitch. PASS.
- Holdre look: img/holdre_FS_press_mid_release_repress_a8_a7_g0_base_z3.png (k12, 13, 14, 60, 110, 112, 136, 138, 216): the four
  columns show the same content, one waterline, no trail / smear / ghost / double edge.
- pump restart k186-200: a8 <= g0 <= BASE on every frame, a8 within 20 px of a7 per frame, grad2 243.8 -> 242.2, max step 1.5
  (a7 1.5): no snap at the restart.
- leavere (leave at 40, re-enter at 80; k2 = first moving frame): a8 vs a7 103 px in 120 f, all darker, max 11; a8>BASE 61570 vs
  a7>BASE 60293 (AA6 62110). |dF| at the leave k40 9.04 = a7 9.04 (BASE 9.92). START k2 a8 233 / 87 / 21 vs a7 233 / 86 / 15,
  g0 166 / 55 / 10, BASE 219 / 98 / 21 (> 16 lv: +6 px of a 91k px band vs a7, = BASE). Leave k36-46 and re-enter k76-90:
  a8 <= BASE on every frame, sums within 0.2 % of a7, grad2 max step 1.6 / 1.7 (a7 1.7 / 1.8). Looked at
  img/leavere_k2_start_dmap_FF_a8_g0_z2.png (change map x8 at k2, far floes, a8 | g0): the hero's moving shards plus scattered
  single-px dots on the water / floes (FF band px > 8 lv a8 31, g0 17); no continuous line along any floe waterline (the G-1
  snap signature). Not visible. 0 console lines (4 variants).
- First moving frame, > 16 lv band px, all four start cases (a8 / a7 / g0 / BASE): holdre k13 14 / 11 / 7 / 17, fastrev k1
  24 / 25 / 7 / 41, pump k1 13 / 12 / 8 / 17, leavere k2 21 / 15 / 10 / 21 => AA8 within -1..+6 px of AA7, at or below BASE
  everywhere; the 2-3.4x over g0 is AA7's M-2 (and AA6's) unchanged.

## 10. DPR 2 (jcap dpr2 --dsf 2, buffer 1800x957 rows 475-957, 90 f; a8 / raw = AA8 ?envedge=0 / a7 / base)
- a8 vs a7: 80 px in 90 f, all darker, max 11, 0 hot; a8>BASE 68209 vs a7>BASE 66902. l5g4 a8 vs raw (ana/l5g4_dpr2_a8_raw.txt):
  24 px = 0.31 per Mpx-frame, 0 on the band, 12 darker / 12 brighter, max excess 16 (AA7 1.18, max 19; AA6 pre-judge 0.35).
- Looked at img/dpr2_hot_k3_k4_a8_raw_a7_base_z5.png: the raw resolve's small dark dash on the far floe's edge under the hero's blue
  shard (k4), which AA8 / AA7 smooth (AA8's +16 = the dash removed); the dark dot at left is in all four (scene).
  img/dpr2_k40_a8_a7_base_x0-900_z1.png (1x of the buffer): AA8 = AA7, smooth floe waterlines, no rim / outline. PASS.
- Console: 0 errors / warnings in all 39 browser sessions of this judge (7 path caps, 5 jcap cases x 4 variants, 5 real-loop
  runs, 7 hitch sessions).

## VERDICT (00:13, 21 Nov)
- AA8 = AA7 + the knee 0.6 (with the glide) + P-1 / P-4 / comments. On the motion lens it is AA7 to the eye everywhere (x1 / x2
  strips of FS / WR / RS on reverse and fast, x4 / x5 crops, time slices, real loop): one smooth waterline that glides like the
  16-sample GT; BASE's stair steps, notches and stray dashes are gone; no new dash / hole / column / rim; no snap at the start,
  no pumping at the stop, no 20 Hz flash, no ghost / trail in any event, no first-motion hitch.
- G1: every MC32 box + total passes on all six paths (L9 for FS); FS MCE better than fixed AA3 and than AA7 on all six. L4: 0 misses;
  the AA7 M-1 cell (slow WR J48) now passes by +1.73 points (exact: 691 events; the floor -33.75 % = 709.5 events, a 1-point margin = 698) -> M-1 CLOSED. AA8 is at least as good
  as AA7 in every cell (15 of 132 cells worse by <= 0.38 points = crawl rounding; FS MC32 1.2-2.6 points better on every path).
- G1c PASS (slow 0.2160 / medium 0.2000 vs AA7 0.2164 / 0.2008, AA6 0.2159 / 0.2000, F1 0.2404 / 0.2225).
- L5 PASS (start / stop / re-press / restart: AA8 within a few px of AA7 per frame, <= BASE; 1x rims 0.72 per Mpx-frame and DPR 2
  0.31, AA6's level -> AA7's M-3 nit CLOSED). G6 PASS (stepped P3 0.008 lv; real loop no 1/3 line in 2 runs). G2 PASS. Hitch PASS.
- L11: followed (0.6 is the only measured K with >= 1 point on every cell, and the lowest summed GT error; reproduced on my caps).
- Open: M8-1 nit (inherited AA6 / AA7 M-2: the first moving frame's > 16 lv band count is 2-3.4x the no-glide g0, AA8 within
  -1..+6 px of AA7, <= BASE, invisible in the change map). Context outside this lens: the thin-tip pale spot (AR-1 b) is unchanged
  from AA7 (tip patch not integrated); jgt2 over-darkening outliers AA8 6810 vs AA7 3943 (artifacts lens, the L11 trade-off).
- pass = true (no blocker / major / minor open). Score 9.1 / 10 against the user's words (AA7 8.8: M-1 and M-3 closed, every
  motion number equal or better; not 10: the GT is still a touch smoother on some edges at x4-x5, e.g. the M-1 rock edge's last
  notch, and the first-frame blips of M8-1 exist, both invisible at 1x).

Disk: kept the six AA8 path caps (/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work8/motion/caps/{slow,medium,fast,diag,reverse,leave}_A8, ~1 GB, deterministic stepped
captures of the integrator's build for the fixer / recheck); deleted the analysed jcap, DPR 2, raw and real-loop sets. Work folder now
1.0G. Labs :5199 / :5197 / :5196 / :5182 were only read from (none restarted).
