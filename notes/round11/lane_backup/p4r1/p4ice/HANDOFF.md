# P4 round 1, lane `ice` (p4ice): HANDOFF

> **Fix round (21 Nov 01:49-02:50 WIB): see "FIX ROUND" at the end.** It supersedes the round-1 text below where they differ:
> the crack sheets are deleted, the joints are a V-shaped seam with a far-wall line (new `uP4J`), the hold widens the
> critical-angle ramp x2.5 (`uP4H.z`); F3 / F5 / the F4 strip stay open with options. The patch, identity, typecheck,
> capture set (`WORK/qc_fix`) and perf numbers in that section are the current ones.

Builder p4ice, 20 Nov 23:46 - 21 Nov 01:17 WIB. Lane `LANES/p4ice` (cut from aa7 with `cp -c -R`), lab **:5175** (left
running for the judge), WORK = `$SP/work_p4/p4ice`, mirror = `MAIN/notes/round11/lane_backup/p4r1/p4ice/`.
Tasks (MAIN/notes/round11/p3/r11_1_plan.json): **G5** (band-limit the ice), **Q3** (frosted carved ice, not cloud-printed
resin), **Q6** (crisp carved slabs: planar caps, joints), **Q10** (hold drama, rim, cracks / streaks, cast), **Q4 ice part**
(orb light through the ice). Every number below is from my captures (T1, 1440x766, scale 1) unless marked.

## Files
- `retrux-web/app/hero/engine/hero/IceMaterial.ts` - the only changed file (patch `WORK/p4ice_vs_aa7.patch`, 565 lines,
  applies to aa7 == MAIN and reproduces the lane file; mirrored). Rings.ts is unchanged: Q6's check holds as is
  (`uPieceCuts.z` = 0 on the whole rings C / D: `geos.length > 1 ? 1 : 0`).
- All new GLSL sits in `#ifdef ICE_P4` blocks inside the round-11 fragment main (vertex shader untouched). The define is set
  only on T1 / T2 (`marchSteps >= 4`) with the round-11 ice; T0 keeps MAIN's ice. With the lane off (or on T0) `stripP4()`
  removes the ICE_P4 blocks from the source (keeping their `#else` parts), so the linked program TEXT is MAIN's, not only its
  output (checked offline byte for byte, and by ident below).

## Switches
| switch | restores | level |
|---|---|---|
| `?p4ice=0` | MAIN exactly (no define, no new uniforms, MAIN's program text) | build |
| `?iceaa=r11` | G5: ramp-end filter 1.5 px + 0.004, octave fade 0.3 c/px, trace floor 2 px, values unfiltered | uniform |
| `?icefrost=r11` | Q3: roughness 0.233-1, isotropic Noise A, uR11D.z 0.8, uR11E.w 0.45, uR11D.y 0.94 | uniform |
| `?icecap=0` | Q6: no cap trace / chamfer / cap glint, joints 0.35 deep x 12 mm | uniform |
| `?orbice=r11` | Q4: direct-path clamp x1, lobe floor 0.012, no variation / hue, hold gain 1, mean share 0.3 | uniform |
| `?icehold=r11` | Q10: hold growth / dc / gain / chroma = MAIN, no rim tint, line, cracks, cast, glint, streaks | uniform |
Sub-switches run the same (ICE_P4) program with MAIN's values; arithmetic-equivalent, not bit-identical (only `?p4ice=0` is).
All knobs are live in `__hero.rings.materials[i].uniforms` (uP4A..uP4I, documented in the shader).

## What changed and why (each with its measured effect)
**G5 (glitch, first).** Root causes per the plan: Bump.001's ramp ends filtered only over 1.5 fwidth(nA) + 0.004 (sharp iso-lines),
octaves kept down to 1.7 px, Noise A's VALUE never band-limited (roughness / bump window switched at 2-3 px), trace normal down to
2 px. Now: `fwA = 4 fwidth(nA) + 0.02`, octave fade 0.15 -> 0.30 c/px (gone below ~3.3 px), the values faded with their
gradients (`p4FbmGrad` / `p4FbmRing`, vBand 1), trace floor 3 px. The plan's step 3 (uR11N.x 2 -> 3, uR11J.y 3 -> 4, uR11K.y 1.5 -> 2.5)
was tried (batch b3 'e1') and REJECTED: crawl rose (1.707 / 1.359 / 1.840 vs 1.465 / 1.316 / 1.525). Effect: see crawl and p05 below.

**Q3 (critical ice issue).** (1) Material roughness compressed to 0.45-0.9 and the frosted-diffuse share 0.8 -> 0.5, so the
frost terms (rough-1 Lf swap, the orb lobe, the entry Fresnel cut) no longer flip by ~30 L between patches. (2) Noise A sampled in
ring coordinates (arc / 4, rho - R, z) on a lattice periodic in theta (integer cells per revolution, no seam at +-pi), so
clear / frosted variation runs as streaks along the ring. (3) Panorama blur floor 0.45 -> 0.6. (4) NEW vs the plan: the trace
keeps MAIN's own roughness ramp (uP4H = 0.233-1): with the trace on the compressed ramp its lobe and critical-angle ramp
washed out F045's dark steel-blue band along the oblique rings (cap1: q03 outer ring L198 / sd13.6 / lf10.4 vs REF
174 / 31 / 23.5). (5) Transmitted gain 0.94 -> 0.92 to undo the +5 L the compression added (q00 face 216.5 vs F000 209.3).

