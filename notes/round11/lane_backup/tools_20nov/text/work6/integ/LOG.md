# AA6 integrator log (AA6 = aa3_fixed1 + aa5b.patch (v3) + aa5a (F1)), 20 Nov 2026 (Asia/Jakarta)
LANE = ~/Library/Caches/retrux-lanes/aa6/retrux-web (APFS clone of aa3_fixed1), lab :5196 (left running on the final build).
WORK = $SP/work6/integ (merge/, refs/, tools/, caps/, ident/, progsrc/, ana/, img/). Backup = MAIN/notes/round11/lane_backup/aa6/integrator/.
Switches: ?lkglide=0 (F1 off), ?ffblock=0 (v3 off); with ?aaresolve=0&slabflash=0&lktaa=0 as before.

## 0. Start (17:07)
- Lane == aa3_fixed1 (diff -rq app, hero-lab: identical). aa3_judged -> aa3_fixed1 changes HeroEngine.ts (lab params lktaaclip /
  lktaarefl / lktaafar) and world/EnvEdge.ts (TAA_FRAG: uClipG clip, uFar far taps 3 px, A-1 colour-tap region check, history
  footprint inside the previous frame's region, uPrevAAPlane / uPrevAAExc copied after each TAA draw). Water.ts: aa3_base ==
  aa3_judged == aa3_fixed1. aa5a lane vs aa3_judged: HeroEngine.ts + EnvEdge.ts; aa5b lane vs aa3_judged: Water.ts only.

## 1. aa5b.patch (17:10)
- `patch -p1 --dry-run` clean, applied; lane Water.ts == the aa5b lane's Water.ts (cmp: identical).

## 2. AA5a 3-way merge (17:10-17:12; merge/)
- git merge-file -p ours (aa3_fixed1) base (aa3_judged) theirs (aa5a lane), per file: HeroEngine.ts 2 conflicts, EnvEdge.ts 2
  conflicts, all four "both sides added lines at the same spot" (HeroEngine: the fix round's `tc` lab param line vs AA5a's glide
  option block; the fix round's clip / far spreads vs AA5a's `glide,` in enableTAA's options. EnvEdge: EdgeTAAOptions clip? / far?
  vs glide?; the TAA material's uPrevAAPlane / uPrevAAExc vs AA5a's uGlideW / uGlideC spread). Resolved by keeping both, fix round
  first (merge/resolve.py).
- The semantic conflict git cannot see: AA5a's third glide anchor was AA3's clip line
  `h = clamp(h, max(mn, mu - 1.25 * sd), min(mx, mu + 1.25 * sd));\n  float w = uHistW;\n`, which the fix round rewrote to
  `h = uClipG > 0.0 ? clamp(h, max(mn, mu - uClipG * sd), min(mx, mu + uClipG * sd)) : clamp(h, mn, mx);` -> glideReplace would
  throw at run time. Anchor updated to the fix round's line (replacement text unchanged: with glide on, the glide's own gamma /
  clip mode own the clip; at the product defaults, gamma 1.25 + mode 0, that is exactly fixed1's default clip; the lab param
  ?debug&lktaaclip now acts with ?lkglide=0 only). The other three TAA anchors (uRipple uniform, Catmull-Rom weights, final mix)
  and the four EDGE_FRAG anchors are untouched by the fix round. The A-1 checks, the history-footprint check and the 3-px far
  taps sit before / outside the replaced text, so the glide program carries them (proved on the linked program, section 3).
- Result: resolved EnvEdge.ts = fixed1 + AA5a's additions + that one anchor (+ a 3-line comment); HeroEngine.ts = fixed1 + AA5a's
  additions. tsc hero + project clean (17:11).

