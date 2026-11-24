# HOTFIX LOG (constant opening)
04:17:26 start: read HoldR11.ts etc.
04:29:02 code: HoldR11 SPIN_P2B_GUARD/HOLD_STEADY/steady/frameMargin; Rings poseRigid guard skip + openRadiusA; CameraRig holdShare/holdRadius/frameShare; HeroEngine lift uses holdShare. tsc hero run.
04:31:43 probe tools/hp.mjs written; smoke spec
04:32:39 smoke run ok: openR 3.035 m, share 0.7335 @1440x766 (cam r ~14.89 m), sweep 8 s clock: A T46 B739 (margins 46 / 27 px), L377 R1070
04:36:37 specs b1 (1440: 4 presses tau .6/1.6/2.6/3.6 x 10 s, re-press, click, idle ref, sweep), b2 (?spin=p2b), b3 (1280, 1920, 390)
04:37:13 base copy (MAIN files) served on :5178 (pid 15140) for switch identity checks; b1 running
04:40:03 b1 h06 done; sheet tool py/sheet.py (OIIO labels), README line added
04:41:00 tsc -p tsconfig.hero.json exit 0, tsc -p . exit 0 (no output); tsbuildinfo restored
04:41:28 hotfix.patch generated (tools/mkpatch.zsh; 5 files), applies cleanly (patch --dry-run) to MAIN copy; waiting for b1
04:42:28 b1/h06 analysed: A offsets 0.6 x4 const in sustain (spread 0), B 0.1 x2; margins T49 B34 L382 R371 px @1440; camera const after tp 3.717 (6.8e-7 m), 5 mm drift-free settle tp 2-3.317, one 0.195 m ease-back tp 3.317-3.717 (reference curve, kept); A|w| 37-43, B 31-32, C -18, D +9 deg/s; shards 0 hits min 0.243 m
04:44:05 b1 h16/h26 looked at (eyes/h16_every05.jpg, h16_dense_tp5_7.jpg, h26_every05.jpg): A 0.600 constant tp>=3.2 to release, open arcs throughout, inside frame; h26 tall phase tp 5.75-6.25 T49 B730 (old guard dropped A to 1/3 there)
04:45:12 trimmed b2 to p26, b3 to h06/h26 + sweep per size (time)
04:45:41 started tools/batch23.zsh in background (waits for b1; then b2 p2b, b3 1280/1920/390, identity pairs c1-c7 vs MAIN base :5178)
04:46:11 b1 h36 looked at (eyes/h36_every05.jpg): A 0.600 const, open, inside; tall phase T50.4 (tp 5.75) B731.9 (tp 6.15)
04:46:33 looked at eyes/h06_dense.jpg (tp 5.8-8.0 every 0.1 s, A tallest 678 px at tp 6.12): gaps constant, turning slowly through face-on
04:47:12 videos eyes/hold10s_h06/h16/h26/h36.mp4 (10 fps = real time, shots every 0.1 s)
~04:49 b1 (1440x766) DONE, logs/an_b1.txt + logs/sweep_b1.txt:
  - A quarters 0.6000 m x4, B halves 0.1000 m x2, constant (spread 0) tp 3.2 -> release in all 4 presses (tau .6/1.6/2.6/3.6) and the re-press; off-radial <= 2.2e-16 m, pivot rot 0
  - bounds whole runs worst L374 T44.2 R1069 B735.5 (margins 374/44/371/30.5 px); sweep 8 s clock (settled, cam 1.0, pointer centred): A T44.9 B738.8 L372.7 R1065.6
  - camera: const <= 7e-7 m tp 3.717 -> release; 5 mm creep tp 2.0-3.317 (curve 0.999->1); one 0.195 m ease-back tp 3.317-3.717 (reference curve); 14.90 -> 15.09 m from orb; rotation <= 0.18 deg (drift + pan)
  - |w| sustain A 37.4-43.3, B 31.4-33.0, C -18.00 (flip axis), D +9.00 deg/s; s_eff 0.1997..1.0001; consecutive cos >= 0.999 (never reversing)
  - shards 0 hits, min clearance 0.128 m (rp), 0.166-0.243 long holds; click: no camera / opening (phases idle/press); re-press continuous
04:48:47 looked at eyes/rp_dense.jpg: release closes A 0.6->0 smoothly, camera back to rest, re-press re-opens and lunges back, continuous (labels after first up say 'rel', cosmetic)
~04:50 b2 (?spin=p2b = old guard, press tau 2.6) DONE, logs/an_b2.txt: A offset in sustain 0.199..0.600 (dips 0.600 -> 0.201 at tp ~6.2 and back by 8.75: the pulsing), camera 12.71 / 12.97 m, margins T26.7 B26.2.
  looked at eyes/cmp_new_old_tp4_8.jpg (NEW row vs OLD row every 0.4 s tp 4.2-8.7): OLD quarters close into a near-closed ring at tp 5.5-7.0 and re-open; NEW stays open (0.600) the whole time, rings ~15 % smaller in frame.
