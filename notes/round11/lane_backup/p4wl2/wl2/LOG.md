# wl2 INTEGRATOR LOG (water round 2), 22 Nov 2026 WIB. Lane LANES/wl2, lab :5167, WORK $SP/work_p4/wl2

## 20:25 start. Read briefs p4r4_common + p4pri2_common, args p4wl-water (round 1) and p4wl2-water (common, integrate, final_judge), the three judges' results, LANES/wl2g/HANDOFF.md.

## 20:26 DECISION (args.integrate rules)
- (a) no RJ1 lane passed (wl2g: 2 major + 1 minor + 1 nit; wl2f: 1 blocker + 3 major + 1 minor).
- (c) both judges found the morphing contour gone (wl2g: "WL-RJ1 is fixed at T1 DPR 1 and DPR 2 ... the morphing contour is gone";
  wl2f: "The lane meets THE BAR (1)"). Tie-break by (b)'s order, shelf-water-box blips vs GT: wl2g DPR 1 205 vs 192 (+7 %), DPR 2
  328 vs 323 (+2 %); wl2f DPR 1 212 vs 192 (+10 %). wl2g also passed FAIR on all six paths, while wl2f has the blocker WL2F-J1
  (FAIR +13 to +59 % vs MAIN at the left floe feet) and its own builder says "do NOT merge this default". WINNER: wl2g.
- wl2b: judge failed with 5 major findings (J1 job B not delivered by default, J2 cap-8 dims the x ~1208 column, J3 lips not fixed,
  J4 perf unproven, J5 FAIR not run). The rule takes wl2b only if its open findings are minor / nit: LEFT OUT.
- Open wl2g findings carried into wl2: WL2G-J1 major (real loop T1 DPR 2: left water in front of the left ice sheets pops ~55 %
  more than MAIN; inherited from p4wl's P4WL_BAND), WL2G-J2 major (BAR (2) left box +78 % / +22-29 % over GT; pre-existing in MAIN,
  p4wl, px), WL2G-J3 minor (quarter-texel staircase outline), WL2G-J4 nit (one contour redraw per re-anchor).

