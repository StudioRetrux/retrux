# AA3 lane log (water anti-aliasing, 20 Nov)
LANE = ~/Library/Caches/retrux-lanes/aa3 (edit), BASE = ~/Library/Caches/retrux-lanes/aa3_base (never edit)
WORK = $SP/work3/aa3 (media; wiped by reboots). Backup (patch + log only) = MAIN/notes/round11/lane_backup/aa3/
Labs: lane :5181, base :5182. Headless Chrome only via slot.mjs.

## 0. Start (11:16)
- No prior AA3 LOG in the backup folder: first attempt. LANE == BASE (diff -rq app, hero-lab: identical).
- Read: HeroEngine (aaResolve = msaaBaked && !mirror), RenderPipeline (aaRegion, blit expand), EnvEdge (arm triangle,
  3x3 Gaussian sigma 0.6 at depth jumps in plate encoding, expand), chunks GLSL_AA_RESOLVE (K 0.5), LakeMirror, LakeSchedule
  (mirror every 3rd moving frame = mirrorEvery 3; walk every moving frame), Water.ts r12 path (walk/cache/strata, LK_STALEFIX),
  PlateEnvironment mirror pass (raw colour + path length, returns BEFORE the AA compress), PostChain FXAA (T0).
- Facts: mirror pass, walk pass, cache passes all run before pipeline.render (writer plane off = (0,0,1)) and the baked
  mirror-pass branch returns before the compress -> step A cannot change the mirror target (to be verified bit-exact).
- No numpy on this Mac: analysis in node (raw RGBA from gl.readPixels in-page, deterministic stepping of __hero.frame).

## A. Tone-compressed resolve on the mirror lake (11:23)
- HeroEngine: `aaResolve = msaaBaked && aaresolve != 0` (dropped `!mirror`). Nothing else needed: setAAResolve already reaches
  the water, baked, plate and cloud materials; the walk / cache / cacheN materials copied their defines at construction (no
  AA_RESOLVE) and return before the compress anyway.
- ident.mjs (20 moving frames, medium path, mirror drawn 8x): mirror / walk / cache / cacheN / hero-reflection target hashes
  IDENTICAL for base, lane, lane ?aaresolve=0. Final image: lane ?aaresolve=0 == base (same hash); lane differs (intended).
- Linked programs (14, preprocessed sources as attached): lane ?aaresolve=0 == base, all 14; lane default differs in exactly
  rx-plate-baked, rx-cloud, rx-water, rx-env-edge, rx-blit (the AA_RESOLVE define).

## Measurement rig (11:20-12:10)
- tools/cap.mjs: window.__hero.start patched to a no-op before main.ts runs (init script), so every session is the same
  deterministic simulation (warm-up, settle 6 s, then one __hero.frame(1/60) per frame with a scripted debug pointer / press
  events); pixels read with gl.readPixels from the drawing buffer right after the frame (no DOM overlay, no PNG). Mask
  session (--mask, BASE): per frame the lake drawn flat black and flat white (coverage: >128 lake, 16..128 partial) + the
  hero hidden (hero mask) -> band = lake/solid boundary +-3 px minus the dilated hero. Mask-session frames == plain capture
  frames (0 differing bytes): the extra renders do not disturb the state. Lane / base camera poses identical (checked per frame).
- GT: BASE at 2880x1532 (same aspect = same framing) with ?lkmeach=1 (no mirror cadence), 2x2 display-space average -> a
  16-sample reference (tools/down2.mjs).
- tools/crawl.mjs per box (FS front slab, WR white rock, DR dark rocks, FF left/far floes, FR far floes right, RS right slab
  feet): J32/J48 (|dF| > 32/48 per 1000 band px-frames), MC32/MCE (frame t vs frame t-1 shifted by the box's own sub-pixel
  motion from registration of the BASE frames, Catmull-Rom resampled), FLK, eg (|F - GT|), texture (lake / solid interior
  gradient energy), halo (> 4 lv outside REF 3x3). tools/phase.mjs: 1/3-cycle component (mirror cadence). tools/excess.mjs,
  mcmap.mjs, jumpmap.mjs, slice.mjs: maps / time slices.