04:51:27 video eyes/hold10s_p26_OLDguard.mp4; rings LOG append drafted (rings_log_append.md)
04:51 b3 1280x800 DONE (logs/an_b3_1280.txt, sweep_1280.txt): share 1 (full dolly fits: fov 29.8 deg), A 0.6 x4 / B 0.1 x2 const in sustain; live worst L281.5 T53.5 R1005.5 B763.6 (margins 281/53/274/36 px); sweep A T43.5 B771.1 L273.8 R1000.7 (margins 43.5/28.9/273.8/279.3); camera const 1.2e-8 m after tp 3.717; shards 0 hits min 0.241 m
04:53 b3 1920x1080 DONE (logs/an_b3_1920.txt, sweep_1920.txt): share 0.8288 (camera 14.33 m after the ease-back), A 0.6 / B 0.1 const; live worst L476.8 T72.6 R1452 B1032.9 (margins 477/73/468/47 px); sweep A T62.1 B1040.5 L467.4 R1444.5 (margins 62/39.5/467/475.5); camera const 1.1e-6 m; shards 0 hits min 0.126 m
04:55 b3 390x844 DONE (logs/an_b3_390.txt, sweep_390.txt, eyes/h26_390_every05.jpg): share 0 (camera at rest 20.93 m as before), A 0.6 / B 0.1 const; A crosses the side edges by up to 22-28 px when wide (live worst L-27.1 R418.8, sweep L-28.0 R412.5; 310-322 of ~585 hold frames past a side); T189 B629 (lots of vertical room); at rest A is 13-16 px inside the sides. The guard build kept A inside here (L13 R376) by shrinking the opening. Lead allowed the portrait side crop.
04:55 new vs old (?spin=p2b), same press tau 2.6, 721 frames: ring group quaternions max diff 2.0e-13, clock 1.2e-13, spin 3.0e-13 (rotations unchanged by the hotfix; float noise between page sessions)
04:59 ident1 (hp.mjs numeric, live presses, mine vs MAIN base): c1 ?spin=p2b vs base default, c2 r10, c3 r11a, c4 s3: tau/spin/spreadA/splitB/camExpand/root(lift)/ring quats/bounds max diff 0 (g 3.5e-18 in r10); camera cp 2e-6..6e-4 m, cq <= 1.8e-5, shard phases and pixels differ = page-session time (s.time drives the handheld drift, uTime shaders, shard clocks; the hp harness lets the live loop run between steps), not code. Running the rings lane's pinned-state harness (work2/rings/tools/jcmp3.mjs, read-only use) for pixel identity: tools/jcmp.zsh -> caps/j/*, logs/jcmp1/2.txt
05:00 ident2 (hp.mjs numeric): c5 f2, c6 aphase=r10(&spin=p2b vs base), c7 idle=r10(&spin=p2b vs base): tau/spin/opening/camExpand/lift/ring quats/bounds diff 0; camera / pixels differ by page-session time only (see ident1 note). jcmp3 pinned-state pixel runs started (tools/jcmp.zsh).
05:01 looked at caps/b1/h26/f0390.jpg (tp 5.75, A tall = where the old guard closed it to 1/3): four quarters at the full 0.6 m gap, top ~50 px / bottom ~46 px inside, background clean
05:01 jcmp j1 (?spin=p2b mine vs MAIN default, 26 pinned shots rest/pointer/pose/live incl. live F358/F420/F453/F460 at 2 taus): ALL pixel-identical (mean 0 max 0), camdiff 0, gqdiff 0
05:02 hotfix.patch regenerated (268 lines, md5 c29f8cd4767d0e2259c61a94474abcd9), dry-run applies cleanly to the MAIN copy
05:04 jcmp j2 hold=r10, j3 hold=r11a, j4 spin=s3 (17 pinned shots each, rest/pose/live): ALL pixel-identical, camdiff 0, gqdiff 0
05:14 jcmp j5 spin=f2, j6 aphase=r10(&spin=p2b vs MAIN aphase=r10), j8 aphase=r10 rest/pointer (new default vs MAIN), j9 idle=r10 rest/pointer: ALL pixel-identical, camdiff 0, gqdiff 0. j7 idle=r10(&spin=p2b vs MAIN idle=r10): 16/17 identical; live_F358_t1.1 (mid-lunge) mean 0.022 max 66, camdiff 1.3e-4, gqdiff 0 = the known harness flicker (pointer speed from performance.now() in Choreography.move(); rings HANDOFF section 2 / open 9: same build vs itself shows it too).
05:17 j9's jcmp3 node process hung after writing its results (0% CPU, no Chrome child, 10 min): killed it so _j2.zsh proceeds to j10
05:17 appended 'LEAD HOTFIX (constant opening)' to work2/rings/LOG.md (append only)
05:18 final hotfix.patch md5 c29f8cd4767d0e2259c61a94474abcd9 == the 04:41 copy fix1 took (work2/rings/fix1/hotfix_0441.patch): no code change since 04:41
05:18 j10 default rest/pointer (13 shots) identical to MAIN (idle untouched). Stopped my labs :5177 (PID 11996, clone) and :5178 (PID 15140, MAIN base copy); other servers untouched. DONE: deliverables = clone lanes2/hotfix/retrux-web (5 files), hotfix.patch (md5 c29f8cd4...), rings LOG appended, report to the lead.
