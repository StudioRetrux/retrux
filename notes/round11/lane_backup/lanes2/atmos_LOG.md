# ATMOS lane LOG (round 11, P2c)

Builder: atmos, started 2026-11-15 20:05 WIB. LANE = $SP/lanes2/atmos, BASE = $SP/lanes2/base, WORK = $SP/work2/atmos, lab :5176.

## 20:05 start
- Read SPEC 0-3, AUTOPILOT, INTEGRATION, handoff_env. WORK was empty: fresh start.
- Hypothesis for the vanishing clouds: CLOUD_VERT drifts every card by `uTime * 0.035 * (0.6 + aSeed)` m (unbounded, no wrap):
  after 10 min 12.6-33.6 m, after 30 min 38-101 m, at 84-128 m depth (half view width ~36-55 m). Next: prove it with clock jumps.

## 20:10-20:40 diagnosis (clouds) and reference measurements
- PROVEN (caps/idle0, an/idle0_sky_sheet.jpg, py/cloudsim.py): with the clock jumped to 10 / 60 / 300 / 600 / 1800 s the cards drift
  right and leave; sky coverage (rest view, sky band) vs t=0: 1.00 / 1.00 / 1.03 / 1.01 / 0.56, and over 2 h median 0.05 (min 0).
  Cause: CLOUD_VERT `p.x += ... + uTime * 0.035 * (0.6 + aSeed)` (unbounded, no wrap). Also a +-2.4 m sway and a 0.5 m "breath" (invented).
- REFERENCE drift (py/drift_chain.py, phase correlation, chained): clouds move LEFT (-x), never right.
  * State 2 to 5, static-camera windows F0-F10, F164-F184, F202-F228, F306-F330: left box (card 1, d 96.7 m) 7.8 px/s, right box
    (card 0, d 116) 6.3 px/s -> ~0.43-0.45 m/s translation (parallax ~1/d). Hold sustain F382-F440: still ~7.5 px/s (no slow-mo).
  * Default Loop (4 s): 23.5 / 20.4 / 16.6 px/s (left / right / centre-left), constant, ~3x the State video (a time-compressed loop).
  * Decision: the State video's speed (the long, interactive reference incl. rest and hold windows): 0.0042 tangent/s = 7.1 px/s.
- REFERENCE summit wisp: present at F0 in both videos, drifts left with the wind and is gone by F40 (Loop) / before F170 (State)
  (an/loop_wisp_seq.jpg, an/state_summit.jpg): a transient puff blown off the summit, not a static card.
- Engine rest frame vs F000 (an/r0_regions.json): the haze regions swing with time (dark_ridge G 74 / 88 / 95 at t 10 / 60 / 1800,
  right_iceberg -9 / -17, far_right_range +18 / +14 / +8): plateMistWisp = 0.55 + 0.9 vnoise (28 m features, 0.34 m/s) scales fog
  and mist 0.55-1.45x over whole regions = a slow "breathing" of the haze, not wisps.
- Conveyor design (py/cloudsim2.py): rigid tangent-space conveyor (x/d at the rest camera), period kappa 1.70, wrap bound |x/d| 0.60
  (widest view: hfov/2 23.07 + orbit 5.64 deg + 1.8 m lateral = 0.567), no fades needed. 6 cards only: coverage min 0.36 / median
  0.69 of F000's. +3 copies of the artist's cards in the off-screen gap (cloud_b mirrored d122 low, cloud_a mirrored d116 mid,
  cloud_b mirrored d140 high): min 0.87 p10 0.92 median 1.00 max 1.13. Period 1.70 / 0.0042 = 6.7 min.

## 20:20-20:50 clouds built + verified; reference mist measured
- BUILT (typecheck 0): world/Atmos.ts (switches ?atmos=r10 / ?atmosclouds=0 / ?atmoswisp=0 / ?atmosmist=0 / ?atmoscloudsoft=0,
  CLOUD_WIND omega 0.0042 kappa 1.70 bound 0.60, CLOUDS_EXTRA x3, cloudLane / cloudShift on the CPU), PlateEnvironment.ts
  (CLOUD_VERT `#ifdef CLOUD_R11 p += uCloudShift` else the old drift; CLOUD_SOFT mip bias log2(2.26) = 1.18; cards + extras;
  updateAtmos(time)), HeroEngine.ts (1 line: env.updateAtmos(s.time) after uTime).
- VERIFIED: caps/idle1 (t 10..1800): clouds always present, scrolling left, new ones from the right (an/idle1_sky_sheet.jpg looked
  at). Loop: t=10 vs t=10+404.76 sky band 0-200 mean |d| 0.57 (the rest is the handheld camera + UV boil). Wrap moments
  (caps/wrap1: card 1 at 84.8 s, card 4 at 293.1 s) at pointer +-0.98 / corners: edge columns unchanged (mean 0.2-0.55 = the
  0.2 s drift), an/wrap1_sheet.jpg looked at. At t = one period the cards register with F000 (an/soft_cmp_right.png).
- Cloud softness (py/edgew.py, 10-90 % edge widths at F000 layout): F000 8.0 / 10.5 / 8.0 / 10.0 px; old 6.0 / 7.0 / 7.0 / 10.0;
  CLOUD_SOFT 7.0 / 5.5 / 8.0 / 10.0 -> kept. Sky tone (py/skytone.py): engine open sky +2.5..+4 luma brighter and less saturated
  (bottom-20 % rgb 178.9,197.4,219.6 vs F000 175.1,192.3,219.1); cloud tops -3 (216.5,220,226.1 vs 219.7,221.9,228.2). Open item.
- REFERENCE MIST IS DYNAMIC (py/regtime.py, an/loop_mist_seq.jpg, an/ref_mist_F000_vs_L045.jpg): a ground mist bank rolls over the
  left mountain bases. Loop F0->F90: ridge_foot luma 124 -> 163, shore_mist 161 -> 184, foothills 156 -> 183, massif 169 -> 158,
  berg 151 -> 139, while dark_ridge (86-89), far_right (175-177), mound, sky stay put. State video (real time) the same roll-in
  over ~6.7 s (F0 -> F200: shore 161 -> 182, foothills 156 -> 179; F300-F330 ridge_foot 158-163). Loop = 3x time compression
  (as the clouds). Engine: the fog/mist "wisp" modulation swings the dark RIDGE BODY +-15 over ~80 s instead (wrong place, wrong
  timescale), and the base mist is a static mid state.
- NEXT: ATMOS_MIST: stable aerial fog on the ridge body; a rolling ground-mist bank (drifting fbm envelope, wind -x) with the
  reference's amplitude / timescale at the bases; then the summit wisp; then sky tone; then the full verification set.

## 20:50-21:45 ground mist (ATMOS_MIST) built and tuned
- Code: Atmos.ts GLSL_ATMOS_MIST (world-anchored bank: x -80..-6, z -118..-58 m, top 2.4 m at the ridge -> 7.5 m at the massif's
  foot +-0.8 ragged, evolving 3-octave fBm envelope (60 x 40 m cells, 0.04 cells/s, wind 0.43 m/s -x), billow, two-tone colour
  pale low / steel blue high); PlateEnvironment PLATE_FRAG: steady fog factor on the ridge body (uAtmosBank.z 0.7), the bases' fog
  and mist band thinned while the bank is out (atmosBaseK, not on the ridge body), the bank composited after the band, fading
  with uFogHold. ATMOS_MIST define on the plate + baked materials; uniforms shared (runtime-tunable __hero.env.atmosUniforms).
- Bug found + fixed: smoothstep(-75, -92, z) with edge0 > edge1 (undefined in GLSL) -> 1 - smoothstep(-92, -75, z) (no visual
  change on Metal, but undefined elsewhere).
- World positions of the boxes (py/boxpos.py from the bake's rest-plate position map; confirmed by CPU raycasts in the engine,
  tools/raycast.mjs): dark ridge (-33, 4.4, -73), ridge foot (-28, 1.1, -70), massif low face (-28, 3-5, -89..-92), foothill
  (-18.5, 0.8, -90), plain (-23, 0.5, -77).
- Numbers (caps/mist7, 8-bit luma; ref clear S000 / misty S210, S320): engine clear vs misty: ridge foot 133 / 168 (124 / 138-162),
  shore 165 / 182 (161 / 181-184), foothills 163 / 182 (156 / 181), foothill dark 163 / 184 (153 / 182-187), plain 185 / 185
  (175 / 184-188), massif low 161 / 156 (160 / 134-152). Live t 4..300: dark ridge 84.6-91.6 (ref 85-89; old engine 72-95),
  ridge foot 134-164, shore 165-181, foothills 164-178, massif low 144-157.
- Time offset 805.5 s (py/mistenv.py, numpy port of hash13 / vnoise / fbm): env 0 at t 0-3.5, shore/foothill/plain in by ~8 s,
  ridge foot by ~11 s (State F0 -> F200 -> F320); 2 h stats per box: clear 30-32 %, misty 32-33 %, mean 0.51.
- Next: summit wisp spindrift; sky tone; verification set (idle long, pointer, hold, sweep, perf, way-back).

## 21:45-22:10 spindrift wisp + billowy mist
- Summit wisp = gusts (Atmos.ts wispPuff, ATMOS_WISP in PLATE_FRAG): first puff at 2.2 s (peak as the intro ends, F000), then
  every 14 +- 4 s, life 4.5 s (in 0.8 s, gone by 4.5 s), drifting 0.6 m/s downwind (-x) across the 10.1 m card, eroding with
  age. Looked at caps/idle2 (an/idle2_left_sheet.jpg): t 3.4 puff on the summit's left flank (as F000), t 5 drifting left,
  t 7 breaking up, t 9 gone, summit clean after (as State F170-F330).