## Findings so far
- medium sweep (box motion med 0.25-0.64, p90 0.9-1.7 px/frame), MC32 tot: base 3.62, A 2.65 (-27 %), A+B 2.19 (-40 %),
  GT 1.36 (-62 %). J32 tot: base 25.0, A 25.3, GT 22.4 (-11 % only!).
- slow sweep (med 0.17-0.34 px/frame): J32 base 7.89, A 7.52 (-5 %), GT 5.63 (-29 %); J48 base 2.76, A 1.99 (-28 %), GT
  1.11 (-60 %); MC32 base 2.82, A 2.02 (-28 %), GT 1.05 (-63 %).
  => the brief's J32 >= -50 % (slow / medium, +-3 px band) is NOT reachable by better AA: even the 16-sample reference only
  gets -11 / -29 %; most > 32 jumps in a +-3 px band are real motion of the lake's / snow's texture. J48 and MC32 do track AA.
- Offline sims on A (display space, band = 3x3 with lake and solid): 3x3 Gaussian 0.6 -> MC32 -36 % (eg +10 %: blurrier than
  GT); tangential 5-tap -33 %; band TAA (alpha 0.5 / 0.65, CR history clamped to 3x3) slow: MC32 -39 / -40 %, J32 -22 / -28 %.
- B (MSAA 4 mirror target, ?slabflash=0 off): mirror/walk targets change (intended); 1/3-cycle peak (band): FF 10.3x -> 6.6x,
  FR 7.4x -> 6.4x, all 9.3x -> 6.2x median; MC32 FF -28 -> -43 %, FR -32 -> -57 %; lake texture 0.977 of BASE (smoother
  reflections). Right slab feet rows (RF 950-1440 x 638-664) on the medium path: only 2.5x (weak) in base and lane.

## B decided (12:20): MSAA 4 mirror target + mirror redrawn on EVERY moving frame (LakeSchedule.mirrorEvery 1), ?slabflash=0
- Root cause: the target is exact for the scene but its own parallax lookups (strata / pFree marches through the target's
  occlusion) depend on the camera it was drawn from; redrawn every 3rd moving frame, the reflections beside the waterline
  jumped on each redraw (1/3-cycle peak in the band: slow 17.4x median, FF +40 % jumps on redraw frames). MSAA alone (single
  target aliasing) cut it ~1/3 (FF 10.3x -> 6.6x medium); only an every-frame mirror removes it (lkmeach=1: 0.6x).
- Cost (perf.mjs, medium path, 6 interleaved pairs, 10-frame batches, frames GPU-bound: 17.8 / 37 / 54.6 ms at 0.25 / 1 /
  2.25x px): A 0.998, A+MSAA mirror 0.999, A+MSAA+mirror every frame 1.006 of BASE. (The water lane had measured +9 % with
  another method; re-checked in the final G7 run.)

## C implemented (12:21-12:30): lake-edge TAA in EnvEdge (TAA_FRAG), ?lktaa=0 off, ?lktaaw=<w> lab
- Band = pixels whose 3x3 (+4 taps 2 px out) holds lake AND solid; lake/solid from the alpha view distance vs the analytic
  lake-plane distance of the tap's ray (+-0.4 % + 3 cm) -> no change to the water shader. Reprojection with the previous
  camera at the 3x3 NEAREST distance; Catmull-Rom history (5 bilinear taps) clamped to its 2x2 footprint; clip = variance
  box (1.25 sd) intersected with 3x3 min/max, in the resolve's compressed space; history weight 0.5 at any speed; none
  where the hero reflection target has coverage within ~10 px of the lake point's mirror point, nor (hold only) inside the
  Wave crest train's reach. Still camera (< 0.012 CSS px per 1/60 s) -> 24 converging frames, then the pass is skipped (frame
  = plain resolve). Resize / jump (> 96 px) restart. Output = EnvEdge's source (its silhouette blur / expand unchanged).
