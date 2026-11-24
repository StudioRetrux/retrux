# RINGS lane LOG (round 11 P2b, builder)

## 2026-11-15 start (~19:40 WIB)
- No previous attempt (WORK empty, no LANE/HANDOFF.md). Read SPEC 0-3, AUTOPILOT, handoff_hold (step 3 + fix round 2), work/int/LOG.md.
- Code read: hero/Rings.ts (spinHold r11 path: tumble clock x d.spin, poseSpin offsets incl. flexA along A's axis = out of plane,
  flipCD invented C/D flip), HoldR11.ts (HOLD_SPIN), Choreography.ts (r11 expand/release), Shards.ts (update: spin=introSpin,
  hold = camExpand*0.2 -> only ~6 % slower in the hold), ringMocap.ts (A/B closed form, C/D Viterbi + parallel transport).
- Next: extract Default Loop / State 2 to 5 frames, measure C/D motion in the reference.
- 19:44 lab :5174 started (PID 24744, log WORK/lab.log). Tools: tools/run.mjs (generic lab driver), tools/sheet.sh (labelled
  sheets via magick), py/mocap_lib.py (quaternions, ringMocap.ts parser, rest camera = engine's, verified against the engine
  dump caps/cam/cam.jsonl: pos (0.2338, 2.904, 11.79), hfov 46.15, orb at px (720, 369.5)), py/overlay.py (predicted centre
  lines over reference frames, near half solid, far half dotted).
- 19:50 DIAGNOSIS (logs/an_mocap.txt, every 0.1 s, camera-space axis, spin and tumble rates from the keys):
  * A / B: closed-form constant-rate gimbal, |w| constant (A 201.2 deg/s = |90 Y + 180 X'|, B |90 Y - 135 X'|). No fold.
  * C: tumble rate 13..233 deg/s (nearly still at t 3.4-3.8, 233 at 0.4); at t 2.6-2.8 the axis comes to edge-on
    (n_cam (-0.03,-1.00,-0.03) -> (+0.06) -> (-0.03)) and goes BACK to the same side: a fold (the ring turns to edge-on and
    rocks back instead of turning over). The spin about its own axis is a constant +39.5 deg/s (the loop-closure twist
    spread), reversing sign at the 8 s track junction (t 3.9 +46.9 / 4.0 -17.3: a C0 kink).
  * D: n_cam.y stays 0.53..1.00 and n_cam.z 0.07..0.85 for the whole 4 s: D never turns over, it only nods between
    near face-on and near edge-on with the tumble rate 4..117 deg/s: the "back and forth" the user sees.
  * Reference F030 / F090 (A / B both edge-on: the "X") show the inner rings NOT edge-on, so C / D do not share A / B's
    90 deg/s precession about Y.
- 20:10 MEASURED C / D (reference Default Loop, 121 frames):
  * constant-rate fits to the mocap's ellipse shapes (py/fit_cd.py, sign-free like ringfit/fit_closed.py, every 0.1 s): A recovers
    wy 90 / wx 180 n0 (0,-1,0) rms 0.1, B wy 90 / wx -135 n0 (0,0,1) rms 0.1 (sanity). C: best wy 0, wx +-90, n0 (0,-+0.63,0.77)
    rms 14.6 deg (next family 20.9). D: wx +-22.5 rms 13.1 (not a 4 s loop), +-45 rms 15.1 (the loopable one), 0 rms 18.3.
  * independent edge fit (py/fit_edges.py + refine + scan_a0: mean Sobel magnitude of every loop frame along the ring's four
    projected rim circles, ring geometry C 1.292-1.558 x +-0.275 m, D 1.034-1.246 x +-0.22): C best |w| 90 (all other rates
    lower), phase peak a0 = +34 deg (axis tipped up, flip about camera X); D best |w| 45, a0 = -36 deg. Silhouettes alone cannot
    tell the sense (mirror pairs score within 0.003).
  * sense from the orb (py/orb_occ.py: the orb-disc pixels only one candidate's NEAR half covers; ice in front of the orb is
    darker): C -90 deg/s darker in 41/60 frames and in every frame with large regions (F21-F31 L 0.73-0.83 vs 0.87-0.93, F69-F78);
    D: in the frames where D is the only ring crossing the orb (F41-F53: C near face-on, A / B clear of the orb) +45 deg/s is
    darker in all (0.87-0.90 vs 0.955-0.977). Looked at ref/ov_cpm.png (C: lower orb crescent clean at F25-F28 = C's lower arc
    behind = -90) and ref/ov_dpm.png (D: at F45 / F52 the band crosses the orb's LOWER half, = +45's near arc; -45's near arc
    would cover the clean upper half).
  * RESULT: C = flip about camera X at -90 deg/s, axis (0, sin 34, cos 34) at t 0 (cam space); D = flip about camera X at +45 deg/s,
    axis (0, sin -36, cos -36). Edge-on C at t 0.62 / 2.62, face-on 1.62 / 3.62; D edge-on 1.13, face-on 3.13. Exact 4 s loop of the
    silhouettes (C 360 deg, D 180 deg = a symmetry); analytic, so no 8 s track and no loop seam. A / B unchanged (no fold).
