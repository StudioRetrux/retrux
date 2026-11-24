# Round 11 integration (round 1): ENV + ICE + HOLD merged into MAIN

Integrator, 2026-11-15 19:06-20:20 WIB. MAIN = this repo, branch `hero-round11`, working tree only: nothing was staged or
committed (MAIN's index is unchanged, 0 staged paths, `.git/index` sha ba5387a5 before and after). No deploys or uploads, no
`.blend` touched. `SP` below = `/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad`;
every evidence path is under `$SP/work/int/` unless it says otherwise. The step-by-step log is `$SP/work/int/LOG.md`.

## 1. Result in short

- All three lanes are merged and every lane's new behaviour is the default (lead decision; no switch default was flipped).
- Typecheck: `tsc --noEmit -p tsconfig.hero.json` and `-p .` in `retrux-web`: 0 errors.
- Every lane's approved result is reproduced on the integrated build (section 5). Where the numbers move, the cause is a real
  interaction between lanes, explained in section 5.4.
- Way back: with every round-10 switch at once (`?env=projected&hold=r10&aphase=r10&ice=r10`) the integrated :5173 is
  **bit-identical** to the round-10 baseline :5179 on 26 of 26 pinned shots (max 0 LSB). Each lane's switches restore exactly
  that lane's part (section 6).
- Frame time (section 7): T1 rest within budget (x1.085-1.095 by perf_probe), **T1 hold over budget (x1.28-1.29; budget
  +10 %)**, T0 sane (x1.00-1.02 by perf_probe, near 60 fps). Every lane adds a share; no single switch reliably fixes it
  (`?ice=r10` comes closest). Reported for the lead; the defaults were not changed.

## 2. Round-10 baseline for way-back checks

- Worktree `$SP/lanes/base` (detached at 7ddac0d), `retrux-web/node_modules` symlinked to MAIN's.
- Its lab runs on **:5179, PID 9735** (`cd $SP/lanes/base/retrux-web && PORT=5179 nohup node hero-lab/serve.mjs`, log
  `$SP/work/int/base_lab.log`). It is left running for the verifier.
- Before the merge, its bundle equalled MAIN's :5173 bundle except for 32 path comments (the node_modules symlink).

## 3. What was merged (files per lane)

Applied in the order env, ice, hold. Patches: `$SP/work/int/<lane>.patch` (`git diff --binary 7ddac0d` of each lane; each is
byte-identical to `notes/round11/lane_backup/<lane>.patch`). Handoffs saved as `notes/round11/handoff_<lane>.md`.

**ENV** (`git apply`, clean)
- Changed: `pipeline/render_sky_equirect.py`; engine `HeroEngine.ts`, `assets.ts`, `pipeline/RenderPipeline.ts`,
  `world/PlateEnvironment.ts`, `world/Water.ts`.
- New engine files: `world/EnvEdge.ts`, `world/LakeMirror.ts`.
- New pipeline scripts: `bake_env_m9.py`, `comp_env_m9.py`, `encode_env_m9.py`, `encode_sky_m9.py`, `encode_wisp_m9.py`,
  `finalize_bake_m9.zsh`, `lake_corr_m9.py`, `patch_backfaces_m9.py`, `render_plates_m9.py`, `run_bake_m9.zsh`.
- New assets in `retrux-web/public/hero/` (2.8 MB in all): `env_baked.glb` (1,079,076 B), `env_baked.json`, `baked/*.webp`
  (40 files incl. the `_f1` back-face patches and the `_v9g` way-back textures), `lake_corr.png`, `sky_world.exr`,
  `wisp_card.exr`. Every projected asset is kept.
- 57 untracked files copied in all; each is byte-identical to the lane's.

**ICE** (`git apply`, clean on top of env: HeroEngine.ts hunk 2 offset 45 lines, RenderPipeline.ts hunk 2 offset 6 lines)
- Changed: `hero/IceMaterial.ts`, `hero/Orb.ts`, `hero/Shards.ts`, `hero/Rings.ts`, `HeroEngine.ts`,
  `pipeline/RenderPipeline.ts`. No new files, no assets.

**HOLD** (`git apply --include` for the clean files, `git merge-file` for the two overlaps)
- Changed: `CameraRig.ts`, `Choreography.ts` (both applied cleanly), `hero/Rings.ts` and `HeroEngine.ts` (three-way merges,
  below).
- New engine file: `hero/HoldR11.ts`. No assets.

**MAIN-side changes made by the integration**
- `hero-pipeline/validate/shoot_qc.mjs`, `shoot_pointer.mjs`, `shoot_sweep.mjs`, `shoot_holdseq.mjs`: the page URL takes an
  optional extra query string, `${process.env.QS ? "&" + process.env.QS : ""}` after `debug=1` (no change without `QS`).
- `shoot_pointer.mjs` also restores `uPlateDepthOn` to the value it read at the spot instead of forcing 1 (the ENV handoff's
  note 4: with `?envlake=mirror` the uniform is legitimately 0). The value is 1 at all 10 spots of the default build, so the
  default capture is unchanged.
- `notes/round11/`: this file, `handoff_env.md`, `handoff_ice.md`, `handoff_hold.md`, refreshed `lane_backup/` (patches,
  untracked deliverables as `.tgz` without EXR / blend / captures, LOG and HANDOFF copies).

Checks after the merge: every lane-only file is byte-identical to its lane; in the shared files every line any lane added is
present and every line a lane removed is gone (one exception that is not one: `for (const p of this.pieces) {` occurs 6 times
in base, the hold lane rewrote one and the ice lane added one).

## 4. Conflicts and their resolutions

| file | lanes | what happened | resolution |
|---|---|---|---|
| `RenderPipeline.ts` | env, ice | Both applied cleanly. ENV adds the `afterEnv` hook right after the environment pass (EnvEdge); ICE skips the ring back-depth pass when the round-11 ice runs. | Kept both. The file equals `git merge-file(env, base, ice)` with 0 conflicts. EnvEdge arms itself for the first render into the main target after the environment pass; with the back pass skipped that is still the rings' far half, as before. |
| `HeroEngine.ts` | env, ice, hold | env + ice applied cleanly (equal to their merge-file result). Hold: one textual conflict, the two adjacent new import lines (`./hero/IceMaterial` from ice, `./hero/HoldR11` from hold). | Kept both imports. All other hunks merged cleanly: env's LakeMirror / bake-depth gate / EnvEdge, hold's ring wiring (`holdMode`, `rings.camera`, `aLoopPhaseDeg`), ice's `Shards` option, hold's `holdFit` scaling of the lift, `uHold`, `uFogHold`. |
| `hero/Rings.ts` | ice, hold | 0 conflicts (`git merge-file` result = `git apply` result). Ice adds `pieceCutAngles`, `uPieceCuts` per piece and a seam fade keyed on how far a piece's pivot has left its rest place; hold rewrote the hold motion (rotating hold, `poseSpin` puts the opening into `p.pivot.position`). | Both kept. They connect by construction: the hold's opening moves the pivots, so the ice's seams fade on opened A / B pieces (`uPieceCuts.w` 0 on all A / B pieces at p06, 1 on C / D, 1 at rest; jshoot logs). The fade loop runs after the per-piece loop, so hold's `continue` does not skip it. |
| `pipeline/*.mjs` validators | (none) | No lane touched MAIN's macOS-ported validators or probes. | Nothing to do; the ports are untouched. |

## 5. Verification on the integrated :5173 (T1, scale 1, 1440x766, all through the slot; outputs in `$SP/work/int/r1/`)

### 5.1 Stock validators (looked at every frame)
- `shoot_qc` all poses + ui (`r1/qc`): no page errors, no console errors or warnings. The hold drivers read as the rotating
  hold (p06: spin 0.25, spreadA 0.988, cdSpin 1). Looked at `cmp_q00_rest.jpg`, `crop_q00_rest_hero.jpg`, `cmp_p06_sustain.jpg`,
  `sheet_a.jpg` (q01, q02, q03, p04), `sheet_b.jpg` (p05, p07, p08, ui): one environment, one summit wisp, floe reflection
  columns, the UI overlay intact.
- `shoot_pointer` 10 spots (`r1/ptr`, sheets `r1/ptr/sheet_1..3.jpg`): no page errors; all ten views clean (no doubled ridges,
  holes, bands or hairlines at sheet scale).
- `shoot_sweep` (`r1/sweep/sweep.jpg`, plus full-size `sw_hold_L.png`, `sw_hold_TR.png`): no page errors; 34 frames (intro,
  hold / pop / release at the pointer extremes, 8 tumble phases) without black frames, doubles or bands.
- Tier spot checks (`r1/tiers/tiers_sheet.jpg`): T0 (round-10 ice by design) and T2 (round-11 ice) load without errors.

### 5.2 Live hold sequence F332-F472
`$SP/work/hold/tools/spin_probe.mjs` with real pointer events in exact 1/60 s steps, press at tau 2.6, release at F443, a
shot every 4 reference frames (`r1/hold/seq`). Sheets `r1/hold/seq_sheet_1..6.jpg` (engine row over reference row; F332-352,
356-376, 380-400, 404-424, 428-448, 452-472), all looked at: the tumble slows and keeps turning, the lunge lands at the
reference's time, the four-arc frame forms round the core at F436-F444, the release pulls back to the rest view and the rings
close into the tumble without a snap. At this press phase ring A is near edge-on round F420 (the hold lane measured the same:
its tau-2.6 row), so F404-F424 read nested rather than as the reference's open frame.

### 5.3 Each lane's key measurements, on the integrated build

**ENV (E-G1 region boxes; judge1's `qc.mjs`, pinned clock DETT=100, `r1/env`, boxes `r1/env/an/eg1_*.json`)**
- Integrated default vs integrated `?env=projected` (same hero in both): every box within ±1.50 levels at q00 and q03 (worst
  far_floes_right -1.43 / -1.50, far_floes_left -0.98, massif_base +0.54; lake boxes -0.43..+0.03; corners within 0.03).
- Box by box against the ENV lane's final `eg1v2_q00_t100` / `eg1v2_q03_t100`: largest difference 0.06 / 0.01 levels (the
  same with the other lanes switched to round 10).
- Pixels outside the hero zone: the integrated "env only" frame vs the lane's own final capture: mean 0.41 / 0.50, max 1;
  integrated all-round-10 vs the lane's baseline capture: 0.46 / 0.50, max 1.
- Diff map above y 440 without the shard zone: px > 8 / > 20 = 1692 / 350 (lane 1698 / 350). Looked at
  `r1/env/an/dmap_q00_def_vs_proj.png`: drifting shards, texture grain, 1-px silhouette outlines, the wisp card's soft blob and
  the faint dashed lake row, all known from the ENV handoff; the rings themselves show no difference.

**HOLD (H-G1 shape rows; the hold judge's `jshape.mjs` + `shape_an.py` + the lane's `an_sum.py`, 16 live press moments tau
0-3.75, `r1/hold/shape16_*`)**

| 16 presses (sustain t 1.37-3.77 s) | hold lane final | integrated `?ice=r10` | integrated default |
|---|---|---|---|
| A clearance from the orb, median / p75 | 11 / 78 px | 11 / 78 px | 17 / 85 px |
| samples A >= 100 px clear / A over the orb | 9 % / 48 % | 9 % / 48 % | 16 % / 45 % |
| A / B overlap median; samples < 5 % | 14.6 %; 21 % | 14.6 %; 21 % | 13.3 %; 29 % |
| 4th-smallest gap between A's quarters | 60 px | 60 px | 66 px |
| F420 width / height within ±30 px of 782x634 | 8 / 3 of 16 | 8 / 3 of 16 | 8 / 4 of 16 |
| F440 width / height within ±30 px of 800x740 | 9 / 4 of 16 | 9 / 4 of 16 | 8 / 1 of 16 |
| bounds over all samples (L T R B) | 294 14 1142 750 | 294 14 1142 750 | 306 24 1134 740 |

- With `?ice=r10` the integrated build reproduces the lane: 222 of 272 samples identical in every metric, the rest within 2 px
  / 0.1 % (the camera's idle sway follows the wall clock, as the hold handoff documents). Per-press rows for F358, F404, F420,
  F440, F452 and F460 are in `r1/hold/shape16_def_sum.txt`.
- The H-G1 key frames, medians over the 16 presses (`r1/hold/keyframes.txt`; F404 and F452 are the spec's nearest samples to
  F402 and F453):

  | frame | hold lane final: extent, orb visible, A clear, A/B overlap | integrated `?ice=r10` | integrated default |
  |---|---|---|---|
  | F358 | 397x371, 48.3 %, -24 px, 29.9 % | 397x371, 48.4 %, -24 px, 29.9 % | 384x359, 53.5 %, -20 px, 27.9 % |
  | F404 | 760x633, 46.8 %, 14 px, 17.8 % | identical | 737x613, 49.8 %, 20 px, 15.5 % |
  | F420 | 769x670, 50.5 %, 17 px, 13.0 % | identical | 751x647, 54.1 %, 22 px, 9.8 % |
  | F440 | 786x676, 43.4 %, 26 px, 12.2 % | identical | 766x651, 46.8 %, 32 px, 10.7 % |
  | F452 | 756x653, 36.0 %, 19 px, 12.3 % | identical | 739x631, 39.7 %, 24 px, 9.7 % |

**ICE (I-G2; the ice judge's `jshoot.mjs` with every clock pinned to the twin's dump, `jstats.py` / `jrim.py` / `jstep.py`,
`r1/ice`, tables `r1/ice/an/`)**
- In the ice lane's own configuration (`?hold=r10&aphase=r10&env=projected` on the integrated build) the final numbers come
  back: ring minus own background per ring within 0.2 levels in L and 0.4 in B-R at q00 / q03 / p06 (ring D's 500-pixel
  sliver at p06: 0.8 / 0.6);
  rim lines identical (q00 band A 23.4 / 40.1, q03 band D 0.9 / 16.6, p06 band B 24.8 / 38.4); hard steps per 10k ring px
  45.5 / 76.6 / 31.1 (lane 47.7 / 73.4 / 31.6; the shard masks vary per capture).
- Integrated default at q00 / q03: rings B, C, D and the orb within 0.4 levels of that; ring A at q00 dL 1.0 (ice-only 2.8,
  twin 14.9, F000 3.1), q03 -12.7 (-12.4); rim lines q00 band A 24.3 / 30.4; hard steps 45.0 / 80.5 at q00 / q03.
- Side by sides `r1/ice/an/q00_twin_lane_int_ref.jpg`, `q03_twin_lane_int_ref.jpg` (twin | lane final | integrated |
  reference), looked at: the integrated ice reads like the lane's final.

### 5.4 Differences between the integrated build and the lanes' own results, and why they are legitimate
1. **Ice x hold, ring A's phase.** The hold lane turns ring A by -22.5 deg at rest so its quarter joints sit where F000's are.
   The ice lane measured with the round-10 phase and its Cycles twin was rendered at that phase. The ice pattern and joints of
   ring A now turn with it, so ring A's q00 numbers move (dL 2.8 -> 1.0) while B / C / D do not. An exact ring-A comparison
   needs a twin re-render at the new phase (open item).
2. **Ice x hold, silhouettes.** The round-11 ice displaces the rings by Blender's own amplitude instead of round 10's x1.35,
   so every ring silhouette is about 15 px smaller in the hold. The hold's shape rows move with it: A's clearance and the
   overlap improve, the F440 heights drop from 4 to 1 of 16 within ±30 px.
3. **Ice x hold, p06.** The ice lane's p06 numbers belong to the round-10 hold pose (the twin's masks). The default hold is
   now the rotating hold, so p06 statistics against those masks are not comparable; they reproduce exactly with `?hold=r10`.
4. **Ice x env.** The new ice refracts the baked environment instead of the projected one: rings B / C / D move by 0.4 levels
   or less at q00 / q03.
5. **Hold x env.** The hold lane scales the environment's `uHold` / `uFogHold` and the hero lift by `rig.holdFit`, exactly 1
   on landscape screens, so the baked environment's hold look is unchanged at 1440x766, 1280x800 and 1920x1080. The baked
   path shares that grade with the projected path, so the portrait fix carries over: a 6 s live hold at 390x844
   (`r1/post/p390_sheet.jpg`, t 0 / 2 / 4 / 6 / 7 s) keeps the foreground rocks textured (the hold lane's own "before"
   capture had them flat grey) and the opened arcs inside the narrow frame.
6. **Ice x hold, the joint seams at the end of a release** (the ice lane left this item for the integration). Measured with a
   live press and release in exact 60 Hz steps (`tools/seam_probe.mjs`, presses at tau 2.6 and 1.0, 4 s holds,
   `r1/post/seam_*.json`): during the hold every A / B seam weight is 0 and C / D stay 1; after the release ring A's seams stay
   off until frame 22 (0.37 s) and return over 4 frames (largest step 0.5-0.6 of the seam per frame), ring B's over 9 frames
   (step 0.26). It is a short fade, not a one-frame switch, but ring A's is quick (open item).

## 6. Way back (all round-10 switches) and each switch alone (`r1/wb`, the hold judge's `jcmp2.mjs`: loop stopped, time,
tumble clock, orb plasma and grain pinned, shards hidden, two renders per shot)

