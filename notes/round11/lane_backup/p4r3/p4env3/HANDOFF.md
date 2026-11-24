# p4env3 HANDOFF (P4 round 3, ENV lane: the round-1 env judge's J1-J7) - 21 Nov 2026 05:02-07:00 WIB

Lane `LANES/p4env3` = `cp -c -R LANES/int1` (05:03; app/ == int1 app/ == MAIN's retrux-web/app, diff -r empty). Lab **:5174**
(`PORT=5174 node hero-lab/serve.mjs --no-watch` in LANES/p4env3/retrux-web, log WORK/lab.log) is left running on the final code.
WORK = $SP/work_p4/p4env3 ($SP = /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad);
LOG.md there is the dated record. Mirror: MAIN/notes/round11/lane_backup/p4r3/p4env3/ (LOG, HANDOFF, patch, ev/, id/, perf/, qc_key/, tools/).
`HANDOFF_int1_copy.md` in the lane folder is int1's handoff, copied with the lane (not mine).

## Status
| id | task | status | what |
|---|---|---|---|
| J3 | far peak's warm top-edge rim in every hold / pop | **FIXED** | mesh-top floor on the far-range crest test (`?p4rim=0`) |
| J5 | white zig-zag near the main summit at long idle | **FIXED** (root cause was not a crack) | soft intersection fade of the cards (`?p4crack=0`) |
| J6 | cardLit floor on luma instead of per channel | **DONE** | floor on the change's luma, 40 % dark / 65 % white-lit (`?p4luma=0`) |
| J7 | lossy WebP instead of the +89 KB lossless texture | **DONE** | q100 sharp-YUV, 39,074 B, frame max 1 level (`?p4webp=0`) |
| J2 | grey smudge at the hold's bottom-right edge | **water lane** (checked) | open water reflecting the sky, no floe / back face there: R12's own shading |
| J4 | pale box on the far-left shelf at rest | **NOT FIXED**, attributed | the lake reflecting V2_Massif right of where the floe Retopo_Plane.006 ends; the cut is in plate_rest itself |
| J1 | flat slate wedge, bottom-left of every pop frame | **NOT FIXED** | needs the pop-camera Cycles plate projected into rock_big_4.005 (no Blender run in this box) |

## Switches (each part restores int1 = MAIN exactly; read once in p4env.ts)
- `?p4env3=0` every round-3 part off = MAIN (int1) exactly (ident below). `?p4env=0` still turns the WHOLE env lane off (round 1 +
  round 3) = AA8 (:5199), identical on :5174 and :5173 (ident below).
- `?p4rim=0` J3, `?p4luma=0` J6, `?p4webp=0` J7, `?p4crack=0` J5. Each round-3 part rides on the round-1 part it changes (rim needs
  `p4crest`, luma needs `p4card`, webp needs `p4tex`), so the round-1 switches keep their meaning.
- Lab knobs (defaults are the shipped values): `?p4rimband=lo,hi` (0.001,0.0005), `?p4lumafloor=dark,white` (0.4,0.65), `?p4soft=m` (20).

## Files (patch WORK/p4env3_vs_int1.patch, 295 lines, 14 hunks, sha256 c58e6df7ad372da9926f3369ebb00fbefffb643ba3c7fbd28c1c8b2236145e5a;
`diff -u --label a/retrux-web/<f> --label b/retrux-web/<f>` per file; dry-run + apply on a clone of int1's app: rc 0, 0 .orig / .rej,
result == lane app)
- `app/hero/engine/p4env.ts`: the round-3 flags (`rim`, `luma`, `webp`, `crack`, `rimBand`, `lumaFloor`, `softM`).
- `app/hero/engine/world/Atmos.ts`: `CREST_P4_TOP` (the far mesh's own top per plate column, crest_ray2.json far.v; 0 for the mist
  columns 115-128) and `rangeCrestTableP4Top()` (RGBA: crest, depth, top). MAIN's tables untouched.
- `app/hero/engine/world/PlateEnvironment.ts` (SHARED file): CARD_LIGHT_FRAG_SRC's CARD_WHITE return (J6); CLOUD_FRAG_P4 gets one
  more string replacement (J3) and the crest texture becomes RGBA when `rim` is on; `p4Crack()` wraps the cloud shader (J5, compiled
  only with the P4_CRACK define); new method `bakeCloudDepth()`, field `p4CloudDepth`, one line in `dispose()`. Every change is a
  string replacement / branch that returns MAIN's source when its switch is off.
