# AA4X lane log (angle X1: geometry-buffer AA of the waterline, 20 Nov)
LANE = ~/Library/Caches/retrux-lanes/aa4x (edit; APFS clone of AA3), AA3 frozen = aa3_judged (diff base for my patch),
BASE = aa3_base (lab :5182, read-only). My lab :5191. WORK = $SP/work4/aa4x (media; wiped by reboots).
Backup (patch + LOG) = MAIN/notes/round11/lane_backup/aa4x/. Switch: ?gbaa=0 (= AA3 exactly).

## 0. Start (14:08)
- Lane == aa3_judged (diff -rq app, hero-lab: identical). Read AA3 LOG, EnvEdge (EDGE_FRAG, TAA_FRAG), chunks AA_RESOLVE,
  HeroEngine wiring, RenderPipeline (env pass -> afterEnv -> EnvEdge.arm), Water / baked alpha (BAKED_EDGE: alpha = view
  distance, water planes y = 0 (near, |z| < 14.87) and y = 0.0017 (far, z < -14.87)).
- Tools copied from work3/aa3/tools (port 5191, own folder). New: tools/edgeerr.mjs (error vs GT on EDGE px only: the
  mask's 3x3 holds lake AND solid, hero dilated 6 px excluded; plus the non-edge band floor eN), tools/hdrcap.mjs (float
  readback of the env pass resolve: rgb + alpha distance, for offline analysis).

## 1. Edge-only error vs GT, existing caps (medium, stride 4) - the reachable target
  box  n(px)  BASE eE  AA3 eE   floor eN (BASE)   BASE eR(luma RMS)  AA3 eR
  FS    4507   12.07   10.88     1.81              13.67              10.83
  WR   12835    3.71    3.88     2.72               4.71               4.59
  DR     722    7.60    7.41     2.39               9.87               8.04
  FF   14406    4.44    4.33     4.69               8.22               7.54
  FR   15046    3.87    3.94     3.06               5.49               4.98
  RS    9922    4.09    4.23     2.21               5.38               5.14
  tot  57438    4.70    4.66     3.14               7.12               6.33
- The non-edge band floor (GT's lake is smoother: texLake 0.68 of BASE; shading / mirror resolution at 2x) is ~3.1 levels:
  a 40 % cut of the TOTAL edge error (4.70 -> 2.82) is below that floor, i.e. not reachable by any edge AA that keeps the
  lake texture (G3). Where the edge itself dominates (FS 12.1 vs floor 1.8, DR 7.6 vs 2.4) it is reachable in principle.
- FS's edge is mostly the slab's rounded end seen against the lake BEHIND it (a silhouette: depth jump ~15.5 -> 17.3 m), not
  the contact line where the slab enters the water (look/fs_crop_k100_base_F_gt.png).

## 2. X1 v1 implemented (14:20-14:30): contact-waterline GBAA in EnvEdge's triangle (GBAA_GLSL), every frame
- A contact waterline is the contour h = 0 of the solid's height above the lake plane. Fully-solid pixels' h is exact from the
  alpha distance (h = cam.y + ray.y x a - level; half-float noise ~3e-4 relative). Per candidate pixel (3x3 holds a lake tap
  |h| <= 3 sigma and a solid tap h > 3 sigma): LSQ plane of h over the 5x5 solid taps near the lake point's depth, refit on
  the taps the first fit puts wholly above the contour; centre's signed distance h0/|g| px, normal g/|g|, exact area
  coverage (unit pixel cut by a line); pure solid / lake colours from the 5x5 taps wholly on either side; the pixel's colour
  moves along (S - L) from its resolved coverage (projection) to the exact one (compressed space), clamped to the 3x3 range.
- Runs in EDGE_FRAG's non-silhouette branch (so also at rest: no pop when AA3's TAA hands over), after AA3's TAA (its output
  is EnvEdge's source). Silhouettes (depth jumps) keep AA3's path. Lab: ?debug&gbaadbg=1 tints the changed pixels.
- tsc hero + project clean.

## 3. First results and fixes (14:30-14:45)
- batch1 (v1 = contact GBAA only): ?gbaa=0 vs AA3 final caps (medium_F, 121 frames): 0 px differ (identity at image level).
  v1 medium edge error vs GT (k 1-120, stride 2): tot eE 4.82 BASE / 4.78 AA3 / 4.89 v1 (worse: WR +10 %, FF +2 %).
  Debug tint (?gbaadbg=1): applied along the FS slab's foot (right place) plus scattered pixels.
- hdrcap float readback, open lake: h / noise is a 0..1 sawtooth, always >= 0: the GPU TRUNCATES the distance when it
  writes the RGBA16F target (stored a up to 1 ulp below the true one; e.g. a 18.703125 vs t 18.71777, ulp 0.015625). v1's
  3-sigma model put lake pixels near the bottom of a binade on the "solid" side -> spurious fits. Fixed: h from a + 0.5 ulp,
  lake if |h| <= 1 ulp x |ray.y|, solid above that; fit guard |g| >= 2 ulp x |ray.y| per px.
