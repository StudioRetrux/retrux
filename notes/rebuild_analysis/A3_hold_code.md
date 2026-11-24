# A3: press-and-hold code map and diagnosis (engine vs Cycles reference)

Scope: `retrux-web/app/hero/engine/Choreography.ts`, `hero/Rings.ts`, `HeroEngine.ts`, `CameraRig.ts`, `curves.ts`, `math.ts`, `config.ts`;
captures `qc/b69qc/p04-p08` (+ `cmp_*.jpg`, `crop_p06_sustain_hero.jpg`), `qc/b70sweep/sw_hold_*`, `sw_pop_*`, `sw_rel_*`;
reference `hero-pipeline/reference/ref_F358/F402/F420/F453/F460.png`, `qc/holdref/F328-F472.jpg`, `video_choreography.md` 2.6-2.7 and 5.4,
judge plan `qc/round10/plan_round10.json` (T12, T15, T21), capture harness `hero-pipeline/validate/shoot_qc.mjs`, `shoot_sweep.mjs`, `shoot_holdseq.mjs`.
Nothing was run. Every number below comes from reading the code, the logged drivers (`b69qc/log.txt`, `b70sweep/log.txt`) and the images.
Pixel coordinates are on the 1440x766 frame. At the hold camera (r 12.7 m) the scale at the orb is about **133 px/m** (orb 0.8255 m radius = 110 px).
Rings.ts line numbers refer to the file as it is now (906 lines).

---------------------------------------------------------------------------------------------------

## 0. Findings in one page

1. **The hold arrangement is not a pose. It is a function of the tumble phase at the moment of the press, with several hidden branch switches.**
   Six independent latches sample the running tumble at slightly different times (tp 0.69-0.94 s): `splitSign`, `popSign`, `holdSign[0..3]`,
   `cutSign`, the A phase latch and the A slot labels. Three defects turn this into visibly different layouts on every press:
   - (a) **A slots are labelled from the pop pose, not the hold pose.** `latchSlots()` (L492-518, called at L799) runs until tiltA > 0.005, i.e. until
     tp 0.937 s. At that moment A is 90 % turned into the pop's edge-on band (popPose = 1 from tp 0.88 to 1.05). The labels therefore come from an
     unrelated rotation and end up shifted by a random k x 90 deg against where the quarters really land. All per-slot arrays have period 2
     (slides -/+/-/+, tilts +55/-42/+48/-55), so an odd k swaps the pairs.
   - (b) **The holdSign mirror.** `holdSign[0]` (L700, the A face side, effectively 50/50 per press) mirrors every local in-plane rotation on screen:
     the slide (L828), the spin (L853) and the tangent-tilt sign (L846). The pairs flip again, and the side-arc lean flips between an "A-frame" and "horns".
   - (c) **The phase correction has the wrong sign whenever holdSign[0] = -1** (L755-756). It rotates about the ring's current axis n (about -N_A) by +corr,
     while phi is measured counter-clockwise about +N_A. The phase then becomes 2*phi - target instead of the target, so the "deterministic phase"
     (aPhaseOn) only works for half the presses. Its latch window (L741-746: 0 < expandPose < 0.01, i.e. tp 0.85-0.888 s, about 2 frames at 60 Hz) can also
     be skipped below about 26 fps, and the QC/sweep harness always skips it.
   Evidence: in the same QC run, p05 pairs (top+left)/(right+bottom) while p06 pairs (top+right)/(left+bottom). Six sweep shots taken at successive press
   moments give six different silhouettes.
2. **Ring A is pulled inwards, where the reference pushes it out.** holdCompact 0.78 (L619, used at L830), aOutBase -0.22 (L559) and aLowerLift 0.7 (L555, L836)
   put the quarter pivots at 1.13-1.68 m. At rest they sit at 1.90 m, and F420's arcs are about 0.3-0.75 m further out than ours. These constants were
   tuned against the *worst press moment* (probe_holdbounds), because of finding 1.
   Result: the silhouette is 626x530 px against F420's 785x635, about 20 % small.
3. **The slide pattern pairs the wrong neighbours, and the overlap is too large.** aSlotSlide [-24, +24, -24, +24] (L110) puts paired quarter centres
   42 deg apart. 90 deg arcs therefore overlap by 48 deg and chain into two long arcs, the "G" / horseshoe. With correct labels and holdSign = +1, the pairs are
   (top, right) and (left, bottom), with gaps at about 10-11 and 4-5 o'clock. F420 pairs **(top, left) and (bottom, right)**, with centres 56-68 deg apart,
   sky gaps at about 1 and 7 o'clock, and near-touching joints at 10 and 4-5 o'clock.
4. **The horns** come from the slide moving a side quarter towards 12 o'clock, the spin aSpinAmp 22 x cos(th) (L853) leaning it, and the uncapped
   55 deg tangent tilt (the cap only applies below the horizon, L819-821). In sw_hold_L/BL/R a side arc stands up to y 25-40.
   **The p05 lake tail** is a right-side quarter whose pivot is above the horizon, so it gets no lower lift and no tilt cap. Through a mislabel it wears a
   -24 deg slide (clockwise, downwards) and a 46 deg tilt, and the +21 deg screen-angle spin swings its lower end to about 2 m below the orb (y about 670-682).
5. **The orb is exposed because one flat ring can never hide it.** B's halves share B's group rotation and only translate along world Y (L855-866).
   B lies nearly flat (N_B, seen 11.7 deg from edge-on), so only the near half is in front of the orb. Raised 0.165 m (bSplitHeld 0.35), that near band
   covers -74..+25 px around the orb centre, which leaves the orb's top 85 px (39 %) bare. F420's lens has **both** lips in front of the orb: about 216 px tall,
   y 290-506, with only a cap (y 283-312) and a slit (y about 405-445) showing. That needs a per-half rotation (a "clamshell" hinge about B's cut line,
   section 5.3), not a different split value. T12's proposal (bSplitHeld 0.12) would expose *more* of the orb (+10..+110 px bare).
6. Secondary defects:
   - B's split "breathes" twice: about 0.9 m apart at tp 1.0, 0.36 m at 1.5, 0.58 m at the portal, 0.36 m from 2.85.
   - C/D let 15 % of the tumble leak through, which can also produce up to 54 deg antipode jumps; the 900 deg/s MAX_TURN only spreads these over a few frames.
   - The portal rings are ellipses (Z_PORTAL is 36-40 deg off the view axis), where F402's are near circles.
   - faceInner starts at F418, while F428 shows no C/D yet.
   - The release leaves A in a pinwheel phase (p07 gaps rotated about 22-30 deg off the diagonals).
   - **alignA jumps from 0.104 to 0 at release t = 0.8 s.** The bump ends at 0.85 but RELEASE_LEN is 0.80, so every release ends with an A snap of up to about 9 deg.
   - The pop's B bar breaks into two blocks (the cut line is uncontrolled at the pop).
   - The knobs aSlotOut, holdW and A_EXPAND_TURN are dead. aSlotAxial, aSlotSpin, aHoldTiltDeg, holdYawDeg, bowlLift and aLift are all zero.

