# AA8 tip (AR-1 b / RC-1: the pale spot at the near far floe's thin tip) - 20 Nov 2026, 22:40-23:40 WIB
Lane /Users/muhamadrifaldi/Library/Caches/retrux-lanes/aa8b (cp -c -R of aa7 at 22:41), lab :5198 (watch build; stopped at the end).
WORK = $SP/work8/tip (tools/, caps/, ana/, img/, ident/, dbg/, logs/). Mirror = MAIN/notes/round11/lane_backup/aa8/tip/.
Every browser through slot.mjs; playwright-core 1.49.1 (retrux-lanes/pw). References: AA7 = :5197 (frozen) and its saved caps
($SP/work7/recheck/caps/gov1/fin1 = scale-1 gov path, recheck/caps/gov/fin, fixer/caps/holdre/fin, motion/caps/<path>_A7);
BASE :5182; GTs / masks as the brief.

## RESULT: ok = false
The fix removes the spot at x1 / x4 on the gov path at scale 1 (k61-88), holdre k203-211 and the governor case at 0.9 / 0.8;
at 0.7 mostly (faint light vertical streaks stay at the tip at k77). It moves every pixel it changes toward the image with twice the mirror rows (73-91 % of changed px closer), keeps G1,
tsc, 0 console lines, and `?fftip=0` is exactly AA7. It FAILS the "no new pops" gate: on every path it removes more pops than
it adds, but it adds 1-6 small new clusters (>= 6 px) per path, most of them 1-3 px DARK DOTS inside the light vertical columns
of the far-right floes (x1120-1280, y490-525), plus one at the R-2 zone on medium, and in the hold dolly it adds 62 clusters
(flagged px +9 % vs AA7). A gated variant (`?debug&fftipb=1`) has no new pops but leaves the spot. Needs a lead decision (sec. 7).