## 20:27 merge. `cp -c -R LANES/p4wl LANES/wl2`; wl2g touches only Water.ts and LANES/p4wl (frozen) equals wl2g's base, so the 3-way
merge (base p4wl, ours p4wl, theirs wl2g) = wl2g's patch: `patch -p1` clean. Water.ts sha256 d94c26c2 (= LANES/wl2g);
`diff -rq LANES/wl2g/retrux-web/app LANES/wl2/retrux-web/app` empty. p4wl's HANDOFF.md kept as HANDOFF_p4wl_copy.md.
tsc hero exit 0, app exit 0. Lab :5167 built 20:27:06. Served /dist/main.js (2373013 B, sha256 849d7909) and index.html are
BYTE-IDENTICAL to :5164 (wl2g's final build 4).
Patches: wl2_vs_p4wl.patch (338 lines, == wl2g_vs_p4wl.patch byte for byte); wl2_vs_p4ph.patch (419 lines, 6 hunks, Water.ts only;
applied to a copy of LANES/p4ph/retrux-web/app it reproduces wl2's app exactly; MAIN's Water.ts == p4ph's, so it applies to MAIN).

## 20:28 gate chain started (tools/chain.sh, serial through the slot): ident -> same-pose d1 / d2 -> rest crops -> STRICT perf (8 valid
pairs, max 12) -> FAIR fast, reverse, slow, medium, diag, leave (each vs its own 16-sample 2x GT).

## 20:31 ident (id/ident_summary.txt, final + every target + every linked program, 20 moving frames; refs = wl2g's frozen :5163 /
:5162 JSONs): ?wl2g=0 == :5163 IDENTICAL at T1, T2, T0 phone, p04 expand 0.9, p06 expand 2.97, p07 release 0.33; ?p4wl=0 == :5162
IDENTICAL at all six; merged ON == :5163 at T0 (no walk on T0); merged ON == wl2g :5164 at T1 and T0; CONTROL merged ON vs :5163 T1
DIFFERS (only program rx-water-walk). logs 0/0 in all 16.
## 20:32-20:36 same-pose stepped fast path, 120 frames: st/d1_W and st/d2_W are BYTE-IDENTICAL to wl2g's d1_G4 / d2_G4 (120/120 each,
st/bytecmp.txt). Blips thr 12 (MAIN | p4wl | merged | px | GT; stan.py, wl2g's M / L / PX / GT captures):
  DPR 1: left 774 | 590 | 577 | 711 | 325 (+78 % over GT: FAIL); shelf 216 | 206 | 205 | 222 | 192 (+7 %); far 1101 | 990 | 977 | 1173 | 920 (<= :5163).
  DPR 2: left 1305 | 1075 | 1053 | 1270 | 761 (+38 % with this resample; builder 818 -> +29 %, judge 861 -> +22 %: FAIL either way);
         shelf 345 | 329 | 328 | 340 | 312 (+5 %); far 1797 | 1599 | 1586 | 1906 | 1596 (<= :5163).
  Looked: st/d1_contour_x5.png (rows MAIN / p4wl / merged / GT, frames 98-101 + diffs x8) and st/d2_contour_x4.png: MAIN / p4wl redraw
  the crenellated teeth each frame (filled diff patches); merged keeps one stair-stepped outline that slides (thin diff lines); GT is
  soft. WL-RJ1 morphing gone; WL2G-J3 staircase stays. st/d1_shelf.png (1x, low contrast) consistent.
## 20:33-20:40 perf STRICT T1 sweep (perf/sweep.txt): 8 valid / 8 pairs, paired median 1.015, A med 20.2, B med 20.4 ms. CAVEAT: pairs 0-2
ran beside my own post-analysis python (outside the slot, 20:33:35-20:36:13), so they are not clean. Clean pairs 3-7 ratios 1.000,
0.990, 1.035, 1.015, 1.063 (A 19.2 low mode): median 1.015. A clean top-up of 4 valid pairs is queued after FAIR (tools/perf2.sh).
## 20:40 rest crops (caps/rest_T{1,2}_{main,wl2}): REF | merged | MAIN far / left at 1x / 2x. Looked at T1 far 1x: merged == MAIN look
(short soft columns); REF's long bright ripple-broken columns not reached: job B not delivered (wl2b left out).
Client files -> MAIN/notes/round11/refs_user/wl2_merged_{1x,2x}_MAIN_MERGED.jpg, wl2_merged_contour_T1dpr{1_x5,2_x4}_*.jpg,
wl2_merged_T1dpr2_MAIN_left_MERGED_right_halfspeed.mp4 (1408x228, 120 frames, 30 fps; looked at frame 100). All looked at.
## 20:40-20:56 FAIR, six paths, lane vs its own 16-sample 2x GT (fair/fair_W.txt): slow 31/217, medium 57/701, fast 43/555, diag 31/452,
reverse 77/1217, leave 44/476 = wl2g's numbers exactly; MAIN (own GT) 41/293, 73/910, 63/748, 39/527, 103/1427, 52/645: all below MAIN. PASS.
## 20:56-21:00 perf top-up, STRICT, 4 valid / 4 (perf/sweep2.txt): ratios 1.052, 1.047, 1.046, 0.985 (A 19.1 / 19.1 / 19.5 / 20.2).
9 clean pairs (batch 1 pairs 3-7 + batch 2): paired median 1.035, mean 1.026; all 12 pairs: median 1.025. A is bimodal (low 19.1-19.5
x4, high median 20.2 x8); B 19.9-21.5 (median 20.4), never in A's low mode. Inside the high mode ~+1 %; the A-low-mode pairs +4.6 to
+6.2 %. Gate <= +5 % paired median: PASS, thin margin.
## 21:01 VERDICT ok = false: THE BAR (2) left box fails (pre-existing, every build). Open: WL2G-J1 major (real-loop left water at T1
DPR 2, from p4wl's band), WL2G-J3 minor, WL2G-J4 nit, job B not built (wl2b left out). Lab :5167 left running. HANDOFF: LANES/wl2/HANDOFF.md.
## 21:30-22:27 FIXER (final judge WL2-FJ1..5): see fix/LOG.md and the FIXER section of LANES/wl2/HANDOFF.md. FJ1 fixed at its root cause
   (WL2FJ: P4WL_BAND's share from a band-limited bump, ?wl2fj=0 off): T1 DPR 2 real loop left water 532-538 -> 373-386 vs MAIN 331-339
   (equal dt bands -9 % to +10 %), T1 DPR 1 -10 %. Price: stepped far box +7 % vs :5163 (BAR (2) far item fails), far real-loop gain gone.
   Gates: ident 10 / 10 IDENTICAL, tsc 0 / 0, perf +1.5 % (9 / 9 STRICT), FAIR fast / reverse < MAIN. FJ2 / FJ3 / FJ4 / FJ5 open with options.
