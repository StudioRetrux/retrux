# P4 round 2 - JUDGE of lane p4hold (lab :5178, read-only) - 21 Nov 2026 WIB, time box 50 min (02:24 - 03:14)
WORK = $SP/work_p4/judge_p4hold, mirror MAIN/notes/round11/lane_backup/p4r2/judge_p4hold/. Lanes, labs and MAIN untouched (read only).

## 02:24 read
- Brief p4r2_common.md, plan Q12 / Q13 (+ disagreements 1-2), panel issues of composition_motion / environment / glitch_hold_sweep,
  builder LOG + HANDOFF, the patch (4 files, 13 hunks).
- Patch re-made from LANES/aa8 vs LANES/p4hold with the brief's diff command: sha256 2434e13e...25cf4 = the builder's. Lane differs
  from aa8 in exactly CameraRig.ts, hero/HoldR11.ts, HeroEngine.ts, assets.ts; aa8 app == MAIN app. Lab :5178 pid 29680 built 01:19:57
  after the last source edit 01:19:37; served main.js contains the lane code.
- Code review: Q12 math checked (pitch + el = old dp; frameFits uses the same el at camExpand 1; cache key adds holdFit; release
  continuous through camExpand). Q13 = 3 constants behind P4_HOLDPOP. N-1 / R8-2 control flow checked (stale-gen drop, failed
  reload -> finish() without pano, panokeep sync path, p4hold=0 -> AA8 restoreBaked()).

## 02:27-02:35 ident (identS, 20 moving frames: final + mirror / walk / cache / cacheN / reflection + every program) vs :5199
- ana/ident_rest.txt: ?p4hold=0 IDENTICAL at T1, T2, T0 phone, ?envlake=plate; lane default IDENTICAL at rest T1.
- ana/ident_hold.txt: ?p4hold=0 IDENTICAL at p04, p06, p07 (T1) and p06 T0 phone; lane default at p06 DIFFERS in final + lake targets
  only, programs identical (no shader change). Console 0 lines everywhere.

## 02:32-02:47 motion, restore, memory, bounds
- probe_interact (ana/interact_*.txt): click inert in both (0 drivers, never holding). Ring deg / 60 Hz frame max MAIN / lane: hold
  3.64 / 3.60, release 1.03 / 0.97, re-press 2.46 / 2.38, release 2 3.41 / 3.44 (all far below 15). Opening step max 0.040 -> 0.105
  (hold), 0.041 -> 0.107 (re-press) = the designed burst. No errors.
- Pop beat at 30 fps (new tools/shoot_pop30.mjs: real stepped press, every 2nd 1/60 step rendered, 2 tumble phases; caps/pop30_*,
  img/pop30_*): lane opening per 30 fps frame 0 / .023 / .175 / .385 / .556 / .600 at tp .783-.950 with the lunge (cam .266 -> .824);
  MAIN .074 / .135 / .207 / .284 / .363 / .437 / .503 / .556 / .590 / .602 (tp .783-1.083). Continuous, no jump; the reference's
  split (0.219 -> 0.79 in ONE frame) is still faster. After the burst the opening is near-flat (0.600 -> 0.613, tp 0.95-1.18), as
  MAIN's is after 1.08 (0.602 -> 0.627 by 1.35): the builder's "no plateau" is not literally true (both smoothsteps have zero slope
  at 0.94), not visible as a stop (camera still easing, rings spinning).
- ctxlive (live loop, no visibilitychange; ana/ctxlive*.txt, caps/ctxlive, img/ctxlive_before_restored_lane_main_run0_keep.jpg):
  lane restarts by itself, first frame 604.8 ms after the restore, time 7.753 -> 9.304 at +1.5 s, TAA valid, clean hero on screen;
  ?panokeep=1 561 ms (re-read ~44 ms); ?ctxrun=0, ?p4hold=0 and MAIN :5199 never restart (blank hero, time frozen) = AA8.
