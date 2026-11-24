# wl2f LOG (lane wl2f, lab :5165; base LANES/p4wl :5163; MAIN water :5162)

## 22 Nov 18:11 start. Read briefs p4r4 + p4pri2, args p4wl + p4wl2 (common + wl2f), p4wl HANDOFF, rejudge LOG. No earlier attempt. Lane app == p4wl app. Lab :5165 started.
## 18:13 diagnosis (code read, Water.ts P4WL_BAND): the quarter pass stores, per tap, the walk at the texel CENTRE (face colour,
   final horizon lkWalkE) or -0.2 "no face". Across the shelf reflection's outline the walk flips face / no face: inside the lifted
   rays (pc) take the face's dark foot, outside they take the far colour -> a step of pc x (cFace - cFar) that the bilinear read
   draws as the quarter grid's staircase; the grid is screen-space, so it re-tiles every camera step (= WL-RJ1).
## 18:16 build v1 (WL2F, `?wl2f=0` off): the quarter tap = 4 sub-walks over its own lake footprint (2x2 at +-0.25 texel, unbumped
   as P4WL_BAND), soft face weight smoothstep(0, eps=0.004 rad, eT - emin) per sub-walk; stored: share-weighted face colour,
   mean horizon, covered fraction packed in a (4 floor(1000 cov) + eT + 2; float32 nearest target while on). Read: a4 *= cov.
   P4 W2 glass guard (when compiled) gets the decoded horizon. Lab ?wl2fk=1/2/4, ?wl2ffp=, ?wl2fe=. tsc hero 0.
## 18:19 bg: FAIR :5162 slow/medium/diag/leave (fast/reverse from rejudge: 63/748, 103/1427). Same-pose chain d1/d2 M P X G + L.
## 18:30 v2: the band read interpolates the horizon / colour / coverage over the face taps FIRST, then one share per pixel
   (P4WL_BAND blended per-tap step-like shares). Same-pose DPR1 (fast, f98-101): L2 blips left 578 / shelf 205 / far 980
   (P 590 / 206 / 990, M 774 / 216 / 1101, px 711 / 222 / 1173, GT 325 / 192 / 920). LOOK: outlines unchanged.
## 18:33 debug view (?wl2fdbg=1): the whole shelf-water band is face-covered taps (no marker seam there): the outlines are
   discontinuities of the WALK FIELD itself at heightfield-cell scale (cell entry d -> face lookup / horizon jump), which move
   as the azimuth changes. px / GT hide them by the per-pixel bump (GT averages them). => prefilter over the bump ensemble.
