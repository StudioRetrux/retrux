# P4 round 3, lane ATMOS (p4atmos): HANDOFF (21 Nov 2026, 05:02-~07:00 WIB)

Builder: atmos. Lane `LANES/p4atmos` = `cp -c -R LANES/int1` (app/ == int1's at the start). Lab **:5178** left running
(`PORT=5178 nohup node hero-lab/serve.mjs --no-watch` in LANES/p4atmos/retrux-web, built from the final source).
WORK = `$SP/work_p4/p4atmos` (LOG.md has every step and number); mirror = `MAIN/notes/round11/lane_backup/p4r3/p4atmos/`.
Tasks: plan Q5 + Q14 (r11_1_plan.json) and the panel issues behind them (environment items 1, 3, 6; color_grade item 1).
No Blender, no assets, no Choreography.ts change (the release split is done in the shader from uniforms it already has).

## 1. What the reference shows and what MAIN did (measured; WORK an/base_boxes.txt, an/*rowprof*, tools/boxes.py)
Rest-framed reference frames with matched engine times (cap.mjs: RAF off, frame stepping, handheld off; engine t = 3.4 + S/30,
Loop at 4x for the mist): F000 t 3.4, Loop F015 t 5.4, F030 t 7.4, F045 t 9.4, State F297 t 13.3 (F036 / F160 / F252 are other
framings and were not used).
- **Iceberg base** (x950-1150 y420-455): MAIN 127 / 116 / 140 / 131 / 97 luma vs the reference 148 / 127 / 124 / 143 / 116, Laplacian
  7.4 vs 2.2 (crisp, a dark contact line). Row profile x1000-1150: the reference lifts rows 408-450 (world ~0.4-2 m at ~70 m) from
  MAIN's flat 114-124 to 139-150 under a soft top near row 405; in its thin phase (S297) only the last ~0.6 m (rows 438-456, +15..+20).
  The berg's RIGHT end (x1150-1240) is NOT misty in the reference (101-111 at rows 400-424) where MAIN is already +20: the
  round-11 "berg foot" box (1060-1240 x 400-440) matched only because its two halves cancelled (-25 / +20).
- **Far bergs / far range right of the berg**: MAIN +7..+20 BRIGHTER than the reference (bake). The plan's "aerial perspective 25-35 %
  toward the horizon sky colour beyond 150 m" would push them further from the reference: **not built** (nothing invented).
- **Massif stripe**: ablation (caps/stripe): the hard horizontal band across the massif is the round-11 HAZE_VEIL's top (full density
  up to its white-blue top at 10-12.3 m); `uAtmosHaze.x = 0` removes it.
- **Left bases**: at matched misty times MAIN is darker and greyer (L045: 139,154,176 vs 151,168,193); the panel's "+14,+9,+2 too
  grey" compared a misty q00 (t ~11-13 s) with the clear F000. B-R and saturation are low at every time (left_hzn sat 0.25 vs
  0.29-0.30, ridge foot 0.34 vs 0.45-0.50); the dark ridge +15..+16 (partly the bake).
