# AA4Y lane log (angle X2: morphological AA on the geometric lake / solid mask), 20 Nov 2026
LANE = ~/Library/Caches/retrux-lanes/aa4y/retrux-web (APFS clone of AA3; mine), lab :5192. Frozen AA3 = aa3_judged (diff base).
WORK = $SP/work4/aa4y (tools copied from work3/aa3/tools, ports -> 5192). Backup = MAIN/notes/round11/lane_backup/aa4y/.

## 0. Start (14:09)
- LANE == aa3_judged (diff -rq app, hero-lab: identical). Lab :5192 built and serving.
- Rig check (14:38): my lane, medium path, 121 frames == AA3's caps/medium_F (0 differing bytes) -> deterministic, lane == AA3.

## 1. Where the AA3 edge differs from the GT (14:10-14:58, offline on AA3's caps)
- New tool edgeerr.mjs: error vs GT (max channel) on EDGE pixels only (3x3 holds lake AND solid), per box, plus the "floor"
  (same error on lake / solid pixels 3-5 px away from any edge) and a split by the GT's local contrast.
  * E1 (literal: lake = mask bit0, solid = no bits, lib.bandFromMask): medium k1-120: base 4.81, AA3 4.76 (-1 %).
  * E2 (binary: lake = bit0, solid = NOT bit0): base 6.84, AA3 6.13 (-10 %).
  * floor on lake pixels 3-5 px from the edge: 6.8-6.9 levels (as large as the edge error itself); solid 1.0-1.3.
    The GT's lake texture is 0.68 of BASE (2x render -> finer reflections, then 2x2 averaged): every lake-side edge pixel
    carries that difference, which no edge AA can remove. => G1b's -40 % on edge pixels looks unreachable for ANY edge AA.
- The cap masks are polluted by bloom: the flat-WHITE lake (HDR 8) blooms onto nearby solids, so dark slab faces and the
  far floes' dark side faces next to the lake are "partial" (bit1) over their whole area (mask dumps around x 360-395,
  y 670-712 slow k150, and the floe column x 230). E1 therefore misses most dark-solid waterlines; crawl's band (partial
  counts as edge) covers whole dark faces.
- EnvEdge's silhouette blur is sigma 0.6 px at 1x, but the GT (2x render) has it at 0.6 px of 2x pixels = 0.3 px: depth-jump
  edges in BASE / AA3 are wider than in the GT. Column x 360 (rock top vs lake), medium k46: A 111 / 178 vs GT 95 / 194, same
  integral (position), only the width differs. Test capture (my lane, --eval envEdge.sigma = 0.3): E1 -12 % vs base
  (AA3 -1 %), FS -29 %; E2 -13 % (AA3 -10 %).
- Far floes (FF, medium k52-200, x 190-250 y 499-506): BASE and AA3 show a PALE block under the near floe where the GT shows
  the floe's dark reflection (mean luma 183 vs 166 at k100; single px up to 70 lv off), its boundary sweeping across pixels
  (x 230 k51->52: 117 148 160 -> 201 190 191). A lake-reflection difference between 1x and 2x, not edge AA; not my angle,
  reported only.

## 2. Offline MLAA prototypes (display space, BASE frames + cap masks) (14:20-14:50)
- mlaasim.mjs / mlaasim2.mjs: MSAA-aware MLAA = slope-adaptive box filter ALONG mask edges (orientation from the mask's
  Sobel, MLAA edge-length search of the boundary row-pair up to 32 px each way -> run L, width w = kf L, tent ends).
  * polluted 3-class mask: kf 0.25 / 0.5 / 1.0 -> E1 +7 / +24 / +64 %, MC32 +1 / +4 %: worse, nothing gained.
  * binary mask (lake = bit0): kf 0.25 / 0.5 -> E2 +3 / +10 %, MC32 -6 / -9 % (GT -69 %), MCE -1 / -2 % (GT -26 %).
  => smoothing along the edge does not bring the edge closer to the GT and barely touches the temporal crawl.
