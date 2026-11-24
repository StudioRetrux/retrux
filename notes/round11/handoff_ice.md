# ICE lane hand-off (round 11), step 1 of 2: the Cycles twin and the measured targets

Written 2026-11-14 by the ice-lane builder (ice-twin). Step 1 = SPEC 4.3 method steps 1-3, gate I-G1. The engine's
look was not changed in this step; step 2 (SPEC 4.3 step 4) will change it behind `?ice=r10`.
`SP = /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad`,
`WORK = $SP/work/ice`.

## Files changed in this lane
- None in the engine or the app: `git -C $SP/lanes/ice status` shows only this file. The pose dumps and the engine
  backgrounds were taken through `window.__hero` at runtime (debug only), so no debug helper had to be added.
- New: `HANDOFF.md` (this file).

## Switches
- None yet (nothing in the engine changed). Step 2 adds `?ice=r10`, which must restore today's ice, orb and shards
  exactly.

## Assets
- Nothing shipped into `retrux-web/public/hero/`.
- Working outputs in WORK (766 MB in total, not for shipping): the posed twin `twin/twin_q00.blend` (36 MB, a compressed
  copy; the repo .blend was never written), twin renders `twin/q00|q03|p06/*.png` (0.4-1.5 MB each) and multilayer EXRs
  (~100 MB each), engine frames and dumps `engine/dump1/`, engine backgrounds `engine/bg1/`, side-by-sides `cmp/`,
  measurements `stats/`.

## Evidence
- `WORK/ICE_TARGETS.md`: the twin's build and validation against F000 / F045 / F420, the measurement method, 10 targets
  ranked by visual impact with twin / reference / engine numbers and the engine terms behind each gap, and generated
  tables. `WORK/LOG.md`: every attempt with its numbers and decisions (including a wrong first silhouette tracker that
  was replaced after drawing its tracks).
- Pose exactness: hero.glb's own vertices pushed through the engine's ring chain land on the engine geometry within
  1.6e-7 m for all 8 ring pieces at every pose (`WORK/tools/twin_pose.py`).
- Engine backgrounds: re-captured frames equal the dump1 frames within 1/255 (dither) after restoring the clocks.
- Denoiser: band-pass energy denoised vs noisy 0.3215 vs 0.3241 on the band in front of the orb (noise floor 0.0087).
- Typecheck `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.hero.json` in `retrux-web`: 0 errors.
- Servers: my lab on :5176 was started and stopped by me; the baseline on :5173 was not touched. All Blender and Chrome
  runs went through `$SP/slot/slot.mjs`.

## Gate I-G1: PASS
Twin renders exist for q00 (`WORK/twin/q00/q00_beauty.png`), q03 (`WORK/twin/q03/q03_beauty.png`) and p06
(`WORK/twin/p06/p06_beauty.png`), with a validation in ICE_TARGETS.md section 1.3. Headline numbers at q00 (twin vs
F000): sculpture box L 194 / sd 25 vs 199 / 22; band A rim lines 44.7 / 31.7 vs 38.1 / 45.1 L below the band core;
ring B against its background +3.0 L / +9 B-R vs -2.2 / +8; cobalt crystals L 133 vs 138.

## Open issues
1. Ring A's in-plane rotation at tau 0 differs from F000 by roughly 45 deg: the quarter joints show at x 666 / 799 in
   the engine's pose and at x 584 / 878 in F000 (ICE_TARGETS T8). This is the idle mocap, not the material; the lead or
   the hold lane should decide whether to rotate it.
2. The twin's environment is 2-9 L darker than F000 (raw Blender 5.2 AgX on the v7 scene); absolute values lean on
   F000, values relative to the background on the twin.
3. The reference's outline wobble is only reliable on q00's top arc of ring B (other tracks hop to inner edges because
   the reference's pose differs).
4. Blender 5.2.1 warns that `plate_scene_v7.blend` was written by 5.2.3 ("502.45"); no visible loss was found.
5. The GPU is shared with the env lane's bakes: a full twin frame took 4-5 min alone and up to 16 min shared.

---

# Step 2 of 2 (SPEC 4.3 method step 4, gates I-G2..I-G4), builder "ice-match", final state 2026-11-15

Three attempts did this step (the first two were cut off by the usage limit at 19:07 and by a network outage at about
22:38 on 14 Nov). Every batch, its numbers and its decision are in `WORK/LOG.md` (s01-s43). `WORK` =
`$SP/work/ice`, `SP` = `/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad`.

## What changed, in one paragraph
The round-10 ice was a milky superellipse slab that sampled the frame copy almost straight through with a fixed 6 m
projection, then muted it and painted navy masks, a line-of-sight "TIR bar", end blocks and a lantern floor on top. The
round-11 ice (default) follows the Cycles twin of the artist's scene: each fragment traces its view ray through the
rings' real rendered section (the SubD-L1 pointed octagon, smooth-shaded side faces, flat slopes), with the walls as
surfaces of revolution about the ring axis (one quadratic per wall, so a ray running along a curved band is piped like
in Cycles), IOR 1.5 and Cycles' dielectric Fresnel at every wall, up to 5 internal bounces split continuously into
refracted and reflected energy. Each exit ray looks up the orb analytically (through a roughness lobe; 30 % of its mean
radiance, so its plasma reads as an even glow), else the frame copy at 40 m (un-kneed, blurred by roughness), else the
panorama; the orb's mirror image in the lake is added for steep downward rays. IceColor tints once per pass (measured
on the twin). The vertex displacement is Blender's own Voronoi cell plateaus at Blender's amplitude (chiselled polyline
outlines). The quarter / half joints are drawn on the pieces' own cut planes (they move with the ring, whatever pose the
hold lane gives ring A). The orb (Orb.ts) drops the round-10 fills over the Cycles plasma, pre-filters the rim and keeps a
half-strength cyan limb at rest only.

