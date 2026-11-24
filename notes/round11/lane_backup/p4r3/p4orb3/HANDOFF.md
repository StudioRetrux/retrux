# P4 round 3 - lane orb (p4orb3) - HANDOFF (21 Nov 2026, builder, 05:03-06:5x WIB)

Lane `LANES/p4orb3` = `cp -c -R LANES/int1` (app/ == int1 == MAIN app at the start, diff -rq). Lab **:5176** left running for the judge
(`PORT=5176 nohup node hero-lab/serve.mjs --no-watch` in LANES/p4orb3/retrux-web; final build). WORK = $SP/work_p4/p4orb3 (LOG.md has
every batch with numbers); mirror = MAIN/notes/round11/lane_backup/p4r3/p4orb3/.
Tasks (rejudge p4orb open items, plan Q2 / Q7 / Q4): **F2** (major) structure inside the open hold orb, **F4** (minor) the brightest
crystal facets, **R2** (nit) the hold rim band and hairline. IceMaterial.ts, Water.ts, LakeMirror.ts, LakeSchedule.ts untouched.

## FIXER update (21 Nov 06:47-07:4x WIB): judge p4orb3 F2 (major) - the hit structure followed the chord length, not the field
Supersedes the F2 defaults and the F2 numbers below (R2, F4, switches, files and assets unchanged). Fixer work: WORK/fix/ (LOG.md
"FIXER" section); fixer-only diff vs the builder: WORK/fix/fix_vs_builder.diff (48 lines, Orb.ts only).
- **Cause (judge, confirmed):** P = 1 - exp(-10 lam / R) is the hits' TOTAL along the chord, so the 1.68 R central chord clipped by its
  length and the 0.5-0.8 R chords (closest approach inside the tau-thinned outer shell) read as a grey ring: the radial inverse of
  F402 (dark central figure inside a disc clipped to ~0.86 R; F453 and F045 also carry their grey structure near the centre, F358 is mostly behind the band).
- **Change (Orb.ts, inside ORB_P4HIT only):** new `uP4HitC` (x chord normalisation exponent: P uses lam x (y R / chord)^x, so x 1 =
  the MEAN coverage along the chord and the gaps follow the field; y 1.68 = the chord where both agree; z = the hold weight uRim
  at which the model is fully on, smoothstep(0, z, uRim), 0 = linear as before), applied to the main and the internal-reflection
  pass. New defaults: `uP4Hit (0, 1, 5.5, 8)` (scale 10 -> 5.5: the centre no longer saturates by length; gain 3 -> 8: the copy's
  mean, capped by the uMaxRadiance shoulder anyway), `uP4HitB (0.15, 0.5, 0.45, 0.67)` (the fade to MAIN's clamp 0.7-0.95 -> 0.45-0.67
  R: the outer disc at the clamp as F402 / F453), `uP4HitC (1, 1.68, 0.5, 0)` (the release at p07, uRim 0.24, now carries the figure).
  Cost: one pow per orb pixel (no pass, no tap). Switches unchanged (`?orbhit=0` drops it with the rest of F2).
- **Paired evidence, the judge's own harness on fresh pages** (WORK/fix/tools/fD.sh = jC.sh, M = :5173, L = :5176; fix/ana/
  radial_gap_fix.txt, fix/img/det/det_stats_ML.txt + det_stats_M2L2.txt, ML_*.png = MAIN | lane | REF):
  | radial median L, 0-.3/.3-.5/.5-.6/.6-.7/.7-.8/.8-.86 R | MAIN | builder | **fixer** | REF |
  |---|---|---|---|---|
  | p05 open (clock 3.3) | 255/254/253/252/249/246 | 255/251/236/234/235/242 | **247/239/248/252/249/248** | F402 237/235/252/254/253/252 |
  | p06 open | 255/254/254/253/250/247 | 255/253/248/237/235/242 | **247/245/250/253/250/248** | F402 |
  | p04 pop (natural) | 255/253/253/253/250/247 | 255/253/249/243/242/243 | **245/242/249/252/250/247** | F402 |
  | p07 release | 253/253/253/253/249/245 | 254/253/252/252/248/244 | **251/250/252/253/249/245** | F453 244/249/252/255/255/255 |
  core r < .5 R >= 250: p05 81.3 -> **39.3 %** (F402 40.0; builder 65), p06 96.2 -> **41.6** (builder 73), p04 nat 94.1 -> **39.1**,
  p07 90.6 -> **54.5** (F453 46.6). p05 share < 215 13.9 -> 17.2 % (21.7), < 235 26.9 -> 35.4 (37.1), sd 21.2 -> 21.7 (24.4),
  box248/250 18.9/16.8 -> 12.4/9.8 (16.2/14.3). T2 the same (p05 core 82.9 -> 34.5 %). Rest q00 / q03 orb identical (+0.02 L);
  far field > 1.6 R <= 0.12 % px > 2 L; ice 1.02-1.6 R within 0.4 L.
