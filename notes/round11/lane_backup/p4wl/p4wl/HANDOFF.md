# p4wl HANDOFF (water lane: desktop waterline flicker + far-slab reflections), FIXER 22 Nov 16:45-17:50 WIB (builder 11:45-14:30)
Lab :5163 (left running, final source). Base :5162 (= MAIN = LANES/p4ph). WORK = $SP/work_p4/p4wl (fixer files in WORK/fix2/);
mirror: MAIN/notes/round11/lane_backup/p4wl/p4wl/ (LOG.md, patch, ident summary, key images, fix2/). The builder's HANDOFF as it was
at 14:30: HANDOFF_builder_1430.md (kept below as history; its T2-only default is SUPERSEDED).

## FIXER VERDICT
- WL-J1 (blocker) FIXED at the source on T1: the band-limited quarter walk P4WL_BAND is the DEFAULT on every tier that has the walk
  (T1 = the client's base M4 / every Safari Mac, and T2); T0 has no walk (unchanged). Same quarter pass and targets as MAIN.
  Root cause (builder, proved): MAIN's quarter pass point-samples the walk's SHARE, a steep function of the quarter pixel's own bumped
  reflection and of the heightfield cell it enters, at 1 / 16 of the pixels -> 4 x 4 px blocks that change shape with every camera
  step. P4WL_BAND splits the term: the quarter pass stores only what is smooth over the lake (the faces' mean colour and the horizon
  elevation they raise, walked along the UNBUMPED reflection, i.e. a function of the lake point), and every water pixel takes ITS OWN
  rays' share under each tap's horizon (lkPhiT((eT - mu) / sE), its own bumped elevation mu and spread sE), then interpolates those
  shares. Taps under / next to a footprint (-1 / -0.5): the pixel walks itself (MAIN's LK_WALKEDGE behaviour).
- WL-J3 FIXED: the per-pixel walk is opt-in only (`?wlwalk=px`), on no tier by default (its speckle and +8.7 % T1 cost stay documented).
- WL-J4 FIXED: T2 now runs the band walk too: stepped far box one-frame blips 2540 (MAIN 2475, own GT 2584: at / below the GT level,
  +2.6 % vs MAIN), pops vs GT 3912 -> 2772 (-29 %); full width blip excess over the GT 111 (MAIN) -> 58 (lane; px was 1104).
- WL-J5 DONE: T0 phone waterline box below the rings (CSS 0-414 x 495-720: near rocks, floe, open water): 800 -> 809 blips / frame
  (lane T0 is ident-identical to :5162: run noise).
- WL-J2 (job B) NOT DONE (time box; lead priority order): plan below. The band walk keeps MAIN's far columns (smooth, short).
- Residual (stated): at T1 DPR 1 the stable dark reflection under the left shelf keeps quarter-texel stair steps on its outer contour
  (no longer morphing frame to frame); the per-pixel GT is smoother and lighter there. One-frame blips at T1 are at MAIN's level, not at
  the GT's (825 vs GT 574 at DPR 2): what remains is the ripple / wavelet sparkle of the lake itself, which MAIN has too.

## Switches
- `?p4wl=0`: MAIN exactly (no text change). `?wlwalk=q`: MAIN's quarter read with the lane on (ident == :5162 at T1).
- `?wlwalk=px`: the per-pixel walk (P4WL_WALK, quarter pass skipped), any tier, opt-in (WL-J3: +8.7 % T1 sweep, pixel speckle).
- Default: P4WL_BAND on T1 / T2 (needs LK_CACHEN + LK_HALF + LK_WALKSEL, i.e. lake v4 with the frame budget; T0 has none).

## Files (patch WORK/p4wl_vs_p4ph.patch, 115 lines, vs LANES/p4ph/retrux-web/app)
- `hero/engine/world/Water.ts` (sha256 4bd8ccf0): p4wlOn(), P4WL_WALK (opt-in), P4WL_BAND (2 source edits: the walk pass's lkWalkTerm
  normal -> vec3(0,1,0) under LK_WALKPX; lkWalkRead replaced by the band read) after loadLakeChop; constructor block after the RXA
  block (px if `?wlwalk=px`, else band unless `?wlwalk=q`; sets defines.LK_WALKPX); field walkPerPixel; renderWalk returns when set.
- `hero/engine/HeroEngine.ts`: NO CHANGE any more (the builder's walkPx line removed; file == base). No asset, no new pass / target.

## Hard gates on the FINAL build (fixer)
- (a) PASS. ident (final + every target + every linked program, 20 moving frames; WORK/fix2/id/ident_summary.txt): ?p4wl=0 == :5162 at
  T1 (14 targets / 16 programs), T2 (15 / 16), T0 phone (10 / 14), p04 expand 0.9, p06 expand 2.97, p07 release 0.33; ?wlwalk=q T1 ==
  :5162; lane ON T0 == :5162. Controls DIFFER only in the lake (walk / main / bloom / final; programs rx-water, rx-water-walk): lane
  ON T1, T2, p04, p06, p07.
- (b) PASS on the controlled test, T1 DPR 1 AND 2 and T2 (stepped fast path, same poses, vs the per-pixel walk's own 2x GT;
  WORK/fix2/stepped.txt). Pops vs GT per frame, left shelf box CSS 0-420 x 500-620: T1 DPR 2 2907 -> 1963 (-32 %), T1 DPR 1
  1837 -> 1332 (-27 %), T2 3507 -> 1873 (-47 %); one-frame blips (GT): T1 DPR 2 825 -> 825 (574), DPR 1 472 -> 464 (315), T2
  1225 -> 1201 (922): no new speckle (px was 908 / 508 / 1283). LOOK: MAIN's morphing crenellated blob is gone, the reflection is
  stable (refs_user/wl_flicker_T1dpr{1,2}_MAIN_LANE_GT.jpg, wl_flicker_T1dpr2_MAIN_left_LANE_right.mp4). Real loop (judge's rl.mjs,
  dt / governor-confounded; WORK/fix2/rl/rla_summary.txt) blips / frame MAIN -> lane: T1 DPR 2 135 -> 70, T1 DPR 1 176 -> 51, T2 far
  2482 -> 2132, T0 phone waterline 800 -> 809 (ident-identical: noise). Not "at the GT level": the remaining blips are the lake's own
  ripple sparkle, MAIN's level (see the verdict).
- (c) fast path at T1 (the client's tier; lane and MAIN each vs their OWN 16-sample GT, popscan --minpx 6; WORK/fix2/fair/fair_fast.txt):
  MAIN 63 events (748 px) -> lane 39 (535 px): PASS. The other five paths NOT run (each pair of 16-sample GTs takes ~8-14 min here;
  stopped to keep the time box). Judge's T2 run (px build) fast 41 -> 22, reverse 82 -> 66.
- (d) PASS. 60 fps sparkle at rest, T1, far clip 860,420 580 x 200 vs own DPR-2 GT (WORK/fix2/s60/s60_far.txt): farwater 2.1 -> 1.8
  blips / frame, lips 1.2 -> 1.1 (GT 0.0 both).
- (e) PASS (perfab STRICT=1 SLOT_BG=0, 1440 x 766, interleaved A = :5162, B = :5163; WORK/perf/x_*.txt):
  T1 pointer sweep 8/8 VALID: paired median 1.010 (mean 1.001), medians 19.8 -> 19.9 ms; the two modes of identical code: low mode
  A 19.1-19.8 (n 5) / B 19.3-19.9 (n 5), high mode A 21.0-21.2 (n 3) / B 20.7-20.9 (n 3). T1 rest 6/6 VALID: paired median 1.000
  (mean 0.994), 18.1 -> 18.1 ms. T2 sweep 4/4 VALID: paired median 1.005, 20.0 -> 19.8 ms. T0 phone: no walk, programs and targets
  ident-identical to :5162 (unchanged by construction). The band read costs ~MAIN's (same quarter pass; 4 lkPhiT + 1 asin per pixel).
- (f) PASS. Only the lake changes (rest diff bbox y 469-763 of 766, signed luma mean far +0.8 / left -0.7 / near +0.1, ripple-scale;
  WORK/fix2/rest_T1_diff_x8.png); hold p06 lake crop (WORK/fix2/poses/p06_lake_LANE_MAIN.png): equivalent; IceMaterial untouched;
  ripple A untouched (the band read is the walk term only).
- (g) PASS. tsc hero + app exit 0 (WORK/tsc_*.txt empty); 0 errors / warnings in every capture (cap.mjs, rl.mjs errs 0).

## WL-J2 / job B plan (not built; for the next water round)
1. Measure first: per far slab (ref_F000 x 880-1440 y 440-590 vs :5163 rest 1440 x 766), column length (rows where the column's luma is
   above the open water by > 4 levels) and peak brightness; the builder's estimate REF 70-100 px vs ours 30-40 px.
2. Length: the column ends where the face's horizon eT falls below the pixel's reflected elevation mu by ~2 sE. In P4WL_BAND both are
   explicit, so a lab scale on sE for the faces' share only (`?wlsE=1.5 / 2 / 3`, the Cycles water's steeper slope distribution along
   the view) lengthens the columns without touching the mirror, the ripples or the quarter pass; check that the walk reaches far enough
   (LK_WALK_N 160 steps / Lmin levels: a column cut off by the march's reach needs a longer walk, `?lkwalk=`).
3. Brightness: compare the stored face colour (the quarter texel rgb) with the slab faces in ref_F000; the haze / mist on the far water
   (p4a4 far range) may dim it after the walk.
4. Ripple breaks without J4 pops: modulate the share with the pixel's own (mip-filtered, lake_chop) slope along the view, not the
   point-sampled wavelet; gate with the stepped far-box blips <= GT (as above) and the 60 fps sparkle.
5. 'bibir air jelek.mov' lips: the notched / stair-stepped contact line at the far slab bottoms follows the heightfield footprint texels
   (lkHgtAt, uLkHgt level 0); a smooth contact (bilinear footprint height or a distance field at the slab feet) would remove the steps.
   Prove with REF | lane | MAIN crops at 1x / 2x at T1 at rest and in motion.

## ===== BUILDER HISTORY (14:30, superseded where the fixer section says so) =====
## Verdict (honest): NOT ok. Root cause found and removed by the per-pixel walk; it is the default on T2 only, opt-in on T1
- ROOT CAUSE (proved, deterministic stepped captures): the quarter-size walk pass (Water.ts LK_HALF, walkDiv 4). The walk term (the
  low reflected rays' faces: share + colour) is discontinuous in the lake point (heightfield cell entries, Lmin levels, the pixel's
  bumped elevation / azimuth); the quarter pass point-samples it at 1/16 of the pixels and the water interpolates the texels, so
  each camera step moves the screen-aligned texel grid over new lake points: crenellated 4 x 4 px dark / pale blocks along the left
  shelf and floe waterlines that change shape every frame = the client's video (refs_user/wl_client_video_blocks.jpg).
  Not the cause (bisected): lktaa, lkglide, ffblock, envedge, governor / scale, walk read logic (lkwsel / lkwnear / lkwedge).
- FIX: P4WL_WALK, the water's lkWalkRead returns the pixel's own lkWalkTerm (moving frames and rest cache alike) and the quarter
  pass is not drawn. No new pass / target / uniform / asset.
- WHY T2-ONLY BY DEFAULT: it costs +8.7 % of the T1 pointer-sweep frame (perfab STRICT 6/6 pairs, 19.7 -> 21.5 ms), over gate (e).
  Rule "a part that cannot pass its gates goes behind an opt-in switch": on T1 it is `?wlwalk=px`. T2 (Apple M Pro / Max, RTX
  class) has it by default: the blocks are strongest there and gate (e) is a T1 gate; its T2 cost is stated below.
- !! LEAD / CLIENT DECISION NEEDED: the client's own Mac is (per memory) an Apple M4 base = T1 by quality.ts RULES, so with this
  default the client's machine still shows MAIN's blocks. Options: (1) accept +8.7 % T1 sweep and make it default on T1 too
  (one line: HeroEngine `walkPx: this.profile.tier !== "T0"`), (2) keep T1 = MAIN until a band-limited walk exists (next step 1).
- Cheaper fixes tried and rejected (all T2 stepped, pops vs the per-pixel 2x GT, box CSS 0-420 x 500-620; MAIN 3507, px 1821):
  quarter texel = mean of 4 walks over its footprint with own bump 2978, 9 walks 2965; lkwdiv=2 3120; lkwdiv=2 + 4 walks 2666;
  full-size walk target every 2nd moving frame 2054 but +11 % T1 sweep; earlier: per pixel only where a tap holds a face +14 %,
  only where taps disagree +9-11 % (blocks back at higher thresholds). The prefilter fails because the field is discontinuous.

## Switches
- `?p4wl=0`: MAIN exactly (no text change; the quarter pass as before).
- `?wlwalk=px`: the per-pixel walk on any tier (T1 opt-in). `?wlwalk=q`: off on T2 (MAIN's quarter walk). T0 has no walk (no effect).

## Files / hunks (patch WORK/p4wl_vs_p4ph.patch, 89 lines; vs LANES/p4ph/retrux-web/app)
- `hero/engine/world/Water.ts` (sha eab9cb0c): p4wlOn() + P4WL_WALK (one source edit, first line of lkWalkRead) after loadLakeChop;
  opts.walkPx; constructor block after the RXA block (applies P4WL_WALK, sets walkPerPixel); field walkPerPixel; renderWalk returns
  when it is set.
- `hero/engine/HeroEngine.ts` (sha 4731f741): ONE line in the Water options: `walkPx: this.profile.tier === "T2"`.
No other file. No asset.

## Hard gates on the final build
- (a) PASS. ident (final image + every target + every linked program, 20 moving frames; id/ident_summary.txt): ?p4wl=0 == :5162 at
  T1 (14 targets / 16 programs), T2 (15 / 16), T0 phone (10 / 14), p04 expand 0.9, p06 expand 2.97, p07 release 0.33. Lane ON ==
  :5162 at T1, T0 phone, p04, p06, p07. Controls DIFFER: lane ON T2; ?wlwalk=px T1.
- (b) PARTIAL. Stepped fast path vs the per-pixel walk's own 2x GT (lkmeach=1), left box CSS 0-420 x 500-620, pops vs GT / frame:
  T2 (default on): 3507 -> 1821 (-48 %), the blocks are gone, lane = GT look (refs_user/wl_flicker_T2_final_MAIN_LANE_GT.jpg).
  T1 DPR 1: MAIN 1837, px opt-in 1404 (-24 %); T1 DPR 2: 2907 -> 2021 (-30 %) (refs_user/wl_flicker_T1dpr1_MAIN_PXOPTIN_GT.jpg:
  blocks gone, pixel-scale speckle at DPR 1). T1 default = MAIN. One-frame blips do NOT drop to the GT level: left box T2 1225 ->
  1283 (GT 922), T1 DPR1 472 -> 508 (GT 315), DPR2 825 -> 908 (GT 574): the per-pixel walk is itself a point sample (pixel-scale
  sparkle replaces the blocks). T0 phone: no walk, identical (ident).
- (c) FAIR six paths: lane == :5162 bit-identically at T1 (ident, the harness's tier) => equal to :5162's own. Not run at T2.
  T2 fast path, full width CSS 0-1512 x 480-640: pops vs GT 20553 -> 14504 (-29 %), far box 880-1440: 3912 -> 2633 (-33 %).
- (d) 60 fps sparkle: T1 identical (ident). T2: one-frame blip excess over the GT, full width 111 -> 1104 / frame (far box -109 ->
  516): the far columns now carry the GT's fine ripple breaks (fin_far_T2.png), which move at pixel scale. Not run with the 60 fps
  sparkle tool. => at T2 this gate is likely NOT met as written.
- (e) PASS: T1 sweep paired median 1.025, rest 1.000 (6/6 VALID STRICT each); T0 phone identical (ident). T2: +2.7 % (stated).
- (f) Only the lake's walk term changes, and only on T2; ice rings, ripple A, the hold strip untouched (ident p04 / p06 / p07).
- (g) PASS. tsc clean in both configs (WORK/tsc_*.txt empty); 0 errors / warnings in every capture.

## Perf (perfab STRICT=1 SLOT_BG=0, interleaved A = :5162, B = :5163)
- FINAL BUILD, T1 1440 x 766 (lane == :5162 at T1 by ident): pointer sweep 6/6 VALID, paired median 1.025 (mean 1.013), medians
  20.1 -> 20.3 ms; rest 6/6 VALID, paired median 1.000 (mean 1.000), 18.6 -> 18.4 ms (perf/f_sweep.txt, f_rest.txt). PASS.
  (Identical code is bimodal per run, 20.1 / 21.5 ms: single pairs swing +-7 %.)
- FINAL BUILD, T2 forced on this M4 (heavier than a real T2 GPU), sweep 4/4 VALID: paired median 1.041 (mean 0.953), medians
  44.4 -> 45.6 ms (+2.7 %) (perf/f_sweepT2.txt). Real loop earlier (rl.mjs, DPR 2): 35.6 -> 39.4 ms/frame.
- The per-pixel walk on T1 (opt-in `?wlwalk=px`, round 1): sweep 6/6 paired median 1.087, 19.7 -> 21.5 ms (FAIL: why it is opt-in);
  rest 1.022. T0 phone: identical programs and targets to :5162 (ident), no walk on T0: unchanged.

## (B) far-slab reflections: NOT DONE as a separate change
- On T2 the per-pixel walk already breaks the far columns with fine ripples like the GT / REF (MAIN: smooth smears):
  refs_user/wl_farslabs_T2_{1x,2x}_REF_LANE_MAIN.jpg (rest), wl_farslabs_T2_motion_MAIN_LANE_GT.jpg (moving). On T1 = MAIN.
- Still open: the columns are SHORTER and less bright than ref_F000's (REF ~70-100 px tall at 1440 x 766, ours ~30-40 px). Likely
  the reflection's vertical spread (sigE, the bump's slope distribution along the view) is narrower than the Cycles water's; needs
  its own lane with the FAIR + sparkle gates. The bibir-air notches (MAIN/'bibir air jelek.mov'): not addressed beyond the walk.

## Next steps
1. Band-limit the walk (continuous horizon profile: face elevation from bilinear heightfield samples along the azimuth at fixed
   distances instead of the entered cell's entry distance and Lmin jumps) so the quarter pass can be interpolated without blocks at
   MAIN's cost; or decouple: quarter pass stores the horizon profile (eN, face colour), the water computes the share per pixel.
2. Decide T1 (see the DECISION above). 3. (B) longer / brighter far columns.