## Files changed (`git -C $SP/lanes/ice diff`, no new files)
- `retrux-web/app/hero/engine/hero/IceMaterial.ts` (about +690 lines): the round-11 vertex and fragment paths under the
  `ICE_R11` define (round-10 code untouched in the `#else` branches); `export const ICE_R10` (`?ice=r10`) and
  `export function iceR11(quality)` (round 11 = not `?ice=r10` and ice march steps > 2, i.e. T1 / T2; T0 keeps round 10);
  round-11 uniforms in `r11Uniforms()` (only created when `iceR11`); `uDisplace` / `uSquare` keep their round-10 values
  otherwise. Debug views `uR11Dbg` 1-7 (7 = the first exit's orb impact parameter, added in this attempt).
- `retrux-web/app/hero/engine/hero/Orb.ts` (+42): `ORB_R11` define (absent with `?ice=r10` and on T0, whose orb has 8
  march steps), `uR11Orb` (fill scales), `uR11OrbB` (rim pre-filter strength / start, hold limb scale). The round-10 lines
  are textually unchanged in `#else`.
- `retrux-web/app/hero/engine/hero/Rings.ts` (+27, shared file): `pieceCutAngles()` and, per piece, `uPieceCuts` (only
  when the material has that uniform, i.e. never with `?ice=r10`); the joint fade when a piece leaves its rest place.
- `retrux-web/app/hero/engine/pipeline/RenderPipeline.ts` (+3 / -1, shared file): imports `iceR11`; the ring back-depth
  (thickness) pass is skipped when the round-11 ice runs (it traces its own path through the section); `?ice=r10` keeps
  it (T0 has no back-depth target anyway).

## Switches
- `?ice=r10`: today's (round-10) ice, orb and shards exactly (gate I-G4 below).
- T0 (auto-selected on weak GPUs, or `?tier=T0`) keeps the round-10 hero exactly: the round-11 trace costs x1.26-1.45 of
  the round-10 T0 ice in GPU frame time (batch s41) and its cheaper knobs do not bring it down.
- Runtime tuning (no rebuild): `__hero.rings.materials[i].uniforms.uR11A..uR11H, uR11Ramp, uR11Dbg` and
  `__hero.orb.material.uniforms.uR11Orb / uR11OrbB`; the meaning of every component is commented in IceMaterial.ts
  (`r11Uniforms`) and Orb.ts. Final defaults: uR11A (40, 0.12, 0.06, 4000), uR11B (3, 1, 0.35, 1), uR11C (0.2, 0.5, 1, 1),
  uR11D (1.5, 0.94, 0.8, 0.85), uR11E (1, 7.5, 1, 0.45), uR11F (0.3, 0.5, 0, 0), uR11G (1, 0.5, 0.9, 0), uR11H (0, 1, 1, 0),
  uR11I (0.08, 5, 1, 0), uR11Ramp 0.35; uR11Orb (0, 0, 0.5, 0), uR11OrbB (1, 0, 0, 0). Two options are in the code
  but off by default because they did not beat the default on the twin: `uR11H.x` (facets from the displacement's cell
  plateaus, s28) and `uR11G.w` (panorama share of frosted transmission, s31).

## Assets
- Nothing shipped into `retrux-web/public/hero/` (no Blender bake was needed: the plateau displacement is computed in the
  vertex shader from Blender's own Voronoi parameters, and the s28 analytic plateau facets did not beat the smooth field).
- Working outputs only in WORK: batches `r11/s01-s43/` (frames, backgrounds, silhouettes, stats), crops `r11/cmp2/`,
  `r11/cmp3/`, way-back captures `r11/wb_main2/`, `r11/wb_r10b/`, `r11/wb_r10c/`, `r11/wb_main_T0/`, `r11/wb_main_T0b/`,
  `r11/wb_lane_T0/`, tier spot checks `r11/tier_T0*/`, `r11/tier_T2*/`, sweeps `r11/sweep_final/`, `r11/sweep_base/`,
  temporal sequences `r11/tseq_r11/`, `r11/tseq_base/`, timing `r11/fc*.txt`, `r11/perf_ab/`; tools `tools2/`, `tools3/`.

## The ICE_TARGETS list, target by target (numbers: twin / reference / round 10 / round 11, final batch s40)
- T1 clear faces with structure (sd / DoG in the bodies): round 11 is near the twin in most boxes (see the table); clouds
  are no longer legible through band A (panorama blur floor 0.45, copy at the max blur mip for clear ice). Open: the
  twin's bands carry a fine cloudy frost texture that ours do not; ours show smoother, rounder "liquid" patches (the
  smooth facet field), most visible on ring A at q03.
- T2 value and hue against the background: q00 within about +-5 L / +-6 B-R of the twin in every ring (round 10 was 17-33
  L too dark); q03 still 4-5 L too light on rings A / B (lobe growth 3 is the compromise, s26); p06 ring B too light.
- T3 dark rim lines along the bands: present (q00 band A, q03 band D, the hold's B), weaker than the twin after the
  calming changes; bright Fresnel rims are gone.
- T4 the band in front of the orb: q00 L / sd / DoG within the target band (the orb seen through the band lens, 30 % of its
  mean radiance so the plasma reads as an even glow); p06 still too light.
- T5 the orb's light in the rings: physical (the orb is hit through every exit's roughness lobe); ring B / C / D at q00 are
  within a few L of the twin relative to their backgrounds.
- T6 outlines: Blender's Voronoi cell plateaus at Blender's amplitude in the vertex shader give the chiselled polyline;
  ring B's top arc wobbles 1.2-1.5 px RMS across batches (round 10 0.52, twin 0.80, F000 1.12; the round-11 tracks are
  partly inflated by shards crossing the outline in the silhouette capture).
- T7 the orb: fills off, rim pre-filtered, half-strength cyan limb at rest (the thick lavender rim was the main miss); the
  hold orb keeps its plasma (no white disc).
- T8 joints: drawn on the pieces' own cut planes, x 669 / 812 at q00 (twin 666 / 799), 10-11 L deep (twin 7-8, F000
  15-22); no line-of-sight bar. They follow any pose the hold lane gives ring A.
- T9 shards: not changed in this step (Shards.ts untouched); measured B-R is higher than the twin (see the shard table).
- T10 band end blocks: no whitening; the ends follow the refracted environment.