- ident re-proved (fix/ident/summary.txt, fresh both sides): ?p4orb3=0 vs :5173 IDENTICAL at T1, T2, T1 HOLD, T0 phone, envlake=plate;
  ?orbhit=0&orbrim3=0&shardtop=0 HOLD and ?p4orb=0 HOLD IDENTICAL; lane ON T0 IDENTICAL; lane ON T1 / HOLD differ only in main,
  refraction, bloom0-4, final + rx-orb, rx-shards. tsc hero 0 / project 0. qc set WORK/qc_fix (exit 0, no page errors; sweep 0 black
  px in 36 stills). Patch WORK/p4orb3_vs_int1.patch 240 lines sha256 dbaa2620...366d, applies clean to int1 (app/ == lane app/).
- perf (SLOT_BG=0, vs :5173, T1; fix/perf): ftime synchronous 12 alternations (load <= 6.4) rest 0.964 / hold 1.012 (paired mean-ratio
  medians; pooled 0.954 / 0.962); rtx real loop 6 pairs per mode at load 3.5-5.9: block-median 1.000 / 1.000 / 1.000 (hold / move /
  rest), mean-interval medians 1.046 / 0.974 / 0.919. No regression > 5 %. Flicker (fix/ana/flicker.txt): disc d2/d1 1.44 / 1.40 /
  1.84 vs MAIN 1.53 / 1.43 / 1.86 (p05 open, p06 hidden, p07 release): none added.
- **Still open (honest):** (1) the figure is softer and shallower than F402's bold keyhole: centre medians 4-10 L above F402's, p05 <
  215 17 vs 22 %, p06 < 215 0.9 vs F402 22 % (our simplex stand-in is a different realisation of the artist's 4D Perlin field, so
  its voids are not F402's keyhole; a frame-exact figure needs Blender's exact noise at the video's plasma clock, or the judge's
  option of a Cycles flipbook: design decisions). Scale 5 instead of 5.5 (batch c3) gives F402's centre (238/239) but core 31 %
  and a darker hidden band. (2) The ice band in front of the HIDDEN hold orb stays ~4 L dimmer than MAIN (p05 / p06 natural, r <
  .75 R -3.96 / -3.74 L; builder -4.2 / -3.8): the ice reads the orb's copy per sample under its own clamp (IceMaterial
  r11ClampOrb / ICE_P4 lim), and the hits already sit on the orb's uMaxRadiance shoulder, so no orb-side gain restores it. Options:
  the ice lane's x1.05 on the hold orb-through term at merge (judge H1), or accept (vs F420 it is mixed). (3) Release p07 centre
  251/250 vs F453 244/249: the figure shows (core 54.5 vs 87 %) but stays pale.

