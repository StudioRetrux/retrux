# P4 INTEGRATOR int1: HANDOFF (21 Nov 2026, 03:10-04:12 WIB)

Lane `LANES/int1` = `cp -c -R LANES/aa8` (aa8's app/ == MAIN's retrux-web/app, diff -r) + the four P4 lanes, 3-way merged.
Lab **:5173** left running (`PORT=5173 nohup node hero-lab/serve.mjs --no-watch` in LANES/int1/retrux-web, pid 60893, built 03:20:18
from the final source; no source edit after that). WORK = $SP/work_p4/int1 (LOG.md has every step with numbers);
mirror = MAIN/notes/round11/lane_backup/p4int1/. Capture set for the next panel: **$SP/p3/r11_2** (backup
~/RetruxR11Work/p3caps/r11_2).

## What is in it
| lane | round / base | files | switch (whole lane) | sub-switches |
|---|---|---|---|---|
| env | r1 / aa7 | assets.ts, world/Atmos.ts, world/PlateEnvironment.ts, new p4env.ts, asset baked/Object_2_010_p4.webp | `?p4env=0` | `?p4crest=0` `?p4tex=0` `?p4card=0` |
| ice | r1 / aa7 (fix round) | hero/IceMaterial.ts | `?p4ice=0` | `?iceaa=r11` `?icefrost=r11` `?icecap=0` `?orbice=r11` `?icehold=r11` |
| orb | r1 / aa7 (fix round) | HeroEngine.ts, hero/Orb.ts, hero/Shards.ts, pipeline/PostChain.ts, quality.ts | `?p4orb=0` | `?orbglass=r11` `?shard2=r11` `?orbcharge=r11` |
| hold | r2 / aa8 | CameraRig.ts, hero/HoldR11.ts, HeroEngine.ts, assets.ts | `?p4hold=0` | `?holdcam=r11` `?holdpop=r11` `?ctxrun=0` `?panokeep=1` |
All four off = MAIN (AA8) exactly: `?p4env=0&p4ice=0&p4orb=0&p4hold=0` (proof below). Every switch name is read in exactly one
module (grep). Inputs were verified first: each lane patch (env 9ce29e04..., ice 8bd774c6..., orb 986d3bd6..., hold 2434e13e...)
applied to its base reproduces the lane's files byte for byte, and the lanes differ from their bases in no other file.

