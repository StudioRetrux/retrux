# P4 round 2, lane p4hold: HANDOFF (21 Nov 2026, 01:10-02:25 WIB)

Builder of lane `hold`: Q12 (hold framing), Q13 (pop timing), N-1 / R8-1 (render loop restart after a context restore) and R8-2
(the 4 MiB panorama kept in JS memory). Lane = LANES/aa8 (== MAIN app since 01:10) + `p4hold_vs_aa8.patch`. Lab :5178 left running
(pid 29680, `--no-watch`, built 01:19 from the final source; no source edit after that). WORK = $SP/work_p4/p4hold (LOG.md has every
attempt with numbers); mirror = MAIN/notes/round11/lane_backup/p4r2/p4hold/.

## Switches (all URL; every one proved by ident where it can touch a frame)
| switch | effect |
|---|---|
| `?p4hold=0` | the whole lane off = AA8 / MAIN exactly (ident: T1, T2, T0 phone, plate lake, at rest and at hold poses p04 / p06 / p07) |
| `?holdcam=r11` | Q12 off (the r11 steady-hold camera exactly) |
| `?holdpop=r11` | Q13 off (pop0 0.7 / pop1 1.08 / grow0 1.0) |
| `?ctxrun=0` | N-1 off (a restore leaves the loop stopped until a visibility / intersection change, as AA8) |
| `?panokeep=1` | R8-2 off (the clamped panorama is kept for the page's life, as AA8; the restore is then synchronous) |
Q12 / Q13 apply only on the default steady hold (P2B_F2), so every older-build switch (`?spin=f1 / hf / p2b / f2 / s3`, `?hold=r10 /
r11a`) stays exact. No shader, no asset, no new pass: every linked program is identical to MAIN in every ident (rest and hold).

## Files (patch vs aa8: 4 files, 238 lines, 13 hunks, sha256 2434e13e200cf88a57203b25def0e739ef61209ce09613a6218fac5808425cf4)
- `app/hero/engine/CameraRig.ts` (Q12; 4 hunks): import P4_HOLDCAM; in update()'s r11 branch the pitch lerps by
  kp = camExpand x holdFit (the full hold share; a rotation, no parallax) while r / el stay on k = camExpand x holdShare, and el drops
  by (kp - k)(expand.pitch + HOLD_PITCH_TRIM - rest.pitch), so pitch + el (the orb's angle in the frame) is unchanged; frameFits()
  uses the same lower el for the lifted centre's look-at coordinates (dp unchanged) and frameShare's cache key adds holdFit.
  At rest kp = k = 0 and the branch is skipped (bit-identical: ident).
- `app/hero/engine/hero/HoldR11.ts` (switches + Q13; 2 hunks): P4HOLD / P4_HOLDCAM / P4_HOLDPOP after P2B_F2; HOLD_SPIN pop0 0.7 -> 0.80,
  pop1 1.08 -> 0.94, grow0 1.0 -> 0.94 (the quick part completes with the lunge, the slow growth takes over there: no plateau).
  popShare, grow1, close0 / close1, every release value and HOLD_ARM 0.25 unchanged. No overshoot (EXPAND_POP's settle is monotone:
  an overshoot would be invented).
- `app/hero/engine/HeroEngine.ts` (N-1 / R8-2; 6 small hunks, for the merge with p4orb): line 2 import adds `reloadPanorama`; one NEW
  import line `import { P4HOLD } from "./hero/HoldR11";` before the IceMaterial import; new fields after `private panorama?`
  (p4ctx, p4pano, restoreGen, restoring, runPending); onRestored calls `restoreAfterLoss()` (else AA8's restoreBaked()); load():
  `if (!this.p4pano) this.panorama = assets.panorama;`; updateRunning(): while `restoring` it only notes runPending; restoreBaked takes
  the panorama as a parameter (default this.panorama = AA8) and the new restoreAfterLoss() follows it.
- `app/hero/engine/assets.ts` (R8-2; 1 hunk, appended at the end, no existing line touched): `reloadPanorama(base)` = fetch
  (`cache: "force-cache"`) + the same EXRLoader / DataTexture settings as loadHeroAssets' `exr("panorama", ...)`.
No assets added. Typecheck in the lane: `npx tsc -p tsconfig.hero.json --noEmit` rc 0, `npx tsc -p tsconfig.json --noEmit
--incremental false` rc 0 (0 lines; tsbuildinfo untouched). Apply test on a fresh aa8 clone: rc 0, no .orig / .rej, == lane, tsc 0 / 0.

## Q12 hold framing: done
- Numbers (probe_cam, 1440x766, ana/probe_cam_1440.txt): p06 camera y 2.356 -> 2.166 (A2 8.1: the reference's ~2.10), pitch
  4.587 -> 5.372 deg incl. the drift (+0.785, the 23 px the steady share lost), orb screen centre (723.4, 393.2) in both, holdShare
  0.8532 -> 0.8536. p07 continuous (y 2.716 -> 2.652).
- Background shift lane vs MAIN (bgshift.py block matching, ana/bgshift_lane_vs_main.txt), p06 / p05: far peak +20.0, mountain base
  +15.0, iceberg +17.7, right shore +15.6, near floes +12.0 px (the lower camera lifts near content, as predicted); p04 +15 / +11.
  With the panel's landmarks: floe / mountain-base line 605 -> ~620 (gate 615-620), left peak 322 -> ~342 (gate ~350), iceberg
  waterline 587 -> ~605 (F420 607), orb (723, 393) (gate 720 +-5, 392 +-8). Direct vs the reference (peak strip, the one clean
  match; ana/bgshift_vs_ref.txt): MAIN -22.0 / -21.8 / -22.2 px (p06 / p05 / p04) -> lane -1.8 / -7.6 / -6.3.
  Looked at: img/p06_left_MAIN_LANE_F420.png (peak ~320 / ~342 / F420 ~348; floe line ~590 / ~610 / ~612), img/p06_right_...
  (iceberg top ~440 / ~458 / ~455, waterline ~585 / ~602 / ~605), qc_final/cmp_p05_expand.jpg, cmp_p06_sustain.jpg.
- Bottom strip (the plan's G2 risk; img/bottom_p06_p05_MAIN_LANE_REF.png): the far slab row now sits at the strip's top edge as in
  F420 / F402; the pre-existing G2 crest arc sits lower (more grazing); no new artefact.
- Frame bounds (probe_holdbounds, 16 press moments, bbox; ana/holdbounds.txt): p06 MAIN T-21 B792 L301 R1137, lane T-22 B790 L301
  R1137 (same framing sphere); p04 lane T69 B686 L398 R1070 (MAIN T81 B678 L406 R1060: the wider pop), inside.
- Other shapes (ana/probe_cam_shapes.txt): 390x844 (share 0) and 1280x800 (share 1): kp = k, identical numbers to MAIN.

## Q13 pop timing: done
- spreadA / splitB at p04 (tp 0.9) 0.324 -> 0.481, tp 0.94 0.6; p05 0.872 -> 0.878, p06 0.988 -> 0.988 (sustain unchanged).
  Through the pop (ana/popstrip.txt) tp 0.80 / 0.85 / 0.90 / 0.94 / 1.00 / 1.10: MAIN 0.103 / 0.207 / 0.324 / 0.416 / 0.531 / 0.602,
  lane 0 / 0.175 / 0.481 / 0.600 / 0.601 / 0.606 with camExpand 0.296 / 0.608 / 0.765 / 0.815 / 0.863 / 0.910: the burst sits in the
  lunge and the reference's split window (EXPAND_POP 0.219 -> 0.79 at tp 0.883-0.917).
  Looked at img/p04_hero_MAIN_LANE_F358.png: MAIN one continuous band ("a ring skewered by a log"); lane: the band's end blocks
  separate at both ends with crossed slabs, closer to F358.
- Motion (probe_speed, new: deterministic stepped press, pointer on the orb, 4 press moments, ring-piece bbox-corner speed px per
  60 Hz frame incl. the lunge; ana/speed_press.txt): pop window tp 0.65-1.2 ring A p99 / max 24.47 / 27.57 -> 27.13 / 30.50
  (+11 %), ring B 19.56 / 21.27 -> 20.00 / 22.05; charge, sustain (A p99 8.44 -> 8.47) and release unchanged. The reference's pop
  is faster still (quarters ~40 px per 30 fps frame; ring B's split 0.219 -> 0.79 in one 30 fps frame); ours opens <= 0.107 / frame.
- probe_interact (ana/interact.txt, MAIN x1, lane x2): click inert (0 drivers, never holding); hold opening step max 0.040 -> 0.107
  (the designed peak), ring 3.54 -> 3.53 deg / frame, camera 0.858 -> 0.863; re-press during the release works (0.048 -> 0.106),
  release / release 2 unchanged; no errors. openKick unchanged and spinOpenAt stays monotone (pop0 moved later, past the <= 0.35 s kick).
- Crystal capsules: cfine.py is gone with work2; argued in LOG.md (01:45-02:15): the clearance from ring A's opened sphere is convex
  in the shared driver spreadA (bulge <= ~1.4 mm) against +0.106 m at full opening (any orientation) and ~+0.33 m at rest, so the
  timing cannot make a crystal cross an opening quarter.

## N-1 / R8-1 loop restart after a context restore: done
- restoreAfterLoss(): the PMREM is rebuilt (restoreBaked) once the panorama is back, then updateRunning() (only when visible and on
  screen). While it waits the loop stays stopped (blank canvas, as during the loss), so no frame is drawn with the empty PMREM; a
  start asked for meanwhile runs after it. A second loss during the reload drops the stale result. If the reload fails the restore
  goes on without it (environment light empty, as before AA8) rather than leave the hero blank, with a console warning.
- Live loop, NO visibilitychange (ctxlive.mjs from the recheck's ctxloss2; ana/ctxlive2.txt, ctxlive.txt): lane restarts by itself,
  first frame 601.5 ms after the restore, engine time 8.219 -> 9.743 s at +1.5 s, TAA valid; MAIN :5199 never (time frozen at 7.742,
  no frame within 3 s); `?ctxrun=0` and `?p4hold=0` frozen = AA8. Looked at img/ctxlive_lane_before_lane_restored_main_restored.png:
  lane 1.5 s after the restore = clean rings and the ripple ring; MAIN = page gradient and UI only. Console: only the intended
  "[hero] WebGL context lost".

## R8-2 the panorama in JS memory: done, option (C) re-read on restore
- Options measured / considered: (A) AA8 keeps the decoded DataTexture: 4,194,304 B for the page's life on every tier, restore sync;
  (B) keep the compressed EXR (pano_orb.exr 1,331,194 B) and re-decode sync; (C) re-read from the browser cache (`force-cache`, no
  revalidation) and re-decode on restore: 0 B kept, restore async; (D) keep it only where loss is likely: rejected, that is the
  phones, where memory is tightest. Chosen (C).
- Memory (memprobe, CDP after a forced GC, product URL; ana/mem.txt): array-buffer backing store MAIN 23,751,194 B (x2), lane
  19,560,957 B (x2): -4,190,237 B = the panorama is collected; `?panokeep=1` 23,755,272 B; V8 heap 8.2-8.5 MB in all.
- Restore cost: first frame after the restore 601.5 ms (re-read) vs 543.6 ms (`?panokeep=1`), i.e. ~58 ms for fetch + decode on the
  lab (the lab serves no-store, so this is a real local fetch); the rest is the restored context's own PMREM + recompile.
- Correctness (the AA8 judge's stepped ctxstep, my copy also waits for `__hero.restoring`: it was already done inside the tool's
  500 ms, 0-0.1 ms extra; ana/ctxstep_cmp.txt): restored vs no-loss px > 16 (max) f0-f3: T1 default 437 (76) / 303 (49) / 212 (48) /
  148 (37) = AA8's final numbers exactly (the waterline TAA's intended restart band); `?lktaa=0`, `?envlake=plate`, T0 phone: 0 px
  differ (bit-exact). GL error 0.

## Proofs and budgets
- Ident (identS: 20 moving frames, final + mirror / walk / cache / cacheN / reflection + every linked program; ana/ident_rest.txt,
  ident_hold.txt, JSONs in ident/): `?p4hold=0` == :5199 IDENTICAL at rest T1 / T2 / T0 phone / plate lake and at hold poses p04 /
  p06 / p07 (T1), p06 T2, p06 T0 phone, p06 plate lake. Lane default == :5199 at rest (T1, T0). `?holdcam=r11&holdpop=r11` == :5199
  at p04 / p06 (the restore changes touch no normal frame). Lane default differs at p04 / p06 (final + lake targets, as intended).
- Perf (perfab: real loop, vsync off, 6 interleaved pairs, SLOT_BG=0, 1-min load 4.3-9.4; perf/): HOLD (mouse held, every run in the
  expand phase at camExpand 0.967) median of medians MAIN 25.4 / lane 25.3 ms, ratio 0.996 (means 0.996): no regression. Rest:
  noisy on the busy machine (quietest runs 21.3 / 21.3 ms); rest frames are bit-identical anyway. T0 rest unchanged (ident).
- Capture set: `qc_r11.zsh` -> $SP/work_p4/p4hold/qc_final (q00-q03, p04-p08, ui, ptr 10, sweep 32, region stats; no page errors).

## Open / for the judge and the lead
1. Wide screens (judgment call): on 2560x1080 the steady share is 0.45, so Q12 rotates 2.94 deg more and drops the camera 0.88 m
   (y 2.54 -> 1.66, below A2's ~2.10). The floe line moves from ~0.75 H to ~0.85 H, which is where the reference's angles land in a
   vertically cropped wide frame (~0.88 H); the bottom strip stays clean (img/vp2560_p06_MAIN_top_LANE_bottom.jpg). If the lead
   prefers a floor on the drop for wide screens, it is one clamp on (kp - k) in CameraRig (both places). Portrait and 16:10 are
   unaffected (kp = k).
2. The release also frames slightly lower, continuous with camExpand (bgshift): p07 peak +4.6 / base +2.1 / iceberg +4.0 px,
   p08 peak +1.0 / base -0.1 / iceberg +0.9 px.
3. The pop is +11 % faster on screen (ring A p99) by design; no recorded hard limit exists for the pop window, so the motion judge
   should look at a live press (the lab is up).
4. R8-2 in production: `force-cache` reuses the HTTP-cached EXR without revalidation; if the cache was evicted the restore fetches it
   (1.33 MB) and only a failed fetch leaves the env light empty (warned). The lab serves no-store, so its 58 ms is a real fetch.
5. Not mine, unchanged: G2's crest arc at the bottom of the hold frames (more grazing now, a bit lower), the edge-on hold moments
   (disagreement 2), the orb's look.
