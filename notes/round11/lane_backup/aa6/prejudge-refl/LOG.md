# AA6 pre-judge, lens v3 REFLECTION RISKS + A-3 (prejudge-refl), 20 Nov 2026 (Asia/Jakarta)
Read-only on the AA6 lane (:5196) and BASE (:5182). WORK = $SP/work6/refl (tools/, caps/, ana/, img/, logs/).
Backup = MAIN/notes/round11/lane_backup/aa6/prejudge-refl/. Variants: A6 = AA6 default, A6f0 = ?ffblock=0 (fixed1 + F1, isolates
v3), FIX1 = ?lkglide=0&ffblock=0 (= fixed AA3, proven identical by the integrator). GT = BASE 2880x1532 ?lkmeach=1, 2x2 averaged.
Tools: aa5b's cap / popscan / popnew / strip / cslice / down2 (copies), aa5a's crawl, the judge's jgt; new: mstrip.mjs (many
cluster strips in one PNG), v3err.mjs (px where X moves AWAY from the GT vs REF by > thr, clustered), boxpop.mjs.

## 0. Start 17:40
- :5196 and :5182 up (HTTP 200). Medium caps reused from the integrator (caps/medium_A6, medium_A6f0, medium_A6g0f0).

## 1. Captures (slot batches A, B1, B2, C, D1, D2; tools/batch*.sh; all 0 console errors / warnings so far)
- A (17:43-17:52): slow, reverse x {A6, A6f0, FIX1}, rows 380-766, 240 frames. B1 (17:52-17:57): fast, diag x 3 (120 frames,
  aa5a's clean masks are 120 frames), leave clean mask on BASE (240). B2: leave x 3, rest x 3 + rest clean mask + rest at knee
  0.75 / 1.0, medium at knee 0.75 / 1.0 (knee set before the settle: --eval "__hero.pipeline.aa.read.uAAKnee.value = K"; the
  knee object is shared by the writers and readers). C: GTs for fast / diag / leave. D1/D2: hold mask + hold x 3 (full frame).

## 2. Pop scan, slow / medium / reverse (GT paths; aa5b's popscan / popnew, clean masks, thr 40, band +-3)
  flagged px / px in events >= 6     AA6             A6f0 (no v3)     FIX1             AA6 vs FIX1
    slow                             1645 / 326      2530 / 1095      3725 / 1795      -56 % / -82 %
    medium                           3281 / 1529     7306 / 5226      10483 / 7866     -69 % / -81 %   (= integrator)
    reverse                          4761 / 2159     9890 / 7179      14566 / 11274    -67 % / -81 %
  new pops AA6 vs FIX1 (popnew): slow 250 px (6 clusters >= 6 px), medium 486 (12), reverse 919 (35); AA6 vs A6f0 (v3 alone):
  slow 225 (5), medium 476 (14), reverse 913 (40) -> nearly all new pops are v3's. Removed (FIX1 vs AA6): slow 2349 (69),
  medium 7336 (164), reverse 10342 (335).
- Two families among the new / remaining clusters (strips: img/medium_newpops_top8_*, medium_darkblock_bottom_*,
  reverse_bottomblock_*, medium_dash_x150_*, slow_FFleftdash_*):
  (a) BOTTOM LAKE GAP (x 915-1000, y 740-766, the small bright lake triangle between the snow bank and the dark rock at the
      bottom edge): AA6 (and aa5b's own v3) paint a dark band / block into it; A6f0, FIX1, BASE and the GT keep it bright.
  (b) FAR-LEFT TINY OBJECTS (x 70-190, y 530-580): v3 splits their thin dark dashes (1-2 px bright gap, a detached dark dot);
      present in aa5b's v3 too; BASE / FIX1 / A6f0 / GT show continuous dashes. The box's pop count is not higher than FIX1's.
- v3err (new tool): px where AA6 moves AWAY from the GT vs A6f0 by > 20 lv, clustered. Medium: toward 173.6 k px-frames, away
  34.7 k (5:1). Box sums (away, v3 alone):  bottom gap dark: slow 873 px-frames (dmax 90), medium 1588 (110), reverse 2471 (98);
  far-left bright: slow 1903 (139), medium 2144 (140), reverse 1505 (153). No-GT paths (A6 vs A6f0 > 30 lv): bottom gap dark
  fast 1056 (dmax 114), diag 1324 (106), leave 3459 (120; k116-239 = the whole settled end pose after the pointer left).

## 3. ENV ISSUE (18:00-18:04): iCloud had evicted playwright-core
- leave_FIX1's cap.mjs sat 5 min at 0.2 s CPU: node blocked reading hero-pipeline/tools/node_modules/playwright-core/lib/server/
  helper.js, flagged "compressed,dataless" (iCloud Optimize Storage). 247 files of playwright-core were dataless. I read them
  once in parallel (xargs cat > /dev/null, read-only) -> 0 dataless after 36 s; the capture resumed. Every agent's browser
  goes through that package: if a capture hangs at start, check `find .../playwright-core -flags +dataless`.

## 4. Rest (L3): AA6 vs FIX1 vs GT (rest 40 frames; GT = aa5b rest_gt; rest_A6f0 == rest_FIX1 numerically at rest)
- v3err rest, thr 16: toward GT 38.7 k px-frames, away 8.7 k (4.4 : 1). Away clusters (img/rest_k20_awayspots_FIX1_A6_GT_z8.png,
  rest_k20_spots2_*, rest_k20_bottomgap_*, rest_k20_farleft_*):
  * far-left tiny object x114-119 y535-538: BRIGHT +51 lv mean (max +103), 40/40 frames: the dark dash loses its left half
    (FIX1 and GT: full dash). 8x obvious, 2x barely, 1x not noticeable (4 px of a 1-2 px dash).
  * faint bright column x317-324 y493-504: +17 lv (max 20), 40/40 frames; GT and FIX1 uniform. 8x visible, 1x not.
  * bottom lake gap x961-982 y746-755: -38 lv mean (max -69), 40/40 frames: the dark band at the top of the bright triangle is
    ~2 px thicker than the GT's. 8x visible, 1x not (img/rest_k20_bottomgap_FIX1_A6_GT_1x.png: the three look the same).
  * small dark dashes on the far-left floe line (x198-201 y495-497 -53 lv, x212-224, x251-268 y538-540 -33 lv) and the centre
    far floe x566-580 y483-487 (-32, the pale block removed; the GT has a different shape there): look right at 1x.
- At 1x the rest frame looks right (img/rest_k20_A6f0_A6_GT_diff.png, rest_k20_farleft_FIX1_A6_GT_z2.png); the changes are the
  intended under-floe corrections (thin red lines in the diff panel), mostly toward the GT.

## 5. A-3 / L6: the compressed resolve's knee (uAAKnee), medium 240 frames + rest 40 frames; GT = 2x
- Set live before the settle (cap.mjs --eval "window.__hero.pipeline.aa.read.uAAKnee.value = K"; shared by writers / readers).
- Thin dark features, band EXCLUDED (tools/jgt2.mjs = the judge's jgt + no +-3 px waterline band; solid interior px > 4 lv
  outside BASE's 3x3 range):
                       medium px (all darker)   err lane / BASE vs GT     rest px (all darker)   err lane / BASE
    K 0.5 (AA6)        8238                     12.72 / 8.44 (+4.28)      1539                   12.68 / 9.87 (+2.81)
    K 0.75             5220 (-37 %)             11.72 / 9.11 (+2.61)      992 (-36 %)            12.95 / 11.56 (+1.39)
    K 1.0              3940 (-52 %)             10.87 / 9.47 (+1.40)      780 (-49 %)            12.63 / 11.41 (+1.22)
    (FIX1 8217, A6f0 8225: F1 and v3 do not touch this; it is the knee alone.)
  The judge's jgt (band included; F1's band sharpening dominates it in AA6): K0.5 24719 px, 81 % darker, err 7.71 / 8.48;
  K0.75 20113, 74 %, 6.45 / 8.62; K1.0 18037, 69 %, 5.71 / 8.58 (FIX1 12215, 99.7 % darker, 11.95 / 8.59 = the judge's A-3).
- G1 (aa5a crawl, medium, ref BASE): MC32 total K0.5 -82 %, K0.75 -81 %, K1.0 -81 %; per box K1.0 FS -81 WR -69 DR -86 FF -83
  FR -70 RS -88 (K0.5: -83 -70 -88 -83 -71 -88); J32 / J48 -33 / -48 (0.5) vs -32 / -47 (1.0); texture lake 1.0118 / solid 0.9998.
  With the TAA and F1 in place the knee's G1 share is ~1 point.
- Image: img/A3_rest_k20_knee_BASE_K050_K075_K100_GT_z8.png (FR posts x1256-1312 y469-487: K0.5 posts darker than BASE and GT,
  K1.0 closest to both).

## 6. Pop scan, fast / diag (120 frames, aa5a masks) / leave (240, my clean mask); GTs rendered here (batch C, BASE 2x lkmeach=1)
  flagged / in events >= 6     AA6            A6f0           FIX1           AA6 vs FIX1    new AA6 vs FIX1 (v3 alone)   removed
    fast                       2571 / 1074    5950 / 4243    8325 / 6420    -69 / -83 %    423 px, 18 cl (402, 18)      5959 (166)
    diag                       1816 / 698     3886 / 2613    5441 / 3913    -67 / -82 %    289 px, 10 cl (303, 10)      3819 (108)
    leave                      2458 / 1009    5786 / 4108    8072 / 6104    -70 / -83 %    325 px, 7 cl (312, 6)        5627 (121)
  Largest new clusters: fast k45-51 x569-589 y495-498 n28 (centre far floe: the pale block is gone, AA6's dark reflection edge
  moves; GT-like, img/fast_centreFF_k44_52_*), k65-75 x912-944 y488-492 n19, k75-80 x1023-1039 y754-756 n17 (bottom gap);
  diag k9 x349-363 y520-522 n21, k76-83 x151-161 n15 (far-left); leave k44-45 x366-375 y505-507 n14. Everything else <= 13 px.
  Remaining AA6 events on every path: mostly the far-left tiny objects (x 70-190, y 530-575, 2-8 px, emax 113-159; also in FIX1),
  the right slab's ripple sparkle x1098-1145 y683-711 (FIX1 the same), and on reverse the bottom gap (k58-81 n86, k177-201 n81).
  Bottom-gap / far-left box sums (v3err away from GT, A6 vs A6f0): fast 549 / 555, diag 752 / 705, leave 2723 (k116-239) / 1679.
- G1 cross-check (aa5a crawl, ref BASE): slow MC32 tot -82 %, per box -77..-91; reverse (120 fr) tot -74 %, FS only -22 % (A6f0
  also -22 %, FIX1 -36 %, GT -20 %: F1's FS on the reversal, not v3; the GT itself cannot pass a 40 % per-box bar there).
  G3 texture: lake 1.0099 (slow), 1.0077 (reverse), 1.0114-1.0118 (medium); solid 0.9998-1.0004.
- G5 (v3 alone, A6 vs A6f0, mask split): solid / sky px medium 7 px-frames > 4 lv (max 16), rest 0 (max 1); hero px over
  non-lake medium 1141 px-frames > 4 lv (max 33, rows 460-560 where the glass rings show the changed far-floe reflections
  behind them), rest 13 (max 13). The hero's own rendering does not change; the lake behind the glass does.
- Hold, proxy first (aa5b's hold_v3 vs hold_F0 = v3 on AA3, rows 380-766): v3's changes are dark under-floe reflections during
  the dolly (k66-308, dmean -40..-52), no bright columns; bright changes only at the far-left tiny objects again (k318-419,
  x85-124, up to +143 lv). img/hold_aa5b_k200_F0_v3_diff.png, hold_aa5b_leftfloes_k100_200_F0_v3_z3.png.

## 7. Hold on AA6 itself (18:25-18:31) and the second iCloud stall
- hold_A6 (full frame, 420 frames, 0 console errors) captured. hold ?ffblock=0 could NOT be captured: at 18:29 iCloud had evicted
  playwright-core again (282 dataless files; the data volume is 98 % full, 12 GiB free; one file took 51 s to read back), so
  the capture sat at 0.2 s CPU; I stopped my own process at 18:30 (slot freed). The scratchpad holds 60 GB in total (mine 5.4).
- Visual hold check, AA3 | AA3+v3 (aa5b) | AA6 at k60 (crest train), k190 (hold, ring in front of the far floes), k320 (release):
  img/hold_centre_rings_k60_190_320_AA3_V3_AA6_z2.png, hold_leftfloes_k60_190_320_AA3_V3_AA6_z2.png: the crest train, the
  rings' reflection and the floes behind / beside the rings look the same in all three; v3 / AA6 only darken the under-floe
  reflections slightly; no hole, column or block. (v3 alone during the hold = the proxy numbers in section 6.)

## 8. FINDINGS (lens initial R)
- R-1 minor: bottom lake gap (x 915-1040, y 740-766) darkened by v3; pops in motion, ~2 px heavier band at rest (sections 2, 4, 6).
- R-2 minor: far-left tiny objects' thin dark dashes split by v3 (bright 1-4 px gaps), persistent incl. rest (sections 2, 4, 6).
- R-3 minor (A-3 / L6 measurement): uAAKnee 1.0 halves the thin-dark over-darkening with no G1 / L4 loss (section 5).
- R-4 nit: faint bright column at rest x317-324 y493-504 (+17 lv), invisible at 1x (section 4).
- Not findings: reverse FS MC32 -22 % (F1 = A6f0, GT -20 %; the glide lens); hero-over-lake px change only through the glass.
- Honesty note on R-1 / R-2: in the +-3 px band metric (popscan) neither box has MORE pop px than FIX1: bottom gap AA6 / A6f0 /
  FIX1 = slow 18 / 8 / 8, medium 64 / 45 / 61, reverse 311 / 502 / 638, fast 71 / 247 / 304, diag 29 / 97 / 124, leave 28 / 75 /
  77; far-left slow 114 / 171 / 138, medium 340 / 275 / 426. Both are COLOUR errors (away from the GT) mostly inside the gap /
  on the dashes, caught by v3err, which come and go with the motion (the strips), not extra waterline crawl.
- Disk: I deleted my hold_A6 and medium_K075 / K100 caps (1.2 GB; numbers and images kept); caps/ now 4.2 GB (GTs and masks for
  fast / diag / leave / rest are reusable: caps/{fast,diag,leave}_gt, leave_bmask, rest_bmask).
## STATE 18:38: DONE (75-min box). No lane edited, :5196 / :5182 untouched, no browser of mine left.