- Memory (tools/memprobe2.mjs = builder's memprobe + a lose / restore / GC; ana/mem*.txt): array-buffer backing store MAIN
  23,751,194 B, lane 19,560,957 B (-4,190,237 B), ?panokeep=1 23,755,272 B. After a context loss + restore: lane 19,562,107 B (the
  re-read panorama is released, no leak), MAIN 23,752,103, panokeep 23,756,411. V8 heap 8.2-9.2 MB in all.
- Ring extents (tools/probe_holdboundsV.mjs, bbox of every ring piece, 16 press moments; ana/holdbounds3.txt, holdbounds_extra.txt):
  1440x766 p04 MAIN T81 B678 L406 R1060 / lane T69 B686 L398 R1070; p06 T-21 B792 / T-22 B790 (L301 R1137 both).
  1280x800 p04 T111 B680 / T102 B690; p06 T2 B800 both (kp = k there). 1920x1080 p04 T119 B950 / T104 B963 (R 1432 / 1446);
  p06 T-34 B1118 / T-34 B1117. 2560x1080 p04 T82 B978 / T56 B980; p06 T-35 B1112 / T-40 B1102. Sustain unchanged, pop wider but inside.
- Infrastructure note: 3 page.goto timeouts (30 s, domcontentloaded) on :5178 between 02:36 and 02:41 in 3 different tools; every
  rerun (single variant per process) passed; :5178 answered curl in 1-3 ms. Not attributed to the lane (navigation, not engine).

## 02:35-02:52 images (all looked at)
- img/p06_M_L_F420.jpg, p04_M_L_F358.jpg, p05_p07_p08_M_L_REF.jpg (MAIN panel r11_1 | lane qc_final | REF, guides y 350/392/605/620),
  p04hero_Mnow_L_F358.jpg, sweep_{pop,hold,rel}_rowsMLML.jpg, bottom_p04_p06_Mnow_L.jpg, corner_BL_hold_MAIN_LANE.jpg,
  vp2560_p06_bottom_M_L.jpg, builder's p06_left / bottom / vp2560 / ctx diff8.
- bgshift (ana/bgshift_judge.txt): lane vs MAIN p06 peak +20.1 (vs panel caps) / +17.8 (vs :5199 caps), base +15, iceberg +17 px.
  Peak vs reference: p06 MAIN -24.6 -> lane -5.0 px (F420); p05 -25.1 -> -6.7 px (F402).
- Regression hunt: rest / pointer spots bit-identical (ident). Hold / pop / release sweep: background lower, rings and orb in place,
  no new artefact; G2 crest arc and the bottom-left floe wedge pre-existing and not worse (dark-px counts move only with the floe
  row); bottom-right smudge mean luma 148-155 in both. 2560x1080: background 0.75 H -> ~0.85 H (cropped reference ~0.90 H), arcs
  inside, judgment call (open item 1 of the builder), not a regression.

## 02:48-02:55 perf A/B (perfab MODE=hold, 6 interleaved pairs, SLOT_BG=0, A = :5199, B = :5178, ?tier=T1): see perf/ab_hold.txt
- Result (perf/ab_hold.txt, .json): every run phase expand, camExpand 0.967. Medians MAIN 19.1 / 21.6 / 20.0 / 20.0 / 20.0 / 19.3 ms,
  lane 18.1 / 20.1 / 19.5 / 18.8 / 18.8 / 18.5 ms; median of medians 20.0 -> 18.8 ms (ratio 0.940), means 19.20 -> 18.84 (0.981);
  lane <= MAIN in 6 / 6 pairs (0.93-0.975). 1-min load 3.3-4.6. No regression (the builder's 0.996 at load 4.3-9.4 agrees).
  Rest: not re-run (rest frames bit-identical by ident, so identical cost by construction).

## 02:55 older-build switches (Q12 / Q13 gated on P2B_F2): ?hold=r10 at p06 and ?spin=f1 at p04, lane vs :5199 -> ana/ident_oldswitch.txt
  Both IDENTICAL (final, 6 targets, 18 programs): the lane default leaves the older builds exact.

## Findings (all nits; nothing blocker / major / minor)
- N1 Q13 wording: "no plateau" is not literal; both smoothsteps have zero slope at tp 0.94, so the opening holds 0.600-0.613 over
  tp 0.95-1.18 (MAIN: 0.602-0.627 over 1.08-1.35). Not visible as a stop (camera still easing in, rings spinning). Fix the wording;
  if a continuous settle like EXPAND_POP's 0.79 -> 1 is wanted later, start the growth inside the burst (design work, not required).
- N2 restoreAfterLoss edge cases: (a) a tab switch during the loss restarts the loop (updateRunning, restoring still false), so at
  the restore it keeps running through the async re-read and draws ~50 ms of frames with the empty PMREM (AA8's synchronous restore
  drew none); (b) no timeout on the re-read: a stalled fetch keeps `restoring` true and updateRunning ignores visibility until it
  settles. Suggest `if (this.running) { this.stop(); this.runPending = true; }` before the reload and an AbortController (~5 s) so
  finish() runs without the panorama. Needs a context loss plus a tab switch or a hung network.
- N3 2560x1080 (builder's open item 1): camera y 2.54 -> 1.66 (A2 ~2.10), background 0.75 H -> ~0.85 H, ring extents inside
  (p06 T-40 B1102 vs MAIN T-35 B1112), closer to the centre-cropped reference (~0.90 H). Lead's call, not a regression.
