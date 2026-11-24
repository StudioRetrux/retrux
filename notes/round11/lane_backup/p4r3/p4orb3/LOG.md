# p4orb3 lane LOG (P4 round 3, builder) - lane 'orb': F2 (open hold orb internal structure), F4 (crystal top facets), R2 (hold rim band / hairline)

## 21 Nov 2026 05:03 WIB
- Read brief p4r3_common.md (binding), plan Q2 / Q7 / Q4, the panel's orb_shards_light issues, the round-1 orb lane's HANDOFF / LOG
  (lane_backup/p4r1/p4orb) and the rejudge verdict (lane_backup/p4r1/rejudge_p4orb: PASS, open F2 major, F4 minor, R1 / R2 nits).
- Lane: cp -c -R LANES/int1 LANES/p4orb3 (app/ == int1 == MAIN app, diff -rq). WORK = $SP/work_p4/p4orb3. Lab :5176.
  Mirror: MAIN/notes/round11/lane_backup/p4r3/p4orb3/. Not editing hero/IceMaterial.ts (ice lane).

## 05:05-05:15 reference study and root cause (F2)
- REF at full resolution: ref_F402 3x (img/ref_F402_orb3x.png), the State video frames 372-418 every 2nd (refv/, sheet
  img/ref_hold_orb_sheet_372_418.png), F358 / F453 / F000 (img/ref_orbs_358_453_000.png), loop_F045 4x. The open hold orb is a
  clipped core with torn-edged white plasma tongues and large grey-blue gaps (F402's "keyhole" T, a dark band at the bottom; F453
  torn white tongues with grey-lavender gaps); the structure moves only slowly over the 1.5 s hold.
- Tool: tools/dv.mjs (the judge's deterministic method: engine loop off, same call sequence; ring clock pinned at the hold start
  3.3 = the open orb, the orb's plasma clock pinned (orb.frame 2400); live variants; optional HDR readout of `main` around the
  orb), tools/dva.py (judge metrics: box241 >= 248 / 250, interior r < 0.75 R crystals masked L10/50/90, sd, share < 215 / < 235,
  rim band 0.86-0.96 R, hairline 0.97-1.0 R, HDR percentiles; crops vs REF; paired ice annuli vs the base capture).
- e1 / e2 (HDR): MAIN's hold disc sits at the plasma clamp: HDR max channel inside 0.75 R p10/25/50/75/90 = 1.2/2.7/10.1/10.4/11.5
  (p05); with the fills off it is the same (the plasma itself), and at gain x0.03 still flat (p50 1.6 = bg + the clamp): the
  per-ray clamp of the integrated emission (clamp(E)) saturates every ray that crosses any sheet.
- Root cause: Cycles clamps each SAMPLE (indirect clamp 10, r+g+b) and point-samples a procedural volume once per step (step =
  1/10 of the bounds, 0.2 R): a sample that lands in a thin sheet saturates, one that misses adds nothing, so the pixel is
  E[clamp] = P(hit) x clamp. Our analytic integral then clamp gave clamp(E) = the cap everywhere.

## 05:15-05:50 F2 build (Orb.ts, ORB_P4HIT) and tuning batches e3-e13 (all paired, fresh page per config)
- Model: lam = sum(sheet mean coverage x step), P = 1 - exp(-lam x 10 / R) (2 / Cycles step in radii), levels smoothstep(lo, hi)
  (the reference is bimodal: clipped tongues and lens-image gaps), hits x gain over the clamp, faded out towards the glass edge
  (0.7-0.95 of the impact parameter: the faint outer shell otherwise left a dark annulus inside the rim, batch e7). Hold only
  (weight 0 at rest, 1 x uRim in the hold). The inner (internal reflection) pass the same way.
- e3: raw P (no levels): the disc goes grey (p05 L50 240, nothing clipped). e4 (levels 0.3-0.7): white filaments on a dark disc
  (inverted look). e5 levels 0.06-0.12 / 0.38-0.5: p05 share < 215 22-26 % (F402 21.7), sd 23-24 (24.4), but box clip 5-13 %.
