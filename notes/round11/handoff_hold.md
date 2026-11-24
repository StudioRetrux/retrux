# HOLD lane hand-off (round 11). Step 3 (2026-11-15): the rotating hold, the user's priority

> **Fix round 2 (2026-11-15, after the step-3 judge's FAIL on H-G1) changed the default opening, the narrow-screen camera and
> three continuity details: read section 9 at the end first.** `?spin=s3` restores the step-3 rotating hold exactly; `?hold=r10`
> and `?aphase=r10` are unchanged.

## 0. Step 3 in short (read this first; sections 1-6 below describe the step-2 arrangement, now `?hold=r11a`)

The user looked at the step-2 hold on 15 Nov (~09:05 WIB) and said: "continueee, so far udah keliatan kemajuan, but bagian
press and hold masih tolol, 2 cincin tengah kaga muter, lebih ke gerak repeat doang kek kontol, begitu juga 2 cincin di luar,
yang gerakannya ga seamless. ensure 2 cincin di luar itu keep rotate but slowmo dan kebuka, but tetep seamless arah
rotasinya as is, but slow mo, priorityyy!!!!!!". Their words win over the A2 key frames, so the default hold is new:

- **`r11` (default): the rotating hold.** Every ring keeps its idle tumble running from wherever it is, in its own direction,
  with the tumble clock eased down to 0.25 of idle (`HOLD_SPIN.slow`; the reference turns ring A ~39 deg/s in the sustain
  against ~170-201 deg/s at rest, about 0.2). Rings A and B are exactly their slowed idle motion, so their rotation can never
  reverse, snap or restart. On top, as offsets in each ring's own frame (so they turn with the ring): ring A's quarters move
  out along their radials (0.30 m, plus up to 0.30 m more when the push points sideways on screen) and ring B's halves move
  apart along theirs (0.30 m). The opening comes in with the camera lunge (60 %) and then grows slowly; it closes in 0.45 s
  after the release while the clock speeds back up to 1. Rings C / D do not rotate at rest (C flips and nods, D only nods), so
  they also get a forward flip about a diameter latched from their own motion at the start of the hold (48 / 54 deg/s), with a
  floor that speeds the flip up when their slowed tumble turns against it; after the release the flip only decelerates and
  lands on the next multiple of 180 deg (a solid ring's symmetry). No charge alignment, no pop pose, no eye, no breathing loop.
  The camera keeps fix round 1's measured dolly (smooth bell, no staircase). A frame guard limits every pushed piece so its
  exact silhouette (hull vertices) stays inside the frame at any viewport, press moment and hold length; it never stops or
  reverses the rotation, it only reduces that piece's push for that moment.
- A press during the release no longer cuts the release short: the release runs on through the click window (a click there
  does nothing), and if the press becomes a hold, the hold starts from the current clock rate, opening and camera.
- **`?hold=r11a`**: the step-2 A2 arrangement exactly as it was (incl. fix round 1's camera), for comparison.
- **`?hold=r10`**: the round-10 hold, bit-identical. **`?aphase=r10`**: ring A's round-10 in-plane phase only.

Step 3 files: `hero/HoldR11.ts` (HoldMode r11 / r11a / r10, `HOLD_SPIN`, `spinOpenAt`, `spinRateAt`), `hero/Rings.ts` (flipCD,
planLanding, guardPush, poseSpin, the mode flags), `Choreography.ts` (the r11 expand / release branches, rePress,
spinFrom / openFrom / camFrom), `CameraRig.ts` and `HeroEngine.ts` (r11 and r11a share the measured dolly and the 0.39 m lift;
`rings.camera`; `debug.holdSpin`). Evidence and numbers: section 7 at the end. Work folder: `$SP/work/hold/step3`.

## Steps 1-2 (2026-11-14 / 15): the A2 arrangement, now `?hold=r11a`

The press-and-hold is rebuilt as a deterministic arrangement measured from the Cycles reference ("r11", the default).
`?hold=r10` restores the complete round-10 behaviour exactly. In step 2, ring A's in-plane phase at rest was also corrected so
its quarter joints sit where the reference's joints are. `?aphase=r10` restores only the old phase.
No assets were added. I stopped the lab I started on :5175. Nothing was committed, deployed or uploaded, and no `.blend` file
was touched.
The work folder `$SP/work/hold` holds every capture, tool and log. `LOG.md` there has the numbers for every attempt.

## 1. Files changed (all in `retrux-web/app/hero/engine/`)
| file | change | why |
|---|---|---|
| `hero/HoldR11.ts` (new, 337 lines) | Key tables (monotone cubic, runtime-tunable) for every hold parameter; `holdParams(tp)`, `releaseParams(from, tr)`, the long-hold breathing layer; target builders (`targetA/B/BPop/CD`) in a fixed hold view frame; `holdModeFromUrl()`; `A_PHASE_DEG` = -22.5 and `aPhaseFromUrl()`. | The hold pose as a function of hold time only (A2 rules R1-R12, fitted to A2 sections 5 and 10). The measured phase of ring A at rest. |
| `hero/Rings.ts` (+177) | `holdMode`; r11 branch: per-ring symmetry latch (`latchSymmetry`), target slerp by the hold weights, `poseR11` per piece (A: slot transform conjugated by the latched symmetry, plus a hinge about the quarter's counter-clockwise cap; B: the halves slide along the cut line); tumble clock frozen while the hold owns the rings; `tune.aLoopPhaseDeg` / `aLoopPhaseRate`, applied to ring A's mocap quaternion as q * Rz(offset) and skipped when 0. Every round-10 hold line is guarded by `!r11`. | Determinism: the press moment only chooses which congruent piece takes which slot. The phase: the mocap cannot see a symmetric ring's spin. |
| `Choreography.ts` (+55) | `Drivers.hold` (the r11 hold vector) and `holdMode`. The hold vector is computed in expand and release and is zero otherwise. It is blended at phase changes, except at the release, which starts exactly from the hold pose. The r11 charge keeps the frontal alignment until the hold weights take over. The r11 release lasts 1.05 s, and ring A's hand-back runs 0.55-1.0 s. Debug `pose("release", t)` starts from a hold released at F443. | Continuity on press, release and re-press. Without the longer release, the last 10 % of A's hand-back fell into one frame. |
| `HeroEngine.ts` (+17) | Reads `?hold`, passes the mode to Choreography / Rings / CameraRig; sets `rings.tune.aLoopPhaseDeg = aPhaseFromUrl()`; r11 lift `HOLD_TUNE.holdLift` 0.39 m (r10 keeps `Rings.tune.holdLift` 0.28); warm-up also sets the r11 weights; debug handles `debug.holdCurves`, `debug.holdTune`, `debug.holdChanged()`. | Wiring; orb at (720, 392) in the sustain, as F420. |
| `CameraRig.ts` (+31) | r11: the hold dolly (camExpand lerp of r / el / pitch) is applied after the idle and pointer springs, exactly on the driver. r10 is unchanged. | The omega-14 springs lagged the lunge by about 0.3 s. **The full-hold camera pose is identical** (CAM_TARGETS.expand untouched), so the projected hold plates stay registered. Only the timing of the lunge and of the release now follows the measured EXPAND_CAM / RELEASE_CAM. |

Shared-file hunks for the lead's merge: HeroEngine.ts (constructor wiring, the phase line, the lift line, warm-up, debug object),
CameraRig.ts (one guarded block in `update`), Choreography.ts (types and guarded lines). No changes to config.ts, curves.ts,
types.ts, assets.ts, RenderPipeline.ts, IceMaterial.ts, Orb.ts, Shards.ts, the environment or the UI.

## 2. Switches
- `?hold=r10`: the round-10 hold, camera springs, lift **and ring A's old phase**, bit-for-bit (H-G4).
- `?aphase=r10`: only ring A's round-10 in-plane phase (offset 0, the multiply is skipped); the r11 hold stays on (H-G5).
- (Step 2) Default (no parameter): r11 with the -22.5 deg phase. Since step 3 this arrangement is `?hold=r11a`; the default is the rotating hold (section 0).
- Runtime tuning: `__hero.debug.holdCurves.<key>` (arrays of [tp, value]) then `__hero.debug.holdChanged()`; `__hero.debug.holdTune`;
  `__hero.rings.tune.aLoopPhaseDeg`.

## 3. How r11 works (for whoever tunes it next)
- Hold view frame: z points from the lifted orb to the CAM_TARGETS.expand camera. All targets are built in it.
- Ring A = view * roll * R((-1,1,-1)/sqrt3, phi - 120 deg) * per-slot transforms (slide about the ring axis, push along the
  slot radial, spin, roll, tilt, and a hinge about the counter-clockwise cap). Slots: 0 top, 1 left, 2 bottom, 3 right. At the
  pop they are left, back, right and front (the end blocks, the hidden quarter and the level bar). Ring B = view * rho *
  Rx(-90 + beta), with the halves sliding along the cut line (share curve `bsplit`). C / D = view * Rx(-psi), with psi on the
  1.33 s beat (face-on at tp 1.10 / 2.39 / 3.67).
- Weights `wA` / `wI` ramp in 0.28-0.80 s into the hold. The symmetry is latched while a weight is exactly 0. The tumble is
  frozen 0.2-0.4 s in and released 0.55-1.0 s into the release, so the release hands back to the pose the rings left at the
  charge's eye.
- Release: A finishes its turn face-on at 12 / 3 / 6 / 9 with diagonal gaps by 0.30 s (F452), closes by 0.43 s (F456) and hands
  back to the tumble at 0.55-1.0 s. B / C / D hand back at 0.02-0.34 s to today's release alignment (the F453 whirl and the F460
  eye are today's).
- Long holds (past the reference's 3.73 s): a bounded breathing layer from 3.6-4.6 s on. A rocks +-5 deg, the quarters breathe
  +-0.04-0.05 m, B's lid sweeps over the orb and back on 9 s / 7 s cycles, and C / D keep their beat. Nothing freezes, and the
  extents stay inside the frame.
- Ring A's phase: `Rings.tune.aLoopPhaseDeg` -22.5 puts A's quarter joints at +-45 / +-135 deg at tau 0 (the artist's seam
  angles). Measured over all 121 frames of Default Loop.mp4 (one sharp peak at -22.4 deg; per 1/3 s window the median is -23.0
  with sd 1.05 and no drift, so the rate stays 0). The engine's near joints now land at x 573-576 / 871-874 on loop F000 / F030 /
  F060 / F090, where the reference bars are at 575 / 869 (round 10: 553 / 663 / 796 / 881).

### Step 2 changes (2026-11-14 evening and 2026-11-15)
- Ring A's in-plane phase (lead decision 1), as above, with `?aphase=r10`. Press swing over 16 press moments: mean twist 130.0 deg
  (old phase 129.9), worst per-frame quarter turn 12.26 deg in both.
- Hinge keys `hngT/L/B/R` (`HOLD_TUNE.hingeAxisDeg`): A-T turns about its left cap, so its right end is foreshortened with the
  cut face to the camera (F402-F420). Refits at F384, F402, F404, F420 and F440, with a smoothness prior.
- Release hand-back stretched (see Choreography above): the worst per-frame quarter turn in the release dropped from the 15 deg
  limit at 6-7 of 16 press moments to 12.3 deg.
- F358: A-R (the front bar) comes 0.3 m towards the camera at the pop (pushR 0.3 at tp 0.9 / 1.37). The orb is 9.6 % visible
  (ref ~8 %, was 10.6 %), and the bar is 451 px long (ref 470, was 441). Ring B at the pop is now the reference's straight,
  solid diagonal (betaB -5 at tp 0.9, rhoB -52 / -49 at tp 0.83 / 0.9): 110 px thick (ref ~105, was a bent 142 px "banana"),
  centre line (539,172)->(900,603) (ref (545,195)->(890,595)).

## 4. Verification (final, fresh captures on 2026-11-15; paths relative to `$SP/work/hold`)
All live measurements use `tools/hold_probe.mjs`: real pointer events, a frozen clock and `debug.settle()` steps, measured by
projecting every vertex (boxes, A midpoints and chords, gaps), with the orb coverage found by ray casting.
- **H-G1 PASS, 65 of 65** (`caps/HG1_table_final7.txt`, `caps/final7/sbs_F*.jpg`, evaluator `tools/hg1_eval2.py`, press at
  tau 2.6). Selected numbers (engine vs reference):
  - F358: extent 707x457 (710x454), bar 451 px (450-480) rising 6.9 deg, B box (515,158,923,615) vs (500,168,935,622), blocks
    (381,369,518,509) / (968,297,1088,408), orb 10 % (<= 10 %; 9.6 % unrounded).
  - F384: 826x369, A-R chord -12.3.
  - F402 / F404: A-R (736,177,1120,547) ch -40.8 / (736,164,1106,548) ch -44; A-T (369,145,665,325) / (370,142,667,317);
    open sky 264 / 277 (260-340); orb 72 / 74 %.
  - F420: extent 786x619 (782x634), all four arc boxes within 20 px (A-T worst 18), midpoints r 337 / 295 / 357 / 304, gaps
    105 / 100 / 12 / 3, lens + seam block (399,295,1032,508), orb 3 %.
  - F440 / F444: 795x715 / 788x714 inside the frame, gaps 94/37/81/54 and 89/42/78/57.
  - F452 / F453: quarters exactly at 12 / 3 / 6 / 9, diagonal gaps 25-27, r 215-226, orb fully visible.
  - F456: closed, d 406. F460: 394x393.
  - The step-2 checkpoint `caps/final6` (the push already in, before B was straightened) also passed 65 of 65, with the
    F358 orb at 9 %.
- **Sequence** F332-F472 every 4 frames, engine row over reference row (`caps/seq7_sheet_a.jpg`, `_b.jpg`; hero crops
  `caps/seq7_crop_charge.jpg`, `_a.jpg`, `_b.jpg`, `_c.jpg`): the eye, the X knot, the pop cross, the slab cluster, the portal, the
  open frame of four arcs round the lens, the release and the eye follow the reference. The sequence is continuous and nothing
  is tangled. The charge timing was measured (`tools/charge_probe.mjs`): A's tilt from face-on at F344 / F348 / F352 is
  42.8 / 68.5 / 88.2 deg (A2: ~44 / ~67 / 90), and F356 has A +9.7 / B -51.6 deg (ref +10 / -51).
- **H-G2 PASS (exact silhouette, lead decision 3)** (`caps/HG2_exact_final.txt`, captures `caps/g2_*`): every 3rd projected vertex
  of the subdivided meshes, 16 live press moments (tau 0-7.5). 1440x766: worst top 12 (F440), bottom 737 (5 s hold), left 343,
  right 1150. 1280x800: top 70, bottom 713. 1920x1080: top 45, bottom 1009. Long holds of 5 / 8 / 9.5 / 11 s: top 19 / 27 / 27 /
  18. Spread over the press moments is at most 8 px. Everything is inside. For information, the stock `probe_holdbounds.mjs`
  (bounding-box corners of each piece, debug pose, 32 press moments; `caps/HG2_stock_final.txt`) gives 1440x766 top 14 / -7 / 5 /
  -10 and bottom 703 / 746 / 756 / 744 at t 2.97 / 3.63 / 5.0 / 9.5, 1280x800 top 54 / bottom 723, and 1920x1080 top 21 / bottom
  1024. The corners of a tilted arc's box lie up to 20-50 px outside the ice. Portrait 390x844 (`caps/portrait/portrait_sheet.jpg`,
  step 1): the core stays on screen, and the outer parts of the side arcs are cropped.
- **H-G3 PASS, with one caveat** (`caps/HG3_interact_final.txt`, `caps/final7.txt`, `cmp3/ringstep_r11.json` / `_r10.json`):
  - Stock `probe_interact`: the click is inert (no driver moves, never holding). Ring step per frame, normalized to 60 Hz, in
    hold / release / re-press / release 2: r11 15.25 / 7.46 / 11.34 / 11.44, MAIN 15.03 / 6.73 / 14.42 / 11.15. The probe runs
    in real time, so frame jitter lets it read slightly above the engine's 900 deg/s safety clamp (`MAX_TURN`, 15 deg per 60 Hz
    frame).
  - Deterministic version (`tools/ringstep.mjs`: the same quantity and sequence at exact 60 Hz steps, 32 press moments): no step
    exceeds 15.00. The share of press moments that reach the clamp is, for r11 vs r10, hold 4/32 vs 9/32 (ring C in the
    charge's frontal pass, which r11 inherits from r10), release 0/32 (max 14.59) vs 13/32, re-press 14/32 vs 23/32, and release
    after a re-press 8/32 vs 10/32.
  - The 60 Hz live log at tau 2.6: hold max 13.46, release 11.02, re-press 11.08, release 2 12.45 deg/frame.
  - Never frozen: the least motion of any ring in any 0.5 s window of the sustain is A 84, B 19.7, C 43.5, D 43.5 (deg + px).
    In a 10 s hold all rings keep moving. B is the one lid over the orb from F356 to F444.
- **H-G4 PASS** (`cmp4/HG4.txt`): lane `?hold=r10` vs MAIN's lab, 22 shots (q00-q03, 9 pointer spots, the p04-p08 debug poses
  and 4 live-press frames), with time, tumble, orb plasma and grain pinned and the shards hidden. Max 1 LSB on every shot,
  mean <= 0.479/255. The 1-LSB residual is the per-frame film grain.
- **H-G5 PASS** (`cmp4/HG5.txt`):
  - `?aphase=r10` vs MAIN, q00-q03 + 9 pointer spots: max 1 LSB, mean <= 0.477/255.
  - Default vs MAIN: only ring A and its lake reflection differ (diff maps `cmp4/diffmaps_def.png`,
    `cmp4/q00_def_main_diff.png`). Outside a ring-A mask (where the default and `?aphase=r10` differ, dilated 6 px, which covers
    3.5-7.7 % of the frame), the mean is <= 0.478, the max is 3, and at most 0.001 % of pixels are above 2 levels.
- **Perf**: see section 6.
- **Typecheck**: `tsc --noEmit -p tsconfig.hero.json` and `-p .` give 0 errors.

## 5. Open (for the lead / a fixer)
1. **Ice look, not pose**: the engine's slabs read thinner and smoother than the reference's chunky frosty ones. For example,
   F358's front bar is about 102 px tall vs about 128 px, so even with the corrected pose the visible orb patch at the pop sits
   about 30 px right of the reference's. This belongs to the ICE lane's silhouettes.
2. **Charge in-betweens (F340-F350)**: our A tips about a near-horizontal screen axis into the X knot, while the reference's A
   keeps its idle tumble (a yaw, its ellipse narrowing sideways). The key poses at F352 / F356 / F358 match. Fixing it would mean
   routing the r11 charge target through the tumble path, for example with an extra rollA key near 90 deg at tp 0.3-0.45.
3. **The charge's frontal alignment** (inherited from r10) still drives ring C at the 15 deg/frame clamp for 4 of 32 press
   moments, and a re-press during a release makes A flinch towards the tumble during the click window (re-press 14/32 at the
   clamp). r11 is better than r10 everywhere (section 4). A longer alignment ramp (0.30 / 0.36 s) only took the hold from 4 to
   3 or 2 of 32 and was reverted. A real fix would let a re-press's click window continue the release.
4. B's "seam block" exists (the far half's end, x ~1000-1032 at F420), but its look was not compared in detail.
5. The release's inner rings (F452-F460) use today's alignment and residual whirl (B 30, C 40, D 38 deg at F453); this lane did
   not change them. The tumble after F462 resumes from the pose the rings had at the press (the press moment decides it, as in
   any live press).
6. The live lunge follows EXPAND_CAM exactly (a deliberate punch, as in the reference). With the ENV lane's baked environment
   the lunge passes through camera poses between the rest and hold plates sooner than before, so the ENV lane should look once
   at F354-F363.
7. Portrait: the side arcs are cropped in the hold. That is a mobile FOV decision, not a hold-lane one.
8. No Blender Cycles twin of the hold pose was rendered in this lane (the ICE lane owns the twin).

## 6. Performance (T1, scale 1, 1440x766, `perf_probe.mjs` through the slot with `SLOT_BG=0`, interleaved A/B pairs)
Six interleaved pairs, 04:34-04:52 on 2026-11-15, with the order alternating AB / BA. A pair started only while the 1-min load
was below 6 (it was 2.2-5.8). Runs: `$SP/work/hold/perf/runs.txt`. Summary: `perf/summary.txt` (`py/perf_sum.py`). A = MAIN
:5173, B = this lane (r11 default).
| phase | MAIN median fps | lane median fps | per-pair lane / MAIN (median, range) | worst frame MAIN / lane |
|---|---|---|---|---|
| rest | 34.5 | 34.0 | 1.036 (0.47-1.55) | 50.1 / 66.7 ms |
| hold (`pose("expand", 2.97)`) | 27.9 | 22.4 | 0.948 (0.41-1.03) | 66.7 / 133.3 ms |
| collapse | 31.6 | 25.4 | 0.996 (0.45-1.10) | 50.1 / 83.3 ms |

The machine was shared the whole time: another lane held a slot and ran its own perf A/B. The same MAIN build ranged from
27.4 to 43.9 fps at rest, so only the per-pair medians mean anything. At rest the lane matches MAIN (r11 adds only a few
quaternion products per frame). In the hold the lane is about 5 % slower by the per-pair median, which is within the 10 %
budget. The r11 sustain spreads the ice over a larger part of the screen (the reference's open frame, extent 786x619, instead of
round 10's compact tangle). The lane's 133 ms worst frame comes from pair 6, whose lane run was slow from start to end (rest 20.8
fps), which points to contention rather than the hold. Re-measure on a quiet machine before any perf sign-off.

## 7. Step 3 verification (2026-11-15, fresh live captures; paths relative to `$SP/work/hold`)

Tools: `tools/spin_probe.mjs` (real pointerdown / pointerup with the engine clock frozen, time advanced in exact 1/60 s steps,
per frame: clock, drivers, every ring group's quaternion, every A quarter's / B half's pivot, C / D's flip, the guard's
pushes, exact silhouette bounds from every 3rd vertex of every ring mesh; JPEG shots), `tools/spin_an.cjs` (world angular
velocity from consecutive quaternions; for A / B the rate relative to the idle tumble at the same clock, s_eff = w . w_idle /
|w_idle|^2, with the idle recomputed from ringMocap.ts), `tools/cdseg.sh`, `tools/bsum.cjs`, `tools/spin_sheets.sh`,
`tools/refrow.sh`.

- **Rotation direction, 60 Hz live logs** (`step3/motion_summary.txt`; runs: 10 s hold, 1 / 3 / 20 s holds, 5 s holds at
  tau 0 / 1.3 / 2.6, re-press 0.1 / 0.35 / 0.7 s into the release, a click during the release):
  - Rings A and B: s_eff stays within 0.250..1.000 in every frame of every run (press, sustain up to 20 s, release, re-press,
    idle), equal to the clock rate d.spin within 0.0011; the part of the motion that is not the idle rotation is <= 0.019 of
    it (numerical differentiation of the mocap). So both rings always turn exactly as at rest, slowed, and never reverse. The
    largest frame-to-frame change of the speed: s_eff 0.0253 per frame (A |w| 5.84 deg/s per frame, B 4.17), from the
    smooth clock ramps. Every A quarter and B half has the pivot rotation identity (min |q.w| 1.000000 in all runs), so each
    piece turns exactly with its ring; their offsets only move them along their radials.
  - Rings C and D: during the sustain the ring's total turn about its flip axis is positive in every run: C 24..104 deg/s,
    D 27..76 deg/s (flip rates 33..81 / 37..54). In the first second (the clock still near idle speed) C's own idle nod can
    still turn against the new flip at some press moments (down to -77 deg/s, tau 2.0), and after the release C / D go back to
    their idle motion, which itself nods back and forth at rest (as in the reference loop), so the sign about the hold's flip
    axis changes there. A hold released within ~1.4 s settles a flip of < 15 deg back (rate >= -18 deg/s).
  - Re-press: no kick any more. Before the fix the click window set the clock back to 1 (A +23.8 deg/s in one frame); now the
    largest s_eff step is 0.0252 per frame in all re-press runs, and a click during the release leaves one continuous release.
- **Videos, looked at frame by frame**: `step3/hold10s_r11.mp4` (10 s hold at tau 2.6, release, 3 s idle, 30 fps) and
  `step3/repress_r11.mp4` (4 s hold, release, re-press 0.35 s later, 3 s hold, release), as sheets
  `step3/sheets/v10_a.jpg`..`v10_d.jpg` and `rp_a.jpg`, `rp_b.jpg`, and full frames (`step3/main/v10/f0300.jpg`,
  `f0540.jpg`): a slow, continuous tumble; A's four quarters clearly apart with sky between them, B's halves apart (a spiral),
  C / D turning inside round the orb; no snap, no eye, no reversal of A / B; the release pulls the camera back while the
  rings close and speed up into the idle tumble; the re-press keeps the camera's momentum and lunges again at the pop time.
- **Engine row over reference row**: `step3/sheets/press_vs_ref.jpg` (F336-F372) and `sustain_vs_ref.jpg` (F384-F444). The
  camera lunge happens at the reference's time (F354-F364). The arrangement is now the user's rotating hold, not A2's (no
  eye, no X knot, no pop bar, no lens); H-G1 (the A2 checklist) therefore no longer applies to the default (it still holds
  for `?hold=r11a`).
- **H-G2 PASS** (exact silhouette, 16 live press moments tau 0..3.75 x 6 s holds per viewport, `step3/b1440`, `b1280`,
  `b1920`): 1440x766 worst top 25 / bottom 753 / left 312 / right 1129; 1280x800 top 82 / bottom 732 / left 277 / right 1004;
  1920x1080 top 62 / bottom 1038 / left 415 / right 1506. Long holds at 1440x766: 10 s top 36 / bottom 749, 20 s top 34 /
  bottom 748. All inside. Portrait 390x844 (`step3/sheets/portrait.jpg`): top 110 / bottom 753 inside, the sides cropped
  (left -92 / right 489): the unopened outer ring at the full hold dolly is already wider than a portrait frame (open item).
- **H-G3 PASS** (`step3/interact.txt`, stock probe_interact, real time): click inert (every driver 0, never holding). Ring
  step per 60 Hz frame hold / release / re-press / release 2: 3.48 / 1.12 / 2.28 / 3.44 deg (r11a 15.25 / 7.46 / 11.34 / 11.44,
  MAIN r10 15.03 / 6.73 / 14.42 / 11.15): never near the 15 deg/frame clamp. The deterministic logs above: max |w| 216 deg/s =
  3.6 deg per 60 Hz frame (A at idle), so the MAX_TURN clamp never acts.
- **H-G4 PASS** (`step3/HG4_r11a.txt`): lane `?hold=r10` vs MAIN, 22 shots (q00-q03, 9 pointer spots, p04-p08, live F358 /
  F420 / F453 / F460): max 1 LSB, mean <= 0.493/255. **`?hold=r11a` = the step-2 default**: 13 shots vs captures made
  before any step-3 edit (`step3/pre_r11`): max 1 LSB (one live mid-lunge shot varies run to run in the harness itself, also
  between two runs of the same build).
- **H-G5 PASS** (`step3/HG5.txt`): `?aphase=r10` vs MAIN, 13 rest + pointer shots: max 1 LSB, mean <= 0.496. The new default
  vs the step-2 default at rest and at the 9 pointer spots: max 1 LSB (so it differs from MAIN only by ring A's phase, as
  measured in step 2). C / D's flip is not applied at all until the first hold (bit-identical idle).
- **Typecheck**: `tsc --noEmit -p tsconfig.hero.json` and `-p .`: 0 errors.

- **Perf: inconclusive** (`perf/runs_step3.txt`, `perf/summary_step3.txt`; 6 interleaved pairs 10:01-10:18, T1 scale 1
  1440x766, SLOT_BG=0, A = MAIN :5173, B = lane r11): medians MAIN / lane rest 39.1 / 31.6 fps, hold 28.4 / 25.5, collapse
  25.4 / 26.6; per-pair lane / MAIN medians 0.793 / 0.923 / 1.050 with ranges 0.30-2.47; worst frame MAIN 83.4 ms, lane 83.4 ms.
  The same MAIN build ran 18.7-60.0 fps at rest and another lane's job pushed the 5-min load to 22 during pairs 4-6, so the
  noise is far above the 10 % budget. At rest the rotating hold costs nothing by construction (no push, no guard, the C / D
  flip not applied); in a hold it adds ~600 projected hull points and a few quaternion products per frame. Re-measure on a
  quiet machine.

## 8. Step 3 open items
1. C / D after the release return to their own idle motion (C flips and nods, D nods); for the first second of a hold, before
   the clock has slowed, their idle nod can still turn against the new flip. A fully monotone hand-back would need C / D to
   leave their mocap for a clean rotation at rest as well (an idle change, not done).
2. Portrait: the hold dolly makes the outer ring wider than a portrait frame (sides cropped, as in step 2). A portrait-only
   lower hold dolly would fix it; it is a mobile camera decision.
3. The orb is fully visible in much of the rotating hold (A2 R8's "never fully exposed" lids belonged to the arrangement).
4. The shards still fly through the opened set (ICE lane / lead).
5. Tunables in `__hero.debug.holdSpin` (slow factor, opening, C / D rates, guard margin) were set by eye from the sheets; a
   user review of `step3/hold10s_r11.mp4` should confirm the speed (0.25 of idle) and the opening amount.
6. Perf needs a quiet-machine re-measure (above).
7. The lab on :5175 that I started is stopped. Nothing was committed, deployed or uploaded; no `.blend` was touched; no assets
   were added (0 bytes in public/hero).

## 9. Fix round 2 (2026-11-15, after the step-3 judge's FAIL; work folder `$SP/work/hold/fix2`)

The step-3 judge (`$SP/work/hold/judge1/step3/verdict_draft.md`) passed the user's priority (A / B rotate exactly as at rest,
slowed; C / D turn forward), H-G2 to H-G5, perf and typecheck, and failed H-G1: the opened set read as "a nested swirl round a bare
white orb" (1 major), plus 1 minor (portrait crop) and 4 nits. Everything below was reproduced with the judge's own tools first
(`judge1/step3/tools/jshape.mjs`, `shape_an.py`, `jspin.mjs`, `jan.cjs`, `jcmp2.mjs`), then fixed and re-measured on the final code.
The rotation itself is untouched: A and B are still exactly their idle tumble at the eased clock, and no piece gets any rotation.

### 9.1 What was wrong (root causes, measured)
- **Major, the swirl.** Ring A spans r 1.979-2.401 m and ring B r 1.616-1.96 m (`fix2/geo.json`), so at rest A's inner edge is only
  2 cm outside B's outer edge. Step 3 split B's halves 0.30 m (out to r 2.26 m, inside A's band) and pushed A's quarters 0.30-0.60 m
  along their radials only. A also never faces the hold camera: over the whole idle loop its tilt against the hold view is 38-90 deg,
  and it is within ~22 deg of edge-on 45 % of the time (two real edge-on crossings and one turning point per 4 s loop). A radial push
  then moves the front / back quarters of a tilted A towards / away from the camera instead of outwards on screen, so they lie over
  B and the orb.
- **Minor, portrait.** On 390x844 the frame's half-width at the 12.7 m hold distance is ~1.6 m, less than A's 2.4 m outer radius:
  even an unopened A cannot fit at the full dolly.
- **Nit 3, C turning back at the tau 2.0 press.** The flip's floor compensated C's own nod only up to 60 deg/s; at tau 2.0 the nod
  turned against the flip at up to ~140 deg/s (reproduced: C min -77.3 deg/s, 14.0 deg back; judge -72.6 / 13.0).
- **Found during this round (not in the verdict), both fixed:** (a) with the larger opening, a guard-limited quarter flew out and
  back 0.1-0.2 s after each release, because the camera pulls back and the frame guard let the piece out (velocity change 3 m/s in
  one frame); (b) at every re-press the hold started with the opening (and the camera) frozen for one frame and the closing
  velocity discarded (piece acceleration 239 m/s^2; the camera's one-frame stall is in the judge's step-3 data too).

### 9.2 Changes (all in `retrux-web/app/hero/engine/`; every one is off under `?spin=s3`)
| file | change | why |
|---|---|---|
| `hero/HoldR11.ts` (501 lines) | `SPIN_S3` (`?spin=s3`); `HOLD_SPIN` defaults: `pushA` 0.6 (was 0.3), `pushASide` 0 (0.3), `pushB` 0.1 (0.3), new `flexA` 1.0, `guardMargin` 0.08 (0.04), new `guardRelax` 4, new `fitR` 2.5, `cdFloorCap` 150 (60), new `cdFloorRamp` 3. | Hierarchy (A a frame outside, B a compact lens), the flex, the narrow-screen dolly, the C / D floor. Every comment carries the measurement behind the value. |
| `hero/Rings.ts` | `poseSpin(.., dt)` new path: one offset vector in the ring's own frame = A's radial push + the **flex** `-flexA (u.v)(n.v)` along A's axis (u the quarter's radial, n A's axis, v the view direction, all in the ring frame; 0 face-on and edge-on, continuous), B's radial split; `guardScale` (the frame guard over the whole vector, same exact solve and C1 saturation); a guard follower (tightens at once, never lets a piece out while the opening closes, otherwise at `guardRelax`); `flipCD` floor weight `min(1, w cdFloorRamp)`; `planLanding` lands one symmetry further when `omega T > 3 dlt` (no negative landing rate). The step-3 code path is kept verbatim under `SPIN_S3`. | Major, release fly-out, nit 3. |
| `Choreography.ts` | `openKick` / `openKickT`: a re-pressed hold keeps the closing opening's velocity and turns it smoothly (C1, dip <= 90 %), like `camKick`; `openBlend`: no phase blend for the opening at an r11 hold start (it already starts where it is); `kickAnchor` / `lastDt`: both momentum terms run from the previous frame's time, so the switch frame advances by v dt. | Re-press stop and one-frame stall. |
| `CameraRig.ts` | `holdFit` / `fitShare()`: the share of the hold dolly at which a ring of radius `fitR` still fits the frame's width with the guard margin (1 on every landscape screen, so the dolly there is unchanged; 390x844 ~0.1). | Minor (portrait). |
| `HeroEngine.ts` | r11: the hero's lift, `uHold` and `uFogHold` x `rig.holdFit` (exactly x1 on landscape). | With the camera near rest on a phone, the environment must not switch to its hold look (otherwise the near-lake plate faded and the foreground rocks turned flat grey; seen and fixed, `fix2/sheets/portrait_before_after_uhold.jpg`). |

Shared-file hunks for the merge: HeroEngine.ts (2 lines + 3 comment lines), CameraRig.ts (1 import, 2 fields, 2 lines in `update`,
1 method), Choreography.ts (1 import, fields, 4 small hunks). No changes to config.ts, curves.ts, types.ts, assets.ts,
RenderPipeline.ts, IceMaterial.ts, Orb.ts, Shards.ts, the environment shaders or the UI. No assets added (0 bytes in public/hero).

### 9.3 Switches
- Default: fix round 2. `?spin=s3`: the step-3 rotating hold exactly. `?hold=r11a`: the step-2 arrangement. `?hold=r10`: round 10
  (bit-identical to MAIN). `?aphase=r10`: ring A's round-10 phase only.
- Runtime: `__hero.debug.holdSpin.{pushA, pushASide, flexA, pushB, guardMargin, guardRelax, fitR, cdFloorCap, cdFloorRamp}`.
  `flexA` is the one knob with a taste trade-off (9.5).

### 9.4 Verification on the final code (paths relative to `$SP/work/hold/fix2`)
- **`?spin=s3` = step 3, proven with the judge's recorder**: the judge's whole j2a sequence re-run with `&spin=s3` (`spec_j2a_s3.json`,
  `j2a_s3/`) against the judge's step-3 records (`judge1/step3/caps/j2a`), per 1/60 s step (`tools/reccmp.cjs`): clock, phase, all
  drivers, all ring quaternions, pivot rotations, C / D flips, lift and events identical in all 10437 steps of 18 runs. Only the
  camera's idle sway (<= 2.6e-4, it follows the wall clock) and what follows from it differ, and two runs of the same build differ
  more (2.5e-3, `rep1` / `rep2`). At rest and at the 9 pointer spots `?spin=s3` and the default are bit-identical (13/13 shots).
- **User priority (judge's j2a + jan.cjs, `j2aG/`, `jan_j2aG.txt`, compared with the judge's `j2/jan_j2a.jsonl` by
  `tools/jan_cmp.py`)**: A / B deviation from the idle tumble at the same clock <= 0.415 deg (the table's own noise, as step 3), s_eff
  >= 0.2497 (never reversed), largest turn 3.62 deg per 60 Hz frame; C's ramp at the tau 2.0 press +6.5 deg/s with 0 deg back (step 3
  -72.6 / 13; also s100 / s150); C sustain >= 24 deg/s, D >= 28.3, 0 deg back (as step 3); clicks inert; re-press switch frames
  continuous (rp010: opening 0.231 0.172 0.120 0.079, camera 0.264 0.237 0.215 0.201); largest piece-offset acceleration 39 m/s^2
  (step 3 99).
- **H-G1, the FAIL gate, judge's jshape + shape_an** (`hg1F_shape_an.txt` = the judge's 5 press moments, `hg1F_shape16_an.txt` =
  16 press moments, summary `tools/an_sum.py`; the same 16-press protocol on `?spin=s3` for the before column):

  | 16 press moments, sustain (160 samples) | step 3 | fix round 2 | A2 target |
  |---|---|---|---|
  | A clearance from the orb's edge, median / p75 | -29 / 32 px | 11 / 78 px | >= 150 |
  | samples with A clear >= 100 px / A over the orb (< 0) | 0 % / 61 % | 9 % / 48 % | 100 % / 0 % |
  | A / B silhouette overlap, median; samples < 5 % | 20.4 %; 1 % | 14.6 %; 21 % | < 5 % |
  | 4th-smallest gap between A's quarters, median | 40 px | 60 px | big |
  | F420 width / height within +-30 px of 782x634 | 8 / 4 of 16 | 8 / 3 of 16 | |
  | F440 width / height within +-30 px of 800x740 | 6 / 4 of 16 | 9 / 4 of 16 | |

  At the judge's own F420 moments (tau 0 / 1 / 2 / 3): A / B overlap 6.9 / 3.1 / 4.4 / 4.6 % (step 3 22.5 / 18.1 / 16.4 / 14.5),
  A clearance 103 / 100 / 114 / 99 px (57 / 47 / 64 / 45), extents 736x714 716x716 736x720 716x718 (624x722 600x720 644x726 632x728).
  At tau 2.6 A is edge-on at F420 (810x534, overlap 26 %, clearance -23; step 3 804x582, 12 %, -62). Camera rows unchanged.
  Looked at: `sheets/v2_tau{0.5,1.0,2.0,2.6}.jpg` (step 3 row / candidate row / reference row F372-F436), `sheets/shape_tau2.6_new.jpg`
  (ID colours as the judge's sheet): A's quarters now stand as an outer frame of four arcs with sky between them round a compact B /
  C / D core for most of the sustain; when A is edge-on its front quarter is a bar across the orb (that is the tumble).
- **H-G2** (exact silhouettes): judge's j2a ID renders 1440x766 L304 T15 R1141 B750; judge's j2c specs 1280x800 L277 T39 R1013 B772,
  1920x1080 L415 T28 R1520 B1053, **390x844 L19 T188 R374 B632 (step 3: sides cut by ~92-100 px)**; 16 press moments x 6.25 s
  holds + release, CPU every 3rd vertex (`g2_*`, `tools/bsum.cjs`): 1440x766 T25 B740 L305 R1134, 1280x800 T45 B767 L271 R1008,
  1920x1080 T35 B1043 L407 R1511. All inside.
- **H-G3**: stock probe_interact twice (`interact/lane.txt`, `lane2.txt`): click inert, ring step per 60 Hz frame hold / release /
  re-press / release 2 = 3.45 / 1.05 / 1.56 / 3.15 and 3.36 / 1.27 / 1.92 / 3.10 deg, no errors.
- **H-G4**: lane `?hold=r10` vs MAIN, judge's jcmp2 (26 shots incl. live presses): 26/26 bit-identical (`pix/hg4.txt`).
- **H-G5**: `?aphase=r10` vs MAIN 13/13 bit-identical; the default differs from MAIN only by ring A's 22.50 deg phase (mean
  0.20-0.35, max 82-122, as step 3) (`pix/hg5_*.txt`).
- **Typecheck**: `tsc --noEmit -p tsconfig.hero.json` and `tsc --noEmit -p .`: exit 0, no output (`fix2/tsc_hero.txt`, `tsc_all.txt`).

### 9.5 The flex: a trade-off for the user to look at
The flex is the only offset that moves on its own as A tumbles (the others are rigid in the ring's frame). Measured on the judge's
j2a holds (settled hold, A / B screen speed px per 60 Hz frame, p99 / max): step 3 4.9 / 5.1; flex 0 5.4 / 5.7; 0.8 6.5 / 7.2; 1.0
7.0 / 7.9; 1.2 7.1 / 7.9; 2.0 8.2 / 9.4. With 2.0 the shape numbers were clearly better (16 presses: A clearance median 42 px, overlap
median 11.1 %, 31 % of samples < 5 %), but an edge-on quarter then swept the orb's whole height in 0.6 s and the quarters' own motion
reached ~70 % of the rings' rotation speed (`sheets/swoop_tau2.0.jpg`, `tools/vdecomp.cjs`). The user's last complaint was about
"repeating" back-and-forth motion, so the default is 1.0. `__hero.debug.holdSpin.flexA` changes it live.

### 9.6 Still open after fix round 2
1. A2's shape rows cannot all pass under the user's rotation rule: ring A's idle tumble never faces the hold camera (tilt 38-90 deg)
   and spends ~45 % of the loop near edge-on, so ~half of the sustain has a quarter crossing the orb and the F420 / F440 heights follow
   the tumble phase. Only a change of the rotation itself (which the user ruled out) could reach "A >= 150 px from the orb at all
   times" and "exactly one lid".
2. Nit 4 (C / D return to their idle nod ~1 s after the release) and nit 5 (C keeps its landed 180 deg flip, a symmetry of the
   ring) are unchanged by design; a per-ring clock for C / D would change the post-hold idle, which lead decision 2 forbids.
3. The orb is still a bright disc where no ring covers it (ICE lane: the orb's look).
4. Perf is within budget but the hold now misses vsync more often on a busy machine (9.7); re-measure on a quiet machine.
5. The user should look at `fix2/hold10s_s3_left_fix2_right.mp4` (step 3 left, fix round 2 right) to confirm the opening amount and
   the flex (`flexA`).

### 9.7 Perf, videos, processes
- **Perf** (`fix2/perf/runs.txt`, `summary.txt` by the judge's `perf_sum.py`): 6 interleaved perf_probe pairs 16:55-17:12, T1 scale 1
  1440x766, through the slot with `SLOT_BG=0`, every run started at 1-min load < 6 (3.8-6.0); pair 1 ran beside another lane's
  capture and pair 5's lane run ended at load 26. Medians MAIN / lane: rest 60.1 / 60.1 fps, hold 59.8 / 54.3, collapse 60.1 / 60.1;
  per-pair lane / MAIN hold 0.918 (0.884-1.507); worst frame MAIN 83.4 ms, lane 50.1 ms. MAIN's hold sits at the 60 fps vsync cap, so
  the judge's contention-robust render-cost A/B was run too (`judge1/step3/tools/jrender.mjs`, both labs in one browser, 12
  alternations x 20 timed renders, `fix2/perf/jrender_T1.json`): rest 0.996, live hold at 3 / 5 / 7 / 9 s 1.002 / 1.019 / 1.051 / 1.035
  (median ~+2.7 %; the judge measured ~+2 % for step 3). Within the 10 % budget; the hold's frames sit closer to the 16.7 ms line.
- **Videos for the user** (30 fps, every 2nd 60 Hz frame, live press at tau 2.6): `fix2/hold10s_fix2.mp4` (10 s hold, release, 3 s
  idle), `fix2/repress_fix2.mp4` (4 s hold, release, re-press 0.35 s later, 3 s hold, release), `fix2/hold10s_s3_left_fix2_right.mp4`
  (step 3 left, fix round 2 right, same press). Looked at as sheets: `fix2/sheets/hold10s_fix2_every05.jpg` (every 0.5 s through the
  hold, the release and the idle: continuous, arcs inside the frame, no doubled pieces, no pop) and `fix2/sheets/final_tau{1.0,2.0,
  2.6}.jpg` (step 3 row / fix round 2 row / reference row at F372 / F392 / F404 / F420 / F436).
- I started the lab on :5175 (PID 68183) and stopped it. MAIN's :5173 was never touched. No process of mine is left. Nothing was
  committed, deployed or uploaded; no `.blend` was touched; no assets were added.
