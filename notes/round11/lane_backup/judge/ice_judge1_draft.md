# ICE lane, round 11: judge 1 verdict (draft, written as I go)

Judge: independent adversarial judge 1, lens = ring ice material, orb and shards vs the Cycles reference.
Paths: LANE = $SP/lanes/ice, WORK = $SP/work/ice, my outputs = WORK/judge1/. Lab :5176 started by me (stop at end).

## State log (append after every sub-step)
- 06:49 started. Read SPEC 0-3 + 4.3, AUTOPILOT, LANE/HANDOFF.md, WORK/LOG.md (claims only, not trusted).
  Lane diff: IceMaterial.ts +696, Orb.ts +42, Rings.ts +27, RenderPipeline.ts +4/-1; no new files.
  Switches claimed: ?ice=r10 (round-10 ice/orb/shards), T0 keeps round 10. Lab :5176 was NOT running at start.
  Load 2.69, mem free 60 %.
- next: read the diff, start lab :5176, fresh captures (shoot_qc q00,q03,p06 + others) on both labs through the slot.
- 06:50 lab :5176 started by me (pid in judge1/lab5176.pid); lane build contains ICE_R11 (3 hits), MAIN's none.
- 06:53-06:56 capture batch cap1 (slot 'ice:judge1-cap1'): own tool judge1/tools/jshoot.mjs (shoot_qc recipe, dump1 order,
  every clock pinned: engine time, orb frame, shard clock + belt phases = dump1's for q00-q03/p06, fixed set otherwise).
  Dirs judge1/cap/lane_T1 (default + _bg + _mask), cap/main_T1 (:5173 + _bg), cap/r10_T1 (lane ?ice=r10 + _bg).
  * clock pinning verified: main vs builder's dump1 (round-10 frames) q00 0.052 / q03 0.468 / p06 0.184 per 255, max 1.
  * I-G4 way back T1: lane ?ice=r10 vs main, 10 poses (q00,q01,q02,q03,p06,p07,p08,t075,p04,p05): mean 0.042-0.498/255,
    max 1 everywhere, 0 px > 2. Diff map judge1/cap/wb_diff_q00.png (x32): dither only, no hero structure. -> PASS at T1.
  * pose identity engine vs twin (judge1/tools/jalign.py, r11 flat debug mask vs twin object index): IoU q00 0.941,
    q03 0.928, p06 0.952 (overlays judge1/cmp/align_*.png). The twin is a valid same-pose target.
- 06:57 per-ring stats (judge1/tools/jstats.py; masks = twin object index eroded 3 px minus orb/shard dilation; columns
  twin | ref | r10 | r11), file judge1/stats/rings_T1.txt:
  q00 dL vs own bg: A 11.9/1.3/-8.9/8.0, B -6.7/-11.1/-34.2/-6.7, C 4.2/-2.8/-11.1/6.9, D -9.5/-17.3/-14.4/-5.9 (good)
      sd: C 19.2/21.2/15.9/24.4, D 17.8/28.7/12.6/24.6; orb L 225/234/237/237 sd 30/24/18/22.
  q03 dL: A -12.1/-16.4/-11.0/+0.1 (r11 12 L too light vs twin, 16.5 vs F045), B -10.2/-15.7/-20.3/-2.8,
      C 8.7/-10.4/-14.1/14.2; dB-R A 18.2/17.0/12.6/10.4, B 14.1/13.0/15.1/7.6, C 4.1/12.6/12.5/-2.4 (too pale, too neutral).
  p06 dL: A -13.5/-10.0/-29.1/-12.1 ok; B -12.4/-8.5/-10.6/+0.2 (regression vs r10 in L), dB-R 16.8/8.4/4.2/0.8;
      orb sd 29.1/14.6/8.1/37.1 (r11 hold orb far busier than F420).
- 06:58-07:05 visual (full-res crops, judge1/cmp/): q00_bandA_2x.png, q00_bandA_right_4x.png, q00_bandA_left_4x.png,
  q03_Aleft_3x.png, q03_Aright_3x.png, p06_grid.png, p06_Aarc_3x.png, p06_orb_3x.png, p06_ends_3x.png.
  Findings so far: (a) hard-edged, pixel-stepped (aliased) "camouflage" islands on oblique bands (q03 ring A both sides,
  p06 arcs, q00 rings B/C behind band A); (b) closed contour capsule in band A at q00 (~x 862-872, y 365-390);
  (c) black dots on the p06 vertical arc (~x 890-930, y 185-210); (d) no frost texture: "liquid glass" not frosted ice;
  (e) q03 too pale / neutral; p06 ring B too light; (f) hold orb lavender glass rim + plasma (sd 37 vs F420 15).
- next: sweep (shoot_sweep both labs), temporal crawl sequence, pointer spots, T0 / T2, press-start joint fade, perf.
- 09:00 RESUME (attempt 2 of judge 1, after the 07:05 usage-limit stop). Lab :5176 was not running (old pid 19761 gone).
  Lane sources unchanged since 05:42 (IceMaterial/Orb/RenderPipeline) / 14 Nov 18:06 (Rings.ts), so cap1 (06:53-06:56)
  is of the current code. MAIN engine = HEAD (only validators/pipeline scripts modified). Load 3.3, mem free 59 %.
  Slot conf n=3, loadMax 16, bg false. Plan: re-check (a)-(f) on the crops, restart lab, then sweep / crawl / pointer /
  T0-T2 / joint fade / perf.
- 08:58 lab :5176 restarted by me, pid 28172 (judge1/lab5176.pid); lane build has ICE_R11, MAIN's none.
- 09:05 re-checked findings (a)-(f) on judge1/cmp crops: all still visible (q00_bandA_right_4x capsule + aliased islands
  behind band A; q03_Aright_3x / q03_Aleft_3x camouflage islands vs soft twin/F045; p06_Aarc_3x dark dot; p06_orb_3x
  thick lavender rim; q03 grid pale). Found sweep_lane/ and sweep_main/ complete (07:01-07:02, shoot_sweep T1 s1, the
  previous attempt ran them just before the stop): reviewing them now instead of re-running.
- (~09:00, clock times before this line were estimates; real time from `date` from here on) sweep review (sweep_lane vs sweep_main, crops judge1/sweepcmp/, reference loop frames judge1/refloop/loop_F008..F112
  extracted from Default Loop.mp4, tau*30): tumble phases read paler / whiter and mottled ("camo" white blotches) vs the
  steel-blue reference (tau_2.75_lane_ref.png vs F082, tau_0.25_lane_ref.png vs F008); 3x crop tau_0.25_lane_rings_3x.png
  shows aliased stair-stepped islands on the ring faces (not in main). Sweep frames are not clock-pinned (shards/clouds
  differ), so no env diff stats from them.
- (~09:02) pointer batch done (slot ice:judge1-ptr, judge1/ptr_lane + ptr_main, shoot_pointer T1 s1, 10 spots, clock 0):
  camera states identical in both logs. Next: pointer diff + crops, then hold/pop/rel sweep crops.
- (~09:04) wrote judge1/tools/jseq.mjs (tumble / press sequences, all clocks pinned) + seq_batch.sh; running through slot ice:judge1-seq
- 09:06 pointer spots lane vs main (judge1/ptrcmp/): full-frame mean 2.2-3.1/255; diff map diff_left_x8_half.png
  shows only the hero, shards (shard clock not pinned by shoot_pointer) and lake ripples: no env regression. Lane hero at
  the orb spot (orb_bandA_2x.png): "liquid glass" droplet blobs on band A's left, the contour capsule again (~x 878-888,
  y 375-415 at the orb dolly), vertical joint band ~x 795-805. Sweep hold/pop: hold_R_lane_arc_3x.png = large hard-edged
  dark "cow-print" islands on the hold arc (sw_hold_R ~x 900-1090, y 260-390); pop_L lane (clear glass with legible clouds)
  vs ref F358 (frosted, dark navy inner rings): sweepcmp/pop_L_lane_1x.png vs ref_F358_crop.png; rel_TR vs F453 similar
  composition, paler / clearer, orb a plain bright disc vs F453's structured plasma.
