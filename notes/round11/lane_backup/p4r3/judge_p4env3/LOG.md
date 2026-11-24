2026-11-21 06:57 judge_p4env3 start
07:00 qc capture started 06:58 (caps/qc); ab batch queued (m,l then l0,lnc)
07:00 own qc_r11 set of :5174 done (caps/qc, no errors): q00 region stats vs r11_2 within 0-2 except mid left -5 and water near +6 (capture time; builder's qc_final had -9 / +8).
07:03 deterministic A/B (tools/shots.mjs = judge abshots, 38 shots, same sim time): ab/m (:5173) vs ab/l (:5174 default): differences only in
      (a) far-range / far-peak top edges in every ptr / hold / pop / rel / late shot (J3: MAIN's beige veil rim removed, lane darker -6..-27 mean, max 21-86),
      (b) the main massif x0-560 y160-430 (J6 deeper cloud shadows, mean -1.5..-5.3, max 10-25; late90 zig-zag max 75-83 = J5).
07:05 ab/l0 (:5174 ?p4env3=0) vs ab/m: 38/38 PNGs byte-identical (max 0) incl. hold / pop / release / late90 / late150.
07:06 ident (int1 identP.mjs, 20 moving frames; ident/ident_summary.txt): ?p4env=0 :5173 vs :5174 IDENTICAL at T1 (14 targets / 16 programs), T2 (15/16), T0 (9/12);
      ?p4env3=0 vs :5173 IDENTICAL at T1, T2, T0, envlake=plate (10/12); controls: lane default vs :5173 DIFFERS at T1 (final, mirror, walk, main, refraction, bloom; 3 programs);
      T0 lane default: final + 9 targets SAME, programs rx-plate-baked / rx-cloud differ. 0 console messages / page errors in 16 runs.
07:10 lnc (:5174 ?p4crack=0) vs l: J5 changes only the massif's upper part (late90 zig-zag 176-268 px max 75-83; orbits / holds 54-346 px max 9-16; late150, pops, releases ~0). No halo / sliver at the summit edge (img/j5_holdB_x4.png, j5_ptrTR_x3.png).
      J3 verified: MAIN's beige rim on the far peak / far range tops gone in hold / pop / rel / orbits (img/hold_right_edge.png, pop_far.png, rel_far.png, j3_*_pct.png), no bare-sky sliver; rest: veil off the far range top, toward F000 (img/rest_far_x3_pct.png).
      J6 side effect: a few isolated pixels get more saturated / darker: 47 'crushed' px (R<60, B-R>70) over 38 shots (MAIN 0); worst ptr_bottom x309-311 y489 lake: MAIN 89,106,131 -> lane 41,88,136 (AA8 had 18,66,122: round 1's fixed speck half re-crushed). massif B-R p99 +0..+4, luma<50 counts equal or lower. Nit (not visible at 1x: img/speck_ptr_bottom_ctx_x3.png).
      J1 wedge unchanged (sw_pop_L x0-40 y700-766 luma 154.4 both; img/j1_pop_corner_x2.png vs F358 water). J4 box unchanged (q00 x330-400 y467-480: 180.7 / 180.7 / 180.5, F000 161.5; img/j4_box_x3.png). J2 smudge unchanged (water lane).
07:12 region stats at the same sim time (ana/rs_*): lane vs MAIN ptr_rest 15/15 boxes 0,0,0; late90_rest 15/15 0,0,0.
      patch check: int1 app clone + p4env3_vs_int1.patch (sha c58e6df7...) rc 0 == lane app (diff -r empty); lane vs int1 = 5 files + Object_2_010_p4q.webp (39,074 B, sha 74b33ea1... as stated, served 200); int1 app == MAIN app.
      lab :5174 started 06:08:15, last source change 06:08:05 (serves the final code). tsc (--incremental false, no files written): hero rc 0, project rc 0.
07:13 perf REST A/B started (load-gated: waited 07:07-07:13 for judge_p4ice3 / judge_p4atmos perf runs to end; still beside a capture + an ident run).
07:17 perf REST (perfab, 6 pairs) contaminated from pair 3 on: p4orb3fix:perf + p4atmos:fixcap-main started beside it (load 13-21). Queued a frame-level interleaved A/B in ONE browser (tools/gpuab.mjs: two pages, RAF off, frame stepping + 1-px readPixels sync, A/B alternate every 8 frames, 40 rounds) for :5173 vs :5174 and for :5174 ?p4crack=0 vs :5174 (J5 alone).
      Scores (panel scale; MAIN = r11_1 panel captures, lane = caps/qc + same-time A/B): environment 7.8 -> 8.0 (slits / rim / zig-zag gone, cloud-shadow depth back; J4 box, J1 wedge, clay massif / mist / water items of other lanes stay),
      glitch_cursor_orbit 7.3 -> 8.7 (round-1 double / hairlines fixed, far-peak veil gone; J4 pale block + LAKE_CORR ghost stay), glitch_hold_sweep 8.0 -> 8.3 (J3 rim gone; J1 wedge, J2 smudge, bottom crescent stay),
      awwwards_jury 7.6 -> 7.9 (int1's ice / orb plus the env fixes; the hold still shows CG tells).
07:19 perfab REST done (perf/perf_summary.txt): 3 pairs at load < 10: paired ratio med 1.038 / mean 1.011 (0.954, 1.038, 1.040); all 6: med 1.039 / mean 1.035; pairs 3-5 at load 13-19 (another lane's perf + capture started beside it) are not valid. Frame medians 30-38 ms in the clean pairs (contended machine; clean is ~17-22).
07:18-07:25 frame-level in-browser A/B (tools/gpuab.mjs, 40 rounds x 8 frames per side, :5173 vs :5174 REST): median 67.0 vs 67.4 ms, ratio 1.006 (trimmed mean 1.007),
      but the 1-min load went 39 -> 443 during it (system daemons mediaanalysisd / contactsd / suggestd / Creative Cloud at the top after my job ended too), so it is weak evidence; second run (?p4crack=0 vs default) cancelled, context-loss probe (tools/ctxloss.mjs) not run: no quiet window left in the box.
      Perf conclusion: best evidence +1..+4 % at REST (4 pairs at load < 10 incl. the builder's: ratio med 0.954 / 1.038 / 1.040 / 1.049), under the 5 % gate but the gate (>= 6 pairs at load < 10) is still not formally met.
07:26 load after my jobs ended: { 118.82 206.51 120.45 } (decaying; my gpuab may have fed the storm: do not reuse gpuab.mjs's two-page tight readPixels loop without a cap).
07:26 verdict.json written: pass false (open minors J1, J4, J2 [water lane], P1 [perf gate unproven]; nits N1-N3). Scores env 7.8->8.0, orbit 7.3->8.7, hold sweep 8.0->8.3, jury 7.6->7.9.
07:29-07:37 context-loss probe (tools/ctxloss.mjs; first run read back black frames = invalid, fixed: render + read in one task): lane and MAIN both identical after restore in sky / clouds / massif (max 1), lake settles (lane 8,027 / MAIN 7,997 px > 2 at t 9.53, max 55; 0 at t 12.05). J5 restore path OK, nothing new.
07:38 final: verdict.json (pass false: J1, J4, J2 open minors, P1 perf gate unproven; nits N1-N3). Mirrored (without ab/ and caps/ full sets).