- Mist v2 (billows): early-outs (outside the box / above any top / envelope 0), puffy top (2-oct fBm, 6 m cells, +-1.2 m),
  cauliflower puffs (3-oct fBm, 3.5 m cells x 1.8 m tall, rising 0.05/s), colour x (0.92 + 0.16 puff). caps/mist8, an/mist8_sheet.jpg
  looked at (S320 | forced misty; live t 12 / 40 / 120 / 300): billowy volumetric bank, partial banks at t 300.
  Numbers misty vs ref (S210 / S320): ridge foot 161 (138 / 162), shore 182 (184 / 181), foothills 182 (182 / 181), foothill dark
  185 (187 / 183), plain 185 (188 / 184), massif low 156 (152 / 134); dark ridge live 84-95 (ref 85-89).
- Next: verification batch (MAIN shoot_qc / shoot_pointer / shoot_sweep on :5176), temporal flicker check, way-back vs :5173, perf.

## 21:00-21:12 verification batch 1
- MAIN shoot_qc (caps/qc1) + shoot_pointer (caps/ptr1) on :5176: no page errors, no console errors / warnings. Looked at
  cmp_q00_rest (mist rolling in at t~9 s, summit puff already gone: QC timing vs F000, see HANDOFF), cmp_p06_sustain (hold bank
  as before, clouds present), an/ptr1_sheet.jpg (9 pointer views: clouds, mist, no artefacts at sheet scale).
- WAY-BACK (tools/v_wb.json, py/wbdiff.py; clock pinned t 100 / 1800, tau pinned, hero / shard zone excluded):
  ?atmos=r10 on :5176 vs MAIN :5173: q00 0.362 (max 1), q03 0.362 (1), q00@1800 0.464 (1), pointer L 0.499 (1), pointer TR 0.499
  (1), 0 px > 2; MAIN vs MAIN repeat 0.10-0.49 (max 1). p06 1.31 vs MAIN's own repeat 1.44 (the hold is not deterministic). PASS.
- Code review of the diff: base-haze thinning now also gives way to the hold's fog bank (atmosHoldK), so the hold look keeps
  the integrated build's base haze. Typecheck 0.
- 21:05 perf batch started in the background (tools/perf_batch.zsh, 6 interleaved pairs, SLOT_BG=0, waits for load < 6;
  other lanes are running sweeps / perf at the same time, load 5.4-7.3).

## 21:12-21:22 steady band wisps; far range probe
- The old plateMistWisp = 0.55 + 0.9 vnoise (28 m, 0.34 m/s) runs -0.35..1.45 (py/wispval.py, engine-noise port): NEGATIVE mixes
  darkened the iceberg (berg face 108-135 luma over time) and whole regions breathed. New (ATMOS_STEADY_WISP, defined in the shared
  GLSL_PLATE_MIST chunk at module load from the URL, so the plate AND the water get it and the band stays continuous): same mean,
  0.55 + 0.3 fbm2 (~11 m wisps, +-0.22, wind 0.44 m/s -x). caps/stab1 vs old (range over t 10..1800, luma): berg face 9.1 (old
  27.1; F000 132.8, engine 122-131), dark ridge 9.1 (23.8), massif low 5.3 (15.8), far floes R 1.7 (9.5), far range 17.9 (25.7; the
  rest of it is clouds passing behind the range's horizon). Bases keep the bank's designed range (ref's own 123-163 etc.).
- Far range +11 vs F000 (194 vs 183) at the F000 cloud layout: gating the slope haze beyond 180-230 m changed it by -1 only
  (caps/far1) -> reverted (not the cause; the v7 Blender plates' far range is paler than the video; a region grade would be an
  invented mask -> left open).

## 21:22-21:30 flicker + sweep
- Flicker (caps/flick1: 20 consecutive 1/30 s frames at t 30, rings pinned): sky 1st diff p99.9 2.0, 2nd diff mean 1.29 (the post
  chain's dither floor); left bases x < 430: 1st p99.9 2.0, 2nd mean 1.28; right far: 2nd p99.9 5.0. The larger values in the
  left box sit at x 440-520 = the shards. No mist / cloud flicker.
- MAIN shoot_sweep on :5176 (caps/sweep1/sweep.jpg + sw_hold_L / sw_rel_TR at full size looked at): no page errors, 34 frames,
  clouds in every frame, base mist / hold bank as expected, no black frames, doubles or bands.

## 21:24-21:30 hand-off draft, typecheck
- LANE/HANDOFF.md written (sections 1-6; section 5 = perf / tiers pending).
- tsc -p tsconfig.hero.json 0 errors; tsc -p . 0 errors.
- Extreme pointer skies (an/ptr_top_sky.jpg, top-left / top-right): natural clouds, no card edges.
- Perf batch relaunched 21:23 (tools/perf_batch.zsh, monitor on perf/runs_T1.txt); slots held by rings / water perf runs.
- Next: perf numbers -> tier / path sanity (tools/tier_batch.zsh: T0, T2, env=projected, envlake=mirror, phone 390x844) ->
  paired frame cost (perf_pair, misty forced) -> finalize HANDOFF, stop the lab.

## 21:23-21:42 perf_probe A/B (perf/runs_T1.txt, py/perfsum.py)
- 6 interleaved pairs lane :5176 vs MAIN :5173, T1 scale 1, SLOT_BG=0, load 2.7-5.6 at each start; the rings and water lanes
  ran perf / sweeps on the GPU at the same time (fps 18-34, far below vsync: contended).
- rest: fps median lane 23.1 / main 26.1 (0.889), per-pair ratio median 1.026 [0.55 1.01 1.12 1.04 0.69 1.04];
  hold: 21.4 / 23.0 (0.928), per-pair 0.972 [0.60 1.16 0.99 1.33 0.96 0.76]; collapse 26.0 / 27.6 (0.944), per-pair 0.981.
  Worst frame median lane / main: rest 75.0 / 66.7, hold 83.4 / 75.0, collapse 66.8 / 58.4 ms; max 83.4 / 83.4, 100 / 83.4,
  83.3 / 83.3. Inconclusive under contention -> paired synchronous cost next (tools/pair_batch.zsh, perf/pair.txt).

## 16 Nov 02:20 resume (attempt 2)
- Previous attempt cut at ~21:54 (workflow failure) after the paired perf batch (perf/pair.txt). MAIN app + public/hero == BASE (diff -rq: none), so :5173 still = BASE.
- Lab :5176 restarted (pid 78470). Remaining: perf hold pair at load < 6 + interleaved perf_probe pairs, tier batch, LIGHT AND GRADE (task 3: sky tone, far range, berg), final HANDOFF.
- 02:25 perf state from attempt 1 (perf/pair.txt, ENV lane's synchronous perf_pair, 15 x 12 frames, MAIN A vs lane B, T1 scale 1):
  calibration (lane ?atmos=r10 vs MAIN, same code) B/A 0.951 [0.80-1.26] = the method's noise; rest live 1.024; rest misty
  (bank forced) 1.037; hold live 1.079 (started at load 6.8, > 6: to redo). perf_probe 6 pairs (runs_T1.txt) contended.
- 02:27 tier batch (tools/tier_batch.zsh -> caps/tier_*): T0, T2, T1 ?env=projected, T1 ?envlake=mirror, phone 390x844: no page
  errors, no console errors / warnings (shader compile included); an/g/tier_sheet.jpg, an/g/tier_phone.jpg looked at: clouds,
  mist, hold on every path; portrait sky has clouds.
- 02:30 GRADE audit (task 3). Raw v7 rest plate through Blender's own AgX (py/plate_agx.py, OCIO with Blender's config;
  an/g/f000_vs_plateagx.jpg): NOT F000-faithful by itself (whiter mountains, no clouds, flatter sky) -> the engine's grade chain is
  needed; no "drop the chain" shortcut.
- Region stats (py/regions2.py, an/g/c1_regions.json; lane caps/grade0 at t 404.76 = F000 cloud layout, bank forced clear, puff
  age 1.2 | MAIN caps/grade0b t 3.3 / 10): lane vs F000 / MAIN vs F000: dark_ridge B -10 / -19.5; ridge_foot +18 / +20;
  left_shore +6.4 / +13; foothills +9.3 / +13.5; massif +3.2 / +2; massif_lo -8.8 / -13.3; far_right_range +13 / +18;
  far_range_R +11 / +18; mound +3.3 / +5.4; far_floes_right +1.4 / +5.7; sky_left +2.6 / +2.4; sky_mid -4.2 / -3.2; sky_right
  +3.5 / +3.4; corner_TL +4.3 / +4.4; corner_TR -1.9 / +6.0. WORSE than MAIN: right_iceberg -14.9 / -8.9 and berg_face -15.4 / -7.4
  (the steady wisp holds the berg's fog at the field's mean; the old field happened to be high there at t 3-10: the berg grade
  x0.82 / x1.5 chroma was tuned with that), summit +32 / +19 (cloud card position at the capture instant, not the grade:
  the same with the puff off). Next: re-fit the berg grade to F000 under the steady wisp (ATMOS_GRADE switch), then the ridge.
- 02:40 AgX check (py/agx_cmp.py, py/agx_cmp2.py): the engine's AgX (three's polynomial) vs Blender's LUT (OCIO): mids/highs
  within +-5, deep shadows (lin < 0.02) up to -15 darker (the old "crushed blacks" the toe lift compensates); vs 5.2's sRGB-display
  AgX (LUT read as Rec.1886 -> piecewise sRGB) the engine is +5..+14 brighter. The reference was rendered in 4.4 (LUT direct).
  Global tone-mapper swap = every region retuned: NOT done (drift risk); reported.
- 02:45 ATMOS_GRADE (switch ?atmosgrade=0, also off with ?atmosmist=0 / ?atmos=r10): uniforms uAtmosGrade (berg chroma, gain;
  ridge chroma) + uAtmosRidgeTint, defaults = the integrated constants (v0 == previous capture exactly, caps/fit1). Fit (caps/fit1,
  linear model per channel from v1 / v3 / v4, least squares vs F000 berg_face): berg chroma 1.064, gain 1.159 (was 1.5 / 0.82);
  ridge: chroma kept 1.0, tint (0.83, 1.0, 0.98) (was 0.65 / (0.8, 0.86, 0.9)). caps/fit2 f1: berg_face 115.8/140.3/170.2 vs F000
  116.6/139.9/171.2 (was -15.4 max), dark_ridge 67.5/90.6/124.1 vs 67.1/91.3/124.0 (was B -10), right_iceberg -3.9 (was -15);
  side effects: far_shore_mid +7.6 (was +6.2), ridge_foot G +14.6 (was +8.6) -> the ridge re-fit is applied on the body only
  (ridgeUp), the foot keeps the integrated slate. Crops an/g/berg_F000_v0_f1.jpg, an/g/ridge_F000_v0_f1.jpg looked at: closer to F000.
- 02:50 far range: with the cloud cards hidden (caps/fit3) far_range_R +5 (G) vs +11 with them: card 4 (cloud_b, 140 m, y -3.6..19.7)
  veils the far-right range (180-230 m) at every layout near F000; F000 shows the range unveiled (172/184/208 = the engine
  without clouds). Our v7 range sits behind the card; the artist's must sit in front of it.
- 02:55 tried pushing card 4 behind the far range (scaled about the rest camera to 265 m, same rest footprint, switch
  ?atmoscloudz=0): far_range_R unchanged (+10.5). Per-card hide test (caps/hide): card 4 alone veils far_range_R +9.6/+5.4/+1.4.
  CPU raycast (tools/raycast.mjs): the far-right range at y 355-375 is NOT geometry, it is painted on BG001 (hit at 359 m,
  dist 388-396); Object_2010 (a range mesh) only at y >= 380 (247-283 m). A card can not sit behind a range painted on the sky
  card, and a partial push (between 247 and 283 m) would draw patchy veil edges -> REVERTED (code removed). Open item for the
  env bake: give the far-right range real geometry (or BG001 an occluder mask) so the low right card sets behind it as in F000.
- 02:57 ATMOS_GRADE final: berg 1.064 / 1.159, ridge body chroma 1.0 tint (0.83, 1.0, 0.98), foot keeps the integrated slate.
  caps/fit4 g2_clear vs F000: dark_ridge 67.6/90.3/123.7 (-1.0), berg_face 115.8/140.3/170.2 (-0.9), right_iceberg -4.8
  (shards in the box), ridge_foot +17.6 (was +18.1), far_shore_mid +7.6 (was +6.2); every other box unchanged.
- 03:05 orbit views with the grade (caps/fit4 g2_ptrL/R/TR/BR, an/g/ptr_g2_sheet.jpg, an/g/ptr_g2_zoom.jpg looked at): berg and
  ridge natural from the pointer extremes, no mask edge at the ridge's foot transition or the berg's region.
- 03:07 way back: lane ?atmos=r10 vs MAIN (caps/wb_lane2 vs caps/wb_main, py/wbdiff.py): q00 0.452, q03 0.225, q00@1800 0.149,
  ptrL 0.140, ptrTR 0.332, all max 1, 0 px > 2 (MAIN vs MAIN 0.10-0.49); p06 2.54: the diff map (an/g/wb_p06_check.jpg) is only
  the shards (their hold orbit is not deterministic across runs) + a faint orb trace. ?atmosgrade=0 vs the pre-grade lane at the
  same state (caps/wb_grade0 vs caps/grade0): 0.464 mean, max 1, 0 px > 2 outside the hero zone.
- 03:08 perf: tools/perf_batch.zsh (6 interleaved perf_probe pairs, SLOT_BG=0, load < 6) then tools/pair_batch.zsh, chained in
  the background (tools/perf_all.zsh) -> perf/runs_T1_v2.txt, perf/pair_v2.txt.
- 03:15 typecheck: tsc -p tsconfig.hero.json 0, tsc -p . 0. HANDOFF sections 2.4 (grade), 3 (switch), 4 (tiers, way back), 6 (open
  items: far range painted on BG001, clear-state baked base mist, AgX approximation, summit card tip) written; section 5 = perf.
- Self-review vs "no improvisation": the cloud cards' UV boil (vnoise turbulence +-0.004 uv, from the integrated build) is not in
  the reference (rigid PNG cards: per-4-frame shifts constant to +-0.2 px) -> to switch off under CLOUD_R11 after the perf batch
  (the edit would rebuild the lab mid-measurement). The conveyor's uniform 7.1 px/s vs the reference's per-card 6.3-7.8 px/s
  (world wind / depth) is a deliberate simplification for one seamless global period with constant cover: noted in HANDOFF.
- 02:58 per-card world-speed drift checked (py/cloudsim3.py, 3 h every 5 s, same 9 cards / wrap): screen rates 5.2-7.6 px/s
  (0.43 m/s / depth) give sky cover / F000 min 0.46, p5 0.67, p10 0.72, median 0.93 (cards bunch and open long gaps) vs the rigid
  conveyor's min 0.87, p5 0.89, p10 0.92, median 1.00 -> the rigid conveyor stays (the user's "always naturally there" wins).
- 03:22 perf (final code before the boil edit). perf_probe 6 interleaved pairs (perf/runs_T1_v2.txt, py/perfsum.py), T1 scale 1,
  SLOT_BG=0, every run started at load < 6 (4-5.7), GPU shared with the rings / water lanes (18-30 fps): fps median lane / main
  rest 29.2 / 19.6 (per-pair ratio median 1.435), hold 23.5 / 17.7 (1.133), collapse 29.9 / 24.0 (1.072); worst frame median
  rest 58.4 / 66.8 ms, hold 66.7 / 83.3, collapse 50.1 / 58.4; max 83.3 / 83.4, 100.0 / 100.1, 83.4 / 100.1. Lane never slower,
  but the contention swamps the method (MAIN 17-24 fps).
  Paired synchronous cost (perf/pair_v2.txt, 15 reps x 12 frames, B = lane, A = MAIN): calibration (lane ?atmos=r10) 0.971,
  rest live 1.131, rest misty 1.070, hold 1.035. With attempt 1 (0.951 / 1.024 / 1.037 / 1.079): rest ~+7-13 %, hold ~+4-8 %,
  normalised by the calibration ~+10 % -> at the budget's edge. The added ALU (one extra vnoise per env / water fragment, ~8 in
  the bank's box) predicts < 1 %: suspect register pressure / occupancy of the bigger PLATE_FRAG, or noise. Next: ablation pairs.
- 03:25 CLOUD_R11 now also drops the cards' UV boil (integrated `vnoise` turbulence +-0.004 uv: the reference's PNG cards do not
  change shape); `?atmosclouds=0` restores it with the old drift. Typecheck 0. Ablation pairs launched (tools/pair_ablate.zsh ->
  perf/pair_ablate.txt: calib, full, ?atmosmist=0, clouds+soft+wisp off, full2, calib2).

