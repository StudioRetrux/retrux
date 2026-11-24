# P4 round 3, lane `ice` (p4ice3): HANDOFF

Builder p4ice3, 21 Nov 05:02 - ~06:50 WIB. Lane `LANES/p4ice3` (`cp -c -R LANES/int1`), lab **:5175** left running for the judge
(`PORT=5175 nohup node hero-lab/serve.mjs --no-watch` in `LANES/p4ice3/retrux-web`, log `WORK/lab.log`, final build 06:16).
WORK = `$SP/work_p4/p4ice3` (`LOG.md` has every batch with numbers); mirror = `MAIN/notes/round11/lane_backup/p4r3/p4ice3/`
(LOG, patch, tools, ana, ident, img). Inputs: rejudge_p4ice (R1, F3, F5, F4s, N1, N2, F6), the round-1 ice HANDOFF / LOG, plan
Q3 / Q6 / Q10 / G5 / Q4, the panel's composition issue 1. All numbers are T1, 1440x766, scale 1, from my captures.
(int1's own HANDOFF, which this file replaced in the lane copy, is kept as `WORK/HANDOFF.int1.md`.)

## Files
- `retrux-web/app/hero/engine/hero/IceMaterial.ts`: the only changed file. Every new line sits in `#ifdef ICE_P4R3` blocks
  (vertex and fragment) or in TS that runs only with the lane on. Rings.ts / assets.ts unchanged, shared files
  (HeroEngine.ts, PlateEnvironment.ts, Atmos.ts) untouched. **No new asset**: the geometry fix is a vertex-shader remap.

## Switches
| switch | restores | level |
|---|---|---|
| **`?p4ice3=0`** | **MAIN (int1) exactly**: no `ICE_P4R3` define, its blocks stripped from both stages (`stripDef`, their `#else` parts kept), no new uniforms; the back-depth material takes the front's (stripped) vertex source | build |
| `?p4ice=0` | unchanged from int1: the whole P4 ice off (round 1 + 3) = AA8's ice | build |
| `?icejoint=r1` | R1: round 1's V seams (tent, TIR floor 0.12, depth 0.8 x 0.6) | uniform |
| `?icegeo=0` | F5: the GLB's L2 section (no octagon remap) | uniform |
| `?iceedge=0` | F5: MAIN's entry corner rounding in the hold | uniform |
| `?icetir=0` | F3: the exit-wall facet tilt everywhere (MAIN) | uniform |
| `?icehold3=0` | F4s / N1: round 1's direct-path clamp in the hold and hold chroma 0.92 | uniform |

Why `?p4ice3`: in int1 `?p4ice=0` already means "round-1 ice off" (= AA8). Keeping it and adding `?p4ice3=0` lets the lead
3-way merge without changing an existing switch; both are proved below. Sub-switches run the ICE_P4R3 program with round 1's
values (arithmetic-equivalent; only `?p4ice3=0` is bit-identical). F6 (rim-line AA) has no uniform switch.
Live knobs: `__hero.rings.materials[i].uniforms.uP4K / uP4L / uP4M / uP4N` (documented in the shader); new debug view
`uR11Dbg = 8` (|V . n_cut|, the V value, the TIR share of the strongest joint crossing).

## What changed, why, and the measured effect
### (1) R1 - joints at rest (FIXED)
Round 1's tent-shaped V peaked on one pixel, so the face-on rest seams almost vanished. Debug view 8 showed |V . n_cut| =
0.67-0.76 (display) at the q00, q01, q02 and q03 seams alike, so the rejudge's "face-on gate" cannot tell rest from loop.
Instead the V everywhere gets a flat core (a trapezoid: full depth from vK 0.6, i.e. the middle 40 % of the crossing band),
a TIR-mix floor of 1 instead of 0.12, depth uP4J.y 0.8 -> 1 and uR11B.z 0.6 -> 0.7 (uP4K = (-1, 0, 0.6, 1); x / y = the
face-on ramp, left open). Batches jA-jJ in LOG.md; `tools/r1m.py`:

| | q00 row 385 L / R min | q03 bottom / top strap | q01 x805 | q02 row 375 |
|---|---|---|---|---|
| target (rejudge) | <= 150 / <= 120 | ~140-150 / - | 2-3 px V + bright line | ~ -10 %, ~10 px |
| REF (F000 / F045 / F015 / F030) | 129 / 99 | 139 / 117 | `213 208 190 171 181 195` | band 164-168 + 200-213 line |
| MAIN (int1, p3/r11_2) | 188 / 144 | 169 / 129 | `211 208 193 185 189 197` | V to 158 |
| **lane (qc_final)** | **150 / 121 (slit 11-12 px wide)** | **148 / 101** | **`212 203 160 154 156 178 202`** | **8 px at 123-138 (field 192)** |
Images: `img/final/q00_joints_MAIN_LANE_REF.png` (both band-end slits now read like F000's), `q01_joint_MAIN_LANE_REF.png`.
Side effects: q02's seam and q03's top strap are darker than the reference (N2 worse: an 8 px band at 123-138 vs F030's
164-168); q01's V is deeper than F015's (154 vs 171) and 3-4 px wide (target 2-3) with its bright line. Idle crawl tail (below).

### (2) F5 + composition issue 1 - soft rounded tubes, domed caps (ROOT CAUSE FOUND; geometry fixed; partly open)
**Root cause: geometry AND shading.**
- Geometry: the artist renders the rings at **SubD level 1** (Blender 5.2 on a COPY of `blender/Home - EXPORT.zip`, through the
  slot, `tools/bl_rings.py`: SUBSURF levels 1 / render 1, limit surface, creases on (8 creased cap edges), Smooth by Angle;
  render-evaluated section of Circle.028 = 8 points (1.0031, 0) (1.0312, +-0.1552) (1.1060, +-0.2134) (1.1808, +-0.1552)
  (1.2088, 0) - exactly the shader's R11_OCT octagon; caps = flat octagons). `hero.glb` carries **level 2**
  (`tools/glbsec.py`, `glbcap.py`): 16-point sections whose surface bulges up to 0.13 w outside the octagon between its
  corners, smooth normals across the L1 corner, and 16-gon caps with an interior grid (r_max 2.401 vs 2.386 mid-span). So the
  rasterised outlines and caps were rounder than the render mesh, while the trace already shaded the L1 octagon.
- Shading: the face map (debug 2) shows the octagon's faces as clean stripes, but the entry corners were rounded over
  uR11F.z 0.15 w (+1.5 px), which in the dolly is a 10-20 px soft shoulder; with no rounding the slab edges turn crisp
  (`img/f5a_p04.png`, `f5a_p06.png`, `edge_r1_vs_e15.png`).
**Fix:** (a) a vertex remap moves every section point that lies outside the L1 octagon radially onto it (caps' interiors stay),
so silhouettes, caps and the traced shading agree with the artist's mesh (uP4L.x 1); (b) the entry-corner rounding is capped
at 4 pixel footprints at rest (>= 0.15 w there, so rest is unchanged) easing to 1.5 px with uHold (uP4L.z / y). Effect: the
dollied-in caps read as octagonal flat ends instead of domes (`img/final/p04_MAIN_LANE_F358.png`, `p05_MAIN_LANE_F402.png`);
rest boxes unchanged (q00 face 208.2 -> 208.3, lower arcs 187.7 -> 187.7, same-pose `tools/restd.py`).
**Still open (needs a decision):** the bands still read as frosted logs next to F358 / F420's boxy slabs. What is left is
surface detail - scrape grain, chipped edges, crisp internal TIR lines - which round 1 band-limited away for G5 (crawl).
Tried and NOT adopted: crisp internal corners in the hold (uP4L.w 0.04 w: crisper TIR lines but isolated pixels along the
arcs, p06 27 vs 7); MAIN's roughness ramp in the hold (uP4N 0.233-1: darker frost blotches, N1's complaint). Both are live
knobs. The reference's section is the octagon too, so a rectangular re-section would be "inventing"; I did not build one.

### (3) F3 - q03 outer steel band too light, white ovals (FIXED: ovals; band 2.5-5 L darker, still lighter than F045)
Diagnosis (`img/f3_dbg.png`, `f3_tilt.png`): the ovals sit in the transmitted light (debug 5) in islands of a different exit
wall (debug 2); exit-wall tilt off (uR11H.z 0) removes them, all tilt off too, Bump.001 off does not. They are non-TIR exit
windows punched by the exit wall's smooth facet tilt (0.4 m blobs). Fix: that tilt eases out deep inside total reflection
(full within 0.02 of the critical angle's cosine, 0 from 0.12 below; uP4M.x / y / z). The zone's own edge keeps its wobble.
q03 outer boxes 188.6 / 175.2 / 170.7 (sd 27.3 / 33.1 / 30.8) (MAIN 191.1 / 180.0 / 173.1, F045 174.3 / 165.2 / 157.0); `img/final/q03_band_MAIN_LANE_REF.png`:
the band is clean and the joint strap reads like F045's.

### (4) F4s - refracted orb strip in the hold (PARTLY)
The direct orb paths' clamp rises x2 at full hold (uP4M.w; rest unchanged). p06: clipped px outside the orb box 0 -> 365 (F420 121), band 204.5 -> 205.4 (F420 206.9), lower strip sd 26.1 -> 26.8 (F420 16.7); `img/final/p06_band_orb_MAIN_LANE_F420.png`. The band over the orb's lower
half passes clipped orb light at its top edge, but not F420's strip shape (x3 looked the same). Open.

### (5) N1, F6 (nits)
N1: hold chroma 0.92 -> 0.86 (p06 band sat 0.180 -> 0.169, F420 0.162; band sd 24.6 -> 25.2 (F420 20.4)). F6: the steel-blue rim line's band widens by 0.75 fwidth(dot(Ng, V)):
isolated bright ice px (spark.py, ice-changed px) p04 18 -> 11, p06 12 -> 6, q00 6 -> 4, q01 12 -> 7; but p05 7 -> 14 (a short vertical run at x869-872 y405-422) and q03 19 -> 21.

## Crawl (`tools/seq.mjs` + `flick.py`: 10 consecutive 60 fps frames, RAF stopped, temporal 2nd difference on ice px)
| seq | MAIN d2 mean / p99 | lane | lane `?icejoint=r1` |
|---|---|---|---|
| hold (p05) | 5.24 / 24.8 | 5.12 / 23.1 | - |
| sustain (p06) | 5.09 / 22.1 | 5.25 / 23.2 | - |
| eye (q03 idle) | 20.58 / 47.3 | 20.83 / 52.0 | 20.02 / 47.8 |
| rest (q00 idle) | 20.86 / 47.7 | 21.58 / 53.7 | 20.63 / 48.9 |
(measured on the 05:48 build, which differs from the final only by uP4L.w 0.04 in the hold.) The hold is calmer; the idle p99
tail (+10-13 %) comes from the deeper R1 seams (a higher-contrast feature moving with the tumble), not from the geometry,
F3 or the edges: with `?icejoint=r1` the lane sits on MAIN's numbers.

## Evidence
- **Patch** `WORK/p4ice3_vs_int1.patch` (`diff -u --label a/retrux-web/<f> --label b/retrux-web/<f>`, one file): 307 lines, sha256 81a05476c3c7c5cb9f6a6ba44da10574dbf632300b9e1cf56ab75c1519f4968a.
  Applied to int1's file (`tools/mkpatch3.sh`: dry run + apply on a scratch copy) it reproduces the lane file byte for byte.
- **Typecheck** (06:15, after the last edit): `npx tsc -p tsconfig.hero.json --noEmit` 0 errors; `npx tsc -p tsconfig.json
  --noEmit --incremental false` 0 errors.
- **Identity** (`tools/identS.mjs`, 20 moving frames, final image + every render target + every linked program's source;
  `WORK/ident/*.json`): 
  | run | result |
  |---|---|
  | T1 lane `?p4ice3=0` vs :5173 | IDENTICAL (final + 6 targets: mirror, walk, cache, cacheN, reflection, final; 16 programs; 0 console messages) |
  | T2 lane `?p4ice3=0` vs :5173 T2 | IDENTICAL (6 / 16) |
  | T0 phone 390x844 DPR3, lane default vs :5173 | IDENTICAL (2 / 12): the lane is off on T0 (no ICE_P4) |
  | `?envlake=plate&p4ice3=0` vs :5173 `?envlake=plate` | IDENTICAL (2 / 12) |
  | T1 lane `?p4ice=0` vs :5173 `?p4ice=0` (the round-1 switch survives) | IDENTICAL (6 / 16) |
  | negative control: T1 lane default vs :5173 | DIFFER: reflection + final; programs rx-ice and rx-ice-back (the back material's text only: it carries the front's vertex source, whose ICE_P4R3 code sits inside `#ifdef ICE_R11`, which the back pass does not define) |
  Runs on the 05:48 build; the 06:15 edit changes one TS default (uP4L.w) inside `p4r3Uniforms`, which does not run with the
  lane off, so the off path (stripped sources, no new uniforms) is the same code - and re-proved on the FINAL build (06:35:
  `ana/ident_final.txt`): T1 `?p4ice3=0` IDENTICAL (6 / 16), T2 `?p4ice3=0` IDENTICAL (6 / 16), T0 phone default IDENTICAL
  (2 / 12), against the same :5173 runs (MAIN is frozen).
- **Capture set** `WORK/qc_final` (qc_r11.zsh, T1, scale 1: shoot_qc + 10 pointer spots + sweep + region stats). Panel-box
  numbers `ana/icem_final.txt`, joints `ana/r1_final.txt`, q03 band `ana/f3_final.txt`, isolated pixels `ana/sparkles_final.txt`.
- **Perf** (`tools/rc2.mjs` = the perf judge's rtxu copy: unthrottled Chrome, product loop, T1 scale 1, 1440x766, interleaved
  AB / BA, MOVE = CDP mouse sweeps, REST = no input; SLOT_BG=0; `perf/ab_r3*.json`). The machine was shared with every other
  round-3 lane's perf and capture jobs (1-min load 16-35 at times):
  | run | conditions | MOVE pairs (lane / main median-interval ratio) | REST |
  |---|---|---|---|
  | 1 (06:04, `ab_r3_void_load25.json`) | VOID: load 16-29 in every block (my quiet-wait ignored the wrong label and timed out) | - | - |
  | 2 (06:33, `ab_r3b.json`) | quiet-wait passed at 9.72; blocks at 9.2-10.9 (4 of 8 pairs < 10) | **1.018 0.989 0.999 1.001 0.992 0.989 1.015 1.000: median 1.000 (-0.03 ms)**; the 4 pairs < 10: median 0.996 | 1.23 1.12 0.936 1.094 (block medians jump 31-71 ms on both pages: contaminated) |
  | 3 (06:38, `ab_r3c.json`) | every block at load 6.7-7.5 (8 / 8 pairs < 10) but the GPU throttled (63-65 ms frames on both pages) | 0.946 1.090 1.098 1.216 0.968 1.142 0.975 1.014: median 1.052, spread 0.95-1.22 (cannot resolve 5 %) | 0.977 0.958 1.487 0.986: median 0.982 |
  | 4 (06:45, `ab_r3d.json`) | VOID: quiet-wait timed out with another lane's perf run on the GPU; load 16-19 | (0.70-1.26, median 0.878) | (median 0.856) |
  Reading: run 2's tight pairs (spread +-1.8 %) put MOVE at +0.0 %; run 3 qualifies on load but its throttled frames scatter
  +-15 % per pair, so its +5.2 % median is noise of that state (the lane renders the same passes with a few ALU more).
  Cost by construction: no new pass, no new texture fetch, no new render target; ALU only - an 8-wall loop per vertex (the
  remap), a smoothstep / mix per joint crossing, one smoothstep per first exit (F3), one fwidth + two smoothsteps in the rim
  line (F6), a min / mix at the entry corner. T0 is unchanged (identical program, proved).

## Open
- **F5 (main gap left):** the dollied-in bands still read as frosted logs next to F358 / F420's slabs. Geometry and edge rounding
  now match the artist's mesh; what is missing is surface detail (scrape grain, chipped edges, crisp internal TIR lines), which
  conflicts with G5's band limit (crawl). Knobs to try with a crawl gate: uP4L.w (internal corners in the hold; 0.10 cost
  12 vs 7 isolated px at p06), uP4N (hold roughness ramp), a band-limited scrape term on the cap and face planes.
- **F4s:** the hold clamp lets the band over the orb pass clipped light (365 px vs F420's 121) but not F420's strip shape:
  that needs the band to show the orb through its upper part with crisp internal lines (pose + trace work).
- **R1 side effects:** q02's seam is darker than F030 (an 8 px band at 123-138 vs 164-168: N2 worse), q03's top strap 101 vs
  F045's 117, q01's V 154 vs F015's 171; a view gate could not separate them (|V . n_cut| the same at all four seams), so a
  per-ring or per-distance depth would be the next step. The idle crawl p99 tail rises with the deeper seams (+10-13 %).
- **F3:** the band is still 12-14 L lighter than F045 in the three boxes (the white ovals are gone).
- **p05 isolated pixels** 7 -> 14 (spark.py) - not attributed in time (the internal-corner cause is removed; the remaining run
  sits at x869-872 y405-422).
- Not this lane: ring A's joints sit 5-20 px off F000's x (mocap phase); q03 ring D in front of the orb stays a pale flat band
  without shards in the box (same-pose round 1 vs round 3: identical, `tools/ringd.py`; MAIN's sd 25.3 in p3/r11_2 is two shards).