**Q4 (ice part).** In r11Radiance: direct orb paths (first exit after <= 1 internal wall, impact parameter < 0.45-0.75 orb
radii, continuous ramp) clamp at 1.6x the indirect limit (2.2 per the plan overshot: q03 ring D +14 L, q00 band over the orb +7
L, batch b2), keep more of the orb's sharp sample (mean share 0.15 instead of 0.3), lobe floor 0.008; after the clamp the
orb's light gets a luma-neutral periwinkle hue (x2 the plan's (1, 0.95, 1.06)), the plan's variation term
(1 - 0.35 frostK + 0.25 (nB - 0.5)) and x1.4 at full hold. The Orb.ts / PostChain / HeroEngine parts of Q4 belong to the orb
lane, not touched.

**Q6.** Cut caps (pieces apart, `uPieceCuts.w < 1`, |Ng . tangent| > 0.75-0.92 within 3-6 cm of a cut plane) enter through
their own plane (planar Nmac, entry at the fragment, no facet tilt), with a 4 % chamfer towards the nearest octagon wall and a
tight sun glint. Joints while joined: 0.6 deep (was 0.35), 5 mm ramp (was 12 mm). Corner rounding / plateau step (the plan's
optional step 4) not changed.

**Q10.** Hold (x uHold): face-on lobe growth 1.5 -> 1.2, one-bounce TIR smoothing x0.7, transmitted gain -> 0.98, chroma
-> 0.92 (the plan's 1.02 / 0.85 overshot with the brighter orb paths: p06 L212.8 / sat 0.138 vs F420 206.9 / 0.162), a facet
sun glint (GGX alpha 0.04, widened by the pixel's normal spread). Rim: the orb share of the grazing reflection tinted by
IceColor (luma kept); a steel-blue line where the side face turns away (dot(Ng, V) 0.08-0.34 band, x1.3). Cracks: two finite
crack discs per ring at hash-chosen places / tilts in the ring frame; where the first internal segment crosses one, the
entry side darkens x0.7 / the other brightens x1.15, the fissure line filtered over the pixel (not in the reflection pass).
Scrape streaks: the fine bump's Noise B in ring coordinates stretched 8x (band-limited: 3-7 px streaks). Cast: an ice-only
luma-neutral blue tint, x3 of the plan's (B +4, G -2) step.

## Evidence (WORK = $SP/work_p4/p4ice; key images and logs mirrored)
### Identity (`ana/ident_final.txt`, tools/identS.mjs from AA8: 20 moving frames, final image + every render target + every
### linked program's source; final build 21 Nov 00:24)
- T1 `?p4ice=0` vs :5197: IDENTICAL (6 targets, 16 programs). T2 `?p4ice=0`: IDENTICAL (6 / 16). `?envlake=plate&p4ice=0`:
  IDENTICAL (2 / 12). T0 (lane default, the lane is off on T0 by design): IDENTICAL (2 / 12). 0 console messages in all.
- Lane default T1 / T2 vs :5197: only `rx-ice`, the reflection target and the final image differ (all other programs and
  targets identical).

### Typecheck
`npx tsc -p tsconfig.hero.json --noEmit` 0 errors; `npx tsc -p tsconfig.json --noEmit --incremental false` 0 errors (00:24,
after the last source edit).

### Final capture set `WORK/qc_final` (qc_r11.zsh, T1, scale 1; shoot_qc / ptr / sweep, 0 console errors or warnings)
Numbers from `ana/final_icem.txt` (tools/icem.py on the panel's boxes; lane | MAIN's panel set | reference):
| pose / box | lane | MAIN | REF |
|---|---|---|---|
| q00 band right L / sd / Laplacian / 3-12 px energy | 190.8 / 18.8 / 4.1 / 4.4 | 190.0 / 23.0 / 8.6 / 9.0 | 192.6 / 11.4 / 3.8 / 3.9 |
| q00 band over the orb, lift over its neighbour | 231.1, +32.5 | ~+11..16 (panel) | 231.8, +35.7 |
| q00 beside the orb sd | 7.8 | 18.2 | 9.0 |
| q00 face x760-830 y365-400 L / B-G | 210.4 / +23.6 | 210.7 / +16.3 | 209.3 / +24.0 |
| q00 row 385 bars (min L at x) | 150 @574, 133 @862 | 163 @570, 132 @890 | 129 @584, 99 @879 |
| q00 lower arcs sd / Laplacian | 18.2 / 13.2 | 18.4 / 12.5 | 11.5 / 3.7 |
| q01 inner band RGB | 186,211,234 | 189,218,230 | 188,209,232 |
| q02 centre B-G / Laplacian | +24 / 7.4 | +18 / 10.0 | +30 / 6.6 |
| q03 ring D L / sd / B-G | 228.8 / 16.6 / +13 | 226.1 / 1.9 / +4 | 223.7 / 17.3 / +14 |
| q03 outer ring L / sd / low-freq / Laplacian | 191.4 / 25.3 / 20.0 / 10.5 | 182.9 / 27.2 / 20.3 / 13.8 | 174.3 / 30.8 / 23.5 / 6.4 |
| p05 right arc sd / Laplacian | 27.5 / 8.1 | 32.9 / 11.5 | 23.3 / 2.9 |
| p06 band L / saturation | 209.1 / 0.168 | 196.9 / 0.200 | 206.9 / 0.162 |
Images (`img/final/`, mirrored): `q00_3up.png`, `q03_3up.png` (MAIN | lane | REF), `p05_rightarc.png`, `p05_toparc.png`,
`sw_hold_T.png`, `sw_pop_B.png` (MAIN | lane, nearest-neighbour zoom), `ml_<pose>.png` (MAIN | lane full frames),
`sweep_main_lane.jpg`; caps `img/z_p06_caps.png` (MAIN-equivalent above, lane below).

### Crawl / sparkle (tools/crawl.py: rings stepped 1/60 s with everything else frozen, 6 frames at tau 0.4 / 1.5 / 2.9; per
### pixel the minimum over +-2 px shifts of |L1 - L0| on changed pixels; same session, MAIN-equivalent config 'm')
- b4: MAIN-equivalent 1.609 / 1.478 / 1.648, lane 1.498 / 1.292 / 1.655 (lower at two taus, equal at the third). b3: m 1.547 /
  1.475 / 1.476 vs the chosen trace setting 1.465 / 1.316 / 1.525; the plan's G5 step 3 (wider TIR ramps) 1.707 / 1.359 /
  1.840 -> rejected. (Not the ice lane's g16 mcres scale: that tool is gone; A/B only.)
- Isolated single-pixel sparkles (> 25 levels above all 8 neighbours, hero region): q03 29 -> 9-15, p06 6 -> 1-2, q00 4 -> 6
  (shard tips); the reference frames have 0.

### Perf A/B vs :5197 (tools/rc2.mjs = AA8's copy of the perf judge's rtxu: unthrottled Chrome, product loop, T1 scale 1,
### 1440x766, interleaved AB / BA, MOVE = CDP mouse sweeps, REST = no input; SLOT_BG=0; `perf/ab_run*.json`)
The machine was shared with three other lanes' builders and judges all night; the 1-min load and the GPU (other headless
Chromes starting mid-run) moved under every run, so the frames flip between an unthrottled ~22.5-23 ms state and a throttled
~42-64 ms state. Only pairs where both pages were unthrottled can resolve a few per cent:
| run | conditions | MOVE pairs (lane / main median-interval ratio) | REST |
|---|---|---|---|
| 1 (00:27) | quiet at start (4.4), load 11-13 from pair 5 | unthrottled: 1.024 1.020 1.022 1.018 1.000 (throttled 1.054 1.002, transition 2.058 void) | 1.016 1.030 0.995 0.938 |
| 2 (00:41) | VOID: load 15-24 all run, throttled | - | - |
| 3 (01:01) | load 6.3-7.5 (< 10) but another lane's Chrome on the GPU: blocks 22-64 ms | 10 pairs, median 0.991, spread 0.59-1.40 (cannot resolve) | 1.075 (contaminated) |
| 4 (01:05) | quiet at start (4.4), load 13 mid-run | unthrottled: 0.994 1.004 1.027 1.013 (throttled 1.042, transition 0.513 void) | 0.922 1.015 |
| **5 (01:15), the qualifying run** | quiet at start (6.4), load 5.95-6.98 in every block, all blocks unthrottled (21.3-23.1 ms) | **6 pairs < 10: 1.028 1.014 1.027 1.000 1.032 1.016, median 1.022; median-interval diff +0.475 ms (0 .. +0.7)** | **1.008 1.027 (+0.33 ms)** |
**Result (run 5, meets the rule: 6 interleaved pairs, every block at load < 10, SLOT_BG=0): +2.2 % moving (paired median
1.022, +0.475 ms per frame at ~22.5 ms), +1.8 % at rest - under the 5 % budget.** Runs 1 + 4's nine unthrottled pairs agree
(median 1.018, range -0.6 .. +2.7 %). Where the cost comes from (ALU only: no
new pass, no new texture fetch): Noise A and Noise B through the periodic ring lattice (atan + 2 mod per
octave), the crack loop (2 discs, every ice fragment; `uP4F.z = 0` removes its cost live), the rim line and cast (a few ALU);
the cap loop and the glint run only while pieces are apart / in the hold. T0 is unchanged (identical program).

## Open / not done
- **G5 partly open:** the hold's close-up arcs keep softer TIR-zone outlines (p05 right arc, `img/final/p05_rightarc.png`):
  the bump-ramp isolines are gone, the trace's critical-angle zone edges are not. The plan's step 3 raised crawl (rejected);
  its last resort (T2-only 2-tap supersample of the transmitted term) was not tried. The q00 lower-arc Laplacian (13.2 vs
  3.7) is dominated by silhouette steps and the lake's streaks inside the panel's box (the same in MAIN), not the ice faces
  (q00 face Laplacian 1.8-2.2 vs F000 3.0-4.1).
- **q03 outer ring is 8 L lighter than MAIN** (191 vs 183; F045 174) and its dark steel band along the ring weaker than F045's;
  the trace roughness ramp is back on MAIN's and the frost terms still lighten it. A darker frosted share (uR11D.z) or
  a lower uP4B.x would be the next knob, gated on q00's face (now within 1 L of F000).
- **Bars at the band ends** are lighter than F000 (150 / 133 vs 129 / 99) and 10-17 px off F000's x (ring A's mocap phase,
  not this lane).
- **Cracks are not visible in the judged poses** (two hash-placed discs per ring; F030's crack and F045's fissure are not
  reproduced at their spots). They cost ALU on every ice fragment; `uP4F.z = 0` turns them off live.
- **Rim line shallower than F045** (dip L187-192 vs 176-183); the rim itself is B-G +13-16 (F045 +17-25, MAIN +5-14).
- **Hold:** no clipped refracted orb strip (0 clipped px outside the orb vs F420's 121 in my box); the far-wall line is
  unmeasured. Q6's optional step 4 (corner rounding, plateau step) not done: q02's diagonal bar end (a whole ring seen
  edge-on, not a cut cap) still reads rounded.
- Q4's Orb.ts / PostChain / HeroEngine parts (hold glow, core pulse) belong to the orb lane; untouched here.
- The Cycles twin renders are gone (scratch wiped, the backup tgz holds only the old HANDOFF) and Blender belongs to the env
  lane this round: gates are the reference frames and the panel's numbers.
- Sub-switches are uniform-level in the ICE_P4 program (arithmetic-equivalent to MAIN); only `?p4ice=0` is bit-identical.

## Assets
None shipped (no files in `public/hero/`). Lab :5175 is running for the judge (`node hero-lab/serve.mjs --no-watch` in
`LANES/p4ice/retrux-web`, log `WORK/lab.log`). WORK is 165 MB (tuning sets cap1 / cap2 / cap5 deleted after analysis; cap3 / cap4 keep the
crawl sequences, qc_final the judged set).

## FIX ROUND (fixer, 21 Nov 01:49 - ~02:50 WIB): judge_p4ice findings F1-F5
Judge verdict: `$SP/work_p4/judge_p4ice/verdict_p4ice.json` (pass false; ice_material 6.5 -> 7.4). Fixer work in `WORK/fix/`
(tools/patch6.py, patch7.py, patch8.py; batches b1-b5; img/), LOG section "FIXER round". Only file changed: still
`retrux-web/app/hero/engine/hero/IceMaterial.ts` (everything new inside the ICE_P4 blocks; `?p4ice=0` / T0 unchanged).
Hold-pose comparisons now use one FRESH page per config in shoot_qc's pose order (capv's in-session hold poses are not
comparable: the ring orientation at p04-p06 depends on what the previous config left; a fresh 'd' reproduces qc_final's
p05 / p06 boxes to 0.1 L). Rest-pose box stats also move between in-session configs where shards fall in the box.

| finding | status | what changed | evidence |
|---|---|---|---|
| F1 (G5: TIR-zone outlines on the p05 hold arcs) | FIXED (hold only) | the critical-angle ramp `dc` on every wall x `mix(1, uP4H.z, uHold)`, uP4H.z = 2.5 (the judge's second option: hold-scaled, so the idle crawl is untouched). The T2 two-tap supersample was not built (T1 is the judged tier and it would cost a second transmitted term). | b2 fresh pages: p05 right arc Laplacian 8.7 -> 6.2 (x2) / 5.6 (x3), sd 28.7 -> 27.9 / 27.0 (F402 2.9 / 23.3; MAIN 11.5 / 32.9); top arc 7.8 -> 5.6 / 4.6. `fix/img/b2_p05.png` (r1 | x2 | x3 | F402). **qc_fix (x2.5): right arc lap 8.1 -> 6.7, sd 27.5 -> 29.0 (MAIN 11.5 / 32.9, F402 2.9 / 23.3); top arc lap 7.7 -> 4.9, sd 24.5 -> 22.3.** `fix/img/fx_p05_rightarc.png` (MAIN | r1 | fix | F402): the agate outlines are gone; `fx_p05_toparc.png`: the dotted ring by the cut end is gone. Side effect in the hold: p06 band 209.1 -> 203.2 (F420 206.9), sd 22.3 -> 25.6, sat 0.168 -> 0.187 (0.162). |
| F2 (joints as flat 6-15 px collars) | FIXED | new uP4J (x 1 = V mode, y depth, w far-wall line gain; uP4D.y = the line's half width in px). The shade is a V across the band of rays whose first segment crosses the cut plane (1 - abs(2t - 1), t = abs(se) / (abs(se) + abs(sx)): 0 at both ends, no hard edge at any width), plus a bright line where the plane meets the far wall. Derivatives taken before the loop's `continue` (uniform control flow). `?icecap=0` restores the round-1 / MAIN formula. | prof.py q01 x805 y240-275: r1 plateau 164-167 over 6 px -> `... 213 196 186 173 189 198` at uP4J.y 0.9 (F015 `213 208 190 171 181 195`; default 0.8 sits between v7 and v9); q02 row 375: r1 15 px plateau 138-153 with hard steps -> a soft V to 163 (0.7) / 152 (0.9) with a bright line at its other end (F030: a ~10 px band at 164-168 and a 200-213 line). **qc_fix q01: `200 212 207 194 186 188 197 202` (F015 `207 213 208 190 171 181 195 201`); q02: a 1-2 px bright line (207) and a soft V to 158 (F030 band 164-168 + line 200-213).** `fix/img/fx_q02joint.png` (r1 | fix | F030), `fix/img/b5_joints.png`, `fix/img/b3_dbg.png` (where each term lands). The q02 order is mirrored vs F030 (our line on the band's left, F030's on its right). |
| F3 (q03 outer band lighter than MAIN, white ovals) | NOT FIXED (open, options) | tried the judge's first option: the frosted look-through's share x0.2-0.5 where little light has left through the walls (wOut). The white ovals stayed (`fix/img/b2_q03outer.png`), so they are not the frosted look-through; the box moves I saw were shards that differ between in-session configs. Knob removed. | qc_fix boxes x800-830 y260-350 191.1 (r1 191.4, MAIN 182.9, F045 174.3); x790-840 y230-330 180.1; x820-860 y300-380 173.1. Options below. |
| F4 (no refracted orb strip; invisible cracks paid every frame) | PARTLY: cracks FIXED (deleted), strip open | the crack-sheet loop is deleted (uP4F.z spare): no ALU for an effect no judged pose shows (this also clears the judge's nit F7, fwidth after `continue`). Strip: a direct-path clamp x3 gives 543 clipped px as a bright patch at the band's top edge under the orb (not F420's strip) and overshoots at rest (q00 over-orb p95 246, q03 ring D sd 25); orb-through x2.5 in the hold gives 436 clipped px and a lighter lower strip (221.7 vs F420 206.5). Not adopted. | `fix/img/b2_p06.png` (r1 | clamp x3 | ramp x3). qc_fix: 0 clipped px outside the orb (F420 121); lower strip 214.2 -> 208.6 (F420 206.5) via the hold ramp, sd 24.9 (16.7). |
| F5 (smooth band faces, plastic caps) | NOT FIXED (open, options) | tried Noise B's own fade start (0.25 c/px instead of 0.15): crawl within noise (d 1.504 / 1.120 / 1.586 vs 1.356 / 1.216 / 1.379) but no visible grain (`fix/img/b2_q00band.png`); a frosted roughness floor 0.85 on the cut caps: still flat matte discs (`fix/img/b2_p06caps.png`). Both knobs removed. | qc_fix p04 log x680-880 y330-390 222.4 -> 219.0, lap 4.0 -> 3.0 (F358 200.4 / 4.1). Options below. |

### Switches after the fix round
`?p4ice=0` (MAIN exactly, re-proved below), `?iceaa=r11` (G5 incl. the hold ramp -> x1), `?icefrost=r11`, `?icecap=0` (Q6 incl. the
V joints -> MAIN's collar formula, 12 mm, depth 0.35), `?orbice=r11`, `?icehold=r11` (no crack sheets any more). New live knobs:
`uP4H.z` (hold ramp, 2.5), `uP4J` (1, 0.8, 0, 0.45) with `uP4D.y` 1.25 px.

### Open after the fix round, with options (need a design decision)
- **F3 q03 outer band / white ovals.** Diagnose first: `uR11Dbg` 1 (orbHit / out / nTir) on q03 shows whether the ovals are
  exits (non-TIR windows) in the internal-reflection zone. If they are: (a) widen the critical-angle ramp in oblique views
  only (`smoothstep` on `abs(dot(V, ea))`, like uR11K.w), (b) take Bump.001's tilt out of the trace normal there (Ntr), or
  (c) lower the transmitted gain only where the view runs along the ring (q00's band faces are within 1 L of F000 now and
  must stay). The builder found the trace roughness hi 0.6 / 0.85 washes out the TIR zones or raises crawl.
- **F4 strip.** F420's strip is the orb seen through the band's upper part with the band overlapping the orb's lower half;
  at p06 our band's top edge sits at the orb's bottom. Either the hold lane's framing (band / orb overlap) or a hold-only
  direct-path clamp (uP4C.x scaled by uHold) once the overlap exists. Needs the hold lane's pose first.
- **F5 texture.** Grain conflicts with G5's band limit: a visible scrape grain needs the fine bump (uR11A.z) or its finest
  octaves stronger, which the crawl gate must accept; the caps need a real chip / frost texture term on the cap plane
  (a cellular chip field with its own band limit), not a roughness floor.

### Evidence of the fix round (final build 21 Nov 02:19:50; source unchanged after it)
- **Patch** `WORK/p4ice_vs_aa7.patch`: 579 lines, sha256 8bd774c62c8191e10df86d710d9c15d5ea59c3f73be10c4dc2d297dc27b1c868; one file
  (`retrux-web/app/hero/engine/hero/IceMaterial.ts`), no new / removed files; applied to aa7's file it reproduces the lane file
  byte for byte (`fix/mkpatch_fix.sh`). The round-1 lane file is kept as `WORK/fix/IceMaterial.r1.ts`.
- **Identity** (`fix/ident_fix.txt`, identS 20 moving frames, final image + every render target + every linked program):
  T1 `?p4ice=0`, T2 `?p4ice=0`, `?envlake=plate&p4ice=0`, T0 (lane default) vs :5197 IDENTICAL (6 / 2 targets, 16 / 12
  programs, 0 console messages); lane default T1 / T2 differ only in `rx-ice`, the reflection target and the final image.
- **Typecheck** (02:16, after the last GLSL / TS edit; the 02:19 default change is a literal): `tsc -p tsconfig.hero.json`
  0 errors, `tsc -p tsconfig.json --incremental false` 0 errors.
- **Capture set** `WORK/qc_fix` (qc_r11.zsh, T1 scale 1: shoot_qc + ptr + sweep + region stats; 0 console errors / warnings).
  Numbers: `fix/ana_fix.txt` (the judge's own boxes and profiles), `fix/fix_icem.txt` (the panel boxes),
  `fix/sparkles_fix.txt` (judge's spark.py; isolated bright ice px p04 22 vs r1 37, p05 16+10 vs 65, p06 13 vs 26).
- **Perf** (rc2.mjs, interleaved AB / BA, SLOT_BG=0): MOVE 6 pairs at load 3.6-6.9: 0.993 1.026 0.986 1.048 1.018 1.040,
  median 1.022 (+2.2 %, +0.475 ms), the same as round 1 (`perf/ab_fix.json`). REST: 4 pairs at load 4.7-5.8 but with the quiet
  wait timed out and another lane's perf run on the GPU: 1.118 1.025 0.995 1.059, median 1.042 (+0.75 ms at ~18 ms)
  (`perf/ab_fix_rest.json`) - under 5 %, not a clean number; the fix removes more ALU (the crack loop on every fragment) than it
  adds (4 vec3 derivatives + a V per cut on joined pieces), so rest should sit at or below round 1's 1.008 / 1.027.
- Whole-frame diffs between capture sets (and between configs in one session) move everywhere (the environment animates
  between shots: q00 mean |dL| 2.4-7), so the per-program identity above is the proof that only `rx-ice` changed.
- Lab :5175 is running the final build (`node hero-lab/serve.mjs --no-watch`, log `WORK/lab.log`). No assets shipped.
