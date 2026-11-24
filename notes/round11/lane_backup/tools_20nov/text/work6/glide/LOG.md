# AA6 pre-judge, lens F1 GLIDE RISKS (20 Nov 2026, Asia/Jakarta), read-only
Lab AA6 :5196 (built 17:12 by the integrator, not restarted), BASE :5182 (not restarted). WORK = $SP/work6/glide (tools/, caps/,
ana/, img/, logs/). Backup = MAIN/notes/round11/lane_backup/aa6/prejudge-glide/. Every browser through slot.mjs.
Variants in every event capture: a6 = AA6 default, g0 = AA6 ?lkglide=0 (= fixed1 + v3: the ONLY difference is F1), base = BASE
(+ its cap.mjs mask for the +-3 px band), raw = AA6 ?envedge=0 (unblurred resolve, L5's reference) where noted.

## 0. Setup (17:40-17:50)
- Tools copied (never edited in place): judge artifacts jcap.mjs (+ my `pump` case: sweep k0-69, pointer stops at 70, starts again
  at 190 with a velocity step, to 259), aa3 cap.mjs / lib / strip / phase / g45, judge rl.mjs / rlana.mjs, perf judge hitch.mjs,
  aa5a crawl / glide / glidecore, judge jg4s.mjs (A-2 per scale). New: evt.mjs (per-frame band table: |dF| per variant, |a6-g0|,
  a6 px > 8 lv outside g0's / BASE's 3x3 range, per box), sharp.mjs (band gradient energy over time = L5 pumping), evstrip.mjs
  (auto-targeted event strips), where.mjs, bandviz.mjs (OLD vs NEW band), g1all.sh / g1tab.py (G1 both mask sets).

## 1. G2 stepped events (jcap, 1440x766, rows 380-766; ana/evt_<case>.txt; T = 8 lv; band = BASE mask +-3 px, six boxes)
  per case: a6 px > 8 lv outside g0's 3x3 range (F1's own outliers) | a6 / g0 px > 8 lv outside BASE's 3x3 | band |dF| a6 vs g0