---------------------------------------------------------------------------------------------------

## 1. Driver timeline (Choreography.ts)

### 1.1 Clocks
- Physical press at P = 0 (`press(true)`, L207-220). A release before **HOLD_ARM = 0.25 s** (L77) is a click and does nothing (L221-224).
- At P = 0.25 s, `update()` L336-340 calls `setPhase("expand")` (blendFrom = current drivers, blendT = 0) and `setHolding(true)`.
  The hold timeline **tp = now - pressAt - 0.25** (L342).
  **tp maps to the reference frame by F = 331 + 30*tp**: tp 0.9 is F358, 2.37 is F402, 2.97 is F420, 3.5 is F436, 3.7 is F442.
  The capture harness uses the same mapping (shoot_holdseq: t = (F - 331)/30; shoot_qc p04 0.9, p05 2.37, p06 2.97).
  The pop therefore lands 1.15 s after the physical press, against 0.88-0.9 s in the video. That is the price of the click window and is deliberate.
- Phase blend: every driver in BLENDED (L85-88) is lerped from its value at the phase change over PHASE_BLEND 0.35 s with a smoothstep (L415-421).
  It only matters at tp < 0.35 (the drivers start from 0) and at the release.
- `d.spin` = damp(spin, 0.2 per 60 Hz frame) (L422), a time constant of about 0.075 s. The tumble clock advances at `dt*spin*introSpin` (Rings L665).

### 1.2 Hold drivers (L341-358), values at key times
S = smoothstep(a,b,x); bump(t,a,b,c,d) = S(a,b,t)*(1-S(c,d,t)).
Formulas:
- align = bump(tp,0,.22,.32,.72), times the 0.35 s blend
- camExpand = sampleKeys(EXPAND_CAM)
- splitB = tp<.65 ? 0 : sampleCurve(EXPAND_POP, tp-.65, .5)
- popPose = bump(tp,.75,.88,1.05,1.5)
- expandPose = S(.85,1.5)
- tiltA = S(.9,1.8)
- spreadA = S(1.05,2.8)
- portal = bump(tp,1.95,2.25,2.5,2.85)
- faceInner = S(2.9,3.5)
- relaxA = S(3.0,3.7)
- spin target = 1 - .8*S(.3,1.1)
- energy = max(.3*tilt, S(0,.9))
- bandInner = 1; alignA = alignInner = gapA = 0
- fogHold = max(camExpand, linger)

B half separation = 1.04 m x splitB x held, with held = (1 - 0.65*expandPose)*(1 + 0.6*portal) (Rings L859).

| tp (s) | F | align | camExpand | splitB | B sep (m) | popPose | expandPose | tiltA | spreadA | portal | faceInner | relaxA | spin tgt |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 331 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 0.10 | 334 | 0.09 | 0.001 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 0.22 | 338 | 0.69 | 0.008 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 0.32 | 341 | 0.98 | 0.025 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 0.50 | 346 | 0.58 | 0.069 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.88 |
| 0.65 | 351 | 0.08 | 0.135 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.67 |
| 0.75 | 354 | 0 | 0.237 | 0.018 | 0.02 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.53 |
| 0.85 | 357 | 0 | 0.592 | 0.114 | 0.12 | 0.87 | 0 | 0 | 0 | 0 | 0 | 0 | 0.39 |
| 0.90 (p04) | 358 | 0 | 0.761 | 0.505 | 0.52 | 1 | 0.017 | 0 | 0 | 0 | 0 | 0 | 0.33 |
| 0.95 | 359.5 | 0 | 0.806 | 0.889 | 0.89 | 1 | 0.064 | 0.009 | 0 | 0 | 0 | 0 | 0.27 |
| 1.05 | 362.5 | 0 | 0.896 | 0.983 | 0.87 | 1 | 0.226 | 0.074 | 0 | 0 | 0 | 0 | 0.21 |
| 1.15 | 365.5 | 0 | 0.937 | 1 | 0.74 | 0.87 | 0.442 | 0.189 | 0.009 | 0 | 0 | 0 | 0.2 |
| 1.35 | 371.5 | 0 | 0.964 | 1 | 0.46 | 0.26 | 0.865 | 0.5 | 0.078 | 0 | 0 | 0 | 0.2 |
| 1.50 | 376 | 0 | 0.974 | 1 | 0.36 | 0 | 1 | 0.741 | 0.164 | 0 | 0 | 0 | 0.2 |
| 1.80 | 385 | 0 | 0.989 | 1 | 0.36 | 0 | 1 | 1 | 0.394 | 0 | 0 | 0 | 0.2 |
| 2.10 | 394 | 0 | 0.999 | 1 | 0.47 | 0 | 1 | 1 | 0.648 | 0.5 | 0 | 0 | 0.2 |
| 2.25-2.50 | 398-406 | 0 | 0.999 | 1 | 0.58 | 0 | 1 | 1 | 0.77-0.92 | 1 | 0 | 0 | 0.2 |
| 2.37 (p05) | 402 | 0 | 0.999 | 1 | 0.58 | 0 | 1 | 1 | 0.849 | 1 | 0 | 0 | 0.2 |
| 2.675 | 411 | 0 | 0.999 | 1 | 0.47 | 0 | 1 | 1 | 0.985 | 0.5 | 0 | 0 | 0.2 |
| 2.85 | 416.5 | 0 | 1 | 1 | 0.36 | 0 | 1 | 1 | 1 | 0 | 0 | 0 | 0.2 |
| 2.97 (p06) | 420 | 0 | 1 | 1 | 0.36 | 0 | 1 | 1 | 1 | 0 | 0.038 | 0 | 0.2 |
| 3.20 | 427 | 0 | 1 | 1 | 0.36 | 0 | 1 | 1 | 1 | 0 | 0.5 | 0.198 | 0.2 |
| 3.50 | 436 | 0 | 0.982 | 1 | 0.36 | 0 | 1 | 1 | 1 | 0 | 1 | 0.802 | 0.2 |
| 3.70+ | 442 | 0 | 0.968 (0.967 from 3.717 on) | 1 | 0.36 | 0 | 1 | 1 | 1 | 0 | 1 | 1 | 0.2 |

