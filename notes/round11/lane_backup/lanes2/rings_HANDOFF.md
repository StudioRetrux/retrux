# RINGS lane hand-off (round 11 P2b, builder, 15 Nov 2026; resumed and finished 16 Nov 02:20-03:25 WIB)

Work folder: `$SP/work2/rings` (`LOG.md` has every step, number and decision; paths below are relative to it unless absolute).
Status: fix round 2 done (17 Nov, section 10: judge 2's minors addressed: hold framed at 0.90-0.91x instead of 0.84x with ring A's constant 0.6 m opening kept, crystal swarm's outer edge +3.6 % instead of +15 % with no crystal ever inside an opened piece, the creep's back-off removed; `?spin=f1` = fix round 1). Fix round 1 done (16 Nov 06:31, section 8). Builder status: done. The 15 Nov builder was cut by the usage limit after its last change (shardOut 0.15); on 16 Nov the whole
verification set was re-run on that final build (60 Hz logs, alignment, shards, H-G2 incl. portrait, click, every switch with a
proof that the one flickering live shot is harness noise, perf, typecheck), the C / D diagnosis was plotted, and the idle and two
10 s holds were looked at frame by frame next to the reference. No code change on 16 Nov.
The user's QC of 15 Nov ~19:20 WIB (verbatim in the task / memory): the two inner rings "rock back and forth" at rest instead
of rotating harmoniously; in the hold the split outer rings must stay precisely one ring (no askew piece); the inner rings and the
small crystals must go into slow motion in the hold like the reference; "jangan ngide" (nothing invented), optically 1:1.

## 1. What changed and why

### Idle: rings C / D (`retrux-web/app/hero/engine/hero/Rings.ts`: `IDLE_CD`, `IDLE_CD_Q0`, `idleMode`)
- Diagnosis (`logs/an_mocap.txt`): the old C / D tracks (ringMocap.ts, Viterbi on ellipse fits + parallel transport) fold back at
  edge-on (C at t 2.6-2.8 s turns to edge-on and goes back to the same side) and D never turns over (its axis stays in one
  hemisphere: it only nods between near face-on and near edge-on), with tumble rates swinging 4..233 deg/s. A symmetric ring's
  silhouette cannot tell "on through edge-on" from "back", so the fit folded the spins. Plot: `eyes/cd_angle_plot.png`
  (`py/plot_cd_raster.py`; each ring's axis angle about the rest camera's horizontal axis, unwrapped, and its rate, two loops):
  the mocap C rises, turns BACK at t 2.7-3.4 s, rate -173..+240 deg/s with 4 reversals per 8 s; the mocap D wanders +30..+90 deg
  with a net 0 over 8 s, rate -89..+91 deg/s, 16 reversals (it only rocks); the P2b flips are straight lines (constant rate, 0
  reversals). A / B are the closed-form constant-rate gimbals (|w| constant, no fold) and stay as they were.
