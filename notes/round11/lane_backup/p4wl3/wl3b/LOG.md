# wl3b LOG (round-3 water, job B: far columns + slab-foot lips), BUILDER
## 22 Nov 22:53 start (time box 100 min -> ~00:33). Fresh (no earlier attempt). Read briefs p4r4 / p4pri2, args p4wl / p4wl2 / p4wl3 (common + lanes.wl3b.build), judge_wl2b LOG, wl2b HANDOFF, wl2 HANDOFF.
## 23 Nov 03:49 RESUME (cut-off attempt 22:53-23:00 left code in Water.ts: WL3B_COLS K 2.6 at 25-35 m, WL3B_CAP (off), WL3B_LIP bisection; lab :5168 = that code). New time box -> ~05:30.
- 04:00 rest T1 cols.py (x 900-1440, ya 498, thr 6) len med / exc20: REF 82 / 22.3 | MAIN 50 / 16.2 | wl2 47 / 16.8 | lane(K2.6+lip) 57 / 21.6 | K1+lip 48 / 17.1.
  colmatch sum excess rows 510-585: REF 77.6 | MAIN 6.7 | wl2 15.9 | lane 70.0 (ratio 0.90); x~1208 column MAIN 7.8 | wl2 9.5 | lane 12.7 (not dimmer).