- 20:15 MEASURED the hold (State 2 to 5): shards (py/shard_track.py: blue blobs, unambiguous area-aware matches, moving > 1 px):
  idle loop 11.7 px/frame at r 232 px (0.050 rad/frame), state-video idle F300-F339 0.052-0.064; hold sustain F380-F449
  0.024-0.037 (median ~0.027) at r 340-400 px -> hold / idle ~0.50 (metric: 0.43-0.51). Slow-down starts ~F357, full by ~F375,
  back to idle speed F450-F470 after the release (F443). Shards in the sustain sit 340-400 px from the orb (2.6-3.0 m at
  133 px/m, about the idle 2.87 m projected): the belt does NOT contract (engine: x0.82 at full dolly -> into A's opened arcs).
  Rings: A's reference hold turn = 120 deg in ~3.1 s ~ 39 deg/s vs idle 201 deg/s -> 0.19 (A2 R1); C / D in the reference
  sustain do the A2 "beat" (face-on <-> flat every ~0.63 s, ref/hold_cd.jpg looked at), which is not a slowed rotation and which
  the user rejected at 09:05 ("repeat"), so C / D follow the shared slowed ring clock.
- 20:20 BUILT (LANE retrux-web/app/hero/engine): HoldR11.ts SPIN_F2 (`?spin=f2` = the integrated fix-round-2 hold, implies
  idle r10), SPIN_P2B (default unless s3 / f2), idleModeFromUrl (`?idle=r10`, implied by hold=r10 / r11a / spin=s3 / f2),
  HOLD_SPIN.slow 0.2 (P2b; 0.25 under f2 / s3), flexA 0 (f2 1.0), guardRing 1, shardSlow 0.5, shardContract 0 (f2 1),
  shardRateFromSpin(); Rings.ts IDLE_CD (C -90 / a0 34, D +45 / a0 -36, q = q0 Rx(rate tau), no C / D loop tips), no flipCD
  in P2b, poseRigid (A quarters / B halves: identity pivot rotation, radial in-plane offset, one guard share per ring);
  HeroEngine.ts wires idleMode + the P2b shard call; Shards.update(rateGiven). tsc hero: 0 errors.
- 20:30 CHECKS: engine C / D quaternions vs the Python model at tau 0..4 step 0.25 (caps/gq, py/chk_gq.py): axis error 0.000 deg,
  local X stays on camera X (fixed flip axis), C closes at 4 s, D flips (same plane). Note for probes: setting tau and then a
  dt > 0 step is rate-limited by MAX_TURN (15 deg / frame); set tau and run a dt = 0 update (h.update(0,false)) or a frozen rAF.
- 20:35 LOOKED AT (eyes): ref/ov_c_newold.png (F76-F88: at F84 / F88 the reference's C slab sits ABOVE the orb centre with the
  orb's lower part bright = the new C's near upper arc after edge-on; the r10 C is still an edge-on line through the centre /
  has its LOWER arc near) -> new C right, r10 C wrong. ref/ov_d_newold.png (F104 / F114: the reference's inner ring is a near
  circle round a fully visible orb = new D ratio 0.95 / 0.88; r10 D ratio 0.75 with its lower arc across the orb; F6: the band
  crosses the orb's TOP edge = new D's near arc) -> new D right. Edge scores new vs r10: C 0.1441 vs 0.1434, D 0.1493 vs 0.1481
  (silhouettes alike; the difference is the near / far sense the mocap could not see).
  caps/cdz_*.jpg (ref | new | r10 every 3rd frame) and caps/cmp_new_a/b.jpg looked at: the configurations match.
- 20:40 Hold clock factor: B in the reference's sustain (A2 R6) tips ~29 deg (lid +70 -> -50 px at 237 px radius) and rolls ~46 deg
  in ~1.3-2 s: |w| ~31 deg/s vs idle |90 Y - 135 X'| = 162 deg/s -> 0.19, the same as A's 0.19 (120 deg in 3.1 s vs 201 deg/s).
  So HOLD_SPIN.slow 0.2 = the measured share of both outer rings; C / D share the clock (the reference's C / D sustain motion is the
  A2 beat, not a slowed rotation; the user rejected the beat and asked for slow motion in their own direction).
- 20:40 Running probe60 motion set (caps/m1: idle8 shots every 2nd frame, h10 shots every 2nd frame, h1 / h3 / h5 / h20, h5 at tau
  0 / 1.3 / 2.0, re-press 0.35 / 0.10, click in release, click at idle; caps/m1_f2 the same with `?spin=f2`, no shots).
  probe60 also records shard / opened-piece intersections (CPU replica of SHARD_VERT's crystal centre; m1_f2 and later runs).
  Prepared: tools/spec_b{1440,1280,1920}.json (H-G2: 16 press moments tau 0..3.75 x 6.25 s holds + release, 1440 also 10 / 20 s),
  py/bsum.py, tools/jcmp2.mjs (+ SHOW_SHARDS=1), tools/perf_ab.zsh, tools/idle_video.sh, py/an60.py.
- 20:30 IDLE 60 Hz log (caps/m1/idle8, 8 s = 2 loops from tau 0, 481 frames, py/an60.py): A / B s_eff 0.9998-1.0004 (the same
  motion as before, unchanged), C angular velocity about its flip diameter -90.000 deg/s in every frame, D +45.000 in every frame
  (sign never flips, frame-to-frame change 0), pieces = ring rotation (max 2.4e-6 deg after normalising; first read 0.45 deg was the
  non-unit slerped B key, |q| 0.999996), out of plane 3e-5 m (float32). Video caps/idle8_vs_ref.mp4 (engine | reference, 8 s) and
  sheets caps/idle8_sbs_000/030/060/090.jpg (every 0.1 s) looked at: the engine's poses follow the reference frame by frame
  (t 0 band + face-on rings, 0.4 tall rings, 1.0 / 3.0 the X, 2.6-2.9 C's band through the orb).
- 20:50 HOLD 60 Hz logs (caps/m1, press at tau 2.6 unless noted; py/an60.py; s_eff = share of each ring's own idle angular
  velocity at the same clock, res = the part that is not the idle motion / |w_idle|):
  * h1 / h3 / h5 / h10 / h20, h5 at tau 0 / 1.3 / 2.0, re-press 0.35 s and 0.10 s into the release, click during the release:
    every ring s_eff in [0.200, 1.000] in every frame (never reversed; exactly the clock rate), res <= 0.015 (A / B key
    differentiation), 0 for C / D. C's angular velocity about its flip diameter -90 -> -18 deg/s, D +45 -> +9 (sign never flips).
    Largest frame-to-frame change of |w|: A 8.2 deg/s (its idle precession, also at rest), B 6.0, C 2.4, D 1.2; of s_eff 0.0268.
  * pieces: every A quarter / B half's world rotation = its ring's (max 2.4e-6 deg), centroid off the ring plane <= 4.3e-5 m (float32),
    pivot rotation identity exactly. Integrated build (`?spin=f2`, caps/m1_f2): A's quarters up to 0.499 m OUT of A's plane (flexA:
    the "askew" pieces), C / D s_eff -0.17..1.78 / -37..+16 (flipCD on top of the nod), shards 0.93 of idle.
  * shards (engine phase log): orbit rate 1.0 -> 0.50 -> 1.0, largest change 0.044 of idle per frame (C1 ramp ~0.4 s, starts when
    the ring clock is half down). Reference tracker on the engine's own h10 / idle8 frames: px speed hold / idle 6.78 / 7.82 = 0.87
    vs the reference's 9.8 / 11.7 = 0.84 (same tracker, same hold camera): the slow-down matches within ~4 %.
  * click at idle: inert (spin 1.000, no ring change beyond the idle). Ring-uniform guard: A's opening share drops to 0.32-0.34 when
    A turns face-on and tall at the full dolly (t+2.5..3.0 s, +8.0 s of a press at tau 2.6; A's outer radius 2.4 m vs the frame's
    2.88 m half-height minus the 31 px margin), 1.0 when edge-on: the opening breathes with the tumble phase instead of one quarter
    sliding in alone (per-piece). Decision: keep the uniform share (the user's "satu kesatuan ring"); the reference's arcs touch the
    frame edge there (F436-F444 y 0-5), H-G2 does not allow that.
  * Looked at: caps/h10_sheet_1/2.jpg (engine vs reference rows, every 0.2 s of the first 4.5 s), caps/h10_every05.jpg (every
    0.5 s through hold, release, idle), caps/h10_quad.jpg (+3 / +5 / +7 / +8 s at 60 %): one slowly tumbling gyroscope, A's quarters
    coplanar and evenly parted (blocks at the band ends when edge-on, four arcs when tilted), B's halves 0.1 m apart, C / D turning
    inside, no reversal, no snap at the release; video caps/h10_p2b.mp4 (30 fps).
- 20:40 H-G2 (exact silhouettes, every 3rd vertex of every ring mesh, 16 live presses tau 0..3.75 x 6.25 s + release; 1440 also
  10 / 20 s; py/bsum.py): 1440x766 top 25 / bottom 740 / left 313 / right 1129; 1280x800 top 47 / bottom 765 / left 278 / right
  1004; 1920x1080 top 38 / bottom 1043 / left 417 / right 1506: all INSIDE (caps/b1440, b1280, b1920).
- 20:45 SHARDS vs opened pieces (probe60 CPU replica of the crystal centres): first with a bounding-sphere test (too pessimistic for
  tangential crystals), then a capsule test (5 points along each crystal's long axis, rocked and turned like SHARD_VERT). With no
  contraction and the 0.5 slow-down only: belt-A crystals behind the orb still grazed / entered A's opened quarters (belt origin
  0.2 m nearer the camera -> back crystals ~3.06 m from the ring centre vs the pushed quarters' ~3.03 m). Added HOLD_SPIN.shardOut
  (Shards uOut: cen *= 1 + uOut, x spreadA; exactly x1 at rest and in f2 / s3). 0.10: 24 / 7359 frames, -0.05 m (one crystal,
  one press moment); set 0.13, re-measuring (caps/sh, and caps/sh_f2 = the integrated build with the same capsule test).
- 20:55 SHARDS (capsule test, 8 press moments tau 0..3.5 x 10 s holds + one 20 s hold, 7359 frames): shardOut 0.13 -> 0 frames with a
  crystal inside an opened A / B piece, min clearance +0.048 m (caps/sh). Integrated build (`?spin=f2`, same test, caps/sh_f2):
  3567 / 7359 frames (48 %), 6544 hits, min -0.112 m. (shardOut 0.10: 24 frames, -0.05 m, caps/sh_v2.)
- 20:56 batch3 started: stock probe_interact (logs/interact_lane.txt), final videos h10 / rp035 every 2nd frame (caps/fv), switch
  exactness (tools/switches.zsh -> sw/summary.txt).
- 21:00 Stock probe_interact on :5174 (logs/interact_lane.txt): click inert (every hold driver 0, never holding), ring step per 60 Hz
  frame hold / release / re-press / release 2 = 3.52 / 1.16 / 2.26 / 3.42 deg (fix round 2 had 3.45 / 1.05 / 1.56 / 3.15), no errors.
  tsc -p tsconfig.hero.json and -p . : exit 0, no output (logs/tsc_hero.txt, tsc_all.txt). HeroEngine comment updated (no code change).
- 21:02 The final-video run died at frame 78 of h10: the lab live-reloads on any source change (my comment edit in HeroEngine.ts
  rebuilt the bundle and navigated the page). Lesson: no source edits while a probe runs. Re-running it after the switch batch.
- (clock check 20:45 real time: the entries above stamped 20:50-21:02 were estimates and ran ~15 min early; from here real times.)
- 20:46 final videos re-run in the second slot (caps/fv, logs/finalvid2.log) while the switch batch holds the first.
- 20:55 FINAL VIDEOS (final build incl. shardOut 0.13; caps/fv): caps/hold10s_p2b.mp4 (10 s hold at tau 2.6, release, 2.5 s idle, 30 fps)
  and caps/repress_p2b.mp4 (4 s hold, release, re-press 0.35 s later, 3 s hold, release). Looked at: caps/fv_h10_every05.jpg (every
  0.5 s), caps/fv_h10_vsref_1/2.jpg (engine vs reference rows, 0.2 s), caps/fv_release_seq.jpg (every 4th 60 Hz frame through the
  release: A's split band closes and speeds back up, camera pulls back, no snap), caps/fv_repress_seq.jpg (re-press: continuous),
  caps/fv_shards_cmp.jpg (new vs before widening vs reference F368-F413). 60 Hz logs of both runs: s_eff 0.200..1.000 every ring,
  pieces = ring rotation (2.4e-6 deg), out of plane <= 3.4e-5 m, shards 1 -> 0.5 -> 1, 0 shard / piece hits (min clearance 0.127 m).
- 20:55 SWITCHES (tools/switches.zsh, jcmp2 with time / tumble / plasma / grain pinned, shards hidden unless noted; sw/summary.txt):
  * `?spin=f2` (:5174) vs :5173 default, 26 shots (rest q00-q03, 9 pointer spots, p04-p08, 8 live presses): 25 bit-identical; the live
    mid-lunge F358 at tau 1.1 differs (mean 0.018, max 64, 0.08 % px; faint edge outlines over the WHOLE frame = a sub-pixel camera
    offset, caps/dmap_f2_F358.jpg): the harness's own noise (pointer speed uses performance.now(); the hold lane saw the same).
  * `?idle=r10` vs :5173: 13 / 13 bit-identical (rest + pointer).
  * `?hold=r10` vs :5173 `?hold=r10`: 24 / 26 bit-identical; the two live F358 mid-lunge shots differ (same harness noise).
  * shards-visible f2 vs main differed everywhere: the shards drift with the wall clock between page load and stop() in jcmp2;
    tools/jcmp2.mjs now pins the shard phases / clock when SHOW_SHARDS=1 (to re-run).
- 21:01 SWITCHES continued (sw/summary.txt): `?spin=s3` lane vs main 16 / 17 bit-identical (F358 t1.1 noise again); `?aphase=r10&spin=f2`
  vs main `?aphase=r10` 26 / 26 bit-identical; ALL-R10 `?env=projected&hold=r10&aphase=r10&ice=r10` (lane) vs :5179 (round-10
  baseline) 26 / 26 bit-identical; `?hold=r11a` 16 / 17 (F358 t1.1 noise). New default vs main: rest 0.9-2.2 % px (C / D), hold
  6-25 % (the new hold). Running switches2: main vs main (harness noise), f2 vs main live again, shards-visible (pinned) f2 / new.
- 21:07 SWITCHES final (sw/summary2.txt): main vs main live 8 / 8 identical; f2 vs main live again: F358 t1.1 differs (mean 0.022);
  f2 vs main with the shards VISIBLE and pinned (17 shots: rest, poses, live): 17 / 17 bit-identical incl. F358 t1.1 -> the F358
  t1.1 difference comes and goes between runs of the same comparison (harness nondeterminism, as the hold lane documented);
  `?spin=f2` reproduces the integrated build exactly, shards included. New vs main (shards visible): rest 0.9-2.2 % px, hold 7-28 %.
- 21:08 perf A/B started (tools/perf_ab.zsh T1: A = :5174 new, B = :5173 main, 6 interleaved pairs, SLOT_BG=0, load < 6 gate).
- 21:25 PERF (perf/runs_T1.txt, perf/summary_T1.txt; MAIN perf_probe T1 scale 1 1440x766, 6 interleaved pairs AB/BA, SLOT_BG=0,
  start loads 2.74-5.86, macOS Low Power Mode ON for both): median fps lane / main rest 30.9 / 27.1 (32.4 / 36.9 ms), hold
  23.6 / 23.1 (42.4 / 43.2 ms), collapse 31.9 / 28.8; per-pair lane / main fps ratio medians 1.199 (0.84-1.86) / 1.013 (0.90-1.55)
  / 1.061 (0.93-1.41); worst frame medians rest 66.7 / 74.9 ms, hold 66.7 / 83.4 ms, max 83.4 / 100.0 ms; no page errors.
  The lane costs nothing measurable (analytic C / D, one guard solve per ring instead of per piece, one uniform).
- 21:26 DECISION (timing of the slow-down, P2b only): the hold lane's ring clock eases 1 -> slow over tp 0.3..1.15 although its own
  comment says "the reference keeps idle speed through the charge, F332-F356" (with 0.3 the clock is already at 0.46 at F356).
  Measured: A tilts 43 -> 88 deg over F344-F352 in the reference's charge (~170 deg/s, idle-like; hold lane charge_probe); the
  reference's crystals keep idle speed to ~F355 and are slowed by ~F375 (py/shard_track.py); A2: settle F358-F372, sustain from
  F372. So P2b eases the shared clock over tp 0.85..1.4 (F356..F372.5, tp = (F - 330.5) / 30) and the shards follow it linearly
  (rate 1 - 0.5 w, w = the clock's share of its slow-down). f2 / s3 keep 0.3..1.15. Re-verifying after the edit.
- 21:30 Edited HoldR11.ts (P2b slow0 / slow1 0.85 / 1.4, shardRateFromSpin linear), tsc 0. batch4 queued (waiting for slots: other
  lanes' perf runs): 60 Hz motion set without shots (caps/m2), shard capsule test (caps/sh2), H-G2 at 3 viewports (caps/v2b*),
  final videos (caps/fv2), `?spin=f2` vs main (sw/f2_vs_main_v2). HANDOFF.md updated (perf table, timing).
- 21:5x RE-VERIFIED after the timing change (caps/m2, 14 runs, no shots): every ring s_eff in [0.200, 1.000] in every frame,
  residual <= 0.015, C -90 -> -18 deg/s, D +45 -> +9 (sign constant); largest |w| step A 8.4 (idle precession) / B 6.2 / C 3.05 /
  D 1.53 deg/s per frame, s_eff step <= 0.0339 / frame (the faster 0.55 s ramp); pieces 2.4e-6 deg / <= 4.3e-5 m; shards 1 -> 0.5
  -> 1 with a step <= 0.021 / frame (smoother than 0.044); a 1 s press (released at tp 0.75) no longer slows anything (the slow
  motion starts with the lunge, as the reference). Shard capsule test (caps/sh2): 0 hits / 7359 frames, min clearance +0.010 m
  (thin: the GPU's float32 hash can move a crystal by mm-cm) -> shardOut 0.15 after batch4 for margin, then re-test.
- 21:36 H-G2 after the timing change (caps/v2b*): 1440x766 T25 B740 L310 R1128; 1280x800 T47 B765 L275 R1004; 1920x1080 T37 B1043
  L413 R1505: all inside. Engine renders vs reference at F84 / F88 (caps/c_f84_cmp.jpg, 1.2x): the reference's C slab crosses ABOVE
  the orb centre with the orb bright below it; the new engine C does the same; the r10 engine C runs through the centre with the orb
  showing above it (the fold). Confirms the new C in the engine itself, not only in the overlays.
- 21:50 batch4 done: `?spin=f2` vs main after the timing change (sw/summary3.txt): 17 / 17 bit-identical (rest, poses, live presses).
  Videos of the timing build: caps/hold10s_p2b_v2.mp4, caps/repress_p2b_v2.mp4; looked at caps/fv2_press_seq.jpg (engine every 0.1 s
  next to the reference every 3 frames through the press: the rings keep their idle speed through the charge, slow down with the
  lunge F356-F372, as the reference) and caps/fv2_repress_seq.jpg (release, re-press 0.35 s later: continuous). 60 Hz: same bounds
  as m2 (s_eff 0.1999..1.0008, pieces 2.4e-6 deg / 4.3e-5 m, shards 1 -> 0.5 -> 1).
- 21:51 shardOut 0.13 -> 0.15 (margin for the GPU's float32 hash; 0.13 cleared by >= 1 cm). batch5: shard capsule test (caps/sh3)
  and the final 10 s hold video (caps/fv3).

## 2026-11-16 RESUME (~02:20 WIB; the 15 Nov builder was cut by the 5-hour usage limit at ~21:5x)
- State found: lab :5174 not running (PID 24744 gone); batch5 had finished on its own (logs/batch5.log "BATCH5 DONE 22:01:24").
  * shard capsule test with shardOut 0.15 (caps/sh3, 8 press moments x 10 s + 20 s hold, 7359 frames): 0 hits, min clearance
    +0.100 m (0.13: +0.010 m in caps/sh2; first 0.13 run +0.048 m).
  * final 10 s hold at tau 2.6 (caps/fv3/h10, 781 frames, shots every 2nd frame): s_eff A 0.1999..1.0003, B 0.1999..1.0001,
    C / D 0.200..1.000 (C -90 -> -18, D +45 -> +9 deg/s about the flip diameter), residual <= 0.0151, |w| step A 8.2 / B 5.9 /
    C 3.05 / D 1.53 deg/s per frame, s_eff step 0.0339; pieces 2.4e-6 deg / 4.25e-5 m; shards 1 -> 0.5 -> 1 (step 0.0212).
- LANE vs BASE: Rings.ts, HoldR11.ts, HeroEngine.ts, Shards.ts, README.md (+ tsconfig.tsbuildinfo from tsc -p ., to restore from BASE).
- Next: own-eyes review of the evidence (idle C / D vs reference, 10 s hold, guard "breathing" of A's opening, C / D hold rate in
  the reference), then fixes if needed and the final re-verification.
- 02:26 lab :5174 restarted (PID in lab.pid). Final hold video caps/hold10s_p2b_v3.mp4 (fv3/h10, 30 fps). LOOKED AT (own eyes, this
  session): eyes/fv3_every05.jpg (every 0.5 s of press, 10 s hold, release), eyes/fv3_guard_seq.jpg (every 0.2 s, +4.8..+8.6 s),
  eyes/fv3_vsref_1/2.jpg (engine every 0.2 s next to the reference F323-F455), caps/idle8_sbs_000.jpg, caps/cdz_054.jpg,
  caps/c_f84_cmp.jpg, ref/hold_cd.jpg, caps/fv_shards_cmp.jpg. One gyroscope tumbling slowly, A's quarters coplanar, B's halves
  0.1 m apart, C / D turning inside, shards slower; no askew piece, no reversal. Ring A's opening share (probe push log) 1.0 ->
  0.333 at +6.5 s (A face-on and tall at the full dolly) -> 1.0 by +8.5 s: the guard's ring-uniform reduction (open item 2).
- Reference C / D in the sustain (ref/hold_cd.jpg F404-F434, A2 R7 / R11): face-on <-> flat every ~0.65 s, i.e. ~135 deg/s,
  FASTER than their idle 90 / 45 deg/s: no per-ring "slow-motion factor" exists for C / D in the video (factors 1.5 / 3.0), and
  the user rejected that beat (09:05) and asked for slow motion. Kept: C / D on the scene's one measured clock (0.2, A and B both
  0.19), i.e. a uniform time remap of the sculpture.
- 02:27 batch6 (tools/batch6.zsh): probe_interact on the final build (logs/interact_final.txt): click drivers 0, never holding,
  ring step per 60 Hz frame hold / release / re-press / release2 = 3.74 / 1.21 / 2.81 / 3.45 deg (<= 15), no errors. Switches
  on the final build (tools/switches3.zsh -> sw4/summary.txt) running; f2 vs main 25 / 26 bit-identical, live_F358_t1.1 differs
  again (mean 0.018, max 64, 0.079 % px; the shot the 15 Nov runs saw flicker). Wrote tools/jcmp3.mjs (+ camera matrix and exact
  ring quaternion differences per shot) to show whether that shot is camera-timing noise of the harness or a ring change.
- 02:37 switches on the final build (sw4/*/log.txt, jcmp2: pinned time / tumble / plasma / grain, PNG diffs): idle=r10 vs main
  13 / 13 bit-identical; f2 vs main 25 / 26; f2 vs main with the shards visible + pinned 17 / 17; hold=r10 24 / 26; hold=r11a
  16 / 17; spin=s3 16 / 17; aphase=r10&spin=f2 vs main aphase=r10 24 / 26. Every non-identical shot is the live mid-lunge F358
  (t1.1 always, t3.3 sometimes; mean 0.018-0.44): the same shots as on 15 Nov. The aphase pair's jcmp2 hung in browser.close()
  after writing its log (5 min); killed it (my process), the batch went on. batch7 queued (tools/batch7.zsh): jcmp3 live group
  main vs main and lane vs main twice each, for hold=r10 and default / f2; then the 390x844 portrait bounds (8 presses).
- 02:38 batch6 done: ALL-R10 `?env=projected&hold=r10&aphase=r10&ice=r10&idle=r10` (lane) vs :5179 26 / 26 bit-identical (live F358
  shots included). MAIN's app / hero-lab / public/hero = BASE (diff -rq empty), so :5173 serves BASE's code.
- 02:40 typecheck on the final code: tsc -p tsconfig.hero.json exit 0, -p . exit 0, no output (logs/tsc_hero_final.txt,
  tsc_all_final.txt). (tsconfig.tsbuildinfo is git-ignored build output; restore BASE's copy at the end.)
- 02:42 LOOKED AT eyes/idle_inner_pairs.jpg (hero crop at 48 %, engine | reference every 0.2 s over the whole 4 s loop, final
  build = m1/idle8 frames): every pair shows the same configuration (t0 band + face-on rings, 0.6 tall ring, 1.0 / 3.0 the X of
  flat bands, 2.0 band over face-on rings, 2.8 C's slab above the orb centre, 3.6 face-on rings round the orb).
- 02:49 batch7 (sw5/summary.txt, jcmp3 = jcmp2 + per-shot camera matrix and exact ring quaternion differences, live group): the
  SAME build compared with itself, main(hold=r10) vs main(hold=r10), reproduces the F358 t1.1 difference exactly (mean 0.042,
  max 68, camera matrix differs by 2.0e-4, ring quaternions identical, gqdiff 0); lane(hold=r10) vs main(hold=r10) gives the same
  numbers; runs b: main vs itself identical, lane vs main again the 2e-4 camera state. Default / f2: main vs main and f2 vs main
  identical in both runs (camera 1e-8). Ring quaternions bit-equal in every shot of every pair. Cause: Choreography.move() takes
  the pointer speed from performance.now() between the harness's pointer events (wall clock per page session); the camera at the
  mid-lunge F358 depends on it. So the flickering F358 shot is harness noise, not a switch difference.
- 02:49 portrait 390x844 bounds (caps/v3b390, 8 presses tau 0..3.5 x 6.25 s + release, every 3rd vertex): L13 T202 R376 B620,
  inside (the integrated build's judge: L19 T188 R374 B632).
- 02:50 perf A/B on the final build next (tools/perf_ab.zsh T1; the 15 Nov runs kept as perf/runs_T1_15nov.txt).
- 02:52 HANDOFF.md updated with the final-build numbers (switch re-check + noise proof, 60 Hz bounds, H-G2 incl. portrait, click,
  typecheck, the C / D per-ring reference rates, the guard's measured breathing and why the margin stays). perf A/B running
  (pairs 1-2 done). Next: batch8 (a second 10 s hold with shots at press tau 0.6 = caps/fv4, and the stock glitch sweep
  shoot_sweep.mjs -> caps/sweep), look at both, then perf summary into HANDOFF, restore tsbuildinfo, stop the lab.
- 03:06 PERF final build (perf/runs_T1.txt, summary_T1.txt; 15 Nov runs kept as *_15nov.txt): MAIN perf_probe T1 scale 1, 6
  interleaved pairs, SLOT_BG=0, start loads 3.18-5.89, Low Power Mode on, slot in full-power mode (3 slots: other lanes' Chrome /
  GPU jobs ran beside these timing runs). Both builds swing 14-35 fps run to run (A rest 30.4 -> 17.6 -> 32.6 -> 21.5 -> 19.7 ->
  14.1; B 31.8 -> 20.1 -> 26.1 -> 18.6 -> 21.2 -> 18.8), falling with the machine's load over the 17 min. Medians lane / main:
  rest 20.6 / 20.6 fps (48.5 / 48.4 ms), hold 17.9 / 20.4 (56.0 / 49.1 ms, per-pair median ratio 1.002), collapse 20.2 / 29.6
  (per-pair median 0.754, range 0.53-1.25); worst frame medians rest 75.0 / 66.8, hold 83.4 / 83.3, collapse 75.0 / 50.1 ms,
  max 116.7 / 83.4 ms; no page errors. Too noisy to resolve a few %; the quiet 15 Nov set (2 slots) had the lane >= main in all phases.
- 03:10 CPU cost of the per-frame update, which is where every lane change lives (tools/cpu_ab.mjs, settle() timed in-page, lane vs
  main, 6 interleaved pairs, perf/cpu_ab.txt): rest 0.005 / 0.006 ms per update (per-pair median 0.93), hold (real press, 4 s
  into the sustain) 0.011 / 0.013 (0.87), release 0.010 / 0.008 (1.04): ~0.01 ms of a 16-50 ms frame either way. The GPU work is
  unchanged except one uniform multiply in the shard vertex shader.
- 03:11 batch8 (second 10 s hold with shots at press tau 0.6 -> caps/fv4; stock glitch sweep -> caps/sweep) started.
- 03:13 batch8 done. Second 10 s hold with shots, press at tau 0.6 (caps/fv4/h10_t06, video caps/hold10s_t06_p2b.mp4): s_eff
  A 0.2000..1.0002, B 0.2000..1.0004, C / D 0.2..1.0 (C -90 -> -18, D +45 -> +9), residual <= 0.0149, |w| step A 7.80 / B 6.19 /
  C 3.05 / D 1.53 deg/s per frame; pieces 2.4e-6 deg / 4.3e-5 m; shards 1 -> 0.5 -> 1 (step 0.0212); shard / piece hits 0, min
  clearance 0.157 m; A's guard share 1.0 -> 0.36 at +6.5 s -> 0.98 by +8.0 s. LOOKED AT eyes/fv4_every05.jpg: at +7.0 / +7.5 s
  A turns face-on as four separated arcs round the orb (the reference's F420-F444 open frame), B a lens, C / D inside; every
  piece coplanar with its ring, no askew piece, the release closes A and the camera pulls back without a snap.
- 03:13 stock glitch sweep on the lane (caps/sweep/sweep.jpg, log.txt): intro, hold / pop / release at the pointer extremes,
  tumble phases: no page errors; looked at the sheet: everything inside the frame, nothing torn or doubled.
- 03:20 PLOT of the diagnosis (the task's "plot each ring's angle about its spin axis over the loop"): eyes/cd_angle_plot.png
  (py/plot_cd_raster.py; ImageMagick's SVG renderer dropped the polylines of py/plot_cd.py, so numpy raster + magick labels).
  Axis angle phi = atan2(n_cam.y, n_cam.z) about the rest camera's horizontal axis, unwrapped, and its rate, over two loops,
  mocap (+ its loop tips, `?idle=r10`) vs P2b: r10 C rises, turns BACK at t 2.7-3.4 (the fold), rate -173..+240 deg/s with 4
  reversals per 8 s; r10 D wanders +30..+90 deg with net 0 over 8 s, rate -89..+91 deg/s, 16 reversals (it only rocks: the
  user's "bolak balik"); P2b straight lines, C +90 and D -45 deg/s in this phi convention (= the engine's -90 / +45 about the
  ring's local X), 0 reversals. Looked at the image.
- 03:25 FINISHED. HANDOFF.md updated (status, plot, final-build numbers, perf both sets + CPU A/B, open items 7-9).
  retrux-web/tsconfig.tsbuildinfo restored from BASE (git-ignored build output). Lab :5174 (PID 80613) stopped; :5173, :3000,
  :5179 still listening (not mine). LANE vs BASE: Rings.ts, HoldR11.ts, HeroEngine.ts, Shards.ts, README.md (+ HANDOFF.md).
  No code change on 16 Nov; nothing committed, deployed or uploaded; no .blend touched.

## 2026-11-16 JUDGE round 1 (independent adversarial judge; everything in judge1/)
- ~03:3x started. No earlier judge1 state (judge1/ absent). Read SPEC 0-3, AUTOPILOT, builder LOG + HANDOFF (claims only).
  Next: read INTEGRATION / handoff_hold, diff LANE vs BASE, start lab :5174, fresh captures through the slot.
- 03:35 judge1: lab :5174 started by me (PID in judge1/lab.pid). Own tools: judge1/tools/jcap.mjs (deterministic live capture, frozen
  loop + settle(1/60) ticks + real PointerEvents; records group / piece / camera / shard state), jan.py (angular velocity, piece
  alignment, shard rates), ovl.py (engine C / D rims projected over any frame), trip.sh (sheets). Reference frames extracted:
  judge1/ref/loop/L000-L120.png, judge1/ref/state/S000-S499.png.
- 03:35 idle 8 s, fresh captures lane vs main (caps/{lane,main}/idle8, 30 fps shots): lane C |w| 90.00 const about local X
  (comp -90), D 45.00 const (+45), 0 sign flips, axis wobble 0; main C 4 sign flips (|w| 33-257, kink 59 deg/s per frame at tick
  479), D 16 sign flips (1-113 deg/s): the user's "bolak balik" confirmed on main, gone on the lane. Looked at
  eyes/idle_ref_lane_main_1/2.jpg and eyes/ovl_idle_cd_1-3.jpg (lane / main C-D rims over the reference every 0.2 s): the lane's
  C / D sit where the reference's inner rings are about as well as main's (no frame with an obvious mismatch so far).
  Next: the 10 s hold at tau 2.6 (running), the other holds, analysis + sheets.
- 04:10 judge1 RESUMED (the 03:3x judge attempt was cut ~03:45; its captures finished: caps/lane/{idle8,h10_t26,h10_t00,h10_t13,
  rp035_t20,rp010_t33,short_t26,click_t10,h20_t06}, caps/main/{idle8,h10_t26}; lab :5174 PID 97175 still up, reused). Slot now in
  light mode (user active). Next: jan.py on every run, look at the hold / re-press sheets, shard rate vs reference, verdict draft.
- 04:35 judge1 analysis (an/*.txt, tools/jan.py, guardstep.py, aclose.py; all on the 03:2x-03:45 fresh captures):
  * idle lane C |w| 90.00 / D 45.00 constant, 0 sign flips, axis wobble 0 (main: C 4 / D 16 sign flips, |w| 33-257 / 1-113).
  * every lane hold (tau 0 / 0.6 / 1.3 / 2.6, re-press 0.35 / 0.10, short presses, click): C -90 -> -18, D +45 -> +9 deg/s,
    0 sign flips, max |dw| 3.05 / 1.53 deg/s per tick; pieces = ring rotation (0.00 deg), |local z| <= 3.2e-5 m, the four
    quarters' offsets equal to 2.4e-5 m (main: 0.499 m out of plane, 0.40 m spread). Shards 1 -> 0.5 -> 1, step 0.021 / tick.
  * FINDING: ring-uniform guard closes A to ~0.2 m (share 0.29-0.33) whenever A turns face-on: tau 1.3 press -> F404 / F420 /
    F436 openings 0.188 / 0.164 / 0.278 m (the reference's widest open frame); rp010_t33 F420 0.149 m; tau 0 F436 0.350 m.
    main (per-piece guard) h10_t26 min share 0.75. Sheet eyes2/t13_sustain_vs_ref.jpg (looked at: ref F421 / F436 four wide
    arcs, lane a closed face-on ring).
  * camera lunge 2.66 m in 3 ticks (ticks 94-97) identical in main = pre-existing hold-lane camera, not this lane.
  Next: main h10_t13 capture for the comparison, shard tracker (reference vs engine), release / re-press sequences, verdict.
- 05:05 judge1 SHARDS (tools/strack.py, srad.py, blist.py; an/strack.txt, an/srad.txt): crystal-pixel radius from the orb (area-weighted,
  hold camera, F380-F440): reference p50 386 / p75 459 / p90 477 px; MAIN 385 / 482 / 548; LANE tau 2.6 500 / 635 / 717, tau 1.3
  465 / 624 / 692; crystal px per frame ref 8142, main 10095, lane 13155. -> the lane's shardOut 0.15 + shardContract 0 put the
  hold belt ~1.3x wider than the reference (crystals at the frame edges), main matched it. Sheet eyes2/shard_radius_ref_lane_main.jpg
  (looked at). Per-crystal speeds (blob lists F400-F403 vs ticks 200-206): ref near crystals 16-40 px/frame, lane 35-53, main 42-65;
  idle ref 16-35 vs lane 22-41: the 0.5 slow-down ratio is consistent with the reference (~0.5-0.6) but the lane's widened belt
  brings near crystals closer to the camera (bigger, faster on screen).
- 04:28 judge1 (clock note: the entries stamped 04:35 / 05:05 above were estimates; real times ~04:18 / ~04:26).
  MAIN :5173 now serves the merged rings v1 (lead merged LANE's five files at 04:10; MAIN app == LANE app, cmp identical), so batch-2
  "main" captures (caps/main/h10_t13, h10_t33, sw_*) are of the lane code; pre-merge baseline = caps/main/{idle8,h10_t26} (03:30-03:41)
  and the lane's switches. Switch checks (fresh): lane ?idle=r10 vs pre-merge main idle8: ring quaternions max diff 2.9e-15;
  lane ?spin=f2 vs pre-merge main h10_t26 ticks 1-209: quaternions 0, drivers 0, pieces 7.5e-5 m (camera timing noise 1.6e-3).
  Determinism: lane vs merged-main h10_t33 ring quaternions 2.2e-14. Videos: vid/lane_hold10_tau26.mp4, vid/idle_ref_vs_lane_4s.mp4.
  AUTOPILOT 04:17: the user also reported the pulsing opening; a hotfix agent works on it in lanes2/hotfix.
- 04:39 judge1: C / D idle structure check (tools/structcmp.py, an/structcmp.txt: blurred z-normalised luminance distance to the
  reference in the hero crop): lane closer than pre-merge main in 86 / 121 loop frames, 27 / 30 where they differ most (L090-L106:
  lane 0.456-0.49 vs main 0.50-0.54). Overlays eyes2/cd_discriminating_frames.jpg (looked at). T0 / T2 smoke (caps/tiers*, eyes2/
  tiers_T0_T2.jpg): render, no page errors. Intro: shardRateFromSpin gets the restored d.spin (code read), no intro regression.
  tau 3.3 press: A share at F420 0.26 (0.149 m), F436 0.35 (an/aclose_lane_*.txt; 2 of 5 press phases nearly closed at F420).
  Shard on-screen speed by size (tools/sbig.py, an/sbig.txt), sustain F376-F442, px / 30 fps frame median: big (area > 800) ref 16.3,
  LANE 32.3, pre-merge main 34.0; mid ref 17.0 / lane 19.4 / main 24.7; small 20.8 / 20.5 / 25.3. Zoom-invariant and angular
  trackers (an/strack.txt, svnorm.txt) cannot pin the reference's slow-down better than ~0.5-0.8 (selection bias); the lane's 0.5 is
  not contradicted, but its near crystals still cross the frame 2x faster than the reference's. Next: verdict, HANDOFF note, stop lab.
- 04:41 judge1 VERDICT written (judge1/verdict_draft.md): FAIL, lens 6.8. PASS idle C / D, hold C / D, pieces coplanar, seamless,
  switches, tiers; BLOCKER A opening pulse (ring-uniform guard; user reported 04:17); MAJOR shard belt widened / near crystals 2x
  faster than the reference; nits pre-existing (rotating hold vs A2 arrangement, camera lunge timing, idle crystal size / speed).
  LANE/HANDOFF.md section 7 added. Next: stop lab :5174 (PID 97175, judge1's).
- 04:41 judge1: lab :5174 (PID 97175) stopped; :5173 / :3000 still listening (not mine). Nothing else edited (LANE code untouched).

## Fix round 1 (rings fixer, 16 Nov 2026, started 04:45 WIB)
- 04:45 start. Read SPEC 0-3, AUTOPILOT (04:17 user: outer rings must STAY open; hotfix agent on lanes2/hotfix, patch
  work2/hotfix/hotfix.patch: no guard, constant opening, hold dolly share frameShare() so the opened A's bounding sphere fits;
  smoke share 0.7335 at 1440x766), HANDOFF, judge1 verdict (BLOCKER A opening pulse; MAJOR shard belt widened / near crystals 2x).
  Plan: (1) take the hotfix mechanism into the lane (the P2b merge takes the lane's files, so the lane must carry it), (2) measure
  whether the reference's own opening (A2 R3 / R4: centre-line x1.14 at F420 = +0.31 m, gaps 50-62 px mean) fits a face-on A at the
  FULL dolly (the reference's 133 px/m, orb 218 px) instead of shrinking the hold camera, (3) shard belt back to the reference
  radius (shardContract 1, shardOut 0) + hold rate tuned on sbig.py / srad.py, (4) re-run every judge FAIL check.
- 04:51 applied work2/hotfix/hotfix.patch (04:41 version, copy fix1/hotfix_0441.patch) to LANE: all 5 files now == lanes2/hotfix. rings v1 sources kept in fix1/v1src, a frozen v1 lab clone in fix1/v1lab (serve on :5194 for identity checks).
- 04:53 code: HoldR11 SPIN_HF (?spin=hf = hotfix exactly), P2B_F1 default: pushA 0.3 (A2 6.1 base +0.30 m at F420), frameMargin 0, shardContract 1, shardOut 0, shardSlow 0.5 (to tune); tsc hero 0. Lab :5174 PID 22862 (fix1/lab.pid). Probe fix1/tools/fcap.mjs (= jcap + capsule test per candidate belt [contract, out] + exact bounds + holdShare). Capture s1 (h10 tau 2.6 / 1.3) queued in the slot.

## LEAD NOTE 16 Nov 04:57
- The user asked (04:15) for the outer rings to STAY open in the hold; judge1 found the same blocker (ring-wide frame guard
  pulses A's opening). The lead runs a separate hotfix (constant opening + hold camera framed once for the worst case,
  ?spin=p2b = the pulsing build) on a clone of MAIN; it will be applied to MAIN and to this lane.
- fix1 started at ~04:52 and was stopped by the lead after ~3 min to avoid two competing fixes. Its partial edits are saved in
  WORK/fix1_partial_0455/ (README.md, CameraRig.ts, HeroEngine.ts, HoldR11.ts, Rings.ts); the lane files were restored to v1
  (identical to MAIN). The next fixer starts from v1 + the lead's hotfix and must not re-implement the opening fix.

## LEAD HOTFIX (constant opening), 16 Nov 2026 05:17 WIB

What changed: the user (16 Nov 04:15) wants the two outer rings to STAY open through the whole press-and-hold. In the P2b build the per-ring frame guard made ring A's opening breathe with the tumble (down to ~1/3 whenever A turned tall on screen). The default hold now has no frame guard (`HOLD_STEADY` / `HOLD_SPIN.steady` 1 in HoldR11.ts; `Rings.poseRigid` skips the guard). The opening eases in with the press (`spinOpenAt`, unchanged), then stays at one constant (A 0.6 m, B 0.1 m) until the release closes it, at every press moment and hold length. The rings stay inside the frame through framing instead: `CameraRig.frameShare()` picks, once per screen shape, the share of the hold dolly at which the opened ring A's bounding sphere fits inside the frame. The sphere (`Rings.openRadiusA`: every vertex plus the ice shader's largest displacement, 3.035 m) keeps `HOLD_SPIN.frameMargin` 0.04 NDC plus the pointer pan and handheld drift. The lunge keeps its measured timing and only stops earlier on the same rest -> hold path. At 1440x766 the share is 0.7335, so the camera ends 14.90 / 15.09 m from the orb instead of 12.71 / 12.97 m (rings ~14 % smaller on screen in the sustain). The hero lift follows the same share, and the environment's hold look (uHold, the fog bank) is unchanged. `?spin=p2b` restores the guard build exactly (identity-checked against MAIN), and the older switches are unchanged.

Patch: `$SP/work2/hotfix/hotfix.patch` (diff -u vs MAIN; HoldR11.ts, Rings.ts, CameraRig.ts, HeroEngine.ts, README.md; applies cleanly). Changed clone: `$SP/lanes2/hotfix/retrux-web`. Evidence: `$SP/work2/hotfix/LOG.md`, `eyes/` (contact sheets, videos), `logs/an_*.txt`. The rings lane's next fixer: APPLY THIS PATCH FIRST, before touching anything about the opening. The guard (`guardRing`, `guardMargin`, `guardRelax`) now runs only under `?spin=p2b`; `fitR`'s width fit still gives `holdFit` (the environment's hold look and a cap on the camera share). A change to `pushA` re-frames the hold camera automatically (`openRadiusA`).

## Fix round 1, attempt 2 (rings fixer, 16 Nov 2026, started 05:24 WIB by the clock)
- Start state: LANE == MAIN == lanes2/hotfix for all 6 files (README, HeroEngine, CameraRig, HoldR11, Rings, Shards; md5 equal), i.e.
  v1 + the lead's hotfix (constant opening, framed hold camera, ?spin=p2b = guard build). fix1 attempt 1 (04:45-04:55) left no
  usable captures (its s1 run died when its lab was stopped). Its fcap.mjs (judge jcap + capsule test per candidate belt + exact
  bounds) is reused (copied to fix1b/tools). Work folder for this attempt: WORK/fix1b.
- Plan: (1) verify the hotfix quickly with fresh captures (opening share per tick, aclose at F404/F420/F436 for presses tau
  0 / 0.6 / 1.3 / 2.6 / 3.3, bounds); (2) MAJOR: crystal belt in the hold back to the reference's composition with the hotfix
  camera, no crystal ever inside an opened piece (capsule test), on-screen speed per size class vs the reference (sbig / srad);
  (3) re-run the judge's FAIL checks (3b, 4, 8 where it is this lane's), typecheck, switches, HANDOFF.
- 05:25 lab :5174 started (PID 34216, WORK/fix1b/lab.pid, log WORK/lab.log), serving LANE (= MAIN = v1 + hotfix).
- 05:27 batch s1 queued (fix1b/specs/s1.json: 10 s holds at tau 2.6 / 1.3 / 0 / 0.6 / 3.3, shots every 30 fps frame F376-F442 + every 0.5 s, per-tick capsule test for belts [contract,out] (0,0.15)=current (0,0) (1,0) (0.5,0) (0,0.05) (0,0.10), exact bounds) -> fix1b/caps/s1
- 05:40 s1 done (5 x 10 s holds at the hotfix camera, current belt contract 0 / out 0.15 / slow 0.5): HOTFIX VERIFIED (fan.py, t26 / t13): A opening share 0.9925..1.0001 in the hold, A 0.59996..0.60004 m x4 and B 0.1000 x2 constant from t+3.43 s to the release, quarters' spread 2.3e-5 m, holdShare 0.7335, camera 14.91..15.11 m, exact silhouettes L381 T50 R1066 B733 (inside). Capsule test per belt (t26 / t13): current (0,0.15) 0 hits min +0.141 / +0.158 m; (0,0) 33 / 11 frames hit (-0.112 m); (1,0) 342 / 346 frames; (0.5,0) 184 / 228; (0,0.05) 3 / 0 frames (-0.026 / +0.088); (0,0.10) 0 / 0 (+0.095 / +0.158). srad (judge tool, reproduced ref 386/459/477 at centre 720,392): engine at the hotfix camera t26 400/512/596, t13 418/560/643, t26 late 436/562/634 (crystal px/frame 8180-9539 vs ref 8142, blob area median 320-437 vs 164). sbig (ref reproduced 20.8/17.0/16.3, p75 31.9/26.9/27.6): engine small 12.1-18.2, mid 16.5-17.3, big 24.4-26.4 (p75 34-36.5). => with the hotfix camera p50 and small / mid speeds are already near the reference; the outer tail (p75 / p90) and the big near crystals' speed (1.5x) remain.
- 05:55 ANALYSIS of the major at the hotfix camera (fix1b/py: cmodel / caniso2 / cperbelt2 = CPU model of SHARD_VERT from the
  dumped crystal data an/cryst.json, 18 crystals at every tier = belt A 9 x 3.26 m + belt B 9 x 3.86 m, no swirl; cproj = the
  model replayed with an fcap run's phases and camera):
  * rate: keep shardSlow 0.5. svnorm (speed / sqrt(area)) sustain engine 0.72-0.87 vs ref 0.69, sustain / idle engine 0.67-0.81
    vs ref 0.73-0.82; sbig mid class 16.5-17.3 vs ref 17.0; pooled ~18 vs ~18. The big class (24-26 vs 16.3) are belt B's front
    crystals (nearest the camera); a slower rate would fix it only by making small / mid 35 % slower than the reference.
  * belt: ring A's opened bounding sphere (openRadiusA 3.035 m) vs every crystal capsule at every belt phase ("sphere-safe" =
    never inside an opened A piece at ANY A orientation): current uniform out 0.15 is the minimum sphere-safe value (+0.02..+0.06 m);
    belt A's BACK crystals bind (belt centre 0.2 m in front of the orb, the hold spread only x1.025 in depth). Belt B clears A's
    sphere even unwidened (+0.15 m); it is widened only for its separation from belt A at the crossings (the belts cross along the
    view axis). Model check of the current build: A-B crystal capsules overlap 1.7 % of the cycle (5.7 % with bob / rock).
  * candidate: widen in depth where the opened A needs room, not across the view: belt A x1.08 across / x1.20 depth, belt B x1.00
    across / x1.30 depth -> sphere-safe +0.082 m (current +0.021), A-B crossing clearance +0.102 m incl. bob / rock (current -0.228,
    5.7 % overlap), model srad -7..-10 % (p50 / p75 / p90 333 / 430 / 484 vs current 360 / 457 / 534), long crystals ~7 % slower.
  Next: implement it as P2B_F1 (default) with `?spin=hf` = the hotfix build exactly; fcap gets the live per-belt capsule test.
- 06:00 CODE (P2B_F1): HoldR11 SPIN_HF (?spin=hf = the hotfix build exactly) / P2B_F1 (default = HOLD_STEADY && !hf), HOLD_SPIN.shardOutA [0.08, 0.20] / shardOutB [0, 0.30] (across, depth); Shards uOut float -> vec3 uOut[3] per orbit (cen *= 1.0 + uOut[orbit]; equal components = the old uniform), update(out: number | [axA, azA, axB, azB]); HeroEngine passes the per-belt array under P2B_F1 (preallocated). tsc hero 0. fcap: cands 'live' (material uniforms) / [c, o] / [c, axA, azA, axB, azB], + belt A-B crystal capsule clearance per tick. batch s2 queued (5 x 10 s holds F1, hf h10_t26, 20 s hold t0.6) -> fix1b/caps/s2.
- 06:05 frozen reference lab: fix1b/hflab = APFS clone of lanes2/hotfix/retrux-web (app == MAIN app == v1 + hotfix, checked with diff -rq), to be served on :5194 for the switch identity checks (MAIN may change when other lanes merge).
- 06:15 s1 analysed (an/s1.txt; the HOTFIX build at 5 press phases): judge's aclose share 1.00 at F404 / F420 / F436 for tau 0 / 0.6
  / 1.3 / 2.6 / 3.3 (opening 0.494 / 0.570 / 0.600 m = the ease-in, no guard dip anywhere) -> judge BLOCKER fixed by the hotfix.
  srad hf p50 / p75 / p90 400-418 / 512-560 / 596-643; sbig small 12.1-18.2, mid 16.5-17.3, big 24.4-26.4; svnorm 0.72-0.87.
- 06:15 s2 first runs (new default F1): t26 srad 379 / 476 / 556 (hf 400 / 512 / 596), sbig 17.4 / 15.8 / 22.8 (hf 17.6 / 17.3 / 26.4);
  t13 397 / 513 / 569 (hf 418 / 560 / 643), sbig 12.2 / 15.6 / 22.4 (hf 12.1 / 16.5 / 25.5). Capsule test (live): 0 hits, min
  clearance +0.153 / +0.129 m; belt A-B crystal overlaps only at rest / early press / after the release (spreadA ~0: the idle
  geometry, identical in every candidate, pre-existing), none from spreadA 0.65 on (hf: overlaps all through the sustain, e.g.
  t26 ticks 200-202 -0.183 m, 442-443 -0.114 m). Sheet eyes/belt_ref_f1_hf_t26.jpg (ref | F1 | hf at F384 / F400 / F416 / F432,
  circles 386 / 477 px) LOOKED AT: F1's crystals sit a little closer round the sculpture than hf's; both keep a few crystals
  beyond the 477 px circle top-right where the reference has none; the engine's sculpture is smaller than the reference's (hotfix
  camera). Residual: p90 +17-19 %, big-crystal speed +37-40 % (the engine's big blobs are its near front crystals; the
  reference's big blobs move like its small ones: swarm composition, pre-existing nit 5). B contracted 6 % across (model) would
  cut p90 only ~5 % more: not taken (one more knob for little).
- 06:22 s2 done; s3 (H-G2 bounds: 16 presses 1440x766 + 4 each 1280x800 / 1920x1080 / 390x844, live capsule + hf candidate) running; fcap gains pinShards (shard clock 7.7 / phases 0.4 + 0.9 i at the press, as jcmp3) for clean A/B; s4 spec (F1 vs hf, tau 2.6 / 1.3 / 0.6, pinned, sustain + late shots) ready. Record identity hf (s2) vs hotfix (s1) h10_t26: ring quaternions equal from tick 1 on (tick 0 = harness settle transient), drivers 0, camera 7e-4 (session time), uOut 0.15 x4 in both; F1 vs s1 rings equal at every tick. Frozen reference lab :5194 (fix1b/hflab) started (PID in fix1b/hflab.pid).
- 06:32 s2 analysed (an/s2.txt) F1 at 5 press phases: srad p50 / p75 / p90 t00 405 / 504 / 548, t06 369 / 479 / 551, t13 397 / 513 / 569,
  t26 379 / 476 / 556 (hf 400-418 / 512-560 / 596-643; ref 386 / 459 / 477); sbig small / mid / big t00 14.8 / 15.2 / 24.4, t06
  16.0 / 16.4 / 24.4, t13 12.2 / 15.6 / 22.4, t26 17.4 / 15.8 / 22.8 (ref 20.8 / 17.0 / 16.3); svnorm 0.72-0.80 (ref 0.69). aclose
  share 1.00 at F404 / F420 / F436 for all 5 phases; A 0.59996..0.60004 m from t+3.43 s to the release, quarters within 2.4e-5 m.
  LOOKED AT eyes/open_frame_5press.jpg (ref F420 / F436 / F441 row + the 5 presses): tau 0 / 1.3 / 3.3 show the four separated
  arcs round the orb (tau 1.3 and 3.3 were nearly closed for the judge), tau 0.6 / 2.6 have A edge-on at that moment (the
  rotating hold's tumble phase: lead decision, nit 3), never closed.
- 06:40 s3 H-G2 (F1 build, exact silhouettes = every 3rd vertex of every piece, an/s3_bounds.txt): 1440x766 16 presses tau 0..3.75
  x 6.25 s + release: worst L378.4 T48.6 R1068.9 B736.9 (inside, margins >= 29 px); 1280x800 4 presses L285.6 T50.8 R997.7 B763.5;
  1920x1080 4 presses L485.5 T77.7 R1451.9 B1025.3; 390x844 4 presses L-21.5 R417.7 (sides cropped 21-28 px: the hotfix's
  portrait crop the lead allowed, unchanged) T192 B631. A opening at full 0.59994..0.60004 m in all 28 presses. Crystal inside an
  opened piece: 0 hits in 28 presses (min clearance +0.123 m); belt A-B crystal clearance with the opening >= 0.7: +0.101 / +0.237
  / +0.006 / +0.174 m (no overlap).
- 06:40 j1 (jcmp3, SHOW_SHARDS=1 = shards visible, clock / phases pinned): LANE ?spin=hf vs the frozen hotfix build :5194 (= MAIN
  app) 26 / 26 shots mean 0.000 (rest q00-q03, 9 pointer spots, poses p04-p08, live F358 / F420 / F453 / F460 at tau 1.1 / 3.3),
  camdiff 0, gqdiff 0; max abs 0-1 except p06 max 9 on < 0.0005 % of pixels (> 2 levels: 0.000 %).
  (j1 detail: p06 differs in 2 pixels (184,618) 9 levels / (187,622) 1 level, p05 in 5 pixels by 1 level: the shard vertex shader's uniform became a per-belt vec3 (GPU arithmetic of one crystal edge pixel); mean 0.000 = within SPEC 2.7's 0.5 / 255.)
- (clock check: real time now 06:03; the entries above stamped 05:55-06:40 were my estimates and ran ahead by up to ~40 min; real order unchanged. From here real times.) Machine load spiked to 1-min 109 (someone's ffmpeg at 290 % CPU; slot loadMax 16 holds new jobs); my s4 (pinned A/B) and jcmp batches keep their slots.
- 06:08 pinned A/B (s4, shard clock / phases pinned at the press, same ring states), tau 2.6: srad F1 390 / 494 / 551 vs hf 412 / 530 /
  589 (-5 / -7 / -6.5 %, the model's prediction). Next: s4 rest (tau 1.3 / 0.6), jcmp j2-j8, then test belt B at -10 % across
  (both belts end at the same 3.77 m across the view, the artist's two belts are equal in the .blend; model: sphere B +0.093 m,
  crossing +0.068 m with bob / rock, p90 -7 % more) as s5, plus T0 / T2 smoke (s6). The clamp in Shards.update must allow < 0.
- 06:12 s4 pinned A/B (shards pinned at the press) F1 vs hf: srad t2.6 390 / 494 / 551 vs 412 / 530 / 589; t1.3 386 / 494 / 551 vs
  410 / 528 / 588; t0.6 390 / 494 / 553 vs 412 / 530 / 589 (-5..-7 % at every percentile); sbig small / mid / big t2.6 15.1 / 16.3 /
  25.4 vs 16.6 / 17.8 / 27.3, t1.3 10.4 / 15.3 / 25.0 vs 12.6 / 16.9 / 27.3, t0.6 16.4 / 16.6 / 25.3 vs 18.7 / 18.0 / 28.0 (-7..-17 %);
  svnorm t0.6 0.793 vs 0.860 (ref 0.694). Ref: 386 / 459 / 477; 20.8 / 17.0 / 16.3.
- 06:12 jcmp (SHOW_SHARDS=1) LANE vs frozen hotfix build :5194, same query both sides: ?spin=p2b 11 / 12, ?spin=f2 15 / 16, ?hold=r10
  15 / 16 pixel-identical; the one differing shot in each is live_F358_t1.1 (mid-lunge) with camdiff 1.3-1.6e-4 and gqdiff 0 = the
  documented harness flicker (pointer speed from performance.now() in Choreography.move(); j1 had it identical).
- 06:11 jcmp done: default rest + pointer (shards visible) 12 / 12 identical, ?spin=s3 identical, default hold with shards HIDDEN 12 / 12 identical (rings / camera / environment untouched by the fix), default hold with shards visible differs only in the crystals (mean 0.2-1.2, 0.8-3.1 % px: the new belt). Shards.update now allows a per-belt share down to -0.5 (tsc hero 0); s5 (belt B -10 % across, holdSpin override, pinned, tau 2.6 / 1.3 / 0.6) and s6 (T0 / T2 smoke F1 and hf) queued.
- 06:15 s6 T0 / T2 smoke (F1 and ?spin=hf; rest, t+2.0, t+3.5, release +0.5 / +1.0): no page errors (caps/s6/logs.txt empty); LOOKED AT eyes/tiers_T0_T2.jpg: every tier renders the rings, orb, crystals, hold and release normally.
- 06:27 s5 (belt B -10 % across, pinned, tau 2.6 / 1.3 / 0.6) vs F1 (B 0) vs hf, same pinned crystal phases: srad 375 / 464 / 543 vs
  388 / 494 / 552 vs 411 / 529 / 589 (ref 386 / 459 / 477); sbig 12.6-15.4 / 14.9-15.7 / 23.9-24.4 vs 10.4-16.4 / 15.3-16.6 / 25.0-25.4 vs
  12.6-18.7 / 16.9-18.0 / 27.3-28.0 (ref 20.8 / 17.0 / 16.3); crystal area beyond the reference's p90 radius (477 px): ref 9.6 %, B-10
  22.4 %, F1 28.5 %, hf 34.8 % (all at the frame's left / right sides). Capsule (pinned): 0 hits in all three builds' holds (min
  +0.23 m); belt A-B crystal clearance B-10 +0.014 m and F1 +0.023 m at every tick (no overlap), hf 21 ticks overlapping (-0.194 m).
  DECISION: shardOutB = [-0.10, 0.30]: across the view belt B stays where it is (x1.084 spread x 0.90 = 0.976 of its rest radius)
  and belt A moves out to the same 3.77 m, just outside the opened arcs (the artist's two belts are equal in the .blend); in depth
  both widen as far as the opened A and their crossing need. p50 -3 % / p75 +1 % / p90 +14 % vs the reference (hf +7 / +15 / +23 %).
- 06:18 FINAL values in code (HoldR11 shardOutB [-0.1, 0.3]; README sentence); tsc hero 0. s7 (final: fin_t2.6 = s5 bm10_t2.6 spec without the override, vid_t13 10 s hold every 2nd tick, rp035_t20 release + re-press, click_t10, idle4) and s8 (= s3's 28-press bounds / capsule set with the final values) queued.
- 06:19 HANDOFF section 8 drafted (fix1b/handoff_fix1.md; appended to LANE/HANDOFF.md once s7 / s8 numbers are in).
- 06:30 s7 FINAL (code defaults): fin_t2.6 = the s5 override run exactly (shard phases / clock / uOut [0.08, 0.2, -0.1, 0.3] / drivers
  identical at every tick; rings from tick 1). Capsule: 0 crystal-in-piece hits in fin / vid_t13 / rp035 / click (min +0.15..+0.36 m);
  belt A-B crystal clearance >= +0.012 m at every tick of every run (the hotfix belt on the same states: 12-21 overlapping ticks,
  -0.18..-0.19 m). Click (0.15 s at tau 1.0): no opening, no hold. LOOKED AT eyes/fin_press_t13.jpg (every 0.1 s t+0.4..2.2: lunge,
  opening, crystals slowing and widening smoothly), eyes/fin_release_repress.jpg (every 0.1 s through the release at tick 270 and the
  re-press 0.35 s later: continuous, no crystal jump), eyes/belt_ref_final_hf_pinned.jpg (ref | final | hotfix with the same crystal
  phases, F384-F432: the final crystals sit visibly closer round the sculpture across the view; a few still reach the 477 px circle
  at the right). Video eyes/final_hold10s_t13.mp4 (30 fps, 10 s hold + release).
- 06:30 s8 (final values, 28 presses at 1440x766 / 1280x800 / 1920x1080 / 390x844, an/s8_bounds.txt): exact silhouettes as s3 (1440
  worst L378.4 T48.6 R1068.9 B736.9; 1280 T50.8 B763.5; 1920 T77.8 B1025.3; 390 sides -21.5 / -27.7 = the hotfix's portrait crop);
  A 0.59994..0.60004 m at full opening in all 28; crystal-in-piece hits 0 (min +0.122 m); in the opened hold (7532 ticks with
  spreadA >= 0.7) belt A-B crystal clearance >= +0.015 m at every tick, the hotfix belt on the same states 182 overlapping ticks
  (-0.184 m). Crystal motion continuity (py/cjerk.py, 3D step per tick relative to the hero): largest step 24.5 cm in the hold
  (hotfix 23.1, idle 19.7-20.4), largest change of step 1.0-1.1 cm / tick through press, sustain, release, re-press (no jump).
- 06:31 typecheck: tsc -p tsconfig.hero.json exit 0, -p . exit 0, no output (fix1b/logs/tsc_*_final.txt); tsconfig.tsbuildinfo
  restored from BASE. HANDOFF.md section 8 complete (+ ?spin=hf in section 2, status line). Labs :5174 (PID 34216) and :5194 (PID
  45466) STOPPED; :5173 / :3000 still up (not mine). LANE vs BASE: README, CameraRig (hotfix), HeroEngine, HoldR11, Rings, Shards
  (+ HANDOFF.md, git-ignored hero-lab/dist). FIX ROUND 1 DONE.

## 2026-11-16 JUDGE round 2 (independent adversarial judge; everything in judge2/)
- 06:34 started. No earlier judge2 state (judge2/ was absent). Read SPEC 0-3, AUTOPILOT, LOG (builder, judge1, hotfix, fix1b) and
  HANDOFF (claims only). Next: diff LANE vs BASE / MAIN, read the changed code, start lab :5174, fresh captures through the slot.
- 06:38 judge2: LANE = MAIN (v1 + lead hotfix) + fix1 (HoldR11 / Shards / HeroEngine / README: per-belt per-axis crystal widening);
  MAIN = BASE + rings v1 + hotfix (no water / atmos merge yet). Diffs saved judge2/diff/*.diff. Lab :5174 started by me (PID in
  judge2/lab.pid). Tool judge2/tools/jcap2.mjs (= judge1 jcap + uOut arrays, uShatter, run.lab). Batches: lane_b1 (idle8, h10_t26,
  rp035_t20; 30 fps shots) running; main_b1 (idle8, h10_t26 on :5173) queued; next lane_b2 (h10_t13/t33/t00, presses, click, h20)
  and f2_b1 (`?spin=f2` = BASE behaviour).
- 06:45 judge2: lane idle8 done (an/lane_idle8.txt): C 90.00 / D 45.00 deg/s constant about local X, 0 sign flips, 0 wobble; A / B
  as before (201 / 162 deg/s). Looked at eyes/ref_loop_inner_every02.jpg and eyes/lane_idle_inner_every02.jpg (same configurations
  every 0.2 s). Copied judge1 tools (strack, srad, sbig, svnorm, proj, structcmp, aclose, blue) into judge2/tools; jan2.py (per-belt
  uOut). Running: lane h10_t26 (30 fps), f2_b1 (BASE: isolated C / D idle, idle8, h10); queued: main_b1, lane_b2. verdict_draft.md
  started.
- 06:58 judge2 results so far (fresh captures):
  * BASE behaviour (`?spin=f2`, isolated C / D, an/base_f2_idle8_cd.txt): C 4 / D 16 sign flips, D 1-113 deg/s (the user's rocking).
  * LANE idle structure vs Default Loop (tools/structcmp2.py, an/structcmp_lane_vs_base.txt): lane closer than BASE in 105 / 121 frames,
    30 / 30 of the most different ones.
  * LANE h10_t26 (an/lane_h10_t26.txt): C -90 -> -18, D +45 -> +9 deg/s, 0 flips; A 216 -> 40, B 165 -> 32.4 deg/s; pieces = ring rotation
    (0.00 deg), |local z| <= 3.2e-5 m, A quarters 0.600 m each (equal to 1.9e-5 m), B 0.100 m; shards 1 -> 0.5 -> 1 (step 0.021);
    timing: shards slow F358 -> F376, back F449 -> F467 (matches the reference windows judge1 measured; re-measuring with strack).
  * opening (an/lane_h10_t26_aclose.txt): 0.362 m F372, 0.494 F404, 0.570 F420, 0.600 F436, share 1.0 (no guard pulse).
  * camera (an/lane_h10_t26_cam.txt): lunge 0.73 + 0.76 m in 2 ticks at F355.5-356 (20 -> 55 % of the dolly; pre-existing hold-lane
    curve); creep starts by backing off 0.12 m (hover push-in released at the press; pre-existing); hold distance 14.91-15.11 m.
  * crystals sustain (an/lane_h10_t26_srad/sbig/svnorm.txt): radius p50/p75/p90 389/491/553 vs ref 387/460/477; blob area median
    462 vs ref 168; speed small/mid/big 15.4/15.9/22.1 vs ref 20.8/17.0/16.3 px/frame; svnorm 0.729 vs ref 0.694.
  * LOOKED AT eyes/hold_t26_vs_ref_1/2.jpg, eyes/lane_h10_t26_sustain_every40.jpg, eyes/ref_F440_vs_lane_tick400_faceon.jpg: pieces
    coplanar, clean four-arc frame when A faces the camera; the hold framing is visibly smaller than the reference (orb ~0.85x).
- 07:08 judge2: LOOKED AT eyes/lane_cd_idle_every02.jpg (isolated C / D, lane: continuous flips, the near half alternates through
  edge-on = turning over) vs eyes/base_cd_idle_every02.jpg (BASE: C / D hover near face-on t3.2-4.2 and fold back = the rocking).
  rp035 (an/lane_rp035_t20.txt): 0 flips, pieces exact, clock frozen at 0.724 through the re-press click window then eased (no jump),
  camera steps 5-18 mm/tick at the re-press; LOOKED AT eyes/lane_rp035_release_repress.jpg (continuous).
  Hold scale: lane 112-113 px/m at the orb in the sustain (dist 14.91-15.11 m) vs the reference's 132-133 px/m (orb 218 px, A2 R8 /
  ORB_RADIUS 0.8255): the hotfix's framing shows the hold at 0.84x the reference (eyes/ref_F440_vs_lane_tick400_faceon.jpg).
  Reference crystal angular tracker (an/ref_strack_windows.txt) reproduces judge1's numbers but is selection-biased (idle 0.008,
  sustain 0.011 rad/frame), so the reference's slow-down factor stays pinned only by px speeds (sbig) and timing.
- 07:20 judge2: BASE behaviour hold (`?spin=f2`, an/base_f2_h10_t26.txt): A quarters up to 0.499 m out of plane, 0.40 m spread, C / D
  5 / 6 sign flips, shards only to 0.93 = the user's complaints reproduced; the lane fixes each (an/lane_h10_t26.txt, h10_t13,
  h10_t26_cd). Isolated C / D in the hold (eyes/lane_cd_hold_t26.jpg, looked at): slow continuous flips, D a slowly opening band.
  Crystal slow-down, zoom-invariant speed / sqrt(area) (svnorm): reference idle 0.962 -> sustain 0.694 (x0.72), lane idle 1.101 ->
  sustain 0.729 (x0.66); timing F358-F376 / F449-F467 = the reference's windows. lane idle == MAIN idle in rings and camera from
  tick 1 (quat diff 0; tick 0 = pre-run state); images differ only by the unpinned crystals / time-driven noise.
  Queued pinned crystal A/B (pin_lane / pin_main: shard clock 7.7, phases 0.4 + 0.9 i, holds at tau 2.6 / 1.3).
- 07:35 judge2: short presses 0.3 / 0.7 / 1.2 / 2.0 s (an/lane_presses_t26.txt): 0 flips, pieces exact, 0.3 / 0.7 s presses never open or
  slow anything, 1.2 s press lunges to 83 % and parts A by 0.26 m then closes (eyes/lane_press12_seq.jpg, looked at: continuous, the
  pre-existing fast lunge visible); click (an/lane_click_t10.txt): inert (spreadA 0, camExpand 0, spin 1). h10 tau 1.3 / 3.3 / 0.0:
  same bounds. `?spin=f2` vs judge1's pre-merge main (BASE) h10_t26 / idle8: ring quats 0, drivers 0 (way back exact).
  Lane vs MAIN h10_t26: rings / pieces / drivers identical, camera 0.9 mm; only the crystal belt differs.
  PINNED crystal A/B tau 2.6 (an/pinned_t26_lane_vs_main.txt; identical crystal phases): radius p50/p75/p90 lane 403/486/550, MAIN
  442/554/626, ref 387/460/477; speed small/mid/big lane 15.0/16.0/23.2, MAIN 16.9/17.9/28.4, ref 20.8/17.0/16.3; svnorm 0.748 /
  0.850 / ref 0.694 -> fix1 is closer to the reference than MAIN in every number, still p90 +15 % and big crystals +42 %.
  LOOKED AT eyes/crystals_pinned_ref_lane_main.jpg. Orb centre in the sustain (723, 392) = ref (720, 392); depth 15.1 m (lane) vs
  13.0 m (BASE).
- (clock check 07:04: the judge2 entries stamped 06:58-07:35 above were estimates and ran ahead; real order unchanged. From here real times.)
- 07:06 judge2: h20_t06 / h10_t33 / h10_t00 (an/lane_*.txt, *_aclose.txt): same bounds, opening 0.600 m constant, no pulse.
  ?spin=hf vs MAIN pinned (caps/pinhf vs caps/pinmain): crystal state / uOut / rings identical, camera 0.9 mm; diff map looked at
  (eyes/diffmap_hf_vs_main__lane_vs_main_F420.jpg: hf vs MAIN only water-ripple wall-clock noise; lane vs MAIN only the crystals).
  T0 / T2 smoke: no page errors (eyes/tiers_T0_T2_smoke.jpg looked at). tsc hero exit 0. Pointer at 3 screen corners in the hold
  (eyes/edge_pointer_holds.jpg): rings inside the frame. verdict_draft.md written (FAIL, 7.8: minor = hold framed at 0.84x the
  reference; nits: rotating hold arrangement, crystal size / count, outer tail + big-crystal speed, lunge, D near-still in sustain).
  Running: portrait 390x844 spot check. Next: look at it, HANDOFF section, stop lab.
- 07:08 judge2 DONE. Portrait 390x844 holds looked at (eyes/portrait_390_holds.jpg: arcs cut at the sides at A's wide phases =
  the hotfix's accepted crop). Idle frames where BASE scored closer looked at (eyes/idle_base_better_frames.jpg: lane = BASE there).
  VERDICT (judge2/verdict_draft.md): FAIL, lens 7.8, no blocker / major. PASS: idle C / D, hold C / D slow-mo, pieces coplanar + one
  ring + constant opening, crystal slow-down rate / timing, seamless press / holds / release / re-press, click, switches, tiers, tsc.
  MINOR 1 hold framed at 0.84x the reference (hotfix frameShare); MINOR 2 nearest crystals 1.4x the reference's speed + outer tail
  +15 % (improved over MAIN). Nits: rotating hold arrangement, crystal size / count, lunge, D near-still. LANE/HANDOFF.md section 9
  added. Lab :5174 (PID 57701, mine) stopped; :5173 / :3000 untouched. Nothing in LANE code edited.

## Fix round 2 (rings fixer, 16 Nov 2026, started 07:10 WIB)
- 07:10 start. No earlier fix-2 state in LOG (judge 2 was the last entry). Read SPEC 0-3, AUTOPILOT, HANDOFF 1-9, judge2 verdict
  (FAIL 7.8: MINOR 1 hold framed at 0.84x the reference (hotfix frameShare / holdShare); MINOR 2 nearest crystals 1.4x the
  reference's speed + outer tail +15 % (symmetric depth widening pulls front crystals toward the camera); nits 3-6). MAIN == BASE +
  rings v1 + hotfix (no water / atmos merge yet); LANE == MAIN + fix1 (HoldR11 / Shards / HeroEngine / README). Work folder WORK/fix2.
  Plan: (1) reproduce both minors with judge2's tools/captures; (2) MINOR 2 first (shader-only, smaller): depth widening only behind
  the belt origin, re-measure sbig / srad pinned + capsule; (3) MINOR 1: hold framing at the reference's scale on landscape bounded by
  the reference's own edge contact, H-G2 at 4 screens; (4) re-run gate 6 checks + switches + tsc; nits only where measured + cheap.

## LEAD NOTE 16 Nov 07:15 (for fix round 2 and later)
- NON-NEGOTIABLE (the user's explicit order, 04:15): the outer rings hold a CONSTANT opening through the whole sustain (A 0.6 m,
  B 0.1 m); no opening that shrinks or grows with the tumble, no frame guard on the opening. The hold camera stays steady during
  the sustain (no zoom breathing).
- judge2's zoom minor (0.84x the reference's push-in) may be addressed ONLY by moving the FIXED per-screen framing closer toward
  the reference: like F420, ring A may touch the frame edge at its widest tumble phase (a few px of crop at that moment is
  acceptable), but never by changing the opening or by moving the camera during the sustain.
- Crystals: match State 2 to 5's on-screen speed and swarm width in the hold while never passing through an opened piece.
- 07:17 lab :5174 started (PID 75079, WORK/fix2/lab.pid, log WORK/lab.log) serving LANE (= fix1 build).
- 07:20-07:45 DESIGN (CPU models, no slot needed; the slot was held by the water / atmos lanes, my repro batch queued):
  * fix2/py/framefit.py = Python port of CameraRig.frameShare (reproduces the hotfix share 0.7336 at 1440x766, 1 at 1280x800,
    0.829 at 1920x1080): at the full dolly the opened ring A's sphere (2.435 + push m) spans 2 x (2.435 + p) x 132.8 px/m; the
    sphere fits 1440x766 with margin 0 + the pan / drift slack for push <= ~0.29 m (0.33 m touches the bottom edge without slack).
  * The reference's own late-sustain open frame (A2 R4 / section 3: 805x733 at F436, 792x745 at F444, top arc at y 0-5, bottom
    735-750, at 129-133 px/m) = a face-on A of push ~0.29-0.33 m at 133 px/m (2 x (2.435 + p) x 133 = 726-735 px); the reference's
    mean push at F420 is +0.31 m (x1.14). So the hold can run the FULL dolly (133 px/m, orb 218 px, the reference's scale) with a
    constant opening ~0.3 m that never leaves the frame at any tumble phase (touching as the reference does) -> plan for MINOR 1.
  * fix2/py/creplay.py + cwhatif.py: CPU model of SHARD_VERT replayed on the judge's pinned run; validated by drawing the model's
    crystals on the judge's frame (eyes/creplay_t200.jpg): it matches only with the hold's SHATTER BURST included (uShatter =
    0.25 x s.shatter ~0.23-0.25 in the hold: half the crystals thrown 0.7-1.7 m outward, +14-25 deg along the orbit; a round-10
    hold term). Model vs judge's measurement (lane t26): radius 363/466/537 vs 403/486/550 (occlusion bias at p50), big speed
    27.7 vs 23.2; MAIN 407/533/592 vs 442/554/626: same direction, factors 1.11 / 1.04 / 1.02 used as calibration.
  * At the full dolly the current belt would sit +20 % wider (model calib 494/586/659). Contributions (model, k 1): burst +10-17 %,
    hold spread +4-9 %; the engine's REST belt geometry seen from the full hold camera = calib 384/463/529, i.e. the reference's
    sustain distribution (387/460/477) except p90. Looked at the reference around the pop (eyes/ref_pop_340_392.jpg, F340-F392):
    the crystals stay tight round the sculpture, no outward throw at the pop.
- 07:29 REPRODUCED both minors with the judge's own tools on fresh captures (fix2/caps/repro = judge2 specs/pin_lane.json via
  judge2/tools/jcap2.mjs; fix2/tools/an_pin.zsh = the judge's srad / sbig / svnorm frame ranges; fix2/an/repro_pinned.txt):
  t26 radius 403/486/550, speed small/mid/big 14.8/15.8/23.0, svnorm 0.740; t13 400/483/550, 10.8/14.7/22.9 (judge: 403/486/550,
  15.0/16.0/23.2; 400/483/550, 11.8/14.7/22.9); camera min 14.909 m from the root (= 112-113 px/m; judge 14.909).
- 07:32 frozen copy of the fix-1 build: fix2/f1lab (APFS clone of LANE/retrux-web, app == LANE), sources in fix2/src_f1, for the
  `?spin=f1` identity checks (serve on :5194 when needed).
- 07:36 CODE (fix round 2 = P2B_F2, the new default; `?spin=f1` = fix round 1 exactly, `?spin=hf` = the hotfix = MAIN):
  * HoldR11.ts: SPIN_F1 / P2B_F2; HOLD_SPIN.pushA 0.26 (P2B_F2; else 0.6), frameMargin 0 (P2B_F2; else 0.04) -> CameraRig.frameShare
    (unchanged code) gives the full dolly at 1440x766; shardFrontA 0 / shardFrontB 0.2 (depth share in front of each belt origin;
    shardOutA / B [1] = behind); shardHoldFx 0 (P2B_F2: no round-10 hold spread / shatter throw on the crystals; 1 elsewhere).
  * Shards.ts: uniform float uOutF[3]; SHARD_VERT: if uOutF == uOut.z the old line `cen *= 1.0 + uOut[orbit]` runs unchanged
    (every older build), else z *= 1 + mix(front, behind, 1 - smoothstep(-0.5, 0, z)) (C1, monotone); update(out) takes 6 entries.
  * HeroEngine.ts: P2B_F2 passes the 6-entry widening; the crystals' hold / shatter args x HOLD_SPIN.shardHoldFx (x1 = exact).
  * tsc hero exit 0. Values from the CPU model scan (fix2/py/cscan.py, push 0.26, no burst / spread, full dolly): A (0.08, 0.2
    behind, 0 front), B (-0.1, 0.3 behind, 0.2 front): model calib radius 391/475/500 (ref 387/460/477), sphere clearance A +0.18 /
    B +0.15 m from ring A's opened sphere (2.695 m), belt A-B crossing +0.03 m (real phase relation; behind-only: -0.33 m, 10-34 %).
  * fix2/tools/fcap2.mjs = fix1b fcap + the uOutF split in its capsule model, uShatter / uOutF recorded, run.lab.
- 07:37 batch v1a queued (pinned t26 / t13 default, + t26 behind-only (shardFrontB 0) and symmetric (A 0.2 / B 0.3 front) via holdSpin
  overrides; live capsule + exact bounds per tick). Slot held by atmos / water.
- 07:42 v1a done (fix2/an/v1a_pinned.txt, v1a_runsum.txt; judge's pin, tools and frame ranges):
  | build (pinned t26) | radius p50/p75/p90 | speed small/mid/big | svnorm | blob area med |
  | reference F376-F442 | 387/460/477 | 20.8/17.0/16.3 | 0.694 | 168 |
  | fix 2 default (B front 0.2) | 381/469/497 | 16.5/14.6/23.9 | 0.633 | 636 |
  | behind only (B front 0) | 377/465/490 | 15.7/14.8/23.8 | 0.635 | 632 |
  | symmetric (A .2 / B .3 front) | 390/478/504 | 16.0/14.5/24.4 | 0.628 | 648 |
  | (repro of fix 1, 0.84x camera) | 403/486/550 | 14.8/15.8/23.0 | 0.740 | 446 |
  t13 default 378/468/496, 9.0/13.4/22.7. Camera: holdShare 1, 12.73-13.00 m from the root = 130-133 px/m (ref 129-133). A opening
  0.2576-0.2600 m, B 0.0991-0.1000 in the sustain. Exact silhouettes inside (worst T35.0 B747.5). Capsule: 0 hits (min +0.155 m).
  => radius distribution now within 4 % of the reference (p90 550 -> 497); the front-depth choice does not move the big-class
  speed (23.8-24.4): the big blobs are the engine's ~2x larger crystals (blob area 636 vs 168, crystal look). Kept B front 0.2
  (clean front crossing in the model; behind-only crosses -0.33 m).
- Reference lunge re-measured myself (fix2/py/bgshift.py, background vertical shift per frame, strip x 0-300; an/ref_bgshift_*):
  F353-F362 5.7 7.7 13.1 38.7 18.9 8.6 5.7 4.2 3.3 2.7 px (= EXPAND_CAM_R11's source), creep F330-F348 0.1 -> 2.1 px / frame,
  monotone (no back-off).
- 07:45 batch v1b queued: 28 presses (1440x766 x16, 1280x800 / 1920x1080 / 390x844 x4) + 4 pointer-edge holds; unpinned (real belt
  phase relation), exact silhouettes + live capsule per tick.
- 07:47 frozen fix-1 lab :5194 started (PID 88045, serving fix2/f1lab) for the ?spin=f1 identity checks.
- 07:50 v1b done (fix2/an/v1b_bounds.txt, v1b_bwhen.txt; 32 unpinned runs = the real belt phase relation, every tick):
  * H-G2 exact silhouettes (every 3rd vertex of every piece), worst over each whole run: 1440x766 (16 presses tau 0..3.75 + 4
    holds with the pointer at the screen's corners / top / bottom) L364.7 T34.4 R1082.6 B751.2 (inside; the worst bottom is ring
    A at t+2.9-3.2 s, before the 3 % ease-back); 1280x800 T93.3 B721.3; 1920x1080 T87.3 B1015.3; 390x844 (no hold dolly there,
    holdFit 0) L4.0 R392.3: the opened A touches the right edge by <= 2.3 px (fix 1 / hotfix: 21-28 px cut).
  * ring A opening at full 0.25997..0.26003 m in all 32 (constant, no guard); B 0.1.
  * crystal-in-piece capsule test: 0 hits in 32 runs (min clearance +0.121 m); belt A-B crystal clearance with the opening >= 0.7:
    >= +0.105 m (no crystal passes through another).
- 07:51 batch v1c queued (10 s holds tau 2.6 / 0.6 every 2nd tick for sequences + video, release + re-press 0.35 s, click 0.15 s,
  20 s hold; live capsule + bounds).
- 07:55 crystal speed by region (fix2/py/bigwho.py = sbig's matching + where each matched blob is; an/crystal_regions.txt; inner =
  within 250 px of the orb, i.e. passing in front of / behind the sculpture): reference big class 12 % inner (41.9 px/frame) / 88 %
  outer (13.2); fix 2 big class 27-30 % inner (33.7-34.0) / outer (16.0-16.9); mid class ref inner 30.5 / outer 15.9 vs fix 2
  30.6-30.8 / 13.1-13.8. => per region the engine's crystals move as fast as the reference's (or slower); the big-class median
  (23.9 vs 16.3) is the population: the engine's crystals in front of the sculpture are its BIG ones (18 one-size crystals, size =
  nearness), the reference's front crystals are small ones. Fix 1 (27 % inner) and MAIN (25 %) had the same composition. Depth
  geometry cannot shrink them: belt A's front crystals already sit at the opened ring A's sphere (+0.08 m allows -2.5 %), and
  belt B's front must stay >= ~1.1 m beyond belt A's for the front crossing. Residual = crystal look owner (judge nit 4).
- (the 16 Nov fix-2 attempt stopped here: the user paused everything at 07:58; v1c (10 s holds / rp035 / click / h20 with pushA
  0.26) had finished, fix2/an/v1c_open_runsum.txt: 130-133 px/m, A 0.26 m constant, capsule 0 hits; its aclose step failed
  (missing proj import). No HANDOFF section was written.)

## Fix round 2, RESUMED (rings fixer, 17 Nov 2026 07:46 WIB; the user resumed with "lanjut, super power")
- 07:46 State: LANE = fix-1 + the 16 Nov fix-2 code (P2B_F2 default: pushA 0.26, frameMargin 0, shardFrontA 0 / B 0.2,
  shardHoldFx 0; `?spin=f1` = fix 1 exactly). MAIN app == the hotfix build (fix1b/hflab), unchanged since 16 Nov; :5173 / :3000
  were restarted by the lead at 07:45. Slot full power (n 3). No lab of mine running.
- DECISION (binding LEAD NOTE 16 Nov 07:15, the user's 04:15 order): ring A's opening stays 0.6 m (B 0.1 m) and the zoom minor is
  addressed ONLY by moving the fixed per-screen framing closer ("never by changing the opening"). The 16 Nov attempt's pushA 0.26
  violates that, so it is reverted: P2B_F2 keeps pushA 0.6 and takes the framing closer with a negative frameMargin so the opened
  A touches the frame edge at its widest tumble phase (a few px of crop at most, as the reference's arcs at F436-F444, y 0-5).
  Model (fix2/py/framefit.py, push 0.6, sphere 3.035 m, with the pan / drift slack): margin +0.04 share 0.734 (hotfix, 113 px/m),
  0 -> 0.803, -0.02 -> 0.837. Next: pick the margin from exact silhouettes, keep the crystal changes if they still pass with A at
  0.6 (capsule) and improve srad / sbig.
- 07:54 CODE: HoldR11 P2B_F2 pushA back to 0.6 (= fix 1), frameMargin -0.03 (sphere + pan / drift slack may reach 11 px past
  the edge at 766 -> with the pointer centred the sphere's widest phase ~3 px past the bottom, the exact silhouette touching);
  P2B_F2 doc comment rewritten. tsc hero 0. Labs started: :5174 LANE (pid in fix2/lab.pid), :5194 frozen fix-1 (fix2/f1lab.pid).
- 07:55 CPU model (fix2/py/cscan6.py, an/cscan6_k0853.txt; ring A 0.6 m, camera share 0.853, ref scaled to this zoom
  353/420/436 px): fix1 crystals (burst + hold spread) calib 430/522/592, big 27.1, sphere A +0.080; fix1 widening without burst /
  spread 356/434/457, big 22.5, sphere A -0.150 / B -0.190; 16 Nov fix-2 crystals (front split, no burst / spread) 354/430/453,
  big 22.6, sphere A -0.156 / B -0.190; rest belt 354/421/480, sphere A -0.549. => without the burst / spread the swarm matches
  the reference's shape at this zoom, but at A 0.6 m the belts are no longer sphere-safe (fix 1's +0.08 relied on the round-10
  hold spread x1.072 across + the burst throw). Belt A's radial crystals (axis 0.79 radial, half 0.42 m, radius 0.11) reach
  ~0.4 m inside the belt radius. Running: wider separable scan (cscan7.py, sphere >= 0.03 m) and batch v2a (pinned t26 / t13
  default, frameMargin -0.02 / -0.04, fix-1 crystals at the new camera; fcap2 live capsule + exact bounds).
- 08:10 v2a (pinned, judge's pin; fix2/an/v2a_runsum.txt, v2a_pinned.txt), ring A 0.6 m, crystals = 16 Nov fix-2 (front split, no
  burst / spread): default m -0.03: holdShare 0.853, sustain 119-121 px/m (judge fix 1: 112-113; ref 132-133), A 0.594-0.600 m,
  exact silhouettes t26 T30.5 B749.0 / t13 T25.5 B755.8 (inside); srad t26 346/428/449, t13 344/426/449 (ref 387/460/477: now
  NARROWER); sbig big 22.5 / 21.2 (ref 16.3); capsule t26 1 tick -0.004 m (a graze) -> not acceptable. m -0.02: 0.837, 118-120
  px/m, B745.6; m -0.04: 0.869, 120-123 px/m, B752.4. Fix-1 crystals at the new camera (f1x_t26): srad 434/523/595, big 23.5,
  capsule 0 hits (+0.232).
- 08:15 CPU model scan (cscan7.py / cfine.py, an/cscan7_k0853.txt, an/cfine.txt): with no burst / spread, sphere-safe at A 0.6
  needs belt A >= 16 % across, >= 20 % behind, >= 10 % in front (its radial crystals); belt B's front must then stay outside belt
  A's at the crossing. Chosen A (0.16 across, 0.3 behind, 0.1 front), B (0, 0.4 behind, 0.25 front): sphere A +0.106 / B +0.184 m,
  crossing +0.091 m (real phases) / +0.367 (pinned), model calib 382/465/495 px (ref 387/460/477), big 24.7 (model).
  CODE: HoldR11 shardOutA / shardOutB conditional on P2B_F2 ([0.16, 0.3] / [0, 0.4]; fix 1 unchanged under ?spin=f1),
  shardFrontA 0.1 / shardFrontB 0.25. tsc hero 0. Next: v2a2 (pinned t26 / t13 + ?spin=f1 t26 A/B) and v2b (H-G2: 28 presses
  at 4 screens + 4 pointer-edge holds, live capsule + exact silhouettes).
- (clock check 08:05 real time: the entries stamped 08:10 / 08:15 above were estimates and ran ahead ~10 min; order unchanged.)
- 08:16 v2a2 (pinned, judge's pin, new crystal belts A (0.16, 0.3 behind, 0.1 front) / B (0, 0.4, 0.25), no burst / spread, m -0.03;
  fix2/an/v2a2_runsum.txt, v2a2_pinned.txt): srad t26 375/462/494, t13 368/459/494 (ref 387/460/477; judge's fix 1 403/486/550:
  p90 +15 % -> +3.6 %); sbig small/mid/big t26 14.9/14.5/24.2, t13 8.0/13.1/23.5 (ref 20.8/17.0/16.3; fix 1 15.0/16.0/23.2);
  svnorm 0.686 / 0.572 (ref 0.694, fix 1 0.748); capsule 0 hits (min +0.232 / +0.155 m); belt A-B +0.461 m in the hold;
  119-121 px/m; exact silhouettes inside (B749.0 / 755.8). Big class per px/m (m / frame at the orb): 0.200 vs fix 1 0.205 vs ref
  0.123 -> the residual is the crystal population (front crystals = the big ones), as the judge's hint assigns to the crystal owner.
- 08:12 same-tool camera check (fix2/py/bgshift.py on v1c h10_t26 30 fps frames, an/eng_v1c_bgshift_44_128.txt; F = 323 +
  (tick - 30) / 2): the engine's lunge F354-F358 per frame 12.8 / 40.4 / 20.1 / 9.1 / 6.1 px vs the reference's 13.1 / 38.7 / 18.9
  / 8.6 / 5.7 (an/ref_bgshift_348_372.txt) -> the lunge timing matches frame by frame (judge nit 5's "too fast" not supported by
  the background-shift measure). The creep F330-F348: engine ~0 with -0.5 px of back-off over F332-F340 then 0.1 -> 1.3 px / frame
  (3.8 px by F348) vs the reference's monotone 0.1 -> 2.1 px / frame (14.1 px): the hover push-in's release eats the creep.
- 08:22 v2b H-G2 (fix2/an/v2b_bounds.txt; 32 unpinned runs, exact silhouettes every 3rd vertex, every tick, live capsule): 1440x766
  (16 presses tau 0..3.75 x 6.25 s + 4 holds with the pointer at the corners / top / bottom) worst L353.1 T24.2 R1094.5 B763.1:
  the opened A touches the bottom edge (2.9 px) at its widest phase, inside everywhere; 1280x800 B763.5 (36.5 px); 1920x1080
  B1059.8 (20.2 px); 390x844 L-21.5 R417.7 (the hotfix's accepted portrait side crop, unchanged: no hold dolly there). A opening
  0.59994..0.60004 m in all 32 (constant, no guard), B 0.1. Crystal-in-piece hits 0 in all 32 (min +0.123 m); belt A-B >= +0.149 m.
  v2a2 f1_t26 (`?spin=f1`, same session): 112-113 px/m, srad 403/486/550, sbig 14.8/15.8/22.9, svnorm 0.739 = the judge's fix-1
  numbers (both minors reproduced with the judge's tools). LOOKED AT eyes/crystals_pinned_ref_fix2_fix1.jpg (ref | fix 2 | fix 1,
  F392-F440, same crystal phases): fix 2's sculpture is larger (121 vs 113 px/m) and its crystals hug it; fix 1's far top-right
  crystals at F424 / F440 are gone. Running v2c (motion set with 30 fps shots) and jc.zsh (switch identity, jcmp3 pinned).
- 08:35 v2c (motion set, 30 fps shots; fix2/an/v2c_*): h10_t26 / h10_t06 (judge's jan2 via fix2/tools/jan2f.py): C -90 -> -18,
  D +45 -> +9 deg/s, 0 sign flips, max |dw| 3.05 / 1.53 per tick; A 0 flips (|dw| <= 8.2, its idle precession), B 0 flips; pieces =
  ring rotation (0.00 deg), |local z| <= 3.2e-5 m, offset direction <= 0.28 deg, A's four quarters equal to 2.4e-5 m; opening share
  1.00 at F372-F442 (0.362 / 0.494 / 0.570 / 0.600 m, constant 0.600 from F436 to the release); crystals 1 -> 0.5 -> 1 (step 0.0212);
  uOut / uOutF ramp step <= 0.0315 / tick; uShatter 0, uHold 0; holdShare 0.853, 119-121 px/m; exact silhouettes in the hold T30.2
  B757.8; capsule 0 hits (min +0.122 / +0.143 m). LOOKED AT eyes/fix2_h10_t26_every05.jpg (press -> 10 s hold -> release every
  0.5 s: continuous, one ring turning slowly, opened A filling the frame's height at t+6-7 s), eyes/ref_F436_F440_vs_fix2_fix1_tick400.jpg
  (open frame: fix 2's A spans the frame's height like the reference's F436 / F440; fix 1 visibly smaller), eyes/fix2_bottom_touch_t414_416.jpg
  (the widest phase: A's bottom arc ~8 px above the bottom edge, as the reference's F440 / F444 bottom arcs).
- 08:36 switch identity (fix2/caps/j/*/log.txt, jcmp3 pinned, shards visible): j1 `?spin=hf` vs MAIN :5173 and j2 `?spin=f1` vs the
  frozen fix-1 build :5194: 25 / 26 pixel-identical each (camdiff 0, gqdiff 0; p06 max 9 on 0.000 % of px in j1, as fix 1's j1);
  the 26th is live_F358_t1.1 (mid-lunge, camdiff 2.1e-3, gqdiff 0) = the documented harness flicker (performance.now() pointer speed).
- (clock check 08:22 real time: the entries stamped 08:35 / 08:36 above were estimates ~13 min ahead; order unchanged.)
- 08:20 v2c rest (fix2/an/v2c_*_jan.txt, v2c_runsum.txt): rp035_t20 (release + re-press 0.35 s): 0 flips any ring, pieces exact,
  max |dw| A 8.4 / B 6.2 / C 3.05 / D 1.53, opening 0.6 constant, capsule 0 hits (+0.152); click_t10 (0.15 s): inert (no opening, camera
  step <= 1.3 mm / tick, spin 1, crystals rate 1); h20_t06: opening share 1.00 F372-F442, 0.6 constant to the release, 0 flips, 0 hits
  (+0.143), exact silhouettes T29.9 B757.8. Switch identity complete (fix2/caps/j): j3 `?spin=p2b` 12 / 13, j4 `?spin=f2` 17 / 17,
  j5 `?hold=r10` 16 / 17, j6 `?spin=s3` 12 / 13 (each vs MAIN with the same query), j7 default rest + pointer vs MAIN 13 / 13; every
  non-identical shot is live_F358_t1.1 (gqdiff 0, camdiff 1.3-2.7e-4: harness flicker); j8 default hold vs MAIN differs only by the
  new framing (camdiff 0.76-0.99 m in the hold, gqdiff 0: ring rotations identical) and the crystals.
- 08:22 CODE (nit 5b, the creep's back-off; P2B_F2 only): Choreography.ts imports P2B_F2; `tiltHand` (the hover push-in when the
  rotating hold starts, set in setPhase("expand")); after the camVel update, in the r11 expand phase (not under debug poses): tilt =
  tiltHand x (1 - camExpand) / (1 - camFrom), spring value / target / velocity set to it (so the release's spring continues from
  it). The push-in hands over to the dolly instead of springing back at the arm; the full-hold pose is unchanged (0 at camExpand 1),
  so frameShare and the sustain are untouched. tsc hero 0; Choreography.ts was == BASE (backup fix2/src_f1/Choreography.ts).
  Next: v2d (h10_t26 30 fps shots, rp035, short 1.2 s press, click; same specs as the judge) -> campath + bgshift before / after.
- 08:26 v2d (creep before / after, same framing 0.853; fix2/an/creep_bgshift_table.txt, v2d_h10_t26_cam.txt, v2c_h10_t26_cam.txt):
  camera distance from the arm (tick 45) on: BEFORE backs off 19.969 -> 20.068 m (ticks 48-69) then comes in; AFTER decreases on
  every tick (0 increasing ticks over the first 2.5 s: 19.977 -> 19.408 m at F348.5 -> lunge). Background shift per frame F330-F348
  (bgshift.py, strip x 0-300): BEFORE 0.0 .. -0.2 (back-off F334-F340) then 0.1 -> 1.0, AFTER monotone 0.0, 0.1 .. 1.4 (9.7 px by
  F348), reference monotone 0.1 -> 2.1 (14.1 px; at this framing's 0.853 share ~12). Lunge F354-F358 BEFORE 10.8 / 33.6 / 16.7 / 7.6,
  AFTER 9.9 / 31.2 / 15.1 / 6.6 (the reference's shape, peak F355 -> F356; amplitude x0.85 = the fixed framing), fix 1 (0.734)
  9.0 / 28.5 / 14.0 / 6.2, full dolly (v1c) 12.8 / 40.4 / 20.1 / 9.1 vs reference 13.1 / 38.7 / 18.9 / 8.6. The first 3.5 mm step at
  the arm is the curve's own start (identical before / after). Release (h10 tick 630), re-press (rp035 tick 306), click: steps
  continuous, identical pattern before / after; p12 (release mid-lunge) continuous.
- 08:27 CODE tweak: the push-in's rate carried into the release's spring is limited to the spring's own critically damped return
  (-omega x value), so a release at the lunge's peak cannot drive the push-in through 0 (model: 1.1 s press -> undershoot to -0.15,
  clamped). tsc hero 0. T0 / T2 smoke ran during the edits (no page errors) -> re-run at the end. v2e running (1.1 / 1.2 / 2.0 s
  presses, re-press 0.35 / 0.10 s, 10 s hold).
- 08:38 v2e (final code incl. the rate bound; fix2/an/v2e_*_jan.txt): presses of 1.1 s (release at the lunge's peak), 1.2 s, 2.0 s, 10 s:
  0 ticks where the camera backs off during the hold's dolly (ce < 0.95); re-presses 0.35 / 0.10 s: 3 ticks each (0.022 / 0.084 m)
  = the release's momentum carried into the re-pressed hold (camKick, pre-existing, steps 48 -> 2 -> 12 mm: a smooth reversal).
  Every ring 0 sign flips in all 6 runs (24 / 24), pieces = ring rotation (0.00 deg, |z| <= 3.2e-5 m). Camera steps at every phase
  change continuous (arm 0.4 -> 3.5 -> 2.6 mm: the curve's own start, identical before the change; releases 0 -> 44 -> 83 mm).
  LOOKED AT eyes/fix2_p11_release_at_lunge.jpg (release at the lunge's peak, every 4 ticks: lunge in, smooth pull back, rings
  turning on, no snap). README.md motion paragraph rewritten for the final fix 2 (no lab rebuild: not in the bundle graph).
  HANDOFF section 10 (10.1) appended. Running the final re-checks: jc.zsh (switch identity, caps/j; the pre-Choreography set kept in
  caps/j_pre_choreo), v2b2 (H-G2 32 runs), v2a3 (pinned t26 / t13 + ?spin=f1), T0 / T2 smoke (caps/smoke2_*). tsc hero 0.
- (clock check 08:32 real time: the v2e entry stamped 08:38 above was written at 08:32; from here real times from date.)
- 08:36 final re-checks (code = final): v2a3 pinned (an/v2a3_*): c2_t26 srad 375/462/494, sbig 14.7/14.7/24.1, svnorm 0.689; c2_t13
  368/459/494, 9.1/13.2/23.5, 0.580; `?spin=f1` 403/489/550, 15.2/15.9/23.3, 0.743 (= judge's fix 1); 119-121 px/m (f1 112-113);
  capsule 0 hits. v2b2 H-G2 (an/v2b2_bounds.txt): identical to v2b (1440 worst B763.1 at t+3.22 s, before the 3 % ease-back; 1280
  B763.5; 1920 B1059.9; 390 the hotfix's side crop -21.7 / -27.9), A 0.59994..0.60004 m, 0 crystal-in-piece hits (min +0.141 m),
  belt A-B >= +0.126 m. LOOKED AT eyes/final_hold_t26_vs_ref.jpg (reference F336-F440 next to the final build: the creep and the
  lunge bring the sculpture to the reference's size progression F348-F364; the sustain sits at ~0.91x; arrangement = the rotating
  hold, nit 3). Load 23-28 (another lane); jc_final and T0 / T2 smoke still queued / running.
- 08:41-08:44 switch identity on the final code (fix2/caps/j, the pre-Choreography set kept in caps/j_pre_choreo): `?spin=hf` vs MAIN
  26 / 26; `?spin=f1` vs frozen fix 1 24 / 26 (live F358 t1.1 / t3.3, camdiff 2.1e-3 / 4e-7, gqdiff 0) and 8 / 8 in two repeats of the
  live group (fix2/caps/jn/f1_vs_f1lab_live_b / _c, camdiff <= 4e-7) + the frozen build vs itself 8 / 8 = harness flicker; p2b 13 / 13,
  f2 17 / 17, r10 17 / 17, s3 13 / 13, default rest + pointer vs MAIN 13 / 13; default hold vs MAIN = the new framing (camdiff 0.76-0.99 m,
  gqdiff 0) + crystals. T0 / T2 smoke on the final code: no page errors, eyes/final_tiers_T0_T2.jpg looked at. tsc hero 0, tsc -p . 0
  (logs/tsc_*_final.txt), tsconfig.tsbuildinfo restored from BASE. HoldR11 P2B_F2 doc comment updated (comments only, after the
  captures). HANDOFF section 10 complete (10.1-10.5), status line + section 2 (`?spin=f1`) updated.
- 08:46 extra identity (fix2/caps/j/j9-j11): `?hold=r11a` vs MAIN 17 / 17, ALL-R10 `?env=projected&hold=r10&aphase=r10&ice=r10` vs MAIN
  (same query) 26 / 26, `?idle=r10` 13 / 13 pixel-identical.
- 08:48 FIX ROUND 2 DONE. Labs :5174 (PID 62263) and :5194 (PID 62264, frozen fix 1) STOPPED; :5173 / :3000 still listening (not
  mine). LANE vs BASE: README.md, CameraRig.ts (hotfix), Choreography.ts (fix 2), HeroEngine.ts, HoldR11.ts, Rings.ts (v1 + hotfix),
  Shards.ts (+ HANDOFF.md; tsconfig.tsbuildinfo == BASE). Nothing committed, deployed or uploaded; no .blend touched.
  Summary: MINOR 1 hold 0.84x -> 0.90-0.91x of the reference's scale with A's constant 0.6 m opening kept (lead note), exact
  silhouette touching the bottom edge within 3 px at the widest phase; MINOR 2 crystal swarm p90 550 -> 494 px (ref 477), svnorm
  0.743 -> 0.689 (ref 0.694), no throw / hold spread, 0 crystal-in-piece hits in 32 + 11 runs; big-class speed residual (24 vs 16.3)
  = crystal population (crystal owner); nit 5: lunge matches the reference frame by frame (refuted), creep back-off removed
  (monotone from the arm); nits 3 / 4 / 6 unchanged by decision. `?spin=f1` = fix 1 exactly.

## 2026-11-17 JUDGE round 3 (independent adversarial judge; everything in judge3/)
- 08:5x started. No earlier judge3 state (judge3/ was absent). Read SPEC 0-3, AUTOPILOT, LOG (builder, judge1, hotfix, fix1b, judge2,
  fix2 incl. the 17 Nov resume) and HANDOFF 1-10 (claims only). Next: diff LANE vs BASE / MAIN, read the changed code, start lab :5174,
  fresh captures through the slot.
- 08:54 judge3: LANE = MAIN (v1 + lead hotfix; MAIN app == fix1b/hflab) + fix 1 + fix 2 (HoldR11, Shards, HeroEngine, Choreography,
  README); diffs in judge3/diff/. Reference frames judge1/ref/{loop,state} verified exact against fresh ffmpeg extracts (RMSE 0).
  Code read: C / D idle = q0 Rx(rate tau), tau never wrapped (no loop seam); the r11 hold keeps d.open 0 (block-scoped `open`), so
  no def.open splay; poseRigid in-plane offsets; tiltHand hand-over only in the r11 expand phase. Lab :5174 started by me (PID in
  judge3/lab.pid). Tool judge3/tools/jcap3.mjs (= judge2 jcap2 + tilt / holdShare / uOutF). batch1 (lane idle8, idle8_cd isolated,
  h10_t26 at 30 fps shots; MAIN idle8 / h10_t26) and batch2 (lane h10_t06, rp035, rp010, h20, presses 0.3-2 s, click, hold with a
  pointer sweep, h10 without shards; lane ?spin=f2 = BASE behaviour) queued through the slot.
- 09:04 judge3 first results (fresh, an/lane_idle8.txt, lane_h10_t06.txt, lane_rp035_t20.txt via my own tools/jan3.py): idle C 90.00 /
  D 45.00 deg/s about local X, 0 sign flips, camera-space axis angle monotone (C +90, D -45 deg/s), 0 reversals; hold t06 / rp035:
  C -90 -> -18, D +45 -> +9, 0 body sign flips, pieces = ring rotation 0.00 deg, out of plane <= 3.2e-5 m, A quarters 0.600 m equal
  to 2.4e-5, B 0.100; crystals 1 -> 0.5 -> 1 (step 0.0212), uHold / uShatter 0; holdShare 0.8532; camera lunge step up to 0.88 m per
  tick. Looked at eyes/idle_ref_vs_lane_pairs.jpg (ref vs lane every 9 frames: same configurations), eyes/lane_cd_isolated_idle_0_4s.jpg
  (C / D alone every 0.1 s: continuous flips through edge-on, the near arc passing over), eyes/ref_state_328_472_every8.jpg,
  eyes/lane_h10_t06_every32.jpg. Running: h10_t26 30 fps, rest of batch2, sense test S1 (real renders of C / D with the other half
  nearer, tools/sense.py).
