# judge p4orb3 (P4 round 3, lane orb, lab :5176) - LOG (21 Nov 2026, 06:21 WIB start, 50 min box)

WORK = $SP/work_p4/judge_p4orb3; mirror = MAIN/notes/round11/lane_backup/p4r3/judge_p4orb3/ (everything but caps/).
Read-only on the lane; lab :5176 not restarted (it was up, built 05:49:16 from the final source).

## 06:22 build / patch sanity
- LANES/p4orb3/retrux-web/app vs LANES/int1: only hero/Orb.ts and hero/Shards.ts differ (diff -rq).
- Orb.ts saved 05:49:15, lab built 05:49:16; the served /dist/main.js == the lane's dist/main.js and carries the round-3 code
  (ORB_P4HIT x7, Vector4(0, 1, 10, 3), uP4ShC, p4orb3, uR11OrbC p4Hit ? 0.25 : 0.4).
- Regenerated patch (diff -u per file, int1 -> lane) sha256 8e73bbce...f282c, 229 lines == the shipped patch byte for byte.

## 06:24 ident (tools/jA.sh = the round-1 judge's identP.mjs: 20 moving frames, final + every target + every linked program)
ident/summary.txt:
- ?p4orb=0 lane vs :5173?p4orb=0, T1: IDENTICAL (14 targets, 16 programs)
- ?p4orb=0 lane vs :5173?p4orb=0, T1 HOLD (expand 2.97): IDENTICAL (14 targets, 18 programs)
- ?p4orb3=0 vs :5173, T1 HOLD: IDENTICAL (14 / 18)
- negative control lane ON vs :5173 T1 HOLD: DIFFER in main, refraction, bloom0-4, final; programs rx-orb, rx-shards only.
- batch F (T2 ?p4orb3=0, T0 phone lane ON): see bottom.

## 06:29 perf try 1 (rtx.mjs real loop, 6 interleaved pairs per mode, SLOT_BG=0) - INVALID
Machine load 15-57 during the run (other lanes' jobs); 0 pairs under load 10. Paired medians 1.000 / 1.002 / 1.000 (move / rest /
hold), not usable. perf/rtx.json.

