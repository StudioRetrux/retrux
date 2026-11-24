# HOLD lane log (round 11), 2026-11-14

Paths: LANE = `$SP/lanes/hold` (worktree at 7ddac0d), WORK = `$SP/work/hold`, lab on :5175 (started by me, PID in `WORK/lab.pid`).
Tools I wrote (all in `WORK/tools/`):
- `hold_probe.mjs`: LIVE press probe. Dispatches real pointerdown / pointerup with the engine clock frozen and advances time with
  `debug.settle()`, so every latch and blend runs exactly as in a live press, deterministically. Measures by projection: per piece
  screen boxes (all vertices), ring-A quarter centre-line midpoint angle / radius / chord, gaps between adjacent arcs (min screen
  distance between projected vertices), extent, orb centre / radius and per-ring orb coverage (rays through the orb disc vs the
  ring triangles). Writes `<shot>.png`, `sbs_<shot>.jpg` (engine with boxes | reference), `results.json`, and a per-frame motion log
  (`motion.json`: max per-piece rotation per 60 Hz frame and screen step, for hold / release / re-press).
- `fit.mjs`: coordinate-descent fitter of the r11 key tables at one reference frame (debug pose, handheld drift off), cost from the
  A2 section 5 / 10 boxes, midpoints, chords, gaps (+ optional smoothness prior). `patch_keys.py` writes values into HoldR11.ts.
- `peval.mjs` (run a JS snippet in the lab page), `sheet.sh` (contact sheets).

## 1. Baseline (today's engine = r10) measured live (`caps/base_key`)
- F420: compact tangle, A midpoints 249-259 px (ref 305-375), orb 28 % visible, live pop F358 camera at 37 % of the dolly (orb r 78 px;
  the reference is at ~78 %: the omega-14 camera springs lag the lunge by ~0.3 s).
- Motion: hold max 14.9 deg / frame (A), release 18.8 deg / frame (A, > 15: the gate fails today), re-press 9.5, release2 13.1.
- F453: A in a pinwheel (gaps on the cardinals, not the diagonals).

## 2. Design (r11, default; `?hold=r10` = the old hold, untouched code path)
New file `app/hero/engine/hero/HoldR11.ts`; small switched hunks in Choreography.ts, Rings.ts, HeroEngine.ts, CameraRig.ts.
- Every ring follows a deterministic target pose that is a function of hold time only, built in a fixed "hold view frame" (z from
  the lifted orb to the CAM_TARGETS.expand camera). The press moment only picks which congruent piece takes which slot: Rings
  latches a symmetry of each ring while its hold weight is exactly 0 (A: 4 quarter turns x flip, chosen nearest the release pose so
  the hand-back to the tumble is the shortest turn; B: 2 x flip, nearest its pop bar; C / D: twist about the axis x flip).
- The tumble clock stops while the hold owns the rings (freeze 0.2-0.4 s into the hold, released in the release hand-over), so the
  hold is an excursion from the charge's eye pose and back: the release returns to that pose.
- Ring A: rigid 120 deg turn about the view axis (-1, 1, -1)/sqrt(3) (A2 R1) + per-slot push / slide / spin / tilt / roll curves,
  fitted. Ring B: one near edge-on lid (tilt beta, roll rho), halves slide along the cut line (the far half right: the F420 lid sits
  ~60 px left of the orb with the far half's end as the "seam block"; at the pop the bar grows ~1 m). C / D: face-on <-> nearly flat
  (seen from above) on a 1.33 s beat (A2 R7 fits face-on at tp 1.10 / 2.39 / 3.67, flat 1.74 / 3.03): with B seen from below their
  near walls make the F420 lens.
- Choreography: the r11 hold vector is a driver set (blended at phase changes like the others, except at the release, which starts
  exactly from the hold pose); the r11 charge keeps the frontal alignment (no fall back to the tumble) until the hold weights take
  over at 0.28-0.80 s.
- Camera (r11): the hold dolly is applied after the idle / pointer springs through a 1-frame smoothing (omega 60), so it follows the
  measured EXPAND_CAM / RELEASE_CAM; the full-hold pose is identical to r10 (hold plates stay registered). HeroEngine r11 lift 0.39 m
  (orb at y 392 in the sustain, ref (720, 392)).

## 3. Iterations (numbers from hold_probe / fit)
- r11a (first model): F420 midpoints 3/379, 118/335, -177/324, -62/299 (ref 2/375, 117/333, 185/311, 302/305), orb (722, 392) 3 %
  visible; arcs thin face-on ribbons, A-R chord -82 (ref -62): the slide rotated the quarter -> added spin (slide + opposite spin =
  translation) and roll / tilt per slot.
- F420 fit: cost 925 -> 185. Gaps 88 / 9 / 98 / 12 (ref 88 / <=10 / 80-100 / <=15). Boxes within ~20 px except A-T's right end (+59).
- F440 fit: cost 980 -> 166, gaps 94 / 45 / 76 / 55 (ref 85-95 / 40-45 / 70-75 / 45-55), boxes within ~23 px.
- F404 fit: unconstrained fit overfitted low-confidence A-L (tilt -74, spin swing 50 deg in 0.5 s); refit with a smoothness prior
  (cost 251, open sky at the bottom-left 298 px, ref ~300).
- F358 fit: B's split must be ~1 m at the pop (GLB is 79 % open at F358, our EXPAND_POP driver 50 %: share curve 1.8 there);
  a fit with beta -24 made B a curved "C" (box right, shape wrong) -> beta -5 (straight bar, as the reference). A-R translated
  7 deg clockwise at the pop (the reference bar is centred ~33 px right of the orb).
- Orb visible (live): F358 12 % (ref ~8), F404 69 % (ref 75), F412 57 (60), F420 3 (15), F428 15 (30), F440 44 (50), F452 100.
- Release trace: B / C / D land on today's whirl (B 30 deg, C 40, D 38 at F453), A face-on (5 deg off the live camera axis).
  Found and fixed: the phase blend delayed the r11 release by ~0.1 s (no hold-vector blend at pointer-up now).
- Long hold: all curves went constant after 4.6 s (A and B would freeze) -> added a bounded breathing layer from tp 3.6-4.6 on.

## 4. Final state (code as handed off; lab stopped)
- H-G1: `caps/HG1_table_final4.txt` (evaluator `tools/hg1_eval.py` on `caps/final4/results.json`): 56 of 65 checks pass.
  Remaining misses: A-T box at F402 / F404 / F420 (right end +60..+107 px), A-R x0 at F402 / F404 (-30 px), F402 open sky 251 (ref
  ~300), F384 A-T y1 +33, F358 right block x0 -31, F358 orb 12 % (ref <= 10). Tried for A-T: roll -45 (cost 733) and +40 (244) vs 185:
  no gain; a hinge about its left cap is the next idea.
- Late fixes: r11 dolly follows camExpand exactly (omega-60 smoothing still lagged the lunge: live F358 orb r 92 -> ~95 px, F358
  extent / bar / B diagonal / left block now pass); release gap curve 0.24 / 0.21 / 0.215 / 0.08 / 0 (F452 r <= 240, gaps 39; F453
  gaps 26); A-L slide -16.8 / spin 15.3 at F420 (6:40 gap 102 -> in range); pushB 0.92 at the pop tried and reverted (extent
  centre moved 20 px right); r11 idle pivots exactly at rest.
- H-G2: exact extents over 16 press moments: worst top 12 / bottom 735 (1440x766), 73 / 712 (1280x800), 49 / 1008 (1920x1080);
  stock probe_holdbounds (bbox corners) -5 / 746 at F440: the corners overestimate tilted arcs by 20-50 px.
- H-G3: probe_interact click inert, worst 11.5 deg / frame (baseline 15.3); 60 Hz live log max 13.5 (hold / release), 11.4
  (re-press), 13.2 (release 2); least motion per 0.5 s window A 79 B 20 C 43.5 D 43.5.
- H-G4: lane ?hold=r10 vs MAIN, 22 shots: max 1 LSB, mean <= 0.495 (grain). H-G5: lane r11 vs MAIN rest + pointer: max 1, mean <= 0.487.
- Typecheck: hero and project configs, 0 errors. Lab on :5175 stopped (PID 12148).

## 5. Step 2 (2026-11-14 evening): SPEC 4.2 finish
Lab on :5175 restarted by me (PID in `WORK/lab.pid`).

### 5.1 Ring A's in-plane phase at rest (lead decision 1): measured
- Tools: `tools/aphase_probe.mjs` (poses the idle loop like shoot_qc q00 at any tau, projects each A quarter's cut planes from
  its vertices; dumps the group and camera matrices; optional flat-colour captures of the four quarters) and, in `aphase/`,
  `seamproj.py` (offline projection of the cut planes for any in-plane offset), `overlay.py` (cut planes drawn on the reference:
  red = near side, cyan = far side), `fitphase.py` / `fitphase_fine.py` (fit), `bars.py` (column dips along band A).
  All 121 frames of Default Loop.mp4 extracted to `aphase/loop/L000-L120.png`.
- Geometry: each A quarter spans exactly +-45 deg about its centre (0 / 90 / 180 / -90 in the face-on frame): joints at
  45 / 135 / 225 / 315 deg, r 1.979-2.401 m, section height +-0.421 m. Flat-colour capture at tau 0 confirms the projection
  (`aphase/eng_loop/flatd0_t0.000.png`, `aphase/flat_vs_L000.png`).
- Today's engine (offset 0) at tau 0: joints at x 553 (near, left end), 663 (far, back centre), 796 (near, front), 881 (far):
  the twin's dips at 666 / 799 are exactly the back and front joints. The mocap's A frame has its local x at -67.5 deg in the
  ground plane, so the joints sit at -22.5 / 67.5 / 157.5 / 247.5 deg.
- Reference: dark bars along band A at x 575 and 869 in loop F000, F030, F060 and F090 (all four edge-on moments; ref_F000 of
  the State video has them ~10 px further right, 585 / 878). With an offset of -22.5 deg the near joints' outer edges project
  to 573 / 871 (F000), 576 / 874 (F030), 573 / 871 (F060), 576 / 874 (F090): within 2-5 px. Only the symmetric phase puts the
  bars at the same x at t 0 and t 1 (A is flipped between them), and -22.5 is that phase.
- Fit over all 121 frames (mean local darkness of the reference along the projected joint lines, offset -45..45): one sharp peak
  at -22.4 deg (score 9.29 vs 5.3-6.3 elsewhere; near joints only: -22.7). Per 1/3 s window peaks: median -23.0, sd 1.05 deg,
  linear drift +0.22 deg/s (0.9 deg over the loop, noise): **no rate correction**. Overlays at F007 / F015 / F022 / F037 / F052
  show the visible joints (front band's cut end at F037, the oval's diagonal joints at F015) on the -22.5 quads.
- Decision: ring A's in-plane offset **-22.5 deg** (the joints at +-45 / +-135 deg at tau 0: the artist's stored seam angles,
  video_choreography's table), constant, rate 0. (The lead's "about 45 deg" was an estimate; 45 is the largest possible.)
