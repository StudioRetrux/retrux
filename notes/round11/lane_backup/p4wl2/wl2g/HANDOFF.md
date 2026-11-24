# wl2g HANDOFF (water round 2: WL-RJ1, the walk anchored in lake space), BUILDER 22 Nov 18:11-19:50 WIB
Lab :5164 (left running, final source). Base :5163 (= LANES/p4wl, frozen); MAIN's water :5162. WORK = $SP/work_p4/wl2g (LOG.md);
mirror: MAIN/notes/round11/lane_backup/p4wl2/wl2g/ (LOG.md, patch, ident / blip tables, img/, tools/).

## VERDICT (self-gate): ok = false
- WL-RJ1's morphing contour is GONE at T1 DPR 1 and DPR 2 where the client looks (same-pose sheets below, looked at): the
  shelf's dark reflection right of the left shelf keeps its outline and slides with the camera; MAIN and p4wl redraw it every frame.
- THE BAR item (2) FAILS for the LEFT box: one-frame blips 577 vs GT 325 at DPR 1 (+78 %), 1055 vs 818 at DPR 2 (+29 %). The
  shelf-water box passes (+7 % / +2 %), the far box is below :5163. The left box's excess is the lake's own ripple / wavelet
  sparkle (MAIN 774, p4wl 590, the per-pixel walk 711): it is not the walk read and this lane does not touch it.
- THE BAR item (3) NOT PROVEN: the STRICT perf A/B got 0 valid pairs in the time box (wl2b / wl2f perf and FAIR jobs held the
  slots; 3 pairs ran, all invalid, stopped 19:48 so it does not disturb the judges). Cost estimate only: the walk pass draws ~1.8x
  the quarter pass's texels (oversampling 1.35^2, under a scissor) and walks twice (azimuth lattice) = ~3.6x p4wl's walk pass; the
  water program is p4wl's. Round 1 put the whole per-pixel walk (16x the quarter texels) at +8.7 % of the T1 sweep frame, i.e. the
  quarter pass at ~0.5 %: expect ~+1.5-2 % T1 sweep. `?wl2gaz=0` halves it (one walk; FIX 1 alone was already stable in the
  sheets), `?wl2gs=1` drops the oversampling (more re-anchors). The judge must measure it.

## Root cause (measured) and what the lane does
1. Round 1's re-judge: the quarter walk's texel grid lives in screen space and slides over the lake. FIX 1 (anchor): the walk pass
   rasterises the lake through a FIXED anchor view-projection (uLkWalkAP in a walk-only vertex shader) while it still walks from
   the frame's own camera (cameraPosition); the water reads the texels through the same matrix (uLkWalkVP). Every lake point keeps
   its texel. Anchor = the camera at anchor time, frustum widened by the guard 1.25, target = quarter size x 1.25 x 1.35 (texel =
   0.74 quarter texel at the anchor pose). Re-anchored only when the frame's lake (9 x 9 screen probe on the lake plane / horizon)
   leaves the target or sigma_max of the anchor texel in the frame's quarter texels exceeds 1.0 (= the texel never exceeds the
   frame's quarter texel), and on a resize. The pointer orbit moves the camera +-1.8 m in x and 10.0-11.8 m in z (measured), so
   re-anchors do happen: fast path 4 / 300 frames, diag 3 / 300; the intro fly-in and the hold dolly re-anchor as they need.
   A scissor keeps the pass to the frame's own lake + 4 texels.
2. Measured after FIX 1: the anchored texels still changed value with the camera: each texel walked the frame's azimuth, and the
   horizon jumps wherever a slightly turned ray enters other heightfield cells (E = F - F(px) sheets, st/E_d1_shelf.png). FIX 2
   (walk pass only): two walks at FIXED azimuths of a 4 mrad lattice that bracket the view's azimuth, blended by its fraction:
   each texel's horizon / face colour is a continuous function of the camera (a walk without a face counts as emin, no share).
