# p4orb lane LOG (P4 round 1, builder) - tasks Q2 (orb glass), Q7 (shards), Q4 orb/post part (hold charge, bloom, hues)

## 2026-11-20 23:5x WIB
- Read brief p4r1_common.md, plan Q2/Q4/Q7, panel orb_shards_light + related issues (awwwards, color_grade_post, composition).
- Created lane: cp -c -R LANES/aa7 LANES/p4orb. WORK=$SP/work_p4/p4orb. Lab port 5176. Not editing hero/IceMaterial.ts (ice lane owns it).

## 21 Nov 00:07 - build v1..v4
- Code (lane p4orb, all behind `?p4orb=0`, T1/T2 only via HeroEngine `p4 = P4ORB && tier != T0`):
  - Orb.ts (Q2, `#ifdef ORB_P4`, sub-switch ?orbglass=r11): screen lens on uScreenBg (0.65, 2.5, 2.0, 1); uHoldFill.z 0 -> 0.5,
    uShadeFloor 0.15 -> 0.35; rim: uR11OrbC.y 0.95 -> 0.975, lavender multiply 0.35 -> uP4Orb.x 0.15, hold mint limb uR11OrbB.z 0 -> 0.3,
    R/B dispersion taps in the outer zone (uP4Orb.z/w); hold shoulder 6 -> uP4Orb.y and top uP4OrbB.x (mixed by uRim); hold gain
    (1 - holdCut h), holdCut 0.55 (0.3 before).
  - PostChain.ts (Q4 orb/post, `POST_P4`, sub-switch ?orbcharge=r11): bloom mips' alpha carries the orb band alone (threshold orbThr 5),
    up-sampled with wider UP_WEIGHTS_ORB, read from mips[1] (quarter res) in the grade x holdGlow (= uHold) x holdGlowK. rgb chain
    unchanged (ONE/ONE blending == additive with alpha 1). Rest: holdGlow 0 -> nothing added.
  - Shards.ts (Q7, `SHARD_P4`, sub-switch ?shard2=r11): internal mosaic (3 hashed cut planes per crystal in its own frame -> 8 internal
    facets, 2 PMREM taps along reflect(ex, n_i)), body cap 1.15, see-through thin tips/silhouettes (blurred copy), far haze 0.6 incl.
    the scene behind; uR11Sh 0.75/0.4 -> 0.68/0.55; v3: per-internal-facet value spread, internal reflection share, density scale.