- e6-e8 R2: a band lift 1.6-2.2 = a uniform white ring around the structured core (rejected); the rim pre-filter knobs had no
  effect (the outer shell's coverage is ~0); the edge fade + band 0.6 + an additive lavender hairline (0.62, 0.55, 1.0) x 1.4.
- e10 (gain over the clamp, keeps the copy's mean the ice reads): gain 1 -> ice annuli 1.02-1.5 R -0.7 / -0.5 L at the open orb,
  band in front of the hidden orb -9 L; gain 1.8 / 2.4: -0.2 / 0.0 and -3 / -0.7 L.
- e12 / e13 on the final capture sequence (q00, q03, p04, p05, p06; taus 3.3, n): V5 = levels 0.15 / 0.5, gain 3, hold core glow
  (uR11OrbC.x) 0.4 -> 0.25: p05 (3.3) < 215 13.9 -> 19.1 % (F402 21.7), < 235 26.9 -> 36.8 (37.1), sd 21.2 -> 22.9 (24.4), L10 205
  -> 204 (198), box >= 248 18.9 -> 13.3 % (16.2), core r < 0.5 R >= 250 81 -> 65 % (40); ice annuli -0.43 / -0.35 / -0.05 L;
  hidden orb (tn) band -4.2 L, ice annuli +0.68 / +0.51 L. V1 (gain 2.2, core 0.4): p05 < 215 20.4 % but ice -0.55, hidden -6;
  V3 (0.2 / 0.55): < 215 25 %, < 235 48 % (too dark), hidden -11.6. -> V5 shipped.
- Temporal (tools/flk.mjs + flka.py, 12 frames of 1/60 s): p05 open-orb disc 2nd/1st difference 1.50 (MAIN 1.53), p06 hidden
  1.41 (1.43); ice 1.46 / 1.47: no added flicker (1st differences +10 % in the disc = the visible structure moving).

## 05:33-05:40 F4 (Shards.ts, SHARD_P4R3): top facets lifted with their chroma pushed
- e11 (paired, B-R >= 85 px, judge's shardpair metric; off -> on / REF): (0.5, 0.5, 0.35) p95 q00 150.9 -> 163.1 / F000 163.5,
  q03 153.5 -> 162.9 / F045 168.4, p04 164.1 -> 172.7 / F358 177.7, p06 160.8 -> 174.1 / F420 170.2; sat 0.483 -> 0.477 (p04),
  0.654 -> 0.637 (q00). (0.6, 0.35, 0.25) +6..+8 L; (0.55, 0.65, 0.5) p06 177.6 (over). Zooms img/e11/shz_e11_*.png: periwinkle,
  no paper-white chips.

## 05:50-05:56 ident (tools/bid.sh, the round-1 identP: 20 moving frames, final + 13-14 targets + every linked program)
- ?p4orb3=0 vs :5173 IDENTICAL at T1 (14 targets, 16 programs), T2 (15 / 16), T1 HOLD expand 2.97 (14 / 18);
  ?orbhit=0&orbrim3=0&shardtop=0 HOLD IDENTICAL; lane ON vs :5173 differs only in main, refraction, bloom0-4, final + rx-orb,
  rx-shards (mirror, walk, cache, reflection, back untouched). tsc hero 0 / project 0.

## 05:49-06:20 final build (05:49:16), proofs, capture set, perf
- Final defaults: uP4Hit (0, 1, 10, 3), uP4HitB (0.15, 0.5, 0.7, 0.95), uR11OrbC.x 0.25 in the hold with the hit model, uP4RimB
  (0.6, 0.975, 0.02, 1.4), uP4RimC (0.62, 0.55, 1.0), Shards uP4ShC (0.5, 0.5, 0.35, 0). tsc hero 0 / project 0.
- ident (ident/summary1.txt, summary2.txt): ?p4orb3=0 vs :5173 IDENTICAL at T1, T2, T1 HOLD, T0 phone, envlake=plate; sub-switches
  all off IDENTICAL; ?p4orb=0 vs :5173?p4orb=0 IDENTICAL (T1, T1 HOLD); lane ON at T0 IDENTICAL; lane ON T1 differs only in main /
  refraction / bloom0-4 / final + rx-orb, rx-shards.
- Final paired evidence (caps/fin2, ana/fin2_orb.txt, ana/fin2_shards.txt): p05 open < 215 13.9 -> 19.1 % (F402 21.7), < 235 26.9
  -> 36.8 (37.1), sd 21.2 -> 22.9 (24.4), box 18.9 / 16.8 -> 13.3 / 11.4 % (16.2 / 14.3); p06 open box 21.8 -> 15.1 %, sd 9.5 ->
  15.3; ice annuli -0.43..-0.52 L (open), +0.5..+0.7 (hidden); hidden-orb band -4 L; rest q00 / q03 identical (orb). Rim p05
  band 228 -> 238 (245), hairline (197, 211, 230) -> (228, 231, 243). Crystals p95 q00 150.9 -> 163.1 (163.5), q03 153.5 -> 162.9
  (168.4), p04 164.1 -> 172.7 (177.7), p06 158.3 -> 169.0 (170.2).
- qc_final (qc_r11.zsh T1 1, 05:57-06:05, no page errors); sweep stills: no black / NaN (ana/sweep_check.txt).
- perf: rtx real loop 6 pairs per mode (load 5.3-9.2): paired block-median ratios hold 1.000 / move 1.000 / rest 1.000 (mean ratios
  0.986 / 0.987 / 0.995); ftime sync 8 pairs: rest 0.994, hold 0.988. Machine loaded by other lanes (both labs 58-88 ms).
- Patch WORK/p4orb3_vs_int1.patch (229 lines, sha256 8e73bbce...; Orb.ts, Shards.ts); apply test on a fresh int1 app/ copy: rc 0,
  0 .orig / .rej, app/ == lane app/. HANDOFF: LANES/p4orb3/HANDOFF.md. Lab :5176 left running.

## 21 Nov 06:47-07:4x WIB - FIXER (judge p4orb3 verdict: F2 major still open; fix F2 only, no new features). Work in WORK/fix/.
- Read p4r3_common.md, the judge's LOG / verdict.json (F2: the hit structure is the radial inverse of F402 - clipped centre and a
  grey ring at 0.5-0.8 R, where F402 has a dark central figure inside a disc clipped white to ~0.86 R), REF F402 3x, the F372-F418
  sheet, F453 / F358 / F045 (F402, F453 and F045 show their grey figure near the centre, the outer disc at the clamp; F358 is mostly behind the band).
- Repro: the judge's harness copied to fix/tools (jdv.mjs, jdet.py, jrad.py, jlib.py); fresh-page M = :5173 vs L = :5176 reproduces
  the judge's MAIN rows exactly (p05 radial 255/254/253/252/249/246; core 81.3 %; <215 13.9 %), and batch a's v0 (the builder's
  defaults, live page) gives the same inverted profile (p05 255/253/247/234/233/242, core 66 %).
- Cause (agrees with the judge): P = 1 - exp(-10 lam / R) is the hits' TOTAL along the chord, so the 1.68 R central chord saturates
  by its length and the 0.5-0.8 R chords (closest approach in the tau-thinned outer shell) read grey whatever the field does.
- Change (Orb.ts only, inside ORB_P4HIT): uP4HitC (new): x = chord normalisation exponent, P uses lam x (1.68 R / chord)^x (x 1 =
  the mean coverage along the chord: the gaps follow the field), y = 1.68 the chord where both agree, z = the uRim at which the
  model is fully on (smoothstep(0, z, uRim); 0 = linear as before). Same factor in the internal-reflection pass. No new pass, no tap:
  one pow per pixel.
- Batches (live variants, fix/caps/a, fix/img/{a,b,c}, fix/tools/fa.py = radial medians + core / <215 / <235 / sd + hidden-orb dL):
  a: x 1 alone (k1) re-saturates; scale 10 -> 5 / 3 (k1z5, k1z3) puts gaps everywhere, darkest at 0.5-0.7 R (the tau-thinned
  shell), hidden-orb band -18 / -29 L (the copy). b: the fade to MAIN's clamp moved in (0.7-0.95 -> 0.5-0.72 / 0.45-0.65 R): the
  outer disc back at the clamp, the figure in the centre (b4 p05 248/246/247/252/251/248, core 43 %); gain 3 -> 6-10 recovers the
  hidden band partly. c: c1 = x 1, scale 5.5, gain 8, z 0.5, fade 0.45-0.67 (p05 core 39 %, hidden -3.9 L, release core 44 %);
  c3 = scale 5 (centre 238/239 = F402's, but core 31 % and hidden -5 / -6 L). -> c1 shipped (uP4Hit (0, 1, 5.5, 8), uP4HitB (0.15,
  0.5, 0.45, 0.67), uP4HitC (1, 1.68, 0.5, 0)).
- Final paired evidence, the judge's harness on fresh pages (fix/tools/fD.sh = jC.sh; fix/caps/det; fix/ana/radial_gap_fix.txt;
  fix/img/det/det_stats_ML.txt, det_stats_M2L2.txt, ML_*.png = MAIN | lane | REF):
  radial median L 0-.3/.3-.5/.5-.6/.6-.7/.7-.8/.8-.86 R (F402 237/235/252/254/253/252):
    p05 open  MAIN 255/254/253/252/249/246  builder 255/251/236/234/235/242  FIX 247/239/248/252/249/248
    p06 open  MAIN 255/254/254/253/250/247  builder 255/253/248/237/235/242  FIX 247/245/250/253/250/248
    p04 nat.  MAIN 255/253/253/253/250/247  builder 255/253/249/243/242/243  FIX 245/242/249/252/250/247
    p07 rel.  MAIN 253/253/253/253/249/245  builder 254/253/252/252/248/244  FIX 251/250/252/253/249/245 (F453 244/249/252/255/255/255)
  core r<.5R >= 250: p05 81.3 -> 39.3 % (F402 40.0; builder 65), p06 96.2 -> 41.6 (builder 73), p04 nat 94.1 -> 39.1 (75.6),
  p07 90.6 -> 54.5 (F453 46.6; builder ~87); p05 <215 13.9 -> 17.2 % (21.7; builder 19.1), <235 26.9 -> 35.4 (37.1), sd 21.2 -> 21.7
  (24.4), box248/250 18.9/16.8 -> 12.4/9.8 (16.2/14.3); p06 <215 0.0 -> 0.9 %, <235 11.5 -> 26.3. T2 the same (p05 core 82.9 -> 34.5).
  Hidden orb (p05 / p06 natural, r < .75 R): -3.96 / -3.74 L vs MAIN (builder -4.2 / -3.8; L90 249 -> 241, F420 252): NOT restored.
  Rest q00 / q03 orb identical (+0.02 L). Far field > 1.6 R: <= 0.12 % px > 2 L (max 24, crystal-edge AA). Ice 1.02-1.6 R +-0.4 L.
