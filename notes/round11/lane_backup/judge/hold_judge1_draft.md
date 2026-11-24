# HOLD lane, judge 1 (round 11): verdict
Lens: press-and-hold choreography (pop, sustain, release) vs State 2 to 5.mp4 F331-F462, motion continuity, framing.
All evidence is fresh, produced by this judge in WORK/judge1/ (lane lab :5175 started and stopped by this judge; baseline :5173).
Tools (all new, judge1/tools/): jprobe.mjs (live press with real pointer events, frozen clock, exact 60 Hz steps; ID render of
every ring piece WITH the ice vertex shader, i.e. the displaced silhouette the visitor sees), hg1_check.mjs (A2 section 10 rows),
g2_sum.mjs, motion_an.mjs / axis_an.mjs (per-step turns, clamp hits, kinks, sweep), bgshift.py (camera motion from the
background, applied identically to reference, lane and MAIN frames), jcmp.mjs + imgcmp.py (bit-level A/B with time, ring clock,
orb plasma frame and grain frame pinned, render loop stopped, shards hidden), perf_pairs.sh / perf_sum.mjs.
Probe artefact found and avoided: with the engine's render loop running while the clock is frozen, dt = 0 frames skip the
900 deg/s turn limiter between settle() steps (a 108 deg one-frame "flip" in caps/mot_lane is an artefact); the motion study was
redone with the loop stopped (caps/mot2_*).

## Verdict: FAIL. lens_score 7.4
The r11 hold is a large step up from r10 (deterministic: extents within ~10 px over 6 press moments where r10 varies by 100+ px;
the charge -> pop cross -> slab cluster -> portal -> open frame -> 12/3/6/9 release follows the reference; the way back is
bit-exact). It is not yet the video: the release's inner whirl became a face-on bullseye, the F420 lens lost its glowing slit,
the r11 camera moves on linear keys (velocity steps), and re-presses still whip rings at the turn clamp.

## Gates
| gate | verdict | evidence |
|---|---|---|
| H-G1 A2 section 10 rows | FAIL | HG1_lane_check.txt (6 press moments, exact silhouettes, tp = (F-330.5)/30): 62-66 of 80 automatic rows per press (384/480), and the F420 slit row fails at all 6 (mask). Misses: F358 orb 11.2-12.3 % (<= 10), B box y0 123-126 (168 +-25), extent 724x517-522 (710x454 +-40); F384 C lens 411-418 px (~340); F402/F404 bottom 616-628 (<= 615), orb 69-71 % (70-80); F420 A-T x1 787-795, A-R y0 119-125, A-B x0 669-674 (each +-20), slit 0 px (25-35); F452 gaps 21-25 (25-60, ref 35-60); F452/F453 inner whirl lost (B 341-382 x 344-363 face-on; ref ~370x275). Pass: F404 A-R slab -44.6 deg, F420 gaps 103/91/4/1, radii, lens box, F440/F444 rows, F452/F453 quarters at 12/3/6/9 +-0.0 deg, r 215-226, F456 closed 411x413, F460 A 399x401, continuity (CW 1.13 deg/frame, no reversal; no mid-span crossing; one lid). |
| H-G2 frame bounds | PASS | HG2_exact.txt: exact displaced silhouettes over tp 0.8-3.75 every 0.1 s + release, 16 press moments: 1440x766 top 9 / bottom 741, 1280x800 67 / 718, 1920x1080 41 / 1018; pointers pinned at 6 edges top 8 / bottom 742; 11 s holds top 10-15 / bottom 734-740. Inside everywhere. |
| H-G3 interaction / continuity | FAIL | click inert both runs (caps/probe_interact.txt). Clamp whips: charge 2/16, re-press 6/16, release-after-re-press 5/16 (caps/mot2_lane); tau 0 ring C 18 frames at 15 deg/frame (axis swings), ring B 12 frames; stock probe hold 15.58 / 15.00. r11 camera velocity staircase (bgshift: 6.3 / 24.4 25.3 24.9 / 4.9 x6 / 0.9 vs ref bell 7.9 13.3 39.5 19.1 8.6 5.7 4.2). Never frozen (least per 0.5 s: A 80, B 19.6, C 43.5, D 43.5); exactly one lid F372-F448. |
| H-G4 ?hold=r10 | PASS | 30 shots bit-identical (mean 0, max 0), all world matrices identical (HG4_pixels.txt, caps/hg4/log.txt). |
| H-G5 rest / pointer | PASS | ?aphase=r10 bit-identical on q00-q03 + 9 pointer spots; default differs only by ring A's 22.50 deg turn about its own axis (all 4 quarters, q00 / q02 / ptr_left), B / C / D / camera / orb identical (lead decision 2). |
| typecheck | PASS | tsc -p tsconfig.hero.json and -p . : 0 errors. |