## Merge
`git merge-file -p <int1 file> <lane base file> <lane file>` per file, order env, ice, orb, hold: **0 conflicts**, nothing resolved
by hand. Three files carry more than one intent: PlateEnvironment.ts (aa8's AJ-2 bakeDepth(restored) + comments, env's G1 / G4),
HeroEngine.ts (aa8's P-1 / AJ-2, orb's p4 gate / PostChain option / holdGlow, hold's N-1 / R8-2 restoreAfterLoss), assets.ts
(env's P4_TEX pick, hold's reloadPanorama). Line-level proof: int1 vs p4hold HeroEngine == exactly the orb's hunks; int1 vs p4hold
assets == exactly the env's hunks; int1 vs p4env PlateEnvironment == exactly aa8's hunks. The env lane's string-replaced GLSL
(cardLit returns in Atmos.ts, CLOUD_FRAG's crest lookup) is untouched by aa8, and it throws if a target is missing (none thrown:
0 console messages in 20+ sessions).

## Files vs MAIN (= LANES/aa8)
`WORK/int1_vs_main.patch` (1730 lines, sha256 31f06f9efba6d4d8da8e9ae2f154cfbf71e63a31fdf0ae4b24094da038818246; `diff -u --label
a/retrux-web/<f> --label b/retrux-web/<f>`): app/hero/engine/{CameraRig.ts, HeroEngine.ts, assets.ts, hero/HoldR11.ts,
hero/IceMaterial.ts, hero/Orb.ts, hero/Shards.ts, pipeline/PostChain.ts, quality.ts, world/Atmos.ts, world/PlateEnvironment.ts} +
new app/hero/engine/p4env.ts. Binary asset, separately (WORK/ana/assets.txt):
`retrux-web/public/hero/baked/Object_2_010_p4.webp` 117,944 B, sha256 3ce65b26fef1bf6e6a2f50cda18ff5d0ac73f739552591aca98938d2ab67b37e
(MAIN's Object_2_010_f1.webp stays; it is what `?p4env=0` / `?p4tex=0` load).
Apply test (WORK/tools/applytest_int1.sh, WORK/ana/applytest.txt): fresh `cp -c -R` clone of aa8, `patch -p1` from the clone root:
dry run rc 0, apply rc 0, 0 .orig / .rej; + the asset: app/ == int1 app/ and public/ == int1 public/ (diff -r); tsc hero 0 /
project 0. Clone removed. aa8's app/ == MAIN's, so the patch applies to MAIN's working tree the same way.

## Proofs
- **tsc** in int1: `npx tsc -p tsconfig.hero.json --noEmit` rc 0, `npx tsc -p tsconfig.json --noEmit --incremental false` rc 0.
- **Switch (identP: 20 moving frames; final image + mirror / walk / cache / cacheN / reflection / main / refraction / back / every
  bloom mip / ldr + every linked program's source)**, all four off vs :5199: IDENTICAL at rest T1 (14 targets, 16 programs), T2
  (15 / 16), T0 phone 390x844 DPR3 (9 / 12), `?envlake=plate` (10 / 12), and at the hold lane's poses p04 / p06 / p07 (14 / 18).
  Negative controls: int1 default T1 and p06 differ (rx-plate-baked, rx-cloud, rx-ice, rx-orb, rx-shards, rx-plate-baked-mirror,
  rx-bloom-down / -up, rx-grade). int1 default on T0 phone: final + all targets SAME as :5199, only rx-plate-baked / rx-cloud
  program text differs (the env lane is not tier-gated; its frames equal MAIN's here, as its judge found). 0 console messages.
- **Effects survived** (WORK/ana, WORK/img; numbers in LOG.md step 5b):
  - env: the env judge's deterministic abshots on int1 env-only == the env lane above the lake pixel for pixel (only AA8's lake
    knee differs, the same list as aa8-vs-aa7); int1 with ALL lanes on vs the env lane in the ghost box x1180-1430 y290-430 max 0
    at ptr_right / top_right, 1 at bottom_right; in the left box max 1. Contrast-stretched 2x zooms
    (img/env_ghost_right_rows_MAIN_ENV_INT1.png, env_band_left_rows_MAIN_ENV_INT1.png): MAIN's far-peak ghost and the left blotches
    are gone in int1 as in the lane. The other lanes change only the rings, crystals, orb and their lake reflection
    (img/dm_i_vs_ie_ptr_right.png).
  - ice: p05 right arc lap MAIN 11.1 / ice lane 6.8 / int1 6.4 (F402 2.9); q03 outer boxes int1 = ice lane within 0.1 L; q00 joint
    minima 188 / 144 in both; p06 band 204.5 sat 0.180 (lane 203.2 / 0.187). img/ice_q00 / q03 / p05 (MAIN, ICE, INT1, REF).
  - orb: rim B-R q00 +30 / p05 +16 / p06 +24 (orb lane +34 / +21 / +21, MAIN +42 / +38 / +38); hold clip p05 26.3 / 19.5 %
    (lane 25.0 / 19.3); crystal saturation within 0.03 of the lane at every pose. img/orb_<pose>.png (MAIN, ORB, INT1, REF).
  - hold: background shift int1 vs the hold lane's qc_final 0.0 px at p04-p08; vs MAIN +15 / +20 / +20 / +4.5 / +0.9 px (the lane's
    own numbers); pose drivers q00-p08 identical to the lane's (p04 splitB 0.481).
  - deterministic cross-lab check (tools/detq.mjs: the qc poses q00 / q01 / q03 / p05 / p06 at the same sim time in every lab, so
    the crystals sit at the same places; ana/det_cmp.txt): int1 with only the ice lane on vs the ice lane :5175, and int1 with only
    the orb lane on vs the orb lane :5176, differ ONLY on the lake (max 9-10, 177-667 px per pose = AA8's knee, the same footprint
    as aa8 vs aa7). Crops img/det_q00 / det_q03 / det_p05 (MAIN | ICE | ORB | INT1).
  - interaction (the hold lane's probe_interact on :5173; ana/interact_int1.txt): click inert, hold ring 3.52 deg / frame (lane
    3.53), opening step 0.108 (0.107), release / re-press / release2 as the lane, no errors.
  - context restore, live (the hold lane's ctxlive; ana/ctxlive_int1.txt): int1 restarts by itself, first frame 668 ms after the
    restore (lane 601.5), TAA valid, 0 B panorama kept; all-off stays frozen with 4 MiB kept (AA8). Only the intended warning.
- **Perf**: see the table below (perfab: the engine's real RAF loop, vsync off, interleaved A = :5199 / B = :5173, 6 pairs per mode,
  SLOT_BG=0, started only when no other lane held a slot for a perf run and the 1-min load was < 8).
| mode | pairs (load < 10) | per-pair ratio of run medians (int1 / MAIN) | paired median: medians / means | run medians MAIN vs int1 |
|---|---|---|---|---|
| REST (no input, idle loop at the rest camera; bimodal intervals, p95 ~52 ms on both) | 3 runs x 6 = 18 (14) | r1 0.944 1.109 1.000 0.955 1.150 (0.966) / r2 1.036 0.951 1.048 1.049 (1.072 1.022) / r3 1.059 1.006 1.006 1.034 0.959 (1.024); () = a run at load >= 10 | pooled clean 14: **1.020 / 1.019** (r1 1.000 / 1.017, r2 1.042 / 1.060, r3 1.006 / 1.012) | 17.30 vs 18.00 ms |
| MOVE (idle loop + pointer sweep = the orbit shaders) | 6 (6), load 4.8-9.0 | 1.005 1.000 1.005 1.060 1.015 1.015 | **1.010 / 1.009** | 20.05 vs 20.30 ms |
| HOLD (pressed, held in expand, camExpand 0.967 both) | 6 (6), load 3.3-4.7 | 1.035 1.005 0.930 0.980 1.019 0.926 | **0.993 / 0.934** | 20.65 vs 20.10 ms |
No mode regresses > 5 %. REST is the closest (+2 %): the lanes' own rest costs add up to that (the ice lane measured its REST
at +0.8 .. +4.3 %, ALU on every ice fragment; env ~+1 %; orb and hold ~0 at rest). Files: WORK/perf/ab_{rest,rest_r2,rest_r3,move,hold}.*,
WORK/ana/perf_summary.txt (tools/perfana.py).

## Capture set for the next panel: $SP/p3/r11_2
`zsh qc_r11.zsh $SP/p3/r11_2 http://localhost:5173 T1 1`, 03:20-03:24, exit 0, no page errors: q00-q03, p04-p08, ui, cmp_* / crop_*,
ptr/ (10 spots), sweep/ (32 + sheet), region_stats_q00.txt (MAIN r11_1 vs int1 within 1-4 levels per box). Looked at cmp_q00_rest,
cmp_q03_eye, cmp_p05_expand, cmp_p06_sustain, ptr_right and ptr_top_left: nothing broken, no ghost, no doubled mountains, the
bottom of the frame clean; the hold framing sits on the reference's (peak ~y230 of 511 vs F402 / F420 ~234).

## Open (not mine, carried from the lanes' verdicts)
- env (judge pass false, no regression): J1 pop wedge, J2 hold smudge (water lane), J3 far-peak rim, J4 pale shelf box (plate), J5
  summit zig-zag. T0: the env lane links its programs on T0 too (frames equal at the tested state; the card floor can lift dark
  crevices on T0 at other times, by design).
- ice (rejudge pass false): R1 rest joints fainter than MAIN / F000 (the V profile), F3 q03 outer band light + white ovals, F5 no
  scrape grain / plastic caps, F4s no refracted orb strip, N1 / N2 / F6 nits.
- orb (rejudge pass): F2 no dark branching structure in the open hold orb (MAIN too), F4 crystal top facets 15-20 L dim, R1 / R2 nits.
- hold (judge pass): N1-N3 nits (no-plateau not literal, restore edge cases, 2560x1080 camera drop).
- Interaction seen in int1 only: q03's ring D in front of the orb carries the ice lane's structure over the orb lane's lens-shaded orb
  (disc L10 176 vs the orb lane's 214, ring D L 216 vs the ice lane's 228 / F045 224; a crystal also crosses it). Reads as ice in
  front of the orb (img/orb_q03_eye.png), not a glitch; the panel should look at q03.
