import json
W = "/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/rejudge_p4ice"
I = W + "/img/"
A = W + "/ana/"
v = {
 "pass": False,
 "scores": [
  {"lens": "ice_material", "main": 6.5, "lane": 7.5},
  {"lens": "awwwards_jury", "main": 7.6, "lane": 8.0},
  {"lens": "composition_motion", "main": 8.6, "lane": 8.8},
  {"lens": "glitch_hold_sweep", "main": 8.0, "lane": 8.6},
 ],
 "findings": [
  {"id": "R1", "severity": "minor",
   "title": "Side effect of the F2 fix: at rest (q00, q03) the joint seams are now fainter than MAIN's and far fainter than the reference's dark straps",
   "evidence": ("The V profile peaks at one pixel, and its depth is 0.8, so at face-on rest views the seam nearly disappears. q00 row385 band-end minima (icem): left: fix L188, MAIN 163, r1 150, F000 129. Right: fix 144, MAIN 132, r1 133, F000 99. "
                "q00 left end, rows 365-395 averaged: F000 has a crisp ~10 px dark slit down to 139 from a ~220 field; the fix has a soft V to 181. q03 bottom strap, column x635 y468-512: F045 has a ~6 px V to 139; the fix has a V to 179 followed by a 207 bright line; MAIN has a plateau at 123-126; r1 157-164. "
                "q03 top-right strap, column x815: F045's floor is 123-131; the fix's is 143-148; r1 105-142. Images: " + I + "r_q00_ends4x.png, " + I + "r_q00_endR4x.png, " + I + "r_q03_straps.png, " + I + "r_q03_bot.png (all MAIN | r1 | fix | REF). "
                "At 1x (" + I + "r_q03_hero.png, " + I + "r_q00_hero.png), F045's two dark straps and F000's left-end slit read clearly, and the fix shows only faint seams. The fix is right in the loop poses: q01 x805 reads 200 212 207 194 186 188 197 202 against F015's 207 213 208 190 171 181 195 201 (" + I + "r_q01_joint.png)."),
   "repro": "BPY python -I " + W + "/tools/rowavg.py 365 395 566 606 1 <q00_rest.png of MAIN r11_1, p4ice qc_final, p4ice qc_fix> REF/ref_F000.png; then prof.py v 635 468 512 and v 815 205 260 on q03_eye.png of the same sets and on loop_F045.png. icem.py prints the row385 minima.",
   "suggested_fix": "Keep the no-hard-edge property, but give the face-on case a core. Option 1: a trapezoid instead of a tent, crossK = uP4J.y * smoothstep(0.0, 0.5, vK). Option 2: the depth grows as the view turns face-on to the cut plane, so it is thin at F015's oblique view and a strap at F045's face-on view. Targets: q00 row385 left min <= 150 and right min <= 120; q03 bottom strap min ~140-150; q01 x805 stays a 2-3 px V with the bright line."},
  {"id": "F3", "severity": "minor",
   "title": "Still open: the q03 outer-ring steel band is lighter than MAIN and F045, and the white ovals are still there",
   "evidence": "No change in the fix round. Box x800-830 y260-350: fix L191.1, r1 191.4, MAIN 182.9, F045 174.3 (179.5 with F045's shard pixels masked; " + A + "shard_masked_boxes.txt). x790-840 y230-330: 180.1 vs MAIN 171.7 vs F045 165.2. x820-860 y300-380: 173.1 vs 172.6 vs 157.0 (" + A + "boxes_rejudge.txt). In " + I + "r_q03_hero.png the white ovals are still in the dark band. The fixer showed they do not come from the frosted look-through term.",
   "repro": "BPY python -I " + W + "/tools/fx_boxes.py MAIN=SP/p3/r11_1 r1=SP/work_p4/p4ice/qc_final fix=SP/work_p4/p4ice/qc_fix",
   "suggested_fix": "Follow the fixer's diagnostic first: uR11Dbg 1 on q03, to check whether the ovals are non-TIR exit windows. Then use a view-gated critical-angle widening (smoothstep on abs(dot(V, ea))) or a lower transmitted gain only where the view runs along the ring. q00's band face is now within 1.4 L of F000 with shards masked (194.0 vs 192.6) and must not move."},
  {"id": "F5", "severity": "minor",
   "title": "Still open: the band faces and the p04 log read as smooth frosted plastic (no scrape grain, no crisp TIR lines), and the cut caps are flat matte discs",
   "evidence": "p04 log x680-880 y330-390: fix L219.0 sd 20.2 lap 3.0, F358 200.4 / 22.3 / 4.1, MAIN 218.6 / 20.7 / 4.3. It is lighter than F358 and has less fine detail than MAIN (" + I + "r_p04_hero.png: MAIN | r1 | fix | F358). The hold seq frames (" + I + "r_seq_hold0.png) show the same smooth log. The q00 band face with shards masked: sd 15.1, lap 4.5 vs F000 11.4 / 3.8, so its tone is fine; the missing piece is F000's scrape-streak character.",
   "repro": "Same fx_boxes.py run as F3. Look at " + I + "r_p04_hero.png.",
   "suggested_fix": "These are design decisions, and the fixer documented them: a band-limited scrape grain (a weak rest share of Noise B's streaks, within the crawl gate) and a cellular chip / frost term on the cap plane with its own band limit."},
  {"id": "F4s", "severity": "minor",
   "title": "Still open: no refracted orb strip in the hold (F420's drama)",
   "evidence": "p06: 0 clipped px outside the orb (icem; F420 121). Lower strip x520-960 y470-530: fix L208.6 sd 24.9, F420 206.5 / 16.7, MAIN 201.7 / 18.9. In " + I + "r_p06_hero.png, F420 shows the orb through the band's upper part and crisp internal lines; ours is a frosted band below the orb. The crack-sheet part of F4 is fixed: the loop is deleted, and the judge's nit F7 (fwidth after continue) goes with it.",
   "repro": "BPY python -I " + W + "/tools/icem.py MAIN=SP/p3/r11_1/ fix=SP/work_p4/p4ice/qc_fix/ (p06 block)",
   "suggested_fix": "As the fixer says, this first needs the hold lane's framing (the band overlapping the orb's lower half). After that, a hold-scaled direct-path clamp."},
  {"id": "N1", "severity": "nit",
   "title": "Side effect of the hold ramp: the p06 sustain band is a little blotchier and more saturated than in round 1",
   "evidence": "icem p06 band x520-960 y410-530: sd 22.3 -> 25.6 (F420 20.4), lf 20.2 -> 23.6 (17.3), sat 0.168 -> 0.187 (0.162). L 209.1 -> 203.2 (206.9) is fine. At 1x (" + I + "r_p06_band2x.png: MAIN | r1 | fix | F420) the right half's blue patches are slightly more defined than in r1. It is still far from MAIN's camouflage, and it reads as frosted ice.",
   "repro": "icem.py p06 block, as above.",
   "suggested_fix": "uP4H.z 2.5 -> 2.0 (the fixer's b2: x2 gave p06 205.6 / sat 0.179 and right-arc lap 6.2), or pull the hold chroma uP4E.w 0.92 -> ~0.86."},
  {"id": "N2", "severity": "nit",
   "title": "q02 joint: the V is still ~15 px wide and its bright line sits on the wrong side compared with F030",
   "evidence": "Row 375 x845-885 (" + I + "r_q02_end.png): fix 207 | 194 185 181 176 172 167 162 158 160 162 163 167 170 175 185, a line and then a 15 px V to 158 from a ~198 field (-20 %). F030: a ~10 px band at 164-168 from ~185 (-10 %) and then a 200-213 line. MAIN: a 10 px V to 146. The shape is better than r1's 138-153 plateau, so this is an improvement, not a regression.",
   "repro": "prof.py h 375 845 885 on q02_loop30.png of MAIN, r1 (qc_final), fix (qc_fix) and loop_F030.png.",
   "suggested_fix": "If R1's view-dependent depth is built, check that q02 lands at ~-10 % with a ~10 px width."},
  {"id": "F6", "severity": "nit",
   "title": "Isolated bright ice pixels at p04 still exceed MAIN's (a dotted grazing-edge line)",
   "evidence": "spark.py, ice-changed px: p04 bright 22 vs MAIN 6 (r1 37), along a diagonal edge at x749-777 y451-467. p05 is now 16+10 vs MAIN 37+25 (r1 65 total); p06 13+2 vs 13+6; q03 14+2 vs 28+2; q01 9+5 vs 15+20 (" + A + "sparkles_rejudge.txt). No visible change at 1x.",
   "repro": "BPY python -I " + W + "/tools/spark.py SP/p3/r11_1 SP/work_p4/p4ice/qc_fix",
   "suggested_fix": "As before: define the inner rim line's band in pixel units (fwidth of dot(Ng, V)) so it never gets thinner than ~1.5 px."},
 ],
 "regressions": ("Hunted on the latest set (qc_fix, shot 02:20-02:26 on the final build 02:19:50; the lane file is unchanged since 02:19, and the patch sha 8bd774c6... applied to aa7 reproduces it byte for byte). Compared with MAIN (p3/r11_1), r1 (qc_final) and REF at q00-q03 and p04-p08, and in the sweep and pointer captures. "
   "Worse than before: (1) R1, the rest-pose joints (q00, q03) are fainter than MAIN and the reference. This is a direct side effect of the F2 V profile. (2) N1, the p06 band is slightly blotchier and more saturated, from the hold ramp. Nothing else reads worse at 1x. "
   "Corrections to the previous numbers: shards inflate several rest boxes. With shard pixels masked (" + A + "shard_masked_boxes.txt): q00 bandR is fix 194.0 / sd 15.1 / lap 4.5 vs F000 192.6 / 11.4 / 3.8 (unmasked lap 8.0 came from a shard). q01 innerBand is unchanged r1 to fix (211.8 / 12.9 -> 212.1 / 12.8). Ring D in q03 is sd 8.6 (r1) and 11.2 (fix), not 16.6, vs F045 17.3 and MAIN 1.9, and its L is 232.5 vs F045 223.7 (MAIN 226.1). So the ring D structure gain is real but about half of what the round-1 verdict reported, and ring D is ~9 L too light. "
   "Crawl, re-measured by me: 10 consecutive 60 fps frames per sequence with the RAF loop stopped, temporal 2nd difference on ice pixels (" + A + "flicker_rejudge.txt). MAIN reproduces the round-1 judge's numbers within 0.03. Hold: 6.40 -> 4.59 (r1 5.20), and the share of pixels above 8 levels is 28.6 -> 18.0 % (r1 21.3). Sustain: 6.89 -> 4.25 (r1 5.74), 32.4 -> 17.0 %, p99 30.0 -> 21.5. Idle eye: 19.26 -> 18.12, p99 47.0 -> 47.9 (r1's 51.8 rise is gone). Rest: 20.62 -> 19.43. In " + I + "r_seq_hold_zoom.png (4 consecutive frames plus a d2 map, MAIN on top), MAIN's speckled isolines boil on the arc and the lane's arc is smooth; no new crawl anywhere. "
   "Switch, re-proved by me (" + A + "ident_rejudge.txt, identS 20 moving frames): T1 ?p4ice=0, T2 ?p4ice=0, T0 (lane default) and ?envlake=plate&p4ice=0 are all IDENTICAL to :5197 (final image, 6 / 2 targets, 16 / 12 programs, 0 console messages). Negative control: the T1 lane default differs only in reflection, final and the rx-ice program. "
   "Perf, re-run by me (" + W + "/perf/ab_rejudge.json, rc2 interleaved, SLOT_BG=0, T1 scale 1, quiet after 249 s): MOVE has 6 pairs at load 3.9-5.9: 1.019 1.037 1.023 1.037 1.004 1.018, median 1.021 (+2.1 %, +0.45 ms), the same as the builder and fixer. REST has 3 pairs at load 6.5-7.4, with the still-camera TAA engaged on both pages: 0.958 1.065 1.043, median 1.043 (+0.8 ms). That is under the 5 % budget and agrees with the fixer's 1.042, but it is above r1's 1.008 / 1.027, with less margin. "
   "Sweep: the frames differ in phase between runs, so I judged them by character only. There are no new artefacts. Joints show as thin seams with a bright line (" + I + "r_sweep_rel.png). The grain in the orb at pop is in MAIN too (" + I + "r_sweep_pop_orb.png)."),
 "visual_verdict": ("The fix round did what it set out to do in the hold, and the lane is still the right base. "
   "The hold is cleaner: p05's arcs lost the agate / TIR outlines and the dotted ring by the cut end (" + I + "r_p05_rightarc.png, " + I + "r_p05_toparc.png). The right-arc Laplacian is 11.1 MAIN -> 8.1 r1 -> 6.8 fix (F402 2.9), and the top arc is 7.1 -> 6.5 -> 4.5. Hold crawl fell 28 % and sustain crawl 38 % against MAIN. The joints in the loop poses now read like the reference's thin seams with a bright edge line (q01 matches F015 closely) instead of painted collars. The invisible crack loop and its undefined-derivative nit are gone. "
   "The new problem is at rest. The tent-shaped V peaks at a single pixel, so in the face-on rest views (q00's band ends, q03's two straps) the joints almost vanish. They are now fainter than MAIN's, while F000 and F045 show crisp dark slits and straps there. That is the most-seen frame of the hero. "
   "Still short of the reference, and unchanged by this round: band faces and logs are smooth frosted plastic with no scrape grain; cut caps are flat discs; q03's outer steel band is too light and has white ovals; the hold has no refracted orb strip. "
   "No blocker, and the switch and perf are clean. Minor items are open (R1 new; F3, F5 and F4s carried over), so pass is false."),
 "report_path": W + "/verdict_rejudge_p4ice.json",
}
json.dump(v, open(W + "/verdict_rejudge_p4ice.json", "w"), indent=1)
print("ok", len(json.dumps(v)))