## 16 Nov 04:08 resume (attempt 3)
- Attempt 2 cut after 03:25 (the ablation batch it launched finished at 03:54: perf/pair_ablate.txt, ALLDONE). Lab :5176 still up
  (pid 78470, started by attempt 2: this lane's; stop it at the end). Slot in light mode (n 2, bg), lead holds one slot.
- Ablation (paired synchronous cost, 15 reps x 12 frames, A = MAIN, B = lane variant, rest, T1 scale 1; load 3.1-5.4):
  calib (?atmos=r10) 1.010, full 1.047, nomist 1.026, noclouds (clouds+soft+wisp off) 1.040, full2 1.094, calib2 1.060.
  Normalised by the bracketing calibrations: full / calib 1.037, full2 / calib2 1.032 -> the lane costs ~+3-4 % at rest (the
  mist ~+2 %, the clouds ~+1 %), inside the +10 % budget; the method's own spread is +-5 % (calib 1.010 vs 1.060).
- Remaining: verify the boil edit (03:25) visually + loop exactness; sky tone (task 3); light / glints audit; final verification
  set (idle to 30 min, pointer, sweep, way back, flicker, perf pairs); HANDOFF section 5; stop the lab.
- 04:15 boil edit verified (caps/boil1, py/loopchk.py): the loop is now exact in the sky: t vs t + 404.76 s with the handheld
  drift off (rig.reducedMotion) and the bank / puff pinned: sky band y 0-180 mean |d| 0.43 / 0.23 / 0.14, max 1 (dither) at
  t 30 / 1000 / 1404 (vs 5.4 mean, 32 max between unrelated times); the lake differs only by its ripples, the rest by the shards.
  g3_clear (no boil) vs f1_clouds (02:39, boil): sky mean 0.24, max 9 at cloud edges only; every env box identical (d 0.0);
  crop an/g/boil_cloudL.jpg looked at (same clouds). (fit4/g2_clear differs on the far range because it was taken during the
  card-4 push experiment, later reverted: an/g/boil_farR_zoom.jpg; the current build equals the pre-experiment f1 there.)
- 04:12-04:20 SKY TONE (task 3): open sky vs F000 (py/skyrows.py, py/skygrid.py, py/skyprof.py on caps/boil1/g3_clear): sides +2..+4
  luma (right edge up to +7), centre -1..-4; F000's sky is a little brighter in the middle and darker at the edges than ours.
  Within ~+-4 except where cloud positions differ -> NO sky correction (a spatial fit to one frame for <= 4 levels; the cause
  is the polynomial AgX + the v7 plate's flatter sky; reported).
- CLOUD LAYOUT vs F000 (py/cloudreg.py, py/cloudreg2.py, then the per-card model fit py/cardfit.py on caps/cards1 = each card
  alone + none, coordinate descent of (dx, dy) per card vs F000, sky err 6.62 -> 5.58): the engine's cards (the .blend's
  positions; forensics §4: every cloud action was emptied, so the .blend positions are wherever the drift left them) are off
  F000 by: card 0 (-1, -10) px, card 1 (-42, -7), card 2 (+9, -14), card 3 (-28, -10), card 4 (-1, -2), card 5 (-12, -5)
  (= the move the engine card needs). The env itself sits (-8, -2) px vs F000 (py/mtnreg2.py: massif summit, iceberg top/edge,
  far range; camera yaw ~0.27 deg, not this lane) -> referred to the mountains: (-9,-12) (-50,-9) (+1,-16) (-36,-12) (-9,-4) (-20,-7).
- FINDING: card 1 moved to F000 puts its lower-right lobe exactly on the summit's left flank where F000's "summit puff" is
  (an/g/cardfit_sheet.jpg; an/g/cloud1_reg.jpg). The artist's .blend has NO wisp volume (forensics: only the orb's volume, world
  mist off); the summit wisp was added by the team (prep_v2.py, 12 Nov: "soft summit wisp (ellipsoid on the left tip)") to fake
  F000's puff in plates rendered without the clouds. The reference's puff leaves as card 1 drifts left (Loop F0-F40 every 8 f:
  an/g/loop_summit_tile.jpg; State F000 / F036 / F082 / F160: an/g/state_summit_seq.jpg). So the wisp card (static, or the
  attempt-1 gusts every ~14 s) doubles the puff and its gust rhythm is invented -> plan: F000 card registration (relative to
  the mountains) at the end of the intro (t 3.4 s, F000 = the first rest frame), the wisp card off; switches ?atmoscloudfit=0
  (attempt-2 layout), ?atmoswisp=gust (attempt-1 gusts), ?atmoswisp=0 (integrated static card).