## Gate I-G4 (way back): PASS
`?ice=r10` on the lane vs MAIN's baseline lab :5173, both captured at the dump1 moments with every clock restored
(`WORK/tools2/wayback.mjs`, `WORK/r11/wb_main2/` vs `WORK/r11/wb_r10b/`): mean abs diff q00 0.300 / q03 0.217 / p06 0.139
per 255, max 1, no pixel above 2; the hero-hidden frames 0.334 / 0.447 / 0.235, max 1. Re-checked on the final code
(after the T0 rule, `WORK/r11/wb_r10c/`): 0.488 / 0.063 / 0.053, max 1. T0 without any switch vs MAIN at T0
(`WORK/r11/wb_lane_T0/` vs `wb_main_T0/`): 0.430 / 0.018 / 0.474, max 31 at 0.024 % of the pixels scattered over the lake,
which is T0's own run-to-run noise (MAIN against itself at T0: 0.055 / 0.288 / 0.231, max 29, 0.014 %). The x16 diff map
(`WORK/r11/wb2_diff_q00_rest.png`) is the grade's dither in screen tiles with no hero structure. `?ice=r10` compiles the
round-10 ice shader (no ICE_R11 define), the round-10 orb shader (no ORB_R11), creates none of the round-11 uniforms,
keeps the slab section, the x1.35 displacement and the back-depth pass.

## Gate I-G3 (no new artefacts, frame time): PASS (frame time below)
(The sweep and the flicker check were shot before the cost knob `uR11I` became (0.08, 5, 1); that change moves the hero
box by 0.3-0.7 / 255 on average with no structure, batch s39.)
- Tumble sweep (`shoot_sweep.mjs` from MAIN on both labs, T1, `WORK/r11/sweep_final/` vs `WORK/r11/sweep_base/`, montages
  `WORK/r11/cmp3/sweep_tau_a.png`, `sweep_tau_b.png`, 1x crop `sweep_tau275_1x.png`): no fireflies, seams, holes,
  hairlines or bottom-of-frame bands in any of the 8 tumble phases, the 6 hold / pop / release spots or the intro.
- Crawl / flicker (`WORK/tools3/tumble_seq.mjs` + `flicker.py`: rings stepped one 30 fps frame at a time, everything else
  frozen, 3 phases x 6 frames): the high-pass part of the frame-to-frame change is 11-14 % above the baseline (1.38 vs
  1.24, 1.63 vs 1.45, 1.06 vs 0.93), p99 22-28 vs 19-27; the max maps (`WORK/r11/cmp3/flick_r11_1.6.png`,
  `flick_base_1.6.png`) show moving feature edges in both and no isolated sparkles: clearer ice has more moving
  structure, not crawl.

## Gate I-G2 (engine vs twin and reference): converged at rest, partly at q03, misses in the hold (see the numbers)
Final batch s40 (T1, scale 1, the shoot_qc poses, every clock restored to the twin's dump1 moment; frames
`WORK/r11/s40/v0_*.png`, backgrounds `*_bg.png`, silhouettes `*_hero.png`; tool `WORK/tools2/r11_stats.py` with the step-1
masks; the tables below are generated by `WORK/tools3/ig2_table.py`, file `WORK/r11/s40/ig2_table.md`). Side-by-sides,
round 10 | round 11 | twin | reference: `WORK/r11/cmp3/q00_final_4up.png`, `q03_final_4up.png`, `p06_final_3up.png`
(round 10 | round 11 | twin), and the 2x crops `q00_s32_bandA_2x.png`, `q03_s22_Aright_2x.png`, `q03_s33_orb.png`,
`q03_s36_orb.png`, `p06_s29_orb.png`.
- Read: round 11 no longer reads milky: clear thick ice with chiselled outlines, the horizon and the orb refracted
  through it, dark rim lines and steel-blue zones, rings about as light as what is behind them (round 10: milky
  periwinkle acrylic, 17-33 L too dark). What still separates it from the twin: the twin's bodies carry a fine cloudy frost
  texture and soft facets, ours show smoother, rounder "liquid glass" patches with sharper edges (most visible on ring A at
  q03); the dark rim lines are weaker than the twin's; in the hold, rings B / C and the band over the orb are too light.
- Relative values (ring minus its own background with the hero hidden; twin target +-6 L / +-6 B-R): q00 every ring in
  (B +2.5 / +8.6 vs +3.0 / +9.1, C +5.1 / +5.1 vs +2.4 / +8.6, D -7.1 / +7.5 vs -10.3 / +11.2, A's sides -1.2 / +0.6 and
  +4.4 / +17.7 vs -4.3 / +6.1 and +1.5 / +22.0; round 10 was -29.5 / +30.2 on B); q03 4-5 L too light and 5-6 less blue
  (A -8.8 / +15.2 vs -13.7 / +20.4, B -11.4 / +10.4 vs -15.5 / +15.5, C +18.6 / -1.6 vs +13.6 / +4.3); p06 ring A in
  (-19.2 / +14.5 vs -18.4 / +15.9, round 10 -32.0 / +22.1), rings B and C miss (B -0.8 / +1.2 vs -14.9 / +17.5, round 10
  -12.4 / +5.8; B over the orb +20.4 / -17.1 vs +5.7 / +6.1; C +6.4 / -3.1 vs -4.8 / +9.7).