Notes:
- **EXPAND_CAM keys** (curves.ts L22-25): 0, .007@.183, .034@.383, .093@.583, .155@.683, .278@.783, **.746@.883**, .926@1.083, .959@1.283, .973@1.483,
  .999@1.983, 1@3.317, .98@3.517, .967@3.717. The CameraRig springs (omega 14, L34-37) lag this by about 0.07-0.1 s.
- **EXPAND_POP** (L12): 16 values over 0.5 s from tp 0.65, with the one-frame jump .219 -> .79 between tp 0.883 and 0.917.
- Holds longer than 3.717 s hold every driver constant (relaxA 1, camExpand 0.967). The A drift runs on until its tanh correction saturates (section 2.2).

### 1.3 Latches during the hold (live press)
| latch | where | sampled while | last sample (tp / F) |
|---|---|---|---|
| B halves splitSign (which half rises) | L858 | splitB < 0.005 | 0.70 / F352 |
| popSign[0..3] | L702 | popPose < 0.01 | 0.758 / F354 |
| holdSign[0..3] (face side vs N_A / N_B) | L700 | expandPose < 0.01 | 0.888 / F357.6 |
| B cutSign | L723, L764 via L483 | expandPose < 0.01 | 0.888 |
| A phase: aPhiStar, aHoldT0, aPhiAcc | L741-746 | **0 < expandPose < 0.01 only** (the block is inside `if (expandPose > 0)`) | 0.85-0.888 (about 2 frames at 60 Hz) |
| A slot labels (latchSlots) | L799 -> L492-518 | spreadA < 0.005 && tiltA < 0.005 | **0.937 / F359: inside the pop pose** |
| faceSign (C/D portal, faceInner) | L698 | align, faceInner, portal all < 0.01 | 1.967 (portal); 2.935 (faceInner) |

Debug captures (shoot_qc L82-87, shoot_sweep L61-66) call `pose(expand,0)`, `settle(0.1)`, `pose(expand,t)`, `settle(1.6)` with `blendFrom = null` (L139, L274):
- Every latch happens at tp = 0, in the tumble pose without the pop.
- expandPose jumps 0 -> value in one frame, so **the A phase latch never runs**. aPhiStar/aHoldT0/aPhiAcc stay stale: aHoldT0 = 0 from the warm-up, so raw = 6 deg/s x page time and the correction is near its +-60 deg saturation.
- The captured A in-plane angle is therefore neither the live one nor the designed one.

### 1.4 Release drivers (L371-394), t from pointer-up; f = values at release (full hold: f.splitB 1, f.cam 0.967, f.spreadA = f.tiltA = f.expandPose = f.faceInner = 1)
| t (s) | F | splitB | camExpand | spreadA, relaxA | tiltA | gapA | alignInner | alignA | bandInner | expandPose, faceInner | spin tgt |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 443 | 0.994 | 0.967 | f | f | f.spreadA | 0 | 0 | 0.57 | f | 0.2 |
| 0.10 | 446 | 0.963 | 0.875 | 0.90 f | 0.88 f | 1 | 0.16 | 0 | 0.57 | 0.99 f | 0.2 |
| 0.20 | 449 | 0.863 | 0.636 | 0.35 f | 0.28 f | 1 | 0.84 | 0.26 | 0.57 | 0.80 f | 0.2 |
| 0.25 | 450.5 | 0.532 | 0.47 | 0.10 f | 0.05 f | 1 | 1 | 0.74 | 0.57 | 0.64 f | 0.2 |
| 0.33 (p07) | 453 | 0.10 | 0.257 | 0 | 0 | 1 | 1 | 1 | 0.57 | 0.359 f | 0.21 |
| 0.40 | 455 | 0.04 | 0.16 | 0 | 0 | 1 | 1 | 1 | 0.64 | 0.14 f | 0.30 |
| 0.485 | 457.5 | 0.01 | 0.09 | 0 | 0 | 0.5 | 1 | 1 | 0.89 | 0.004 f | 0.49 |
| 0.57 (p08) | 460 | 0.001 | 0.052 | 0 | 0 | 0 | 0.86 | 1 | 1 | 0 | 0.72 |
| 0.65 | 462.5 | 0 | 0.03 | 0 | 0 | 0 | 0.5 | 0.90 | 1 | 0 | 0.90 |
| 0.80 | 467 | 0 | 0 | 0 | 0 | 0 | 0 | **0.104 -> 0 (toIdle, L393; jump)** | 1 | 0 | 1 |

Release formulas:
- splitB = f*(1 - RELEASE_RETURN(t + 0.08 over 0.667)); the snap is centred at t ≈ 0.25-0.3.
- camExpand = f.cam*(1 - RELEASE_CAM(t)).
- spreadA, relaxA = f*(1 - S(.05,.3)); tiltA = f*(1 - S(.05,.28)); gapA = f.spreadA*(1 - S(.4,.57)).
- alignInner = bump(t,.05,.25,.5,.8); alignA = bump(t,.15,.3,.6,.85).
- bandInner = .57 + .43*S(.35,.55). L232 restarts the blend at 0.57.
- expandPose, faceInner = f*(1 - S(.08,.5)).
- spin = .2 + .8*S(.3,.75); energy = 1 - S(0,.7).
- portal and popPose fall to 0 only through the 0.35 s blend.
- fogHold = max(camExpand, f_fog*(1 - S(0.6, 2.0, t))) (L426-427).

### 1.5 Engine and camera consumers
- HeroEngine L345-351: rings.root, orb, shards and uOrbCenter.y all rise by **holdLift 0.28 m x camExpand** (37 px at the hold, 24 px at p04). The camera stays on the hold plate pose.
- L367: uHold = camExpand. L370: uFogHold = fogHold. L360: Orb.update(energy*0.5, camExpand*0.5). L361: Shards.update(..., camExpand).
- CameraRig L91-133: r lerps 20.93 -> **12.7**, el -0.41 -> **-3.3 deg**, pitch -> **4.55 + 0.75 deg** (HOLD_PITCH_TRIM L29), each x camExpand.
  The pointer orbit gain drops to 0.2 (holdOrbitEnd 0.35, orbitGain spring omega 8 in / 2.5 out, L83-101), so in the hold the pointer moves the camera by only +-1 deg of azimuth and +-0.18 deg of pan.
  Logged hold camera: (0.14 +- 0.22, 2.32, 3.54). **The pointer is not what changes the arrangement between sweep shots; the press moment is.**

---------------------------------------------------------------------------------------------------

## 2. How each piece's transform is built in the hold (Rings.ts)

Hierarchy:
- rings.root: position HERO_CENTER + (0, holdLift*camExpand, 0); no rotation.
- group[ring]: quaternion q; position.y = bowlLift*expandPose for B/C/D (L791, bowlLift 0).
- pivot: per-piece position and quaternion.
- mesh: the geometry turned face-on (axis +Z, L337-342) and translated so that its bbox centre (z set to 0) sits at the pivot (L359-363).

