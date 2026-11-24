---
name: retrux-round11-state
description: "Round 11 of the Retrux ice hero started 2026-11-14 on the new Mac — lanes, SPEC, slot gate, workflow run id, how to resume"
metadata:
  node_type: memory
  type: project
  originSessionId: a0f5735b-9a7f-477e-9b57-6de40ca5644b
  modified: 2026-11-20T07:09:04.866Z
---

Round 11 started 2026-11-14 after the user said: "continue the development make it have 10/10 score, awwwards worthy, matched with reference, and super magnificent quality, no mistake, use my blender!" (Before that, on 2026-11-13 they said the hold is "berantakan" and the environment still duplicates when the camera moves: "pake aja blender, bikin di blender".)

- Binding round doc: `notes/round11/SPEC.md` (user words, rules, lanes ENV / HOLD / ICE with gates E-G*, H-G*, I-G*).
- Work happens on branch `hero-round11` (not committed; user has not asked for commits). Validators in `hero-pipeline/validate` and `pipeline/*.mjs` were ported to macOS (Chrome path, ffmpeg path, ANGLE metal, `LAB` env for the lab URL).
- Lanes = detached git worktrees in the session scratchpad (`.../scratchpad/lanes/{env,hold,ice}`, labs on :5174/5175/5176; main lab :5173 is the baseline). Heavy jobs go through `scratchpad/slot/slot.mjs` (conf normally 2 slots + background QoS; 3 slots at normal QoS while the user is away).
- Lanes workflow: run `wf_bb348220-68b` (build → adversarial judge → one fix + re-judge). Next planned: integrate lane diffs into main, full capture set, 8-lens judge panel (port of `pipeline/judge_round4.js`), fix round.
- Found on day one: the engine already had a partial baked-environment mode (`#ifdef BAKED_ENV`, `?env=projected` switch); bake v8 from the old laptop removes doubles but shows a ridge-foot seam, white specks and a dark line at rest → ENV lane re-bakes v9 on the Metal GPU.
- The scratchpad is wiped on reboot; lanes' diffs must be integrated into the repo before that. Interim backup (patches, untracked code, bake v9 outputs, lane logs, ICE_TARGETS, slot.mjs): `notes/round11/lane_backup/` in the repo.
- 2026-11-14 19:07 the first lanes run hit the account's 5-hour usage limit (reset 20:30 WIB): env bake v9, hold build (56/65 H-G1) and ice twin finished; ice-match was cut off mid-work. 21:25 resumed the same run id (`resumeFromRunId`) with an edited script: continuation notes, a new `hold-build-2` step, lead decisions (ring A in-plane phase at rest fitted to F000 joint bars behind `?aphase=r10`; H-G2 counts the exact silhouette; perf runs use `SLOT_BG=0`, a per-run override added to the scratchpad slot.mjs). Expect more usage-limit cut-offs: resume again the same way.

- 2026-11-14 21:40 autopilot: the user left the Mac and asked for nonstop work until done. Binding state + heartbeat procedure: `notes/round11/AUTOPILOT.md`; status: `zsh pipeline/r11_status.zsh`; heartbeat cron job b553318e (session-only), caffeinate task b00g9g7fp. See [[autonomous-run-preference]].

- 2026-11-16 07:58 the user PAUSED all round-11 work ("pause dl for this all"). State, what is merged in MAIN, where each lane (rings / water / atmos) stopped, and exact resume steps: `notes/round11/AUTOPILOT.md` ("Current state: PAUSED"). Lane work is backed up in `notes/round11/lane_backup/lanes2/`. Do not resume until the user asks.

- 2026-11-17 07:47 resumed at the user's "lanjut, super power"; 08:52 PAUSED again ("pause dl all"). The current pause state and the exact resume recipe (inject fix2:rings, resume both run ids) are in `notes/round11/AUTOPILOT.md`.