| pose | region | L twin / ref / r10 / r11 | sd | DoG | dL vs own background | dB-R vs own background |
|---|---|---|---|---|---|---|
| q00 | band A in front of the orb (T4) | 231.6 / 222.4 / 218.2 / 229.4 | 21.7 / 17.2 / 7.7 / 18.1 | 5.2 / 3.9 / 1.4 / 4.2 | - | - |
| q00 | band A left (T1) | 200.7 / 198.4 / 180.0 / 210.2 | 12.0 / 22.7 / 16.6 / 13.6 | 3.3 / 5.7 / 3.9 / 4.7 | - | - |
| q00 | band A right (T1) | 177.7 / 183.1 / 165.7 / 193.8 | 10.7 / 15.3 / 11.6 / 10.1 | 2.7 / 3.9 / 3.3 / 2.4 | - | - |
| q00 | ring B top arc | 193.5 / 193.0 / 171.0 / 200.8 | 8.2 / 8.5 / 8.3 / 8.1 | 3.5 / 4.4 / 1.9 / 3.3 | - | - |
| q00 | ring B | 193.2 / 196.6 / 169.3 / 201.3 | 11.2 / 10.2 / 13.3 / 10.5 | 4.6 / 3.8 / 3.0 / 4.0 | 3.0 / -2.2 / -29.5 / 2.5 | 9.1 / 8.2 / 30.2 / 8.6 |
| q00 | ring C | 188.8 / 188.5 / 180.6 / 198.0 | 19.6 / 21.4 / 16.0 / 24.9 | 5.0 / 5.0 / 5.3 / 5.3 | 2.4 / -4.4 / -12.3 / 5.1 | 8.6 / 9.2 / 11.7 / 5.1 |
| q00 | ring D | 188.7 / 188.1 / 190.3 / 198.2 | 17.8 / 29.5 / 12.7 / 24.8 | 6.0 / 8.4 / 4.2 / 5.6 | -10.3 / -17.2 / -15.0 / -7.1 | 11.2 / 13.2 / 4.3 / 7.5 |
| q00 | ring A left side | 201.1 / 203.0 / 191.3 / 211.4 | 12.1 / 22.7 / 20.0 / 11.4 | 3.1 / 5.7 / 3.2 / 4.0 | -4.3 / -9.6 / -21.2 / -1.2 | 6.1 / 5.8 / 7.7 / 0.6 |
| q00 | ring A right side | 173.0 / 180.8 / 165.2 / 192.6 | 12.6 / 15.5 / 12.7 / 12.1 | 2.8 / 4.3 / 3.2 / 3.7 | 1.5 / -7.4 / -23.0 / 4.4 | 22.0 / 23.9 / 35.0 / 17.7 |
| q00 | sculpture box | 193.9 / 199.3 / 190.3 / 202.4 | 25.1 / 21.7 / 25.3 / 23.9 | 5.7 / 4.9 / 4.8 / 5.3 | - | - |
| q00 | orb (T7) | 224.0 / 233.3 / 235.4 / 235.2 | 30.7 / 24.0 / 18.9 / 23.7 | 5.1 / 4.8 / 1.8 / 3.9 | 20.7 / 22.2 / 24.3 / 24.1 | -11.8 / -22.0 / -26.6 / -20.3 |
| q03 | ring A right side box (round 10) | 162.8 / 155.1 / 177.8 / 170.9 | 29.5 / 31.1 / 16.2 / 34.9 | 8.8 / 7.1 / 3.8 / 10.3 | - | - |
| q03 | band D in front of the orb | 229.5 / 218.1 / 223.1 / 236.3 | 22.9 / 20.2 / 10.5 / 10.3 | 8.4 / 5.8 / 3.1 / 3.4 | - | - |
| q03 | ring A | 172.7 / 177.8 / 176.8 / 187.8 | 23.1 / 25.5 / 19.3 / 26.4 | 5.2 / 5.1 / 3.8 / 6.5 | -13.7 / -18.8 / -19.8 / -8.8 | 20.4 / 20.5 / 23.5 / 15.2 |
| q03 | ring B | 183.4 / 184.1 / 178.7 / 195.8 | 21.8 / 24.0 / 16.3 / 26.6 | 5.6 / 5.5 / 4.8 / 6.9 | -15.5 / -23.1 / -28.5 / -11.4 | 15.5 / 16.0 / 20.7 / 10.4 |
| q03 | ring C | 201.0 / 194.4 / 182.6 / 213.7 | 21.9 / 14.9 / 28.0 / 17.4 | 4.9 / 5.4 / 6.0 / 4.1 | 13.6 / -0.7 / -12.5 / 18.6 | 4.3 / 10.8 / 16.9 / -1.6 |
| q03 | orb (T7) | 238.7 / 239.0 / 237.2 / 234.4 | 24.0 / 20.9 / 17.2 / 23.1 | 5.6 / 4.2 / 2.7 / 4.3 | 36.3 / 29.4 / 27.6 / 24.8 | -13.0 / -19.5 / -21.9 / -15.9 |
| q03 | sculpture box | 191.0 / 194.7 / 191.5 / 202.1 | 28.7 / 27.1 / 25.8 / 26.4 | 6.1 / 5.0 / 4.6 / 6.0 | - | - |
| p06 | band over the orb (round 10) | 213.2 / 210.0 / 217.6 / 232.3 | 23.5 / 32.2 / 19.0 / 24.2 | 5.5 / 6.7 / 3.2 / 4.1 | - | - |
| p06 | ring A arcs | 188.1 / 204.4 / 182.4 / 195.2 | 26.6 / 24.1 / 14.9 / 26.8 | 3.9 / 3.2 / 3.0 / 4.7 | -18.4 / -10.0 / -32.0 / -19.2 | 15.9 / 4.2 / 22.1 / 14.5 |
| p06 | ring A left arc | 190.3 / 210.8 / 171.8 / 199.2 | 10.5 / 19.8 / 12.5 / 14.1 | 3.7 / 3.4 / 3.0 / 4.6 | -18.3 / -5.2 / -44.2 / -16.8 | 15.1 / 2.6 / 35.4 / 14.3 |
| p06 | ring B | 192.8 / 206.9 / 202.8 / 214.4 | 31.2 / 20.7 / 22.5 / 24.1 | 4.4 / 4.2 / 2.5 / 3.3 | -14.9 / -8.3 / -12.4 / -0.8 | 17.5 / 7.6 / 5.8 / 1.2 |
| p06 | ring B over the orb | 211.5 / 215.0 / 219.2 / 233.7 | 21.2 / 24.7 / 10.7 / 19.3 | 5.0 / 5.5 / 1.5 / 3.3 | 5.7 / 1.7 / 5.9 / 20.4 | 6.1 / -1.9 / -7.9 / -17.1 |
| p06 | ring C | 196.5 / 210.2 / 195.0 / 214.0 | 26.2 / 16.9 / 18.0 / 25.5 | 4.4 / 3.4 / 4.0 / 4.8 | -4.8 / 2.6 / -12.6 / 6.4 | 9.7 / 0.3 / 0.4 / -3.1 |
| p06 | orb (T7) | 231.0 / 226.5 / 247.0 / 229.5 | 29.7 / 14.7 / 9.1 / 38.4 | 4.9 / 4.2 / 1.8 / 4.8 | 24.4 / 13.0 / 33.5 / 16.0 | -9.7 / -4.7 / -29.2 / -10.9 |
| p06 | sculpture box | 197.0 / 206.5 / 200.4 / 207.1 | 27.8 / 22.8 / 24.2 / 25.2 | 4.8 / 3.4 / 3.3 / 4.0 | - | - |