- 04:22 BUILT (typecheck 0): Atmos.ts CLOUD_F000_PX (the referred offsets above), CLOUD_F000_T 3.4 s (F000 layout = end of the
  intro, then every 404.76 s), cloudLane(verts, fitPx, phaseT) -> {depth, u0, left0, width, dy}, cloudShift -> (e - u0) * depth
  (identical to attempt 2 with fit null / phase 0); WispMode "lobe" (default: no wisp card; BAKED_WISP not compiled) | "gust"
  (?atmoswisp=gust) | "static" (?atmoswisp=0, ?atmos=r10); AtmosFlags.cloudFit (?atmoscloudfit=0). PlateEnvironment: wisp setup
  gated on mode, cloud lanes with the fit, uCloudShift.y = dy.
- 04:26 VERIFIED (caps/fit5): an/g/summit_F000_new_old.jpg (F000 | new t 3.4 | old): the left card's lobe now sits on the
  summit's left flank like F000's puff, summit tip and right ridge clear (old: the card covered the summit + the wisp card on
  top). Sequence t 3.4 / 4.4 / 5.4 / 6.4 / 7.4 / 8.4 / 10.4 / 14.4 (an/g/engine_summit_seq.jpg): the puff thins and slides off
  by ~7-8 s, the summit clear after; reference State F000 / F036 / F082 puff, F160+ clear; Loop gone by F40 (x3) = ~4 s:
  same behaviour, no invented gusts. Sky error vs F000 (py/skyerr.py, mean |d|, hero zone out): all sky 6.00 -> 5.27 (5.16
  live at t 3.4), left 9.44 -> 7.86, summit 13.97 -> 10.25 (9.27 live), top mid 3.28 -> 2.99, right 4.48 -> 4.30. Re-fit of
  the new layout (py/cardfit.py on caps/fit5): residuals (15,2) (1,-1) (13,0) (-10,4) (27,0) (0,0) px: the fit's own
  repeatability is ~+-7 px (card 4, low behind the berg / far range, +-20), so the registration is final at that precision.
  Cover over a period (py/cloudsim4.py): min 0.84 / p10 0.88 / median 0.98 / max 1.12 of the artist layout's (registered F000
  layout itself 0.949 of it) -> vs F000's own cover min 0.885, median 1.03; wrap still never on screen.
- 04:32 way back after the registration (caps/wb3_*): MAIN :5173 now carries the RINGS lane's merge (HeroEngine / HoldR11 /
  Rings / Shards differ from BASE: rings C / D idle, shard slow-mo), so the hero differs; with the ring column and its lake
  reflection masked (py/wbdiff2.py, x 360-1100 below y 100): ?atmos=r10 vs MAIN q00 0.486, q03 0.361, q00@1800 0.487, ptrL 0.265,
  ptrTR 0.052, all max 1, 0 px > 2 (MAIN vs MAIN 0.00-0.33, max 1). Diff maps an/g/wb3_maps.jpg: only rings + shards.
  ?atmoscloudfit=0 vs the pre-change g3_clear: sky max 1 (same layout). ?atmoswisp=gust (caps/wb3_gust, an/g/gust_switch.jpg):
  the attempt-1 puff on top of the lobe at 3.4-5 s, gone by 9 s.
- 04:36 zoom (an/g/summit_zoom_F000_t34.jpg, 3x, engine shifted by the env's (-8, -2) px): F000's summit puff and the engine's
  card-1 lobe at t 3.4 have the same place, size and shape, incl. the thin veil trailing down the flank -> confirmed: the puff
  is the left cloud card's lobe. F420 (hold, 14 s into State) shows the summit clear (the integrated static wisp card drew a
  puff there: wrong). Final capture batch running (tools/final_qc2.zsh -> caps/qc2, ptr2, sweep2, idle3, flick2).
- 04:40 final captures (attempt 3 build): shoot_qc all poses + ui (caps/qc2): no page / console errors; cmp_q00_rest (t ~9 s:
  mist rolling in, summit clear, clouds ~40 px left of F000), cmp_p06_sustain vs F420 (summit clear as F420; the integrated
  static wisp card drew a puff there), cmp_q03_eye looked at. shoot_pointer (caps/ptr2, 10 spots): no errors; an/g/ptr2_sheet.jpg
  and the top-left / top-right skies (an/g/ptr2_tops.jpg) looked at: clouds natural, no card edges or wrap, mist at the bases.
- 04:42 sweep (caps/sweep2, 34 frames, sweep.jpg + sw_hold_L / sw_rel_TR full size looked at): no errors; clouds in every frame,
  hold fog at the bases, summit clear. The long-idle batch came out BLACK: my idle_shots.mjs parsed "none" inside a pointer
  list as [NaN] and debug.pointer(NaN) left the camera NaN for the rest of the session (debug API robustness, not an engine
  path a visitor can reach). Tool fixed ("none" -> null); re-run chained before the perf batch (tools/perf_all3.zsh).
- 04:43 flicker (caps/flick2: 20 consecutive 1/30 s frames at t 30, tau pinned; py/flick.py, luma): 1st / 2nd temporal
  difference means sky 0.33 / 0.65, summit 0.34 / 0.66, left bases 0.33 / 0.65, right far 0.34 / 0.66, lake sides 0.36 / 0.67
  (p99.9 1.1-3.2 / 2.0-5.1) = the post chain's dither floor; attempt 1 (caps/flick1, with the boil) 0.39-0.41 / 0.73-0.75. No flicker.