- Tools: WORK/tools/qcap.mjs (shoot_qc poses, live variants, orb screen pos; p4orb: ring clock pinned at the hold start --tau0),
  orbstats.py, shardstats.py (blender python -I), rtx.mjs (aa7 judge's cross-lab real loop, + hold blocks, lane=5176 main=5197).
- Slot contention (aa8 judges): batches run with '!' priority labels, each <= ~2.5 min.
- Baseline (MAIN :5197): q03 disc L50 226-231 clip 11-16 %; hold at tau0 3.3 (= the panel's open-orb p06): p06 box241 clip 20.7 %,
  disc L50 253 sd 19 (panel 16.2 %, 253). Shards in the hero box (B-R >= 85): q00 L 130 / p95 159 / sat 0.54 vs F000 149 / 175 / 0.46.
- v1 (defaults): p05 cobalt limb gone (rim 0.90-1.0 ring mean 142-148 -> 176-180 L-ish), q03 shows refracted grey shapes in the disc;
  hold still mostly clipped; shards barely changed (mosaic lost after absorption + cap) -> v3 shard terms.

## 00:08-00:36 tuning batches b4-b11 (WORK/img/v4..v11, '!' slot batches, qcap with the ring clock pinned at the hold start)
- Hold phase matters more than any knob: tau0 3.3 reproduces the panel's open-orb p06 on MAIN (box241 clip 20.7 %, disc L50 253,
  sd 19); tau0 1.5 / 0 hide the orb behind the bands. Different sessions put the hold rings at different angles even with tau0
  pinned, so per-pose numbers vary +-5 sd between runs; compare distributions, not single shots.
- Orb hold: shoulder 2.5 / top 9 plateaued at L247 (sd 14); 3.5 / 13 at L250 in the capture set's p05 (sd 10); final holdCut 1.1
  (x0.45 at the full hold, -0.92 EV vs MAIN), shoulder 4 / top 16, sheet pre-filter 0.5 (0 -> coloured grain inside the shaded
  shapes, v7 h3), lens shading 0.8 / floor 0.25 in the hold only (rest 0.5 / 0.35: stronger at rest dimmed q00 by ~7 L),
  shading faded out over 0.85-0.97 R (the glass zone beyond the plasma read as a grey bezel), mint limb 1 in the hold.
- Rejected: hold bright-threshold scale (v10: only capped the highlights, pearl look); orb skirt threshold 3.5 (v11 x2/x3: the
  skirt lands on the disc too, box clip 25-34 %); holdCut 0.95 (v11 x1: box 5.5-9.8 % at open poses).
- Hold glow skirt (PostChain): K 0 / 2.5 / 5 at p06 rim zone 0.9-1.0 R: 174-177 / 180-191 / 188-197 (MAIN's cobalt limb ~150,
  F402 ~200) -> K 4.
- Shards: v3 terms (internal facet value spread 0.8, internal reflection 0.7 on 40 % of the facets, density x0.55) -> crystals read
  as translucent glass with light / dark sub-facets (img/z_sh_cmp.png vs loop_F015).
- ident v1 (00:22): pixels / all targets identical with ?p4orb=0 but the 5 lane programs differed: inactive #ifdef blocks stay in
  the source text. Fix: quality.ts laneSource() resolves a lane's #ifdef blocks when it is off (#else kept) -> byte-identical.

## 00:16-00:20 perf (load 3.6-8)
- Real loop (tools/rtx.mjs, aa7 judge's cross-lab tool + HOLD blocks; 6 interleaved pairs per mode, SLOT_BG=0, all pairs load < 10):
  paired mean-interval ratio lane/main medians move 0.984, rest 0.941, hold 1.022; vsync-quantized medians 16.7 ms both, block
  fps 24-53 in both -> noise >> effect.
- Synchronous frame time (tools/ftime.mjs: one browser, both labs booted, engines' loops off, 8 alternations x 60 frames of
  frame(1/60) + 1-px readPixels, pointer swept): rest lane 24.69 / main 25.08 ms mean, paired mean-ratio median 0.995,
  median-ratio median 1.016; hold 39.61 / 39.21, 1.013 / 1.007 (load max 8.0 / 10.4). -> no regression > 5 % at T1.
  (Measured on the v6 build; the later changes are uniform values and one smoothstep in the orb.)

## 00:37-00:41 final ident (ident/summary_final.txt): ?p4orb=0 vs :5197 IDENTICAL (final, 14-15 targets incl. main / refraction /
  back / every bloom mip, every linked program) at T1, T2, T0 phone, ?envlake=plate; lane ON at T0 phone IDENTICAL (T0 unchanged);
  ?orbglass=r11&shard2=r11&orbcharge=r11 IDENTICAL; lane ON T1 differs in main, refraction, bloom0-4, final + rx-orb / rx-shards /
  rx-bloom-down / rx-bloom-up / rx-grade only (mirror, walk, cache, reflection, back untouched).

## 00:42-00:57 final fixes, final set, wrap-up
- Shard internal-facet boundaries anti-aliased (per-plane fwidth smoothstep, continuous cell code; the step() edges were shading
  discontinuities MSAA does not touch -> crawl risk on the slowly turning hold crystals).
- The v2 capture set's sweep showed paper-white far / intro crystals (internal reflection 0.7, density 0.55, haze 0.6, see-through
  0.25): batch v12 -> s1 = reflection 0.35, density 0.7, haze 0.5, see-through 0.2 (q01 sat 0.45, L 142; crystals periwinkle).
- FINAL capture set WORK/qc_final (qc_r11.zsh T1 1, 00:50-00:53, exit 0, no console errors). ana/final_stats.txt:
  p05 box clip 17.6 -> 0 %, sd 30.8 -> 21.2; p06 16.2 -> 0 %, L90 254 -> 249, sd 21.6; q03 L50 242 / sd 22.9 (F045 243 / 21.4);
  shards sat 0.52-0.56 -> 0.46-0.48 at rest / 0.46 in the hold, hue 223; env region stats = MAIN within 1 level.
- FINAL ident (00:52, ident/summary_final.txt): all IDENTICAL (T1, T2, T0 phone, envlake=plate, the 3 sub-switches, lane-on T0).
- FINAL perf (perf/ftime2.json): hold paired median 0.996 (8 pairs < load 10), rest 0.999 (load ~10).
- Patch WORK/p4orb_vs_aa7.patch (715 lines, sha256 ce7fbce8...), apply-tested on a fresh aa7 clone (app/ identical, tsc 0/0).
- HANDOFF: LANES/p4orb/HANDOFF.md. Lab :5176 left running. Intermediate capture sets deleted (img/ tuning batches kept, 172 MB).