- v1 excluded an 8 m ripple zone around the ring centre: it covered the white rock / right slab feet (TAA idle there) ->
  removed (rest ring bands are 4 m broad and slow; the clip absorbs them); only the hold crest train is excluded.
- medium (C2 = A+B+C): MC32 tot -73 % (GT -62 %), J48 -21 % (GT -20 %), J32 -9 % (GT -11 %); 1/3 peak 0.6-0.8x (gone);
  lake texture 0.977, solid 1.002.  slow: MC32 -76 % (GT -63 %), J48 -61 % (GT -60 %), J32 -35 % (GT -29 %); peak 17.4x ->
  0.6x; lake texture 0.972.

## B revised (12:51): NO MSAA on the mirror target (rest look must stay); B = mirror redrawn on every MOVING frame only
- MSAA target changed the lake at REST (reflection columns under the floes: 15 k px > 4 lv, max 108; lake texture at rest
  0.957 of BASE) -> violates "rest identical apart from the intended edge smoothing". LakeMirror.ts reverted to BASE.
- The every-frame mirror alone removes the 1/3-cycle component (lkmeach=1 runs: 0.6-0.8x median), still frames keep their
  schedule. Rest captures differ from BASE only through the 8-frame cloud-refresh phase (one extra moving-branch mirror draw
  in the pre-roll shifts it by one frame) -> rest identity checked with time frozen (next).

## D (T0 phones, 12:44-13:00): FXAA 3.11 quality tried and DROPPED (PostChain.ts reverted to BASE)
- 390x844 touch emulation, T0, scale 0.85, plate lake, FXAA 2-style. FXAA 3.11 (subpix 0.75 / 1.0, thresholds 0.166-0.125):
  far waterline crawl better (MC32 -10..-17 %, J32 -16..-23 %) but the near rocks / slabs worse (MC32 +85..+103 %, J32 +7..+13 %)
  and the image sharper (lake texture 1.05-1.07): never regress -> T0 unchanged (proved: lane T0 == BASE T0, 0 bytes / 240
  frames and identical programs).
- G8 run (ident): T1 all three switches off == BASE (final, mirror / walk / cache / reflection targets, 14 programs);
  plate lake lane == BASE; T0 (t0aa=0, now default) == BASE; T2 all off == BASE.

## Final candidate C3 = A + B (mirror every moving frame) + C (lake-edge TAA, crest zone excluded in the hold) (~12:55-13:05)
- slow:   J32 -31 % (GT -29), J48 -57 % (GT -60), MC32 -67 % (GT -63); 1/3 peak 17.4x -> 0.7x; lake tex 0.999, solid 1.002
- medium: J32 -9 % (GT -11), J48 -19 % (GT -20), MC32 -64 % (GT -62); peak 9.3x -> 0.7x; tex 1.000 / 1.002
- fast MC32 -54 % (peak 2.3x->0.9x, FF 3.5->1.1x); diag -62 % (3.6->0.7x, FF 8.1->0.8x); reverse -57 % (7.4->1.2x, FF 11.4->1.8x);
  leave -58 %; tex 0.999-1.001 everywhere.
- hold: dolly k1-90 box MC32 -17 % (lktaacrest=0: -20 %), tile-16 MC -8 % (-11 %); release k300-420 tile MC -9 % (-11 %).
  The dolly's own image change (crest bands, DOF, fog bank) dominates any MC metric there. Visual strips: no smear.