- 04:44 region table (py/regions2.py, an/g/final_regions.json; F000 | old layout | registered | live t 3.4 with handheld + live
  bank): summit +30.5 -> +5.0 (+6.4 live), massif +3.7 -> +0.6, sky_right +3.7 -> +2.1, far_right_range +13.8 -> +12.5,
  far_range_R +12.7 -> +11.9; worse: sky_mid -4.2 -> -5.8 (the top cloud's place / the cards' -3 brightness), sky_low_R +2.9 ->
  -4.6 live (card 0's lower edge 12 px higher); full-frame |d| 14.05 -> 13.75 (13.31 live). Typecheck: tsconfig.hero 0, -p . 0.
- 04:46 long idle re-run (caps/idle3: t 3.4 / 60 / 300 / 600 / 1200 / 1800 s at pointer rest, (-0.98, 0), (0.98, 0.98),
  (0, -0.98); an/g/idle3_sheet.jpg and the two lowest-cover frames an/g/idle3_lowcover.jpg looked at): clouds in every frame,
  natural arrangements, no empty sky. Cover in the sky band above the rings (y < 190, full width; py/cover.py: near-neutral
  pixels) x F000: 0.74-1.10 over all 24 frames, rest view 0.78-0.95 (an/g/idle3_cover.txt). No errors. Perf batch running
  (tools/perf_all3.zsh -> perf/runs_T1_v3.txt, perf/pair_v3.txt).
- (04:48 note: the clock times of the entries since 04:12 were corrected to the real clock.) Perf batch waiting for load < 6
  (other lanes' captures: load 7-10).
- 04:52 perf chain restarted as tools/perf_all3b.zsh: it yields to OTHER lanes' timing runs (slot holders labelled perf / cost /
  pair; tools/quiet.zsh) as well as to load >= 6 (the water lane was running perf_probe at SLOT_BG=0 at 04:50: my captures
  would have skewed it). Order: tier sanity (T0, T2, projected, mirror, phone) -> perf_probe pairs 2-6 appended to
  perf/runs_T1_v3.txt (pair 1 done at 04:46) -> paired synchronous cost perf/pair_v3.txt (calib / rest / misty / calib hold /
  hold / rest2 / calib2).
- 04:58 tier sanity on the attempt-3 build (tools/tier_batch3.zsh -> caps/tier3_*: T0, T2, T1 ?env=projected, T1 ?envlake=mirror,
  phone 390 x 844; t 12, misty, hold p06): no page errors, no console errors / warnings (shader compiles incl. the baked
  variant without BAKED_WISP); an/g/tier3_sheet.jpg, an/g/tier3_phone.jpg looked at: clouds, mist and the hold on every path.
  Perf pairs 2-6 waiting for load < 6 (other lanes: load 12-13).
- 05:00 HANDOFF section 5 rewritten with every paired-cost session normalised by its own calibration (rest +7.7 / +16.5 / +3.7 /
  +3.2 %, misty +9.0 / +10.2 %, hold +13.5 (load 6.8) / +6.6 %): median rest +8 %, spread too wide for one session to decide;
  attempt-3 runs pending (load 8-13 from other lanes).
- 05:10 perf_probe pairs 1-4 (perf/runs_T1_v3.txt; lane :5176 vs MAIN :5173, which now = BASE + the RINGS merge): rest fps
  median 26.8 / 31.8 (per-pair 1.10 0.76 0.89 0.83), hold 22.4 / 22.1 (~1.0), collapse 27.5 / 30.4; worst frame medians rest
  75.0 / 58.4 ms. Contended (fps 22-32 at T1); the paired cost with its calibration (lane ?atmos=r10 = BASE vs MAIN) will
  separate this lane from MAIN's own change. Pairs 5-6 + the paired batch running.
- 05:20 the pair-4 MAIN perf_probe printed rest / hold / collapse and then hung in browser.close() for 12 min (Chrome already
  gone), holding a slot: killed it (my process; its numbers are complete). Pairs 5-6 then the paired batch continue
  (waiting for load < 6).
- 05:27 perf_probe 6 interleaved pairs done (perf/runs_T1_v3.txt, starts at load 4.0-6.0): fps median lane / MAIN rest 27.4 /
  31.6 (per-pair ratio median 0.910: 1.10 0.76 0.89 0.83 0.93 0.96), hold 22.4 / 22.5 (1.007), collapse 28.0 / 31.4 (0.896);
  worst frame median rest 66.7 / 58.4 ms, hold 83.4 / 83.3, collapse 58.3 / 50.1; max 83.4 / 83.4, 116.6 / 100.0, 83.4 / 66.7.
  MAIN = BASE + RINGS now: the paired batch's calibration (lane ?atmos=r10 = BASE vs MAIN) tells how much of the gap is MAIN's.
- 05:30 paired batch (perf/pair_v3.txt) so far: calib_rest 0.970, rest_live 0.991 -> +2.2 % vs its calibration.
- 05:38 rest_misty (bank forced misty everywhere: the mist's worst case) 1.031 -> +6.3 % vs calib_rest.
- 05:50 paired batch done (perf/pair_v3.txt, py/pairsum.py): calib_rest 0.970 / 1.045 (mean 1.007), rest_live 0.991 -> 0.984,
  rest_live2 0.965 -> 0.958, rest_misty 1.031 -> 1.023, calib_hold 1.022, hold_live 1.001 -> 0.979. The lane is inside the
  method's noise (-4 .. +2 %) at rest and in the hold, +2 .. +6 % with the bank fully misty: PASS (+10 % budget). HANDOFF
  section 5 written (attempt 2 sessions + attempt 3 perf_probe + paired).
- 05:55 DONE (attempt 3). Lab :5176 stopped (pid 78470, started by attempt 2 of this lane); :5173 / :3000 untouched and up.
  Changed vs BASE: retrux-web/app/hero/engine/world/Atmos.ts (new), world/PlateEnvironment.ts, HeroEngine.ts (1 line); public/
  unchanged; HANDOFF.md final (sections 1-6). Typecheck 0 / 0. Gates: clouds always there + seamless loop PASS, way back PASS,
  temporal PASS, errors none, perf PASS (paired: -4..+2 % live, +2..+6 % misty worst case), region means +-3: NOT all (sky_mid
  -5.8, corner TL +4.4, far range +12, baked base haze +6..+18, summit +5: causes and owners in HANDOFF section 6).

## 16 Nov 05:59 JUDGE round 1 (independent; outputs in WORK/judge1/, verdict draft WORK/judge1/verdict_draft.md)
- Read SPEC 0-3, AUTOPILOT, HANDOFF, LOG. No earlier judge1 attempt (judge1/ was empty). Plan: start lab :5176 (judge-owned),
  fresh captures via the slot: long idle (clock jumps + real-time sequences) at rest + pointer extremes, cloud loop / wrap,
  mist / fog live sequences vs reference videos, way back vs :5173, pointer / sweep / hold regression hunt, perf pairs.
- 06:40 judge1: captures so far (WORK/judge1/caps): idle (16 clock jumps 3.4 s..24 h x 9 pointer spots), mist (pinned clear / misty
  / live t 8..240, lane and ?atmos=r10), seq (roll-in 4..14 s, 3 s rest at 30 fps, pointer sweep, press-hold-release), seqD_r10.
  Clouds present in all 144 idle frames (sheets an/idle_*.jpg looked at). Cloud drift engine -7.2..-7.4 px/s; reference State
  static windows -8..-13 px/s (high-passed phase correlation, noisy), Loop -20..-24 px/s.
- 07:05 judge1: wrap test (caps/wrap: all 9 cards' first wrap +-0.05 s at L/R/TL/TR/BL/BR): sky diffs only rings / shards / ripples
  (an/wrap_*.jpg) -> no on-screen wrap. Loop: rest t3.4 vs t408.16 sky band 0.19 mean after the handheld-drift align. Way back
  ?atmos=r10 vs MAIN (ring column masked) 0.06-0.41 mean, max 1, 0 px > 2 (MAIN vs MAIN 0.0-0.49). Mist vs reference 1:1
  (an/mist_1to1_L090.jpg, an/mist_1to1_S210_S320.jpg): engine bank thin / flat vs the reference's dense billowy bank.
  Perf batch (tools/perf_batch.zsh -> perf/pairs.txt) queued, waits for load < 6.
- 07:05 judge1: tiers / phone / ultrawide (caps/tier_*): 0 errors, clouds everywhere, no wrap pops. Live 95 s (caps/live): fine.
  Typecheck 0 / 0; merge-file dry run onto MAIN 0 conflicts. Region stats (py/regions.py): bank amplitude at the plain +4.7
  (lane clear -> misty) vs reference +14..+20 (F000 -> L090 / S210 / S320); ridge foot +32 vs +16..+26; clear plain +12.5 vs
  F000. Far range veiled by low card 4 as it drifts (an/far_range_veil_1to1.jpg, t90 / t150). Perf calib1 0.990.
- 07:15 judge1: mist grid (misty - clear) lane vs ref: base amplitude matches (+21.6 vs +22.6), massif lower-mid veil missing
  (-4 vs -13 / -17), plain detail shows through (hp 1.80 vs ~1.0). Sweep lane + MAIN: no errors. Perf so far calib 0.990,
  rest 1.031, misty 1.030 (B lane / A lane ?atmos=r10). Waiting for hold / rev / calib2 / rest3.
- 07:17 judge1: reference Loop / State region series show the massif dimming far above the bank and the berg-foot mist coming
  and going (moving cloud shadows / veils); engine has no cloud shadows (plates rendered with the clouds hidden). Lane's hold
  background closer to F402 / F420 than r10. Perf: calib 0.990, rest 1.031, misty 1.030, hold 0.980.
- 07:22 judge1: cloud drift smooth sub-pixel (gradient LK on a shard-free box 560-900 x 80-200: -0.59 / -1.33 / -2.05 px at
  0.1 / 0.2 / 0.3 s, monotonic); perf rest2rev (A lane, B r10) 0.980 -> lane +2 %. Remaining calib2, rest3.
- 07:23 judge1: far-shore band lane vs r10 vs F000 (an/far_shore_band_lane_r10.jpg): no seam, no regression. Provisional verdict
  written (judge1/verdict_draft.md): FAIL, lens 7.6 (clouds PASS; mist / dynamic atmosphere MAJOR; far-range veil MINOR).
  Waiting: perf calib2 + rest3, then switch smoke tests (tools/sw_batch.zsh), then stop lab :5176 (pid 45469).
- 07:40 judge1 DONE. Perf pairs (judge1/perf/pairs.txt): calib 0.990 / 0.920, rest 1.031 / 1.045, reverse 0.980 (lane +2 %),
  misty 1.030, hold 0.980 -> ~+3 % PASS. Switch smoke tests 0 errors. Lab :5176 (pid 45469) stopped. VERDICT FAIL, lens 7.6:
  MAJOR = mist / atmosphere far less dense and dynamic than the reference (massif veil -4 vs -13..-19, plain detail shows
  through hp 1.80 vs ~1.0, right side and terrain light static, reference massif dims far above the bank: likely moving cloud
  shadows, verify in Blender); MINOR = low cards drift in front of the far range painted on BG001 (veil sweeps across it);
  nits: drift speed at the low end, QC q00 timing, out-of-lane summit / ridge tone. Everything in judge1/verdict_draft.md.

## 16 Nov FIX ROUND 1 (fixer; judge1 verdict FAIL 7.6)
- start: read SPEC 0-3, AUTOPILOT, HANDOFF, LOG, judge1/verdict_draft.md + the verdict JSON. No earlier fix attempt in LOG
  (fresh start). Plan: (1) reproduce each finding with the judge's tools / evidence; (2) MAJOR mist: measure the reference
  (massif veil, plain hp, berg-foot lobe, massif dimming) -> Blender test of the cards' shadows at two drift offsets before
  any cloud-shadow code; (3) MINOR far-range veil: crest occluder from BG001's painted silhouette; (4) nits: drift speed
  re-measure, QC phase-pinning tool copy; then re-run every FAIL check, way back, perf, typecheck.
- 07:50 F1(d) analytic pre-check (fx1/py/shadowfp.py: the rest plate's position map, the 6 cards' alpha along the sun ray
  (-0.83, 0.32, -0.46), cards at the .blend / F000 / +4 / +12 s): the cards' SHADOWS land only on the dark ridge (mostly
  unlit, N.L<0), the far shore line and a foothill strip, never on the massif's visible face (fx1/an/shadowfp.jpg). The cards
  are emissive (white x2, forensics 3.7) and card 1 hangs 2-9 m in front of the massif's lower-left face: their LIGHT on the
  terrain may be what moves. Next: the Blender test the judge asked for, broadened: v7 copy (fx1/blend/v7_cardtest.blend,
  APFS clone, never saved), rest camera 720x383, cards camera-invisible at .blend / F000 / F000+12 s, and hidden.
- 08:05 F1(d) BLENDER TEST DONE (fx1/bl_out/{none,blend,f000,t12}.exr, 720x383, 128 spp, Metal, 13-32 s each; fx1/py/bl_cardtest.py,
  analysis fx1/py/cardtest_an.py -> fx1/an/cardtest.jpg). AgX display luma at the judge's boxes, none / .blend / F000 / F000+12 s:
  massif_lm 114.9 / 151.5 / 142.5 / 128.4, massif_upL 146.3 / 175.1 / 171.7 / 163.1, massif_upR 168.8 / 183.6 / 180.0 / 175.0,
  base_big 112.9 / 124.6 / 122.8 / 120.4, plain 163.5 / 171.8 / 170.9 / 170.3, berg_foot 113.0-113.7 (no effect), far_range_L
  176.8 / 186.8 / 186.7 / 187.4. => the massif's dimming in the reference is the cards' EMISSION (white x2, double-sided) moving
  away, not their shadows (which never reach the massif). F000 -> +12 s: massif_lm -14.1 (ref S000->S320 -17.9, L000->L090
  -13.7), upL -8.6 (ref -10..-23). It also raises contrast (the gullies show): the reference's look; a veil would lower it.
  The plates / bake hold this light FROZEN at the .blend positions (blend vs none: massif +29..+37).
  The base / plain change (+22 ref) and the berg-foot band (ref 128.8 -> 104.7 -> 129.4) are NOT card light (Blender: -0.6..-2.4,
  berg foot +-0.1): real mist. Reproduced the judge's numbers on judge1/caps/mist (fx1/py/mistnum.py): base_big ref 138.1->160.8 /
  lane 140.9->162.6; base hp ref 0.97 / 1.13, lane 1.80; massif_lm ref -13.7 / -17.9, lane -4.0; berg_foot ref 128.8 / 104.7 /
  129.4 (L000/L090/L119), lane 127.5 static.
  PLAN: (1) moving card light (ratio on the bake: (E_base + E_cards(t)) / (E_base + E_cards(.blend)), analytic per-card light
  fields), calibrated on these renders; (2) denser bank (plain hp ~1.0) and the ridge foot not overshooting; (3) berg-foot band
  that comes and goes; (4) far-range crest occluder; (5) nits.

## 17 Nov 07:48 FIX ROUND 1, attempt 2 (resumed after the user's pause of 16 Nov 07:58)
- Attempt 1 of this fix (16 Nov 07:42-08:05) did the analysis above, then (not logged) fx1/py/cardlight_calib.py (analytic
  direct irradiance of the 6 emissive cards on the rest plate's surfaces), cardlight_fit.py (additive / ratio models), field_test.py
  (a precomputed card-light vector field), fx1/tools/jeval.mjs + q_meshes.js (engine mesh query); no source edits (LANE files
  unchanged since 16 Nov 04:29). Continuing from its PLAN. Lab :5176 started (pid in WORK/lab.pid, mine; stop at the end).
- 08:00 REFERENCE RE-MEASURED (fx1/py2/refseries.py, fx1/py2/loopstate.py; 8-bit luma, rest framing):
  * The Loop is NOT the State video at one time scale. L000 == S000 (sky mean |d| 0.26). The MIST, berg-foot and massif series of
    the Loop match the State's static windows at 4x (L050-L057 == S200-S228, L077-L082 == S306-S330: base_big 146 / 146, 159 / 158;
    berg_foot 125 / 123, 101 / 100; plain 186 / 186, 183 / 184), but the CLOUDS run 2.65x (Loop L120 -88 px, State S330 -92 px).
  * CLOUD SPEED (nit 3), long baselines from S000 (phase correlation, high-passed): S210 -60.0 / -56.3 px (C / R boxes), S228 -62.0 /
    -63.2, S330 -92.0 / -91.8 -> 8.36 px/s (7 s and 11 s baselines agree within +-0.3). Engine 7.1 (omega 0.0042) -> x1.17.
    Both boxes (cards at ~96 and ~116 m) move at the same SCREEN rate: the rigid conveyor is what the reference does.
  * BERG FOOT (finding 1c) comes and goes (fx1/an2/ref_bergfoot_loop.jpg looked at: a pale mist layer over the berg's lower face at
    L000 / L040 / L120, thinned at L075-L100 showing the dark ice): berg_foot 1060-1240 x 400-440 Loop 128.8 (L000) 115.0 (L015)
    139.1 (L035) 100.4 (L075) 129.9 (L120); berg_footL 1000-1100 x 405-440 153.7 / 118.7 (L020) / 156.5 (L045) / 106.1 (L085) / 140.7;
    State S000 128.7 -> S010 125.3, S202-S228 126.5 -> 114.3, S306-S330 100.0-100.8. In State time (4x): misty at t+0, thin at
    ~+2 s, misty ~+5 s, thinnest ~+10.5 s, back ~+16 s (quasi-period ~8 s, +-20 levels).
  * MASSIF: the dimming follows the MIST clock (Loop L080 == S320 mist: massif_lm 141.6 vs 137.6), but at equal CLOUD positions
    (L080 vs S205, both -57 px) it differs by 12 -> mist effect; at equal mist (L080 vs S320) the extra 31 px of cloud drift gives -4
    (massif_lm), -2.6 (upL), 0 (upR). Decomposition: card light ~ -6..-11 at massif_lm over the 11 s of S000-S330 (Blender, attempt
    1: -14 for 12 s at 7.1 px/s) + the bank's upper part ~ -7..-12 by S320 (and a brighter veil phase ~+3..+6 around S205).
    So BOTH the judge's hint (an upper steel-blue part of the bank over the massif's foot) and the card light are needed.
  * Crops looked at: fx1/an2/ref_massif_loop_state.jpg (L000 / L030 / L080 / L120 / S210 / S320): drifting haze layers across the
    massif's mid face (L030, S210), the face darker and more contrasty under the bank at L080 / S320.
- 08:20 card light over a full conveyor period (fx1/py2/cardlight_period.py: the analytic model, 9 cards on the conveyor at
  omega 0.0049, every 5 s; _an.py display deltas vs F000): massif lower-mid face -7.1 at t 10.4, -11.2 at 14.4, -15..-20 for most of
  the period, +16..+21 at t 295-315 (card 1 passes back over the face); upper-left -6..+3, upper-right +-3, dark ridge -9..+18,
  far field ~0. Equal-mist check vs the reference: model -3.7 / reference -4.0 (massif_lm, clouds -57 -> -88 px).
- 08:25-08:45 BUILT v1 (typecheck 0): Atmos.ts flags wind / cardLight / range / mist3 / berg (switches ?atmoswind=0,
  ?atmoscardlight=0, ?atmosrange=0, ?atmosmist3=0, ?atmosberg=0; all off under ?atmos=r10, the cloud ones under ?atmosclouds=0,
  the mist ones under ?atmosmist=0); CLOUD_OMEGA_FIX1 0.00495 (period 343.4 s); the card light (CPU field 32x16x24 per cloud
  image at load, Data3DTexture RGBA16F, per-vertex 18 taps, ratio on the raw texel, the mirror pass too, BG001 excluded);
  the range occluder (rest-plate skyline table fx1/an2/crest.npy from plate_rest.exr, cards deeper than 118 m, along the camera
  ray at ~250 m); mist3 (dense core, veil above the top, ridge excluded); the berg envelope (13 reference knots every 1.33 s, then
  1D noise, in plateMistWisp: plate + water).
- 08:45 calibration captures (caps/cal1 new, caps/cal1_j1 = all fix switches off, caps/cal1_nocl; py2/mistnum2.py):
  * card light (pinned clear): massif_lm vs F000 -3.9 at t 10.4, -5.5 at 14.1, -7.3 at 30 = ~0.5x the model's display deltas;
    with the bake's .blend positions as the zero the massif was -4.2 at F000 -> zero changed to the F000 layout (t 3.4).
  * the live series vs the reference (State / Loop at 4x, t = 3.4 + s): bank rolled in too early and too bright (base_big 170 at
    t 8.7-14 vs 145-158; ridge foot 154 vs 94-116), the veil covered the dark ridge body (+29), veil brightened massif_lm (+2.3);
    base hp misty 1.30-1.35 (ref 0.97-1.13; attempt 3 1.84-1.90). Berg foot follows the reference's shape: 126 / 119 / 129 / 131 /
    122 / 114 / 109 / 106 / 109 / 115 / 124 / 126 vs 129 / 117 / 135 / 139 / 123 / 114 / 104 / 100 / 105 / 112 / 125 / 130.
  * far_range_R at F000 190.6 (attempt 3 194.6, F000 184.6; no-card env +5.6 = the bake itself).
- 08:50 v2 edits: card-light zero = all cards at their t 3.4 places (18 slots); mist time offset 805.5 -> 800.0 (fx1/py2/mistfit.py:
  base 0 / 0.30 / 0.74 / 0.94 / 1 at t 7.4 / 10.4 / 12.1 / 13.4 / 14.1 vs reference 0.05 / 0.33 / 0.63 / 0.85 / 0.86; ridge foot
  0.13 / 0.44 / 0.88 at 12.1 / 13.4 / 15.4 vs 0.12 / 0.50 / 0.87; 2 h stats unchanged); core + veil excluded from the dark ridge.
  Next: tune kappa (~2.2), veil colour (darker), bank colour, berg gain; then the far-range check at t 90 / 150.
- (clock note: the entries "08:20-08:50" above were written ahead of the real clock; real times run ~08:00-08:30.)
- 08:30-08:45 tune1 / tune2 / ver1 / ver2 (runtime uniforms, caps/tune1, tune2, ver1, ver2; py2/mistnum2.py):
  * kappa: 0.97 -> massif_lm -5.3 at t 14.1; 2.2 -> -12.1 (model -11.2), equal-mist pair -3.4 (reference -4.0): CARD_KAPPA 2.2.
  * bank: Hi (0.50, 0.63, 0.90) -> full-bank base 160 (ref 158-161), hp 1.27-1.43 (ref 0.97-1.13; attempt 3 1.80-1.90).
  * the dark "thick" upper colour drew a flat grey band (looked at: an2/ver1_mist_1to1.jpg) -> wrong: the reference's bank is
    WHITE; profile of rows through x 180-360 (S000 / S320): the darker band is the FACE above the bank (rows 320-370, -20..-25,
    of which the card light gives -13..-16), and the reference's bank ends at rows 375-380 = 2.7-3.3 m (position map), not 7.5 m.
    -> bank up colour light (0.37, 0.47, 0.67), top at the massif's foot 3.2 m, a multiplicative shaded band above a thick bank
    (x0.89), the bright thin veil only while the bank rolls in / out (4 env (1 - env)).
  * berg layer weighted by smoothstep(0.6, 1, env): F000 134.9 (ref 128.7), thick 152 (139): still strong -> lower amount next.
  * case-insensitive FS: "L_t14.1.png" overwrote "l_t14.1.png" in caps/ver1 (pointer vs live): ver1's t14.1 / t90 rows are the
    pointer-L frames; names now unique.
- 08:45-08:55 ver3 / ver4 (caps/ver3, caps/ver4): bank top at the massif's foot 3.2 m + shaded band x0.84 + bright veil amount 1.0,
  core depth 1.5 m, lee 0.6, puff colour 0.95 + 0.1: rows through x 180-360, S320 vs t 14.1: 320-330 128 / 137, 330-340 125 / 132,
  340-350 127 / 132, 360-370 137 / 138, 370-380 149 / 147, 380-390 161 / 161, 390-400 170 / 171, 400-410 175 / 176 (bank matches,
  the dark band 5-9 short); time-aligned massif_lm F000 -> t 14.1 -12.6 (ref -17.9), -> t 15.4 -13.7 (ref L090 -13.7); base
  hp at full 1.13-1.27 (ref 0.97-1.13); base 161-163 (ref 158-161); berg foot within +-6 of the reference at every time; 1:1 crops
  looked at (an2/ver4_mist_1to1.jpg): a white bank hiding the plain with the face above it darker, as S320.
- far range (an2/ver4_farrange.jpg, an2/ver4_crest_zoom.jpg looked at): at t 90 / 150 the range left of the iceberg is unveiled
  (the card behind it); judge1's t 90 had it washed out. A faint blue rim along the crest where the card was cut at / above the
  skyline (pointer TR worst) -> the card now fades out 2-6 px below the skyline.
- 08:55-09:05 final captures (caps/fin1, wb_lane_r10, wb_main, tier_*, sw_*, loop; one slot batch, tools/fin_batch.zsh):
  * 0 page / console errors in every run (default, T0, T2, phone 390x844, 2560x1080, each new switch and all five together).
  * way back: lane ?atmos=r10 vs MAIN :5173, ring column masked (judge1 py/wbdiff.py): mean 0.13-0.49, max 1, 0 px > 2.
  * crest: an2/fin_crest_zoom.jpg looked at (t 90, t 150, pointer TR t 90, R t 150): the range left of the iceberg unveiled, no rim.
  * press / hold / release (seqH, real mouse, 0.067 s steps; an2/fin_seqH.jpg looked at): bank -> hold fog -> bank, no atmosphere
    pops; region steps only where the camera moves (press, release).
  * long idle (t 600 / 1800 / 3600 / 86400, TL / BR at 1800; an2/fin_idle.jpg looked at): clouds everywhere, bank varies, no artefacts.
  * loop exact at the new period 343.434 s: sky band (y < 180) t 30 vs 373.434 mean 0.18 max 1, t 1000 vs 1343.434 mean 0.04 max 1
    (the card light is periodic with the cards). Engine drift t 3.4 -> 13.4: -83.1 / -84.2 px = 8.31 / 8.42 px/s (reference 8.36).
- 09:05 typecheck hero 0 / app 0; git merge-file (PlateEnvironment.ts, HeroEngine.ts onto MAIN, BASE ancestor): 0 conflicts
  (fx1/merge). Card-light field build in node (esbuild bundle of Atmos.ts, fx1/bench): 20 ms cold, 8 ms warm (both images).
  Tiers / phone / switches looked at (an2/fin_tiers.jpg, an2/fin_phone.jpg): clouds and bank on every path.
- 09:05 HANDOFF "Fix round 1" written (F1-F6; F5 perf pending). Perf batch (tools/perf_fx.zsh -> perf/pairs.txt: calib,
  lane vs judge1-equivalent (the five fix switches off), lane vs r10, misty, hold, reverse, calib2) waiting for slots (the rings
  judge3 holds all three) and load < 6.
- NEXT: perf numbers -> HANDOFF F5; check that the five switches off reproduce judge1's own captures (judge1/plans/mist.json vs
  judge1/caps/mist); stop lab :5176.

