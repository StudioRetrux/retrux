# AA8 INTEGRATOR (20 Nov 2026, Asia/Jakarta; started 23:35:49, time box 45 min)
Lane /Users/muhamadrifaldi/Library/Caches/retrux-lanes/aa8/retrux-web (the polish builder's lane), lab :5199 (now mine).
WORK = $SP/work8/integ (tools/ = the polish builder's tools + i_A/i_B/i_C.sh, ana_ident.sh, ana_fx.sh, mkpatch8.sh,
applytest8.sh; ident/, ctx/, ana/, img/, logs/). Mirror = MAIN/notes/round11/lane_backup/aa8/integrator/. Every browser went
through slot.mjs (3 batches, 182-194 s each, load 3.7-4.3 at take); playwright-core 1.49.1 (retrux-lanes/pw).

## 0. What was integrated
- TIP builder: ok = false (it fails the no-new-pops gate: new clusters on all six paths, 62 on the hold dolly). Its patch
  (tip_vs_aa7.patch, sha256 b4bdef10...) is NOT applied. No merge-file was needed.
- POLISH builder: ok = true -> integrated. The lane already holds exactly AA7 + polish: the six-file diff of lane aa8 against
  lane aa7 is byte-identical to polish_vs_aa7.patch (sha256 c8871201...). No other source file differs from aa7 or from BASE
  (diff -rq without node_modules / dist / .next / tsbuildinfo / logs). Nothing in the lane reads `fftip` (grep: 0 hits in app/
  and hero-lab/main.ts), so `?fftip=0` is a no-op here by construction.
- So the integrated state = AA7 final + P-1 (EnvEdge.resetTAA on context lost / restored) + P-4 (Water's ffb* lab params gated
  by the engine's debug option) + P-2 / P-5 comments + knee 0.6 with the glide (`?lkglide=0` keeps 0.5).
- Six files (sha256 prefix): HeroEngine.ts 02b9aaf87112cc42, shaders/chunks.ts 41ff2c8348c7eed6, world/EnvEdge.ts
  ff37375e679e7a56, world/LakeMirror.ts e426019ed03d1c4d, world/PlateEnvironment.ts 1011339f1a7466ec, world/Water.ts
  62d5329360d04f22.

## 1. The served build
- Last source edit in the lane 23:01:11 (HeroEngine 23:01:02, chunks 23:01:11); :5199 = pid 64433, started 23:01:37 with
  --no-watch (it rebuilds on start). hero-lab/dist/main.js written 23:01:37; the bundle served at :5199/dist/main.js has the
  same sha256 as that file (ffb0cdbe...). It contains `aaKnee.value = 0.6`, resetTAA and the webglcontextrestored listener.
- Fresh identS of the default on :5199 == the polish builder's final-build default (23:02): same final image, all five targets,
  all 16 programs (section 3, group 1). :5199 was not restarted and is left running.

## 2. tsc (G10)
- Lane aa8: `npx tsc -p tsconfig.hero.json --noEmit` rc 0 (0 lines); `npx tsc -p tsconfig.json --noEmit --incremental false`
  rc 0 (0 lines). tsconfig.tsbuildinfo untouched (mtime 1795163951, 215617 B before and after).
- Both apply-test clones: 0 / 0 as well (section 5).

## 3. Identity proofs (identS: 20 moving frames; final image + mirror / walk / cache / cacheN / reflection targets + every
##    linked program's sources; ALL runs fresh tonight, 37 sessions, 0 console errors / warnings in every one) - ana/ident_integ.txt
(1) ?fftip=0 == the polish-only state:
    I8 ?fftip=0 vs I8 default ........................................ IDENTICAL (6 targets, 16 programs)
    I8 default vs the polish builder's final default (ident/fd_def.json) IDENTICAL
(2) Knee-0.6 (glide) switches, I8 vs AA7 :5197 with the knee set live to 0.6 before the settle:
    default, ?ffblock=0, ?mirrorcost=0, ?mrows=0, ?slabflash=0, scale 0.7, the URL without ?debug ... all IDENTICAL
(3) Knee 0.5 / unused, I8 vs AA7 :5197: ?lkglide=0, all five off, ?lktaa=0, ?aaresolve=0 ............. all IDENTICAL
(4) P-4 (the AA5b lab params ffbd0=0&ffbd1=0.01&ffbl=1):
    with ?debug: I8 vs AA7 + live 0.6 IDENTICAL; vs I8 ?debug alone DIFFER in walk + final, programs rx-water / rx-water-walk
      (= the params stay live in the lab, as in AA7).
    without ?debug: I8 params vs I8 no params IDENTICAL (ignored). AA7 is also IDENTICAL here, because in the lab the engine's
      debug option IS the URL's ?debug (hero-lab/main.ts: `debug = params.has("debug")`), so the lab cannot show P-4's
      difference. The product-page fix is shown by the code: AA8's Water.ts has 0 `lq.has("debug")` (AA7: 4) and reads
      `opts.debug`, which HeroEngine sets from its own option (`debug: !!this.opts.debug`); app/hero/HeroExperience.tsx creates
      the engine without a debug option. Not run on the product page itself (the Next app on :3000 is the user's).
(5) Binding G8 / G9 (fresh :5196 / :5182 runs; BASE with its plain URL, no AA params):
    I8 ?lkglide=0&mirrorcost=0 vs AA6 ?lkglide=0 (:5196, knee 0.5) ...... IDENTICAL (6 targets, 15 programs)
    I8 all six off + ?fftip=0 vs BASE T1 ............................... IDENTICAL (6 targets, 14 programs)
    I8 T2 all six off + ?fftip=0 vs BASE T2 ............................ IDENTICAL
    I8 ?envlake=plate vs BASE plate .................................... IDENTICAL (2 targets, 12 programs)
    I8 T0 phone vs BASE T0 ............................................. IDENTICAL
    (all six = aaresolve=0&slabflash=0&lktaa=0&lkglide=0&ffblock=0&mirrorcost=0)
(6) Cross-checks with the AA7 recheck's saved hashes: I8 default vs AA7 default differs in the final image ONLY (the knee; all
    five targets and 16 programs equal); fresh BASE T1 == the recheck's BASE T1; fresh AA6 ?lkglide=0 == the recheck's.

## 4. The effects survived (ana/fx_integ.txt)
- Tip strip at x4: NOT APPLICABLE. The tip patch is not integrated (ok false), so the AA7 / AA6 tip spot (gov k62-90, holdre
  k201-211) is unchanged: the default differs from AA7 only in the final image through the knee (3(6)). This stays open for the
  lead (the tip builder's options 1-3).
- P-1 context-restore frames (perf judge's ctxstep.mjs, fresh on :5199; AA7 = the polish builder's :5197 frames):
    extra damage after the restore, px > 16 lv in frames 0-3 (of which darker):
      I8   345 (237) / 262 (213) / 186 (145) / 133 (89)     AA7 5,869 (5,869) / 2,616 (2,616) / 578 (578) / 113 (113)
    restored frame vs the plain resolve (?lktaa=0, same restore): I8 f0 0 px > 4 lv (max 4), f1 9 px > 4 (max 6);
      AA7 f0 5,986 px > 16 lv (max 67), f1 2,735 (max 58).
    TAA state after the restore: weight 0 / still 1 on the first frame, then 0.5 (valid, the glide ramps in); err 0; console
      only the engine's intended "[hero] WebGL context lost".
    Bit identity: the fresh I8 frames (def, loss 0 and 1, f0-f3) == the polish builder's final-build frames (cmp of the raw RGBA).
    Looked at img/ctx_extra_a7_f0_x4.png vs img/ctx_extra_i8_f0_x4.png: AA7 has a bright outline on every floe / rock / slab
      waterline (and faint ring structure); I8 has only faint traces. img/ctx_f0_x150-290_y548-580_A7loss_I8loss_I8noloss_z6.png:
      AA7's restored floe lines are heavier / darker-rimmed, I8's restored frame looks like the no-loss frame.
      img/ctx_f0_x960-1440_y600-700_..._z2.png: the three are alike at this scale.
- Knee table cell (L11): a fresh slow G1 capture of :5199 (cap.mjs, rows 380-766, 160 frames, 0 console lines) is
  pixel-identical to the knee study's live-K 0.6 capture (160 frames, 0 px, poses equal) and differs from K 1.0 (AA7) in every
  frame (max 12 lv). j48loc slow WR J48 on it: BASE 1071 / AA6 686 / I8 691 / K06 691 / K10 733 / GT 656 events
  => I8 -35.48 % vs the bar -33.75 % (GT -38.75 % minus 5 points): PASS with +1.73 points, the knee table's 0.6 cell exactly
  (1.0 = 733, -31.56 %, FAIL).
  Looked at img/knee_slow_k90-120_x430-670_y530-590_BASE_A6_I8_K10_GT_z3.png (from my capture): BASE's thin dark waterline
  lines are dotted / stepped; AA6, I8 and K10 are smooth like the GT; I8 looks like AA6; no rim, halo or outline.

## 5. Patches + apply tests (ana/applytest.txt)
- aa8_vs_aa7.patch: 207 lines, sha256 c8871201d5b6253807ebb28b958e51cc02549006fd1b91d0885cd8cac9ab976c (= polish_vs_aa7.patch,
  byte-identical). Lane aa7 app/ == MAIN retrux-web/app (diff -rq), so it applies to MAIN as well.
- aa8.patch (vs aa3_base = BASE): 1161 lines, sha256 d5363468784fee52279c9ea9caea490853ef03ee345b179c5ab4e54d825959cc.
- Both made with `diff -u --label a/retrux-web/<f> --label b/retrux-web/<f>` over the six files (tools/mkpatch8.sh).
- Apply test (tools/applytest8.sh), fresh cp -c -R clones under retrux-lanes, `patch -p1` from the clone root:
    aa8_vs_aa7.patch on aa7:     dry run rc 0, apply rc 0, 0 .orig / .rej, applied app/ == lane aa8 app/, tsc 0 / 0
    aa8.patch on aa3_base:       dry run rc 0, apply rc 0, 0 .orig / .rej, applied app/ == lane aa8 app/, tsc 0 / 0
  The clones (aa8i_apply7, aa8i_applyB) were removed afterwards.

## STATE (end)
- :5199 serves the integrated build (pid 64433, started 23:01:37 from lane aa8 = AA7 + polish_vs_aa7.patch); left running.
  :5197 / :5196 / :5182 only read from (identS / ctx / cap sessions); not restarted. :5198 was already stopped.
- Lane aa8 not edited by me. MAIN: only notes/round11/lane_backup/aa8/integrator/ written.
- Disk: my slow capture (178 MB) deleted after the analysis (it is pixel-identical to polish/caps/slow_K06, which is kept);
  work folder 69 MB (ident JSONs, the raw ctx frames 67 MB in $SP only, images). The MAIN mirror has no raw frames.
- Open: the tip spot (not integrated); P-4 not exercised on the product page itself (code-level proof only); WebKit / Firefox,
  RC-2 and the hold path were not re-run here (the build is the polish builder's final build, served bundle unchanged).
