# P4 round 2 - lane water (p4water) - BUILDER - 21 Nov 2026 (WIB)
Lane /Users/muhamadrifaldi/RetruxR11Work/lanes/p4water (cp -c -R of aa8 at 01:12), lab :5177, WORK = $SP/work_p4/p4water.
Mirror: MAIN/notes/round11/lane_backup/p4r2/p4water/. Reference lab :5199 (aa8 = MAIN). Time box 120 min (01:10-03:10).
Tasks: G2 (hold/pop bottom strip glass plate), Q8 (rest ripple rings as physical waves + cyan glint), Q9 (glassy mid/far lake),
G6 (orbit floe/slab reflection remnants), AJ-1 (thin-tip pale spot, AA8 option 2b / 3, only through the full pop gate).

## 01:12 setup
- lane cloned, app/ == MAIN/retrux-web/app (diff -rq empty). Lab started on :5177 (--no-watch).

## 01:15-01:22 reading + first build
- Read the brief, plan tasks G2 / Q8 / Q9 / G6 in full and their panel issues (env 1/3/4/7, hold-sweep 1/6, cursor-orbit 2, jury
  4/6, grade 2/5), AA8 tip LOG and fixer LOG sec. 4, Water.ts (R12 lake, waves, walk, cache), LakeSchedule.ts, LakeMirror.ts.
- Tools (WORK/tools): img.py (+ im wrapper: crop / stats / diff / contrast via Blender python numpy+OIIO), shot.mjs (poses of
  shoot_qc / shoot_pointer, several configs, ';'-separated), tune.mjs (one page, live uniform settings), camdist.mjs, and
  p4ice's identS.mjs / identcmp.mjs / rc2.mjs (+ rc2h.mjs: a press-and-hold mode).