## 17 Nov 20:13 FIX ROUND 1, attempt 3 (resumed after the user's pause of 17 Nov 08:52; "lanjutt" 20:12)
- State found: attempt 2 had built + verified F1-F4 (LANE Atmos.ts 08:48, PlateEnvironment.ts 08:50; HeroEngine.ts unchanged this
  round); its perf batch (fx1/tools/perf_fx.zsh) started 09:02 but the lab :5176 (pid 59321) was stopped by the pause at ~09:05, so
  every pair failed with ERR_CONNECTION_REFUSED (fx1/perf/pairs.txt has NO numbers). Lab not running now (pid 59321 gone).
- Plan: typecheck; restart lab :5176 (mine); re-verify the key claims with my own eyes (1:1 mist crops, far range at t 90 / 150,
  the judge's FAIL checks with the judge's own plan judge1/plans/mist.json + regions); switches-off == judge1 lane; perf pairs;
  HANDOFF F5 + LOG; stop the lab.
- 20:25 typecheck hero 0 / app 0 (unchanged source). Lab :5176 started (pid 56495, mine). Batch a3_batch1 (slot, 3 min): judge1's own
  mist plan on the lane (fx1/caps/a3_mist), the same with the five fix switches off (fx1/caps/a3_mist_off), the attempt-2 ver4
  plan (fx1/caps/a3_ver); 0 page / console errors.