- Edge types (hdrclass, medium k100, ulp model): contact / silhouette px per box FS 370 / 868, WR 613 / 530, DR 136 / 395,
  FF 3821 / 1248, FR 1386 / 321, RS 204 / 652 -> FS (the largest error), DR, RS are mostly SILHOUETTES (lake behind).
- Offline (tools/linesim*.mjs, synthetic straight edges, 4x RGSS coverage, edge moving 0.02 px / frame): a straight-edge fit
  (Gauss-Newton on angle + offset, exact area model) over a 5x5 of 4x coverages recovers the centre's coverage with mean
  error 0.027-0.030 (16-sample reference 0.027, raw 4x 0.076) and fewer > 0.1 steps than the reference; Gaussian tap weights
  sigma 1.6 keep curved edges (R 20 px) at 0.043; a curvature parameter overfits (0.047 on straight edges) -> not used.
- v2: SILHOUETTE path (gbaaSil) in EDGE_FRAG's depth-jump branch: pure solid / lake colours from the 5x5 (depth classes),
  each tap's lake fraction = its colour projected on (lake - solid), straight-edge fit (6 LM steps, sigma 1.6 weights), RMS
  misfit > 0.1 -> AA3 path (blur); crossed pixel -> colour moved to the fitted coverage (clamped to 3x3 range); pure pixels in
  a fitted window keep their colour without EnvEdge's blur (GT's own blur is sigma 0.6 at 2x = 0.3 px at 1x).

## 4. Iterations X2-X5 (14:40-15:00), medium path, edge px vs GT (eE mean |dF| max ch / eR RMS luma), k 1-120 (X5: 1-239)
  variant                                  FS eE / eR        DR eE / eR       RS eE / eR      tot eE / eR      tot sL
  BASE                                     12.6 / 14.0       5.6 / 7.2        4.3 / 5.5       4.82 / 7.33      +0.9
  AA3 (F)                                  11.4 / 11.3       5.6 / 6.1        4.5 / 5.3       4.78 / 6.54      -0.8
  X2 contact(ulp)+sil (colour f, misfit .1) 10.9 / 12.1      5.2 / 5.8        4.1 / 5.0       4.74 / 6.80      -1.4
  X3 + lake/pure-solid f from depth, .12   10.3 / 12.5       5.1 / 5.9        4.1 / 5.0       4.69 / 6.88      -1.5
  X4 + raw resolve input, f from distance  10.8 / 13.0       5.8 / 7.6        4.1 / 5.1       4.66 / 6.99      -1.4
  X5 + cap |fit - own 4x| .22, sigma 1.25  (240 fr) 10.2 / 12.5 (BASE 12.0 / 13.6, AA3 10.9 / 10.8), tot 4.56 / 6.83
- Edge types: silhouettes (lake BEHIND the solid) carry the visible contrast; at a contact line the solid meets its own
  mirror image (same colour), so the brief's h = 0 GBAA (applied correctly along the slab feet, debug tint) changes little.
- Mean error per edge px drops a little (FS -15 %, RS -7 %) but RMS is worse than AA3 (outliers on curved / cornered
  windows, e.g. (321,711) k100: 4x 157, GT 157, fit 106-111: the straight line misplaces a bend), and the FS time slice at
  row 690 (the lead's) looks like AA3, not like GT (look/fs_r690_lead_X5.png, fs_r690_zoom_X5.png). RS / DR slices show a
  fine stipple in X5: pixels switching between the per-frame fit and AA3's TAA output from one frame to the next.
- X6: soft weights instead of switches (misfit, step size, crossing border), pure pixels back on the AA3 path (TAA + blur).

## 5. X6 / X7 (15:00-15:20) and verdict
- X6 = soft weights (no frame-to-frame switching), pure pixels on the AA3 path. medium 240 fr: tot eE -3 % / eR -8 % (AA3 -1 /
  -11 %); crawl: tot MC32 -47 % (AA3 -63 %, GT -62 %), MCE -7 % (AA3 -12 %), J48 -12 % (AA3 -19 %), FS MC32 -25 % (AA3 -66 %):
  the per-frame fit REPLACES the TAA's temporal smoothing on its pixels and its own frame-to-frame jitter is larger -> worse.
- X7 (current default) = the same GBAA applied INSIDE AA3's TAA pass to the current frame before the history blend (the pass
  then also runs at rest with no history, so the frame never pops at the hand-over; EnvEdge's triangle applies it only when
  no TAA pass ran, e.g. ?lktaa=0). medium: tot eE 4.736 (BASE 4.717, AA3 4.681), eR -10 % (AA3 -11 %); MC32 -64 % (AA3 -63 %,
  GT -62 %), MCE -13 % (AA3 -12 %, GT -21 %), J48 -20 % (AA3 -19 %), halo 1047 vs 1049 /Mpx (vs BASE 3x3), texture lake 1.0001
  / solid 1.0016. slow: eE +1 % (AA3 0 %), eR -9 % (AA3 -9 %), MC32 -69 % (AA3 -68 %, GT -63 %), J48 -58 % (AA3 -57 %, GT -60 %),
  MCE -13 % (AA3 -13 %, GT -23 %). X7 differs from AA3 on ~7.3 k px / frame (max 39 lv) but NOT towards GT: equal to AA3
  within noise everywhere. Slices (look/slices/medium_*_X7_*.png, slow_*_X7_*.png, look/fs_r690_lead_X6_X7.png): AA3 and X7
  look the same; GT still glides where they step.
