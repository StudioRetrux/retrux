# AA8 FIXER (21 Nov 2026, Asia/Jakarta; started 00:15, time box 60 min)
Lane /Users/muhamadrifaldi/Library/Caches/retrux-lanes/aa8/retrux-web (the integrated AA8), lab :5199 (mine).
WORK = $SP/work8/fixer (tools/, caps/, ctx/, ident/, ana/, img/, logs/). Mirror = MAIN/notes/round11/lane_backup/aa8/fixer/.
Every browser went through slot.mjs (batches F1-F7); playwright-core 1.49.1 (retrux-lanes/pw). Findings from the AA8 artifacts judge:
AJ-1 (thin-tip pale spot) and AJ-2 (black blotches on the rings after a WebGL context restore).

## RESULT
- AJ-2 FIXED (HeroEngine.ts + PlateEnvironment.ts, restore path only). The restored frame now equals the no-loss frame: bit-exact
  without the TAA (T1 ?lktaa=0, the plate lake, the T0 phone: 0 px on all 4 frames after the restore); with the TAA (default T1)
  every px > 2 levels lies inside the waterline TAA band (P-1's intended restart without history), <= 2 levels outside it.
  Before: 104,231 px > 16 levels (max 254) on the first frame, ~100k on every later one. Normal frames are untouched: every switch IDENTICAL to the integrator's
  build (final image, 6 targets, every program; section 3).
- AJ-1 NOT FIXED: needs a lead decision (section 4, options with new data: the 2x-rows option removes 97 % of the spot on the
  ordinary sweep but is not a drop-in: it moves the front slab / dark rocks / right shore away from the GT and adds new pops).

## 1. AJ-2 reproduction (batch F1, PRE-fix = the integrator's build, pid 64433, bundle ffb0cdbe...)
- The judge's repro (tools/pf/ctxstep.mjs: 20 moving stepped frames, WEBGL_lose_context lose / restore, 4 more frames vs the same
  run without the loss; tools/pf/rgbacmp.mjs): restored f0 vs no-loss f0 = 104,231 px > 16 levels, max 254 (= the judge's number);
  f3 100,194. Same with ?lktaa=0: f0 103,808 > 16 (so not the TAA). ana/aj2_bandchk_pre.txt: 100,550 px > 16 OUTSIDE the TAA band.
- Looked at img/pre_def_f0_a.png (restored: black blotches all over the rings, no ripple ring on the lake), _b.png (no loss) and
  _diff8.png (rings, shards, the lake's ripple ring, a faint veil over the frame = the post chain's spread of the rings).
- Root cause (code): HeroEngine.load() builds the environment light once: PMREMGenerator.fromEquirectangular(panorama) into a
  render target (this.pmrem), then disposes the panorama. A context restore hands back every render target empty; three.js
  re-uploads every texture that keeps its data (LakeHeight, Orb sheet, EXR / image textures all do: checked) and everything drawn
  each frame recovers, but nothing redraws the PMREM: shared.uEnvMap samples three's empty texture (0,0,0,0). The rings, orb and
  shards lose their environment light (= the black blotches) and the water's ripple shading (Water.ts: rRip vs rFlat, both
  env-map lookups, k = 0) disappears. Same class on the plate lake (T0 phones, ?envlake=plate): PlateEnvironment.bakeDepth draws the
  projector depth maps once at load. The intermediate build (PMREM only) showed it: plate restored f0 290,926 px > 16 (max 158),
  looked at img/fix_plate_f0_a.png vs _b.png: clean rings but NO CLOUDS, no floe reflections and no ripple ring on the lake.

