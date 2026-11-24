# AA8 RECHECK after the fix round (21 Nov 2026, Asia/Jakarta; 00:39-01:2x, time box 45 min), read-only
Lab AA8 :5199 = the fixer's final build (pid 6233, started 00:28:17 --no-watch; served /dist/main.js sha256 1a2259269e542ca1 = lane
hero-lab/dist/main.js, built after the last source edit 00:27:13). References: AA7 :5197 (= MAIN), BASE :5182, AA6 :5196 (none
restarted; only opened read-only by the capture tools). WORK = $SP/work8/recheck (tools/, caps/, ctx/, ident/, ana/, img/, logs/).
Mirror = MAIN/notes/round11/lane_backup/aa8/recheck/. Every browser went through slot.mjs (batches R1, R2, R3a, R3b, R4a, R4b);
playwright-core 1.49.1 (retrux-lanes/pw). Tools = copies of the motion judge's (tools/m), the fixer's (tools/f) and the art judge's
(tools/a) + tools/a/tipcmp.mjs and tools/f/pf/ctxloss2.mjs (new, see below).

## 0. Static
- Lane aa8 app/ vs aa7 app/: only the six files differ; their `diff -u --label a/retrux-web/<f> --label b/retrux-web/<f>` hashes to
  c45436d9563e0034604d... = the fixer's aa8_vs_aa7.patch. aa7 app/ == MAIN retrux-web/app (diff -rq empty), so the patch is vs MAIN.
