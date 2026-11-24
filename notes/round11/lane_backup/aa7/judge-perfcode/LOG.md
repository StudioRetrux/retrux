# AA7 final judge - lens PERF + ROBUSTNESS + CODE (judge-perfcode), 20 Nov 2026 20:52-21:40

Labs: AA7 :5197 (lane aa7, read-only), BASE :5182 (aa3_base), AA6 :5196 (aa6, frozen). All three up at start (pids 2852/2854/2856,
started at boot 20:47 so the bundles are built from the current sources). No lab restarted, no lane edited.
Tools: tools/ (copied from my pre-reboot partial work7_partial_20nov/perfcode/tools, read again before use; createRequire ->
retrux-lanes/pw 1.49.1; g10x.mjs -> RetruxR11Work/pw165 1.65.1 + PLAYWRIGHT_BROWSERS_PATH=RetruxR11Work/ms-playwright).

## 0. Source = BASE + aa7.patch (applytest)
- Fresh clone of aa3_base/retrux-web/app/hero/engine + `patch -p1 < lead/aa7.patch` (6 files, applies clean) == the AA7 lane's
  engine byte for byte (`diff -r`: no output). `diff -rq` BASE vs AA7 app/hero: exactly the 6 patched files.

## 1. G10 tsc (in the AA7 lane, 21:0x)
- `npx tsc -p tsconfig.hero.json --noEmit` exit 0 (8.1 s); `npx tsc -p tsconfig.json --noEmit --incremental false` exit 0 (8.7 s).
  tsconfig.tsbuildinfo untouched (mtime 1795163951 / 215617 B before and after). Logs g10/tsc_*.log.

## 2. G8 / G9 switches exact (tools/ident.mjs: 1440x766 DPR 1 T1 unless noted, ?scale=1&debug=1, engine rAF off, settle 6 +
##    20 moving frames; hashes of mirror / walk / cache / cacheN / reflection targets + final image + every linked program)
(see section 2 table below; 0 console errors / warnings in all 17 sessions)