## 3. Switch proofs (17:14-17:21; ident.mjs = AA3's tool unchanged: 20 moving frames, final image + mirror / walk / cache /
##    cacheN / reflection targets + every linked program's preprocessed sources; tools/g8a.sh, g8b.sh, cmp.mjs; ident/*.json)
- Reference builds, APFS clones served on my ports (refs/): fixed1 = aa3_fixed1 untouched (:5197), fixed1_v3 = aa3_fixed1 +
  aa5b.patch (:5198), fixed1_f1 = aa3_fixed1 + the merged HeroEngine.ts / EnvEdge.ts (:5197 after fixed1). BASE = :5182.
  Check of the clone: fixed1 clone ident == the fix round's own ident of its final build (aa3fix/ident/g8/lane_t1.json): IDENTICAL.
  (fixed1_f1 uses the merged files, so its row proves that ?ffblock=0 removes v3 exactly; that the F1 inside them is AA5a's
  F1 is shown file by file (resolved vs the aa5a lane's file = the fix round's hunks + the one re-anchored line, section 2) and by
  images / numbers (section 4).)
                                                  final  targets (6)   programs          logs
  AA6 ?lkglide=0            vs fixed1 + v3         SAME   all same      15 all same       0 / 0   IDENTICAL
  AA6 ?ffblock=0            vs fixed1 + F1         SAME   all same      15 all same       0 / 0   IDENTICAL
  AA6 ?lkglide=0&ffblock=0  vs fixed1              SAME   all same      15 all same       0 / 0   IDENTICAL
  AA6 all five off          vs BASE                SAME   all same      14 all same       0 / 0   IDENTICAL
  AA6 ?envlake=plate        vs BASE plate          SAME   2 same        12 all same       0 / 0   IDENTICAL
  AA6 T0 (390x844 DSF 3)    vs BASE T0             SAME   2 same        12 all same       0 / 0   IDENTICAL
  AA6 T2 all five off       vs BASE T2             SAME   all same      14 all same       0 / 0   IDENTICAL
  (expected differences) AA6 default vs fixed1: walk + final; rx-water, rx-water-walk, rx-env-edge, rx-lake-edge-taa.
  AA6 default vs fixed1 + v3: final; rx-env-edge, rx-lake-edge-taa. AA6 default vs fixed1 + F1: walk + final; rx-water, rx-water-walk.
- Image level, 240 moving frames: AA6 ?lkglide=0&ffblock=0 medium (caps/medium_A6g0f0) == the fix round's medium capture of its
  final build (aa3fix/caps/m_far3): 240 / 240 frames byte-identical.
- The linked glide program (progsrc.mjs dump, progsrc/aa6 vs aa6_g0): rx-lake-edge-taa with glide ON contains the fix round's
  taaInPrev + uPrevAAPlane, the A-1 colour-tap check `if (!aaIn(vec2(clamp(ip + ivec2(i, j), ivec2(0), n)) + 0.5)) return;`, the
  history-footprint check `if (!(taaInPrev(hp + vec2(-2.0)) ...)) return;` and the `* uFar` far taps (1x each), plus all four glide
  replacements (uGlideW, Keys cubic, `float mv = ...`, `h = clamp(h, lo, hi)`, `gl_FragColor.a = -c.a`); AA3's clip line is gone
  from it. With ?lkglide=0 the program has the fix round's clip line and none of the glide text. rx-env-edge has gBand (glide) /
  not (lkglide=0). No glideReplace throw: 0 console errors / warnings in every session (15 ident + 2 dump + 4 caps + jcap (3 variants) + g10).