## Findings (most severe first)
1. MAJOR. Release F452-F456: B / C / D snap face-on into a concentric bullseye at every press moment (B 341-382 x 344-363 px;
   ref ~370x275, tilted ~40 deg); MAIN r10 keeps the whirl at 3 of 6; QC round 6 had removed exactly this target look; the
   HANDOFF line "the F453 whirl ... are today's" is not what renders. Evidence crops/rel_lane_main_ref.png (rows F452 / F456 /
   F460; lane | MAIN | ref), caps/holdseq_lane/sheet_4.jpg. Fix: the r10 release-whirl terms sit in the skipped
   `!r11 && d.expandPose > 0` path, so wI hands B / C / D to the plain face-on alignment; give releaseParams an inner-ring
   release target (B ~40 deg, C ~40, D ~38 at tr 0.30-0.33, then the F460 eye by tr 0.57) or run the r10 inner release block
   from the r11 lid pose. Gate: B aspect at F452 <= 0.8.
2. MAJOR. F420 lens has no slit: visible orb = a 25 px cap only (rows 283-307, x 680-790; 3.6-4.9 %), nothing at y 410-440
   (ref: 30 px glowing slit + tiny cap, ~15 %); F416-F428 likewise (cap only). The main sustain frame loses its focal point;
   the lens reads as a dull glass cylinder (crops/F420_lens_lane_over_ref.png, caps/seq_lane/seq26_F420.mask.txt). Fix: open a
   25-35 px gap between B's lower lip and C / D's upper rim at tp 2.8-3.25 (B's lid up via rhoB / betaB, C / D lower / less
   flat via psi); verify with the ID mask that rows 410-440 show orb and the cap shrinks to <= 10 px.
3. MAJOR. The r11 camera follows the piecewise-LINEAR EXPAND_CAM / RELEASE_CAM keys (CameraRig r11 branch): its speed changes
   in steps. Background shift per frame (tools/bgshift.py, x 0-300): ref F353-F362 5.7 7.9 13.3 39.5 19.1 8.6 5.7 4.2 3.2 2.7
   (smooth bell); lane 6.1 6.3 | 24.4 25.3 24.9 | 4.9 4.9 4.9 4.8 4.8 4.8 | 0.9 (x3.9 at F355, /5 at F358, /5 at F364); MAIN
   smooth but late (peak 14 at F358-F359). Camera step per 60 Hz frame 171 -> 631 mm (F354.5), 625 -> 121 (F357.5), 121 -> 22
   (F363.5); release 626 -> 396 then plateaus 142 / 100 / 50 / 27 / 20 / 0 mm. A new mechanical jolt of the whole frame at the
   pop (r10's camera was smooth). Fix (r11 only): sample the camera keys with a C1 monotone cubic (HoldR11's Curve:
   new Curve(EXPAND_CAM).at(tp), same for RELEASE_CAM) or a 2-3 frame critically damped smoothing with lead; target the
   reference's bell (peak ~F356, then ~19 / 9 / 6 / 4 / 3).
4. MAJOR. Re-press / charge whips at the 900 deg/s turn clamp (H-G3 re-press continuity). Loop-stopped study, 16 press moments,
   probe_interact sequence (caps/mot2_lane): clamp frames in the charge 2/16 (ring C), release 0/16 (max 14.69), re-press 6/16,
   release-after-re-press 5/16. tau 0: ring C at the clamp 18 consecutive frames, its axis swinging 15 deg/frame (~270 deg in
   0.3 s), then ring B's axis 8-12.5 deg/frame for 12 frames (tools/axis_an.mjs, caps/repress, crops/release2_whip_k260_280.png).
   Stock probe_interact hold 15.58 / 15.00 deg/frame (MAIN 13.14 / 12.25). Inherited (MAIN re-press 12/16) but not fixed.
   Charge at tau 2.6: A 780 deg/s, C 852 deg/s into the eye (ref ~255). Fix: a re-press during the release continues from
   the current pose (keep the hold vector / freeze instead of blending them to 0 in the click window), re-latch the alignment
   side at every press so the frontal pass takes the nearest face, and cap the charge alignment at ~300 deg/s.