## 1. Reproduction (scale 1)
- gov path at scale 1 (jcapS1 --noscale; the recheck's caps): AA7 shows the lighter spot with a vertical edge under the floe's thin
  left tip at k66-86 (img/gov1_tip_k62-90_x110-250_A7_TIP_R2_BASE_z5.png, col 1); BASE has the full pale block (col 4).
- holdre k203-211 (fixer caps): the small rectangle with a hard right edge, x ~136-158 y ~600-612 (img/holdre_k201-211_x90-230_
  A7_TIP_R2_BASE_z4.png, col 1). Probe k207 x125 y607: AA7 121 (= the judge's).
- The 2x-rows image (fftip=0 + lab ?lkmscale=0.5,1 = 720x766 mirror target, as the fixer's option 3) shows no spot in either
  case (col 3 of both strips): I used it as the reference for "what the guard does with enough rows" (toward.mjs).

## 2. Root cause (debug renders, lane-only TIPDBG injection, removed before the patch; dbg/, img/dbg_*.png, img/mir_*.png)
Per lake pixel (?lkhalf=0&lktaa=0) for the walk's most-weighted face: gFt, the two bracketing rows (luma, path length minus the
distance dX from the mirrored camera to X's lookup point), the face colour before / after the guard, the target column / rows;
plus a dump of the mirror target itself around the lookup columns.
- gov path k70 y500, spot x144-164 (target columns 612-622): gFt = 1 (guard on), rows = far shore (42-43 m behind X, luma 0.11)
  + the floe's sunlit inside (0.2-1.1 m behind X, luma 0.6-1.8). NO row is the face. Guard output = the inside: luma 0.6-1.26.
  Left / right of the spot a row is the face (-0.18..+0.17 m, luma 0.1-0.3) and the guard works (0.1-0.3).
- holdre k207 y610, spot x132-148 (columns 620-627): rows = a bright surface 0.57-0.72 m behind X (luma 0.74-0.80) + another
  inside row ~3 m behind. NO face row. Guard output 0.74-0.78 (final 178-189 vs 157-170 around).
- The target itself (mir_holdre_k207.png, mir_gov1_k70.png): the face is less than one row tall and runs at a slight slant across
  the rows, so the half-size target holds it as a STAIRCASE of short steps (holdre: row 333 at columns 614-619, row 332 at 628-630;
  gov: row 330 at 606-611, row 331 at 620-621). On the columns between two steps no row centre lies on the face; the guard's
  bracketing rows there are the inside (and the far shore / a farther surface), so it has nothing to copy. As the camera moves,
  the steps slide, so the gap (the spot) moves and pops. This is the G-3 investigator's 0.7 mechanism, occurring at scale 1.

## 3. Fix (Water.ts only; `?fftip=0` = AA7 exactly; LK_FFTIP_GLSL inserted after the AA5b guard's last line only when on)
When the guard's front row lies LK_FFTIP_G..+0.15 m (0.35-0.5) or more behind X's lookup point (fading out over the guard's
depth band), the two bracketing rows are read 1..6 columns to each side (every column), and a texel that is the face (path length
within 0.6..1.0 m of X's lookup point, 0.15..0.3 m in front of the front row, darker than it by 0.25..0.35 luma) gives the lookup
its colour, nearest columns first (front-to-back accumulation). 24 extra fetches, only in that branch. Lab knobs (with ?debug):
fftipn / fftips / fftipw / fftipg / fftipl, and fftipb=1 (sec. 5). History: a 2-column stride (first build) skipped the far
floes' one-column face steps and flickered them as dark dots (reverse: 524 new pop px, 17 clusters >= 6 px); every column cut that
to 95 px / 3 (caps/reverse_v1-v3, the 3-column-stride v3 kept them).

## 4. Proof (final build; the six G1 caps reproduce exactly: reverse_D vs reverse_TIP 0 px)
- Spot gone (looked at x4-x5 and 1x):
  gov path scale 1 k62-90: img/gov1_tip_k62-90_x110-250_A7_TIP_R2_BASE_z5.png (TIP = 2x-rows image to the eye),
  gov1_k70-78_x0-720_A7_TIP_z1.png (1x). Tip box x40-320 y485-525: 13,925 px-frames darker by > 8 lv, 0 brighter;
  |TIP - 2xrows| 9.2 vs |AA7 - 2xrows| 23.0 lv, TIP closer on 91 % (ana/events.txt).
  governor 1 / 0.9 / 0.8 / 0.7 / 1 (jcap gov): gov_red_k61-93_x80-300_A7_TIP_BASE_z3.png: the spot is gone at 0.9 / 0.8 and
  mostly at 0.7, BUT at k77 (scale 0.7) TIP shows a few faint light vertical streaks at the tip (x ~163-177 y ~490-500).
  holdre k201-211: holdre_k201-211_x90-230_A7_TIP_R2_BASE_z4.png: the rectangle is gone (= 2x rows), a faint speckle remains
  under the line (the 2x-rows image has it too). Box x40-320 y590-625: 8,226 darker / 22 brighter; closer to 2x rows on 91 %.
- popscan / popnew (thr 40, band +-3; bloom-free masks slow / medium / reverse aa5b, leave refl, fast / diag aa5a NEW; GT 16-sample;
  ana/pop3_<p>.txt, pop_reverse.txt, pop_fast.txt, pop_summary.txt). Flagged px / events >= 6 px / px in them:
    path      AA7               TIP               new pops (TIP vs AA7)          pops TIP removes
    slow      1405 / 41 / 315   1364 / 33 / 257   128 px, 68 cl, 1 >= 6 px       144 px, 50 cl, 8 >= 6
    medium    3296 / 102 / 1420 2915 / 80 / 1020  201 px, 109 cl, 5 >= 6         417 px, 123 cl, 22 >= 6
    fast      2577 / 82 / 1001  2427 / 74 / 899   134 px, 43 cl, 6 >= 6          232 px, 74 cl, 13 >= 6
    diag      1884 / 56 / 717   1723 / 47 / 608   114 px, 58 cl, 3 >= 6          215 px, 64 cl, 12 >= 6
    reverse   2285 / 66 / 967   2231 / 64 / 946    95 px, 51 cl, 3 >= 6          121 px, 56 cl, 4 >= 6
    leave     2250 / 65 / 1049  1926 / 55 / 705   112 px, 62 cl, 2 >= 6          330 px, 61 cl, 13 >= 6
    hold*     14905 / 412       16258 / 481       1164 px, 289 cl, 62 >= 6       137 px, 54 cl, 4 >= 6
  (*hold: jcap holdre rows 380-766, a7 = :5197 and BASE :5182 + mask in the same session, BASE as the reference, as the art judge.)
  So: fewer pops in total on all six paths, but NEW ones. Looked at:
  - reverse k110-119 x1135-1185 (img/rev_new_k110-119_x1135-1185_A7_TIP_GT_z6.png, rev_dots_k110-118_x1100-1300_A7_TIP_GT_z4.png):
    a 1-3 px DARK DOT inside the far-right floe's light vertical column in most frames; AA7 and the GT have none. Same class:
    fast k73-75 x1161-1168 (n18), k87-93 x1124-1133; diag k67 x1275-1278; leave k57 x1275-1278; medium k214 x1225-1227 /
    k32 x1260-1264. Mechanism: there the front row is a SUNLIT face standing behind X (the walk's X is the heightfield cell's
    entry, up to 1.25 m in front of the face), and a shadowed face texel a few columns away passes the face test.
  - medium k133-143 x169-173 y539-540 (emax 106-114): the R-2 zone (far-left tiny objects): R-2 is NOT unchanged.
  - hold k194-199 x440-510 (img/hold_new_k194-199_x440-510_A7_TIP_BASE_z6.png): AA7's lighter patch under a floe's line is
    partly removed and flickers / speckles in the fast dolly; top new hold clusters k195-198 x461-483, k204-213 x425-435,
    k203-209 x136-153 (the spot itself: BASE as reference counts its removal), k69-73 x449-457.
- G1 (crawl, NEW masks, stride 2; ana/g1_tip_vs_aa7.txt): unchanged within noise. medium total MC32 -83.1 (AA7 -82.0), FS -82.4
  (= AA7, MCE 2.117 = AA7), FF -85.3 (-84.3), FR -77.4 (-72.6); reverse total -74.5 (-74.0), FS -19.5 (= AA7, MCE 3.854 = AA7),
  FF -84.4 (-83.5), FR -77.7 (-78.3). J32 / J48 within 1-2 points of AA7 in every box. texLake 1.0082 / 1.0114, texSolid ~1.
- Exactness (identS: 20 moving frames, final + mirror / walk / cache / cacheN / reflection + every linked program; vs the fixer's
  saved AA7-final hashes; ana/ident.txt): ?fftip=0 default, &ffblock=0, &lkglide=0, &all five off, &mirrorcost=0, at scale 0.7,
  T0 phone: IDENTICAL; ?fftip=0&lkglide=0&mirrorcost=0 == AA6 ?lkglide=0: IDENTICAL; all six off == BASE: IDENTICAL; ?ffblock=0
  (tip on) == AA7 ?ffblock=0: IDENTICAL. Default vs AA7: walk + final differ; programs differ only rx-water + rx-water-walk.
  The fftip=0 runs were made on the build before the last edit (the lab-only fftipb toggle; the fftip=0 source excludes the tip
  text, so it is unchanged); the final build's default and fftip=0 were re-run (p5198_def3 / p5198_t0def3): same results.
- tsc hero 0 / project 0 (lane and apply clone). 0 console errors / warnings in every session (jcap / cap / ident logs).
- Cost: not timed. The search branch runs only where the guard's front row lies behind X; at gov k70 the tip term changed
  974 of 16,686 water px (5.8 %) in a 600 x 50 box under the far floes (debug render).

## 5. The gated variant `?debug&fftipb=1` (front row must lie past X's foot line, i.e. seen through the clip at the water line)
reverse: new pops 36 px, 27 clusters, 0 >= 6 px (removed 24 px, 0 >= 6): the dark dots are gone. But the spot stays: gov path tip
box only 1,330 px-frames change (img/gov1_tip_k66-86_x110-250_A7_TIPB_R2_z5.png: the pale spot is still there), holdre 41 px-frames
(the holdre front row is on the above-water side of the foot line). So it is off by default. The holdre front row (a bright surface
0.6-0.7 m behind X, above the foot line) cannot be told from a sunlit face standing behind X with the data the guard has.

## 5b. A second discriminator tried and rejected (lab-only build, reverted; ana/varC_pops.txt)
The borrowed texel's column must hold the guard's own case (the face in front, a brighter inside 0.3..16 m behind it in the other
row). Worse: reverse 194 new pop px / 11 clusters >= 6 px (default 95 / 3), fast 153 / 9 (default 134 / 6). The far-right floes
have the same foot structure, so it rejects nothing there and only thins the candidates. The lane was restored byte-exact to the
patch (diff of the lane vs aa7 == tip_vs_aa7.patch).

## 6. Patch
$SP/work8/tip/tip_vs_aa7.patch (85 lines, sha256 b4bdef10cf2c1db8561231161926532cd218497f75af395931d0535bf10f2659;
diff -u --label a/retrux-web/<f> --label b/retrux-web/<f>; Water.ts only; no debug code). Applied to a fresh cp -c -R of aa7 with
patch -p1: clean, 0 .orig / .rej, app/ == lane app/, tsc 0 / 0 there (logs/mkpatch.log). Mirrored to lane_backup/aa8/tip/.

## 7. For the lead
The cause is row starvation (a sub-row face drawn as a staircase), so any fix from the existing target has to guess the face's
colour from neighbouring columns, and the guess sometimes hits a sunlit face in the far floes. Options:
 (1) Accept the spot as is (AA7; = AA6; smaller than BASE's block; ~0.1 s per occurrence; faint at 1x).
 (2) This patch as a base for a follow-up: needs a discriminator between "the inside seen behind a sub-row face" and "a sunlit
     face standing behind X" before it can pass the pop gate (ideas: carry a front-facing / back-facing bit in the mirror target's
     alpha sign, so the inside (back faces) is known; or refine X to the face's true position with a finer heightfield step).
 (3) More mirror rows at scale 1 (the fixer's option 3: removes the spot in both cases, +50-100 % mirror-target pixels, every
     reflection re-sampled, needs its own switch and a full re-judge).

Image names: *_A7_TIP_* = the final default (1-column search); *_FIN_TIP_* and rev_newpop_k19-31_* = the first build (2-column
stride), kept for the history in sec. 3; *_TIPB_* = sec. 5.

## 8. State
- Lane aa8b = aa7 + tip_vs_aa7.patch (only Water.ts differs; the TIPDBG debug injection was removed). Lab :5198 stopped.
- :5197 / :5196 / :5182 untouched (read only). Temporary apply clone aa8b_apply removed.
- Tools: tools/dbgj.mjs (jcap cases + debug modes + mirror target dump), dbgv.mjs / dbgimg.mjs / mirv.mjs (debug readers),
  ar/accmap.mjs, ar/boxsplit.mjs, ar/toward.mjs (new), c*.sh / d*.sh (capture batches), ana.sh / ana3.sh / an2.sh (analysis),
  i1.sh (ident), mkpatch.sh. Kept capture sets: caps/{slow,medium,fast,diag,reverse,leave}_TIP (final default), reverse_B,
  gov1/{tip2,r2,tipB,tipoff}, gov/tip3, holdre/{tip3,r2,tipB}, holdF/{tip3,a7,base}; superseded sets deleted.
