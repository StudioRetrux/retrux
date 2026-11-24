# AA7 FIXER after the final judges (20 Nov 2026, Asia/Jakarta; 21:49 - 22:15; time box 70 min)
Lane /Users/muhamadrifaldi/Library/Caches/retrux-lanes/aa7/retrux-web (the cache path is a symlink to
/Users/muhamadrifaldi/RetruxR11Work/lanes), lab :5197 (restarted 21:51:43 on the final build, left running).
WORK = $SP/work7/fixer (tools/, caps/, ana/, img/, ident/, g10/, logs/). Backup = MAIN/notes/round11/lane_backup/aa7/fixer/.
Every browser through slot.mjs; playwright-core 1.49.1 (retrux-lanes/pw) for Chrome, 1.65.1 (RetruxR11Work/pw165 +
ms-playwright) for WebKit / Firefox. Tools copied from $SP/work7/g3/tools (identS, identcmp, cap with --eval, popnew),
$SP/work7/artrefl/tools -> tools/ar (jcap, strip, jgt2) and $SP/work7/motion/tools -> tools/mo (crawl, j48loc).
Findings to fix: M-1 (minor, motion lens), AR-1 (minor, artifacts lens). G-3 investigator: ok = true -> fix B applied.

## RESULT
- AR-1 (a) (render scale 0.7, gov): FIXED by the G-3 investigator's fix B (applied, scale-1 identity re-proven on the final lane).
- AR-1 (b) (render scale 1, hold dolly after a re-press): NOT FIXED. Needs a lead decision (section 3). The judge's suggested
  remedy (fix A's rule at every scale) was tested in a lab clone: it does NOT remove (b) and adds pops at scale 1.
- M-1 (slow WR J48, knee 1.0): NOT CHANGED. The knee is a binding lead decision (L10). Option-2 data measured (section 4):
  knee 0.75 still misses the cell (by 0.14 points).
- G8 exact (section 5), tsc clean, G10 WebKit / Firefox boot at scale 1 and 0.7 (section 6), aa7.patch regenerated and
  apply-tested (section 7).

## 0. Lane changes
- 21:51 `cp -c -R aa7 aa7pre`: the judges' AA7, kept as the reference for the re-proof (served on :5199 from 21:51 to 22:00).
- G-3 fix B: `cd retrux-lanes/aa7 && patch -p1 < MAIN/notes/round11/lane_backup/aa7/g3/aa7g3_vs_aa7.patch`. The dry run was
  clean (HeroEngine.ts, world/LakeMirror.ts; no fuzz, 0 .orig / .rej), and the lane's app/ equals the G-3 lane aa7g3's app/
  (diff -rq). Nothing else in the lane was edited.
- tsc in the lane: `npx tsc -p tsconfig.hero.json --noEmit` 0, `npx tsc -p tsconfig.json --noEmit --incremental false` 0.

## 1. G-3 fix B: scale-1 identity re-proven on the final lane
identS.mjs (= ident.mjs + --scale): 20 moving frames; it compares the final image, the mirror / walk / cache / cacheN /
reflection targets and every linked program. Final :5197 vs pre-fix AA7 :5199 (ana/i1_final_vs_pre.txt, ident/*.json):
  default / ?ffblock=0 / ?lkglide=0 (scale 1)       IDENTICAL (6 targets, 16 programs, 0 / 0 console lines)
  all five off / ?mirrorcost=0 (scale 1)            IDENTICAL (15 programs)
  ?ffblock=0 at 0.7 and at 0.9                      IDENTICAL / IDENTICAL
  ?mrows=0 at 0.7 vs AA7 at 0.7                     IDENTICAL
  T0 phone (390x844, DSF 3)                         IDENTICAL (2 targets, 12 programs)
  default at 0.7                                    mirror, walk and final differ; programs identical (expected)
Mirror target: 0.7 -> 504x383 (AA7 504x268), 0.9 with ?ffblock=0 -> 648x345 (= AA7), 1.0 -> 720x383 (= AA7).
Event cases (section 2 / 3 captures): gov frames k0-24 and k100-119 (scale 1, including after the 0.7 -> 1 step): 0 px
differ at threshold 0. holdre (scale 1, 240 frames, rows 560-660): 0 px differ at threshold 0.

## 2. AR-1 (a), render scale 0.7 (gov): FIXED
Repro = the judge's: jcap gov (rows 380-766) with variants pre (:5199 = AA7), fin (:5197 final), f0 (fin ?ffblock=0) and
base (:5182 + mask). Strip x80-200 y485-525, k87-95, x4. All four variants: 0 console errors / warnings.
- Reproduced in pre: the small lighter rectangle at the floe's thin left end at k90-92, plus the light vertical line / hard
  right edge at k90 (img/gov_s07_k87-95_x80-200_PRE_FIN_F0_BASE_z4.png).
- After (fin): the rectangle and the edge are gone; the water under the floe is even. F0 and BASE keep the full pale block.
  Looked at x4 (above), x6 (img/gov_s07_k89-93_x95-195_y490-516_PRE_FIN_F0_BASE_z6.png) and 1x
  (img/gov_s07_k89-93_x0-420_PRE_FIN_BASE_z1.png: pre's faint lighter patch is gone in fin; BASE's block stays plain).
- Numbers (ana/gov_pale_pre_vs_fin.txt, FF box x0-680 y470-560, k76-99 at 0.7): pre is brighter than fin by > 20 lv on
  683-1113 px per frame (the G-3 investigator measured 730-1075). Fin is brighter than pre by > 20 lv on 1-162 px per frame,
  scattered. Probe k91 y503 x113-129, step 4 (the judge's pixels: A7 113-129 vs BASE 92-103): pre 129 126 118 119 113,
  fin 124 118 105 108 102, f0 = pre, BASE 103 100 92 96 97. Fin sits between pre and BASE there, with no edge (x6 strip).
- Governor steps (ana/gov_dF_steps.txt, mean |F(k) - F(k-1)| on rows 450-766): at the steps k25 / 50 / 75 / 100, fin
  6.76 / 6.44 / 3.98 / 4.83, pre 7.04 / 6.55 / 4.39 / 5.28, BASE 7.21 / 6.76 / 4.48 / 5.33. No spike; fin is slightly
  smaller (the rows no longer change at a step). Looked at img/gov_step07_k74-77_x0-560_PRE_FIN_z1.png and
  gov_step10_k99-102_x0-560_PRE_FIN_z1.png: no flash, no empty lake, and pre = fin from k100.
- At 0.9 / 0.8 fix B also re-samples the other reflected details (as the G-3 investigator reported). Rows 450-766, pre vs fin
  by > 20 lv: 0.9 pre brighter on 93-473 px per frame and fin brighter on 51-392; 0.8 89-350 and 109-381
  (ana/gov_s09s08_pre_vs_fin.txt). The largest site, k37-40 x880-1000 y466-500 (the bright reflections under the far slabs),
  is in img/gov_s09_k37-40_x880-1000_PRE_FIN_BASE_z4.png: at x4 fin's streaks are a little more defined. At 1x
  (img/gov_s09_k37-39_x560-1240_PRE_FIN_z1.png) pre = fin to the eye, with no dot, dash or column.

## 3. AR-1 (b), render scale 1 (holdre, after the re-press): NOT FIXED, needs a lead decision
Repro = the judge's: jcap holdre (rows 560-660) with pre / fin / f0 / base:mask. Strip x100-200 y598-628, k203-209 step 2, x5:
img/holdre_k203-209_x100-200_PRE_FIN_F0_BASE_z5.png. Reproduced exactly. Pre = fin (0 px differ in all 240 frames: fix B
does nothing at scale 1). Both keep the small lighter rectangle with a hard right edge (x ~136-158, y ~600-612), where
f0 and BASE show the full-width strip. Probe k207 x125 y607: pre / fin 121, f0 146, BASE 157 (the judge's 121 / 146 / 157).
Why it is not fixed here:
- The judge's suggested remedy is the G-3 investigator's fix A rule without the scale gate. I TESTED it (data only, not
  shipped) in the lab clone retrux-lanes/aa7fxA = final + fixA_vs_aa7.patch with uLkFfbS = 1 at every scale, on :5199:
  * It does NOT remove (b). holdre k199-213, fxa vs fin: 0 px > 20 lv, max 4 lv; probe k207 identical
    (img/exp_holdre_k203-209_x100-200_FIN_FXA_BASE_z5.png: fin = fxa, and the rectangle stays). Over all 240 hold frames
    it darkens 46,221 px-frames by > 4 lv elsewhere (ana/exp_holdre_fxa_vs_fin.txt).
  * It adds pops at scale 1. popnew on medium (bloom-free mask, 16-sample GT): 336 new px (77 clusters, 11 of 6 px or more)
    vs 140 removed (61 clusters, 6 of 6 px or more). The new pops are at the far-left tiny objects, x80-164 y539-569, the
    same R-2 zone where the G-3 investigator saw fix A's dark dots at 0.7 / 0.8 / 0.9
    (ana/exp_popnew_medium_fxA_vs_A7.txt, ana/exp_popnew_medium_A7_vs_fxA.txt). Reverse: section 3b.
  So fix A's rule does not cover (b). Section 3b shows that (b) is a row-resolution case: more mirror rows remove it. Fix A's
  rule does not catch it, so its "the other row is darker" condition, or the guard's band, probably fails there. That is not
  confirmed with debug renders.
- Any guard change at scale 1 changes the default path. That (i) breaks the binding G8 identity ?lkglide=0&mirrorcost=0 ==
  AA6 ?lkglide=0 unless the change gets its own switch, and (ii) voids the final judges' default-path verdicts (G1 FF box,
  pops on six paths, rest L3). It cannot land in a fixer round without a re-judge.
Options for the lead:
  (1) Accept (b) as a pre-existing minor. It is the same in AA6, smaller and fainter than BASE's block, and lasts 3-8 frames
      (~0.1 s) of the hold dolly after a re-press. At 1x you see it only if you look for it.
  (2) A separate round for (b): debug renders at holdre k203-211, scale 1 (the G-3 debug outputs m12 / m13 / m14), then a
      fix behind its own switch, then a re-judge of the default path (pops on six paths, rest L3, G1 FF, holdre / gov looks).
  (3) More mirror rows at scale 1 (fix B's idea taken further). Section 3b shows that 1.5x or 2x rows remove (b). Cost:
      +50 % / +100 % mirror-target pixels at scale 1 (G7, not timed here). Every reflection's vertical sampling changes, so
      the default path needs a re-judge, plus its own switch for G8.

## 3b. AR-1 (b) data for options (2) / (3) (lab only, nothing shipped)
- Fix A at every scale on reverse (bloom-free mask, GT reverse_gt): 239 new pop px (44 clusters, 12 of 6 px or more) vs 74
  removed (27 clusters, 4 of 6 px or more), again at x65-159 y537-551 = R-2 (ana/exp_popnew_reverse_*.txt). Together with
  medium (+336 / -140 px), fix A at scale 1 is net worse and does not touch (b). REJECTED as a remedy for (b).
- Full-height mirror rows at scale 1 (the lab's ?lkmscale=0.5,1 -> 720x766 instead of 720x383, final lane, holdre with
  fin / r2): the rectangle is GONE. img/exp_holdre_k203-209_x100-200_FIN_ROWS2X_BASE_z5.png: the face's dark reflection
  runs evenly under the floe, with no hard edge. Probe k207 y607 x121-157, step 4: fin 189 121 129 132 145 155 166 146 135
  132; 2x rows 199 105 96 67 73 76 76 99 110 112; BASE 190 157 158 160 175 174 188 195 181 150. So (b) IS a row-resolution
  (bracketing) case at the half-height target. The guard's existing rule does not catch it, and neither does fix A's rule
  (the row above the face's top is not darker there).
  But it changes every reflection at scale 1: rows 560-660 over 240 frames, 241k px-frames brighter and 381k darker by
  > 8 lv. At 1x it looks the same (img/exp_holdre_k205-209_x0-720_FIN_ROWS2X_z1.png), but it would need a full re-judge.
  It costs +100 % mirror-target pixels at scale 1 (not timed here), and it breaks the G8 identity with AA6 ?lkglide=0
  unless it gets its own switch. This is option (3), and it is the lead's call (G7 / L8 cost and a re-judge).
- 1.5x rows at scale 1 (?lkmscale=0.5,0.75 -> 720x575, +50 % mirror-target pixels) also removes the rectangle.
  img/exp_holdre_k203-209_x100-200_FIN_ROWS15_ROWS2X_BASE_z5.png has columns fin | 1.5x | 2x | BASE. Probe k207: 1.5x
  112 119 67 75 77 76 113 124 122, close to 2x. Caveat seen at x5: both row variants show a faint row of tiny white specks
  under the floe's dark line at k205-207 (x ~120-145) that fin does not. That needs checking in the round that takes
  option (3).

## 4. M-1: slow WR J48 (L4) vs knee 1.0 (L10): NOT CHANGED, lead decision
- Reproduced with the judge's crawl.mjs (NEW mask, stride 2, ref BASE, k1 159) on the judge's AA7 slow caps. These equal
  the final lane at scale 1 (section 1). AA7 WR J48 2.55 per 1000 (-32 %), GT 2.29 (-39 %). Exact event counts (j48loc.mjs):
  BASE 1071, AA7 733 (-31.56 %), GT 656 (-38.75 %). The floor (GT - 5) is -33.75 %, i.e. at most 709 events. AA6 (the
  judge's same-caps run): 686 (-35.95 %).
- Knee 1.0 is binding (L10), so I did not change it. Data for the judge's option 2, with NO code change: the knee was set live
  to 0.75 on the final lane (the shared uniform object `__hero.pipeline.aa.read.uAAKnee.value = 0.75`, writers and readers;
  HeroEngine sets it only once, at init) through cap.mjs --eval, slow 160 / medium 240, rows 380-766 (0 console lines):
    slow WR J48 at 0.75: 2.48 per 1000 = 711 events = -33.61 %. That still misses the -33.75 % floor, by 0.14 points
      (2 events in 287k band px-frames). FS J32 / J48 -26 % / -49 % (GT -15 / -12: pass). Every MC32 box is within 1 point
      of AA7 (total -82 %). texLake 1.0073, texSolid 1.0003 (ana/crawlK075_slow.txt, ana/j48loc_slow_WR_K075.txt).
    Thin dark features (jgt2 medium, the art judge's tool: px-frames > 4 lv outside BASE's 3x3): 0.75 -> 5,222 (thin-dark
      subset 3,963); 1.0 -> 3,943 (3,100), which equals the art judge's number; AA6 at 0.5 -> 8,240 (6,212, art judge).
      So 0.75 keeps 63 % of AA6's over-darkening, and 1.0 keeps 48 % (ana/jgt2_medium_K075.txt, ana/jgt2_medium_A7.txt).
    Interpolating (686 at 0.5, 711 at 0.75, 733 at 1.0), only a knee of about 0.72 or lower passes the cell literally,
    and by 1-2 events.
- Options for the lead: (1) accept the cell under L10 (the judge's option 1). It is invisible: the events sit on the same dark
  rock edge in every variant, and AA7 = AA6 to the eye at 4x. (2) A knee of about 0.7 with the glide. It would pass L4 by
  ~1 event, keep about two thirds of AA6's thin-dark over-darkening, and need the full G1 + jgt2 re-check. A knee of 0.75
  does not pass.

## 5. G8 at the end, on the final :5197 (identS.mjs; ana/g8_part1.txt, ana/g8_part2.txt)
  final ?mirrorcost=0 vs final default          targets + final SAME; programs differ only in rx-lake-sky, rx-lake-sky-late
                                                and rx-plate-baked-mirror (AA5c, as designed)
  final ?lkglide=0&mirrorcost=0 vs AA6 ?lkglide=0 (:5196)   IDENTICAL (6 targets, 15 programs)
  final all six off vs BASE T1 (:5182)           IDENTICAL (14 programs)
  final T2 all six off vs BASE T2                IDENTICAL (14 programs)
  final ?envlake=plate vs BASE ?envlake=plate     IDENTICAL (12 programs)
  final T0 vs BASE T0                             IDENTICAL (12 programs)
  (all six = aaresolve, slabflash, lktaa, lkglide, ffblock, mirrorcost; ?mrows=0 is exact by section 1.) 0 console lines in
  every ident run.
  Re-run at 22:12 with the original ident.mjs (tools/fx_g8x.sh, ana/g8x_ident.txt): the same six results. ident.mjs equals
  identS.mjs on the final default (all targets and programs), so the run is deterministic across the two tools.

## 6. G10 on the final build (g10x.mjs; 60 stepped medium-sweep frames; lane :5197 and BASE :5182; scale 1 and 0.7)
My copy of g10x takes --scale (the judge's copy hard-codes scale=1). At ?scale=0.7 fix B's sizing runs.
  WebKit (Safari 27.2 engine): boots T1 with the TAA on and mirrorEvery 1, 0 console lines at 1 and at 0.7. The HUD reads
    "scale 0.70". I looked at g10/webkit_s07/webkit_lane_screenshot.png: a normal frame.
  Firefox 159: boots T1 with the TAA on. The lane prints 10 console lines, the same set as the perf judge's pre-fix AA7 run
    (P-3, debug mode only); BASE prints 8. The same at 0.7.

## 7. aa7.patch vs BASE + apply-test (tools/mkpatch.sh, logs/mkpatch.log)
  aa7.patch: 1078 lines, sha256 c91c97fd0afb6f5d73246cb65eefd4624ffd5ef7c29ae0f034abc7dca95c840a. Six files: HeroEngine.ts,
  shaders/chunks.ts, world/EnvEdge.ts, world/LakeMirror.ts, world/PlateEnvironment.ts, world/Water.ts
  (diff -u --label a/retrux-web/<f> --label b/retrux-web/<f> against aa3_base). Lane vs BASE: no other source differences
  (node_modules, dist, .next, tsbuildinfo and logs excluded).
  On a fresh `cp -c -R aa3_base`, `patch -p1` applies cleanly, with 0 .orig / .rej; app/ equals the lane's app/ (diff -rq);
  tsc hero 0 / project 0. The lead's lane_backup/aa7/lead/aa7.patch is untouched; the new one is in this folder.

## 8. State (22:15)
- :5197 runs the final build: pid 32883, cwd retrux-lanes/aa7/retrux-web, built 21:51:43 from the lane = BASE + aa7.patch
  (this folder). It answers HTTP 200. :5182 (BASE) and :5196 (AA6) were not touched. :5199 is stopped.
- Lane edits: only the G-3 fix B patch. The knee is still 1.0 with the glide (L10). The guard is unchanged.
- Removed: the clones aa7pre, aa7fxA (the experiment) and aa7fx_apply (the apply test). The G-3 lane aa7g3 is kept, untouched.
- Capture sets deleted after analysis (knee 0.75 slow / medium, fix A medium / reverse / rest, the rows tests). Kept: caps/gov
  and caps/holdre (pre / fin / f0 / base, 0.8 GB), the before / after evidence for AR-1. Re-run with tools/fx_r.sh.
- Tools: tools/fx_i1.sh (identity vs pre-fix), fx_g8.sh + fx_g8x.sh (G8 with identS / ident), fx_r.sh (gov + holdre
  repros), fx_k.sh (knee 0.75 data), fx_e.sh / fx_r2.sh / fx_r3.sh (AR-1 (b) experiments), fx_g10.sh, mkpatch.sh,
  palecmp.mjs / dfstep.mjs / dcell.mjs (small comparators on lib.mjs).
- Not done: real-loop cost of fix B at 0.7 on this machine (the G-3 investigator measured both variants at the 60 Hz cap),
  DPR 2 at a reduced scale, and a GT-based crawl at 0.8 / 0.9. Fix B does nothing at scale 1, so the DPR 2 and resize event
  cases at scale 1 are unchanged (identity, section 1).
