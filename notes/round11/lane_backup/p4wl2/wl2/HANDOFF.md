# wl2 HANDOFF (water round 2, INTEGRATOR), 22 Nov 2026 20:25-21:10 WIB
Lab :5167 (left running for the final judge). Lane LANES/wl2 = APFS clone of LANES/p4wl (frozen, :5163) + lane wl2g. MAIN's water = :5162.
WORK $SP/work_p4/wl2 (LOG.md); mirror MAIN/notes/round11/lane_backup/p4wl2/wl2/ (LOG, patches, ident / blips / perf / FAIR tables, img/, tools/).
(p4wl's own HANDOFF.md came with the clone: kept as HANDOFF_p4wl_copy.md.)

## VERDICT: ok = false
Hard gate that FAILS: THE BAR (2), left box. One-frame blips in the left box (CSS 0-420 x 470-620) are 577 vs GT 325 at T1 DPR 1
(+78 %) and 1053 vs GT 761-861 at DPR 2 (+22 to +38 %, depending on how the GT is resampled); the bar is GT + 15 %. Pre-existing:
MAIN 774 / 1305, p4wl 590 / 1075, px 711 / 1270. It is the lake's own ripple sparkle, not the walk. Everything else measured passes
(below). Open majors carried over from the judges: WL2G-J1 (real loop at T1 DPR 2, the open water in front of the left ice sheets pops
~55 % more than MAIN; inherited from p4wl's P4WL_BAND, wl2g does not cause it) and WL-J2 / job B (wl2b was not mergeable).

## WHAT WAS CHOSEN AND WHY (args.integrate rules)
- RJ1 winner = wl2g, by rule (c): neither RJ1 lane's judge passed; both judges found the morphing contour gone. Tie-break on (b)'s order
  (shelf-water-box blips vs GT): wl2g +7 % (DPR 1) / +2 % (DPR 2), wl2f +10 % (DPR 1). wl2f also carries the BLOCKER WL2F-J1 (FAIR +13
  to +59 % vs MAIN at the left floe feet), and its builder advised against merging. wl2g passed FAIR on all six paths.
- wl2g's open findings (now wl2's): WL2G-J1 major (above), WL2G-J2 major (= the BAR (2) fail above), WL2G-J3 minor (the shelf reflection
  outline no longer reshapes but is a static quarter-texel staircase; the GT is soft), WL2G-J4 nit (each re-anchor redraws the contour
  once: ~4 per 300 frames of a fast sweep, plus dolly start / release).
- wl2b LEFT OUT: its judge failed with 5 MAJOR findings (J1 job B not delivered by default, the columns equal p4wl's; J2 the cap-8 edit
  dims and halves the far column at x ~1208; J3 the lips / notches at the slab feet unchanged in motion; J4 perf unproven; J5 FAIR not
  run). The rule takes wl2b only with minor / nit findings open. So job B (the far reflection columns, the 'bibir air' lips) is NOT in
  wl2: the far slabs look exactly like p4wl / MAIN.
- wl2f LEFT OUT (lost the RJ1 choice; blocker WL2F-J1).

## MERGE
wl2g changes only Water.ts and LANES/p4wl is its unchanged base, so the 3-way merge (base p4wl, ours p4wl, theirs wl2g) is wl2g's patch:
`patch -p1` applied clean. Water.ts sha256 d94c26c2 (== LANES/wl2g); `diff -rq LANES/wl2g/retrux-web/app LANES/wl2/retrux-web/app` is
empty. The served /dist/main.js (2373013 B, sha256 849d7909) and index.html of :5167 are byte-identical to wl2g's final build on :5164.
- Files: retrux-web/app/hero/engine/world/Water.ts ONLY (p4wl's P4WL_BAND + wl2g's lake-anchored walk). No HeroEngine.ts, LakeMirror.ts,
  LakeSchedule.ts, RenderPipeline.ts, IceMaterial.ts change; no asset; no new pass (the walk target is larger, drawn under a scissor).
- Patches: WORK/wl2_vs_p4ph.patch (419 lines, 6 hunks, Water.ts only) = what merges into MAIN. Applied to a copy of LANES/p4ph/retrux-web/app
  it reproduces wl2's app exactly; MAIN/retrux-web/app/hero/engine/world/Water.ts == p4ph's, so it applies to MAIN as is.
  WORK/wl2_vs_p4wl.patch (338 lines) == wl2g_vs_p4wl.patch byte for byte. Both mirrored.

## SWITCHES
- `?wl2g=0` = :5163 exactly (p4wl's band walk). `?p4wl=0` = :5162 exactly (MAIN's water). No wl2b / wl2f switch (not merged).
- Lab (from wl2g): `?wl2gaz=0` (no azimuth lattice, ~half the walk cost), `?wl2gaz=<rad>` (0.004), `?wl2gread=1` (opt-in interpolated
  horizon read), `?wl2gg=` guard 1.25, `?wl2gs=` oversampling 1.35, `?wl2gt=` scale tolerance 1.0.
- T0 has no walk: unchanged (ident).

## GATES ON THE FINAL BUILD (:5167)
1. tsc: tsconfig.hero.json exit 0, tsconfig.json (--incremental false) exit 0 (WORK/tsc_hero.txt, tsc_app.txt).
2. ident (WORK/id/ident_summary.txt; final image + every target + every linked program, 20 moving frames): ?wl2g=0 == :5163 IDENTICAL at
   T1, T2, T0 phone, p04 expand 0.9, p06 expand 2.97, p07 release 0.33; ?p4wl=0 == :5162 IDENTICAL at all six; merged ON == :5163 at T0;
   merged ON == wl2g :5164 at T1 and T0; control merged ON vs :5163 at T1 DIFFERS (program rx-water-walk only). 0 console errors (16 runs).
3. WL-RJ1 (THE BAR 1): PASS. Same-pose stepped fast path T1, frames 98-101, shelf band CSS 285-405 x 450-495, contrast-stretched, with
   frame diffs: WORK/st/d1_contour_x5.png (rows MAIN / p4wl / merged / GT) and st/d2_contour_x4.png (MAIN / p4wl / merged), looked at:
   MAIN and p4wl redraw the crenellated teeth every frame (filled diff patches); merged keeps one outline that slides (thin diff lines).
   The outline is a stair-stepped quarter-texel shape the soft GT does not have (WL2G-J3). The merged captures are byte-identical to wl2g's
   (120/120 frames at DPR 1 and DPR 2, WORK/st/bytecmp.txt).
4. Blips (THE BAR 2), thr 12, MAIN | p4wl | merged | px | GT (WORK/st/d1_blips.txt, d2_blips.txt):
   DPR 1: left 774 | 590 | 577 | 711 | 325 (FAIL +78 %); shelf 216 | 206 | 205 | 222 | 192 (+7 %, pass); far 1101 | 990 | 977 | 1173 | 920 (<= :5163, pass).
   DPR 2: left 1305 | 1075 | 1053 | 1270 | 761 (FAIL); shelf 345 | 329 | 328 | 340 | 312 (+5 %, pass); far 1797 | 1599 | 1586 | 1906 | 1596 (pass).
5. Perf (THE BAR 3), STRICT (no other slot holder, 1-min load < 10), T1 pointer sweep 6 s, A = :5162, B = :5167. PASS, thin margin.
   12 valid pairs in 2 batches (WORK/perf/sweep.txt 20:33-20:40, sweep2.txt 20:56-21:00). Pairs 0-2 of batch 1 ran beside my own
   analysis python (outside the slot), so they are not counted as clean. 9 CLEAN pairs: paired median 1.035 (+3.5 %), mean 1.026;
   ratios 1.000, 0.990, 1.035, 1.015, 1.062, 1.052, 1.047, 1.046, 0.985. All 12: median 1.025.
   Modes: A (:5162) is bimodal, low 19.1-19.5 ms (4 runs) and high median 20.2 ms (8 runs). B (:5167) never went below 19.9 ms
   (median 20.4, 19.9-21.5). Inside the high mode the cost is ~+1 %. The four pairs where A hit its low mode give +4.6 to +6.2 %.
   So the real cost is between ~+1 % and ~+5 %. wl2g's estimate was +1.5-2 %; `?wl2gaz=0` halves the walk work.
6. FAIR (THE BAR 5), lane vs its own 16-sample 2x GT (lkmeach=1), popscan --minpx 6, events / px; MAIN = :5162 vs its own GT
   (re-judge fast / reverse; wl2f slow / medium / diag / leave); gate <= MAIN + 10 %:
   PASS on all six (WORK/fair/fair_W.txt, run 20:40-20:56 on :5167; identical to wl2g's numbers), merged vs MAIN:
   slow 31 / 217 vs 41 / 293; medium 57 / 701 vs 73 / 910; fast 43 / 555 vs 63 / 748; diag 31 / 452 vs 39 / 527;
   reverse 77 / 1217 vs 103 / 1427; leave 44 / 476 vs 52 / 645. Every path is below MAIN. (p4wl, re-judge: fast 39 / 535, reverse 81 / 1241.)
7. 60 fps sparkle (THE BAR 4): not re-run here. The build is byte-identical to wl2g's, whose s60 run at T1 rest (on build 3 with
   ?wl2gread=0, which is exactly the default code path) gave far water / lips 1.6 / 1.1 blips per frame (MAIN 2.0 / 1.2, p4wl 1.7 / 1.2)
   and left water / shelf water 2.1 / 0.2 (MAIN 2.1 / 0.2, p4wl 2.0 / 0.2).
8. Ice rings' look unchanged (IceMaterial untouched; ident control differs only in walk / main / post targets); T0 unchanged (ident).

## JOB B (the far slabs' reflection columns, the lips): NOT DELIVERED
REF | merged | MAIN crops at rest, T1 and T2, far (CSS 880-1440 x 440-590) and left slabs, 1x and 2x:
WORK/client/wl2_merged_slabs_{T1,T2}_{far,left}_{1x,2x}_REF_MERGED_MAIN.jpg (mirrored to img/). I looked at T1 far 1x: merged looks the
same as MAIN (short soft columns); REF has long bright columns broken by ripples. This needs a new job-B lane on top of wl2 (re-measure
wl2b's K=2.6 and a distance-limited cap there; its judge's WL2B-J2 / J3 explain why its default cannot ship).

## CLIENT FILES (MAIN/notes/round11/refs_user/), all looked at
- wl2_merged_1x_MAIN_MERGED.jpg: stepped fast path, T1 DPR 1, CSS 0-560 x 430-620, frames 98-101 (MAIN left, merged right). At 1x
  the two look the same.
- wl2_merged_2x_MAIN_MERGED.jpg: the shelf water, CSS 260-500 x 440-530 at 2x, frames 98-101: MAIN's light crenellated patches change
  shape every frame; merged's keep their shape and slide.
- wl2_merged_contour_T1dpr1_x5_MAIN_P4WL_MERGED_GT.jpg and wl2_merged_contour_T1dpr2_x4_MAIN_P4WL_MERGED.jpg (contrast-stretched sheets, item 3).
- wl2_merged_T1dpr2_MAIN_left_MERGED_right_halfspeed.mp4 (stepped fast path at T1 DPR 2, 120 frames at 30 fps = half speed, 1408 x 228).

## OPEN (for the lead / the final judge)
- BAR (2) left box: the lake's ripple / wavelet sparkle is ~2x the GT in every build (MAIN included). A bump band-limit job, not the walk.
- WL2G-J1: real loop at T1 DPR 2 (the client's setup): the left open water in front of the left ice sheets pops more than MAIN (judge:
  MAIN 332-355 vs p4wl 528-530 vs wl2g 549-689 blips per frame in CSS 0-160), in larger, blotchier patches. It comes from p4wl's
  P4WL_BAND, the frozen base; the stepped tests do not show it. Worth a decision before anything ships: the shelf water is -35 % vs MAIN
  in the same runs.
- WL2G-J3 staircase outline; WL2G-J4 one redraw per re-anchor (a cross-fade of two anchors would hide it).
- Job B (far columns, lips) not built (wl2b left out).

# FIXER (final judge WL2-FJ1..FJ5), 22 Nov 2026 21:30-22:27 WIB
Lab :5167 rebuilt and left running (final build 22:08). WORK $SP/work_p4/wl2/fix (LOG.md has every number; tools/, rl/, st/ tables,
img/, client/); mirror MAIN/notes/round11/lane_backup/p4wl2/wl2/fix/. File changed: retrux-web/app/hero/engine/world/Water.ts ONLY
(wl2fjEdits + 5 lines in the wl2g block; no other file, no asset, no new pass). IceMaterial untouched.

## FJ1 (blocker): FIXED at the root cause in the deciding test
- Bisect in the dt-controlled real loop at T1 DPR 2 (rl/rl2_bisect.txt): `?wlwalk=q` (MAIN's read, the rest of p4wl on) = MAIN (319 vs 320),
  so P4WL_BAND's read is the whole cause. Widening its share by fwidth(mu) (k 1, 2, 8) did nothing or made it worse (532, 530, 589).
- Root cause: the share Phi((tap horizon - mu) / sE) took mu and sE from the PIXEL's bump, whose finest octaves are coherent at the pixel's
  footprint. So a face's reflection is broken by ripple stripes a few px wide, the camera step between real frames (~33 ms) moves them by more
  than half a period, and they flip every frame (temporal aliasing). MAIN's quarter pass took the share from the bump at the quarter texel's
  footprint. The stepped harness (small fixed steps) cannot see it.
- Fix (WL2FJ, inside the wl2g block): lkBump keeps a second set of coherent sums from the SAME noise samples (no extra noise evaluation),
  with the coherence of a footprint WL2FJ_Q = 4 times the pixel's (min with the pixel's own), and moves the coherent variance it drops into a second
  spread (LEAN). P4WL_BAND's share takes mu and sE from that band-limited normal / spread (wlN4 / wlSig4); the shading keeps the pixel's own normal.
- Switches: `?wl2fj=0` = wl2 before this fix (= wl2g :5164) exactly; `?wl2g=0` (all off) = :5163 exactly; `?p4wl=0` = :5162 exactly.
  Lab: `?wl2fjq=` (Q, 1-16), `?wl2fjs=0` (the pixel's own spread with the band-limited mu; the stepped harness is about the same).
- Deciding test, clean (M F M F M F, no other slot holder; rl/rl4_T1d2.txt), left water CSS 0-160, blips / frame, MAIN | fixed:
  dt 28-31 (n 286 | 80) 317 | 289 (-9 %); dt 30-33 (n 141 | 208) 351 | 365 (+4 %); dt 28-34 (n 416 | 342) 339 | 373 (+10 %); pooled 331 | 386.
  Before the fix: 532-538 against ~332 (+60 %; the judge measured +66-106 %). So about 80-85 % of the excess is gone. It is not at or below MAIN in every
  dt band: within +10 % in the bands with n >= 100 on both sides.
  T1 DPR 1 (rl/rl5_T1d1.txt): dt 22-26 (n 109 | 195) 106 | 95 (-10 %), dt 20-23 55 | 49 (judge: +30-48 %). T2 not re-run.
  Look: refs_user/wl2_merged_realloop_T1dpr2_leftwater_x3_MAIN_PREWL2_FIXED.jpg (rows MAIN / pre-fix / fixed, 3 frames + diffs x6).
  The pre-fix row's dark high-contrast ripple stripes and bright diffs are gone; the water tone and diffs are MAIN's.

## Price of the fix (the lead should know before merging)
- The far water's real-loop gain is given up: far region (CSS 860-1440 x 420-600, T1 DPR 2) 2291 / 2284 against MAIN 2257 / 2247 (+1.5 %);
  pre-fix wl2 was -20 to -27 %. Slab-foot lips 49 / 44 against 43 / 41.
- Stepped same-pose harness (st/d1_blips.txt, d2_blips_final.txt), MAIN | p4wl | pre-fix | fixed | px | GT:
  DPR 1: left 774 | 590 | 577 | 760 | 711 | 325; shelf 216 | 206 | 205 | 212 | 222 | 192 (+10 % vs GT, pass); far 1101 | 990 | 977 | 1065 | 1173 | 920.
  DPR 2: left 1305 | 1075 | 1053 | 1262 | 1270 | 761; shelf 345 | 329 | 328 | 342 | 340 | 312 (+10 %, pass); far 1797 | 1599 | 1586 | 1729 | 1906 | 1596.
  => THE BAR (2) far item ("not worse than :5163") now FAILS (+7 % at DPR 1 and DPR 2, still below MAIN). The left box moves back to MAIN's level
  (FJ4 worse in this harness). The band-limited share is MAIN's share, so it also brings back MAIN's sensitivity to tap-horizon jitter. Narrow
  spread (?wl2fjs=0) does not change that (far 1055). A distance fade cannot separate the boxes: the left water is 30-60 m, the far box 25-90 m.
- Decision for the lead: the real loop at T1 DPR 2 is the deciding test (lead note 20:30), and there the fix wins clearly. If the stepped far box must
  stay at :5163, the options are: (a) ship with `?wl2fj=0` behaviour on the far water only, gated by something other than distance, for example the
  bump's coherent slope energy at the pixel (only where the dropped octaves carry slope); (b) Q = 2 (not measured cleanly: its one run hit a
  loaded machine); (c) accept the +7 %.

## Gates on the FINAL build (:5167, 22:08)
- tsc: tsconfig.hero.json and tsconfig.json (--incremental false) exit 0.
- ident (idF/ident_summary.txt): wl2g=0 vs :5163 at T1, T2 and release 0.33; p4wl=0 vs :5162 at T1, T0 phone and expand 2.97; wl2fj=0 vs :5164 at T1,
  T2 and expand 0.9; ON vs :5162 at T0 phone: all IDENTICAL (final image + every target + linked programs). The control (ON vs :5164 T1) DIFFERS.
  Stepped: `?wl2fj=0` byte-identical to wl2g's d2_G4 (120 / 120). 0 console errors in every real-loop run (rl meta), every stepped / FAIR
  capture (cap logs) and the shader dumps (default and `?wl2gread=1`); the ident JSONs do not record console errors.
- THE BAR (1): holds. client/wl2_merged_contour_T1dpr2_x4 (looked at): the outline slides with thin-line diffs and does not reshape, at lower contrast.
- THE BAR (3) perf, STRICT, T1 sweep 1440x766, A :5162, B :5167: 9 / 9 valid; paired median +1.5 %, mean +0.6 %; A bimodal (19.8 ms n 7 /
  21.2 ms n 2), B unimodal 20.1 ms. PASS. The DPR 2 client config was not re-measured.
- THE BAR (5) FAIR vs the build's own 2x GT: fast 55 / 712 (MAIN 63 / 748), reverse 85 / 1253 (MAIN 103 / 1427): PASS. slow / medium / diag / leave
  NOT re-run (time box).
- THE BAR (4) 60 fps sparkle: NOT re-run (time box).
- Ice look unchanged (IceMaterial untouched; the program is not in the ident diff); T0 phone IDENTICAL to MAIN.

## Not fixed (left with options)
- FJ2 (major, far reflection columns) and FJ3 (major, 'bibir air' lips): these are job B, new features, not fixes. They need a new job-B lane on
  top of this build. Re-measure wl2b's K = 2.6 with a distance-limited cap; break the columns with the mip-filtered lake_chop slope; give the slab
  feet a bilinear-footprint height or a distance field. Gate it on far-box blips <= GT, FAIR, and the real loop at T1 DPR 2. Merged and MAIN still look the same there.
- FJ4 (major, pre-existing): the left box against the GT in the stepped harness is +134 % (DPR 1) / +66 % (DPR 2) with the fix, against MAIN's +138 % / +71 %.
  The two harnesses pull in opposite directions (the real loop wants the band-limited share; the stepped harness prefers the pixel's).
  It needs a design decision on which test binds. Option: band-limit the SHADING normal's finest octaves by the per-frame camera step as well (the
  same wlN4 machinery). That changes the look of all near water, so it needs an A/B with the client.
- FJ5 (minor): the stair-stepped outline remains (lower contrast now). Option: the opt-in interpolated horizon read `?wl2gread=1` composes with
  WL2FJ (the shader builds with both, 0 errors, fix sh_read.json), but its look and blips were not measured here; re-check the 60 fps sparkle if it becomes the default.