## 18:38 variants (FP footprint scale, NJ normal jitter): FP4 (VA) softer, still outlined; NJ1 (VB) softer, outlined;
   FP4+NJ "2" (VC, bug: jitter x FP = 8 sigma) outlines GONE, GT-like, but far slab columns washed out (far 1365 vs P 990).
   Fixed: jitter decoupled from FP (+-NJ sigma of the bump's 0.07 sig slope spread).
## 18:47 D (FP2 NJ2), E (FP4 NJ2): outlines softer, still there; F (FP4 NJ4): outlines gone (GT-like) but left 731 / far 1242
   (P 590 / 990). Shelf box: P 206, D 196, E 196, F 193, GT 192 (all within GT + 15 %). Hypothesis for F's left / far rise:
   the jittered (ensemble) band now differs more from the per-pixel walk at the waterline markers -> the quarter-grid seam
   there. Added WL2F_NEAR (?wl2fnear= texels): taps that close to a footprint keep NJ 0. FAIR :5162 own-GT (T1): slow 41/293,
   medium 73/910, diag 39/527, leave 52/645 (events >= 6 px / px), fast 63/748 + reverse 103/1427 (rejudge, same code).
   DPR 2 "GT" via ?lkmeach at dsf 2 == px (lkmeach = mirror every frame only, the GT is the 2x supersample): dropped.
## 18:44 G/H (NJ4 + near-footprint fade 2 / 4 texels): left 729 / 712, far 1237 / 1229 = no help (the seam hypothesis is wrong);
   I (FP4 NJ3 near3): outlines gone, left 689, far 1181. LOOK left box: the near water's ripple stripes get darker / more
   contrasty than P and GT with the jitter (the source of the extra blips). Azimuth-only jitter (J FP4 NJ3, K NJ4, N FP2 NJ4,
   z 0): left 622-635, far 1064-1079 but the dark blobs with stepped outlines are BACK => the elevation spread is the key.
   Testing elevation-only (x 0): P (FP4 NJ3), Q (FP4 NJ4), R (FP2 NJ3).
## 18:45 elevation-only jitter (x 0): P (FP4 NJ3) faint blobs remain; Q (FP4 NJ4): CLEAN (GT-like), left 528 (P 590, GT 325),
   shelf 191 (GT 192), far 1407 (P 990: worse); R (FP2 NJ3) blobs remain. Testing Q + distance fade of the jitter
   (WL2F_DFAR: fades over [D, 1.5 D] m of dist0): S 30, T 50, U 20.
## 18:48 S/T/U (Q + far fade 30 / 50 / 20 m): the shelf water and the far slabs are at the same distance: fade 20 / 30 brings the
   blobs back, 50 keeps far 1408. LOOK far crop: Q draws a large dark WEDGE reflection under the far slab gap (not in P or GT):
   REJECTED as a default. Next: both-axis jitter (as F / I, no wedge) faded IN from the near water (WL2F_DNEAR): V (NJ3, 12 m),
   Y (NJ3, 20 m), Z (NJ4, 16 m).
## 18:48 V / Y / Z (near fades 12 / 20 / 16 m): left 701-729, far 1194-1242: no help (the left box's extra blips are mid-distance
   floe water, not the near water). Far crop: columns longer and ripple-broken (no wedge). DECISION (time box): default = I
   (K4, FP4, NJ3 both axes, near 3, eps 0.004, interp-first). tsc hero 0 / app 0. Final chain started 18:49 (ident, final
   same-pose d1 / d2, 60 fps sparkle vs p4wl, FAIR six paths vs own GT; then perf STRICT 8 pairs alone).
## 18:52 FINAL same-pose DPR 1 (fast, 120 frames; st/final_d1.txt): blips/frame left M 774 | p4wl 590 | LANE 668 | px 711 | GT 325;
   shelf water 216 | 206 | 211 | 222 | 192 (lane GT +10 %); far 1101 | 990 | 1102 | 1173 | 920 (lane = MAIN, +11 % vs p4wl).
   LOOK st/final_d1_M_P_F_X_G.png: the crenellated reshaping outlines are GONE in the shelf-water band (soft tonal patches,
   GT-like). OPEN: finalleft: a darker smudge in the water below the left floes (not in p4wl / GT); finalfar: the far columns
   are ripple-broken (GT-like) but a small dark notch at one slab foot; left / far blips above p4wl.
## 18:54 FINAL DPR 2 (st/final_d2.txt): left M 1305 | p4wl 1075 | LANE 1242 | px 1270; shelf 345 | 329 | 344 | 340; far 1797 |
   1599 | 1806 | 1906. LOOK st/final_d2_M_P_F_X.png: outlines gone at DPR 2 too (soft bands, px-like).
## 18:55 60 fps sparkle at rest (far clip 860,420 580x200 vs own DPR-2 GT; s60/s60_far.txt): farwater p4wl 1.7 | LANE 1.4,
   lips 1.0 | 1.0 (GT 0.0) -> no new sparkle. Client files refs_user/wl2_wl2f_{1x,2x}_MAIN_left_LANE_right.jpg + _T1dpr2 mp4.
## 18:57 load 19, 4 lanes on the slots: ident re-run outside the slot (as round 1's idchain2, light 20-frame captures, resumable),
   re-sequenced: FAIR fast (GT running) -> ident -> perf STRICT alone -> FAIR reverse / slow / medium / diag / leave.
   HANDOFF drafted (gates pending).
