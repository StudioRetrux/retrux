---
name: retrux-hero-project-status
description: "Where the real-time Retrux ice hero lives, how to preview and validate it, and what was still open after the overnight run of 2026-11-10/11"
metadata:
  node_type: memory
  type: project
  originSessionId: 570a569a-5122-4ff1-b51f-d34d42e5fde3
  modified: 2026-11-11T13:56:51.492Z
---

- Engine: vanilla three.js r184 in `retrux-web/app/hero/engine/` (HeroEngine, Rings/IceMaterial, Orb, Shards, Water, PlateEnvironment, PostChain, ui/*, audio/SoundEngine), mounted by `app/hero/HeroExperience.tsx`. The overlay is `app/components/HeroOverlay.tsx`: exact Figma values at 1440x766, fluid below that. Architecture notes are in `app/hero/README.md`.
- Preview: `node hero-lab/serve.mjs` (LAN :5173). Lab flags: `?debug=1`, `?tier=`, `?scale=`. `window.__hero.debug.pose/settle/freeze` give deterministic frames.
- Changing IP or Wi-Fi ("ganti IP/wifi"):
  - The server binds 0.0.0.0, so no restart is needed. Read the new IP with `Get-NetIPAddress` and give the new link.
  - The user switches between home Wi-Fi (192.168.1.x, which Windows marks Public) and the iPhone hotspot (172.20.10.x, marked Private).
  - Both networks work. The node.exe inbound firewall rules allow Private and Public, and the home router does not isolate clients (the Mac answers ping).
  - The "site can't be reached" on 2026-11-10 happened because the Mac and the laptop were on different networks.
- Pipeline and validation live outside the repo in `E:\Retrux Hero R&D\hero-pipeline\`: the Blender bake scripts, headless-Chrome validators against the reference frames, research notes, and tools including node_modules. See its README.
- State after the 2026-11-10/11 overnight run:
  - Ring axes fixed (PCA). Tumble, expand and collapse now match the video poses.
  - Ice rebuilt after Blender Ice.004. Fixed the mesh-crack artefact from the displacement.
  - Water bands, vignette and diffusion tuned by region stats.
  - T0 (Iris 640) runs at 60 fps in every state.
  - `next build` passes. The old R3F components were moved to `_backup\retired-r3f-2026-11-11`.
- State after the 2026-11-11 day run (WIP deploys 1-12 on Vercel, see [[retrux-wip-vercel]]):
  - Idle tumble is motion-captured from Default Loop.mp4: `hero-pipeline/ringfit` (collect_mocap.py merges journals, fit_closed.py, make_hybrid.py, fit_mocap.py -> `engine/hero/ringMocap.ts`). A = Ry(90t)Rx(180t), B = Ry(90t)Rx(-135t) exactly; C/D measured + smoothed; B/C have 8 s tracks. No flat bullseye any more.
  - Cursor ring is an OS cursor image (`public/hero/cursor/*.png`, CSS image-set), so trackpads never lag; the DOM only draws the hold disc.
  - Plate lake reflections are re-aimed through a baked reflection distance (uPlateDepth.b) so the hold dolly shows no "light shaft" streaks.
  - Scored QC (7 independent lens judges, `scratchpad/pipeline/judge_round2.js` / `judge_round3.js` with a lens subset): round 0 6.57, round 1 6.61, round 2 7.13 (composition 7.3, ice 6.1, orb 6.7, env 6.5, grade 7.3, UI 9.2, Awwwards 6.8); round 3 on deploy 17: composition 7.6, ice 6.4, orb 6.8, env 6.7, Awwwards 7.2 (~7.31 with round-2 grade/UI). Last WIP deploy of 2026-11-11: #27 (~20:55).
  - Deploy #27 (~20:55): hold fog bank `plateBank()` in GLSL_PLATE_MIST (plate + far lake, uHold-driven, 1.5-10 m tall, x0.6, cap 0.65). At 0-18 m and x0.75 it washed out whole mountains.
  - Next big wins (from the judges): summit wisp, a second plate baked at the hold-dolly camera (the near floes / rocks still tear in the hold), C/D inner-ring poses at loop t 0.5 and 1.5.
  - Evening 2026-11-11 (deploy #25, ~20:20): the bright seams on the far-left ridge at any pointer offset were the occlusion fill pulling texels 30+ texels right, past the navy mask's soft edge. Fixed by keying the ridge mask at uv0 as well (same-mountain folds only) + plain navy for filled fragments. Seam probe went from 93-103 px to 17-21, the same as the rest pose. Striped floe bands on the near lake at the pointer extremes came from the re-aimed lookup + fill. Fixed by falling back to the straight lookup where the lake point itself is visible.
  - Deploy #26 (~20:45): ice behind ice on T1+ (`QualityProfile.iceBehindIce`, `?ibi=0/1`). The cage is split at the orb's view depth: far half with a discard (ICE_SPLIT define, T1+ only), a copy, then the near half under a strict depth test. Subtle but closer to the reference. It costs ~10-15% fps on this Iris (T1 forced).
  - A ray-march "through proxy holes" experiment (`plateThroughHole`) was reverted. It did not reduce seams, and its loops made D3D shader compiles cost hundreds of MB, so the RAM watchdog killed captures.
  - Probes live in `scratchpad/pipeline/`: `probe_seam4.mjs` (boolean shader tests, or patched fix variants, batched per Chrome session; old programs disposed) and `probe_water.mjs` (lake variants, shards hidden because they drift between runs).
  - Judges contradict each other across rounds (e.g. crisp vs soft ice facets, dark vs light orb rim): weigh against the reference images, not only the latest verdict.
  - T0 on this laptop: ~24 fps at scale 0.85, ~36 fps at 0.6 when the GPU is hot (it throttles after hours of captures).
- 2026-11-12 (user at the office, "keep going until I prompt, 10/10, build it yourself in Blender, no artist file"):
  - Plan / progress file: `scratchpad/DAY_PLAN_2026-11-12.md`; auto-resume cron (session-only) at :17/:47.
  - Round 4 judges on deploy #27 (`scratchpad/pipeline/judge_round4.js`, adds 2 glitch hunters): composition 7.8, ice 5.8, orb 6.5, env 6.4, grade 7.6, Awwwards 7.2; glitch cursor-orbit 4.0, hold sweep 6.3. The reference really is an orbit with strong parallax (near rocks +96 px vs far -133 px), which a single projected plate cannot do without doubles.
  - The milky ice was the orb's HDR bleeding through the mip-blurred refraction copy: fixed by a soft knee in the copy blit (RenderPipeline uKnee 1.5). Deploy #28 (~09:45) = ice overhaul + shards drawn after the rings.
  - Blender v2 environment (copies only): `scratchpad/pipeline/prep_v2.py` (massif split off the ridge and turned 1.53/0.34 deg about the rest camera; volumetric base mist + summit wisp with an emission "multiple-scattering" term), `render_plates_v2.py` / `v3` (cameras rest, hold, orbN, orbP from the engine's CameraRig formula; overscan X 0.15, top 0.20, bottom 0.13), chains `render_v2_all.ps1`, `render_v3_orbits.ps1` (gated by a go_orbits flag), `finalize_v2.ps1`. Plate strips with volumes take ~8.5 min each.
  - Engine multi-projector: PlateEnvironment EXTRA_PROJECTORS (hold, orbN, orbP, orbU since ~14:30; plate_<key>.webp/json optional; `?proj=0` off), PCF visibility, proximity weights; Water does the same per projector. A projector that sees what the others cannot wins it even with a tiny proximity weight.
  - Deploys #31-#32 (13:17, 13:58): B hold = full split held, -74 deg, raised half turned near; release T16 (`bandInner` driver: C/D face-on at F453, band by F460); T06 ridge.
  - Cursor-orbit artefact causes found with `scratchpad/pipeline/probe_envvar.mjs` (patches plate / cloud / water shaders at pointer spots; debug tints by mesh, depth band, fill state):
    - The pale halo above the ridge skyline was the CLOUD cull (clouds discarded wherever the rest projector saw the ridge, so the parallax band lost them). Fix: test the camera ray at the occluder's depth (ray-step).
    - White streaks in the ridge came from cracks in the decimated proxy plus parallax-revealed folds filled from the massif. Fixes: a crack rule (hidden fragment whose camera ray meets the occluder takes uv0) and the navy gate on min(pz, fz).
    - The doubled floe slab in the vertical orbit was on the LAKE: the lake lookup passed the ×1.06 + 0.8 m depth tolerance just behind the slab. Fix: Water `raised` test (rebuild the surface the projector saw; above water means hidden), a forced blurred fill, and the orbU plate.
    - The fill's search direction was NOT the cause (an epipole-oriented search changed nothing).
  - Afternoon 2026-11-12, deploys #33-#39 (round 5 plan in `scratchpad/qc/round5/plan_round5.json`, overall 7.28):
    - Vertical pointer response = nodal pan (CameraRig EL_PAN, clamped to the plate margin per aspect) + 20 % real travel; the hover push-in has its own "tilt" plate (`render_v3_cam.ps1 -Cam tilt`, ~28 min). The reference hover (F160) really is a dolly, not a zoom.
    - Ice "milky veil" root causes: a chamfer-frost bug (max(|vSec|) is ~1 over every broad face, use min), per-ring frost 0.74-0.84, blur lod 1.3-3.4, full interface tint, frosted refl/spec on dimples, orb glow terms. The transmitted image alone already looks like the reference.
    - Hold "explosion" = per-quarter in-plane spin by the quarter's current screen angle; `probe_holdbounds.mjs` checks frame bounds over 32 press moments. `probe_holdvar.mjs` must run up to the press moment continuously (a tau jump right before the press made arrangements non-deterministic).
    - The idle loop's q01 band is ring B; Rings.tune.loopTipDeg tips rings around loop times without pops.
    - Vercel builds can fail transiently on next/font/google (Space Grotesk fetch); just redeploy.
- Evening 2026-11-12 to morning 2026-11-13 (deploys #42-#47; round 6 plan 7.02, round 7 plan 7.38 in `scratchpad/qc/round7/plan_round7.json`):
  - Ghost contours / grey cut-outs in pop and hold were the extra projectors' anti-aliased rims painted on the sky (fixed with a Rim re-projection for every projector) and a cloud card drawn over a far iceberg only the hold projector could see (the cloud cull now asks every projector).
  - The flat, milky ice band in front of the orb was a LENS bug: the refraction bent the view by the ring's whole wall curvature, a 3.2x converging lens, so the band only ever showed the clipped centre of the orb. Bending by facets and bumps only, plus a square-root copy knee instead of the 1.5 ceiling, took the band's sd from 9 to 19 (reference 19). TIR bars need the UNREFRACTED line of sight (a `vCamRing` varying), not the refracted ray.
  - Hold = a 3D swirl via a common hold frame in Rings.tune (holdPitchDeg 20, holdRollDeg -15, bTiltDeg -94, aPhaseOn, holdCompact, aOutH). A yaw makes tall ellipses; the reference's are wide.
  - v4 environment (lower, dimmer, bluer baked base mist, all 5 plates) published 2026-11-13 04:07; v5 (+ a dark navy far-left ridge baked in Blender via `scratchpad/pipeline/prep_v4.py`, a screen-angle-masked rock material) renders with `render_v5_all.ps1` into `blend/v2build5`.
  - Gotchas: swapping a probe plate via `texture.image` must use a FULL-SIZE image (three uses immutable texStorage, so a smaller one only lands in a corner). PowerShell `-File` passes a comma list as ONE string; use `-Command "& 'script.ps1' -Cams a,b"` or the script's default list.
  - A network outage (~22:40-03:40) stalls workflows (agents fail with ENOTFOUND); resume them with `resumeFromRunId`.
- Morning 2026-11-13 (deploy #48 = v5 plates + round-7 fixes; round 8 plan `scratchpad/qc/round8/plan_round8.json`, overall 7.40, glitch cursor 8.7, hold sweep 8.3):
  - The pale stair-stepped "Z" at the massif foot (every frame) was baked by my own prep_v2/v3 split: deleting vertices at y 88 dropped the faces across the cut and the massif then turned rigidly (gap + ledge). Fixed in `pipeline/prep_v6.py` / `prep_v7.py`: centroid split, turn faded in over 12 m from the shared seam loop (KD-tree match of the two boundary loops). v7 also lowers the far-left ridge x0.9 and lightens its rock (`prep_v4b.py`). `pipeline/raycast_plate.py` maps plate pixels to scene objects (skip mist volumes).
  - White cracks on the dark ridge in orbit views = cracks in the 28 %-decimated ridge proxy: `pipeline/export_env_v3.py full=V2_Ridge,V2_Massif`.
  - Lake doubled contours beside near rocks: the ripple-bent lookup landed on the rock (depth-ratio rules pass for lake just behind it). Fix: `<p>SeenY(uv)` (surface height rebuilt from projector depth, `u<P>Frustum` uniforms) in every lake lookup.
  - Edge artefacts can be TIME-dependent (ripples): two captures of the same camera differ by the clock. Use `pipeline/probe_time.mjs` (time sweep) and `line_px.py` (pixel runs) before trusting a single shot.
  - `render_plates_v3.py` has a `crop:x0:y0:x1:y1` mode (2-5 min full-res region renders) to verify a Blender fix before a 2 h full render.
  - Midday 2026-11-13 (deploys #49-#60, v7 plates live; round 9 mean 7.45): bisect environment artefacts with debug-tint variants through `probe_glitch.mjs` / `probe_envvar.mjs` — first a "raw blend out" variant (is it the projection or a post effect?), then each post effect switched off in turn. Found this way:
    - The hold "doubled far range" was the fog bank, gated on the REST projector's depth: sky fragments behind the range took the range's distance. Fix: `skyGate` on the fragment's own distance.
    - The black band at the frame bottom with the pointer low was the LAKE: the plate's near shadow lift was not applied to the lake. Fix: the same lift in Water.ts.
    - The long broken hairlines under the floes at in-between cameras came from the lake's mirror-ray length L read from ONE nearest depth texel. Fix: a 2x2 bilinear L, nearest reflector across edges (`mirrorLGLSL`).
  - Ice body contrast (the lowest lens, 6.4) does NOT respond to refraction-direction tweaks (prism bias, partial macro lens, streak masks, absorption x1.6): each moved sd by ~1-2 of the ~20 needed, or flattened the band in front of the orb again.
  - What did move the ice (deploy #61, `icevar62`): material terms together. These were a directional, thickness-weighted in-scatter (the old uniform add lifted every dark), stronger absorption (0.58/0.28/0.10), brighter highlights on up-facing faces, and a ×1.035 lift so the global mean holds (judges: "do not darken globally").
  - End caps (#63): the long-path absorption at the 1.6 m clamp made flat cobalt. Fix: cap the path at 0.9 m and lift / desaturate tirZone.
  - Hold composition (#62): the hero rises with the dolly via `Rings.tune.holdLift` (0.28 m × camExpand), applied in HeroEngine to the rings, orb, shards and `uOrbCenter`. The camera stays on the hold plate pose. `A_SLOT_SLIDE_DEG [-24, 24, -24, 24]` opens the cage into separate arcs. Always re-check `probe_holdbounds` (16 press moments) after hold tuning: the worst moment, not the standard p06 frame, decides whether arcs leave the frame.
  - Region box "far floes" (x500-800, y470-500) sits mostly behind the lower rings at rest, so its offset tracks the ice, not the floes.
  - Last WIP deploy of 2026-11-13 before round 10: #63 (13:43). Round 10 judges ran on it (`qc/round10`).
- Open:
  - The artist's render .blend never arrived; the v2-v5 scenes approximate it (massif position, mist, ridge).
  - The R3F npm deps are unused (uninstall optional).
  - The E: drive health showed "Warning".

Related: [[hero-must-be-realtime-not-video]], [[laptop-hangs-on-parallel-heavy-jobs]].