## Switches (each restores MAIN = int1 = :5173; proofs below)
| switch | effect |
|---|---|
| `?p4orb3=0` | round 3 off (F2, R2, F4): MAIN byte for byte (final image, every target, every linked program) |
| `?orbhit=0` | F2 off (the orb's expected clamped sample in the hold) |
| `?orbrim3=0` | R2 off (hold band lift + lavender hairline) |
| `?shardtop=0` | F4 off (crystal top facets) |
| `?p4orb=0` | rounds 1 AND 3 off (= `:5173?p4orb=0`, AA8's orb) |
| T0 | never takes the lane (HeroEngine's `p4` = P4ORB and tier != T0, unchanged) |
Live knobs: `__hero.orb.material.uniforms.uP4Hit / uP4HitB / uP4RimB / uP4RimC / uR11OrbC`, `__hero.shards.material.uniforms.uP4ShC`.

## Files (patch WORK/p4orb3_vs_int1.patch; only two files; no shared-file hunks: HeroEngine.ts, PostChain.ts, quality.ts untouched)
- **hero/Orb.ts**
  - flags `P4ORB3` (`?p4orb3`), `P4_HIT` (`?orbhit`), `P4_RIM3` (`?orbrim3`); defines `ORB_P4HIT`, `ORB_P4RIM` (T1 / T2 with the
    round-11 orb, i.e. HeroEngine's `p4`), resolved away by `laneSource` when off (the source is int1's byte for byte).
  - **F2, root cause and fix.** MAIN integrates the plasma's emission along each ray (pre-integrated sheets, exact to the node
    tree) and then clamps the integral like one Cycles sample: clamp(E). Every ray that crosses any sheet sits at the cap, so the
    open hold disc is the cap everywhere (HDR max channel inside 0.75 R p10/25/50/75/90 = 1.2 / 2.7 / 10.1 / 10.4 / 11.5; with all
    fills off the same; at gain x0.03 still flat). Cycles clamps each SAMPLE (indirect clamp 10) and point-samples a procedural
    volume once per step (1/10 of the bounds = 0.2 R): a sample that lands in a thin sheet saturates, one that misses adds nothing,
    so a pixel is E[clamp] = P(hit) x clamp. ORB_P4HIT accumulates lam = sum(sheet mean coverage x step) in the existing march
    (one add per step), P = 1 - exp(-10 lam / R), levels smoothstep(0.15, 0.5) (the reference is bimodal: clipped tongues and
    lens-image gaps), the hits x3 over the clamp (they sit above AgX's white anyway; this keeps the disc's mean radiance near
    MAIN's, which the ice reads from the copy), faded out towards the glass edge over 0.7-0.95 of the impact parameter (the faint
    outer shell otherwise leaves a dark annulus). The inner (internal reflection) pass the same way. Weight 0 at rest, uRim in the
    hold (so release fades back continuously). Where no sheet is crossed the existing screen lens shows the refracted scene: the
    grey-blue gaps. The hold core glow uR11OrbC.x 0.4 -> 0.25 with it (it filled the gaps). Nothing invented: the shapes are the
    artist's own noise field (warp texture, exact sheet table), only its sampling statistics change.
  - **R2.** ORB_P4RIM, hold only (x uRim): a mint-white band lift 0.6 over 0.78-0.985 R and an additive lavender hairline
    (0.62, 0.55, 1.0) x 1.4 at 0.975 R (width 0.02), F402's lower-left line R ~ G < B.
- **hero/Shards.ts**
  - flag `P4_SHARD3` (`?p4orb3`, `?shardtop`), define `SHARD_P4R3` (with round 1's SHARD_P4 only), laneSource'd.
  - **F4.** the top of the facet value range (fh.z from 0.5) lifted x(1 + 0.5 k) with its chroma pushed x(1 + 0.35 k) around its
    luma (AgX desaturates a brighter blue; a plain lift left the p95 of the blue-dominant pixels where it was, round 1's fixer).
- No assets. HeroEngine.ts / PostChain.ts / quality.ts / IceMaterial.ts: no change.

## Evidence (WORK paths; key files mirrored)
All paired numbers: tools/dv.mjs (the judge's deterministic method: engine loop off, one fresh page per config, the same call
sequence q00, q03, p04, p05, p06, p07, p08; ring clock pinned at the hold start 3.3 = the open orb, and "n" = natural phase = the
hidden orb; the orb's plasma clock pinned) lane vs `?p4orb3=0` (== :5173, ident below); tools/dva.py = the judge's metrics (box241
around the projected orb, interior r < 0.75 R with crystals masked, rim band 0.86-0.96 R, hairline 0.97-1.0 R, paired ice annuli
1.02-3.5 R crystals masked). Files: ana/fin2_orb.txt, ana/fin2_shards.txt, img/fin2/*.png (MAIN | lane | REF, normal + 200-255
stretch).

**Clipping (box241 min channel >= 248 / >= 250, and core r < 0.5 R >= 250) MAIN -> lane vs REF**
| pose | MAIN | lane | REF |
|---|---|---|---|
| q00 rest | 2.5 / 0.3 %, core 18.3 % | 2.5 / 0.3 %, 18.3 % (orb unchanged at rest) | F000 2.2 / 1.9 %, 49.7 % |
| q03 eye | 6.5 / 5.1 %, 76.2 % | 6.5 / 5.1 %, 76.2 % (unchanged) | F045 6.0 / 5.0 %, 59.6 % |
| p04 pop, natural | 15.3 / 13.2 %, 94.1 % | 12.2 / 9.8 %, 75.6 % | F358 1.5 / 1.3 %, 18.7 % |
| p04 pop, clock 3.3 | 2.4 / 1.5 %, 19.8 % | 0.7 / 0.6 %, 5.6 % | F358 |
| p05 open hold, clock 3.3 | 18.9 / 16.8 %, 81.3 % | 13.3 / 11.4 %, 65.0 % | F402 16.2 / 14.3 %, 40.0 % |
| p05 hidden hold, natural | 0.7 / 0.0 %, 1.0 % | 1.3 / 1.0 %, 5.6 % | F420-like |
| p06 open, clock 3.3 | 21.8 / 19.0 %, 96.2 % | 15.1 / 12.7 %, 72.8 % | F420 2.9 / 2.4 %, 24.0 % |
| p06 hidden, natural | 0.7 / 0.0 %, 1.6 % | 1.4 / 1.0 %, 6.0 % | F420 2.9 / 2.4 % |
| p07 / p08 release | 9.3 / 8.0, 0.9 / 0.5 % | 9.3 / 7.7, 1.0 / 0.4 % | F453 11.0 / 9.9, F460 5.1 / 4.5 % |

**F2, interior structure (r < 0.75 R, crystals masked) MAIN -> lane vs REF**
- p05 open (clock 3.3): share < 215 L 13.9 -> **19.1 %** (F402 21.7), < 235 26.9 -> **36.8 %** (37.1), sd 21.2 -> **22.9** (24.4),
  L10 / 50 / 90 205 / 254 / 255 -> 204 / 248 / 255 (198 / 252 / 255). HDR (main target) max channel inside 0.75 R was the cap
  everywhere (p50 ~10, p75 10.4); now bimodal (gaps ~1.2, tongues at the cap).
- p06 open: < 215 0.0 -> 8.6 %, < 235 11.5 -> 28.7 %, sd 9.5 -> 15.3 (that phase shows less gap in this capture; batch e10's view,
  gain 1.8 / levels 0.1-0.45: p05 < 215 22 %, sd 24.7). p04 natural: < 215 3.9 -> 8.8 %, sd 13.6 -> 16.1.
- Looked at: img/fin2/fin2_p05_p06.png, img/e10/e10_p05_p06tn.png, the qc set (img/qc_p05_p06_MAIN_lane.png, img/qc_sweep_hold4.png):
  white torn-edged plasma tongues with grey-blue lens-image gaps inside a luminous core, the glass edge glowing; MAIN = flat disc.
- Side effects (paired): ice annuli 1.02-1.25 / 1.25-1.5 / 1.5-2 R at the open orb -0.43 / -0.35 / -0.05 L (p05), -0.52 / -0.46
  / -0.05 (p06); around the hidden orb +0.68 / +0.51 / +0.17 (p05 n), +0.60 / +0.53 (p06 n); the ice band in front of the hidden
  orb (r < 0.75 R) -4.2 / -3.8 L (its L90 249 -> 242; F420 252) because the orb's copy now carries gaps. Release p07 / p08 within
  0.4 L. Rest q00 / q03: orb + ice identical within 0.03 L (the crystal lift only).
- Temporal (tools/flk.mjs, 12 frames, ana in LOG): disc 2nd / 1st difference 1.50 vs MAIN 1.53 (p05 open), 1.41 vs 1.43 (p06
  hidden); ice 1.46 / 1.47: no added flicker.
- Sweep (qc_final/sweep, ana/sweep_check.txt): no black / NaN pixel in any still; clipped px (incl. the UI text ~17.3k) hold / pop
  stills 17.6-21.6k vs MAIN 17.3-18.4k: more clipped light slits through the bands in the hold (the panel's Q4 / F420 direction).

**R2, hold rim (p05 / p06 open)**: band 0.86-0.96 R L 228 -> **238** (F402 245), B-R +21 -> +11 (F402 +18); hairline 0.97-1.0 R
(197, 211, 230) L 209 -> **(228, 231, 243) L 231** (F402 237; its lower-left line (223-229, 225-232, 250-252), R ~ G < B). Hidden
hold: band 226 -> 228, hairline 224 -> 227 (B-R +31 -> +27).

**F4, crystals (B-R >= 85 px, the judge's shardpair metric) MAIN -> lane vs REF, p95 L / median L / median sat**
q00 150.9 -> **163.1** / F000 163.5, med 83.5 -> 87.5, sat 0.654 -> 0.637 (0.629); q03 153.5 -> **162.9** / F045 168.4; p04 n
155.3 -> 167.5, p04 3.3 164.1 -> 172.7 / F358 177.7, sat 0.475 -> 0.465 (0.447); p05 167.7 -> 172.3 / F402 174.1; p06 n 159.2 ->
173.9, 3.3 158.3 -> 169.0 / F420 170.2, sat 0.482 -> 0.475 (0.506); p07 162.5 -> 174.8 / F453 168.8; p08 158.4 -> 172.7 / F460 167.0.
Zooms img/e11/shz_e11_p06_tn.png (MAIN | lane | stronger): periwinkle, no paper-white chips.

**Switch / ident** (tools/bid.sh, bid2.sh = the round-1 identP: 20 moving frames; final image + every target + every linked
program; ident/summary1.txt, summary2.txt):
- `?p4orb3=0` vs :5173 **IDENTICAL** at T1 (14 targets, 16 programs), T2 (15 / 16), T1 HOLD expand 2.97 (14 / 18), T0 phone
  390x844 DPR3 (9 / 12), `?envlake=plate` (10 / 12).
- `?orbhit=0&orbrim3=0&shardtop=0` (T1 HOLD) IDENTICAL to :5173. `?p4orb=0` vs `:5173?p4orb=0` IDENTICAL at T1 and T1 HOLD.
- Lane ON at T0 phone IDENTICAL to :5173 (T0 unchanged). Lane ON T1 / T1 HOLD differs only in main, refraction, bloom0-4, final and
  the programs rx-orb, rx-shards (mirror, walk, cache, cacheN, reflection, back untouched).
- tsc (lane retrux-web): `npx tsc -p tsconfig.hero.json --noEmit` 0, `npx tsc -p tsconfig.json --noEmit --incremental false` 0.

**Perf** (T1, 1440x766 scale 1, SLOT_BG=0; the machine was loaded by other lanes, absolute times high in BOTH labs):
- Real loop (tools/b1/rtx.mjs, engines' own RAF loops, interleaved lane / :5173, 6 pairs per mode, all pairs at load 5.3-9.2;
  perf/rtx.json, rtx_summary.txt): paired median of block-median ratios hold **1.000** (mean-interval ratios 0.986), move 1.000
  (0.987), rest 1.000 (0.995); vsync-quantized (block medians 58-67 ms in both labs).
- Synchronous frame time (tools/b1/ftime.mjs: both labs in one browser, loops off, 8 alternations x 60 frames + 1-px readback;
  perf/ftime.json, ftime_summary.txt, load <= 8.4): rest paired mean-ratio median **0.994** (median-ratio 1.006), hold **0.988**
  (1.000). No regression > 5 %. Added work: one add per march step and ~12 ALU + 2 exp after the loop in the orb (T1 / T2 only),
  ~10 ALU per crystal fragment; no pass, no texture tap.

**Capture set** WORK/qc_final (qc_r11.zsh T1 1, 05:57-06:05, exit 0, no page errors); region_stats_q00 = MAIN's (env untouched).
**Patch** WORK/p4orb3_vs_int1.patch (229 lines, sha256 8e73bbce0df9ffb7836a0c671bedd123644864175acddc8a5eea79f3f61f282c): Orb.ts,
Shards.ts; apply test on a fresh copy of int1's app/: dry run rc 0, apply rc 0, 0 .orig / .rej, app/ == lane app/.

## Open (honest)
- **F2 is closer, not identical to F402.** The statistics now match F402 at the open hold (share < 215 19 vs 22 %, < 235 37 vs
  37 %, sd 23 vs 24) and the structure is the artist's own plasma field, but its gaps are smaller and softer than F402's bold
  "keyhole" T and bottom band at most phases (p06 here: < 215 8.6 %), and the core still clips more than F402's (65-73 % vs 40 %
  of r < 0.5 R). Stronger levels (0.2 / 0.55, batch e12 V3) give < 215 25 % but darken the band in front of the hidden orb by 11 L
  (F420 needs it bright): the trade-off is the orb's copy, which the ice reads. A Cycles flipbook of the artist's volume (the
  judge's option c) remains the way to a frame-exact match; not attempted (time box; Blender).
- The ice band in front of the hidden hold orb is 4 L darker than MAIN's (L90 249 -> 242, F420 252): the gaps are in the copy too.
  The ice lane owns the orb-through term (IceMaterial r11ClampOrb); a x1.05-1.1 there in the hold would restore it.
- p04 (the pop, partly hidden orb) clips less than MAIN (12.2 vs 15.3 % natural phase), closer to F358's 1.5 %.
- R2: the band is 7 L under F402's and the band's B-R +11 is cooler-neutral vs F402's +18 (a mint-white band desaturates in AgX);
  the hairline is lavender (R ~ G < B) but paler than F402's lower-left line, all round the rim rather than one side.
- F4: q03 p95 162.9 vs F045 168.4 (-5.5), p04 172.7 vs 177.7 (-5); p06 / p07 / p08 now at or 2-6 L over the reference; the
  crystals' median L stays 10-15 under REF (bodies, not the top facets; round 1's Q7 territory).
- Rest orb (q00 / q03) unchanged on purpose (F2 is the hold; the panel judged the rest core's level as matching).
