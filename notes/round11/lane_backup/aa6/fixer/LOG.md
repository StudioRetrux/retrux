# AA6 FIXER log (after prejudge-glide + prejudge-refl), 20 Nov 2026 18:37-19:5x (Asia/Jakarta)
LANE = ~/Library/Caches/retrux-lanes/aa6/retrux-web, lab :5196 (left running on the FINAL build, built 19:22).
WORK = $SP/work6/fix (tools/, caps/, ana/, img/, ident/ ident2/, refs/, logs/). Backup = MAIN/notes/round11/lane_backup/aa6/fixer/.
Every browser through slot.mjs; every tool copy loads playwright-core from $SP/work6/glide/pw (G-5: MAIN's copy had 267
dataless files at 18:40). References: fixed1 + new v3 (:5197, $SP/work6/fix/refs/fixed1v3n) and fixed1 + new F1 (:5198,
refs/fixed1f1n), both APFS clones of aa3_fixed1 with the lane's files copied in; BASE :5182 untouched.
Variants: a6 = AA6 default, g0 = ?lkglide=0 (fixed1 + v3), f0 = ?ffblock=0 (fixed1 + F1), FIX1 = fixed1, GT = 16-sample.

## RESULT (what changed in the lane, vs the integrator's AA6)
- EnvEdge.ts (G-1): the glide's `tail` ramps back IN over TAA_HEAD = 12 moving frames (0.2 s) instead of switching to 1
  at once; a frame without history (hand-over, resize, jump, governor step) sets it to 0, so the next frames ramp in from
  there; the stop side (24-frame tail) is unchanged (min(target, tail + 1/12) = target when stopping). CPU only: the TAA
  and edge programs are byte-identical to the integrator's (G8 ident). `?lkglide=0` never reaches this code.
- Water.ts (R-1 / R-2): in v3's guard (LK_FFB_GLSL) a farther row takes the front row's colour only when it is at most
  LK_FFBD0..LK_FFBD1 = 8..16 m behind it (smoothstep fade; the far shore / sky over a low face lies farther) AND brighter
  than the front row by up to LK_FFBL = 0.05 luma (smoothstep from 0). Lab: ?debug&ffbd0 / ffbd1 / ffbl. Only inside the
  `ffblock` text, so `?ffblock=0` is still fixed1 + F1 exactly.
- HeroEngine.ts, chunks.ts: unchanged from the integrator (the knee change R-3 and a G-2 motion gate were built, measured
  and taken out again: sections G-2 and R-3).
- Patches: aa6.patch (vs BASE) 3 files 831 lines; aa6_vs_fixed1.patch 3 files 392 lines; both apply clean on fresh clones
  and reproduce the lane exactly (applytest below); tsc hero + project clean in the lane and on the patched BASE clone.

