# AA5b lane log (track: the far-floe pale block that pops in), 20 Nov 2026 (Asia/Jakarta)
LANE = ~/Library/Caches/retrux-lanes/aa5b/retrux-web (edit; == aa3_judged at start), lab :5194. AA3 frozen = aa3_judged (patch base).
BASE = aa3_base (:5182, read-only). WORK = $SP/work5/aa5b (tools copied from work3/aa3/tools + work4/aa4y/tools).
Backup = MAIN/notes/round11/lane_backup/aa5b/ (aa5b.patch + LOG.md). Product switch: ?ffblock=0 (= AA3 exactly).

## 0. Start (15:22)
- Read AA3 LOG, AA4x / AA4y LOGs, the lead's strip_reverse_farfloes and aa4y's crop_FF_k70_pale / cs_FF_x230.
- LANE == aa3_judged (diff -rq app, hero-lab). Lab :5194 built. Rig check: my lane, medium path, rows 470-540, 100 frames ==
  AA3's caps/medium_F (0 differing bytes).

## 1. Reproduce (15:25-15:30)
- strip medium k44-56, x160-280 y492-514 (look/strip_med_FF_k44_53_z5.png): BASE and AA3 show the pale block under the near
  far floe from k52 (x ~228-252, growing left); the GT (2x render) shows the SAME kind of pale block earlier, k44-50, at x
  ~185-215, smaller, and none at k52+. So it is a model artefact present in both renders, placed differently by resolution.

## 2. Hypothesis variants (15:31, lab params, medium rows 470-540)
- ?lkhalf=0 (walk per pixel): block stays. ?lkwdiv=2: stays. ?lkwnear=0: stays. ?lkmscale=1,1 (full-size mirror target): GONE.
  -> the mirror target's resolution, not the walk target.

## 3. Debug renders (15:33-15:45; tools/dbgcap.mjs = float readback of the env pass with uLakeDebug modes, + the mirror and
##    walk targets; temporary lab debug outputs in Water.ts marked AA5BDBG, stripped from the patch)
- x230, rows 504-508, k51 -> k52 (AA3): the walk's first face takes 72-96 % of the rays (Fc), parallax fraction 0.01-0.045
  (face 0.4-2 m beyond the lake point), lookup 5 cm above the water (LK_HMIN): geometry identical in both frames; only the
  first face's COLOUR flips: luma 0.095 -> 0.648. Same values with ?lkmscale=1,1 except the colour stays 0.05-0.1.
- Mirror target dump at the lookup (k52, 720x383): face rows (GL) 330-331 at path 46 m (luma 0.06-0.14); row 332 (and row 331
  for x <= 582 at k52) path 48 m, luma 1.2-1.8 = the floe's INSIDE (the mirrored camera, under the water, looks into the
  floe through the oblique clip at the water line; the double-sided bake shows its insides sunlit); rows 327-329 path 93 m
  (dark, behind). The lookup centre sits ~0.45-0.6 texel above X's foot (GL 330.2-330.3 vs 330.75), its bilinear taps put
  25-31 % weight on row 331 -> pale. One target row = ~8.4 cm of height at 45 m on T1's half-size target; LK_HMIN 5 cm is
  0.6 texel. When the foot line slides across a row (camera motion), every lake pixel whose walk reads that face texel
  (same heightfield cell -> same uvM) goes pale at once -> a block with a sharp vertical edge that pops in.
- The GT's own block (2x, k47, x 186-194): same mechanism (first face luma 0.4-1.0, hM 2-4 cm: a thinner face).

## 4. Fix v1 (15:38-15:45): the face lookup kept >= LK_FFB (1) texel above X's foot (Water.ts, LK_FFB_GLSL)
- X's foot (the water at the face cell's entry) projects onto the face at or above its true foot, so taps whose texel
  centres stay above it never reach the inside. Per face hit: one extra lkProj; the footprint (dyF) shrinks so its lowest
  tap stays >= 1 texel above the foot; a face lookup closer than that moves up to 1 texel (single bilinear tap).
- Switch: the GLSL text is inserted into the water / walk / cache / cacheN sources only when ?ffblock is not 0 and the r12
  walk runs (`?ffblock=0` -> the material sources are WATER_FRAG itself). Lab: ?debug&ffb=<texels>.
- Bug found on the way: the lab param parse turned a missing ffb into 0 (Number(null)) -> fixed (v2 caps were LK_FFB 0).
- ffblock=0, medium rows 470-540, 100 frames == AA3 (0 bytes). Fix: k51/k52 first-face luma 0.117 / 0.115 (stable, dark).
  Strip (look/v3_strip.png = backup img/v1_strip_med_FF_k48_64.png, BASE | AA3 | v1 | GT, k48-64): no pale block in AA5b, looks like the GT there.

