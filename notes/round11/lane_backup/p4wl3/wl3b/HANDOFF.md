# wl3b HANDOFF (water round 3, job B = client complaints 2 (far reflection columns) and 3 (slab-foot lips)), BUILDER
23 Nov 2026 03:49-05:2x WIB (resumed from a cut-off attempt 22 Nov 22:53-23:00 whose code was kept and finished here).
Lab :5168 (left running, final build 04:03:46). Base :5167 (= LANES/wl2, frozen). MAIN's water :5162 (LANES/p4ph).
WORK $SP/work_p4/wl3b (LOG.md, run.log, tools/, st/, caps/, id/, rl/, perf/, fair/, s60/, img/, client/);
mirror MAIN/notes/round11/lane_backup/p4wl3/wl3b/ (LOG, HANDOFF, patch, numbers, key images).

## VERDICT: ok = false (honest)
- Complaint 2 (far columns): DELIVERED by default. Rest T1, cols.py (x 900-1440, ya 498, thr 6) length median / excess:
  REF 82 / 22.3 | MAIN 50 / 16.2 | wl2 47 / 16.8 | lane 57 / 21.6; T2 MAIN 57 / 15.0 | wl2 57 / 12.5 | lane 58 / 17.3. colmatch (rows
  510-585, REF's 13 columns) sum excess REF 77.6 | MAIN 6.7 (0.09) | wl2 15.9 (0.21) | lane 69.5 (0.90). The x ~1208 column: REF 10.4 |
  MAIN 7.8 | wl2 9.5 | lane 12.0 (not dimmer). Look: refs_user/wl3_wl3b_rest_T1_far_1x_REF_MAIN_LANE.jpg (REF / MAIN / lane).
  Breaks: measured, NOT built (tools/brk.py, vertical high-pass std inside the columns, rows 505-585): REF 2.55 (period ~9 px) | MAIN
  4.23 | wl2 4.51 | lane 4.30 (period ~4 px): our columns are already broken by ripples MORE than REF's; the finer period is the lake's
  own bump (shared with ripple A). An extra break term would add contrast REF does not have ("jangan ngide").
  The length median stops at 57 px (REF 82): the near floe at y ~587 caps every build's measured length at 89; K 3 / 3.5 give the same
  57 with more excess (ratio 0.99 / 1.08). Kept wl2b's measured K 2.6.
- Complaint 3 (lips): root cause addressed in code (tN / colour anchored to the bilinear crossing, not to the cell entry); measured
  effect small. 4x same-pose sheets MAIN | wl2 | lane | GT (img/lips4x_{L,M,R}_M_B_L_GT.png): the slab-end step that remains is
  present in the per-pixel 2x GT too (geometry / plate, not the walk's cell sampling); MAIN's stair-stepped block at the slab end
  x ~1255 (frames 42-43) is gone in wl2 and the lane (img/streak_1260_f37-43_M_B_L_3x.png, top row). Real-loop lip band: see GATES.
- THE BAR (1) FAILS: in the dt-controlled real loop at T1 DPR 2 the left water (CSS 0-160) pops MORE than wl2 and MAIN:
  dt 28-34 MAIN 672-769 | wl2 779-896 | lane 1071-1164 (+30-50 % vs wl2); T1 DPR 1 and T2 likewise (GATES). The bisection (LOG
  04:36-04:43) found no single cause: K, the cap 8 and the lip each removed alone still leave +35-60 % over wl2; ?wl3b=0 on :5168 ==
  :5167 in the same loop (harness OK). The stepped harness shows none of it (stepped left box lane 1620 < wl2 1648 < MAIN 1830), so
  it is the real-loop temporal aliasing class of WL2-FJ1 (share / horizon flips between ~33 ms frames), now over more pixels.
  wl2 itself is +10-17 % over MAIN there (wl3a's job), so this lane could not pass (1) as written anyway; it must not merge as is.
- Also failing: (3) the lip band pops +23 % vs wl2 in the real loop; (4) perf +6.5 % vs :5162 (8 valid pairs).
- Passing: (5) FAIR on all six paths (every path below MAIN), sparkle at 60 fps (equal), (6) ident everywhere, (7) tsc, 0 errors,
  ice rings unchanged, T0 phones unchanged; the far box <= the per-pixel GT; the left / shelf boxes in the stepped harness <= wl2.

## WHAT CHANGED (one file: retrux-web/app/hero/engine/world/Water.ts; patch WORK/wl3b_vs_wl2.patch vs LANES/wl2/retrux-web/app)
All of it is shader text edits applied by `wl3bApply()` on top of wl2's band walk (P4WL_BAND + wl2g lake-anchored taps + WL2FJ).
`?wl3b=0` = no text, no define = :5167 exactly.
1. WL3B_COLS (the far columns, complaint 2): beyond WL3B_D0..D1 = 25..35 m camera distance (smoothstep) the faces' share takes a
   wider spread along the view, sE x K, K = 2.6 (wl2b's measured value): the faces' reflections run further down the screen = the
   long, bright columns of ref_F000 (Cycles' rough water stretches each face's reflection). Three hunks: (a) the band read's
   per-pixel fallback walk gets sig.y x K; (b) the band read's share: `sE *= wl3bK` right before `vec4 F4 = ...` (AFTER wl2fj's
   mu / sE lines, which wl3a owns: not touched); (c) the walk pass: `sg0.y *= K(dist0)` after `vec3 n0 = lkBump(...)` (its 0.002
   share threshold decides which faces a tap stores; without it the taps below the column's start store "no face" and cut it).
2. WL3B_CAP (needed BY K): the walk's face cap 4 -> 8 at every lake point. With K the wider spread lets small faces in front of the
   left shelf use up wl2's 4 hits; the walk stops short of the shelf's taller faces and the bright remainder shows through as pale
   holes popping in the far-left shelf reflection (look: img/left_f18-21_B_L1_C8_2x.png, rows wl2 / K only / K + cap 8). With K
   the cap no longer dims the x ~1208 column (wl2b's cap 8 without K did). The camera-distance cap the brief suggested (8 only
   below ~25 m) does not separate the two: the shelf holes and the far slab feet are both at 50-70 m (numbers in LOG 04:03).
3. WL3B_LIP (complaint 3): the face horizon tN was sampled at d + cL x {0.25, 0.75, 1.5, 3} from the reached cell's ENTRY d, and
   the face colour looked up at d: d steps with the max-mip cells (0.31-1.25 m), the outline / lip stepped with the cells. Now both
   are anchored where the bilinear (level-0) height crosses the current horizon ray (tN) / half the cell's top (colour), found by
   5 bisection steps in [d - cell/2, dExit + cell/2]; continuous in the lake point P. Falls back to d when not bracketed.
4. Lab only: `?wlwalk=px` (the per-pixel walk) now carries the lane too (WL3B_PX), so a per-pixel / supersampled GT shows the
   lane's own look.
No other file, no asset, no new pass, no new target, no new uniform. IceMaterial untouched. HeroEngine / LakeMirror /
LakeSchedule / RenderPipeline untouched.

## SWITCHES
- `?wl3b=0`: :5167 exactly (ident below). `?p4wl=0`: :5162 exactly (unchanged).
- `?wl3bk=<K>` (default 2.6; 1 = no column change), `?wl3bd0=` / `?wl3bd1=` (25 / 35 m).
- `?wl3bcap=0`: wl2's cap 4 (lab `?wl3bcap=<m>`: 8 only below <m> camera distance; `&wl3bcapw=1`: by the face's distance d).
- `?wl3blip=0`: wl2's cell-anchored tN / colour sampling; `?wl3bnb=` bisection steps (5).
- Proven: `?wl3bk=1&wl3blip=0` gives byte-equal stepped captures to :5167 (with cap 4 then; LOG 03:56).

## MERGE NOTES (for the integrator; wl3a owns P4WL_BAND's per-pixel share)
- Anchors: (i) the band read line `  if (dot(wt, 1.0 - step(-0.35, ta)) > 0.01) return lkWalkTerm(dist, V, lkN, lkSig, vWorldPos);`
  (replaced: + wl3bK, sig.y x wl3bK); (ii) `  vec4 F4 = step(-0.15, ta) * vec4(lkPhiT((ta.x - mu) / sE), ` (one line inserted
  before it: `sE *= wl3bK;`); (iii) the walk pass `    vec3 n0 = lkBump(vWorldPos, wDx0, wDy0, kDof0, sg0);` (one line after);
  (iv) lkWalkTerm: `      if (Fc > 0.995 || hits > 3.5) break;`, `    float tN = m; ... float dk = d + cL * ` and `        float dF = d;`.
- If wl3a replaces mu / sE in the band read (it owns those lines), keep (ii) as the LAST change to sE before F4.
- TS: new block (doc, wl3bOn, WL3B_* edits, WL3B_PX, wl3bApply) right after wl2fjEdits(); two call sites in the constructor
  (the `wlwalk=px` branch and the end of the wl2g branch, replacing nothing of wl2's).

## GATES ON THE FINAL BUILD (Water.ts sha256 5f98cfae, lab :5168 started 04:43:58; WORK files named)
- (7) tsc: tsconfig.hero.json exit 0, tsconfig.json --incremental false exit 0 (tsc_hero.txt, tsc_app.txt empty). 0 console errors
  in every ident run (logs 0/0 x 15). IceMaterial untouched; the control differs only in programs rx-water / rx-water-walk
  (targets walk, main, refraction, bloom*, final): the ice rings' look is unchanged.
- (6) ident (id/ident_summary.txt; final image + every target + every linked program, 20 moving frames), fresh 04:44-04:50:
  ?wl3b=0 == :5167 IDENTICAL at T1, T2, T0 phone, p04 expand 0.9, p06 expand 2.97, p07 release 0.33;
  ?p4wl=0 == :5162 IDENTICAL at all six; lane ON at T0 phone == :5167 == :5162 (T0 has no walk: phones unchanged). PASS.
- (5) FAIR, six paths, lane vs its own 16-sample 2x GT (lkmeach=1), popscan --minpx 6, events / px (fair/fair_L.txt); gate MAIN + 10 %
  (MAIN vs its own GT, from the wl2 HANDOFF): fast 44 / 603 vs 63 / 748; reverse 70 / 938 vs 103 / 1427; slow 10 / 80 vs 41 / 293;
  medium 31 / 603 vs 73 / 910; diag 30 / 386 vs 39 / 527; leave 31 / 398 vs 52 / 645. PASS on all six (every path below MAIN).
- (4) 60 fps sparkle at rest (s60_final.txt; 40 frames at 1/60 s, T1 DPR 2, CSS rows 400-640), blips / frame MAIN | wl2 | lane:
  left 15.4 | 15.2 | 15.8; shelf 285 | 286 | 288; far 389 | 389 | 389; lips 2.6 | 2.7 | 3.0; cols 0.1 | 0.2 | 0.1. Equal within
  ~1 %, lips +0.3-0.4 px / frame (in a 54 k px box). PASS (no new sparkle to speak of).
- (2) stepped fast path T1 DPR 2 (st_final_d2_n40.txt, 40 frames, thr 12) MAIN | wl2 | lane | GT (lkmeach 2x) | GTpx (per-pixel 2x,
  the round-2 "GT"): left 1830 | 1648 | 1620 | 963 | 973; shelf 335 | 334 | 332 | 325 | 328; far 1031 | 1006 | 1070 | 913 | 1099;
  lips 178 | 176 | 182 | 175 | 184; cols 190 | 167 | 227 | 73 | 250. Far box: lane <= the per-pixel GT (1099) but > the lkmeach GT (913);
  +6 % vs wl2 (the longer columns carry ripple sparkle). T1 DPR 1 (st_final_d1.txt) MAIN | wl2 | lane: left 1104 | 1030 | 1121,
  far 630 | 611 | 652, lips 111 | 108 | 110.
- (1) FAIL. Real loop (rl.mjs, 1440 x 766, pointer circling, 150 frames / run, alternated MAIN / lane / wl2 through the slot, 05:02-05:07,
  rl_left_T1d2.txt), left water CSS 0-160 x 440-620, one-frame blips / frame, dt-controlled:
  T1 DPR 2: dt 26-30 MAIN 527 (n 161) | lane 994 (n 140) | wl2 1042 (n 64); dt 28-34 636 (n 95) | 1101 (n 247) | 725 (n 248);
  dt 26-40 606 | 1085 | 839. Region CSS 0-480: dt 28-34 2441 | 3049 | 2725. Earlier runs on the same shader (LOG 04:28-04:43) agree
  (dt 28-34: lane 1071-1164 vs wl2 779-896 vs MAIN 672-769). T1 DPR 1 (rl_left_T1d1.txt) dt 20-26: MAIN 188 (n 81) | lane 254 (n 128).
  T2 (rl_left_T2.txt) dt 26-30 MAIN 546 | lane 1004; dt 26-40 564 | 1090. Look: img/rl_T1d2_leftwater_sheet.png (rows MAIN / wl2 / lane:
  4 frames, |diff| x6, blip heat): the lane's longer reflections of the left ice sheets flip over more water. The shelf contour stays
  stable (stepped shelf box lane 332 vs wl2 334, MAIN 335).
- (3) lips: FAIL as written (no crawl in the real loop). Lip band CSS 860-1440 x 460-530 (rl_lips_T1d2.txt), dt 26-40: MAIN 502 | lane 597 |
  wl2 485 (+23 % vs wl2); far CSS 860-1440 x 430-590: 2554 | 2837 | 2366. 4x same-pose sheets: see VERDICT (no tooth that the GT lacks).
- (2) far-box blips: lane 1070 <= per-pixel GT 1099 (PASS by the round-2 GT), but +6 % vs wl2 and > the lkmeach GT 913.
- (4) perf: FAIL. perfab STRICT=1 SLOT_BG=0, T1 1440 x 766 pointer sweep 6 s, interleaved A = :5162, B = :5168, 05:07-05:15
  (perf/sweep.txt, sweep_summary.txt): 8 VALID pairs (+1 invalid: judge_wl3a jobs), paired median B/A 1.065 (+6.5 %), valid range
  1.046-1.093. Modes: A all in its low mode (19.3-20.5 ms, median 19.6); B low mode 20.4-20.6 (+4.6-5.1 %), high mode 21.0-21.8
  (+6.6-9 %). wl2 alone measured +3.5 % (its HANDOFF), so the lane adds ~+3 %: the walk's cap 8 (longer walks) and the lip's 2 x 5
  bisection fetches per face hit. Cheaper fallbacks: ?wl3bcap=0, ?wl3bnb=3 (not measured).

## CLIENT FILES (MAIN/notes/round11/refs_user/, final build, looked at)
- wl3_wl3b_rest_T1_far_{1x,2x}_REF_MAIN_LANE.jpg, ..._T2_far_*, ..._T1_left_*, ..._T2_left_* (rows REF / MAIN / lane; REF's framing is a
  little higher than ours, same crop): the lane's columns under the far slabs are long and bright like REF.
- wl3_wl3b_far_T1dpr2_MAIN_left_LANE_right_halfspeed.mp4 (stepped fast path at T1 DPR 2, 120 frames at 30 fps = half speed, far slabs
  CSS 860-1440 x 430-600) + wl3_wl3b_far_T1dpr2_motion_strip_MAIN_LANE.jpg (frames 40-42).
- wl3_wl3b_left_T1dpr2_motion_strip_MAIN_WL2_LANE.jpg (left water, frames 40-42; the stepped strip does not show the real-loop pops).

## OPEN (for the lead / judge / next round)
1. THE BAR (1) / complaint 1: the lane's real-loop pops in the left water (+30-50 % vs wl2, +70-80 % vs MAIN at T1 DPR 2). Every part
   contributes (bisection: K, cap 8, lip each removed leaves +35-60 % over wl2). Mechanism class = WL2-FJ1 (the share / stored horizon
   flips between ~33 ms frames, invisible to the stepped 1/60 s harness), over more pixels now that the reflections are longer.
   Next step: band-limit what the lengthened tail's share sees (the WL2FJ_Q band-limited mu with a larger Q only where sE was widened,
   i.e. Q x K), and re-test the cap / lip parts one at a time in the real loop (single-part runs were not done: time box).
2. A thin bright wavy vertical streak rises from the near floe tip at CSS x ~1256, y 530-575 in some fast-path frames (37-43): present in
   wl2 (:5167) too, a little brighter in the lane, MAIN only a ghost (img/streak_1260_f37-43_M_B_L_3x.png). Not root-caused.
3. Column length median 57 px vs REF 82 (limited by the near floe in the measurement window; excess / brightness is at REF's level).
4. Breaks: our columns already carry more break contrast than REF at a finer period (the lake bump's); a coarser break would mean a
   coarser bump = a lake-wide look change (ripple A), not done.
5. The lead's choice: as is, this lane must not merge by default. All parts are switchable (?wl3bk=1, ?wl3bcap=0, ?wl3blip=0) for an A/B
   on the client's Mac (the look of the far columns is the client's complaint 2).