## G-1 (major) FIXED: the one-frame waterline snap when the camera starts
Repro first (prejudge-glide's numbers, before): holdre k13 a6 1371 / 492 / 102 px > 4 / 8 / 16 lv vs g0 160 / 40 / 7;
pump k1 1024 / 314 / 50; leavere k2 1319 / 439 / 80; band grad^2 +1.7 % in one frame.
After (jcap.mjs, same cases, a6 / g0 / BASE; stepcnt.mjs):
                         a6 (fixed)            g0 (fixed1 + v3)      BASE
  holdre k13             195 / 59 / 12         160 / 38 / 7          236 / 74 / 17
  holdre k14             225 / 93 / 29         176 / 56 / 15         227 / 96 / 44
  pump k1 (restart)      233 / 73 / 12         181 / 42 / 8          238 / 91 / 17
  pump k2                218 / 95 / 27         180 / 71 / 18         227 / 102 / 28
  leavere k2             227 / 85 / 14         167 / 53 / 9          219 / 98 / 21
  a6 within 1.2-1.9x g0 on every frame k12-22 (target: within ~2x) and at or below BASE; band grad^2 now rises over the
  12-frame head (holdre 241.3 -> 241.5 -> 242.3 -> 244.0 -> 245.1 ... 247.8 at k21) instead of +1.7 % in one frame.
  The rows above were captured on an intermediate build (the same ramp code, plus knee 1.0 and the G-2 gate, which only
  acted above 0.5 px per frame); the FINAL build gives holdre k13 195 / 55 / 15 and k14 220 / 92 / 29 (section FINAL).
- Change maps (x8), looked at: img/holdre_press_k13_leftslab_dmap_a6fix_g0_z2.png (the dotted line along the slab
  waterlines in the pre-judge's MB/img/holdre_press_k13_leftslab_dmap_a6_g0_z2.png is gone: a6 black like g0) and
  img/pump_start_k1_FS_dmap_a6fix_g0_base.png (vs MB/img/pump_start_k1_FS_dmap_a6_g0_base.png: the line is gone).
- Side checks: reversals / 3-frame flick (fastrev, 120 f): no frame with a6 > 2x g0 (> 4 lv), totals a6 <= g0 <= BASE,
  grad^2 tracks g0 through k84-92. Governor steps (gov: 0.9 / 0.8 / 0.7 / 1.0): after each reset (k25, k100) a6's
  per-frame change <= ?envedge=0 and BASE, grad^2 254.1 -> 253.3 -> 252.9 ... (no one-frame step). 0 console lines.

## G-2 (major) NOT FIXED: needs the lead's decision (a); the per-pixel speed gate (b) was built, measured and removed
- Cause split (reverse, the integrator's build, lab params): band sigma 0.6 at every speed (?lkgsb=0.6) -> FS MC32 -41 %;
  fast history weight 0.5 (?lkgwf=0.5) -> -15 %; AA6 -22 %; fixed1 -36 %; GT -19 %. So it is the band sharpening.
- (b) built as the pre-judge suggested: EDGE_FRAG_GLIDE recomputed the TAA's own reprojection motion per band px (same ray,
  3x3 nearest distance, previous view-projection) and blended the band weights back to sigma 0.6 with smoothstep(0.5, 1.0,
  mv). Measured (NEW masks, FS MC32 %): fast -23 -> -32, reverse -22 -> -30, diag -40 -> -50, leave -40 -> -49: fast and
  reverse still miss the 40 % bar (fixed1 itself is -36 there). Costs: medium G1c REL ALL 0.2017 -> 0.2063, ESF 2.06 / -0.11
  -> 2.15 / -0.17 (GT 1.94 / -0.11), solid-side error 3.71 -> 4.20 (ana/glide_medium_knee.txt), slow REL 0.2167 -> 0.2208.
  Why a speed gate cannot pass: the FS waterline's own motion overlaps between the paths (lake-plane points of the FS box,
  ana/ mvbox: slow p50 0.45 / p90 0.65 px per frame, fast p50 0.69, reverse p50 0.68, medium p50 0.28 / p90 1.26): a gate low
  enough to blur fast / reverse also takes the glide off the slow path. Removed (the final EDGE_FRAG_GLIDE == aa5a's).
- So the lead's (a) remains: FS on fast paths at the 16-sample GT's own level (reverse GT -19 / -20 %), MCE better than
  fixed1 and GT; every other box and every total passes. FINAL table below.

## G-3 (minor) NOT FIXED (forwarded to the v3 owner): pale block under the near far floe at render scale 0.7
- Re-captured gov with the fixed lane: img/gov_s07_FF_paleblock_k89-93_a6fix_raw_base_z4.png is the same as the pre-judge's
  (smaller rectangle k91-93 in a6 and ?envedge=0 alike, BASE the full block): R-1 / R-2 do not touch it. It needs the
  v3 owner's investigation of the row bracketing at the governor's reduced scales (a design question, not a parameter).

## G-4 (minor) NOT A LANE FIX: which G1 masks count is for the lead's final-judge brief. I used the NEW (aa5a bloom-free
coverage) masks throughout, as the pre-judge recommends.

## G-5 (minor) ENVIRONMENT: MAIN/hero-pipeline/tools/node_modules/playwright-core had 267 dataless files at 18:40 (disk 97 %,
13 GiB free). Not touched; all my tools createRequire from $SP/work6/glide/pw (offline 1.49.1 copy): 0 hangs in 16 batches.
(One slot.mjs race at 18:50: two of my batches started together and the second's lock was taken over as 'stale', so a third
batch got a slot while two browsers ran; I stopped that third batch at once and chained it after the first.)
Deleted nothing of others'. For the final judging: use that copy or materialize before each batch.

