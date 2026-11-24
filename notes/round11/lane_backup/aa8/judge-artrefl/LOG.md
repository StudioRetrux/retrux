# AA8 JUDGE, lens ARTIFACTS / REFLECTION (judge-artrefl), 20-21 Nov 2026 (Asia/Jakarta), box 23:47-00:47
Read-only. AA8 = :5199 (integrated build = AA7 final + polish_vs_aa7.patch: P-1 resetTAA, P-4 debug gate, P-2/P-5 comments,
knee 0.6 with the glide; tip patch NOT integrated). AA7 = :5197 (= MAIN), AA6 = :5196, BASE = :5182. All four HTTP 200 at 23:47.
WORK = $SP/work8/artrefl (tools/ = the AA7 art judge's tools + jcapS1, ctxstep, kerr, capcmp, odmap.mjs (new); caps/, ana/, img/,
logs/). Mirror = MAIN/notes/round11/lane_backup/aa8/judge-artrefl/. Every browser through slot.mjs (playwright-core 1.49.1).
Finding ids AJ-n. A8 = AA8 default, A7 = AA7 default. AA7 G1 caps reused = the motion judge's $SP/work7/motion/caps/<p>_A7
(rows 380-766, pre 30, slow 160 / medium 240 / others 120); my A8 caps use the same args. AA8 slow = polish caps/slow_K06
(the integrator proved a fresh :5199 slow capture == it, 0 px); my own fresh slow_A8 queued as a determinism check.

## 1. Captures (chain1: A = A8 medium / reverse / fast / diag / leave; C1 jcap holdre a8 / a7 / base+mask; C2 jcap gov a8 / a7 /
##    base+mask + jcapS1 gov --noscale a8 / a7. chain2: B rest 40 + hold 420 A8 / A7; D1 ctxstep a8 / a7 loss 0/1 + G5 full
##    frames; D2 medium 120 at scale 0.8 / 0.7 A8 / A7 / BASE; E rest full 12 + slow A8). 0 console errors / warnings (cap logs).