| pose | dark rim lines (core minus line, L): top / bottom | twin | reference | round 10 | round 11 |
|---|---|---|---|---|---|
| q00 | A_band_x650_860 | 44.7 / 31.7 | 38.1 / 45.1 | -2.3 / 7.9 | 31.2 / 21.2 |
| q03 | D_band_x680_780 | 49.5 / 35.9 | 15.5 / 25.2 | 0.3 / 1.2 | 14.2 / 3.3 |
| p06 | B_band_x660_820 | -1.0 / 8.1 | 55.0 / -0.5 | -3.8 / 11.9 | 20.4 / 12.8 |

| pose | outline | twin | reference | round 10 | round 11 (RMS px / angularity) |
|---|---|---|---|---|---|
| q00 | B_outer_top | 0.80 / 4.0 | 1.12 / 7.2 | 0.52 / 2.6 | 1.51 / 10.0 |
| q00 | B_outer_bottom | 0.96 / 4.0 | 2.55 / 19.9 | 0.52 / 3.1 | 1.16 / 8.6 |
| q00 | C_outer_top | 0.77 / 4.4 | 2.03 / 17.2 | 0.83 / 3.0 | 2.37 / 20.0 |
| q03 | A_outer_right | 0.83 / 3.9 | 2.22 / 14.2 | 1.29 / 6.4 | 2.42 / 16.6 |
| q03 | A_outer_left | 0.91 / 4.3 | 2.90 / 20.8 | 2.93 / 17.9 | 3.14 / 28.3 |
| p06 | A_outer_top | 2.23 / 5.7 | 3.32 / 27.0 | 3.03 / 28.7 | 0.90 / 8.7 |
| p06 | A_outer_right | 1.80 / 4.2 | 3.04 / 20.4 | 2.41 / 20.5 | 3.17 / 17.8 |

| pose | cobalt shards (self-segmented) L / sd / B-R | twin | reference | round 10 | round 11 |
|---|---|---|---|---|---|
| q00 | shards | 133 / 22.7 / 96.8 | 138 / 20.6 / 95.4 | 133 / 16.3 / 100.9 | 128 / 14.9 / 108.5 |
| q03 | shards | 122 / 21.7 / 90.6 | 134 / 18.9 / 96.9 | 139 / 16.8 / 91.5 | 128 / 13.9 / 93.4 |
| p06 | shards | 122 / 24.6 / 95.0 | 128 / 22.7 / 97.2 | 130 / 18.2 / 113.1 | 128 / 15.8 / 104.7 |

Notes on the tables: the outline numbers of round 11 are inflated where a cobalt shard crosses the ring outline in the
silhouette capture (`WORK/r11/cmp3/q03_s40_sil_left.png`); the twin's come from its object index (rings only); the
reference and round-10 outline columns use the gradient tracker, which is only clean for q00's top arc of ring B. The
outline itself is the chiselled polyline (`WORK/r11/cmp3/q00_s22_sil_top.png`). The shards were not changed in this step;
their measured B-R follows the bluer ice in front of some of them.

## Open issues (for the judges / the fixer)
1. Frost texture and facets: the twin's bands are frosted slabs with a fine cloudy texture and soft facets; ours are
   clearer with smoother, rounder patches with sharper edges ("liquid glass", strongest on ring A at q03). Tried without
   success: facets from the displacement's own cell plateaus (s28, `uR11H`: "cut glass"), a panorama share in frosted
   transmission (s31, `uR11G.w`: no change). The likely cause is Cycles' per-sample microfacet and fine-bump scatter at
   every interface (Noise B with roughness 0.8 is strong at sub-pixel scale), which a single deterministic trace per
   fragment does not reproduce; a stochastic multi-sample trace or a baked frost / normal map (Blender) would be next.
2. Hold (p06): ring B, ring C and the band over the orb are 11-15 L too light and too neutral against the twin, a
   regression from round 10 for ring B. A lower orb gain in the hold fixes B / C / the band but darkens ring A's top arc
   (s43), so the cause is geometric: ring B's band sees the orb through its whole height (debug s30), the twin only
   through its upper part. Debug view 7 (`uR11Dbg` 7) shows the impact parameters.
3. q03: rings A / B still 4-5 L lighter and 5 B-R less blue than the twin; lower lobe growth (uR11B.x 2) fixes them but
   doubles the face-on contrast at q00 (s26).
4. Dark rim lines weaker than the twin's after the calming changes: q00 band A 31 / 21 L (twin 45 / 32, F000 38 / 45),
   q03 band D 14 / 3 (twin 50 / 36, F045 16 / 25).
5. Faces at q00: rings C / D sd 25 vs the twin's 20 / 18 (F000 21 / 30).
6. The hold orb keeps its plasma (sd 38 vs the twin's 30 and F420's 15); at rest the orb is on F000 / F045.
7. Shards (T9) untouched: B-R 108 / 93 / 105 at q00 / q03 / p06 (twin 97 / 91 / 95).
8. Ring A's in-plane phase at rest is the hold lane's (lead decision a); the joints follow any pose.
9. T0 keeps the round-10 hero (budget); a cheaper round-11 path for T0 would need a different design (no trace).

## Gate I-G3 frame time
- T1, GPU-synced frame cost (`WORK/tools3/frame_cost3.mjs`: one page, lane `?ice=r10` and lane default alternating over
  8 rounds, each sample 30 frames rendered with a 1-px readback, frozen q00 / p06; `WORK/r11/fc42_T1.txt`): round 10
  25.5 / 29.6 ms, round 11 24.4 / 28.0 ms, i.e. x0.957 / x0.946 (round 11 skips the back-depth pass and the round-10
  march). Earlier runs of the same tool: x0.95-1.04 for the final trace settings, x1.03-1.06 before the cost knob
  (`WORK/r11/fc39_excl.txt`).
- T0 keeps the round-10 hero, so its code path is identical to the baseline's (proved by the T0 way-back capture above);
  the round-11 trace would have cost x1.26-1.45 there (`WORK/r11/fc41_T0.json` run, batch s41).
- perf_probe pairs as the lead asked (SLOT_BG=0, interleaved baseline :5173 / lane :5176, same tier, scale 1, 1440x766,
  1-min load below 6; `WORK/tools3/perf_ab.sh`, results `WORK/r11/perf_ab/`, summary by `WORK/tools3/perf_sum.py`):
  six pairs per tier, 24 runs, every run started at a 1-min load of 2.7-5.9 (20 of them while the env / hold lanes held a
  slot: this machine was shared all morning).