## FIX ROUND (fixer of lane orb, 21 Nov 01:17-02:1x WIB) - judge p4orb verdict FAIL: F1, F3 major regressions, F2 major open, F4 minor
Judge evidence: MAIN/notes/round11/lane_backup/p4r1/judge_p4orb (verdict.json, ana/, img/, tools/). Work: WORK/fix (tools/, ab1..ab8, f3/).
- Tool: fix/tools/detab.mjs = the judge's flick.mjs method (engine loop off, same call sequence from a fresh page, readPixels after 9
  frames of 1/60 s) per config (qs / live JS), full frame + projected orb; `--tau0` pins the ring clock at the hold start (qcap's
  trick). fix/tools/detana.py = the judge's jclip / jorb / jhue / jring definitions, paired vs a base tag. fix/tools/flick.mjs = the
  judge's flick.mjs + `--js`; jring.py / jwater.py / jshard.py / jlib.py copied unchanged.
- REPRO (01:19-01:26): with the ring clock 3.3 at the hold start, p05 (expand 2.37) reproduces the judge's MAIN figure exactly: orb box241
  min-ch >= 248 / >= 250 MAIN 17.6 / 13.0 %, lane 2.9 / 0.0 % (judge: 17.6 / 0.0), disc L10/50/90 201/248/250 vs MAIN 190/253/254,
  inner disc lane - MAIN -3.0/-4.6/-4.4 (cream). F3 with the judge's own flick (hold, expand 2.97, frame 8) + jring: -1.24, -1.05,
  -3.73, -4.28, -3.04, -2.20, -0.42 L per annulus = the judge's numbers to the digit.
- The judge's literal F1 revert (holdCut 0.3, hold shoulder 6, pre-filter 0; live): p05 25.1 / 22.2 % (over MAIN / F402: the lane's
  screen lens, mint limb and the K4 hold skirt add light), rim annulus (0.85-1.02 R, projected radius) B-R +18 (more neutral); F3
  fixed: every annulus +0.2..+2.9 L over MAIN, 99.9 % of changed px brighter.
