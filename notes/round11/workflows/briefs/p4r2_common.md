# P4 round 2 brief (binding for every P4 round-2 builder, judge and fixer) - 21 Nov 2026 01:15 WIB

## Why
The client, tonight: "kelarin sampe perfect yaa ... full power sampe selesai, 10/10. lo cobain sendiri, lo cek pake mata sendiri"
and "ensure looks perfect like AAA game yaa, but hella optimized awwwards site of the year worthy". The round goal (SPEC §0, 14 Nov):
"make it have 10/10 score, awwwards worthy, matched with reference, and super magnificent quality, no mistake, use my blender!".
Standing rules from the client: match the reference ("samain kaya di video"), nothing invented ("jangan ngide": no extras the
reference does not show), no glitches anywhere (explicitly: no doubled mountains when the camera moves, nothing weird at the bottom
of the frame), real-time only (never a video), hard edges, contrast from tonal design (no scrims / overlays).

## The panel that defines your work
The first full round-11 panel (P3, 8 independent judges on the merged build = MAIN) scored overall 7.72: ice_material 6.5,
orb_shards_light 7.5, awwwards_jury 7.6, environment 7.8, color_grade_post 8.3, composition_motion 8.6; glitch_cursor_orbit 7.3,
glitch_hold_sweep 8.0. Target: every lens >= 9.0.
- Verdicts (every issue with pixel evidence): MAIN/notes/round11/p3/r11_1_panel.json
- Ranked plan (tasks G1-G6, Q1-Q16 with root causes in the code, implementation plans, risks): MAIN/notes/round11/p3/r11_1_plan.json
- The captures the panel judged (MAIN's build): $SP/p3/r11_1 (q00..p08 PNGs, cmp_*, crop_*, ptr/, sweep/, region_stats_q00.txt,
  and each judge's zoom_<lens>/ crops). Backup: ~/RetruxR11Work/p3caps/r11_1.
Read the tasks of your lane in the plan IN FULL before you start, and the panel issues they came from.

## Paths
| name | path |
|---|---|
| MAIN | /Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd (iCloud Documents; read freely, NEVER edit its code) |
| SP | /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad (wiped on reboot: mirror LOG + key images into MAIN/notes/round11/lane_backup/p4r1/<lane>/ as you go) |
| LANES | /Users/muhamadrifaldi/RetruxR11Work/lanes (same as /Users/muhamadrifaldi/Library/Caches/retrux-lanes, a symlink) |
| MAIN lab | :5199 = lane aa8 (its app/ == MAIN/retrux-web/app since 21 Nov 01:10: AA7 + AA8 water polish merged). Frozen reference: never edit lane aa8, never stop :5199. (:5197 = lane aa7 = MAIN before AA8, used by the round-1 lanes.) |
| BLENDER | /Applications/Blender.app/Contents/MacOS/Blender (5.2, Cycles Metal GPU) ; BPY python: /Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13 (numpy + OpenImageIO; run with -I) |
| FFMPEG | /opt/homebrew/bin/ffmpeg |
| REF | /Users/muhamadrifaldi/RetruxR11Work/hp/reference (ref_F###.png = State video, loop_F###.png = Default Loop, figma_hero_2497-2204.png); more frames: MAIN/refs/videos/*.mp4 and MAIN/refs/hold_frames/F328-F472.jpg (iCloud: reading may download first) |

Your lane: `cp -c -R LANES/aa8 LANES/<lane>` (keep it if it already exists from YOUR earlier cut-off attempt and read your LOG),
serve it: `cd LANES/<lane>/retrux-web && PORT=<port> nohup node hero-lab/serve.mjs --no-watch > <WORK>/lab.log 2>&1 &`
(rebuilds on start; restart it to pick up source changes). WORK = $SP/work_p4/<lane>.
Design docs worth reading for your area: MAIN/notes/rebuild_analysis/A1_env_audit.md, A2_hold_reference.md, A3_hold_code.md,
MAIN/hero-pipeline/research/blender_forensics.md (every number from the artist's .blend), video_choreography.md,
MAIN/notes/round11/handoff_{env,ice,hold,atmos,water_userfix,rings_userfix}.md (what each round-11 lane did and why),
MAIN/notes/round11/SPEC.md (binding rules §2) and MAIN/retrux-web/app/hero/README.md (engine architecture).

## Hard rules
1. Every change has a URL switch that restores MAIN exactly: `?p4<lane>=0` (e.g. ?p4env=0) turns your whole lane off; prove it
   with ident (final image + all render targets + every linked program, 20 moving frames) against :5199 at T1 and T2, plus
   T0 and ?envlake=plate. Sub-switches per task are welcome.
2. Follow the reference; nothing it does not show. When the panel's suggestion would invent something, do not build it.
3. Never break what works: rest framing, the idle mocap loop, click inertness, the hold's continuous slow-motion rotation in the
   rest direction with opening offsets (client's words; split rings stay precisely one ring, no askew piece, no non-coplanar
   offsets), release continuity, the debug API (__hero.debug.pose/settle/freeze/pointer, __hero.rings.clock / tune), the UI
   overlay, the waterline AA (AA7: ?aaresolve / ?slabflash / ?lktaa / ?lkglide / ?ffblock / ?mirrorcost / ?mrows), T0 phones.
4. "hella optimized": no frame-time regression > 5 % at T1 (real loop, interleaved A/B vs :5199, >= 6 pairs, SLOT_BG=0,
   1-min load < 10) unless the gain is measured and stated; never add a full-screen pass without measuring it; T0 unchanged unless
   your task is T0.
5. Heavy jobs only through the slot: `node $SP/slot/slot.mjs run '<lane>:<what>' -- <cmd>` (3 slots machine-wide; hold one
   <= ~5 min per batch). Blender: the round-1 env lane owns Blender until it finishes; round-2 lanes do not run Blender.
6. playwright-core: ALWAYS createRequire('/Users/muhamadrifaldi/Library/Caches/retrux-lanes/pw/package.json') (1.49.1, system
   Chrome via executablePath '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args --use-angle=metal --enable-gpu
   --ignore-gpu-blocklist). The validators in /Users/muhamadrifaldi/RetruxR11Work/hp/validate already do (they read `LAB=` for the
   lab URL). MAIN's own pipeline/*.mjs probes require MAIN/hero-pipeline/tools (iCloud-evicted: hangs): copy a probe into WORK/tools
   and patch its createRequire before use.
7. Capture set for judging (the panel's exact harness): `zsh /Users/muhamadrifaldi/RetruxR11Work/hp/qc_r11.zsh <outDir>
   http://localhost:<port> T1 1` (shoot_qc all poses + ui, 10 pointer spots, the glitch sweep, region stats; ~8-12 min).
   Compare with MAIN's set in $SP/p3/r11_1 and with REF. Always LOOK at your images (Read tool) and full-frame diff maps.
8. Typecheck in the lane's retrux-web: npx tsc -p tsconfig.hero.json --noEmit && npx tsc -p tsconfig.json --noEmit --incremental false
9. Keep WORK/LOG.md dated (each attempt, numbers, decision) and finish with LANES/<lane>/HANDOFF.md (files + why, switches,
   assets + sizes, evidence paths + numbers, what is open). Write the patch vs aa8 with
   `diff -u --label a/retrux-web/<f> --label b/retrux-web/<f>` per changed file (+ new files) into WORK/<lane>_vs_aa8.patch and
   mirror it. Shipped assets (if any) go into the lane's public/hero/ and are listed with sizes.
10. No git commits / pushes / deploys / uploads / paid generation / Figma writes; never read or print .env; don't edit CLAUDE.md,
    memory or settings; never stop a process you did not start (:3000, :3001, :5180-:5199 labs of others).
11. Disk: keep WORK under ~6 GB, delete capture sets once analysed (keep your final evidence).

## Round-2 context
Running in parallel (do not touch their lanes or ports): round-1 lanes p4env :5174 (env glitches G1 / G4 / G3, owns Blender,
Atmos.ts / PlateEnvironment.ts / baked assets), p4ice :5175 (hero/IceMaterial.ts), p4orb :5176 (hero/Orb.ts, Shards.ts,
pipeline/PostChain.ts, HeroEngine.ts). Keep your hunks in shared files (HeroEngine.ts) small and list them in HANDOFF.md; the lead
merges all lanes with a 3-way merge. AA8's reports (the waterline AA state you start from): MAIN/notes/round11/lane_backup/aa8/
(polish, tip (the failed thin-tip attempt and why), integrator, judge-*, fixer, recheck). The waterline AA gates still hold for
anything you change on the lake: no new pops vs AA8 (popscan / popnew with the bloom-free masks; tools and masks are listed in
MAIN/notes/round11/workflows/briefs/aa8_common.md), G1 crawl not worse than AA8, every AA switch exact.