- 09:09 RESUME attempt 3 of judge 1 (lead stopped attempt 2 at 09:07; its seq batch got SIGTERM in the press phase:
  seq/tumble_lane, tumble_main, tumble60_lane complete, stats/tflick_T1.txt written; press_lane partial (14 frames),
  press_main / release_lane missing). Lab :5176 pid 28172 was gone; restarted by me 09:09, pid 32732. Lane sources still
  05:42 (IceMaterial/Orb/RenderPipeline) / 14 Nov 18:06 (Rings.ts). Load 4.3. Lead decision (6) added: the hold motion is
  the user's priority; for this lane that means: the ice lane must leave every ring's hold motion identical to the
  baseline (decision 3: ICE does not change poses), and the ice look must stay seamless during live presses.
  Plan: re-check (a)-(f) crops, look at sweep / ptr / seq crops, re-run the press / release sequences (lane + main),
  live-press motion identity lane vs main (per-ring angular velocity), T0 / T2, probe_interact, perf.
- 09:20 re-checked (a)-(f) on fresh crops of cap1 (lane q00 vs twin vs F000: judge1/cmp3/q00_4up_lane_main_twin_ref.png,
  q00_bandA_L_2x_lane_twin_ref.png, q00_bandA_R_2x_lane_twin_ref.png) and the old crops: all six still hold.
  Pose identity lane vs main (cap1 json, 8 piece world matrices): max diff 0 at q00/q03/p06/p07/t075 -> ICE changes no pose.
  Crawl, motion-compensated (judge1/tools/mcres.py, +-4 px block match, 3x3 SSD; stats/mcres.txt; maps tcmp/mcres_*):
  MC residual mean lane / main / reference-video: t0.4 4.10 / 3.72 / 4.63, t1.5 3.79 / 3.12 / 4.36, t2.9 3.66 / 3.10 / 5.86;
  share > 10 L: 12.1 / 9.9 / 11.7 %, 8.9 / 6.8 / 8.5 %, 10.0 / 7.9 / 16.4 %. => lane changes 10-22 % more than r10 between
  frames but stays below the Cycles reference's own temporal change: no excess crawl in aggregate; the CG tell is the
  hard (aliased) island edges, finding (a), which shimmer at their edges (tcmp/z34_lane_main.png).
