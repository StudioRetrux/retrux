# P4 round 2, lane `water` (p4water): HANDOFF

Two builders, 21 Nov 2026 (WIB): the first 01:10-02:39 (cut off by a network error; its work kept), the continuation 02:55-04:55.
Lane `LANES/p4water` (cut from aa8 with `cp -c -R` at 01:12; aa8 app/ == MAIN app/), lab **:5177** (`node hero-lab/serve.mjs
--no-watch` in `LANES/p4water/retrux-web`, log `WORK/lab.log`, final build 04:06:35; left running for the judge).
WORK = `$SP/work_p4/p4water` (LOG.md is the full dated record), mirror = `MAIN/notes/round11/lane_backup/p4r2/p4water/`.
Tasks (MAIN/notes/round11/p3/r11_1_plan.json): **G2** done (the glass-plate arc and the dashed line are gone), **Q9** done
(partly: less corduroy, right floes matched), **Q8** built but no measurable gain on the panel's harness frame, **G6** built but
OFF by default (it fails the pop gate), **AJ-1** not fixed (see Open). Numbers: T1 1440x766 scale 1, Rec.709 luma (consistent A/B, not the panel's luma).

## Files
- `retrux-web/app/hero/engine/world/Water.ts`: the only changed file (`WORK/p4water_vs_aa8.patch`, 457 lines, sha256
  eeb37e42c2640e05e002ba58b8417b018e5cecc96c9766e9e384c5bad06523cd; applies to a fresh aa8 clone with 0 .orig / .rej, app/ identical,
  tsc 0 / 0). **No hunk in HeroEngine.ts, LakeMirror.ts, LakeSchedule.ts or any shared file** (the switches are read in Water.ts
  like every other lake switch), so the 3-way merge has nothing to resolve outside Water.ts.
- Mechanism: one P4 block after the AA5b guard (`p4Apply`). Each task is a list of source edits of the water's fragment source
  (a whole function swapped, or an anchor replaced; every anchor must occur exactly as often as expected or the constructor
  throws), applied in the LAKE_R12 constructor branch only while the task is on. Off = MAIN's text: no define, no uniform. The
  knobs are live uniforms `uLkP4*` on `__hero.water.material.uniforms` (shared with the walk / cache passes).

## Switches
| switch | effect | scope |
|---|---|---|
| `?p4water=0` | MAIN exactly (program text, every target, final image: ident below) | the lane |
| `?lkchop=0` | G2 off: MAIN's crest train, march, tilt, footprint | source |
| `?lkring=r11` | Q8 off: MAIN's ring profile, clamp, glint | source |
| `?lkglass=0` | Q9 off: MAIN's bump (no alias guard) | source |
| `?lkwalkj=1` | G6 ON (off by default) | source |
| lab (with `debug`): `lkringq=<Q>`, `lkglassg=<a>,<b>`; debug view `uLakeDebug = 12` = G6's per-pixel walk share (with `lkwalkj=1`) | | |

T0 phones and `?envlake=plate` / `?envlake=mirror` are untouched (the edits apply only on the default LAKE_R12 lake).

## What changed and why
**G2 - the hold / pop bottom strip (priority 2).** Measured first (tools/camdist.mjs): the hold camera (y 2.36 m) sees the bottom
strip y686-766 at 16.5-22.4 m, the rest camera at 13-16 m; the plan's near band (4-14 m) never reaches the frame. Built:
1. A near-field chop on the crests' tilt in the hold: three value-noise octaves (0.45 / 1.0 / 2.4 c/m, turned 0 / 37 / -23 deg,
   drifting 0.35 / 0.6 m/s), x the dolly, fading out 19-26 m from the camera, each octave band-limited by the pixel's footprint.
   **It rides only on the water the crest train already tilts**, and the per-pixel walk keeps the train's tilt alone (see Perf:
   chop everywhere + a chopped walk normal cost +0.83 ms per hold frame; the noise itself costs ~0). So the chop spreads with
   the wave front from the press, like the crests.
