# wl2b LOG (job B = WL-J2: far columns + slab-foot lips)
## 22 Nov 18:13 start. Lane = clone of p4wl, lab :5166. No earlier LOG.
## 18:15-18:28 build: WL2B_BAND (sig.y x K on the faces' share, read + quarter pass, lake beyond 25-35 m), WL2B_LIPS (bisected bilinear face distance), breaks via own lake_chop sampler.
   rest T1 cols vs REF (len med / exc20): REF 82/22.3, p4wl 53/16.2; K1.8@40-60m no change (slabs at ~53 m, cols 30-53 m); K3 all 72/21.9;
   breaks g2.5-5 T60: coarse bars (FAIL look); T10 g1.5-3: 1-px scanlines; K2.6 no breaks 60/21.2 = cleanest. DEFAULT K2.6 D25-35, breaks opt-in ?wl2bg.
## 18:33 ident (K2.6 build): ?wl2b=0 == :5163 and ?p4wl=0 == :5162 IDENTICAL at T1, T2, T0, p04/p06/p07; lane T0 == :5163; control lane T1 differs.
   stepped fast T1 DPR2 blips/frame (thr 12) p4wl | lane K2.6: left 43.5 | 60.1 (+38 pct!), shelf 245.9 | 245.8, far 1207.9 | 1208.9.
   Bisect: lip only 42.9, K only 61.0, K1.8 50.3, K1.4 42.4 (but K1.4 cols barely longer: len 50, exc20 18.4).
## 18:50 the left-box rise is the walk's face cap (hits > 3.5): with sig.y x K more faces pass share 0.002, the 4th stops the walk short
   of the taller faces -> stored horizon jumps tap to tap = pale holes in the far-left shelf reflection (look: bl/leftfar_frames.png).
   Correct rows (buffer 537-800) stepped fast T1 DPR2 blips/frame left | shelf | far: p4wl 1292 | 312.0 | 1372.6; K2.6 cap3.5 1414 | 312.4 | 1457.5;
   K2.6 cap7.5 1049.5 | 311.8 | 1457.8; K2.0 cap7.5 980.6 | 310.4 | 1435.3; K1 cap7.5 (+lip) 884.7 | - | 1370.0; lip: ~0 effect.
   DEFAULT now K2.6 + cap 7.5 + lip. Far +6 pct vs p4wl = the longer tails; check vs own GT next.
## 19:05 vs own 2x GT (lkmeach=1), stepped fast T1 DPR2, blips seq / GT / excess, pops vs GT: left p4wl 1292/705/587, 9220 -> lane 1050/597/452, 8021;
   shelf 312.0/303.9/8.1, 274 -> 311.8/306.0/5.8, 246; far 1372.6/1338.9/33.7, 5307 -> 1457.8/1368.9/88.9, 6319 (FAR WORSE: +6 pct blips, +19 pct pops).
   Next: perf A/B 8 pairs vs :5162, final ident, deliverables. Far box open.
## 18:57 final ident (cap 7.5 build): ?wl2b=0 == :5163, ?p4wl=0 == :5162 IDENTICAL T1 / T2 / T0 / p04 / p06 / p07; lane T0 == :5163 (idf/).
   client mp4 MAIN | lane (medium path, T1 DPR 2, far slabs) + motion strip; perf sweep running but pairs invalid (load 12-32 from
   wl2g / wl2f FAIR GT jobs).
## 19:03 DECISION: K back to 1 by default (OPT-IN ?wl2bk=2.6). Look check (notch.png, T2 rest 5x: REF | MAIN | lane K2.6 | K2.6 no lip |
   K1): the longer tails show the stored horizon's quarter-texel stair steps under the slab ends (a NEW notch, the client's word);
   K1 (cap 8 + lip) = MAIN's look there. With far box +6 pct as well, K2.6 waits for the RJ1 winner. Default = cap 8 + lip.
   Perf + sparkle runs killed (load 30-198: Photoshop + other lanes' FAIR GTs); rerun on the final default.
## 19:12 FINAL DEFAULT (K1, cap 8, lip): ident all IDENTICAL again (idf/). Stepped fast T1 DPR2 vs own 2x GT (bl/gt_fast_T1d2_final.txt):
   left blips 1292 -> 885 (excess 587 -> 320, pops vs GT 9220 -> 7066), shelf 312.0 -> 308.6 (excess 8.1 -> 5.7, pops 274 -> 219),
   far 1372.6 -> 1370.0 (excess 33.7 -> 32.1, pops 5307 -> 5233). Rest cols = p4wl (53 / 16.1). Perf sweep started (load 7).
## 19:31 perf (final default) A :5162 | B :5166 T1 sweep: 3 pairs in 18 min, ALL invalid (other lanes' perf / FAIR GT jobs, load):
   21.7 | 23.8, 20.9 | 21.8, 21.1 | 21.1 -> indicative paired median 1.043. Stopped for the sparkle test. NOT a valid gate result.
## 19:34 60 fps sparkle (rest T1 far clip, vs own DPR-2 GT): farwater p4wl 1.9 | lane 1.8, lips 1.1 | 1.2 (GT 0): equal.
## 19:35 END. ok = false: job B not met by default (K2.6 opt-in: notch + far +6 pct until the RJ1 fix), perf gate unmeasured (no
   valid pair), FAIR six paths not run. Default = cap 8 + lip: left -32 pct blips, shelf / far not worse, ident clean. Lab :5166 up.
## 19:37 deleted analysed GT / video capture sets (numbers kept in bl/*.txt). WORK 0.2 GB.
