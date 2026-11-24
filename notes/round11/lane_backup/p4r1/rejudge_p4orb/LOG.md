# rejudge_p4orb LOG (re-judge of lane p4orb after its fix round; lab :5176, read-only)

21 Nov 2026 01:56 WIB start. Brief p4r1_common.md read; previous verdict (judge_p4orb, FAIL: F1/F3 major regressions, F2 major open,
F4 minor, F5 nit) and the fixer's report read; the fix-round LOG section and the patch read.

## Build under test
- Lane source mtimes 01:41:34, lab :5176 restarted 01:41:48 (runs the final build). The patch regenerated here from LANES/aa7 vs
  LANES/p4orb (diff -u per file) is byte-identical to WORK/p4orb_vs_aa7.patch (682 lines, sha256 986d3bd6...) and to the mirror.
- Fix round touched only Orb.ts and PostChain.ts (holdGlowK 4 -> 2); Shards.ts, quality.ts, HeroEngine.ts sections are byte-identical
  to the builder's patch. Orb.ts: holdCut 1.1 -> 0.3, the hold shoulder / top and the sheet pre-filter removed, the R / B
  dispersion taps removed, new uRim-gated cool tint uP4Rim (0.8, 0.93, 1.15) from 0.75 R.
- tsc (lane retrux-web): hero 0, project 0 (--noEmit; project --incremental false).

## 01:58-02:01 paired deterministic captures (tools/rj_det.mjs, the judge's flick method; one page per config, same call sequence;
   ring clock pinned at 3.3 at the hold start = open orb, and "n" = not pinned = natural phase; 9 frames of 1/60 s; full frame)
- Cross-lab check: :5197 (MAIN) captures with the same sequence are byte-identical to ?p4orb=0 at all 12 pose / phase captures
  (ana/det_main_vs_off.txt). So "off" below is MAIN exactly.
- ana/det_AB.txt (box241 min-ch >= 248 / >= 250 around the projected orb; disc r < 0.85 R; rim 0.85-1.02 R):
  p05_t3.3 MAIN 10.7 / 8.8 % -> lane 11.7 / 9.2 %, rim B-R +61 -> +28, inner disc lane - MAIN +0.6 / -0.4 / -0.6 (no cream shift),
  ice annuli +1.45 / +0.67 / +0.23 / +0.22 / +0.09 L.
  p06_t3.3 18.5 / 15.7 -> 21.6 / 17.0 %, rim +56 -> +23, inner +0.9 / -0.1 / -0.2, ice +2.01 / +0.97 / +0.26 ...
  p04_tn (orb fully open at the natural phase) 16.8 / 12.3 -> 17.8 / 12.9 %, rim +42 -> +23, ice +2.76 / +1.02 ...
  release p07_t3.3 10.7 / 7.7 -> 10.8 / 7.5 %; p08_t3.3 1.8 / 0.7 -> 1.3 / 0.1; p08_tn 6.5 / 5.0 -> 6.3 / 4.2 (F460 5.1 / 4.5).
  hidden-orb hold (p05_tn / p06_tn, F420-like): 2.6 / 1.7 -> 1.0 / 0.0 % and 2.8 / 2.1 -> 1.3 / 0.0 %, slit -0.8..-0.9 L.
  rest q00 3.3 / 2.4 -> 2.6 / 0.1 % (F000 2.2 / 1.9), q03 3.6 / 2.9 -> 3.4 / 2.1 % (F045 6.0 / 5.0); inner -1.0 / -0.8 / -0.9 (q00),
  -2.2 / -1.3 / -1.1 (q03) = the builder's rest lens shading, unchanged by the fix round.
  Far field (r > 3.5 R, crystals masked) changed > 2: <= 0.05 % in every capture.
- T2 (ana/det_AB_T2.txt): p05_t3.3 9.0 / 6.9 -> 9.7 / 7.1 %, rim +60 -> +25; p06_t3.3 18.7 / 14.4 -> 21.8 / 15.8 %, rim +59 -> +24;
  ice annuli +2.3..+2.9 L at 1.02-1.25 R; q00 = T1's. No page errors.
- Interior structure, r < 0.75 R, crystals masked (ana/inner75.txt): p05_t3.3 L10 218 -> 197, sd 19.1 -> 23.1, share < 215 L
  9.0 -> 19.9 % (F402 disc L10 198, sd 24): the hold lens shading adds refracted grey shapes at this phase. Fully open phases stay
  clipped flat in both: p06_t3.3 L10 241 / 241, p04_tn 252 / 252 (lane sd 6.9 vs 11.1).
- Rim radial profile (ana/rim_profile.txt): MAIN dips to L 164 / B-R +56 at 0.96 R (cobalt ring); lane falls smoothly 250 -> 217
  over 0.78-0.96 R at B-R +20, a 2-px cool hairline at 0.98 R (L 205, B-R +38), then the ice at 215 / +36. F402 (in units of its
  bright radius): 252 -> 235 over 0.8-1.0 at +7..+24, no ring. Lane band ~10-15 L dimmer than F402's glow edge at the same chroma.