- 09:18 press batch (slot ice:judge1-press, tools/jpress.mjs + press_batch.sh, T1 s1, centre press at tau 0, stepped
  1/30 s: press 2.5 s, hold 4 s, release 2 s, re-press 1 s, release 1.5 s; 331 steps; per-step dump of 4 group quats,
  8 pivots, camera, joint fade w; shots every 3rd step) -> judge1/press/lane, press/main; tools/presscmp2.py, presscmp3.py.
  * Motion identity lane vs main: camera identical (0 m), pivots <= 0.0004 m, group rotations <= 0.7 deg (6-decimal dump
    rounding) EXCEPT ring C at press_023-024 (113 / 103 deg): both builds flip ring C ~222 deg about an in-plane diameter
    within 5 steps of the pop (lane 30, 143, 19, 17, 13 deg; main 30, 30, 30, 119, 13), one step apart. Cause = my
    protocol: Rings.ts MAX_TURN safety net is skipped on dt=0 (frozen) frames ("Frozen / paused frames snap"), and the
    number of frozen rAF frames between settles differs per lab. Not an ICE effect (ICE's Rings.ts hunk only writes
    uPieceCuts.w). => ICE leaves the hold motion = baseline. (The baseline's own hold motion, the user's complaint, is
    the HOLD lane's: e.g. ring A 30-40 deg per 1/30 s at rel_215-218 and ring C at the MAX_TURN cap 900 deg/s during the
    pop; reported for the lead, not scored here.)
  * Joint fade (Rings.ts uPieceCuts.w = 1 - smoothstep(1e-4, 0.03 m, moved)): press: ring B halves fade over 3 steps
    (press_028-031), ring A quarters 1,2 go 1.00 -> 0.00 in ONE step (press_029 -> 030, pivots jump 0.057 / 0.090 m),
    quarters 0,3 over 2 steps (press_035-037); release end: all 4 quarters 0.01 -> 1.00 in ONE step (rel_210 -> 211, the
    quarters close 0.028 m in that step). Crops presscmp/rel_joint_207_210_213_3x.png, rel_210_213_lane_main_1x.png: the
    seam line appears from one frame to the next exactly when the gap closes (physically the gap becomes the seam), so
    it reads as the gap closing, not as a separate pop. Nit at most (a time-based fade of ~0.1 s would be softer).
  * Hold 4 s (press/lane/hold_194.png vs main vs F420: presscmp/hold194_lane_main_F420.png): same baseline hold pose;
    ice clearer, more internal structure than r10; orb white disc + thick lavender rim (f) again.
- 09:23 tiers (slot ice:judge1-tiers, jshoot q00/q03/p06; cap/lane_T0, main_T0, lane_T2 (+bg), main_T2):
  T0 lane vs main 0.416 / 0.416 / 0.438 per 255, max 31 / 27 / 16, px>8 <= 0.0011 % (map cap/wbT0_diff_q00_p06_half.png:
  dither + lake specks) -> T0 keeps round 10 (r11=false, ORB_R11 off) = baseline within T0 noise. T2: r11 on, no errors;
  lane T2 vs lane T1 0.148 / 0.454 / 0.330, max 9 / 24 / 12 -> T2 shows the same round-11 look as T1.
  Note: Orb uR11Orb / uR11OrbB uniforms exist on every path (also ?ice=r10, T0); only the ORB_R11 define is gated (harmless,
  HANDOFF says "creates none of the round-11 uniforms").