## 19:02 rest diff p4wl vs lane (deterministic rest path, rest/rest_P_L_diff.png): only y >= 469 changes (rings region max 1 level,
   signed luma ~0), BUT the diff shows blocky zone edges 3 texels off the slab / floe footprints = WL2F_NEAR's per-tap switch (a
   quarter-grid seam at the waterlines, likely the 'dark notch'). NEAR barely helped (G/H/I). DEFAULT CHANGED: NEAR 0 (K4 FP4
   NJ3 both axes). tsc 0 / 0. Re-running the lane-dependent gates (seq3: st d1 / d2, s60, ident on_*, perf, FAIR x6).
## 19:05 rest diff of the NEAR 0 build (rest/rest_P_L2_diff.png): the same block shapes -> they are NOT WL2F_NEAR: they are p4wl's
   marker zones (taps under / next to a footprint -> the per-pixel walk, unchanged = dark in the diff) bordering the band read
   (changed). Correction to 19:02. OPEN: the ensemble band differs more from that per-pixel fallback, so the existing quarter-grid
   marker seam along the waterlines gets more contrast (likely the 'dark notch' at a far slab foot). NEAR 0 kept (simpler).
   Rest: rings region max 1 level, lake only (y >= 469), signed luma -0.05.
## 19:13 FINAL build (NEAR 0, Water.ts sha f5156bb6) same-pose: DPR 1 left M 774 | p4wl 590 | LANE 688 | px 711 | GT 325; shelf
   216 | 206 | 212 | 222 | 192; far 1101 | 990 | 1121 | 1173 | 920. DPR 2 left 1305 | 1075 | 1274 | 1270; shelf 345 | 329 | 346 |
   340; far 1797 | 1599 | 1829 | 1906. LOOK final_d1 / final_d2: outlines gone at DPR 1 and 2.
   IDENT (id/ident_summary.txt): wl2f=0 == :5163 and p4wl=0 == :5162 IDENTICAL at T1, T2, T0 phone, expand 0.9 / 2.97, release
   0.33; lane on T0 == :5163; controls (lane on T1 / T2 / poses) DIFFER in walk, main, refraction (the lake seen through the
   rings), bloom, final; programs rx-water, rx-water-walk. Rest: ring region <= 1 level.
   60 fps sparkle (s60/s60_far.txt): farwater p4wl 1.7 | LANE 1.5, lips 1.0 | 1.1 (MAIN 2.1 / 1.1 rejudge), GT 0.0.
   Client files regenerated from the final captures. Perf STRICT running (load 27-37, 3 lanes in perf at once).
## 19:23 FAIR fast (T1, vs own 16-sample GT, popscan minpx 6; fair/fair_L.txt): LANE 71 events (849 px) vs MAIN 63 (748) [+13 %,
   over the +10 % gate] and p4wl 39 (535). => the ensemble walk adds waterline pops on the fast path: FAIL. STRICT perf impossible
   now (3 lanes' perf + FAIR jobs, load 13-36): perf2 with GATE_S 15 (pairs flagged invalid): pair ratios 1.009, 1.000, 1.852
   (outlier under load). FAIR reverse running.
## 19:29 FAIR reverse: LANE 133 events / 1757 px (MAIN 103 / 1427, p4wl 81 / 1241): FAIL. Perf2 (GATE_S 15, none STRICT-valid):
   8 pairs paired median 1.021 (1.019 w/o a 38.9 ms outlier), A 21.1 / B 21.8 ms, all A in the high mode. Stopped perf2 to free
   the slot for FAIR slow / medium / diag / leave. VERDICT: ok = false (bar 2, 5 fail; 3 not STRICT). Contour gone (bar 1).
## 19:42 FAIR six paths DONE (fair/fair_L.txt): LANE vs MAIN events / px: fast 71/849 vs 63/748, reverse 133/1757 vs 103/1427,
   slow 65/521 vs 41/293, medium 97/1111 vs 73/910, diag 53/667 vs 39/527, leave 70/768 vs 52/645: FAIL on all (+13 to +59 %).
   FINAL: ok = false. Bar 1 met (contour gone, DPR 1 and 2), 4 / 6 / 7 pass; 2 and 5 fail; 3 not STRICT (+2.1 % non-strict).
   The default (bump-ensemble quarter taps) should not merge as is; the analysis (the contour is a walk-field discontinuity
   removed by a bump-ensemble prefilter) and the lab switches are the deliverable. Lab :5165 left running.
