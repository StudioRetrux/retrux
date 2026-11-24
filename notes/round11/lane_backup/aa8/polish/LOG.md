# AA8 BUILDER 'polish' (20 Nov 2026, Asia/Jakarta; started 22:40, time box 80 min)
Lane /Users/muhamadrifaldi/Library/Caches/retrux-lanes/aa8/retrux-web (cp -c -R of aa7 at 22:41; app/ == aa7 == MAIN at the copy),
lab :5199 (serve.mjs --no-watch; rebuilt 22:48 after the P-1 / P-4 / comment edits). WORK = $SP/work8/polish (tools/, caps/,
ana/, img/, ident/, g10/, logs/). Mirror = MAIN/notes/round11/lane_backup/aa8/polish/. Every browser through slot.mjs;
playwright-core 1.49.1 (retrux-lanes/pw). Tools copied from the AA7 judges / fixer / recheck (tools/mo, tools/ar, tools/pf,
tools/fx); new: kerr.mjs, g1k.py, ctxextra2.mjs, ctxstrip.mjs, b_*.sh, ana*.sh; identS.mjs got --nodebug.

## 1. P-1 (perf judge): TAA history across a WebGL context loss / restore - FIXED
Change: EnvEdge.resetTAA() (valid = false, hasPrev = false, tail = 0; the still count is kept so a camera at rest stays handed
over); HeroEngine calls it on webglcontextlost (next to stop()) and on a new webglcontextrestored listener (removed in dispose).
Repro = the perf judge's ctxstep.mjs (stepped: 20 moving frames, lose + restore, 4 more frames; loss=0 run as reference) and
ctxextra (the TAA build's restore damage minus ?lktaa=0's own), on AA7 :5197 and AA8 :5199 (ana/p1_ctx.txt, logs/b_ctx.log):
  extra px > 16 lv in the 4 frames after the restore (of which darker):
    AA7  5,869 (5,869) / 2,616 (2,616) / 578 (578) / 113 (113)   = the judge's numbers exactly (dark outline on every waterline)
    AA8    382 (279)   /   304 (264)   / 223 (181) / 152 (112)   = no outline: the TAA restarts as on the first frame
  TAA state on the first frame after the restore: AA7 weight 0.5 (history = the recreated EMPTY target); AA8 weight 0 (still 1),
  then 0.5 from the next frame (the glide ramps in from tail 0, as after any frame without history).
  Restored frame vs the plain resolve (?lktaa=0, same restore): AA8 f0 0 px > 16 lv (max 13), f1 0 px > 16 (max 13);
  AA7 f0 5,986 px > 16 (max 67), f1 2,735 (max 58). (No-loss frame TAA vs plain: 496 px > 16, max 81 = the TAA's normal work.)
  The residual 150-380 px of "extra" in AA8 = the restarted TAA vs the no-loss run's converged history (mixed sign), the same
  start every boot / hand-over / resize has.
  Looked at img/ctx_extra_a7_f0_x4.png vs img/ctx_extra_p8_f0_x4.png (extra x4: AA7 bright outlines on every floe / rock
  waterline; AA8 only faint traces) and img/ctx_f0_x150-290_y548-580_A7loss_A8loss_noloss_z6.png (x6, first frame after the
  restore: AA7's floe lines carry a darker rim; AA8 = the no-loss frame to the eye).
  Bit-identity: every frame of the no-loss runs (def and ?lktaa=0) and of the ?lktaa=0 loss run: AA8 == AA7 (cmp of the raw
  RGBA, 4 frames each); only the TAA build's frames after a restore differ (the fix).

## 2. P-4 (perf judge): Water's AA5b lab params gated by the URL's ?debug - FIXED
Water's options get `debug` (HeroEngine passes !!this.opts.debug, as every other lab param uses); ffb / ffbt / ffbd0 / ffbd1 / ffbl /
ffbtoggle are read only when it is set (`opts.debug && lq && lq.get(..)`). The product page (HeroExperience passes no debug) no
longer honours `/?debug&ffbd0=..` or `&ffbtoggle=1`. In the lab, debug = the URL's ?debug (main.ts), so the lab is unchanged.
Proof: section 4 (ident) - default without ?debug, default with ?debug, and the lab params with ?debug: AA8 == AA7.

## 3. P-2 / P-5 (perf judge): stale / contradictory comments - FIXED (comments only, outside every GLSL string)
- HeroEngine (AA5c block), LakeMirror (SKY_VERT_LATE doc), PlateEnvironment (PLATE_MIRROR_FRAG doc and mirrorSlim): "bit-identical"
  now says: in Chrome and WebKit (tools/ident; WebKit 0 px); Firefox 159: ~160 lake px of the final frame differ by 1 level
  (max 1) between AA5c on and ?mirrorcost=0 (the perf judge's g10x run).
- LakeMirror.skyMesh JSDoc: drawn in the mirror pass only, last at the far plane (AA5c setSkyLate, the default) or first
  (?mirrorcost=0, lab ?mcsky=0) - it said "drawn first".
- chunks.ts GLSL_AA_RESOLVE doc and the HeroEngine knee comments: rewritten with the knee decision (section 5).

## 5. M-1 knee study (lead decision L11) - K = 0.6 CHOSEN and implemented (only with the glide; ?lkglide=0 keeps 0.5)
Method: the knee set LIVE on the AA7 final lab :5197 (= MAIN) through cap.mjs --eval
`window.__hero.pipeline.aa.read.uAAKnee.value = K` after boot and BEFORE the settle (the one shared uniform object of the writers and
readers), no rebuild; the six G1 paths with the motion judge's exact args (rows 380-766, pre 30, slow 160 / medium 240 / others 120)
+ rest 40; K in {0.6, 0.7, 0.8, 0.9} captured, K 1.0 = the motion judge's AA7 caps ($SP/work7/motion/caps/<p>_A7; my live-K 1.0
slow capture is pixel-identical to them: 160 frames, 0 px, poses equal, ana/capcmp_slowK10_vs_motionA7.txt), AA6 (0.5) captured
on :5196. 0 console errors / warnings in all 36 capture sessions.
Analysis: crawl.mjs (NEW masks, stride 2, ref BASE; seqs BASE / FIX / A6 / K06..K10 / GT) -> tools/g1k.py (every cell: MC32 per
box + total, J32 / J48 per box + total, on all six paths; L9 for FS; bars as the motion judge's g1tab7.py); the slow WR J48 cell
with exact event counts (j48loc.mjs); tools/kerr.mjs (GT error on GT thin-dark px: off lake / band / hero = jgt2's set, and on
the waterline band = AR-2's thin dark waterline lines; medium 240 + rest 40; reproduces the art judge's jgt2 numbers exactly:
K 1.0 medium 3943 / rest 780 outside BASE's 3x3, thin-dark mean |e| 1.43 / 1.41); popnew.mjs (K's pops that AA6 lacks, art
judge's masks / GTs). Table: ana/knee_table.txt (tools/kneetab.py), full cell list ana/g1k_table.txt.

KNEE TABLE (K: 0.5 = AA6 | 0.6 | 0.7 | 0.8 | 0.9 | 1.0 = AA7)
  slow WR J48 (L4; BASE 1071 events, GT 656 = -38.75 %, bar -33.75 %), events / reduction / margin:
      686 -35.95 +2.20 | 691 -35.48 +1.73 | 700 -34.64 +0.89 | 711 -33.61 -0.14 FAIL | 722 -32.59 -1.16 FAIL | 733 -31.56 -2.19 FAIL
  every other cell (125 of 126 on the six paths; 65 of the 66 L11 cells) passes with >= 1.4 points at every K; the tightest:
      fast FS MC32 (L9 bar -20.2): -22.9 [+2.7] | -23.3 [+3.0] | -23.1 [+2.9] | -22.3 [+2.1] | -22.1 [+1.9] | -21.7 [+1.4]
      reverse FS MC32 (bar -14.4): +7.5 | +6.6 | +5.8 | +5.6 | +5.2 | +5.1 ; diag FS (bar -29.4) +10.3 | +9.7 | +9.4 | +8.9 | +8.0 | +7.5
      leave FS (bar -28.5) +12.3 | +11.4 | +11.7 | +9.9 | +9.1 | +8.9 ; slow RS J48 (bar -66.2) +5.0 | +5.0 | +5.0 | +3.1 | +3.1 | +3.1
  FS MCE <= fixed AA3 on all six paths at every K (e.g. slow 2.762 / 2.766 / 2.770 / 2.774 / 2.777 / 2.781 vs FIX 3.000).
  => L11 cells passed with >= 1 point margin: ONLY K 0.6 (0.7 misses the margin by 0.11 points = 3 events; 0.8-1.0 miss the floor).
  GT error, mean |lane - GT| in luma levels:
      thin-dark medium  1.4319 | 1.4311 | 1.4310 | 1.4316 | 1.4324 | 1.4334   (BASE 1.4624)
      thin-dark rest    1.4110 | 1.4106 | 1.4109 | 1.4117 | 1.4126 | 1.4138   (BASE 1.4448)
      wl-lines medium   4.2050 | 4.2362 | 4.2684 | 4.2994 | 4.3289 | 4.3565   (BASE 6.2227)
      wl-lines rest     4.2832 | 4.2891 | 4.2968 | 4.3042 | 4.3115 | 4.3189   (BASE 6.0426)
      SUM              11.3311 |11.3670 |11.4071 |11.4469 |11.4854 |11.5226   (px-weighted mean 2.2866 | 2.2945 | 2.3033 | 2.3122 | 2.3208 | 2.3291)
      wl-lines signed (lane - GT) medium +0.745 | +0.891 | +1.007 | +1.102 | +1.182 | +1.249 (BASE +3.577) = AR-2's lightening
      AR-2 count (wl-line px > max(GT, BASE) + 12, medium) 27334 | 30607 | 33323 | 35631 | 37665 | 39482
      jgt2 over-darkening outliers (> 4 lv outside BASE's 3x3; medium / rest) 8240/1540 | 6810/1289 | 5658/1070 | 4874/927 | 4337/821 | 3943/780
  New pops vs AA6 (popnew, six paths): - | 0 px | 0 px | 0 px | 0 px | 7 px (1-2 single px per path, as the art judge found)
  => among the passing K (only 0.6) the lowest summed GT error is 0.6; it is also the lowest of all five measured K (both sums).
DECISION (L11): K = 0.6 with the glide. HeroEngine `if (glide) aaKnee.value = 0.6;` (was 1.0); comments in HeroEngine and the
chunks.ts GLSL_AA_RESOLVE doc rewritten (outside the GLSL string). ?lkglide=0 keeps 0.5 (the TAA block's knee line is not reached).
Looked at: img/knee_slow_k90-120_x430-670_y530-590_BASE_A6_K06_K10_GT_z3.png (the centre floe's thin dark waterline lines, AR-2's
site; columns BASE | AA6 | 0.6 | 1.0 | GT at x3): 0.6 = AA6 to the eye, all three smooth like the GT, BASE stair-steps; no rim,
halo or outline. img/knee_slow_WRj48_k117-121_BASE_A6_K06_K10_GT_z5.png (the M-1 events: the dark rock's right edge over the bright
lake streaks, x5): AA6 / 0.6 / 1.0 the same smooth edge, like the GT; BASE steps.
G1c glide (aa5a's glide.mjs, sstride 6, one run with GT / F1 / A6 / K06 / K10; ana/glide_{slow,medium}.raw), REL-to-GT jerk area5 ALL:
  slow   F1 0.2403 | AA6 0.2159 | K 0.6 0.2160 | K 1.0 0.2164      medium F1 0.2224 | AA6 0.1998 | K 0.6 0.2000 | K 1.0 0.2008
  (K 0.6 = AA6 within 0.1 %; below AA5a's F1; the motion judge's separate AA7 run: 0.2166 / 0.2009). Solid-side edge error ALL
  slow 3.83 / 3.88 / 4.05 (AA6 / 0.6 / 1.0), medium 3.70 / 3.75 / 3.91: 0.6 keeps the dark-rock side close to AA6.

## 4. Identity proofs (identS.mjs: 20 moving frames, final image + mirror / walk / cache / cacheN / reflection + every linked
##    program; 0 console errors / warnings in every session)
(a) Build 1 = P-1 + P-4 + comments, knee still 1.0 (:5199 22:48) vs AA7 (ana/ident_id1.txt, ana/ident_id2.txt): IDENTICAL in all
    20 variants: default, ?ffblock=0, ?lkglide=0, all five off, ?mirrorcost=0, ?mrows=0, T0 phone, scale 0.7 default / ?ffblock=0 /
    ?mrows=0, scale 0.9 ?ffblock=0, ?lkglide=0&mirrorcost=0, all six off, T2 all six off, ?envlake=plate (vs the recheck's saved
    :5197 hashes), and ?lktaa=0, ?aaresolve=0, ?slabflash=0, the URL WITHOUT ?debug, and the AA5b lab params with ?debug
    (ffbd0=0&ffbd1=0.01&ffbl=1) (fresh :5197 runs). The lab params stay live in the lab (they change rx-water / rx-water-walk and
    the walk / final, in AA7 and AA8 alike); without ?debug == with ?debug for the default (both builds).
(b) Final build = (a) + knee 0.6 (:5199 23:01; ana/ident_final.txt):
    vs AA7 with the knee set live to 0.6 (identS --pre, before the settle): IDENTICAL for default, ?ffblock=0, ?mirrorcost=0,
      ?mrows=0, ?slabflash=0, scale 0.7, scale 0.7 ?mrows=0, and the URL without ?debug.
    vs AA7 where the knee stays 0.5 or is unused: IDENTICAL for ?lkglide=0, ?lkglide=0&mirrorcost=0, all five off, all six off,
      T2 all six off, ?envlake=plate, T0, ?lktaa=0, ?aaresolve=0.
    Binding G8 / G9: ?lkglide=0&mirrorcost=0 == AA6 ?lkglide=0 (:5196), all six off == BASE T1, T2 all six off == BASE T2,
      ?envlake=plate == BASE plate, T0 == BASE T0: all IDENTICAL.
    Default vs AA7 default: only the final image differs (the knee); all six targets and all 16 programs the same.
    G1 capture of the final default, slow 160 frames: pixel-identical to the knee study's live-K 0.6 capture (0 px, poses equal);
    vs K 1.0 (AA7): every frame differs, max 12 levels (ana/capcmp_slowFINAL_vs_K06.txt).
    P-1 on the final build (ana/p1_ctx_final.txt): extra restore damage > 16 lv 345 / 262 / 186 / 133 (AA7 5,869 / 2,616 / 578 /
      113); the first restored frame = the plain resolve within 4 levels (0 px > 4), the next within 6 (9 px > 4).

## 6. RC-2: fix B's real-loop cost at render scale 0.7 - +0.12-0.15 ms per moving frame (< 0.3 ms: no change)
tools/rc2.mjs = the perf judge's rtxu.mjs (unthrottled Chrome: --disable-frame-rate-limit --disable-gpu-vsync, so the rAF interval
is the frame's cost) with two pages of the final lab in one browser: fixB = /?tier=T1&scale=0.7 (mirror target 504x383) and
mr0 = /?tier=T1&scale=0.7&mrows=0 (504x268, AA7's sizing); product loop (no ?debug), 1440x766 DPR 1, render scale pinned 0.7 in
every block (read back), the page not measured stopped; blocks interleaved AB / BA; MOVE = CDP mouse sweep every 12 ms (700 ms
lead-in, 2.5 s block), REST = no input after a 2.6 s settle. SLOT_BG=0, run alone in the slot (waitq: no other holder, load 5.5).
perf/rc2.json, logs/b_rc2_run2.log. (A first run, perf/rc2_INVALID_parsebug.json, is void: my config parser dropped the query,
so both pages ran the default at the governor's scale; found from the read-back scale / target size and fixed.)
  MOVE, 8 pairs, load 5.1-6.0 at every block (all 8 < 10): median frame 14.80 vs 14.60 ms, p95 16.5 vs 16.2 ms;
    paired median ratio 1.010 (per pair 1.000-1.031); per-pair median-interval difference median +0.15 ms (0 .. +0.45),
    mean-interval difference median +0.12 ms (-0.01 .. +0.45); frames 1356 vs 1370.
  REST, 4 pairs (load 4.6-5.4): paired median ratio 0.988, difference -0.15 ms (the still camera reuses the mirror target).
  => fix B costs ~0.12-0.15 ms per moving frame at render scale 0.7 on this M4 (~1 %), under the 0.3 ms line: no change.
     (The mirror target has +43 % texels at 0.7, still 30 % fewer than at scale 1.)

## 7. G10 on the final build
- tsc in the lane after the last edit (23:01): `npx tsc -p tsconfig.hero.json --noEmit` 0, `npx tsc -p tsconfig.json --noEmit
  --incremental false` 0 (tsconfig.tsbuildinfo untouched: mtime 1795163951, 215617 B). Same in the apply-test clone.
- Chrome: 0 console errors / warnings in every session (36 captures, 64 ident sessions, 10 ctxstep runs; the loss runs print only the
  engine's intended "[hero] WebGL context lost", as AA7 / BASE).
- WebKit (playwright 1.65.1 webkit-2388) and Firefox 159 (firefox-1572), g10x.mjs (my copy: lane port 5199 + knee read-back), 60
  stepped medium frames, lane :5199 vs BASE :5182 (g10/{webkit,firefox}): both boot T1 (WebGL2), TAA runs, glError 0, knee reads
  0.6 on the lane in both engines. WebKit 0 / 0 console lines; Firefox lane 10 / BASE 8 = the same set as AA7 (the +2 "Output of
  vertex shader ... not read by fragment shader" program-info warnings = P-3, ?debug only). Looked at
  g10/webkit/webkit_lane_screenshot.png: a normal frame.

## 8. Patch vs AA7 + apply test
polish_vs_aa7.patch (this folder and the MAIN mirror): 207 lines, sha256 c8871201d5b6253807ebb28b958e51cc02549006fd1b91d0885cd8cac9ab976c,
`diff -u --label a/retrux-web/<f> --label b/retrux-web/<f>` of the six changed files against lane aa7: HeroEngine.ts (P-1 listeners,
Water debug option, knee 0.6 + comments, AA5c comment), shaders/chunks.ts (doc comment only), world/EnvEdge.ts (resetTAA),
world/LakeMirror.ts (comments only), world/PlateEnvironment.ts (comments only), world/Water.ts (P-4). On a fresh cp -c -R of aa7,
`patch -p1` applies cleanly (dry run and real, 0 .orig / .rej), the patched app/ == lane aa8's app/ (diff -rq), tsc 0 / 0.
The clone (aa8_apply) was removed. No GLSL string changed: every linked program is identical to AA7's (section 4).

## STATE (23:12)
- :5199 serves the final build (pid 64433, started 23:01:37 from lane aa8 = AA7 + polish_vs_aa7.patch); left running.
  :5197 / :5196 / :5182 untouched (read / captured only). MAIN untouched except this lane_backup/aa8/polish/ mirror.
- Lane edits: P-1 (EnvEdge.resetTAA + context lost / restored listeners), P-4 (Water debug option), P-2 / P-5 comments, knee 0.6.
- Disk: knee-study capture sets deleted after the analysis (re-run tools/chainK.sh / b_k.sh: deterministic; the live-K 1.0 run
  equals the motion judge's caps to the pixel); kept caps/slow_{A6,K06,K10} (0.5 GB) and g10/ctxstep (raw RGBA of the P-1 runs).
- Open / not done: the jcap event cases (holdre / pump / fastrev / gov / dpr2) were not re-captured at knee 0.6 (0.6 sits
  between AA6's 0.5 and AA7's 1.0, which both passed them; G1c, pops and the hold below say 0.6 = AA6 within 0.1 %); RC-2 measured
  on this M4 only (a weaker GPU pays at most the +43 % mirror texels at 0.7).

## 9. Extra checks on the final build (23:12-23:15)
- Hold path (the knee also acts where the TAA does not run, e.g. the hold's crest train; the perf judge's open observation):
  cap.mjs hold 420 frames rows 380-766 on :5199 (final) and AA6 :5196 (ana/hold_K06_vs_A6.txt; BASE hold_base as mask and
  reference, as the art judge): flagged pops (thr 40) final 7193 px / 233 events, AA6 7298 / 237 (the art judge's AA7 7024 / 228);
  popnew final vs AA6: 0 px; |final - AA6| > 8 lv: 0 px-frames in 420 frames (AA7 vs AA6 had 14.0 k, all brighter).
- Live-loop context loss (the perf judge's ctxloss.mjs, my copy with the lane on :5199; g10/ctx/ctxloss.json): the TAA is
  invalidated on the loss (valid false), the engine stops, restarts after the restore + visibilitychange, frames advance
  (time 8.28 -> 10.81), the TAA runs again (valid, weight 0.5); DPR 2 + resize mid-motion: main 1770x1230, pixel ratio 1.5, TAA
  valid. Console: only the intended "[hero] WebGL context lost". Looked at g10/ctx/loss_lane_1restored.png: lake and waterlines
  normal; the rings' dark blotches after a restore are the pre-existing BASE / AA7 issue the perf judge noted (outside the brief).