- 2026-11-19 02:25 MAIN now = P2 + rings final + atmos fix3 + hotfix2 + AA resolve + WATER lane (new mirror lake LAKE_R12, landed by lead decision despite judge3 7.8: it is the only fix for the user's fragmenting-water / floe-shadowing complaints; way back `?envlake=plate`). Running: workflow r11-final-water-aa (run `wf_24d1fe62-d8e`): lanes W3 (water majors) + AA2 (waterline AA on the new lake, then env TAA) -> integrator builds `$SP/lanes2/final` (not MAIN); the lead applies after an own-eyes check. Details + resume recipe: `notes/round11/AUTOPILOT.md` (last log lines). iCloud evicts node_modules in MAIN (typecheck hung): materialize the needed files, run heavy checks in local clones.

- 2026-11-20: a reboot wiped /private/tmp (scratchpad lanes, patches, tools). Keep lanes in `~/Library/Caches/retrux-lanes/` (local, not iCloud, survives reboots) and mirror patches/logs into `notes/round11/lane_backup/` after every step. AA3 waterline lane started there (user priority: water anti-aliasing perfect).

- 2026-11-20 14:15 AA3 builder done (lane `retrux-lanes/aa3`, frozen copy `aa3_judged`, BASE `aa3_base`; A resolve on mirror lake `?aaresolve=0`, B mirror every moving frame `?slabflash=0` = 20 Hz flash fix, C band TAA `?lktaa=0`; T0 unchanged). It removes the flash and big pops, but the lead's own look and the numbers show it is NOT reference quality (edge error vs the 16-sample GT only −5 %). Lead decisions: L1 G1 judged on MC32/J48 vs GT (the J32 −50 % target is unreachable even for GT); L2 new G1b = edge error vs GT ≥ 40 % lower (AA4 target). Running: workflow `wf_71f302d3-355` (3 judges → fix → recheck on AA3, labs :5181 lane / :5182 BASE) and `wf_9a92526b-5e3` (AA4 explorers: GBAA lane `aa4x` :5191, MLAA lane `aa4y` :5192). Plan: merge AA3 into MAIN after it passes, then the AA4 winner after its own judge; then redeploy Vercel staging. Reports mirror into `notes/round11/lane_backup/{aa3,aa3/judge,aa4x,aa4y}/`. Resume a cut-off run with `Workflow({scriptPath, resumeFromRunId})` (scripts under the session's workflows/scripts/).

- 2026-11-20 15:25 AA4 explorers (GBAA, MLAA) both rejected; G1b replaced by G1c glide (edge-position jerk vs GT) + solid-side error. New defect found: far-floe pale block that pops in (BASE and AA3, not in GT). Running `wf_8a5d29a7-802` (AA5a glide tuning lane `aa5a` :5193 `?lkglide=0`; AA5b far-floe pop lane `aa5b` :5194 `?ffblock=0`) next to the AA3 judge run.

- 2026-11-20 16:30 AA3 judged: flash fix PASS (also real loop), but stepping remains at the near slab/rock waterlines, cost +7..10 % (over the +5 % budget), far-floe pop untouched; not merged. Frozen `aa3_fixed1`; demo of AA3 on :3001 (`aa3_demo`, Next dev). Running AA5a/AA5b (`wf_8a5d29a7-802`) and AA5c perf (`wf_723748b9-c8f`, lane `aa5c` :5195). Next: integrate the adopted AA5 parts onto aa3_fixed1, final 3-lens judge, own-eyes check, merge, Vercel redeploy.

- 2026-11-20 17:10 AA5a (F1 glide, `?lkglide=0`) and AA5b (v3 far-floe guard in Water.ts, `?ffblock=0`) adopted; integration lane `aa6` (:5196) via `wf_6ffae372-91f` (integrate + 2 pre-judges + fixer). AA5c perf `wf_723748b9-c8f` still running. Lead decisions L3-L7 are in that run's args (v3 rest change accepted; J rule = at least GT-5; G4 for F1 vs the unblurred resolve; A-3 knee to measure; A-2 visibility).

- 2026-11-20 18:27 AA5c perf adopted (`?mirrorcost=0`, pixel-identical, ~+5 % total in the real loop, accepted as L8). Next: aa7 = fixed aa6 + aa5c (clean 3-way merge), final 3-lens judge, merge into MAIN, Vercel staging redeploy.

- 2026-11-20 19:55 AA6 fixed (G-1 start snap, R-1, R-2); lead decisions L9 (front-slab crawl on fast paths judged vs the GT's own) and L10 (resolve knee 1.0 with the glide). Lane `aa7` = AA6 + AA5c + L10 (lab :5197, patch in `notes/round11/lane_backup/aa7/lead/`), proven identical where expected; :3001 demo runs it. Final judge `wf_d5c2964b-17d` running (3 lenses + G-3 scale-0.7 investigator -> fixer -> recheck). Use the local playwright-core in `~/Library/Caches/retrux-lanes/pw` (MAIN's copy is iCloud-evicted). Disk was 99 % full: delete analysed captures.

- 2026-11-20 20:15 PAUSED by the user (Mac cleanup) until they say "lanjut". Final judge `wf_d5c2964b-17d` was stopped before any verdict: relaunch it fresh. Everything durable is in `~/RetruxR11Work/` (lanes moved there, `~/Library/Caches/retrux-lanes` is a symlink to it; `sp/` = scratchpad clone with GT / BASE caps, masks, tools; `claude-context/` = transcripts + memory clone) and in the repo (branch `hero-round11`, pushed): briefs in `notes/round11/workflows/args/`, scripts in `notes/round11/workflows/`, tools in `notes/round11/lane_backup/tools_20nov/`. Exact resume steps: last entry of `notes/round11/AUTOPILOT.md`.

Related: [[retrux-mac-machine]], [[hero-interaction-spec]], [[hero-must-be-realtime-not-video]]. Older history: `notes/claude-memory/retrux-hero-project-status.md` in the repo.