At rest pivot.position = rest and pivot.quaternion = identity. Piece data:
- radial = normalize(rest) (L385); tangent = Z x radial (L393).
- A quarter pivots (bbox centres) at |rest| ≈ **1.90 m**. Each quarter spans +-45 deg of the 1.98-2.401 m ring (centre line 2.19 m), so its arc mid-point lies **+0.29 m** beyond the pivot and its ends at (-0.35, +-1.55) m relative to the pivot.
- B half pivots at (0, +-0.98, 0).

### 2.1 Hold frame (L653-664, recomputed every frame)
qHold = Rz(holdRollDeg -15) * Ry(holdYawDeg 0) * Rx(holdPitchDeg 20). The resulting targets (three.js world):
- **N_A** = qHold*Z = (-0.089, -0.330, 0.940): about 16 deg from the view axis, ellipse ratio 0.96.
- **N_B** = qHold*Rx(-94)*Z = (0.249, 0.929, 0.276): B nearly flat, seen **11.7 deg** from edge-on, rolled -15 deg (descending to the right).
- **Z_PORTAL** = qHold*Rx(portalTiltDeg 20)*Z = (-0.166, -0.621, 0.766): **36-40 deg off the view axis**, so the C/D "portal" rings are ellipses with ratio about 0.8.
- HX = (0.966, -0.259, 0), HY = (0.243, 0.908, 0.342). A hold-frame angle psi appears at roughly psi - 15 deg on screen.

