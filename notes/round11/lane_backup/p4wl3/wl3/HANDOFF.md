# wl3 HANDOFF (water round 3, INTEGRATOR), 23 Nov 2026 05:50-06:00 WIB
Lab :5170 (left running for the final judge). LANES/wl3 = APFS clone of LANES/wl2 (frozen, :5167), NOTHING merged on top.
WORK $SP/work_p4/wl3 (LOG.md, id/, tools/, tsc_*.txt, wl3_vs_p4ph.patch); mirror MAIN/notes/round11/lane_backup/p4wl3/wl3/.
wl2's own HANDOFF.md came with the clone: kept as HANDOFF_wl2_copy.md.

## VERDICT: ok = false, changed = false
No round-3 lane qualifies under args.integrate, so wl3 == wl2 byte for byte. On this build THE BAR items (1), (2) and (3) fail
(the same as wl2 in round 2). Items (4) to (7) pass.

## WHY NOTHING WAS TAKEN
The rule: take a lane whose judge passed, or whose open findings are minor or nit only. A lane with an open blocker or major stays out,
unless its judge found the complaint fixed AND the open major is pre-existing in MAIN.
- wl3a (complaint 1, :5169) is OUT. It has two open majors, and the lane causes both:
  - WL3A-J1: part (W), the walk-pass share gate going from 0.002 to 0, shortens the far column at x~1334 at T1 rest (67 -> 44 px; far
    median 48 -> 41; REF 82). ?wl3aw=0 restores it.
  - WL3A-J2: BAR (4) perf is unproven (0 valid STRICT pairs from the builder or the judge). The alternated real loops point to a cost:
    T1 +3-7 %, T2 +5-9 %.
  Its judge did find complaint 1 better than MAIN at T1 DPR 2 (left water -14 to -23 %, dt-matched; same pose 332 vs 340). But neither
  major is pre-existing in MAIN, so the exception does not apply.
- wl3b (complaints 2 and 3, :5168) is OUT. It has an open BLOCKER, WL3B-JJ1: complaint 1 gets WORSE. In the quiet real loop at
  T1 DPR 2, dt 26-40, left water is MAIN 549 | lane 1043 (+90 %), and +50 % vs wl2. It also has majors JJ2 (perf +7.6 %, 8 valid
  STRICT pairs), JJ3 (the lip band pops more in the real loop), JJ4 (the slab feet lose their dark band, plus a pale notch at x~1061) and
  JJ5 (the x~1256 streak is 1.5x stronger).

## STATE OF THE BUILD (= wl2)
- Files vs MAIN's water (LANES/p4ph): retrux-web/app/hero/engine/world/Water.ts only (P4WL_BAND + wl2g's lake-anchored walk + WL2FJ).
- Patch: WORK/wl3_vs_p4ph.patch, 496 lines. It is byte-identical to work_p4/wl2/wl2_vs_p4ph.patch, and it applies to MAIN as is
  (MAIN's Water.ts == p4ph's, sha256 9862fad1). Nothing should merge into MAIN from this round.
- Switches (from wl2): ?p4wl=0 = :5162; ?wl2g=0 = :5163; ?wl2fj=0 = pre-fix wl2. There are no wl3a / wl3b switches (not merged).

## GATES RUN ON :5170
- The served index.html (c0ad197e) and /dist/main.js (2376490 B, sha256 7bed38e9) are byte-identical to :5167.
  `diff -rq` against wl2 is empty for app/, public/ and hero-lab/.
- ident (id/ident_summary.txt; final image + every target + every linked program, 20 moving frames):
  - wl3 vs :5167, T1: IDENTICAL.
  - wl3 ?p4wl=0 vs :5162, T1: IDENTICAL.
  - wl3 vs :5167, T0 phone: IDENTICAL.
  - CONTROL wl3 vs :5162, T1: DIFFERS (rx-water and rx-water-walk only).
  - 0 console logs.
- tsc: tsconfig.hero.json exit 0; tsconfig.json --incremental false exit 0.

## THE BAR ON wl3
These numbers are wl2's from round 2's re-judge and round 3's judges; none were re-measured, because the code is the same.
- (1) FAIL: the left water in the dt-controlled real loop at T1 DPR 2 is above MAIN.
  - rejudge_wl2, dt 28-34: MAIN 339 | wl2 376 (+11 %), with every wl2 run above every MAIN run.
  - judge_wl3b, quiet machine, dt 26-40: 549 | 694 (+26 %).
  - The contour is stable (wl2g).
- (2) FAIL: the far columns have not moved toward REF (cols.py T1 median: MAIN 50 | wl2 48 | REF 82).
- (3) FAIL: the lips are untouched. Lip band in the quiet real loop: MAIN 384 | wl2 546.
- (4) PASS: +3.6 % at DPR 2 (6/6 STRICT, rejudge_wl2) and +1.5 % on the fixer's T1 sweep (9/9 STRICT).
- (5) PASS, with one caveat:
  - The 60 fps sparkle equals MAIN (rejudge_wl2).
  - On the final wl2, FAIR fast and reverse are below MAIN (the fixer).
  - All six FAIR paths passed on pre-fix wl2 (20:40-20:56). Slow, medium, diag and leave were not re-run after WL2FJ.
- (6) PASS: ident, above.
- (7) PASS: ice unchanged, T0 identical, tsc clean, 0 errors.

## CLIENT FILES
None. Nothing was merged, so refs_user/wl3_merged_* would repeat refs_user/wl2_merged_* (the same build).

## NEXT STEP FOR THE LEAD (not done here, it is a fix round)
wl3a is the closest to mergeable: its judge recommends "merge (E)+(S) as they are, distance-limit (W), and prove perf on a quiet machine".
A fixer would:
1. default (W) off or distance-limit it, then re-check the x~1334 column (target >= 67 px);
2. re-run the T1 DPR 2 real loop with W off, because the left-water gain was measured with W on;
3. run >= 8 STRICT perf pairs while no other lane runs (the machine was quiet at 05:55, load ~3, slot empty).
For job B, wl3b's column gain (median 57, sum ratio 0.90) costs +90 % flicker on the left. Its parts would need a distance limit to the
far slabs only (the left water must equal wl2) before a re-test.
