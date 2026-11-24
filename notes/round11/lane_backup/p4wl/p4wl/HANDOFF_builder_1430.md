# p4wl HANDOFF (water lane: desktop waterline flicker + far-slab reflections), builder, 22 Nov 2026 11:45-14:30 WIB
Lab :5163 (left running, final source). Base :5162 (= MAIN = LANES/p4ph). WORK = $SP/work_p4/p4wl; mirror:
MAIN/notes/round11/lane_backup/p4wl/p4wl/ (LOG.md, patch, ident summary, key images). The cloned base's HANDOFF is HANDOFF_p4ph_copy.md.

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