- 09:25 interaction (slot ice:judge1-interact; tools/probe_interact_q.mjs = stock probe at ?tier=T1&scale=1, + stock T0 on
  the lane; interact_batch.log): click inert in all three (drivers 0, holding never), errors none. Live frames per segment
  lane T1 vs main T1 (same 2.5 s hold / 1.2 s re-press / 1.5 s release windows): hold 55 vs 80, repress 26 vs 36, release2
  35 vs 46, click 31 vs 46 => lane ~25-30 % fewer frames in this single sequential pair -> must be settled by the perf A/B.
  ringDegPerFrame60 max 15.2 (lane release) vs 6.7 (main release) / 15.1 (lane T0 hold): the MAX_TURN 900 deg/s cap of the
  baseline hold, hit depending on the press phase (motion = baseline, HOLD lane's).
- next: perf A/B (tools/perf_ab_j1.sh, 6 pairs T1, SLOT_BG=0, load < 6) running in background -> judge1/perf/.
- 09:33 I-G4 re-verified from cap1: lane ?ice=r10 vs main T1 q00 / q03 / p06 / p07 / p04: mean 0.495 / 0.478 / 0.307 / 0.498 /
  0.448 per 255, max 1, 0 px > 2 -> PASS (T0 above: PASS within T0 noise).
  I-G1: twin q00 / q03 / p06 beauty + nohero + EXR index exist (WORK/twin/*); q03 twin vs F045 (cmp3/q03_lane_twin_F045.png)
  matches the reference's material read; q00 twin vs F000 (cmp3/q00_4up_lane_main_twin_ref.png) likewise -> PASS.
  Aliasing measured (tools/jstep.py, stats/hardsteps_T1.txt): hard 1-px luma steps > 15 L between flat sides, inside the
  rings (twin index eroded 4 px, orb / shards excluded), per 10k ring px, twin / F-ref / r10 / r11:
  q00 15.0 / 5.3 / 47.9 / 283.3; q03 13.8 / 2.1 / 50.3 / 419.2; p06 7.6 / 0.0 / 41.0 / 278.7 (> 8 L: r11 503 / 681 / 462
  vs r10 131 / 157 / 121, twin 120 / 116 / 70). => r11 has 6-8x the hard pixel steps of r10 and ~20-35x the twin's:
  finding (a) is a measured, new artefact (I-G3 "aliasing").
  Lake region q00 (cmp3/q00_lake_lane_main_ref.png): unchanged vs main, no glitch.
- 09:30 extra looks: q03 orb 2x (cmp3/q03_orb_2x_lane_main_twin_ref.png): at REST too the lane orb has a broad lavender /
  periwinkle limb (~8-10 px) where twin / F045 have a thin iridescent rim and visible plasma; band D in front of the orb
  has stair-stepped edges and no dark rim lines (F045 shows them). Pop (cmp3/pop_L_lane_main_F358.png): lane slabs clear
  glass, F358 frosted with navy inner rings. Capsule at 1x (cmp3/q00_bandA_center_1x.png): small but readable outline
  ~x 862-872, y 360-390 next to two dark oval "eyes" ~x 890-905.
  perf pair 1 (T1): base rest / hold / collapse 39.3 / 35.2 / 39.6 fps, ice 42.0 / 37.8 / 40.1 (the 09:25 interaction
  frame-count gap was load, not the lane). perf_probe exits ~3 min after printing (browser close), runs are slow.

## PROVISIONAL VERDICT (kept current; final below when perf is in)
Gates: I-G1 PASS (twin q00/q03/p06 + validation). I-G2 FAIL (q00 converged within +-4 L / +-4 B-R of the twin; q03 rings
A / B / C 12.0 / 7.4 / 5.5 L too light and 7.8 / 6.5 / 6.5 B-R less blue; p06 ring B +12.6 L / -16 B-R, C +11.2 L / -12.9
B-R, orb sd 37 vs twin 29 / F420 15; visible CG tells: camouflage islands, capsule, pockmarks, black dots). I-G3 FAIL
(new aliasing: hard 1-px steps 283 / 419 / 279 per 10k ring px vs r10 48 / 50 / 41 and twin 15 / 14 / 8; black dots at
p06; crawl in aggregate below the reference's own temporal change; frame time: pending). I-G4 PASS.
Findings: major (a) aliased camouflage islands; major (d) no frost, liquid-glass pockmarks; major (e) q03 / tumble too
pale and neutral, p06 B / C too light (regression vs r10 on B's L); minor (b) capsule contour + oval eyes on band A at
rest; minor (c) black dots on p06 arc; minor (f) orb lavender limb (rest and hold), hold orb too busy; minor shards
untouched (B-R +12 vs F000, sd 15 vs 21); nit joint seam switch in 1 frame at the release end; nit orb uniforms on all
paths. Score draft 7.0.
- 09:32 regressions outside scope: hero-hidden frames lane vs main (cap1 *_bg) q00 / q03 / p06 / p07: 0.466 / 0.301 /
  0.410 / 0.453 per 255, max 1; with the hero visible, x 0-440 and 1000-1440 at q00: 0.430, max 1. => environment, lake,
  grade, UI band identical; only the hero changes. Tumble tau 0.25 3x (sweepcmp/tau_0.25_lane_rings_3x.png, main left /
  lane right): hard-edged grey blotches over ring faces in the lane.
- 09:33 findings evidence list (for the final):
  (a) MAJOR aliased camouflage islands: stats/hardsteps_T1.txt; crops cmp/q03_Aright_3x.png (lane | twin | F045),
      cmp/q00_bandA_right_4x.png, sweepcmp/hold_R_lane_arc_3x.png (x 900-1090, y 260-390), sweepcmp/tau_0.25_lane_rings_3x.png,
      cmp/p06_ends_3x.png, presscmp/rel_joint_207_210_213_3x.png.
  (d) MAJOR no frost / liquid glass + pockmarks: cmp3/q00_bandA_L_2x_lane_twin_ref.png, ptrcmp/orb_bandA_2x.png (r10 top,
      lane bottom), cmp3/p06_arc_2x_lane_twin.png (lane arc smooth / plastic, outline not chiselled vs twin). DoG energy
      matches the twin (q00 A 4.19 vs 4.23) but it sits in hard steps (283 vs 15 per 10k px), not in fine grain.
  (e) MAJOR value / hue misses: stats/rings_T1.txt (q03 A dL +0.1 vs twin -12.1 / F045 -16.4, dB-R 10.4 vs 18.2 / 17.0;
      B -2.8 vs -10.2 / -15.7, 7.6 vs 14.1 / 13.0; C 14.2 vs 8.7 / -10.4, -2.4 vs 4.1 / 12.6; p06 B +0.2 vs -12.4 / -8.5,
      0.8 vs 16.8 / 8.4 (r10 -10.6: regression in L); C +6.4 vs -4.8 / +2.4, -3.1 vs 9.8 / 0.3); sweepcmp/tau_2.75_lane_ref.png
      (tumble paler / whiter than F082), cmp3/q03_lane_twin_F045.png.
  (b) MINOR capsule + eyes on band A at rest: cmp2/q00_capsule_4x.png, cmp3/q00_bandA_R_2x_lane_twin_ref.png,
      cmp3/q00_bandA_center_1x.png (x ~862-872, y ~360-390; eyes x ~890-905, y ~370-385); again at the orb hover spot.
  (c) MINOR black dots p06 arc: cmp3/p06_arc_2x_lane_twin.png (~x 892,192 and ~925,202, 2-3 px, dark-cored), cmp/p06_Aarc_3x.png.
  (f) MINOR orb limb: cmp3/q03_orb_2x_lane_main_twin_ref.png (rest), cmp/p06_orb_3x.png (hold), rings_T1 p06 orb sd 37.1 vs
      twin 29.1 / F420 14.6.
  (g) MINOR shards untouched (Shards.ts not in the diff; B-R 104-108 vs twin 95-97 / F000 95, sd 15 vs 21-23, builder table).
  (h) MINOR rim lines weak (builder table s40: q00 band A 31 / 21 vs twin 45 / 32, F000 38 / 45; q03 band D bottom 3 vs
      twin 36 / F045 25) - not re-measured, consistent with my crops (q03 band D: no dark bottom line).
  nits: joint seams switch within one 30 fps frame (press_029->030, rel_210->211); orb uR11 uniforms on every path.
- 09:36 rim lines re-measured myself (tools/jrim.py: band rows from the twin index per column, profile in 100 bins, core =
  median bins 30-70, line = min of the outer 22 %; core minus line, L), twin / F-ref / r10 / r11:
  q00 band A (x 650-860): top 46.2 / 36.3 / -2.7 / 29.0, bottom 59.0 / 50.2 / 7.7 / 31.0 (core 220 / 216 / 200 / 220);
  q03 band D (x 680-780): top 52.9 / 31.8 / 1.7 / 16.2, bottom 43.2 / 19.4 / 1.9 / 9.6 (core 243 / 228 / 221 / 240);
  p06 band B (x 660-820): top 36.2 / 18.5 / 1.5 / 39.1, bottom 57.8 / 2.3 / 7.8 / 26.3 (F420's pose differs at p06).
  => (h) confirmed: lines exist now (r10 had none) but are ~half the reference's at q00 bottom (31 vs 50) and q03 (16 / 10
  vs 32 / 19); q03 band D core 240 vs F045 228 (band over the orb too bright). Press frames: no black / NaN speckle (dark px
  lane 694 vs main 691 max over 72 frames, tools/darkscan.py); lane orb never clips to 255 (main median 811 px).
- 09:35 aliasing at T2 (cap/lane_T2 vs main_T2, jstep > 15 L per 10k ring px): r11 276.9 / 433.4 / 276.4 vs r10 49.4 / 53.6 / 38.7 (q00 / q03 / p06): T2 has the same islands.
- 09:36 perf pairs 1-4 in (perf/T1/, tools/perf_sum.py): medians rest 40.1 base / 41.9 ice fps, hold 34.4 / 36.6, collapse
  35.2 / 39.7; pair 4 base hit a load spike (27.5 / 21.2 / 24.4). Waiting for pairs 5-6. Then: live hold batch
  (tools/jlive.mjs + live_batch.sh, rest 3 s, hold 20 s, release 4 s, re-press 1 s, release 3 s, hold 6 s, release 4 s, lane
  and main T1) and the lane typecheck (tsconfig.hero.json has incremental false: --noEmit writes nothing).

## FINAL VERDICT (draft text; perf + live numbers filled in at the end)
lane ice, judge 1, pass = false, lens_score 7.0.
I-G1 PASS: twin q00 / q03 / p06 (beauty, nohero, EXR with object index) in WORK/twin; ICE_TARGETS 1.3 validation; my looks
  cmp3/q00_4up_lane_main_twin_ref.png, cmp3/q03_lane_twin_F045.png; pose IoU engine vs twin 0.941 / 0.928 / 0.952.
I-G2 FAIL: q00 converged (rings within +-4 L / +-4 B-R of the twin relative to their backgrounds); q03 A / B / C 12.0 / 7.4 /
  5.5 L too light and 7.8 / 6.5 / 6.5 B-R less blue (F045 darker still); p06 ring B +12.6 L / -16 B-R (r10 was -10.6 L),
  C +11.2 L / -12.9 B-R, orb sd 37 vs 29 / 15; rim lines half the reference's (q00 bottom 31 vs 50, q03 16 / 10 vs 32 / 19);
  p06 arcs smooth "plastic" outline vs chiselled twin; visible CG tells (islands, capsule, pockmarks, dots).
I-G3 FAIL: new aliasing (hard 1-px steps 283 / 419 / 279 per 10k ring px vs r10 48 / 50 / 41, twin 15 / 14 / 8; same at T2);
  dark specks at p06; crawl in aggregate below the Cycles reference's own frame-to-frame change (MC residual 3.7-4.1 vs ref
  4.4-5.9, r10 3.1-3.7); T0 sane (= baseline); frame time: see perf.
I-G4 PASS: ?ice=r10 vs MAIN T1 0.31-0.50 per 255, max 1, 0 px > 2 (10 poses); T0 default vs MAIN T0 0.42-0.44, max 31 at
  <= 0.0011 % px (T0 noise).
- 09:37 contention: the env judge's perf_probe (slot env:judge1-perf, work/env/judge1/tools/perf2.zsh) started ~09:34:16 concurrently with my pair 4 base run (slow numbers 27.5 / 21.2 / 24.4). Medians kept; contended runs flagged at the end. Backup: GPU-synced frame cost, one page, configs main / lane ?ice=r10 / lane default interleaved (tools/frame_cost_j1.mjs = builder's frame_cost3 logic, read and copied; tools/fc_configs.json).
- 09:40 perf: my pair-4 base probe hung 4.5 min after printing (browser close; also seen in pair 1, ~3 min) and ran
  concurrently with the env judge's probe -> killed my own probe + batch, moved pair 4 to perf/T1/old_*_4.txt, re-running
  pairs 4-7 with tools/perf_ab_j1b.sh (waits for an EXCLUSIVE slot like the env judge's script, load < 6, max 5 min) and
  tools/perf_probe_x.mjs (stock perf_probe; only changes: playwright path + forced exit after close). Contended earlier
  runs: pair 1 base (env / hold captures), pair 3 ice (hold:spin1).
- 09:42 q00 top arcs 2x (cmp3/q00_toparc_2x_lane_twin_ref.png): lane ring B / C arcs read as thin glass tubes with thin teal / white contour streaks and hard dark islands; twin / F000 frosted, cloudy interior. Part of (d).
- 09:43 LIVE hold (slot ice:judge1-live, tools/jlive.mjs, T1 s1, centre press, rest 3 s / hold 20 s / release 4 s /
  re-press 1 s / release 3 s / hold 6 s / release 4 s; analysis tools/jlive_ana.py -> live/lane_T1_ana.txt, main_T1_ana.txt;
  ~20 fps, other lanes held slots). Lane and main show the SAME (baseline) behaviour, errors none in both:
  * ring B: after the ~2 s pop |w| 1-3 deg/s for the rest of a 20 s hold (lane and main) = practically frozen; halves split 0.18 m.
  * rings C / D: first ~4 s of the hold |w| 60-230 deg/s with the direction cosine to their rest motion flipping between
    +0.8 and -0.8 every 0.5-1 s (back-and-forth), then C 4-10 deg/s, D 0-1 deg/s (frozen) -> exactly the user's "2 cincin
    tengah kaga muter, lebih ke gerak repeat doang".
  * ring A: decays to 7-10 deg/s (lane) / 3-12 then reverses (main hold1: +70 ... +6, -7, -19, -42); cos with rest ~0.2;
    quarters' spread breathes 0.87 <-> 1.05 m over the hold (a repeating in / out).
  * release: max step 15.0-19.2 deg per 60 Hz frame (MAX_TURN cap reached), B 395-434 deg/s right after release.
  => ICE inherits the baseline hold unchanged (not an ICE regression; HOLD lane's work). For the lead: the integrated build
  must take the HOLD lane's motion; nothing in ICE (Rings.ts hunk = uPieceCuts.w only) interferes with it.
- 09:44 typecheck lane (tsc --noEmit -p tsconfig.hero.json): exit 0, no output (0 errors), lane git status unchanged (judge1/tsc_hero.txt).
Extra checks (all PASS): hold motion untouched by ICE (stepped: camera 0 m, pivots <= 0.0004 m, group rotations <= 0.7 deg
  except the frozen-frame MAX_TURN artefact; live 20 s holds: same baseline behaviour in lane and main); no change outside
  the hero (hero-hidden frames max 1 level); click inert, re-press continuity, no page errors at T1 (probe_interact_q) and T0
  (stock); T2 compiles and equals T1's look; typecheck 0 errors.
User priority (decision 6) for the lead: this lane renders the BASELINE hold motion, which fails the user's criterion
  (C / D back-and-forth then frozen, B ~1-3 deg/s, A breathing spread, release steps up to 15-19 deg per 60 Hz frame);
  ICE does not own or worsen it.
- 09:45 band A left end at rest 4x (cmp3/q00_bandA_leftend_4x_lane_twin.png, x 535-645, y 340-410): lane = flat patches bounded by thin contour lines and rounded drop outlines (liquid glass); twin = granular cloudy frost. (d) at rest.
- 09:45 perf re-run pair 4 ice (exclusive at start, load 4.9): rest 42.3 / hold 23.8 / collapse 19.8 fps: load rose to 6.5 mid-run (another lane), so even exclusive starts get contended; will add the GPU-synced one-page frame cost (main / lane ?ice=r10 / lane) after the pairs as the robust check, plus the uR11Dbg views at q00 (tools/jdbg.mjs) to locate the capsule.
Fix hints (final): (a) make every branch of the per-pixel trace continuous (refract vs TIR, which wall / bounce exits, orb
  hit vs miss: smooth weights instead of selects), low-pass the plateau facet normals at the pixel footprint (fwidth / mip),
  or 2-4 jittered rays + TAA; target hard steps ~r10's 50 per 10k px. (d) Blender-baked frost normal / roughness (Noise B,
  roughness 0.8, Blender scale) or stochastic multi-sample transmission; keep chiselled outlines in the hold (p06 arcs).
  (e) grazing-angle-only lobe growth, deeper steel-blue absorption along long internal paths; restrict ring B's orb lookup to
  its upper part at p06 (debug view 7). (b) likely the orb limb / impact-parameter edge seen sharply through band A: blur it
  by the lobe; check uR11Dbg 7. (c) guard degenerate wall roots / bounce budget, fall back to the last valid radiance.
  (f) narrow the glass-shell band + limb to the twin's ~2-3 px; hold plasma contrast toward F420 (sd ~15-20).
  (h) stronger rim TIR darkening (q00 bottom 31 -> ~50 L). Shards: B-R toward 95, sd toward 21.
- 09:47 T2 ring stats (jstats on cap/lane_T2, masks differ from the T1 run because shard exclusion differs): q03 A dL -0.8 vs twin -8.8 / F045 -14.2, B -4.8 vs -12.5 / -18.8, C 18.6 vs 13.6 / -0.7; p06 B -0.5 vs -14.7 / -8.3, C 6.5 vs -4.8 / 2.4 -> T2 shows the same value misses as T1.
- 09:47 perf waiting for an exclusive slot (hold:spin-rp holding since ~09:45); pairs 1-3 medians: rest ice/base 1.020, hold 1.074, collapse 1.013 (per pair 0.99-1.25) -> no T1 regression so far.
- 09:48 tumble values (tools/tumblevals.py, stats/tumble_values.txt; hero mask from the pinned tumble frames, relative to the lane bg; the reference's pose is close, not identical): dL / dB-R lane vs Default Loop: tau 0.4 +4.6 / +7.0 vs +1.4 / +8.0; tau 1.5 +7.8 / +6.0 vs -5.9 / +13.3; tau 2.9 +7.0 / +3.6 vs -2.6 / +13.3 (r10: -19.6 / +21.1, -10.7 / +15.5, -8.5 / +12.5) -> lane 3-14 L too light and 1-10 B-R too neutral over the loop; r10 erred the other way.
- 09:50 debug views at q00 (slot ice:judge1-dbg, tools/jdbg.mjs, dbg/q00_dbg{0,1,2,3,4,5,7}.png; grid dbg/capsule_dbg_grid.png,
  x 760-960, y 320-430, 2x: beauty | view 7 orb impact | view 1 orb hit / exit / TIR | view 2 entry / exit face | view 3
  transmitted | view 4 reflected): the capsule and the eyes sit in the TRANSMITTED term exactly where view 7 (first exit
  hits / misses the orb) and view 2 (which face the ray exits) switch in hard-edged blobs; view 1 shows TIR-count islands
  at the band's right end. => root cause of (a) / (b): un-blended per-pixel branch switches (orb hit vs miss, exit face,
  TIR count) in the trace.
- 09:51 whole-hero debug (dbg/q00_hero_dbg_0_2_1.png: beauty | view 2 entry/exit face | view 1 orb/exit/TIR): view 2 is BLACK (face 0, exit 0 = no valid exit?) over band A's two ends, exactly where the pockmarks (left) and the eyes / capsule (right) are; view 1 shows blue TIR-count islands there and along ring edges. Likely also the source of the p06 black dots (c): rays that run out of bounces / find no exit.
- 09:52 code read (IceMaterial.ts L688-800): view-2 black = fExit -1 = no exit within the bounce loop (all TIR, or r11Wall root < 0 -> break at L707); those pixels take the frosted -V lookup (uR11G path, L783-788) while their neighbours take a sharp refracted exit -> hard island / capsule boundaries. Fix: blend the trapped-light term and the exit radiance continuously (by wIn / F, not by the nOut branch), guard the wall root, and filter.
- 09:52 perf waits: env judge started its own 6 pairs at 09:49 and the hold lane holds slots; my gate falls back to shared runs (load < 6) after 5 min. Debug views done earlier (09:50).
- 09:53 tumble aliasing (tools/jstep_seq.py, pinned tumble frames, hero mask): hard steps > 15 L per 10k px lane / main: tau 0.4 278.8 / 22.6, tau 1.5 332.2 / 35.4, tau 2.9 166.0 / 27.4 (6-12x) -> the islands are present through the whole idle loop.
- 09:53 freshness: this session's q00 capture (dbg/q00_dbg0.png, 09:49, lab restarted 09:09) vs cap1 lane q00 (06:53): mean 0.185 per 255, max 1 -> cap1 is the current lane build; every cap1-based number stands.
- 09:54 live-log frame intervals (both under the same contention, with per-frame logging): lane / main median 50.0 / 50.0 ms, p95 66.7 / 66.7, max 83.3 / 83.3 -> equal.
- 09:55 perf after 5 pairs (tools/perf_sum2.py): medians base / ice fps rest 40.8 / 42.0 (24.5 / 23.8 ms), hold 35.2 / 36.4 (28.4 / 27.5 ms), collapse 38.7 / 38.6 (25.8 / 25.9 ms); median ice/base 1.037 / 1.074 / 1.005; worst frames median 34/34, 50/50, 50/50 ms, max 67/50, 50/67, 67/67. Pairs 6-7 running (perf_ab_j1c.sh, GATE_MAX 60).
Summary (final wording): The round-11 ice is a real step from round 10's milky acrylic: clear, refractive, chiselled,
  with values matching the Cycles twin at rest (q00 within +-4 L / +-4 B-R per ring), an exact way back (?ice=r10, T0),
  no change outside the hero, no change to any pose (the hold motion is the baseline's), and no frame-time cost at T1.
  But it trades the milkiness for new CG tells an art director sees at once: hard-edged, pixel-stepped "camouflage"
  islands across the ring faces (6-12x the hard pixel steps of round 10, 20-35x the twin's; at rest, through the whole
  idle loop and in the hold, also at T2), liquid-glass pockmarks / a closed capsule outline on band A at rest instead of
  the twin's frost, dark specks in the hold, a broad lavender orb limb, too pale / neutral rings over the tumble and at
  q03 (3-14 L, up to 10 B-R) and too light rings B / C in the hold. Root cause located: un-blended per-pixel branch
  switches in the trace (exit face / orb hit / no-exit fallback, debug views 1 / 2 / 7). I-G2 and I-G3 fail.
- 09:56 perf pair 6 ice ran concurrently with the env judge's probe (load rose to 7.0): 23.0 / 16.5 / 17.2 fps -> unreliable; keeping pair 7 to have >= 6 usable pairs; medians reported over all pairs and over the pairs whose both sides started exclusive.
- 09:57 machine context: the user's own Chrome (GPU process ~57 % CPU) has three hero preview tabs open since 09:02-09:03 (renderers 30245 / 30617 / 30687) rendering continuously, plus the env judge's perf and hold lane captures -> every timing run here shares the GPU; only medians over interleaved pairs mean anything.
- 09:58 perf 6 pairs: medians base / ice fps rest 40.8 / 41.9, hold 35.0 / 36.1, collapse 39.2 / 33.8; median ice/base 1.028 / 1.034 / 0.957; worst frame median 34/42, 50/50, 42/58 ms, max 67/67, 50/83, 67/83 ms. The ice-side drops (pairs 4, 5, 6 collapse 19.8 / 28.9 / 17.2) all coincide with concurrent runs (env perf, load 6.5-7.0); pair 7 running, then the GPU-synced one-page frame cost to separate code cost from contention.
- 10:00 pair 7 base contended (26.2 / 16.9 / 23.2 fps; holders env perf + hold interact; load 8.4 after, /usr/libexec/secd at ~94 % CPU). Waiting for pair 7 ice (gate load < 6).
- 10:00 perf_probe FINAL (6 complete interleaved pairs, T1 s1 1440x766, SLOT_BG=0, every start at load < 6; perf/T1/summary.txt):
  medians base / ice fps rest 40.8 / 41.9 (24.5 / 23.9 ms), hold 35.0 / 36.1 (28.6 / 27.7 ms), collapse 39.2 / 33.8
  (25.5 / 29.6 ms); median of pair ratios ice/base 1.028 / 1.034 / 0.957 (min 0.56 / 0.48 / 0.43, max 1.63 / 1.30 / 1.25);
  worst frame median 34/42, 50/50, 42/58 ms, max 67/67, 50/83, 67/83 ms. Every low ratio coincides with a run that overlapped
  another lane's probe (pairs 4-6 ice, load 6.5-7.0 mid-run); pair 7 dropped (load 9.9, secd). Medians within +10 % ->
  frame-time criterion met by the lead's rule; GPU-synced one-page cost (main / lane ?ice=r10 / lane) next to separate code
  cost from contention (tools/after_perf.sh).
  (note: per-side medians differ from the median of pair ratios in collapse: base 39.2 vs ice 33.8 fps (-14 %) because 3
  of the 6 ice collapse samples ran under other lanes' probes (19.8 / 28.9 / 17.2); the paired median is 0.957. Too
  contended to decide alone -> the one-page GPU-synced cost decides the frame-time sub-gate.)
- 10:01 ratios for the final: hard steps r11 / r10 5.9 / 8.3 / 6.8x (q00 / q03 / p06), r11 / twin 18.9 / 30.4 / 36.7x; tumble lane / main 12.3 / 9.4 / 6.1x. Frame-cost run started 10:01:08 (slot ice:judge1-fc, shared with 1 holder, load 5.5).
Final gate list for the structured output: I-G1 PASS | I-G2 FAIL | I-G3 FAIL (artefacts; frame-time sub-check per the
  one-page GPU cost) | I-G4 PASS | decision 3 / user priority: ICE leaves the hold motion = baseline PASS | outside-scope
  regressions PASS | interaction / errors / typecheck / T2 PASS | T1 frame time (sub-check of I-G3): see fc result.
- 10:03 GPU-synced one-page frame cost (slot ice:judge1-fc, SLOT_BG=0, started at load 5.5 with 1 other holder;
  tools/frame_cost_j1.mjs = the builder's frame_cost3 logic: frozen frame rendered 30x with a 1-px readPixels each, median
  per sample, configs interleaved over 4 rounds; after_perf.log): q00 main 44.50 ms | lane ?ice=r10 43.60 (x0.980) | lane
  r11 47.90 (x1.076 vs main, x1.099 vs ?ice=r10); p06 main 47.00 | ?ice=r10 43.70 (x0.930) | r11 48.80 (x1.038 / x1.117).
  main and ?ice=r10 are code-identical, so the config noise is 2-7 %; r11 vs their mean: q00 x1.087, p06 x1.076.
  => the round-11 ice costs about +8 % GPU time at T1 (range +4 to +12 %), not the x0.95 the HANDOFF reports; within the
  +10 % budget by the central estimate, at its edge. perf_probe paired medians (contended): rest / hold faster, collapse
  +4.5 %. Frame-time sub-check: borderline PASS; minor finding (claim vs measurement, thin margin).
- 10:03 lab :5176 (pid 32732, started by me 09:09) STOPPED; nothing listens on 5176; no batch / monitor of mine left;
  MAIN's :5173 untouched (pid 1914). Nothing outside WORK/judge1 was edited (lane tree unchanged: tsc_hero.txt check).

## FINAL (10:04): pass = false, lens_score 7.0
Gates: I-G1 PASS, I-G2 FAIL, I-G3 FAIL (new aliasing + dark specks; frame time borderline: GPU cost about +8 %
(+4..+12 %), perf_probe paired medians -3 / -3 / +4.5 % frame time), I-G4 PASS; extra: ICE leaves the hold motion =
baseline PASS, outside-scope regressions PASS, interaction / errors / typecheck / T2 PASS.
Findings: major (a) aliased camouflage islands, (d) no frost / liquid-glass pockmarks, (e) value / hue misses (q03,
tumble, p06 B / C); minor (b) capsule + eyes at rest, (c) black dots p06, (f) orb lavender limb + busy hold plasma,
(h) rim lines half the reference, shards untouched, frame-time claim x0.95 not reproduced (about +8 %); nits joint seams
switch in one frame, orb uR11 uniforms on every path.
User priority (for the lead): this lane renders the baseline hold motion unchanged; that motion fails the user's
15 Nov criterion (C / D back-and-forth then frozen, B ~1-3 deg/s, A spread breathing); HOLD lane's work.
