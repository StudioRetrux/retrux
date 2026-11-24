# wl2b HANDOFF (water round 2, job B = WL-J2: far reflection columns + slab-foot lips), BUILDER 22 Nov 18:11-19:50 WIB
Lab :5166 (left running, final source). Base :5163 (= LANES/p4wl, frozen). MAIN's water :5162. WORK = $SP/work_p4/wl2b;
mirror: MAIN/notes/round11/lane_backup/p4wl2/wl2b/ (LOG.md, HANDOFF.md, patch, img/, numbers).

## VERDICT: ok = false (honest). Job B is NOT met by the default build.
- Longer / brighter far columns (WL2B_K) are BUILT and measured, but OPT-IN (`?wl2bk=2.6`): rest T1 far slabs x 900-1440
  column length median 53 -> 60 px (REF 82, MAIN 50), excess over the open water 20 rows below the feet 16.2 -> 21.2 levels
  (REF 22.3); T2 57 -> 65 / 15.0 -> 19.4. Why not default: on the screen-space quarter grid the longer tails expose the stored
  horizon's quarter-texel steps = a NEW stair-stepped notch under the slab ends (img/notch_T2_REF_MAIN_K26_K26nolip_K1.png, rows
  REF | MAIN | K2.6 | K2.6 no lip | K1), and the far box's one-frame blips rise +6.2 % (stepped fast T1 DPR 2: 1373 -> 1458 / frame;
  excess over its own 2x GT 34 -> 89; pops vs GT +19 %; img/far_blipdiff.png: ripple-scale specks in the longer tails and one
  narrow column toggling). Both are WL-RJ1's mechanism (point-sampled horizon on a sliding quarter grid) shown over more rows:
  re-test `?wl2bk=2.6` on top of the RJ1 winner (wl2g / wl2f); expected to clear, NOT proven.
- Column breaks like the Cycles bump (WL2B_G, own lake_chop sampler, textureGrad footprint): OPT-IN `?wl2bg=1&wl2bk=2.6`: coarse
  bars at a 60 m tile, 1-px dark scanlines at a 10 m tile with gain >= 1 (img/far2x_cde.png, far2x_fgh.png): not shippable.
- DEFAULT = p4wl + (1) the walk's face cap 4 -> 8 faces and (2) the bisected slab-foot lip. (1) is a real gain for the left side
  (found while gating K: the 4th face stopped the walk short of taller faces behind, so the stored horizon jumped tap to tap =
  pale holes popping in the far-left shelf reflection, img/leftfar_frames.png): stepped fast T1 DPR 2 left box one-frame blips
  1292 -> 885 / frame (-32 %), far box 1373 -> 1370 (=), shelf box = (numbers of the final default: see 'Gates' below).
  (2) the lip: measurable effect ~0 (blips) and a small look change; the 'bibir air' notches in motion are NOT proven fixed.
- THE BAR (5) FAIR six paths: NOT run (time box; machine load 30-198 from Photoshop + the wl2g / wl2f FAIR GT jobs).
- THE BAR (3) perf: see 'Gates' (the 8-pair A/B could not get valid pairs while the load was >= 10).

## Switches
- `?wl2b=0`: p4wl exactly (no text, no define, no fetch). `?p4wl=0`: MAIN exactly (unchanged).
- `?wl2bh=<cap - 0.5>` (default 7.5 = 8 faces; `?wl2bh=3.5` = p4wl): the walk's face cap (every walk of the lane: quarter pass +
  per-pixel fallbacks).
- `?wl2blip=0`: no lip refine.
- `?wl2bk=<K>` (default 1; opt-in 2.6): the faces' spread along the view (sig.y x K) beyond `?wl2bd0` .. `?wl2bd1` m (default 25 ..
  35, smoothstep), in the band read AND the quarter pass (hit threshold, band filter).
- `?wl2bg=<gain>` (opt-in, e.g. 1; with `?wl2bt=<tile m>`, default 10): the column breaks (fetches public/hero/lake_chop.png,
  81,568 B, its own sampler uWl2bChop; the lake passes redraw once it is in; the hold chop stays unfetched).