## R-1 / R-2 (minor) FIXED (v3 depth band + brightness gate), pale block kept removed
- First try 2-4 m (the pre-judge's suggestion): R-1 / R-2 gone, but the strip showed the far-floe PALE BLOCK BACK under the
  near far floe (img/medium_FFpops_k12_26_FIX1_AA6old_AA6F_GT_z5.png: FIX1 and the 2-4 m build show it, the integrator's
  AA6 and the GT do not); popscan medium 4538 flagged px vs the integrator's AA6 3274; new pops vs the integrator's AA6 1524
  px (top: k13-27 x244-299 y517-530). The floe's inside lies > ~3 m behind its face there.
- Lab sweep on the same build: 8-16 m and 20-40 m give identical results: new pops vs the integrator's AA6 154 px (4 clusters
  >= 6 px), popscan 3293 / 3295 (integrator's AA6 3274), and R-1 / R-2 unchanged (the gap's far row is farther than 40 m).
  Default set to 8-16 m.
- (FINAL numbers: section FINAL.)

## R-3 (minor) NOT APPLIED (knee stays 0.5): it costs a G1 cell
- Built as suggested with the glide only (knee 1.0 with lkglide on, 0.5 otherwise, so the switches stay exact).
  A-3 confirmed: jgt2 medium 3937 px-frames outside BASE's 3x3 (0.5: 8238), error vs GT 10.88 (BASE 9.47; 0.5: 12.72).
- But G1 on all paths (the finding's own re-check): diag FS MC32 -40 % at 0.5 -> -37 % at 1.0 (same build, same v3, knee set
  live: ana/crawl_diag_d8.txt), i.e. it fails a per-box cell that passes at 0.5; on the knee-1.0 build (with the first 2-4 m
  band) leave FS -40 -> -37, fast -23 -> -22, reverse -22 -> -20, slow / medium within 0-2 points (ana/crawlF_*.txt); G1c REL
  medium +1 %. L6 says keep 0.5 if no knee removes the over-darkening without losing G1, so the knee stays 0.5. If the lead accepts G-2 (a) (FS on fast paths at GT level), knee 1.0 is a one-line change
  (HeroEngine: aaKnee.value = 1.0 when the glide is on; switches stay exact as built here) and passes everything else.

