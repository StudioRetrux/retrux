# P4 INTEGRATOR int1 (21 Nov 2026, Asia/Jakarta; started 03:10, time box 90 min)
Role: integrate the passing P4 lanes env (r1, base aa7), ice (r1, base aa7), orb (r1, base aa7), hold (r2, base aa8) into
LANES/int1 = cp -c -R LANES/aa8 + 3-way merges. Lab :5173 (mine). MAIN lab :5199 = aa8 (frozen reference, read only).
WORK = $SP/work_p4/int1 ; mirror = MAIN/notes/round11/lane_backup/p4int1/.

## 03:10 inputs read
- env: HANDOFF (round 1 + fixer: no new code, judged patch == regenerated), judge_p4env.json (pass false: open G3/G4 items, no
  regression, all shipped fixes verified). Patch p4env_vs_aa7.patch sha256 9ce29e04... (242 lines; assets.ts, world/Atmos.ts,
  world/PlateEnvironment.ts, new p4env.ts) + asset public/hero/baked/Object_2_010_p4.webp (117,944 B, sha256 3ce65b26...).
- ice: HANDOFF (round 1 + fix round), rejudge verdict (pass false; R1 rest joints fainter, F3/F5/F4s open; visual verdict "still
  the right base"). Patch p4ice_vs_aa7.patch sha256 8bd774c6... (579 lines; hero/IceMaterial.ts only).
- orb: HANDOFF (fix round), rejudge verdict pass TRUE (F2/F4 open design items, R1/R2 nits). Patch p4orb_vs_aa7.patch sha256
  986d3bd6... (682 lines; HeroEngine.ts, hero/Orb.ts, hero/Shards.ts, pipeline/PostChain.ts, quality.ts).
- hold: HANDOFF, judge verdict pass TRUE (N1-N3 nits). Patch p4hold_vs_aa8.patch sha256 2434e13e... (238 lines; CameraRig.ts,
  hero/HoldR11.ts, HeroEngine.ts, assets.ts).
Overlaps: assets.ts (env r1 + hold r2), HeroEngine.ts (orb r1 + hold r2 + aa8's own P-1 vs aa7), PlateEnvironment.ts (env r1 +
aa8's own vs aa7).

## 03:13 step 0: every lane patch reproduces its lane from its base
- diff -rq (no node_modules / dist / .next / tsbuildinfo) of each lane vs its base: only the patch's files (+ the env asset, + dist).
- Each patch applied (patch -p1, dry run first) to copies of its base files: p4env (aa7) 4/4 files == lane, p4ice (aa7) 1/1, p4orb
  (aa7) 5/5, p4hold (aa8) 4/4; 0 .orig / .rej. Asset Object_2_010_p4.webp sha256 3ce65b26... in the lane == the backup copy.

## 03:15 step 1: LANES/int1 = cp -c -R LANES/aa8 (10 s); diff -r: int1 app/ == aa8 app/ == MAIN retrux-web/app; public/ same.
(Removed the copied lab log file `retrux-web/log`, aa8's own lab output.)

## 03:16 step 2: 3-way merges (git merge-file -p <int1> <lane base> <lane>, in the order env, ice, orb, hold)
| lane | file | conflicts | note |
|---|---|---|---|
| env | assets.ts, world/Atmos.ts | 0 | int1 == base: result == lane file |
| env | world/PlateEnvironment.ts | 0 | aa8 changed it vs aa7 (comments + bakeDepth(restored)); result = aa8 + env hunks |
| env | p4env.ts (new) + public/hero/baked/Object_2_010_p4.webp | - | copied |
| ice | hero/IceMaterial.ts | 0 | == lane file |
| orb | hero/Orb.ts, hero/Shards.ts, pipeline/PostChain.ts, quality.ts | 0 | == lane files |
| orb | HeroEngine.ts | 0 | aa8 changed it vs aa7 (P-1 resetTAA, AJ-2 restoreBaked); result = aa8 + orb hunks |
| hold | CameraRig.ts, hero/HoldR11.ts | 0 | == lane files |
| hold | HeroEngine.ts, assets.ts | 0 | on top of the orb / env merges |
No conflict to resolve by hand. Line-level checks (changed-line multisets): int1-vs-aa8 PlateEnvironment == env-vs-aa7; HeroEngine:
int1-vs-p4hold == exactly the orb's hunks; assets: int1-vs-p4hold == exactly the env's hunks; PlateEnvironment: int1-vs-p4env ==
exactly aa8's hunks. Semantic checks: the env lane builds its GLSL by string replacement (cardLit returns in Atmos.ts
GLSL_CARD_LIGHT_FRAG, CLOUD_FRAG's crest lookup) and throws if a target is missing: aa8 changed neither (Atmos.ts untouched, aa8's
PlateEnvironment / chunks hunks are comments + bakeDepth). Every switch name has one owner (grep: p4env/p4crest/p4tex/p4card ->
p4env.ts; p4ice/iceaa/icefrost/icecap/orbice/icehold -> IceMaterial.ts; p4orb -> Orb.ts + Shards.ts, orbglass/orbcharge -> Orb.ts,
shard2 -> Shards.ts; p4hold/holdcam/holdpop -> HoldR11.ts; ctxrun/panokeep -> HeroEngine.ts).
int1 vs aa8: 11 changed files + 1 new file + 1 binary asset.

## 03:18 step 3: tsc in int1: tsconfig.hero.json --noEmit rc 0; tsconfig.json --noEmit --incremental false rc 0 (0 lines each;
tsconfig.tsbuildinfo untouched).

## 03:20 step 4: :5173 = `PORT=5173 nohup node hero-lab/serve.mjs --no-watch` in LANES/int1/retrux-web (pid 60893), build ok 03:20:18.
Served dist/main.js sha256 49960a37aefc... == the lane's dist; it contains every lane's markers (p4env, ICE_P4, ORB_P4, SHARD_P4,
POST_P4, reloadPanorama, panokeep, holdcam, Object_2_010_p4, CREST_P4, laneSource).

## 03:21-03:26 step 5a: switch proof (identP = the orb lane's identS + main / refraction / back / bloom mips / ldr; 20 moving frames,
## final image + every target + every linked program's source), OFF = p4env=0&p4ice=0&p4orb=0&p4hold=0, vs :5199
(ana/ident_A.txt, ana/ident_B.txt; JSONs in ident/; 0 console errors / warnings in all 17 sessions)
- rest T1: IDENTICAL (14 targets, 16 programs); T2: IDENTICAL (15 / 16); T0 phone 390x844 DPR3: IDENTICAL (9 / 12);
  ?envlake=plate: IDENTICAL (10 / 12).
- hold poses (the hold lane's --pre): p04 (expand 0.9), p06 (expand 2.97), p07 (release 0.33): IDENTICAL (14 targets, 18 programs).
- negative controls: int1 default T1 differs (mirror, walk, reflection, main, refraction, bloom0-4, final; programs rx-plate-baked,
  rx-cloud, rx-ice, rx-orb, rx-shards, rx-plate-baked-mirror, rx-bloom-down, rx-bloom-up, rx-grade); p06 differs likewise (+ cache,
  cacheN). int1 default on T0 phone: final + all 9 targets SAME, programs rx-plate-baked / rx-cloud differ in source (the env lane is
  not tier-gated; its frames equal MAIN's here, as the env judge found at t~6; ice / orb / hold are off or no-ops on T0).

## 03:22-03:36 step 5b: each lane's key effect survived in int1
Capture set (step 7) = $SP/p3/r11_2 (qc_r11.zsh T1 1, 03:20-03:24, 0 page errors). Deterministic shots: the env judge's
abshots.mjs (RAF off, frame stepping, same sim time per shot; 38 shots: 10 ptr spots, hold / pop / release x6, rest + 4 orbit spots
at t~90 and t~150) on :5173 default (ab/i), :5173 ?p4ice=0&p4orb=0&p4hold=0 (ab/ie) and :5199 (ab/m8), compared with the env
judge's own ab/l (env lane :5174) and ab/m (aa7 MAIN :5197).
- Harness check: m8 (aa8) vs the judge's m (aa7) differ only at y >= 370-590 (the lake / waterline: AA8's knee 0.6), max 7-14,
  200-1000 px per shot. ie (int1 env only) vs the judge's l (env lane): the SAME list (same max, counts within +-3 px, same bboxes):
  above the lake int1's env part is the env lane pixel for pixel (ana/ab_ie_vs_envlane.txt).
- ENV (ana/env_regions.txt, env_ghostbox.txt; img/env_ghost_right_rows_MAIN_ENV_INT1.png, env_band_left_rows_MAIN_ENV_INT1.png,
  2x, percentile-stretched; rows :5199 / env lane / int1, columns right / top_right / bottom_right resp. left / top_left /
  bottom_left): the pale-blue far-peak ghost right of the iceberg's top is in all three MAIN spots and in none of the env lane's or
  int1's; the left orbits' blue-violet blotches / hairlines on the main mountain are gone in both. int1 (ALL lanes on) vs env lane
  in the ghost box x1180-1430 y290-430: ptr_right / top_right max 0 (0 px differ), bottom_right max 1 (14 px), late90/150 max 3-4
  (<= 16 px > 2); left box x0-330 y250-450: max 1 in all six shots. Ridge box x0-330 y200-470 int1 vs env lane: max <= 2 except
  ptr_bottom_right 8 (17 px) / bottom_left 4 (6 px) (crystals). The wider far boxes differ only where crystals / the ring's ends
  are (orb lane Q7, ice lane): img/dm_i_vs_ie_ptr_*.png.
- ICE (ana/ice_fxboxes.txt, ice_icem.txt = the ice judges' fx_boxes.py / icem.py; MAIN r11_1 | ICE lane qc_fix | INT1 r11_2 | REF):
  p05 right arc lap 11.1 | 6.8 | 6.4 | 2.9, sd 32.6 | 29.2 | 27.6; p05 top arc lap 7.1 | 4.5 | 4.5; q03 outer boxes 182.9 | 191.1 |
  191.1, 171.7 | 180.1 | 180.0, 172.6 | 173.1 | 173.1 (int1 = ice lane within 0.1 L); q00 row-385 joint minima ICE 188 @572 / 144
  @884, INT1 188 @583 / 144 @884; q01 innerBand 212.1 / 211.0; q02 centre 202.9 / 202.1; p06 band 203.2 sd 25.6 sat 0.187 vs
  204.5 / 24.6 / 0.180; p06 clipped px outside the orb 2 vs 1 (MAIN 110). Boxes that differ hold crystals at other places (the
  harness is not phase-deterministic for the shards; q03 ringD row 300 has a crystal at x876-880 in int1) or the hold framing
  (p04-p06 camera). Looked at img/ice_q00_M_ICE_INT1_REF.png, ice_q03_..., ice_p05_... (2x2 / 1x4: MAIN, ICE, INT1, REF): int1's
  rings = the ice lane's (frosted band with ring streaks, V joints, smooth p05 arcs without MAIN's agate isolines).
- ORB (ana/orb_qcana.txt = the orb rejudge's qcana.py, LANE = int1, ORB = orb lane qc_fix; img/orb_<pose>.png MAIN | ORB | INT1 |
  REF, + 200-255 stretch): rim B-R q00 +30 (ORB +34, MAIN +42, F000 +27), p05 +16 (+21, +38, F402 +26), p06 +24 (+21, +38, F420
  +31): the cobalt limb stays gone; hold clip p05 box>=248/250 26.3/19.5 % (ORB 25.0/19.3), p06 14.9/9.6 (17.8/12.7; MAIN
  16.2/12.2); rest top clip trimmed as in the orb lane (q00 >=250 0.0 %, ORB 0.0, MAIN 0.6); crystals sat q00 0.770 (0.772), p05
  0.460 (0.487), p06 0.461 (0.457), p07 0.486 (0.488), hue 210.7-225 as ORB. q03's disc L10 176 vs ORB 214: the ice lane's ring D
  structure in front of the orb + a crystal (img/orb_q03_eye.png: orb = ORB's, band = ICE's). Looked at orb_q03_eye, orb_p06_sustain.
- HOLD (ana/bgshift_int1.txt, the hold lane's bgshift.py): int1 vs hold lane qc_final p04-p08: 0.0 px on every landmark (R_berg
  p05 -0.4 on 2 blocks); int1 vs MAIN r11_1: p04 peak +15.0 / p05 +20.0 / p06 +20.1 / p07 +4.5 / p08 +0.9 px = the hold lane's
  own numbers. Pose drivers in shoot_qc's log q00-p08 (camExpand, splitB, spreadA, ...) == the hold lane's qc_final (p04 camExpand
  0.765, splitB 0.481: Q13's earlier burst).

## 03:20-03:24 step 7: the panel capture set
`zsh /Users/muhamadrifaldi/RetruxR11Work/hp/qc_r11.zsh $SP/p3/r11_2 http://localhost:5173 T1 1` (log $SP/p3/qc_r11_2.log): exit 0,
"no page errors"; 3 slot runs (qc, ptr, sweep). Backup: ~/RetruxR11Work/p3caps/r11_2 (+ qc_r11_2.log), diff -rq clean.
region_stats_q00 int1 vs MAIN's r11_1: equal within 0-4 levels per box (far floes B 204 -> 208, the rest <= 1).
Looked at (Read): cmp_q00_rest (rest frame clean; paler Q7 crystals, the ice lane's frosted band), cmp_q03_eye (outer ring lighter
than F045 = the ice lane's open F3), cmp_p05_expand (smooth arcs, clipped orb with a pale cool rim, background at F402's height),
cmp_p06_sustain (framing at F420's: peak ~y230 of 511 vs ~234), ptr_right (iceberg + far range, no ghost), ptr_top_left (left
mountain without hairlines, nothing odd at the bottom edge).

## 03:22 step 8: patch + apply test
WORK/int1_vs_main.patch: 1730 lines, sha256 31f06f9efba6d4d8da8e9ae2f154cfbf71e63a31fdf0ae4b24094da038818246 (tools/mkpatch_int1.sh:
the file list is checked against diff -rq of app/; 11 changed + 1 new (against /dev/null)). Binary asset listed in ana/assets.txt:
retrux-web/public/hero/baked/Object_2_010_p4.webp 117,944 B sha256 3ce65b26fef1bf6e6a2f50cda18ff5d0ac73f739552591aca98938d2ab67b37e.
Apply test (tools/applytest_int1.sh -> ana/applytest.txt): fresh cp -c -R clone of aa8 (LANES/int1_apply), patch -p1: dry run rc 0,
apply rc 0, 0 .orig / .rej; + asset: app/ == int1 app/, public/ == int1 public/; tsc hero rc 0, project rc 0; clone removed.

## 03:34-03:50 step 6: perf (tools/perfab.mjs = the hold judge's real-loop A/B + MODE=rest; vsync / frame-rate limit off;
## A = :5199 (MAIN), B = :5173 (int1), interleaved AB / BA, 6 pairs per mode, 6 s per run after 4 s warm-up; SLOT_BG=0;
## tools/perfwait.sh started it only once no other lane held a slot for a perf run (p4water's perf3 ran until 03:34) and load < 8)
Summary: ana/perf_summary.txt (tools/perfana.py; ratio = int1 / MAIN per pair).
- REST (no input: idle loop at the rest camera; bimodal intervals, p95 ~52 ms on both sides): pairs med ratio 0.944 1.109 1.000
  0.955 1.150 0.966 (loads 3.8-6.7, pair 5's A at 11.3); paired median 0.983 (all 6) / 1.000 (5 pairs at load < 10); mean ratio
  median 0.999 / 1.017; median of run medians 18.65 vs 19.20 ms (1.029; perfab's upper median 19.4 vs 19.2 = 0.990). Noisy, under 5 %.
- MOVE (idle loop + pointer sweep across the frame = the orbit shaders): all 6 pairs at load 4.8-9.0: med ratios 1.005 1.000 1.005
  1.060 1.015 1.015, paired median 1.010; mean ratio median 1.009; median of run medians 20.05 vs 20.30 ms (+1.2 %).
- HOLD (pressed at the orb, 2.5 s lunge, then held in expand at camExpand 0.967 on both sides): all 6 pairs at load 3.3-4.7: med
  ratios 1.035 1.005 0.930 0.980 1.019 0.926, paired median 0.993; mean ratio median 0.934; median of run medians 20.65 vs 20.10 ms.
No regression > 5 % in any mode (the lanes' own costs: ice +2.2 % move, env ~+1 %, orb ~0, hold 0 at rest).

## 03:51-03:54 extra: deterministic qc poses against the lanes' own labs + interaction + context restore (one slot batch, bDet.sh)
tools/detq.mjs (abshots with the qc poses: q00 tau 0, q01 tau 0.5, q03 tau 1.5, p05 expand 2.37, p06 expand 2.97; RAF off, frame
stepping, the same sim time t=8.517 at q00 in every lab, so the crystals sit at the same places) on :5173 default, :5173 ice-only
(?p4env=0&p4orb=0&p4hold=0), :5173 orb-only (?p4env=0&p4ice=0&p4hold=0), the ice lane :5175, the orb lane :5176 and :5199.
(ana/det_cmp.txt; tools/detana.sh)
- int1 ice-only vs the ice lane: only the lake differs (y >= 425 at rest, >= 558 in the hold), max 9-10, 177-665 px per pose =
  the AA8 knee footprint (same as aa8-vs-aa7). So at q00 / q01 / q03 / p05 / p06 the ice lane is pixel-identical in int1 above
  the lake.
- int1 orb-only vs the orb lane: the same lake-only list (max 9-10, 177-667 px). Orb + crystals pixel-identical above the lake.
- int1 all-on vs ice-only: rest poses differ only in y 203-603 (orb, crystals, their lake reflection; env's few rest px); p05 /
  p06 everywhere (the hold lane's camera). Crops with identical crystals: img/det_q00_M_ICE_ORB_INT1.png,
  det_q03_M_ICE_ORB_INT1.png (1x4: int1 rings = the ice lane's, orb + crystals = the orb lane's), det_p05_M_ICE_ORB_INT1.png
  (this sim state is a hidden-orb hold: int1 = the ice lane's band, the background lower by the hold framing),
  det_q03orb_M_ICE_ORB_INT1_pct.png.
- Interaction (the hold lane's probe_interact.mjs on :5173, its default T0 scale 0.5; ana/interact_int1.txt): click inert (all
  drivers 0, phases press, idle, never holding); hold ring 3.52 deg / 60 Hz frame (hold lane 3.53), opening step 0.108 (0.107), camera
  0.847 (0.863); release 0.90 deg; re-press 2.28 deg, opening 0.107; release2 3.47 deg; errors none.
- Context restore, live loop, no visibilitychange (the hold lane's ctxlive.mjs; ana/ctxlive_int1.txt, ctx/ctxlive.json): int1
  restarts by itself, first frame 668 ms after the restore (hold lane 601.5, its judge 604.8), TAA valid at +1.5 s, panorama kept 0 B;
  int1 all-off stays frozen with the 4 MiB panorama kept (= AA8). Console: only "[hero] WebGL context lost".

## 03:54-03:59 step 6 (cont.): REST again (6 more pairs, perf/ab_rest_r2.*), because run 1's pairs spread 0.94-1.15
- run 2 pairs med ratio 1.036 0.951 1.048 1.049 (loads 4.0-6.7), 1.072 (B at load 11.0), 1.022 (both at 16-19: another job started,
  frame times doubled to 32 ms on both sides); clean-pair (4) paired median 1.042, mean ratio median 1.060.
- REST pooled, both runs: 12 pairs, 9 with both runs at load < 10: paired median ratio of the run medians 1.036, of the run means
  1.022 (all 12: 1.029 / 1.026); median run median MAIN 17.65 vs int1 18.20 ms. => REST +2-4 %, under the 5 % gate but the closest
  mode. Expected from the lanes: the ice lane's own REST A/B was +0.8 .. +4.3 % (fix round / rejudge 1.042-1.043: its ALU on every
  ice fragment), env ~+1 %, orb ~0 (rest), hold 0 (rest frames bit-identical).

## 04:02 extra look: the grainy patch inside the orb at q03 (seen in a percentile-stretched crop)
img/det_q03_orbgrain_M_ICE_ORB_INT1_iceonly_orbonly.png (4x, stretched; MAIN, ICE, ORB / INT1, ice-only, orb-only at the same sim
state): the dithered patch (the far mountain refracted in the orb) is in all six, MAIN included; box x660-760 y290-380 luma MAIN
230.5, ice lane 230.4, orb lane 228.8, int1 228.7 (= orb-only 228.8). Pre-existing, invisible at 1x; not an integration effect.

## 04:03-04:08 step 6 (cont.): REST run 3 (perf/ab_rest_r3.*; started after p4water's perf4 had freed its slot, load 4.7)
- pairs med ratio 1.059 1.006 1.006 1.034 0.959 (1.024 at load 10.0); clean (5) paired median 1.006, mean ratio median 1.012.
- **REST pooled over the three runs: 18 pairs, 14 with both runs at load < 10: paired median ratio of run medians 1.020, of run
  means 1.019 (all 18: 1.023 / 1.019); median run median MAIN 17.30 vs int1 18.00 ms.** => REST +2 %, MOVE +1 %, HOLD -0.7 %:
  no regression > 5 % (ana/perf_summary.txt).

## STATE (end, 04:10)
- :5173 serves int1 (pid 60893, `--no-watch`, built 03:20:18, bundle sha256 49960a37aefc...; no source edit since); left running.
- LANES/int1 = aa8 + the four lanes (11 changed files + p4env.ts + Object_2_010_p4.webp); HANDOFF.md written there.
- Not touched: MAIN's code, every other lane, :5199 and the other labs (only read from). Temporary apply clone LANES/int1_apply removed.
- Captures for the next panel: $SP/p3/r11_2 (+ ~/RetruxR11Work/p3caps/r11_2). WORK keeps the raw deterministic shots (ab/ 121 MB,
  det/ ~30 MB) as evidence; the MAIN mirror (notes/round11/lane_backup/p4int1/) has everything except those raw shots, the
  apply-test copies (pc/) and the served bundle.