- **Hold bank** (p06 vs F420, x120-320): MAIN's bank top covers the massif face (rows 440-480 L133 / 143 vs 123 / 119) and is smooth
  (rows 480-520 sd 8 vs 18-23); the release keeps the whole bank until ~0.6 s (p08 left patch x0-200 y300-380 L123 vs F460's 96).

## 2. Changes (files relative to retrux-web/; patch `WORK/p4atmos_vs_int1.patch`)
- **NEW `app/hero/engine/p4atmos.ts`** (~200 lines): the switches, the runtime uniforms (`__hero.env.p4atmosUniforms`), and the GLSL
  splices (`p4Splice`: exact-text replacement, throws if a target is missing or not unique, so a merge that moved a target cannot pass
  silently).
- **`app/hero/engine/world/PlateEnvironment.ts`** (shared; 8 small hunks): import; `GLSL_PLATE_MIST = p4atmosMist(...)` (the template
  wrapped, text unchanged inside); `PLATE_FRAG_P4 = p4atmosFrag(PLATE_FRAG)` after PLATE_FRAG (PLATE_FRAG itself untouched); a `tier`
  constructor parameter + `this.p4atmos`; the two `fragmentShader:` lines pick PLATE_FRAG_P4 when on; the uniforms spread; the
  ridge-fog / bank-tint / shade-height values inside the MIST3 block; the two fields.
- **`app/hero/engine/HeroEngine.ts`** (shared; 1 hunk): `new PlateEnvironment(..., assets.extraPlates, null, this.profile.tier)`.
- No Atmos.ts change (its GLSL is reached through PLATE_FRAG's text), no Water.ts / LakeMirror.ts / Choreography.ts change, no assets.

### 2.1 Q5: the waterline mist (`?atmoswl=0`)
A world-anchored ground layer in PLATE_FRAG after the mist layers: x 2 -> 6 m full, gone at 18.5 m (fade 4.5 m; the berg's left and
middle, world ~8-17 m, not its right end), z beyond the right floes (-38, fade 4 m) to the berg's depth (-64, fade 6 m), not on the
sky. Its top rides between 1.0 m (thin) and 2.0 m (thick) on the iceberg's measured envelope (BERG_ENV, Atmos.ts' knots fitted to the
reference's berg-foot series), soft edge 0.9 m, a drifting ~18 m fBm (wind 0.43 m/s) on top (+-0.45 m) and density; amount 0.30, cap
0.40, colour ~186,198,214. It stays in the hold (F402 / F420 show a misty berg base). It is NOT in the lake mirror: the water under
the right floes is already too bright (panel: 176,187,202 vs 163,174,191), and the lake is the water lane's.
### 2.2 Item 1: the massif's veil (`?atmosveil2=0`)
The HAZE_VEIL density falls off over 3.0 m under its top (MAIN 1.8 m), the top 0.5 m lower and feathered by the wisps (+-1.6 m x the
wisp noise); the shade under it (HAZE_SHADOW out-heights) 0.5 m lower with it. So the bright upper colour never sits at full density
in a level band; the haze builds up toward the bank. Picked from a sweep (caps/veil, an/veil_sweep.png: V0 = MAIN's profile
reproduces MAIN's boxes exactly).
### 2.3 Q5 (4): the left bases bluer (`?atmosblue2=0`)
A tonal shift x(0.94, 0.99, 1.10) on the composited colour over the plain and the mountains' feet behind the lake (world x -92..-7,
z < -60, below 3-6 m), at rest (x (1 - uHold)); the bank's colours x(0.95, 0.99, 1.07); the steady fog on the dark ridge 0.7 -> 0.55
(body) and 0.35 -> 0.25 (upper face) (the plan's "-15 % opacity over the dark ridge").
### 2.4 Q14: the hold fog bank (`?fogbank=r11`)
- In the shared chunk (plate AND water, so the shoreline cannot show a seam): the 28 m swell plus ~8 m puffs rolling up and drifting
  with the wind, contrast-stretched (`puff = smoothstep(-0.3, 0.3, 0.45 S + P)`, billow 0.42..1.22: above 1 the two-tone colour runs
  on to lighter puff tops; the callers cap the density as before); the top ~2.5 m lower in +-1.5 m lumps.
- Release (PLATE_FRAG): above 2-4 m the bank x smoothstep(0, 0.6, uHold / uFogHold): it clears with the camera, only the low residue
  keeps the 0.6-2 s linger. In the hold uHold == uFogHold (no change); at rest plateBank returns 0 (rest bit-identical: ident below).

### Tiers
T1 / T2: everything. T0: the environment hunks are off (PlateEnvironment gets the tier; MAIN's program and values); the bank billows
live in GLSL_PLATE_MIST (module-level, shared with Water.ts), so on T0 they apply while the hold's fog is up (rest frames on T0 ==
MAIN: ident below). Gating them on T0 too would need a Water.ts change (not this lane's file).

## 3. Switches (each restores MAIN exactly; read once at module load)
| switch | restores |
|---|---|
| `?p4atmos=0` | the whole lane (MAIN == int1 exactly: ident below) |
| `?atmoswl=0` | no waterline mist |
| `?atmosveil2=0` | MAIN's massif veil (the stripe) |
| `?atmosblue2=0` | MAIN's left-base colours, bank colours and ridge fog |
| `?fogbank=r11` | MAIN's hold bank and release |
All four sub-switches off == `?p4atmos=0` (ident below). Runtime knobs: `__hero.env.p4atmosUniforms.uP4Wl / uP4WlZ / uP4WlT / uP4WlC /
uP4Veil / uP4Blue` (see p4atmos.ts createP4AtmosUniforms).

## 4. Evidence (WORK paths)
### 4.1 Switch proof (identP: 20 moving frames; final image + every target + every linked program's source; an/ident_A/B/C.txt)
- `?p4atmos=0` on :5178 vs MAIN :5173: **IDENTICAL** at rest T1 (14 targets, 16 programs), T2 (15 / 16), T0 phone 390x844 DPR3 (9 / 12),
  `?envlake=plate` (10 / 12), hold p04 (expand 0.9), p06 (expand 2.97), p07 (release 0.33), p08 (release 0.57) (14 / 18 each).
- All four sub-switches off: IDENTICAL at T1 rest and p06.
- Lane on: T1 / p06 differ (main, refraction, bloom0-4, final; programs rx-plate-baked, rx-water*). The mirror / walk / cache targets
  are the same at rest (the waterline mist is not mirrored, by design). **T0 phone: final + all 9 targets SAME** (programs rx-plate-baked
  / rx-water differ in text: the shared chunk's billow lines, inactive at rest). 0 console messages in every session.
### 4.2 Region numbers (rest, matched times, final build: caps/final_rest, an/final_boxes.txt; mean |dL| over F000 / L015 / L030 /
L045 / S297, MAIN -> lane)
- berg_base 15.8 -> 10.1 (F000 -21 -> 0, S297 -19 -> 0; L030 +15 -> +32: the reference's mist sits on the berg's right part at L030),
  Laplacian at F000 7.4 -> 6.0 (reference 2.2).
- berg_foot 4.6 -> 9.6 (MAIN's 4.6 was its halves cancelling, see 1).
- ridge 13.3 -> 11.4, ridge_base 8.8 -> 8.2; saturation (F000 / L045 / S297): left_hzn 0.25 / 0.25 / 0.20 -> 0.29 / 0.29 / 0.25
  (ref 0.30 / 0.29 / 0.27), left_base 0.23 / 0.22 / 0.17 -> 0.26 / 0.25 / 0.20 (ref 0.26 / 0.22 / 0.18), ridge_base 0.34 / 0.34 / 0.27 ->
  0.39 / 0.39 / 0.33 (ref 0.45 / 0.49 / 0.47); left_base B-R at F000 38 -> 43 (ref 46); luma unchanged (left_base 7.9 -> 7.9).
- Unchanged within 0.3: berg_mid, berg_top, far_bergs, far_rangeR, mound, left_base luma, mtn_face (8.7 -> 9.0), mtn_foot, shore_L;
  left_hzn luma 4.0 -> 4.2;
  mtn_upper 2.8 -> 3.8 (the veil thinner at mid height; -2..-4 at L030 / L045 / S297).
### 4.3 Hold (caps/v5_hold, v6_hold; an/v5_hold.png, v5_hold_right.png)
- p06 vs F420, x120-320: rows 440-480 L126 / 132 (MAIN 133 / 143, F420 123 / 119); rows 460-520 sd 23 / 17 / 15 (MAIN 15 / 8 / 8,
  F420 17 / 23 / 18): the bank has puffs and a lumpy top, the massif face above it is dark slate as in F420.
- Release, left-mountain patch x0-200 y300-380: p07 (0.33 s) 116,132,158 (MAIN 127,144,169; **F453 114,132,160**); p08 (0.57 s)
  **83,101,130** (MAIN 106,125,151; **F460 78,98,130**: the plan's target within +-5). The low bank stays (F453 / F460 keep it).
### 4.4 Looked at (an/): v1_berg.png, wl_tri.png (berg base ref | MAIN | lane at F000 / L030 / L045 / S297), v1_mtn.png and
veil_sweep.png (stripe gone), v6_full_F000.png, v5_full_t094.png, v4_hold.png / v5_hold.png (bank), v5_hold_right.png (berg in the hold).

## 5. Frame time (T1, the engine's real RAF loop, vsync off, interleaved A = :5173 MAIN / B = :5178 lane, 6 pairs per run, SLOT_BG=0,
each run started only when no other lane held a perf slot and the 1-min load was < 8; tools/perfab.mjs + perfana.py, WORK perf/)
| mode | pairs | paired median ratio B / A: run medians / means | pairs at load < 10 |
|---|---|---|---|
| HOLD (pressed, held in expand; the bank's extra noise runs) | 6 (`ab_hold_r2`) | **1.020 / 1.008** | 4: 0.985 / 0.980 |
| REST run 1 (idle loop, rest camera; the waterline mist, veil, blue shift) | 6 (`ab_rest`) | **0.993 / 0.995** | 2: 0.965 / 1.188 |
| REST run 2 | 6 (`ab_rest_r2`) | 0.938 / 0.918 | 0 (other lanes drove the load to 10-50: not evidence) |
No mode shows a regression > 5 %; the machine was heavily shared during this lane's window (MAIN itself 30-73 ms per frame), so the
rest numbers are noisy and only 2 rest pairs ran at load < 10 (the brief wants >= 6: a quiet-machine re-run is worth doing at merge).
Expected cost from the code: at rest the waterline mist touches ~1.7 % of the frame (WORK tools/area.py on F000: pixels changed > 1
level) with two 2-octave value noises there (its fBm and the berg envelope's drift); the left blue shift and the veil's new profile are
a few ALU per environment fragment (5.3 % of the frame changes); every other fragment pays one region test. In the hold: one more
2-octave noise per bank fragment (plate and water) and one ratio. No pass, no texture, no render target added.

## 6. Capture set: `zsh qc_r11.zsh WORK/qc_final http://localhost:5178 T1 1` (06:30-06:33, exit 0; 0 page errors / console errors in
qc, ptr and sweep logs). Compare with MAIN's same harness at `$SP/p3/r11_2`.
- region_stats_q00 (the panel's boxes vs F000), lane vs MAIN r11_2: **mid left 6,2,-3 -> 2,1,0**; every other box within 1-2 levels
  of MAIN (iceberg right 10,12,8 -> 11,12,8, bottom centre 3,1,0 -> 5,2,1 and corner TR -14 -> -13 move with the crystals / clouds of
  the uncontrolled capture time; water near -9 -> -8 B).
- q00 own boxes vs F000 (an/qc_q00_main_lane_ref.png): berg base (x950-1150 y420-455) 77,108,149 -> 101,126,158 (F000 129,151,178),
  Laplacian 7.4 -> 4.8 (2.2); rows 440-456 of x1000-1150 96 / 93 -> 128 / 138 (F000 141 / 137). NOTE: the harness's q00 falls in the
  reference's THIN berg-mist phase (as S240-S300; the layer's top ~1 m there), while the panel compares it with F000 (thick):
  rows 408-432 stay ~100-108 vs F000's 140-150, as the reference's own S297 (99-101). The matched-time numbers are in 4.2.
- Left side at q00: left_hzn saturation 0.22 -> 0.27 (F000 0.30), left_base 0.19 -> 0.23 (0.26), ridge_base 0.32 -> 0.38 (0.45), ridge
  luma 86 -> 84 (70), mtn_upper 166 -> 162 (156).
- Hold (an/qc_hold_tri.png, MAIN | lane | reference): p06 the bank is a lumpy, puffy layer under a dark slate massif (F420); p08 the
  dark ridge clears over a low white bank (F460). Pointer orbits (an/qc_ptr.png: left, right, top right, bottom left, MAIN | lane):
  the berg-base mist and the bluer bases hold in every view, no edge, seam, double or hole. Sweep (qc_final/sweep/sweep.jpg, 34 frames:
  intro, tau, pop / hold / release at 6 pointer spots): nothing broken.

## 7. Open
1. The reference's berg-base mist drifts sideways (thick on the berg's left at F000 / L045, on its right part at L030); the layer is one
   world-anchored field on the measured time envelope, so single boxes swing (L030 berg_base +32). A drifting phase per x would fit it
   better (the envelope knots were fitted on the old two-halves box).
2. The iceberg's sunlit top +10 over F000 / Loop (S297 matches): tried a gain on the berg mask's bright texels: the top lies outside the
   mask's 50-85 m depth band (no effect), removed. Needs the berg grade's depth gate re-checked (ENV / grade owner).
3. Far bergs / far range right of the berg +7..+20 over the reference and crisper (Laplacian 7.3 vs 4.5): the bake; DOF is Q11's.
4. Rest left bank: bluer now, but still no billows at rest (the round-11 fit wants the full bank smooth: S320 / L090 hp 1.0-1.1);
   the panel's "billowy" is the hold's (done there).
5. The massif's rock gullies (Q15) are the bake's: with the stripe gone the face reads smooth clay through the veil.
6. T0 hold: the bank billows apply on T0 too (shared plate / water chunk); its rest frames are MAIN's.
7. QC timing: the harness's q00 / ui_rest land at t ~11-13 s (real time runs during its waits): the reference's thin berg-mist phase and
   the left bank rolling in, while the panel compares with F000 (clear bank, thick berg mist). For F000-like boxes pin the time:
   WORK tools/cap.mjs (RAF off, `t` per shot) at t 3.4 = F000; Loop at 4x, State at 1x (handoff_atmos F1).
8. Perf: only 2 rest pairs ran at load < 10 (the machine was shared with 4-5 other lanes' jobs); a third rest run waited 06:33-06:37
   behind the load gate (another lane's perf run, load 8.7-10.6) and was stopped for the time box. Re-measure on a quiet machine at merge.
9. Hold bank height: the bank's top rides a time-dependent fBm (7 +- 3 m, MAIN's), so one pose's rows swing with the capture time. The
   harness's p06 (qc_final) reads rows 500-540 L137 / 148 vs F420's 153 / 166 (MAIN 151 / 160: the lane's top a little low there),
   the deterministic p06 (cap.mjs t 40) rows 440-560 |d| 6.7 vs MAIN's 9.5. Raising the top by 0.8 m (06:37, caps/v7_hold) fitted the
   harness pose and worsened the deterministic one (|d| 8.0): reverted; a time-averaged fit over the hold's span is the next step.