| comparison (A = baseline :5179, B = integrated :5173) | result |
|---|---|
| B `?env=projected&hold=r10&aphase=r10&ice=r10` | **26 / 26 shots bit-identical** (mean 0.000, max 0): q00-q03, 9 pointer spots, p04-p08, live presses F358 / F420 / F453 / F460 at tau 1.1 and 3.3 |
| B `?hold=r10&aphase=r10&ice=r10` (env lane only) | differences only in the environment: mean 0.65-1.03 at rest and the pointer spots, 0.48-0.54 in the hold poses; ring states identical; diff maps `x_env/D_q00_p06.jpg` show environment structures only |
| B `?env=projected&hold=r10&aphase=r10` (ice lane only) | ring states identical; differences only on the hero and its lake reflection (mean 0.99-1.88 at rest, 1.95-4.08 in the hold poses); `D_xice_xhold.jpg` top row |
| B `?env=projected&ice=r10` (hold lane only) | at rest and at the pointer spots only ring A differs, turned exactly 22.50 deg (mean 0.20-0.35, max 82-122, the hold lane's own H-G5 numbers); the hold poses and live presses differ as designed; `D_xice_xhold.jpg` bottom row |

## 7. Frame time (step 9)

Method: MAIN's `perf_probe.mjs` (1440x766, `tier=<T>&scale=1`, rest 5 s, hold `pose("expand", 2.97)` 5 s, collapse 3 s), 6
interleaved A/B pairs per tier (A = integrated :5173, B = baseline :5179, order AB / BA alternating), every run through the
slot with `SLOT_BG=0` and started only at a 1-min load below 6 (3.7-5.9). Runs `r1/perf/runs_T1.txt`, `runs_T0.txt`;
summaries `summary_T1.txt`, `summary_T0.txt` (`tools/perf_sum2.py`). Two caveats: macOS Low Power Mode was on (the user's
setting; it throttles both builds alike, so absolute fps are low and only the A/B ratios matter), and from 19:40 the lead's
parallel P2b lanes (water, rings) ran their own headless captures and a Blender job in the slot's second place
(`r1/perf/slot_holders.log`), so runs are flagged clean or contended. One integrated run hung on exit after printing all its
numbers (killed, data complete).

| tier | phase | median fps integrated / baseline | frame time integrated / baseline, per-pair median (all 6 pairs) | clean pairs only | worst frame median, integrated / baseline |
|---|---|---|---|---|---|
| T1 | rest | 30.4 / 33.1 | **x1.095** (range x1.06-1.15) | x1.085 (3 pairs) | 58.4 / 58.4 ms |
| T1 | hold | 24.7 / 29.5 | **x1.282** (range x1.06-1.47) | x1.288 (3 pairs) | 66.8 / 66.7 ms |
| T1 | collapse | 31.0 / 29.5 | x0.938 | x0.942 (3 pairs) | 50.1 / 58.3 ms |
| T0 | rest | 55.9 / 59.9 | x1.021 | x1.000 (1 pair) | 33.4 / 25.1 ms |
| T0 | hold | 52.8 / 58.0 | x1.018 | x1.069 (1 pair) | 41.8 / 25.1 ms |
| T0 | collapse | 58.6 / 59.7 | x1.003 | x1.005 (1 pair) | 33.4 / 25.1 ms |

- Worst single frames: T1 83.4 / 83.3 ms (hold), T0 266.6 / 283.4 ms (both inside the contended T0 runs during the foreign
  Blender job). No page errors in any run; every run reported its requested tier at scale 1.
- **T1 rest is within the +10 % budget (x1.085-1.095), T1 hold is not (x1.28-1.29).** The hold's extra cost is the sum of
  the lanes' own hold costs, each of which was measured near its own limit: ENV -6 % fps (EnvEdge +2.3 %), ICE -9..-18 % fps
  (GPU-synced +6..+14 %), HOLD -5..-8 % fps (render cost +2.7 %; the opened set covers more of the screen). See the attribution
  below.
- T0 is sane: per-pair medians x1.00-1.02; 11 of its 12 runs were contended, so the T0 numbers are weak evidence; the
  attribution below measures T0 without vsync.

**Attribution (GPU-synced cost of one frozen frame, no vsync).** The ice judge's `frame_cost_j1.mjs`, copied as
`tools/frame_cost_all.mjs` to print every sample: each sample renders the frozen frame 30 times with a 1-pixel readback,
configurations interleaved over 4 rounds (order reversed every other round), 1440x766, scale 1, through the slot with
`SLOT_BG=0`, no foreign slot holder, load 3.4-5.3 (`r1/perf/fc_attr2.log`, `slot_holders_fc2.log`). Median of 4 samples /
minimum, ms:

| configuration | rest q00 | hold p06 |
|---|---|---|
| T1 baseline :5179 | 25.6 / 25.0 | 31.2 / 29.5 |
| T1 integrated | 32.2 / 30.3 (x1.26 / x1.21) | 39.6 / 38.4 (x1.27 / x1.30) |
| T1 integrated `?ice=r10` | 30.4 / 29.2 | 35.7 / 32.1 |
| T1 integrated `?hold=r10` | 30.8 / 29.2 | 38.8 / 35.9 |
| T1 integrated `?env=projected` | 30.6 / 28.2 | 36.8 / 33.3 |
| T0 baseline :5179 | 13.8 / 12.6 | 17.5 / 16.4 |
| T0 integrated | 15.3 / 13.9 (x1.11 / x1.10) | 20.5 / 17.7 (x1.17 / x1.08) |
| T0 integrated `?hold=r10` | 14.7 / 14.5 | 19.3 / 18.0 |

- Every lane adds a share of the T1 cost (in the hold: ice about 4-6 ms, environment 3-5 ms, hold 1-2.5 ms). With any one of
  them switched off the hold still costs x1.14-1.24 of the baseline by medians (x1.09-1.22 by minima), so **no single switch
  reliably brings the T1 hold back inside +10 %**; `?ice=r10` comes closest (x1.14 / x1.09). Samples spread by about ±5 ms per
  configuration, so the split between lanes is approximate.
- The rendering work at rest also grew (x1.21-1.26 here), which perf_probe's frame rate shows only as x1.09 at rest; the
  SPEC budget names perf_probe, by which T1 rest passes and the T1 hold fails.
- A first attribution run (`r1/perf/fc_attr.log`) was discarded: a foreign Blender job pushed the 1-min load to 19-24 during it
  and its integrated-T0 reading (59.5 ms) contradicted every other measurement.
- perf_probe pins `scale=1`; the live site's adaptive render scale lowers the T1 resolution under load instead of the frame
  rate, which softens but does not remove the regression.

## 8. Switches and defaults (integrated build)

| switch | default | what the switch does |
|---|---|---|
| `?env=` | baked (v9 bake, real geometry) | `projected`: the round-10 projected plates (way back); `baked`: insists on the bake |
| `?envlake=` | plate (re-aimed plate lake on the baked environment, every tier) | `mirror`: the planar mirror lake (opt-in; loses the floe columns, 1.21x frame time with a moving camera); `plate`: the default |
| `?envfix=0` | off | ENV step 2 exactly (mirror lake at T1 / T2, step-2 textures, no EnvEdge, no resize refresh) |
| `?envedge=0` | EnvEdge on (T1 / T2 with the baked environment) | no depth-edge softening |
| `?envtex=s2` | `_f1` textures (back faces patched) | step 2's textures |
| `?envwisp=0` | wisp card on | step 1's textures with the wisp baked in, no card |
| `?envlakecorr=0` | far-water correction on (mirror lake only) | no correction |
| `?envmirrorrate=1` | mirror reuse at T1 (mirror lake only) | mirror rendered every frame |
| `?envlod=bias` | textureGrad DOF emulation | v8's mip-bias sampling |
| `?envside=front` | baked meshes double-sided | back-face culling, as v8 |
| `?hold=` | `r11`, the rotating hold (fix round 2) | `r10`: the round-10 hold, camera springs, lift and ring A phase (bit-identical); `r11a`: the step-2 A2 key-frame arrangement |
| `?spin=s3` | off | the step-3 rotating hold before fix round 2 |
| `?aphase=r10` | ring A phase -22.5 deg | ring A's round-10 in-plane phase only (`?hold=r10` implies it) |
| `?ice=` | round-11 ice, orb and shards at T1 / T2 (T0 always keeps round 10) | `r10`: the round-10 ice, orb and shards exactly; `r11a`: the round-11 build judge 1 saw |

All-round-10 way back: `?env=projected&hold=r10&aphase=r10&ice=r10` (section 6).

## 9. Open issues

From the lanes (unchanged by the merge):
- ENV: T0 skylines are raw aliased mesh edges; a pale floe tip cut by the bottom edge in phone portrait (pre-existing);
  faint dashed row on the lake, 1-px silhouette outlines in diff maps; GPU memory holds the bake plus all plates.
- HOLD: A2's opened-shape rows cannot all pass while ring A keeps its tumble (A never faces the hold camera; at some press
  phases the set reads nested, as at tau 2.6 above); the orb reads as a bright disc where no ring covers it; shards fly
  through the opened set; C / D return to their idle nod about 1 s after the release; narrow portrait gets little hold zoom.