- G4: TAA vs TAA-off (same build): fast 44 px-instances in 240 frames (0.33 / Mpx-frame), max 10 lv, isolated, 86 % darker;
  hold 133 (0.25 / Mpx-frame) max 9. (EnvEdge's silhouette blur after the TAA: a TAA'd tap within its raw 3x3 range can land
  outside the BLURRED neighbourhood's range.) vs BASE the lake differs by B's fresh mirror (BASE's stale-target frames).
- G5: rows 0-399 (sky, clouds, mountains), hero excluded, hold path every 4th frame: 0.02 % px differ, max 6 lv (bloom of the
  changed waterline pixels); differences between the horizon line and the lake top = A's edges on the far shore (in its
  region). Hero mask mean 0.005-0.05 lv, max 82-95 at ring silhouettes over changed waterline pixels (the rings themselves
  are unchanged: ident programs). No row spike at the region boundary.
- REST: time frozen + same lake history (lakeSched.invalidate before the first frame): lane == lane?slabflash=0 (0 px),
  lane?aaresolve=0 == BASE (0 px) -> B and C do nothing at rest; lane vs BASE = A's edge smoothing only (62.6 k px/frame,
  2.3 k > 4 lv, max 43, all on silhouettes). NOTE: BASE's own rest frame depends on history (the still state keeps the walk
  drawn on the last moving frame, from a 0-2-frame-old mirror); with B that walk is always from a fresh mirror.

## Cost (~13:05-13:40)
- perf.mjs (separate sessions, 6 pairs, medium): lane 1.059 of BASE (frames ~20 ms now; the 37 ms runs earlier were under
  GPU contention from parallel captures, which hid the costs).
- perf2.mjs (ONE session, runtime toggles rotated in 60-frame blocks, 12-20 cycles, paired per cycle): B (mirror every moving
  frame) +3.0..+5.3 %, C (TAA pass) +1.6..+2.7 %, B+C +4.5..+5.8 % (medium), fast +5.7 %; run-to-run noise +-1.5 %.
  Mirror pass = 43 draw calls / 225 k triangles, ~0.5 ms GPU+CPU per draw (calls.mjs).
- Tried: B with the mirror every 2nd moving frame (m2): +3.9 % but a 30 Hz component appears (slow: 19x median, FF k%2 +39 %)
  -> rejected. Mips only every 2nd moving draw (lkmipev=2): no periodic artefact but no saving either (1.061-1.067) ->
  reverted (LakeMirror / LakeSchedule back to BASE). TAA: affine per-pixel rays (no mat4 per tap) and a clear before the
  draw (tile load skipped).

## ~13:40- final-build checks
- Lab-only TAA params now need ?debug (lktaa=1 on the plate lake, lktaaw, lktaacrest); product switches stay plain:
  ?aaresolve=0 (A, also turns C off), ?slabflash=0 (B), ?lktaa=0 (C).
- Final perf (perf.mjs, separate interleaved sessions, 6 pairs, 180 frames, 10-frame sync batches, scale 1, T1 1440x766):
  medium 1.059 (pairs 0.954 1.053 1.059 1.078 1.060 1.046; lane 21.09 / base 20.07 ms), fast 1.044 (0.984 1.065 1.044 1.084
  1.034 1.043; 21.45 / 20.57 ms); rest / hold / per-frame worst: see below.
- Handover check (hold sustain, TAA hands over at k191): consecutive-frame change counts identical to BASE (57.7 k vs 57.7 k
  px > 8 lv, the moving hero) -> no pop. Leave path: periodic FF 5.3x -> 1.0x, ALL 2.9x -> 0.9x.
