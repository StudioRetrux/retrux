# AA7 FINAL JUDGE, lens MOTION (20 Nov 2026, Asia/Jakarta), read-only - RESTART after the 20:47 reboot
Lab AA7 :5197 (lead's build, not restarted), AA6 :5196, BASE :5182 (all up at 20:52, none restarted). WORK = $SP/work7/motion
(tools/, caps/, ana/, img/, logs/). Backup = MAIN/notes/round11/lane_backup/aa7/judge-motion/. The first run (19:54-20:47) was cut
by the reboot; its partial (crawl slow / medium on judge-artrefl's AA7 caps, a few look images) is in $SP/work7_partial_20nov/motion
and MAIN/.../aa7/partial_20nov/motion. Everything below is re-measured in this run unless marked [partial].
Variants: a7 = AA7 default, g0 = AA7 ?lkglide=0 (== AA6 ?lkglide=0 by the lead's ident), a6 = AA6 final (:5196, knee 0.5, no AA5c),
base = BASE (+ mask), raw = AA7 ?envedge=0 (unblurred resolve), GT = 16-sample BASE. Every browser via slot.mjs; tools copied from
the partial run (= $SP/work6/fix/tools + aa3 / aa5a / refl), createRequire -> retrux-lanes/pw (1.49.1).

## 0. Setup (20:52-21:00)
- 20:58 chains launched: cA (AA7 six G1 paths; AA6 reverse / fast; AA7 raw fast; real loop a7 / base; hitch), cB (jcap holdre, pump,
  fastrev, leavere, gov a7 / g0 / a6 / base; resize, tab a7 / a6 / base; dpr2 --dsf 2 a7 / raw / a6 / base), anaG (crawl + glide).
- 21:03 load 220-330 after the reboot (post-boot indexing + every judge's analysis); the slot gate (load <= 30) held my event chain cB.
  21:06 chain A replaced by cA2 (AA6 reverse / fast / slow / medium / diag / leave caps APFS-cloned from judge-artrefl's
  $SP/work7/artrefl/caps/*_A6 = same cap.mjs format, pre 30, 1440x766 rows 380-766, :5196) -> only AA7 raw fast, real loop, hitch.

## 1. G1 (crawl.mjs, NEW masks = $SP/work5/aa5a/caps/<path>_mask, stride 2, ref BASE; ana/crawl_<path>.txt, crawlK_<path>.txt)
- Reproducibility: my AA7 slow / medium crawls are byte-identical to the partial run's (made on judge-artrefl's AA7 caps of
  the same build): the stepped capture is deterministic.
- medium (gate 50) MC32 %: FS -82 WR -68 DR -86 FF -84 FR -73 RS -91 tot -82 (AA6 final -84 / -69 / -88 / -85 / -74 / -90 / -83).
  PASS. L4 every box: J32 / J48 >= GT's - 5 points (FS -10 / -5 vs GT -9 / -1; WR -20 / -21 vs -13 / -16; RS -37 / -34 vs -19 / -9).
- slow (gate 50) MC32 %: FS -74 WR -74 DR -87 FF -83 FR -74 RS -90 tot -82. PASS.
  L4: WR J48 AA7 -32 % vs GT -39 % -> floor -34: MISS by 2 points (AA6 same caps run: -36 %, passes). Absolute WR J48:
  BASE 3.73, AA6 2.39, AA7 2.55, GT 2.29. Also FS J32 -30 -> -22, FS J48 -56 -> -42 (AA6 -> AA7; GT -15 / -12, still pass).
  = the knee (L10) makes more > 48 lv frame-to-frame jumps on WR / FS at slow speed. (finding M-1)
- diag (L9: FS >= min(40, GT 34 - 5) = 29; other boxes 40): FS -37 (AA6 -40, GT -34) PASS; WR -58 DR -86 FF -86 FR -81 RS -82
  tot -78 PASS. FS MCE 3.004 (AA6 2.98).
- leave (L9 FS bar 28): FS -37 (AA6 -41, GT -33) PASS; WR -66 DR -91 FF -83 FR -79 RS -91 tot -79 PASS.

## 2. G1c glide (aa5a's glide.mjs, sstride 6; ana/glide_<path>.raw)
  REL-to-GT area5 ALL / FS: slow AA7 0.2166 / 0.2081 (AA6 final 0.2159 / 0.2084, F1 0.2405 / 0.2285) -> +0.3 % vs AA6: PASS
                            medium AA7 0.2009 / 0.1689 (AA6 0.2000 / 0.1680, F1 0.2225 / 0.1871) -> +0.45 % vs AA6: PASS
  f(|d2|>0.1) slow 0.254 (AA6 0.252), medium 0.240 (AA6 0.235). ESF medium 2.06 / -0.11 (AA6 2.07 / -0.11, GT 1.94 / -0.11).
  Solid-side edge error ALL (knee effect): medium 3.91 (AA6 3.70, F1 4.61), slow 4.05 (AA6 3.83, F1 4.81); DR medium 5.63 vs
  F1 4.97, slow 5.17 vs F1 4.46 (the knee darkens the dark-rock side; info for L10).
- reverse (L9 FS bar min(40, GT 19/20 - 5) = 14-15): FS MC32 AA7 -19 (AA6 -22, FIX -36, GT -19) PASS; FS MCE 3.854 (FIX 4.044,
  AA6 3.834, GT 4.162) PASS; WR -65 DR -74 FF -83 FR -78 RS -82 tot -74 PASS. L4 all boxes PASS.
- fast (L9 FS bar min(40, GT 25 - 5) = 20): FS MC32 AA7 -22 (AA6 -23, FIX -36, GT -25) PASS by 2 points; FS MCE 3.767 (FIX 3.936,
  AA6 3.743) PASS; WR -52 DR -82 FF -84 FR -78 RS -85 tot -74 PASS. L4 all boxes PASS.
- L4 on all six paths (GT exists for all): the ONLY miss is slow WR J48 (above). j48loc.mjs (ana): the WR J48 events sit in the same
  16x8 cells for AA6 / AA7 / GT / BASE (x 1168-1215, y 688-720 = the dark rock face's right edge over the bright lake streaks):
  AA6 686 / AA7 733 / GT 656 / BASE 1071 px-events = the same edge moving, slightly higher contrast with knee 1.0.
  Looked at: img/slow_WRj48_k117-121_BASE_A6_A7_GT_z4.png (k117-121, the frames with the largest AA7 - AA6 count): AA7 = AA6 to
  the eye, both smooth like the GT; BASE shows the stair steps. Invisible -> M-1 minor (gate cell, not a visible defect).
- Knee (L10) cost on G1 MC32 (AA6 -> AA7, same caps run): FS slow -75 -> -74, diag -40 -> -37, leave -41 -> -37, reverse -22 -> -19,
  fast -23 -> -22; DR reverse -78 -> -74; others within 0-2 points; totals within 0-1 point. All still above the L9 / plain bars.
## 3. The look (stepped caps; BASE / AA6 / AA7 / GT columns)
- img/rev_FSfoot_k40-48_BASE_A6_A7_GT_z3.png (FS foot through the reversal at k43-45): AA7 = AA6, single smooth waterline like GT;
  BASE's right-corner notch. img/rev_FSend_row690_x320-400_k0-119_..._z3.png (row time slice across the slab's end, all 120 frames):
  BASE has a stray light dash at k~60, AA6 / AA7 / GT a clean smooth curve. img/rev_FS_col300_y684-708_k20-100_..._z6.png (column
  time slice of the waterline): BASE hard 1-px steps, AA6 / AA7 soft ramp like GT.
- img/fast_FSfoot_k56-62_..._z3.png, img/fast_FScorner_k56-61_..._z5.png (peak speed of the fast path): AA7 = AA6, no stepping,
  no dash / hole / column; the corner's pale wedge exists in all four incl. GT (scene content).
- img/look_rev_RS_k42-46_*.png, look_rev_WR_k42-46_*.png, look_fast_RS_k57-60_*.png, look_fast_WR_k57-60_*.png (evstrip auto-
  targeted on the NEW mask band, x3): AA7 = AA6 to the eye; single smooth waterline like GT; BASE stair steps on the RS slab end and
  on the WR reflection edge. No dash, hole, bright column or double edge in AA7.
## 4. G6 flash, stepped (rlana.mjs on the stepped medium caps, band = BASE OLD-mask union; ana/g6_stepped_medium.txt)
  1/3-cycle ALL band: AA7 0.6x median (P3 folded 0.009 lv) = AA6 0.6x (0.009) vs BASE 8.2x (0.189 lv; FR 10.0x, FF 7.2x).
  Mirror redrawn 240 / 240 moving frames (BASE 80 / 240). AA7's largest peak 6.6x @ 0.126 (P8 0.106 lv) = AA6's exactly and
  BASE's P8 0.128 lv (scene content, not the AA). PASS.
## 5. G2 + L5 events (jcap.mjs stepped, 1440x766 rows 380-766, variants a7 / g0 / a6 / base(+mask); evt.mjs T 8 lv 3x3; stepcnt.mjs)
- holdre (press 10, release 110, re-press 135, release 215; TAA handed over k5, k12 first moving frame, k13 first history frame):
  a7 vs a6: 3 px outside a6's 3x3 in 240 frames (max 10 lv) -> AA7 = AA6 here; a7 vs g0: 4685 px (max 43, = F1's own, AA6 pre-judge
  4966); a7>BASE 87698 vs a6>BASE 89764. |dF| at press / release / re-press / release 2: a7 7.28 / 20.29 / 1.49 = a6 7.28 / 20.32 /
  1.48 (BASE 7.58 / 20.96 / 1.57). 0 console lines (4 variants).
  START (stepcnt, band px > 4 / 8 / 16 lv): k13 a7 195 / 56 / 11, g0 157 / 38 / 7, a6 195 / 55 / 15, BASE 236 / 74 / 17;
  k14 a7 217 / 90 / 29 vs g0 172 / 56 / 14 (2.07x at > 16 lv, same as AA6 29), k15 226 / 93 / 28 vs 177 / 73 / 25; a7 <= BASE on
  every frame k12-24. grad2 a7 241.0 -> 241.1 -> 241.9 -> 243.7 -> 244.9 -> 245.2 ... 247.6 (k22): the 12-frame ramp, no one-frame
  snap (= AA6 241.1 / 241.9 / 243.8 / 245.0). PASS (within ~2x of g0, at or below BASE).
  STOP (still tail k1-9, hand-over k5): a7 95-229 px > 4 lv per frame = a6 (88-230) ~ BASE (79-219); hand-over frame a7 229 vs g0
  280; grad2 245.1 -> 243.6 converging on g0's 243.6 at the hand-over. PASS (no pumping).
  Re-press / releases: a7 within +-1 % of g0 / a6 / BASE counts. Looked at img/holdre_FS_press_mid_release_repress_a7_g0_a6_base_z3.png
  (k12, 13, 14, 60, 110, 112, 136, 138, 216): all four columns the same content, no trail, smear, ghost or double edge; BASE steps.
- pump (sweep 0-69, pointer stops 70-189, restarts 190; the rig keeps drifting so the TAA never hands over, as in AA6's pre-judge):
  a7 vs a6 6 px in 260 f (max 13); a7 vs g0 2456 (max 33; AA6 pre-judge 2513); a7>BASE 138003 vs a6>BASE 141658.
  k1 (first frame after the 20 pre-roll frames) a7 233 / 72 / 12 vs g0 179 / 42 / 8 vs BASE 238 / 91 / 17 (1.3x / 1.7x / 1.5x g0);
  k2 214 / 92 / 26 vs 175 / 72 / 18. Stop k66-110 and restart k186-200: a7 <= g0 <= BASE on every frame; grad2 a7 = a6 +- 0.5
  (no step at the stop or the restart). PASS.
- Knee vs AA6 at 1x (l5g4.mjs fast: a7 px > 4 lv outside a6's 3x3): 99 px in 117 f = 1.53 per Mpx-frame, 76 on the band, 94 brighter /
  5 darker, max 14 lv; hottest k34 (221,624) / k43 (227,624): img/fast_knee_hot_k34_k43_A7_A6_BASE_GT_z6.png (x6) = a single
  sparkle px on the slab face present in AA6, BASE and GT too, AA7's 14 lv brighter. No rim / outline.
- fastrev (fast sweep, hard reversals i 40 / 70 (camera reversal k84-86), 3-frame flick 89-92; k0 = still 20, k1 = first moving frame):
  a7 vs a6 3 px in 120 f (max 13); a7 vs g0 1409 (max 41; AA6 pre-judge 1463); a7>BASE 66354 vs a6>BASE 68243 vs g0>BASE 68445.
  |dF| at the reversal k84-86 a7 2.23 / 3.41 / 4.52 vs g0 2.29 / 3.48 / 4.59 vs BASE 2.44 / 3.60 / 4.74 (no spike); flick + after
  (k84-100): a7 <= g0 <= BASE on every frame at > 4 / 8 / 16 lv, grad2 a7 within 1-2 of g0.
  START k1 (20 frames into the still tail): a7 265 / 99 / 25 vs g0 194 / 61 / 7 vs a6 269 / 105 / 24 vs BASE 294 / 132 / 41:
  1.37x / 1.6x / 3.6x g0 (the > 16 lv cell is over 2x: +18 px of 104k band px, all FF far floes 52 vs 30 > 8 lv and RS 6 vs 1;
  = AA6 exactly, and below BASE). Change map img/fastrev_k1_FF_dmap_a7_g0_base_z2.png: scattered water dots in all three, no
  continuous line along the floe waterlines (the G-1 signature) -> not visible; noted, not a finding (same as AA6, <= BASE).
- leavere (leave at 40, re-enter at 80; k1 = still 21, k2 = first moving frame): a7 vs a6 3 px in 120 f (max 14); a7 vs g0 1047
  (max 34; AA6 pre-judge 1183); a7>BASE 60293 vs a6>BASE 62110. Leave k40 / re-enter k80-86: a7 <= g0 <= BASE every frame, |dF|
  k40 9.04 / 9.17 / 9.92 (a7 / g0 / BASE). START k2: a7 233 / 86 / 15 vs g0 166 / 55 / 10 vs BASE 219 / 98 / 21 (1.4x / 1.6x /
  1.5x g0; AA6 final 227 / 85 / 14). PASS.
## 6. L5 rims at 1x (l5g4.mjs fast, AA7 vs AA7 ?envedge=0 = unblurred resolve; ana/l5g4_fast_a7_raw.txt)
  106 px in 117 f = 1.64 per Mpx-frame (AA6 pre-judge 0.75), 50 on the band, 20 darker / 86 brighter, max excess 18 lv. Looked at
  img/l5_fast_hot_k2_k22_A7_raw_A6_BASE_z6.png: the k2 cell is a dark aliasing dash in raw (and BASE) next to the hero's blue ice
  shard over the far floes that AA7 / AA6 do not have (AA7 'brighter' = the dash removed); k22 slab diagonal: AA7 = raw = AA6, BASE
  steps; k34 / k43 = the slab-face sparkle above. No rim or outline at 1x. PASS (the count doubles vs AA6 because the raw
  reference runs knee 0.5 while AA7 runs 1.0: isolated brighter sparkles, not edges).
## 7. Real loop (rl.mjs: engine's own rAF, CDP mouse, medium, 180 f; machine shared with g3 / perfcode runs)
- AA7: frame ms median 29.6 / p90 52.9 / max 70.9 (k80-87 cluster 58-71 ms); mirror redrawn 180 / 180; TAA valid + running every frame
  (runs 301-480); 0 console lines.
- G6 real loop (rlana, BASE stepped OLD-mask union band; ana/g6_rl_medium_A7.txt): 1/3 cycle 1.3x median (box 1.5x), P3 folded
  0.268 lv (AA6 pre-judge 1.1x / 1.0x; BASE 1.7x / 2.0x); largest peak 4.7x @ 0.123 (P8 1.19 lv; AA6 pre-judge 9.2x @ 0.117 with
  P8 1.02 lv, fixed1 1.09 lv = the same scene component). No 20 Hz flash. PASS.
- G2 real loop: img/rl_medium_A7_FS_stall_k79-85_z2.png and img/rl_medium_A7_RSWR_stall_k80-84_z2.png (around the 58-71 ms
  frames): one clean waterline, no ghost, trail, smear or double edge (white = outside the captured boxes). PASS.
- G6 real loop BASE (same session): 1/3 cycle 2.4x (box 2.4x), P3 0.143 lv, mirror 60 / 180, 23.9 ms median. AA7's P3 0.268 lv is
  larger in absolute lv only because its loop ran slower (29.6 vs 23.9 ms: bigger per-frame steps, band mean |dF| 7.95 vs 6.48);
  as a spectral line AA7 has no 1/3 peak (1.3x vs BASE 2.4x) and the stepped P3 (clean) is 0.009 vs 0.189 lv. PASS.
## 8. L10 knee: thin dark features (jgt2.mjs medium, band excluded; ana/jgt2_medium_A7.txt / _A6.txt)
  px-frames > 4 lv outside BASE's 3x3: AA7 1763 (1760 darker) vs AA6 4259 (-59 %); thin-dark subset outside 1219 vs 3001; mean
  signed (lane - GT) on thin-dark px 0.14 vs 0.06 (BASE 0.27), mean abs 1.35 vs 1.34 (BASE 1.38). = the knee removes ~60 % of
  AA6's over-darkening outliers at a G1 cost of 1-4 points on FS fast paths and the slow WR J48 cell (M-1).
## 9. ENV (21:10-21:51): the slot gate was closed for my remaining captures
- judge-perfcode set .slot-conf.json n 1 (21:10-21:42) and then n 1 / loadMax 1 'exclusive timing' until 21:51; every other agent
  (g3, artrefl, me) used priority labels, and priority waiters race (no FIFO). My chains therefore got B1-B3 + A3 only.
- 21:35 J1 / J2 / A5 replaced by K1 (hitch a7 / base + gov a7 / a6 / base) and K2 (dpr2 a7 / raw / base, tab, resize a7 / a6 /
  base), both queued as priority waiters. gov / resize / tab / dpr2 / hitch are reported below as measured only if they land
  before my time box ends (~22:02).
- Static (not a measurement): AA5c's new programs (rx-lake-sky-late, rx-lake-sky, rx-plate-baked-mirror) are built in
  LakeMirror.ts; HeroEngine.warmUp() compiles the scene twice (compileAsync) and renders one full pipeline frame with every hold
  driver on before ready, so they should be linked before the first motion; to be confirmed by hitch.mjs (K1).
## 10. Late captures (K1 / K2 got slots at ~21:37 after perfcode released the gate)
- First-motion hitch (hitch.mjs, real rAF + CDP mouse, a7 / base interleaved, 1 rep, rest 8 s; ana/hitch.json; load 6.9 -> 13.4):
  a7 boot 3451 ms, 24 programs linked before the first motion incl. the TAA program (BASE 22); +2 programs later in BOTH (a7 26,
  BASE 24 = not AA7-specific). First motion: CPU per frame first 10 = 2.0-3.3 ms (BASE 1.5-2.9), interval max 53.3 ms (BASE 79.9),
  first-10 intervals 22-27 ms (BASE 38-80). After the 8 s rest (TAA handed over: still 245): CPU max 3.4 ms (BASE 2.7), first-10
  intervals 18.6-42 ms, interval max 65.5 (BASE 78.2). 0 console lines. No first-motion or after-rest hitch. PASS.
- gov (scale 0.9 at 25, 0.8 at 50, 0.7 at 75, 1.0 at 100, moving; a7 / a6 / base): a7 vs a6 4 px in 120 f (max 14) -> AA7 = AA6 at
  every governor scale; |dF| at the steps a7 12.19 / 10.30 / 5.04 / 6.92 = a6 12.19 / 10.31 / 5.03 / 6.88 (BASE 12.79 / 11.11 /
  5.40 / 7.41); a7>BASE 73741 vs a6>BASE 76023. Back to 1.0 (k100-106): a7 = a6 <= BASE per frame, grad2 253.8 -> 252.9 -> 252.5
  (no step). Looked at img/gov_FF_s07_k84-92_s1_k101_a7_a6_base_z3.png (far floes at 0.7, then 1.0): a7 = a6, no dash / dot /
  trail; BASE harder steps and its full pale block at k92; the faint light streak at the floe's left end in a7 / a6 at 0.7 is the
  known G-3 (v3 lens, AA6 pre-judge), unchanged. L7 / A-2 inherits AA6's verdict (not visible at 1x) since a7 = a6 within 4 px.
- dpr2 (--dsf 2, buffer 1800x957, 90 f; a7 / raw (?envedge=0) / base): l5g4 a7 vs raw 91 px in 89 f = 1.18 per Mpx-frame, 59 on the
  band, 9 darker / 82 brighter, max 19 lv (AA6 pre-judge 0.35, max 15: raw runs knee 0.5). Looked at
  img/dpr2_hot_k3_k4_a7_raw_base_z5.png (the hero's blue shard over a far floe: raw has a dark 2-px dash on the floe top that a7
  smooths; the other spot a7 = raw = base) and img/dpr2_k40_a7_raw_base_z1.png (1x of the buffer: a7 = raw = base to the eye, smooth
  floe waterlines). No rim / outline at DPR 2. PASS.
- tab (pointer moves while the tab is hidden for 90 frames at 40, dt 1/20 stalls at 80-84; a7 / a6 / base): a7 vs a6 6 px in 100 f
  (max 15); |dF| at the gap k40 13.01 / 13.00 and the stalls k80-84 22.19-10.50 = a6 within 0.02; a7>BASE 57095 vs a6>BASE 58491.
  Looked at img/tab_FS_gap_stall_k39-86_a7_a6_base_z3.png: a7 = a6, one edge, no trail or smear at the big steps. PASS.
- resize (1100x700 at 30, back to 1440x766 at 60, moving): s1 a7 vs a6 1 px (max 13), s2 3 px (max 12); history reset (weight 0)
  on the resize frames in both; a7>BASE <= a6>BASE in both segments. Looked at img/resize_s2_RS_k60-63_a7_a6_base_z3.png (the
  frames right after the size change back): a7 = a6, single waterline, no ghost; BASE steps. PASS.
- FS MCE vs fixed AA3 on every path: slow 2.781 (FIX 3.000), medium 2.117 (2.281), fast 3.767 (3.936), diag 3.004 (3.216),
  reverse 3.854 (4.044), leave 2.743 (2.907): never worse. PASS.
- Console: 0 errors / warnings in every capture session (cap.mjs 6 paths + raw, jcap 9 cases x 3-4 variants, rl 2, hitch 2).

## VERDICT (21:47)
- The user's complaint (stair-stepped / crawling waterline next to the ice while the camera moves, plus the odd glitch) is SOLVED
  in AA7: on every path the waterline glides like the 16-sample GT (time slices and strips at x2-x6), BASE's stair steps, stray
  dashes and notches are gone, no new dash / hole / column / rim, no snap when moving starts, no pumping when it stops, no 20 Hz
  flash, no ghost / trail in any event, no first-motion hitch. AA7 is AA6 to the eye everywhere (a7 vs a6: 3-6 px outside AA6's
  3x3 in each event case); the knee's measurable effects are small: -59 % over-darkened thin-dark px vs AA6, G1 -1 to -4 points.
- G1: every MC32 box and total PASSES on all six paths (L9 for FS: fast -22 vs bar 20, diag -37 vs 29, reverse -19 vs 14-15,
  leave -37 vs 28); FS MCE never worse than fixed AA3. L4: ONE cell misses: slow WR J48 -32 % vs GT -39 % (floor -34 %) = M-1.
- G1c PASS (slow 0.2166 / medium 0.2009 vs AA6 0.2159 / 0.2000, AA5a 0.2405 / 0.2225). G2 PASS (9 jcap cases + real loop).
  L5 PASS (start ramp within ~2x of g0 at hand-over / rest / re-press except the fastrev k1 > 16 lv cell = M-2 nit; stop smooth;
  no rim 1x / DPR 2). G6 PASS (stepped + real loop). Hitch PASS.
- Findings: M-1 minor (L4 J48 slow WR, knee-caused, invisible; closes with a lead acceptance under L10), M-2 nit (fastrev k1 > 16 lv
  3.6x g0 = AA6, <= BASE, invisible), M-3 nit (knee doubles the isolated bright-px count vs the unblurred resolve: 1x 1.64 vs AA6
  0.75, DPR 2 1.18 vs 0.35 per Mpx-frame; looked at: sparkles / removed dashes, no rim).
- Score 8.8 / 10 against the user's words. pass = false only because M-1 is a binding-gate miss (minor); nothing visible is open.
