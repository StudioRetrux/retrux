# judge_p4atmos LOG (P4 round 3, adversarial judge of lane p4atmos, lab :5178) - 21 Nov 2026

## 06:39 start (time box 50 min -> 07:29)
- Read brief p4r3_common.md, plan Q5 / Q14 and the panel issues (environment 0/2/5/6/11, color_grade 0, awwwards 1, hold_sweep).
- Lane app/ vs int1: exactly 3 files (HeroEngine.ts, world/PlateEnvironment.ts, new p4atmos.ts). Regenerated diff == builder patch body
  (sha256 dfcd9cba... also in the MAIN mirror). Lab :5178 pid 16847 started 06:38:03, "build ok 6:38:04", serving 200.
- Code read: shared bank colour uniforms are the same objects for plate and water (PlateEnvironment 1697-1705), so the bank tint
  cannot seam at the shoreline; billow splice lives in GLSL_PLATE_MIST (module level) -> applies on T0 in the hold too.

## 06:43-06:51 ident (my run, tools/identP.mjs = builder's + hold-state readout; ident/*.json)
- ?p4atmos=0 vs :5173 IDENTICAL: T1 rest (14 targets / 16 programs), T2 (15/16), T0 phone (9/12), envlake=plate (10/12),
  p04 (fogHold 0.765), p06 (fogHold 1.0), p08 (release, uHold 0.048 / uFogHold 0.967) (14/18 each). 0 console messages.
- 4 sub-switches off: IDENTICAL at T1 rest and p06. Negative controls: lane ON differs at T1 rest and p06 (main, refraction,
  bloom*, final; programs rx-plate-baked, rx-water*).
- (First hold batch failed on quoting -> identcmp printed IDENTICAL with 0 targets; caught by the state readout, re-run OK.)

## 06:47-07:03 captures and analysis
- Deterministic captures (tools/cap.mjs = builder's, RAF off, same sim time on both labs): caps/{lane,main}_rest (rc_* t 2-14 step 0.4,
  rf_* t 9.4-10.4 at 1/30 s), caps/{lane,main}_hold (expand 0.5-2.97, release 0.05-2.6, hs_* sustain 21 frames at 1/30 s, t=40 and t=25).
- Rest, matched times (tools/leftc.py, top.py, lapm.py): berg_base vs F000 MAIN 100,127,165 -> LANE 126,146,176 (REF 129,151,178);
  S297 65,99,139 -> 91,118,151 (92,120,156); L045 109,135,167 -> 135,154,179 (121,145,179: overshoot R+14); L030 (t 7.2) luma
  MAIN 138 -> LANE 155 vs REF 124 (overshoot doubles: +14 -> +31). Mean |dL| over 4 times 18 -> 11. Berg base Laplacian 5.3 -> 4.6 (2.2).
  Row profile x1000-1150: soft ramps (+3..+8 per 3 rows), no hard top; MAIN's dark contact line (row 451: 81) gone.
- Left side: left_base B-R 38/37/31 -> 43/42/39 (REF 45/41/36), ridge_base sat 0.34 -> 0.39 (0.45-0.49). mtn stripe: q00 row profile
  plateau (192-194 at rows 260-284) gone (189->181 smooth); matched-time luma 186-188 -> 183-185 (REF 181-186); mtn Laplacian +0..+0.14.
- Not changed (verified): berg_top +11..+15 over F000/L045 (Q5(2) open), far_bergs +9 (aerial perspective not built; adding sky fog
  would brighten them further - justified).
- Pulsing: rest 30 fps sequence: per-pixel |dI| lane <= MAIN in every region (berg_base 3.49 vs 4.28 = shards; left/ridge 0.2-0.4 both);
  hold sustain 30 fps: bank_left 1.35 vs 1.34, bank_right 2.05 vs 2.00; temporal-sd difference map only behind the moving rings
  (refraction of a changed background), no fog boiling.
- Release (left patch x0-200 y300-380, t=40): lane 209,208,166,131,107,99,97,97,97,96,95,94,94 (monotonic, no pop); p07 131 vs F453 ~129,
  p08 99 vs F460 ~96 (MAIN 142 / 123).
- HOLD BANK (x120-320, F420 aligned +5 px by row-gradient correlation): rows 500-520 (bank body) LANE 137-155 vs F420 157-168 (MAIN
  151-164) in all 4 samples (harness p06, det t40 e2.97, t40 e2.50, t25); rows 460-480 (face above) lane closer (122-142 vs 121-140;
  MAIN 132-152). Mean |d| rows 440-600: harness 6.0 -> 8.9, t25 6.5 -> 9.2, t40 9.1 -> 8.8, e2.50 8.2 -> 7.9. Texture sd 8-11 -> 13-19
  (F420 15-24). => the bank is billowy now but shifted down: the massif foot F420 hides is more exposed (major per the regression rule).
- T0: in the hold T0's shared uHold / uFogHold stay 0 (choreo fogHold 1.0): lane ON vs MAIN at T0 p06 final + 9 targets SAME (programs
  text differ only); ?fogbank=r11 on T0 IDENTICAL. So T0 pixels unchanged rest and hold.
- Sweep / pointer (qc_final vs r11_2 MAIN): looked at hold/pop/rel/intro sheets and 5 pointer orbits: no seam, edge, double or hole.

## 07:03 builder claims re-checked
- q00 berg base 77,108,149 -> 101,126,158 (F000 129,151,178) OK; region_stats mid left 6,2,-3 -> 2,1,0, all else within 1-2 OK;
  p07 left patch 117,134,159 (MAIN 125,142,167, F453 114,132,160) OK; p08 83,101,130 (MAIN 102,120,147, F460 78,98,130) OK.
- Builder perf files re-read: HOLD r2 paired median of per-pair ratios 1.020 / 1.008 OK (perfab's own ratio-of-medians 1.045 / 1.032);
  REST r1 0.993 paired (pairs 0.67-1.55: noise); REST r2 at load 10-50 (not evidence). tsc not re-run (lab build ok 06:38:04).
- Scores (panel scale; MAIN = r11_1 panel captures, lane = qc_final + my deterministic caps): environment 7.8 -> 8.1, color_grade_post
  8.3 -> 8.5, awwwards_jury 7.6 -> 7.9, glitch_hold_sweep 8.0 -> 8.1 (part of each delta is int1's other lanes, r11_2).

## 07:05-07:11 perf A/B (my run, perf/ab_rest.txt, tools/perfana.py)
- REST, 6 interleaved pairs, all at 1-min load < 10, SLOT_BG=0: paired median B/A 0.952 (run medians) / 0.970 (run means). It overlapped
  judge_p4ice3:perf and judge_p4env3:ab2: bimodal 23-54 ms frames, pair ratios 0.59-1.64, so this is weak evidence. No regression > 5 %.

## 07:11 verdict (verdict.json)
- pass = false: F1 major (the hold bank body is lower than F420, its coverage regressed at the panel's p06), F2 minor (waterline mist
  overshoots in the L030 phase), F3 minor (Q5 (2) berg top not delivered), F4 nit (the T0 note).
- Scores MAIN r11_1 -> lane: environment 7.8 -> 8.1, color_grade_post 8.3 -> 8.5, awwwards_jury 7.6 -> 7.9, glitch_hold_sweep 8.0 -> 8.1.