3. Tried, OPT-IN only (`?wl2gread=1`, WL2G_READ): interpolate the four taps' HORIZON and take the pixel's share once (a smooth
   iso-line). On the lake-fixed taps it looked the same as P4WL_BAND's per-tap read (WORK st/s3_zoom.png) and added a little 60 fps
   sparkle at rest (same session: shelf water 0.2 -> 0.4, far lips 1.1 -> 1.3, far water 1.6 -> 1.8 blips / frame), so the default
   keeps P4WL_BAND's per-tap read: the water program is byte-identical to p4wl's; only the walk pass changes.

## Switches
- `?wl2g=0`: :5163 exactly (no text change: the band walk as p4wl). `?p4wl=0`: :5162 exactly (unchanged).
- Lab: `?wl2gaz=0` (no azimuth lattice = FIX 1 only), `?wl2gaz=<rad>` lattice step (0.004); `?wl2gread=1` (WL2G_READ, opt-in);
  `?wl2gg=` guard (1.25), `?wl2gs=` oversampling (1.35), `?wl2gt=` scale tolerance (1.0).
- Active only where P4WL_BAND is (T1, T2 with the quarter walk); T0 has no walk: unchanged (ident).

## Files (patch WORK/wl2g_vs_p4wl.patch, 338 lines, vs LANES/p4wl/retrux-web/app; mirrored)
- `hero/engine/world/Water.ts` ONLY (sha256 d94c26c2). Parts: after P4WL_BAND: wl2gOn, WL2G_* constants, wl2gWalkFrag (walk pass
  source edit: the azimuth lattice), WL2G_READ (P4Edit on P4WL_BAND's read), wl2gWalkVert; constructor band branch (+ the wl2g
  block: walkAnchored, lab params, WL2G_READ); walk material (uLkWalkAP uniform, WL2G_AZ define, own vertex / fragment source);
  fields; setWalkSize (anchored target size); renderWalk (-> renderWalkAnchored); new wlProbe + renderWalkAnchored.
- NOT changed: HeroEngine.ts, LakeMirror.ts, LakeSchedule.ts, RenderPipeline.ts, IceMaterial.ts; no asset, no new pass / target
  (the walk target is larger: e.g. 608 x 324 instead of 360 x 192 at 1440 x 766 DPR 1; drawn under a scissor).
- Merge note for wl2f / wl2b: by default wl2g changes only the WALK PASS (its vertex shader: wl2gWalkVert; its output lines:
  wl2gWalkFrag, a text edit on P4WL_BAND's walk-pass line, applied to the walk material's own copy of the source) and the walk
  target / renderWalk on the TS side; the water program is p4wl's. wl2f also edits the walk pass's stored value: the two meet in
  the walk-pass lines `vec4 wT = lkWalkTerm(...)` / `gl_FragColor = lkHits > 0.5 ? ...` (wl2gWalkFrag throws if its anchor moved).

## THE BAR on the FINAL build
1. PASS (looked, final build 4). Same-pose stepped fast path, frames 98-101, shelf band CSS 290-400 x 455-495, contrast x4, zoom 5-6, + frame
   diffs: DPR 1 refs_user/wl2_wl2g_contour_x6_MAIN_P4WL_LANE.jpg (rows MAIN | p4wl | lane), DPR 2
   refs_user/wl2_wl2g_contour_T1dpr2_x5_MAIN_P4WL_LANE.jpg; MAIN / p4wl diffs show filled patches (teeth switching on / off),
   the lane's only thin 1-px edge lines (the same outline sliding). With px and GT: WORK st/s3_zoom.png, st/s2_shelf.png.