- The fix (fix_vs_integ.patch) read in the lane: onRestored = resetTAA (P-1) + restoreBaked(); restoreBaked rebuilds the PMREM from
  the kept clamped panorama (same 768 x 1024 cubeUV target, so the materials' defines hold), swaps shared.uEnvMap, re-bakes the plate
  projector depth only when there is no lake mirror (`!this.lakeMirror` == load's `!mirror`, HeroEngine:289 / :327), invalidates the
  lake schedule. Old targets dropped, not disposed. No shader change, no switch; runs only on webglcontextrestored.
- tsc in the lane: `npx tsc -p tsconfig.hero.json --noEmit` rc 0 (0 lines); `npx tsc -p tsconfig.json --noEmit --incremental false`
  rc 0 (0 lines); tsconfig.tsbuildinfo untouched (1795163951, 215617 B). G10 tsc PASS.

## 1. AJ-2 (the fixed finding), the judge's repro re-run - FIXED (ana/aj2_rgbacmp.txt, aj2_bandchk.txt, aj2_vs_fixer.txt)
- Batch R2 (00:47-00:51): tools/f/pf/ctxstep.mjs on :5199 (20 stepped moving frames, WEBGL_lose_context lose + restore, 4 more
  frames) with --loss 1 and --loss 0, for the default, ?lktaa=0, ?envlake=plate and the T0 phone (--mobile); rgbacmp per frame.
  restored vs no-loss, px > 16 lv (max) f0 / f1 / f2 / f3:
    T1 default      437 (76) / 303 (49) / 212 (48) / 148 (37)      (pre-fix: 104,231 (254) on f0, ~100k on every later frame)
    T1 ?lktaa=0     0 / 0 / 0 / 0 px differ AT ALL (bit-exact)       (pre-fix 103,808 on f0)
    ?envlake=plate  0 / 0 / 0 / 0 (bit-exact)
    T0 phone        0 / 0 / 0 / 0 (bit-exact)
  Band check (bandchk.mjs, band = px the TAA path changes in the no-loss run): every px > 2 lv lies inside the waterline TAA band
  (437 / 303 / 212 / 148 > 16 inside); outside the band 720-1,017 px at 1-2 lv only, max 2 (with the band dilated by 2 px: 72-316 px
  at 1 lv). = P-1's intended restart without history (TAA weight 0 / still 1 on the first frame after the restore, then 0.5 valid).
  All 32 raw frames are byte-identical to the fixer's final-build frames (determinism). GL error 0 in all 8 runs; console: the 4 loss
  runs have only the engine's intended "[hero] WebGL context lost" warning, the 4 no-loss runs nothing.
- Looked at: img/ctx_def_f0_a.png (restored T1 frame: clean glass rings, normal shards and orb, the ripple ring on the lake, sky and
  clouds; no black blotch anywhere), img/ctx_def_f0_diff8.png (restored vs no-loss x8: only the floe / rock / slab waterline lines =
  the TAA band, a faint trace in the hero's lake reflection; rings, sky, ripple ring black), img/ctx_plate_f0_a.png (plate lake
  restored: clouds, floe reflections and ripple ring present), img/ctx_t0_f0_a.png (T0 restored: clean rings, clouds, lake).
- Live loop (tools/f/pf/ctxloss2.mjs = the perf judge's ctxloss.mjs + one screenshot 1.5 s after the restore, before the tool's own
  visibilitychange restart; own rAF, CDP mouse; lane :5199 vs BASE :5182; ana/ctxloss_live.txt):
    AA8: after the restart TAA valid again (weight 0.5), frames advance (8.025 -> 10.815 s), console only the intended warning.
    Looked at img/live_loss_lane_base_norestart_top_restarted_bottom_half.png (2 x 2, half size): bottom row = after the restart:
    AA8 (left) clean glass rings and the ripple ring; BASE (right) the rings darkened / blotched (the pre-existing damage).
    DPR 2 + resize mid-motion (same tool): AA8 normal (1770 x 1230 at pixel ratio 1.5, TAA valid, 0 console lines); BASE normal.
  => AJ-2 CLOSED.

## 2. N-1 re-measured (the fixer's observation; pre-existing, NOT changed by the fix) - open, see finding R8-1
- Same live run: the engine time stays at the loss time for the 1.5 s after the restore (AA8 8.025 -> 8.025 s; BASE 8.329 ->
  8.329 s): onLost calls stop() and nothing calls updateRunning() on webglcontextrestored (HeroEngine:194-207, :513-517).
  app/hero/HeroExperience.tsx has no context-loss handling of its own (grep: 0 hits), so the product behaves the same.
- Looked at the top row of the same panel (ctx/live/loss_{lane,base}_0b_restored_norestart.png): 1.5 s after the restore AA8 and
  BASE both show NO hero at all, only the page's gradient background and the UI text. It comes back only on a tab switch or after
  the hero is scrolled out and back in (IntersectionObserver).

## 3. G8 switches (ident) - PASS (ana/ident_recheck.txt)
- Batches R3a / R3b (00:48-00:56): 19 fresh identS sessions on the final build (20 moving frames; final image + mirror / walk / cache /
  cacheN / reflection targets + every linked program), the full switch set of the integrator / fixer.
  (1) each vs the fixer's final-build session AND the integrator's pre-fix session of the same switch: ALL IDENTICAL (final, all
      targets, all 12-16 programs): default, ?fftip=0, ?ffblock=0, ?mirrorcost=0, ?mrows=0, ?slabflash=0, ?aaresolve=0, ?lktaa=0,
      ?lkglide=0, ?lkglide=0&mirrorcost=0, all five off, scale 0.7, no ?debug, lab params with / without ?debug, all six off + ?fftip=0
      (T1 and T2), ?envlake=plate, T0 phone. => the fix changes no normal frame.
  (2) binding G8 / G9 (the integrator's fresh reference sessions of tonight): ?lkglide=0&mirrorcost=0 == AA6 ?lkglide=0 (:5196);
      all six off + ?fftip=0 == BASE T1 and BASE T2 (:5182); ?envlake=plate == BASE plate; T0 phone == BASE T0; ?fftip=0 == default.
      ALL IDENTICAL.
  (3) vs AA7 :5197: knee-0.5 / unused switches (?lkglide=0, ?lktaa=0, ?aaresolve=0, all five off) IDENTICAL; the knee-0.6 switches
      (default, ffblock, mirrorcost, mrows, slabflash, scale 0.7, no ?debug, lab params) == AA7 with the knee set live to 0.6:
      IDENTICAL.
  (4) P-4: ?debug + ffbd0=0&ffbd1=0.01&ffbl=1 vs ?debug alone DIFFER (walk + final; programs rx-water / rx-water-walk = the lab
      params stay live in the lab, as intended); without ?debug IDENTICAL (ignored). = the integrator's / fixer's result.
- Console: 0 errors / warnings in all 19 sessions.

## 4. Final G1 table, all six paths (NEW masks, ref BASE, L9 for FS) - PASS (ana/g1tab8.txt, crawl_<path>.txt)
- Batch R1 (00:42-00:45): fresh stepped captures on the final build (tools/m/cap.mjs :5199, rows 380-766, pre 30; medium 240 f,
  slow 160, fast / diag / reverse / leave 120; 0 errors / warnings in all six). Every frame (880 of 880) is byte-identical to the
  motion judge's capture of the pre-fix build (ana/cmp_vs_judge.txt). Crawls (BASE / FIX / AA7 / AA8 fresh / GT, stride 2) re-run on
  the fresh captures: every crawl text and the g1tab8 table equal the motion judge's exactly.
  MC32 % vs BASE, AA8 per box (margin in points inside its bar):
    path      FS            WR            DR            FF            FR            RS            tot
    slow     -75.7 (+25.7) -73.9 (+23.9) -87.3 (+37.3) -83.3 (+33.3) -74.5 (+24.5) -90.2 (+40.2) -82.5 (+32.5)   bar 50
    medium   -83.7 (+33.7) -69.1 (+19.1) -87.3 (+37.3) -84.6 (+34.6) -73.7 (+23.7) -90.8 (+40.8) -82.5 (+32.5)   bar 50
    fast     -23.3 (+3.0)  -52.4 (+12.4) -82.7 (+42.7) -84.4 (+44.4) -77.7 (+37.7) -85.1 (+45.1) -74.1 (+34.1)   bar 40, FS L9 20.2
    diag     -39.2 (+9.7)  -59.1 (+19.1) -86.2 (+46.2) -86.0 (+46.0) -80.9 (+40.9) -84.3 (+44.3) -78.6 (+38.6)   bar 40, FS L9 29.4
    reverse  -21.0 (+6.6)  -65.4 (+25.4) -77.7 (+37.7) -83.9 (+43.9) -78.8 (+38.8) -83.5 (+43.5) -74.7 (+34.7)   bar 40, FS L9 14.4
    leave    -39.9 (+11.4) -67.1 (+27.1) -91.8 (+51.8) -83.8 (+43.8) -79.1 (+39.1) -92.1 (+52.1) -79.3 (+39.3)   bar 40, FS L9 28.5
  L4 J rule: 0 misses ("no gate / L4 / MCE miss"). Exact slow WR J48 (j48loc on the fresh slow capture): BASE 1071, AA7 733, AA8 691,
  GT 656 events = AA8 -35.48 % vs the floor -33.75 % (+1.73 points; M-1 stays closed). Tightest cells: slow WR J48 +1.78 (crawl),
  fast FS MC32 (L9) +3.02, leave FS J32 +3.94, fast FS J32 +4.04, reverse WR J48 +4.54, slow RS J48 +5.00.
  FS MCE AA8 / AA7 / FIX: slow 2.766 / 2.781 / 3.000, medium 2.107 / 2.117 / 2.281, fast 3.749 / 3.767 / 3.936, diag 2.986 / 3.004 /
  3.216, reverse 3.838 / 3.854 / 4.044, leave 2.732 / 2.743 / 2.907 (never worse than FIX). G3 texture: lake 1.0071-1.0105, solid
  1.0001-1.0005 of BASE.
- Looked at (from my fresh captures; columns BASE | AA7 | AA8 | GT): img/fast_FS_k56-60_x180-430_BASE_A7_A8f_GT_z2.png and
  img/rev_FS_k42-46_x180-430_BASE_A7_A8f_GT_z2.png: BASE's slab end is stepped; AA7 = AA8, one smooth waterline like the GT; no dash,
  hole, rim or bright column.

## 5. The tip spot (AJ-1) - still there, unchanged (AA8 = AA7 at the tip)
- Ordinary medium sweep at scale 1 (fresh capture, spotdur.mjs box x170-240 y497-509, > 15 lv above the 16-sample GT;
  ana/spotdur_medium_s1.txt): AA8 11,518 px-frames (203 frames), AA7 12,068, BASE 29,787 = the judge's / fixer's numbers (A8 column
  identical to the fixer's). 90-133 px at +24..+25 lv from k66 to k144 (k92 130 px +24; BASE 268 px +32).
  Looked at img/medium_s1_tip_k68-132_x140-280_y480-525_A8f_A7_BASE_GT_z4.png (x4, k68 / 84 / 100 / 116 / 132): AA8 = AA7, the
  lighter rectangle with a hard vertical right edge under the near far floe's thin left end; the GT keeps a continuous darker band
  there; BASE's pale area covers the whole floe bottom.
- holdre (batch R4a, jcap a8 :5199 / a7 :5197 / base :5182, rows 380-766; 0 console lines in the three sessions): tip box x90-230
  y585-625 k201-211 (tools/a/tipcmp.mjs): |AA8 - AA7| max 7.9 lv, 224 px > 4, 0 px > 16, box mean within 0.2 lv; the probe k207
  x125 y607 AA8 119 / AA7 121 (the tip builder's AA7 121, ?ffblock=0 146, BASE 157). |AA8 - BASE| max 119.5, 3,307 px > 16.
  Looked at img/holdre_tip_k201-211_x90-230_y585-625_A8_A7_BASE_z4.png (x4, k201-211 step 2): AA8 = AA7, the lighter patch with a
  hard right edge under the floe's thin left end from k203 on; BASE a wider pale block under the whole floe. img/holdre_k203-209_
  x0-720_A8_A7_BASE_z1.png (1x): faint; AA8 = AA7.
- gov (batch R4b, jcap a8 / a7 / base(+mask); governor scale 1 k0-24, 0.9 k25-49, 0.8 k50-74, 0.7 k75-99, 1 k100-119; 0 console
  lines): box x80-300 y480-530 k61-93 |AA8 - AA7| max 8.9 lv, 609 px > 4, 0 px > 16 (|AA8 - BASE| 34,984 px > 16).
  Looked at img/gov_red_k61-93_x80-300_y480-530_A8_A7_BASE_z3.png (x3, at 0.8 then 0.7): AA8 = AA7, the lighter patch under the
  floe's thin left end (k65-81); BASE larger hard-edged pale blocks.
- gov1 (jcapS1 --noscale = the same path at scale 1 throughout; a8 / a7; 0 console lines; a7 k70 byte-identical to the AA7
  recheck's fin1): box x100-260 y485-525 k62-90 |AA8 - AA7| max 8.9 lv, 691 px > 4, 0 px > 16.
  Looked at img/gov1_tip_k62-90_x100-260_y485-525_A8_A7_BASE1_z5.png (x5; BASE1 = the AA7 recheck's BASE at scale 1): AA8 = AA7,
  the lighter patch under the thin tip at k70-86; BASE1 a broader pale area under the floe. img/gov1_k70-78_x0-720_A8_A7_z1.png (1x).
=> AJ-1 is unchanged by the fix round (as expected: no default frame changed). It stays open for the lead (fixer's options 1 / 2b / 3).

## 6. Anything the fix made worse
- Normal frames: nothing (19 ident sessions identical to the pre-fix build in every target and program; 880 G1 frames byte-identical).
- Restore path: strictly better (section 1). One cost: the engine now keeps the clamped panorama DataTexture in JS memory for the
  page's lifetime (1024 x 512 RGBA half = 4 MiB, the same EXR on every tier including T0 phones; before, it could be collected after
  load). Not frame time. Finding R8-2 (nit).
- Not re-run (unchanged by identity, normal frames untouched): G1c glide, L5 stepcnt, G6 flash, hitch, pop scans, WebKit / Firefox.

## 7. Console (G10 part)
- 0 errors / warnings in every session of this recheck (6 G1 captures, 8 stepped restore runs, 4 live contexts, 19 ident sessions,
  8 jcap variant sessions), except the engine's intended "[hero] WebGL context lost" warning in the runs that lose the context
  (4 stepped AA8 runs, the live AA8 and BASE runs). No GL error in any restore run.

## VERDICT (01:00, 21 Nov)
- Fixed and verified: AJ-2. The judge's repro on the final build: the restored frame equals the no-loss frame bit for bit without the
  TAA (T1 ?lktaa=0, plate lake, T0 phone) and outside the waterline band with it (<= 2 lv; inside the band the intended P-1 restart,
  437 px > 16 lv on the first frame, fading to 148 by the fourth). Before: 104,231 px > 16 lv on every frame. Looked at: clean
  rings, ripple ring, clouds after the restore; in the live loop AA8's rings are clean where BASE's are blotched.
- Nothing got worse: 19 ident sessions identical to the pre-fix build (all targets, all programs), every G8 / G9 pair identical,
  880 G1 frames byte-identical, tsc clean, 0 console lines beyond the intended loss warning. The only cost of the fix is 4 MiB of
  JS memory (R8-2, nit).
- Final G1 table: every MC32 box + total passes on all six paths (FS by L9), 0 L4 misses (slow WR J48 exact +1.73), FS MCE better
  than FIX and AA7 everywhere.
- Still open: AJ-1 (minor, the thin-tip pale spot: unchanged, AA8 = AA7 at x4 on gov at 0.8 / 0.7, gov at scale 1, holdre k201-211
  and the ordinary sweep, ~1.3 s at +24 lv, faint at 1x; needs the lead's decision among the fixer's options) and R8-1 (minor,
  pre-existing in BASE / AA7, outside the waterline brief: after a context restore the hero stays blank until a tab switch or a
  scroll, because nothing restarts the loop). Inherited nits unchanged by identity: M8-1, AJ-3, AJ-4.
- pass = false (AJ-1 and R8-1 open). Score 8.9 / 10 for AA8 as a whole against the user's words (AA7 recheck 8.7: M-1, M-3, P-1,
  AJ-2 closed, every motion number equal or better, nothing worse; not 10 because the tip spot is still visible when you look for
  it and a context restore still leaves the hero blank until the loop is restarted). If the lead accepts AJ-1 under option (1) and
  applies R8-1's one-line fix (or splits it into its own task), every gate of this recheck passes.

## Findings
- AJ-1 (minor, open, lead decision): the thin-tip pale spot, unchanged (section 5). Options as the fixer listed (1 accept / 2b
  front-back bit or refined X + full pop gate / 3 more mirror rows at scale 1 behind a switch + retune + re-judge + G7).
- R8-1 (minor, pre-existing, outside the waterline brief) = the fixer's N-1: after webglcontextrestored the render loop is not
  restarted (onLost -> stop(); nothing calls updateRunning() on restore), so the hero stays blank until a visibilitychange or an
  IntersectionObserver callback. Evidence section 2. Suggested fix: end onRestored with `this.updateRunning();` (starts the loop
  only when visible and on screen). Accept with ctxloss2.mjs without its visibilitychange step: engine time must advance within
  1.5 s of the restore, the norestart screenshot must show the hero, normal frames identical (ident).
- R8-2 (nit): the fix keeps the panorama (4 MiB half-float data) in JS memory for the page's lifetime on every tier, phones
  included, only for the rare restore. Acceptable; alternative: re-load the EXR (HTTP-cached) on restore, async.
- Inherited nits, unchanged by identity: M8-1 (first moving frame > 16 lv band px vs g0), AJ-3 (knee 0.6 trade), AJ-4 (R-4 column).

## Disk / state
- Labs untouched: :5199 (pid 6233), :5197, :5196, :5182 still up, none restarted. Lane aa8 not edited. MAIN: only
  notes/round11/lane_backup/aa8/recheck/ written.
- Deleted after the analysis: caps/<path>_A8f (byte-identical to $SP/work8/motion/caps/<path>_A8, which stay), caps/holdre, gov, gov1
  (rerun: tools/bR4a.sh, bR4b_run.sh) and ctx/*.rgba (byte-identical to $SP/work8/fixer/ctx/fin_*; rerun: tools/bR2.sh).