- A-1 with glide on (the judge's holdre case, jcap.mjs run in place, variants AA6 default / ?lktaa=0 twin / ?lkglide=0, 240 frames;
  jbox.mjs = the judge's region-edge count vs its BASE mask):
                                   G4 px on region edge   |l-o|>8 on edge   edge-band mean |l-o|   near-band mean   all G4
    judged AA3 (judge, pre-fix)    146                    38                1.041                   0.140            170
    fixed1 (judge recheck)         0                      0                 0.055                   0.166            26
    AA6 ?lkglide=0 (fixed1 + v3)   0                      0                 0.054                   0.171            17
    AA6 default (glide on)         0                      2                 0.074                   0.288            26043
  The 2 px (k74 x1083 y543, k194 x1057 y492; tools/jbox_where.mjs) are band px 1.2-1.5 px inside the region, 9 lv BRIGHTER than
  the twin (A-1 was dark dashes), from the glide's crisper band edge; zoomed x8 strips lane | lkglide=0 | off
  (img/A1_holdre_k72_76_x1083y543_lane_g0_off_z8.png, A1_holdre_k192_196_...) show no dash or line along the region edge.
  All-G4 26043 (~94 px per Mpx-frame) is the glide's intended band sharpening vs the BLURRED TAA-off twin, as AA5a measured
  (90 / Mpx-frame); L5 moves G4 for F1 to the unblurred resolve (?envedge=0): not measured here (judges).
- tsc hero + project clean in the lane (17:11) and on the patched BASE clone (section 5). G10 (aa5a's g10.mjs, :5196): DPR 1
  1440x766 and DPR 2 (pixel ratio 1.25 -> 1800x957), resize 1100x700 / 1375x875 and back: 0 dark px, 0 logs; live engine (own
  RAF, real mouse, hold): 31 fps (shared machine), governor scale 0.7, TAA ran 399 frames, 0 logs.

## 4. The effects survived (medium 240 frames, cap.mjs unchanged, rows 380-766, :5196; caps/medium_A6 (default),
##    medium_A6g0 (?lkglide=0 = fixed1 + v3), medium_A6f0 (?ffblock=0 = fixed1 + F1), medium_A6g0f0 (= fixed1))
- F1 (aa5a's glide.mjs, its mask medium_mask, motion aa3/ana/medium_F.json, --k1 239 --minc 40 --cap 1 --sstride 3; one run with
  all seven sequences, so every number below uses the same sample set; aa5a's own 4-sequence run in brackets):
                          BASE    AA3     GT      F1(aa5a)        FIX1    F1x (fixed1+F1)  AA6
  REL area5 ALL           0.311   0.226   0       0.209 [0.212]   0.218   0.198            0.195
  REL area5 FS            0.272   0.200   0       0.181 [0.182]   0.188   0.164            0.164
  REL cross ALL           0.310   0.221   0       0.204 [0.206]   0.217   0.199            0.192
  abs area5 v<0.15 FS-all 0.187   0.122   0.124   0.105           0.114   0.094            0.093
  f(|d2|>0.1)             0.446   0.318   0.356   0.252 [0.255]   0.308   0.235            0.227
  solid-side err FS       4.54    4.49    0       3.33 [3.33]     4.46    3.26             3.23
  solid-side err ALL      4.81    4.37    0       4.61 [4.61]     4.36    4.60             3.73
  ESF 10-90 / offset      2.23/-.28 2.23/-.27 1.94/-.11 2.21/-.27 2.23/-.27 2.20/-.27       2.06/-.11
  F1's step on its own base: aa5a AA3 -> F1 REL ALL -7.4 %, FS -9.4 %, FS solid-side -26 %; here FIX1 -> F1x REL ALL -9.0 %,
  FS -12.9 %, FS solid-side -27 %: the same effect (slightly larger on the fix round's 3-px band). AA6 = F1x on every jerk
  measure (REL ALL 0.195 vs 0.198, FS 0.164 vs 0.164). AA6's lower solid-side / lake-side error and ESF offset (-0.11 = GT's)
  come from v3 (FF 5.63 -> 4.23, FR 3.54 -> 2.74, WR 4.58 -> 3.80; lake-side ALL 10.17 -> 7.47): its corrected reflection
  colour right under the waterlines (aa5b: those pixels move toward the GT).
- FS slice (aa5a's slice.mjs, row 690 x330-385, k0-239; img/slice_medium_FS_row690_BASE_AA3_F1_FIX1_AA6_GT.png + two zooms):
  BASE steps, AA3 / FIX1 small steps and lumps, F1 (aa5a) and AA6 a nearly continuous edge (alike), GT crisp + continuous.
- v3 (aa5b's popscan.mjs / popnew.mjs, its clean mask medium_bmask, GT aa3 medium_gt, thr 40, band +-3, k1-239):
                     flagged px / px in events >= 6     (aa5b's numbers reproduce exactly in this run: BASE 40257 / 33706,
    BASE             40257 / 33706                       AA3 12090 / 9004, V3 5112 / 2653)
    AA3 (judged)     12090 / 9004
    V3 (aa5b)         5112 / 2653     vs AA3   -58 % / -71 %
    FIX1             10483 / 7866
    V3x (fixed1+v3)   4160 / 2134     vs FIX1  -60 % / -73 %
    AA6               3281 / 1529     vs FIX1  -69 % / -81 %
  new vs removed pops (popnew): aa5b v3 vs AA3 new 736 px (22 clusters >= 6 px) / removed 7798 (162); fixed1+v3 vs fixed1
  new 616 (17) / removed 7025 (158); AA6 vs fixed1 new 486 (12) / removed 7336 (164).
- Strips / slices (img/strip_medium_FF_k48_64_BASE_AA3_V3_FIX1_AA6_GT.png, cslice_medium_FF_col230_..., strip_FF_k60_64_V3_FIX1_
  AA6_GT_zoom.png): the pale block under the near far floe (from k52) is in BASE, AA3 and FIX1 and gone in V3 and AA6 alike;
  the small soft lighter patch left under that floe at k62-64 is in aa5b's V3 too (same in AA6), not new.
- crawl (aa5a's crawl.mjs, medium_mask, ref BASE, k1-239 stride 2):  MC32 tot / J32 tot / J48 tot / MCE tot / eg tot
    AA3 -69 / -16 / -33 / -19 / -6 %; GT -62 / -14 / -25 / -22 / -100; FIX1 -73 / -20 / -37 / -24 / -7; F1x -77 / -27 / -43 / -32 / -7;
    V3x -79 / -27 / -44 / -27 / -22; AA6 -82 / -33 / -48 / -35 / -22.
  AA6 MC32 per box FS -83, WR -70, DR -88, FF -83, FR -71, RS -88 (all >= 50 %). L4: AA6 J32 / J48 per box vs GT: FS -11/-8 (GT
  -9/-1), WR -20/-21 (-13/-16), DR -11/-19 (-8/-10), FF -44/-68 (-17/-35), FR -44/-64 (-17/-34), RS -37/-34 (-19/-9): every
  reduction >= GT's (L4 floor met; the larger ones need G2's no-lag / smear check: judges). Texture lake 1.0114 (v3's change under
  the floes; aa5b had 1.0115), solid 1.0003.

## 5. Patches (17:28; tools/mkpatch.sh, tools/applytest.sh)
- aa6.patch = AA6 lane vs BASE (aa3_base): 3 files (HeroEngine.ts, world/EnvEdge.ts, world/Water.ts), 805 lines.
  aa6_vs_fixed1.patch = AA6 lane vs aa3_fixed1: the same 3 files, 352 lines. Paths a/retrux-web/... b/retrux-web/... as aa3.patch
  (`patch -p1` from the folder that holds retrux-web; node_modules / dist / .next / tsbuildinfo / next-env.d.ts excluded).
- applytest: each on a fresh `cp -c -R` clone (aa3_base, aa3_fixed1): dry run + real `patch -p1` clean, `diff -r` vs the AA6
  lane's sources: IDENTICAL, 0 .orig / .rej; tsc hero + project clean on the patched BASE clone.
- Mirrored to MAIN/notes/round11/lane_backup/aa6/integrator/: aa6.patch, aa6_vs_fixed1.patch, LOG.md, img/, ident/, ana/, tools/,
  merge/ (base / ours / theirs / merged-with-markers / resolved files), progsrc_taa/ (the linked TAA programs, glide on / off).

## STATE (17:40): DONE. AA6 lab :5196 left running on the final build (built 17:12 from the final sources; the lane was not
## changed after). My reference labs :5197 / :5198 stopped; their clones stay in $SP/work6/integ/refs/. :5182 / :5195 / :5181 /
## :3000 / :3001 / :5180 untouched; no browser of mine left.
- Merge: 4 textual conflicts (all add/add, kept both) + 1 semantic (AA5a's clip anchor, rewritten by the fix round) fixed by
  re-anchoring on the fix round's clip line. Nothing else changed; no new behaviour beyond the two lanes.
- Switches exact (ident, all targets + programs): ?lkglide=0 == fixed1 + v3; ?ffblock=0 == fixed1 + F1; both == fixed1 (also
  240 moving frames byte-identical to the fix round's own capture); all five off == BASE (T1, T2); plate, T0 == BASE.
- Glide on keeps A-1 fixed (region-edge G4 0, edge-band |l-o| 0.074 lv vs pre-fix 1.041).
- Effects within noise of (or slightly beyond) the originals: F1 on fixed1 REL -9 % (aa5a -7 %), FS -13 % (aa5a -9 %), FS
  solid-side -27 % (aa5a -26 %), FS slice like aa5a's F1; v3 on fixed1 pops -60 % / -73 % (aa5b -58 % / -71 %), new / removed
  616 / 7025 px (aa5b 736 / 7798), the pale block gone in the strips like aa5b's v3.
- G7: not measured (AA5c owns it). The merged build runs exactly the two lanes' shader changes, no extra pass or draw: F1's ~10
  ALU per band px in the TAA and ~10 per px in the edge pass (aa5a: ~+1 %, inside noise), v3's guard in the walk (aa5b: free
  within +-3 %).
- For the pre-judges: ?debug&lktaaclip (the fix round's lab clip param) only acts with ?lkglide=0 (glide owns the clip: lkggam /
  lkgclip). Open items carried over unchanged: A-2 (reduced-scale TAA outliers, L7), A-3 (knee, L6), G4 per L5 (vs ?envedge=0,
  DPR 2, sharpness pumping at stop / start), G2 (fast sweeps, reversals, hold, governor scale changes) on the merged build.