2. FAIL (left box). Blips / frame thr 12 (MAIN | p4wl | lane | px | GT = :5163 ?wlwalk=px&lkmeach=1 2x):
   DPR 1: left 774 | 590 | 577 | 711 | 325; shelf 216 | 206 | 205 | 222 | 192; far 1101 | 990 | 977 | 1173 | 920.
   DPR 2: left 1305 | 1075 | 1053 | 1270 | 818; shelf 345 | 329 | 328 | 340 | 323; far 1782 | 1581 | 1569 | 1891 | 1645.
   (final build 4; WORK st/d1_blips.txt, st/d2_blips.txt; DPR 2 boxes end at CSS y 613: the capture rows 380-766 of the 958 buffer)
3. NOT PROVEN (see VERDICT). WORK perf/sweep.txt: pairs 0-2 invalid (A 21.9 / 19.6 / 20.5 ms, B 20.5 / 40.3 (another job) / 22.1).
4. PASS (same session, T1 rest, 40 frames at 1/60 s, WORK s60/s60b.txt; lane = ?wl2gread=0, the final default's exact code path):
   far water / lips blips per frame MAIN 2.0 / 1.2 | p4wl 1.7 / 1.2 | lane 1.6 / 1.1 (own DPR 2 GT 0.0 / 0.0); left box (CSS 0-560 x
   430-630) left water / shelf water MAIN 2.1 / 0.2 | p4wl 2.0 / 0.2 | lane 2.1 / 0.2 (GT 0.1 / 0.0). (The build-4 re-run of the
   lane rows was queued but stopped with the perf chain at the time box.)
5. PASS on all six paths (WORK fair/fair_G.txt; lane vs its own 16-sample 2x GT lkmeach=1, popscan --minpx 6, events / px;
   MAIN :5162 vs its own GT from the re-judge (fast, reverse) and wl2f (slow, medium, diag, leave)): slow 31 / 217 (MAIN 41 / 293),
   medium 57 / 701 (73 / 910), fast 43 / 555 (63 / 748), diag 31 / 452 (39 / 527), reverse 77 / 1217 (103 / 1427), leave 44 / 476
   (52 / 645). Every path below MAIN (gate: <= MAIN + 10 %). (p4wl :5163, re-judge: fast 39 / 535, reverse 81 / 1241.)
6. PASS. ident (final + every target + every linked program, 20 moving frames): ?wl2g=0 == :5163 and ?p4wl=0 == :5162 IDENTICAL at
   T1, T2, T0 phone, p04 expand 0.9, p06 expand 2.97, p07 release 0.33; lane ON T0 == :5163; control lane ON T1 differs.
7. Ice look unchanged (IceMaterial untouched; only the lake's walk term changes: ident control differs only in walk / main /
   post); T0 unchanged (ident); tsc hero + app exit 0; 0 console errors / warnings in every capture and ident run.

## Re-anchors (stepped probe, WORK tools/probe5.mjs, 0 errors): T1 fast 4 / 300 frames (the sweep's extremes), T2 hold 4 (dolly
start, release), T1 holdpan 4. The pointer orbit moves the camera +-1.8 m in x and 10.0-11.8 m in z.

## Evidence paths
WORK/st (d1_* / d2_* same-pose captures, d1_blips.txt, d2_blips.txt, *.png sheets), WORK/id, WORK/fair, WORK/s60, WORK/perf,
WORK/client; client files MAIN/notes/round11/refs_user/wl2_wl2g_{1x,2x}_MAIN_LANE.jpg, wl2_wl2g_contour_*.jpg,
wl2_wl2g_T1dpr2_MAIN_left_LANE_right_halfspeed.mp4 (stepped fast path at T1 DPR 2, 120 frames played at 30 fps).

## Open
- The left box's ripple / wavelet sparkle (2x the GT in every build, MAIN included): a bump band-limit job, not the walk.
- Re-anchors (fast sweep: one every ~75 frames at the sweep's extremes) still redraw the contour once each; a cross-fade of two
  anchors over a few frames would hide them (2 walks during the fade).
- Rest look: the anchored texel is finer (0.74 quarter texel) and the read sharper: the dark shelf reflection is a little crisper
  than p4wl's at rest.
