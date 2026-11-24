# wl3 LOG (water round 3, INTEGRATOR; base LANES/wl2 :5167 frozen; MAIN water :5162 = LANES/p4ph), 23 Nov 2026
- 05:50 Read p4r4_common, p4pri2_common, p4wl / p4wl2 args, p4wl3 args (common + integrate in full), both lane reports, both judge LOGs
  (lane_backup/p4wl3/judge_wl3a, judge_wl3b), wl2 HANDOFF, rejudge_wl2 LOG.
- 05:52 CHOICE (args.integrate): TAKE NOTHING.
  - wl3a: judge pass = false. Open: J1 MAJOR (part W shortens the far column x~1334 at T1 rest 67 -> 44 px, far median 48 -> 41; a lane
    regression, not in MAIN), J2 MAJOR (BAR 4 perf unproven, 0 valid STRICT pairs from builder or judge; alternated real loops show a
    lane cost of +3-7 % T1, +5-9 % T2), J3 minor, J4 nit. Its judge found complaint 1 better than MAIN at T1 DPR 2 (left -14..-23 %), but the
    exception also needs the open major to be pre-existing in MAIN, and both majors are the lane's own. -> stays out.
  - wl3b: judge pass = false. Open: JJ1 BLOCKER (complaint 1 WORSE: real loop T1 DPR 2 quiet dt 26-40, left water MAIN 549 | lane 1043, +90 %),
    JJ2 major (perf +7.6 %, 8 valid STRICT pairs), JJ3 / JJ4 / JJ5 major (lip band pops more, slab feet lose the dark band + pale notch,
    the x~1256 streak 1.5x stronger), JJ6 minor. None pre-existing in MAIN; complaints not fixed. -> stays out.
- 05:53:54-05:53:59 `cp -c -R LANES/wl2 LANES/wl3` (APFS clone). wl2's HANDOFF.md kept as HANDOFF_wl2_copy.md.
  `diff -rq` wl2 vs wl3: app/, public/, hero-lab/ identical.
- 05:54 lab :5170 up (`PORT=5170 node hero-lab/serve.mjs --no-watch`, build ok 05:54:05). Served index.html (c0ad197e) and /dist/main.js
  (2376490 B, sha256 7bed38e9) are byte-identical to :5167.
- 05:54-05:55 ident (slot 'wl3:ident', tools/identP.mjs medium 20 frames; id/ident_summary.txt):
  wl3 vs :5167 T1 IDENTICAL (14 targets, 16 programs); wl3 ?p4wl=0 vs :5162 T1 IDENTICAL; wl3 vs :5167 T0 phone IDENTICAL (10 targets,
  14 programs); CONTROL wl3 vs :5162 T1 DIFFERS (rx-water, rx-water-walk). 0 console logs in all runs.
- 05:56 patch: wl3_vs_p4ph.patch, 496 lines, Water.ts only; byte-identical to work_p4/wl2/wl2_vs_p4ph.patch. MAIN's Water.ts == p4ph's
  (sha 9862fad1), so it would apply to MAIN as is. wl3 Water.ts sha 5e429185 (= wl2).
- 05:57 tsc in LANES/wl3/retrux-web: tsconfig.hero.json exit 0, tsconfig.json --incremental false exit 0 (tsc_hero.txt, tsc_app.txt empty).
- 05:58 BAR on wl3 (= wl2 byte for byte, so round 2's re-judge numbers stand; nothing re-measured): ok = false.
  (1) FAIL: left water in the dt-controlled real loop at T1 DPR 2 is above MAIN (rejudge_wl2 dt 28-34: 339 | 376, +11 %; judge_wl3b's quiet
  run dt 26-40: 549 | 694, +26 %). (2) FAIL: far columns not moved toward REF (cols.py T1 median MAIN 50 | wl2 48, REF 82).
  (3) FAIL: lips untouched; lip band in the real loop MAIN 384 | wl2 546 (judge_wl3b, quiet). (4) PASS: +3.6 % at DPR 2, 6/6 STRICT
  (rejudge_wl2); +1.5 % fixer's T1 sweep, 9/9 STRICT. (5) PASS: s60 = MAIN (rejudge_wl2); FAIR fast / reverse < MAIN on final wl2
  (fixer); all six paths passed on pre-fix wl2 (slow / medium / diag / leave not re-run after WL2FJ). (6) PASS (above). (7) PASS.
- No client files wl3_merged_* written: nothing was merged, so they would only repeat refs_user/wl2_merged_* (same build).
- Lab :5170 LEFT RUNNING for the final judge (pid 77517).
