# AA7 G-3 investigator + builder (20 Nov 2026, from 20:52 WIB; time box 70 min)
Lane: /Users/muhamadrifaldi/Library/Caches/retrux-lanes/aa7g3 (cp -c -R of aa7 at 20:53), lab :5198. Work: $SP/work7/g3.
(A previous run of this role was cut by the 20:47 reboot: its debug renders survived in $SP/work7_partial_20nov/g3/dbg
(G3DBG build = AA7 + debug outputs, gov case k88-93, scale 0.7). I re-used those renders for the cause (read-only); the lane,
the fix and every capture below are new.)

## 1. Cause (debug renders, gov case k91-92 at render scale 0.7, ?lkhalf=0 per pixel, crop x60-260 y470-540)
Debug outputs per lake pixel: m12 = (gFt, aFt, hFt, rows), m13 = (luma r0, luma r1, r0.a, r1.a) = the guard's two bracketing
target rows (luma, path length m), m14 = (luma of the face lookup before / after the guard).
- x155 (inside BASE's big block, the guard works): gFt 1, rows = face 45.8 m luma 0.23 + inside 47.66 m luma 1.72 -> the
  inside row is 1.85 m behind the front row -> replaced: luma 0.99 -> 0.23.
- x120 (the residual small block, k91): gFt 1, rows = 92.1 m luma 0.13 (what stands over the face's top: far shore) + 47.6 m
  luma 1.6 (the floe's sunlit inside). The FACE ROW IS MISSING: the front-most row is the inside itself, nothing lies
  behind it within the band -> nothing replaced: luma 1.31 before = after (pale).
- Same frame with the full-scale row count (?lkmscale=0.5,0.7143 -> mirror 504x383 at scale 0.7 instead of 504x268): the
  rows at x120 are face 46.19 m luma 0.05 + inside 47.63 m -> replaced -> luma 0.045; final 147 vs 183 (block gone).
=> Cause: the mirror target scales with the render scale (LakeMirror.setSize(pipeline size)), so at 0.7 its rows are
1/0.7 taller; at the floe's thin left end the face is lower than a row and covers no row centre, so X's two bracketing rows
are (inside, far shore) and the guard's rule "a row behind the front-most row takes its colour" has no face row to copy.
The guard's thresholds are in texels and metres and are not the problem; the row bracketing is (as AA6 suspected).

## 2. Fix A (shader term, built first in aa7g3, :5198): a scale-gated addition to the guard
Water.ts LK_FFBS_GLSL inside the guard (uniform uLkFfbS = 1 below render scale 1, 0 at 1; HeroEngine.resize ->
Water.setRenderScale; `?ffbs=0` = AA7 source): a front-most row lying > 0.5 m (LK_FFBSM) behind the face's entry X within
the inside band, with the other row outside the band and darker, takes the other row's colour. tsc clean.
- G8 at scale 1 (identS.mjs = ident.mjs + --scale; 20 moving frames): AA7 vs A default / ?lkglide=0: final + 6 targets SAME,
  programs differ only rx-water + rx-water-walk (the term); ?ffblock=0, all five off, ?ffblock=0 at 0.7 and 0.9, ?ffbs=0 at
  1 and 0.7: IDENTICAL (programs too). Scale 0.7 default: walk + final differ, mirror same (expected). 0 console lines.
- gov case (jcap, a7 :5197 / A :5198 / f0 / base, rows 440-620): k0-24 and k100-119 (scale 1, incl. after the 0.7 -> 1
  step) 0 px differ at thr 0; k25-99 (0.9 / 0.8 / 0.7) A only darker (121068 px > 4 lv over 75 frames).
  Strip img/gov_s07_FF_k88-93_a7_g3_f0_base_z4.png (x90-190 y490-520, x4): A removes the small pale rectangle of k90-92.
- BUT new small pops at the far-left tiny objects (the R-2 zone x 70-190 y 530-580), popnew A vs AA7 at the same scale
  (bloom-free mask, medium GT): 0.7: 42 px / 14 clusters (1 >= 6 px: k110 x175-177 y538-541 n9 emax 118; AA7 vs A: 24 px);
  0.8: 82 px / 22 (5 >= 6 px, x87-150 y544-574); 0.9: 85 px / 25 (4 >= 6 px, k36-43 x138-148 y545-550 n19, k80 x1276).
  Strip img/med_s07_R2_x140-200_k82-85_109-111_z6.png: A adds a detached dark dot right of a tiny object's dark dash at k83
  and k109 (a7 and BASE do not have it): a new pop. => Fix A rejected as built.
  (Fix A kept for the record: $SP/work7/g3/fixA_vs_aa7.patch. A refinement would need the tiny objects' row values; no time
  in the box, and fix B below removes the cause instead of patching around it.)

## 3. Fix B (the lane now, :5198 rebuilt 21:17): keep the mirror target's full-scale ROW count below render scale 1
Cause-level: the guard needs the rows it has at scale 1. LakeMirror.setSize(w, h, renderScale): rows = h x scale[1] /
renderScale when rowsFull (columns unchanged: w x scale[0]); at scale 1 the formula is AA7's exactly. HeroEngine sets
rowsFull = r12 lake && ?ffblock != 0 && ?mrows != 0 && no lab ?lkmscale (so ?ffblock=0 = AA3 / AA7 exactly at every scale)
and passes the governor's scale on both setSize calls. No shader change (programs identical to AA7 at every scale).
T1 1440x766: 0.7 -> 504 x 383 (AA7 504 x 268), 0.8 -> 576 x 383 (306), 0.9 -> 648 x 383 (345); 1.0 -> 720 x 383 (same).
Its exact preview = AA7 with ?lkmscale=0.5,0.5/s at fixed scale s (same target size: c2d captures).

## 4. Fix B: proof (lab :5198 built 21:17 from the lane; AA7 references = :5197)
G8 / bit identity (identS.mjs, 20 moving frames, final + mirror / walk / cache / cacheN / reflection + every linked program;
identB/*.json vs ident/p5197_*.json):
  AA7 vs B default (scale 1)                IDENTICAL (6 targets, 16 programs, 0 / 0 logs)
  AA7 vs B ?ffblock=0 / ?lkglide=0           IDENTICAL / IDENTICAL
  AA7 vs B all five off                      IDENTICAL (15 programs)
  AA7 vs B ?ffblock=0 at scale 0.7 and 0.9   IDENTICAL / IDENTICAL   (?ffblock=0 stays exact below 1: rowsFull is off)
  AA7 vs B ?mrows=0 at scale 0.7             IDENTICAL
  AA7 vs B T0 phone (390x844 DSF 3)          IDENTICAL (2 targets, 12 programs)
  AA7 vs B scale 0.7 default                 mirror, walk, final differ; programs identical (expected)
gov case (jcap, same script as AA6's G-3 repro): k0-24 and k100-119 (scale 1, incl. after 0.7 -> 1) 0 px differ at thr 0.
  Strip img/gov_s07_FF_k88-93_a7_B_f0_base_z4.png (x90-190 y490-520, x4; cols AA7 | B | ?ffblock=0 | BASE): the small
  pale rectangle of k90-92 and its light vertical line at k90 are gone in B; BASE / ?ffblock=0 keep the full block.
  Pale-region scan (AA7 brighter than B by > 20 lv, FF box x0-680 y470-560): 0.7 window k76-94 730-1075 px / frame (the
  blocks B removes); 0.9 / 0.8 windows 22-243 px / frame, scattered (AA7 has no block there in this case).
Exact preview: AA7 + ?lkmscale=0.5,0.5/s at fixed scale s == B (medium 0.7: 0 px differ at thr 0), so c2d's 0.8 / 0.9
captures are B.
popscan (bloom-free masks, GT 16-sample; flagged px / events >= 6 px) and popnew (B's new pops vs AA7 / AA7's pops B removes):
  medium 0.7  AA7 1164 / 16   B 1100 / 16   new 108 px (41 cl, 4 >= 6)   removed  99 px (40 cl, 1 >= 6)
  medium 0.8  AA7 1309 / 35   B 1224 / 32   new 167 px (52 cl, 9 >= 6)   removed 182 px (62 cl, 9 >= 6)
  medium 0.9  AA7 1112 / 29   B 1137 / 38   new 230 px (62 cl, 10 >= 6)  removed 189 px (69 cl, 5 >= 6)
  reverse 0.7 AA7 3862 / 100  B 3812 / 108  new 178 px (60 cl, 6 >= 6)   removed 149 px (44 cl, 7 >= 6)
  (fix A for comparison: medium 0.7 / 0.8 / 0.9 new 42 / 82 / 85 vs removed 24 / 51 / 44, concentrated as dark dots at
  the far-left tiny objects.)
  B changes every reflected detail's vertical sampling at reduced scale, so it trades small pops both ways; net flagged
  px lower at 0.7 / 0.8 / reverse 0.7, +25 px (+2 %) at 0.9. Looked at the largest new clusters (x5-6):
  img/med_s07_Bnew_all_z6.png (0.7: k13-17 x218-227 single-row streak, k25 x972-977, k110 x176: no dot / dash visible,
  B's floe line slightly less smeared; the R-2 tiny object at k109-111 has NO dark dot in B, fix A's dot shown beside),
  img/med_s09_Bnew_x560-600_k22-27_z6.png (0.9 n30 cluster: faint streak changes under the dark line, B ~ AA7, no pop
  visible), img/rev_s07_R2_x70-130_k77-85_z5.png (R-2 zone: B's tiny-object dashes darker and more continuous, closer to
  the GT; no bright split gaps), img/rev_s07_R1_x940-1040_k75-81_z4.png (R-1 bottom gap: B ~ AA7, not darker).
R-1 / R-2 at scale 1: untouched (bit-identical). Below 1 they change with the finer rows (R-2 toward the GT, R-1 ~ AA7).
Cost (rtB.mjs = AA5c's rtpin2 with rowsFull toggled at run time + resize, engine's own rAF, CDP mouse, ABAB blocks of
2.5 s, T1 1440x766): scale 0.7 both at the 60 Hz cap (block medians 16.7 / 16.7 ms, paired median 1.006; one B block 25.6
under a load jump 4 -> 12); scale 0.8 contended (35 ms blocks in both), paired median 0.994. No measurable real-loop
cost on the M4; the mirror target has +43 % (0.7), +25 % (0.8), +11 % (0.9) pixels vs AA7 at that scale (still <= the
full-scale 720x383 target), so a weaker GPU at 0.7 pays at most that share of the mirror pass. Scale 1: no change.
tsc hero + project clean (lane and apply-test clone). Console: 0 lines in every run on :5198 except one
"Failed to load resource: net::ERR_INTERNET_DISCONNECTED" in the reverse-0.7 capture (network dropped during that page
load; the other 14 runs on the same build, incl. the 0.7 idents, have 0 lines).
Patch vs AA7: $SP/work7/g3/aa7g3_vs_aa7.patch (HeroEngine.ts + world/LakeMirror.ts, 58 lines), applies cleanly to a
fresh cp -c -R of aa7 (patch -p1 in the lane root), applied files == lane, tsc clean there. Lab :5198 stopped; temporary
clones (aa7g3b, aa7g3dbg, aa7g3_apply) removed; lane aa7g3 kept (= aa7 + the patch).
Not done in the time box: G10 WebKit / Firefox boot, DPR 2 and the hold / resize event cases with B (B only changes a
render-target size on the existing resize path; ?mrows=0 is the switch).
- 21:44 analysed medium / reverse capture sets deleted (numbers + strips kept); gov / govB kept (small).