| tier | phase | pairs | fps base (median) | fps ice (median) | ice / base fps, median of pairs | frame ms base / ice | worst frame base / ice (ms) |
|---|---|---|---|---|---|---|---|
| T0 | rest | 6 | 60.1 | 60.0 | 0.999 (min 0.90, max 1.00) | 16.6 / 16.7 | 17 / 33 |
| T0 | hold | 6 | 60.1 | 60.1 | 1.000 (min 0.61, max 1.43) | 16.6 / 16.6 | 50 / 50 |
| T0 | collapse | 6 | 60.2 | 60.1 | 1.000 (min 0.67, max 1.46) | 16.6 / 16.6 | 50 / 50 |
| T1 | rest | 6 | 28.4 | 27.8 | 0.978 (min 0.57, max 2.63) | 35.2 / 36.0 | 83 / 83 |
| T1 | hold | 6 | 23.0 | 37.3 | 1.354 (min 0.64, max 2.41) | 43.5 / 26.8 | 83 / 83 |
| T1 | collapse | 6 | 32.1 | 39.8 | 1.251 (min 0.49, max 1.85) | 31.2 / 25.1 | 67 / 67 |

  Medians: T1 rest x0.978 fps (35.2 vs 36.0 ms, +2 %), hold x1.35 and collapse x1.25 (round 11 faster); worst frames
  equal (83 / 83, 83 / 83, 67 / 67 ms). T0 x1.00 in every phase (vsync-capped at 60 fps; the code is identical). The
  per-pair ratios spread from 0.49 to 2.63 at T1 and from 0.61 to 1.46 at T0, where both sides run the same code, so a
  single pair says nothing here; the medians and the GPU-synced frame cost above agree that round 11 is not slower.

## Housekeeping
- Typecheck in `retrux-web`: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.hero.json`: 0 errors (no file
  outside the engine was touched, so `-p .` was not needed).
- Every Chrome / Playwright run went through `$SP/slot/slot.mjs` (timing runs with `SLOT_BG=0`); no Blender ran in this
  step; nothing was committed, deployed or uploaded; no .blend was opened. My lab on :5176 is stopped at the end; MAIN's
  :5173 was only read from.

---

# Fix round after judge 1 (15 Nov, two fixer attempts: 10:06-11:08 cut off by the usage limit, then 13:56-16:55)

`WORK` = `$SP/work/ice`. Every batch, number and decision: `WORK/LOG.md`, section "Fix round" (first attempt batches
`WORK/fix/f01`-`f17`, second attempt `WORK/fix2/g01`-`g17`, final captures `WORK/fix2/cap/`, statistics `WORK/fix2/stats/`,
crops `WORK/fix2/look/`, tools `WORK/fix/tools/`, `WORK/fix2/tools/`). The judge's own tools were used for every final
number (`WORK/judge1/tools/`: jshoot, jstats, jstep, jrim, jseq, jstep_seq, mcres, probe_interact_q, frame_cost_j1, perf
scripts), so the numbers below compare directly with `WORK/judge1/stats/`.

## What changed in this fix round, in one paragraph
Judge 1's camouflage islands were hard per-pixel switches in the trace; they are gone: the trace is continuous (energy
bookkeeping with a soft stop, the light still inside always leaves, one-sided critical-angle ramps widened by the lobe and
by the entry normal's change across the pixel, rounded octagon corners at entry and exit, a filtered frost ramp,
incidence-weighted lobe growth). The hold's white band in front of the orb came from the ice reading the orb's copy (core
16-32) without Cycles' indirect clamp (the artist's file: clamp indirect 10); the orb seen through or off the ice is now
clamped like a Cycles sample, and its sharp sample is blurred by the lobe's footprint at the orb. The light still inside
after the trace takes one more IceColor tint (the twin's internal-reflection zones pass the sky as tint^2), a lower gain
(0.45) and a lookup tilted along the ring's tangent, which deepens the dark rim lines and makes q03 and the tumble
steel-blue instead of pale. The orb's limb is narrowed (first attempt). The shards lose 12 % chroma and gain facet
contrast. Ring A's joints still use the quarters' own cut planes (lead decision 3); no pose was changed.

## Files changed in this fix round (on top of step 2)
- `retrux-web/app/hero/engine/hero/IceMaterial.ts` (round-11 path only; the round-10 code in `#else` is untouched):
  new uniforms `uR11J`, `uR11K`, `uR11L` (first attempt), `uR11M`, `uR11N` (second attempt), each option documented in the
  uniform block and in `r11Uniforms()`; new functions `r11ClampOrb` (Cycles' indirect clamp), `r11OctNormalW` (corner
  rounding per width); `export const ICE_R11A` (`?ice=r11a`). With `?ice=r11a` every new option is 0 and the step-2 values
  come back (proved below).
- `retrux-web/app/hero/engine/hero/Orb.ts` (first attempt, under `ORB_R11`): `uR11OrbC` (limb start / inner end, glass-shell
  band start, hold core glow); the round-11 orb uniforms are now created only when `ORB_R11` is compiled (judge nit).
- `retrux-web/app/hero/engine/hero/Shards.ts` (+26): `SHARD_R11` define and uniform `uR11Sh` (chroma kept, facet value
  range), compiled only when the constructor gets `opts.r11`; without it the shader is the round-10 source.
- `retrux-web/app/hero/engine/HeroEngine.ts` (+4 / -1, SHARED FILE): imports `ICE_R11A, iceR11` from IceMaterial and passes
  `{ r11: iceR11(this.profile.ice) && !ICE_R11A }` to `new Shards(...)`. This is the only new shared-file hunk.
- `Rings.ts` and `RenderPipeline.ts`: unchanged in this fix round (their step-2 hunks stand).

## Switches
- `?ice=r10`: round-10 ice, orb and shards exactly (no ICE_R11, no ORB_R11, no SHARD_R11, back-depth pass on).
- `?ice=r11a`: the round-11 build exactly as judge 1 judged it (every fix-round option 0, step-2 defaults, round-10 shards).
- T0 keeps the round-10 hero (no ICE_R11, ORB_R11 or SHARD_R11).
- Runtime (no rebuild): `__hero.rings.materials[i].uniforms.uR11J..uR11N`, `__hero.orb.material.uniforms.uR11OrbC`,
  `__hero.shards.mesh.material.uniforms.uR11Sh`.