- Switches off == judge1's lane: a3_mist_off vs judge1/caps/mist (judge1 py/wbdiff.py, ring column masked; fx1/an2/a3_off_vs_judge1.txt):
  33 / 39 frames mean 0.04-0.50 max 1, 0 px > 2; 6 frames have 300-830 px > 2 outside the mask = shards (diff maps
  fx1/an2/a3_off_dm_Rclear30.jpg, a3_off_dm_rest45.jpg looked at: only rings, shards and ripples differ; they run on their own
  clocks, not state.time). Sky, clouds, mist, terrain identical.
- 20:30 re-checked judge1's FAIL items on fresh captures (fx1/caps/a3_mist = judge1's plan, a3_ver = time-aligned):
  * far range: at t 75 / 90 / 120 / 150 the range left of the iceberg is no longer veiled by the low card (2x crops
    fx1/an2/a3_range_zoom.jpg, a3_range_t34.jpg looked at; ?atmosrange=0 and judge1's t90 still show the veil); no crest rim. The
    remaining offset (the range paler than F000's grey shaded faces at EVERY time, also t 8) is the bake: far_range_R 190.7-191.7
    (t 3.4-19.4, handheld off), 188.2 / 188.9 (t 90 / 150) vs F000 184.6 (judge1 196.5 at every layout). Boxes near the rings
    (far_rangeL2) are polluted by the ring pose (own clock) -> not used.
  * mist, judge1's pinned metric at t30 (clear -> misty): base +25.2 (ref +22.6), hp 3.34 -> 1.19 (ref 0.97-1.13), massif_lm
    136.5 -> 136.2 (ref -13.7 / -17.9 time-aligned; the bank alone here contributes ~0: the card light carries the time part).
  * LOOK (fx1/an2/a3_mist_1to1.jpg, a3_loop_vs_eng.jpg, a3_band_2x.jpg, a3_eng_fogtop.jpg vs a3_ref_fogtop.jpg, a3_ref_loopseq.jpg
    looked at): the reference's fog is a tall, soft, rolling mass whose top rises and falls; ours is a flat band at the horizon
    line (its top 2.4-3.2 m ~ the camera's 2.9 m height, so it never rises on screen) with a dark stripe above it at x 360-540.
    Row profiles (fx1/py3/rowprof.py -> fx1/an2/a3_rowprof.txt, a3_ref_rowprof.txt) + the rest plate's position map
    (fx1/py3/rowpos.py -> a3_rowpos.txt): reference fog top at x 360-540 (world x -23..-14, z -96): ~3.3 m at S200-S230 / L045
    (face above dark), ~7.3 m at S300-S330 / L075 / L090 (rows 320-440 all 176-189), thin at L105 / L120; at x 180-360 (x -31..-25,
    z -91): ~3.1 m at S300-S330, ~5.2 m at L105 / L120. Engine t 14.1 at x 360-540 rows 350-390: 158-171 vs S320 178-183 (-20).
- 20:45 BUILT ATMOS_SWELL (switch ?atmosswell=0, rides on mist3): the bank's top at the massif's foot (z < -84) swells by
  0..5.8 m (2-oct fbm, 20 m cells, 0.7 m/s towards -x, 0.12 cells/s), capped at 8.1 m (the reference's max 7.6 m visible + 0.5);
  fitted to the two bands' tops at t 9.4..19.4 (fx1/py3/swellfit.py -> swellfit2.py -> swellfit3.py: the first fits used one
  point per band and put an 8 m top next to the rings at t 9-15, so the final fit samples 4 points across each band). First
  version (4.6 / 1.0 / 20 / 0.08, offset 840; caps a3_sw1 vs a3_sw1_off, fx1/an2/a3_sw1_fogtop.jpg looked at): at t 14.1 the fog
  rises over the massif's right foot like S320; x 360-540 rows 330-400 184/182/181/176/176/178/182 vs S320 178/180/181/183/180/
  179/182 (no swell 183/177/171/163/158/170/181). Re-fitted (multi-point) -> 5.8 / 0.7 / 20 / 0.12, offset 2676. Typecheck 0.
  Next: captures of the re-fit (time series to t 600, pointer views, hold), profiles, judge boxes, then perf.
- 20:55 swell re-fit #2 (fx1/py3/swellfit3.py, 4 points per band; 5.8 / 0.7 / 20 / 0.12, offset 2676, cap 8.1; caps a3_sw2,
  fx1/an2/a3_sw2_fogtop.jpg looked at): R band rows 310-340 at t 14.1 came out +11..+16 too BRIGHT vs S320: the reference's rows
  310-340 at x 360-540 in S320 / S330 are the dark band ABOVE the fog (darker than S000), not fog. Re-read every frame's visible
  top as the highest rows not darker than S000 (comment in fx1/py3/swellfit4.py): x 360-540 3.3 m (S180-S240) -> 4.5-5.3 m
  (S300-S360) -> thin (L105 / L120); x 180-360 2.2-3.0 m until S360 -> 5.0-5.5 m (L105 / L120).
- 21:05 swell re-fit #3 (swellfit4.py): 3.5 m / 1.0 m/s / 30 m / 0.12, offset 1688, smoothstep(-0.15, 0.3), cap 6.0 m. Band means
  R 3.8 3.8 3.9 4.2 4.4 5.5 5.4 5.4 5.4 5.5 4.9 vs targets 3.8 3.8 3.8 3.9 3.9 5.0 5.5 5.8 5.2 5.2 4.9; L ... 3.7 x5, 5.1, 6.0 vs
  ... 2.7-3.5, 5.5, 6.0. 2 h: p10 2.8 / p50 4.2 m, > 5 m ~40 %, rate p95 1.1 m/s. Caps a3_sw3 (fx1/an2/a3_sw3_fogtop.jpg looked
  at: fog climbs the massif's right foot at t 14.1-15.4 like S320 / S330 / L090, rises at the left at t 17.4-19.4 like L105 / L120).
  Row profiles (fx1/an2/a3_sw3_rowprof.txt): x 360-540 t 14.1 vs S320 rows 300-400 within -9..+9 (no swell: -25..+5); x 180-360
  t 19.4 vs L120 rows 330-380 -9..+1 (no swell -16..-33). Boxes (a3_sw3_boxes.txt): massif_lm L120 151.7 vs 148.8 (no swell 137.8).
- 21:10 shade band strength (uAtmosVeil2.y) runtime test 0.16 / 0.20 / 0.24 / 0.28 (caps a3_sh1, fx1/an2/a3_shade_2x.jpg looked at):
  massif_lm delta from F000 at t 14.1 / 14.4 / 15.4 / 17.4 / 19.4: 0.16 -12.6 / -13.3 / -13.9 / -11.5 / -4.9, 0.20 -14.0 / -14.6 /
  -15.3 / -13.0 / -6.0, 0.24 -15.4 / -16.1 / -16.7 / -14.4 / -7.0 vs ref -17.9 / -18.4 / -13.7 / -10.5 / -3.8 -> 0.20 (least squares
  of the deltas), only with the swell (ATMOS_SHADE_SWELL; ?atmosswell=0 keeps 0.16). Typecheck 0.
  Next: final captures (series, seq through the rise, pointer, long idle, hold, tiers, switches, way back), then perf.
- 21:15 FINAL CAPTURES of the swell build (all through the slot, 0 page / console errors in every run):
  * series + pointer + 15 fps rise sequence (fx1/caps/a3_fin_series, plan tools/sw3.json): seqS t 11.4 -> 13.4 (fx1/an2/a3_seqS.jpg
    looked at: the fog climbs the massif's right foot smoothly); shard-free boxes 300-440 x 320-430 / 180-360 x 300-420: step
    mean |d| 0.32-0.65 per 1/15 s, p99 <= 2.0, 2nd difference max 0.96 / 0.97 (no pop; fx1/an2/a3_seqS_tdiff.txt).
  * pointer L / R / TL / BR at t 14.1, BL at 19.4 (fx1/an2/a3_fin_ptr.jpg looked at): soft fog at the bases, no box edges.
  * long idle t 300 / 600 / 1800 / 3600 / 86400, TL 1800, BR + misty 86400 (fx1/caps/a3_fin3, an2/a3_fin_idle.jpg looked at):
    clouds and bank everywhere, no artefacts at 24 h.
  * press / hold / release, real mouse, misty bank (a3_fin3/seqH, an2/a3_fin_seqH.jpg looked at; judge1 py/series.py ->
    an2/a3_seqH_series.txt): steps only where the camera moves (f8->9 dolly start, f47->48 release), same frames and sizes as
    attempt 2's fin1/seqH (left base +30.1 vs +25.4 at the dolly start: the taller rest bank), sky / far right identical.
  * T0, T2, phone 390x844, 2560x1080 (a3_tier_*, an2/a3_fin_tiers.jpg, a3_fin_phone.jpg looked at): render, bank + clouds, hold OK.
  * ?atmosswell=0 == attempt 2 (fx1/caps/a3_swoff_ver4 vs a3_ver, same plan; an2/a3_swoff_vs_attempt2.txt): masked mean 0.02-0.51,
    max 1-3; the frames with px > 2 are shards / rings / ripples (own clocks; an2/a3_swoff_dm_pBR90.jpg looked at).
  * way back ?atmos=r10 vs MAIN :5173 (judge1 plan wb.json; an2/a3_wayback.txt): mean 0.05-0.36, max 1 in 4 / 6 frames; L t100 and TR
    t100 have 291 / 416 px > 2 = MAIN's merged rings / shards (an2/a3_wb_dm.jpg looked at).
  * five switches off == judge1's lane (20:25 above); the six-off set equals the five-off set by construction (swell needs mist3).
- 21:12 perf batch started in the background (tools/perf_a3.zsh -> perf/pairs_a3.txt, perf_pair2.mjs = judge1's + js for A):
  calib, lane vs r10, reverse, misty vs r10, swell (misty both, swell off vs on), lane vs judge1's lane (six off), hold, calib2.
  The machine runs a foreign swiftshader Chrome (pid 37342, another project, ~750 % CPU, not ours): load ~14.
- 21:14 cloud speed re-check (judge1 py/pcorr.py, sky box 900-1300 x 60-200, fx1/an2/a3_cloudspeed.txt): engine t 3.4 -> 9.4 / 13.4 /
  19.4 -8.50 / -8.39 / -8.44 px/s; reference S000 -> S330 -8.37 (-> S210 -7.98). The left box locks on the static summit (0 / noise).
- 21:15 merge dry run onto the CURRENT MAIN (fx1/merge_a3): PlateEnvironment.ts (MAIN == BASE) and HeroEngine.ts (MAIN = BASE + RINGS)
  0 conflicts; Atmos.ts is new. QC helper for the panel: fx1/tools/qc_f000_pin.json (t 3.4 pinned + S210 / S320 / L090 / L120 times).
- 21:16 HANDOFF "Fix round 1" rewritten for attempts 1-3 (F1-F6; F5 perf pending; the attempt-2 text kept in
  fx1/HANDOFF_before_a3.md). Perf batch restarted with a 40 min wait for the water lane's own timing runs (water:perfpairs x2 held
  the slots; my first start would have run into them after 10 min): tools/perf_a3.zsh -> perf/pairs_a3.txt.
- 21:22 later times of the swell build (t 25 / 40 / 60 / 90 / 150 / 300 / 600, fx1/an2/a3_fin_later.jpg looked at): the bank comes
  and goes with soft rises at different places; natural. Roll-in at x 360-540 (rows 380-440): reference fogged by L045 (t 9.4)
  175-187, engine 154-163 at t 9.4, 170-177 at t 12.1, matched at t 13.4 (~4 s late; base box ~1-1.5 s late). A re-fit of the
  noise offset with that band (fx1/py3/rollfit.py) finds no single offset for base + ridge foot + R (best: R 0.5-0.7 with the
  ridge wrong); a scripted first sweep would need its own fit and a stop edge -> NOT done (transient, first ~13 s only); HANDOFF F6.2.
- 21:22 all 21 attempt-3 capture runs (535 shots): 0 page / console errors. Hold-start step checked (fx1/an2/a3_seqH_jump.jpg looked
  at): the left-base jump at f8->9 is the hold's dolly (cz 9.82 -> 5.26 in one saved step), not the atmosphere. HANDOFF: switch
  table (section 3) now lists the six fix-round switches; F1-F6 final except F5 (perf). Waiting for the water lane's own timing
  runs (water:perfpairs) to end before my pairs start.
- 21:25 final-build row profiles vs attempt 2 (rows 300-440, mean |eng - ref|, max): x 180-360 S320 3.4 -> 2.6, L090 6.1 -> 6.3,
  L120 11.9 (-32.9) -> 5.7 (-10.7); x 360-540 S320 8.0 (-21.9) -> 5.3 (-9.9), L090 9.4 (-23.8) -> 6.7 (-13.7), L120 9.1 -> 7.4
  (fx1/an2/a3_final_rowprof.txt, a3_attempt2_rowprof.txt). Better in 5 of 6, equal in 1. In HANDOFF F3.
- 21:26 judge1's far-range crop redone on the final build (fx1/an2/a3_far_range_veil_1to1.jpg looked at: F000 | judge1 t90 washed
  out | final t90 (handheld off and judge1's plan) / t150 / t3.4 crisp, the cloud only above / behind the crest). 1:1 pointer crops of
  the swell region (fx1/an2/a3_ptr_1to1.jpg looked at: rest, L, R, TL, BR at t 14.1, BL at 19.4): soft, no edges.
- (clock note, attempt 3: the entries labelled 20:45-21:15 were estimates that ran ahead; the lab's rebuilds give the real times:
  swell v1 20:35, re-fit #2 20:42, re-fit #3 20:51, shade 0.20 21:00, final captures 21:01-21:06, perf batch start 21:11.)
- 21:27 judge1's L090 mist crop redone on the final build (fx1/an2/a3_mist_1to1_L090.jpg looked at: REF L090 | final t 15.4 live;
  REF L000 | final t 3.4; REF S320 | final pinned misty t 30): a white fog mass with a soft rising top instead of judge1's streaky
  band; the remaining look gap is the massif's own crisper, bluer bake (out of lane) and a less voluminous fog at the ridge's foot.
  Perf batch: water:perfpairs ended 21:25; my pairs started 21:25:47 (calib first; load ~28-32 from other projects' Chromes).
- 21:30 perf: the slot gate (full power, loadMax 16) held my first pair from 21:25:47 to 21:30:21 (load 17-32 from other projects'
  Chromes: a swiftshader Chrome at 180-750 % CPU for 6 h and a headless Chrome on port 9864, neither ours); calib running.
  Prepared tools/perf_a3b.zsh (one extra pair: the fix round's worst case, both pages misty, six switches off vs on; + calib3).