## 06:29-06:31 paired deterministic captures, lane :5176 vs MAIN :5173 directly (tools/jdv.mjs = the builder's dv.mjs + --tier;
engine loop off, fresh page per config, ring clock pinned 3.3 = open hold orb / natural = hidden orb, plasma clock pinned).
tools/jdet.py (my metrics). img/det/*.png (MAIN | lane | REF, normal + 200-255 stretch), ana via det_stats_ML.txt / _M2L2.txt.
- Reproduces the builder's orb numbers exactly (p05 t3.3: box248/250 18.9/16.8 -> 13.3/11.4, F402 16.2/14.3; <215 13.9 -> 19.1 %
  (F402 21.7), <235 26.9 -> 36.8 (37.1), sd 21.2 -> 22.9 (24.4); band .86-.96 R 228 -> 238 (245); hairline (197,211,230) ->
  (228,231,243)).
- Far field (> 1.6 R, crystals masked): <= 0.15 % px change by > 2 L, max 15 L (crystal-edge AA): the lane touches nothing else.
- T2 (p05/p06 t3.3) behaves as T1 (p05: <215 13.4 -> 23.0 %, sd 21.0 -> 23.8; band 228 -> 238).
- Rest q00 / q03: orb identical (disc dL +0.0), only the crystals change.

### F2 radial layout (ana/radial_gap.txt): median L by r/R bins 0-.3/.3-.5/.5-.6/.6-.7/.7-.8/.8-.86/.86-.92/.92-.97/.97-1
- F402      237 235 252 254 253 252 250 240 237  (dark central keyhole, disc clipped white out to ~.86 R)
- MAIN p05  255 254 253 252 249 246 232 223 209  (flat white, dark rim)
- lane p05  255 251 236 234 235 242 238 237 231  (clipped core, GREY ANNULUS .5-.8 R, pale rim)
- lane p06  255 253 248 237 235 242 238 237 231 ; lane p04 n 255 253 249 243 242 243 236 234 228
The lane's structure is the radial inverse of F402's: gaps sit in a ring at .5-.8 R around a clipped centre, where F402 has a dark
centre inside a clipped outer disc. Darkest gaps match (L2 175 vs F402 174) but the area < 190 is 4.9 vs 7.4 %. The .5-.86 R annulus
moved from MAIN's F402-like 246-253 to 234-242 (-10..-20 vs F402); centre still 255 vs 237. Core r<.5R >= 250: 65 % vs F402 40 %.
p06 open only 8.6 % < 215. Rest / eye orb untouched (q03 vs F045 <215 12.2 vs 27.9 %, core 76 vs 60 %).

### hidden-orb hold (p05 / p06 natural clock)
- r < .75 R (band in front + slit): dL -4.2 / -3.8 mean, p5 -18; upper half (the band over the orb) -6.1 / -5.4, lower -2.3.
- vs F420: L90 249 -> 242 (F420 252), <235 60 -> 84 % (61) = further; but band-over-orb mean 234-238 -> 228-230 (F420 232),
  contrast vs band beside +34..+37 -> +27 (F420 +20), box248 0.7 -> 1.4 % (2.9) = closer. Mixed.
- Full frame (img/det/full_p06_tn_MAIN_lane.png, half res): no visible difference. Crops (ML_p06_tn.png): the band's central glow is
  a little greyer / blotchier; the slit carries grey wisps. -> nit, not counted as a regression.

### crystals (B-R >= 85 px within 4.5 R; p95 / median / sat, MAIN -> lane, REF)
q00 157.0/133.8/.473 -> 170.7/140.8/.466 (F000 174.7/149.7/.457); q03 160.7 -> 174.5 (F045 172.5), sat .493 -> .480 (.506);
p04 t3.3 166.6 -> 172.9 (F358 179.5); p05 167.8 -> 171.6 (F402 174.9); p06 161.3 -> 169.8 (F420 170.7), sat .480 -> .468 (.503);
p07 163.9 -> 176.9 (F453 173.6); p08 162.6 -> 179.5 (F460 176.7). Top facets now within -7..+3 L of REF (release slightly over).
Paired zooms img/det/crystals_paired_MAIN_lane.png: same mosaic, brighter periwinkle top facets, no paper-white chips.

## 06:32 crystal flicker (tools/flick.mjs + jflick.py, 16 deterministic frames, lane vs :5173) ana/flick_stats.txt
hold: 2nd-diff on crystals 16.63 vs 16.37, |d2|>60 9.80 vs 9.75 %; rest 26.18 vs 26.39, 15.30 vs 15.49 %. No added flicker.

## qc sets (lane qc_final vs r11_2 = MAIN int1 vs r11_1 = panel MAIN vs REF), img/qc, img/sweep, img/ptr
- sheets q00 / q03 / p04 / p05 / p06: rest identical in look; hold orb shows soft grey wisps (lane) vs flat disc (r11_2) vs thick
  blue fresnel ring (r11_1); REF F402 a bold dark keyhole.
- sweep (26 stills): no black / NaN, no seams; crystal p95 158-170 -> 165-180 (hold / pop / rel), intro 142-153 -> 151-160;
  orb zooms (sweep_orbzoom.png) show wisps at every hold / pop still, no glitch. Run-to-run timing differs, so no pixel diffs.
- pointer spots (ptr_sheet.png): no glitch; crystals brighter (p95 +5..+16), median sat unchanged (.75-.78 both).

## 06:34-06:45 perf (SLOT_BG=0, lane :5176 vs :5173, T1 1440x766 scale 1)
- rtx2 real loop, 6 interleaved pairs per mode (perf/rtx2_summary.txt): move all pairs at load 10.0-11.6 (paired 1.000, n/a);
  rest (load 8.3-9.6): block-median pairs [1.497, 1.497, 1.494, 1, 1, 1] = three vsync flips 33.4 -> 50 ms, mean-interval median
  1.096; hold (5 pairs < 10): block-median 1.000, mean-interval median 0.976.
- rtx3 rest-only re-check, 8 pairs at load 5.8-7.4 (perf/rtx3_summary.txt): block-median paired median 1.000, mean-interval
  median 1.007 (mean 1.017), pooled mean interval 59.11 vs 58.16 ms (1.016). The rtx2 rest flips were load / quantization.
- ftime synchronous (8 alternations x 60 frames, load <= 9.8 / 7.1): rest paired mean-ratio median 1.014, hold 1.029 (pooled
  1.048, pairs 0.94-1.16: noisy). ftime2 (12 alternations, load <= 6.8): rest pooled 1.000, paired 0.992 / 1.002; hold pooled
  1.007, paired 1.023 / 1.025. -> no regression > 5 %; the builder's numbers (rest 0.994, hold 0.988) are within the noise.

## 06:40 ident batch F: ?p4orb3=0 vs :5173 at T2 IDENTICAL (15 targets, 16 programs); lane ON vs :5173 at T0 phone 390x844 DPR3
IDENTICAL (9 targets, 12 programs).

## verdict (06:46)
pass false: F2 (major) still open - the hold orb's new structure is the radial inverse of F402's (clipped core + grey ring at
.5-.8 R vs F402's dark central keyhole inside a clipped outer disc); release (F453) and eye (F045) unchanged. Nits: R2 rim (band
-7 L, full-circle hairline), F4 residue (release +3 L over, sat -0.012 at p06 / q03), H1 hidden-orb band -5..-6 L (mixed vs F420,
invisible at full frame). Switches, patch, T0 / T2 and perf verified. Scores (panel MAIN r11_1 -> lane): orb_shards_light 7.5 ->
8.0, color_grade_post 8.3 -> 8.5, awwwards_jury 7.6 -> 7.9.