5. MINOR. F358 pop: orb 11.2-12.3 % visible (<= 10 %, a crescent above the A-R bar, still 11.3 % at the builder's tp 0.9);
   B grows to full length in one frame (y0 177 -> 125, F357 -> F358) and ends 40-45 px high at A2 timing (B box
   (474-481,123-126,940-954,640-645) vs (500,168,935,622) +-25); extent 724-728 x 517-522 (710x454 +-40); side blocks fly
   48-74 px/frame then 8-12 (ref ~40). Fix: ramp bsplit over 3-4 frames (~1.4 at tp 0.9), cover the orb cap with the bar
   (rollA / pushR / tiltR), ease pushT / pushB's jump over 3-4 frames.
6. MINOR. Box tolerances missed by 3-13 px on the displaced silhouette: F420 A-T x1 787-795 (765 +-20), A-R y0 119-125
   (148 +-20), A-B x0 669-674 (698 +-20); F402 / F404 bottom 616-628 (<= 615); F384 C lens 411-418 px (~340); F402 / F404 orb
   69.1-70.6 % (70-80). The builder's 65/65 used vertex boxes without the vertex-shader displacement at tp = (F-331)/30.
   Fix: refit on the exact silhouette (jprobe ID render) at A2 timing.
7. MINOR. Sustain quarter paths go out-in-out (A2 R4: no contraction while held): midpoint r A-R 296 (F396, ref 194) -> 257
   (F404, ref 240) -> 359 (F420, ref 375); A-L 329 (F404, ref 280) -> 296 (F420, ref 311); A-B 330 -> 304; pivot speeds
   9-11.5 px per 30 fps frame at F376-F380 / F400 (R11: <= 3-6). From per-frame fits (pushR 0.38 / 0.10 / 0.569 at tp
   2.17 / 2.43 / 2.97; pushL 0.431 / 0.8 / 0.48; tiltR -6 / -20 / -11). Fix: one joint fit over all key frames against A2 6.1
   with monotone radius between F372 and F444.
8. MINOR. F452 diagonal gaps 21-25 px (ref 35-60; 25-40 at F453): A closes a frame or two early. Fix: gapRel ~0.30 / 0.28 at
   tr 0.25 / 0.30 (now 0.24 / 0.21).
9. MINOR. Charge F333-F350: whip into the eye, eye held ~0.25 s, then A pitches into the X where the reference keeps its yaw
   tumble (crops/charge_336_352.png; builder's open item 2). Fix: route the charge target through the tumble, no frontal hold.
10. MINOR (not this lane's code). Shards cross the lens centre in the sustain (F420: three large shards over the lens), the
   reference keeps the belt outside A (R10). Shards.ts untouched; for ICE / lead.
11. NIT. Tumble resumes ~F468-F473 (ref F463-F465); B's lid drifts ~60 px over F404-F444 (ref ~120).
12. NIT. HANDOFF claims not reproducible: H-G1 65/65 (vs 62-66/80 + slit), the F453 whirl, "15.25 normalized is jitter" (the
   clamp is reached).
13. INFO (lead decision, A2 9.3). The open frame sits behind the headline and, at F436-F444 (bottom 741), behind "Scroll to
   Explore" (693-712) (caps/sweep_lane/sw_hold_TR.png); portrait 390x844 crops the side arcs (crops/portrait_strip.png).
Checked and clean: no environment doubling during the faster lunge (crops/lunge_env_left_lane_over_main.png); the debug-pose
path (shoot_qc p04-p08) reproduces the live press; long holds to 11 s stay in frame and alive; the only console error is the
env_baked.json 404 that MAIN has too.

## Short presses (caps/short_lane vs short_main, 48 presses each, loop stopped; judge1/short_press_clamps.txt)
Release 0.1-0.3 s into the hold: clamp whips at 3/8 press moments (1-5 frames; MAIN 3-4/8, up to 13). Holds 0.5-1.1 s: release
0/8 (MAIN 3-6/8, up to 17 frames). The charge whip at tau 2.5 (ring C, 3-4 frames) recurs at every hold length (1/8).

## Performance (lead decision 4): inconclusive
6 interleaved pairs 06:21-06:36, T1 scale 1 1440x766, SLOT_BG=0, each pair started at 1-min load 2.3-5.4 (perf/runs.txt,
perf/summary.txt). Medians MAIN / lane: rest 32.0 / 25.4 fps, hold 23.5 / 28.1, collapse 26.5 / 32.5; per-pair lane/MAIN
medians 0.753 / 0.939 / 0.866 (ranges 0.39-1.65); worst frame MAIN 66.7 ms, lane 100.1 ms (pair 4, a contended run at load 5.4,
13.7-15.3 fps in every phase). The same MAIN build spans 18.7-40.4 fps at rest, and the rest path (identical to MAIN except one
quaternion multiply) reads 0.75: the noise is far above the 10 % budget. CPU microbench (caps/cpu_bench.txt): an engine update
costs 0.02-0.03 ms in both builds at rest and in the hold, so r11's extra work is negligible; any real hold difference is GPU
fill from the wider open frame. Re-measure on a quiet machine before any perf sign-off.

Lab :5175 (PID 93127) started and stopped by this judge; MAIN :5173 untouched. Nothing outside WORK/judge1 (and WORK/LOG.md
lines) was edited.

(working notes: verdict_draft_worklog.md)