## 2. AJ-2 fix (fix_vs_integ.patch, 88 lines: the fixer's diff on top of the integrated AA8)
- HeroEngine: keep the clamped panorama DataTexture (this.panorama; 1024 x 512 RGBA half = 4 MiB of JS memory; load unchanged).
  webglcontextrestored (after three's own handler, registered first in the WebGLRenderer constructor, has re-initialised the GL
  state) -> resetTAA (P-1, unchanged) + restoreBaked(): a fresh PMREMGenerator builds the PMREM again from the kept panorama into
  a new target (a passed-in target would crash a fresh generator: its ping-pong target only comes from _allocateTargets), the
  panorama's new GPU copy is freed again, shared.uEnvMap.value = the new texture (every user - IceMaterial, Orb, Shards,
  PlateEnvironment, Water - shares that one uniform object; same 768 x 1024 size, so the materials' cubeUV defines hold); on the
  plate lake (no lake mirror) bakeDepth(..., restored = true); lakeSched.invalidate() (mirror, walk and cached term redrawn on the
  next frame, as after a resize). Old targets are DROPPED, not disposed: their GL objects belong to the lost context (disposing
  them would run three's pre-loss listeners against the new context).
- PlateEnvironment.bakeDepth(renderer, extra, restored = false): with `restored` the old depth targets are dropped instead of
  disposed; the default call (load) is unchanged.
- No switch: the change runs only on webglcontextrestored, which no normal frame reaches (proved by ident, section 3). tsc clean.

## 3. Proofs on the FINAL build (:5199 restarted 00:28:17, pid 6233, bundle 1a2259269e542ca1 = the served file)
### 3a. AJ-2 re-measured (batch F4; ana/aj2_fin_rgbacmp.txt, ana/aj2_bandchk_fin.txt)
  restored vs no-loss, px > 16 levels (max) per frame after the restore f0 / f1 / f2 / f3:
    T1 default        PRE 104,231 (254) / - / - / 100,194      FINAL 437 (76) / 303 (49) / 212 (48) / 148 (37)
    T1 ?lktaa=0       PRE 103,808 (254) / ... / 99,998         FINAL 0 / 0 / 0 / 0   (0 px differ at all: bit-exact)
    ?envlake=plate    (PMREM-only build 290,926 (158))         FINAL 0 / 0 / 0 / 0   (bit-exact)
    T0 phone 390x844  -                                        FINAL 0 / 0 / 0 / 0   (bit-exact; ctxstep --mobile, my copy)
  T1 default, band check (tools/bandchk.mjs: band = px the TAA path changes in the no-loss run, def_L0 != lktaa0_L0):
    inside the band 437 / 303 / 212 / 148 px > 16; OUTSIDE: 0 px > 2 levels on every frame (720-1,017 px at 1-2 levels = the post
    chain's spread of the band difference; with the band dilated by 2 px: <= 316 px at 1 level). PRE: 100,550 px > 16 outside.
    So the restored frame equals the no-loss frame outside the lake TAA band (the judge's acceptance), and the band restarts without
    history as P-1 intended (TAA weight 0 / still 1 on the first frame, then 0.5 valid).
  Every run: GL error 0, not lost, console only the engine's intended "[hero] WebGL context lost" (no INVALID_OPERATION lines).
  The no-loss frames of the final build are byte-identical to the pre-fix build's (default and ?lktaa=0, f0-f3).
  Looked at img/fin_def_f0_a.png (restored: clean glass rings, shards, the ripple ring back) vs _b.png, and _diff8.png (only the
  floe / rock / slab waterlines = the TAA band, a faint trace in the hero's lake reflection; rings, sky, ripple ring black);
  img/fin_envlakeplate_f0_a.png (restored plate lake: clouds, floe reflections and ripple ring back = _b.png); img/fin_t0_f0_a.png
  (T0 phone restored: clean rings, clouds, ripple ring).
### 3b. Switch identity (identS, 20 moving frames: final image + mirror / walk / cache / cacheN / reflection + every linked program;
###     ana/ident_fix.txt)
  19 fresh sessions on the final build (batches F5 / F6, 0 console errors / warnings in every one), each compared with the
  integrator's session of the same switch (the build before the fix; $SP/work8/integ/ident/i8_*.json) and with its saved
  AA7 / AA6 / BASE sessions (tools/ana_ident_fix.sh):
  (1) F8 vs I8, same switch: default, ?fftip=0, ?ffblock=0, ?mirrorcost=0, ?mrows=0, ?slabflash=0, scale 0.7, the URL without
      ?debug, ?lkglide=0&mirrorcost=0, ?lkglide=0, all five off, ?lktaa=0, ?aaresolve=0, the AA5b lab params with and without
      ?debug, all six off + ?fftip=0 (T1 and T2), ?envlake=plate, T0 phone ........ ALL 19 IDENTICAL (final image, all targets,
      all 12-16 programs)
  (2) knee-0.6 switches vs AA7 :5197 + knee 0.6 live: default, ffblock=0, mirrorcost=0, mrows=0, slabflash=0, scale 0.7, no ?debug,
      lab params with / without ?debug ............................................. all IDENTICAL
  (3) knee 0.5 / unused vs AA7: lkglide=0, all five off, lktaa=0, aaresolve=0 ...... all IDENTICAL
  (4) G8 / G9: ?lkglide=0&mirrorcost=0 vs AA6 ?lkglide=0 (:5196); all six off + ?fftip=0 vs BASE T1 and T2; ?envlake=plate vs BASE
      plate; T0 phone vs BASE T0 ......................................................... all IDENTICAL; ?fftip=0 == default
  (5) P-4: ?debug + ffbd0=0&ffbd1=0.01&ffbl=1 vs ?debug alone DIFFER (walk + final, programs rx-water / rx-water-walk: the lab
      params stay live with ?debug); without ?debug IDENTICAL (ignored) = the integrator's result.
  (Also on the intermediate build (PMREM only, ident/intermediate/): 11 sessions, all IDENTICAL to I8.)
### 3c. tsc (G10) and patches
  Lane: `npx tsc -p tsconfig.hero.json --noEmit` rc 0 (0 lines); `npx tsc -p tsconfig.json --noEmit --incremental false` rc 0 (0 lines);
  tsconfig.tsbuildinfo untouched (1795163951, 215617 B).
  aa8_vs_aa7.patch 282 lines sha256 c45436d9563e0034604d139cbab68c2809c7868dd0684545ca30d94509428991
  aa8.patch (vs aa3_base = BASE) 1236 lines sha256 c6629527494f69a0bbc7a563dd8c87c83db94cbb763dc270a5418c4aec9b0448
  fix_vs_integ.patch (the fixer's own diff vs the integrated AA8 = aa7 + integrator's aa8_vs_aa7.patch c8871201...) 88 lines
    sha256 02a71b417c1d30ce99db378fbf2592e9b96995eee0f96525eb44be9f4cbee105
  All `diff -u --label a/retrux-web/<f> --label b/retrux-web/<f>` over the six files (tools/mkpatch8.sh). No other source file of
  the lane differs from aa7 / aa3_base (only the lab's server log `log`).
  Apply test (tools/applytest8.sh; ana/applytest.txt), fresh cp -c -R clones, patch -p1 from the clone root:
    aa8_vs_aa7.patch on aa7:   dry run rc 0, apply rc 0, 0 .orig / .rej, applied app/ == lane aa8 app/, tsc 0 / 0
    aa8.patch on aa3_base:     dry run rc 0, apply rc 0, 0 .orig / .rej, applied app/ == lane aa8 app/, tsc 0 / 0
  Lane aa7 app/ == MAIN retrux-web/app (the integrator's check), so aa8_vs_aa7.patch applies to MAIN as well.
### 3d. Live loop (batch F7, the perf judge's tools/pf/ctxloss.mjs: own rAF, CDP mouse, lane :5199 vs BASE :5182; ana/ctxloss_live.txt)
  The page without ?debug (the product loop): 40-step sweep, lose, restore, then the tool's own visibilitychange restart and a
  40-step sweep. AA8: TAA valid again after the restart (weight 0.5, 392 runs), frames advance (time 7.81 -> 10.15 s), console
  only "[hero] WebGL context lost". Looked at ctx/live/loss_lane_1restored.png (img/live_loss_lane_1restored.png): clean glass
  rings, normal shards, the ripple ring on the lake; BASE in the same run (img/live_loss_base_1restored.png): black blotches on the
  rings, no ripple ring (the pre-existing damage; AA7 was the same per the AA7 perf judge). DPR 2 + resize mid-motion: normal
  (lane TAA valid, 1770 x 1230 at pixel ratio 1.5).

## 4. AJ-1 (thin-tip pale spot) - reproduced, NOT fixed: LEAD DECISION
- The judge's repro (batch F1: tools/cap.mjs medium 240 frames rows 380-766 on :5199 = caps/medium_A8; tools/spotdur.mjs box
  x170-240 y497-509, > 15 levels above the 16-sample GT; ana/spotdur_medium_s1.txt):
    px-frames  AA8 11,518 (= the judge's)  AA7 12,068  BASE 29,787  | the tip builder's rejected patch (caps/medium_TIP) 4,441 (-61 %)
    AA8 >= 90 px from k66 to k144 (78 frames), >= 30 px k61-k203 (99 frames), +23..+25 levels (BASE 250-330 px, +30..+39).
  Looked at img/medium_s1_k52-116_x140-280_y480-525_A8_R2_A7_BASE_GT_z4.png (x4; columns AA8 | 2x rows | AA7 | BASE | GT): AA8 =
  AA7, the lighter rectangle with a hard vertical edge under the far floe's thin left end from k68; BASE's wider pale block; the GT
  a continuous darker band. img/medium_s1_k92-100_x40-520_A8_R2_GT_z1.png (1x): faint. The AJ-2 fix cannot touch it (ident: the
  default frames are identical to the integrator's).
- NEW data for option (3) (more mirror rows at scale 1): the lab's ?lkmscale=0.5,1 (mirror target 720 x 766 instead of 720 x 383) on
  the same sweep (caps/medium_A8r2, 0 console lines):
    spot: 395 px-frames (-96.6 % vs AA8), at most 2 px per frame; x4 strip: no spot, like the GT (column 2 of the strip above).
    but not a drop-in (tools/towardgt.mjs AA8 -> 2x rows vs GT, stride 2; ana/opt3_towardgt_medium.txt), mean |err| on changed px:
      FF far floes 7.32 -> 5.73 (60 % toward), FR 5.44 -> 3.94 (57 %) BETTER; FS front slab 4.58 -> 5.47 (41 %, 93 % darker),
      DR 4.10 -> 5.00 (41 %, 92 % darker), RS 4.73 -> 5.25 (44 %), the rest 4.45 -> 4.65 (46 %) WORSE (darker).
    new pops vs AA8 (popnew thr 40, aa5b bloom-free mask; ana/opt3_popnew_R2_vs_A8_medium.txt): 505 px, 255 clusters, 10 >= 6 px,
      e.g. k214-222 x103-116 y551-557 (emax 118) and k208-212 x116-123 (104): the far-left tiny objects' dark dashes (the R-2 zone)
      heavier than in AA8 and the GT (looked at img/opt3_newpop_k206-222_x60-220_y525-575_A8_R2_GT_z4.png); k19-23 x542-559.
      (img/opt3_FS_k100_x160-460_y600-720_A8_R2_GT_z3.png: the front slab looks alike at x3; the FS shift is small and darker.)
    cost (ESTIMATE, not measured): the polish builder's RC-2 measured fix B's +57,960 mirror texels at scale 0.7 at +0.12-0.15 ms
      per moving frame; option 3 adds 275,760 texels at scale 1 -> ~0.6-0.7 ms per moving frame (~4-5 % of the 14.6 ms unthrottled
      frame), on top of L8's accepted ~+5 %.
- Options for the lead:
  (1) Accept as is for this round: pre-existing (AA6 = AA7 = AA8 at the tip), 61 % fewer px-frames than BASE on this sweep, faint
      at 1x (a ~70 x 12 px lighter rectangle, +23..+25 levels, ~1.3-1.5 s per ordinary sweep, readable when looking for it).
  (2) The tip builder's patch (lane_backup/aa8/tip/tip_vs_aa7.patch, Water.ts, ?fftip=0 exact): -61 % here, still 30-47 px at
      +19..+21; FAILS the no-new-pops gate (dark dots in the far-right floes' light columns, 62 new clusters on the hold dolly).
      Not usable as is.
  (2b) A discriminator on top of (2): a front-/back-facing bit in the sign of the mirror target's alpha (so the floe's inside seen
      behind a sub-row face is known) or X refined to the face's true position; then the full pop gate. A builder round + judges;
      no run-time cost beyond (2)'s 24 fetches in that branch; unproven.
  (3) More mirror rows at scale 1 behind its own switch: the only route measured to remove the spot (-97 %), but it needs the
      guard / walk retuned to the finer rows (the FS / DR / RS darkening and the R-2-zone pops above), a full re-judge (G1, pops,
      L3 rest, R-1 / R-2, hold) and a G7 decision (~+0.6-0.7 ms per moving frame, to be measured).
  Fixer's suggestion: (1) for this round; if the spot must go for 10/10, a separate round on (3) with retuning (or (2b) if the
  cost of (3) is not acceptable). Also add the medium-sweep spotdur box (scales 1 / 0.8 / 0.7) to that round's acceptance test.

## 5. Observation outside the findings (NOT changed): the render loop does not restart after a context restore
- HeroEngine's webglcontextlost handler calls stop(); nothing calls updateRunning() on webglcontextrestored, so the rAF loop stays
  stopped until the next visibilitychange or IntersectionObserver callback. Measured in the live run above: 1.5 s after the
  restore the engine time had not moved (AA8 7.809 -> 7.809 s, BASE 8.726 -> 8.726 s); it advanced only after the tool's
  visibilitychange. In the product the canvas would stay blank (a lost context's drawing buffer is gone) until the visitor switches
  tabs or scrolls the hero out and back. Pre-existing in BASE / AA7 / AA8, not part of AJ-2, so NOT changed here.
  Suggested one-line fix for the lead: end onRestored with `this.updateRunning();` (it starts the loop only when the page is
  visible and the canvas on screen). Normal frames are unaffected (only the restore path); re-run ctxloss.mjs without its
  visibilitychange to accept.

## STATE (end)
- 00:38: DONE inside the box (00:15-00:38). :5199 serves the final build (pid 6233, started 00:28:17 with --no-watch from lane aa8,
  bundle sha256 1a2259269e542ca1 = the served file); left running. Its server log is the lane's `log` (renamed from log_fixer,
  same file). :5182 (BASE) was opened read-only by the live-loop tool (F7); :5197 / :5196 were not opened (their saved hashes came
  from the integrator). No lab other than :5199 restarted.
- Lane aa8 = aa7 + aa8_vs_aa7.patch (= the integrated AA8 + fix_vs_integ.patch); edited only HeroEngine.ts and PlateEnvironment.ts.
  MAIN: only notes/round11/lane_backup/aa8/fixer/ written.
- Slot batches: F1 pre-fix repro (171 s), F2 restore runs + 8 ident on the intermediate PMREM-only build (192 s), F3 stopped after
  3 sessions when I added the plate-lake re-bake (one finished after the stop; all moved to ident/intermediate/, not used as proof), F4 final restore
  runs (131 s), F5 / F6 final ident (134 s / 114 s), F7 live loop (67 s).
- Apply-test clones aa8f_apply7 / aa8f_applyB removed. Capture sets medium_A8 / medium_A8r2 deleted after the analysis (rerun:
  tools/bF1.sh); kept in $SP only: ctx/ raw restore frames (280 MB). Work folder 314 MB.
- Open for the lead: AJ-1 (section 4, options 1 / 2b / 3); the loop restart after a restore (section 5).
- Files: LOG.md, aa8_vs_aa7.patch, aa8.patch, fix_vs_integ.patch, ana/ (spotdur, towardgt, popnew, rgbacmp, bandchk, ident,
  applytest, ctxloss_live), img/, ctx/*.json (restore runs; intermediate_pmrem_only/), ctx/live/ (live screenshots + json),
  ident/ (final + intermediate identS JSONs), tools/ (bF1-bF7.sh, bandchk.mjs (new), ctxstep.mjs with --mobile, ana_ident_fix.sh,
  mkpatch8.sh, applytest8.sh and the judges' tools used), logs/.