## 5. v1 full captures + pop scan (15:47-16:15)
- Clean masks (tools/cap.mjs copy: bloom and lens strength 0 during the mask renders; BASE :5182, caps/*_bmask): thin red
  boundary only (look/mask_cmp_k100.png: old mask left with thick bloom "partial" areas, new right). Mask session frames ==
  BASE caps (0 bytes, medium and reverse).
- Reverse GT rendered (BASE 2880x1532, lkmeach=1, down2 -> caps/reverse_gt). AA3 reverse = my lane ?ffblock=0 (reverse_F0).
- tools/popscan.mjs: e = maxch|X(k)-X(k-1)| - maxch|GT(k)-GT(k-1)| > 40 on the band (+-3 px of the clean mask's lake/solid
  boundary, hero dilated 6 px out); 8-connected per frame, linked over frames -> events; counts events >= 6 px.
  flagged px / px in events>=6:        BASE           AA3            v1 (LK_FFB 1)
    medium                            40257 / 33706  12090 / 9004   5048 / 2817
    slow                              26832 / 21604   4671 / 2321   2313 / 897
    reverse                           59074 / 53231  17859 / 14151  8490 / 5536
- BUT v1 adds pops (tools/popnew.mjs: flagged in X, not in the ref, X != ref): medium 1028 px / 29 clusters >= 6 px new vs
  AA3 (7714 px / 177 clusters removed). The new ones: small dark dashes at the far-left floe corner (x 80-165, y 528-575;
  look/ff_left2_k2_9.png: thicker, darker dashes flickering where AA3 and GT show a thin line) and in reverse a bright column
  under a far floe (x 774-848, y 467-477, k5-23; look/rev_k5_23_x774.png: persistent in v1, faint and gone in AA3 / GT).
  Cause: moving the lookup up 1 texel on SHORT faces (< ~1.5 texels in the target) puts it over the face's top, on what stands
  behind (sky / bright rim, or a darker face) -> a new wrong colour, and the walk's on/off hits on small objects pop harder.
- v1 rejected. v2 (16:20): keep the walk's lookup point; near X's foot read the two bracketing target rows (textureGrad, dyF 0,
  same horizontal footprint) and give a row lying farther than the front-most of the two (target alpha = path length; exp
  scale LK_FFBT 0.3 m) the front-most row's colour; blended in with smoothstep over 1 texel of the condition (no switch).
  The inside under a foot (+0.5..2 m) and the background over a short face (+several m / sky) are both farther than the face.

## 6. v2 (16:20-16:25): REJECTED. The two-row front-most lookup engaged on every footprint whose lower end came near the foot,
   including the TALL footprints of far faces (bands of many texels): a 2-row sample at their centre replaced the average ->
   a broad pale haze and white dashes on the lake before the right rocks (look/v2_new_x1146_med.png; walk face luma 0.25-0.4
   -> 1.1-1.3 at x1130 y604-615 k16, dbgcap modes 7/12).

## 7. v3 = FINAL (16:26): the two-row front-most lookup only for SMALL footprints near X's foot
- gFt = (1 - smoothstep(1, 2, lowest tap above X's foot, texels)) x (1 - smoothstep(2, 3, highest tap above X's foot)); the
  guarded colour = mix(AA3's textureGrad colour, the two bracketing rows (each row farther than the nearer one by d metres of
  path takes the nearer row's colour with weight 1 - exp(-d / 0.3)), gFt). Taller footprints and lookups well above the foot:
  untouched. Lab: ?debug&ffb=<texels> (1), ?debug&ffbt=<m> (0.3), ?debug&ffbtoggle=1 (run-time uniform for perf A/B).
- Debug lines (AA5BDBG) removed from the lane before the final checks; aa5b.patch = 1 file (Water.ts) vs aa3_judged.

## 8. Final measurements (v3; clean masks; GT = BASE 2x lkmeach=1; reverse AA3 = my lane ?ffblock=0 == AA3)
- Pops (popscan: e > 40 lv over the GT's own jump, band +-3 px), flagged px / px in events >= 6 px:
                 BASE            AA3             v3              v3 vs AA3
    medium       40257 / 33706   12090 / 9004    5112 / 2653     -58 % / -71 %
    slow         26832 / 21604    4671 / 2321    2761 / 992      -41 % / -57 %
    reverse      59074 / 53231   17859 / 14151   7926 / 4333     -56 % / -69 %
  new pops (v3 flagged, AA3 not, v3 != AA3) vs removed: medium 736 px (22 clusters >= 6 px) vs 7798 (162); slow 386 (8) vs
  2532 (75); reverse 1263 (45) vs 11297 (341). Remaining v3 top events: right side x1094-1145 y680-711 (AA3 has it too, same
  size), far-left floe corner dashes x 85-160 y 530-575 (small, also in AA3 / BASE; the walk's on/off hits on tiny objects:
  NOT fixed, different cause), far-right x 940-1015 y 745-765 (in AA3 too).
- The far-floe block (medium k52-200, reverse k162-172 etc.): gone (img/final_strip_med_FF_k48_64.png, cs_FF_x230_medium_v3.png,
  cs_FF_x240_reverse_v3.png, v3_rev_ff_k162_172_z4.png, crop_FF_k70_base_aa3_v3_gt.png); the slow path's notch under the near
  floe (x130-230 y545-570 k103-121) also gone (slow_k103_121_base_aa3_v3_gt.png).
- crawl (clean masks, ref BASE):    MC32 tot           J48 tot            J32 tot            eg (|F-GT|) tot   texLake / texSolid
    medium  AA3 -69 % v3 -76 % GT -63 %   -33 / -41 / -25 %   -16 / -24 / -14 %   -6 % / -21 %      0.9998 1.0002 / 1.0115 1.0003
    slow    AA3 -70 % v3 -75 % GT -63 %   -76 / -80 / -60 %   -49 / -56 / -32 %   -5 % / -19 %      0.9991 1.0005 / 1.0103 1.0004
    reverse AA3 -60 % v3 -67 % GT -50 %   -21 / -22 / -10 %   -12 / -15 / -7 %    -6 % / -18 %      0.9994 1.0003 / 1.0086 1.0003
  (box FF medium: MC32 -71 -> -79 %, eg -7 -> -26 %; FR eg -4 -> -25 %.)
- Changed px (> 4 lv vs AA3, ~10 k per frame): |AA3 - GT| -> |v3 - GT|: rest 12.50 -> 8.96 (57 % toward GT), medium 12.19 ->
  9.17 (53 %), slow 12.13 -> 8.80 (55 %), reverse 11.75 -> 9.52 (51 %).
- REST (path rest, 40 frames, deterministic): v3 vs AA3 70.8 k px differ / frame, 10.6 k > 4 lv, 2.0 k > 16 lv, max 116, all
  in the lake rows y 462-755 (look/rest_diff_left.png, rest_diff_right.png: thin bands right under the floes' waterlines +
  faint reflection columns). NOT identical to AA3 at rest: the same inside contamination is in the rest frame; the change moves
  it toward the 2x GT (12.5 -> 9.0). Lead's call (a motion-only version would pop at the hand-over to the still schedule).
- Rows 380-456 (above the lake): max 5 lv (bloom of the changed lake), hold max 3.
- Halo metric (crawl, > 4 lv outside BASE's 3x3): AA3 591-1866 /Mpx, v3 8001-9046 /Mpx, GT 38155-40736 /Mpx: v3's changed
  reflection colours count as "outside BASE's range" (they are new values under the floes, not outlines; the strips show no
  rims or outlines). G4 as written (vs the no-AA 3x3) is therefore not met in letter by any reflection-colour change.
- Hold (420 frames: press, dolly, release) v3 vs AA3 jumps (no GT): v3 jumps more on 7970 px, AA3 on 13683 px; worst v3 frames
  k309-313 (release dolly) look the same as AA3 (look/hold_release_k306_316.png).
- G8 (ident.mjs, 20 moving frames, vs the AA3 builder's JSONs of the final AA3 build): ?ffblock=0 vs AA3: final image, all
  targets, all 15 programs IDENTICAL; default vs AA3: walk + final targets and rx-water / rx-water-walk sources differ only;
  ffblock=0&aaresolve=0&slabflash=0&lktaa=0 vs BASE: identical (14 programs); envlake=plate vs AA3 and vs BASE: identical;
  T0 (mobile) vs AA3 and BASE: identical; T2 all off vs BASE: identical. Image level: ffblock=0 medium rows 470-540 100 frames
  == AA3 caps (0 bytes). 0 console errors / warnings in every session.
- G7 (perfff.mjs, ONE session, run-time uniform toggle, 60-frame blocks, paired): medium on/off paired median 0.968 (noisy
  run, frames 41 ms under contention) and 1.004 (16 cycles, 36 ms frames, range 0.957-1.034); fast 1.001 (0.93-1.05). The
  guard is free within the +-3 % noise (it runs in the quarter-size walk pass and the per-pixel walk along footprint edges).
- G10: tsc hero + project clean; g10.mjs: DPR 1 and 2 (1800x957), resize 1100x700 / 1375x875 and back: 0 dark px, 0 logs;
  live engine (own RAF, mouse moves, hold, release, sweep): TAA ran 468 frames, 0 logs (32 fps under the shared load).
- applytest: aa5b.patch applies with patch -p1 (dry run + real) on a cp -c clone of aa3_judged/app and reproduces the lane.
- Lab :5194 stopped (17:03). No browser of mine left.

## STATE: DONE. Recommendation: adopt v3 (?ffblock=0 = AA3 exactly), with the lead's call on the rest-frame change.