- ICE: no frost texture (needs a Blender-baked frost / normal texture); p06 ring A 5 L dark and ring B less blue (measured on
  the round-10 hold pose); busy hold-orb plasma; shallow top rim lines; a faint p06 speck; q03 hard steps 1.25x round 10
  (1.36x on the integrated default with ring A's new phase); T1 hold frame time at the +10 % limit by the lane's measure.

From the integration:
- **T1 frame time in the hold is over budget: x1.28-1.29 of the baseline by perf_probe (budget +10 %); T1 rest passes at
  x1.085-1.095.** Every lane contributes (section 7) and no single switch reliably restores the budget (`?ice=r10` comes
  closest, x1.09-1.14 in GPU cost, at the price of the approved ice), so the defaults stay as the lead decided; options for
  the lead: a cost pass on the round-11 ice trace (its own handoff lists max walls 4 and a stop
  threshold), `?envedge=0` (about 2 % in the hold), a cheaper or smaller hold opening, or accepting the adaptive render scale
  at T1. The measurements ran in macOS Low Power Mode and beside the lead's parallel P2b lanes; a quiet-machine re-run would
  firm up the numbers.
- T0 costs x1.08-1.17 the GPU time per frame of round 10 (it still renders near 60 fps by perf_probe); with `?hold=r10` it is
  x1.07-1.15, so the rotating hold's share at T0 is within the noise and most of it is the baked environment.
- Ring A's joint seams return over 4 frames at the end of a release (section 5.4, item 6). Widening the fade in
  `Rings.ts` (smoothstep 1e-4..0.03 m of pivot travel, e.g. to 0.15 m) would spread it over roughly 10 frames.
- The Cycles twin was rendered with ring A's round-10 phase and the round-10 hold. A twin of the integrated rest (ring A at
  -22.5 deg) and of the rotating hold would let the ice be matched where it is now seen.