- Perf (perf.mjs, 3 interleaved pairs, medium 180 fr, machine shared with judges -> noisy): wall med-of-meds X7 25.42 /
  AA3 (?gbaa=0) 24.75 / BASE 22.46 ms; pair ratios vs BASE X7 1.245 1.115 1.112, AA3 1.192 1.151 0.970 -> no usable G7 number
  (AA3 itself measured 1.15 here vs 1.059 in its builder's quiet run); X7 adds ALU on band px + the TAA pass at rest.
- G8 (first run, before the source gating): images and all lake targets identical (gbaa=0 vs AA3 lane final hash, all off vs
  BASE, plate, T0, T2 off) but rx-env-edge / rx-lake-edge-taa SOURCE text differed (#ifdef'd GBAA text). Fixed: the GBAA
  blocks sit between //<gbaa> lines and are removed from the source unless enableGBAA runs (gbSrc); offline check: stripped
  EDGE_FRAG / TAA_FRAG / VERT / COPY_FRAG == aa3_judged's byte for byte. Re-run on the final build: see 6.
- VERDICT: X1 does not reach G1b. Why: (1) the edge-pixel error vs GT has a ~3.1-level floor of non-edge differences (GT's
  2x render: smoother lake texture 0.68, finer mirror), so -40 % of the total edge error is below the floor for any edge AA that
  keeps the texture (G3); (2) the brief's contour (h = 0) is exact here, but a contact line is where a solid meets its own
  reflection: low contrast, little to gain; (3) the visible crawl is on SILHOUETTES (lake behind the solid), whose sub-pixel
  position is not in the G-buffer (alpha = view distance, MSAA-averaged); a line fit to the 4x coverage of a 5x5 is GT-grade
  on straight synthetic edges (0.030 vs 0.027) but on the real curved / cornered / textured outlines it is not more accurate
  than 4x + AA3's TAA. A per-fragment silhouette distance (true GBAA) needs triangle-edge / adjacency data and an extra
  channel (MRT or a second geometry pass of 43 draws / 225 k triangles) - outside this time box and the +5 % budget.

## 6. Final build checks (15:10-15:35) - default = X7, switch ?gbaa=0
- G8 (tools/g8.sh, ident.mjs vs the AA3 builder's ident JSONs, same tool / path / frames): ?gbaa=0 vs AA3 lane: final image,
  mirror / walk / cache / cacheN / reflection targets and all 15 linked program sources IDENTICAL; aaresolve=0&slabflash=0&
  lktaa=0&gbaa=0 vs BASE T1: identical (14 programs); envlake=plate vs BASE plate, T0 (mobile) vs BASE T0, T2 all off vs BASE
  T2: identical. Default vs AA3: final image + rx-env-edge / rx-lake-edge-taa differ only. 0 console errors / warnings.
  Image level: ?gbaa=0 medium 121 frames == AA3 final caps (0 px); default rebuild == X7 caps (0 px, 60 frames).
- G10 (g10.mjs): DPR 1 (1440x766) and DPR 2 (pixel ratio 1.25 -> 1800x957), resize 1100x700 / 1375x875 and back: no dark
  frame, TAA weights 0.5, 0 console errors / warnings; live engine 60 fps, TAA ran 830 frames, 0 logs.
- fast path (180 fr): MC32 base 6.5 / AA3 2.99 (-54 %) / X7 2.93 (-55 %), MCE -13 % / -13 %, J48 -14 % / -14 %, halo 1832 /
  1829 per Mpx (vs BASE 3x3), texture lake 0.9994 / 0.9994, solid 1.0009 / 1.0009. Strip look/strip_fast_FS_base_aa3_X7.png:
  no trail, same as AA3.
- 1/3-cycle (mirror cadence) peak: medium ALL 9.3x BASE -> 0.7x AA3 -> 0.7x X7; slow 17.4x -> 0.7x -> 0.7x (B kept).
  (Observation, AA3's and unchanged by X7: slow ALL shows a 1/2-cycle peak 5.5x (AA3) / 5.4x (X7) vs 3.9x BASE.)
- Lab :5191 stopped; :3000 / :5181 / :5182 untouched.
## STATE: DONE. X1 = no gain over AA3 (well measured). Recommendation: reject (keep AA3); patch kept for the record.