### 2.2 Group quaternions (per ring, L669-794), in order
1. Tumble: mocap slerp at tau (L670-682). A = Ry(90t)Rx(180t) and B = Ry(90t)Rx(-135t), constant rate; C/D measured tracks. In the hold tau runs at spin 0.2.
2. Loop tip: q = Rx(loopTipDeg[i]*cos-bump around loopTipAt)*q (L683-690). Idle only in effect; leave it alone.
3. The latches of section 1.3 (L696-702, L723).
4. Alignment (L703-720): q = slerp(q, faceOn(q), max(align, alignA or alignInner)). The press's frontal pass runs tp 0-0.72.
5. **Hold block (L724-779):**
   - **A** (L729-758):
     - `toward(q, N_A, holdSign[0], 0.95*expandPose)` (L733-734): the minimal rotation of the axis, 95 % of the way. 5 % of the tumble's axis motion leaks through.
     - **Phase correction** (aPhaseOn, L738-757): phi = angle of local X in (HX, HY).
     - Latch (only while 0 < expandPose < 0.01): aPhiStar = 22 deg + k*90 deg nearest to phi; aHoldT0 = time; aPhiAcc = phi. Afterwards aPhiAcc += wrapped dphi.
     - raw = aPhiStar + 6 deg/s*(time - T0) - aPhiAcc; corr = 60 deg*tanh(raw/60 deg); `q = R(n, corr*min(1,wE))*q` with n = the current ring axis.
     - **Bug:** n ≈ holdSign*N_A, so for holdSign = -1 the rotation runs clockwise in the frame where phi is measured. The resulting phase is 2*phi - target: neither deterministic nor still.
   - **B** (L759-765): `toward(q, N_B, holdSign[1], 0.97*expandPose)`, then `spinCutAcross(q, 1, latch, 0.9*expandPose)` (L472-489).
     This turns B about its own axis so its local Y (the direction separating the halves) points along the view direction projected onto B's plane.
     The cut then runs left-right and the halves become near and far. cutSign (L483) makes the half that rises (splitSign > 0) the near one.
   - **C, D** (L766-778): `toward(q, N_B, holdSign, 0.85*expandPose)` (lie in B's bowl; **15 % of the tumble leaks**). Then `toward(q, Z_PORTAL, faceSign, 0.85*portal)`, then `toward(q, Z, faceSign, 0.85*faceInner)`.
6. Pop (L781): `toward(q, POP_AXIS[i], popSign[i], POP_WEIGHT[i]*popPose)` with weights A 0.9, B 0.8, C 0.8, D 0.6. POP_AXIS: A (-sin7, cos7, 0) gives an edge-on level band; B (sin50, cos50, 0) a diagonal slab; C Z; D tipped 15 deg (L83-93).
7. MAX_TURN 900 deg/s rate limit (L783-787), i.e. 15 deg per 60 Hz frame.
8. `toward` jumps when the tumble axis crosses the antipode of the target. A partial weight w leaves a 2(1-w)*180 deg discontinuity: **A 18 deg, B 11 deg, C/D 54 deg** at full hold. MAX_TURN only smears it over 1-4 frames.

### 2.3 Ring A quarter (pieces loop L803-854), every frame
```
s      = latched slot 0..3 (top,left,bottom,right), from latchSlots (L492-518)
k      = tiltA
wr     = radial rotated by the group quaternion; th = atan2(wr.y, wr.x)   (L813-814; pre-slide, current screen angle)
outHold= aOutBase + aOutAmp*cos(th - aOutPhaseDeg) + aOutH*cos^2(th) + 0.06*(rand-0.5)          (L816)
lower  = 1 - S(-0.3, 0.3, wr.y/|wr.xy|)                                                       (L819)
tiltCap= lerp(|aSlotTilt[s]|, min(|aSlotTilt[s]|, aLowerTiltCap), lower)                      (L820-821)
out    = splay*.. + spreadA*outHold*(1-0.45*relaxA) + gapA*0.24 + popChunk                    (L827)
slide  = Rz_local(aSlotSlide[s]*k)                                                            (L828)
pos    = slide * ( rest*lerp(1, holdCompact, spreadA) + radial*out ),  pos.z += aSlotAxial[s]*k (L830-831)
pos   += groupQ^-1 * (0, (aLift + aLowerLift*lower)*spreadA*(1-0.4*relaxA), 0)    world-up    (L834-838)
pos   += groupQ^-1 * (0, +-0.22*chunkK, 0)                                        pop only    (L839-842)
tilt   = sign(aSlotTilt[s])*tiltCap*k*S(0.15,0.35,max(out,0.3*spreadA)) (+splay term)        (L846)
roll   = spreadA*aRoll*r2,  r2 = hash(rand) in [-1,1]                                         (L847)
quat   = slide * Rz_local((aSlotSpin[s] + aSpinAmp*cos th)*k) * R(tangent,tilt)*R(radial,roll) * wobble   (L848-854)
```
Values in use:
- holdCompact 0.78, aOutBase -0.22, aOutAmp 0.15, aOutPhaseDeg 65, aOutH 0.35, aLowerLift 0.7, aLift 0.
- aSlotSlide [-24, 24, -24, 24]; aSlotTilt [55, -42, 48, -55]; aLowerTiltCap 18; aSpinAmp 22; aRoll 0.25; aSlotSpin and aSlotAxial all 0.

At p06 (spreadA 1, tiltA 1, relaxA 0), by pre-slide screen angle th:

| th | outHold (m) | pivot radius (m) (rest 1.90) | arc mid-point (m) | world-up lift (m) | effective tilt |
|---|---|---|---|---|---|
| 90 (top) | -0.084 | **1.40** (-0.50) | 1.69 (225 px) | 0 | 46 deg (55 x 0.844) |
| 0 (right) | +0.193 | **1.68** (-0.22) | 1.97 (262 px) | 0.35 (lower 0.5) | 31-46 deg |
| 180 (left) | +0.067 | **1.55** (-0.35) | 1.84 (245 px) | 0.35 | 26-35 deg |
| 270 (bottom) | -0.356 | **1.13** (-0.77) | 1.42, then lifted 0.7 m to about 0.7 m *below the orb centre* | **0.70** | 15 deg (capped) |

The tilt smoothstep saturates at 0.844, because out < 0 and the fallback 0.3*spreadA takes over. With A's phase at about +20 deg, the left quarter (th ≈ 200 deg, sin < -0.3) also gets lower = 1, i.e. the full 0.7 m lift.

### 2.4 Ring B half (L855-866)
- splitSign latched at tp < 0.70 (the higher half rises).
- held = (1 - 0.65*expandPose)*(1 + 0.6*portal).
- dy = splitB*held*(+0.47 | -0.57).
- **pos = rest + groupQ^-1*(0, dy, 0)** (a world-Y translation only).
- **quat = splay wobble = identity in the hold.**
- The two halves therefore always share B's orientation: one ring that is cut and slid apart.

### 2.5 Ring C, D
Single piece, pivot at the origin. Only the group quaternion moves them.

### 2.6 Rest-state guard (must survive any change)
L870-876: uJoined = 1 only if |pivot - rest|^2 < 1e-6 and |q.w| > 0.99999. Every hold term is multiplied by spreadA, tiltA, splitB, popPose, gapA or splay, which are exactly 0 at rest.

---------------------------------------------------------------------------------------------------

## 3. Reference arrangement, measured (pixels on 1440x766)

| frame | what the reference shows |
|---|---|
| F358 (ref_F358) | X: B is **one continuous thick diagonal bar** (500,167)-(933,613), about 110 px thick. A is an edge-on band (515-985, 290-470) rising to the right. End quarters thrown out at (370-495, 375-500) and (940-1080, 290-415). C/D face-on behind. |
| F380 | One compact cluster of stacked chunky slabs (315-1125, 170-585). The orb shows **only as a slit** (620-810, 385-420), between slabs above and below that are both in front of it. |
| F402 (ref_F402) | "Eye": a chunky diagonal B slab (735-1110, 177-530) over the **orb's upper half**, a block at the upper left (360-640, 130-310), C/D **near-circular** face-on rings framing the orb (outer about 515-900 x 190-590, 385x400 px). Orb visible (610-830, 340-500). Nothing below y about 614. |
| F412 | Arcs emerging: top-left (365-710, 85-265), right (810-1130, 160-550), bottom (740-1070, 545-650). B slabs still large. |
| **F420** (ref_F420) | **Four separated arcs.** Top-left 380-765 x 45-235, left 355-620 x 235-570, right 850-1140 x 145-585, bottom 695-1060 x 545-680. Set bbox **355-1140 x 45-680 (785x635)**, centre (748,362). Arc mid-points relative to the orb (about (725,395-420)): **117 deg/2.5 m, 185 deg/2.32 m, 302 deg/2.17 m, 2 deg/2.65 m**. Pairs **(top,left)** 56-68 deg apart and **(bottom,right)** 59-60 deg apart. **Sky gaps about 90-130 px at about 1 and about 7 o'clock**; near-touching at about 10 and 4-5 o'clock. B lens **400-930 (end block to about 1020) x 290-506**: both lips in front of the orb, cap y 283-312 at x 690-770, bright slit y about 405-445 at x 580-820. No C/D visible above or below the lens. |
| F428 | Same layout: top 400-810 x 20-205, left 350-590 x 220-580, right 900-1145 x 140-585, bottom 655-1035 x 575-710. Lens 400-1015 x 285-505. Still no C/D outside the lens. |
| F436 | The top and bottom arcs turned about 12-16 deg clockwise while the side arcs stay put (pairs even out: 75 / 78 deg). Radii unchanged or slightly larger (top arc touches y about 0, bottom 600-730). B is a **single band** across the orb (390-930, 370-495). C/D **face-on** rings around the orb (525-920, 215-555). Orb top visible (620-790, 290-370). |
| F453 (ref_F453) | A is a broken circle of four even arcs with **gaps on the diagonals** (top 565-860 x 155-240, left 485-575 x 240-535, right 865-955 x 235-535, bottom 580-870 x 530-610), pushed out about 0.22 m (gapA 0.24 ✓). Inner rings a tilted whirlpool (545-895, 260-520). |

The doc (5.4) asks for "+0.45..+0.8 m radial, set rotated 15-20 deg counter-clockwise". Measured relative to the rest centre line (2.19 m), the push is +0.31 (top), +0.46 (right), +0.13 (left) and -0.02 (bottom). That is equivalent to a uniform push of about +0.2-0.25 m plus a whole-set offset of about (+0.15, +0.25..+0.45) m up-right of the orb, and a mean in-plane rotation of about +16.5 deg (screen, counter-clockwise).

---------------------------------------------------------------------------------------------------

## 4. Diagnosis of each symptom (engine captures)

### 4.1 Compact "G" / horseshoe swirl (p06; also p05, sw_hold_*)
p06: the top+right chain runs from (565,140) across the top (y 122-215) down to (1040-1090, 300-455). The left arc runs 465-650 x 215-655. B is a diagonal band 460-985 x 265-560. The mouth of the G is open at about 4-6 o'clock, between (640,650) and (1085,455). Bbox 462-1088 x 122-652 (626x530), centre (775,387).

Causes:
1. **Slide pairing** (L110, L568 -> L828). With labels correct and holdSign +1:
   - top -24 deg (moves clockwise), left +24 (counter-clockwise), bottom -24 (clockwise), right +24 (counter-clockwise).
   - Centres after the slide, including the about 20 deg base phase: right 44, top 86, left 224, bottom 266 deg.
   - Pairs 42 deg apart overlap by **48 deg** and chain into two about 130 deg arcs; the 48 deg gaps sit at about 155 and 335 deg (10-11 and 4-5 o'clock).
   - F420's pairs are the other neighbours and are 56-68 deg apart, with the gaps at about 60 and 243 deg.
2. **The bottom quarter is pulled in and lifted into B.** Its outHold is -0.356 and holdCompact takes another -0.42 (radius 1.13 m), then aLowerLift adds +0.7 m world-up (L836). Its pivot ends about 0.43 m below the orb centre, behind and inside B's band, so the bottom arc vanishes from the silhouette. F420's bottom arc is at y 545-680.
3. **Press-moment dependence picks the chirality.** The pairing is (top,right)/(left,bottom) or (top,left)/(right,bottom) depending on label parity XOR holdSign[0] (section 4.6). p05 shows the latter, p06 the former, within one run.

### 4.2 Arcs standing up "like horns" (sw_hold_L 840-1000 x 35-520, sw_hold_BL 720-960 x 25-440, sw_hold_R 680-985 x 40-460)
A side quarter labelled "right" slides +24 deg counter-clockwise, putting its upper end at about 89 deg, i.e. 12 o'clock. Then:
- The screen-angle spin, aSpinAmp 22 x cos(th) ≈ +21 deg (L853), swings its top inwards towards the centre.
- Its pivot is above the horizon (lower ≈ 0), so the -55 deg slot tilt is not capped (46 deg effective, L820-821, L846). The arc shows its full broad face as a tall slab.
- Result: one arc runs from about 4 o'clock up to the top centre, 2.6-2.8 m above the orb (y 25-40), while the rest of the set is compact.
- With holdSign = -1 the spin mirrors and the side tops flare *outwards* instead (a V).
F420's side arcs are near-vertical (right arc 850-1140 x 145-585, top end at about 62 deg) and never reach 12 o'clock.

### 4.3 p05 tail dipping into the lake (right chain 820-995 x 235-682, tail 820-900 x 600-682, far shore at y about 615)
At p05 (tp 2.37, spreadA 0.849, portal 1) the right chain is (right quarter + bottom quarter): the mirrored pairing.
- The right-side quarter (th ≈ +12..20 deg, so lower ≈ 0..0.17) carries a **-24 deg (clockwise) slide** and a **+55 deg tilt** through a mislabel ("top"/"bottom" slot).
- Its pivot sits at about 1.72 m and gets about 0.1 m of lift at most.
- The +21 deg spin swings its lower end out and down: about (1.7, -1.95) m from the orb, about 260 px below it, i.e. y about 666-682.
- **The "lower" safety terms (lift and tilt cap) are evaluated at the pivot direction, not at the piece's lowest point**, so a piece pivoted above the horizon can still dangle 2 m below.
- bPortalSplit 0.6 (L621) also parts B further at that moment.
F402 has nothing below y about 614.

### 4.4 The orb fully exposed (p05 orb 630-830 x 297-515; p06 orb's upper 92 px, y 298-390, bare)
- B is nearly flat (N_B, 11.7 deg elevation). Its near-half band, at the middle of the near half, spans -R sin(a) + dy +- (0.344 cos a + 0.172 sin a) = -0.35 + 0.165 +- 0.372 m = **[-74, +25] px** relative to the orb centre. The far half is behind the orb.
- The orb (+-110 px) is therefore bare from +25 to +110 px, its upper 39 %.
- The roll of -15 deg tilts the band, so on the right the orb is exposed down to about y 430.
- At the portal (held 0.56) the band only moves to [-58, +32] px, and C/D frame the orb face-on, so p05's orb reads fully exposed.
- F402 wants the slab over the orb's **upper** half. F420 wants both lips over it.
- **No single value of bSplitHeld or bowlLift can hide the orb with one flat ring.** Only one lip (about 92 px of B's 0.688 m section height) can ever be in front of the 220 px orb.

### 4.5 About 21 % smaller extent (626x530 vs 785x635; judge 612x504 vs 774x648)
Arc mid-points at p06 are 1.42-1.97 m from the orb, against F420's 2.17-2.65 m, i.e. 80-110 px short on every bisector. The causes, in order of size:
- holdCompact 0.78: -0.42 m on every pivot (L619, L830).
- aOutBase -0.22: -0.22 m (L559, L816).
- aLowerLift 0.7: the bottom arc is lifted out of the silhouette (L555, L836).
- The slide chaining reduces four arcs to two (L110).
- aSpinAmp 22 leans the side arcs inwards or outwards (L578, L853).
- The 46 deg tangent tilts flatten the top arc's sagitta (0.64 -> about 0.37 m).
- The camera is not the cause: it matches (orb about 200-220 px in both).

Why the constants were set this way: the comments at L541-545, L551, L554, L557-558, L562 and L618 all cite **probe_holdbounds (worst press moment)**. Because the layout changes with the press moment, the worst case decided the size.

### 4.6 Why it reads messy or random
1. **The A slot labels come from the pop pose** (latchSlots last runs at tp 0.937, inside popPose = 1). The labels are shifted by a random k x 90 deg against the final places. The slide and tilt arrays have period 2, so odd k swaps the pairs and the tilt signs.
2. **holdSign[0] mirrors** slide, spin and tilt on screen, because they are local-Z rotations (L828, L853) and a local-tangent tilt (L846).
3. **The phase-correction sign bug** for holdSign = -1 (L755-756). Half the presses get phase 2*phi - target: not deterministic, and rotating at twice the residual tumble rate until the +-60 deg tanh saturates.
4. **The fragile phase latch window** (L741-746): about 2 frames at 60 Hz; skipped entirely at <= 26 fps (HeroEngine caps dt at 1/20). It is never exercised by the QC/sweep harness, so **every p05/p06/sw_hold capture shows a stale, near-saturated correction**.
5. **Tumble leak through `toward`**: A 5 %, B 3 %, **C/D 15 %** (up to +-27 deg of axis wobble that differs per press), plus antipode jumps (section 2.2 item 8).
6. **B's split breathes**: 0.89 m at tp 0.95, 0.36 m at 1.5, 0.58 m at the portal, 0.36 m at 2.85. The reference opens once and holds +0.47/-0.57.
7. **C/D make three large turns in 2 s**: into the bowl, then the portal at tp 1.95-2.25, back into the bowl at 2.5-2.85, then face-on at 2.9-3.5. faceSign is latched from the *tumble* axis (L698), not the post-hold axis, so faceInner can flip C/D through about 100 deg.
8. **The drift has the wrong sense**: aPhaseDrift is +6 deg/s counter-clockwise, while F420 -> F436 shows the pairs evening out with a net about 7 deg clockwise.
9. **Dead or neutral knobs** make tuning opaque: aSlotOut (L550), holdW (L398, L420-424), A_EXPAND_TURN (L56); aSlotAxial, aSlotSpin, aHoldTiltDeg, holdYawDeg, bowlLift and aLift are all 0.

### 4.7 Pop and release (T21 context)
- **p04 vs F358**: B's diagonal is two blocks, (530-700, 200-330) and (760-910, 420-550), against one bar (500,167)-(933,613).
  - B's cut-line orientation at the pop is uncontrolled: spinCutAcross only acts with expandPose weight, which is 0.017 at p04.
  - The halves are already 0.52 m apart (splitB 0.505, held about 1).
  - The hero is about 35 px low (holdLift gives 0.21 m at camExpand 0.761).
- **p07 vs F453**: our gaps sit at about 12:30, 4, 7 and 9:30, roughly 22-30 deg counter-clockwise off the diagonals (a pinwheel). The release has **no in-plane target for A**: the phase is the tumble's plus the hold correction unwinding (corr x min(1, expandPose)), up to 60 deg over 0.42 s.
- **alignA discontinuity**: bump(t, .15, .3, .6, .85) is 0.104 at t = 0.8, when toIdle (RELEASE_LEN 0.8, L79/L393) drops it to 0 without a blend. Ring A jumps by up to about 9 deg (10 % of its face-on correction) at the end of every release. It is below MAX_TURN, so nothing catches it.

---------------------------------------------------------------------------------------------------

## 5. What has to change for the reference arrangement

Order matters: determinism first. Once one press gives one layout, size can be tuned to F420 directly, and probe_holdbounds only has to check a single layout plus the +-1 deg hold orbit.

### 5.1 Make the hold deterministic (ring A), Rings.ts
1. **Phase-correction sign** (L755-756): rotate by `sgn*corr*min(1,wE)` with `sgn = n.dot(N_A) >= 0 ? 1 : -1`, or rotate about N_A itself.
2. **Robust latch** (L738-751): track phi every frame whenever expandPose <= 1e-4 (aPhiStar = nearest base + k*90, T0 = time, aPhiAcc = aPhiPrev = phi), and accumulate only while it is > 0. Move this out of the `if (d.expandPose > 0)` block. This survives any frame rate and the debug jump.
3. **Slot labels from the target, not from the pop pose** (L799, L492-518):
   - Latch the labels in the same frame as aPhiStar.
   - Compute each quarter's *final* hold-frame angle psi_i = aPhiStar + hs*(local angle of its radial), with hs = holdSign[0].
   - slot = nearest of 90/180/270/0 deg relative to the base.
   - Do not re-latch while tiltA or spreadA > 0.
   - Alternative: make slide and tilt continuous functions of the deterministic screen angle (slide = S*sin(2(th - th0))), which removes labels altogether.
4. **Screen-consistent per-slot rotations**: multiply the slide angle (L828), the spin (L853) and the tilt sign (L846) by hs, so both face sides give the same screen layout. The quarters are congruent and front/back symmetric.
5. Keep the hold alive deterministically instead of through tumble leak (the user's rule: rings keep moving): a slow set rotation (aPhaseDrift) plus small per-arc wobbles.
   Prefer slerping the full quaternion to a moving target with weight 1, rather than `toward()` at 0.95 on a running tumble (no antipode jumps).
   Apply the same treatment to C/D (0.85 -> about 0.95-1.0 plus a deterministic slow precession).

### 5.2 Ring A geometry for F420 (Rings.tune; target values, then fine-tune on a deterministic capture)
| knob (line) | now | target | effect |
|---|---|---|---|
| holdCompact (L619) | 0.78 | **1.0** | stop pulling the arcs in |
| aOutBase (L559) | -0.22 | **+0.20** | uniform push: centre line about 2.4 m |
| aOutAmp / aOutPhaseDeg (L560, L564) | 0.15 / 65 | **0.20 / 65** | up-right bias = F420's set offset |
| aOutH (L563) | 0.35 | **0.10** | slightly wider than tall (785x635) |
| aLowerLift (L555) | 0.7 | **0** (move the set with aLift about 0.1-0.25 m plus a new aShiftX about +0.15 m, both x spreadA, if needed) | the bottom arc stays at y 545-680 |
| aSlotSlide (L110, L568) | [-24, 24, -24, 24] local | **[+12, -12, +12, -12] screen (x hs)** for [top, left, bottom, right]; multiply by (1 - relaxA) | pairs (top,left)/(bottom,right) 58-66 deg apart; sky gaps at 1 and 7 o'clock; evens out by F436 |
| aPhaseDeg (L615) | 22 (hold frame) | **about 31 deg** hold frame (= about 16.5 deg screen with the -15 deg roll); or about 16 if A gets its own roll 0 | arc mid-points at about 117/185/302/2 deg |
| aPhaseDrift (L616) | +6 deg/s | 0..-5 deg/s | F420 -> F436 drifts about 7 deg clockwise |
| aSpinAmp (L578) | 22 | **0-6** | no horns or A-frames |
| aSlotTilt (L104, L566) | [55, -42, 48, -55] | about [40, -40, 40, -40] x hs | broad faces without 55 deg sweeps |
| aLowerTiltCap (L570) and the `lower` test (L819) | 18, evaluated at the pivot | about 30, evaluated at the piece's **lowest point** (or the end at centre - 45 deg) | no tails below the far shore (y 615) at any phase |
| aRoll (L571) | 0.25 | 0.10 | less random roll |
| spreadA timing (Choreography L348) | S(1.05, 2.8) | about S(1.6, 2.9) | F402 still compact (eye), out by F412-F416 |
| relaxA use (L827, L836) | out x(1 - 0.45*relaxA) | relax mainly the slides; keep the radius (F436's arcs are not pulled in) | |

Acceptance at p06/F420:
- bbox 770-800 x 620-650 centred within +-15 px of (748,362);
- sky gaps >= 80 px at about 1 and about 7 o'clock;
- side-arc lean <= 10 deg;
- nothing below y 690;
- identical within +-10 px across 8 press phases (tau 0, 0.5 ... 3.5).

### 5.3 B lens (both lips in front of the orb)
A per-half rotation is needed. Recommended construction, a **clamshell**:
- B's group hold target is **face-on** (axis about the view axis), with the cut line horizontal. spinCutAcross (L472-489) becomes "local Y = screen up", taking the 0/180 deg variant that is nearer; the halves are congruent.
- Each half then rotates about the cut line by +-h*theta, upper half top-forward and lower half bottom-forward, with **theta about 75-85 deg** and h = expandPose.
- Code: in the B branch (L855-866), `pivot.quaternion = Rx(+-h*theta)*wobble` and `pivot.position = Rx(+-h*theta)*rest + groupQ^-1*(0,dy,0)`. rest = (0, +-0.98, 0), so the hinge is the ring's X axis, i.e. the cut line.
- Both half-rings then lie nearly edge-on, extending towards the camera from the cut line. Both are in front of the orb, stacked: the lens.
- Orthographic check: lens height ≈ 2(R cos(theta) + 0.344 sin(theta) + 0.172 cos(theta)) + 1.04 s, with R = 1.788 m. theta = 80 deg and split share s ≈ 0.25 give **1.62 m ≈ 216 px** (F420: 216 px, y 290-506); slit ≈ 20-40 px.
- The width is set by the hinge ends, which sit at the orb's depth, so it is about 2 x 1.97 m ≈ 525-535 px (F420: lens 400-930 = 530 px). Perspective adds little there.
- The lips' middles sit up to 1.76 m in front of the orb, so their height grows by about 15 %. Expect theta ≈ 83-85 deg with s ≈ 0.3-0.35 after one capture.
- It also explains F380 and F402 (stacked slabs over the orb's upper half, rolled about -20..-30 deg) and F436 (the lens closes into one band as s -> 0 and the hinge goes to about 90 deg).
- The pop's single bar (F358) is theta = 0 with B edge-on and the cut along the bar. The halves stay slab-like through pop -> hold if the group's turn to face-on is about the cut line while the halves counter-hinge.
- Related knobs:
  - bSplitHeld 0.35 -> about 0.25-0.6, tuned for the slit.
  - Remove the breathing: one monotonic split, no (1 - 0.65*expandPose) dip.
  - bPortalSplit 0.6 -> 0-0.15.
  - B's roll: give B its own roll, about -25 deg x portal at F402 and 0 at F420. qHold (L655-658) is shared by every ring, so do not change holdRollDeg globally (A's phase is measured in it).
  - Lens bbox 400-930 x 290-506 at F420.
- Fallback if per-half rotation is rejected: a "scissor". C's hold normal tilted the other way (seen from below, so its near half rises in front of the orb's upper part) with B's near half as the lower lip. The upper lip would be C-wide (about 415 px), narrower than F420's lip.

### 5.4 C/D
- Portal (F402): near-circular. Z_PORTAL (L661) should ignore the hold pitch (portalTiltDeg about -20..-15 to cancel it, or compute it outside qHold). The current ellipse ratio is about 0.8.
- F408-F428: hidden inside the lens. With the clamshell this means lying nearly flat between the lips (their own near-horizontal normal, not N_B).
- Face-on only from about F430 to F436: faceInner S(2.9, 3.5) -> about S(3.25, 3.55). At F428 the reference shows no C/D outside the lens; ours would be at 0.55.
- Latch faceSign from the post-hold axis (or reuse holdSign) to avoid about 100 deg flips.
- Leak 0.85 -> 0.95-1.0, with a deterministic slow spin about their own axes.

### 5.5 Pop (F358) and release (F453/F460)
- Pop: apply the cut-across turn (or an explicit in-plane target) with weight popPose, so the cut runs **along** the B bar. Keep the split small during the pop (T21: held *= 1 - 0.85*popPose). popLift about 0.3 m x popPose (T21) for the 35 px.
- Release: give A an in-plane target, with quarters centred at 0/90/180/270 deg screen (gaps on the diagonals, F453), weighted max(gapA, alignA)*(1 - expandPose), replacing the unwinding hold correction. Keep MAX_TURN.
- Fix the end-of-release jump: RELEASE_LEN 0.8 -> **0.85** (L79), or end the alignA bump at 0.8 (L384).

### 5.6 Harness (so the judge sees the live hold)
- shoot_qc.mjs L82-87 and shoot_sweep.mjs L61-66 should **step** the hold. With tau pinned at the press: `for (x = 0; x <= t; x += 1/60) { pose('expand', x); settle(1/60) }`, then settle.
- After 5.1, capture p06 at 8 press phases and require the same layout.

### 5.7 Notes on round-10 plan T12/T15/T21
- **T12** would not reach F420:
  - holdCompact 0.97, aOutBase -0.08, aOutAmp 0.2 and aOutH 0.1 leave the arc mid-points 35-55 px short (top 2.23 vs 2.5 m, right 2.24 vs 2.65, left 2.07 vs 2.32).
  - aLowerLift 0.5 leaves the bottom arc about 100 px high.
  - +-16 with the current sign pattern still pairs (top,right)/(left,bottom), the mirror of F420, and 50 % of presses flip anyway.
  - **bSplitHeld 0.12 exposes more of the orb** (+10..+110 px bare).
- **T15**'s bPortalRollDeg and a lower-lift during the portal treat symptoms of 4.3 and 4.4. Evaluating "lower" at the piece's lowest point fixes the tail at every phase.
- T21's items are compatible with 5.5.

---------------------------------------------------------------------------------------------------

## 6. What must NOT change

- **Rest pose and seamless rings**:
  - Every new term must be multiplied by a hold driver that is exactly 0 at rest, so that pivot == rest and quaternion == identity (uJoined test, Rings L870-876: |dpos|^2 < 1e-6, |q.w| > 0.99999).
  - Keep the geometry prep (L316-401: toFront, bbox-centre pivots, subdivideMidpoint, uNoiseOffset per ring).
- **Idle loop**: RING_MOCAP and RING_MOCAP_STEP; loopTipDeg [5,2,8,8], loopTipAt [0,.5,.5,.5], loopTipWidth .45 (L589-591); EYE_TIME 1.5; the intro clock (HeroEngine L333, introSpinIntegral); spin and introSpin scaling. The hold and release latches are fine to compute in idle as long as their weights are 0 there.
- **Click does nothing**: HOLD_ARM 0.25 and the press/arm logic (L207-250, L336-340).
- **Release continuity**:
  - releaseFrom plus the PHASE_BLEND 0.35 blend (L227, L237-243, L415-421);
  - RELEASE_RETURN at t + 0.08 (snap centred near F453) and RELEASE_CAM;
  - the bandInner restart (L232); dRelSnapDeg/dRelHomeDeg and Q_RES (F453/F460);
  - MAX_TURN 900 deg/s as a safety net.
  - New hold rotations (B hinge, A slot offsets, A in-plane targets) must fade with drivers that decay continuously in the release (expandPose, tiltA, spreadA, gapA), never by a branch.
- **Pop timing and hold dolly**: EXPAND_POP, EXPAND_CAM, CAM_TARGETS.expand (r 12.7, el -3.3, pitch 4.55 + 0.75 trim).
  - The hold plates are registered to that camera: keep it while the projected environment ships, and move the hero (holdLift) rather than the camera.
  - The fog timing (fogHold, linger 0.6-2.0 s) stays as it is.
- **Debug API** (`__hero.debug.pose/pointer/freeze/settle`, `rings.tune`, `rings.tau`): the capture scripts depend on it.
- **The "keeps moving" rule**: a deterministic layout must still drift and wobble slowly. It must not freeze into a static pose.