## 2. Pop scan, AA8 vs AA7 (popscan / popnew thr 40 band +-3, bloom-free masks: slow / medium / reverse aa5b bmask, leave refl
##    bmask, fast / diag aa5a NEW masks; 16-sample GT; tools/ana8.sh -> ana/pop_<path>.txt)
  flagged px / events >= 6 px / px in them      A7                  A8                  new pops A8 vs A7   removed
    slow (160)                                  1405 / 41 / 315     1318 / 36 / 255     0 px                0 px
    medium (240)                                3296 / 102 / 1420   3043 / 99 / 1280    0 px                0 px
    fast (120)                                  2577 / 82 / 1001    2389 / 77 / 910     0 px                0 px
    diag (120)                                  1884 / 56 / 717     1719 / 48 / 620     0 px                0 px
    reverse (120)                               2285 / 66 / 967     2120 / 60 / 875     0 px                0 px
    leave (120)                                 2250 / 65 / 1049    1991 / 62 / 896     0 px                0 px
  (A7 numbers = the tip builder's AA7 column exactly.) The knee 0.6 removes 6-12 % of AA7's flagged px on every path and adds
  NO pop site (popnew 0 px on all six paths; "removed" 0 px = no flagged px of A7 that A8 lacks at thr-10 either way).
  v3err A8 vs A7 (thr 8; toward / away from the GT): slow 226 / 43, medium 767 / 375, fast 533 / 276, diag 319 / 181, reverse
  204 / 28, leave 291 / 323 px-frames; ALL away px are DARKER (A8 darker than A7, dmean -8..-9, dmax 9-11, 1-3 px per frame) on
  the bottom rocks' reflection lines (x290-360 y695-765) and the right slab (x1230-1243 y674-687); bright-away 0 on every path.
  thr 16: 0 px-frames on every path (max |A8 - A7| 12-15 lv).
  Looked at img/fast_k18-34_x280-350_y700-740_botrocks_A8_A7_GT_BASE_z4.png (the largest away events, x4): A8 = A7 = GT to the
  eye (smooth mound edge over the dark water), BASE slightly stepped. Not visible.

## 3. Rest (L3; rest 40, A8 vs A7 vs the 2x GT; ana/rest.txt)
- capcmp: every frame differs, 247 px-frames > 8 lv, max 13. v3err A8 vs A7 thr 8: 45 px-frames, ALL toward the GT; 0 away; thr 16: 0.
- Looked at img/rest_k20_R4_FF_x1076_R2_A8_A7_GT2x_z4.png (R-4 column x290-350 y480-515, centre far floe x540-610 y470-500,
  x1050-1100 y474-500, R-2 far-left dashes x50-190 y520-592) and img/rest_k20_R1_A8_A7_GT2x_z4.png (R-1 gap x930-1020 y730-766):
  A8 = A7 at 4x in every crop. R-4's faint lighter column under the floe edge is still there, unchanged (nit, pre-existing);
  R-1 / R-2 stay fixed; the GT is a little smoother as before. 1x whole lake: img/rest_k20_left_A7_A8_diffA8-A7_z1.png and
  rest_k20_right_..._z1.png: A7 = A8 to the eye, the gain-4 diff is blank grey except a few faint marks on far-floe waterlines.
  img/rest_k20_farright_centre_A8_A7_GT2x_z3.png (far-right floes x1100-1440 y476-530, centre floe x400-700 y520-600): A8 = A7,
  close to the 2x GT.

## 4. Knee 0.6 (L10 / L11): thin dark features + waterline lines vs the GT (jgt2 + kerr; ana/knee_medium.txt, ana/rest.txt)
                                           A7 (K 1.0)          A8 (K 0.6)          (BASE)        (AA6 K 0.5, AA7 art judge)
  medium wl-lines mean |lane - GT|          4.3565              4.2362              6.2227
  medium wl-lines signed (AR-2 lightening)  +1.249              +0.891              +3.577
  medium AR-2 over-bright px (>max(GT,BASE)+12) 39482          30607
  medium thin-dark mean |lane - GT|         1.4334              1.4311              1.4624
  medium jgt2 over-darkened (> 4 lv outside BASE 3x3) 3943     6810                0              8240
  rest wl-lines |e| / signed                4.3189 / +0.311     4.2891 / +0.120     6.0426 / +3.128
  rest jgt2 over-darkened                   780                 1289                               1540
  = the polish builder's knee table (K 0.6 column) to the 4th decimal: reproduced independently on my own A8 capture.
  So 0.6 trades: AR-2 (waterline lines lightened) reduced by 22 % (count) / 29 % (signed), AR-3 (thin dark features
  over-darkened) up 73 % vs A7 but 17 % below AA6 (which every AA6 / AA7 judge accepted as invisible).
- WHERE the extra over-darkening sits (tools/odmap.mjs, ana/odmap_medium.txt, img/odmap_medium_A8red_A7green.png): the horizon
  row y476-508: far-left floes x160-256 (A8 1698 vs A7 706 px-frames, max excursion 11-14 lv) and the far-right posts
  x1248-1376 (A8 2601 vs A7 1851, max 38 - but A7 has the 38 too); img/odmap_medium_A8red_A7green_y460-620.png (looked at:
  red = A8-only streaks on the far-left floe lines, yellow = both on the far-right posts, black elsewhere). Looked at img/medium_k40-200_x150-270_y470-510_farleft_
  A8_A7_GT_BASE_z4.png and img/medium_k40-200_x1250-1380_y470-505_posts_A8_A7_GT_BASE_z4.png (x4, 3 frames): A8 = A7 to the eye,
  both like the GT (the small dark facet ticks on the far floes, the posts as thin dark lines); no halo, rim or dark outline.
- Knee edges at rest (img/rest_k20_knee_edges_A8_A7_BASE_GT2x_z4.png: FR posts, left rock, right slab; A8 | A7 | BASE | 2x GT):
  no halo / rim / outline; A8's posts a touch darker than A7's (toward the GT's crisp dark posts).
- G1 / G3 cross-check (aa5a crawl, NEW mask, ref BASE, stride 2; ana/crawl_medium.txt; cols BASE | GT | A7 | A8): MC32 total
  A8 -82 % (A7 -82); per box A8 FS -84 WR -69 DR -87 FF -85 FR -74 RS -91 (A7 -82 / -68 / -86 / -84 / -73 / -91); J48 total -48 %
  (A7 -47). Texture (G3): lake 1.0103 (A7 1.0106), solid 1.0002 (A7 0.9999). G3 OK.

## 5. Hold (crest train, the rings' reflection, release / re-press)
- cap.mjs hold 420 (rows 380-766; BASE hold_base + masks as the reference, as the AA7 art judge; ana/hold.txt): flagged pops A8
  7193 px / 233 events, A7 7026 / 228 (the AA7 art judge had 7024 / 228; AA6 7296 / 237). popnew A8 vs A7: 0 px; A7 vs A8: 0 px.
  capcmp: 393 / 420 frames differ, 1442 px-frames > 8 lv, max 12. img/hold_k190_lake_A7_A8_diffA8-A7_z1.png (rings in front of
  the floes, the ring's reflection, far floes; A7 | A8 | gain-4 diff): identical to the eye, diff blank grey.
- jcap holdre (press 10, release 110, re-press 135, release 215; a8 / a7 / base+mask in one browser, rows 380-766;
  ana/holdre.txt): flagged vs BASE A8 15371 px / 432 events, A7 14905 / 412 (AA6 15650 / 441 per the AA7 art judge); popnew A8
  vs A7: 0 px (every px A8 flags, A7 flags at thr-10 too: no new site; the knee lifts a few sub-threshold jumps over 40 the
  other way round from AA7, i.e. back toward AA6). v3err A8 vs A7 thr 8: 729 px-frames, ALL darker (dmax 11) on thin
  waterline lines (e.g. x104-115 y530); thr 20: 0.

## 6. G5 hero / sky / clouds (full frames medium 60, A8 vs A7, BASE mask; ana/G5_medfull_A8vsA7.txt)
- 0 px-frames > 2 lv above row 416 (sky, clouds, mountains, the rings' upper part); rows 416-447: 2 px-frames; topmost changed
  row hero 446, other 447, lake 471; max 10-12 lv. hero px > 4 lv: over lake 591 / 3.18 M, over non-lake 120 / 3.55 M (the
  glass showing the changed waterlines behind it). Map img/g5_medfull_A8vsA7_map_small.png: changes (red = A8 darker) only on
  the floe / rock waterlines below the horizon. G5 OK (only the knee's region changes).
- Rest G5 (rest full 12, A8 vs A7, BASE rest mask; ana/G5_restfull_A8vsA7.txt): nothing above row 416; topmost changed row
  other 425 (far shore floes / snow edge, inside the knee's region), hero 437, lake 460; max 10-13 lv.
- Hold k60 (crest train on the lake + rings; img/hold_k60_lake_A7_A8_diffA8-A7_z1.png): A7 = A8 to the eye, diff blank grey
  except faint traces on the left floes' waterlines.

## 7. The thin-tip spot (AR-1 b / RC-1) - NOT fixed in AA8 (the tip patch was not integrated); A8 = A7 there
- jcapS1 gov --noscale (scale 1 throughout; a8 / a7; my a7 == the recheck's fin1 0 px = deterministic):
  img/gov1_tip_k62-90_x100-260_A8_A7_BASE1_z5.png: A8 and A7 show the same lighter spot with a vertical edge under the near far
  floe's thin left tip (k~68-84); BASE the full pale block. img/gov1_k70-78_x0-720_A8_A7_z1.png (1x): a faint lighter patch
  under that tip in both.
- jcap holdre k201-211 (img/holdre_k201-211_x90-230_A8_A7_BASE_z4.png x4; img/holdre_k201-211_x20-340_A8_A7_BASE_z1.png
  native 1x): A8 = A7, the pale rectangle with hard vertical edges under the upper floe's waterline (x ~128-158 y ~600-612);
  BASE wider and brighter. 1x: faint, readable when looking for it.
- jcap gov at the governor's 0.9 / 0.8 / 0.7 (img/gov_red_k61-93_x80-300_A8_A7_BASE_z3.png): A8 = A7, the smaller lighter
  patch at the floe's thin left end where BASE shows its full block.
- NEW evidence - an ORDINARY pointer sweep (the medium G1 path) at scale 1: tools/spotdur.mjs (px in box x170-240 y497-509
  more than 15 lv above the 16-sample GT; ana/spotdur_medium_s1.txt): A8 203 frames / 11,518 px-frames, A7 207 / 12,068, BASE
  219 / 29,787. From k63 to k152 (~90 frames = ~1.5 s at 60 fps) A8 holds 90-150 px at +23..+25 lv (BASE 250-330 px at +30..+39).
  Looked at img/medium_s1_k52-116_x140-280_y480-525_A8_A7_BASE_GT_z4.png (x4, every 8th frame): A8 = A7, a lighter rectangle with
  a hard vertical edge under the far floe's thin left end from k68 on; the GT has none (a continuous darker band under the
  floe); BASE's lighter area spans the whole floe bottom. img/medium_s1_k96_x150-270_GT_A8_BASE_diffA8-GT_z4.png (diff = a green
  block under the tip) and img/medium_s1_k96_x40-520_GT_A8_BASE_diffA8-GT_z1.png (1x: faint lighter patch). Column profile
  k92 x198 (ana via tools/colp.mjs, LOG only): rows 499-506 A8 193-202 / BASE (scale 1) 190-204 / GT 166-179.
  The same sweep at render scale 0.8 / 0.7 (cap.mjs --scale; read back 0.8 / 0.7; 120 frames): A8 0.8 10,132 px-frames in the
  box, A7 0.8 10,487, BASE 0.8 6,021 (BASE's block sits further right at 0.8), A8 0.7 10,563, BASE 0.7 11,144.
  img/med08_k60-116_x140-280_y480-525_A8_A7_BASE_GT_z4.png and img/med08_k76-108_x60-380_A8_BASE08_A8s1_GT_z1.png (native 1x):
  A8 at 0.8 = A8 at scale 1 (fix B reproduces the scale-1 image, spot included), faint lighter patch under the tip at 1x.
- For the lead: the tip builder's rejected patch on the same medium sweep (its kept caps/medium_TIP): 4,441 px-frames (-61 %),
  30-47 px at +19..+21 lv in k66-150 (ana/spotdur_medium_s1_TIP.txt) - it would shrink, not remove, the ordinary-sweep spot.

## 8. Reduced-scale sweeps (pops; ana/sweep_s08.txt, sweep_s07.txt; GT = the scale-1 16-sample on the same poses)
  0.8: A8 867 px / 24 events, A7 1224 / 32, BASE 16,367 / 325; popnew A8 vs A7 0 px both ways; v3err A8 vs A7 thr 8: 61 px-frames.
  0.7: A8 789 / 15, A7 1100 / 16, BASE 18,550 / 277; popnew 0 px both ways; v3err thr 8: 166 px-frames (all darker).

## 9. P-1 context loss / restore frames (fresh ctxstep on :5199 / :5197, default, loss 0 / 1; caps/ctx/)
- TAA state: restored frame weight 0 / still 1, then 0.5 (valid). Console: only the intended "[hero] WebGL context lost".
- My frames are bit-identical to the integrator's i8 frames (L0 / L1, f0 and f3) and to the polish builder's a7 frames: the
  integrator's numbers apply (TAA extra damage I8 345 / 262 / 186 / 133 px > 16 lv vs AA7 5,869 / 2,616 / 578 / 113; restored
  frame = the plain resolve within 4 lv). Looked at img/ctx_f0_x0-520_y505-600_A7loss_A8loss_A8noloss_z2.png and
  ctx_f1_x960-1440_y600-700_..._z2.png: A8's restored waterlines look like the no-loss frame; A7's slightly heavier. P-1 fixed.
- BUT the whole restored frame vs the no-loss frame: A8 104,231 px > 16 lv at f0 (A7 109,930), max 254, still ~100k at f3:
  img/ctx_a8_L1f0_vs_L0f0_a.png (restored) vs _b.png (no loss) and _diff8.png: the ICE RINGS come back with large BLACK
  BLOTCHES (and the shards / the lake's ripple ring differ); pre-existing in BASE and AA7 (the AA7 perf judge saw them persist
  in the live loop), outside the waterline brief, not touched by AA8 -> AJ-2.

## 10. FINDINGS (lens AJ)
- AJ-1 minor (pre-existing = AA6 / AA7, reduced vs BASE, UNCHANGED by AA8 because the tip patch failed its pop gate):
  the thin-tip pale spot under the near far floe's thin left end. It is NOT only a 0.1 s event: on the ordinary medium sweep it
  holds ~1.5 s (k63-152) at scale 1 and at the governor's 0.8 / 0.7, 90-150 px at +23..+25 lv over the GT (BASE ~2x the area);
  1x: faint lighter rectangle with a hard vertical edge, readable when looking for it. Fix: lead decision on the tip builder's
  options (2) discriminator / (3) more mirror rows; their patch would cut this sweep's spot by 61 %, not remove it.
- AJ-2 minor (pre-existing in BASE and AA7, OUTSIDE the AA brief; not a regression): after a WebGL context loss + restore the
  rings show large black blotches (~100k px > 16 lv vs the no-loss frame on every captured frame after the restore). P-1 (the TAA
  part) is fixed. Fix (separate task): rebuild whatever the rings' material samples (env / transmission / baked textures) on
  webglcontextrestored, or rebuild the engine on restore.
- AJ-3 nit (L10 / L11 measured): knee 0.6 trades AR-2 for AR-3: waterline-line lightening down (signed +1.249 -> +0.891 lv,
  over-bright count 39,482 -> 30,607), thin-dark over-darkening up (jgt2 medium 3,943 -> 6,810, rest 780 -> 1,289; AA6 8,240 /
  1,540), at the horizon (far-left floe facet ticks, FR posts); every changed px within 15 lv of A7; invisible at 4x.
- AJ-4 nit (pre-existing R-4, unchanged): faint lighter column at rest x315-327 y490-506, 4x / 8x only.
- Not findings: 0 new pops on slow / medium / fast / diag / reverse / leave / hold / holdre / gov / sweeps 0.8 and 0.7; flagged
  px vs AA7: -6..-12 % on the six G1 paths, -2 % gov, -29 / -28 % on the 0.8 / 0.7 sweeps, +2.4 % hold and +3.1 % holdre (both
  vs BASE as reference, 0 new sites, both still below AA6's 7,296 / 15,650: the knee moves back toward AA6); R-1 / R-2 stay
  fixed; G5 unchanged above row 416 (medium and rest); G3 1.0103 / 1.0002; 0 console errors / warnings in every session;
  captures deterministic (gov1 a7 == recheck fin1, slow_A8 == polish slow_K06, ctx frames == integrator / polish frames).

## STATE (00:13): DONE. No lane edited, no lab restarted (:5199 / :5197 / :5196 / :5182 only read / captured). Capture sets
## deleted after analysis (deterministic: re-run tools/chain1.sh / chain2.sh = bA bC1 bC2 / bB bD1 bD2 bE); kept caps/ctx (raw
## restore frames, $SP only). ana / img / tools / logs mirrored to MAIN/notes/round11/lane_backup/aa8/judge-artrefl/.