- `app/hero/engine/HeroEngine.ts` (SHARED file, 2 lines): `} else this.env.bakeCloudDepth(this.renderer);` after the `if (!mirror)
  { ... bakeDepth ... }` block, and `else if (this.env && this.lakeMirror) this.env.bakeCloudDepth(this.renderer, true);` in
  restoreBaked (context restore).
- `app/hero/engine/assets.ts` (SHARED file, 1 entry): P4_TEX's Object_2010 picks `_p4q.webp` when `webp` is on.
- Asset: `public/hero/baked/Object_2_010_p4q.webp` **39,074 B**, sha256 74b33ea158a86ff035a872bcc332db603330e426c54eb791ecbe318c288f6feb
  (`cwebp -q 100 -m 6 -af -sharp_yuv` of the dwebp-decoded lossless `_p4.webp`). The lossless `_p4.webp` (117,944 B) stays for
  `?p4webp=0` / `?p4env3=0`; once the lead accepts J7 it can be dropped from the deploy (only one of the two is ever loaded).

## J3 far-peak rim (FIXED)
Cause (round-1 fixer's attribution, confirmed): the drifting card fades out over CLOUD_FRAG's band crest - 0.0075 .. crest - 0.0025,
3-10 plate px BELOW the plate's skyline, while the far meshes' own top lies 0.0002-0.008 under that skyline (crest_ray2.json), so the
band lies on the mesh's top edge: the card veils it, and the hold's dolly shows that as a beige rim whenever a warm card passes.
Fix: the card is also hidden below the far mesh's own top (B channel), with a ~1 plate px soft edge: occ = max(old band,
1 - smoothstep(top - 0.001, top + 0.0005, ruv.y)). It only ever hides more card, below the mesh's top, so no bare-sky sliver opens.
Evidence (WORK/ab1, shots.mjs = the judge's abshots at the same sim time per shot; warm-rim px = B-R < 22 and luma 140-205):
hold x900-1200 y420-520 round 1 -> lane: hold_L 223 -> 102, hold_T 164 -> 12, hold_BL 77 -> 2, hold_R 211 -> 53, hold_TR 208 -> 60,
hold_B 85 -> 34; pops (x850-1250 y380-520) 127-158 -> 6-25 (the rest are ring / crystal highlights). ev/j3_ab1_hold.png (lane |
round 1: crisp grey top edge vs the beige rim), ev/j3_orbits.png (ptr_left / top_left / orb / rel_L: no blue sliver),
ev/j3_qc_holdT_main_lane.png (harness frame, lane: clean peak). At rest the change is the card's light veil on the far ranges' top
edge (ptr_rest t=8.5: 881 px > 2 at x1089-1439 y356-389, max 21, mean -5.6; ev/j3_rest_skyline.png: F000 shows that range unveiled);
late90 the far white peak's top (ev/j3_late90_skyline.png).

## J5 summit zig-zag (FIXED; root cause new)
Attribution (WORK/zig, zig2.mjs at t=92.5): the hairline is gone with the cloud group hidden, stays with BG.001 hidden; hiding the
cards one by one, card 0 alone (z -104.2 m, nearer than RANGE_DEPTH, no crest test) makes it: box x262-288 y236-250 mean / sd /
px brighter than their 5x5 median by > 15: 145.69 / 15.84 / 19 with it, 144.29 / 13.69 / 7 without. NOT a raster crack: along
those rays the summit is at 114.8-122.2 m (round-1 jfix/uv_zig.json) and card 0's plane at ~119.5 m, so the card cuts through the
summit and the depth test draws it wherever it lies just in front of the undulating surface. (Baking the plate depth for the
cards' projector guard, which is off with the mirror lake (uPlateDepthOn 0), changed nothing: tried and replaced.)
Fix: soft intersection fade: where the plate camera sees a surface within 20 m of the card's depth (sky / BG texels excluded),
the card's alpha * smoothstep(0, 20, |surface - card|). Depth: the same bakeProjector the plate lake uses, run ONCE at start (and
after a context restore) for the cards only (own uniform uP4CloudDepth; every material keeps uPlateDepthOn 0, the guard stays off
as in MAIN). One texture fetch + 2 mat-vec per card fragment. T0 / `?envlake=plate` never call it (no define: MAIN's frames).
Evidence: zig box 145.69 / 15.84 / 19 -> 144.52 / 13.83 / 11 (all clouds hidden 144.30 / 13.72 / 7); ev/j5_soft_zig.png (5x:
MAIN | 10 m | 20 m), ev/j5_zig_attr.png. Side effects (ab3/fin vs ab3/nocrack, 38 shots, same sim time): ONLY on the massif's upper
part (bbox x50-520 y170-430): late90 the zig-zag itself (176-268 px, max 76-83, mean -13); elsewhere 3-346 px, max 4-16, mean -2..-4:
the card's veil right at the summit's top edge (ev/j5_holdB_s20.png, ev/j5_holdB_peak8x.png: 1 px crisper, no sliver); ptr_rest
11 px max 4; late150 none. Cost: one-off bake at start (one env render + 2 min passes + the reflection-distance pass, as T0's
bakeDepth), +1 half-float RGBA target 1536 x ~840 (~10 MB GPU) on T1 / T2.

## J6 card-light floor on luma (DONE)
Finding: a floor on the change's luma at a flat 40 % gives the SAME luma as round 1 (late90 face box x200-420 y220-400: 162.9 /
p10 138.5 both), i.e. round 1's cap on mid-tones was a 40 %-of-luma cap, not a per-channel artefact. The shipped floor: the
CARD_WHITE change h has luma 1, so the change's luma is kappa k dE; a dark texel (below uCardWhite.y: h = its own hue, c scaled
uniformly) may lose at most 40 % (= round 1's c * 0.6, the slit fix), a white-lit one up to 65 %.
Late90 face box (WORK/ab2; MAIN = `?p4card=0`): MAIN 161.4 / p10 135.3 / B-R 37.3; round 1 162.9 / 138.5 / 34.4; lane 161.5 /
135.8 / 36.8 (B-R p99 MAIN 56, lane 48: MAIN's blue-violet blotches stay away). Slits / specks (ridge x0-330 y200-470, px under
luma 50): late90_right MAIN 148 / round 1 1 / lane 1; late150_right 50 / 1 / 1; late90_rest 92 / 0 / 0; ptr_right (ab1) round 1
16 -> 1. ev/j6_late90_face.png (MAIN | round 1 | lane).

## J7 lossy WebP (DONE)
q100 sharp-YUV: the 5,729 repaired texels keep 95.3 % of the repair (mean 1.50, p99 7, max 15); other texels mean 0.55, p99 3, max 18
(WORK/j7, cmp.py; all encodes q95-100 +-sharp_yuv and near-lossless 40/60/80 listed in LOG). Frame A/B (ab1/webp vs ab1/r1, 38
shots): max 1 level in every shot. Baked textures 1,091,418 -> 1,012,548 B (MAIN before round 1: 1,002,126).

## J2 hold smudge -> water lane (checked; not the near floe's back face)
The water lane's notes (lane_backup/p4r2/p4water HANDOFF / LOG) do not mention it. uvprobe with int1's hold camera (hold_B,
x1390-1440 y731-753, step 2; WORK/uv_j4j2.json): direct AND mirrored rays hit only BG.001 (390 / 370 m), whose texels there are plain
sky blue (j2/bg_view.png): open water reflecting the sky, no floe, no back face (the round-1 probe's Retopo_Plane.012 was under the
old hold camera). The patch is still there in int1 (box luma 136 vs 173 beside it; ev/j2_smudge.png: r11_1 p06 | r11_2 p06 |
sw_hold_B) and was gone with `?envlake=plate` / `?envlake=mirror` (round-1 fixer): it is LAKE_R12's own shading. Nothing for the env lane.

## J4 pale box (NOT FIXED; attributed)
uvprobe at rest (x330-400 y467-480): direct rays hit Plane.014 at / below the water line, mirrored rays V2_Massif (216 of 252): the
box is the lake reflecting the massif; left of the cut (x300-330) the floe Retopo_Plane.006 itself. The cut at x~322 is where that
floe ends, and it is in plate_rest too (round-1 fixer: same cut with `?env=projected`; `?shoreaa=0` no effect): the v7 scene's
floe / shelf is shorter than F000's continuous dark band. Fix = Blender: extend / check that floe in a copy of plate_scene_v7 against
F000, re-render plate_rest, re-bake (the plan's G3/G4 bake run). Not a texel fix (the box is water; round 1's Plane.014 edit moved
it 0.1 level).

## J1 pop wedge (NOT FIXED)
No Blender run in this box (the J3 / J5 / J6 / J7 work and the finals took it). What it needs (plan G3 step 1): one Cycles plate at
the pop camera (sw_pop cam ~[0.17, 2.27, 6.40], camExpand ~0.5-0.77) from a COPY of plate_scene_v7.blend, projected into
rock_big_4.005's texels x432-577 y213-366 that the pop camera sees and the rest camera does NOT (round 1's rest-visible set: the
floe's right flank x212-246 y577-618 at rest), colour-calibrated on texels both plates see, lossless or q100 WebP. Alternative: a
composition-lane camera call (F358 shows water in that corner).

## Gates
- **tsc** (lane retrux-web): `npx tsc -p tsconfig.hero.json --noEmit` rc 0, `npx tsc -p tsconfig.json --noEmit --incremental false`
  rc 0 (WORK/tsc_*.log).
- **Ident** (int1's identP.mjs: 20 moving frames; final image + every render target + every linked program; WORK/id/ident_summary.txt):
  `?p4env3=0` vs :5173 IDENTICAL at T1 (14 targets: mirror, walk, cache, cacheN, reflection, main, refraction, back, bloom0-4, final;
  16 programs), T2 (15 / 16), T0 phone 390x844 DPR 3 (9 / 12), `?envlake=plate` (10 / 12). `?p4env=0` on :5174 vs `?p4env=0` on
  :5173: IDENTICAL at T1 and T2. Control: lane default vs :5173 at T1 DIFFERS (final, mirror, walk, main, refraction, bloom; programs
  rx-plate-baked, rx-cloud, rx-plate-baked-mirror). T0 lane default: final and all 9 targets SAME, only the rx-plate-baked / rx-cloud
  program text differs (J5 is mirror-lake only; J3 / J6 change nothing visible at that state). 0 console messages.
- **Rest frame** at the same sim time (ab3/fin vs ab1/r1, ptr_rest t=8.5): all 15 region_stats boxes 0,0,0; late90 / late150 within 1.
- **Capture set** `qc_r11.zsh WORK/qc_final http://localhost:5174 T1 1` (06:13-06:22, no page errors): q00-q03, p04-p08, ui, cmp_* /
  crop_*, ptr/ (10 spots), sweep/ (32 + sheet), region_stats_q00.txt (vs MAIN r11_2 within 0-3 except mid left -9/-8/-6 and water
  near +8/+6/+5: capture time, the clouds sit elsewhere, ev/q00_dmap_vs_main_s.png). Looked at cmp_p06_sustain, sweep.jpg, the hold /
  pop crops: nothing broken.
- **Perf**: see PERF below.

## PERF (NOT a valid gate measurement: rerun in a quiet window)
int1's perfab.mjs (real RAF loop, vsync off, interleaved A = :5173 / B = :5174, 6 pairs, SLOT_BG=0; WORK/perf/ab_rest.*,
perf_summary.txt). My load-gated wait (no other lane's perf holder, load < 8) never opened between 06:24 and 06:45 (three other
lanes' perf runs back to back), so REST ran at 06:45-06:51 beside two of them: load 6.4-17.2, frame medians 30-65 ms instead of the
clean ~17-22 ms. Only pair 0 ran at load < 10 on both sides: ratio med 1.049 / mean 1.025; all 6 pairs: paired median 1.101 / 1.069
(pairs 2-4 at load 13-17: 1.15-1.33). MOVE (06:51-06:56, load 6.7-13.6, medians 42-50 ms): paired median 0.958 / 0.966, the 3 pairs
at load < 10: 0.947 / 0.974 (no cost visible, but equally load-bound). HOLD not run (time box). Expected cost from the code: J3 one
smoothstep per card fragment (the crest fetch was there), J6 none (same ALU), J7 none (same texture size), J5 one depth fetch +
2 mat-vec per card fragment (the cards overlap over the sky) + the one-off start bake. If a clean rerun shows REST > +5 %, J5 is the
candidate: `?p4crack=0` takes it out (its A/B is the switch).

## Open
- J1 (Blender pop plate), J4 (Blender floe / plate_rest), J2 (water lane).
- J5's fade uses 20 m: it also takes the card's veil off the summit's top edge where the card is within 20 m of it (1 px, mean -2..-4
  at those px); `?p4soft=10` halves the reach (zig box hot px 15 instead of 11).
- J6's 65 % for white-lit texels is a choice (MAIN's own depth was up to ~100 %); `?p4lumafloor=0.4,0.4` = a flat 40 % on luma.
