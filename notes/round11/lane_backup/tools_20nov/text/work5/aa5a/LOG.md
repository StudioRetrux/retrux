# AA5a lane log (waterline GLIDE: tune AA3's lake-edge TAA + EnvEdge silhouette blur), 20 Nov 2026 (Asia/Jakarta)
LANE = ~/Library/Caches/retrux-lanes/aa5a/retrux-web (APFS clone of aa3_judged), lab :5193. Diff base = aa3_judged.
WORK = $SP/work5/aa5a (tools copied from work3/aa3/tools; caps / img / ana). Backup = MAIN/notes/round11/lane_backup/aa5a/.
Switch: ?lkglide=0 = AA3 exactly. Lab-only params need ?debug: lkgws lkgwf lkgv0 lkgv1 lkggam lkgclip lkgsb lkgtail=0.

## 0. Start (15:21)
- Lane == aa3_judged (diff -rq app, hero-lab: identical). Read AA3 / AA4x / AA4y LOGs, EnvEdge (EDGE_FRAG, TAA_FRAG), HeroEngine
  wiring, cap / crawl / lib / slice / strip tools. Lab :5193 built.

## 1. Mask fix (lesson 3) (15:24-15:30) - tools/capm.mjs
- The mask renders now draw the lake flat 0 and flat 2.5 (HDR) and blit the resolved HDR main target x0.2 to the screen WITHOUT
  the post chain (no bloom, no AgX, no grain): the G difference is linear in the lake coverage. Coverage = diff / local max
  (31 x 31, for fog / mist far away) -> cNNNN.bin (coverage x 255); mNNNN.bin bits: bit0 coverage >= 0.5, bit1 0.06..0.94,
  bit2 hero (as before, post-processed frame with / without the hero).
- Checked: the mask session's frames == AA3's medium_base caps (0 bytes, k 0-2); old vs new mask (img/maskfix_FS_k1.png,
  maskfix_FF_k1.png): the old mask's grey "partial" sheets over the dark slab face and the floes' dark sides are gone; the new
  boundary is a clean 1-2 px coverage ramp. Masks: caps/medium_mask, caps/slow_mask (BASE :5182, 240 frames).

## 2. G1c glide metric (15:30-15:55) - tools/glidecore.mjs, glidesyn.mjs, glide.mjs
- Edges from the BASE coverage mask (same geometry for every variant): per box, rows for edges within 45 deg of vertical,
  columns for the rest; a crossing needs a clean monotonic transition (solid <= 0.06 and lake >= 0.94 coverage at 2-3 px,
  no hero within 3 px). Tracks link the same edge on the same line over frames (same polarity, <= 2.5 px from the predicted
  position). Per frame the sub-pixel position in each variant's luma profile; levels S / L from 2-3 px out, smoothed +-3
  frames along the track; contrast >= 40 lv. Jerk = second time difference minus the change of the box motion (AA3 crawl
  registration, smoothed +-4), RMS over (track, frame) samples valid in ALL variants; samples where any variant jumps > 1 px
  (mis-track) dropped (5-8 %).
- Two estimators: "cross" = the brief's midpoint crossing (linear interpolation) and "area5" = area estimator over the 5
  transition px (levels from outside), exact for any symmetric blur.
- Synthetic validation (glidesyn.mjs: straight edge 8 / 80 deg, constant speed 0.03-0.7 px/frame, 4x rotated grid vs 16 =
  the GT recipe vs 256 exact): cross: 4 samples 0.13-0.34 px, 16 samples 0.05-0.20, exact 0.005-0.17. The midpoint crossing
  has its own 1-px periodic bias (exact edge 0.17 at 0.31 px/frame: sharper edges score WORSE). area5: 4 samples 0.12-0.25,
  16 samples 0.05-0.09, exact 0.002-0.009 (no bias) -> area5 is the ranking estimator. EMA sims (motion-compensated, clip
  3x3): w 0.5 0.05-0.09 (~ 16 samples), w 0.8 0.017-0.033, w 0.9 0.009-0.02.