- Measured from all 121 frames of Default Loop.mp4 (LOG 20:10-20:35):
  - rate + phase: constant-rate fits to the mocap's own ellipse shapes (`py/fit_cd.py`, A / B recovered exactly as a check) and an
    independent edge fit (`py/fit_edges.py`, `refine_edges.py`, `scan_a0.py`: the four projected rim circles of each ring against the
    Sobel edges of every frame): C one full turn per 4 s loop (|90| deg/s, every other rate scores lower), D half a turn (|45| deg/s),
    phases a0 = +34 / -36 deg; flips about the rest camera's horizontal axis (no precession: at F030 / F090 A and B are both
    edge-on, the inner rings are not).
  - sense (which half comes forward): the orb is occluded only by ice in front of it (`py/orb_occ.py`): C -90 deg/s darker in every
    frame with a large test region (F21-F31, F69-F78); D +45 deg/s in every frame where D alone crosses the orb (F41-F53).
  - looked at: `ref/ov_cpm.png`, `ref/ov_dpm.png` (direction), `ref/ov_c_newold.png` (F84 / F88: the reference's C slab sits above the
    orb centre = the new C's near arc after edge-on; the old C is still an edge-on line / near arc low), `ref/ov_d_newold.png`
    (F104 / F114: the reference's inner ring is a near circle round a fully visible orb = new D; the old D crosses the orb).
- Result: C = q0 Rx(-90 deg/s * tau), D = q0 Rx(+45 deg/s * tau) (local X on the flip axis), analytic (exactly periodic, no 8 s
  track, no loop seam, sign of the angular velocity constant), tau 0 = F000 unchanged; no loop tips for C / D (they corrected the
  old mocap). A / B unchanged (closed-form gimbals, no fold). The engine matches the model to 0.000 deg (`caps/gq`).

### Hold (`Rings.ts` `poseRigid`, `HoldR11.ts` `SPIN_P2B` / `SPIN_F2` / `HOLD_SPIN`, `HeroEngine.ts`, `Shards.ts`)
- Every ring keeps its idle tumble on ONE clock eased to `HOLD_SPIN.slow` = 0.2: the reference's measured share (A 120 deg in ~3.1 s
  vs 201 deg/s idle = 0.19, A2 R1; B's lid drift + roll ~31 deg/s vs 162 deg/s = 0.19), over tp 0.85..1.4 = F356..F372.5 (P2b;
  the integrated build eased over tp 0.3..1.15 although the reference's rings keep idle speed through the charge: A tilts ~170 deg/s
  at F344-F352, the crystals keep their speed to ~F355, A2's sustain starts at F372), so the slow motion starts with the lunge. C / D therefore slow down in their own new
  direction (no extra flip: `flipCD` only under `?spin=f2` / s3). The reference's C / D sustain motion is A2's face-on <-> flat beat
  (`ref/hold_cd.jpg`), not a slowed rotation, and the user rejected that beat at 09:05 ("repeat"), so C / D share the ring clock.
  Measured per ring, that beat (face-on F392-F412 -> flat F416-F428 -> face-on F432-F448, A2 R7 / R11: a quarter turn every
  ~0.65 s, ~135 deg/s) is 1.5x C's idle 90 deg/s and 3x D's 45 deg/s: the video has no slow-motion factor for C / D, only one for
  the sculpture (A and B, both 0.19). The user asked for the inner rings in slow motion "jangan ngide", so they get that same
  measured factor: one uniform time remap of the whole sculpture (C -90 -> -18 deg/s, D +45 -> +9 deg/s, same direction).
- A's quarters / B's halves: pivot rotation identity (each piece's world rotation IS its ring's), offsets only along their own
  radial in the ring plane (A 0.6 m along each quarter's bisector, B 0.1 m apart across the cut), all pieces of a ring by the same
  amount; the frame guard scales the whole ring's opening by one share (`HOLD_SPIN.guardRing`), so a ring near the frame edge opens
  less as a whole and no piece slides alone. No flex (`flexA` 0; it moved A's quarters up to 0.499 m OUT of A's plane: the askew
  pieces the user saw), no per-piece spin / tilt / lean.
- Shards: orbit + own clock slowed to `HOLD_SPIN.shardSlow` 0.5 (measured: the reference's crystals move 0.024-0.037 rad / frame
  round the orb in the sustain F380-F449 vs 0.050-0.064 at rest, `py/shard_track.py`), together with the ring clock
  (`shardRateFromSpin`: linear in the clock's share of its slow-down; the reference's keep speed to ~F355, are slowed by ~F375,
  back by ~F450-F470). The belt no longer contracts with the dolly (`shardContract` 0; in the reference's sustain the crystals sit
  as far out as at rest) and widens x(1 + 0.15 spreadA) (`shardOut`, Shards `uOut`) so no crystal passes through an opened quarter
  (the idle belt's ~2.87 m becomes ~3.3 m = ~440 px at the hold's 133 px/m: A2 R10 measures the reference's sustain belt "about
  450 px from the orb", just outside A; 0.13 cleared the opened pieces by only 1 cm, 0.15 by 10 cm).

## 2. Switches (each restores the integrated round-11 behaviour exactly)
- `?idle=r10`: rings C / D's old mocap idle (with their loop tips). 13 / 13 rest + pointer shots bit-identical to :5173.
- `?spin=f2`: the integrated rotating hold (fix round 2) exactly: flexA 1, per-piece guard, flipCD, slow 0.25, shards as before;
  implies `?idle=r10`, so `?spin=f2` alone = the :5173 build (26 shots incl. 8 live presses, and 17 shots with the shards visible and
  pinned: bit-identical; one live mid-lunge shot, F358 at tau 1.1, flickers between runs of the SAME comparison = harness noise).
- Unchanged and verified bit-identical (same query on both labs): `?hold=r10`, `?hold=r11a`, `?spin=s3`, `?aphase=r10`
  (with `&spin=f2`: 26 / 26); ALL-R10 `?env=projected&hold=r10&aphase=r10&ice=r10` vs :5179 (round-10 baseline): 26 / 26.
  `?hold=r10`, `?hold=r11a`, `?spin=s3` also imply `?idle=r10` (their builds had the old idle).
- FINAL BUILD re-check (16 Nov 02:27-02:49, `sw4/*/log.txt`, `sw5/summary.txt`): idle=r10 vs main 13 / 13; f2 vs main 25 / 26;
  f2 vs main shards visible + pinned 17 / 17; hold=r10 24 / 26; hold=r11a 16 / 17; spin=s3 16 / 17; aphase=r10&spin=f2 vs main
  aphase=r10 24 / 26; ALL-R10 (+ `&idle=r10`) vs :5179 26 / 26. Every non-identical shot is the live mid-lunge F358 (mean 0.018-0.44).
  Proof that it is harness noise (`tools/jcmp3.mjs` = jcmp2 + per-shot camera-matrix and exact ring-quaternion differences): the
  SAME build against itself, main `?hold=r10` vs main `?hold=r10`, gives exactly the same F358 difference (mean 0.042, max 68,
  camera matrix off by 2.0e-4) as lane vs main, and the ring quaternions are bit-equal (gqdiff 0) in every shot of every pair. The
  camera at mid-lunge depends on Choreography.move()'s pointer speed, which uses performance.now() between the harness's pointer
  events (wall clock of each page session).
- `?spin=hf` (fix round 1): the lead's hotfix build exactly (both crystal belts widened uniformly by 15 % with the opening); 26 / 26
  pinned shots vs the hotfix build mean 0.000 (section 8.4). `?spin=p2b` (hotfix) still restores the guard build.
- `?spin=f1` (fix round 2): fix round 1 exactly (hotfix framing 0.734, fix 1's crystal belts with the hold spread / throw, the hover
  push-in released at the arm); proof in section 10.3.
- Runtime: `__hero.debug.holdSpin.{slow, slow0, slow1, guardRing, shardSlow, shardContract, shardOut, shardOutA, shardOutB, ...}`.

## 3. Files (all in `retrux-web/`, no assets added: 0 bytes in public/hero)
| file | change |
|---|---|
| `app/hero/engine/hero/Rings.ts` | `IDLE_CD` / `IDLE_CD_Q0` (measured C / D flips), `idleMode`, no C / D loop tip in p2b, `flipCD` only off-P2b, `poseRigid` (rigid in-plane pieces, ring-uniform guard), `REST_CAMERA` import |
| `app/hero/engine/hero/HoldR11.ts` | `SPIN_F2`, `SPIN_P2B`, `IdleMode` / `idleModeFromUrl`, `HOLD_SPIN.slow` 0.2 / `slow0..slow1` 0.85..1.4 (P2b), `flexA` 0 (P2b), `guardRing`, `shardSlow`, `shardContract`, `shardOut`, `shardRateFromSpin` |
| `app/hero/engine/HeroEngine.ts` | `rings.idleMode`; P2b shard update (rate, no contraction, widening) |
| `app/hero/engine/hero/Shards.ts` | `update(..., rateGiven, out)`; uniform `uOut` (cen *= 1 + uOut; 0 = bit-identical) |
| `app/hero/README.md` | the idle / hold paragraph |

## 4. Verification (numbers; evidence paths relative to `$SP/work2/rings`)
- 60 Hz live logs (`tools/probe60.mjs`: real pointer events at exact 1/60 s steps; `py/an60.py`): 2 idle loops (`caps/m1/idle8`),
  1 / 3 / 5 / 10 / 20 s holds, 5 s holds at tau 0 / 1.3 / 2.0, re-press 0.35 / 0.10 s into the release, click in the release, click
  at rest (`caps/m1/*`), final `caps/fv/h10`, `caps/fv/rp035`: every ring's angular velocity = s_eff x its idle angular velocity
  with s_eff in [0.200, 1.000] in every frame (never reversed), residual <= 0.015 (key differentiation), C about its flip diameter
  -90 -> -18 deg/s, D +45 -> +9 (sign never flips); largest frame-to-frame |w| change A 8.2 deg/s (its own idle precession), B 6.0,
  C 2.4, D 1.2; s_eff step <= 0.0268 / frame. Integrated build for comparison (`caps/m1_f2`): C / D s_eff -0.17..1.78 / -37..+16.
  FINAL BUILD (slow-down over tp 0.85..1.4; `caps/m2/*` = the same 13 runs, and `caps/fv3/h10`): s_eff A 0.1999..1.0003, B
  0.1999..1.0001, C / D 0.200..1.000 in every frame of every run, residual <= 0.0151, C -90 -> -18 and D +45 -> +9 deg/s about
  the flip diameter; largest |w| change per 60 Hz frame A 8.40 / B 6.23 / C 3.05 / D 1.53 deg/s (A and B: their idle precession,
  also at rest), s_eff step <= 0.0339 / frame (the 0.55 s ramp); a 1 s press (released at tp 0.75) slows nothing (the slow motion
  starts with the lunge, as the reference's F356).
- Pieces (every frame of every run): angle between each piece's world rotation and its ring's <= 2.4e-6 deg, centroid off the ring
  plane <= 4.3e-5 m (float32), pivot rotation identity. Integrated build: up to 0.499 m out of plane.
- Shards: engine orbit rate 1.0 -> 0.50 -> 1.0 (largest step 0.044 / frame); the reference tracker run on the engine's own frames:
  px speed hold / idle 0.87 vs the reference's 0.84 (same tracker, same hold camera). Capsule test of every crystal against every
  opened A / B piece (8 press moments x 10 s + one 20 s hold, 7359 frames; final build with shardOut 0.15 `caps/sh3`): 0 hits, min
  clearance +0.100 m (0.13 after the timing change, `caps/sh2`: +0.010 m); integrated
  build (`caps/sh_f2`): 48 % of frames, min -0.112 m.
- H-G2 exact silhouettes (every 3rd vertex, 16 live presses x 6.25 s + release; `caps/b*`, `py/bsum.py`): 1440x766 T25 B740 L313
  R1129 (also 10 / 20 s holds); 1280x800 T47 B765 L278 R1004; 1920x1080 T38 B1043 L417 R1506: all inside. FINAL BUILD
  (`caps/v2b1440`, `v2b1280`, `v2b1920`): 1440x766 T25 B740 L310 R1128; 1280x800 T47 B765 L275 R1004; 1920x1080 T37 B1043 L413
  R1505; portrait 390x844 (`caps/v3b390`, 8 presses): L13 T202 R376 B620 (integrated build: L19 T188 R374 B632). All inside.
- Click inert: stock `probe_interact` (`logs/interact_lane.txt`): click drivers 0, never holding; ring step per 60 Hz frame
  hold / release / re-press / release 2 = 3.52 / 1.16 / 2.26 / 3.42 deg; no errors. FINAL BUILD (`logs/interact_final.txt`):
  click drivers 0, never holding; 3.74 / 1.21 / 2.81 / 3.45 deg; no errors.
- Looked at (frame by frame, next to the reference): `caps/idle8_vs_ref.mp4` + `caps/idle8_sbs_000/030/060/090.jpg` (every 0.1 s,
  engine | reference), `caps/cdz_*.jpg` (ref | new | r10 every 3rd frame), `caps/q00_q01_cmp.jpg`, `caps/q02_q03_cmp.jpg`,
  `caps/hold10s_p2b.mp4` + `caps/fv_h10_every05.jpg` + `caps/fv_h10_vsref_1/2.jpg`, `caps/fv_release_seq.jpg`,
  `caps/repress_p2b.mp4` + `caps/fv_repress_seq.jpg`, `caps/fv_shards_cmp.jpg`. Final build (16 Nov): `eyes/idle_inner_pairs.jpg`
  (hero crop, engine | reference every 0.2 s over the whole loop: the same configuration in every pair), `caps/hold10s_p2b_v3.mp4`
  + `eyes/fv3_every05.jpg` (press, 10 s hold, release), `eyes/fv3_guard_seq.jpg` (every 0.2 s through A's face-on phase),
  `eyes/fv3_vsref_1/2.jpg` (engine every 0.2 s next to the reference F323-F455), a second 10 s hold pressed at tau 0.6
  (`caps/hold10s_t06_p2b.mp4`, `eyes/fv4_every05.jpg`: at +7.0 / +7.5 s A turns face-on as four separated arcs round the orb, the
  reference's F420-F444 open frame; same 60 Hz bounds as above, shard / piece clearance 0.157 m), and the stock glitch sweep
  (`caps/sweep/sweep.jpg`: intro, hold / pop / release at the pointer extremes, tumble phases; no page errors, nothing outside
  the frame, torn or doubled).
- Typecheck: `tsc --noEmit -p tsconfig.hero.json` and `-p .`: exit 0, no output (final code: `logs/tsc_hero_final.txt`,
  `logs/tsc_all_final.txt`).
- Perf: section 6.

## 5. Open
1. The rotating hold is the user's rule (lead decision 09:07), not A2's arrangement: the reference's pop / slab / lens poses
   (F358-F444) are not reproduced; A2 only guides the camera and the opened shape.
2. With one guard share per ring, ring A's opening drops to ~1/3 (0.2 m) whenever its tumble turns it face-on at the full dolly
   (its 2.4 m outer radius already fills the 2.88 m half-height; the reference's arcs touch the frame edge there, H-G2 forbids it), so
   the opening breathes with the tumble phase. The alternatives were a per-piece guard (one quarter sliding in alone: not one ring) or a
   dolly that backs off when A is face-on (a camera motion the reference does not have). Measured in the final 10 s hold (press at
   tau 2.6, `caps/fv3/h10/frames.json` push log): A's share 1.0 to +5.0 s, 0.333 at +6.5 s (A face-on and tall), 1.0 again by +8.5 s;
   the quarters drift in by 0.4 m over ~1.5 s (~0.6 px per 60 Hz frame) and out again over ~2 s, smooth, no step
   (`eyes/fv3_guard_seq.jpg`). For scale: the reference's own face-on A (F452-F453) shows 25-60 px gaps on the diagonals, about
   what the guarded 0.2 m push gives (~0.28 m = ~37 px). A smaller guard margin (0.08 -> 0.05 NDC) would only lift the worst share
   to ~0.48 and cut the exact-silhouette clearance to a few px, so the fix round 2 margin stays.
3. B's halves part only 0.1 m (fix round 2's value, kept).
4. The engine's idle shards measure ~0.67x the reference's px speed with the same tracker (pre-existing population / swirl
   difference, not touched here); the hold / idle ratio matches.
5. C / D's in-plane texture phase is arbitrary (solid symmetric rings; no feature to measure).
6. The water / foreground-floe items of the user's QC belong to the WATER lane.
7. I started the lab on :5174 and stop it at the end (16 Nov: restarted for the re-verification and stopped again). Nothing
   committed, deployed or uploaded; no .blend touched. `retrux-web/tsconfig.tsbuildinfo` (git-ignored build output of `tsc -p .`)
   was restored to BASE's copy so the merge sees only the five source files.
8. Perf: the 16 Nov perf_probe set ran beside other lanes' GPU jobs (full-power slot) and swings 2x within each build; the lane's
   per-frame CPU work measures the same as main (section 6). A quiet-machine A/B is worth repeating at merge time.
9. The harness itself is not deterministic at the live mid-lunge (pointer speed from performance.now() in Choreography.move()),
   so bit-identity checks of live F358 shots can flicker for ANY two page sessions; compare camera matrices / ring quaternions
   (`tools/jcmp3.mjs`) before calling a switch inexact.

## 6. Performance (`perf/runs_T1_15nov.txt`, `perf/summary_T1_15nov.txt`; final build: `perf/runs_T1.txt`, `perf/summary_T1.txt`)
MAIN's perf_probe, T1 scale 1, 1440x766, 6 interleaved pairs (AB / BA), every run through the slot with `SLOT_BG=0` and started at
1-min load < 6 (2.74-5.86); macOS Low Power Mode was on for both builds. Lane (A) vs MAIN :5173 (B), 15 Nov (2-slot light mode):
| phase | median fps lane / main | median frame ms lane / main | per-pair lane / main fps ratio, median (range) | worst frame median, max (ms) lane / main |
|---|---|---|---|---|
| rest | 30.9 / 27.1 | 32.4 / 36.9 | 1.199 (0.84-1.86) | 66.7 / 74.9, 83.4 / 83.4 |
| hold (`pose("expand", 2.97)`) | 23.6 / 23.1 | 42.4 / 43.2 | 1.013 (0.90-1.55) | 66.7 / 83.4, 83.4 / 100.0 |
| collapse | 31.9 / 28.8 | 31.3 / 34.8 | 1.061 (0.93-1.41) | 50.1 / 50.1, 83.3 / 66.8 |
No cost measurable within the machine's noise (analytic C / D instead of slerped keys, one guard solve per ring, one uniform). The
slow-down timing change came after these runs; it does not change the per-frame work.

Final build, 16 Nov 02:49-03:06 (same protocol, start loads 3.18-5.89, Low Power Mode on; the slot was in full-power 3-slot mode,
so the other lanes' Chrome / GPU jobs ran beside these timing runs): both builds swung 14-35 fps from run to run and fell with the
machine's load (A rest 30.4 -> 17.6 -> 32.6 -> 21.5 -> 19.7 -> 14.1, B 31.8 -> 20.1 -> 26.1 -> 18.6 -> 21.2 -> 18.8).
| phase | median fps lane / main | median frame ms lane / main | per-pair lane / main fps ratio, median (range) | worst frame median, max (ms) lane / main |
|---|---|---|---|---|
| rest | 20.6 / 20.6 | 48.5 / 48.4 | 0.943 (0.75-1.25) | 75.0 / 66.8, 116.7 / 83.3 |
| hold | 17.9 / 20.4 | 56.0 / 49.1 | 1.002 (0.69-1.25) | 83.4 / 83.3, 100.0 / 83.4 |
| collapse | 20.2 / 29.6 | 49.5 / 33.8 | 0.754 (0.53-1.25) | 75.0 / 50.1, 83.4 / 66.7 |
This set cannot resolve a few % (a run-to-run spread of 2x within each build). Every lane change is CPU-side pose math plus one
uniform multiply in the shard vertex shader, so the CPU cost of the per-frame update was measured directly as well
(`tools/cpu_ab.mjs`: `debug.settle()` timed in-page, loop stopped, 6 interleaved pairs, `perf/cpu_ab.txt`): rest 0.005 / 0.006 ms
per update (per-pair median 0.93), hold (a real press, 4 s into the sustain) 0.011 / 0.013 (0.87), release 0.010 / 0.008 (1.04):
about 0.01 ms of a 16-50 ms frame in both builds. A quiet-machine perf_probe re-run belongs to the judge / merge.

## 7. Judge round 1 (16 Nov 03:2x-04:45 WIB): FAIL, lens 6.8
Verdict: `$SP/work2/rings/judge1/verdict_draft.md` (fresh captures, tools and evidence under `judge1/`). Note: the lead merged this
lane's five files into MAIN at 04:10, so MAIN :5173 == LANE now; the pre-merge baseline is `judge1/caps/main/{idle8,h10_t26}`.
- PASS: idle C / D continuous (90 / 45 deg/s, 0 reversals; closer to Default Loop than the pre-merge build in 86 / 121 frames); C / D
  slow-mo in the hold (-18 / +9 deg/s, 0 reversals); pieces exactly in their ring's plane and rotation; seamless press / release /
  re-press; click inert; `?idle=r10` / `?spin=f2` exact; T0 / T2 fine.
- BLOCKER: A's opening pulses to ~0.2 m (share 0.26-0.33) whenever A turns face-on (ring-uniform guard): tau 1.3 / 3.3 presses are
  nearly closed at the reference's F420 open frame; the user reported the pulse (AUTOPILOT 04:17; hotfix in `$SP/lanes2/hotfix`).
- MAJOR: hold crystal belt widened (shardOut 0.15, no contraction): radius p50 / p90 500 / 717 px vs the reference's 386 / 477 (the
  pre-merge build matched, 385 / 548); near crystals cross the frame at 2x the reference's speed (32.3 vs 16.3 px / frame).

## 8. Fix round 1 (16 Nov 2026 05:24-06:31 WIB, rings fixer; evidence under `$SP/work2/rings/fix1b/`)

Start state: LANE = MAIN = v1 + the lead's hotfix (constant opening A 0.6 m / B 0.1 m, hold camera framed once per screen shape,
`?spin=p2b` = the guard build; the six files were md5-equal across LANE, MAIN and `lanes2/hotfix`). The first fix attempt
(04:45-04:55) was stopped by the lead and left no usable captures; its tool `fcap.mjs` was reused and extended.

### 8.1 Judge findings, one by one

| finding | what I did | result |
|---|---|---|
| BLOCKER: ring A's opening pulses closed when A turns face-on | fixed by the lead's hotfix (not re-implemented, not touched). Verified with fresh captures and the judge's own `aclose.py` | share 1.00 at F404 / F420 / F436 for presses at tau 0 / 0.6 / 1.3 / 2.6 / 3.3; A 0.59994..0.60004 m from t+3.43 s to the release in every hold, incl. 20 s; no dip (the judge measured 0.15-0.20 m windows every ~5 s). Gate 3b now PASS |
| MAJOR: hold crystal belt widened away from the reference; near crystals ~2x the reference's speed | measured first, then replaced the uniform 15 % widening by a per-belt, per-axis one (below) | at the hotfix camera: area-weighted px from the orb 375 / 464 / 543 (ref 386 / 459 / 477; uniform 411 / 529 / 589; judge-time 500 / 635 / 717); big crystals 23.9-24.4 px / frame (judge-time 32.3, uniform 27.3-28.0, ref 16.3) |
| nit: rotating hold vs the reference's slab arrangement | not this lane's (lead decision 09:07) | unchanged; the open frame now appears whenever A faces the camera (eyes/open_frame_5press.jpg) |
| nit: camera lunge timing | not this lane's (hold-lane camera, identical before the lane) | unchanged |
| nit: idle crystal size / speed | not this lane's (crystal look) | unchanged |

### 8.2 Root cause of the major (measured, `fix1b/py/cmodel.py`, `caniso2.py`, `cperbelt2.py`, `cproj.py`)
- At every tier the swarm is the 18 authored crystals: belt A (9, 3.26 m) and belt B (9, 3.86 m) about a centre 0.2 m in front of
  and 0.1 m below the orb; no procedural swirl.
- A CPU model of SHARD_VERT over every belt phase (capsule = long axis +- half length, thickness, rock, bob, breath) against ring A's
  opened bounding sphere (`openRadiusA` 3.035 m) shows that only belt A's crystals BEHIND the orb come near the opened quarters (the
  belt centre sits in front of the orb and the round-10 hold spread is only x1.025 in depth). The uniform 15 % was the smallest
  uniform value that keeps them out (+0.02 m), and it pushed everything else out too: belt B (which clears the sphere unwidened,
  +0.15 m) and every crystal across the view, where the reference's crystals hug the arcs.
- The hotfix's hold camera (stops at 0.7335 of the dolly at 1440x766, 14.9 m from the orb instead of 12.7 m) already brought the
  judge's numbers most of the way (uniform: 400-436 / 512-562 / 596-643 px, big crystals 24.4-26.4 px / frame).
- Rate: not the cause. shardSlow 0.5 stays (svnorm, speed / sqrt(area), engine sustain 0.72-0.87 vs ref 0.69, sustain / idle
  engine 0.67-0.81 vs ref 0.73-0.82; mid-size crystals 15-17 vs ref 17.0 px / frame). The big-class excess is the swarm's
  composition: the engine's big blobs are its near front crystals (all 18 crystals are ~0.8 m long, size = nearness), the
  reference's big blobs move like its small ones (crystals of many sizes); a slower rate would make the small / mid crystals 35 %
  slower than the reference. Pre-existing (judge nit 5).

### 8.3 The change (P2B_F1, default; `?spin=hf` restores the hotfix build exactly)
- `HoldR11.ts`: `SPIN_HF` (`?spin=hf`), `P2B_F1` (= HOLD_STEADY and not hf); `HOLD_SPIN.shardOutA` [0.08, 0.20] and `shardOutB`
  [-0.10, 0.30] = [across the view (x, y), in depth (z)] x spreadA (the opening driver), used instead of the uniform `shardOut`
  under P2B_F1. Belt A widens 8 % across / 20 % in depth; belt B -10 % across (with the hold spread's +8.4 % it stays at 0.98 of its
  rest radius) / 30 % in depth. Across the view both belts end at the same 3.77 m, just outside the opened arcs (in the .blend the
  artist's two belts have one radius; the engine's 15 % wider belt B only kept the two belts' crossing apart, which the depth
  widening now does: the belts cross along the view axis).
- `Shards.ts`: uniform `uOut` float -> `vec3 uOut[3]` (per belt, per axis); `cen *= 1.0 + uOut[orbit]`; `update(..., out: number |
  [axA, azA, axB, azB])` (a number = every belt and axis, as before; per-belt shares may go down to -0.5).
- `HeroEngine.ts`: passes the per-belt array under P2B_F1 (preallocated, x spreadA), the uniform `shardOut * spreadA` otherwise.
- `README.md`: one sentence. Nothing else changed: rings, camera, opening, rates, environment are untouched (pixel-identical with
  the shards hidden, below).

### 8.4 Verification (fresh captures, T1 scale 1, through the slot; `fix1b/tools/fcap.mjs` = judge's jcap + per-tick capsule test of
every crystal against every opened A / B piece, live uniforms, belt A-B crystal clearance, exact silhouettes; `an_caps.zsh` runs
the judge's `aclose.py`, `srad.py`, `sbig.py`, `svnorm.py`)
- Opening (gate 3b): see 8.1; quarters' offsets equal to 2.4e-5 m; pieces = ring rotation (rings untouched).
- Crystal belt (gate 4), pinned A/B (crystal clock / phases pinned at the press, identical ring states; `caps/s4`, `caps/s5`), tau
  2.6 / 1.3 / 0.6:
  | build | px from the orb p50 / p75 / p90 | crystal area beyond 477 px (tau 2.6, `py/outer.py`) | small / mid / big px per frame |
  |---|---|---|---|
  | reference F380-F440 | 386 / 459 / 477 | 9.6 % | 20.8 / 17.0 / 16.3 |
  | fix round 1 (default) | 375 / 464-465 / 542-544 | 22.4 % | 12.6-15.4 / 14.9-15.7 / 23.9-24.4 |
  | `?spin=hf` (hotfix) | 410-412 / 528-530 / 588-589 | 34.8 % | 12.6-18.7 / 16.9-18.0 / 27.3-28.0 |
  Unpinned, 5 press phases (`caps/s2`, the intermediate B 0 % step): 369-405 / 476-513 / 548-569.
- No crystal inside an opened piece: 0 hits in every run (final values: 28 presses x 6.25 s at 4 screen sizes, `caps/s8`, min
  clearance +0.122 m; 10 s holds, release / re-press, click, `caps/s7`, +0.15..+0.36 m); model guarantee (any ring orientation):
  belt A +0.08 m, belt B +0.09 m from ring A's opened bounding sphere (uniform 15 %: +0.02 m).
- Crystals never touch each other in the opened hold: over the 28 presses (`caps/s8`, 7532 ticks with the opening >= 0.7) belt A-B
  capsule clearance >= +0.015 m at every tick; the hotfix belt evaluated on the same states overlaps in 182 ticks (down to -0.184 m);
  every pinned run >= +0.012 m (hotfix 12-21 ticks per run, -0.19 m); the overlaps left are the idle geometry's (spreadA ~0: rest, the first 0.6 s of
  a press, after the release), identical in every build.
- Continuity: the widening follows spreadA (largest per-tick change of the depth share 0.024 at the pop, during the camera lunge);
  the shard rate is unchanged (1 -> 0.5 -> 1, step 0.021 / tick). Every crystal's 3D step per 60 Hz tick (relative to the hero,
  `py/cjerk.py`): largest 24.5 cm in the hold (hotfix 23.1, idle 19.7-20.4), largest change of step 1.0-1.1 cm per tick through
  press, sustain, release and a re-press 0.35 s after the release (hotfix 0.5-1.3): no jump.
- H-G2 (`caps/s8`, final values; `an/s8_bounds.txt`): 1440x766 16 presses (tau 0..3.75) worst L378.4 T48.6 R1068.9 B736.9;
  1280x800 4 presses T50.8 B763.5; 1920x1080 4 presses T77.8 B1025.3; 390x844 4 presses: sides cropped 21-28 px (the hotfix's
  allowed portrait crop, unchanged), T192 B631. A opening at full 0.59994..0.60004 m in all 28. No page errors.
- Switches (`caps/j/*/log.txt`, jcmp3 with SHOW_SHARDS=1 = shards visible and pinned; LANE :5174 vs a frozen copy of the hotfix
  build :5194 whose app == MAIN's): `?spin=hf` vs hotfix default 26 / 26 shots mean 0.000 (camdiff 0, gqdiff 0; p06 2 pixels and
  p05 5 pixels differ by 1-9 levels: the shard shader's uniform is now a per-belt vec3; within SPEC 2.7's 0.5 / 255);
  `?spin=p2b` 11 / 12, `?spin=f2` 15 / 16, `?hold=r10` 15 / 16 identical (the one other shot each is live_F358_t1.1, camdiff 1.3e-4,
  gqdiff 0: the documented harness flicker); `?spin=s3` identical; default rest + pointer identical (idle untouched); default hold
  with the shards hidden 12 / 12 identical (rings, camera, environment untouched); default hold with shards differs only in the
  crystals (mean 0.2-1.2).
- Tiers: T0 / T2 load, hold and release with the new belt and with `?spin=hf`, no page errors (`eyes/tiers_T0_T2.jpg`).
- Looked at: `eyes/ref_sustain_3x3.jpg`, `eyes/s1_cur_vs_ref.jpg`, `eyes/belt_ref_f1_hf_t26.jpg` (ref | B 0 % step | hotfix, circles at
  386 / 477 px), `eyes/open_frame_5press.jpg` (F420 / F436 / F441 for 5 press phases), `eyes/seq_ref_vs_f1_t26.jpg` (every 2nd frame
  F396-F418, ref vs engine), `eyes/tiers_T0_T2.jpg`, `eyes/belt_ref_final_hf_pinned.jpg` (ref | final | hotfix with the same crystal
  phases, F384-F432), `eyes/fin_press_t13.jpg` (every 0.1 s through the press and lunge), `eyes/fin_release_repress.jpg` (every
  0.1 s through a release and a re-press 0.35 s later), video `eyes/final_hold10s_t13.mp4` (30 fps, 10 s hold + release).
- Typecheck: `tsc --noEmit -p tsconfig.hero.json` and `-p .`: exit 0, no output (`fix1b/logs/tsc_*_final.txt`); tsconfig.tsbuildinfo
  restored to BASE's copy.

### 8.5 Still open
1. The swarm's composition (18 crystals of one size; size = nearness) keeps the big near crystals ~1.5x the reference's on-screen
   speed and the outer tail wider than the reference's (22 % of the crystal area beyond 477 px vs 10 %); judge nit 5, crystal owner.
2. The engine's idle belt sits closer to the orb than the reference's at rest (judge srad: 223 vs 266-271 px p50); out of scope.
3. The rotating hold (lead decision) shows the reference's four-arc open frame only when A's tumble faces the camera.
4. Lab :5174 (PID 34216) and the reference lab :5194 (PID 45466, serving `fix1b/hflab`, an APFS clone of `lanes2/hotfix/retrux-web`
   whose app == MAIN's at 06:0x) were started by me and stopped at 06:31; :5173 / :3000 untouched. Nothing committed, deployed or
   uploaded; no .blend touched. LANE vs BASE: README.md, CameraRig.ts (hotfix), HeroEngine.ts, HoldR11.ts, Rings.ts (v1 + hotfix),
   Shards.ts (+ HANDOFF.md; hero-lab/dist is the lab's git-ignored build output). Fix round 1 changed HoldR11.ts, Shards.ts,
   HeroEngine.ts and README.md on top of the hotfix (diff vs `lanes2/hotfix`).
5. Perf not re-timed (the machine's 1-min load reached 109 during this round): the change is one dynamic uniform-array index in the
   shard vertex shader (18 crystals) and four multiplies plus three Vector3.set per frame on the CPU.

## 9. Judge round 2 (16 Nov 2026 06:34-07:2x WIB): FAIL, lens 7.8 (no blocker, no major)
Verdict: `$SP/work2/rings/judge2/verdict_draft.md` (fresh captures through the slot, tools and evidence under `judge2/`; lab :5174
started and stopped by the judge; nothing in LANE changed).
- PASS: idle C / D continuous (90 / 45 deg/s, 0 reversals; BASE 4 / 16; closer to Default Loop than BASE in 105 / 121 frames);
  C / D slow-mo in every hold (-18 / +9 deg/s, 0 reversals); A's quarters / B's halves exactly in their ring's plane and rotation,
  opening constant 0.600 m (no pulse) at 5 press phases and a 20 s hold; crystals 1 -> 0.5 -> 1 with the reference's timing (F358-F376,
  F449-F467), zoom-invariant slow-down x0.66 vs the reference's x0.72; press / 0.3-20 s holds / release / re-press 0.35 s seamless;
  click inert; `?spin=f2` = BASE and `?spin=hf` = MAIN exactly; T0 / T2 no errors; tsc 0.
- MINOR 1: the hold is framed at 0.84x the reference's scale (112-113 vs 132-133 px/m at the orb; the hotfix's frameShare). Hint: full
  dolly on landscape, bound A by the reference's own edge contact (F436-F444 arcs touch y 0-5 / 735-750) or grow the push like A2 R4.
- MINOR 2: nearest crystals 1.4x the reference's on-screen speed in the sustain (pinned: 23.2 vs 16.3 px / frame), outer tail +15 %
  (p90 550 vs 477 px); improved over MAIN (28.4, 626). Hint: depth widening only behind the belt origin (the front crystals need no
  room), then re-tune with `judge2/tools/sbig.py` / `srad.py`.
- nits: rotating hold vs the reference's arrangement (lead decision); crystals bigger / fewer than the reference's (crystal owner);
  fast lunge 0.73 + 0.76 m in two ticks and a 0.12 m back-off at the press (hold-lane camera); D near-still in the sustain at 9 deg/s.

## 10. Fix round 2 (rings fixer; started 16 Nov 07:10, paused by the user at 07:58, resumed and finished 17 Nov 07:46-08:48 WIB)
Evidence under `$SP/work2/rings/fix2/` (tools `tools/fcap2.mjs` = judge's jcap + per-tick capsule test + exact silhouettes,
`py/*.py` CPU models, `an/*.txt` numbers, `eyes/*.jpg` sheets looked at). Fresh captures through the slot, T1 scale 1, lab :5174.

### 10.1 Judge 2's findings, one by one
- MINOR 1 (hold framed at 0.84x the reference): reproduced (`?spin=f1` pinned t26: 112-113 px/m, judge 112-113). Root cause: the
  hotfix framed the hold once per screen so the opened A's bounding sphere (3.035 m) stays 0.04 NDC (15 px) inside the frame plus
  the pointer-pan / drift slack -> share 0.7335 of the dolly at 1440x766. The 16 Nov attempt of this fixer reduced ring A's push to
  0.26 m to get the full dolly; that broke the lead's binding note of 16 Nov 07:15 (A 0.6 m constant, "never by changing the
  opening") and was reverted on 17 Nov. FIX (`HoldR11.ts`, P2B_F2): pushA stays 0.6 m; `frameMargin` -0.03 instead of 0.04, so
  the fixed framing comes as close as the opened A allows when it touches the frame edge at its widest tumble phase (the lead's
  "touch, a few px at that moment"; the reference's arcs touch the top edge at F436-F444). 1440x766: share 0.853, camera 13.93-14.16 m
  from the orb, 119-121 px/m (0.90-0.91x of the reference's 132-133; was 0.84x). H-G2 exact silhouettes over 16 presses + 4
  pointer-edge holds: worst L353.1 T24.2 R1094.5 B763.1 (inside; the widest phase touches the bottom within 2.9 px); 1280x800 B763.5
  (36 px), 1920x1080 B1059.8 (20 px), 390x844 the hotfix's accepted side crop unchanged (no hold dolly there). The remaining 9 % is
  the price of the constant 0.6 m opening in a rotating hold: A turns face-on and tall at some tumble phase, where the reference's
  0.31-0.55 m A never does; more zoom needs a smaller opening (forbidden) or a real crop of the arcs.
- MINOR 2 (nearest crystals 1.4x fast, swarm's outer edge +15 %): reproduced (`?spin=f1` pinned t26 srad 403/486/550, sbig
  14.8/15.8/22.9 = judge's 403/486/550, 15.0/16.0/23.2). Root causes (CPU model `py/creplay.py` validated on the judge's frames,
  `py/cwhatif.py`): the round-10 hold "shatter" throw (half the crystals thrown 0.7-1.7 m out, +14-25 deg along the orbit, extra
  spin) and hold spread (x1.07 across) are still applied to the crystals in the hold (+10-17 % / +4-9 % radius), which the reference
  does not show (looked at `eyes/ref_pop_340_392.jpg`: the crystals stay round the sculpture through the pop); and the depth widening
  was symmetric (front crystals pulled toward the camera). FIX (P2B_F2): `HOLD_SPIN.shardHoldFx` 0 (no throw, no hold spread in the
  hold; 1 = every older build) and a widening chosen with the CPU model so every crystal stays outside ring A's opened bounding sphere
  at ANY ring orientation (`py/cscan7.py`, `py/cfine.py`): belt A 16 % across / 30 % behind / 10 % in front of its origin, belt B
  0 / 40 % / 25 % (sphere clearance A +0.106, B +0.184 m; belts' crossing +0.091 m); `Shards.ts` gets `uOutF[3]` (depth share in
  front of each belt's origin, C1 blend over the 0.5 m behind it; equal to uOut.z = the old line exactly).
  Result, pinned like the judge (`an/v2a2_pinned.txt`): srad p50/p75/p90 t26 375/462/494, t13 368/459/494 (reference 387/460/477;
  fix 1 403/486/550) -> the outer edge is +3.6 % instead of +15 %; svnorm 0.686 / 0.572 (reference 0.694, fix 1 0.739); sbig
  small/mid/big t26 14.9/14.5/24.2, t13 8.0/13.1/23.5 (reference 20.8/17.0/16.3). The big class stays ~1.45x: per px/m at the orb
  it is 0.200 m / frame (fix 1 0.205, reference 0.123) and per region the engine's crystals move as fast as the reference's or
  slower (`an/crystal_regions.txt`); the excess is the population: the engine's 18 one-size crystals passing in front of the
  sculpture are its big blobs (27-30 % of the big class vs the reference's 12 %), where the reference's front crystals are small ones
  (the judge's own hint gives that residual to the crystal owner, nit 4). Capsule test (crystal capsule vs every opened piece, every
  tick): 0 hits in all 32 H-G2 runs (min +0.123 m) and in every motion run; belt A-B crystals in the opened hold >= +0.149 m.
- nit 5 (camera lunge "too fast", creep backs off): measured with the same background-shift tool on the reference and the engine
  (`py/bgshift.py`, `an/creep_bgshift_table.txt`): the engine's lunge per frame F354-F358 matches the reference's frame by frame
  (full dolly 12.8 / 40.4 / 20.1 / 9.1 px vs 13.1 / 38.7 / 18.9 / 8.6), so "too fast" is not supported; the creep did back off
  (camera 19.969 -> 20.068 m after the arm; background -0.9 px over F334-F342, 2.3 px by F348 vs the reference's monotone 14.1 px).
  Cause: the hover push-in sprang back when the press became a hold. FIX (`Choreography.ts`, P2B_F2 + r11 only, not under debug
  poses): the push-in hands over to the dolly (tilt = push-in at the hold start x the dolly's remaining share), so the camera only
  comes in on the measured EXPAND_CAM_R11 shape and ends at exactly the same full-hold pose; value and (bounded) rate carry into the
  release's spring. After: distance decreases on every tick from the arm, background shift monotone 0.0 -> 1.4 px a frame
  (9.7 px by F348; reference 14.1, x0.85 share ~12), lunge keeps the reference's shape (9.9 / 31.2 / 15.1 / 6.6 at the 0.853 share).
- nits 3 (rotating hold arrangement: lead decision), 4 (crystal size / count: crystal owner) and 6 (D near-still at 9 deg/s:
  observation, the slow motion the user asked for): no change.

### 10.2 The change (P2B_F2, the new default; `?spin=f1` restores fix round 1 exactly, `?spin=hf` the lead's hotfix = MAIN)
| file | change |
|---|---|
| `app/hero/engine/hero/HoldR11.ts` | `SPIN_F1` (`?spin=f1`), `P2B_F2`; `HOLD_SPIN.frameMargin` -0.03 under P2B_F2 (0.04 elsewhere); `shardOutA` [0.16, 0.3] / `shardOutB` [0, 0.4] under P2B_F2 (fix 1's [0.08, 0.2] / [-0.1, 0.3] elsewhere); new `shardFrontA` 0.1 / `shardFrontB` 0.25 (depth share in front of each belt's origin; P2B_F2 only); new `shardHoldFx` (0 under P2B_F2: no round-10 hold spread / shatter throw on the crystals; 1 elsewhere). pushA stays 0.6 for every build |
| `app/hero/engine/hero/Shards.ts` | `uniform float uOutF[3]`; SHARD_VERT: `if (uOutF == uOut.z)` the old line `cen *= 1.0 + uOut[orbit]` runs unchanged (every older build), else z *= 1 + mix(front, behind, 1 - smoothstep(-0.5, 0, z)) (C1); `update(out)` accepts 6 entries (4 = fix 1's per-belt shares, symmetric) |
| `app/hero/engine/HeroEngine.ts` | P2B_F2 passes the 6-entry widening (`shardOut6`); the crystals' hold / shatter arguments x `HOLD_SPIN.shardHoldFx` (x1 = exact for older builds) |
| `app/hero/engine/Choreography.ts` | imports `P2B_F2`; `tiltHand` set in `setPhase("expand")` (r11); in the r11 expand phase (P2B_F2, not under debug poses) the hover push-in = tiltHand x (1 - camExpand) / (1 - camFrom), spring value / target / velocity set to it (velocity bounded by the spring's own return, so an early release never pushes it through 0) |
| `app/hero/README.md` | the Motion row: fix round 2 paragraph |
No assets added (0 bytes in `public/hero`). The 16 Nov attempt's pushA 0.26 is gone (it changed the opening, against the lead's note).

### 10.3 Switches (proof: `fix2/caps/j/*/log.txt`, jcmp3 with pinned time / tumble / plasma / grain and the crystals visible + pinned)
- `?spin=f1` (new): fix round 1 exactly. vs the frozen fix-1 build (`fix2/f1lab` served on :5194): 24 / 26 in the full set; the two
  live mid-lunge F358 shots then differed (camdiff 2.1e-3 / 4e-7, ring quaternions bit-equal) and are identical in two repeats of
  the live group (`fix2/caps/jn/f1_vs_f1lab_live_b`, `_c`: 8 / 8, camdiff <= 4e-7), as is the frozen build against itself
  (`jn/f1lab_vs_f1lab_live`) = the documented harness flicker (pointer speed from performance.now()).
- `?spin=hf` vs MAIN :5173 (hotfix build): 26 / 26 identical. `?spin=p2b` 13 / 13, `?spin=f2` 17 / 17, `?hold=r10` 17 / 17,
  `?spin=s3` 13 / 13 (each vs MAIN with the same query); default rest + 9 pointer spots vs MAIN 13 / 13 (the idle is untouched).
  Also `?hold=r11a` 17 / 17, ALL-R10 `?env=projected&hold=r10&aphase=r10&ice=r10` 26 / 26, `?idle=r10` 13 / 13 (vs MAIN, same query).
  Default hold vs MAIN: only the new framing (camera 0.76-0.99 m closer in the hold, ring quaternions bit-equal) and the crystals.
- Runtime knobs: `__hero.debug.holdSpin.{frameMargin, shardOutA, shardOutB, shardFrontA, shardFrontB, shardHoldFx, ...}`.

### 10.4 Verification (final code, fresh captures through the slot; `fix2/an/*`)
- Hold scale (1440x766): holdShare 0.853, camera 13.93-14.16 m from the orb, 119-121 px/m (fix 1 / judge: 112-113, reference
  132-133). Open frame next to the reference: `eyes/ref_F436_F440_vs_fix2_fix1_tick400.jpg` (looked at: the opened A spans the
  frame's height like F436 / F440; fix 1 visibly smaller); bottom contact `eyes/fix2_bottom_touch_t414_416.jpg`.
- H-G2 (`an/v2b2_bounds.txt`, 32 unpinned runs, exact silhouettes every tick): 1440x766 worst L353.1 T24.2 R1094.5 B763.1 (inside;
  pointer at the corners / top / bottom included), 1280x800 B763.5, 1920x1080 B1059.9, 390x844 the hotfix's side crop -21.7 / -27.9
  (unchanged, lead-accepted). Ring A 0.59994..0.60004 m at full opening in all 32, B 0.1; 0 crystal-in-piece hits (min +0.141 m).
- Crystals pinned like the judge (`an/v2a3_pinned.txt`): srad 375/462/494 (t26), 368/459/494 (t13) vs reference 387/460/477 (fix 1
  403/489/550); sbig 14.7/14.7/24.1, 9.1/13.2/23.5 vs 20.8/17.0/16.3; svnorm 0.689 / 0.580 vs 0.694 (fix 1 0.743). Sheets
  `eyes/crystals_pinned_ref_fix2_fix1.jpg`, `eyes/final_hold_t26_vs_ref.jpg` (looked at).
- Motion (judge's jan2 on every run: `an/v2c_*`, `v2d_*`, `v2e_*`): every ring 0 sign flips in every run (holds 1.1 / 1.2 / 2 / 10 /
  20 s at 5 press phases, re-press 0.35 / 0.10 s, click); C -90 -> -18, D +45 -> +9 deg/s (|dw| <= 3.05 / 1.53 per tick); pieces =
  ring rotation 0.00 deg, |z| <= 3.2e-5 m, A's quarters equal to 2.4e-5 m; opening share 1.00 at F372-F442, 0.600 m constant from F436
  to the release (20 s hold too); crystals 1 -> 0.5 -> 1 (step 0.0212 / tick), uShatter 0, uHold 0 in the hold; click inert (no
  opening, camera <= 1.3 mm / tick, spin 1). Camera: monotone creep from the arm in every fresh hold (0 ticks backing off before the
  dolly's own 3 % ease-back), background shift F330-F348 0.0 -> 1.4 px a frame (`an/creep_bgshift_table.txt`), lunge in the
  reference's shape; release / re-press steps continuous (`eyes/fix2_p11_release_at_lunge.jpg`, release at the lunge's peak).
  Sequence sheets looked at: `eyes/fix2_h10_t26_every05.jpg`.
- T0 / T2 smoke (final code): no page errors (`caps/smoke2_*/logs.txt` empty), `eyes/final_tiers_T0_T2.jpg` looked at (rest, hold,
  release render normally). tsc `-p tsconfig.hero.json` exit 0, `-p .` exit 0 (`logs/tsc_*_final.txt`); tsconfig.tsbuildinfo
  restored from BASE. Perf not re-timed: the GPU change is one float[3] uniform and one branch in the crystal vertex shader (18
  crystals), the CPU change a few scalar operations per frame; the machine ran other lanes' jobs at load 15-28 meanwhile.

### 10.5 Still open (for the lead / other owners)
- The hold is at 0.90-0.91x of the reference's scale (was 0.84x): the remainder is the constant 0.6 m opening in a rotating hold
  (A turns face-on and tall at some tumble phase). Closer framing = a real crop of A's arcs at that phase (frameMargin -0.04 /
  -0.05 would give 0.92 / 0.93x with ~1 / ~5 px cut at the worst instant) or a smaller opening (the lead's note forbids it).
- Big-crystal on-screen speed 23.5-24.1 vs the reference's 16.3 px / frame: the crystal population (the engine's 18 one-size
  crystals, the ones passing in front of the sculpture are its big blobs). Crystal owner (judge nit 4, P3 panel / ICE lane).
- Nits unchanged by decision: rotating-hold arrangement vs State 2 to 5's (lead decision 09:07), D near-still at 9 deg/s (the
  slow motion the user asked for), the creep / lunge amplitude follows the fixed framing (x0.85 of the full dolly at 1440x766).