- Baseline caps/base (lane = aa8). Luma here = Rec.709 (my numbers differ from the panel's but are consistent A/B).

## 01:22-01:40 G2 (the hold's bottom strip)
- Design: every new piece is a source edit applied only when its task is on (p4Apply: function swap / anchor replace with exact
  occurrence counts); `?p4water=0` = MAIN's text, no define, no uniform. Knobs are live uniforms (uLkP4*).
- First chop (plan values: 1.8 / 3.9 c/m, fade 4-14 m) did nothing visible. camdist.mjs: the hold camera (y 2.36 m) sees the
  bottom strip y686-766 at 16.5-22.4 m (p05/p06), the rest camera at 13-16 m; the plan's 4-14 m band never reaches the frame.
  Re-scaled: chop 0.45 / 1.0 c/m (+ a third octave x2.4), fade 19-26 m, band-limited by the pixel footprint.
- The dotted line along every crest silhouette: unchanged with 48 march steps (?lkw2n=48), with ?lkwave2=0 (bright dots), with
  ?lktaa=0&aaresolve=0, and with a large slope spread (spec AA up to 6x) -> NOT the march. Debug modes 7 / 8: the dots are pixels
  whose reflection sits at the horizon (high Fc, the walk's / far-field colours). Geometry: just behind each crest top the back
  flank turns the reflection through elevation 0 (slope = half the view's) - a sub-pixel sliver sampled once per row step.
  Fix (7): a soft floor on the tilted reflection's elevation (~ the flat water's): uLkP4E 1.0 removes the dots (img/t6_floor.png
  rows: 0 / 0.5 / 1.0 / 1.0 + chop). The derivative-aware march (3) is kept (continuous silhouettes with the irregular train).
- Chop tuning (t2-t8): DOF in the band limit (uLkP4K 0.5 / 1) made smooth 'marbled liquid' swirls (rejected); plain footprint
  with 3 octaves reads as chop. Chosen 0.55 / 0.22, 19-26 m, K 0, E 1, spec AA 0.3.
- p06 bottom strip y686-766 (Rec.709 luma): MAIN sd 15.19 p1 128.4 p10 157.5 mean 175.1 | lane sd 16.67 p1 119.2 p10 154.6 mean
  174.2 | F420 sd 17.53 p1 117.6 p10 152.0 mean 171.4. p05: MAIN sd 12.23 p1 143.1 | lane 13.55 / 130.5 | F402 17.53 / 120.5.
  p04: MAIN 15.54 / 121.5 | lane 15.64 / 122.3 | F358 20.04 / 111.0. (img/vis1_p06.png: MAIN | lane | F420.)
- The plan's (5) (rest-ring fade within 6 m of the camera) has nothing to act on (nearest visible water 13 m) -> not built.

## 01:40-01:55 G6 (orbit 'LAKE_CORR ghost')
- Still there on AA8's default lake (ptr_right x520-590 y470-495: pale jagged blotch with a vertical spike; caps/g6 def).
- A/B (p4water=0 on the lane = MAIN): ffblock=0 same, lkmscale=1,1 same, lkcache=0 same, +1 s settle same, atmosshore=0 /
  atmos=r10 same, lkwsel=0 / lkwnear=0 / lkwedge=0 same; lkwdiv=2 smaller; lkwdiv=1 and lkhalf=0 GONE. lkv=3 is broken on MAIN
  too (WebGL "program not valid", p4water=0) - pre-existing, lab only.
  -> root cause: the quarter-size walk target (LK_HALF): a thin face feature that only some walk texels sample is interpolated
  over 4x4 px blocks. Not LAKE_CORR (not compiled), not the cache, not a stale pose.
- Fix: where the four walk taps disagree (share-weighted luma spread + 0.25 share spread, smoothstep 0.01..0.04) the pixel's
  own walk is blended in, faded in over 30-40 m (the far water; with no distance gate the near water's rock edges took 9 %+ of
  the frame). Coverage (lkcache=0, debug 12): 8.8 % of the water px at ptr_right / q00, all in the far band y455-540.
  img/g6f_R_x3.png: MAIN blotch | lane (gone, faint 4 px column blocks remain) | full-res walk.

## 01:52-02:00 Q8 / Q9 (rest)
- Q8: the plan's Q = +0.6 (narrow troughs) moved the ring box AWAY from F000 (x400-800 y600-660 p10 165 -> 157 vs 172).
  Q < 0 (steep faces at the crests: dark face + thin bright rim on its far side, broad troughs) moves it toward F000:
  Q -0.35: p10 171.0, mean 191.4, sd 13.5 vs F000 171.7 / 194.5 / 13.8 (MAIN 165.5 / 189.2 / 14.8). The grade box p1
  (x420-1000 y560-700) is not reached by any Q (138-144 vs F000 109). Amplitude x(1 +- 0.3) around the ring, crest clamp 0.55,
  glint anisotropic (alpha 0.16 x 0.078) and cyan-white (60 %).
- Q9: alias guard 0.5-1.0 cells: q00 x300-1140 y480-560 Laplacian 12.6 -> 9.4; 0.15-0.45: 7.4 (F000 3.1); right floes
  x900-1440 y500-550 Laplacian 9.1 -> 2.4 (F000 3.0), sd4 4.05 -> 1.75. It also smoothed the ring zone (grade p1 138 -> 149,
  away from F000) -> the guard fades in over 24-34 m (the ring zone keeps its wavelets). The plan's step 2 (uLakeFar 0.05 ->
  0.03) does not apply: uLakeFar is read only by the ENV lane's ?envlake=mirror model, not by LAKE_R12.

## 02:01-02:04 ident (tools/identS.mjs: 20 moving frames, final image + mirror / walk / cache / cacheN / reflection + every linked program)
T1 ?p4water=0 vs :5199                         IDENTICAL final SAME | targets 6 (mirror,walk,cache,cacheN,reflection,final) differ: - | programs 16 differ: - | logs 0/0
T2 ?p4water=0 vs :5199                         IDENTICAL final SAME | targets 6 (mirror,walk,cache,cacheN,reflection,final) differ: - | programs 16 differ: - | logs 0/0
T0 phone (lane default) vs :5199               IDENTICAL final SAME | targets 2 (reflection,final) differ: - | programs 12 differ: - | logs 0/0
envlake=plate (lane default) vs :5199          IDENTICAL final SAME | targets 2 (reflection,final) differ: - | programs 12 differ: - | logs 0/0
envlake=plate&p4water=0 vs :5199               IDENTICAL final SAME | targets 2 (reflection,final) differ: - | programs 12 differ: - | logs 0/0
T1 lane default vs :5199                       DIFFER    final DIFF | targets 6 (mirror,walk,cache,cacheN,reflection,final) differ: walk,final | programs 16 differ: rx-water|ShaderMaterial,rx-water-walk|ShaderMaterial | logs 0/0
- -> `?p4water=0` == MAIN (:5199) at T1 and T2; T0 and ?envlake=plate are untouched by the lane (default == :5199).

## 02:04-02:39 (first builder, unlogged; reconstructed 02:56 by the continuation builder)
- Draft HANDOFF.md (02:06, placeholders), patch p4water_vs_aa8.patch (02:06), perf run 1 (logs/perf1.log, perf/ab_run1.json:
  6 move / 4 rest / 4 hold pairs at load 7-10, bimodal 22 / 44 ms blocks: move 1.022, rest 1.039, hold 1.062 - too noisy).
- tools/b_after.sh (seq, pop medium, qc) was queued at 02:08 and never got a slot (logs/seq.log ends on "waiting"); the builder
  was cut off at 02:39 (ECONNRESET). No source edit after 01:58 (Water.ts mtime 01:58:33; lab :5177 built 01:59:06).

# CONTINUATION BUILDER (21 Nov 02:55-04:55 WIB, same lane / WORK / lab)
## 02:56 re-verify
- lane app/ vs aa8: only Water.ts differs; lab :5177 (pid 43742) serves that source. tsc hero rc 0, project rc 0 (logs/tsc_*2.log).
- The 02:01-02:04 ident (above) was made on this exact build: still valid.
- Looked at img/vis1_p06.png (MAIN | lane | F420: the smooth pale bottom band is broken into wavelets) and img/g6f_R_x3.png
  (MAIN's pale jagged blotch at ptr_right is gone; faint column blocks at x3 remain).
## 03:00 perf run 2 (tools/b_perf2.sh: rc2h, 8 pairs per mode, load 3.2-4.6, all pairs < 10)
  move  lane 21.4 / main 20.9 ms med   paired med 1.026  (+0.55 ms)   p95 1.031
  rest  lane 18.6 / main 18.5          paired med 1.006  (+0.10 ms)   p95 0.994
  hold  lane 24.0 / main 22.6          paired med 1.075  (+1.68 ms)   p95 1.102   every pair +3.5..+9.4 %  -> FAILS the 5 % rule
  -> G2 (hold-only code) must get cheaper. Split run (tools/rc3h.mjs = rc2h + per-conf JS after boot + every conf vs the first;
  hold only, 6 cycles): def / chop off (fade band 0) / spec AA off (uLkP4W.w 0) / ?lkchop=0 / main.
## 03:17 hold cost split (perf/split_hold1.json; first 3-4 pairs at load 3.5-4, the last two at 8-15)
  vs main (paired med):  def +1.32 ms (1.059) | chop off (fade band 0) +0.57 (1.025) | spec AA off +1.48 (1.065, = def) |
  ?lkchop=0 (G2 off) +0.25 (1.011)   -> the chop ~0.75 ms, the rest of G2 ~0.3 ms, Q8/Q9/G6 in the hold ~0.25 ms; spec AA ~0.
## 03:21 chop noise vs coverage (perf/split_hold2.json, load 7-14, vs chop skipped)
  def +0.83 ms (1.035) | amp0 (chop amplitudes 0: octaves 1-2 still computed, no slope added) -0.10 ms (0.996)
  -> the noise itself is free; the cost is what the chopped normal does downstream. Code: a tilted pixel ("bent") skips the
  still-camera cached term and runs the bump, the walk read, the per-pixel walk and lkReflect4; the chop also tilted water
  beyond the crest train's front (newly bent px), and its normal drove the per-pixel heightfield walk (divergent azimuths).
## 03:24 G2 fix (Water.ts, P4_G2 edits only)
- the chop is added only where the train already tilts the water (`if (lkWv != 0) lkWv += lkChop(..)`: no newly bent pixel;
  the chop now spreads with the wave front from the press, as the crests do);
- the per-pixel walk takes the train's tilt alone (lkP4Nw = lkWaveTilt(lkN, lkP4Wt, V); the reflection / shading keep the
  chopped normal). Two more edits (the two `lkW = lkWalkTerm(.., lkN, ..)` lines of the tilted water). Lab restarted 03:26 (build ok).
- p04 / p05 / p06 bottom strip y686-766 (caps/v2: m = ?p4water=0, d = new build; old = caps/vis1 d_; Rec.709 luma):
    p04  MAIN sd 15.56 p1 121.6 p10 161.1 | old 15.64 / 122.3 / 157.9 | NEW 16.05 / 122.2 / 155.6 | F358 20.04 / 111.0 / 150.0
    p05  MAIN 12.18 / 143.3 / 163.4       | old 13.55 / 130.5 / 161.4 | NEW 14.89 / 114.7 / 159.5 | F402 17.53 / 120.5 / 153.0
    p06  MAIN 15.22 / 128.4 / 157.3       | old 16.67 / 119.2 / 154.6 | NEW 16.44 / 126.7 / 154.9 | F420 17.53 / 117.6 / 152.0
  lap (local roughness) new 12.45 / 9.66 / 10.54 (old 12.52 / 12.07 / 12.00; ref 5.2-6.3). Means within 1.5 levels of MAIN.
- Looked at img/v2_p06_bot.png (MAIN | new | F420, y560-766) and img/v2_p06_bl_x2.png (x0-720 y680-766, x2): MAIN's smooth
  pale arc with stair-stepped edges and the dashed diagonal line; new: irregular wavelets and dark-blue patches as F420, no
  dashed line; a faint stepped crest edge remains at x0-180 y~713.
## 03:30 pop gate, medium (tools/popana.sh; bloom-free mask aa5b medium_bmask, GT aa3 medium_gt, thr 40, band +-3)
- lane `?p4water=0` capture == AA8's saved medium_A8 (work8/motion/caps): 240 frames, 0 px differ -> AA8's saved six-path caps
  are the reference (capcmp).
- medium: flagged px A8 3043 / events >= 6 px 99 / px in them 1280 | LANE 2749 / 74 / 1071. New pops (LANE vs A8) 214 px,
  139 clusters, 0 >= 6 px (largest 5 px at x1418-1420 y506-509, far-right floes); pops the lane removes 376 px, 228 cl, 7 >= 6.
- AJ-1 spot box (fixer's spotdur x170-240 y497-509 thr 15 vs GT): A8 203 frames / 11,518 px-frames, LANE 203 / 11,760: the
  lane leaves the spot as it is (G6's walk blend does not reach it: the spot is the mirror's row starvation).
## AJ-1 decision (03:32): not attempted in code this round
- 2b (a front / back-face bit in the mirror alpha's sign) needs PLATE_MIRROR_FRAG + the uber shader's mirror branch in
  PlateEnvironment.ts (lane p4env's file, outside this lane's file list); and the tip LOG's own holdre data puts the bright front
  row ABOVE X's foot line (seen over the face's top: likely the floe's front-facing sunlit top), so the bit would not settle
  that case. Refining X alone cannot separate the inside (0.2-1.1 m behind X on a thin tip) from a sunlit face behind X.
- 3 (2x mirror rows, est. +0.6-0.7 ms per moving frame + FS / DR / RS retuning) does not fit the 5 % rule on top of this lane.
- -> stays open for the lead (the fixer's options), with the new number above (the lane does not change the spot).
## 03:35 perf run 3 (build 03:26 = G2 fix, G6 on; tools/b_perf2.sh 3; 8 pairs per mode, load 3.5-4.2)
  move  lane 22.1 / main 21.3 ms med   paired med 1.034 (+0.70 ms)  p95 1.027
  rest  lane 19.2 / main 18.6          paired med 1.022 (+0.40 ms)  p95 0.996
  hold  lane 23.4 / main 22.5          paired med 1.038 (+0.88 ms)  p95 1.008   (run 2: 1.075 / +1.68 ms)  -> all < 5 %
## 03:39 pop gate, six paths (build 03:26, G6 ON; ana/pop_<path>.txt; AA8 = work8/motion/caps/<path>_A8)
  path     A8 flagged / ev>=6 / px   LANE                 new pops (LANE vs A8)      removed (A8 vs LANE)
  slow     1318 / 36 / 255           1191 / 30 / 210      137 px, 100 cl, 0 >= 6     233 px, 144 cl, 2 >= 6
  medium   3043 / 99 / 1280          2749 / 74 / 1071     214 px, 139 cl, 0 >= 6     376 px, 228 cl, 7 >= 6
  fast     2389 / 77 / 910           2053 / 64 / 783      139 px,  82 cl, 1 >= 6     396 px, 191 cl, 11 >= 6
  diag     1719 / 48 / 620           1614 / 46 / 605      156 px,  90 cl, 0 >= 6     227 px, 151 cl, 2 >= 6
  reverse  2120 / 60 / 875           1975 / 61 / 858      126 px,  73 cl, 2 >= 6     198 px, 131 cl, 1 >= 6
  leave    1991 / 62 / 896           1812 / 60 / 839      119 px,  74 cl, 2 >= 6     226 px, 138 cl, 3 >= 6
  new clusters >= 6 px: fast k6-7 x212-220 y559-560 (6 px); reverse k76-79 x1084-1090 y514-518 (10), k61-63 x1391-1396 y501-503
  (8); leave k22-24 x1409-1411 y521-524 (6), k19-20 x147-151 y565-566 (6). Looked at img/pop_rev_k74-81_x1050-1130_A8_L_GT_z4.png:
  a thin dark vertical line under the far floe's left foot moving over 4 frames (AA8 has a smaller dark notch there in k74-75;
  the GT none); the lane's water left of it is free of AA8's horizontal corduroy (Q9) but shows vertical column banding.
- bisect (reverse, ana/pop_reverse_bisect.txt): ?lkglass=0 (Q9 off) 114 px / 61 cl / 3 >= 6 (stays); ?lkwalkj=0 (G6 off)
  28 px / 24 cl / 0 >= 6 -> G6 is the source. G6's band (0.003-0.015 and 0.03-0.10 via --eval, live uniform): IDENTICAL to the
  default (126 / 73 / 2) -> its weight is saturated there: the pixel's own walk itself flickers at the far floes' feet (the
  quarter-size walk's bilinear read was steady there); no threshold separates that from the ghost.
## 03:41 hold path (cap hold: press k30, release k330; ana/pop_hold.txt), build 03:26
- bottom strip y686-766 frame-to-frame |dL|: sustain mean 2.19 (A8 1.64), px > 12 lv 3.26 % (2.24 %); press 6.13 (5.45);
  release 9.04 (8.42); after = A8. Lake band y480-686: the lane is calmer (sustain 1.96 vs 1.99, release 6.92 vs 7.48).
- popnew (mask from the AA8 capture, GT = AA8): 4220 px, 142 clusters >= 6 px, all in the bottom strip during the press dolly
  (k63-98, x1310-1420 y690-765) and the release (k313-322, x397-462 y729-755): where the chop moves. Looked at
  img/pop_hold_k68-92_x1260-1440_A8_L_z2.png (x2: AA8 a smooth dark wedge; lane short 1-2 px tall dark-blue dashes) and
  img/hold_k80_bottom_A8_L_z1.png (1x: AA8's smooth pale arcs vs the lane's choppy water over the full width). This is the
  task's intended change (moving chop), not a waterline pop; it is the place a motion judge should look at in G2.
## 03:50 ident on build 03:26 (ana_ident2.txt): T1 / T2 ?p4water=0 == :5199 (final, 6 targets, 16 programs), T0 + plate
  IDENTICAL, default differs only in walk + final / rx-water + rx-water-walk; 0 console lines.
## 03:52 DECISION: G6 OFF by default (`?lkwalkj=1` turns it on)
- The brief: the waterline AA gate (no new pops vs AA8) holds for anything changed on the lake; AA8's tip patch was rejected for
  the same class (1-6 new clusters per path). G6 adds 5 (fast 1, reverse 2, leave 2). Off by default it costs nothing, the code
  and the diagnosis stay for the lead; the ghost (ptr_right) stays in the default.
- Water.ts p4WaterTasks: g6 = on && lkwalkj === "1". tsc hero 0 / project 0 (logs/tsc_*3.log). Lab restarted 03:53:07 (build ok).
## 03:58 pop gate on build 03:53 (G6 off; ana/pop_<path>_F.txt)
  path     A8 flagged / ev>=6 / px   LANE                 new (LANE vs A8)          removed (A8 vs LANE)
  slow     1318 / 36 / 255           1207 / 35 / 244      41 px, 41 cl, 0 >= 6      130 px,  90 cl, 1 >= 6
  medium   3043 / 99 / 1280          2730 / 86 / 1147     73 px, 58 cl, 0 >= 6      255 px, 155 cl, 7 >= 6
  fast     2389 / 77 / 910           2002 / 65 / 789      44 px, 31 cl, 1 >= 6      333 px, 153 cl, 11 >= 6
  diag     1719 / 48 / 620           1539 / 47 / 613      21 px, 20 cl, 0 >= 6      166 px, 109 cl, 2 >= 6
  reverse  2120 / 60 / 875           1936 / 57 / 819      28 px, 24 cl, 0 >= 6      128 px,  88 cl, 1 >= 6
  leave    1991 / 62 / 896           1768 / 60 / 845      19 px, 13 cl, 1 >= 6      173 px, 106 cl, 3 >= 6
- left: fast k6-7 x212-220 y559-560 (6 px, emax 44), leave k19-20 x147-151 y565-566 (6 px, emax 46): the left floes' waterline
  at ~33 m. Looked at img/popF_fast_k4-9_x180-250_A8_F_GT_z5.png: the lane's water under the dark face is glassy (Q9's guard)
  where AA8 and the GT keep fine ripples; the foot's change is marginal (thr 40).
- Q9's distance band 30-40 m instead of 24-34 (live uniform via cap --eval; ana/pop_{fast,leave}_Fq9b.txt): fast 23 px, 22 cl,
  0 >= 6 (flagged 2290 vs A8 2389); leave 5 px, 5 cl, 0 >= 6 (1934 vs 1991). -> default band 30-40 m (Water.ts, a uniform value).
## 04:02 ident on build 03:53 (ana_ident3.txt): all IDENTICAL as before (T1 / T2 ?p4water=0, T0, plate); default differs in
  walk + final only.
## 04:03 perf run 4 (build 03:53; perf/ab_run4.json): load 11-21 in the move blocks (0 pairs < 10: invalid), rest 2 pairs < 10;
  hold 8 pairs (load 4.7-7.7): paired med 1.000 (0.0 ms) -> G6's per-pixel walks were most of run 3's hold cost. Re-run on the
  final build after the capture set.
## 04:06 FINAL BUILD (Q9 band 30-40 m): tsc hero 0 / project 0 (logs/tsc_*4.log); lab :5177 restarted 04:06:35 (build ok).
- patch: tools/mkpatch_p4.sh -> p4water_vs_aa8.patch 457 lines, sha256 eeb37e42c2640e05e002ba58b8417b018e5cecc96c9766e9e384c5bad06523cd;
  Water.ts only; fresh cp -c -R of aa8 + patch -p1: 0 .orig / .rej, app/ IDENTICAL to the lane, tsc 0 / 0 (logs/mkpatch.log).
- chain (tools/final_chain2.sh): six-path captures (caps/pop/<path>_Z) then qc_r11 -> qc_final; ident (b_id1 / b_id2) then the
  G6 evidence shots (caps/g6fin: def / g6on (?lkwalkj=1) / main (?p4water=0); ptrR, ptrL, q00, p06).
## 04:09 ident on the FINAL build (ana_ident_final.txt): T1 / T2 ?p4water=0 == :5199 (final, 6 targets, 16 programs), T0 phone
  and ?envlake=plate (with and without p4water=0) IDENTICAL; default differs in walk + final, programs rx-water / rx-water-walk;
  0 console lines.
## 04:11 pop gate on the FINAL build (caps/pop/<path>_Z, ana/pop_<path>_Z.txt): NO new cluster >= 6 px on any path
  path     A8 flagged / ev>=6 / px   LANE                 new (LANE vs A8)          removed
  slow     1318 / 36 / 255           1274 / 36 / 249      28 px, 28 cl, 0           50 px, 34 cl, 1 >= 6
  medium   3043 / 99 / 1280          2903 / 89 / 1192     34 px, 31 cl, 0           51 px, 39 cl, 1 >= 6
  fast     2389 / 77 / 910           2290 / 74 / 850      23 px, 22 cl, 0           26 px, 25 cl, 0
  diag     1719 / 48 / 620           1672 / 46 / 616      15 px, 15 cl, 0           25 px, 16 cl, 1 >= 6
  reverse  2120 / 60 / 875           2017 / 57 / 842      15 px, 14 cl, 0           19 px, 19 cl, 0
  leave    1991 / 62 / 896           1934 / 62 / 873       5 px,  5 cl, 0           11 px,  9 cl, 0
- AJ-1 spot, medium_Z: AA8 11,518 px-frames, lane 11,464 (ana/spotdur_medium_Z.txt).
- hold_Z (final build) vs hold_M0: 4200 px, 140 cl >= 6 px: 113 in y686-766, 18 in 660-686, 9 in 608-653 (release k314-335,
  x1059-1282, near the right snow shore), 0 above y600. Looked at img/pop_holdZ_rel_k312-326_x1040-1300_A8_Z_z2.png: alike.
## 04:10 G6 evidence (caps/g6fin): img/g6fin_ptrR_x3_main_def_g6on.png: MAIN's ghost; default (G6 off) the same ghost on the
  smoother (Q9) water; ?lkwalkj=1 removes it (faint blocks remain).
## 04:14 capture set qc_final (qc_r11.zsh, rc 0). vs the panel's MAIN set (p3/r11_1):
- G2 bottom strip (sd / p1 / p10): p04 14.62 / 122.4 / 163.3 -> 16.14 / 121.5 / 156.1 (F358 20.04 / 111 / 150); p05 11.47 /
  143.1 / 163.9 -> 12.98 / 134.0 / 162.0 (F402 17.53 / 120.5 / 153); p06 11.38 / 143.0 / 164.8 -> 11.94 / 143.1 / 163.5 (F420
  17.53 / 117.6 / 152); sw_hold_B sd 13.68 -> 16.51, p1 137 -> 124. Looked at img/qcp06_bot_main_lane_F420.png: the smooth arc
  is replaced by choppy wavelets (p06's sd moves little: MAIN's arc gradient already carried variance).
- Q9 (q00): water box lap 12.53 -> 10.47 (F000 3.09); corduroy box lap 11.99 -> 10.53 (2.46); right floes lap 9.12 -> 5.94
  (3.04), sd4 4.06 -> 2.95 (2.96).
- Q8 (q00): no measurable gain on this frame: env p10 160.8 -> 160.5 (171.7), grade p1 140.3 -> 141.4 (108.8), glint p99 234.4
  -> 228.0 (231.1). Looked at img/qcq00_ring_x2_main_lane_F000.png: ring character nearly unchanged. The first builder's 171.0
  was another ring phase. Left on (passes every gate, ~0 cost); `?lkring=r11` drops it.
## 04:19 perf run 5 (FINAL build; perf/ab_run5.json; 8 pairs, load 3.6-10.4)
  move  0.996 (-0.08 ms; 8 pairs < 10) | rest 1.035 (+0.88 ms; pairs 0.79-1.88, contention) | hold 1.000 (0.0 ms)
  -> rest-only re-run (perf/ab_run6_rest.json).
## 04:26 rest-only perf (perf/ab_run6_rest.json, 8 pairs, load 5.3-6.2): paired med 1.019 (+0.38 ms); blocks bimodal (19 vs 37
  ms: other jobs' GPU load), same-mode pairs ~1.02. FINAL perf: move 0.996, hold 1.000, rest ~1.02-1.035 -> all < 5 %.
## 04:28 wrap-up
- Disk: deleted the analysed pop capture sets of builds 03:26 / 03:53 and the bisect variants (their ana/*.txt kept); kept
  caps/pop/{slow,medium,fast,diag,reverse,leave}_Z, hold_Z, hold_M0 (AA8 hold + mask), medium_M0 (the exactness proof). WORK 3.1 GB.
- Patch re-checked against the lane source (sha256 eeb37e42...: unchanged since 04:07). HANDOFF.md written (LANES/p4water).
- Lab :5177 (pid of `node hero-lab/serve.mjs --no-watch`, started 04:06:35, final build) left running for the judge.
- Mirrored: LOG.md, HANDOFF.md, patch, ana/, ident/ (final JSONs), perf/, tools/, key img/, qc_final_key/ (region stats, log,
  cmp_*.jpg) -> MAIN/notes/round11/lane_backup/p4r2/p4water/.

# FIXER (21 Nov 05:10-06:10 WIB, same lane / WORK / lab :5177; judge findings W1-W7, judge_p4water.json)
Read the brief, the judge's LOG / json / images / flick.py. Builder's final Water.ts kept as WORK/Water.ts.builder_final and its patch
as fix/p4water_vs_aa8.builder_eeb37e42.patch. Tools: fix/tuneF.mjs (one page, pose -> settle -> FREEZE (dt 0, frames still drawn),
then each live-uniform set at the SAME frame time: exact A/B, TAA converged 1 s), fix/box.py (box luma / rgb), judge's flick.py,
seqcrop.py, dark.py. All edits are inside the P4 blocks of Water.ts (no new file, no shared file).
## 05:15 edits (fix/edit1.py; then fix/edit2.py for the final defaults)
- G2 chop (W3 / W4 / W5): lkChop's band limit from uLkP4B.xy (0.1-0.25, was 0.2-0.45), third octave share uLkP4B.z (0, was 0.42),
  a soft limit on the chop slope (uLkP4B.w 0.3: s / sqrt(1 + |s|^2 / 0.3^2)), frequencies 0.30 / 0.65 c/m (were 0.45 / 1.0), amplitudes
  0.85 / 0.36 (were 0.55 / 0.22: same slope per octave), an onset feather inside the train's hard cuts (its front R and the
  |x|, |z| 14.85 m square; uLkP4D.y 2 m), and the chop's own AA: computed on every pixel, damped by 1 / sqrt(1 + (fwidth / 0.07)^2)
  (uLkP4D.x 0.07 = the judge's "tilt change ~0.07 per px"), then added only where the train tilts (as before: no newly bent px).
- Q8 glint (W1): MAIN's ggxSpec(.., 0.28) squares the roughness: MAIN's GGX alpha is 0.0784 isotropic, so the builder's
  p4GgxAniso(0.16, 0.078) was 2x WIDER across the view (not narrower: the judge read 0.28 as alpha), halving the peak, and its
  tint (0.58, 0.83, 0.91) lost 8 % luma. Now: the tint target keeps MAIN's tint luma (0.630, 0.901, 0.989), uLkP4G.w a gain.
- Q9 (W2): a gate lkP4GlassJump (G6's tap spread on the quarter-size walk, read before lkBump on the LK_CACHEN path; 0 in the walk
  pass) that steps the guard back (uLkP4GJ).
- tsc hero 0 / project 0 (logs/tsc_*_fix1.log), lab restarted (build ok).
## 05:19 W1 frozen same-time A/B (fix/w1a, q00 and q03; centre column x680-760 y640-700 | glint box x515-865 y665-710, Rec.709)
  q00: MAIN-equivalent set (Q 0, amp var 0, clamp .48/.48, alpha .0784 iso, MAIN tint) 192.0 | 187.7 (re-run 192.0 | 187.7: exact)
       builder lobe 0.16 x 0.078 188.4 | 189.9 ; plan as roughness (alpha .2025 x .04) 177.3 | 182.5 ; plan as alpha (.45 x .2)
       184.5 | 191.3 (p99 209: no sparkle) ; MAIN lobe + cyan tint 192.8 | 188.5 ; MAIN lobe + cyan x1.3 196.5 | 190.7 ;
       builder lobe x1.6 194.4 | 194.8 ; F000 200.3 | 190.5.   q03 centre: MAIN-eq 190.4, builder 186.1, iso x1.3 195.4.
  -> default uLkP4G (0.0784, 0.0784, 0.6, 1.3): centre +4.5 over MAIN toward F000 (gap 8.3 -> 3.8), glint box = F000.
  Looked at fix/img_w1_glint_x2_mainEq_old_isoG13_F000.png: MAIN's sparkle cluster back, denser and brighter; F000's wide band
  shape is not reached (that is the agitated ring texture of W6, open).
## 05:21-05:24 W3 hold path (cap hold, 480 frames, deterministic; caps/pop/hold_F1 = new chop, hold_F1b = AA 0.035)
  judge's flick.py, bottom strip y686-766, sign-reversal flicker (flip=True):
               MAIN (hold_M0)   builder (hold_Z)   fix F1    F1b
  press k30-150    4.763 %        6.548 %         4.355 %   4.325 %
  sustain 150-300  0.688 %        1.058 %         0.682 %   0.674 %
  release 330-420  5.062 %        4.870 %         4.868 %   4.868 %
  y600-686 sustain 0.753 %        0.741 %         0.747 %   0.747 %
  -> F1 (AA 0.07) kept. fix/img_w3_hold_k200-202 / k80-82_x1140-1400_M0_Z_F1_x2.png: the builder's 1-2 px streaks gone; per-60px
  flicker at x1140-1400 in the press (k80) MAIN 1.0-1.4 %, builder 3.7-5.4 %, fix 1.0-1.4 %.
## 05:25-05:31 W2 (Q9 gate), frozen A/B with the cache bypassed (h.water.setCacheOn patched to 0: the LK_CACHEN path computes every
  pixel live; ?lkcache=0 compiles the plain path where the gate does not exist -> fix/w2a was invalid, fix/w2b valid)
  ghost box lap / sd4: ptrR x530-600 y472-505 MAIN-bump (guard off) 8.04 / 3.17 | builder Q9 4.84 / 2.41 | gate 0.01-0.04 7.60 / 2.91
  | gate 0.004-0.016 8.06 / 3.18 ; ptrL x270-450 y450-515 8.16 | 6.05 | 7.35 | 8.17. fix/img_w2b_ptrR_x3_q9off_gate0_gate1_gate1t.png:
  the gated rows look as MAIN (outline faint under the corduroy), the builder's row shows the pale blotch with blocky steps.
  q00 Q9 boxes (fix/w2c, lap): right floes x900-1440 y500-550 MAIN 9.05, builder 5.84, gate 8.23, tight gate 9.00 (F000 3.04);
  corduroy x640-900 y490-560 11.65 / 10.25 / 10.96 / 11.39 (2.46); water x300-1140 y480-560 12.65 / 10.64 / 12.04 / 12.57 (3.09).
  -> the walk's taps disagree over most of the far water: the judge's fallback ("guard off where the taps disagree") IS Q9 off
  (tight band) or keeps ~10-25 % of its gain with the ghost back at MAIN's visibility (loose band). DECISION: Q9 OFF by default
  (`?lkglass=1` on, with the gate 0.01-0.04; `&lkglassj=0` the builder's ungated Q9). Lead options in HANDOFF.
## 05:28-05:47 W4 / W5 (frozen same-time A/B at p04 / p05 / p06, bottom strip y686-766; fix/w4a, w4b, w5a, w5b)
  old (builder chop emulated: 0.45/1.0 c/m, 0.55/0.22, band 0.2-0.45, oct3 0.42, no limit / AA) vs new:
  p04 sd 16.61 -> 17.51 (F358 20.04), p1 121.3 -> 121.5 (111.0), lap 12.92 -> 9.43 (6.34)
  p05 sd 13.87 -> 11.99 (F402 17.53), p1 134.9 -> 148.2 (120.5), lap  9.65 -> 5.65 (5.36)
  p06 sd 14.44 -> 12.84 (F420 17.53), p1 122.2 -> 138.8 (117.6), lap  9.50 -> 6.07 (5.22)
  dark components (judge's dark.py, L < 120): p05 598 px (7 comps >= 20 px, rgb ~75,109,155) -> 97 px (1, a fixed feature at
  x348-386 also in old); p06 1080 -> 129; p04 the saturated dashes (73-81,106-112,152-156) gone (left: a fixed 269 px shore comp.
  in both). The references keep 1100-2000 px of SOFT dark troughs (~89,112,148): not reached.
  More amplitude (A2 1.3/0.55 limit .45; A3 1.6/0.7 limit .6 AA .1): sd +0.2..0.8 only, lap up (p04 11.4) -> kept the new.
  img: fix/img_w4_p06_bot_old_new_F420.png (1x: new = broad soft wavelets, no fine dark dashes; weaker than F420),
  fix/img_w4_p04_l_x4_old_new_F358.png, fix/img_w5_p06_bl_x4_old_new_F420.png (the stepped onset edge is gone).
  SEEN (new, open): with the gentler chop MAIN's dotted crest-silhouette line (the judge's "dashed diagonal line" in MAIN's p06)
  shows again on some crests near the train front (fix/img_w5_dots_x6_old_new.png: x0-100 y736-751, faint; the builder's dense
  chop covered it). Feather 2.0 / 1.0 / 0.6 / 0 m (fix/img_w5_feather_p06_x6_*.png): faint dots in all (not the feather);
  spec AA share uLkP4W.w 0.6 / 1.0 (fix/w5b): no clear gain and sd drops (p05 14.0 -> 13.5): kept 0.3.
## 05:33-05:35 FINAL source (fix/edit2.py + a comment): Q9 default off, uLkP4G (0.0784, 0.0784, 0.6, 1.3), chop as F1.
  tsc hero 0 / project 0 (logs/tsc_*_fix3.log, final source); lab :5177 restarted 05:35 (build ok, serves the final source).
## 05:36-05:39 ident (fix/chain.sh; ana_ident_fix.txt; :5199 reference JSONs reused from the builder's 04:08 run + a fresh :5199
  T1 control that is IDENTICAL to it):
  T1 ?p4water=0 vs :5199 IDENTICAL (final, 6 targets, 16 programs); T2 IDENTICAL; T0 phone (lane default) IDENTICAL; envlake=plate
  (default and p4water=0) IDENTICAL; T1 lane default DIFFER: final only (walk / cache / mirror now = MAIN: Q9, G6 off), programs
  rx-water, rx-water-walk; 0 console lines.
## 05:40 hold_F2 (FINAL build, fix/flick_F2.txt): press 4.309 % (MAIN 4.763, builder 6.548), sustain 0.681 % (0.688 / 1.058), release
  4.927 % (5.062 / 4.870), y600-686 sustain 0.752 % (0.753), y600-686 press 2.940 % (3.289 / 2.895). All <= MAIN.
## 05:50 patch: tools/mkpatch_p4.sh -> p4water_vs_aa8.patch 533 lines, sha256 902ee34f8373835c157804d11fee9c45f7fca2fd188616dbfdd4f41794c86908;
  Water.ts only; fresh aa8 clone + patch: 0 .orig / .rej, app/ IDENTICAL to the lane, tsc 0 / 0 (logs/mkpatch_fix.log).
## 05:50 capture set qc_fix (qc_r11.zsh rc 0) vs the panel's MAIN set (p3/r11_1) and the judge's lane set (judge_p4water/qc)
  W1 q00 centre column MAIN 182.1 / builder 177.4 / FIX 189.2 (F000 200.3); q03 185.8 / 183.5 / 195.5; q00 glint box 181.1 / 176.6
  / 179.8 (F000 190.5; single capture); env box p10 160.8 / 164.1 / 174.3 (F000 171.7).
  W2 ptr_right box sd4 / lap MAIN 3.08 / 7.65, ?p4water=0 3.07 / 7.60, builder 2.39 / 4.79, FIX 3.08 / 7.57; ptr_left MAIN 3.28 /
  6.86, off 3.20 / 6.71, builder 2.35 / 4.16, FIX 3.88 / 7.75 (p99 215: a blue shard, capture timing). Looked at
  fix/img_w2_qc_ptrL_x3_off_builder_fix.png: MAIN's corduroy back, the ghost as faint as MAIN's.
  W4 bottom strip y686-766 (sd / p1 / lap): p04 MAIN 14.62 / 122.4 / 8.81, builder 15.75 / 121.5 / 12.57, FIX 15.70 / 122.3 / 7.83
  (F358 20.04 / 111.0 / 6.34); p05 11.47 / 143.1 / 6.76, 12.78 / 140.7 / 10.38, 12.46 / 141.3 / 6.24 (F402 17.53 / 120.5 / 5.36);
  p06 11.38 / 143.0 / 6.33, 12.16 / 141.3 / 10.11, 12.00 / 141.7 / 6.37 (F420 17.53 / 117.6 / 5.22). Dark comps (L<120): p05 MAIN
  103 / builder 431 / FIX 88 px; p06 88 / 515 / 162; p04 587 / 824 / 634. Looked at fix/img_qc_p06_bot_MAIN_builder_fix_F420.png:
  the fix's strip is broad and soft, no fine dashes, but its statistics at p05 / p06 are back near MAIN's and broad smooth bands
  partly return (the TRADE-OFF of W3: lead decision, options in HANDOFF). fix/img_qc_p06_bl_x4_MAIN_builder_fix.png (W5): MAIN's
  dashed diagonal and the builder's stepped onset gone; a faint dotted crest segment at x225-335 y747-754.
  W6 / W7: grade box p1 140.3 / 139.6 / 137.8 (F000 108.8); Q9 boxes back at MAIN (right floes lap 9.09, corduroy 11.84);
  tip box x170-240 y497-509 L 168.4 / 168.5 / 168.5, sd 21.60 / 21.55 / 21.65 (unchanged).
## 05:52-05:54 the judge's W1 repro on the FIX build (fix/ab_w1.sh = judge's ab_q8.sh; shoot_qc q00,q03, 2 runs each, same session)
  q00 centre column: default 194.7 / 193.8, ?p4water=0 189.1 / 186.4 (F000 200.3) -> +5..+7 over MAIN (the judge's builder: -5.7)
  q00 glint box:     default 187.6 / 186.0, ?p4water=0 186.4 / 183.4 (F000 190.5) -> +1..+2.6
  q03 centre column: default 197.9 / 200.8, ?p4water=0 194.1 / 197.4             -> +3.4..+3.8
  (centre B-R 28.5-29.8 vs MAIN 30.9-32.5, F000 35.1: the brighter glint reads whiter, not bluer: noted, not a gate.)
## 05:54 perf run fix1 (perf/ab_fix1.json, 6 pairs per mode): INVALID - 1-min load 11-22 during the run (secd 131 % CPU, other lanes'
  tsc / Chrome), ~48 ms frames (the builder's ~20 ms), move / hold 0 pairs < 10 (paired med 0.935 / 0.992), rest 4 pairs < 10 at
  loads 7.4-10.7: 1.277 in a bimodal regime. By construction the fix adds no rest work (Q9 off removes the guard; the W2 gate is not
  compiled by default; lkChop returns at once at uHold 0; the glint is one multiply). Re-run queued (perf/ab_fix2.json).
## 05:55-05:58 pop gate on the FINAL build (b_pop.sh popX + popana.sh; caps/pop/{medium,fast}_X; ana/pop_{medium,fast}_X.txt)
  medium: AA8 flagged 3043 / events >= 6 px 99 / px 1280 | FIX 2999 / 97 / 1253; new pops 10 px, 9 clusters, 0 >= 6 px (single
  px, emax 41-50, y693-765: the near water); removed 11 px, 0 >= 6.  fast: 2389 / 77 / 910 | 2393 / 77 / 915; new 7 px, 7 cl,
  0 >= 6; removed 7 px, 0 >= 6.  -> no new pop cluster (the far water is MAIN's again with Q9 off; the glint x1.3 adds / removes
  single px). slow / diag / reverse / leave not re-run in the fix round (the builder's Q9-on build passed all six).
## 05:59 disk: deleted caps/pop/hold_F1, hold_F1b (analysed: fix/flick_F1.txt) and fix/w2a (the invalid ?lkcache=0 A/B); kept hold_F2, medium_X, fast_X.
## 06:01 perf run fix2 (perf/ab_fix2.json; 6 move / 8 rest / 6 hold pairs, interleaved vs :5199, SLOT_BG=0): still contended (loads
  6-14, ~50-60 ms frames, 2.5x normal), so not the brief's >= 6 pairs under load 10 for move / rest:
  move 0.949 (0 pairs < 10), rest 1.055 all pairs / 0.931 for the 2 pairs < 10, hold 0.963 all / 0.923 for the 5 pairs < 10.
  Run 1's rest 1.277 does not reproduce. Neither run shows a regression; a clean re-run on a quiet machine is left to the lead
  (WORK/tools/b_perf2.sh recipe). The judge's valid run on the builder's build (load < 5.3): move 1.003, rest 0.930, hold 0.986;
  this round's default does strictly less work at rest than that build (Q9 off) and one octave less in the hold.
## 06:02 wrap-up: lab :5177 (node hero-lab/serve.mjs --no-watch, started 05:35 on the final source) left running for the judge.
  Mirrored LOG, HANDOFF, patch, ana_ident_fix.txt, ident_fix/, fix/ (images, tools, numbers, the W1 repro shots), qc_fix_key/,
  ana/pop_{medium,fast}_X.txt and perf/ab_fix{1,2}.json -> MAIN/notes/round11/lane_backup/p4r2/p4water/. WORK 4.3 GB.