- Run lengths of the binary mask's horizontal boundaries (medium k60): FF / FR 60-66 % of boundary px on runs >= 12 px
  (MLAA's good case), FS / WR / DR 50-62 % on runs < 6 px (rock tops, slab corners: nothing for MLAA to reconstruct).

## 3. In-shader MLAA on the geometric mask (14:45-14:51), lane files HeroEngine.ts + world/EnvEdge.ts
- EnvEdge MLAA_GLSL injected into a COPY of AA3's TAA_FRAG (taaFragMLAA(): string replace on 3 anchors, throws if one
  misses); `?lkmlaa=0` -> the material uses AA3's TAA_FRAG text unchanged (same program) and no MLAA uniforms.
- Mask: lake fraction from alpha, f = (alpha - dSolid) / (dLake - dSolid), dLake analytic along the ray, dSolid = the alpha
  of the solid-side pixel or the next one (whichever is clearly in front of its own lake point by > gap 2 %); binary mask
  f > 0.5 (mid coverage: MLAA's "pixel centre" model).
- Per band pixel (TAA's band), only where a solid is clearly in front of the lake (no creases): boundary to exactly one of
  up / down (else left / right; 1-px slivers skipped); edge-length search both ways along the boundary pair (12 steps);
  crossing at each end -> h = +-0.5 (MLAA half-pixel steps), Z / U / L shapes, coverage by the other side from 4 sub-
  positions; runs < 4 px skipped (MSAA's 1/4 is as good). Colour: c + s (aT - qc) (C_other - C_own), qc = the pixel's own
  4-sample coverage from its alpha, C_own / C_other = pure pixels on both sides (compressed space), clamped to their range.
- The TAA then blends this frame with its history as before. Strength s ramps in over 6 moving frames and out over 12
  still ones (the pass hands over to the plain resolve after 24 still frames: no step at rest).
- Product default on; lab only with ?debug: lkmlaarun, lkmlaasteps, lkmlaagap, lkmlaas. tsc (hero + project) clean.
- Bug fixed before the first capture: a pair with no solid on the solid side returned "neither" instead of "lake took it".

## 4. First in-shader results (batch1 14:51-14:55: smoke 0 errors; medium M1 / M0 / MX, slow M1; 121 frames each)
- G8: medium ?lkmlaa=0 (M0) == AA3 (my lane's pre-change capture == AA3's medium_F): 0 differing bytes, 121 frames.
- MLAA acts on ~5.0 k px / frame (0.9 % of the 1440 x 386 crop), 606 > 4 lv, 52 > 16 lv, max 78 (medium, vs AA3).
- towardgt.mjs (pixels MLAA changes by > 2 lv, |X - GT| before / after): medium FF 3.03 -> 5.86, FR 3.89 -> 7.17, RS 3.77
  -> 6.73, WR 5.48 -> 7.96, FS 6.07 -> 9.20, DR 6.01 -> 9.91; only 21-31 % of the changes move toward the GT. Slow: same
  (21-33 % toward, error x1.5-2). Example (medium k60, x653 y484-485, a floe outline turning a corner): AA3 128 / 127, GT
  133 / 133, MLAA 146 / 149: the L-shape's half-pixel step at the corner end rounds the corner (MLAA's corner artefact).
- Edge-only error vs GT (k1-120): medium E1 base 4.82 / AA3 4.78 (-1 %) / M1 5.33 (+11 %); E2 6.83 / 6.11 (-11 %) / 6.34
  (-7 %). Slow E1 4.29 / 4.35 / 4.95 (+16 %); E2 6.72 / 6.18 (-8 %) / 6.42 (-5 %).
- crawl medium (k1-120, ref base): MC32 base 3.63, AA3 1.43 (-61 %), M1 1.45 (-60 %), GT 1.45 (-60 %); MCE 2.408 / 2.114 /
  2.122 / 1.894; eg 3.147 / 2.995 / 3.034; texture lake 0.9989 / solid 1.002 (same as AA3). MX (MLAA without the TAA
  history): MC32 2.94 (-19 %), MCE 2.413 (0 %).
- Slices (slices/med_M1_*.png, BASE | AA3 | M1 | GT, k0-120): FF, RS, FS: M1 indistinguishable from AA3 (FS's slab side has
  runs < 4: MLAA idle there), still stepping where the GT glides.
=> MLAA (all shapes, alpha coverage) moves the edge AWAY from the GT and adds nothing to the temporal smoothness.

## 5. Iteration: conservative variants (batch2 15:01-15:04, medium 121 frames; lab params lkmlaaz / lkmlaaq added)
- Isolation: MX0 = A + B + the pass with history weight 1e-4 and no MLAA; MX / MXQ / MXZQ = same + MLAA (default / colour
  coverage / Z shapes only + colour coverage + runs >= 6). MZQ = AA3 + MLAA (Z only, colour coverage, runs >= 6).
- towardgt (changed px > 2 lv): every variant moves only 15-31 % of its changed pixels toward the GT; error on them x1.7-3:
  MX FF 2.96 -> 6.27, RS 3.33 -> 6.97; MXQ FF 3.17 -> 7.99; MXZQ RS 2.99 -> 8.82, WR 3.66 -> 10.96; MZQ (with TAA) FF 3.80 ->
  6.97, RS 3.42 -> 7.55. Split by local contrast (MX): <40 lv 2.62 -> 4.73, 40-100 4.48 -> 8.34, >100 7.99 -> 13.81 (30 %
  toward): no contrast gate rescues it.
- Why (x356 y700 k61, rock top vs lake, MXZQ): AA3 row 84 87 88 88 89 87 102 120 140 150 143 141 138 125 123, GT 82 82 83
  83 85 86 85 102 134 148 134 132 126 118 109, MLAA 84 87 88 88 89 87 98 97 98 100 105 108 113 121 128. The silhouette has a
  real bump inside the run; 4x MSAA already resolved it (AA3 ~ GT), MLAA's straight line between the steps erased it. With
  MSAA input the mask's steps are not aliasing of a straight line but real shape or 1/4-sample quantization of curved
  contours; replacing the measured coverage by a line hypothesis (and the pure-colour model, which carries the texture of
  pixels 1-2 px away) is less accurate than the measured coverage it replaces.
- crawl medium (k1-120): MZQ MC32 -60 % / MCE -12 % / eg -4 % (AA3 -61 / -12 / -5 %); halo vs AA3's 3x3 range: M1 0.54,
  MZQ 0.91 px per Mpx-frame (isolated); texture lake / solid identical to AA3.
- Side lever (not my angle, measured only): EnvEdge sigma 0.3 (= the GT's effective blur): 56-72 % of its changed pixels move
  toward the GT (FS 5.70 -> 4.06, WR 6.65 -> 4.57, DR 6.70 -> 3.66, FR 4.80 -> 3.13), E1 -12 % vs base (AA3 -1 %), but the
  crawl gets slightly worse (MC32 -59 vs -61 %, MCE -11 vs -12 %, J48 -13 vs -16 %) and solid texture 1.038: sharper
  silhouettes show the 4-sample steps more. A GT-like edge needs the narrower blur AND more temporal samples (a C-side
  question).
=> X2 rejected: MLAA on the geometric mask, in every form tried, makes the waterline less like the GT and adds no glide.

## 6. Slow path, perf, floor check (15:00-15:06)
- crawl slow (k1-120, ref base): MC32 base 3.05 / AA3 1.21 (-60 %) / M1 1.21 (-60 %) / GT 1.31 (-57 %); MCE 2.635 / 2.302 /
  2.313 / 2.067; J48 -50 / -50 / -58 %; eg 3.251 / 3.130 / 3.177; texture lake 0.999 / solid 1.0023 (= AA3).
- Slices slow_M1_* (BASE | AA3 | M1 | GT), six boxes: M1 indistinguishable from AA3; the GT's smoother edges and lake are
  not approached.
- Floor check (edgesplit.mjs, E2 edge px by own class, medium): lake-side px (>= 7 lake px in the 3x3) base 8.41 / AA3 7.66
  / M1 7.69; boundary lake px 9.19 / 7.90 / 7.96; solid-side px 3.20 / 3.30 / 3.71 (M1 worse). Floors (3-5 px away): lake 6.8,
  solid 1.0-1.3. Even a perfect edge AA (lake-side px down to the floor, solid px to 1.3) gives E2 ~4.2 = -39 % vs base:
  G1b's -40 % is at the theoretical limit of this GT, not a reachable target for any edge method.
- Crease idea (sub-pixel waterline from the zero crossing of lake distance - alpha) checked on paper and DROPPED: camera
  at y 2.6 m, 0.58 mrad per px: at 8 m the lake distance changes 1.4 cm per row while the half-float alpha's step is 0.8 cm
  (and AA3's lake tolerance 6.2 cm = 4.6 rows); at 35 m 27 cm per row vs 3.1 cm (0.11 px): no better than MSAA's 1/8.
- Perf, separate interleaved sessions (perf.mjs, 4 pairs, medium, 180 frames, 10-frame sync batches; the other slot busy
  with another agent's browser): wall med per pair mlaa / aa3 / base = 24.28 / 24.98 / 20.25, 22.23 / 27.86 / 23.20, 23.08 /
  24.75 / 20.03, 22.50 / 25.68 / 23.96 ms: noise +-20 %, aa3 (always the middle session) slowest in every pair -> unusable
  for a +-5 % gate. Toggle run in one session (perf3.mjs: full / fullM0 = MLAA strength 0 / none) follows.
- Perf, ONE session with runtime toggles (perf3.mjs, medium, 12 cycles x 60-frame blocks, 10-frame sync batches, paired per
  cycle, ratio to "none" = A only): full (B + C + MLAA) 1.053, fullM0 (B + C, MLAA strength 0 = AA3's work) 1.071 (paired
  full / fullM0 ~0.98): the MLAA's cost is below the run's noise (+-2-4 %); the lane total is AA3's (+5..7 % vs A only;
  AA3 measured A = 0.998 of BASE).
- 1/3-cycle (flash) peak, medium k0-120, band ALL / FF: base 2.7x / 5.8x, AA3 0.8x / 1.1x, M1 0.8x / 1.1x, GT 0.8x / 1.0x
  (unchanged from AA3: MLAA is per frame).
- G10 so far: tsc (hero + project) clean; 0 console errors / warnings in all 10 capture sessions and both perf runs.

## 7. VERDICT (15:13): X2 REJECTED. Do not adopt aa4y.patch. AA3 stays as it is.
- MLAA on the geometric mask cannot add information to a 4x MSAA resolve: the resolve already measures each edge pixel's
  coverage (incl. real sub-pixel shape, as the GT confirms); MLAA replaces that measurement with a straight-line hypothesis
  between mask steps plus a colour model from pixels 1-2 px away, which on these natural contours (rock bumps, floe corners,
  curved slab feet) is wrong more often than right (15-31 % of its changes toward the GT, error on changed px x1.7-3, every
  variant, both paths). Temporal crawl (MC32 / MCE / J48) and the slices are unchanged vs AA3: no glide gained.
- What the GT gap is made of (for the lead): (1) the GT's lake texture (2x render, 0.68 energy): lake-side edge px error
  7.7 vs floor 6.8 lv; (2) EnvEdge's silhouette blur is 2x wider at 1x than in the GT (sigma 0.6 vs 0.3 effective): sigma 0.3
  alone gives E1 -12 % but a little more crawl; (3) the remaining 4-sample quantization, which only more samples in time
  (C) or space can reduce; (4) a 1x-vs-2x reflection difference under the near far floe (pale block, FF). G1b's -40 % on
  edge px is at the theoretical limit of this GT (perfect edge AA: ~-39 % on E2).
- Lane left with MLAA default on (the judged method), `?lkmlaa=0` == AA3 bit-exactly (121 frames, 0 bytes). Lab :5192 stopped.
- 15:09 applytest: aa4y.patch (2 files) applies with `patch -p1` (dry run + real) on a fresh `cp -c` of aa3_judged and
  reproduces my lane's app sources exactly. Lab :5192 stopped; no capture / browser of mine left running.
- 15:11 MLAA as a replacement for C (no TAA history): crawl medium k1-120, MX0 (A + B, pass as a near-copy) MC32 2.79
  (-23 % vs base), MX (+ MLAA) 2.94 (-19 %), MXZQ 2.92 (-20 %); MCE 2.386 / 2.413 / 2.412: MLAA alone adds crawl (+5 %
  MC32), so it cannot replace C (AA3 with C: -61 %).