- Code so far: `Rings.tune.aPhaseDeg` / `aPhaseRate` (0 = today's phase exactly, the multiply is skipped), applied to A's mocap
  quaternion as q * Rz(offset). Next: the `?aphase` switch (default -22.5, `?aphase=r10` and `?hold=r10` = 0), then the hold
  checks with the new phase (pop swing, A2 arrangement, release).
- Implemented (all typecheck clean): `HoldR11.ts` `A_PHASE_DEG = -22.5` and `aPhaseFromUrl()` (0 with `?aphase=r10` or
  `?hold=r10`); `Rings.tune.aLoopPhaseDeg` / `aLoopPhaseRate` (named so to avoid the r10 hold's own `tune.aPhaseDeg`), applied as
  q * Rz(offset) right after the mocap slerp of ring A, skipped when 0; HeroEngine sets `rings.tune.aLoopPhaseDeg = aPhaseFromUrl()`.
- Verified (`aphase/eng_new`, `eng_ap10q`, `eng_h10q`, `aphase/flat_new_vs_ref.png`): default tau 0 joints near 572-601 / 843-871
  (ref bars 575 / 869 on their outer edges), far 598-619 / 830-852; `?aphase=r10` and `?hold=r10`: 535-570 / 658-669 / 788-804 /
  866-896 (round 10 exactly). The flat-colour capture shows the front quarter now centred between the two reference bars.
- Press / release with the new phase (`tools/press_swing.mjs`, 16 press moments tau 0-3.75, `aphase/swing_new.txt` vs
  `swing_old.txt`): ring A's twist about its own axis over the press (0-1.2 s) mean 130.0 deg (old 129.9), worst 158.7 (old
  171.0), worst per-frame quarter turn 12.26 deg in both; per press moment the twist moves by about +-19 deg (the latch picks
  the nearest symmetry, so the offset only shifts which press moments swing more). Release twist mean 71.1 (old 77.6). The
  release hand-back (alignA and wA fading together at tr 0.73-0.83 s) touches the 15 deg/frame turn limit (MAX_TURN) at 6 of
  16 press moments with the new phase and 7 of 16 with the old one: pre-existing, not caused by the phase (`rel_steps.js`).
- Next: (2) the remaining H-G1 misses (A-T right end at F402-F420, A-R left edge F402-F404, F402 open sky, F384 A-T bottom,
  F358 right block and orb share), starting with a hinge rotation of A-T about its left cap.

### 5.2 H-G1 misses (item 2): hinge for A-T, refits, release hand-back
- New hold keys `hngT/L/B/R` (HoldR11.ts; tables for T and R, zero elsewhere): a rigid turn of the quarter about the line through
  its counter-clockwise cap that lies in the hold view's screen plane (`HOLD_TUNE.hingeAxisDeg`, 0 = vertical), mapped back
  into the canonical slot frame through targetA's roll and turn (Rings.poseR11). + = the free end towards the camera (its cut
  face turns to the camera, the arc is foreshortened). Faded in the release like tilt / roll. A first version (axis = the
  slot radial) mostly tilted the arc in the screen plane: replaced.
- Fitter: `tools/fit_nm.mjs` (Nelder-Mead; `GATE=1` = H-G1 tolerances: box dead zone 16 px, r 16, th 6 deg, F420 gaps inside
  the gate; `SET_TP` = change keys at another time than the evaluated one; a prior on chosen keys). `tools/fit2.mjs` =
  coordinate descent with the gate's TR gap. Backup of the pre-hinge files: `backup/*_step2_prehinge.ts`.
  - F420 (tp 2.97): coordinate descent kept A-T's x1 at 808-827 (the 88 px T-R gap target fought it); with the gate
    tolerances NM found hngT 11.5 / tiltT 21 (A-T box (372,63,781,231)); with tiltT held at 12 (smaller rock) hngT 12.1, sigT
    -9.7, spinT -6.7, pushT 0.21, rollT -7: box (394,64,782,235), T-R gap 105, all F420 rows pass. A-R refit at 2.97: sigR -14.5,
    spinR 10.8, pushR 0.569, tiltR -11.
  - F404 (tp 2.43): hngT 10.1, sigT -6.1, spinT -13.8, pushT 0.151, tiltT -4.7, rollT -6.3; A-R sigR -21, spinR 16.8, pushR 0.1,
    tiltR -20, rollR -5.6: A-T (371,142,668,317), A-R (736,165,1107,548) ch -44 (both pass, live).
  - F402 (tp 2.37) via the 2.17 keys with a prior: hngT 4.1, tiltT 0, pushT 0.35, sigT -11.8, pushL 0.431, sigL -33.2, spinL 22.9,
    pushB 0.315, sigB 5.1 (an unconstrained fit wanted sigL -61 and sigT -25: a back-and-forth swing, rejected).
  - F440 (tp 3.63): hngT 6.6, sigT -1.3, spinT -11.7, pushT 0.445, tiltT -6.3, rollT 22.1 (A-T box (415,15,881,169)).
    3.23 keys re-interpolated (39.4 % of the way 2.97 -> 3.63) so F428 has no wobble; hngT 9.9 at 3.23, 5 at 4.6.
  - Live (`caps/h3`, hold_probe, press tau 2.6): misses left F358 right block (954 vs 985 +-25) and orb 12 %, F384 A-T y1 423,
    F453 diagonal gap 24 (limit 25). F402 / F404 / F420 / F440 rows all pass.
- Release hand-back (found while checking the phase): `RELEASE_LEN` 0.8 s ended the release phase while alignA and the r11 hold
  weight were still fading (to 0.85 s): the last ~10 % of ring A's hand-back landed in one frame (the 15 deg/frame limit at
  tr 0.80). r11 now: release phase 1.05 s, ring A's hand-back (alignA's fall, wA, freeze) 0.55-1.0 s (r10 untouched). Over 16 press
  moments (`aphase/swing_new2.txt`, `swing_old2.txt`): release max per-frame quarter turn 12.31 deg (new phase) / 12.15 (old
  phase), median 6.6 (was 15.0 = the limit at 6-7 of 16 moments); press unchanged (max 12.26).
- Next: re-run the full H-G1 set + motion, look at F358 / F384, sequence sheets F332-F472, then H-G2..H-G5, perf, handoff.
- F384 (tp 1.77, prior on today's values): sigT -6, spinT -6.2, pushT 0.497, tiltT 5.3, rollT -2.8: A-T block (336,236,551,403) passes.
- F358 (tp 0.9): right end block (slot B) pushB 0.758, sigB 2.5, spinB 4.1, tiltB -2.6, rollB -2.9: (968,297,1088,408) passes;
  orb share: tilting the A bar (tiltR +-10) changed nothing (12-13 %); betaB -10 at 0.9 (and -10.5 at 1.37, monotone) gives 10 %
  with B's box (497,172,939,599) still on the diagonal. F453: gapRel 0.23 at 0.333 (gaps 26-27 px, r 215-219).
- `caps/h4` (before the F358 / F453 changes): 62 / 65 with release max 11.0 deg/frame (step 1: 13.5). Backup `backup/HoldR11_h6.ts`.
- Full live run `caps/final5` (press tau 2.6, `caps/HG1_table_final5.txt`): **64 of 65 PASS**; the one miss is F358 orb 11 % visible
  (limit 10; 10 % with a 24x24 ray grid, the gate uses 16x16; reference ~8 %). betaB -13 at the pop did not help (11 %): kept -10.
  Motion (60 Hz, live): hold max 13.46 deg/frame (C in the charge, inherited), release 11.02, re-press 11.08, release 2 11.95;
  least motion per 0.5 s of the sustain A 84, B 19.7, C 43.5, D 43.5 (never frozen).
- Sequence F332-F472 every 4 frames, engine row over reference row: `caps/seq5_sheet_a.jpg` (F332-F400), `caps/seq5_sheet_b.jpg`
  (F404-F472). Looked at both: the charge's frontal eye F336-F344, the pop F356-F360, the exploded opening F380-F424 and the
  open ring of four arcs with the lens F428-F444 follow the reference frame for frame; A closes F452-F456 and the tumble resumes
  F460-F472; continuous, nothing tangled. The engine's arcs still read thinner and smoother than the reference's chunky slabs
  (ice geometry / material: ICE lane).
- H-G2 (`caps/HG2_exact_step2.txt`, exact silhouette = every 3rd projected vertex of the subdivided meshes, live presses, 16
  press moments tau 0-7.5): 1440x766 worst top 12 (F440) / bottom 735 (F444) / left 343 / right 1150; F420 top 60; long holds
  5 / 8 / 9.5 / 11 s top 19 / 27 / 27 / 18, bottom <= 737. 1280x800 top 70 / bottom 713; 1920x1080 top 46 / bottom 1009. All inside,
  spread over press moments <= 8 px. Stock probe_holdbounds (bounding-box corners, debug pose, for information,
  `caps/HG2_stock_step2.txt`): 1440x766 top 14 / -7 / 5 / -10 at t 2.97 / 3.63 / 5.0 / 9.5, bottom 703 / 746 / 756 / 744;
  1280x800 top 54 / bottom 723; 1920x1080 top 21 / bottom 1024.

### 5.3 Resume after the network outage (2026-11-15 03:51)
- The first attempt at step 2 stopped at about 22:38 after `caps/final5` (64 of 65) and the H-G2 exact / stock runs; `cmp2/HG4.txt`
  (22:23, lane `?hold=r10` vs MAIN, after all step 2 code changes) already shows max 1 LSB on every shot.
- Code state on resume = `git -C LANE diff` + `HoldR11.ts` as described in 5.1 / 5.2 (no further edits were lost).
- Lab on :5175 restarted by me (PID in `WORK/lab.pid`). Left to do: the F358 orb share (11 %, limit 10), then the final fresh
  H-G1..H-G5 run, perf (SLOT_BG=0, >= 6 interleaved A/B pairs), typecheck, HANDOFF.md, stop the lab.
- F358 orb share (tool `tools/orbmap.mjs`: live press, the coverage grid's open cells, ring B's screen centre line by PCA,
  flat-colour captures; results in `cmp3/orb358_*`, `cmp3/orb_push`). Base: 10.6 % (20 of 188 rays): a bottom patch
  (681-765, 458-482) below A's bar plus 3 cells at the top; the reference's patch is (650,440,720,490) (A2), so ours sits
  ~40 px to the right: our B is a slightly open ellipse (beta -10: a "banana", 142 px across) where the reference's B is a solid
  straight bar (~105 px), and our A bar reads ~102 px tall where the reference's reads ~128 px (ice geometry).
  Tried (orb visible at F358): B straight beta -5 / 0 / +5: 11.7 / 14.9 / 15.4 %; B roll -46 / -49 / -52: 11.2 / 10.6 / 10.1 % (B
  steeper than the reference at -52); straight B + steeper roll: 10.1-11.7 %; A bar tilt (tiltR) +10 / +20 (underside shows,
  bar lower): 12.8 / 14.9 %; -10 / -20 (top face shows, the wrong face): 9.6 / 9.0 %; a new whole-ring tip of A (front up, to
  show the underside): 15-30 % (the bar rises but does not get taller; removed again, no code left). **Kept**: A-R pushed
  0.3 m towards the camera at the pop (pushR 0.3 at tp 0.9 / 1.37 / 1.77, was 0 / 0.1 / 0.3): F358 orb 9.0 %, bar 452 px long
  (ref 470, was 441), box (522,315,974,474) vs ref (515,290,985,478); F364 bar (526,311,1032,465) vs ref (520,285,1030,445);
  F372 bar (558,309,1070,444) vs ref (550,270,1075,440) (was (553,312,1056,445)); F384 unchanged. Backups of the code before
  this: `backup/HoldR11_resume.ts`, `backup/Rings_resume.ts`. Next: the full fresh H-G1 run (`caps/final6`).
- Fresh full live run with the push (`caps/final6`, `caps/HG1_table_final6.txt`): **65 of 65 PASS** (F358 orb 9 %, bar 451 px);
  motion unchanged (hold 13.46, release 11.02, re-press 11.08, release 2 11.95 deg/frame; least motion A 84 B 19.7 C 43.5 D 43.5).
- Then ring B at the pop made the reference's straight solid bar (`cmp3/orb358_g`, `cmp3/B_364`, `cmp3/F358_Bstraight_cmp.jpg`):
  betaB at tp 0.9 -10 -> -5, rhoB 0.83 / 0.9 -51 / -43 -> -52 / -49 (now monotone to -45 at 1.1). F358: B 110 px thick (ref ~105,
  was a bent 142), centre line (539,172)->(900,603) 50.1 deg (ref (545,195)->(890,595), 49.2; was 45.5), box (515,158,923,616)
  (ref (500,168,935,622), within 15), orb 9.6 % (ref ~8). F356 / F357 B 98 / 103 px (was 113 / 127); F364 B 137 px at 47.1 deg
  (ref ~115 px, -45; was 163 at 48.4), orb 12.8 % (ref ~20, was 11.7); F355, F372, F384 unchanged. Next: re-run caps/final7.
- `caps/final7` (B straight at the pop + the push): **65 of 65 PASS** (`caps/HG1_table_final7.txt`): F358 orb 10 % (9.6 by
  `orbmap`), B box (515,158,923,615); motion hold 13.46 / release 11.02 / re-press 11.08 / release 2 12.45 deg/frame; least
  motion A 84 B 19.7 C 43.5 D 43.5.
- Sequence F332-F472 every 4 frames (`caps/seq7`, sheets `caps/seq7_sheet_a.jpg`, `_b.jpg` (full frames) and hero crops
  `caps/seq7_crop_a.jpg` (F344-F388), `_b.jpg` (F392-F436), `_c.jpg` (F440-F472), engine row over reference row): looked at all.
  The pop cross, the slab cluster, the portal, the open frame of four arcs round the lens, the release and the eye follow the
  reference; continuous, nothing tangled. The charge F344-F352 looked late in the thumbnails, so I measured it
  (`tools/charge_probe.mjs`, `cmp3/charge_a.json`): A's tilt from face-on F344 / F348 / F352 = 42.8 / 68.5 / 88.2 deg (A2: ~44 /
  ~67 / 90), F352 A bar +23 (ref +30), B -72.6 (ref -70), F356 A +9.7 / B -51.6 (ref +10 / -51): on time. An earlier weight ramp
  (0.17-0.70 or 0.20-0.72) lost the eye (A never nearer than 32-36 deg to face-on) and ran ahead at F344-F348: rejected, ramp
  kept at 0.28-0.80. Remaining difference: in the in-betweens F340-F350 our A tips about a near-horizontal screen axis where the
  reference's A keeps its idle tumble (a yaw); the key poses match. Next: H-G2 (exact + stock), H-G3, H-G4, H-G5, perf.