- Looked at: fix/img/det/ML_p05_t3.3.png (the figure now in the centre, bright disc to the rim; softer than F402's bold keyhole),
  ML_p07_t3.3.png (release: faint tongues, F453 bolder), fix/img/c/p05_t3.3.png (all variants), fix/img/qc_hold_MAIN_lane.png (qc
  set p04-p07 MAIN | lane: a soft grey central figure, faint at full frame).
- ident (fix/tools/fid.sh, fresh on both sides; fix/ident/summary.txt): ?p4orb3=0 vs :5173 IDENTICAL at T1, T2, T1 HOLD, T0 phone,
  envlake=plate; ?orbhit=0&orbrim3=0&shardtop=0 HOLD IDENTICAL; ?p4orb=0 vs :5173?p4orb=0 HOLD IDENTICAL; lane ON at T0 IDENTICAL;
  lane ON T1 / HOLD differ only in main, refraction, bloom0-4, final + rx-orb, rx-shards. tsc hero 0 / project 0.
- qc set WORK/qc_fix (qc_r11.zsh T1 1, exit 0, no page errors); sweep fix/ana/sweep_check.txt: 0 black px in all 36 stills;
  clipped px hold / pop 17.3-21.5k vs MAIN 17.3-18.4k (as the builder's).
- Patch regenerated: WORK/p4orb3_vs_int1.patch 240 lines sha256 dbaa2620...366d (Orb.ts, Shards.ts); apply test on a fresh int1
  app/: dry rc 0, apply rc 0, 0 .orig / .rej, app/ == lane app/. Fixer-only diff vs the builder: fix/fix_vs_builder.diff (48 lines).
- perf (SLOT_BG=0, lane :5176 vs :5173, T1 1440x766): first rtx try 07:15 INVALID (load 11-21, then a system spike to 337 from
  iCloud daemons); re-run after load < 8 (fix/tools/fperf.sh): ftime synchronous 12 alternations x 60 frames (load <= 6.4):
  rest paired mean-ratio median 0.964 (pooled 0.954), hold 1.012 (median-ratio 1.005, pooled 0.962); rtx real loop 6 pairs per
  mode, all at load 3.5-5.9: block-median paired 1.000 / 1.000 / 1.000 (hold / move / rest; vsync 50 / 66.7 ms), mean-interval
  medians 1.046 / 0.974 / 0.919. No regression > 5 % (fix/perf/ftime_summary.txt, rtx2_summary.txt). Added work: one pow per
  orb pixel.
- flicker (fix/tools/fflk.sh + tools/flka.py, 12 frames of 1/60 s; fix/ana/flicker.txt): disc d2/d1 p05 1.44 (MAIN 1.53), p06
  hidden 1.40 (1.43), p07 1.84 (1.86); d2 4.72 vs 4.69, 7.47 vs 7.90, 4.36 vs 4.25: no added flicker.
- Acceptance status vs the judge's F2 criteria: (a) radial layout now F402's way round (centre below the 0.5-0.86 R annulus; the
  annulus within 1-5 L of F402, was 10-20 below; the centre 4-12 L above F402, was 18-20) - partly; (b) core clip ~40 % - MET
  (39 / 42 / 39 %); (c) release shows the figure - partly (core 91 -> 55 %, F453 47; centre 251/250 vs 244/249); (d) band in front
  of the hidden orb not dimmer than MAIN - NOT met (-4.0 / -3.7 L, as the builder's): needs the ice lane (IceMaterial orb-through
  x1.05 in the hold, judge H1) or acceptance; options in HANDOFF.
- Mirror: MAIN/notes/round11/lane_backup/p4r3/p4orb3/ (LOG, HANDOFF, patch, fix/ tools, ana, ident, perf, key images). fix/caps/a
  (exploration raw captures, 540 MB) deleted after analysis; fix/caps/det (final paired evidence) kept. Lab :5176 left running.