- Final perf continued: rest lane 19.85 / base 19.98 ms (pair ratios 0.93-1.05: the noise floor; the pass is skipped and the
  mirror keeps its still schedule at rest), hold (press at frame 60, 180 frames of dolly) 24.32 / 23.27 ms = 1.045 (pairs
  0.99-1.06). Medium per-frame sync (3 pairs): 23.2 / 22.0 ms = 1.055, p90 25.5 / 24.5, worst single frame 77.9 / 27.3 ms
  (one lane outlier; the 10-frame batches' worst: medium 27.3 / 21.3, fast 26.1 / 24.8, rest 26.4 / 29.5, hold 25.9 / 25.2).
  => G7 is borderline: +4.5..+5.9 % while the camera moves (B ~+3, C ~+2), 0 at rest.
- tsc hero + project: clean (LANE, and the patched BASE copy). aa3.patch (2 files, HeroEngine.ts + world/EnvEdge.ts) applies
  with `patch -p1` (dry run + real) on a fresh `cp -c -R` of BASE and reproduces LANE's sources exactly (tools/applytest.sh).
- G8 on the FINAL build (13:51): T1 aaresolve=0&slabflash=0&lktaa=0 == BASE (final image, mirror / walk / cache / cacheN /
  hero-reflection targets, all 14 programs); T2 same; ?envlake=plate lane == BASE; T0 lane == BASE (D dropped). Single
  switches: aaresolve=0 -> programs == BASE (A and C off; B on: mirror / walk differ); slabflash=0 -> mirror / walk targets ==
  BASE; lktaa=0 -> no rx-lake-edge-taa program. 0 console errors / warnings in all 13 ident + 29 kept capture sessions.
- G10 (tools/g10.mjs, final build): DPR 1 (1440x766) and DPR 2 (pixel ratio 1.25 -> 1800x957): TAA active, resize to
  1100x700 / 1375x875 and back: targets follow, history restarts, no black / dark frame (0 px < 8 lv), 0 console errors or
  warnings; live engine (own RAF, real mouse moves, 3 s press-and-hold, release, sweep, pointer leaving): 57 fps headless,
  T1, adaptive scale 0.8, TAA ran 761 frames, 0 console errors / warnings.
- FINAL BUILD captures (13:52, caps/*_F): slow J32 -31 % / J48 -57 % / MC32 -67 % (GT -29 / -60 / -63), medium -9 / -19 / -64 %
  (GT -11 / -20 / -62), fast MC32 -54 %; lake texture 0.999-1.001, solid 1.001-1.002; 1/3-cycle peak 0.7-0.9x (gone).
  Same numbers as C3 (the affine-ray / clear / debug-gating changes are neutral).
- Labs :5181 / :5182 / :5183 stopped (:3000 untouched; :5173 was not running). No automation Chrome left.

## STATE: DONE (lane = A + B + C; D dropped). Deliverables: LANE files HeroEngine.ts + world/EnvEdge.ts; aa3.patch + LOG.md
## mirrored in MAIN/notes/round11/lane_backup/aa3/. Open: G7 borderline (+4.5..+5.9 % moving), J32 -50 % not reachable (GT),
## hold dolly gain small, rare isolated TAA pixels up to 10 lv outside the TAA-off 3x3 range, T0 not improved.

## Fix round 1 (20 Nov 15:00-15:55, fixer after the motion / artifacts / perf judges; work + images in $SP/work3/aa3fix)
Changed: world/EnvEdge.ts (TAA_FRAG, its uniforms, the per-frame copy of the region) and HeroEngine.ts (lab params only).
Water.ts / LakeMirror / LakeSchedule untouched. Judged copy kept in aa3_judged. All captures through slot.mjs.
- A-1 FIXED (TAA mixed compressed and linear taps at the aaresolve region edge): TAA_FRAG returns without history when any of
  the 3x3 colour taps is !aaIn (checked only on band pixels, after the band test), and when the history's 4x4 footprint is not
  inside the PREVIOUS frame's region (uPrevAAPlane / uPrevAAExc, copied after each TAA draw). Judge repro (jcap holdre, lane
  only; base / off reused): G4 px within 1.5 px of the region edge 146 -> 0, all G4 px 170 -> 24; band px on the edge mean
  |lane - off| 1.041 -> 0.05 lv (band px 1.5-12 px away 0.137). Look: aa3fix/img/A1_holdre_k222_k226_oldlane_newlane_off_z8.png
  (the dark 1-px dashes along the box edge are gone; new == off there).
- M-1 PARTLY FIXED. Tested first (medium, crawl per box vs BASE / GT): plain 3x3 min/max clip (?debug&lktaaclip=0) and no
  hero-reflection exclusion (?debug&lktaarefl=0) change NOTHING at RS / WR (RS -29 %, WR -48 % in all three): the clip and
  the exclusion are not the limiters. Weight 0.65 (lktaaw): WR -52 %, RS -30 %, edge error worse (eg 3.018 vs 2.998), more
  over-damping: rejected. Far taps of the band test at 3 px instead of 2 (lab ?debug&lktaafar=2|3|4; now the default 3): the
  band reaches the outer rows the crawl band (+-3 px) counts. MC32 per box, judged AA3 -> final (GT):
    medium FS -69 -> -76 (-71) WR -48 -> -53 (-67) DR -77 -> -80 FF -70 -> -72 FR -51 -> -55 RS -29 -> -31 (-71) tot -64 -> -67 (-62)
    slow   FS -70 -> -81 (-91) WR -65 -> -75 (-88) DR -83 -> -90 FF -68 -> -71 FR -56 -> -59 RS -55 -> -59 (-86) tot -67 -> -71 (-63)
    fast   FS -24 -> -29  WR -33 -> -38  DR -66 -> -73  FF -66 -> -69  FR -53 -> -57  RS -47 -> -50  tot -54 -> -58
    reverse FS -33 -> -38 (GT -22!) WR -42 -> -48 (-50) DR -64 -> -71 FF -66 -> -69 FR -51 -> -54 RS -32 -> -35 (-78) tot -57 -> -61 (-50)
    leave  FS -55 -> -58  WR -49 -> -54  DR -81 -> -85  FF -63 -> -66  FR -47 -> -50  RS -36 -> -38  tot -58 -> -62
  Still below the gate: medium RS, fast FS / WR, reverse FS / RS, leave RS (6 of 7 cells; medium WR now passes). RS: the
  events there are the lake's own pale dashes (M-2 mechanism, see below), which a +-3 px edge TAA cannot remove; reverse FS:
  the 16-sample GT itself only reaches -22 %. Edge error vs GT (G1b, report): medium eg 3.162 / 2.998 / 2.971 (base / judged /
  final), MCE 2.354 / 2.063 / 1.990 (GT 1.849); reverse eg 3.095 / 2.933 / 2.895, MCE 3.481 / 3.013 / 2.900 (GT 2.829); slow
  eg 3.170 / 3.029 / 3.003, MCE 2.360 / 2.049 / 1.972 (GT 1.815). Slow J32 -34 % (GT -29), J48 -59 % (GT -60).
  Texture: lake 0.999-1.001, solid 1.001-1.002 (slow, medium, fast). G2/G4 fastrev (judge jcap, far3 vs judge's off): G4 21 ->
  25 px / 120 frames (0.16 -> 0.19 per Mpx-frame, max 8 = unchanged), no trailing in the reversal strip
  (aa3fix/img/G2_fastrev_FS_k38-46_off_old_far3.png). Final build == lktaafar=3 capture (byte-identical frames).
- M-2 / A-4 / P-2 ROOT-CAUSED, NOT FIXED (needs a design change in Water.ts's walk). Reverse k44-55, window x225-255
  y497-510, mean luma above GT, sum of positive frames: lane 120.2; ?lkhalf=0 (per-pixel walk, no quarter-size target, no
  reprojection, no cache) 122.9; lkwdiv=2 121.7; lkwnear=0 114.2; lkwedge=0 106.2; lkstale=0 120.2; lkstrata=2 110.0; lkcache=0 120.2
  : NOT the walk target, its reprojection, the stale fix, the strata or the cache. Lake debug views (lkhalf=0, aaresolve=0;
  aa3fix/img/dbg_k44-50_d0_d10_d8_d7_d11.png): the block is in uLakeDebug 7 (the walk's FACE colour), not in the hit count,
  and the pFree far lookup is not used there (debug 11 black). LK_HMIN scales it: lkhmin=0 176.6, 0.05 (default) 120.2, 0.1
  68.3, 0.2 68.3 (capped at half the face height). => the walk looks the face up in the mirror target at the heightfield
  texel's ENTRY and a low height; for whole azimuth columns that point lands under the far floe's foot / in its inside (sunlit
  from the double-sided bake), so a straight-edged pale block appears and leaves as the camera moves the azimuths across the
  texel grid. Present in BASE (judges); B only moves it by a frame. A fix changes the walk's face lookup, i.e. the lake at rest
  too (the water lane's Cycles-tuned look): a design decision, left.
- M-3 NOT FIXED: per-box damping is a trade-off with M-1 (stronger history at RS / WR / FS means more damping at FS / DR / FF);
  a confidence-weighted history needs its own measurement round. Final slow J48: FS -86 (GT -31), DR -80 (-31), FF -80 (-67),
  WR -17 (-58), RS -9 (-54). No visible trailing in the fastrev reversal strip.
- A-2 EXPLAINED, NOT CHANGED: the TAA clips to the MAIN-target 3x3; at render scale s one main px is 1/s display px, so the
  display-space 3x3 test flags values inside the main-target range. Judge's gov capture (byte-identical in the final build),
  outliers vs off with a display 3x3 / 5x5: scale 1.0 11 / 5, 0.9 104 / 11, 0.8 108 / 17, 0.7 227 / 8 (px per segment).
- A-3 NOT CHANGED: the compressed resolve's darker thin dark lines are A's knee (uAAKnee 0.5); a knee change moves every A edge:
  for the lead (live uniform __hero.pipeline.aa.read.uAAKnee).
- P-1 NOT FIXED: in-session pin.mjs (1440x766 medium, 8 cycles, load 5): full (B+C) 1.096, B only 1.069, C only 1.056-1.082 of
  none. C alone, far 2 vs 3, two sessions each: 1.023 / 1.009 vs 1.034 / 1.023 (far3 ~ +1 %). B is the larger share (a full
  mirror draw + its mip chain per moving frame); cutting it without the flash needs a design change (stale-target-exact lake
  lookups, or a cheaper mip chain): left.
- G8 on the fix build (aa3fix/tools/g8.sh = tools/g8.sh writing to aa3fix/ident/g8): T1 aaresolve=0&slabflash=0&lktaa=0 ==
  BASE (final, mirror / walk / cache / cacheN / reflection targets, 14 programs); aaresolve=0: programs == BASE (B on: mirror /
  walk differ); slabflash=0: mirror / walk == BASE; lktaa=0: no rx-lake-edge-taa program; plate, T0 (default and t0aa=0) and
  T2 all-off == BASE; 0 console errors / warnings in all 13 sessions (and in every capture of this round).
- tsc hero + project clean; aa3.patch regenerated (tools/mkpatch.sh) and apply-tested on a fresh clone of BASE (tools/applytest.sh).
- Totals, final build vs GT (crawl): J32 / J48 slow -34 / -59 % (GT -29 / -60), medium -10 / -21 (GT -11 / -20), reverse -9 / -15
  (GT -7 / -11). G6 (stepped, phase.mjs): 1/3-cycle peak medium ALL 0.7x (BASE 9.3x), FF 0.8x; slow ALL 0.7x (BASE 17.4x), FF
  1.3x. (Observation, not new: slow f=1/2 is 3.9x BASE / 5.5x judged AA3 / 5.9x final, parity counts equal within 0.2 %.)
- G10 (tools/g10.mjs, fix build): DPR 1 and 1.25 (1800x957), resize there and back: 0 dark px, 0 console errors / warnings;
  live engine (own RAF, real mouse, hold): 57 fps, governor down to scale 0.7, TAA ran 464 frames, 0 console messages.
## STATE after fix round 1: A-1 fixed; M-1 partly (far taps 3 px: every box +3..+11 points, medium WR passes; 6 cells still
## short, RS bound to the lake's own pale dashes); M-2 / A-4 / P-2 root-caused to the walk's face lookup (LK_HMIN-bound), needs
## a Water.ts design change; M-3, A-3, P-1 not fixed (trade-off / lead decision / design change); A-2 explained (metric scale).
