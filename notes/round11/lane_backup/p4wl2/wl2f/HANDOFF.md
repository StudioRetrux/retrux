# wl2f HANDOFF (water round 2, WL-RJ1 by footprint-filtered quarter taps), BUILDER 22 Nov 18:11-19:50 WIB
Lab :5165 (left running, final source). Base :5163 = LANES/p4wl (frozen). MAIN water :5162. WORK = $SP/work_p4/wl2f (LOG.md, tools/,
st/ same-pose captures, s60/, fair/, perf/, id/). Mirror: MAIN/notes/round11/lane_backup/p4wl2/wl2f/ (LOG, patch, numbers, img/).

## VERDICT: ok = false
- THE BAR (1) MET by look: the crenellated dark outlines of the left shelf's reflection in the shelf-water band (CSS x 280-480,
  y 440-520) that take a new shape every frame in MAIN and p4wl are GONE in the lane at T1 DPR 1 and DPR 2 (same-pose sheets
  img/final_d1_M_P_F_X_G.png, img/final_d2_M_P_F_X.png; columns MAIN | p4wl | LANE | px | GT, frames 98-101). What is left there is
  soft tonal shading, like the GT.
- THE BAR (2) NOT MET: the shelf box is within the GT + 15 % (212 vs GT 192, +10 %), but the left box is not (668 vs GT 325;
  NO build reaches it: MAIN 774, p4wl 590, px 711 — it is the lake's ripple sparkle that the 2x2-supersampled GT averages away),
  the left box is above p4wl (688 vs 590, +17 %; below MAIN 774) and the far box is WORSE than :5163 (1121 vs 990, +13 %;
  MAIN 1101).
- Open LOOK findings on the default (img/finalleft_d1_M_P_F_G.png, img/finalfar_d1_M_P_F_G.png): a darker smudge in the water
  below the left floes (not in p4wl or the GT); the far slab columns are now ripple-broken (GT-like, toward job B) but one slab foot
  shows a small dark notch; near-water ripple stripes a little more contrasty than p4wl. Cause of the notch (rest diff
  img/rest_P_L2_diff.png): the taps under / next to a footprint keep the per-pixel walk (p4wl's markers, unchanged); the ensemble
  band now differs more from it, so the existing quarter-grid seam between the two along the waterlines has more contrast.
- THE BAR (5) FAILS: the FAIR gate (T1, each build vs its own 16-sample GT) gets WORSE: fast 71 events / 849 px (MAIN 63 / 748,
  p4wl 39 / 535), reverse 133 / 1757 (MAIN 103 / 1427, p4wl 81 / 1241). The 4-sample +-3 sigma bump ensemble removes the shelf
  contour but adds waterline pops in motion on every path (slow +59 %, medium +33 %, diag +36 %, leave +35 % vs MAIN too): the
  client's flicker complaint gets worse at the floe / slab feet.
- RECOMMENDATION: do NOT take this default as is. The finding that matters for the next round: the morphing contour is a
  discontinuity of the walk field (not the quarter grid) and goes away with a bump-ensemble prefilter of the quarter taps; the
  ensemble has to be physical (more sub-walks at ~+-1 sigma, see Next) to keep p4wl's pop levels.
- (3) perf: not measurable STRICT in the time box (three lanes' perf + FAIR jobs, load 13-37); 8 non-strict pairs below.
- (6) ident and (7) pass; see the gate table below.

## Root cause (refined; WORK/LOG.md 18:13-18:48, debug view img/dbg_d1_P_L2_D.png)
1. P4WL_BAND blended the four taps' SHARES Phi((eT - mu) / sE). On the glassy water sE is small, so each share is close to a step
   and the blend is a bilinear blend of a binary tap mask: the quarter grid's staircase wherever the horizon crosses the pixel's
   own elevation. FIXED: interpolate the horizon, colour and covered fraction over the face taps FIRST, then one share per pixel.
2. The main source in the shelf-water band is NOT the quarter grid alone: the debug view (`?wl2fdbg=1`: red = per-pixel fallback,
   green = face weight) shows every tap there holds faces and no marker seam. The outlines are discontinuities of the WALK FIELD
   itself (which heightfield cell the low ray enters -> the face's lookup distance / height and the horizon jump at cell scale),
   and they move as the camera's azimuth and elevation change. px / GT hide them by the per-pixel bump (the GT averages it).
   Filtering over the texel footprint alone (FP 1-4) softens them but leaves them; sampling the bump's slope spread (an ensemble of
   4 sub-walks with jittered normals) removes them. The ELEVATION spread is the key (azimuth-only jitter left the blobs).

## The change (WL2F, `hero/engine/world/Water.ts` only; sha256 f5156bb6; patch WORK/wl2f_vs_p4wl.patch, 172 lines)
- Quarter pass (P4WL_BAND's LK_WALKPX branch): 4 sub-walks per tap, spread over +-1 texel of its lake footprint (WL2F_FP 4 x 0.25)
  and over the bump's coherent slope spread at +-3 sigma on both axes (normal tilt 0.07 x sig x 3; WL2F_NJ), each sub-walk's face
  weight soft over its first 0.004 rad above the lifted horizon (WL2F_EPS). (A near-footprint fade, WL2F_NEAR 3, was the default
  until 19:02 and is now lab-only: it is a per-tap switch, i.e. a quarter-grid seam 3 texels off the waterlines, seen in the rest
  diff map img/rest_P_L_diff.png of that build.) Stored: share-weighted face colour, mean horizon, covered fraction packed in alpha
  (4 floor(1000 cov) + eT + 2; no face -0.2; markers -1 / -0.5 unchanged). The walk target is RGBA float32 / nearest while on
  (quarter size: ~2 MB at 1890 x 1075; read by texelFetch only).
- Water read (P4WL_BAND's lkWalkRead): decode; weights wt x cov over the face taps; interpolate horizon / colour; one share per pixel
  (WL2F_INTERP). The P4 W2 glass guard, when compiled, gets the decoded horizon.
- No other file, no HeroEngine hunk, no asset, no new pass (the same quarter pass does 4 walks instead of 1).

## Switches
- `?wl2f=0`: p4wl exactly (no text change, half-float target). `?p4wl=0`: MAIN exactly (unchanged).
- Lab: `?wl2fk=1|2|4`, `?wl2ffp=` (4), `?wl2fnj=` (3; 0 = unbumped sub-walks), `?wl2fnjx=` / `?wl2fnjz=` (axis factors, 1),
  `?wl2fnear=` (0), `?wl2fdnear=` / `?wl2fdfar=` (distance fades, m, 0), `?wl2fe=` (0.004), `?wl2fi=0` (per-tap shares),
  `?wl2fdbg=1` (debug colours). Milder variant without the jitter (outlines softened, not gone; blips = p4wl): `?wl2fnj=0&wl2ffp=1`.

## Numbers (same-pose stepped fast path, T1, one-frame blips / frame, thr 12; st/final_d1.txt, st/final_d2.txt)
| box | MAIN | p4wl | LANE | px | GT |
|---|---|---|---|---|---|
| DPR 1 left 0-420 x 470-620 | 774 | 590 | 688 | 711 | 325 |
| DPR 1 shelf water 280-480 x 440-520 | 216 | 206 | 212 | 222 | 192 |
| DPR 1 far 880-1440 x 430-590 | 1101 | 990 | 1121 | 1173 | 920 |
| DPR 2 left | 1305 | 1075 | 1274 | 1270 | - |
| DPR 2 shelf water | 345 | 329 | 346 | 340 | - |
| DPR 2 far | 1797 | 1599 | 1829 | 1906 | - |
(GT = 2x2-supersampled px walk with the mirror every frame, gt_new cap at 2880 x 1532; no DPR 2 GT: ?lkmeach at dsf 2 == px.)
Variants tried (LOG 18:30-18:48; sheets img/v*.png): FP4 / NJ1 / FP2+NJ2 / FP4+NJ2 softened only; NJ4 both axes clean but left 731
far 1242; azimuth-only (x) blobs back; elevation-only NJ4 clean, left 528, but a large dark WEDGE under the far slab gap
(img/farq_d1_P_VQ_G.png): rejected; distance fades: the shelf water and the far slabs sit at the same distance (no separation).

## Gates on the FINAL build
| item | result | evidence |
|---|---|---|
| (1) contour gone T1 DPR 1 / 2 | PASS (look) | img/final_d1_M_P_F_X_G.png, img/final_d2_M_P_F_X.png |
| (2) left / shelf blips <= GT + 15 %, far <= :5163 | FAIL: shelf +10 % ok; left 688 vs GT 325 (no build passes; p4wl 590); far 1121 vs :5163 990 (+13 %) | st/final_d1.txt |
| (3) T1 sweep <= +5 % vs :5162, >= 8 STRICT pairs | NOT PROVEN STRICT: 8 interleaved pairs (1440 x 766, T1, A = :5162, B = :5165), none STRICT-valid (other lanes' perf / FAIR jobs, load 3.5-14): paired median 1.021 (1.019 without one 38.9 ms outlier pair); medians A 21.1 / B 21.8 ms; all A runs in the high mode (20.8-21.9), B 21.3-22.2. Expected cost: 3 more walks at 1 / 16 of the pixels (~+2 %) | perf/sweep2.txt, perf/sweep2_summary.txt |
| (4) no new sparkle at 60 fps | PASS: farwater 1.7 -> 1.5, lips 1.0 -> 1.1 (MAIN 1.1), GT 0.0 | s60/s60_far.txt |
| (5) FAIR six paths vs own 16-sample GT | FAIL on all six (events >= 6 px / px; LANE vs MAIN :5162): fast 71 / 849 vs 63 / 748 (+13 %), reverse 133 / 1757 vs 103 / 1427 (+29 %), slow 65 / 521 vs 41 / 293 (+59 %), medium 97 / 1111 vs 73 / 910 (+33 %), diag 53 / 667 vs 39 / 527 (+36 %), leave 70 / 768 vs 52 / 645 (+35 %); p4wl (rejudge) fast 39 / 535, reverse 81 / 1241 | fair/fair_L.txt, fair/fair_M.txt (MAIN fast / reverse from the rejudge, same code and tools) |
| (6) ident | PASS: ?wl2f=0 == :5163 and ?p4wl=0 == :5162 IDENTICAL at T1, T2, T0 phone, expand 0.9, expand 2.97, release 0.33; lane on T0 == :5163 | id/ident_summary.txt |
| (7) ice look / T0 / tsc / console | PASS: rest diff only y >= 469 (rings region <= 1 level; IceMaterial untouched); T0 ident-identical; tsc hero 0 / app 0; 0 errors / warnings in every capture | rest/, tsc_*.txt |
Control (lane on vs :5163, T1 / T2 / poses) DIFFERS in walk, main, refraction (the lake behind the rings), bloom, final; programs
rx-water, rx-water-walk only.

## Client files (MAIN/notes/round11/refs_user/)
- wl2_wl2f_1x_MAIN_left_LANE_right.jpg (T1 DPR 1, CSS 0-720 x 420-640, frames 99-101), wl2_wl2f_2x_MAIN_left_LANE_right.jpg
  (T1 DPR 2, same box), wl2_wl2f_T1dpr2_MAIN_left_LANE_right.mp4 (120 stepped fast-path frames, 30 fps, 1.3 MB).

## Next (for the integrator / a fixer)
1. The jitter is a 4-sample estimate at +-3 sigma: more than the bump's real spread, which is why the near / floe water got
   busier and the far box rose. A physical ensemble (8 sub-walks at +-1 sigma, quasi-random per tap, or 4 + temporal-free rotation
   by lake position) should keep the outlines gone with p4wl's blips; cost +4 walks per tap (measure).
2. The source fix: a walk whose horizon and face lookup are continuous in the lake point (bilinear heights at fixed distances from
   P instead of the entered cell's entry distance; the face looked up where the ray meets the bilinear surface).
3. The left-box GT gap (all builds 1.8-2.4x the GT) is the ripple / wavelet sparkle of the lake, not the walk.