2. The crest train irregular: phase +-0.25 m, amplitude x(1 +- 0.25) from a 3 m value noise of the world position.
3. A derivative-aware march (a crest top grazed between two steps is tested at the slope's zero): continuous silhouettes.
4. A footprint floor (1.5 texels along the target's rows) on the tilted water's strata lookups.
6. Specular AA: the tilt's change across the pixel joins the slope spread (0.3 x fwidth).
7. **The dotted line** along the crest silhouettes was not the march (unchanged with 48 steps, `?lkwave2=0`, TAA / resolve off,
   any spread): just behind each crest top the back flank turns the reflection through elevation 0, a sub-pixel sliver caught on
   one pixel per row step. A soft floor on the tilted reflection's elevation (~ the flat water's) removes it.
(The plan's step 5, a rest-ring fade within 6 m of the camera, has nothing to act on: the nearest visible water is 13 m away.)

**Q8 - rest ripple rings.** The plan's steepening (Q +0.6: narrow troughs) moved the ring box away from F000; the opposite sign
(steep faces at the crests: the dark face toward the camera with a thin bright rim behind it, broad calm troughs: F000's "dark
trough with a thin bright rim on its far side") moved it toward F000 at the first builder's capture time, but NOT on the panel's
harness q00 (Capture set below: within 1-2 levels of MAIN). Default Q -0.35, amplitude x(1 +- 0.3) around the ring
(3 + 5 lobes drifting with the radius), crest clamp 0.48 -> 0.55, the orb glint anisotropic GGX (alpha 0.16 x 0.078) tinted 60 %
toward cyan-white (0.58, 0.83, 0.91). Not built: the plan's fine chop inside the inner rings and the near-water body tint.

**Q9 - glassy mid / far lake.** The bump's alias guard: an octave whose footprint (x the DOF) spans 0.15-0.45 lattice cells gives
up its coherent share to the incoherent spread (lkBump's own Tr^2 - c^2 bookkeeping: total slope variance kept), **faded in over
30-40 m** (24-34 m added two 6 px pops at the near far floes' waterlines, ~33 m; the ring zone keeps its wavelets). The plan's
step 2 (`uLakeFar` 0.05 -> 0.03) does not apply: `uLakeFar` is read only by the ENV lane's `?envlake=mirror` model.

**G6 - the orbit 'LAKE_CORR ghost' (built, OFF by default, `?lkwalkj=1`).** Still on AA8's default lake (ptr_right x520-590
y470-495). A/B on MAIN: `ffblock=0`, `lkmscale=1,1`, `lkcache=0`, +1 s settle, `atmosshore=0`, `atmos=r10`, `lkwsel=0`,
`lkwnear=0`, `lkwedge=0` keep it; `lkwdiv=2` shrinks it; `lkwdiv=1` and `lkhalf=0` remove it. Root cause: the quarter-size walk
target (a thin face feature that only some walk texels sample, interpolated over 4x4 px). Not LAKE_CORR (not compiled with
LAKE_R12), not the cache, not a stale pose. The fix (where the four walk taps disagree, the pixel's own walk is blended in, faded
in over 30-40 m) removes the ghost (img/g6fin_ptrR_x3_main_def_g6on.png, row 3) **but adds 5 new pop clusters >= 6 px** over
the six AA paths (fast 1, reverse 2, leave 2: thin dark lines at the far floes' feet). Bisect (reverse): `?lkwalkj=0` 0 clusters,
`?lkglass=0` 3; G6's threshold band (0.003-0.015 / 0.03-0.10) changes nothing: its weight is saturated there, i.e. the pixel's
own walk itself flickers at those feet where the bilinear quarter-size read was steady. The waterline gate does not allow new
pops, so it is off; it also cost most of the earlier hold / move overhead (perf below). Also seen: `?lkv=3` is broken on MAIN
(WebGL "program not valid"; a lab switch, pre-existing).

## Evidence (WORK; key images mirrored)
### Identity (tools/identS.mjs: 20 moving frames, final image + mirror / walk / cache / cacheN / reflection + every linked program; ana_ident_final.txt, final build)
```
T1 ?p4water=0 vs :5199                 IDENTICAL final SAME | targets 6 differ: - | programs 16 differ: - | logs 0/0
T2 ?p4water=0 vs :5199                 IDENTICAL final SAME | targets 6 differ: - | programs 16 differ: - | logs 0/0
T0 phone (lane default) vs :5199       IDENTICAL final SAME | targets 2 differ: - | programs 12 differ: - | logs 0/0
envlake=plate (lane default) vs :5199  IDENTICAL final SAME | targets 2 differ: - | programs 12 differ: - | logs 0/0
envlake=plate&p4water=0 vs :5199       IDENTICAL final SAME | targets 2 differ: - | programs 12 differ: - | logs 0/0
T1 lane default vs :5199               DIFFER    final DIFF | targets differ: walk,final | programs differ: rx-water, rx-water-walk
```
### Typecheck
Lane: `npx tsc -p tsconfig.hero.json --noEmit` rc 0, `npx tsc -p tsconfig.json --noEmit --incremental false` rc 0 (logs/tsc_*4.log);
the apply clone: 0 / 0.
### Perf A/B vs :5199 (tools/rc2h.mjs: product loop, T1 scale 1, interleaved AB / BA, 8 pairs per mode, SLOT_BG=0)
Final build (perf/ab_run5.json, load 3.6-10.4; perf/ab_run6_rest.json, rest only, load 5.3-6.2), paired median lane / main:
```
move  0.996  (-0.08 ms; lane 22.1 / main 22.3 ms median)       8 pairs < 10
hold  1.000  ( 0.00 ms; 23.4 / 23.1)                           7 pairs < 10: 0.996
rest  1.035 / 1.019 (+0.88 / +0.38 ms; 20.7 / 20.4)            pairs swing 0.53-1.98: other jobs' GPU load made the blocks
                                                                bimodal (19 vs 37 ms); same-mode pairs ~1.02
```
History (why the final build is cheap): with G6 on and the chop on all near water (run 2, load 3.2-4.6) the hold cost +7.5 %
(+1.68 ms; every pair +3.5..+9.4 %) and move +2.6 %. Hold split (perf/split_hold1/2.json): the chop +0.75..0.83 ms, but with its
amplitude at 0 (noise still computed) ~0 ms: the cost was the chopped normals downstream (newly tilted pixels skip the cached
term; a chopped walk normal makes the per-pixel heightfield walks diverge). Fix: chop only where the train tilts the water, walk
on the train's tilt alone -> run 3 hold +3.8 % (+0.88 ms), move +3.4 %. Then G6 off (run 4 hold 1.000) -> the final numbers above.
### Waterline AA gate: pops (tools/popana.sh = AA8 tip's recipe: popscan / popnew thr 40, band +-3, bloom-free masks aa5b slow /
### medium / reverse, aa5a fast / diag, refl leave; 16-sample GTs; AA8 = its saved captures work8/motion/caps/<path>_A8, proven
### equal to this lane's `?p4water=0` capture: medium 240 frames, 0 px differ)
Final build (caps/pop/<path>_Z, ana/pop_<path>_Z.txt):
```
path     AA8 flagged / events>=6px / px   LANE                  new pops (LANE vs AA8)     pops the lane removes
slow     1318 / 36 / 255                  1274 / 36 / 249       28 px, 28 clusters, 0      50 px, 34 cl, 1 >= 6
medium   3043 / 99 / 1280                 2903 / 89 / 1192      34 px, 31 clusters, 0      51 px, 39 cl, 1 >= 6
fast     2389 / 77 / 910                  2290 / 74 / 850       23 px, 22 clusters, 0      26 px, 25 cl, 0
diag     1719 / 48 / 620                  1672 / 46 / 616       15 px, 15 clusters, 0      25 px, 16 cl, 1 >= 6
reverse  2120 / 60 / 875                  2017 / 57 / 842       15 px, 14 clusters, 0      19 px, 19 cl, 0
leave    1991 / 62 / 896                  1934 / 62 / 873        5 px,  5 clusters, 0      11 px,  9 cl, 0
```
No new cluster >= 6 px on any path; fewer flagged px than AA8 on every path. (With G6 on: 5 new clusters, LOG 03:39; with Q9 at
24-34 m: 2, LOG 03:58.) G1 crawl was not re-measured with the coverage-mask tools (the lane does not touch the TAA, the resolve,
the guard or the mirror; the pop counts above are all at or below AA8's).
Hold path (cap `hold`: press 0.5 s, 5 s hold, release, 3 s; ana/pop_hold.txt, build 03:26 = this G2, G6 on): bottom strip
y686-766 frame-to-frame |dL| in the sustain 2.19 vs AA8 1.64 (px > 12 lv 3.3 % vs 2.2 %): the chop's own drift; the lake band
y480-686 is calmer than AA8. popnew there flags the bottom strip during the press dolly (k63-98, x1310-1420) and the release
(k313-322, x397-462): moving chop where AA8 had a smooth dark wedge (img/pop_hold_k68-92_x1260-1440_A8_L_z2.png, x2: short
dark-blue dashes; img/hold_k80_bottom_A8_L_z1.png, 1x: choppy water vs AA8's pale arcs). That is G2's intended change; a
motion judge should look there at 60 fps. Final build (caps/pop/hold_Z; ana/pop_hold_Z.txt): the same picture (4200 px, 140
clusters >= 6 px: 113 in the bottom strip, 18 at y660-686, 9 at y608-653 during the release k314-335 near the right snow shore,
0 above y600, i.e. none at the far floes). Looked at img/pop_holdZ_rel_k312-326_x1040-1300_A8_Z_z2.png: the release frames look
alike (the same rippled water as the shore rises into view).
### G2 numbers (bottom strip y686-766; caps/v2: MAIN = ?p4water=0 | lane; Rec.709)
```
       MAIN sd / p1 / p10        lane                      reference
p04    15.56 / 121.6 / 161.1     16.05 / 122.2 / 155.6     F358 20.04 / 111.0 / 150.0
p05    12.18 / 143.3 / 163.4     14.89 / 114.7 / 159.5     F402 17.53 / 120.5 / 153.0
p06    15.22 / 128.4 / 157.3     16.44 / 126.7 / 154.9     F420 17.53 / 117.6 / 152.0
```
Means within 1.5 levels of MAIN. Looked at img/v2_p06_bot.png (MAIN | lane | F420) and img/v2_p06_bl_x2.png (x2): MAIN's smooth
pale arc, its stair-stepped edge and the dashed diagonal line are gone; irregular wavelets and dark-blue patches as F420.
### Capture set (qc_r11.zsh -> WORK/qc_final, final build, rc 0, 04:11-04:14; compare with the panel's MAIN set $SP/p3/r11_1)
- region_stats_q00.txt: every region within 1 level of MAIN's except "bottom centre" (161,175,194 vs MAIN 158,172,192, ref
  155,172,193) and "water near" (166,179,200 vs 167,180,200).
- G2 on the harness's hold frames, bottom strip y686-766 (sd / p1 / p10; MAIN panel -> lane, reference):
  p04 14.62 / 122.4 / 163.3 -> 16.14 / 121.5 / 156.1 (F358 20.04 / 111.0 / 150.0); p05 11.47 / 143.1 / 163.9 -> 12.98 / 134.0 /
  162.0 (F402 17.53 / 120.5 / 153.0); p06 11.38 / 143.0 / 164.8 -> 11.94 / 143.1 / 163.5 (F420 17.53 / 117.6 / 152.0);
  sw_hold_B sd 13.68 -> 16.51, p1 137.3 -> 124.2; sw_pop_L / _B sd +1.2 / +1.3, p10 -6. p07 / p08 unchanged.
  Looked at img/qcp06_bot_main_lane_F420.png (harness p06): MAIN's smooth pale crest arc is replaced by choppy wavelets as F420
  (the sd moves little at p06 because MAIN's arc gradient already carried variance; p1 does not reach F420's).
- Q9 on q00 (lap = local roughness; MAIN -> lane, F000): water x300-1140 y480-560 lap 12.53 -> 10.47 (3.09), sd4 6.23 -> 5.65
  (2.57); corduroy box x640-900 y490-560 lap 11.99 -> 10.53 (2.46); right floes x900-1440 y500-550 lap 9.12 -> 5.94 (3.04),
  sd4 4.06 -> 2.95 (2.96). Means unchanged (+-0.3).
- Q8 on q00: NO measurable gain on the harness frame: env box x400-800 y600-660 p10 160.8 -> 160.5 (F000 171.7), mean 187.4 ->
  188.6; grade box p1 140.3 -> 141.4 (F000 108.8); glint box p99 234.4 -> 228.0 (F000 231.1). Looked at
  img/qcq00_ring_x2_main_lane_F000.png: the rings' character is nearly unchanged (soft dark bands under fine sparkle; F000's are
  agitated, deeper troughs, brighter crest faces, a cyan-white glint band). The first builder's 171.0 was measured at another
  ring phase.

## Open
- **AJ-1 (thin-tip pale spot) not fixed.** The lane leaves it as AA8 has it (fixer's spotdur, medium, box x170-240 y497-509 thr 15:
  AA8 11,518 px-frames, lane 11,464). Option 2b's facing bit needs PLATE_MIRROR_FRAG and the uber shader's mirror branch in
  PlateEnvironment.ts (lane p4env's file, outside this lane), and the tip LOG's holdre data puts the bright front row above X's
  foot line (seen over the face's top: likely the floe's front-facing top), so the bit would not settle that case; refining X
  alone cannot separate the inside (0.2-1.1 m behind X on a thin tip) from a sunlit face behind X. Option 3 (2x rows, est.
  +0.6-0.7 ms per moving frame + FS / DR / RS retuning) does not fit the 5 % rule. Lead decision, as the AA8 fixer wrote.
- **G6** is off (above). A fix needs the per-pixel walk to be steady at far floe feet (e.g. no per-pixel walk within a few walk
  texels of a marked / floe texel, or a 2-tap supersampled walk there), then the six-path pop gate again.
- G2: a faint stepped crest edge remains at x0-180 y~713 (p06, x2); the press dolly's bottom right shows short dark-blue dashes
  at x2 (hold strip above); harness p05 / p06 p1 stays at 134-143 (F402 / F420 118-121). Q8: no gain on the harness q00 (the plan's
  env-box gate p10 >= 160 holds, 160.5, but MAIN already had 160.8; the grade-box gate p1 <= 120 is missed, 141); it passes every gate and costs ~0,
  so it is left on, but `?lkring=r11` drops it with no visible loss. A real Q8 needs the reference's agitated ring texture
  (deeper troughs, bright crest faces) and the cyan glint band, not a profile change.
- Q9 at 30-40 m leaves the 33-40 m water with its wavelets (the 24-34 m band was smoother there but added two pops).

## Assets
None (no files in `public/hero/`).