## Files (patch WORK/wl2b_vs_p4wl.patch vs LANES/p4wl/retrux-web/app; 4 hunks, ALL pure insertions)
- `app/hero/engine/world/Water.ts`:
  1. new block after P4WL_BAND (before walkHalfWanted): doc comment, `wl2bOn()`, `WL2B_BAND` (2 edits: a block inserted at the
     top of the band read `lkWalkRead`, right after its first comment line `// p4wl: the band-limited read (P4WL_BAND)`: the
     opt-in breaks + `lkSig.y *= mix(1, K, far)`; one line after the walk pass's `vec3 n0 = lkBump(...)`: `sg0.y *= ...`) and
     `WL2B_LIPS` (a block after `float dF = d;` in lkWalkTerm's LK_HMIN branch: the face distance where the bilinear level-0
     height crosses half the cell's top, 6 bisection steps in [d - 0.3, dExit + 0.3] m; keeps d when not bracketed).
  2. field `wl2bChop` + `setWl2bChop()` before `setChopTile`.
  3. constructor, right after the P4WL_BAND `if / else if` block: applies WL2B_BAND (defines WL2B_K / D0 / D1), the face-cap edit
     on `      if (Fc > 0.995 || hits > 3.5) break;`, WL2B_LIPS, and the opt-in breaks (defines WL2B_G / T, uniform uWl2bChop).
- `app/hero/engine/HeroEngine.ts`: one block before `if (mirror && this.water.scheduled)`: fetch lake_chop.png only when the
  opt-in breaks are on, hand it over, `lakeSched.invalidate()`.
- MERGE NOTES: the RJ1 lanes change the band read / quarter pass. My anchors: (i) the band read's header + first comment line,
  (ii) `    vec3 n0 = lkBump(vWorldPos, wDx0, wDy0, kDof0, sg0);` in the walk pass, (iii) `        float dF = d;` and
  `      if (Fc > 0.995 || hits > 3.5) break;` in lkWalkTerm. If a winner rewrites these lines, re-anchor; the intent: "face cap 8",
  "faces' share spread x K beyond 25-35 m in whatever stores / reads the horizon", "lip: continuous face distance".
- No new pass / target / asset (the opt-in breaks reuse the shipped lake_chop.png). IceMaterial untouched.

## Gates on the FINAL default build (K 1, cap 8, lip; Water.ts sha256 8b457f5e, HeroEngine.ts 08fac54a)
- (6) ident PASS (WORK/idf/ident_summary.txt; final image + every target + every linked program, 20 moving frames): ?wl2b=0 ==
  :5163 and ?p4wl=0 == :5162 IDENTICAL at T1 (14 targets), T2 (15), T0 phone (10), p04 expand 0.9, p06 expand 2.97, p07 release
  0.33; lane ON at T0 == :5163 (T0 has no walk: phones unchanged); control lane ON T1 differs (walk, main, ...).
- (1) / (2) stepped fast path T1 DPR 2 (1440 x 766 css, buffer 1800 x 957, 60 frames), one-frame blips thr 12 and vs each build's
  own 2x GT (lkmeach=1, 2880 x 1532 css @ 1.25) (WORK/bl/gt_fast_T1d2_final.txt), p4wl :5163 -> lane:
  left box 0-420 x 470-620: blips 1292 -> 885 (-32 %), GT 705 | 564, excess 587 -> 320, pops vs GT 9220 -> 7066 (-23 %);
  shelf water 280-480 x 440-520: 312.0 -> 308.6, excess 8.1 -> 5.7, pops 274 -> 219 (-20 %);
  far 880-1440 x 430-590: 1372.6 -> 1370.0, excess 33.7 -> 32.1, pops 5307 -> 5233 (-1.4 %). Not worse anywhere.
  LOOK: client/wl2_wl2b_leftfar_T1dpr2_motion_P4WL_LANE.png (far-left shelf reflection, frames 20-23, p4wl top / lane bottom:
  p4wl's crenellated pale notches that reshape every frame are mostly gone in the lane; some remain at the right of the crop) and
  client/wl2_wl2b_shelfwater_T1dpr2_motion_P4WL_LANE.png (the RJ1 band: the dark band under the floe is less notched).
  Not run: the RJ1 same-pose sheet MAIN | p4wl | lane | px | GT at DPR 1 (not this lane's goal; the RJ1 lanes own it).
- (7) tsc clean in both configs (WORK/tsc_hero.txt, tsc_app.txt empty, exit 0); 0 console errors / warnings in every capture;
  ice rings untouched (IceMaterial not edited; only the lake's walk changes: control ident differs in walk / main only).
- rest look: columns = p4wl's (cols len 53 / exc20 16.1 vs p4wl 53 / 16.2): the default does not change the far columns.
- (3) perf: NOT MET as written (no VALID pair). perfab STRICT=1 SLOT_BG=0, T1 1440 x 766 pointer sweep, interleaved A = :5162,
  B = :5166 (WORK/perf/final_sweep.txt): 3 pairs ran in 18 min, every one flagged invalid (load >= 10 or another lane's perf /
  FAIR GT job during the run: wl2f:perf-sweep2, wl2g / wl2f fair-*-gt). Indicative medians A | B: 21.7 | 23.8 (A run loaded
  10-14), 20.9 | 21.8, 21.1 | 21.1 -> paired median 1.043 (both modes not separable with n = 3). The face cap 8 lets walks run
  past the 4th face (quarter pass + per-pixel fallbacks), so a cost is plausible: MEASURE IT on a quiet machine (>= 8 pairs) before
  merging; `?wl2bh=3.5` is the zero-cost fallback (= p4wl's walk).
- (4) 60 fps sparkle at rest, T1, far clip 860,420 580 x 200, 40 frames at 1/60 s, vs own DPR-2 GT (WORK/s60/s60_far.txt):
  farwater p4wl 1.9 | lane 1.8 blips / frame (GT 0.0 | 0.0), lips 1.1 | 1.2 (max 3 | 4; GT 0.0 | 0.0): equal within run noise.
- (5) FAIR six paths: NOT run (time box + machine load). The stepped fast-path numbers above are the only temporal evidence.

## Client files (MAIN/notes/round11/refs_user/)
- Default build (cap 8 + lip), p4wl top / lane bottom, frames 20-23 of the stepped fast path at T1 DPR 2:
  wl2_wl2b_leftfar_T1dpr2_motion_P4WL_LANE.jpg, wl2_wl2b_shelfwater_T1dpr2_motion_P4WL_LANE.jpg.
- OPT-IN `?wl2bk=2.6` (the longer columns; NOT default, see the verdict), REF | lane | MAIN: wl2_wl2b_k26optin_far_T1_{1x,2x}_*,
  wl2_wl2b_k26optin_far_T2_{1x,2x}_*, wl2_wl2b_k26optin_left_T1_1x_*; motion MAIN | lane at T1 DPR 2 (medium path, far slabs):
  wl2_wl2b_k26optin_far_T1dpr2_MAIN_left_LANE_right.mp4 + _motion_strip_MAIN_LANE.jpg.

## Open / next
1. Integrator: the face cap 8 (`?wl2bh`) is a cheap gain on the RJ1 symptom (left box -32 %, pale holes in the far-left shelf
   reflection gone); measure it on top of the RJ1 winner and with its cost (perf above).
2. Re-test `?wl2bk=2.6` on the merged build (RJ1 winner + this): the notch under the slab ends and the far-box +6 % are expected
   to follow the quarter-grid fix; if they do, make it the default (columns: length 53 -> 60, REF 82; excess 16 -> 21, REF 22).
   Longer still (K 3: length 72) costs the same way.
3. Column breaks: the tilt-by-chop route gives scanlines; a better route is breaking the SHARE (not the normal) with a soft,
   footprint-filtered multiplier in the tail only (F x (1 - a * chop^2 band-limited)), gated by the far-box blips vs GT.
4. Lips (bibir air): measure the notches in motion with a dedicated same-pose crop sheet of the far slab feet at 4x (T1 DPR 2),
   MAIN | p4wl | lane | GT; the lip refine is in but unproven.