Table (tools/cmp.mjs; ident/summary.txt; "programs" = every linked program's preprocessed source hash, per name):
  A7 ?mirrorcost=0 vs A6 + uAAKnee 1.0 set live      IDENTICAL (final + 6 targets + 15 programs)
  A7 default vs A7 ?mirrorcost=0                     final + all targets SAME; programs differ only by AA5c (rx-lake-sky-late,
                                                     rx-plate-baked-mirror present; rx-lake-sky never linked with the late sky)
  A7 default vs A6 + knee 1.0 live                   final + all targets SAME; programs: the same 3 AA5c names only
  A7 ?lkglide=0&mirrorcost=0 vs A6 ?lkglide=0        IDENTICAL (knee 0.5 in both)
  A7 ?lkglide=0 vs A6 ?lkglide=0                     final + targets SAME; programs: the 3 AA5c names only
  A7 ?ffblock=0&mirrorcost=0 vs A6 ?ffblock=0 + knee 1.0 live   IDENTICAL  (=> with ?ffblock=0 the knee is the ONLY A7/A6 change)
  A7 ?ffblock=0 vs A6 ?ffblock=0 + knee 1.0 live     final + targets SAME; programs: the 3 AA5c names only
  A7 all six off (aaresolve, slabflash, lktaa, lkglide, ffblock, mirrorcost = 0) vs BASE T1    IDENTICAL (14 programs)
  A7 T2 all six off vs BASE T2                        IDENTICAL (mirror 1440x575, counts mirror 8 / walk 21 as BASE)
  A7 ?envlake=plate vs BASE ?envlake=plate            IDENTICAL (knee 0.5 both: the knee line is not reached on the plate lake)
  A7 T0 mobile 390x844 DPR 3 (isMobile, hasTouch) vs BASE T0    IDENTICAL; rgbacmp of the two final frames: 0 px differ (G9)
  Knee as read back after the run: 1.0 in A7 default / mc0 / f0; 0.5 with ?lkglide=0 and on the plate lake; none (no resolve) T0.
  The ffblock switch is live: A7 walk hash 7b445184.. vs ?ffblock=0 63b5c6a0.. (the v3 guard changes the walk only).
  Looked at: img/a7_final.png (normal frame), img/cmp_a7_base_diff8.png (A7 vs BASE x8: waterlines, far-floe reflections and
  the lake under them; above the horizon black: sky + mountains rows 0-420 max 1 level (3,802 px at 1), ring box above the horizon
  max 3 levels, ring box below it up to 97 = the lake behind the ice), img/a7T0_final.png (normal phone frame).
=> G8 PASS, G9 PASS. The lead's identity claims all reproduce independently (17 sessions, 0 console errors / warnings).

## 3. G7 real loop (tools/rtx.mjs: AA7 :5197, BASE :5182, AA6 :5196 each booted once in its own context of ONE headless
##    Chrome, ?tier=T1&scale=1 (product loop, no ?debug), 1440x766 DPR 1; the two pages not measured are stopped
##    (__hero.stop); blocks interleaved ABC / CBA; MOVE = CDP mouse sweep every 12 ms (700 ms lead-in), REST = no input after
##    2.6 s settle; per block the rAF intervals of a separate hook)
- Exclusive window: the lead's recipe (write {n:1,loadMax:24,until +20 min}, queue '!') was a lottery behind 8-9 other '!'
  waiters (slot.mjs gives a freed slot to whichever waiter polls first; 10 min without a turn), so at 21:21 I restored
  {n:3,loadMax:30}, queued again and had the batch write the exclusive conf ITSELF once it held a slot; it landed on slot 1, so
  n:1 did not shut slot 0 -> loadMax 1 (no new holder can enter) until it ended; tools/waitquiet.mjs then waited for the
  running holders to drain (102 s) and load < 7 (6.04). Restored exactly {"n":3,"loadMax":30,"bg":false} at the end (checked).
- Run 1 (21:24-21:29, vsync-capped rAF, 10 move + 10 rest cycles, load 3.9-5.8 at every block, all 10 pairs < 10, SLOT_BG=0):
  the medians are vsync-quantized: every config 16.70 ms median, p95 33.40 ms (one dropped vsync), paired median ratio 1.000 for
  every pair and mode => at 1440x766 on this M4 AA7 holds 60 fps like BASE (median), and the cost shows as more dropped frames:
    MOVE  mean interval  A7 21.29 ms (27.7 % of intervals > 20 ms)  BASE 20.06 (20.4 %)  AA6 21.53 (29.2 %); engine fps 44-51 / 47-51
          paired MEAN-interval ratios A7/BASE median 1.061 (mean 1.063, 0.992-1.163, n 10); AA6/BASE 1.080; A7/AA6 0.979
    REST  A7 19.08 (13.9 %)  BASE 19.43 (16.6 %)  AA6 19.58 (17.0 %); A7/BASE 0.977, A7/AA6 0.974 (TAA handed over: weight -1)
  (perf/rtx_1440.json / .out; tools/rtxana.py, tools/rtxmean.py)
- Run 2 (21:31-21:36, tools/rtxu.mjs = rtx.mjs + Chrome --disable-frame-rate-limit --disable-gpu-vsync, so the interval IS the
  frame's cost; 8 move + 8 rest cycles, blocks 2.0 s; same exclusive recipe, waitquiet 81 s to load 9.66, restored after):
    MOVE  median / p95 per frame: A7 22.90 / 26.80 ms   BASE 21.70 / 26.40 ms   AA6 23.10 / 26.90 ms
          paired median ratios A7/BASE [1.071 1.039 1.071 1.060 1.044 1.007 1.080 1.094] -> median 1.065 (ratio of medians 1.055,
          p95 1.015); A7/AA6 median 0.991 (AA5c's mirror saving); AA6/BASE 1.066.
          1-min load at these move pairs 9.0-13.3 (only 1 pair < 10): the window was exclusive (no other slot holder; waitquiet
          confirmed), so the rise is the unthrottled run itself plus non-slot processes; the vsync run above meets the < 10 rule
          on all 10 pairs and agrees (mean-interval ratio 1.061).
    REST  A7 20.20 / 39.70  BASE 20.20 / 39.70  AA6 20.00 / 39.70; A7/BASE paired median 1.009 (8 pairs, all < 10), A7/AA6 1.022.
=> G7: moving +6 % vs BASE (1.061 / 1.065 in two independent runs; per pair 0.99-1.16), -1 to -2 % vs AA6, rest +0-1 %.
   Inside L8's "~+5 %" only loosely and under the +7 % flag line: no finding, but the margin is ~1 point (borderline).

## 4. G10 robustness (Chrome 157 headless, ANGLE Metal unless noted)
- Console: 0 errors / warnings in ident (17 sessions, ?debug), rtx + rtxu (product loop, 6 pages), hitch (4 sessions), the DPR 2
  resize sessions; the context-loss sessions print only the engine's intended "[hero] WebGL context lost" (BASE identical).
- DPR 2 + resize mid-motion (tools/ctxloss.mjs part 2: T2, 1440x766 DPR 2 -> 1180x820 during a CDP sweep): main 1770x1230,
  pixel ratio 1.5 (T2 cap), TAA running (weight 0.5, valid), frames advance; looked at g10/ctx/dpr2_lane_afterResize.png: normal.
- First-motion hitch (tools/hitch.mjs, a7 / base interleaved x2, real loop, CDP sweeps; load 3.7 -> 52.9 during the run): A7 links
  24 programs at boot incl. rx-lake-edge-taa, rx-plate-baked-mirror, rx-lake-sky-late (BASE 22); after boot only rx-water-cache /
  -cache-n (as BASE). First motion CPU per frame (first 10): A7 2.0-2.5 ms, max 3.3 / 2.7; BASE 1.8-3.2, max 3.2 / 2.9. Restart
  after an 8 s rest (TAA handed over): A7 max 3.0 / 2.4, BASE 2.8 / 2.7. Boot 3.3-3.6 s (BASE 4.2-4.8). No hitch. 0 console.
- Context loss + restore, live loop (tools/ctxloss.mjs: sweep, WEBGL_lose_context lose, restore, visibilitychange restart, sweep):
  A7 and BASE behave alike: engine stops on loss, restarts, frames advance, TAA valid; in BOTH the ice rings come back with black
  blotches that persist (pre-existing, not AA7: looked at g10/ctx/loss_lane_1restored.png and loss_base_1restored.png).
- Context loss + restore, stepped (tools/ctxstep.mjs; 20 moving frames, lose / restore, 4 more frames vs the same run without
  the loss): BASE's first frame after the restore has a BLACK LAKE (mirror only every 3rd moving frame: empty target), A7's lake
  is right (mirror every moving frame) - A7 is better there (looked at g10/ctxstep/cmp_base_f0_a.png vs cmp_a7_def_f0_a.png).
  But A7's TAA keeps `valid` across the restore and blends the band with the EMPTY history: extra damage beyond ?lktaa=0's own
  restore damage (tools/ctxextra.mjs) = every waterline outlined darker, 5,869 / 2,616 / 578 / 113 px > 16 levels (1,392 / 144 /
  10 / 0 > 32) in the 4 frames after the restore, 100 % of them darker (looked at g10/ctxstep/extra_taa_f0_x4.png) -> P-1.
- Firefox 159 (UA rv:159.0; playwright 1.65.1 firefox-1572, tools/g10x.mjs, 60 stepped medium-sweep frames): A7 and BASE boot T1 (WebGL2,
  4 samples, "Apple M1, or similar"), A7 TAA on, mirrorEvery 1, glError 0, 8.7 / 8.2 s load; frame normal (looked at
  g10/firefox/cmp_lane_base_a.png; A7 vs BASE x8 = waterlines / lake reflections only, cmp_lane_base_diff8.png).
  AA5c in Firefox: A7 default vs A7 ?mirrorcost=0 = 160 px differ by 1 level (max 1), all on the lake (rows 481-734); BASE run
  twice = 0 px (deterministic) -> AA5c is not bit-exact in Firefox (P-2, invisible).
  Firefox console (debug mode only: renderer.debug.checkShaderErrors = !!opts.debug): BASE prints 12 program-info / UA warning
  lines, A7 14: +1 "Output of vertex shader '...1003d1...' not read by fragment shader" from the slim twin (A7 vs A7 mc0),
  +1 "'...37cc06...' not read" from AA3/AA6 (A7 mc0 vs BASE) -> P-3.
- WebKit (Safari 27.2 engine, playwright 1.65.1 webkit-2388, same g10x run): A7 and BASE boot T1 ("Apple GPU", WebGL2, 4 samples,
  highp 23 bits), A7 TAA on, mirrorEvery 1, glError 0, 0 console messages (both, also with ?mirrorcost=0); frame normal (looked at
  g10/webkit/cmp_lane_base_a.png; x8 diff vs BASE = waterlines / lake only). AA5c exact in WebKit: A7 vs A7 ?mirrorcost=0 = 0 px.
- tsc clean (section 1). => G10 PASS with nits P-1 (context restore), P-2 / P-3 (Firefox).

## 5. Code review of aa7.patch (every hunk read; lane == BASE + patch, section 0)
- Start ramp (EnvEdge.runTAA): tail = 0 on every frame whose uHistW is 0 - first frame, after the hand-over (skip sets valid =
  false), setSize / resize / governor step (valid = false; also the in-pass size check, which runs BEFORE uHistW is written, so
  a mismatch caught there zeroes it too), a jump > 96 px (weight 0). Then tail += 1/12 per frame, capped by 1 (moving) or
  1 - still/24 (tail): starting inside the tail climbs from the ramped-down value, stopping ramps down 1/24 per frame, nothing
  jumps. The band sigma follows the same tail (uWb = uW at tail 0), and a frame without history leaves alpha positive (no band
  flag) because TAA_FRAG returns before the flag line. Only gap: `valid` survives a context restore (P-1).
  (probeMotion returns Infinity when a probe falls behind the previous camera -> counted as "still"; needs a > ~90 deg turn in
  one frame: no scenario.)
- v3 guard (Water LK_FFB_GLSL): every smoothstep has edge0 < edge1 (LK_FFB / +1 / +2; LK_FFBD1 >= LK_FFBD0 + 0.01; LK_FFBL >=
  0.001); exp(-(r.a - pm) / LK_FFBT) with r.a - pm >= 0 and LK_FFBT in (0, 10]; hFt >= ~0.25 texel (dyF carries 0.5/size before
  the anchor), no division; rows from the clamped uvM.y: bottom j0 = -1 reads row 0 through the target's clamp-to-edge, top
  j0 + 1.5 <= size - 0.5; ux clamped; textureGrad dy = 0 takes the LOD from dxF; sky texels (alpha 60000) fall outside
  LK_FFBD1 -> k = 0, never pulled forward; no NaN source added. Defines parsed with range checks, NaN -> defaults.
- Knee: aaKnee is ONE {value} object shared by the reader and writer uniforms (createAAUniforms stores the object); it is set to 1.0
  in the constructor before warmUp / compileAsync and before any frame, so nothing reads 0.5 on the glide path; the plate lake
  (mirror null, product) and T0 (msaa 0 -> msaaBaked false) never reach the line (ident: plate knee 0.5 == BASE; T0 no resolve).
  Note: 1.0 also holds where the TAA does NOT run (hold crest-train exclusion 8.2-21.5 m, hero-reflection exclusion, frames
  without history, > 96 px jumps, rest after the hand-over). The HeroEngine comment's reason ("no longer needed against waterline
  jumps") holds only where the TAA runs; chunks.ts' own sweeps put K = 1 at 40-49 % vs K = 0.5 at 65-74 % fewer > 48-level jumps.
  I did not measure the hold path; flagged for the motion judge (observation, not a finding).
- AA5c: twins share the uber material's uniforms object (later Object.assign in setAAResolve reaches them), copy its defines at
  the first mirror pass (all baked materials share one bakedDefines object; setEdgeAlpha / setAAResolve run before warmUp), same
  vertex shader and side; swapped back after every pass (mirrorSwapped), and a live setMirrorCost(false, false) still restores
  them; dispose covers the twins and skyLateMaterial; nothing size-dependent. Late sky: renderOrder 1e9 = last of the opaque list
  (renderOrder sorts before program / depth), z = w -> depth 1.0 vs the cleared 1.0 with LessEqual, depthWrite off, clouds
  (transparent) after it either way. Linked in the warm-up frame (hitch). Exact in Chrome and WebKit, +-1 level in Firefox (P-2).
- Lab-only params: every engine lab param needs this.opts.debug (lktaaw / lktaaclip / lktaafar / lktaarefl / lktaacrest, lkg*,
  mcsky / mcslim); the product switches (aaresolve, slabflash, lktaa, lkglide, ffblock, mirrorcost) are documented. Water's AA5b
  lab params use the URL's `?debug` instead (P-4).
- Comments: GLIDE numbers match (sigma 0.3 -> neighbour weight exp(-1/0.18) = 0.004); TAA_TAIL / TAA_HEAD / TAA_JUMP docs match
  the code. Stale: LakeMirror skyMesh JSDoc "drawn first in the mirror pass only"; chunks.ts still opens with "K ... is 0.5" (P-5).

## 6. Findings (all nits; no blocker / major / minor open in this lens)
- P-1 nit (EnvEdge.ts:629 / 674, robustness): the TAA's `valid` survives a WebGL context loss + restore, so the first frames after
  a restore blend every waterline band with the EMPTY (recreated) history -> dark outline on every waterline for ~3 frames
  (5,869 / 2,616 / 578 / 113 px > 16 levels darker than the no-loss run, beyond ?lktaa=0's own restore damage). Context: BASE's
  restore is worse (black lake on frame 1; persistent black blotches on the rings in BASE and A7 alike, pre-existing, outside the
  brief) and A7's every-frame mirror fixes BASE's black lake. Repro: node tools/ctxstep.mjs --port 5197 --loss 1|0 [--qs lktaa=0]
  --out ...; node tools/ctxextra.mjs (tools/b_ctxstep.sh). Fix: on the canvas' webglcontextrestored set taa.valid = false and
  hasPrev = false (one line in EnvEdge or HeroEngine).
- P-2 nit (HeroEngine.ts:263, LakeMirror.ts:53, PlateEnvironment.ts:536 / 1283 comments): AA5c is bit-identical in Chrome
  (ident) and WebKit (0 px) but not in Firefox 159: 160 px of the lake differ by 1 level (max 1) between the default and
  ?mirrorcost=0 (BASE twice: 0 px). Invisible. Fix: say "bit-identical in Chrome / WebKit, <= 1 level in Firefox".
- P-3 nit (PlateEnvironment.ts:538 PLATE_MIRROR_FRAG; the TAA program): with ?debug, Firefox prints 2 more program-info warnings
  than BASE ("Output of vertex shader '...' not read by fragment shader": the slim twin, and one AA3/AA6 program). Debug only
  (checkShaderErrors = !!opts.debug); BASE already prints 12 of the kind; product console unaffected. Fix: none needed.
- P-4 nit (Water.ts:2240-2257): AA5b's lab params (ffb, ffbt, ffbd0, ffbd1, ffbl, ffbtoggle) are gated by the URL's `?debug`,
  not the engine's opts.debug like every other lab param; the product (HeroExperience.tsx passes no debug) still honours e.g.
  `/?debug&ffbd0=0&ffbd1=0.01&ffbl=1` or `&ffbtoggle=1` (extra uniform). Needs a deliberate URL. Fix: pass the engine's debug flag
  into Water's options.
- P-5 nit (LakeMirror.ts:83, chunks.ts:219): skyMesh JSDoc says "drawn first in the mirror pass" (AA5c draws it last by
  default); GLSL_AA_RESOLVE's doc still states "K (uAAKnee, HeroEngine) is 0.5" before the appended 1.0 note. Fix: reword.
- Observation (not judged here): knee 1.0 also holds where the TAA does not run (hold crest train, hero reflection, no-history
  frames, > 96 px jumps); the hold path's waterline crawl vs AA6 is unmeasured in this round as far as I can see.
- G7 note: +6 % moving vs BASE sits between L8's ~+5 % and the +7 % flag line; any further per-frame work would cross it.

## VERDICT (21:39): G7 PASS (borderline, +6 %), G8 PASS, G9 PASS, G10 PASS (nits), code: no defect in the start ramp, the v3
## maths, the knee line or AA5c. pass = true. Score 8.8 / 10 for this lens against "make it smooth / ensure everything perfect":
## exact switches, phones untouched, no hitch, all three engines clean, cost +6 %; the deductions are the borderline cost and
## the 3-frame dark waterline outline after a context restore.