- fastrev (fast sweep, hard reversals at i 40 / 70, 3-frame flick 89-92, 120 f): a6>g0 1463 px in 120 f (<= 44 / frame, max 42 lv,
  664 darker); a6>BASE 70846 vs g0>BASE 71217 (F1 adds none vs BASE); a6 |dF| <= g0 |dF| on 119 / 120 frames (k1: 0.95 vs 0.86,
  the start); no spike at the reversals (k84-86 = the camera's own reversal, |dF| 3.4) or the flick. Strips looked at:
  img/fastrev_FS_start_k0-3_10.png (a6 | g0 | base): no trail, no pop, a6 slightly crisper.
- leavere (leave at 40, re-enter at 80): a6>g0 1183 px (<= 26 / frame, max 34); a6>BASE 64353 vs g0>BASE 65280; |dF| a6 < g0 on
  all frames but k2 (0.67 vs 0.51 = the start step, below). No event at 40 / 80.
- gov (scale 0.9 at 25, 0.8 at 50, 0.7 at 75, 1.0 at 100, moving): a6>g0 1335 px (max 36); the change frames reset the history
  (weight 0) in both builds with the same |dF| (k25 12.18 / 12.22, k50 10.41 / 10.49, k75 5.12 / 5.10, k100 6.94 / 6.92); the first
  history frame after the reset back to 1.0 (k101) has the largest a6>g0 count (64 px, FS 17, FR 27) = the crisper band, not a ghost.
  jg4s a6 vs g0 (F1's increment, whole frame, >4 lv): 3x3 per frame 80 / 56 / 54 / 100 at 1.0 / 0.9 / 0.8 / 0.7, max 36 / 19 / 25 / 26.
  Strip img/gov_FR_s07_k94-101_a6_g0_base_z4.png (scale 0.7, then 1.0): a6 = g0 to the eye, no dash, dot or trail.
- tab (90 frames of pointer motion while hidden at 40, dt 1/20 stalls at 80-84): a6>g0 913 px (max 30); stall frames |dF| 22.2 vs
  22.3 (a6 vs g0); strip img/tab_FS_stall_k78-86_a6_g0_base_z3.png: no trail or smear at the big steps; a6's slab edge crisper than
  g0's, base shows its stair notch.
- pump (sweep 0-69, pointer stops 70-189, starts 190-259; PRE 20 so k0 is 20 frames into the still tail): the camera NEVER became
  still after the pointer stopped (taa still = 0 on every frame to k189: the rig keeps drifting, z -0.0011 / frame at k186-190, i.e.
  ~0.06 px / frame > TAA_STILL 0.012), so the TAA (and glide) kept running through the whole "rest": no tail, no hand-over, no
  pumping in this case. Band gradient energy (sharp2.mjs, ALL boxes) a6 / g0 / base: moving k64-78 230-237 / 233-240 / 253-261,
  slow drift k184-189 245.6 / 247.0 / 259.5, restart k190-198 247-249 / 249-250 / 261-264: a6 tracks g0 within 1-2 % (no step at
  the restart); band |dL| a6 <= g0 except k1 (0.63 vs 0.51, the first moving frame after the 20 pre-roll still frames).
  a6>g0 2513 px in 260 f (max 32); a6>BASE 145976 vs g0>BASE 146768. Persistent 'hot' px (1395,601) -26 / (1180,718) -17 (a6 darker
  than g0's 3x3 from k1 on, also in gov / tab): zoomed x6 (img/pump_RS_hot1395_..., pump_WR_hot1180_...): no dark dot or rim,
  a6 = g0 = base to the eye.

## 2. G1 crawl per box (tools/g1all.sh -> ana/crawl{NEW,OLD}_<path>.json, g1tab.py; stride 2; FIX = aa3_fixed1 caps of the motion
##    recheck, for calibration)
- medium, NEW masks (aa5a's bloom-free coverage masks = the integrator's): reproduces the integrator exactly: FS -83, WR -70, DR -88,
  FF -83, FR -71, RS -88, tot -82 %; J32 / J48 every box >= GT's (L4 met); texLake 1.0114.
- medium, OLD masks (the motion judge's cap.mjs masks = its G1 table that failed AA3 in 6 cells): FS -75, WR -55, DR -87, FF -81,
  FR -62, RS -32 % (gate -50: MISS, fix1 -31 %), tot -74 %; L4: RS J48 -3 vs GT -13 (floor -8: MISS), WR J48 -6 vs GT -11 (floor
  -6: borderline). A stride-1 run with g0 (ana/crawlOLDs1_medium_withA6g0.json): RS fix -31 / g0 -31 / a6 -32 / GT -71 %.
- Why the two disagree on RS (img/bandviz_RS_medium_k120_OLDred_NEWgreen.png, looked at): in the RS box at k120 the OLD band has
  11662 px that are NOT on the waterline (red: speckle over the slab's snow top, its dark rock face and inner facets = the old
  mask's bloom-triggered 'partial' bit), 3274 px shared (yellow, the real waterline), 148 NEW-only. 78 % of the OLD RS band is
  surface the waterline TAA never touches, while the GT (16 samples everywhere) smooths it -> the OLD RS cell measures the whole
  slab, not the waterline. The NEW mask is the right instrument for this gate, but the final judges must be told which one counts.

## ENV (18:00-18:04): iCloud had evicted playwright-core
- From ~17:59 every headless capture on the machine hung at require (mine: jcap holdre 0 % CPU, no Chrome child for 4.5 min;
  prejudge-refl's cap.mjs leave the same): MAIN/hero-pipeline/tools/node_modules/playwright-core had 264 dataless (iCloud-evicted)
  files, 209 of them .js (lib/client/jsHandle.js, events.js, ...). iCloud was fetching them at ~10 files / 40 s; `brctl download
  <playwright-core dir>` (materializes the existing contents, edits nothing) finished it in ~40 s (18:04:16: 0 dataless) and both
  captures went on. It can happen again in the final judging: MAIN is in iCloud Documents.
- holdre (press 10, release 110, re-press 135, release 215; the TAA was HANDED OVER at k5-11: weight -1, still 25-31; k12 = first
  moving frame (weight 0, no history), k13 = first history frame): a6>g0 4966 px in 240 f (<= 60 / frame, max 43); a6>BASE 92839 vs
  g0>BASE 88925 (+4 %, the crisper band); band |dF| a6 = g0 within 0.1 lv at press / mid / release / re-press / release 2 (e.g.
  k110 7.29 / 7.37, k135 20.32 / 20.31, k215 1.49 / 1.54) except k13 (1.04 vs 0.86). Strip img/holdre_FS_mid_release_repress_
  a6_g0_base_z3.png (k60, 110, 112, 136, 138, 216): no trail, smear or ghost.

## 3. L5 sharpness pumping (stepcnt.mjs: band px whose luma changes > 4 / 8 / 16 lv from the previous frame; dmap.mjs maps)
- START = a one-frame SNAP on the waterlines, F1 only (finding G-1):
    holdre k13 (first history frame after a full hand-over): a6 1371 / 492 / 102 px vs g0 160 / 40 / 7 vs BASE 236 / 74 / 17
      (k14 back to normal: a6 103 / 38 / 13, g0 175 / 58 / 14); band grad^2 a6 241.0 -> 245.2 (+1.7 %) in one frame, g0 240.6 flat.
    pump k1 (restart 20 frames into the still tail): a6 1024 / 314 / 50 vs g0 166 / 43 / 8 vs BASE 238 / 91 / 17.
    leavere k2 (same, 21 frames into the tail): a6 1319 / 439 / 80 vs g0 171 / 60 / 10 vs BASE 219 / 98 / 21.
  i.e. 6-9x (> 4 lv) to 12-15x (> 16 lv) g0's change on that frame and 4-6x BASE's (which has no AA at all), at the moment the
  rest of the image is nearly static. Maps (|F(k)-F(k-1)| x8): img/pump_start_k1_FS_dmap_a6_g0_base.png and img/holdre_press_k13_
  leftslab_dmap_a6_g0_z2.png: in a6 a continuous bright dotted LINE along the slab waterlines (12-30 lv), g0 / BASE black there.
  Cause (EnvEdge.ts runTAA / arm + TAA_FRAG_GLIDE): on any moving frame t.tail = 1 at once, so the band sigma jumps from
  sigma + (0.3 - sigma) * tail_prev (0.6 after a hand-over, 0.55 at still 20) to 0.3 and the history weight to 0.85 in ONE frame;
  after a hand-over the no-history frame (uHistW 0 -> early return, no band flag -> 0.6 blur) is followed by the flagged 0.3 frame.
  The stop side is the 24-frame ramp; the start side has no ramp.
  Per-pair stills at 1x (img/holdre_RS_start_k11-16_a6_g0_z1.png) do not show it: it is a temporal tick, seen as the waterlines
  'snapping' sharper as the camera starts.
- STOP = smooth: holdre k1-9 (still 21 -> 29, hand-over at 25): a6 90-219 px > 4 lv per frame = BASE's own animated water (93-219),
  g0 58-114; at the hand-over frame a6 219 vs g0 272; grad^2 a6 245.9 -> 243.7 converging on g0's 243.7 at the hand-over.
  (pump: after the pointer stopped the camera kept drifting > TAA_STILL for the whole 120-frame stop, so in practice the tail only
  starts once the rig has settled, 2-8 s after the pointer stops; the judge's real-loop hitch run saw still 239 after 8 s.)
- resize (1100x700 at 30, back to 1440x766 at 60, moving): both builds reset the history at each size change (weight 0 for 1-2
  frames); s1 (1100x700): a6>g0 121 px in 30 f (max 34), a6>BASE 955 vs g0>BASE 1027; first history frame k1 |dF| 11.37 vs 11.08
  (the restart snap again, here masked by the motion); s2 (1440x766): a6>g0 231 px (max 27), a6>BASE 17257 vs g0 17287. No trail.
- 18:12 it happened AGAIN (301 dataless; my dpr2 jcap hung, and apparently prejudge-refl C / aa5c final too): the data volume is
  98 % full (12 GiB free; the scratchpad alone is 60 GB, work6 13 GB), so macOS keeps evicting iCloud Documents files. Actions:
  deleted my own analysed capture sets (pump, tab, resize, leavere: ~1.9 GB; their meta.json kept in ana/meta_<case>/), forced the
  download with parallel reads (find -flags +dataless | xargs -P 24 cat > /dev/null: 213 -> 17 in ~15 s), and installed
  playwright-core 1.49.1 (the same version) OFFLINE from the npm cache into $SP/work6/glide/pw/ (npm install --offline
  --ignore-scripts; no network); my tool copies (jcap / cap / rl / hitch) now createRequire from there, immune to the eviction.
  The killed dpr2 run and the not-yet-started batches were re-planned into chains F / G (slow 160 f, fast / diag / reverse / leave
  120 f, real loop a6 + base, hitch 1 rep, raw refs, dpr2 a6 + raw).
- (fastrev, more strips) img/fastrev_FR_flick_k88-96_a6_g0_base_z4.png (the 3-frame flick and its stop) and img/fastrev_FF_k28-97_
  a6_g0_base_z4.png (far floe: fast sweep k28-32, reversal k84-86, after the flick k95-97): a6 = g0 (smooth, single edge), base
  shows its stair steps; no ghost, double edge, trail or lag on the far floes despite J48 -68 % there (GT -35 %).

## 4. Real loop (rl.mjs, engine's own rAF, CDP mouse, medium, 180 f; machine load 23-35 -> 73 during F1)
- G6 (rlana.mjs with the motion judge's stepped BASE mask): AA6 band 1/3-cycle 1.1x median (box 1.0x), BASE (same batch) 1.7x
  (2.0x), fixed1 (judge's recheck run) 1.6x; mirror redrawn 180 / 180 frames; 0 console lines. AA6 shows a peak at 0.117 cycle /
  frame (9.2x median, FS 10.5x) whose ABSOLUTE folded amplitude P8 = 1.02 lv equals fixed1's (1.09 lv; fixed1's own peak is at the
  same 0.117, 3.3x); BASE P8 0.67. The ratio is larger only because AA6's band spectrum is flatter elsewhere. Stepped check of the
  same question (folded amplitude of the band |dF| series at period 3 / 8 / 9, ana via evt JSONs): fastrev a6 0.029 / 0.251 /
  0.320 vs g0 0.028 / 0.249 / 0.322 vs BASE 0.268 / 0.244 / 0.559; gov and holdre the same pattern -> no F1-specific periodic
  component; the 20 Hz flash stays gone (P3 a6 = g0 << BASE).
- Frame time: AA6 rl run 53.7 ms median (p90 74, max 145) vs BASE 26.3 ms in the next session; NOT comparable (load 23 -> 73,
  another agent's 2880x1532 16-sample capture on the GPU during the AA6 run). G7 belongs to AA5c; reported, not judged.
- First-motion hitch (hitch.mjs, aa6 / base interleaved, 1 rep, rest 8 s; load 36 -> 73): rx-lake-edge-taa linked at boot (23
  programs vs BASE 22); first burst CPU per frame for the first 10 frames 2.1-2.7 ms (BASE 1.3-2.9), interval max 60.0 ms vs BASE
  61.3 (load-bound), cpu max 26.9 ms once later in the burst (not in the first 10); after the 8 s rest (TAA handed over: still 257)
  the restart burst cpu max 5.6 ms (BASE 7.4), interval max 64.9 vs 63.0. No compile or first-motion hitch from F1.
- G2 in the real loop: the AA6 rl run had 62-145 ms frames (engine dt clamped at 0.05) at k125-130; strip img/rl_medium_A6_FS_
  stall_k125-129_z2.png (front slab + waterline around the 145 ms stall): single clean edge, no ghost, trail or smear; TAA valid
  and running every frame (runs 296-300).

## 5. L7 / A-2 in AA6 (gov case: scale 1 -> 0.9 at 25 -> 0.8 at 50 -> 0.7 at 75 -> 1.0 at 100, moving; jg4s.mjs vs raw =
##    AA6 ?envedge=0, the unblurred resolve: a blur stays inside raw's 3x3 range, so every count is the TAA's; ana/A2_gov.txt)
                 3x3 px / frame (max lv, darker share)          5x5 / frame     7x7 / frame
  a6  scale 1    0.87 (17)                                       0.44            0.18
      0.9        11.2 (20, 98 %)    0.8  11.3 (14, 87 %)         3.6 / 2.2       1.5 / 1.4
      0.7        37.9 (18, 67 %)                                 4.2             2.7
  g0  scale 1    0.51 (17);  0.9 4.0 (16);  0.8 3.2 (10);  0.7 11.0 (11)       0.20 / 1.8 / 0.96 / 0.84
  F1 roughly triples the reduced-scale outliers in the display 3x3 metric (0.7: 37.9 vs 11.0 / frame; 5x5, the scale-correct
  window at 0.7: 4.2 vs 0.84), all small (<= 20 lv, mostly darker). Worst cells (a2where.mjs, k75-99): FF far floes x 80-160,
  y 480-520, RS x 1360 y 660. Looked at: img/A2_gov_s07_FF_k83-95_a6_g0_raw_z4.png, A2_gov_s07_RS1360_k87-95_a6_g0_raw_z4.png
  (x4: a6 = g0, no dot, dash or rim; raw shows its stair steps) and A2_gov_s07_k83_91_a6_raw_z1.png (1x: a6 and raw identical to
  the eye apart from a6's smoother waterlines). L7 verdict: NOT visible at 1x -> no fix needed.
- Seen on the way (not F1, cross-lens to v3 / AA5b): at render scale 0.7 a PALE BLOCK still appears under the near far floe
  (gov k90-93, x 90-190 y 490-520): img/gov_s07_FF_paleblock_k89-93_a6_raw_base_z4.png: BASE has the full block (k90-93), a6 AND
  raw (?envedge=0) a smaller one (~1/3 of BASE's width, k91-93; a light vertical line at k90). v3 reduces it at 0.7 but does not
  remove it (finding G-3).

## 6. L5 rims / outlines (G4 vs the unblurred resolve, l5g4.mjs: A px > 4 lv outside raw's 3x3 range)
- DPR 2 (jcap dpr2 --dsf 2: drawing buffer 1800x957 = pixel ratio 1.25 cap, 90 f, a6 and raw = ?envedge=0): 27 px in 89 frames =
  0.35 per Mpx-frame, max excess 15 lv (16 darker / 11 brighter) -> no rim. Looked at: img/dpr2_k40_a6_raw_z1.png (1x of the
  buffer) and img/dpr2_FSfoot_k38-42_a6_raw_z4.png (front-slab foot x4): a6 a clean single edge, raw its stair steps; no outline.
- 1x (cap.mjs fast, 118 f, a6 vs raw = ?envedge=0 on :5196): 49 px = 0.75 per Mpx-frame, 0 on the band, max excess 14 lv (38 darker /
  11 brighter); aa5a measured F1 0.6 / 0 / 14 on its build -> no rim or outline at 1x (L5 met for rims).

## 7. G1c glide (aa5a's glide.mjs, its coverage masks; lean runs: GT / F1 (aa5a's own caps) / AA6 only, sample stride 6, so F1 and
##    AA6 use the same samples; medium = the integrator's 7-sequence run, my re-run was stopped at load 40-80)
                         REL area5 ALL / FS     REL cross ALL    f(|d2|>0.1)    solid-side err ALL / FS
  slow k1-159    F1      0.240 / 0.229          0.240            0.319          4.81 / 3.41
                 AA6     0.217 / 0.209          0.221            0.254          3.83 / 3.25
  reverse k1-119 F1      0.311 / 0.252          0.317            0.565          5.08 / 3.74
                 AA6     0.276 / 0.226          0.287            0.531          4.16 / 3.60
  medium (integrator) F1 0.209 / 0.181, AA6 0.195 / 0.164; f 0.252 -> 0.227; solid-side ALL 4.61 -> 3.73.
  -> G1c at least as good as AA5a on every path measured (9-11 % lower REL jerk; the solid-side gain is v3's).

## 8. G1 all six paths (ana/g1table.txt; NEW = aa5a's coverage masks, the right instrument (section 2); slow k1-159, medium k1-239,
##    fast / diag / reverse / leave k1-119; stride 2; FIX = aa3_fixed1)
  NEW MC32 % vs BASE        FS    WR    DR    FF    FR    RS    tot     (fixed1 FS)
  slow   (gate 50)          -74   -75   -87   -82   -71   -90   -81     (-75)
  medium (gate 50)          -83   -70   -88   -83   -71   -88   -82     (-83)
  fast   (gate 40)          -23!  -53   -83   -83   -74   -85   -73     (-36)
  diag   (gate 40)          -40=  -60   -86   -85   -79   -85   -78     (-59)
  reverse (gate 40)         -22!  -66   -78   -82   -78   -83   -74     (-36)   GT FS -20
  leave  (gate 40)          -40=  -68   -92   -83   -76   -91   -79     (-58)   (diag -39.6..-40.4: at the gate)
  L4 (GT paths slow / medium / reverse): every AA6 J32 / J48 reduction >= GT's - 5 points on the NEW masks. texLake 1.008-1.011
  (v3, L3), texSolid 1.0002-1.0007.
- FS regression is F1's (finding G-2): reverse split (crawl, NEW mask, stride 1, ana/crawlNEW_reverse_split.txt; extra caps
  reverse_A6g0 = ?lkglide=0 = fixed1 + v3, reverse_A6f0 = ?ffblock=0 = fixed1 + F1):
    FS MC32  FIX -36 | G0 (fixed1+v3) -36 | F0 (fixed1+F1) -22 | AA6 -22 | GT -20      FS MCE  4.04 | 4.05 | 3.84 | 3.84 | GT 4.16
  i.e. v3 changes nothing on FS; F1 alone takes FS from -36 to -22 % (fast / diag / leave the same pattern vs fixed1: -36 -> -23,
  -59 -> -40, -58 -> -40). Mean residual (MCE) improves and equals / beats the GT, and the GT itself scores -20 % on FS reverse: the
  crisper F1 band (sigma 0.3 while the TAA runs) turns more of the front slab's high-contrast edge px into > 32 lv residuals under
  fast motion, which MC32 counts as crawl. Other boxes all improve with F1 (FR reverse -55 -> -78, RS -73 -> -83, ...).
  Strip looked at: img/reverse_FS_k86-94_AA6_FIX_BASE_z2.png (around the reversal): AA6 = FIX to the eye, single edge, BASE steps.
- OLD masks (the motion judge's): additionally RS medium -32 % / leave -32 %, WR fast -36 %, and the L4 misses on WR / RS (slow,
  medium, reverse): all inside the RS / WR cells whose OLD band is ~78 % non-waterline (bandviz, section 2); fixed1 misses the same.

## VERDICT (18:34; 0 console errors / warnings in every capture session: jcap 8 cases, cap.mjs 9, rl 2, hitch 2)
- G2 no ghost / trail / smear with the higher history weights: PASS on every event (fast sweeps, reversals, 3-frame flick, leave /
  re-enter, hold press / mid / release / re-press, resize mid-motion, tab hidden -> visible + dt stalls, governor 0.9 / 0.8 / 0.7 /
  1.0, DPR 2, real rAF loop with CDP mouse incl. a 145 ms stall). F1's own outliers vs fixed1 + v3 <= 64 px / frame, max 43 lv;
  a6 vs BASE outliers = g0 vs BASE within -1..+4 %.
- L5 rims: PASS (1x 0.75 px per Mpx-frame vs the unblurred resolve, 0 on the band, max 14 lv; DPR 2 0.35, max 15).
- L5 pumping: STOP PASS (24-frame ramp, per-frame change = the scene's own); START FAIL -> G-1 (one-frame snap on the waterlines).
- L7 / A-2: outliers ~3x fixed1's at 0.9 / 0.8 / 0.7 (37.9 vs 11.0 / frame at 0.7) but <= 20 lv, not visible at 1x or x4 -> no fix.
- G1: slow / medium every box PASS; fast / reverse FS MISS (-23 / -22 %, fixed1 -36 / -36), leave FS -39.7 (miss by 0.3), diag FS
  -40.1 (at the gate): F1-caused (split), GT-level on reverse (GT -20 %), MCE better than fixed1 and GT -> G-2 (lead decision or
  speed-gated band sigma). Totals all pass (-73..-82 %). L4 met on the NEW masks. OLD-mask misses = mask artifact (G-4).
- G1c: AA6 better than AA5a's F1 on slow (REL 0.240 -> 0.217), reverse (0.311 -> 0.276), medium (0.209 -> 0.195, integrator).
- G6: PASS (real loop 1/3 1.1x vs BASE 1.7x; stepped P3 a6 = g0 << BASE; no F1-specific period).
- First-motion hitch: PASS (TAA program linked at boot, first-10 CPU 2.1-2.7 ms).
- Findings: G-1 major (start snap), G-2 major (FS crawl on fast paths), G-3 minor (pale block left at scale 0.7, v3 lens),
  G-4 minor (OLD vs NEW G1 masks), G-5 minor (env: iCloud eviction + 98 % full disk stall every headless run).