- REAL caps (slow k1-159, 147 k samples, area5): BASE 0.341, AA3 0.234, GT 0.256 px. GT is NOT far better than BASE on the
  absolute metric: the per-line edge motion of these real silhouettes is itself irregular (the contour slides over the
  slab's / floe's facets: BASE, AA3 and GT show the same irregular steps, frame for frame, e.g. FS row 700 k84-86) and the
  lake's own moving texture shakes every estimator; the TAA smooths both in the band. => absolute G1c on real caps is
  dominated by real motion, not AA. Added G1c-REL: second time difference of (variant - GT) position, i.e. the deviation from
  the GT's own edge motion (0 for GT by construction): slow BASE 0.354, AA3 0.251 (-29 %).

## 3. Lane: glide lab params (15:35-15:58) - EnvEdge.ts, HeroEngine.ts
- EnvEdge: TAA_FRAG_GLIDE / EDGE_FRAG_GLIDE = AA3's TAA_FRAG / EDGE_FRAG with exact text replacements (glideReplace throws if an
  anchor is not found exactly once); used only when glide is on, so `?lkglide=0` compiles AA3's text with AA3's uniforms.
  Parameters (EdgeGlideOptions): history weight wSlow -> wFast over v0..v1 px/frame of the pixel's OWN reprojection motion;
  clip gamma + mode (0 AA3 variance & min/max, 1 variance only, 2 min/max only); Keys cubic a for the history resample
  (-0.5 = AA3's Catmull-Rom); silhouette blur sigma on TAA band pixels (flagged by a negative alpha in the TAA output; the
  edge pass reads |alpha|) while the TAA runs; still tail: weight and band sigma ramp out over the 24 still frames (seamless
  hand-over to the plain resolve). Lab: ?debug&lkgws&lkgwf&lkgv0&lkgv1&lkggam&lkgclip&lkgres&lkgsb&lkgtail=0.
- tsc hero + project clean. ?lkglide=0 medium 121 frames == AA3 medium_F (0 px). Glide with AA3's values (G0) slow 160
  frames == AA3 slow_F (0 px): the glide program path itself is neutral.

## 4. Candidates (16:00-), caps 160 frames (k1-159), my lab; metrics vs BASE / AA3 / GT (AA3's caps)
  slow (k1-159)          G1c abs   G1c REL   solid-side   MC32 (vs BASE)   MCE    J48    ESF w10-90 / off50
  BASE                   0.340     0.354     4.60          -               -      -      2.27 / -0.28
  AA3                    0.232     0.251     4.45          -68 %          -21 %  -74 %  2.27 / -0.27
  GT                     0.256     0         0             -61 %          -24 %  -55 %  1.94 / -0.09
  W7  (w 0.7)            0.218     0.236     5.13          -72 %          -27 %  -79 %
  W85 (w 0.85)           0.214     0.231     6.10          -74 %          -31 %  -80 %  2.36 / -0.29
  AD1 (0.85->0.5, v .15-.6) medium only
  AD2 (0.9->0.6, v .2-1) 0.215     0.232     5.94          -74 %          -31 %  -80 %
  S3  (band blur off)    0.233     0.247     3.89          -68 %          -20 %  -67 %  2.21 / -0.26
  AD1S3                  0.226     0.240     4.29          -70 %          -24 %  -69 %
  AD1S45                 0.225     0.241     4.46          -70 %          -25 %  -74 %
  W85S3                  0.213     0.228     5.64          -74 %          -31 %  -80 %  2.30 / -0.28
  W85S0 (== W85S3: sigma 0.3 at 1x is already no blur: neighbour weight 0.004)
  W85S3R1 (a = -1)       0.225     0.239     7.85   (sharper history resample: WORSE on every count) ESF 2.39 / -0.26
  medium (k1-159): AA3 rel 0.211 / solid 4.23 / MC32 -67 %; W85 0.195 / 5.55 / -74 %; W85S3 0.192 / 5.10 / -73 %;
  S3 0.209 / 3.77 / -66 %; AD1S3 0.204 / 4.06 / -67 %; W7 0.199 / 4.71 / -72 %; GT MC32 -61 %.
