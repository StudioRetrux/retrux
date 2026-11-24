# AA7 FINAL JUDGE, lens ARTIFACTS / REFLECTION (judge-artrefl), 20 Nov 2026 (Asia/Jakarta), box 20:52-22:02
Read-only. AA7 = :5197 (lead's), AA6 final = :5196 (frozen, knee 0.5), BASE = :5182. All three HTTP 200 at 20:52.
Restart of the earlier (pre-reboot) partial run of this lens: its caps were gone (only ana/ + img/ survived in
$SP/work7_partial_20nov/artrefl); tools copied from there (createRequire -> ~/Library/Caches/retrux-lanes/pw, checked).
WORK = $SP/work7/artrefl (tools/, caps/, ana/, img/, logs/). Backup = MAIN/notes/round11/lane_backup/aa7/judge-artrefl/.
Finding ids AR-n. Variants: A7 = AA7 default (:5197), A6 = AA6 final (:5196), FIX1 = fixed AA3 caps
($SP/work6/refl/caps/*_FIX1, medium = $SP/work6/integ/caps/medium_A6g0f0), BASE = $SP/work3/aa3/caps/*_base, GT = 16-sample.
Knee: HeroEngine.ts:383 `if (glide) aaKnee.value = 1.0` (shared by writers / readers); compress c/(K+luma c), region = below the
horizon line outside the cloud-card box (chunks.ts GLSL_AA_RESOLVE).

## 1. Captures (20:53-), tools/chainX.sh (A7: b1 slow/med/rev, b3 fast/diag 120 + leave + rest 40, b5 hold 420 + jcap gov
##    a7/a6/base:mask + full-frame medium 60 / rest 12) and chainY.sh (A6: b2, b4, b6 = hold + jcap holdre + full frames + BASE mask)
- b1 / b2 (20:53-20:57) slow / medium / reverse, b3 / b4 (-21:05) fast / diag (120) / leave / rest (40): all 0 console errors /
  warnings. Captures are deterministic: my slow / medium / reverse / fast / diag pop numbers equal the pre-reboot partial run's
  to the pixel. b5 / b6 (hold, gov, holdre, full frames) queued behind the gate from 21:05 (load 31-39 > 30, 3 holders).

## 2. Pop scan (popscan / popnew, bloom-free masks slow / medium / reverse = aa5b bmask, leave / rest = refl bmask, fast / diag =
##    aa5a NEW masks; thr 40, band +-3; tools/ana_pop.sh -> ana/pop_<path>.txt)
  flagged px / events >= 6 px / px in them      A7                 A6                 FIX1                A7 vs FIX1      A7 vs A6
    slow                                        1622 / 46 / 348    1490 / 37 / 261    3725 / 99 / 1795    -56 / -81 %     +9 / +33 %
    medium                                      3296 / 102 / 1420  2984 / 98 / 1254   10483 / 237 / 7866  -69 / -82 %     +10 / +13 %
    reverse                                     4503 / 143 / 1955  4065 / 123 / 1699  14566 / 397 / 11274 -69 / -83 %     +11 / +15 %
    fast (120)                                  2577 / 82 / 1001   2351 / 79 / 915    8325 / 215 / 6420   -69 / -84 %     +10 / +9 %
    diag (120)                                  1884 / 56 / 717    1677 / 45 / 587    5441 / 139 / 3913   -65 / -82 %     +12 / +22 %
    leave                                       2653 / 75 / 1153   2287 / 71 / 949    8072 / 187 / 6104   -67 / -81 %     +16 / +21 %
  popnew A7 vs A6 (pops A6 does not have even at thr-10): slow 0 px, medium 2, reverse 4, fast 1, diag 1, leave 1 (all 1-px).
  -> the knee adds NO new pop site; it lifts ~10-16 % of A6's sub-threshold waterline jumps (e 30-40) over 40 (K 1.0 compresses
  the waterline step less than 0.5, as chunks.ts says). popnew A7 vs FIX1: slow 150 px (2 cl >= 6), medium 304 (6), reverse 680
  (22), diag 194 (4), leave 247 (4): the same sites as A6 vs FIX1 (v3's under-floe edges + tiny ripple dashes by the bottom rocks).
- Looked at (1x: img/reverse_k139-143_x840-1120_A7_A6_FIX1_GT_z1.png, the biggest new-vs-FIX1 cluster, four identical to the eye):
  img/medium_top4_A7_A6_FIX1_GT_z4.png (A7's 4 biggest medium clusters: A7 = A6 = FIX1 to the eye; the k14-16 x229
  lighter patch under the line is in FIX1 too), img/reverse_newvsFIX1_top3_A7_A6_FIX1_GT_z4.png (reverse k140-142 x978 far floe
  under-edge, k21-23 / k146-148 ripple dashes right of the bottom rock: A7 = A6 = FIX1, GT similar).
- v3err A7 vs A6 (thr 8, toward / away from the GT), all paths: DARK away 0-6 px-frames; BRIGHT away 6-13 k px-frames, dmean +9,
  dmax 12-15 lv, on the floes' thin dark waterline lines (centre floe x420-670 y530-590 on every path; right slab x1211-1254;
  bottom rocks x290-390 y695-740). img/slow_k90_x430-670_A6_A7_GT_BASE_diff_z4.png, slow_k120_x400-680_..._z3.png: the dark
  lines are +8-9 lv lighter on their edge px; A6 and A7 look the same at 3-4x; no halo, no outline, no rim. Pixel check (dpx k90):
  A7 sits between the GT and BASE (e.g. x594 y551 A7 134 / A6 126 / GT 110 / BASE 147).
- regerr slow (ana/regerr_slow.txt; t 12; BASE row counts are doubled by the tool, means are right): band signed vs GT A7 -0.05,
  A6 -0.30, FIX1 +0.94, BASE +1.35; abs 3.44 / 3.42 / 3.91 / 4.17. Band px brighter than BOTH GT and BASE by > 12: A7 51 k, A6 35 k,
  FIX1 25 k (of 12.2 M px-frames = 0.42 %); darker than both: 108 k / 131 k / 13 k. Solid darker than both: A7 802, A6 4596.
  Heat map of the NEW over-bright px (A7 > max(GT, BASE)+12 and A7-A6 > 4; tools/obmap.mjs; img/slow_overbright_heat_crop.png):
  16.4 k px-frames (68 px / frame), all on the centre floe's dark waterline lines and the bottom rocks' reflection lines.
- G1 / G3 cross-check (aa5a crawl, ref BASE, stride 2; ana/crawl_{slow,medium}.txt): MC32 tot slow A7 -83 % (A6 -83), medium
  -82 % (A6 -83); per box medium A7 FS -82 WR -68 DR -86 FF -84 FR -73 RS -91; J32 / J48 medium -33 / -47 (A6 -33 / -48), slow
  -65 / -83 (A6 -67 / -84); slow FS J48 -46 % (A6 -58, GT -16), WR J48 -41 % (A6 -45, GT -44: L4 floor -39 -> passes by 2 points).
  Texture (G3) lake / solid: slow 1.0081 / 1.0000, medium 1.0106 / 0.9999 (A6 1.0077 / 1.0005, 1.0102 / 1.0004).

## 3. Rest (L3), rest 40 frames, A7 vs A6 vs FIX1 vs GT (1x and 2x GT)
- v3err A7 vs FIX1 thr 16 (ana/rest_v3err_A7vsFIX1_t16.txt): toward GT 37.4 k px-frames, away 5.5 k (6.7 : 1); bright-away 10 px
  (R-2's bright dash gaps gone, as in the AA6 fixer's build); dark-away = the known under-floe corrections (centre far floe
  x566-580 y483-487 -32 lv, far-left dashes x198-201 -53, x212-224 / x251-268 -29..-33).
- v3err A7 vs A6 thr 8 at rest: only BRIGHT, dmean +9, dmax 14 (the knee on the thin waterline lines), 0 dark.
- Looked at: img/rest_k20_left_FIX1_A7_A6_GT_diffA7-FIX1_z1.png and rest_k20_right_..._z1.png (1x, whole lake: FIX1 / A7 / A6 /
  GT look the same; diff = thin red under-floe lines, v3's intended corrections), rest_k20_R1_R2_R4_FF_A7_A6_FIX1_GT2x_z4.png
  (R-1 gap, R-2 far-left dashes, R-4 column, centre far floe), rest_k20_R4_R1_A7_A6_FIX1_GT2x_z8.png:
  * R-1 bottom gap x940-1010 y738-766: A7 = A6 = FIX1 (bright triangle, dark band above it); GT's band a bit thinner. Fixed.
  * R-2 far-left dashes x50-190 y520-592: continuous dashes like FIX1 / GT. Fixed.
  * R-4 column x315-327 y490-506: still there in A7 exactly as A6 (A7 143-178, A6 142-178, FIX1 175-186, GT 114-150 lv): a faint
    lighter column at 8x, invisible at 1x. nit, unchanged by the knee.
  * x1076-1078 y483-494 (green line in the A7-FIX1 diff): A7 = A6, +10 lv over FIX1, within 0-18 lv of the GT: v3, toward GT.
  * Far-floe pale block, medium k48-64 (img/medium_FF_paleblock_k48-64_BASE_FIX1_A6_A7_GT_z3.png): in BASE and FIX1 (k52-60),
    gone in A6 and A7 (A7 = A6), GT has none. OK.
- A-3 / L10 thin dark (jgt2, band excluded; ana/A3_jgt2_{medium,rest}.txt): px > 4 lv outside BASE's 3x3 (all darker):
    medium A7 3943 (A6 8240, FIX1 8217: -52 %), err vs GT A7 10.87 / BASE 9.46 (A6 12.72 / 8.44); thin-dark subset outside 3100
    (A6 6212); thin-dark mean signed vs GT A7 -0.01 (A6 -0.09, BASE +0.12).
    rest A7 780 (A6 1540: -49 %), err 12.63 / 11.41 (A6 12.68 / 9.87); thin-dark outside 532 (A6 1067).
  = the AA6 pre-judge's K1.0 numbers (3940 / 780). Residual: half of AA6's over-darkening stays (A7 still ~1.4 lv worse than BASE
  on those px); not visible (see 2.).

## 4. Hold: jcap holdre (press 10, release 110, re-press 135, release 215; a7 / a6 / base:mask in one browser, rows 380-766)
- A7 vs A6 (v3err --gt none): > 8 lv 11.2 k px-frames, ALL brighter, dmean +9 dmax 15 (floes' waterline lines); > 20 lv: 0 px.
- Pops vs BASE (popscan, BASE as reference): A7 14905 px / 412 events, A6 15650 / 441: the knee does not add hold pops. The top
  events (k202-213 x18-81 y639-665, k186-201 x104-192, k77-83 x8-64) are the same in A7 and A6 and are the fast dolly moving the
  left floes (img/holdre_k199-207_leftfloes_A7_A6_BASE_z2.png: A7 = A6 ~ BASE minus BASE's stair steps).
- Looked at: img/holdre_k60_centre_A6_A7_BASE_diffA7-A6_z1.png (crest train + the ring's reflection + floes during the hold: the
  three are the same; diff = faint green waterline lines only), holdre_release_repress_k109-141_leftfloes_A7_A6_BASE_z2.png
  (release and re-press: A7 = A6 ~ BASE, no ghost / hole / block).
- Seen (pre-existing, = A6, the pale-block family / G-3): after the re-press, k203-211, a smaller pale block under the near far
  floe (x ~137-158 y 600-612) remains in A7 and A6 where BASE has the full block (x137-200):
  img/holdre_k201-211_x100-200_paleblock_A7_A6_BASE_z5.png (5x: lighter rectangle with a hard vertical edge, ~1/3-1/2 of BASE's
  width), img/holdre_k205_left_A7_BASE_diff_z1.png (1x: subtle; BASE's bigger block is equally subtle in a still).

## 5. Knee halos at bright / dark edges (L10, A-3 side effects)
- img/rest_k20_knee_edges_posts_rock_slab_A7_A6_BASE_GT2x_z4.png (FR posts x1250-1320 y466-490, left rock x150-250 y560-600,
  right slab x1000-1090 y640-680; A7 | A6 | BASE | 2x GT at 4x): no halo, no bright rim, no outline in A7; the posts are thin
  dark lines like BASE's (A6's a touch darker). regerr solid px brighter than BOTH GT and BASE by > 12: A7 80 px-frames / 55.5 M
  (A6 60) -> the knee adds no solid-edge over-brightening. On the waterline band it adds +9 lv on the dark lines (section 2).

## 6. G-3 (render scale 0.7), gov case k87-95 - from the G-3 investigator's own AA7 capture (read-only:
##    $SP/work7/g3/caps/gov/{a7 = :5197 default, f0 = ?ffblock=0, base = :5182}, rows 440-620), my own gov capture queued
- img/gov_s07_G3_k87-95_x80-200_A7_F0_BASE_z4_g3caps.png (4x): BASE and F0 show the full pale block k90-93 (x ~137-185);
  A7 shows a smaller lighter rectangle at the floe's thin left end (k90-92, x ~105-140, ~8 px tall; moves left with the camera).
  dpx k91: x113-129 y503 A7 113-129 = F0, BASE 92-103 (+26 lv); x132-148 y502 A7 84-90, BASE 99-110 (BASE's block, removed).
- img/gov_s07_G3_k89-93_x0-420_A7_BASE_z1.png (1x, k89-93): BASE's block is plainly visible; A7's remnant is a faint lighter
  patch, readable only if you look for it, for 3-4 frames (~60 ms) and only while the governor holds 0.7. -> minor (pre-existing
  = AA6's G-3), reduced vs BASE.
- Same family at render scale 1 (NOT covered by a scale-gated fix): jcap holdre k203-211 (section 4): A7 = A6 keep a smaller
  pale block under the near far floe (x ~137-158 y 600-612) where BASE has the full one. Capture with ?ffblock=0 queued (b5b) to
  confirm it is the guard's residual.

## 7. A-2 at the governor's scales with the knee (my gov capture, jcap gov a7 :5197 / a6 :5196 / base :5182 mask, rows 380-766,
##    b5a 21:39-21:42; a7 0 console lines, base 0, a6 1 = "Failed to load resource: net::ERR_INTERNET_DISCONNECTED" on the AA6 lab)
- jg4s (px > 4 lv outside the reference's 3x3 / 5x5 / 7x7; ana/A2_gov_jg4s.txt): A7 vs A6 = what the knee adds per scale:
  1.0 1.13 px/frame (max 14), 0.9 0.56 (max 7), 0.8 0.40 (max 7), 0.7 0.76 (max 9); 0 darker at reduced scales. A7 vs BASE and
  A6 vs BASE are the same within 1-2 % at every scale (0.7: 6457 vs 6562 / frame).
- Looked at: img/gov_s07_RS_k85-93_A7_A6_BASE_z4.png (RS x1320-1420 y640-700 at 0.7, 4x: A7 = A6, smooth waterline, no dot /
  dash / rim; BASE has stair steps and a small pale square at k85), img/gov_s07_k88_full_A6_A7_BASE_diffA7-A6_z1.png (1x whole
  lake at 0.7: A6 = A7 = BASE to the eye, diff = faint green waterline lines). -> A-2 with the knee: not visible at 1x. OK.

## 8. G5 hero / sky / clouds vs AA6 (full frames, medium 60 + rest 12; BASE mask; tools/g5rows.mjs, g5.mjs)
- medium (ana/G5_medfull_A7vsA6.txt): 0 px-frames > 2 lv above row 413 (sky, clouds, mountains, the rings' upper part); topmost
  changed row hero 413, other 418, lake 469; max 14-16 lv. hero px > 4 lv: over lake 1171 / 3.18 M, over non-lake 412 / 3.55 M:
  the glass showing the changed floe waterlines behind it. Map img/g5_medfull_A7vsA6_map_small.png: changes only on the floe /
  rock waterlines and the lake below the horizon. rest: topmost changed row 401 (snow / floe edge at the far shore), hero 425.
  -> only the knee's region changes. G5 OK. G3 texture OK (section 2: lake 1.008-1.011, solid 1.000 of BASE).
- Confirmed (b5b, jcap holdre f0 = ?ffblock=0 and a7 on :5197, rows 560-660; a7 re-capture == my b6 holdre a7, 0 px > 2 lv):
  img/holdre_k203-209_x100-200_A7_F0_BASE_z5.png: without the guard (F0) the block is BASE-wide (x ~136-198); the guard leaves
  the small rectangle at the floe's left end (x ~128-158, hard right edge) = the G-3 mechanism ("face row missing" at the thin
  end, the G-3 investigator's LOG section 1) at render scale 1. dpx k207 x125 y607 A7 121 / F0 146 / BASE 157.
  img/holdre_k203-209_left_A7_F0_BASE_z1.png (1x): F0 / BASE show a white strip under the upper floe; A7 a faint lighter patch.
  NOTE for the G-3 fix: the investigator's fix A is gated to render scale < 1 (uLkFfbS), so this scale-1 case stays.

## 9. Hold path (cap.mjs hold, 420 frames, rows 380-766; A7 b5b 21:42-21:44, A6 b6; reference = BASE hold_base with masks)
- pops vs BASE (thr 40): A7 7024 px / 228 events >= 6, A6 7296 / 237; same top events (left floes during the dolly, k54-73;
  release k312-318). popnew A7 vs A6: 1 px. A7 vs A6: > 8 lv 14.0 k px-frames all brighter (dmax 14), > 20 lv 0 px.
- img/hold_k190_lake_A6_A7_BASE_diffA7-A6_z1.png (rings in front of the floes, the ring's reflection, far floes): A6 = A7 ~ BASE;
  the diff is blank grey to the eye.

## 10. FINDINGS (lens initial AR)
- AR-1 minor (pre-existing = AA6's G-3, reduced vs BASE; NOT caused by the knee): pale-block remnant under the near far floe:
  (a) render scale 0.7, gov k90-92, x ~105-140 y ~500-510, +26 lv over BASE; (b) render scale 1, holdre after the re-press,
  k203-211, x ~128-158 y ~600-612 (?ffblock=0 shows BASE's full block, so it is the guard's residual). 1x: faint lighter patch for
  3-8 frames, readable when looking for it; BASE / ?ffblock=0 show a plain white strip there. Fix owner: the G-3 investigator;
  their fix A is scale-gated and would leave (b).
- AR-2 nit (L10 measured): knee 1.0 lifts ~10-16 % of AA6's sub-threshold waterline jumps over the pop threshold (flagged px
  +9..+16 %, no new pop site: popnew A7 vs A6 0-4 px) and lightens the floes' thin dark waterline lines by +8-9 lv (dmax 15),
  moving those px from AA6's GT-like value toward BASE (band px brighter than both GT and BASE 0.29 % -> 0.42 % of band px-frames).
  Not visible at 3-4x; no halo / rim / outline anywhere. Still -56..-69 % pop px vs FIX1.
- AR-3 nit (A-3 residual, L10): thin dark features: over-darkening halved (jgt2 medium 8240 -> 3943 px-frames outside BASE's 3x3,
  rest 1540 -> 780), error vs GT 10.87 vs BASE 9.46 on those px; not visible.
- AR-4 nit (pre-existing R-4, unchanged): faint lighter column at rest x315-327 y490-506 (+17..+30 lv over the GT), 8x only.
- Not findings: R-1 / R-2 fixed (A7 = A6 = FIX1-like); far-floe pale block k48-64 gone; A-2 with the knee invisible at 1x (adds
  <= 1.1 px / frame vs A6); G5 only the knee's region changes; G3 texture 1.008-1.011 / 1.000; 0 console errors / warnings on
  every AA7 capture (the one console line was on the AA6 lab: net::ERR_INTERNET_DISCONNECTED).
## STATE ~21:50: DONE. No lane edited, no lab restarted. Caps deleted after analysis (deterministic: rerun tools/chainX*.sh /
## chainY.sh); ana / img / tools / logs mirrored to MAIN/notes/round11/lane_backup/aa7/judge-artrefl/.