- The silhouettes shrank with the round-11 displacement, so the hold's F440 extents match the reference less often (1 of 16
  heights within ±30 px instead of 4); a hold re-tune or a slightly larger hold displacement would bring them back.
- macOS Low Power Mode was on during every measurement (the user's setting).

# ATMOS merge (P2c, 17 Nov 2026; integrator `merge:atmos`)

22:00- WIB. Working tree only: nothing staged or committed (MAIN's `.git/index` sha ba5387a5, 0 staged paths, before and after).
`W` below = `$SP/work2/merge_atmos` (step log `W/LOG.md`, every output of this merge). No deploys, uploads or `.blend` writes;
:5173 and :3000 kept running (:5173's esbuild watch rebuilt at 22:04:56).

## A1. What was merged

The lane's state: the build (attempts 1-3) plus fix round 1 (attempts 1-3). The fixer was cut off at 21:38 when the machine went
into heavy swapping (load 550) and returned no result, so the workflow went straight to this merge: **judge1's FAIL 7.6 is the
only verdict; fix round 1 is verified by the fixer (HANDOFF F3 / F4) but not re-judged, and its frame time (F5) was never
measured** (see A5).

`diff -rq BASE LANE` (without node_modules, .git, dist, .next, __pycache__, .DS_Store, tsbuildinfo): 4 paths. MAIN had moved
since BASE only by the RINGS merges (engine README.md, CameraRig.ts, Choreography.ts, HeroEngine.ts, hero/HoldR11.ts, Rings.ts,
Shards.ts) and notes / pipeline scripts; the WATER lane is not in MAIN yet.

| file (retrux-web/app/hero/engine/) | MAIN since BASE | action | result in MAIN |
|---|---|---|---|
| `world/Atmos.ts` | new | copied | = lane (sha 60eecea) |
| `world/PlateEnvironment.ts` | unchanged (= BASE, de62735) | lane's file copied | = lane (7594ce4) |
| `HeroEngine.ts` | changed (RINGS) | `git merge-file -p MAIN BASE LANE`: **0 conflicts** | MAIN + 2 lines after `u.uTime.value = s.time;`: `this.env?.updateAtmos(s.time);` (81f836c) |
| `LANE/HANDOFF.md` | | saved as `notes/round11/handoff_atmos.md` | (1e13dcb) |

No assets and no pipeline scripts came with the lane (its tools stay in `$SP/work2/atmos`). MAIN's previous copies:
`W/mainbak/`; hashes `W/sha_before.txt`, `W/sha_after.txt`.

## A2. Conflicts and resolutions

No textual conflict. Checked by reading both sides:
- **Clock.** `updateAtmos(s.time)` takes the engine's real clock (`s.time += dt` per frame). The RINGS merge's slow motion runs on
  the rings' own clock and `d.spin`, not on `s.time`, so the clouds keep the reference's real-time drift through the hold (the
  reference does not slow them: ~7.5 px/s over F382-F440, atmos LOG 20:10), while rings and shards slow down as the RINGS lane
  built it.
- **WATER lane (merges after this).** It changes `HeroEngine.ts`, `assets.ts`, `world/LakeMirror.ts`, `world/Water.ts` and adds
  `LakeHeight.ts`, `LakeSchedule.ts`; it does not touch `PlateEnvironment.ts`. Its `Water.ts` still includes `GLSL_COMMON` before
  `GLSL_PLATE_MIST` and still calls `plateMistWisp`, so the atmos lane's shared band chunk (`ATMOS_STEADY_WISP`, `ATMOS_BERG`,
  which use `fbm` / `hash12` from `GLSL_COMMON`) keeps working on the water. For the water merge: `HeroEngine.ts` must keep the
  atmos line above (3-way merge); the planar mirror should reflect the live cloud cards (they carry `uCloudShift`) and the card
  light has a mirror-pass path (handoff_atmos F2).

## A3. Switches added by this lane (all off with `?atmos=r10`)

| switch | restores |
|---|---|
| `?atmos=r10` | everything of this lane (= MAIN before this merge) |
| `?atmosclouds=0` | the old unbounded cloud drift with sway / breath / boil, 6 cards, no F000 fit (also drops wind, card light, range) |
| `?atmoscloudfit=0` | the conveyor with the `.blend` card positions at t = 0 |
| `?atmoscloudsoft=0` | crisp cloud cards |
| `?atmosmist=0` | the old breathing fog / band field, no ground mist (implies `?atmosgrade=0`; also drops mist3, berg, swell) |
| `?atmoswisp=0` / `?atmoswisp=gust` | the integrated static summit wisp card / attempt 1's spindrift gusts |
| `?atmosgrade=0` | the integrated berg / ridge grades |
| `?atmoswind=0` | fix 1: the attempt-3 cloud speed 7.1 px/s (period 404.76 s instead of 343.43 s) |
| `?atmoscardlight=0` | fix 1: no light from the drifting emissive cards (the bake's frozen light) |
| `?atmosrange=0` | fix 1: the low card drawn over the far ranges again (no crest occluder) |
| `?atmosmist3=0` | fix 1: the attempt-3 ground mist (also drops the swell) |
| `?atmosberg=0` | fix 1: the steady band at the iceberg's foot |
| `?atmosswell=0` | fix 1 attempt 3: the bank's top stays low at the massif's foot (= fix attempt 2) |

Older switches are unchanged (section 8 above and the RINGS lane's `?idle=r10`, `?spin=f2|p2b|hf|f1|s3`). The full round-10 way
back is now `?env=projected&hold=r10&aphase=r10&ice=r10&idle=r10&atmos=r10`.

## A4. Checks on the merged :5173 (T1, scale 1, 1440x766, all through the slot)

(in progress; see `W/LOG.md`)

# User-priority merge (P2b: RINGS + WATER, 19 Nov 2026; integrator `merge`)

~02:00 WIB. Working tree only: nothing staged or committed (0 staged paths before and after). No deploys, uploads or `.blend`
writes; :5173 and :3000 kept running. `W` = `$SP/work2/merge` (step log `W/LOG.md`, every output of this step).

## U1. State of MAIN before this step

MAIN already held, in this order: the P2 integration, the RINGS lane's final files (lead, 17 Nov 21:1x, after judge3:rings
PASS 8.4), the ATMOS lane (fix 3, hand-merged by the lead 19 Nov 00:40), hotfix 2 (waterline depth AA, `?shoreaa=0`) and the
AA resolve (01:55, `?aaresolve=0`). The TAA lane ($SP/lanes2/taa) is still running and is not part of this step.

## U2. RINGS lane: already in MAIN (nothing copied)

`diff -rq BASE LANE` (no node_modules / .git / dist / .next / tsbuildinfo): HANDOFF.md + 7 files. Hashes (8 hex):

| file (retrux-web/) | BASE | LANE | MAIN | result |
|---|---|---|---|---|
| app/hero/README.md | e261fe8d | 6768122e | 6768122e | MAIN = lane |
| app/hero/engine/CameraRig.ts | 20aa6baa | 862f71d4 | 862f71d4 | MAIN = lane |
| app/hero/engine/Choreography.ts | 28702560 | bd86b276 | bd86b276 | MAIN = lane |
| app/hero/engine/HeroEngine.ts | f5014d44 | f8fb37e8 | 7b3bf3b3 | `git merge-file -p MAIN BASE LANE` == MAIN: every lane hunk is in MAIN; MAIN adds the atmos / hotfix 2 / AA hunks |
| app/hero/engine/hero/HoldR11.ts | 0162bd9c | 0fd88c7a | 0fd88c7a | MAIN = lane |
| app/hero/engine/hero/Rings.ts | 0df7144e | 03775db5 | 03775db5 | MAIN = lane |
| app/hero/engine/hero/Shards.ts | dfa90e44 | 2a563133 | 2a563133 | MAIN = lane |

MAIN and the rings lane differ only in the atmos / hotfix 2 / AA files (HeroEngine.ts, RenderPipeline.ts, shaders/chunks.ts,
world/Atmos.ts (new), world/EnvEdge.ts, world/PlateEnvironment.ts, world/Water.ts); `public/hero` is identical. The lane's
HANDOFF is saved as `notes/round11/handoff_rings_userfix.md`.

## U3. WATER lane: HELD BACK by the merge gate (not in MAIN)

The lead's merge gate (AUTOPILOT 04:2x, coded in `pipeline/r11_userfix.js`: a lane merges only if its last verdict passes or
has no blocker / major) holds WATER back: judge3:water (01:58) FAIL 7.8 with two majors, (1) rest 1:1 regressed against MAIN on
the right half (far floe / iceberg reflection columns 21.4 / 9.5 / 7.4 vs MAIN 25.7 / 13.5 / 10.7, F000 34.1 / 21.5 / 17.2;
water under the right front slabs washed light, chan 153-155 vs MAIN 142, F000 100) and (2) frame cost while the camera moves
+13..+16 % vs MAIN at T1 (gate +10 %; jpair sweep 1.160 / 1.134, dolly 1.134 / 1.134). Minors: LK_WAVEB brown-grey blotch at
the right edge in the hold / release (`?lkwave=0` removes it), hold near water smoother than F404-F436's chop, 20 Hz slab-foot
waterline flash while moving, T0 keeps the plate lake. What judge3 confirmed fixed in the lane: the foreground-floe shadowing /
ghosting and the "pecah pecah" fragmenting under pointer sweeps, hover, hold and release (T1 + T2, live screencast), with
`?envlake=plate` = MAIN exactly (0 px). The workflow script passes every lane to this step (it hands `results`, not
`lanesOk`), but its own gate log names WATER as held back, so this step follows the gate. MAIN therefore still has the plate
lake and its camera-move tears (the user's items 4 and 8 stay open in MAIN).

Ready to land if the lead overrides the gate: `W/water_ready/` = the lane merged 3-way against the CURRENT MAIN (with atmos,
hotfix 2 and AA):

| file (retrux-web/) | MAIN since BASE | action | conflicts |
|---|---|---|---|
| app/hero/README.md | changed (rings) | merge-file | 0 |
| app/hero/engine/HeroEngine.ts | changed (rings, atmos, hotfix 2, AA) | merge-file | 1 adjacent insertion: MAIN's `shoreAA` const and the lane's `LakeHeight.build` block at the same spot; kept both, MAIN's first (they are independent; the `Water` constructor below already merged `shore: shoreAA` and the lane's `height:`) |
| app/hero/engine/world/Water.ts | changed (hotfix 2, atmos, AA) | merge-file | 1 adjacent insertion: MAIN's SHORE_AA GLSL block and the lane's LAKE_R12 GLSL block; kept both, MAIN's first, the lane's block given its own `/**` opener (the shared one opens MAIN's comment); same rule as judge3's `fx2_resolve.py` |
| app/hero/engine/assets.ts, world/LakeMirror.ts | unchanged | lane's file | - |
| world/LakeHeight.ts, world/LakeSchedule.ts, public/hero/sky_lake.exr | new | lane's file | - |

Kept MAIN hunks (counts in HeroEngine.ts + Water.ts, MAIN / package): SHORE_AA 12 / 12, `shoreaa` 3 / 3, `aaresolve` 5 / 5,
`updateAtmos` 1 / 1 (CARD_WHITE lives in Atmos.ts / PlateEnvironment.ts, untouched by the lane). Typecheck of a scratch tree
(MAIN + package, `W/wtree`): hero 0 errors, project 0 errors. Land it with `zsh W/water_ready/apply.sh` (refuses if MAIN's
README / HeroEngine / Water moved since; backs MAIN's copies up first). Hashes: `W/water_ready/files.sha`. The lane's HANDOFF
is saved as `notes/round11/handoff_water_userfix.md`.

## U4. Checks on MAIN (:5173, T1, scale 1, 1440x766, through the slot)

Typecheck in MAIN/retrux-web: `tsc --noEmit -p tsconfig.hero.json` 0 errors, `-p .` 0 errors (`W/tsc_main_*.txt`). Labs for the
checks: the rings lane on :5174 and the round-10 baseline ($SP/lanes/base, 7ddac0d) on :5179, both started and stopped by this
step. One slot batch (`W/chk/batch.zsh`, log `W/chk/batch.log`):

| check | result | evidence |
|---|---|---|
| Idle, inner rings C / D (probe60 at exact 60 Hz, 8 s = 2 loops from tau 0, `py/an60.py`) | C turns at -90 deg/s and D at +45 deg/s about the rest camera's horizontal axis with min = max over all 481 frames: continuous, no reversal (the old rocking is gone); A / B follow their idle at s_eff 0.9998-1.0004 | `W/chk/p60_main/idle8`, `W/chk/sheet_idle8.jpg` |
| Hold, press 5 s at tau 2.6 + release | every ring on the one slowed clock: s_eff 1.0 -> 0.2 (C -90 -> -18 deg/s, D 45 -> 9 deg/s, same direction); split pieces of A / B: max angle to their ring 2.4e-6 deg, max out of the ring plane 3.3e-5 m over 511 frames (aligned, coplanar, turning as one ring); crystal shards 1.0 -> 0.5 of their idle rate, at most 0.021 change per frame. Looked at the sheet: rings open, pieces stay in the ring plane, slow turn, clean return to rest | `W/chk/p60_main/h5`, `W/chk/sheet_hold_h5.jpg` |
| Rings part of MAIN = rings lane (jcmp3, crystals shown and pinned): MAIN `?atmos=r10&shoreaa=0&aaresolve=0` vs lane, default | 18 / 18 shots (rest, 9 pointer spots, 5 hold poses) mean 0.000, max 0 | `W/chk/sw_default` |
| Each rings switch, same comparison with the switch on both sides: `?idle=r10`, `?spin=f2`, `?spin=p2b`, `?spin=hf`, `?spin=f1`, `?spin=s3`, `?hold=r10`, `?hold=r11a`, `?aphase=r10&spin=f2` | 9 / 9 shots (rest + hold poses) identical, max 0, for every switch | `W/chk/sw_*` |
| Full way back `?env=projected&hold=r10&aphase=r10&ice=r10&idle=r10&atmos=r10&shoreaa=0&aaresolve=0` vs the round-10 baseline :5179 | 18 / 18 shots identical (mean 0.000, max 0) | `W/chk/wb_r10` |
| Console | 0 page errors / console errors in all runs (default MAIN in probe60; every jcmp3 page) | `W/chk/p60_main.log`, `W/chk/*/log.txt` |
| Water on MAIN | not merged (U3): MAIN keeps the plate lake; judge3:water's MAIN captures (01:31-01:48, before the AA resolve) show its stair-step tears in pointer sweeps | `$SP/work2/water/judge3/an/lr_farwater_2x.jpg`, `an/live_lr_bottom.jpg` |

## U5. Switches in MAIN after this step

Unchanged by this step. RINGS: `?idle=r10` (old motion-capture idle for C / D), `?spin=f2 | p2b | hf | f1 | s3` (earlier hold
builds), `?hold=r10`, `?hold=r11a`, `?aphase=r10`; runtime `__hero.debug.holdSpin.{slow, slow0, slow1, guardRing, shardSlow,
shardContract, shardOut, shardOutA, shardOutB, shardFrontA, shardFrontB, shardHoldFx, frameMargin}`. ATMOS `?atmos=r10` (+ its
sub-switches, section A3), hotfix 2 `?shoreaa=0`, AA `?aaresolve=0`. Full round-10 way back:
`?env=projected&hold=r10&aphase=r10&ice=r10&idle=r10&atmos=r10&shoreaa=0&aaresolve=0` (proved bit-identical above). The WATER
lane's switches (`?envlake=plate`, `?lkfix1=0`, `?lkfix2=0`, `?lkwave=0`, ...) arrive only with `W/water_ready`.

## U6. Open issues

- WATER held back (U3). The user's items 4 (water breaks up when the camera moves) and 8 (foreground floe "shadowing") are fixed
  in the lane but NOT in MAIN. Lead's choice: land `W/water_ready` as it is (judge3's two majors come with it: right-half rest
  columns fainter and water under the right front slabs lighter than MAIN, and +13..+16 % frame cost while the camera moves),
  or one more WATER fix round on those two majors first (then re-merge: the package goes stale when MAIN's README / HeroEngine /
  Water move, e.g. by the TAA merge).
- RINGS (judge3 PASS 8.4, nits only; handoff_rings_userfix.md 10.5 / 11): the hold reaches 0.90-0.91x of the reference's
  scale (the constant 0.6 m opening in a rotating hold; closer = cropping A's arcs or a smaller opening, which the lead's note
  forbids); the big crystals cross the frame at 23.5-24.1 vs the reference's 16.3 px / frame (crystal population, P3 / ICE
  owner); rotating-hold arrangement vs State 2 to 5's poses by lead decision 09:07; D near-still at 9 deg/s in the hold.
- Section A4 above (the first ATMOS merge) stayed "in progress" because the lead reverted that merge on 17 Nov 22:1x; ATMOS fix 3
  was hand-merged by the lead on 19 Nov 00:40 (AUTOPILOT log).