- 04:03 breaks (tools/brk.py: vertical high-pass std inside the columns, rows 505-585): REF 2.55 (period ~9 px) | MAIN 4.23 (2.8 px) | wl2 4.51 | lane 4.30 (4.1 px):
  our columns are already broken by ripples MORE than REF (finer period = the lake's own bump, shared with ripple A). Decision: no extra break term (would add contrast REF does not have).
- 03:55 code: wl3b block moved into wl3bApply() (+ the lab's ?wlwalk=px path gets the lane too, for a consistent per-pixel GT); cap rule by camera distance t (lab ?wl3bcapw=1: by d).
- 03:56 stepped fast T1 DPR 2 (40 fr, CSS rows 420-620), one-frame blips thr 12, wl2 | K2.6+lip | lip only (K1) | wl3bk=1&wl3blip=0:
  left 1648 | 1869 | 1618 | 1648 (== wl2 exactly); far 1006 | 1073 | 1003 | 1006; lips 176 | 182 | 176 | 176; cols 167 | 230 | 165 | 167.
  -> the lip edit is blip-neutral (slightly lower); K raises blips (left +13 %). LOOK (img/left_f18-21_M_B_L1_2x.png): with K pale holes pop in the far-left
  shelf reflection = wl2b's 'early stop' (the wider spread lets small faces use up the 4 hits). Rest: K3 / K3.5 same length (57), excess sum ratio 0.99 / 1.08.
- 04:03 cap variants with K2.6: cap 8 everywhere | 8 for d<10 | d<20 | t<40: left 1620 | 1869 | 1868 | 1718; far 1070 | 1073 | 1074 | 1070;
  x~1208 column 12.0 | 12.7 | 12.7 | 12.0 (REF 10.4, wl2 9.5, MAIN 7.8: NOT dimmed with K). LOOK img/left_f18-21_B_L1_C8_2x.png: cap 8 = clean dark shelf
  reflection, no holes (cleaner than wl2's top-edge specks). DECISION: default K 2.6 + cap 8 (all lake points) + lip; ?wl3bcap=0 = cap 4.
- 04:05 FINAL BUILD (lab restarted 04:03:46). Gate chain started (chain.sh: ident, stepped finals + GT, rest, s60, real loops, perf 10 pairs, FAIR 6 paths).
- 04:11 ident (id/ident_summary.txt): ?wl3b=0 == :5167 IDENTICAL at T1, T2, T0 phone, p04 expand 0.9, p06 expand 2.97, p07 release 0.33; ?p4wl=0 == :5162 IDENTICAL at all six; lane ON T0 == :5167 == :5162 (phones unchanged); control lane ON T1 differs (walk, main, ...). logs 0.
- 04:15-04:28 stepped finals (st_final_d2_n40.txt, fast T1 DPR 2, 40 fr) MAIN | wl2 | lane | GT(lkmeach 2x) | GTpx: left 1830 | 1648 | 1620 | 963 | 973;
  shelf 335 | 334 | 332 | 325; far 1031 | 1006 | 1070 | 913 | 1099; lips 178 | 176 | 182 | 175 | 184; cols 190 | 167 | 227 | 73 | 250.
  rest cols (final): T1 len 57 / exc 21.6 (REF 82 / 22.3, MAIN 50 / 16.2), T2 58 / 17.3 (MAIN 57 / 15.0); colmatch ratio 0.90 (MAIN 0.09, wl2 0.21); x1208 12.0.
  s60 at rest (40 fr 1/60 s, T1 DPR 2) M | wl2 | lane: left 15.4 | 15.2 | 15.8, far 389 | 389 | 389, lips 2.6 | 2.7 | 3.0, cols 0.1 | 0.2 | 0.1.
  LOOK: a thin bright wavy vertical streak rises from the near floe tip at CSS x ~1256, y 530-575 (frames 37-43 of the fast path): present in wl2 too, a
  little brighter in the lane; MAIN only a faint ghost (img/streak_1260_f37-43_M_B_L_3x.png). Inherited from wl2 (not root-caused here).
- 04:28 REAL LOOP T1 DPR 2 (rl_left_T1d2.txt), left water CSS 0-160 blips/frame, dt 28-34: MAIN 769 (n 160) | lane 1071 (n 135) | wl2 896 (n 184);
  dt 30-36: 719 | 1287 | 916. T1 DPR 1 dt 20-26: MAIN 240 | lane 491. T2 dt 28-34: 714 | 1299. Lip band (rl_lips_T1d2.txt) dt 28-34: M 571 | L 616 | wl2 560.
  => THE BAR (1) FAILS badly with the default (K widens the share's transition band, where the moving ripples flip it between real frames;
  wl2 itself is +17 % here). Stopped the chain after the running perf (FAIR on this build would be wasted).
- 04:35 opt-in SHIFT mode (?wl3bm=s, WL3B_SH): lengthen the columns by shifting the share (mu lowered by (K-1) x SH spreads) instead of widening it.
- 04:31 killed my own perf run (superseded build; 1 pair in 3 min: wl3a's FAIR jobs held slots = invalid pairs).
- 04:32 shift mode at rest: SH 0.7 / 1.0 / 1.3: len 59 / 62 / 63 but exc20 50 / 64 / 75 (REF 22.3), water median 173 / 169 / 164 (MAIN 183): far too bright
  and it darkens the whole lake (the share's horizon includes the far shore). Rejected; code removed again (04:43).
- 04:36-04:43 REAL-LOOP BISECTION, T1 DPR 2, left water CSS 0-160, blips/frame (rl_x / rl_z / rl_c *.txt), dt 28-34:
  MAIN 723 / 672 | wl2 837 / 779 | lane (K + cap8 + lip) 1164 | no K (cap8 + lip) 1123 | cap 4 (K + lip) 1159 | no lip (K + cap8) 1309 | shift 531 (other look).
  Control at dt 50 (machine loaded by wl3a FAIR): ?wl3b=0 on :5168 1607 == :5167 1584 (harness OK); lane 1989 (+25 %).
  => every pair of the three parts pops ~+35-60 % over wl2 in the real loop; no single part is the cause; the stepped harness shows none of it
  (stepped left box lane 1620 < wl2 1648). Not fixable inside the time box. DECISION: keep the default (K 2.6 + cap 8 + lip) so the judge sees
  the look; ok = false (THE BAR (1) fails; wl2 itself is +10-17 % over MAIN there). Switches give every part off.
- 04:44 FINAL BUILD = the 04:03 source again (Water.ts sha256 5f98cfae, shift code removed); lab restarted 04:43:58; chain2 (ident, stepped, rest,
  s60, FAIR six paths, real loops, perf 8 pairs) + post2 (client files) started.
- 04:44-05:15 FINAL GATES (chain2) on the final build: ident all IDENTICAL (6 x ?wl3b=0 vs :5167, 6 x ?p4wl=0 vs :5162, T0 ON == :5167 == :5162);
  FAIR six paths (events / px) fast 44/603, reverse 70/938, slow 10/80, medium 31/603, diag 30/386, leave 31/398 (all below MAIN); s60 equal;
  stepped = the 04:15 numbers byte-for-byte; real loop T1 DPR 2 left water dt 28-34 MAIN 636 | lane 1101 | wl2 725 (FAIL), lip band dt 26-40
  502 | 597 | 485 (FAIL); T1 DPR 1 dt 20-26 188 | 254; T2 dt 26-40 564 | 1090; perf 8 valid pairs paired median 1.065 (FAIL, +6.5 %).
- 05:16 VERDICT ok = false: complaint 2 delivered (columns REF-like: exc 21.6 vs REF 22.3, colmatch ratio 0.90), but THE BAR (1), (3) real-loop
  lips and (4) perf fail. HANDOFF written; lab :5168 left running (final build).