- H-G2 final (`tools/hg2_batch.sh`; `caps/HG2_exact_final.txt`, `caps/HG2_stock_final.txt`, captures `caps/g2_*`): exact
  silhouettes over 16 live press moments, 1440x766 worst top 12 (F440) / bottom 737 (5 s hold), left 343 / right 1150; 1280x800
  top 70 / bottom 713; 1920x1080 top 45 / bottom 1009; long holds 5 / 8 / 9.5 / 11 s top 19 / 27 / 27 / 18; spread over press
  moments <= 8 px: all INSIDE. Stock probe_holdbounds (bounding-box corners, for information): 1440x766 top 14 / -7 / 5 / -10 at
  t 2.97 / 3.63 / 5.0 / 9.5, bottom 703 / 746 / 756 / 744; 1280x800 top 54 / bottom 723; 1920x1080 top 21 / bottom 1024 (same as
  step 2: the pop changes do not reach the sustain). Next: H-G3 stock probe_interact.
- H-G3 stock probe_interact (`caps/HG3_interact_final.txt`, real time, T0 0.5): click inert (no driver moves, never holding);
  ring step per frame (60 Hz normalized) r11 hold 15.25 / release 7.46 / re-press 11.34 / release 2 11.44; MAIN (r10) 15.03 /
  6.73 / 14.42 / 11.15. Real-time frame jitter lets the normalized reading pass the engine's 900 deg/s safety clamp (MAX_TURN,
  15 deg per 60 Hz frame) slightly, so I measured it deterministically: `tools/ringstep.mjs` (the same quantity, exact 60 Hz
  steps, the probe's sequence: hold 2.5 s, release, re-press after 0.3 s for 1.2 s, release), 32 press moments (tau 0-3.875):
  `cmp3/ringstep_r11.json` / `_r10.json`. Worst step never exceeds 15.00 (the clamp); press moments that reach the clamp:
  r11 hold 4/32 (ring C in the charge's frontal pass, 0.42-0.45 s after the press), release 0/32 (max 14.59), re-press 14/32,
  release after the re-press 8/32; r10: 9/32, 13/32, 23/32, 10/32. Medians r11 11.5 / 9.0 / 13.9 / 13.2, r10 12.8 / 13.7 / 15.0 /
  13.6. Tried a longer r11 charge alignment (0.30 / 0.36 s instead of 0.22): hold clamp hits 3 / 2 of 32, re-press 14 / 11:
  small gain, later eye; reverted (code back to `backup/*_prealign.ts`, identical to before).
- H-G4 / H-G5 final (`cmp4/`, `tools/cmp_shots.mjs`: time, tumble clock, orb plasma frame, grain frame pinned, shards hidden):
  H-G4 lane `?hold=r10` vs MAIN, 22 shots (q00-q03, 9 pointer spots, p04-p08, live F358 / F420 / F453 / F460): max 1 LSB on
  every shot, mean <= 0.479/255 (`cmp4/HG4.txt`). H-G5 (`cmp4/HG5.txt`): lane `?aphase=r10` vs MAIN, 13 rest + pointer shots:
  max 1 LSB, mean <= 0.477; lane default vs MAIN: differs only on ring A and its lake reflection (diff maps
  `cmp4/diffmaps_def.png`, `cmp4/q00_def_main_diff.png`), 2.1-3.8 % of the pixels > 2 levels; outside a ring-A mask (where
  default and `?aphase=r10` differ, dilated 6 px; 3.5-7.7 % of the frame) mean <= 0.478, max 3, > 2 levels <= 0.001 %.
  Next: perf (SLOT_BG=0, interleaved A/B), typecheck, HANDOFF, stop the lab.
- 04:34 perf A/B started in the background (tools/perf_ab.sh -> perf/runs.txt): 6 interleaved pairs, MAIN :5173 vs lane :5175, T1 scale 1, SLOT_BG=0, each pair only at 1-min load < 6.
- HANDOFF.md rewritten for the final state (perf section pending). Code state verified: Choreography.ts and HoldR11.ts are
  byte-identical to `backup/*_prealign.ts` (= the code of `caps/final7`, `caps/g2_*`, `caps/HG3_interact_final.txt`, `cmp4`);
  no tipA / alignIn left. While perf runs, another lane (ice) holds a slot at the same time: GPU contention, so only the medians
  of the interleaved pairs mean anything.
- Perf (`perf/runs.txt`, `perf/summary.txt`): 6 interleaved pairs 04:34-04:52, SLOT_BG=0, 1-min load 2.2-5.8 at each start,
  T1 scale 1 1440x766. Medians MAIN / lane: rest 34.5 / 34.0 fps, hold 27.9 / 22.4, collapse 31.6 / 25.4; per-pair lane / MAIN
  medians 1.036 / 0.948 / 0.996; worst frame MAIN 66.7 ms, lane 133.3 ms (pair 6, a lane run slow throughout: rest 20.8 fps).
  The ice lane ran its own perf A/B at the same time (contention: the same MAIN build ranged 27.4-43.9 fps at rest).
- Typecheck: `tsc --noEmit -p tsconfig.hero.json` and `-p .`: 0 errors. Lab on :5175 (PID 75208) stopped; MAIN's :5173 untouched.

### 5.4 Final state (2026-11-15 04:55)
- Code: `git -C LANE diff` (CameraRig.ts +31, Choreography.ts +55, HeroEngine.ts +17, Rings.ts +177) + new `hero/HoldR11.ts`
  (337 lines). Switches `?hold=r10` (all of round 10, incl. ring A's phase) and `?aphase=r10` (only the phase).
- Gates: H-G1 65 / 65 (`caps/HG1_table_final7.txt`); H-G2 exact inside at 1440x766 / 1280x800 / 1920x1080 and long holds (stock
  bbox numbers for information); H-G3 click inert, no 60 Hz step above the 15 deg clamp (r11 reaches it at 4 / 0 / 14 / 8 of 32
  press moments in hold / release / re-press / release 2; r10 9 / 13 / 23 / 10); H-G4 max 1 LSB; H-G5 max 1 LSB with
  `?aphase=r10`, default differs only on ring A. HANDOFF.md complete.
- Open: ice silhouettes (ICE lane), charge in-betweens (yaw vs tip), the inherited charge-alignment whip and re-press flinch,
  B's seam block look, perf re-measure on a quiet machine.

## Judge 1 (2026-11-15 04:56)
- 04:56 judge 1 started; folder WORK/judge1/ (verdict_draft.md). Read SPEC, HANDOFF, LOG. Next: start lab :5175, sanity, then gates.
- 05:10 judge1: lab :5175 started by me (PID 93127). Wrote judge1/tools/jprobe.mjs (live press, exact ID render with the ice vertex shader; validated: outlines trace the rendered ice, caps/smoke/ov_F420.png). Smoke tau 2.6: F358 orb 11.5% visible at tp=(F-330.5)/30 (A2 convention; builder used (F-331)/30), F453 inner rings B/C/D near face-on concentric (target look?) to check vs MAIN. Next: H-G1 full run lane + MAIN.
- 05:22 judge1: H-G1 first pass done (caps/hg1_lane, caps/hg1_main; HG1_lane_check.txt): 62-66/81 per press; misses F358 B length/orb 11-12 %, F384 lens width, F402-404 bottom 616-628, F420 boxes 3-10 px beyond, F452 gaps 21-25, F452-453 inner whirl lost (B face-on target). Next: F358 at tp 0.9, F420 slit, sequence sheets.
- 05:31 judge1: F358 at tp 0.9 (builder convention): B box passes, orb still 11.3 %. F420 has no slit (orb visible only as a top cap). Release F452-F456 inner rings face-on bullseye vs ref whirl (MAIN r10 has it): regression. Sheets judge1/sheets/seq_a-c.jpg. Next: motion analysis (H-G3), probe_interact.
- 05:45 judge1: camera lunge measured (bgshift.py, background shift per frame): ref smooth bell (7.9,13.3,39.5,19.1,8.6,5.7), lane staircase (6.3 | 24.4,25.3,24.9 | 4.9 x6 | 0.9): r11 camera follows linear EXPAND_CAM keys -> velocity steps (major). Release camera also stepwise. Charge: A whips into the eye at 780 deg/s (C 852), ref ~255 deg/s. Next: 16-press motion study lane+MAIN.
- 06:00 judge1: motion study with the engine loop stopped (caps/mot2_lane, mot2_main; 16 press moments, probe_interact sequence): lane clamp (15 deg/frame, 900 deg/s whip) hits hold 2/16 (charge, ring C), release 0/16, re-press 6/16, release2 5/16; tau 0 re-press: C at the clamp 18 frames (~270 deg in 0.3 s), release2 B 12 frames. MAIN worse (re-press 12/16). Note: with the RAF loop running, frozen dt=0 frames bypass the limiter (probe artefact: 108 deg 'flip' in caps/mot_lane). Next: stock probe_interact.
- 06:10 judge1: stock probe_interact x2 (caps/probe_interact.txt): click inert both; lane hold 15.58/15.00 (clamp), MAIN 13.14/12.25. Side pair sweeps CW 1.13 deg/frame, no reversal; never frozen (least A80 B19.6 C43.5 D43.5). One lid OK. Running H-G2 (exact silhouettes, lite ID render): 1440/1280/1920 x 16 presses, pins, long holds.
- 06:22 judge1: H-G2 PASS (exact silhouettes, 3 viewports, pins, long holds). Next: H-G4/H-G5 with jcmp.mjs (loop stopped, pinned time/clock/orb/grain, shards hidden) lane vs MAIN.
- 06:36 judge1: H-G4 PASS (bit-identical 30 shots), H-G5 PASS (aphase=r10 bit-identical; default differs only by A's 22.5 deg in-plane turn). Next: typecheck, stock shoot_qc/holdseq/sweep, portrait, UI overlay, perf.
- 06:50 judge1: typecheck hero + project 0 errors; stock shoot_qc (caps/qc_lane), shoot_holdseq (caps/holdseq_lane), shoot_sweep (caps/sweep_lane) run on the lane: debug-pose path = live press; sweep consistent, no breakage; UI overlap per A2 9.3 (info). Next: portrait, long hold frames, re-press whip frames, perf.
- 06:58 judge1: started perf A/B (tools/perf_pairs.sh -> perf/runs.txt, 6 interleaved pairs, SLOT_BG=0, load<6). Findings so far in verdict_draft.md.
- 06:24 judge1: NOTE the judge1 times above (05:10-06:58) were written ahead of the clock (approximate); real times are from here on. Perf pairs running (perf/runs.txt). New findings: sustain quarter paths non-monotonic F396-F420 (A-R r 296->257->359 vs ref 194/240/375; A-L 329->296 vs ref 280/311; A-B 330->304 vs ref 294/305), speed bursts 9-11.5 px/frame (ref <= 3-6); release hand-back eye lasts to ~F468 in the stock harness. 404 = env_baked.json on both labs (same as MAIN).
- 06:25 judge1: findings drafted in judge1/verdict_draft.md (4 major, 6 minor, 4 nit/info). Waiting for perf pairs 3-6.
- 06:27 judge1: H-G1 recount without the unreliable B-collinearity metric: 62-66/80 per press + slit fail. Gate table drafted. Next: perf summary (background), then short-press study (prepared tools/spec_short.json), stop lab, final verdict.
- 06:37 judge1: perf done (perf/summary.txt): per-pair lane/MAIN medians rest 0.753, hold 0.939, collapse 0.866; same-build MAIN rest 18.7-40.4 fps -> inconclusive (noise > budget). Running short-press study + CPU microbench.
- 06:42 judge1 DONE: verdict FAIL, lens 7.4 (judge1/verdict_draft.md). Gates: H-G1 FAIL, H-G2 PASS, H-G3 FAIL, H-G4 PASS, H-G5 PASS, typecheck PASS, perf inconclusive. 4 major (release bullseye, F420 no slit, linear-key camera staircase, re-press/charge clamp whips), 6 minor, nits. Lab :5175 stopped.

## Fix round 1 (2026-11-15, after judge 1 FAIL)
- Started. Read SPEC 0-3 + 4.2, HANDOFF.md, LOG.md, judge1/verdict_final_body.md (13 findings: 4 major, 6 minor, nits), HG1_lane_check.txt,
  short_press_clamps.txt. Plan: reproduce each finding with the judge's own tools (judge1/tools/jprobe.mjs, hg1_check.mjs,
  motion_an.mjs, axis_an.mjs, bgshift.py), fix the root cause, re-verify with fresh captures, then re-run H-G1, H-G3 and perf.
- 06:46 lab :5175 started by me (PID 18834, log WORK/lab_fix.log).
- 06:55 Reproduced finding 3 (camera) with the judge's own tool (judge1/tools/bgshift.py on judge1/ref and judge1/caps/cam_lane): the
  reference lunge is 5.7 7.9 13.3 39.5 19.1 8.6 5.7 4.2 3.2 2.7 px/frame (F353-F362), the lane 6.3 | 24.4 25.3 24.9 | 4.9 x6 | 0.9,
  identical to the judge's numbers. Cause confirmed: Choreography samples EXPAND_CAM / RELEASE_CAM with sampleKeys (piecewise
  linear) and the r11 CameraRig branch applies camExpand directly. The reference creep F328-F345 and release F436-F472 were
  measured the same way (total dolly about 150 px of background shift, about 154 px per unit of camExpand in the engine).
- 06:58 Reproduced finding 2 (F420 slit) from judge1/caps/seq_lane/seq26_F420.mask.txt (flat ID map WORK/fix/repro/F420_flat_ov_crop.png):
  the upper lid is B's near half (B1, y ~305-415), the lower lid is C (y ~420-500), and D's near wall shows as a 10-20 px strip
  right under B1, so nothing of the orb shows between the lids; only a 25 px cap above B1. Next: camera fix, then a probe for the
  lens parameters.
- 07:12 FIX 1 (finding 3, camera), r11 only: HoldR11.ts EXPAND_CAM_R11 / RELEASE_CAM_R11 = the reference's per-frame dolly
  (F331-F374 and F443-F469, from the background shift, normalized), sampled with the monotone cubic (Curve). Choreography r11:
  expandCamR11 / releaseCamR11; camExpand is no longer phase-blended when the new phase starts where the camera is (the
  release, a hold from rest; the blend delayed the release by ~0.1 s), only a jump (re-press) is blended; a release keeps the
  dolly's momentum for 0.2 s (camKick, v0 t (1 - t/T)^2) so a release mid-lunge does not stop the camera dead.
  Verified with the judge's spec_cam.json + jprobe (WORK/fix/cam1): camera progress per 30 fps frame (motion log, x154.4 px)
  lunge F350-F366 3.0 3.5 4.4 5.7 7.9 13.2 39.5 19.1 8.6 5.7 4.2 3.2 2.7 2.1 1.9 1.5 1.4 (reference bgshift 2.98 3.54 4.38 5.70
  7.88 13.28 39.49 19.10 8.64 5.66 4.20 3.21 2.68 2.14 1.87 1.55 1.35); release F444-F466 -2.8 -4.1 -6.0 -9.0 -13.8 -20.0 -20.6
  -15.9 -11.6 -8.8 -6.9 -5.7 -4.6 ... -0.6 (reference -2.69 -3.96 -5.84 -8.77 -13.44 -19.44 -20.04 -15.48 -11.27 -8.56 -6.75
  -5.51 -4.50 ... -0.59); before: 6.3 | 24.1 24.1 23.9 | 4.6 x6 | 0.8 and a release delayed by the blend (0 -0.7 -2.1 -5.1 ...
  -23.3 -13.8 -9.6 -5.3 -5.3 -3.7 -3.7 -1.9 x4 -1.0 x3). bgshift on the captures (judge's tool) agrees: 5.5 7.7 13.2 | 41.9
  (strip x 0-200; 38.8 at x 1240-1440; the default x 0-300 strip mis-tracks this one 40 px jump, corr 0.62) | 20.1 9.0 6.0 4.4.
  Typecheck 0 errors. Next: the release's inner whirl (finding 1), F452 gaps (8), F460, tumble resume (11).
- 08:58 RESUME (fix round 1, second agent, after the 07:03 usage-limit cut-off). State found: FIX 1 (camera) is in the code
  (HoldR11.ts 373 lines, Choreography.ts +93); the lane typechecks (tsc -p tsconfig.hero.json exit 0); no lab was running on
  :5175 (PID 18834 gone). Next: read the r11 code, restart the lab, then finding 1 (release inner whirl), 8 (F452 gaps),
  F460, 11 (tumble resume), then 2 (F420 slit), 4 (whips), 5, 6, 7, 9; re-run H-G1, H-G3, perf.
- 09:03 lab :5175 started by me (PID 30297, log WORK/lab_fix2.log). Running the judge's H-G1 spec on the current state (camera fix in) -> WORK/fix/hg1_base.

## Step 3 (hold-build-3), 2026-11-15 09:09: THE USER'S PRIORITY (rotating hold)
- Started. The user (09:05): the press-and-hold is still bad; rings C / D do not rotate (they only repeat a back-and-forth
  movement); the outer rings A / B are not seamless either. While held, every ring must KEEP ROTATING in its rest direction, in
  slow motion, with A's quarters spreading and B's halves splitting on top; no reversal, snap, restart or repeating loop. This
  overrides SPEC 4.2 / A2 where they conflict. Plan: the idle tumble keeps running with its clock rate eased to a slow-motion
  factor (judge it from the reference), the opening and camera are offsets that ease in / out; step-2's A2 arrangement moves to
  `?hold=r11a`, `?hold=r10` stays. Fix round 1's camera fix (FIX 1) is in the code and kept.
- State found: lab :5175 not running (PID 30297 gone); lane diff = CameraRig +31, Choreography +93, HeroEngine +17, Rings +177,
  new HoldR11.ts. Next: read the code, back it up to WORK/backup/*_step3_start.ts, measure the reference's slow-motion speed.
- 09:25 lab :5175 started by me (PID 36387, log WORK/lab_step3.log). Capturing the current default (= the step-2 arrangement +
  FIX 1, which becomes `?hold=r11a`) with tools/cmp_shots.mjs (rest, hold, live) into WORK/step3/pre_r11, so the renamed
  `?hold=r11a` can be proven identical later. No source edits while it runs (the lab live-reloads); new code is staged.
- Idle motion measured from ringMocap.ts (WORK/step3/mocap_an.cjs): A |w| 201 deg/s constant (world wy +90 constant, a precession
  about world Y plus a flip about its own X), B |w| 162 deg/s constant (wy +90, body x 135): clean constant-rate tumbles, so a
  slowed clock keeps their direction exactly (w(t) = s(t) * w_idle(tau)). C: a noisy track, axis mostly flipping about world -X
  (-221 deg in 2.5 s, then +41 back: a nod), |w| 33-265. D: a pure nod (axis between (0, 0.6, 0.8) and (0, 1, 0.1)), |w| 1-122,
  body spin ~ -1 deg/s: D does not rotate at rest at all. So a slowed clock alone would leave C / D nodding (the user's
  complaint). Reference speed in the sustain: A turns ~120 deg in ~3.1 s (~39 deg/s, A2 R1) vs ~170-201 deg/s at rest: ~0.2.
- Design (new default `r11`): tumble clock eased to SLOW = 0.25 (tunable), A / B = exactly their slowed mocap; C / D = their
  slowed mocap times an extra body-frame flip about a latched diameter k (the in-plane direction nearest the hold view axis, so
  an edge-on ring turns like a clock hand; sense clockwise on screen) at ~40 deg/s; after the release the extra flip keeps going
  forward and lands on the next multiple of 180 deg (an exact symmetry of a solid ring) with a smooth Hermite profile. Opening:
  A quarters pushed out along their radials, B halves apart along theirs (both in the ring's own frame, so they rotate with it),
  eased in with the lunge and grown slowly, eased out in 0.45 s at the release. Frame guard: per piece, the exact largest push
  that keeps its hull vertices inside the frame (projective in the push, solved exactly), through a C1 saturation. No charge
  alignment, no pop pose, no eye, no breathing layer. Camera: FIX 1's measured dolly is kept.
- 09:35 Implemented (typecheck 0): HoldMode "r11" (rotating, default) / "r11a" / "r10"; Choreography r11 branches (expand: camExpand
  on FIX 1's curve, spreadA = splitB = spinOpenAt(tp), cdSpin ramp, spin = spinRateAt(tp); release: openings close in 0.45 s,
  clock back from the rate it was easing to, camera curve + kick; RELEASE_LEN_R11); Rings (flipCD, planLanding, guardPush,
  poseSpin); CameraRig / HeroEngine shared r11 / r11a paths (`!== "r10"`), rings.camera, debug.holdSpin. Tools:
  tools/spin_probe.mjs (live 60 Hz press sequences, exact silhouette bounds, JPEG shots), tools/spin_an.cjs (angular velocity
  vs the idle at the same clock), tools/cdseg.sh.
- First live 5 s hold (step3/spin1, sheet step3/spin1/sheet_h5.jpg, looked at): A / B s_eff = d.spin exactly (|s - spin| <=
  0.0008, off-idle residual <= 0.018), so they keep their rest direction, slowed. C with a view-based flip axis decelerated and
  turned the other way at the press (flip-axis w -109..-1 in the first second) -> the flip axis now continues the ring's own
  current motion (k = in-plane part of its body angular velocity at the latch), plus a floor (the flip speeds up when the
  slowed tumble underneath turns against it, capped 60 deg/s). Landing burst (40 -> 91 deg/s in 0.15 s) -> Hermite with
  T = 1.5 dlt / w0 (rate w0 (1 - u^2), only decelerates), targets >= 40 deg ahead, <= 3.2 s.
- spin3 (3 press moments tau 0 / 1.3 / 2.6, 5 s holds): C / D total turn about their flip axes in the sustain 24..104 / 28..66
  deg/s (never < 0), ramp >= 2..6. After the release C / D return to their idle motion (C at tau 2.6 turns -165 deg/s about the
  hold flip axis within ~1 s as the clock speeds up: that is C's own idle direction at that clock, as at rest).
- 09:38 running the main batch (v10 video frames, re-press, 1 / 3 / 20 s holds) and 16 press moments at 1440x766.
- 09:44 Main batch (step3/main; analysis tools/spin_an.cjs, tools/cdseg.sh): A / B in every run (10 s, re-press, 1 / 3 / 20 s holds):
  s_eff (rate relative to the idle tumble at the same clock) 0.250..1.000, |s_eff - d.spin| <= 0.0011, off-idle residual <= 0.018
  (numerical), largest frame-to-frame change of s_eff 0.0252 (A |w| 5.04 deg/s per frame), except the re-press: the click
  window set the clock target back to 1 (A jerked +23.8 deg/s in one frame). Fixed: in r11 a press during the release keeps
  the release running through the click window (a click there now does nothing at all); if it becomes a hold, the hold
  starts from the current clock rate, opening and camera (spinFrom / openFrom / camFrom, with the camera's momentum). After the
  fix (step3/rp2: rp, rp_early 0.1 s, rp_late 0.7 s, click_rel): largest s_eff step 0.0252/frame everywhere, click during
  the release leaves one continuous release. C / D: sustain total turn about the flip axis >= 24 deg/s in every run; in the
  first second (ramp, clock still near idle) C's own idle nod can still turn against it (down to -77 deg/s at tau 2.0).
- Looked at the 10 s hold frame by frame (sheets step3/sheets/v10_a..d.jpg, every 8 / 6 frames, and full frames such as
  step3/main/v10/f0300.jpg): continuous slow tumble, A's four quarters clearly apart, B / C / D turning inside, no snap, no
  eye, the release pulls the camera back and the rings speed up into the idle tumble.
- H-G2 1440x766 (16 press moments tau 0..3.75, 6 s holds, exact silhouette every 3rd vertex, step3/b1440): worst top 25,
  bottom 753, left 312, right 1129: INSIDE. Next: 1280x800 / 1920x1080, H-G4 (r10), r11a equality, H-G5, probe_interact, perf.
- 09:50 H-G2 exact silhouette, 16 press moments x 6 s holds: 1280x800 worst top 82 / bottom 732 / left 277 / right 1004;
  1920x1080 top 62 / bottom 1038 / left 415 / right 1506: INSIDE (step3/b1280, step3/b1920, tools/bsum.cjs). Long holds at
  1440x766: v10 top 36 / bottom 749, h20 top 34 / bottom 748.
- Videos (30 fps, every 2nd 60 Hz frame, h264): step3/hold10s_r11.mp4 (press from rest at tau 2.6, 10 s hold, release, 3 s idle),
  step3/repress_r11.mp4 (4 s hold, release, re-press 0.35 s later, 3 s hold, release). Looked at both frame by frame as
  sheets (step3/sheets/v10_a..d.jpg, rp_a.jpg, rp_b.jpg): continuous, no snap, no reversal of A / B, the re-press resumes the
  hold from where the release was (camera keeps its momentum, then lunges again at the pop time).
- Engine row over reference row: step3/sheets/press_vs_ref.jpg (F336-F372), step3/sheets/sustain_vs_ref.jpg (F384-F444). The
  camera timing matches (lunge F354-F364); the arrangement is the user's rotating hold, not A2's (no eye, no X, no pop bar).
- 09:55 H-G4 (step3/HG4_r11a.txt): lane ?hold=r10 vs MAIN, 22 shots: max 1 LSB, mean <= 0.493. ?hold=r11a (new code) vs the
  pre-step-3 default (step3/pre_r11, captured before any edit): 13 shots max 1 LSB (run 2); run 1 differed at live_F358
  only, and so did run 1 vs run 2 of the same build (mean ~1.0, max 94): the harness's run-to-run variance mid-lunge.
- H-G5 (step3/HG5.txt): ?aphase=r10 vs MAIN, 13 rest + pointer shots: max 1 LSB, mean <= 0.496. The new default vs the step-2
  default (cmp4/lane_def, which differs from MAIN only by ring A's phase): 13 shots max 1 LSB. Next: probe_interact, portrait.
- 09:58 H-G3 stock probe_interact (step3/interact.txt, real time, T0 0.5): click inert (all drivers 0, never holding); ring step
  per frame (60 Hz normalized) hold 3.48 / release 1.12 / re-press 2.28 / release 2 3.44 deg (r11a 15.25 / 7.46 / 11.34 / 11.44,
  MAIN r10 15.03 / 6.73 / 14.42 / 11.15): the rotating hold never comes near the 15 deg/frame clamp; the re-press segment's
  phases are release -> expand (the release runs through the click window). camStep60 1.07 at the lunge (fix round 1's
  measured lunge, the reference's 39.5 px/frame peak).
- Portrait 390x844 (step3/portrait, sheet step3/sheets/portrait.jpg): top 110 / bottom 753 inside; the sides are cropped (left
  -92 / right 489) because the unopened outer ring at the full hold dolly is already wider than a portrait frame (the guard
  then grants no push to those pieces). Same as step 2: a mobile FOV / dolly decision, open.
- 09:59 perf A/B started (tools/perf_ab3.sh -> perf/runs_step3.txt; 6 interleaved pairs, SLOT_BG=0, waits for load < 6).
- 10:00 (log times above corrected to the real clock.) Typecheck after the last edit (planLanding T simplified): tsc -p tsconfig.hero.json 0 errors, -p . 0 errors. The perf script is still waiting for the 1-min load to drop below 6 (6.7); no source edits until it is done (the lab live-reloads).
- 10:02 Consecutive video frames (every 2nd 60 Hz frame) of the lunge (step3/sheets/v10_lunge_consec.jpg, t 0.67-1.63) and the release (v10_release_consec.jpg, t 10.1-11.07): looked at all 60: no single-frame jump or flicker; the lunge zooms in over ~0.2 s with the rings still tumbling, the release pulls back over ~0.4 s while the quarters close and the tumble speeds up. Motion table of every run: step3/motion_summary.txt. HANDOFF.md section 0 / 7 / 8 written (perf pending). Perf pairs running (perf/runs_step3.txt).
- 10:24 Perf (perf/runs_step3.txt, summary_step3.txt): 6 interleaved pairs, medians MAIN / lane rest 39.1 / 31.6, hold 28.4 /
  25.5, collapse 25.4 / 26.6 fps; per-pair ratios 0.793 / 0.923 / 1.050 (ranges 0.30-2.47); the same MAIN build 18.7-60 fps at rest,
  5-min load up to 22 (another lane's job): inconclusive. HANDOFF.md complete (sections 0, 7, 8).
- 10:24 Step 3 DONE. Lab :5175 (PID 36387) stopped; MAIN :5173 untouched. Final code = lane diff (CameraRig +32, Choreography
  +183, HeroEngine +21, Rings +443 vs HEAD) + HoldR11.ts (447 lines); backup of the step-3 start in backup/step3_start. The last
  edit (planLanding's T written as max(min, min(max, 1.5 dlt / w)), identical values) came after the captures and before perf;
  typecheck after it: 0 / 0. Gates: rotation logs PASS (A / B), H-G2..H-G5 PASS, typecheck PASS, perf inconclusive.

## Judge (step 3, fresh judge of the rotating hold), 2026-11-15 10:30
- 10:30 judge started; my folder WORK/judge1/step3/ (verdict_draft.md there; the older judge-1 files in WORK/judge1/ are left as they were).
  Read SPEC 0-3 + 4.2, AUTOPILOT, HANDOFF (step 3), LOG, the lane diff. Load 16.7, 2 slots held (env, ice). Next: start lab :5175, write my own probe.
- 10:47 judge: own probe tools/jspin.mjs (stopped loop, exact 1/60 steps, window pointer events, ID render with the ice vertex shader) + tools/jan.cjs
  (q vs idle table at the same clock; 8 s table period because B closes the 4 s loop only modulo 180 deg). Batch b1 (rest + 16 press moments,
  6 s holds, 1440x766): A / B = idle tumble at the slowed clock within 0.41 deg (= table error), s_eff 0.25..1.0, off-idle <= 1.7 deg/s:
  PASS. C / D sustain always forward (C >= 21.8, D >= 27 deg/s); ramp: C reverses at tau 2.0 (-72 deg/s, 12.9 deg back, 0.3 s); release:
  C / D back to their idle nod (C up to -170 deg/s about the old flip axis ~1 s after the release). Next: pieces / opening, frames.
- 10:54 judge: b2 shots (v26 10 s hold, v20 tau 2.0) looked at (sheets/v26_press, v26_sustain, v26_release, v20_ramp_crop): continuous slow tumble,
  release continuous; opened shape reads as a cluttered coil / cracked gyroscope vs the reference's clean four-arc frame. b3 (20 s / 10 s holds,
  11 short holds, 8 re-press gaps, click in release, double, 5 clicks): A / B = idle at the clock in every run; clicks inert; C ramp reversal
  only at tau 2.0 (13 deg); camera continuous at release / re-press (kick). H-G2 1440x766 exact (ID render at the extreme steps, b5): L307 T21
  R1133 B758: inside. Next: H-G2 1280 / 1920 / portrait, real-time run, H-G4 / H-G5 pixels, probe_interact, perf.
- 11:02 judge: H-G2 exact silhouette (ID render, 16 presses x 6 s, every 0.1 s): 1280x800 L274 T76 R1005 B736; 1920x1080 L410 T54 R1509
  B1044; portrait 390x844 sides cropped (CPU -93 / 483), core on screen (sheets/portrait.jpg). Real-time log (jrt.mjs, SLOT_BG=0, 35 s,
  holds 3 / 1 / 4 s, re-press 0.3 s, click): same results as deterministic. Stock probe_interact lane: click inert, ring step 3.35 / 1.39
  / 1.98 / 3.19 (MAIN 14.37 / 3.5 / 10.1 / 14.12). H-G4 (jcmp2.mjs, 26 shots incl. live r10 presses): lane ?hold=r10 vs MAIN max 0 (bit-
  identical). Next: H-G5 pixels, reference comparison sheets, perf.
- 13:58 judge (RESUME, second judge agent after the ~11:08 usage-limit cut-off): lane code unchanged since 10:00 (Rings.ts 10:00:38 is the
  newest; lane diff + HoldR11.ts sha256 f75be515...). No lab on :5175 (the earlier judge's PID 70787 is gone). Load 6.6, mem free 35 %.
  Plan: re-check the rotation numbers I cite (fresh batch), then H-G5 pixels, reference comparison sheets (opened shape, camera),
  H-G1 as a guide, perf (6 pairs, SLOT_BG=0, load < 6). Verdict draft: WORK/judge1/step3/verdict_draft.md.
- 13:59 judge: lab :5175 started by me (PID 11213, log judge1/step3/j2/lab.log), build ok. New outputs go to judge1/step3/j2/.
- 14:04 judge: fresh batch caps/j2a (jspin, exact 1/60 steps, 8 press moments tau 0..3.5 x 6 s holds, 20 s hold, 0.5/1/1.5 s holds,
  re-press 0.1/0.35 s, click in release, 5 clicks; analysis j2/jan_j2a.jsonl, csv j2/csv_j2a): A / B = idle tumble at the slowed clock
  in every run (dev <= 0.41 deg = table noise, rest2 itself 0.37-0.41), s_eff 0.250..1.000 (never reversed), clock step <= 0.025/frame,
  max turn 3.62 deg/frame: CONFIRMED. C / D sustain always forward (C >= 24.0 = the floor, D >= 28.3 deg/s). Ramp: tau 2.0 C turns
  back 13.0 deg in 0.30 s (min -72.6 deg/s at t 0.867) [fresh p04, s100, s150]. Release: C / D go back to the idle nod; C up to
  -171..-173 deg/s about the hold flip axis ~1 s after the release (p03, p05). A quarters' push breathes in / out while held
  (pushASide + guard): h20 A1 / A2 13 velocity reversals, drop up to 0.30 m. Next: frames (j2b running), reference sheets, H-G5, perf.
- 14:09 judge: caps/j2b done (ref40 = reference-equivalent shots F332-F472 for a 4.0 s hold at tau 2.6; v26 10 s hold; v20 tau 2.0;
  s100 1 s hold; rp035 re-press). Sheets j2/sheets/cmp_press|sustain1|sustain2|release.jpg (engine left | reference right), bg crops
  bg_F420_full / bg_F452_full (camera: left peak / floe line / iceberg within ~10 px of the reference at F420 and F452), v26_hold_0to5 /
  5to10 (every 0.2 s): continuous slow tumble, no freeze; the opened shape is mostly a nested gyroscope / coil of arcs with small gaps and
  a bare white orb, only at some tumble phases an open frame (v26 4.6-5.4 s). C / D: projected-ellipse analysis tools/cdview.py on h20.
  Next: consecutive-frame sheets of lunge / release / re-press / short hold, then H-G5 + H-G4 pixels, interact, perf.
- 14:20 judge: frame-diff series (tools/fdiff.py, consecutive 1/30 s shots, hero box) of v26 / v20 / s100 / rp035: no spike anywhere;
  the lunge (peak 15.9 at t 1.07) and the release (peak 11.7 at t 10.17) are smooth bells; s100 (release mid-creep) dips 8.0 -> 2.8
  -> 6.1 at the camera's reversal (camExpand v +1.19 -> -0.08 /s in 3 frames, accel -25 /s^2, 10x below the lunge's own 252 /s^2).
  Looked at consecutive sheets j2/sheets/v26_lunge_consec, v26_release_consec, v20_ramp_consec, rp035_repress, s100_short: continuous,
  no pop / flicker / snap. C's ramp reversal at tau 2.0 happens while C is edge-on (aspect <= 0.14, tools/cdview.py): not visible.
  Pixel batch running (tools/j2_pixels.sh: default / aphase / def-vs-aphase / hg4). Next: jshape.mjs (exact ID passes of the opened
  shape: extent, orb visible share, A-B overlap, A gaps) at the reference-equivalent times for 5 press moments.
- 14:27 judge: H-G5 fresh (jcmp2, pinned time / grain / orb, shards hidden): lane ?aphase=r10 vs MAIN, q00-q03 + 9 pointer spots:
  max 0 on all 13 (bit-identical, caps/j2_hg5_aphase). Default vs MAIN: mean 0.20-0.35, max 82-122, only ring A + its lake
  reflection in the diff map (j2/sheets/hg5_q03_main_lane_diff.jpg looked at), ringdq A 22.50 deg, B / C / D 0 (caps/j2_hg5_default);
  default vs ?aphase=r10 identical numbers (caps/j2_def_vs_aphase). H-G2 1440x766 fresh (j2a): exact ID-render silhouette L307 T23
  R1123 B756 (8 presses x 6 s + 20 s hold, every 0.25 / 0.5 s); CPU every-5th vertex every step L311 T27 R1123 B751: inside.
  Running: hg4 (lane ?hold=r10 vs MAIN, 26 shots). Next: H-G2 1280 / 1920 / 390 (spec_j2c_*), jshape, interact, perf.
- 14:33 judge: H-G4 fresh (caps/j2_hg4): lane ?hold=r10 vs MAIN, 26 shots (q00-q03, 9 pointer spots, p04-p08, live F358 / F420 / F453 / F460 at tau 1.1 and 3.3): max 0 on every shot (bit-identical). Next: H-G2 1280 / 1920 / 390 + jshape batch (queued for the slot: env perf + ice hold both slots, load 10-18).
- 14:16 judge: (clock note: my three entries stamped 14:20 / 14:27 / 14:33 above were written at about 14:08 / 14:12 / 14:15 real time.) H-G2 viewports + jshape batch waiting for the slot (env perf + ice hold both, load 19). Perf script ready: judge1/step3/tools/perf_j2.sh (6 pairs, SLOT_BG=0, waits for load < 6 before each run).
- 14:18 judge: H-G2 viewports fresh (caps/j2c_*, 4 presses x 6 s each, ID render every 0.25 s + CPU every step): 1280x800 exact L281 T78 R999 B735; 1920x1080 L421 T58 R1499 B1042: inside. Portrait 390x844: CPU L-92 R489 (ID clamps 0 / 389), T111 B755: sides off-screen by ~92-100 px (shots queued, spec_j2e_390). Next: jshape analysis (running), then j2d (pointer drags / edge presses during the hold, jspin2.mjs) + portrait shots, then perf.
- 14:21 judge: jshape (caps/j2_shape, tools/jshape.mjs + shape_an.py + gaps6.py; exact ID passes at the reference-equivalent
  times of a 4.0 s hold, 5 press moments tau 0 / 1 / 2 / 2.6 / 3, plus a 10 s hold): camera rows match (orb centre (715-722, 389-392),
  Ø 212-220 in the sustain vs A2 (720, 392) Ø 218; F358 Ø 194 vs ~192; F460 Ø 136 vs ~136). Opened shape misses A2 at every press
  moment: F420 extent 624x722 / 600x720 / 644x726 / 804x582 / 632x728 (ref 782x634 ±30); orb visible at F420 67 / 89 / 70 / 75 / 51 %
  (ref <= 20 %), at F358 13 / 2 / 13 / 99 / 40 % (ref <= 10 %); A's arcs come within -62..+64 px of the orb's edge at F420 (ref >= 150 px
  after F404); rings in front of the orb 0-4 (ref exactly one lid); A-B silhouette overlap 3-65 % (typ. 10-35); F440 extent heights
  596-656 (ref 735-750); F384 aspect 0.9-1.33 (ref >= 1.9). Sheet j2/sheets/shape_tau2.6.jpg (A red/orange/yellow/magenta, B blues,
  C green, D cyan, orb white). Running: j2d (pointer drags / edge presses) + portrait shots. Next: perf.
- 14:21 judge: perf A/B started (tools/perf_j2.sh -> judge1/step3/perf/runs.txt; 6 interleaved pairs, SLOT_BG=0, each run waits for 1-min load < 6). No captures from me while it runs.
- 14:23 judge: draft verdict sections written (gates H-G1 FAIL shape / camera PASS, H-G2 PASS, H-G3 PASS pending stock interact, H-G4 PASS, H-G5 PASS; findings 1 major, 1 minor, 3 nits). j2d: drags / edge presses keep A / B at the slowed idle and the exact silhouette inside (L307 T27 R1128 B755); portrait sheet looked at (sides cut ~92-100 px). Perf pair 1 A done (MAIN 60 / 53.7 / 36.8 fps), waiting for load < 6.
- 14:24 judge: perf pair 1: MAIN rest 60.0 / hold 53.7 / collapse 36.8 fps (other slot: ice capture), lane 59.1 / 30.9 / 35.8 (no other holder, load 5.37): the lane's hold is 0.58x MAIN in this pair; pairs 2-6 running (Monitor). Queued after perf: stock probe_interact (lane), jpost.mjs (does a hold leave C / D's idle changed?), tsc, stop lab.
- 14:26 judge: perf pair 2: lane 60.1 / 46.9 / 57.7 fps (other slot: ice capture), MAIN 58.6 / 47.0 / 34.3 (none): hold ratio 1.00 (pair 1: 0.58). Noisy; waiting for pairs 3-6. Verdict draft updated (full-size look at the F420-equivalent: a swirl of A / B bands round a glossy white ball vs the reference's four separate arcs round a lens).
- 14:30 judge: perf pair 3 A (MAIN) 59.5 / 48.1 / 49.9 fps (other slot: ice capture); B waits (1-min load 21.7 from another lane's job).
- 14:39 judge: perf pair 3 B (lane) 60.2 / 24.9 / 27.8 fps but the machine load spiked to 99 during it (another lane's job; slot holders ice + env when it started): that run is contaminated. A load / holder logger now writes judge1/step3/perf/loadlog.txt every 4 s so each run can be flagged. Pairs 4-6 waiting for load < 6.
- 14:46 judge: perf pair 4 B (lane) 60.1 / 47.6 / 58.3 fps (load rose to 11-15 during it, ice capture in the other slot). Waiting for pair 4 A, 5, 6.
- 14:56 judge: perf pairs 1-4 are all contaminated on at least one side (pair 4 A ran together with the ENV lane's own perf probe: MAIN rest 34.8 fps). Stopped my script during pair 5 A (my processes only). Restarted pairs 5-8 with a strict gate (load < 6 AND no other slot holder), tools/perf_j2b.sh, appending to perf/runs.txt.
- 14:56 judge: j2post batch (probe_interact lane + MAIN, jpost idle-after-holds lane + MAIN, coverage lane + MAIN, T1 / T2 spot) queued through the slot; the strict perf gate will not start while it holds a slot.
- 14:56 judge: typecheck in the lane: tsc --noEmit -p tsconfig.hero.json exit 0, 0 lines (j2/tsc_hero.txt).
- 14:57 judge: tsc --noEmit -p . also exit 0, 0 lines (j2/tsc_all.txt). Waiting for j2post (slot) and strict perf pairs 5-6.
- 15:01 judge: j2post done. Stock probe_interact (caps/interact_j2, real time T0 0.5 under load): lane click inert (camExpand /
  splitB / spreadA / expandPose 0, never holding), ring step per 60 Hz frame hold / release / re-press / release2 3.79 / 0 / 2.56 /
  2.84 (MAIN r10 10.62 / 4.45 / 10.42 / 14.93), no errors. jpost (3 live holds, idle at the same tau before / after): lane ring
  orientation diff A 0.24 B 0.48 C 180.00 D 0.00 deg (MAIN 0.24 / 0.48 / 0 / 0): C keeps its landed 180 deg flip base after holds
  (by design; a symmetric ring, silhouettes alike in post_hold_C_flip.jpg; the image diff itself is dominated by a camera / scene
  offset in BOTH builds, so not usable). Coverage (cov_*, sustain 3.2-9 s, 3 press moments): lane ice covers 20.9-21.2 % of the frame
  (max 26.1) vs MAIN r10 17.2-17.4 % (max 18.1), layering 1.30-1.36 vs 1.35-1.40. T2 spot check: same poses, exact bounds identical
  to T1 (L318 T32 R1122 B749), looks fine (t1_vs_t2.jpg). Waiting for strict perf pairs 5-6.
- 15:05 judge: perf pair 5 A (strict start, no holders) MAIN 33.6 / 26.6 / 29.4 fps: the ENV lane's perf probe started during it (holder at the end), contaminated again. Added an interleaved in-browser GPU-cost A/B (tools/jrender.mjs: both labs in one browser, same live-hold moments, timed renders with a 1-px readback, A / B alternated 8x per moment) to get a contention-robust ratio.
- 15:06 judge: jrender (perf/jrender_T1.json; T1 1440x766, ms per render + 1-px readback, median of 8 interleaved alternations x 20 renders): rest MAIN 16.61 / lane 16.59 (0.999); live hold at tau 2.6, t 3 s 21.84 / 22.03 (1.009), 5 s 20.84 / 20.40 (0.979), 7 s 21.22 / 28.33 (1.335: the lane's last 4 samples jumped 21 -> 29 ms while MAIN stayed 19-22 apart from one 34 ms spike), 9 s 22.88 / 22.96 (1.003).
- 15:08 judge: jrender run 2 (perf/jrender_T1_b.json, 12 alternations): rest 15.70 / 16.65 (1.060 = the noise level for identical scenes), hold 3 s 21.99 / 23.77 (1.081), 5 s 20.00 / 19.90 (0.995), 7 s 20.30 / 20.73 (1.021, run 1's 1.335 not reproduced), 9 s 19.86 / 21.33 (1.074). Over both runs the hold ratio median is ~1.02 (0.979-1.081, one 1.335 outlier): no regression beyond the ~6 % noise. Coverage at the 7 s moment 18.1 vs 17.4 %. Strict perf_probe pairs 5 B / 6 still waiting for an empty slot table.
- 15:14 judge: perf pair 5 B (lane, strict, alone until 15:14:18 per loadlog; an ICE capture joined for the collapse sample): 60.1 / 50.2 / 60.3 fps, worst 33.4 ms. Pair 5 A (MAIN) ran entirely beside the ENV perf probe (33.6 / 26.6 / 29.4): contaminated. Waiting for pair 6.
- 15:19 judge: perf pair 6 B (lane, strict): 60.1 / 48.6 / 60.0 fps, worst 33.5 ms. Waiting for pair 6 A (MAIN).
- 15:23 judge: perf done (perf/runs.txt, perf/summary.txt via tools/perf_sum.py; loadlog.txt): 6 pairs, T1 scale 1 1440x766,
  SLOT_BG=0. Medians MAIN / lane: rest 59.0 / 60.1 fps, hold 47.5 / 47.2, collapse 35.5 / 58.0; per-pair lane / MAIN median rest 1.019,
  hold 0.967 (0.518-1.887), collapse 1.348; worst frame 66.7 ms both (hold). Contamination: pairs 1-5 each have a run beside another
  lane's capture / perf probe; the cleanest runs: lane pair 5 B 50.2 hold fps (alone), pair 6 B 48.6, MAIN pair 6 A 51.9 (alone in the
  slot table, system load 14-17). With jrender (median ~1.02) no regression beyond ~3-5 % is measurable: within the 10 % budget.
- 15:24 judge: lab :5175 (PID 11213, started by me) stopped; MAIN :5173 untouched; none of my processes left. Writing the final verdict (verdict_draft.md).
- 15:24 judge: FINAL verdict written to judge1/step3/verdict_draft.md: FAIL, lens 7.0. Gates: user priority A / B PASS, C / D PASS (nits), H-G1 FAIL (opened shape; camera PASS), H-G2 PASS, H-G3 PASS, H-G4 PASS, H-G5 PASS, perf PASS within noise, typecheck PASS. Findings: 1 major (opened shape: nested swirl of A / B round a bare orb, A2 shape rows 0-1 of 5 per row), 1 minor (portrait sides cut ~92-100 px), 4 nits. Lab stopped.

## Fix round 2 (2026-11-15, after the step-3 judge's FAIL: H-G1 opened shape, plus 1 minor and 4 nits)
- 15:32 Started. Read SPEC 0-3 + 4.2, HANDOFF.md, LOG.md, judge1/step3/verdict_draft.md. Findings to fix: (1) MAJOR opened shape is a
  nested swirl (A at B's radius, A-B overlap 10-35 %, A clearance -62..+64 px at F420); (2) MINOR portrait 390x844 sides cut ~92-100 px;
  nits: (3) C turns back 13 deg in the ramp at tau 2.0, (4) C / D back to their idle nod ~1 s after the release, (5) C keeps a landed
  180 deg flip after holds, (6) A's push breathes 0.3 <-> 0.6 m with screen direction. Geometry: hold camera r 12.7 m, hfov 46.15 deg ->
  ~133 px/m at the orb; orb r 0.8255 m = 110 px; A centre-line r 2.19 m (section 1.979-2.401 m = 263-319 px); the frame gives 392 px
  above / 374 px below the orb centre. Lab :5175 started by me (PID 68183, log fix2/lab.log). Work folder: fix2/.
- 15:46 Root cause of finding 1 (measured, fix2/geo.json): ring A spans r 1.979-2.401 m and ring B r 1.616-1.96 m, so at rest A's
  inner edge is 2 cm outside B's outer edge. Step 3 split B's halves 0.30 m (to r 2.26) and pushed A's quarters 0.30-0.60 m along
  their radials only, so the opened A and B share one radius; a tilted A also lays its front / back quarters over B and the orb
  (a radial push moves those towards / away from the camera, not outwards on screen). Code added (typecheck 0), all behind
  `?spin=s3` (= step 3 exactly; the old code path is kept verbatim): HOLD_SPIN.flexA (an offset along A's own axis,
  -flexA (u.v)(n.v), continuous, 0 face-on and edge-on), guardScale (the frame guard over the whole offset vector), the long-side
  share of pushASide (x on landscape, y on portrait), HOLD_SPIN.fitR + CameraRig.holdFit (narrow-screen hold dolly, 1 on
  landscape) with the lift scaled the same, cdFloorRamp / cdFloorCap (C / D floor) and a landing guard (omega T <= 3 dlt).
  Defaults still equal step 3 except fitR 2.5 (tuning next). Tools: fix2/tools/shape_eval.mjs (the judge's jshape ID passes +
  shape_an metrics in-page, several tunings per browser), shape_sum.cjs. Running batch e1 (s3 / h1 / h1f08 / h1f12 / h2f12).
- 15:56 e1 / e2 (fix2/e1.json, e2.json; 8 press moments x 10 sustain samples, judge-equivalent metrics; my tool reproduces the
  judge's tau 2.6 rows exactly, e.g. t 2.97: 806x582, orb 74.6 %, A/B 11.9 %, clear -63 vs judge 804x582 / 74.6 / 11.9 / -62).
  step 3 (s3): A clear median -19 px (<0 in 60 %), A/B overlap median 22 %, 4th-smallest A gap 35 px. m5 (pushA 0.5 + 0.1 side, B 0.1,
  flex 1.6, margin 0.06): clear median 36 (<0 44 %), A/B median 12.4 %, gap 57 px, F420 widths 758-808 (ref 782). pushA 0.8 made F420 /
  F440 too wide (788-916). Why clearance stays negative ~40 %: over the whole idle loop ring A's tilt against the hold camera is 38-90
  deg (never face-on) and it lingers near edge-on (n.v 0.06 at a turning point, two real crossings per 4 s loop); there a radial or
  flex offset cannot move the front quarter off the orb (topologically it must cross at a real crossing). Kept the rotation exactly
  (judge: "keep the rotation exactly as it is"); offsets only. Looked at fix2/sheets/v1_tau2.6.jpg and v1/m5_tau2.6/f0210.jpg: m5 reads
  as four chunky arcs with sky between them round the inner rings (step 3: a nested swirl). Next: e3 (flex 1.6-2.5, B 0.12, margin 0.08).
- 16:03 e3 (fix2/e3.json): n20 = pushA 0.5 + 0.1 side, B 0.12, flex 2.0, guard margin 0.08: A clear median 48 px (<0 38 %),
  A/B overlap median 11.7 %, 4th-smallest gap 59 px, F420 widths 794-810 (ref 782 +-30), bounds L284 T14 R1158 B750. n25 (flex 2.5):
  clear 64, overlap 9.4 %, but F420 widths 806-852. Shots fix2/v2 + sheets fix2/sheets/v2_tau{0.5,1.0,2.0,2.6}.jpg (step 3 row /
  n20 row / reference row F372-F436), looked at tau 1.0 / 2.0 / 2.6: from t 2.0-3.5 n20 shows A's four arcs far out with sky between
  them round a compact B / C / D core; step 3 winds A and B together. When A is edge-on it is a bar across the orb in both (tumble
  phase). DECISION: n20 = the new default (HoldR11.ts), step 3 under ?spin=s3.
- 16:03 Nit 3 reproduced (fix2/cd, tools/cdturn.cjs, measured from the flip's latch): step 3 at tau 2.0: C min -77.3 deg/s,
  14.0 deg back in the ramp (judge: -72.6, 13.0). cdFloorCap 150 + cdFloorRamp 3: C min +5.3 deg/s, 0 back; D min +5.7; tau 2.6 C min
  5.6 -> 13.6. Largest frame-to-frame change of C's angular velocity unchanged (32 deg/s at tau 2.0, 36 at tau 2.6, the idle mocap's
  own). DECISION: adopted (defaults cdFloorCap 150, cdFloorRamp 3; step 3 60 / 1 under ?spin=s3). Typecheck 0.
  Next: the opening's motion (piece offset velocities, consecutive frames), portrait, then the gates.
- 16:07 Motion check (fix2/mo, tools/pmotion.cjs: pivot world speed and frame-to-frame velocity change per segment): found a NEW
  defect of the bigger opening: at tau 1.0 a guard-limited quarter (A2 want 0.97 / got 0.53 m) flew out (got -> 0.74, 4.5 m/s) and back
  0.1-0.2 s after each release, because the camera pulls back and the guard lets go (dv 2.96 / 3.25 m/s per frame; step 3 0.47).
  Fix (Rings.poseSpin): the guard share tightens at once but never grows while the opening closes, and otherwise grows only through a
  smooth follower (HOLD_SPIN.guardRelax 4/s). Re-measured (fix2/mo2, 4 press moments, 10 s hold + release + re-press 0.35 s + 3 s hold
  + release): release dv 0.50-0.77 m/s per frame (step 3 0.47-0.52; the closing curve scaled by the larger opening), hold / re-press
  dv as step 3 (1.6-1.9, the lunge's lift), bounds L295-302 T25-26 R1141-1145 B739-740 (step 3 T28-36 B749-752). spin_an on the new
  default: A / B s_eff 0.250-1.000, |s - spin| <= 0.0008, pivots identity: rotation unchanged. Typecheck 0. Next: portrait, videos, gates.
- 16:14 Portrait (fix2/p390, sheets fix2/sheets/portrait_s3_vs_new.jpg, portrait_before_after_uhold.jpg): with fitR 2.5 the 390x844 hold
  keeps the set on screen (CPU bounds every 3rd vertex, 4 press moments, 6 s holds: L17-23 R367-373 T185-196 B629-637; step 3 L-93 R489),
  and A opens along the portrait's long side (pushASide uses D.y^2 there). Found and fixed a side effect: uHold / uFogHold (environment
  dolly progress) still went to 1 while the camera stayed near the rest pose, so the near-lake plate faded and the foreground rocks
  turned flat grey from t 2 s; HeroEngine now scales both by the same holdFit (exactly 1 on landscape). Looked at both sheets: rocks
  textured after the fix. Typecheck 0.
- 16:14 Way back ?spin=s3 proven numerically with the judge's own recorder: judge1/step3/tools/jspin.mjs re-run on the judge's j2a
  sequence (spec fix2/spec_j2a_s3.json = spec_j2a + &spin=s3, ID renders / shots dropped), compared per 1/60 s step with the judge's
  step-3 records judge1/step3/caps/j2a (tools/reccmp.cjs): tau, phase, drivers, all ring quaternions, pivot rotations, C / D flips, lift
  and events identical in all 10437 steps of 18 runs; differences only in t (recorder time stamp), cam (<= 2.6e-4) and what follows
  from it (guard push <= 3.2e-5 m, screen coords by the 0.1 px rounding unit). Next: same-build repeat to show the cam noise is the
  harness's, then the gate batch.
- 16:18 H-G1 re-run with the judge's tools on the new default (judge1/step3/tools/jshape.mjs + shape_an.py): 5 press moments of the
  judge's spec_shape (fix2/hg1_shape, analysis fix2/hg1_shape_an.txt) and 16 press moments tau 0..3.75 (fix2/hg1_shape16, analysis
  fix2/hg1_shape16_an.txt, aggregated by tools/an_sum.py). 16 presses, sustain: A clear median 42 px (>=100: 24 %, <0: 39 %), A/B
  overlap median 11.1 % (<5 %: 31 %), 4th-smallest gap 68 px; F420 widths within +-30 px of 782 at 8/16, heights at 3/16; F440 widths
  10/16, heights 6/16; bounds L274 T14 R1162 B750. ID sheet fix2/sheets/shape_tau2.6_new.jpg looked at (A an outer frame of four
  arcs round a compact B in ~10 of 15 samples; the front quarter crosses the orb only at true edge-on). Running the same 16-press spec
  on ?spin=s3 for a same-protocol baseline, plus a same-build repeat for the camera noise.
- 16:30 Judge's j2a sequence on the new default (judge1/step3/tools/jspin.mjs + jan.cjs; fix2/j2a_new, fix2/jan_j2a_new.txt;
  comparison tools/jan_cmp.py vs the judge's j2/jan_j2a.jsonl): A / B dev <= 0.415 deg, s_eff >= 0.2497, max turn 3.62 deg/frame (as
  step 3); C ramp at tau 2.0 -72.6 / 13 deg back -> +6.5 / 0 (s100 / s150 too); C / D sustain minima unchanged; exact ID bounds 1440x766
  L281 T14 R1162 B750. NEW defect found and fixed: at a re-press the closing opening stopped dead when the hold began (opening
  velocity -3.5/s -> 0 in one frame; offset acceleration 239 m/s^2 in rp010, step 3 99): Choreography now keeps the opening's
  momentum (openKick, like camKick, C1, dip <= 90 %) and skips the phase blend for the opening at an r11 hold start (fix2/rp_new:
  rp010 / rp035 / clickrel 51 m/s^2 = the release's own 0.45 s close). Typecheck 0. ALSO found: the flex makes A's offsets move on
  their own: world offset-change speed max 1.53-1.57 m/s (step 3 0.25; rotation part 2.19 in both, fix2/tools/vdecomp.cjs on fix2/mo2)
  and the settled-hold screen speed p99 8.2 / max 9.4 px per frame (step 3 4.9 / 5.1; flex 1.2: 7.1 / 7.9; flex 1.6: 7.7 / 8.7) ->
  risk of a pumping read against the user's priority. Measuring flex 0 / 0.8 next to cap the self-motion.
- 16:34 Flex trade-off measured (judge's j2a holds via fix2/tools/jspin_t.mjs = jspin + spec.tune; fix2/flex0/8/12/16 + j2a_new):
  settled-hold A / B screen speed p99 / max px per frame: flex 0 5.37 / 5.68, 0.8 6.52 / 7.19, 1.2 7.08 / 7.91, 1.6 7.65 / 8.70, 2.0
  8.17 / 9.44 (step 3 4.88 / 5.14); reversals while held 13 / 17 / 17 / 21 / 21 (step 3 13). Consecutive frames at the fastest moment
  (fix2/sheets/swoop_tau2.0.jpg: step 3 / flex 1.0 / flex 2.0, every 0.1 s, tau 2.0 t 4.5-5.1) looked at: all continuous; with 2.0
  A's edge-on quarter sweeps the orb's whole height in 0.6 s, faster than the slowed rotation around it. DECISION: flexA 1.0 (the
  user's priority is calm slow motion; the offsets' own motion stays ~1/3 of the rotation speed). Typecheck 0. Next: final gate
  batch on the final default (16-press jshape, j2a, viewports, portrait, H-G4 / H-G5 pixels, probe_interact, perf, video).
- 16:38 H-G1 with flexA 1.0 (judge's jshape, 16 presses, fix2/hg1f_shape16_an.txt): A clear median 9 px (step 3 -29), overlap
  median 15.4 % (20.4), <5 % 19 % (1 %), 4th gap 56 px (40); judge's 5 F420 moments: overlap 3.7-7.6 % at tau 0/1/2/3 (step 3
  14.5-22.5 %), clear 96-112 px (45-64). Rigid-push variants (fix2/e4.json, my evaluator, flex 1.0): pushA 0.6-0.65 + side 0 + B
  0.08-0.10 slightly better than 0.5 + 0.1 + 0.12 (clear 15-17, overlap 13.5-14.2 %, gaps 50-51) and drop the side "breathing".
  FINAL DEFAULTS (HoldR11.ts): pushA 0.6, pushASide 0, flexA 1.0, pushB 0.1, guardMargin 0.08, guardRelax 4, fitR 2.5,
  cdFloorCap 150, cdFloorRamp 3 (+ Choreography openKick / openBlend, Rings guard follower, landing guard, HeroEngine uHold /
  uFogHold / lift x holdFit). Typecheck 0. NEXT (final gate batch, in order): 1 H-G1 jshape 5 + 16 presses; 2 judge's j2a + jan
  (user priority, H-G2 1440 exact, clicks); 3 H-G2 1280 / 1920 / 390 (judge's j2c specs) + 16-press CPU bounds; 4 H-G4 / H-G5 pixels
  (judge's jcmp2 via j2_pixels.sh); 5 stock probe_interact; 6 perf 6 pairs SLOT_BG=0; 7 video + sheets; then HANDOFF / LOG.
- 16:40 FINAL H-G1 (judge's jshape + shape_an; fix2/hg1F_shape_an.txt, fix2/hg1F_shape16_an.txt): 16 presses A clear median 11 px
  (step 3 -29), p75 78 (32), overlap median 14.6 % (20.4), <5 % 21 % (1 %), 4th gap 60 (40), F440 widths +-30 9/16 (6/16), bounds
  L294 T14 R1142 B750; judge's F420 moments tau 0/1/2/3: overlap 3.1-6.9 % (14.5-22.5), clear 99-114 px (45-64). Next: j2a final.
- 16:43 j2a on the final defaults (fix2/j2aF): all user-priority rows as step 3 except rp010 offset accel 164.8 m/s^2: a ONE-FRAME
  STALL at the re-press switch (the hold's first frame repeats last frame's opening AND camera value, because the switch happens
  inside update with tp = 0; the judge's step-3 rp010 shows the same camera stall 0.237 -> 0.237). Fix (Choreography, !SPIN_S3): the
  momentum terms run on tk = time since the previous frame (kickAnchor), so the switch frame advances by v dt. Typecheck 0. Re-running
  the judge's j2a on the final code (fix2/j2aG).
- 16:43 FINAL j2a (judge's jspin + jan on the final code; fix2/j2aG, fix2/jan_j2aG.txt vs judge1/step3/j2/jan_j2a.jsonl): A / B dev <= 0.415
  deg (table noise), s_eff >= 0.2497, max turn 3.62 deg/frame (A), 4.78 (C); C ramp min +6.5 deg/s, 0 back (step 3 -72.6 / 13);
  C sustain >= 24, D >= 28.3, 0 back; piece offset accel max 39 m/s^2 (step 3 99); re-press switch frames continuous (rp010 open
  0.231 0.172 0.120 0.079, cam 0.264 0.237 0.215 0.201); exact ID bounds 1440x766 L304 T15 R1141 B750; clicks / clickrel inert as
  step 3. Settled-hold screen speed p99 7.0 px/frame (step 3 4.9; the flex's cost). Next: H-G2 viewports.
- 16:46 H-G2 CPU bounds, 16 press moments x 6.25 s holds + release (fix2/g2_*, lane tools/bsum.cjs): 1440x766 T25 B740 L305 R1134;
  1280x800 T45 B767 L271 R1008; 1920x1080 T35 B1043 L407 R1511: all INSIDE. Next: the judge's j2c ID-render runs (1280 / 1920 / 390).
- 16:47 H-G2 exact (judge's j2c specs, ID renders via jan; fix2/j2c_*): 1280x800 L277 T39 R1013 B772; 1920x1080 L415 T28 R1520 B1053;
  390x844 L19 T188 R374 B632 (step 3: sides cut ~92-100 px): all INSIDE. Next: H-G4 / H-G5 pixels (judge's jcmp2 via j2_pixels.sh).
- 16:53 H-G4 / H-G5 (judge's jcmp2.mjs, fix2/pix/*.txt): lane ?hold=r10 vs MAIN 26/26 shots bit-identical; ?aphase=r10 vs MAIN 13/13
  bit-identical; default vs MAIN only ring A's 22.50 deg (mean 0.20-0.35, max 82-122, as step 3); ?spin=s3 vs default at rest + 9 pointer
  spots 13/13 bit-identical (the fix round does not touch the rest). Next: stock probe_interact, perf, video.
- 16:54 H-G3 stock probe_interact x2 (fix2/interact/lane.txt, lane2.txt; real time T0 0.5): click inert (all drivers 0, never holding),
  ring step per 60 Hz frame hold / release / re-press / release 2 = 3.45 / 1.05 / 1.56 / 3.15 and 3.36 / 1.27 / 1.92 / 3.10 deg, no
  errors. Perf started (fix2/tools/perf_fix2.sh -> fix2/perf/runs.txt, 6 interleaved pairs, SLOT_BG=0, load < 6); no captures from me
  while it runs. Next after perf: video + sheets, HANDOFF.
- 16:56 HANDOFF.md section 9 (Fix round 2) written with all results so far (pointer at the top); perf and the review video
  pending (section 9.7). Prepared fix2/spec_video.json (final default: 10 s hold tau 2.6, re-press clip, 5-shot rows at tau 1.0 / 2.0
  / 2.6) and fix2/spec_video_s3.json (?spin=s3 10 s hold) to run after perf. r11a is untouched by this round by construction (every
  new branch tests holdMode === "r11" or runs inside poseSpin / flipCD, which only r11 calls).
- 17:16 PERF (fix2/perf/runs.txt, summary.txt via the judge's perf_sum.py): 6 interleaved pairs 16:55-17:12, T1 scale 1, SLOT_BG=0,
  each run started at 1-min load < 6 (3.8-6.0); pair 1 ran beside another lane's capture, pair 5 B ended at load 26 (contaminated).
  Medians MAIN / lane: rest 60.1 / 60.1 fps, hold 59.8 / 54.3, collapse 60.1 / 60.1; per-pair lane/MAIN hold median 0.918 (0.884-
  1.507); worst frame MAIN 83.4 ms, lane 50.1 ms. MAIN's hold sits at the 60 fps vsync cap, so the uncapped cross-check (judge's
  jrender.mjs, both labs in one browser, 12 alternations x 20 timed renders; fix2/perf/jrender_T1.json): rest 0.996, hold 3 / 5 / 7 /
  9 s 1.002 / 1.019 / 1.051 / 1.035 (median ~1.027; step 3 per the judge ~1.02). Within the 10 % budget. Next: video batch.
- 17:28 Videos (fix2/vid frames; fix2/hold10s_fix2.mp4, repress_fix2.mp4, hold10s_s3_left_fix2_right.mp4) and sheets fix2/sheets/
  final_tau{1.0,2.0,2.6}.jpg, hold10s_fix2_every05.jpg: looked at final_tau2.6 and the 10 s hold every 0.5 s: continuous, A's quarters
  stand apart as an outer frame round a compact core for much of the hold, edge-on bands as A tumbles, inside the frame, clean
  release to the rest view. Typecheck tsc -p tsconfig.hero.json and -p .: exit 0, no output. Lab :5175 (PID 68183) stopped; MAIN :5173
  untouched; no process of mine left.

### Fix round 2: summary (2026-11-15 17:35)
- Root causes found and fixed (all behind ?spin=s3, which reproduces step 3 exactly: identical per-step records of the judge's j2a
  sequence): (1) MAJOR swirl: B's 0.3 m split put B into A's band (A's inner edge is 2 cm outside B's outer edge at rest) and a tilted A
  laid its front / back quarters over B and the orb -> B 0.1 m, A 0.6 m radial (no side bonus), plus the continuous flex
  -flexA (u.v)(n.v) along A's axis (1.0 m), guard margin 0.08; (2) MINOR portrait: CameraRig.holdFit (1 on landscape) + the same share
  for the lift / uHold / uFogHold; (3) NIT C turning back at tau 2.0: floor cap 150, floor ramp x3; plus two defects found on the
  way: the guard letting quarters fly out at the release (guard follower) and the re-press stop / one-frame stall (opening momentum,
  no opening blend, momentum terms from the previous frame's time); landing guard (omega T <= 3 dlt).
- Gates (final code): user priority A / B PASS (dev <= 0.415 deg, s_eff >= 0.2497, pivots identity), C / D PASS (ramp +6.5 deg/s, 0
  back; sustain >= 24 / 28.3); H-G1 shape improved but A2's rows still miss (16 presses: A clear median -29 -> 11 px, overlap 20.4 ->
  14.6 %, <5 % 1 -> 21 %, gap 40 -> 60 px; judge's F420 moments tau 0/1/2/3 overlap 3-7 %, clear 99-114 px); camera rows PASS; H-G2
  PASS at 1440 / 1280 / 1920 and now portrait; H-G3 PASS; H-G4 26/26 bit-identical; H-G5 13/13 bit-identical (aphase) + only A's
  phase on the default; perf within budget (render cost ~+2.7 %); typecheck 0.
- Open: A2's shape rows are unreachable under the user's rotation rule (A's tumble never faces the hold camera); flexA is a taste
  knob (shape vs calm motion, measured in HANDOFF 9.5); nits 4 / 5 unchanged by design; the orb's look (ICE).

## Judge 2 (fix round 2), 2026-11-15
- 17:32 judge 2 started: folder judge2/ (verdict_draft.md there). Next: read the lane diff, start lab :5175, user-priority captures.
- 17:40 lab :5175 started by judge 2 (PID 98963); smoke test OK; batch u1 (21 numeric runs: 8 press moments x 6 s, 20 s hold, short holds, 5 re-press gaps, clicks, drag) running -> judge2/caps/u1
- 17:52 u1 analysed (an/u1_motion.txt): A/B exact idle at clock, never reversed; C/D forward 100 % in sustain; quarter offsets breathe 0.23-0.75 m (guard + flex). Next: visual batch V1 (10 s hold sequence) and V2 (reference-matched, 5 presses) + V3 (re-press).
- 18:00 V1 (caps/v1/v13, 10 s hold tau 1.3) looked at: sheets/v13_press_every6.jpg, v13_sustain_every16.jpg, v13_consec_3.0.jpg: continuous slow tumble; the opened set cycles tangle -> flat bar with end blocks -> open arcs -> nested rings; t 3.0-4.5 a thick A band crosses the orb (knot). V2 (5 reference-matched presses + re-press) running.