- Reading: more history = more glide (REL -8..-9 % at 0.85; the slices look smoother, below) but a wider edge: the history
  is resampled every frame (Catmull-Rom at a sub-pixel offset low-passes the edge), so the solid-side edge pixels drift
  away from the GT's crisper edge (+27..+37 %). The band blur off (S3) gives the crisper edge (-13 % solid-side) but no glide.
  Every 1x variant (BASE too) sits ~0.18 px towards the solid vs the GT (linear resolve vs the GT's display-space 2x2 mean):
  a floor of this track (A's resolve, not C).
- Slices looked at: img/slice_slow_FS700_W85.png (BASE | AA3 | W85 | GT): W85's edge is free of AA3's lumps but softer than
  GT's; img/slice_medium_FS690_W85.png: BASE steps, AA3 small steps, W85 a nearly continuous edge, GT crisp + continuous.
- Batches 3-4 (16:00-16:22): band blur sigma 0 == 0.3 (identical caps metrics: at 1x sigma 0.3 is already no blur); sharper
  history resample (Keys a = -1) WORSE everywhere (slow solid-side 7.85, REL 0.239, ESF 2.39); step clamp (clip mode 3:
  history within +-kappa 4x-coverage steps of the current value) kappa 1 / 1.5: less glide than the plain clip, no gain on
  the edge (5.65 / 5.74); gamma 1.0 == 1.25 at w 0.85. Lag check (offset vs GT regressed on the edge's velocity): no extra
  lag from the higher weight (slow b -0.101 vs AA3 -0.093, BASE -0.069; medium -0.041 vs -0.077).
  New G1c reading by edge speed (area5; slow, v < 0.15 px/frame along the line): abs BASE 0.237, AA3 0.145, GT 0.163,
  W85S3 0.122 -> even at slow edge speeds the GT's own frame-to-frame jitter is not lower than the TAA's: the absolute jerk
  cannot rank anything against GT; REL is the ranking metric.
  slow (k1-159)   REL     solid-side   MC32   MCE    J48    J32    ESF        f(|d2|>0.1, cross)
  AA3             0.249   4.45         -68 %  -21 %  -74 %  -45 %  2.27       0.407
  GT              0       0            -61 %  -24 %  -55 %  -29 %  1.94       0.465
  W7S3            0.231   4.58         -72 %  -27 %  -76 %  -54 %  2.24       0.322
  AD4S3 (.8->.5)  0.242   4.04         -69 %  -22 %  -68 %  -41 %  2.21       0.390
  W85S3           0.227   5.64         -74 %  -31 %  -80 %  -64 %  2.30       0.232
  medium          REL     solid-side   MC32   MCE    J48    J32    ESF        f(|d2|>0.1)
  AA3             0.211   4.23         -67 %  -18 %  -30 %  -16 %  2.21       0.268
  GT              0       0            -61 %  -22 %  -26 %  -15 %  1.95       0.304
  W7S3            0.196   4.24         -71 %  -23 %  -35 %  -20 %  2.17       0.217
  AD4S3           0.205   3.89         -66 %  -19 %  -26 %  -14 %  2.15       0.249
  W85S3           0.191   5.10         -73 %  -28 %  -45 %  -28 %  2.22       0.163
- Slices looked at (img/slice_slow_FS700_cands.png, img/slice_medium_FS690_cands.png: AA3 | W7S3 | W85S3 | GT): both W7S3
  and W85S3 are crisper than AA3 and their edge advances without AA3's lumps / small steps; W85S3 is a little smoother;
  GT is crisp + regular. W85S3's solid-side error (+21..27 %) and its J48 far beyond the GT's (medium -45 % vs -26 %: more
  temporal smoothing than the reference) speak against 0.85 at every speed.
## 5. Decision (16:22): F1 = history 0.85 at <= 0.15 px/frame of the pixel's own motion -> 0.7 at >= 0.5 px, AA3's clip
##    (gamma 1.25, variance & min/max) and Catmull-Rom, band blur off while the TAA runs (sigma 0.3 = neighbour weight 0.004),
##    tail ramp. Product default (GLIDE in HeroEngine); ?lkglide=0 = AA3.

## 6. Final build checks (16:23-) - default = F1 (product), switch ?lkglide=0
- G8 (tools/g8mine.sh, ident.mjs vs the AA3 builder's ident JSONs, same tool / path / frames): ?lkglide=0 vs AA3 lane: final
  image, mirror / walk / cache / cacheN / reflection targets and all 15 linked programs IDENTICAL, 0 logs; default vs AA3:
  final image + rx-env-edge / rx-lake-edge-taa programs differ only (lake targets identical); aaresolve=0&slabflash=0&lktaa=0
  (with or without lkglide=0) vs BASE T1: identical (14 programs); envlake=plate vs BASE plate, T0 (mobile) vs BASE T0, T2 all
  off vs BASE T2: identical. Image level: ?lkglide=0 medium 121 frames == AA3 medium_F (0 px).
- slow FULL (k1-239) BASE / AA3 / GT / F1: G1c REL (area5) 0.313 / 0.221 / 0 / 0.203 (-8 % vs AA3); abs 0.300 / 0.201 /
  0.222 / 0.185; by edge speed v < 0.15 px/frame REL 0.227 / 0.154 / - / 0.138, 0.15-0.5 0.373 / 0.264 / - / 0.243; f(|d2| >
  0.1 px, cross) 0.469 / 0.318 / 0.362 / 0.217. Solid-side edge error vs GT 4.74 / 4.39 / 0 / 4.87 (FS 4.48 -> 3.58, DR 5.76 ->
  5.49, WR =, FF 4.93 -> 5.96, FR 3.33 -> 3.87, RS 2.88 -> 3.11; floor 1.25); ESF 2.25 / 2.25 / 1.92 / 2.23. MC32 -70 % (AA3) /
  -63 % (GT) / -74 % (F1); MCE -20 / -24 / -27 %; J48 -76 / -60 / -78 %; J32 -49 / -33 / -58 %; texture lake 0.9991, solid
  1.0004 (= AA3).
- G1 other paths (new masks, k1-119, vs BASE): MC32 fast AA3 -60 % / F1 -63 %, diag -64 / -67 %, reverse -60 / -64 %, leave
  -64 / -68 %; MCE -21/-27, -20/-26, -20/-26, -19/-25 %; texture lake 0.999-1.003, solid 1.000-1.0004 (= AA3).
- G4 (fast, k1-119): F1 vs the TAA-off frame (?lktaa=0, which keeps the 0.6 px silhouette blur): 90 px per Mpx-frame more than
  4 lv outside its 3x3 range (93 % on the band, dark 3011 / bright 2866: the crisper band edge, not a one-sided rim; histogram
  mostly 4-8 lv, max 51); vs the unblurred resolve (?envedge=0): 0.6 px per Mpx-frame, 0 on the band, max 14 (AA3 vs TAA-off:
  0.26, max 8). G5 (fast, F1 vs AA3): sky above the horizon 0, hero mask mean 0.027 lv (max 51 at ring silhouettes over
  changed waterline pixels; the hero programs / reflection target are unchanged: ident), lake region mean 0.09.
- Ghost strips looked at (img/ghost/: fast FS / FR, reverse FS / FF, leave RS, hold start / mid / release; BASE | AA3 | F1):
  no trail, smear or ghost in F1 on any; same as AA3. The far-floe PALE BLOCKS (lesson 6) are visible in BASE, AA3 and F1
  alike (reverse_FF strip, slices FF col 230): unchanged by this track.
- medium FULL (k1-239) BASE / AA3 / GT / F1: G1c REL (area5) 0.314 / 0.228 / 0 / 0.212 (-7 %); REL (cross, the brief's
  estimator) 0.313 / 0.223 / 0 / 0.206 (-8 %); abs area5 0.298 / 0.209 / 0.229 / 0.194; abs cross 0.272 / 0.157 / 0.197 / 0.133;
  v < 0.15 px/frame REL 0.203 / 0.142 / - / 0.127; f(|d2| > 0.1) 0.447 / 0.320 / 0.356 / 0.255. Solid-side 4.81 / 4.37 / 0 /
  4.61 (FS 4.49 -> 3.33, DR 5.55 -> 4.92, WR 4.75 -> 4.58, FF 4.86 -> 5.63, FR 3.20 -> 3.54, RS 2.51 -> 2.77). ESF 2.24 / 2.24 /
  1.94 / 2.22. MC32 -69 / -62 / -73 %, MCE -19 / -22 / -25 %, J48 -33 / -25 / -39 %, J32 -16 / -14 / -22 %; texture lake 1.0001,
  solid 1.0003 (= AA3).
- G6 (phase.mjs, 1/3-cycle peak on the band, ALL): slow BASE 22.7x / AA3 1.0x / F1 1.1x / GT 0.8x; medium 17.3x / 1.0x / 0.9x /
  0.7x: no periodic flash.
- Rest / settle: rest 40 frames F1 == ?lkglide=0 (0 px). Leave path to 240 frames (the camera stops at k 226, tail t1-t14 in
  the capture): frame-to-frame change counts during the stop F1 == AA3 within 0.1 % (e.g. k239 21897 vs 21889 px > 8 lv, the
  animated hero / water): no pop at the stop; the hand-over at t24 is exact by construction (weight 0 and sigma 0.6 at t24).
- G10 (g10.mjs): DPR 1 (1440x766) and DPR 2 (1.25 -> 1800x957), resize 1100x700 / 1375x875 and back: no dark frame, history
  restarts, 0 console errors / warnings; live engine (own RAF, real mouse, hold): TAA ran 311 frames, 0 logs (21.6 fps: the
  machine was loaded by other agents' captures). 0 errors / warnings in all 40+ capture sessions.
- G7 (perf2.mjs, ONE session per build, full (B + C) vs none (A only) toggled in 60-frame blocks, 10 cycles, two runs each;
  the machine heavily loaded: 45-60 ms frames, paired ratios 0.64-1.19): paired median full/none glide 1.055 / 1.052, AA3
  (?lkglide=0) 1.045 / 1.040 -> glide ~ +1 % over AA3 (inside this run's noise); by construction it adds ~10 ALU per pixel in
  the edge pass (|alpha| x 9, one select) and ~10 per band pixel in the TAA. G7 stays as borderline as AA3's (+4.5..+5.9 %).
- applytest: aa5a.patch (2 files) applies with patch -p1 (dry run + real) on a fresh cp -c of aa3_judged and reproduces the
  lane's sources exactly. tsc hero + project clean. Lab :5193 stopped (16:52); no browser of mine left.

## 7. VERDICT (16:55)
- F1 is better than AA3 on every glide measure and on crawl, keeps texture / rest / switches / phones exactly, shows no ghost
  in the strips, and its moving silhouettes are crisper (closer to the GT's) - but it does NOT glide like the GT yet: the GT's
  edge is still crisper (ESF 1.92 vs 2.22 px) and the per-line edge jerk relative to the GT drops only 7-8 % from AA3 (REL
  BASE 0.313 -> AA3 0.221-0.228 -> F1 0.203-0.212, GT 0). Part of that REL floor is not AA (the GT's own lake texture, 0.68
  of the energy, and its 2x reflections). In the slices the FS slab edge (row 690, slow and medium) is
  the clearest win: AA3's small steps / lumps are gone and the edge advances like the GT's, only softer; on WR / RS / FR / DR
  column slices F1 and AA3 look alike, both smoother than BASE, both short of the GT. The far-floe pale blocks are unchanged.
- Open: G4 literal reading (vs the blurred TAA-off frame: 90 px per Mpx-frame, from the crisper band edge; vs the unblurred
  resolve 0.6); G1 "J48 / J32 within 5 points of GT's" is exceeded by F1 (slow J48 -78 vs -60, medium -39 vs -25) as it is by
  AA3 (-76 / -33) on the fixed masks; far floes' solid-side error up (FF +15..21 %, FR +11..16 %) while FS / DR improve 10-26 %.