- Code (Orb.ts): the hold exposure cut is gone: holdCut default 0.3 (= MAIN's, kept as a live knob), the ORB_P4 shoulder / top and
  the hold sheet pre-filter blocks removed (MAIN's lines back), the R / B dispersion taps removed (invisible, 2 copy taps; F2
  ask); new hold-only cool tint of the grazing-exit annulus `col *= mix(1, uP4Rim, uRim * smoothstep(uP4Orb.w, 0.97, bImp))`;
  uniforms now uP4Orb = (lavender 0.15, hold lens weight, hold lens floor, tint start) + uP4Rim (vec3); uP4OrbB gone.
- Batches (live knobs, deterministic, paired; MAIN p05 17.6 / 13.0 %, F402 16.2 / 14.3 %):
  ab4/ab5: a mild tint (0.9, 0.98, 1.08) from 0.8 moved the rim B-R by 1; the hold skirt (PostChain holdGlowK) carries most of the
  box clip once the orb is at MAIN's exposure: K0 5.9 / 1.8 %, K2 16.0 / 5.8 %, K4 22.4 / 15.2 % (hold lens 1.0 / 0.12), and K4's
  mint-neutral veil is what greyed the limb; tint (0.8, 0.93, 1.15) from 0.75: rim B-R +25..+28.
  ab6 (lens 1.0 / 0.12, K3, strong tint): p05 18.7 / 11.6 %, rim +26 - but F3 (judge setup) -0.35..-1.43 L: the deeper hold lens
  shading darkens the orb's copy that the ice reads.
  ab7: lens 0.8 / 0.25 + K2 (c): p05 19.3 / 14.4 %, rim +27, F3 +1.05 / +1.41 / +1.27 / +0.59 / +0.91 / -0.06 / +0.11 L (99.2 %
  of changed px brighter); K3 23.2 / 17.8 %; lens 0.6 / 0.35 + K2.5 23.6 / 19.1 %. -> c.
- FINAL values: holdCut 0.3, uP4Orb (0.15, 0.8, 0.25, 0.75), uP4Rim (0.8, 0.93, 1.15), PostChain holdGlowK 4 -> 2. Rest unchanged.
- FINAL build checks (lab restarted 01:41:48):
  - paired det A/B (fix/ab8_stats.txt): p05 off / orbglass=r11 / final 17.6/13.0 | 24.3/21.2 | 19.3/14.4 %; disc L10/50/90 sd
    190/253/254 28.8 | 222/254/255 17.3 | 215/253/254 19.3 (F402 198/252/255 24.2); rim B-R +62 | +36 | +27 (F402 +25..+28); final
    inner disc - MAIN +0.7/-0.2/-0.2 (no cream shift). p06 11.7/8.7 | 18.1/14.5 | 12.7/9.0 %, rim +24. q00 rest inner -1.0/-0.8/-0.9
    (the builder's rest, unchanged); p04 0.4 / 0.0 % (MAIN 0.9 / 0.5).
  - F3 final (fix/f3_final_jring.txt): annuli 1.0-3.5 R +1.05, +1.41, +1.27, +0.59, +0.91, -0.06, +0.11 L vs MAIN; 99.2 % of changed
    px brighter (lane before: -1.2..-4.3, 34 % brighter).
  - qc set WORK/qc_fix (qc_r11.zsh T1 1, 01:42-01:47, exit 0, no page errors). Its p05 caught the orb fully open (bright radius 92 px
    vs MAIN run's 83; other crystal positions, the harness is not phase-deterministic): box 25.0 / 19.3 %, disc 252/253/254 sd 6.8;
    p06 12.7 % (MAIN 12.2), rim L 226 (216,228,237); q03 / q00 / p07 / p08 within the builder's numbers. Looked at:
    fix/orb_stretch_p05_p06_fix.png (hot core back, cool limb, no grey bezel, no cobalt ring; no dark structure inside),
    fix/full_p05_p06_MAIN_FIX_REF.png, fix/ab8_p05_big.png.
  - ident (ident/summary_fix.txt): ?p4orb=0 vs :5197 IDENTICAL at T1, T2, T1 HOLD (pose expand 2.97), T0 phone, envlake=plate; the 3
    sub-switches IDENTICAL; lane ON T0 IDENTICAL; lane ON T1 HOLD differs only main/refraction/bloom0-4/final + the 5 lane programs.
  - perf (perf/ftime_fix.json, sync, 8 pairs, load <= 3.5): rest paired mean-ratio median 0.999, hold 1.001 (one OS spike block each,
    1.23). Real loop: perf/rtx_fix.* (see below). The fix only removes work (2 copy taps, 1 max, 1 mix) and adds one smoothstep / mix.
  - tsc hero 0 / project 0; patch regenerated (682 lines, sha256 986d3bd6...), applies to a fresh aa7 clone, app/ identical, tsc 0 / 0.
- F4 (crystals, minor) NOT fixed, measured: s1 top facet value 1.22 -> 1.34: p95 +1.1..+1.9 L, sat -0.002; s2 internal reflection
  0.35 -> 0.5: p95 +2.8 (p04) / -2.7 (p05) / -2.9 (p06), sat +0.02 (p04). The B-R >= 85 p95 is capped by AgX's highlight
  desaturation (a brighter blue facet leaves the mask): +10 L needs a chroma-preserving lift of the top facets (design decision).
- F2 (open-orb structure) NOT fixed beyond the dispersion removal: the hold lens shading cannot draw F402's structure from the
  current copy (1.0 / 0.12: sd 18.7 vs 19.3 at 0.8 / 0.25, and it dims the ice, F3). Options in HANDOFF.
- 01:50-01:56 real loop (perf/rtx_fix.*, tools/rtx.mjs, 6 interleaved pairs per mode, SLOT_BG=0): paired mean-interval ratio lane/main
  medians move 0.972 (6 pairs), rest 0.950 (6), hold 0.932 (4 pairs below load 10; another job pushed load to 12.1 in 2 hold pairs);
  vsync-quantized and noisy as in the builder's / judge's runs, all medians <= 1. With the sync ftime (8 pairs, load <= 3.5: rest 0.999,
  hold 1.001): no regression > 5 %.
- Sweep (qc_fix/sweep/sw_hold_T, not paired: the sweep's timing differs per run, orb centre (707,470) R 44 vs the judge's (713,401) 88):
  interior L 230 / 223 / 219 at 0.5 / 0.6 / 0.76 R with p10 204 / 190 / 186 (fix/fix_sw_hold_T_radial.txt): no flat 248 plateau.
  Region stats q00 (env) = MAIN's within 1 level.
- Disk: intermediate raw captures (ab1-ab7, f3 variants) deleted after analysis; WORK 0.4 GB. Mirrored LOG, HANDOFF, patch, ident,
  perf, fix_round/ (stats, key images, tools) to MAIN/notes/round11/lane_backup/p4r1/p4orb. Lab :5176 left running (final build).
- 01:54 paired release / eye (fix/ab9_stats.txt; detab release = hold 2.97 then release t): box241 >= 248 / >= 250, MAIN -> final
  (orbglass=r11): p07 0.7/0.4 -> 0.5/0.0 (0.8/0.5); p08 7.1/5.9 -> 6.7/4.7 (7.2/6.0), F460 5.1/4.5; q03 11.3/8.2 -> 10.3/5.6 (11.3/8.2).
  The judge's "never clips at p04-p08" came from the unpaired qc runs plus the hold cut; the residual ~-1 L on the inner disc at
  rest / release is the builder's rest lens shading (Q2 rest, judged "MAIN's" at q00 / q03), kept.