- Looked at: img/det_p05_t3.3.png, det_p06_t3.3.png, det_p04_tn.png, det_p05_tn.png, det_p06_tn.png (MAIN | lane | REF | diff x8,
  + 200-255 stretch), img/rim_zoom.png (3x), img/full_p05_t3.3_p06_t3.3.png. Hot core back, pale cool glass edge instead of MAIN's
  cobalt ring, no cream shift, no grey plate. Interior S-shaped refracted structure as in MAIN (slightly stronger at p05).

## 01:59-02:01 F3 repro (judge's flick.mjs, hold expand 2.97 frame 8, lane vs ?p4orb=0; jring.py / jwater.py / jflick.py)
- ana/f3_jring.txt: annuli 1.0-3.5 R +1.05, +1.41, +1.27, +0.59, +0.91, -0.06, +0.11 L (judge before the fix: -1.24, -1.05, -3.73,
  -4.28, -3.04, -2.20, -0.42); 99.2 % of the changed non-orb non-crystal px brighter (before 34.2 %). = the fixer's numbers exactly.
- ana/f3_jwater.txt: rest regions identical to the judge's (sky 0.03 %); hold hero mid changed > 4 25.1 -> 11.8 %, water 9.7 -> 4.4 %
  (crystals, the orb rim and its refraction in the rings; flick/diff_lane_off_hold.png).
- Crystal flicker (ana/flick_stats.txt): 2nd / 1st temporal difference on crystal px hold 17.48 / 10.73 = 1.63 lane vs 22.44 / 13.46
  = 1.67 off; rest 1.75 vs 1.77. Orb temporal (ana/orb_temporal_hold.txt): disc / rim / skirt 2nd-diff lane 5.39 / 7.01 / 5.38 vs
  off 7.86 / 7.69 / 5.81. No added flicker.

## 02:05-02:08 ident (tools/identP.mjs; ident/summary.txt)
- ?p4orb=0 vs :5197 IDENTICAL at T1 (14 targets, 16 programs), T2 (15 targets), T1 HOLD (expand 2.97; 18 programs).
- Lane ON T0 phone vs MAIN T0 IDENTICAL (9 targets, 12 programs).
- Lane ON T1 HOLD vs MAIN differs only in main / refraction / bloom0-4 / final + rx-orb, rx-shards, rx-bloom-down, rx-bloom-up, rx-grade.

## 02:08-02:10 perf (tools/ftime.mjs, SLOT_BG=0, one browser, 8 interleaved pairs per mode, 60 frames each, load <= 8.9)
- perf/ftime_summary.txt: rest mean 33.46 vs 36.54 ms (med 24.4 / 25.0), paired mean-ratio median 1.002, median-ratio median 0.987;
  hold 42.78 vs 42.77 ms (med 45.4 / 45.9), 1.033 / 1.019. Other lanes' jobs ran (ratios 0.63-1.22 per pair): no regression > 5 %.

## Latest capture set (unpaired; WORK/p4orb/qc_fix vs panel MAIN $SP/p3/r11_1 vs REF; ana/qc_orb_shard_stats.txt, img/orb_*.png)
- p05: lane 25.0 / 19.3 % (MAIN 17.6 / 14.0, F402 16.2 / 14.3), disc 252 / 253 / 254 sd 6.8 (a fully open phase; paired captures show
  MAIN is just as flat at fully open phases). p06 17.8 / 12.7 (MAIN 16.2 / 12.2). q00 / q03 / p07 / p08 within ~1 % of MAIN.
- Shards (B-R >= 85): q00 L med / p95 / sat lane 64.6 / 150.0 / 0.77 (MAIN 68.3 / 146.5 / 0.75; F000 89.7 / 163.5 / 0.63);
  p04 143 / 162 / 0.46 (MAIN 133 / 161 / 0.54; F358 152 / 178 / 0.45). Paired p06_t3.3: lane 123 / 156 / 0.503 (MAIN 118 / 147 / 0.551,
  F420 137 / 170 / 0.506). Brightest facets still ~15-20 L under REF (F4 open; Shards.ts unchanged).
- Sweep (img/sw_hold.png, sw_poprel.png): no glitch, no black / NaN pixels; orbs read as luminous balls with a pale edge.
- Env region stats q00 = MAIN's (far floes 1 level).

## Verdict: PASS (F1, F3 verified fixed; switch exact; perf neutral; tsc 0 / 0). Open: F2 (major, pre-existing in MAIN: no F402
   branching plasma inside the open orb), F4 (minor, crystal top facets), nits R1 (rest / hidden-hold highlight trim), R2 (rim band
   ~10-15 L dimmer than F402's glow edge, greyer hairline). Scores in verdict.json.
- 02:17 raw captures (caps/*.rgba, flick/*.rgba, ~310 MB) deleted after analysis; rerun: tools/bA.sh (T1 paired + flick, ~2 min), tools/bD.sh (T2). Mirrored LOG, verdict, img, ana, tools, ident summary, perf to MAIN/notes/round11/lane_backup/p4r1/rejudge_p4orb (14 MB).