- Final defaults: uR11B (1.5, 1, 0.35, 1), uR11F (0.3, 0.5, 0.15, 0), uR11G (1, 0.5, 0.45, 0), uR11J (2, 3, 1, 1), uR11K (1,
  1.5, 0.03, 1.5), uR11L (0, 1, 0, 1), uR11M (6, 1, 0, 0), uR11N (2, 0, 1, 0); others as in step 2. uR11Orb (0, 0, 1, 0),
  uR11OrbB (1, 0, 0, 0), uR11OrbC (0.4, 0.95, 0.7, 0.9); uR11Sh (0.75, 0.4, 1.22). Options in the code but off: uR11L.x
  (drop after the last wall: black streaks), uR11L.z (trapped light along the last internal direction: crawl, see I-G3),
  uR11M.z / w (frost as roughness: smoother than the twin), uR11N.y (corner rounding per pixel: no gain).

## Assets
- None added; nothing in `retrux-web/public/hero/`. No Blender run in the fix round (the twin's EXR passes were read with
  BPY for linear values).

## Findings, one by one (judge 1's list)
- (a) MAJOR aliased camouflage islands: FIXED. Hard 1-px steps > 15 L per 10k ring px (jstep, `WORK/fix2/stats/
  hardsteps_T1.txt`), twin / F-ref / r10 / judged / now: q00 14.5 / 6.1 / 45.4 / 283 / 47.7, q03 11.3 / 2.1 / 60.3 / 419 /
  73.4, p06 7.7 / 0.0 / 31.5 / 279 / 31.6. T2 (`WORK/fix2/cap/lane_T2`, `hardsteps_T2.txt`) 47.6 / 75.9 / 32.3 (judged
  277 / 433 / 276). Tumble (jseq + jstep_seq, `WORK/fix2/stats/tumble_steps.txt`), lane / MAIN at tau 0.4 / 1.5 / 2.9:
  30.3 / 30.7, 63.0 / 35.7, 27.7 / 33.7 (judged 279 / 332 / 166). Crops: `WORK/fix2/look/final_q03_judged_now_twin_ref.png`,
  `sweep_holdR_judged_now_main.png` (the hold arc's cow-print islands are gone). What remains at q03 are ring outlines over
  other rings (geometry edges, no MSAA, as in round 10) and soft zone borders.
- (b) minor capsule / eyes on band A: gone with (a) (the capsule was the remainder switch; first attempt f02-f13).
- (c) minor dark specks on the p06 arc: REDUCED, not gone. Root cause (`WORK/fix2/look/g08_specks_dbg.png`): tiny islands
  where the first exit wall switches at extrema of the smooth facet field (debug view 2 red dots, view 1 cyan "eyes").
  The pixel-footprint ramp (uR11N.x) and the darker trapped term soften them; a 2-3 px soft dark dot is still visible
  at x ~920, y ~200 in the dump1 p06 pose at 4x.
- (d) MAJOR no frost: PARTLY. The pale, wet "liquid glass" read at q03 and in the tumble is gone (steel-blue zones, soft
  borders, `final_q03_*`), but the twin's fine granular frost and its chiselled facets are not reproduced. Tried and
  rejected (numbers in LOG g05-g07, f16): the fine bump in the trace's entry normal (grain, but steps x1.4-2.7), frost as
  roughness (smoother, sd further below the twin), a band-limited grain modulation (no visible effect), plateau facets
  (steps x2). A real fix needs either a stochastic multi-sample trace with temporal accumulation or a Blender-baked frost
  transmission / normal texture with mips (a filtered texture can carry the grain without aliasing).
- (e) MAJOR values / hue: q03 FIXED, p06 IMPROVED, q00 slightly darker. Ring minus own background (jstats, `WORK/fix2/stats/
  rings_T1.txt`), twin / ref / r10 / now: q03 A -8.9 / -10.1 / -12.5 / -12.4 (dB-R 15.6 / 12.8 / 12.7 / 16.2; judged +0.1 /
  10.4), B -9.8 / -14.9 / -22.7 / -10.8 (13.1 / 12.0 / 15.3 / 11.2; judged -2.8 / 7.6), C 11.8 / -10.4 / -11.2 / 8.9 (1.5 /
  11.6 / 9.4 / 1.0); p06 B -8.3 / -8.9 / -9.5 / -5.0 (dB-R 15.3 / 9.3 / 3.6 / 5.3; judged +0.2 / 0.8), C -2.2 / 3.2 / -12.3 /
  2.3 (8.2 / 0.3 / -0.3 / -0.5; judged 6.4 / -3.1), A -12.7 / -10.7 / -29.6 / -18.1 (judged -12.1: 5 L darker now); q00 A 14.9
  / 3.1 / -7.1 / 2.9, B -7.3 / -10.9 / -33.5 / -15.1, C 14.7 / 6.1 / -7.8 / 14.6, D -4.8 / -22.7 / -11.5 / -0.3. The idle
  loop: steel-blue now (`WORK/fix2/look/g11_q03_judged_b_gz45_gz30_twin_ref.png`). The band in front of the hold's orb is
  pale teal, no longer white (`final_p06_judged_now_twin_ref.png`).
- (f) minor orb: rest limb narrowed (first attempt, f15: q03 orb L / sd 238.5 / 17.2, twin 240.5 / 21.8, F045 240.3 / 19.6).
  The hold orb is still busy: p06 sd 35.7 (twin 29.1, F420 14.6); open.
- (h) minor rim lines (jrim, `WORK/fix2/stats/rims_T1.txt`, core minus line, top / bottom), twin / ref / r10 / judged / now:
  q00 band A 46.2 / 59.0, 36.3 / 50.2, -2.7 / 7.7, 29.0 / 31.0, 23.4 / 40.1; q03 band D 52.9 / 43.2, 31.8 / 19.4, 1.8 / 2.0,
  16.2 / 9.6, 0.9 / 16.5; p06 band B 36.2 / 57.8, 18.5 / 2.3, 1.5 / 7.7, 39.1 / 26.3, 24.8 / 38.4. Bottom lines deeper (q00
  bottom 31 -> 40, F000 50), top lines not (q03 band D's top line is missing).
- Shards (minor): Shards.ts now changed (SHARD_R11): q00 shard B-R 104.7 -> 97.2 (twin 94.6) with the twin-index mask; the
  twin's crystals carry internal streaks ours do not (`WORK/fix2/look/g15_shards_3x.png`).
- Nits: orb uniforms only with ORB_R11 (done, first attempt). The joint seam switching in one frame at the release end
  lives in Rings.ts, which the HOLD lane rewrote; left for the integration (unchanged here).

## Gates re-run
- I-G2: see (e), (h), (d) above. q03 converged (every ring within about 3.5 L / 3 B-R of the twin or between twin and
  F045), q00 between the twin and F000 except ring B (4 L under F000), p06 B / C within about 4 L / 6 L of twin / F420 (B-R
  still 4-10 less blue on B), p06 ring A 5 L darker than the twin; frost and facets still short of the twin.
- I-G3: aliasing: see (a) (q00 / p06 at round 10's level, q03 1.25x round 10; tumble at or below MAIN at tau 0.4 / 2.9, 1.8x
  at tau 1.5). Crawl (judge's mcres on the final tumble, `WORK/fix2/stats/mcres.txt`): 4.84 / 4.08 / 3.98 at tau 0.4 / 1.5
  / 2.9 (Cycles video 4.63 / 4.36 / 5.86, judged 4.10 / 3.79 / 3.66, MAIN 3.72 / 3.12 / 3.10): within the reference's own
  frame-to-frame change except tau 0.4 (+5 %). An intermediate default (uR11L.z 1) had raised it to 6.45 / 5.11 / 5.15 and
  was dropped for that reason (knock-outs with one mask, `mcres_var.txt`). Sweep (stock shoot_sweep, `WORK/fix2/sweep_lane/`):
  no fireflies, seams, holes or bands. T0 sane (= MAIN, below).
  Frame time, T1, scale 1, 1440x766 (all through the slot with SLOT_BG=0):
  * GPU-synced one-page cost (judge's frame_cost_j1.mjs; frozen frame x30 with a 1-px readback, configs interleaved;
    `WORK/fix2/perf/fc*.log`): final vs MAIN (or the mean of MAIN and lane `?ice=r10`, which are the same code) q00 / p06:
    fc1 x1.056 / x1.072, fc2 x1.106 / x1.139, fc4 x1.077 / x1.062, fc5 x1.065 / x1.063 (fc3 x1.00 / x1.00); about +7 %
    (range 0 to +14 %), judge 1 measured +8 % (+4..+12 %) for the judged build. An exact saving went in (the trapped
    lookup is skipped where its weight is 0; frames identical within dither). The cost knobs max walls 4 / stop threshold
    0.12 did not separate from the run-to-run spread (fc5) and were not changed.
  * perf_probe, 6 interleaved pairs, every start at a 1-min load < 6 (`WORK/fix2/perf/T1/summary.txt`, start states in
    `runs.txt`): median ice / base rest 1.003 (59.6 / 59.9 fps, vsync-capped), hold 0.816 (43.7 / 52.2 fps), collapse 0.909;
    worst frame median 33/33, 42/42, 42/33 ms, max 67/67, 83/67, 83/50 ms. Every pair overlapped other lanes' jobs (load up
    to 17; 4 of the 12 runs throttled to 18-31 fps); the uncontended holds were 52-54 fps (base) vs 40-52 fps (ice, median
    ~48), about -9 % fps. Verdict: at the +10 % limit in the hold (GPU-synced +6..+14 %), not clearly inside it. An earlier
    contended set (`WORK/fix2/perf/T1_set1/`, 3 pairs, before the exact saving) agrees.
- I-G4: lane `?ice=r10` vs MAIN at T1, 10 poses + hero-hidden frames (`WORK/fix2/stats/wb_r10_vs_main_T1.txt`): mean 0.08-
  0.87 per 255, max 1, 0 px > 2; inside the hero = outside (q00 0.740 / 0.742, q03 0.692 / 0.696, p06 0.859 / 0.869), and
  MAIN against its own 06:53 capture gives 0.51-0.70 (this session's dither floor); x32 maps `WORK/fix2/look/
  wb_r10_main_q00_p06_half.png`: uniform dither. `?ice=r11a` vs judge 1's lane captures (`wb_r11a_vs_judged_T1.txt`): 0.10-
  0.87, max 1, 0 px > 2. T0 lane vs MAIN (`wb_T0.txt`): mean 0.03-0.85, max 43 on <= 0.0007 % of the pixels, the same in
  the hero-hidden frames (T0's lake specks), r11 / orbR11 false.
- Lead decision 3 / user priority: no pose code changed in this fix round (Rings.ts untouched); probe_interact (judge's T1
  copy + stock T0, `WORK/fix2/sweep_interact.log`): click inert (drivers 0, holding never), errors none, ringDegPerFrame60
  max 15 at the release (the baseline's MAX_TURN cap, the same in MAIN per judge 1). The hold motion itself (the user's
  15 Nov complaint) is the HOLD lane's.
- Typecheck `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.hero.json`: 0 errors (no file outside the engine).

## Still open (for the lead / the next judge)
1. Frost and chiselled facets (d): needs a stochastic trace with accumulation or a Blender-baked frost texture with mips.
2. p06 ring A 5 L darker than the twin and ring B 4-10 B-R less blue; the hold orb's plasma busy (sd 35.7 vs 29 / 15).
3. q03 band D's top rim line missing (bottom on F045); q00 rim lines about 10-20 L short of the twin.
4. The faint p06 speck (c) at x ~920, y ~200.
5. q03 hard steps 1.25x round 10 (ring outlines over rings, no MSAA).
6. Shards' internal streaks (twin) not reproduced.
7. T1 frame time at the +10 % limit in the hold (see I-G3); a cheaper trace (max walls 4, or the frosted lookup only where
   roughness > 0.5) needs a quieter machine to prove.
8. The band in front of the orb at rest: value now on F000 / F045 (q00 218 vs 222, q03 222 vs 218, p06 216 vs F420 210 /
   twin 213, `WORK/fix2/stats/band_over_orb.txt`) but flatter than the twin (q00 sd 11 vs 17 / 22): the clamp flattens the
   plasma's bright sheets seen through the band.
9. Files and the lab: lane lab :5176 stopped by me at the end; MAIN's :5173 untouched. Nothing committed, deployed or
   uploaded; no .blend opened or written in the fix round.
