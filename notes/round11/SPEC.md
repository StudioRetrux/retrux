# Round 11 SPEC (binding for every builder, judge and fixer)

Written 2026-11-14 by the lead session on the new Mac. Machine paths below use these names:

| name | path |
|---|---|
| `MAIN` | `/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd` (the user's checkout, branch `hero-round11`; iCloud-synced Documents) |
| `SP` | `/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad` |
| `LANE` | your lane worktree: `$SP/lanes/env`, `$SP/lanes/hold` or `$SP/lanes/ice` (a detached git worktree of `MAIN` HEAD 7ddac0d) |
| `WORK` | your lane's work folder: `$SP/work/env`, `$SP/work/hold`, `$SP/work/ice` |
| `BLENDER` | `/Applications/Blender.app/Contents/MacOS/Blender` (5.2.1 LTS; Cycles **Metal GPU** works: "Apple M4 (GPU - 10 cores)") |
| `BPY` | `/Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13` (has numpy 2.3 + OpenImageIO 3.1: use it, with `-I`, for image statistics) |
| `FFMPEG` | `/opt/homebrew/bin/ffmpeg` |

## 0. The user's words (verbatim, dated)

- 2026-11-14 (this round): **"ok, now continue the development make it have 10/10 score, awwwards worthy, matched with reference, and super magnificent quality, no mistake, use my blender!"** Earlier the same day: "run this website" / "on localhost" (previews are localhost links; no deploys).
- 2026-11-13 16:25, on the Vercel WIP (deploy #70, the state of this repo): "masih kek kontol" (still bad); "press and hold ... berantakan" (a mess); **"kalo digerakin environment nya masih ada yang duplicate ... pake aja blender, bikin di blender"** (when the camera moves the environment still duplicates: just use Blender, build it in Blender); "ini max ultracode".
- 2026-11-11 interaction spec: "intinya samain kaya di video" (match the videos).
  - A single click does nothing.
  - Press-and-hold zooms into the "Dyson sphere" exactly like the video (F331-F442), in slow motion: the two outer rings (A quarters, B halves) open up; every ring keeps moving slowly during the hold, including the inner ones; nothing freezes into a static pose.
  - Ring motion is seamless: no pops, flips or snaps on any interaction.
  - Cursor near the centre: a slight zoom ("dikit aja", ~1.12x, the reference F160 is a dolly). Cursor at the edges orbits / pans the camera.
  - No glitches anywhere; reported ones: doubled mountains when the camera moves; "a weird thing at the bottom of the frame".
- 2026-11-10: "jangan video". The hero is real-time three.js, never a pre-rendered video; a poster only as the no-WebGL fallback.

## 1. Where we are and the target

- Engine: vanilla three.js r184 in `retrux-web/app/hero/engine/` (architecture: `retrux-web/app/hero/README.md`). Lab: `retrux-web/hero-lab/serve.mjs`. Full history: `notes/claude-memory/retrux-hero-project-status.md`, `notes/DAY_PLAN_2026-11-12.md` (items 5a-5g are the newest).
- Round 10 judges (deploy #63): overall **7.53**: composition 8.0, **ice 6.2**, orb/shards 7.0, environment 8.1, grade 7.8, Awwwards 8.1, glitch cursor-orbit 8.7, glitch hold-sweep 7.6. Plan with 23 tasks and the judges' disagreements: `notes/qc/plan_round10.json`. Deploys #64-#70 (after those captures) are in this repo.
- Design work already done for this round (read the parts your lane needs; they are precise, with line numbers that may have drifted a little):
  - `notes/rebuild_analysis/A1_env_audit.md`: the UV-bake environment (what a bake can and cannot reproduce, R1-R10, the engine KEEP/DROP audit, region masks, texel budget).
  - `notes/rebuild_analysis/A2_hold_reference.md`: the press-and-hold reference measured frame by frame (12 rules, key-frame sheets, trajectories, acceptance checklist §10).
  - `notes/rebuild_analysis/A3_hold_code.md`: the hold code map and diagnosis (§5 what must change, §6 what must NOT change).
  - `hero-pipeline/research/blender_forensics.md`: every number taken from the artist's `.blend` (materials node by node, world, water, cameras).
  - `hero-pipeline/research/video_choreography.md`: timings and poses from the videos.
- **Target: every judge lens ≥ 9.0** (the user asks for 10; the skill's ship bar is ≥ 8.5 with all lenses PASS).
- Machine: Apple M4 (10 CPU / 10 GPU cores), 16 GB RAM **shared with the user's Photoshop, Figma, Chrome and Teams** (free RAM is often < 1 GB, 7 GB compressed). Google Chrome is installed. Old laptop (Windows Surface, Iris 640) is retired; scripts were ported (Chrome / ffmpeg / ANGLE paths; `LAB` env for the lab URL).

## 2. Hard rules (all lanes)

1. **Real-time only**, interaction spec above. Reference = `refs/videos/Default Loop.mp4` and `State 2 to 5.mp4` (1440x766, 30 fps), frames in `hero-pipeline/reference/` (`ref_F###.png` = State video, `loop_F###.png` = Default Loop, `figma_hero_2497-2204.png`) and `refs/hold_frames/F328-F472.jpg`. Extract more frames with ffmpeg into `WORK` when you need them.
2. **Work only in your `LANE`.** Do not edit anything under `MAIN` (read it freely). Validators and probes are run FROM `MAIN` (they only talk to a lab URL). If you need a modified validator / probe, copy it to `WORK/tools/` and edit the copy; it can keep resolving playwright-core from `MAIN/hero-pipeline/tools/package.json`.
3. **Heavy processes only through the shared slot** (max 2 heavy processes machine-wide, background QoS):
   `node $SP/slot/slot.mjs run '<lane>:<what>' -- <cmd> [args...]`
   Heavy = headless Chrome / Playwright (every validator and probe), Blender, `next build`, big numpy jobs. Never start Chrome or Blender outside the slot. Hold a slot for ONE batch (captures: a few minutes; a Blender bake stage: that stage). Before Blender, check `memory_pressure | tail -1`; if the free percentage is under 15 %, wait and retry. One Blender process per lane at a time.
4. **Never save over any `.blend` in the repo** (`blender/plate_scene_v7.blend`, the EXPORT zip). Work on copies in `WORK`. Never `bpy.ops.wm.save_mainfile()` on a repo path.
5. **Heavy outputs go to `WORK`** (renders, EXRs, captures, bake intermediates, logs). Only final shipped assets go into `LANE/retrux-web/public/hero/`. `MAIN` lives in iCloud-synced Documents: never write big files there.
6. **No deploys, no git commits / pushes / branch changes, no uploads, no paid generation, no Figma writes.** The lead integrates.
7. **Every change has a way back**: a URL switch that restores the previous behaviour exactly (lane switches in §4), proven by a capture of the switched-off build vs `MAIN`'s baseline lab (mean abs diff ≤ 0.5/255, shard / cloud / ripple drift excluded or frozen).
8. **Follow the reference, no extras.** Nothing the videos do not show (no new veils, halos, openers, scrims, glows "for drama"). Hard edges; contrast from tonal design, not overlays.
9. **Do not break what works**: rest framing, the idle loop (mocap), click inert, the release continuity, the debug API (`__hero.debug.pose/settle/freeze/pointer`, `__hero.rings.clock`, `rings.tune`), the UI overlay, T0 performance. A3 §6 lists the hold-side guards.
10. **Typecheck** before hand-off, in `LANE/retrux-web`: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.hero.json` (and `-p .` if you touched `app/` outside the engine): 0 errors.
11. Keep a dated `WORK/LOG.md` (each attempt, the numbers it measured, the decision) and finish with `LANE/HANDOFF.md`: files changed (with why), switches, assets added (sizes), verification evidence (paths + numbers), what is still open. A fixer appends to both.
12. Stop every server you started (your lane lab) before you finish. Never kill a process you did not start (the main lab on :5173 and the Next dev server on :3000 belong to the lead).

## 3. Tools

- **Lab per lane** (background): `cd LANE/retrux-web && PORT=<port> node hero-lab/serve.mjs`. Ports: **env 5174, hold 5175, ice 5176**. `MAIN`'s lab on **:5173 is the baseline** (HEAD + ported validators, projected environment): compare against it, never stop it.
- **Lab flags**: `?debug=1` (HUD, shader checks) `?tier=T0|T1|T2` `?scale=1` `?proj=0` `?ibi=0|1` `?env=projected|baked`. **Debug API**: `window.__hero.debug.pose(phase, t)`, `.settle(s)`, `.freeze(on)`, `.pointer(nx, ny | null)`; `__hero.rings.clock` (s into the 4 s loop), `__hero.rings.tune` (runtime-tunable).
- **Validators** (`MAIN/hero-pipeline/validate/`, read each header): `shoot_qc.mjs <out> [tier] [scale] [q00,q01,q02,q03,p04,p05,p06,p07,p08,ui]` (engine vs reference cmp/crops), `shoot_pointer.mjs` (10 cursor spots), `shoot_sweep.mjs` (intro, hold/pop/release at pointer extremes, tumble), `probe_interact.mjs` (click inert, continuity), `perf_probe.mjs`. **Probes** (`MAIN/pipeline/`): `probe_holdvar.mjs`, `probe_holdbounds.mjs`, `probe_envvar.mjs`, `probe_icevar.mjs`, `probe_time.mjs`, `probe_glitch.mjs`, `boxstats.py`, `line_px.py`. Point them at your lab: `LAB=http://localhost:<port>`.
  Example: `LAB=http://localhost:5174 node $SP/slot/slot.mjs run 'env:qc' -- node MAIN/hero-pipeline/validate/shoot_qc.mjs WORK/qc1 T1 1 q00,p06`
- Captures at **T1, scale 1, 1440x766** for comparability with rounds 1-10 (also spot-check T2: an M4 Chrome may pick it).
- Image statistics: `BPY -I yourscript.py` (numpy + OpenImageIO), or ffmpeg filters (`blend=all_mode=difference`, `crop`, `hstack`). Always LOOK at full-frame diff maps before trusting an averaged number.
- Blender: `node $SP/slot/slot.mjs run '<lane>:blender' -- BLENDER -b <copy.blend> --python <script.py> -- <args>`. For Cycles GPU in background mode set it in the script: `prefs = bpy.context.preferences.addons['cycles'].preferences; prefs.compute_device_type = 'METAL'; prefs.get_devices(); [setattr(d, 'use', d.type == 'METAL') for d in prefs.devices]; scene.cycles.device = 'GPU'`. Blender startup under load can take 1-2 min.

## 4. Lanes

### 4.1 ENV lane (port 5174): the environment built in Blender, no duplicates from any view

Goal: the environment is real 3D geometry with ONE texture per surface (no camera-projected plates at runtime), made in Blender on this Mac, so no camera move (cursor orbit about ±4.9 deg azimuth / ±1.18 deg elevation, the hover dolly, the hold dolly, the release) can double, tear or ghost anything, while the REST view stays as close to the Cycles plate (and so to F000) as today's projected plates are.

State:
- The engine already has a baked mode: `PlateEnvironment.ts` `PLATE_FRAG` under `#ifdef BAKED_ENV`; `assets.ts` loads `env_baked.json` + `env_baked.glb` + the textures named in the manifest, and uses them **by default when the manifest exists**; `?env=projected` keeps the plates (that is this lane's switch back).
- Bake v8 (`blender/bake_v8/`, made on the old laptop with `pipeline/bake_env_m8.py` + `run_bake_m8.ps1` / `finalize_bake_m8.ps1`, Cycles CPU, about 13 M texels, 256-2048 px per object, PNG) loads and already shows real parallax without doubles in the orbit and hold views.
- **But v8 has defects at rest that the projected plates do not have** (the lead's captures; crops are *projected | baked v8 | reference*: `$SP/cmp_mtn.jpg`, `$SP/cmp_right.jpg`, `$SP/cmp_rocks.jpg`; frames `$SP/qc_baked8/q00_rest.png` vs `$SP/qc_base/q00_rest.png` (T2), pointer views `$SP/ptr_baked8/`):
  1. a hard diagonal seam and loss of the baked base mist along the foot of the dark far-left ridge (light-baked texels next to plate-projected ones), visible AT REST;
  2. bright white 1-3 px specks scattered over the dark ridge;
  3. a dark horizontal line through the far-right range (rest frame about x 1340-1440, y 400-430): confirm and fix;
  4. probable softness from resampling twice (plate → texture → screen): measure sharpness vs projected.
- Not done in baked mode: the lake (Water.ts still re-aims the PLATE's lake; with real geometry the lake should be a true planar mirror of the baked environment + cloud cards + a world-only Nishita sky dome rendered in Blender, `pipeline/render_sky_equirect.py`, A1 #12 / R8; the Cycles water is a perfect mirror with bump, forensics §3.3), the summit wisp card (A1 #2), the BG.001 sky (A1 #4), region masks via the rest camera (A1 §3.7), DOF as a mip bias (A1 #5), dropping projection-only GPU work from the baked path.

Work:
1. Port the bake pipeline to macOS: a zsh runner replacing the .ps1 ones; plates from `LANE/blender/plates_v7/*.exr` (the scripts expect `blend/v2build7`); Cycles on the **Metal GPU**; outputs in `WORK/bake<N>/`. Prove it on a 1-2 object subset first.
2. Find the root cause of each v8 defect with evidence (visibility ray test, N·V gate, edge erosion, source priority / feathering, gain match, proxy cracks, UV bleed / padding / mips), and fix it in the bake (preferred) or the shader.
3. Re-bake (v9) at higher quality now that a GPU is available: at least A1's Balanced texel budget (about 24 M texels; shipped WebP ≤ about 6 MB total), clean light bake (more samples, denoise), and if light-baked texels still look different from plate texels (no mist, different contrast), render **additional plate cameras inside the engine's camera envelope** (Cycles GPU is fast here) so nearly every texel any engine view can see comes from a real plate pixel; static per-texel weights, feathered in UV space (no ghosts by construction).
4. Engine (baked path only; the projected path must stay bit-identical): the true planar-mirror lake (keep the ripples, glint and orb terms), the sky dome for the mirror, the wisp card, cloud cards, region masks, DOF; drop projection-only passes in baked mode (perf).
5. Encode in the plates' encoding (A1 R7: Standard view, exposure -2.158, ED-dithered WebP q90-92, gain 4.4633) and publish `env_baked.json` / `env_baked.glb` / textures into `LANE/retrux-web/public/hero/` (keep every projected asset so `?env=projected` still works).

Gates (the judge checks each):
- **E-G1 rest fidelity**: q00 (and q03) baked vs projected at T1: region means (sky, left mountains, dark ridge, massif, right iceberg, far floes, lake, the four corners) within ±3 levels (8-bit sRGB); no visible seam, mist break, speck or line at rest; the full-frame diff map shows no structured edges outside the lake.
- **E-G2 no glitches from any view**: all 10 `shoot_pointer` spots + the full `shoot_sweep` (hold / pop / release at the pointer extremes): zero doubled silhouettes, specks, hairlines, holes, stretched texels, bottom-of-frame bands; the lake reflections plausible from every view.
- **E-G3 budget**: shipped environment assets ≤ about 6 MB, no frame-time regression > 10 % at T1 vs baseline (`perf_probe`), no shader compile errors.
- **E-G4 way back**: `?env=projected` matches the baseline lab within 0.5/255.

### 4.2 HOLD lane (port 5175): press-and-hold, pop and release like the video

Goal: rebuild the press-and-hold (pop F358 → sustain F372-F442 → release F443-F462) to the reference as specified in `A2_hold_reference.md` (12 rules, key frames §5, trajectories §6, the "why it reads as an exploded opening" §7, acceptance §10), using `A3_hold_code.md` (code map, §5 changes, §6 guards). In the user's words: like the video, in slow motion, every ring keeps moving, seamless, no glitches; today it is "berantakan" (a mess). The lead's capture of today's p06 vs F420: `$SP/qc_base/cmp_p06_sustain.jpg` (engine top, reference bottom).

Notes:
- Make the arrangement deterministic (A3 §5.1): it must not depend on the tumble phase at the press moment beyond small, slow drift; every term multiplied by hold drivers that are exactly 0 at rest; releases fade continuously.
- The hold camera / dolly may change if the reference demands it (A2 §3), but the hold plates of the projected environment are registered to today's `CAM_TARGETS.expand`; the ENV lane is replacing projection with real geometry. If you change the hold camera, gate it so the projected mode keeps today's camera, and say so in HANDOFF.
- The UI-safe frame (A2 §9.3): arcs may touch the frame top / bottom only as the reference does at F436-F444; never leave the frame at 1440x766, 1280x800, 1920x1080 (and check 390x844 portrait does not explode off-screen badly).

Gates:
- **H-G1** A2 §10 checklist at F358, F384, F402-F404, F420, F440-F444, F452-F453, F456, F460: side-by-side engine | reference at the same t, each row PASS within its tolerance (measure the boxes; say which rows miss and by how much).
- **H-G2** `probe_holdbounds` over ≥ 16 press moments: worst-case extents inside the frame at 1440x766 (and 1280x800, 1920x1080).
- **H-G3** `probe_interact`: click inert; no per-frame step > 15 deg in press / release; re-press continuity; live hold watched as a sequence (`shoot_holdseq.mjs` or frames every 2-4 frames) shows continuous, slow, never-frozen motion with exactly one lid over the orb F372-F448.
- **H-G4** way back: `?hold=r10` restores today's hold exactly.
- **H-G5** nothing outside the hold changed: q00-q03 and the pointer spots match the baseline within 0.5/255.

### 4.3 ICE lane (port 5176): ice, orb and shards matched to Cycles, using a Cycles twin

Goal: the ring ice reads like the Cycles reference: clear thick ice with crisp refraction of the horizon and the orb, dark steel-blue internal-reflection bands along the edges, bright cut ends, rough frosty patches (roughness 0.233-1.0 from noise), chiselled lumpy silhouettes (Voronoi cell displacement ±4.9 cm), the tint (0.648, 0.833, 1.0) at each interface (forensics §3.1). Ice is the lowest lens (6.2). The orb (7.0) and shards as seen through and around the ice belong to this lane too (round-10 tasks T01, T08, T09, T10, T14, T17, T18, T19 and disagreements 1-8 in `plan_round10.json`).

Method, "use my blender": build a **Cycles twin** of the hero:
1. From a COPY of `LANE/blender/plate_scene_v7.blend` (the hero objects Circle.025-.032, Icosphere.011, Cube.009/.010 are in it, hidden; its environment matches the v7 plates), unhide the hero with the artist's own `Ice Floes.004` / `Ice Floes blue.002` / `magick_ball_01.002` materials (do not "fix" them; note the Material Output inside group Ice.004, forensics §0.5).
2. Pose the rings, orb and shards EXACTLY as the engine does: dump each object's world matrix from your lab (`__hero` at q00 = idle tau 0, q03 = tau 1.5, and the hold p06 if feasible), convert three → Blender axes (A1 conventions: three (x, y, z) = (x_b, z_b, -y_b), i.e. Blender (x, y, z) = (x_t, -z_t, y_t); check: the orb three (0, 3.0538, -9.1376) = Blender (0, 9.1376, 3.0538)), camera = the engine rest camera (`config.ts REST_CAMERA`, A1 conventions: lens and shift), 1440x766, AgX view as in the file (forensics §1.3), Metal GPU, enough samples + OIDN.
3. Validate the twin against F000 / F045 (it should look like the reference; list the differences and why).
4. Make the engine's ice match the twin at identical pose and camera: measure boxes (mean, sd, edge-band darkness, refraction sharpness, silhouette irregularity) engine vs twin, and change `IceMaterial.ts` (and `Orb.ts`, `Shards.ts`, `RenderPipeline.ts` only where the look demands) until the numbers and side-by-sides converge. Optional, if it beats the procedural approximation: bake per-ring data in Blender that the engine can use (e.g. the chiselled displaced geometry for silhouettes, normal / roughness maps from Blender's exact noise).

Gates:
- **I-G1** twin renders exist for q00 and q03 (and p06 if feasible) with a short validation vs F000 / F045.
- **I-G2** engine vs twin (and vs reference): measured convergence in named boxes (ring body sd and mean, dark edge bands, refraction sharpness, silhouette wobble amplitude), side-by-side crops at q00, q03, p06; no judge-visible "milky / acrylic / plastic" read.
- **I-G3** no new artefacts in the tumble sweep (aliasing, crawling, seams, fireflies); T1 frame time not worse than +10 % (`perf_probe`); T0 still sane.
- **I-G4** way back: `?ice=r10` restores today's ice, orb and shards exactly.

## 5. Integration (lead)

The lead applies each lane's diff (`git -C LANE diff` + new files) onto `MAIN`, resolves overlaps (HeroEngine.ts, RenderPipeline.ts, config.ts, types.ts, assets.ts are the likely shared files; keep shared-file hunks small and list them in HANDOFF.md), runs the full capture set and a judge panel (8 lenses, `pipeline/judge_round4.js` lineage), then a fix round.
