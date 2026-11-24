# p4ice LOG

## 2026-11-20 23:46 WIB start
- lane cut from aa7 (cp -c -R), WORK=/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/p4ice, port 5175

- lab :5175 up (build ok 23:46). T0 = marchSteps 3 (r11 shader); T1 = 4, T2 = 8.
- Twin renders ($SP/work/ice/twin) are gone and lane_backup/ice_untracked.tgz holds only HANDOFF.md; Blender belongs to the
  env lane this round -> no twin re-render. Gates: reference frames + the plan's numbers (twin values quoted there).
- Design: every change behind an ICE_P4 define (T1+ only, marchSteps >= 4, so T0 stays MAIN), absent with ?p4ice=0 ->
  MAIN's program text exactly. Sub-switches (uniform-level, same program): ?iceaa=r11 (G5), ?icefrost=r11 (Q3),
  ?icecap=0 (Q6), ?orbice=r11 (Q4 ice part), ?icehold=r11 (Q10).

## 2026-11-20 23:55 - 21 Nov 00:19 build + batches (tools/capv.mjs: shoot_qc poses, live uniform configs; tools/icem.py: panel boxes)
- patch1 (tools/patch1.py): every change behind #ifdef ICE_P4 (T1+). G5: fwA 4 px + 0.02, octave fade 0.15 c/px (gone at 0.3),
  values band-limited, trace finest octave 3 px. Q3: roughness 0.45-0.9, uR11D.z 0.5, uR11E.w 0.6, Noise A in ring coordinates
  stretched 4x (periodic lattice in theta, no seam). Q4: direct paths (b <= 1, impact < 0.45-0.75 R) clamp x2.2, lobe floor
  0.008, variation, periwinkle hue, hold gain 1.4. Q6: cut caps from their own plane (sEnt 0, planar Nmac, no facet tilt),
  4 % chamfer, cap glint, joints 0.6 deep / 5 mm. Q10: hold lobe growth 1.2, one-bounce dc x0.7, hold gain / chroma, rim orb
  share tinted, steel-blue inner line, 2 crack discs per ring, blue cast.