## FINAL (lab :5196 built 19:22 from the final sources; nothing changed after)
- G8 (ident.mjs: 20 moving frames, final image + mirror / walk / cache / cacheN / reflection targets + every linked
  program; ident2/*.json, ana/g8_final.txt; fresh references :5197 / :5198, the integrator's same-day idents for the
  unchanged fixed1 and BASE builds):
    AA6 ?lkglide=0            vs fixed1 + v3 (new)    IDENTICAL (6 targets, 15 programs, 0 / 0 logs)
    AA6 ?ffblock=0            vs fixed1 + F1 (new)    IDENTICAL
    AA6 ?lkglide=0&ffblock=0  vs fixed1               IDENTICAL
    AA6 all five off          vs BASE                 IDENTICAL (14 programs)
    AA6 ?envlake=plate        vs BASE plate           IDENTICAL
    AA6 T0 (390x844 DSF 3)    vs BASE T0              IDENTICAL
    AA6 T2 all five off       vs BASE T2              IDENTICAL
  Expected: AA6 default vs the integrator's AA6: walk + final, programs rx-water / rx-water-walk only (v3's GLSL); the TAA
  and edge programs are byte-identical (the G-1 ramp is CPU-side). ?ffblock=0 vs the integrator's: programs identical,
  final differs (the ramp: ident starts from rest).
- G1 (NEW masks, crawl.mjs stride 2, ref BASE; ana/crawlZ_<path>.txt), MC32 % per box (integrator's AA6 in brackets):
    slow    FS -75 (-74) WR -74 (-75) DR -87 (-87) FF -83 (-82) FR -74 (-71) RS -90 (-90) tot -82 (-81)   gate 50: PASS
    medium  FS -84 (-83) WR -69 (-70) DR -88 (-88) FF -85 (-83) FR -74 (-71) RS -90 (-88) tot -83 (-82)   gate 50: PASS
    fast    FS -22.9 (-23.3) WR -53 DR -83 FF -84 FR -78 (-74) RS -85 tot -74                       gate 40: FS MISS (G-2)
    diag    FS -39.7 (-40.1) WR -59 DR -86 FF -86 FR -81 (-79) RS -85 tot -79                       gate 40: FS at the line (G-2)
    reverse FS -21.9 (-21.8; GT -19) WR -65 DR -78 FF -84 FR -79 (-78) RS -83 tot -75              gate 40: FS MISS (G-2)
    leave   FS -40.8 (-39.7) WR -67 DR -92 FF -84 FR -79 (-76) RS -92 tot -79                       gate 40: PASS
  L4 (slow / medium / reverse vs GT): every J32 / J48 reduction >= GT's - 5 points. Texture lake 1.007-1.011 (v3, L3), solid
  1.0002-1.0008. So the final G1 equals the integrator's AA6 within 0-3 points (FR / FF slightly better); the FS cells on the
  fast paths are G-2's, unchanged by this round.
- G1c (aa5a's glide.mjs, sstride 6; ana/glideZ_*.txt), REL-to-GT jerk area5 ALL / FS, f(|d2|>0.1), solid-side ALL, ESF:
    medium  F1 0.2225 / 0.1870, 0.268, 4.61, 2.21 / -0.27   AA6 integ 0.2010 / 0.1682, 0.236, 3.71   FINAL 0.2000 / 0.1680,
            0.235, 3.70, 2.07 / -0.11 (GT 1.94 / -0.11)
    slow    F1 0.2403 / 0.2285, 0.319, 4.81                  AA6 integ 0.2168 / 0.2086, 0.254, 3.83   FINAL 0.2159 / 0.2084,
            0.252, 3.83, 2.09 / -0.10
  -> at least as good as AA5a's F1 on both, equal to the integrator's AA6.
- G-1 on the final build: holdre k13 a6 195 / 55 / 15 vs g0 160 / 38 / 7 vs BASE 236 / 74 / 17, k14 220 / 92 / 29 vs 176 / 56
  / 15; grad^2 241.0 -> 241.1 -> 241.9 -> 243.8 -> 245.0 (ana/stepcnt_holdre_FINAL.txt); 0 console lines.
- v3 on the final build (medium; aa5b popscan / popnew, refl v3err; ref for v3err = the integrator's ?ffblock=0 capture,
  whose F1 equals the final F1 on a pre-rolled path):
    popscan flagged / in events >= 6:  FINAL 2982 / 1254, integrator's AA6 3274 / 1523, fixed1 10441 / 7831 (-71 / -84 %)
    new pops vs fixed1: 215 px (5 clusters >= 6 px; integrator's AA6: 486 px, 12); vs the integrator's AA6: 146 px (3)
    R-1 box 880,738,1070,766, darker away from the GT: medium 1588 -> 251 px-frames (dmax 110 -> 30); rest 1111 -> 0
    R-2 box 50,525,185,590, brighter away from the GT: medium 2144 -> 0; rest 429 -> 0 (its dark events 364 = unchanged)
    whole lake: toward GT 171.2 k / away 29.6 k px-frames (integrator's 173.6 k / 34.7 k); rest 37.9 k / 5.7 k (38.7 k / 8.7 k)
  Strips looked at (img/FINAL_*): the far-floe pale block k48-64 and k12-26 gone as in the integrator's AA6 (FIX1 has it);
  the bottom gap stays bright (the integrator's AA6 has the dark block); the far-left dash stays whole in motion and at rest.
- A-3 (jgt2 medium, final): 8240 px-frames, error 12.72 vs BASE 8.44 = the integrator's (knee 0.5 kept, R-3).
- G10 (aa5a's g10.mjs, final): DPR 1 1440x766 and DPR 2 (pixel ratio 1.25 -> 1800x957), resize 1100x700 and back: 0 dark px,
  0 logs; live engine (own rAF, real mouse, hold) 26.7 fps on the shared machine, governor scale 0.7, 0 logs. tsc hero +
  project clean (lane, and the patched BASE clone).
- Patches: aa6.patch (vs aa3_base) 3 files 831 lines, aa6_vs_fixed1.patch 3 files 392 lines; applytest: dry run + real
  `patch -p1` clean on fresh clones of aa3_base / aa3_fixed1, `diff -r` == the lane's sources, 0 .orig / .rej, tsc clean on
  the patched BASE clone; re-generated after the last source change and compared byte-equal.
- G7: not measured (AA5c). The final adds no pass, draw or shader ALU over the integrator's AA6 except v3's few ALU (two
  luma dots, two smoothsteps per row) inside its existing small-footprint branch; the G-1 ramp is CPU-only.

## STATE (19:35): DONE. :5196 = final build (left running). :5197 / :5198 (my reference clones) stopped at the end.
## :5182 / :5195 / :5181 / :3000 / :3001 / :5180 untouched. No browser of mine left. No commits, pushes or deploys.
