# P4 round 2 - lane p4hold (BUILDER) - 21 Nov 2026, Asia/Jakarta. Time box 120 min (01:10 - 03:10)
Lane LANES/p4hold (cp -c -R LANES/aa8 at 01:10), lab :5178, WORK $SP/work_p4/p4hold, mirror MAIN/notes/round11/lane_backup/p4r2/p4hold/.
Tasks: Q12 (hold framing), Q13 (pop timing), N-1/R8-1 (loop restart after a context restore), R8-2 (4 MiB panorama in JS memory).
Master switch ?p4hold=0 (whole lane off = aa8/MAIN exactly). Sub-switches: see below.

## 01:10 setup
- cloned aa8 -> p4hold (579 MB, APFS clone). No earlier attempt existed.

## 01:30 read + design
- Read: brief p4r2_common.md, plan Q12 / Q13 + disagreements 1-2, panel issues (composition_motion pop / framing, environment framing),
  AA8 fixer LOG section 5 (N-1) and recheck LOG (R8-1 = N-1, R8-2), CameraRig.ts, HoldR11.ts, Choreography.ts, HeroEngine.ts, assets.ts.
- Q12 numbers (1440x766, tanV 0.2267, 30.0 px/deg at centre): steady share k = 0.853 -> pitch -0.048 + 0.853 x 5.348 = 4.514 deg
  (full 5.300: missing 0.786 deg = 23.2 px). Plan: pitch on kp = camExpand x holdFit, el -= (kp - k)(5.300 - -0.048) deg (keeps
  pitch + el = the orb's screen angle), camera y 2.356 -> 2.166 (A2: ~2.10). dp = pitch + el unchanged, so frameFits changes only
  through the lifted centre's look-at coordinates (el in y0 / z0). Rest (camExpand 0): kp = k = 0, skipped (bit-identical).
  Predicted: far peak ~+22 px (322 -> ~344), floe line ~+15 px (605 -> ~620; the lower camera lifts near water ~8 px).
- Q13: pop0 0.7 -> 0.80, pop1 1.08 -> 0.94, grow0 1.0 -> 0.94 (plan). open(tp 0.9) 0.323 -> 0.481, open(0.94) 0.6; p05 0.872 -> 0.878,
  p06 0.988 -> 0.988. No overshoot (EXPAND_POP 0.79 -> 1 is monotone: an overshoot would be invented).
  Capsule argument: belt widening (shardOutA / B x spreadA) and ring A's push (0.6 x spreadA) both scale with spreadA, and the
  clearance is >= 0 at spreadA 0 and 1 for ANY ring orientation (cfine.py), linear in between -> the timing cannot create a crossing.
- N-1: end the restore with updateRunning() (after the PMREM is rebuilt; while it is pending updateRunning() does not start the loop).
- R8-2 options: (A) AA8 keep the decoded DataTexture 4,194,304 B for the page's life; (B) keep the compressed EXR bytes
  (pano_orb.exr 1,331,194 B) + sync re-decode; (C) re-fetch (cache: force-cache) + re-decode on restore: 0 B kept, async;
  (D) keep only where loss is likely (phones = where memory is tightest: rejected). Plan: (C), measured.
- Switches: ?p4hold=0 (whole lane = aa8), ?holdcam=r11 (Q12 off), ?holdpop=r11 (Q13 off), ?ctxrun=0 (N-1 off), ?panokeep=1 (R8-2 off).
  Q12 / Q13 only on the default steady hold (P2B_F2), so the older-build switches (?spin=f1 / hf / p2b / f2 / s3, ?hold=r10 / r11a) stay exact.

## 01:20-01:35 build 1 (Q12 + Q13 + N-1 + R8-2), lab :5178 pid 29680 (--no-watch), tsc 0 / 0
- probe_cam (T0 0.5, debug poses; ana/probe_cam_1440.txt): p06 camera y 2.356 -> 2.166, pitch 4.587 -> 5.372 (incl. drift; +0.785),
  orb screen (723.4, 393.2) in both (unchanged), holdShare 0.8532 -> 0.8536; p04 spreadA 0.324 -> 0.481, p05 0.872 -> 0.878,
  p06 0.988 -> 0.988; p07 camera y 2.716 -> 2.652 (continuous with camExpand); ?p4hold=0 == :5199 in every number.
- shoot_qc p04-p08 on :5178 and :5199 (caps/h1_lane, h1_main). bgshift.py (block matching on gradients, ana/bgshift_lane_vs_main.txt):
  lane vs MAIN p06: peak +20.0, mountain base +15.0, iceberg +17.7, right shore +15.6, near floes +12.0 px; p05 same; p04 +15 / +11 /
  +13; p07 +4.6 / +2.1. Panel landmarks + shift: floe / base line 605 -> ~620 (gate 615-620), peak 322 -> ~342 (gate ~350),
  iceberg waterline 587 -> ~605 (F420 607), orb (723, 393) (gate 720+-5, 392+-8).
  vs the reference (ana/bgshift_vs_ref.txt; only the peak strip is a clean match): peak MAIN -22.0 / -21.8 / -22.2 px (p06 / p05 /
  p04) -> lane -1.8 / -7.6 / -6.3. Looked at img/p06_left_MAIN_LANE_F420.png and p06_right_...: lane peak ~342 (F420 ~348, MAIN
  ~320), floe line ~610 (F420 ~612), iceberg top ~458 (F420 ~455, MAIN ~440), waterline ~602 (F420 ~605, MAIN ~585).
- Q13 looked at img/p04_hero_MAIN_LANE_F358.png: MAIN one continuous band ("ring skewered by a log"); lane: the band's end blocks
  separate at both ends, crossed slabs, closer to F358 (blocks flying left / right).

## 01:35-01:45 motion + restore checks
- probe_speed (new; stepped deterministic press, pointer pinned on the orb, 4 press moments, ring-piece bbox-corner screen speed px per
  60 Hz frame, ana/speed_press.txt): pop window tp 0.65-1.2 ring A p99 / max MAIN 24.47 / 27.57 -> lane 27.13 / 30.50 (+11 %),
  ring B 19.56 / 21.27 -> 20.00 / 22.05; Q12 alone (?holdpop=r11) A 24.54 / 28.48. Charge, sustain (A p99 8.44 -> 8.47) and
  release unchanged. (Reference pop: quarters ~40 px per 30 fps frame = ~20 px per 60 Hz frame on top of a ~20 px / frame lunge;
  ring-B split 0.219 -> 0.79 in one 30 fps frame. Ours opens at most 0.107 per 60 Hz frame.)
- probe_interact x2 lane / x1 MAIN (ana/interact.txt): click inert (0 drivers, never holding) in all; hold spreadA step max
  0.040 -> 0.107 (= 0.6 x 1.5 / 0.14 / 60, the designed peak); ring deg / frame 3.54 -> 3.53, camera step 0.858 -> 0.863; re-press
  0.048 -> 0.106, release / release 2 unchanged; no errors.
- ctxlive (new, from ctxloss2: live loop, NO visibilitychange; ana/ctxlive.txt (run 1: main row valid, the variant rows parsed
  wrong), ana/ctxlive2.txt): lane restarts by itself, first frame 601.5 ms after the restore, time 8.219 -> 9.743 at +1.5 s, TAA
  valid; ?panokeep=1 543.6 ms (so the re-read costs ~58 ms on top of the restored context's own PMREM / recompile); ?ctxrun=0 and
  ?p4hold=0: no restart (time frozen) = AA8; MAIN :5199: no restart (time frozen 7.742, -1 = no frame within 3 s).
  Looked at img/ctxlive_lane_before_lane_restored_main_restored.png: lane 1.5 s after the restore = the hero with clean rings and
  the ripple ring; MAIN = only the page gradient and the UI. Console: only the intended "[hero] WebGL context lost".
- ctxstep (AA8 judge's stepped tool, my copy waits for __hero.restoring; restoreWait 0-0.1 ms, i.e. done inside its 500 ms;
  ana/ctxstep_cmp.txt), restored vs no-loss px > 16 (max) f0-f3: T1 default 437 (76) / 303 (49) / 212 (48) / 148 (37) = AA8's
  final numbers exactly (the TAA band restart); ?lktaa=0, ?envlake=plate, T0 phone: 0 px differ (bit-exact). GL err 0.
- memprobe (new; CDP after forced GC, product URL, ana/mem.txt): array-buffer backing store MAIN 23,751,194 B (x2), lane
  19,560,957 B (x2; -4,190,237 B = the panorama), ?panokeep=1 23,755,272 B; T0 lane 19,560,965. V8 heap 8.2-8.5 MB in all (noise).
  __hero.panorama: MAIN 4,194,304 B, lane none.

## 01:45-02:15 shapes, idents, perf, QC set, bounds, patch
- probe_cam other shapes (ana/probe_cam_shapes.txt): 390x844 holdFit 0 / share 0 and 1280x800 share 1 -> kp = k, every number equal
  to MAIN; 2560x1080 share 0.450: pitch 2.43 -> 5.37 deg, camera y 2.54 -> 1.66 (-0.88 m), orb (1286, 547) unchanged. Looked at
  img/vp2560_p06_MAIN_top_LANE_bottom.jpg: floe line ~0.75 H -> ~0.85 H (the reference's angles in a vertically cropped wide
  frame land at ~0.88 H), bottom strip clean (floes, water, corner rocks). Flagged as open (judgment call on wide screens).
- ident (identS 20 moving frames; ana/ident_rest.txt, ident_hold.txt): rest T1 / T2 / T0 phone / plate: ?p4hold=0 == :5199 IDENTICAL
  (final, all targets, all 12-16 programs), and the lane default == :5199 at rest (T1, T0). Hold poses (debug pose before the settle):
  p04 / p06 / p07 T1, p06 T2, p06 T0 phone, p06 plate: ?p4hold=0 == :5199 IDENTICAL; ?holdcam=r11&holdpop=r11 (N-1 / R8-2 still on)
  == :5199 IDENTICAL at p04 / p06; lane default DIFFERS at p04 / p06 in final + mirror / walk / cache / cacheN (camera), programs
  identical (no shader change). Console 0 lines in all.
- perf (perfab, real loop, vsync off, 6 interleaved pairs, SLOT_BG=0, loads 4.3-9.4; perf/ab_rest.txt, ab_hold.txt): rest medians
  noisy (busy machine; 21.3-49.6 ms; quietest runs MAIN 21.3 / lane 21.3; rest frames are bit-identical anyway); HOLD (mouse held
  2.5 s before and through the 6 s window, every run confirmed phase expand camExpand 0.967): median of medians 25.4 -> 25.3 ms,
  ratio 0.996 (mean ratio 0.996). No regression.
- QC set qc_r11.zsh -> qc_final (poses + ui, ptr 10, sweep 32, region stats): no page errors; region stats q00 = the panel's within
  1-2 levels (rest is bit-identical to :5199; the panel's capture predates AA8's water). Looked at sweep.jpg, cmp_p05 / p06,
  img/bottom_p06_p05_MAIN_LANE_REF.png: the far slab row now at the strip's top edge as in F420 / F402; the pre-existing G2 crest
  arc sits lower (more grazing), no new artefact.
- probe_holdbounds (16 press moments, bbox; ana/holdbounds.txt): p06 MAIN T-21 B792 L301 R1137 / lane T-22 B790 L301 R1137 (same);
  p04 MAIN T81 B678 L406 R1060 / lane T69 B686 L398 R1070 (wider pop, inside).
- Capsule test (cfine.py) is gone with work2. Argument (corrects the 01:30 note): the crystals' distance from the ring centre minus
  ring A's opened sphere radius is convex in spreadA (norm of an affine map minus a linear term) at any fixed orientation; with the
  anisotropic widening (16 % across / 30 % depth) the bulge below the chord is <= ~1.4 mm, against margins of +0.106 m at spreadA 1
  (any orientation, cfine.py) and ~+0.33 m at rest. Both use the same driver d.spreadA, so the pop timing cannot create a crossing.
- Patch p4hold_vs_aa8.patch (4 files, 238 lines, 13 hunks; sha256 2434e13e200cf88a...); apply test on a fresh aa8 clone: dry / apply
  rc 0, no .orig / .rej, applied app == lane app, tsc 0 / 0, clone removed. aa8 app == MAIN app.

## 02:25 STATE (end)
- DONE inside the box. Lab :5178 left running for the judge (pid 29680, --no-watch, built 01:19 from the final source; no source edit
  after it). Lane LANES/p4hold edited only in app/hero/engine/{CameraRig.ts, hero/HoldR11.ts, HeroEngine.ts, assets.ts} + HANDOFF.md.
  MAIN: only notes/round11/lane_backup/p4r2/p4hold/ written. :5199 and every other lab untouched (only opened read-only by the tools).
- Slot batches (all through slot.mjs): probecam, holdposes, speed, interact, ctxlive / ctxlive2, ctxstep, mem, shapes, vp, identI1,
  identI2, perf-rest, perf-hold (SLOT_BG=0), qc (lead:qc / ptr / sweep labels inside qc_r11.zsh), holdbounds.
- Deleted after the analysis: ctx/*.rgba (111 MB; rerun: tools/bctx.sh + rgbacmp). Kept: caps/ (hold captures, 2560x1080, ctxlive
  screenshots), qc_final/, img/, ana/, ident/, perf/. Patch apply-test clone removed.
- Open (HANDOFF "Open"): wide-screen camera drop on 2560x1080 (judgment call), pop +11 % on screen by design, R8-2's production
  cache path; G2 crest arc and the edge-on hold moments are other tasks.

## 02:22 pop strip (after the STATE note; no source change)
- shoot_pop (new; debug poses at tp 0.80 / 0.85 / 0.90 / 0.94 / 1.00 / 1.10, tumble pinned at the panel's p04 tau 3.171; ana/popstrip.txt,
  img/pop_strip_tp080-110_MAIN_top_LANE_bottom.jpg): opening MAIN 0.103 / 0.207 / 0.324 / 0.416 / 0.531 / 0.602, lane 0 / 0.175 /
  0.481 / 0.600 / 0.601 / 0.606, camExpand 0.296 / 0.608 / 0.765 / 0.815 / 0.863 / 0.910 (same in both): the lane's burst sits in the
  lunge and the reference's split window (tp 0.883-0.917). At this tau ring A is near edge-on, so the strip mostly shows the camera.