- cap1 (lane vs the panel's MAIN set, cross-session): q00 band over the orb L232 vs REF 231.8 (MAIN ~196), row385 bars L131 /
  121 (REF 129 / 99, MAIN 163 / 132); p06 band L208.6 / sat 0.151 (REF 206.9 / 0.162, MAIN 196.9 / 0.200). BUT q03 outer ring
  L198 sd 13.6 lf 10.4 vs REF 174 / 30.8 / 23.5 (MAIN 183 / 27 / 20): the 0.45 roughness floor also widened the trace's lobe /
  critical-angle ramp and erased F045's dark steel-blue band along the ring.
- patch2: the trace gets its own roughness ramp uP4H (rb, lobe growth); only the frost terms keep the compressed ramp.
- b2 (7 configs, same session incl. a MAIN-equivalent 'm'): t1 (trace ramp 0.233-1) q03 outer ring 179.5 / 33.0 / 24.1 (REF
  174.3 / 30.8 / 23.5); q01 big ring is NOT darker than MAIN (205-209 vs m 207.8; cap1's -20 was cross-session shards);
  clamp x2.2 overshoots (q03 ring D 233-238 vs REF 224; q00 over orb 239 vs 232); aa2 (fade 0.1 c/px, 4 px) no gain.
- patch3: direct paths keep more of the orb's sharp sample (uP4G.z 0.15 instead of uR11F.x 0.3).
- b3 + crawl (tools/crawl.py: rings stepped 1/60 s, everything else frozen, 6 frames x tau 0.4 / 1.5 / 2.9, min over +-2 px
  shifts of |L1 - L0| on changed pixels): m 1.547 / 1.475 / 1.476; e0 (trace hi 0.85) 1.420 / 1.292 / 1.766; e1 (+ plan G5
  step 3: N.x 3, J.y 4, K.y 2.5) 1.707 / 1.359 / 1.840 -> REJECTED; e2 (trace hi 1.0, clamp 1.6) 1.465 / 1.316 / 1.525.
  e2: q00 bandR 192.8 (REF 192.6), q03 ring D sd 14.3 (REF 17.3, m 8.7), p06 band 210.9 / sat 0.150 (REF 206.9 / 0.162).
  p06 caps: flat octagonal cut faces with a crisp edge (img/z_p06_caps.png) vs MAIN's domed ends.
- patch4 = defaults from e2: uP4H (0.233, 1), clamp 1.6, hue x2, hold gain 0.98 / chroma 0.92, rim line 1.3.

## 00:14-00:19 identity (tools/identS.mjs from AA8 polish, 20 moving frames; ana/ident_final.txt)
- First run: targets + final IDENTICAL but the rx-ice program text differed (the #ifdef ICE_P4 blocks were in the source).
  Fix: stripP4() removes the ICE_P4 blocks (keeps their #else parts) when the lane is off / on T0; checked offline that the
  stripped ICE_FRAG == aa7's text byte for byte (one stray blank line fixed first).
- Rerun: T1 ?p4ice=0, T2 ?p4ice=0, ?envlake=plate&p4ice=0, T0 (lane default) vs :5197: IDENTICAL (final, all 6 / 2 targets,
  all 16 / 12 programs, 0 console messages). Lane default vs :5197: rx-ice program, reflection and final differ only.

## 00:20-00:29 scrape streaks, cast, gain (batches b4 / b5), final defaults, final identity
- patch5: Noise B (fine bump) in ring coordinates stretched 8x (uP4I.x; p4FbmRing got a gain parameter). Crawl b4 (m / d /
  s0 / s16 / nc = MAIN-equivalent / default / no streaks / 16x / no cracks): 1.609/1.478/1.648 | 1.498/1.292/1.655 |
  1.453/1.401/1.553 | 1.492/1.329/1.293 | 1.480/1.416/1.579 -> lane <= MAIN-equivalent at every tau except t2.9 (+0.4 %).
- q00 face between the bars (shard-free box x760-830 y365-400): lane L211-215 sd 11.6-13.2 vs F000 209.3 / 15.0 (MAIN's band
  was the sd 23 camouflage); but B-G +18-21 vs F000 +24, q02 centre B-G +22.8 vs F030 +29.3.
- b5: cast x3 + transmitted gain 0.92 (c3g): q03 ring D L226.6 / sd 16.2 / B-G +16 (F045 223.7 / 17.3 / +14), q01 inner band
  L209 / B-G +21 (F015 206.5 / +22), q03 outer ring B-G +32 (F045 +33), p06 band 206.4 (F420 206.9). -> defaults.
- Cracks are not visible at q02 / q03 (img/c4_q02_crack.png: on vs off look the same; the hash-placed discs fall elsewhere).
- tsc hero + app clean (00:24). Final identity (00:25, ana/ident_final.txt): T1 / T2 ?p4ice=0, ?envlake=plate&p4ice=0, T0 vs
  :5197 IDENTICAL (final, all targets, all programs, 0 console messages); lane default T1 / T2: rx-ice, reflection, final only.

## 00:27-00:30 perf A/B run 1 (tools/rc2.mjs = AA8's rtxu copy; perf/ab_run1.json; SLOT_BG=0, waitq quiet at load 4.4)
- MOVE 8 pairs: paired median ratio 1.021, per-pair median-interval diff median +0.475 ms (lane 23.5 vs main 22.9 ms median);
  REST 4 pairs: 1.006 (+0.1 ms). BUT other lanes raised the load to 11-13 from pair 5 on: pairs < 10 load = 4 (1.054, 1.002,
  2.058 = a throttle transition, 1.024). Not enough pairs for the rule -> rerun after the capture set.

## 00:30-00:41 final capture set (qc_r11.zsh -> WORK/qc_final; 0 console errors / warnings in shoot_qc, ptr, sweep)
Final vs MAIN's panel set ($SP/p3/r11_1) vs REF (ana/final_icem.txt, tools/icem.py = the panel's boxes):
- q00 band right: L190.8 / sd18.8 / lap 4.1 / dog 4.4 (MAIN 190.0 / 23.0 / 8.6 / 9.0; F000 192.6 / 11.4 / 3.8 / 3.9).
- q00 band over the orb L231.1 vs beside 198.6 = +32.5 (F000 231.8 / 196.1 = +35.7; MAIN 195.9 with a shard, panel +11..16).
- q00 beside the orb sd 7.8 (MAIN 18.2, F000 9.0); upper rings 216.6 (217.0); face x760-830 L210.4 B-G +23.6 (209.3 / +24.0).
- q00 row 385 bars: left L150 @574, right L133 @862 (F000 129 @584, 99 @879; MAIN 163 @570, 132 @890).
- q00 lower arcs: L188.1 sd18.2 lap 13.2 dog 6.9 (MAIN 187.0 / 18.4 / 12.5 / 7.2; F000 189.7 / 11.5 / 3.7 / 4.5): unchanged -
  the box holds silhouette steps and the lake's streaks (img/z_q00_low.png), the same in MAIN.
- q01 inner band 186,211,234 B-G +23 (F015 188,209,232 +22; MAIN 189,218,230 +12). Big ring 205.8 (MAIN 208.3, REF 215.3).
- q02 centre L206.1 B-G +24 lap 7.4 (MAIN 205.0 / +18 / 10.0; F030 193.9 / +30 / 6.6).
- q03 ring D L228.8 sd16.6 B-G +13 (F045 223.7 / 17.3 / +14; MAIN 226.1 / 1.9 / +4).
- q03 outer ring L191.4 sd25.3 lf20.0 B-G +28 lap 10.5 (MAIN 182.9 / 27.2 / 20.3 / +26 / 13.8; F045 174.3 / 30.8 / 23.5 / +33 / 6.4):
  lighter than MAIN (worse in L), less pixel energy.
- p05 right arc sd27.5 lap 8.1 (MAIN 32.9 / 11.5; F402 23.3 / 2.9). img/final/p05_rightarc.png: MAIN's topographic isolines
  mostly gone, softer TIR-zone outlines remain; img/final/sw_hold_T.png: MAIN's dotted isolines gone.
- p06 band L209.1 sat 0.168 (MAIN 196.9 / 0.200; F420 206.9 / 0.162); lower strip 214.2 sd21.9 (F420 206.5 / 16.7);
  clipped px outside the orb 0 (F420 121 in this box): no clipped refracted orb strip.
- Isolated sparkles (> 25 lv over all 8 neighbours, hero region, batch frames): q03 29 -> 9-15, p06 6 -> 1-2, q00 4 -> 6;
  references 0.
- region_stats_q00 (environment boxes): within 1-2 levels of MAIN's (no ice in those boxes).

## 00:41-00:49 perf run 2 (perf/ab_run2.json): VOID - the quiet wait timed out (p4env / another lane's ptr holding slots),
every pair at load 15-24, frames throttled to 42-44 ms, ratios 0.52-1.75. Run 3 waits outside the slot (load < 7).

## 00:49-01:03 perf run 3 (perf/ab_run3.json): quiet wait outside the slot took 706 s (load 4.9 at 01:01), 10 move + 4 rest
- MOVE: all 10 pairs at load 6.3-7.5 (< 10): paired median 0.991, p95 median 0.998, median-interval diff median -0.4 ms. BUT
  the block medians swing 22 -> 64 ms in both pages (another lane's headless Chrome started mid-run: GPU contention the CPU
  load does not show); ratios 0.59-1.40 per pair: cannot resolve +-5 %.
- REST: 4 pairs (load < 10): 1.075 (+3.4 ms), same contamination (block medians 37-58 ms).
- Run 4 queued: 6 move + 2 rest pairs, starts only with no other slot holder (judge_p4orb perf was running at 01:03).

## 01:03-01:07 perf run 4 (perf/ab_run4.json): 6 move + 2 rest, started at load 4.4 with no other holder; load rose to 13 mid-run
- MOVE unthrottled pairs (both pages at 22.5-23.2 ms): 0.994 / 1.004 / 1.027 / 1.013; pair 1 both throttled (1.042), pair 2 a
  throttle transition (0.513, void). REST 0.922 / 1.015.
- Pooled unthrottled pairs, runs 1 + 4 (9 pairs): 1.024 1.020 1.022 1.018 1.000 0.994 1.004 1.027 1.013 -> median 1.018
  (+1.8 %, ~+0.4 ms at 22.7 ms), range -0.6 .. +2.7 %; REST pooled (6 pairs) median 1.005. Under the 5 % budget, but only 1
  of these 9 pairs ran at load < 10 (the rule wants >= 6): not a clean pass on this shared machine. Run 5 queued.

## 01:09-01:16 perf run 5 (perf/ab_run5.json) - THE QUALIFYING RUN
- Quiet wait 459 s (load 6.4, no other holder), 6 move + 2 rest pairs, every block at load 5.95-6.98 and unthrottled (lane
  21.9-23.1 ms, main 21.3-22.5 ms). MOVE paired ratios 1.028 1.014 1.027 1.000 1.032 1.016 -> median 1.022 (+2.2 %),
  median-interval diff per pair +0.6 +0.3 +0.6 0 +0.7 +0.35 ms (median +0.475). REST 1.008 / 1.027 (+0.15 / +0.5 ms).
  -> under the 5 % budget, rule met (>= 6 pairs, load < 10, SLOT_BG=0, interleaved AB / BA).

## 01:17 end state
- Lab :5175 running (final build 00:24:34), lane LANES/p4ice, HANDOFF.md written, patch WORK/p4ice_vs_aa7.patch, all mirrored to
  MAIN/notes/round11/lane_backup/p4r1/p4ice/ (LOG, HANDOFF, patch, ana/, img/, perf/, tools/).

## 2026-11-21 01:49 WIB FIXER round (judge_p4ice findings F1-F5; time box 60 min)
- Lab :5175 now owned by the fixer. r1 lane file backed up as WORK/fix/IceMaterial.r1.ts. Reproduced F2 with the judge's
  prof.py (q01 x805: lane plateau 164-167 over 6 px; q02 row 375: 15 px plateau 138-153; F015 a 3 px V to 171, F030 a 10 px
  ~166 band then a bright 200-213 line) and looked at z_p05_*, z_q01_joints, z_q02_ends, z_q03_outerR4, p06 band crop.
- 01:56 patch6 (tools/patch6.py, all inside the ICE_P4 blocks): F2 joints V profile (new uP4J: x mode, y crossing share,
  z seam share, w far-wall bright line; uP4D.y = seam half width in px; derivatives of the entry / exit points taken in the
  joint block's uniform control flow), F3 frosted share x uP4G.w where little light left through the walls (wOut), F1
  critical-angle ramp x uP4H.z at full hold on every wall, F4 crack sheets DELETED (uP4F.z spare; also clears judge nit F7),
  F5 Noise B's own fade start uP4I.y and a frosted roughness floor on cut caps uP4I.z. New knobs start neutral (1 / 0).
- 02:00 patch7: the seam line is a surface line, not gated by the internal ray's TIR factor (own accumulator jSeam).
- b1 (01:57, capv, one session): r1-equivalent config reproduces qc_final's q01 / q02 joint profiles exactly. NOTE capv's
  hold poses are NOT comparable across configs in one session (ring orientation at p04-p06 depends on the state the previous
  config left: img b1_p05_full.png) -> hold configs now run one fresh page each, in shoot_qc's pose order (b2).
- b1 rest numbers (icem): q03 outerR d 187.0 / sd 27.9 / lf 21.9; uP4G.w 0.5 182.1 / 30.1 / 23.6; 0.2 168.4 / 34.2 / 24.9
  (F045 174.3 / 30.8 / 23.5) but 0.2 also darkens q00's band (bandR sd 24, besideOrb 186 / sd 28.5 vs F000 196 / 9).
- b2 (02:02-02:10; rest configs in one session + crawl seqs; hold configs one FRESH page each in shoot_qc's pose order;
  fresh 'd' reproduces qc_final at p05 / p06 to 0.1 L, so these are comparable with the judged set):
  * F1: p05 right arc lap / sd: d 8.7 / 28.7, uP4H.z 2 6.2 / 27.9, 3 5.6 / 27.0 (F402 2.9 / 23.3; MAIN 11.5 / 32.9); top arc
    lap 7.8 -> 5.6 (x2) / 4.6 (x3). img/b2_p05.png (d | x2 | x3 | F402): the agate outlines are gone at x2 / x3, smooth
    frosted arcs like F402. p06 band 208.6 -> 205.6 (x2) / 202.3 (x3), F420 206.9; sat 0.169 -> 0.179 / 0.192 (F420 0.162).
    Rest poses unchanged (uHold 0). -> default x2.5.
  * F3: uP4G.w (frost share x in low-wOut zones) 0.4 / 0.35 / 0.2: the white ovals in q03's outer band stay
    (img/b2_q03outer.png); the box moves came from shards that differ between in-session configs (g02's box holds a shard)
    -> the ovals are not the frosted look-through: knob REMOVED (patch8). F3 stays open (options in HANDOFF).
  * F5: Noise B's own fade start 0.25 (vs 0.15): crawl d 1.504 / 1.120 / 1.586 vs 1.356 / 1.216 / 1.379 (noise level), but
    no visible grain (img/b2_q00band.png: d and nb25 look the same, F000's grain absent in both); frosted cap floor 0.85: the
    caps stay flat matte discs (img/b2_p06caps.png). Both knobs REMOVED (patch8). F5 stays open.
  * F4 strip: direct-path clamp x3 (c3) gives 543 clipped px as a bright patch at the band's top edge under the orb, not
    F420's strip, and lifts q00 over the orb to p95 246 / q03 ring D sd 25 at rest; orb-through x2.5 in the hold (cs) 436
    clipped px and the lower strip lighter (221.7). Not adopted; open with options.
- b3 (02:07, debug renders: seam only / far line only / interior only) located the lines: q01 the far-wall line is the
  collar's upper edge, the entry seam its lower edge; q02 the far line at x~856, the entry seam at x~869 (img/b3_dbg.png).
- patch8 (02:16): the joint shade is a V ACROSS the crossing band (1 - |2t - 1|, t = |se| / (|se| + |sx|): deepest where the
  plane is crossed midway, 0 at both ends, so no hard edge at any width) + a bright line uP4D.y = 1.25 px either side of
  where the plane meets the far wall. tsc hero 0 / app 0 (02:16).
- b4 / b5 (02:17-02:18) depth: q01 x805 v9 (0.9 / 0.5): 205 213 196 186 173 189 198 vs F015 207 213 208 190 171 181 195 (the
  bright line at y256 and the 3 px V to 173 at y259, both where F015 has them); q02 row 375 v7: V to 163 (F030's band
  164-168), v9 to 152. -> default uP4J = (1, 0.8, 0, 0.45). img/b5_joints.png.
- 02:20 final build (uP4J 0.8 / 0.45, uP4H.z 2.5, cracks deleted). Patch regenerated (579 lines, applies to aa7's file and
  reproduces the lane file). Final chain started: ident -> qc_r11 into WORK/qc_fix -> perf A/B (fix/b_final.sh).
- 02:20-02:23 identity re-proved on the final build (fix/ident_fix.txt, identS 20 moving frames): T1 ?p4ice=0, T2 ?p4ice=0,
  ?envlake=plate&p4ice=0, T0 (lane default) vs :5197 IDENTICAL (final, all 6 / 2 targets, all 16 / 12 programs, 0 console
  messages); lane default T1 / T2 differ only in rx-ice, reflection, final (negative control).
- 02:20-02:26 capture set (qc_r11.zsh -> WORK/qc_fix; shoot_qc log 0 console errors / warnings). fix/ana_fix.txt (judge's
  boxes, tools/fx_boxes.py), fix/fix_icem.txt (panel boxes), fix/sparkles_fix.txt (judge's spark.py), crops fix/img/fx_*.png:
  * F1 p05 right arc (x890-1060 y160-540) lap 8.1 -> 6.7, sd 27.5 -> 29.0 (MAIN 11.5 / 32.9; F402 2.9 / 23.3); top arc lap
    7.7 -> 4.9, sd 24.5 -> 22.3, lf 22.1 -> 20.6 (F402's box is sky). fx_p05_rightarc.png (MAIN | r1 | fix | F402): the agate
    outlines are gone; fx_p05_toparc.png: the dotted ring near the cut end is gone.
  * F2 q01 x805: r1 `201 164 164 164 165 167 167 202` -> fix `200 212 207 194 186 188 197 202` (F015 `207 213 208 190 171 181
    195 201`): the bright line and the 3 px V sit where F015's are, the V 15 L shallower; q02 row 375: r1 15 px plateau
    138-153 -> `207 194 185 181 176 172 167 162 158 160 162 163 167 170 175 185` (a 1-2 px bright line + a soft V, F030 a 10 px
    band at 164-168 + a 200-213 line). fx_q02joint.png (r1 | fix | F030).
  * F3 q03 boxes unchanged: x800-830 y260-350 191.1 (r1 191.4, MAIN 182.9, F045 174.3); x790-840 y230-330 180.1 (176.7 /
    171.7 / 165.2); x820-860 y300-380 173.1 (172.7 / 172.6 / 157.0). Open.
  * F4 cracks gone (code deleted). p06 band 209.1 -> 203.2 (F420 206.9), lower strip 214.2 -> 208.6 sd 21.9 -> 24.9 (F420
    206.5 / 16.7), sat 0.168 -> 0.187 (0.162): the hold ramp's side effect (darker, a little more low-frequency variation and
    chroma). Clipped px outside the orb 0 (F420 121): the strip is open.
  * F5 p04 log x680-880 y330-390: 222.4 / 19.5 -> 219.0 / 20.2, lap 4.0 -> 3.0 (F358 200.4 / 22.3 / 4.1). Open.
  * Sparkles (> 25 lv vs all 8 neighbours, ice-changed px; MAIN | fix): p04 bright 6 | 22 (judge r1 37), p05 37+25 | 16+10
    (r1 65), p06 13 | 13 (r1 26), q03 28 | 14, q01 15+20 | 9+5.
  * Whole-frame r1-vs-fix diffs move everywhere (env animation between captures, also between configs in one session:
    mean |dL| 7 at q00), so the per-program identity (ident) is the proof that only rx-ice changed.
- 02:27-02:28 perf A/B (tools/rc2.mjs, SLOT_BG=0, interleaved AB / BA, T1 scale 1, 1440x766; perf/ab_fix.json): quiet after
  15 s (load 3.3). MOVE 6 pairs, every block at load 3.6-6.9 (< 10): paired 0.993 1.026 0.986 1.048 1.018 1.040 -> median
  1.022 (+2.2 %, the same as round 1's qualifying run), median-interval diff median +0.475 ms (-0.3 .. +1.05); pairs 4 / 6
  carry lane-block hitches (p95 44.9 / 43.1 ms), ratio of medians 1.009. REST 2 pairs void (both pages throttled: block
  medians 43.3 / 29.2 ms, a 700 ms main frame).
- 02:29-02:34 rest rerun (perf/ab_fix_rest.json, 1 move + 4 rest pairs): the quiet wait TIMED OUT (judge_p4hold ident +
  interact and p4env's perf held the 3 slots; p4env's perf ran concurrently on the GPU). Loads 4.7-5.8. MOVE 1.014 (+0.3 ms).
  REST 1.118 1.025 0.995 1.059 -> median 1.042 (+0.75 ms at ~18 ms; first pair +2.05 ms, likely the concurrent perf run).
  Under the 5 % budget but not a clean rest number. Expected sign: the fix DELETED the crack loop (2 discs, hash33 / sin /
  cos / normalize on every T1 / T2 ice fragment) and added 4 vec3 derivatives + a V per cut only on joined split pieces, so
  the ALU is at or below round 1's (rest 1.008 / 1.027 in the builder's qualifying run).
- 02:35 patch re-verified (same sha 8bd774c6..., 579 lines, applies to aa7's file == lane file); b1 and b2's crawl frames
  deleted after analysis (WORK ~300 MB).
- 02:36 end state (fixer): HANDOFF.md has a header note and a "FIX ROUND" section (status per finding, switches, open items
  with options, evidence). F1 fixed (hold-only ramp x2.5), F2 fixed (V seam + far-wall line), F4 cracks deleted (also judge
  nit F7); F3, F5 and F4's refracted strip open with options (design decisions). Lab :5175 runs the final build (02:19:50).
  Mirrored to MAIN/notes/round11/lane_backup/p4r1/p4ice/ (LOG, HANDOFF, patch, fix/, perf/ab_fix*.json, qc_fix key poses).
