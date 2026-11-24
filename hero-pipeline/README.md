# Hero pipeline

Tools that turn the Blender scene into the web hero's assets, and check the live
three.js hero (`retrux-web/app/hero/engine`) against the Cycles reference videos.

The hero is real-time 3D. Nothing here renders the hero itself for the site. The
Blender jobs bake only the environment the camera sees (plate, panorama, proxies).

## Laptop safety (8 GB machine)

- Run **one heavy job at a time**: Blender, Chrome captures, `next build` and big
  Python jobs must not overlap. Two in parallel froze the laptop twice.
- Start the RAM watchdog first. It kills only these jobs (never the IDE) when
  available RAM drops below 700 MB:
  `powershell -ExecutionPolicy Bypass -File tools\watchdog.ps1`
  Add `-AwakeUntil 2026-11-11T13:00` to also keep Windows from sleeping until then.
- Blender: Cycles only, never EEVEE (it renders black and hangs the iGPU). Use 3
  threads at BelowNormal priority (`run_blender.ps1` handles both). Render in
  strips. Never save over the source `.blend`.

## Layout

| folder | what |
|---|---|
| `blender/` | headless Blender scripts: `export_assets.py` (GLBs, Draco proxies), `prep_plate_scene.py` (decimated render copy of the scene), `render_plates.py` (rest-camera plate in strips, orb panorama), `stitch_plate.py`, plus the PowerShell runners |
| `validate/` | headless-Chrome checks against the running lab (`npm run hero:lab` in `retrux-web`, http://localhost:5173) |
| `tools/` | `playwright-core` + `ffmpeg-static` (`node_modules` is included; `npm ci` restores it), the RAM watchdog |
| `reference/` | frames from `State 2 to 5.mp4` / `Default Loop.mp4` used by the validators |
| `research/` | `blender_forensics.md` (every number taken from the .blend), `video_choreography.md` (timings and poses measured from the videos), `igloo_dossier.md` (reference notes only; no igloo code or assets go into Retrux) |
| `build/` | outputs (renders, logs, captures), safe to delete |

## Rebuilding the environment assets

1. `blender/prep_plate_scene.py` on the source `.blend` writes `build/plate_scene.blend`
   (mountains decimated, hero hidden, clouds camera-invisible).
2. `blender/render_all.ps1 -Strips 4`: plate strips, stitch, then the 1024x512
   panorama at the orb (`pano_orb.exr`). It runs one Blender at a time and logs to
   `build/render_all_status.txt`.
3. `blender/finalize_assets.ps1`: writes the plate (`plate_rest.webp`, 8-bit dithered),
   `plate.json` and `pano_orb.exr` into `retrux-web/public/hero/`.

## Validation

All of these need the lab server running. The capture scripts drive the engine
through `window.__hero.debug` (`pose(phase, t)`, `settle(s)`, `freeze(on)`). Every
frame is deterministic, with no wall-clock timing.

| script | checks |
|---|---|
| `shoot_qc.mjs <out> [tier] [scale] [q00,p06,ui]` | The scored-QC capture set: the rest and Default Loop poses with the ring clock pinned to the reference moment (q00 = F000, q01 = F015, q02 = F030, q03 = F045), the hold / pop / release poses, and the UI overlay vs the Figma frame (`reference/figma_hero_2497-2204.png`). Writes `cmp_*.jpg` and full-resolution `crop_*_<region>.jpg` |
| `shoot_pointer.mjs <out> [tier] [scale] [spots]` | The pointer-driven camera (orbit at the edges and corners, hover push-in) through the debug pointer, each spot with the projection-shadow fill on and off (`cmp_<spot>.jpg`): doubled mountains, plate edges, bottom-of-frame glitches |
| `shoot_sweep.mjs <out> [tier] [scale]` | Glitch sweep: the live intro, hold / pop / release with the pointer at six screen extremes, eight tumble phases; contact sheet `sweep.jpg` |
| `shoot_poses.mjs <out> [tier] [scale] [p00,p06]` | 10 timeline poses vs the reference frames. Writes `cmp_*.jpg` (engine above, reference below) and `crop_*.jpg` (close-ups side by side) |
| `perf_probe.mjs ["tier=T1&scale=1"]` | fps at rest, hold and collapse on this GPU |
| `shoot_ux.mjs <out>` | the visitor flow in the lab: loader, reveal, hover, hold, link cursor |
| `shoot_next.mjs <out> [url]` | the same on the production Next.js page (`next build && next start`) |
| `shoot_mobile.mjs <out>`, `shoot_next_mobile.mjs <out> [url]` | phone portrait / landscape (touch) on the lab / the production page, with an overflow check |
| `region_stats.ps1 -A engine.png -B ref.png` | mean colour of named regions (sky, mountains, water, corners), engine vs reference |
| `probe_rings.mjs`, `probe_ice.mjs` | isolate ring groups, and toggle ice features one at a time (artefact hunts) |
| `dump_glb.mjs <file.glb>` | node hierarchy, rest transforms, animation channels |

Lab URL flags: `?tier=T0|T1|T2`, `?scale=0.75` (pins the render scale), `?debug=1`
(HUD and shader error checks), `?live` (live reload on another device).

Debug API (`window.__hero.debug`): `pose(phase, t)`, `settle(s)`, `freeze(on)`, `pointer(nx, ny | null)`
(pins the pointer as if it kept moving, so the dwell recentre never kicks in). `__hero.rings.clock` sets
the tumble clock (seconds into the 4 s Default Loop).

`probe_interact.mjs` (validate/) presses a click, a hold, a release and a re-press and reports the largest
per-frame ring rotation and driver step of each segment (continuity check; a click must change nothing).

## Ring motion capture (`ringfit/`)

The idle tumble is motion-captured from `Default Loop.mp4`: 40 hero crops (every 3rd frame), per-frame
ellipse fits of rings A-D with `ring_overlay.py` (centre-line radii 185 / 151 / 121 / 97 px around the orb
at (301, 269.5) in the 600x560 crops), then `fit_mocap.py` turns them into looping quaternion keys
(Viterbi sign tracking, parallel transport, twist spread for loop closure, squad resampling) written to
`retrux-web/app/hero/engine/hero/ringMocap.ts`. `test_fit.py` checks the fit on synthetic data.

The 2026-11-11 run, step by step:
1. `collect_mocap.py <journal> [<journal> ...] mocap_raw.json` merges the measuring workflows' journals (a
   later journal wins, so re-runs of failed chunks can be added).
2. `fit_closed.py mocap_raw.json closed_fit.json` fits constant-rate tumbles n(t) = Ry(wy t) Rx(wx t) n0
   (rates in 45 deg/s steps so 4 s closes). A = Ry(90t) Rx(180t) (rms 4.5 deg) and B = Ry(90t) Rx(-135t)
   (rms 6.9 deg) fit; C and D do not (16 / 19 deg; `--nested` tries Ry Rx Rz families, no better).
   `fix_identity.py` checks C / D label swaps (frame-level Viterbi); lf_23 / lf_24 were swapped by hand.
3. `make_hybrid.py mocap_raw.json closed_fit.json hybrid.json AB` writes the A / B fits back as exact
   measurements; `fit_mocap.py hybrid.json out.json ringMocap.ts closed_fit.json AB` then keys A / B from the
   closed form (full rotation, spin included) and C / D from the smoothed measurements. Rings whose 4 s track
   ends turned over get an 8 s track (second half turned over about local X), so the loop has no texture pop.
4. Check against the video with `scratchpad/pipeline/probe_loop.mjs` (engine vs lf_XX at t = 0..3.5).
