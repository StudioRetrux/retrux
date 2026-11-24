# ICE lane log (round 11), builder "ice-twin"

Paths: LANE = `$SP/lanes/ice` (detached worktree at 7ddac0d), WORK = `$SP/work/ice`, lab port 5176,
`SP = /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad`.
Step 1 of 2: SPEC 4.3 method steps 1-3 (gate I-G1): the Cycles twin, its validation, and `ICE_TARGETS.md`.
The engine's look is not changed in this step.

## 2026-11-14

### 16:40 Read the binding documents
- Read SPEC sections 0-3 and 4.3, `blender_forensics.md` sections 0-3, the round-10 plan tasks T01, T08, T09, T10, T14,
  T17, T18, T19 and the 14 disagreements (extract in `WORK/plan10_ice_tasks.txt`).

### 16:44 Source scene inspection (read-only)
- `WORK/twin/src_plate_scene_v7_copy.blend` is a read-only copy of `LANE/blender/plate_scene_v7.blend` (the repo file is
  never opened for writing). Inspection script `tools/inspect_twin_src.py`, result `twin/inspect_src.json`.
- Facts: the hero objects (Circle.025-.032, Icosphere.011, Cube.009/.010) are NOT hidden in the saved file (the plate
  renders hid them at render time only). Materials are the artist's (`Ice Floes.004` x8, `Ice Floes blue.002` x2,
  `magick_ball_01.002` with the drivers `frame/200`, `frame/800`); displacement method BOTH on both ice materials; the
  Material Output sits inside group `Ice.004` as the forensics say (not touched). Render settings in the file: Cycles GPU,
  4096 spp adaptive 0.01, OIDN, bounces 12/4/4/12/vol 0/transparent 8, caustics on, clamp indirect 10, AgX / None /
  exposure 0 / gamma 1 / sRGB. The Wave modifier on Plane.011 and the camera visibility of the clouds are on. The v7
  environment edits are present (V2_Ridge, V2_Massif, V2_BaseMist, V2_SummitWisp). No camera in the file.
- Blender 5.2.1 warns "file written by newer Blender binary (502.45)" (the file was saved by 5.2.3 on the old laptop);
  no visible loss so far.
- Blender 5.2 renders volumes unbiased by default (`volume_biased = False`), so the step-rate settings (4.0 / 256 from
  prep_v7, 1.0 / 1024 in the artist's file) do not apply; the twin sets 1.0 / 1024 anyway for the record.

### 16:47 Engine pose dump (`tools/dump_poses.mjs`, lab :5176, T1, scale 1)
- Same shooting sequence as `shoot_qc.mjs` (pose, settle, pin `rings.tau`, freeze), then at the same frozen moment: the
  frame, a hero-only frame (environment and lake groups hidden at runtime, for masks) and a JSON dump: camera matrices,
  every ring piece's `matrixWorld`, its centroid and first 8 vertices, the ring axes, the orb centre / radius / frame, and
  the shard crystals in world space (SHARD_VERT replicated on the CPU; with uShatter = 0 no hash term is involved).
- Output `engine/dump1/` for q00 (tau 0), q01 (0.5), q02 (1.0), q03 (1.5) and p06 (expand 2.97, tau 1.973 at capture).
  T1 has exactly the 18 authored crystals (2592 vertices = 18 x 48 triangles), no procedural top-up.

### 16:49 Engine -> Blender pose (`tools/twin_pose.py`, run with BPY -I)
- Chain from Rings.ts: world = MW * T(-centroid) * R_front(axis -> +Z) * T(-HERO_CENTER) * M_src(GLB node) * v_glb, with
  v_glb = C * v_blender and M_src = C * M_blender * C^-1, so each Blender object gets
  `M_new = C^-1 * MW * T(-c) * R_front * T(-HERO_CENTER) * M_src * C` (C: Blender -> three, (x, z, -y)).
- Exact check: hero.glb's own vertices pushed through that chain land on the engine's geometry within 1.6e-7 m for all
  8 ring pieces at every pose. The objects keep their own mesh frames, so the artist's object-space frost / Voronoi
  pattern moves rigidly with each piece, exactly as in the .blend.
- Camera: the engine camera's matrixWorld (axes converted) and projection: lens 42.2530 mm (36 mm horizontal fit),
  shift 0 / 0, square pixels. The orb projects to (723.3, 371.6) at q00 (the solved camera put it at (721.1, 369.5):
  the engine's rest camera is ~2 px off the solve) and to (722.8, 406.8) at p06.
- Shards: the engine's world triangles converted to Blender, welded per crystal, in two objects (belt A / belt B) at the
  belt pivot with the original object scale 1.975 (so object-space noise has the artist's scale), artist's material
  `Ice Floes blue.002`, smooth + sharp edges at 30 deg (same result as the "Smooth by Angle" modifier; Blender 5.2's
  geometry-nodes modifier does not expose its inputs as ID properties, so the mesh operation is used).

### 16:51-16:56 Twin test (50 %, 64 spp)
- `tools/twin_render.py` (+ `tools/run_twin.sh`, slot-gated): Metal GPU ("Apple M4 (GPU - 10 cores)"), 1440x766,
  the file's light paths and colour management, OIDN (albedo + normal, accurate prefilter), adaptive 0.01, passes:
  depth, normal, object index (A 1, B 2, C 3, D 4, orb 5, shards 6), diffuse / glossy / transmission direct, indirect,
  colour, emission, environment, volume. Output: AgX PNG + multilayer EXR + JSON.
- 720x383 at 64 spp took 64-75 s at load 18-45 (the user's apps share the GPU). The image reads like the reference:
  lumpy clear rings refracting the horizon, cobalt shards, the orb. Full-resolution beauties at 256 spp are therefore
  ~15-20 min each; diagnostic variants run on a hero border crop.

### 16:57-17:05 Twin beauties q00 (frame 1 = F000) and q03 (frame 46 = loop F045), 1440x766, 256 spp, OIDN
- Full frames take 218 s (q00) and 251 s (q03) on the Metal GPU at load 10-20, much faster than the 50 % test suggested
  (that test was dominated by scene sync under load 45). Posed twin saved as `WORK/twin/twin_q00.blend` (36 MB,
  compressed copy; the repo .blend was never written).
- Look check (`cmp/q00_twin_ref_eng.png`, `cmp/q00_bandA_left_2x.png`, `cmp/q00_bandA_right_2x.png`,
  `cmp/q03_twin_ref_eng.png`): the twin reads like F000 / F045: lumpy, polygonal outlines, clear faces that refract the
  horizon into a mosaic, dark top / bottom edge lines on band A, steel-blue zones on A's right side at q03. The engine
  shows smooth outlines, a uniform pale-blue tint, recognisable clouds inside band A, a milky band over the orb and a
  thin ruler-straight TIR line at the right band end.
- Denoiser check: band-pass (DoG 1-3 px) energy of log luminance, denoised vs noisy pass: 0.3215 vs 0.3241 on the band
  over the orb, 0.1420 vs 0.1473 on B's top arc; the noise floor in flat sky is 0.0087. OIDN does not soften the
  refraction detail, so the twin's sharpness numbers can be used as targets.

### 17:05-17:10 Measurement tool (`tools/ice_stats.py`, `tools/show_stats.py`, configs in `stats/`)
- L = Rec.709 luma on 8-bit sRGB (same as MAIN/pipeline/boxstats.py). Boxes, per-ring masks from the twin's object
  index (eroded 3 px), band profiles across an edge-on band, radial profiles across face-on rings, DoG sharpness,
  twin pass shares, self-segmented cobalt shards (the reference's crystals sit elsewhere).
- Silhouette wobble, first version (gradient tracking from the twin's silhouette +-10 px) was WRONG: drawing the tracked
  points (`cmp/q03_arc_*.png`) showed it hopping onto internal ring edges where the outline has little contrast, which
  inflated the twin to 2.9-5.1 px and the engine's left arc to 6.9 px. Fixed: twin = object-index silhouette (alpha render
  when available), engine = its hero-only capture over black (threshold 22), reference = two-pass gradient track with a
  +-5 px second window; robust degree-6 fit, residual RMS / p95, spectral split (< 24 px vs 24-96 px) and angularity
  (RMS of the 4 px second difference, x100). Verified visually (`cmp/q00_arc_top_v.png`, `cmp/q03_arc_left.png`,
  `cmp/q03_arc_right.png`): twin and engine tracks sit on the outline; F045's track still hops at q03, so reference
  wobble is only quoted for q00's top arc of B (clean track).

### 17:10-17:35 p06 twin, variants and engine backgrounds
- p06 twin beauty (frame 421 = F420) 317 s. At p06 the engine's ring arrangement differs from F420 (hold lane), so p06
  compares twin vs engine at the identical pose; F420 is only a material-level check.
- Engine backgrounds (`tools/bg_capture.mjs`, `engine/bg1/*_bg.png`): same pose sequence, the dump1 clocks restored
  (engine time for clouds / ripples, orb frame, shard clock and belt phases); the re-captured frames equal dump1 within
  1/255 (dither), then rings, orb and shards are hidden at runtime. Debug-only, no engine code touched.
- The env lane's Blender shared the GPU from ~17:11: q00 no-orb took 980 s. The queue was trimmed (q03 / p06 alpha and
  no-orb skipped via `tools/skip.txt`); hero-hidden twin backgrounds (`nohero`) queued after it (`tools/queue2.sh`).
- Orb light share (q00, linear luminance in the twin's ring masks; orb-only render = world and environment dark):
  band A over the orb 89 %, band A sides 11-16 %, rings B / C / D 28 / 20 / 27 %, shards 7 %; the orb's light on the
  rings is teal-cyan (ring B orb-only RGB 0.131 / 0.309 / 0.379). Without the orb the rings stay clear ice with the same
  dark edge lines and joint lines (`cmp/q00_twin_beauty_noorb_orbonly.png`).
- No displacement (BUMP only) at q00: outline wobble RMS 0.77-0.96 px -> 0.30-0.31 px, angularity unchanged (~4: it is
  the coarse SubD-L1 polygon outline), body L / sd / DoG nearly unchanged, band A edge darkness 44.7 / 31.7 -> 48.2 / 51.8
  (the dark edge lines are section refraction, not displacement). `cmp/q00_twin_disp_vs_nodisp.png`.
- Band A joint lines: the twin's two dark vertical lines in band A at q00 sit at x 666 and 799, exactly where ring A's
  quarter cut planes project (x 658-669 and 788-804; all four quarters share one transform at rest). F000's dips are at
  x 584 (-24 L) and 878 (-15 L); the twin has none there. So in Cycles these lines are the quarter joints, and F000's
  "D-shaped TIR bars" are most likely the joints of a ring whose in-plane rotation differs from the engine's q00 pose by
  roughly 45 deg. The engine's line-of-sight TIR bar (x 878, -19.5 L) only coincides with F000 because it was tuned there.
- Engine absorption vs Cycles at the face-on ring B: tint x T = (0.445, 0.694, 1.06) (luma x0.67, B/R 2.38) vs Cycles'
  per-interface tint^2 (0.419, 0.694, 1.0) (x0.66, B/R 2.38). Absorption is not why ring B is too dark; the refraction-copy
  knee (sky blue ~2.3 -> ~1.36), `trans /= 1 + 0.12 max`, the missing teal orb light and the x1.35 chroma are.

### 17:35-17:45 Backgrounds, rim-line mechanism, targets document
- Twin hero-hidden backgrounds (`q00/q03/p06_nohero`, 128 spp, 110-120 s each). With each image measured against its
  own background, the twin and F000 agree within about 5 L at q00 (ring B twin +3.0 L / +9.1 B-R, F000 -2.2 / +8.2
  against the engine background); the engine's ring B is -29.5 / +30.2. Relative to the twin the engine is 17-33 L too
  dark on rings B / C and A's sides at q00, 13-26 L at q03 (A's right side, B, C), 6-26 L on the p06 arcs.
- Rim lines (profile across band A, x 650-860): beauty 44.7 / 48.4 L below the core (top / bottom, measured on a fixed
  y window), no orb 23.7 / 28.5, no displacement 48.3 / 51.9, hero alone over the Nishita world 81.9 / 56.8. They are
  section refraction towards the dark low directions, not displacement and not the orb. Position 0-8 % inside the band
  edge, 10-19 px wide at q00 (F000 the same), ~6 px on band D at q03.
- Mask-based outline wobble with the variants (Table 4 of ICE_TARGETS.md): twin q00 ring B 0.80 / 0.96 px RMS, no
  displacement 0.31, engine 0.49 / 0.61; p06 A's right arc 1.80 vs 1.01 (the first p06 range ran onto B's top edge and
  was cut to 8-40 deg after drawing the track, `cmp/p06_arcs.png`).
- `WORK/ICE_TARGETS.md` written (10 targets ranked by visual impact, diagnosis with engine line numbers, the round-10
  disagreements the twin settles, caveats); its tables are generated by `tools/targets_tables.py` from
  `stats/*_stats.json` (no hand transcription). Typecheck in LANE/retrux-web: 0 errors (no engine file changed).
  Lab :5176 stopped; no Blender of this lane running.

### State at the end of step 1 and next steps (step 2 = SPEC 4.3 step 4)
- Gate I-G1 is met: twin renders for q00, q03 and p06 with validation (ICE_TARGETS.md 1.3).
- Step 2 should work target by target in the ICE_TARGETS order, every change behind `?ice=r10` (way back), measuring
  with the same configs: re-dump the engine after each change with `tools/dump_poses.mjs` (lab :5176), point
  `stats/*_cfg.json` "eng" / "eng_hero" at the new frames and rerun `tools/ice_stats.py`; the twin images, masks and
  backgrounds stay valid as long as the ring poses at q00 / q03 / p06 do not change (check the ring matrices in the new
  dump against `engine/dump1`). For T6 consider the Blender bake of the displaced SubD-L1 geometry (Voronoi cell colour
  at the L1 vertices, object space) instead of procedural noise.

## 2026-11-14, step 2 of 2 (SPEC 4.3 method step 4, gates I-G2..I-G4), builder "ice-match"

### 17:47 Start
- Read SPEC sections 0-3 and 4.3, `LANE/HANDOFF.md`, this log and `ICE_TARGETS.md`. Lab started on :5176 (pid in
  `lab5176.pid`); the shared slot is busy (env lane Blender bake + a hold-lane probe), so design work comes first.

### 17:50 Diagnosis from the forensics (blender_forensics.md 2.2 and 3.1) that changes the plan
- Cycles' ice is a Principled BSDF with **IOR 1.5** (the engine uses 1.31), roughness 0.233-1.0 from Noise A, Bump.001
  (strength 0.2, on frosted patches only) and a fine Bump (Noise B, detail 8, roughness 0.8, strength 0.06).
- The rendered section of every ring is the SubD-L1 **pointed octagon**, a lens about 2.08x deeper than wide:
  normalised by the radial half-width w the vertices are (+-1, 0), (+-0.727, +-1.510), (0, +-2.077). Smooth by Angle 30
  deg makes the two side faces smooth (they meet at 20.4 deg) and the four slopes flat (42 and 75.6 deg edges).
- Worked through by hand with IOR 1.5 (critical angle 41.8 deg): a face-on ring is seen through its two roof slopes
  (normals 38 deg from the axis); the ray refracts in, is totally reflected by the opposite slope and leaves through
  the side faces travelling radially in the ring plane. Through the outer slope it heads for the axis, i.e. the orb: this
  is the twin's 20-28 % teal orb light on rings B / C / D. Through the inner slope it leaves outwards, seeing the zenith
  (dark blue in the panorama, Y 0.15) at 12 o'clock and the dark near lake at 6 o'clock. An edge-on band (A at q00) is
  seen through its smooth side faces (0 to +-10.2 deg): a cylinder lens, f ~ 1.4 m, that images the orb magnified about
  3.7x (the bright band in front of the orb), with total internal reflection on the outer slopes (outer ~14 % of the band
  height on each side): the rays leave steeply (~40 deg) and see dark blue (the dark rim lines).
- The engine squares the section into a superellipse (uSquare 1, flat faces), uses IOR 1.31 and samples the background
  nearly straight through at a fixed 6 m: none of the above can happen. That is the root of T1-T5.
- Panorama check (`r11/pano_view.png`, `tools2/pano_png.py`): zenith Y 0.15 (0.08, 0.15, 0.35), horizon sky 1.7, the
  horizon band 0.33, the lake's sky reflection 1.0-3.7 at -10 to -36 deg, the near lake 0.16 at -72 deg.

### Plan for round 11 (default; `?ice=r10` restores today's ice exactly)
- New fragment path `ICE_R11` in IceMaterial.ts: per fragment a 2D trace through the analytic octagon section (entry
  refraction with the octagon face normal + facets + Blender's two bumps, up to 4 total internal reflections, Fresnel at
  the exit), then the radiance along the exit ray: the orb by an analytic hit (read from the copy at the same impact
  parameter), else the screen copy at a far projection (un-kneed in the shader, so the Orb and Shards keep the kneed
  copy), else the panorama. Roughness 0.233-1.0 blurs the far content by mip level; tint^2 per straight pass. No navy
  masks, TIR bar, end blocks, lantern floor, crack march or x1.35 chroma. Joints as dark lines on the pieces' own cut
  planes (T8). Vertex path: the artist's lens section (uSquare 0) and a cell-constant Voronoi plateau displacement of
  Blender's amplitude (T6). Tunables as vec4 uniforms so variants can be shot without rebuilding.

### 18:05-19:10 Round-11 path, batches s01-s08 (`WORK/r11/sNN/`, tools `WORK/tools2/r11_shoot.mjs`, `mkvar.py`, `r11_stats.py`)
Each batch shoots uniform variants at the frozen q00 / q03 / p06 poses of shoot_qc in one browser session (plus the
background with the hero hidden at the same frozen moment), measured with the step-1 tool (`tools2/ice_stats2.py`, the
twin's object index cached in `r11/idx_*.npy`) against the twin, the reference and round 10 (dump1).
- s01 first light (no shader errors): dark rim lines, the orb through band A, lumpy outlines; but glassy, too sharp, too
  blue. The octagon half-width must come from the axial depth (the split rings' radial extent includes their creased end
  caps, +6.5 %): A 0.2029, B 0.1656, C 0.1325, D 0.1060 m, the forensics' values. Sun specular wrongly x12 (fixed).
- The twin's normal pass across ring B at 12 o'clock (`tools2/exr_probe.py`): flat slopes ~38-40 deg from the view with a
  one-pixel ridge, side faces near grazing: Cycles keeps the octagon's sharp edges. A ray through one roof slope crosses
  to the PARALLEL opposite slope, so a face-on ring is mostly a tinted window (my first hand analysis of total
  reflection there was wrong; the shader's trace finds the right wall).
- s02 (debug view): face-on rings exit straight (green), total reflection only at band A's slopes and ends (blue), the
  orb seen through band A's centre. q00 band A rim lines 41.5 / 31.2 L (twin 44.7 / 31.7, r10 -2.3 / 7.9); ring B dL
  -4.0 (twin +3.0, r10 -29.5). But sd / DoG 2x the twin's and rings C / D too dark and blue.
- s03: knobs (blur, facet tilt, lobe) barely move it: the gap is structural.
- s04: zooms show the twin smoothly warped, mine hard-edged blotches: Cycles smooth-shades the displaced facets (they
  meet at < 30 deg). The Voronoi chisel (hard cell borders) was replaced by a smooth tilt field at the SubD-L1 scale;
  frosted patches blend towards diffuse transmission. Band over the orb L 223 (target 222-232).
- **Tint measured on the twin** (`tools2/tint_probe.py`, no-orb render / hero-hidden render, linear, ring masks): ring /
  background per channel R/B 0.64-0.76, G/B 0.83-0.89 = IceColor applied ONCE per pass (0.648 / 0.833), not squared
  (0.42 / 0.69) as step 1 assumed. s05 with tint once: q00 sculpture L 200.4 / B-R 37.2 (F000 199.3 / 38.5), band over the
  orb L 228.5 / B-R 25.0 / DoG 5.9, A_right dB-R 21.0 (twin 22.0).
- The panorama (`pano_orb.exr`) was rendered from the orb centre with the hero hidden: it holds neither the orb (for
  reflections) nor the orb's image in the lake. s05 adds the orb to the reflection lookup through the reflection lobe;
  s07 adds the orb's mirror image in the lake (y = 0) for rays leaving downwards: the 8 px dark-blue band inside ring C's
  lower arc (L 115-143, B-R ~80, twin 182-224; `tools2/profile.py`) is gone.
- s06: the trace follows the smooth surface (facets + low octaves of the frost bump); octaves finer than ~0.12 m only
  nudge the exit ray and shade the reflection (Cycles averages their per-sample refraction / total-reflection flips).
- s08: the lookup roughness grows at every internal bounce (a reflection widens the lobe ~2x the microfacet spread).
  Growth 3 brings the contrast near the twin: q00 ring C sd 25.1 (twin 19.6, s07 42.6), D 25.5 (17.8 / 42.8), band over
  the orb 24.2 (21.7); q03 A sides 35.6 / 28.6 (29.5 / 21.7). Background-relative values within +-6 of the twin in most
  Table-3 regions (q00 B +5.1/+8.2 vs +3.0/+9.1, C +5.9/+4.8 vs +2.4/+8.6, D -7.5/+6.2 vs -10.3/+11.2; p06 A_right
  -27.7/+22.0 vs -29.8/+22.1); misses: p06 ring B (the white hold orb behind it), q03 D -9. Made the default (uR11B.x 3).
- The hero-only silhouette capture failed for the new ice (it transmits the black clear colour; a flat 4.0 debug fill
  bloomed): flat debug mode 6 at 0.4 is used for masks now.

### Unlogged work of the first attempt (recovered 21:27 from its outputs)
- s09 (`r11/s09/`, 18:53-18:58): plateau step width uR11Ramp 0.25 / 0.15 / 0.40 at q00 / q03 / p06; after it the code
  default became 0.35 (IceMaterial.ts saved 18:58, the last build of that session).
- Way-back captures (`tools2/wayback.mjs`, `r11/wb_main` = MAIN :5173 vs `r11/wb_r10` = lane `?ice=r10`, the dump1
  clocks restored): mean abs diff q00 0.184 / q03 0.449 / p06 0.052 per 255, max 1, no pixel above 2; the hero-hidden
  frames differ by the same dither (q00 bg 0.391, max 1). I-G4 passed for that state (re-run at the end of this step).
- `r11/sweep_r11/` (19:06): shoot_sweep-style frames of the r11 build (intro, hold / pop / release at 6 pointer spots,
  8 tumble taus); not yet compared with the baseline.
- `r11/perf_probe_T1.txt`: 6 fps in both builds: it ran under background QoS and is meaningless (lead decision b).

## 2026-11-14, step 2 resumed (21:26), builder "ice-match", second attempt
- Read SPEC 0-3 / 4.3, HANDOFF.md, this log, ICE_TARGETS.md and `git -C LANE diff` (IceMaterial.ts +493, Rings.ts +27,
  RenderPipeline.ts +4). The switch exists: `ICE_R10` (IceMaterial.ts) gates the shader path (`ICE_R11` define), the
  uniforms, the displacement amplitude and section, the joint uniforms (Rings.ts only touches them when they exist) and
  the ring back-depth pass (RenderPipeline.ts). Lab :5176 restarted (pid in lab5176.pid).

### 21:30-21:41 s10 / s11: the current state re-measured, and a structural gap found
- s10 (`r11/s10/`, code defaults, T1, frozen shoot_qc poses; stats `r11/s10/st_*`): the r11 path is far closer to the twin
  than r10 (q00 band A rim lines 48.6 / 36.3 vs twin 44.7 / 31.7, r10 -2.3 / 7.9; ring B dL / dB-R +5.5 / +8.2 vs +3.0 /
  +9.1, r10 -29.5 / +30.2; q03 band D rims 29.8 / 8.3 vs 49.5 / 35.9). It is now too contrasty and busy: q00 band A right
  sd 21.9 vs 10.7 (DoG 6.4 vs 2.7), A's right end 27.5 vs 10.7, ring D 26.4 vs 17.8; q03 B_right 32.8 vs 22.1; p06 band
  over the orb 38.2 vs 23.5. Side-by-sides `r11/cmp2/q00_s10_sculpt.png`, `q00_s10_bandR_2x.png`, `q03_s10_sculpt.png`,
  `q03_s10_leftA_3x.png` (tool `tools2/sbs.py`): the twin's band A right half is a calm frosted steel-blue slab, r11 shows
  the rings behind it through a clear window; ring A's left side at q03 breaks into crisp-edged islands.
- Batches differ by a few units in orb-lit boxes (the orb's plasma frame and the shard clock are not restored by
  r11_shoot), so variants are only compared within one batch.
- s11 debug views (`cmp2/q03_s11_leftA_dbg_2x.png`, `q00_s11_bandR_dbg_2x.png`): the islands are exit-face switches;
  facet tilt 0 removes most of them but only lowers band A right sd 25.7 -> 22.7 (twin 10.7); bumps off changes nothing.
- Diagnosis: the trace is a straight prism in the entry fragment's section frame, so it ignores the ring's curvature.
  Where a band curves away (band ends, A's sides at q03) a real ray crosses the section at a growing tangential angle,
  meets the inner wall near or past the critical angle and is piped along the ring (hand estimate: x/R 0.82 on band A
  reaches 41 deg at the inner wall). Next: an exact trace through the revolved octagon (walls = cones / cylinders about
  the ring axis, one quadratic per wall).
- GPU frame cost (`tools2/frame_cost2.mjs`, one page, r10 / r11 interleaved by navigation, 3 rounds x 40 frames, render +
  1-px readback, SLOT_BG=0, load 2.8): q00 r10 24.4 / r11 23.4 ms (x0.96), p06 28.6 / 26.2 ms (x0.92). r11 is cheaper
  because it skips the ring back-depth pass. (`tools2/frame_cost.mjs` with two live pages stalls the hidden page.)

### 21:43-22:05 s12-s14: exact revolved trace, blur / lobe defaults, comparable batches
- **Revolved trace** (IceMaterial.ts `r11Wall`, toggle `uR11E.x`, default 1): every wall of the octagon is a surface of
  revolution about the ring axis (cone / cylinder), so the straight 3D ray inside the ring is intersected exactly (one
  quadratic per wall, the first upward crossing wins) and the exit normal uses the radial direction at the hit point. s12
  (rev vs prism, same batch): q00 A's right end sd 17.2 vs 25.7 (twin 10.7), band A rim lines 42.3 / 30.0 vs 48.5 / 37.3
  (twin 44.7 / 31.7), other boxes unchanged; kept. (`cmp2/q00_s12_bandR_2x.png`)
- The twin's variants (`cmp2/q00_twin_variants_bandR_2x.png`): behind band A's right half is a bright snowy massif, yet
  every twin variant shows a uniform steel-blue slab there: the rough interfaces and the fine bump scatter the
  transmitted view by a few degrees (60-90 px for distant content), while surface features stay crisp.
- s13 knobs (one batch): lobe growth 5 lowers the body contrast onto the twin almost everywhere (q00 ring C sd 25.9 ->
  20.7, q03 B_right 33.1 -> 24.5, ring B 27.0 -> 21.8) but lightens q03 rings A / B by 3-5 L; far blur 4000 (max mip 7.5)
  fixes q00 band A right (24.1 -> 15.3) and ring B (14.8 -> 11.9); fine bump 0.03 and reflection 0.5 do nothing useful.
- p06 numbers jumped between batches (band over the orb sd 23 vs 44) because a cobalt shard crossed the box:
  `tools2/r11_shoot.mjs` now restores dump1's clocks with `RESTORE=<dumpDir>` (engine time, orb frame, shard clock and
  belt phases), so shards and the orb's plasma sit where the twin has them. Verified visually (`cmp2/p06_s14_twin.png`).
- s14 (restored clocks): **new defaults uR11A.w 4000, uR11E.y 7.5 (max mip), uR11B.x 5, uR11D.y 0.94** (variant
  L5B40g94). Against the twin: q00 sculpture sd 24.1 (25.1), band over the orb 23.2 (21.7), band A left / right 12.7 / 14.0
  (12.0 / 10.7), ring B sd 11.1 (11.2) dL / dB-R +2.7 / +7.8 (+3.0 / +9.1), ring C 19.3 (19.6) +7.3 / +3.9 (+2.4 / +8.6),
  ring D 19.8 (17.8) -6.6 / +6.3 (-10.3 / +11.2), band rims 42.4 / 34.2 (44.7 / 31.7); q03 A_right_side 27.9 (29.5),
  B_right 23.9 (22.1), ring B 20.7 (21.8), ring C 15.6 (21.9), A_left 23.1 (15.0); p06 ring A 22.3 (26.6) -17.2 / +12.9
  (-18.4 / +15.9), A_right -29.0 / +19.8 (-29.8 / +22.1), A_left -18.1 / +14.0 (-18.3 / +15.1).
- Remaining misses: p06 ring B (-0.4 / +0.6 vs -14.9 / +17.5), B over the orb (+21.8 / -17.8 vs +5.7 / +6.1) and ring C
  (+7.9 / -4.6 vs -4.8 / +9.7) are too light and white where the hold orb (L 247, a white disc) sits behind them -> T7
  next; q03 band D rim lines 20 / 6 (twin 50 / 36, F045 15 / 25); the orb's interior sd 10-19 (twin 24-31).

### 22:00-22:12 s15 / s16: the orb (T7), behind `ORB_R11` (Orb.ts; `?ice=r10` compiles the old source unchanged)
- Orb.ts: `uR11Orb` scales the four fills added over the Cycles plasma (x whole-disc core glow, y hot radial core, z cyan
  limb, w hold outer glow); `uR11OrbB.x` pre-filters the rim (towards the silhouette each march step's sheet coverage
  tends to the mean coverage at that radius). Both only exist under the `ORB_R11` define (set when `?ice=r10` is absent);
  the r10 lines stay textually identical in the `#else` branches. r11_shoot now also applies variant uniforms to the orb
  and shard materials; mkvar's base carries the orb defaults so variants never accumulate.
- s15 (fills 1 / 0.5 / 0 / zero + screen background / core off / hot core off / quarter): fills 0 put the orb on the twin
  (orb L / sd / DoG q00 222 / 34.4 / 4.8 vs twin 224 / 30.7 / 5.1, F000 233 / 24 / 4.8; p06 226 / 38 / 4.6 vs 231 / 30 /
  4.9; with the fills 236 / 18.6 / 2.0 and 246 / 10 / 2.2) and moved p06 rings towards the twin (ring B dL / dB-R -6.7 / +5.3
  vs -0.4 / +0.6, twin -14.9 / +17.5; ring C +2.9 / -0.2 vs +7.9 / -4.6, twin -4.8 / +9.7). Crops `cmp2/orb_s15_q00.png`,
  `cmp2/orb_s15_p06.png`: only fills 0 shows the twin's plasma tongues and clear glass; but the rim then shows per-pixel
  coloured speckle (`cmp2/orb_s15_p06_rim_4x.png`), aliasing of the thin emission sheets that the fills used to hide.
- s16: rim pre-filter 1 removes it (`cmp2/orb_s16_p06_rim_3x.png`, smooth lavender-blue edge like the twin's). Orb L /
  sd / DoG: q00 229.8 / 32.7 / 6.0 (twin 224 / 30.7 / 5.1), q03 229.5 / 31.7 / 6.4 (238.7 / 24.0 / 5.6), p06 229.3 / 38.4 /
  4.9 (231 / 29.7 / 4.9). **Defaults: uR11Orb (0, 0, 0, 0), uR11OrbB.x 1.** T7 targets (rest sd >= 20, DoG >= 4; hold L
  <= 235, sd >= 15) are met; q03 is 9 L darker than the twin (F045 239).
- Next: T8 joints and T6 outlines (silhouette captures), then p06 hue, T9 shards, I-G3 / I-G4.

## 2026-11-15, step 2 resumed (03:50), builder "ice-match", third attempt
- Read SPEC 0-3 / 4.3, HANDOFF.md, this log, ICE_TARGETS.md and `git -C LANE diff` (IceMaterial.ts +594, Orb.ts +36,
  Rings.ts +27, RenderPipeline.ts +4). The second attempt also ran batches s17-s21 (22:09-22:18) that it did not log.
  Recovered from their variant files (`r11/var18-21.json`) and the code comments: s17 = default + hero silhouettes;
  s18 = facet tilt 0.06 / 0, frost bump 0.1, far depth 15 m, joint depth 0.6; s19 = grazing-exit lobe widening uR11E.z
  1 / 3 and panorama blur floor uR11E.w 0.35 / 0.5 (code default now 0.18); s20-s21 = orb mean share uR11F.x 0.5 / 0.8,
  corner rounding uR11F.z 0.10-0.25, the old two-exit stop uR11F.w 1. The code now stops the internal trace on the
  remaining energy (wIn < 0.03) instead of after two exits (the old stop drew closed contour lines on band A). Code
  defaults at 22:18: uR11E (1, 7.5, 0, 0.18), uR11F (0, 0.5, 0, 0); joints (uPieceCuts, depth uR11B.z 0.35) exist.
  The last crop (`r11/cmp2/q00_s21_bandR_2x.png`) still shows a closed contour loop and a legible cloud in band A's right
  half. Lab :5176 restarted (pid in lab5176.pid).

### 03:52-04:12 s22-s26: the current state re-measured, trapped light, the band lens, lobe growth
- s22 (`r11/s22/`, code defaults, T1, dump1 clocks restored, stats `r11/s22/st_*`): close to the twin in most Table-3
  regions at q00 (ring B dL / dB-R +2.1 / +8.8 vs twin +3.0 / +9.1; C +6.5 / +4.9 vs +2.4 / +8.6; D -8.9 / +9.0 vs -10.3 /
  +11.2; band A rim lines 39.8 / 42.2 vs 44.7 / 31.7), but at q03 the rings are 5-8 L too light (ring A -5.4 vs -13.7,
  B -8.7 vs -15.5) and ring A's right side lacks the twin's broad dark steel-blue zone (box L 179 vs 163, F045 155).
  Side-by-sides `r11/cmp3/q00_s22_sculpt.png`, `q00_s22_bandA_2x.png`, `q03_s22_sculpt.png`, `q03_s22_Aright_2x.png`,
  `p06_s22_sculpt.png` (engine | twin | reference): the twin's ice is frosted, chiselled and steel-blue; ours is paler,
  with smooth rounded "liquid" blotches and closed contour loops in band A.
- s23 debug views: the closed loops in band A are fragments whose trace never leaves the ring within 5 bounces
  (debug 1 pure blue: whispering-gallery paths along the curved band); they took the dim rough panorama along the last
  direction. **New `uR11G`** (IceMaterial.ts): x 1 = light still trapped after the trace leaves as frosted transmission
  through the ring (r11Radiance towards -V at lobe roughness y 0.5, gain z 0.9). s24: the loops fade (the lookup matches
  the neighbours' brightness); default on.
- s25: new debug view 7 (the first exit's orb impact parameter, stepped palette). The band lens works (a 2D replica,
  `tools3/lens2d.py`, maps band A's side face to +-0.08 m at the orb, inverted; the shader's view is constant down each
  column), so the plasma "clouds" in front of the orb are the orb's mid-strip under a scrambling facet field.
- s26 lobe growth uR11B.x 5 / 3 / 2 / 1 (stats `r11/s26/st_*`): lower growth brings back the dark steel-blue zones of the
  oblique bands (q03 A_right box L 179 / 172 / 169 / 161, twin 163, F045 155; ring A dL -5.2 / -9.3 / -13.3 / -17.9, twin
  -13.7; ring B -8.4 / -12.1 / -16.0 / -21.2, twin -15.5) but doubles the face-on contrast (q00 ring C sd 19 / 25 / 33 / 40,
  twin 19.6, F000 21.4; D 21 / 26 / 32 / 40, twin 17.8, F000 29.5). 3 is the compromise (next batch builds on it).

### 04:12-04:30 s27-s32: panorama floor, orb softness / share / gain, plateau facets, frosted panorama, grazing exits
- s27 (on lobe growth 3; stats `r11/s27/summary.txt`): panorama blur floor uR11E.w 0.45 removes the legible clouds where
  the copy does not reach (numbers nearly unchanged, band A rims 34 / 35 vs 41 / 42); orb-edge softness uR11C.z 3 and orb
  mean share uR11F.x 0.5 calm the band in front of the orb at q00 (sd 23.0 / 20.5, twin 21.7) but flatten q03's band D
  (10.8 vs 22.9) and weaken the rim lines; not taken. **Defaults now uR11B.x 3, uR11E.w 0.45.**
- s28: facets from the displacement's own cell plateaus (new `uR11H`, analytic gradient of r11Plateau, Blender's
  amplitude): angular "cut glass" facets, DoG up where we are already sharper than the twin, q00 rim lines 34 -> 29 / 21.
  Not taken (uR11H.x default 0; the code stays as an option, it costs nothing while off).
- s29: orb hit gain uR11D.w 0.85 / 0.7: the band in front of the orb q00 227 -> 224 / 220 (F000 222, twin 232), q03 233
  -> 231 / 228 (twin 230), p06 230 -> 227 / 224 (twin 213, F420 210). **Default now uR11D.w 0.85.** p06 ring B over the
  orb stays ~14 L too light and too neutral (debug views s30: nearly the whole band's first exit hits the orb; in the twin
  only its upper part does). Open.
- s31: a panorama share for frosted transmission (uR11G.w): no visible change in band A (few frosted patches there);
  default 0.
- s32: grazing-exit lobe widening uR11E.z 1 / 3: the closed loops' bright outlines soften (`r11/cmp3/q00_s32_left_3x.png`,
  `q00_s32_bandA_2x.png`); 1 puts band A's right half on the twin (sd 10.8 vs 10.7) but weakens the top rim line (33 -> 28,
  twin 45, F000 38); 3 weakens the rims too much (21 / 27).
- T8 joints (`tools2/joint_dips.py`, band A rows 355-395 at q00): engine dips x 669 (-11.4) and x 812 (-10.3), twin x 666
  (-8.1) and x 799 (-7.3), round 10 x 567 / 878 (the line-of-sight bar). The joints sit on the quarters' cut planes in
  their own frame (uPieceCuts), so they follow whatever pose the hold lane gives ring A.
- T6 outlines (s22 silhouettes, `r11/cmp3/q00_s22_sil_top.png`): ring B's top arc 1.24 px RMS / angularity 4.4 (twin 0.80
  / 4.0, F000 1.12 / 7.2, round 10 0.52 / 2.6): the plateau displacement gives the chiselled polyline outline.
- s33 (`r11/s33/summary.txt`, `r11/cmp3/q03_s33_orb.png`): grazing widening 1 + orb mean share 0.3 calms the plasma
  blotches in front of the orb (q00 band sd 25.6 -> 18.4, twin 21.7, F000 17.2; p06 34.5 -> 24.4, twin 23.5) but flattens
  q03's band D in numbers (20.7 -> 10.8, twin 22.9): the twin's band D structure is its rim lines and frost, not the orb's
  plasma, and the crop reads closer to the twin and F045 with the share. **Defaults now uR11E.z 1, uR11F.x 0.3.**
- s34: the orb's rim pre-filter start (new `uR11OrbB.y`, Orb.ts; 0 keeps 0.7): 0.85 / 0.9 thin the lavender rim a little,
  not clearly closer to the twin's (whose orb is fuller and 9 L brighter at q03); default unchanged.
- s35 (`r11/s35/`, code defaults after s33, stats `r11/s35/stats_full.txt`, crops `r11/cmp3/q00_final_4up.png`,
  `q03_final_4up.png`, `p06_final_3up.png`: round 10 | round 11 | twin | reference).
- s36-s37: the orb's cyan limb fill (uR11Orb.z) 0.5 at rest: orb L / sd / DoG q00 230 / 33 / 6.0 -> 235 / 24 / 3.9 (F000 233 /
  24 / 4.8, twin 224 / 31 / 5.1), q03 229 / 32 / 6.4 -> 234 / 23 / 4.3 (F045 239 / 21 / 4.2, twin 239 / 24 / 5.6); the thick
  saturated lavender rim turns pale (`r11/cmp3/q03_s36_orb.png`). In the hold 0.5 made a white disc (p06 240 / 20, batch s37),
  so the limb now mixes from uR11Orb.z (rest) to the new uR11OrbB.z (hold, 0) by uRim (Orb.ts, ORB_R11 only).
  **Defaults now uR11Orb (0, 0, 0.5, 0), uR11OrbB (1, 0, 0, 0).**

### 04:41-04:45 I-G4 way back (re-run on the final code)
- `tools2/wayback.mjs` (dump1 clocks restored): MAIN :5173 (`r11/wb_main2/`) vs the lane with `?ice=r10` (`r11/wb_r10b/`):
  mean abs diff q00 0.300 / q03 0.217 / p06 0.139 per 255, max 1, no pixel above 2; hero-hidden frames 0.334 / 0.447 /
  0.235, max 1. The diff map (`r11/wb2_diff_q00_rest.png`, x16) is the grade's dither in screen tiles, no hero structure.
  Typecheck (tsconfig.hero.json): 0 errors.

### 04:46-05:00 I-G3: tumble sweep, frame-to-frame flicker, frame time
- `shoot_sweep.mjs` (MAIN's validator) on the lane (`r11/sweep_final/`) and on the baseline :5173 (`r11/sweep_base/`), T1
  scale 1: intro, hold / pop / release at 6 pointer spots, 8 tumble phases. Montages `r11/cmp3/sweep_tau_a.png`,
  `sweep_tau_b.png` (baseline | round 11 per phase, 2x downsampled) and `r11/cmp3/sweep_tau275_1x.png`: clear chiselled ice
  in every phase; no fireflies, seams, holes or hairlines seen. No console errors besides the 404 both labs show.
- Temporal check (`tools3/tumble_seq.mjs`, rings stepped one 30 fps frame at a time with everything else frozen, 3 start
  phases x 6 frames; `tools3/flicker.py`): frame-to-frame |d| in the hero box base / r11 3.28 / 3.37, 3.23 / 3.69, 2.33 /
  2.57; its high-pass part (crawl / flicker) 1.24 / 1.38, 1.45 / 1.63, 0.93 / 1.06 (+11-14 %), p99 20-27 / 22-28. The max
  maps (`r11/cmp3/flick_base_1.6.png`, `flick_r11_1.6.png`) show moving feature edges in both, finer and more irregular in
  r11 (the facets and the internal structure), no isolated sparkles. The striped block at the right of the r11 map is the
  grade's per-tile dither on the environment (it also shows in the way-back diff), not the ice.
- Frame time: `tools3/perf_ab.sh` (perf_probe, 6 interleaved pairs per tier, baseline :5173 vs lane :5176, T1 and T0,
  scale 1, SLOT_BG=0, each run waits for a 1-min load below 6) running, results in `r11/perf_ab/`.
- 04:46-04:49: the first timing pair ran while the env lane (`env:perf`, a 6-round batch in one slot hold) and the hold
  lane (`hold:perf`) were timing too: three headless Chromes on one GPU (T1 rest fps base 27.5 / ice 18.9, hold 35.7 /
  32.8, collapse 39.7 / 38.3). Discarded (`r11/perf_ab_shared_try1/`). `tools3/perf_ab.sh` now waits before every run
  until no slot is held by anyone and the 1-min load is below 6 (up to 20 min, else the run is marked "shared").

### 05:05-05:25 Frame time, a cheaper trace, s39
- perf_probe pairs (`r11/perf_ab/`, 3 T1 pairs and 2 T0 pairs before stopping): very noisy because the env and hold lanes
  were timing and capturing at the same moments (my gate only checks at the start of a run): T1 rest ice / base 1.02,
  0.73, 0.66 per pair; T0 is vsync-capped at 60 fps for the baseline (ice 60 at rest, 51 in the hold).
- `tools3/frame_cost3.mjs` (one page, configs interleaved over 4 rounds, every frame rendered with a 1-px readback, i.e.
  GPU-synced, frozen q00 / q03 / p06; run through the slot at normal QoS, the env lane timing in parallel): round 10 vs
  the current round 11 x1.036 / x1.029 / x1.057. New cost knobs `uR11I` (stop threshold on the energy left inside, max
  walls, reuse of the last exit's radiance for the small remainder): (0.08, 5, 1) x1.044 / x0.951 / x0.998,
  (0.08, 4, 1) x1.039 / x0.954 / x0.986, (0.15, 3, 1) x0.997 / x0.956 / x0.995 (`r11/fc39_excl.txt`).
- s39 (`r11/s39/summary.txt`): (0.08, 5, 1) moves the hero box by 0.31 / 0.71 / 0.70 per 255 on average (diff maps
  `r11/cmp3/s39_diff_a08.png`: no structure), every Table number within about 1 unit except q03's A_right radial dark line
  46.7 -> 51.2 (twin 54.5). **Default now uR11I (0.08, 5, 1, 0).**

### 05:27-05:50 Final batch s40, tiers, T0 keeps the round-10 hero
- s40 (`r11/s40/`, final defaults, T1, stats `r11/s40/stats_full.txt`, I-G2 tables `r11/s40/ig2_table.md` from
  `tools3/ig2_table.py`). The outline numbers of round 11 in that table are inflated where cobalt shards cross the ring
  outline in the silhouette capture (`r11/cmp3/q03_s40_sil_left.png`: a shard crosses ring A's left edge); the twin's
  come from its object index (rings only). The outline itself is the chiselled polyline.
- T2 / T0 spot checks (`r11/tier_T2/`, `r11/tier_T0/`, baselines `r11/tier_T2_base/`, `r11/tier_T0_base/`, montage
  `r11/cmp3/tiers_q00.png`): T2 looks the same as T1 (the round-11 path does not depend on the tier) and is much cheaper
  than the baseline's T2 (frozen-frame fps 44 / 38 vs 14 / 12 at q03 / p06: the round-10 T2 ice marches 8 steps with
  dispersion); T0 r11 looked sane but cost more.
- `tools3/frame_cost3.mjs` at T0 (`r11/fc41_T0.json`): round 10 14.5 / 14.9 / 17.9 ms, round 11 x1.45 / x1.44 / x1.26; the
  cheaper trace knobs do not help (x1.40-1.55): the base cost of the traced section breaks T0's budget. **T0 now keeps
  the round-10 hero**: `iceR11(quality)` (IceMaterial.ts) = not `?ice=r10` and ice march steps > 2, used for the shader
  define, the uniforms, the section and displacement, and RenderPipeline's back-depth pass; Orb.ts compiles ORB_R11 only
  when the orb has more than 8 march steps (T1 16, T2 24; T0 8). Proof (`tools2/wayback.mjs` at T0, lane default vs MAIN
  :5173): mean 0.430 / 0.018 / 0.474 per 255, max 31 at 0.024 % of the pixels, scattered over the lake; MAIN against itself
  at T0 differs the same way (0.055 / 0.288 / 0.231, max 29, 0.014 %), so that is T0's own run-to-run noise. `?ice=r10` at
  T1 re-checked after the change: 0.488 / 0.063 / 0.053, max 1.
- A T1 frame-cost run during heavy contention (`r11/fc41_T1.json`) was unusable: MAIN's baseline, code-identical to
  `?ice=r10`, came out x1.48-1.58 slower than it. Re-run with two configs and finer interleaving (`r11/fc42_T1.json`).
- s43 (p06 only read): a lower orb gain through the ice in the hold, uR11D.w 0.6 / 0.45: band over the orb 232 -> 226 /
  221 (twin 213, F420 210), ring B dL -0.8 -> -4.9 / -8.5 (twin -14.9), B over the orb +20.4 -> +14.2 / +8.5 (twin +5.7),
  ring C +6.4 -> +2.6 / -1.0 (twin -4.8), but ring A's top arc -14.8 -> -18.8 / -21.7 (twin -13.7). The orb light is not
  too strong overall; ring B's band sees it through its whole height (debug s30) where the twin sees it only through the
  upper part. A geometric cause, not taken as a gain hack; open.
- 05:57-06:08: the exclusivity gate waited 10 min (the env lane's timing batch and the hold lane's judge captures kept two
  slots busy), so the fine-interleaved T1 frame-cost run (`r11/fc42_T1.json`: lane `?ice=r10` vs lane default, 8 rounds,
  q00 / p06) started shared at 06:07. The perf_probe pairs then run with the lead's criterion only (1-min load below 6),
  not waiting for an empty slot, so they include the other lanes' load like every other measurement on this machine
  today; interleaving keeps that load on both sides.
- Final T1 GPU frame cost (`r11/fc42_T1.txt`, `tools3/frame_cost3.mjs`, one page, lane `?ice=r10` vs lane default
  alternating over 8 rounds, 30 GPU-synced frames per sample, frozen q00 / p06): round 10 25.5 / 29.6 ms, round 11 24.4 /
  28.0 ms (x0.957 / x0.946). The round-11 ice skips the back-depth pass and the round-10 march, so it is a little cheaper.
- 06:09: perf_probe pairs started (`tools3/perf_ab.sh r11/perf_ab 6 T1 T0`, WAITMAX 20 s: load-gated only).
- 06:09-06:46 perf_probe, 6 interleaved pairs per tier (`r11/perf_ab/`, `r11/perf_ab/summary.md`), every start at a 1-min
  load of 2.7-5.9, 20 of 24 while other lanes held slots: medians T1 rest ice / base x0.978 fps (35.2 vs 36.0 ms), hold
  x1.35, collapse x1.25, worst frames equal (83 / 83, 83 / 83, 67 / 67 ms); T0 x1.00 (vsync 60; identical code). Per-pair
  ratios 0.49-2.63 (T1) and 0.61-1.46 (T0, an A/A test): single pairs are noise on this shared machine.

### 06:47 End of step 2 (third attempt): state
- Gates: I-G4 PASS (`?ice=r10` and T0 equal the baseline within dither / T0's own noise), I-G3 PASS (no new artefacts in
  the sweep or the frame-step check; T1 GPU frame cost x0.95 of round 10, perf_probe medians not slower), I-G2: converged at
  rest (q00: every ring within +-6 L / +-6 B-R of the twin, band in front of the orb on target, joints on the cut planes,
  chiselled outlines), partly at q03 (rings 4-5 L too light, 5-6 B-R less blue), misses in the hold (p06 rings B / C and
  the band over the orb 11-15 L too light and too neutral, a geometric cause, s43) and in texture (no fine frost; smoother,
  rounder "liquid" patches). Final numbers `r11/s40/ig2_table.md`; hand-off `LANE/HANDOFF.md`.
- Lab :5176 stopped; MAIN's :5173 untouched; typecheck 0 errors; nothing committed or uploaded; no Blender in this step.
- Next (for a fixer): (1) the frost / facet texture (stochastic multi-sample trace or a Blender-baked frost normal map),
  (2) p06 ring B's band seeing the orb through its whole height (start with debug view 7 on ring B's halves in the hold),
  (3) q03's 4-5 L, (4) the rim-line depth, (5) shards (T9).

## 2026-11-15, Fix round (fixer after judge 1: I-G2 FAIL, I-G3 FAIL)

Inputs read: SPEC 0-3 / 4.3, AUTOPILOT, HANDOFF.md, this log, `judge1/verdict_draft.md` and the judge's tools
(`judge1/tools/`: jshoot.mjs, jstep.py, jstats.py, jrim.py, jstep_seq.py, tumblevals.py). Lead decisions (1)-(6) apply;
for this lane: ICE renders and does not change poses (decision 3), so the user's hold-motion priority (decision 6) is
the HOLD lane's; this lane must keep every ring's hold motion identical to the baseline (judge: PASS) and stay seamless.
Findings to fix, in order: (a) MAJOR aliased "camouflage" islands (hard 1-px steps 283 / 419 / 279 per 10k ring px vs
r10 48 / 50 / 41), root-caused by the judge to hard per-pixel switches in the trace (exit face, orb hit / miss, TIR
count, the no-exit fallback); (e) MAJOR values (q03 and the tumble too pale / neutral, p06 B / C too light); (d) MAJOR no
frost; minors (b) capsule / eyes on band A, (c) dark specks at p06, (f) orb limb + busy hold plasma, (h) weak rim lines,
shards untouched, frame-time claim; nits (joint seam switches in one frame, orb uR11 uniforms on every path).

### 10:06 Start
- Lab :5176 started by me (pid in `lab5176.pid`, log `lab5176_fix.log`). Load 4.3, memory free 47 %.

### 10:08-10:25 f01 / f02: the islands reproduced, root causes, continuity options (`fix/f01`, `fix/f02`)
- Tools (new, `fix/tools/`): `fstat.py` (the judge's ring masks and definitions: ring dL / dB-R vs own background, sd, DoG,
  and the judge's hard 1-px step count per 10k ring px, > 15 L and > 8 L), `stepmap.py` (marks those steps in red on a
  crop), `mkv.py` (variant files with every uniform reset per variant), `sbs.sh` (side-by-side crops). Captures with the
  builder's `tools2/r11_shoot.mjs`, `RESTORE=engine/dump1` (the twin's clocks), T1 scale 1, through the slot.
- Reproduced: the judged build's hard steps 300 / 364 / 286 per 10k ring px at q00 / q03 / p06 (judge: 283 / 419 / 279
  with its own capture; r10 48 / 50 / 41, twin 15 / 14 / 8). Step map `fix/f01/q03_v0_steps.png`, debug views
  `fix/f01/q03_Aright_dbg.png`: the islands' edges are (1) the exit wall switching at the octagon's sharp corners,
  (2) the critical angle: one pixel refracts out, its neighbour is totally reflected and its light leaves elsewhere,
  (3) the remainder switch (no exit -> trapped -V lookup, one exit -> the last exit's radiance for everything left),
  (4) the hard energy stop (wIn < 0.08), (5) Bump.001's ramp switching the frost bump on / off along Noise A's iso-lines
  (closed "drop" contours), (6) the lobe growth jumping when a ray starts to graze a curved wall.
- f01 (runtime uniforms only): corner rounding uR11F.z 0.15 / 0.3 cuts the steps to 122 / 98 (q00), 174 / 181 (q03),
  102 / 110 (p06); the remainder switch alone (uR11I.z 0) does little.
- Code (IceMaterial.ts, round-11 path only, new uniforms `uR11J`, `uR11K`, every option 0 = the judged build; new URL
  switch `?ice=r11a` = the judged build exactly): J.x continuous energy bookkeeping (soft stop, remainder always leaves),
  J.y critical-angle smoothing (Fresnel averaged over +-J.y x lobe alpha, light beyond the critical angle leaves grazing),
  J.z wall-corner rounding per lobe footprint, J.w incidence-weighted lobe growth, K.x Bump.001 ramp filtered at the
  pixel footprint, K.y entry corners rounded over K.y pixel footprints, K.w face-on lobe growth scale.
- f02 (one batch, judged = `r11a` variant): hard steps r11a 301 / 363 / 286 -> all options 59 / 81 / 57 (r10 48 / 50 / 41);
  without J.y 114 / 163 / 106 (critical-angle smoothing is the largest single term); F.z 0.3 44 / 74 / 52. Crop
  `fix/f02/q03_Aright_r11a_fx_twin_ref.png`: the islands are gone, but ring A at q03 turned pale (dL +2.8 vs twin -8.0,
  F045 -12.8): the dark steel-blue internal-reflection band lost its depth, because the remainder of the trapped light
  now always took the bright frosted lookup. Next: J.x 2 (the remainder leaves like the exits so far, fading to the trapped
  lookup only when nothing has left), then lobe growth for the values.

### 10:26-10:45 f03-f12: values, the remainder, frost octaves, far blur, one-sided smoothing (`fix/f03` .. `fix/f12`)
- f03: J.x 2 (the light still inside leaves like the exits so far, fading to the trapped lookup only when nothing has
  left) changes little (q03 ring A dL +3.5 vs +3.0 with J.x 1). Lobe growth 3 / 2 / 1.5 barely moves q03 ring A once the
  islands are gone.
- f04: smoothing width from the material roughness (J.y < 0) instead of the grown lobe: q03 ring A -0.6 / -2.5 (with
  growth 1.5 oblique, 3 face-on: new knob K.w, split by |V . ring axis|), but steps 124-142 at q03. Grazing-exit widening
  off (E.z 0) and the panorama floor (E.w) do not matter.
- f05 / f06 / f12 component knock-outs (q03 / p06): the orb through the ice is NOT what makes p06 ring B too light (orb
  gain 0.85 -> 0.6: B -3 L; lobe width C.z 1 -> 0: B -3 L); the light still inside after the trace (the remainder /
  trapped lookup) is: G.z 0 makes p06 B -13 L and q03 A -23 L darker. Debug view 7 at p06 (`fix/f06/p06_d7.png`): most
  of the band's first exits pass the orb at > 0.6 radius (lobe only).
- f08: dropping the light left after the last wall (Cycles' glossy bounce limit 4 in the artist's file; new L.x) puts q03
  rings A / B on the twin (-10.6 / -10.3 vs -7.9 / -11.5) but draws black streaks (`fix/f08/q00_c_l1_twin.png`):
  rejected as a hard drop.
- Twin passes (`fix/tools/twinpass.py`, `twinpassimg.py`, `fix/f08/twin_q03_passes.png`): ring A at q03 is 88 %
  transmission, 10 % glossy; the twin's frost lives in the transmission pass (cloudy, granular everywhere). Blender's
  Bump.001 (strength 0.2 on Noise A's ramp, 8 octaves, roughness 0.5) tilts the normal by about 10-13 deg at every scale,
  so the path inside changes at the frost's own scale.
- f09: the trace seeing the frost octaves down to 3 / 1.5 cm (new K.z) changes nothing measurable while the lookups are
  blurred to mip 7.5; f10: less far blur (A.w 100 / 30 / 10) brings texture back but reads as crumpled glass, not frost,
  and raises the steps (q03 122 -> 145-149); A.w stays 4000 (`fix/f10/q00_bandA_L_3.png`, `q03_c_aw30_aw10_twin.png`).
- f11: one-sided critical-angle smoothing (new L.y 1: total reflection stays total, the reflected share ramps from 1 to
  Fresnel's over dc below the critical angle, so no light leaks out grazing) with the grown-lobe width J.y 3: hard steps
  40.7 / 80.4 / 47.9 (q00 / q03 / p06; r10 48 / 50 / 41; judged 300 / 364 / 286); q00 sd C 20.7 / D 21.6 (twin 19.7 /
  17.7); q03 ring A dL -1.7 (twin -7.3), B -7.4 (-11.1); p06 A -13.0 (-11.9), B +0.3 (-14.0), C +11.1 (-4.4).
- Next: the trapped gain G.z (0.9) at 0.7 / 0.5 / 0.3 on top of os3 for q03 / p06 B / C.

### 10:45-11:03 f13-f15: trapped gain, defaults, the orb (finding f)
- f13 (on the one-sided smoothing, J.y 3): trapped gain G.z 0.9 / 0.7 / 0.5 / 0.3: q03 ring A dL -3.8 / -6.4 / -9.6 /
  -14.0 (twin -9.9, F045 -14.9), B -8.4 / -10.0 / -11.9 / -14.4 (twin -12.8, F045 -18.8); q00 B +0.8 / -0.8 / -2.6 / -5.0
  (twin +3.1, F000 -2.2); hard steps q00 41 / 55 / 70 / 73, q03 81 / 92 / 97 / 101, p06 47 / 57 / 65 / 66. Crops
  `fix/f13/q03_r11a_gz5_twin_ref.png`, `q00_r11a_gz5_twin_ref.png`: soft steel-blue zones, no islands. Step map
  `fix/f13/q03_gz5_steps.png`: what is left are ring outlines over other rings (geometry edges, no MSAA, as in round 10),
  the joint lines and the orb's plasma lines seen through ring D. Chosen G.z 0.6 (between the values and the steps).
- Code defaults now (IceMaterial.ts r11Uniforms, `?ice=r11a` keeps the judged ones): uR11B.x 1.5 (oblique) with uR11K.w 2
  (x 3 face-on), uR11F.z 0.15, uR11G.z 0.6, uR11J (2, 3, 1, 1), uR11K (1, 1.5, 0.03, 2), uR11L (0, 1, 0, 0).
- Orb (finding f), Orb.ts under ORB_R11, new uniform uR11OrbC (x hold core glow, y glass-shell band start, z / w cyan limb
  start / inner end; all 0 = the judged build): f14 the thin shell band (0.95) alone changes nothing visible; f15 the limb at
  1.0 over 0.7-0.9 of the radius replaces the broad lavender-grey limb with the twin's bright disc and thin rim (q03 orb
  L / sd 236.3 / 21.3 -> 238.6 / 17.1; twin 240.5 / 21.8; F045 240.3 / 19.6; crop `fix/f15/q03_orb.png`); the rim
  pre-filter must stay (off: speckle). The hold orb's sd hardly moves with a core glow (0.3: 37.0 -> 36.0); kept 0.4 as a
  small step towards F420 (sd 14.6; twin 29.1). The orb's round-11 uniforms now exist only when ORB_R11 is compiled (judge
  nit: they were created on every path).
- Not changed: the joint-seam switch within one frame at the release end (judge nit). It lives in Rings.ts (shared with the
  hold lane, which rewrites the release); the judge reads it as the gap closing. Left for the integration.

### 13:56 Fix round resumed (second fixer attempt; the first was cut off at about 11:08 by the usage limit)
- Read SPEC 0-3 / 4.3, HANDOFF.md, this log, judge1/verdict_draft.md. The lab :5176 was not running (pid 56817 gone).
  Load 5.97, memory free 36 %.
- Unlogged state of the first attempt: IceMaterial.ts was saved at 11:06:45 with a new option `uR11L.z` (direction of the
  trapped lookup: 0 = -V as before, 1 = the light's last direction inside the ring); default 0, so the default build is
  the f15 state. Batches `fix/f16` (uR11H.x plateau facets, uR11A.y facet tilt 0.2 / 0.3) and `fix/f17` (uR11L.z 0.5 / 1,
  with uR11G.z 0.8 and uR11G.y 0.8) were shot but not evaluated. `fix/stats/*_fix.txt` (11:03) is the f15 default state:
  hard steps > 15 L 61.5 / 111.6 / 52.1 per 10k ring px at q00 / q03 / p06 (r10 45.7 / 53.1 / 38.7).
- Plan: evaluate f16 / f17, then (e) values at q03 and in the hold (p06 B / C), (d) frost, (c) specks, (h) rim lines,
  (g) shards, then re-run I-G2 / I-G3 (plus I-G4, T0 / T2, probe_interact, perf, typecheck).

### 14:05-14:25 g01-g03: what makes the hold's ring B / C too light (`fix2/g01` .. `g03`, tools `fix2/tools/`)
- g01 debug views at p06 (`fix2/look/g01_p06_B_dbg.png`): the band of ring B in front of the orb is the first exit seeing
  the orb (view 1 yellow, view 7 impact < 0.6); without the trapped term (uR11G.z 0) its middle stays white and its ends go
  black. Relative-value map vs the twin (`fix2/tools/dmap.py`, `fix2/look/dmap_p06_v0.png`): ring B +12.4 L / -16.1 B-R,
  C +14.0 / -15.4, mostly the band in front of the orb and to its right; ring A -1.9 / -0.8.
- 2x crop (`fix2/look/p06_Borb_2x.png`): ours blows the orb out to white through the band; the twin's band there is pale
  teal frosted ice. Twin linear values (`fix2/tools/twinlin.py`, `twinratio.py`): band over the orb (0.72, 1.86, 3.05)
  against the sky behind it (0.87, 1.30, 2.46); the orb itself about (0.64, 4.57, 4.50), i.e. at Cycles' indirect clamp
  (the artist's file: clamp indirect 10, forensics 1.3); the deep-blue zone right of the orb passes 0.18 / 0.25 / 0.26 of
  the sky; band B's left part 0.33 / 0.56 / 0.81 (= tint^2). Our copy's orb core is 16-32 (RenderPipeline comment), the
  ice reads it unclamped.
- g02 (trapped-light drop uR11L.x 0.5 / 1, one- or two-sided smoothing): L.x 1 one-sided darkens everything by 20-50 L
  (black streaks); two-sided brings it back to v0; L.x 0.5 fixes p06 B / C (-8.1 / +2.9 vs F420 -8.4 / +2.4) but makes q00 /
  q03 / p06 A 10-20 L too dark. Not taken.
- g03 (orb terms): uR11D.w 0.6 B -1.9 -> -6.2, A -17.4 -> -19.8; a wider orb lobe (C.z 2 / 4) makes B lighter; F.x 0.8 no
  help. Not taken.
- Code (IceMaterial.ts, round-11 path, new uniform uR11M, all 0 = the first fix-round state; `?ice=r11a` keeps 0):
  M.x Cycles' indirect clamp for the orb seen through / off the ice (r11ClampOrb: r + g + b of the sample after the ice's
  throughput <= M.x; applied in r11Radiance, r11LakeOrb, r11Reflect), M.y extra IceColor tint on the trapped lookup.
  Next: g04 = M.x 10 / 6, M.y 1.

### 14:25-15:05 g04-g12: Cycles' indirect clamp, trapped tint, frost tries, pixel-footprint smoothing, rims
(Values below are ring dL / dB-R against the ring's own hero-hidden background, `fix/tools/fstat.py`; its shard mask
depends on the frames in the run, so ring C at q00 moves by up to 6 L between runs: compare within a run only.)
- g04 uR11M.x (orb clamp) / M.y (trapped tint): clamp 6 + tint 1 = p06 B -1.9 -> -6.5 (twin -10.1, F420 -9.0), C +12.0 ->
  +2.9 (twin -3.0, F420 +3.1), B dB-R +0.9 -> +5.6; q03 A -8.0 / +17.2 (twin -7.5 / +18.1), B -12.9 / +12.5 (twin -12.9 /
  +13.4); hard steps q03 99 -> 84, p06 61 -> 46; p06 A -15.6 -> -20.5 (twin -14.6). Clamp 10 alone moves p06 B by 3 L only:
  our lookups are pixel averages, and Cycles clamps per sample (E[min(X, 10)] < min(E[X], 10)), so 6 on the mean stands for
  10 per sample. Crop `fix2/look/p06_c6t1_twin.png`: the band in front of the orb is pale teal, no longer blown out.
- g05 the fine bump in the trace's entry normal (frost by the path): grain appears but hard steps rise 54 -> 77 / 105 / 146
  (strength 2 / 4 / 8). Removed. g06 frost as roughness (M.z / M.w: the bumps' sub-pixel scatter added to the GGX alpha):
  smoother (sd down, away from the twin's sd), mixed steps. Kept as an option, off. g07 a band-limited grain from the fine
  bump's gradient: too weak to matter (D unchanged). Removed. f16 re-evaluated: plateau facets (uR11H.x) double the steps.
- g08 specks at p06 (`fix2/look/g08_specks_dbg.png`): dark 2-3 px dots where the first exit wall switches in tiny islands
  (debug view 2 red dots, view 1 cyan "eyes") at extrema of the facet field. NOTE: the hold pose depends on what was shot
  before it (the tumble phase at the press): always shoot q00,q03,p06 together to get the dump1 pose.
- g09 uR11N.x = critical-angle ramp widened by N.x x the entry normal's change across the pixel (fwidth-style, outside the
  loop): N.x 1: steps q00 54 -> 54, q03 84 -> 75, p06 45 -> 39; N.x 3 better at q03 / p06 but darkens q00 B. N.y (corner
  rounding by the same) no gain.
- g10 uR11N.z = the orb's sharp sample blurred by the lobe's footprint at the orb: steps q00 53 -> 50, small value moves.
- g11 trapped gain uR11G.z 0.6 / 0.45 / 0.3: rims q00 band A 20.6 / 33.2 -> 22.9 / 37.9 -> 25.9 / 44.3 (twin 46 / 59, F000 36
  / 50); q03 band D's top rim stays ~0; steps fine (N.x 1 removed the step penalty of a lower G.z). Chosen 0.45.
- g12 on that: K.w 1 (no extra face-on lobe growth) puts p06 A on the twin (-19.8 -> -15.5, twin -14.5) but raises q00 sd;
  L.z 1 (trapped light leaves along its last direction inside) cuts steps q00 50 -> 33, q03 64 -> 56, values unchanged;
  clamp 10 instead of 6 brings p06 B / C back up. Next: g13 combos of L.z 1 with K.w.

### 15:05-15:20 g13-g15: defaults chosen, the shards
- g13 (L.z 1 on top of clamp / tint / N): steps q00 35 / q03 57 / p06 42 (r10 46 / 53 / 39); rims q00 band A 29 / 55 (twin 46
  / 59, F000 36 / 50, judged 29 / 31), q03 band D 3 / 21 (F045 32 / 19); q03 A -3.5 / +13.3 (twin -2.3 / +15.7), B -11.2 /
  +10.6 (twin -9.5 / +12.0); p06 A -16.9 with K.w 1.5 (twin -12.7), B -3.8 / +4.7 (twin -9.0 / +15.5, F420 -8.6 / +9.0),
  C +4.1 (twin -2.8, F420 +3.1).
- **Defaults now (IceMaterial.ts r11Uniforms; `?ice=r11a` keeps the judged values): uR11G.z 0.45, uR11K.w 1.5, uR11L.z 1,
  uR11M (6, 1, 0, 0), uR11N (1, 0, 1, 0).** Capture `fix2/g14/v0_*` equals the g13 variant within dither (max 1).
- Shards (finding g): Shards.ts gets `SHARD_R11` (uniform uR11Sh: chroma kept, facet value range; round 10 0.85 / 0.45 /
  1.12), compiled only when the round-11 ice runs and not `?ice=r11a` (HeroEngine.ts passes `iceR11(profile.ice) &&
  !ICE_R11A`: a 3-line shared-file hunk). g15: (0.75, 0.35, 1.2) moves the q00 shards' B-R 103.5 -> 96.9 (twin-index mask;
  twin 94.6). Default (0.75, 0.4, 1.22). Visual `fix2/look/g15_shards_3x.png`: the twin's crystals carry internal streaks
  ours do not; this only takes the chroma down and widens the facet values.
- Typecheck 0 errors. Next: final captures with the judge's own tools (judge1/tools/jshoot.mjs, all 10 poses) for lane
  default, lane ?ice=r10, MAIN, lane ?ice=r11a; then T0 / T2, jstats / jstep / jrim, tumble steps, sweep, interact, perf.

### 15:20-15:40 Final captures with the judge's tools (`fix2/cap/`, `fix2/stats/`)
- judge1/tools/jshoot.mjs, all 10 poses, T1 scale 1, clocks pinned to dump1: lane default `fix2/cap/lane_T1` (+bg, mask),
  MAIN `fix2/cap/main_T1` (+bg), lane `?ice=r10` `fix2/cap/r10_T1`, lane `?ice=r11a` `fix2/cap/r11a_T1`.
- Hard 1-px steps > 15 L per 10k ring px (judge1/tools/jstep.py, `fix2/stats/hardsteps_T1.txt`), twin / F-ref / r10 / now:
  q00 13.7 / 5.5 / 45.0 / 32.6, q03 11.0 / 2.0 / 65.3 / 68.9, p06 7.5 / 0.0 / 31.5 / 41.8 (judged 283 / 419 / 279).
- Rings (judge1/tools/jstats.py, `fix2/stats/rings_T1.txt`; ring minus own background, twin / ref / r10 / now): q00 A dL 15.6
  / 3.6 / -7.2 / 5.8, B -7.2 / -11.6 / -34.3 / -12.8, C 15.1 / 7.6 / -7.8 / 16.1, D -2.2 / -23.1 / -10.1 / 2.2; q03 A -7.3 /
  -7.2 / -13.3 / -8.5 (dB-R 14.6 / 11.4 / 13.1 / 13.6), B -7.8 / -12.8 / -22.5 / -8.0 (12.3 / 11.1 / 15.3 / 10.0), C 11.5 /
  -11.4 / -10.4 / 11.7, D 29.7 / 15.3 / 5.6 / 13.9; p06 A -12.6 / -10.3 / -29.5 / -17.4, B -8.4 / -8.9 / -9.7 / -3.6 (dB-R
  15.4 / 9.4 / 3.9 / 4.7), C -2.8 / 3.1 / -12.6 / 4.1; orb p06 sd 29.1 / 14.6 / 8.1 / 35.7; shards q00 B-R 94.6 / - / 104.7
  / 97.1.
- Rim lines (judge1/tools/jrim.py, `fix2/stats/rims_T1.txt`; core minus line, L, top / bottom), twin / ref / r10 / judged /
  now: q00 band A 46.2 / 59.0, 36.3 / 50.2, -2.7 / 7.7, 29.0 / 31.0, 28.5 / 54.8; q03 band D 52.9 / 43.2, 31.8 / 19.4, 1.8 /
  2.0, 16.2 / 9.6, 2.8 / 20.6; p06 band B 36.2 / 57.8, 18.5 / 2.3, 1.5 / 7.7, 39.1 / 26.3, 26.8 / 47.8.
- I-G4: lane `?ice=r10` vs MAIN, 10 poses + their hero-hidden frames: mean 0.08-0.87 per 255, max 1, 0 px > 2; inside the
  hero = outside (q00 0.740 / 0.742, q03 0.692 / 0.696, p06 0.859 / 0.869), i.e. dither; MAIN against its own 06:53 capture
  0.51-0.70 (this session's dither floor). `?ice=r11a` vs judge 1's lane captures (the judged build): 0.10-0.87, max 1, 0 px >
  2, hero = outside. Diff maps `fix2/look/wb_r10_main_q00_p06_half.png` (x32): uniform dither, no hero structure.
- Next: cap_batch3 (T0 lane / MAIN, T2 lane), then tumble steps + crawl, sweep, interact, perf.

### 15:40-16:05 Gates on the first final set, crawl found and fixed (`fix2/seq/`, `fix2/seqv/`, `fix2/stats/`)
- T0 (`fix2/cap/lane_T0` vs `main_T0`, 5 poses): mean 0.03-0.85, max 43 on <= 0.0007 % of the pixels, the same in the
  hero-hidden frames (T0's lake specks); lane T0 log: r11=false, orbR11=false (T0 keeps round 10, no SHARD_R11). T2: r11 and
  orbR11 on, no errors (only the known 404), T2 vs T1 mean 0.38-0.86; T2 hard steps 31.9 / 65.7 / 41.0 (r10 45 / 65 / 32).
- Tumble (judge's jseq protocol, 3 taus x 8 frames, `fix2/seq/tumble_lane`; MAIN = judge1/seq/tumble_main): hard steps
  42.3 / 62.7 / 34.5 vs MAIN 24.4 / 36.0 / 29.9 (judged 279 / 332 / 166). BUT the motion-compensated residual (crawl,
  judge1/tools/mcres.py) rose to 6.45 / 5.11 / 5.15 (judged 4.10 / 3.79 / 3.66, Cycles video 4.63 / 4.36 / 5.86).
- Knock-outs (`fix2/tools/jseq2.mjs` = jseq + UNI uniform overrides; 2 taus x 6 frames, one mask for all,
  `fix2/stats/mcres_var.txt`): the culprit is uR11L.z 1 (trapped light along the last internal direction, which jumps from
  frame to frame): t0.4 / t1.5 residual 6.75 / 5.33 -> 4.88 / 4.26 with L.z 0; N.x / G.z change nothing; judged build 4.31 /
  3.95, MAIN 3.99 / 3.14 with the same mask. New option uR11L.w (tilt the trapped lookup along the ring's tangent, weighted
  by the view's own run along it: continuous, geometry-only): 5.00 / 4.25, rims 23.7 / 40.7 vs 22.4 / 37.9 with L.z 0.
- **Defaults changed: uR11L (0, 1, 0, 1)** (L.z 0, L.w 1). Steps (fstat masks, g16) q00 48 / q03 72 / p06 38. The final
  captures / stats above are re-shot with this default next.
- 15:50 first re-shot set with L (0, 1, 0, 1), N.x 1: steps (judge jstep) q00 46.5 / q03 84.5 / p06 33.5 (r10 44.7 / 60.6 /
  31.8); tumble steps 35.6 / 69.3 / 32.1 vs MAIN 27.2 / 36.2 / 30.1; crawl residual 4.88 / 4.14 / 4.01 (judged 4.10 / 3.79
  / 3.66, Cycles video 4.63 / 4.36 / 5.86). g17: N.x 2 takes q03 steps 76 -> 67 (fstat masks), q00 51 -> 55, p06 38 -> 36,
  values within 1.5 L. **Default uR11N.x 2.** Re-shooting the final set (cap_batch4) with it; no more look changes after.

### 15:38-15:55 Final set (shipped defaults: G.z 0.45, K.w 1.5, L (0, 1, 0, 1), M (6, 1, 0, 0), N (2, 0, 1, 0), uR11Sh (0.75, 0.4, 1.22)))
- Bundle check: the lab's dist/main.js carries Vector4(2, 0, 1, 0) / (0, 1, 0, 1) / (6, 1, 0, 0).
- Judge's tools on `fix2/cap/lane_T1` vs `fix2/cap/main_T1` (`fix2/stats/*.txt`): hard steps > 15 L per 10k ring px q00 47.7
  / q03 73.4 / p06 31.6 (r10 45.4 / 60.3 / 31.5; twin 14.5 / 11.3 / 7.7; judged 283 / 419 / 279). Rings (twin / ref / r10 /
  now) q03 A -8.9 / -10.1 / -12.5 / -12.4 (dB-R 15.6 / 12.8 / 12.7 / 16.2), B -9.8 / -14.9 / -22.7 / -10.8 (13.1 / 12.0 /
  15.3 / 11.2), C 11.8 / -10.4 / -11.2 / 8.9; p06 A -12.7 / -10.7 / -29.6 / -18.1, B -8.3 / -8.9 / -9.5 / -5.0 (dB-R 15.3 /
  9.3 / 3.6 / 5.3), C -2.2 / 3.2 / -12.3 / 2.3; q00 A 14.9 / 3.1 / -7.1 / 2.9, B -7.3 / -10.9 / -33.5 / -15.1, C 14.7 / 6.1 /
  -7.8 / 14.6, D -4.8 / -22.7 / -11.5 / -0.3. Rims q00 band A 23.4 / 40.1 (twin 46 / 59, F000 36 / 50, judged 29 / 31), q03
  band D 0.9 / 16.5 (F045 32 / 19), p06 band B 24.8 / 38.4. Shards q00 B-R 97.2 (twin 94.6, r10 104.7).
- q00 relative-value map vs the twin (`fix2/look/dmap_q00_judged_final.png`): the final build sits darker than the twin at
  q00 (A -11, B -9 L), on F000 for A (2.9 vs 3.1) and 4 L under F000 for B; the twin is lighter than F000 at q00.
- Sweep (stock shoot_sweep on the lane, `fix2/sweep_lane/`, `fix2/look/sweep_lane_hold_pop_rel.png`,
  `sweep_holdR_judged_now_main.png`): no fireflies, seams, holes or bands; the hold arc's cow-print islands are gone.
- probe_interact (judge's T1 copy + stock T0 on the lane, `fix2/sweep_interact.log`): click inert (drivers 0, holding
  never), errors none; ringDegPerFrame60 max 15 at release (the baseline's MAX_TURN cap, the same in MAIN per judge 1).
- Next: GPU-synced frame cost (main / lane r10 / lane r11a / lane final), then 6 perf_probe pairs; docs meanwhile.
- 15:44 GPU-synced frame cost, one page per config (judge1/tools/frame_cost_j1.mjs, 4 rounds x 30 frames, q00 / p06, load 5.0
  -> 8.7 during the run, `fix2/perf/fc.log`): q00 main 19.10 / lane r10 16.50 / lane r11a (judged) 16.90 / lane final 18.80
  ms; p06 20.00 / 21.80 / 20.10 / 22.40 ms. main and lane r10 are the same code (+-14 % noise); against their mean the final
  is x1.056 (q00) / x1.072 (p06), the judged build x0.95 / x0.96. A second, longer run after the perf_probe pairs.
- 15:45 perf_probe pairs started in the background (`fix2/tools/perf_ab_fix2.sh` = judge's perf_ab_j1c.sh, probe
  judge1/tools/perf_probe_x.mjs, 6 pairs T1, SLOT_BG=0, gate: load < 6 and an exclusive slot, shared after 4 min if load <
  6; `fix2/perf/T1/`). HANDOFF.md fix-round section written (perf placeholder until the pairs finish).
- Still to compute on the final set (after perf, to keep the machine quiet): tumble steps / crawl on `fix2/seq/tumble_lane`
  and T2 steps on `fix2/cap/lane_T2` (both re-shot with N.x 2 in cap_batch4 at 15:36).

### 15:48 Fix round summary (perf numbers follow in the next entry)
- Findings: (a) islands FIXED (hard steps near round 10: 47.7 / 73.4 / 31.6 vs r10 45.4 / 60.3 / 31.5; judged 283 / 419 /
  279); (b) capsule / eyes gone; (c) specks reduced, a soft 2-3 px dot remains at p06 x ~920, y ~200; (d) frost PARTLY (the
  pale wet read is gone, the twin's granular frost and chiselled facets are not reproduced: four approaches tried and
  rejected with numbers, g05-g07 / f16); (e) q03 fixed, p06 B / C improved (B -5.0 vs twin -8.3 / F420 -8.9, C 2.3 vs -2.2 /
  3.2), p06 A now 5 L under the twin (-18.1 vs -12.7), q00 between twin and F000 except B 4 L under F000; (f) rest limb done
  (first attempt), hold orb still busy (sd 35.7); (h) bottom rim lines deeper (q00 40 vs F000 50), top lines not; shards
  chroma down (q00 B-R 97 vs twin 95); nits: orb uniforms done, the release joint-seam switch left for integration.
- Final T2 / tumble numbers on the shipped default (N.x 2) and perf: next entry.
- Visual: `fix2/look/final_{q00,q03,p06}_judged_now_twin_ref.png` (judged | now | twin | reference), T2 = T1
  (`fix2/look/final_T2_vs_T1.png`).
- 15:50 T4 boxes (the builder's named boxes, `fix2/tools/boxes.py`, `fix2/stats/band_over_orb.txt`), band in front of the
  orb, L / sd / B-R, twin | ref | r10 | judged | now: q00 231.6 / 21.7 / 19.6 | 222.4 / 17.2 / 33.8 | 218.2 / 7.7 / 29.5 |
  229.4 / 18.1 / 26.4 | 218.1 / 11.2 / 34.9; q03 229.5 / 22.9 | 218.1 / 20.2 | 223.1 / 10.5 | 236.3 / 10.3 | 222.4 / 9.9;
  p06 213.2 / 23.5 | 210.0 / 32.2 | 217.6 / 19.0 | 232.3 / 24.2 | 216.4 / 20.7. The value is now on the references at all
  three poses (p06 fixed); at rest its sd fell (q00 18 -> 11): the clamp flattens the plasma's bright sheets seen through the
  band (open).
- 16:01 perf pairs: the env lane's judge held a slot all the time, so every run waited the full 4-min exclusivity gate
  (pair 1 base exclusive, pair 1 / 2 ice shared). Stopped my script after pair 2 ice and restarted it at pair 2 with a 30 s
  exclusivity wait (then shared, still only while the 1-min load < 6, the lead's rule); pairs 2-7 -> `fix2/perf/T1/`.
  Pair 1: base rest / hold / collapse 60.1 / 51.0 / 58.6 fps, ice 59.9 / 48.0 / 54.2 (rest is vsync-capped at 60 on both).
- 16:12 perf set 1 stopped after pair 4 ice (pairs 1-3 complete, `fix2/perf/T1_set1/`, contended by the env judge's own
  perf probes, load up to 15): rest / hold / collapse medians ice / base 0.91 / 0.78 / 0.93, too noisy to decide but the
  hold ratio pointed at a real cost. Found an exact saving: with uR11J.x 2 the trapped lookup has zero weight wherever the
  exits carry >= 15 % of the light (kEx = smoothstep(0, 0.15, wOut) is exactly 1), so it is now skipped there (IceMaterial.ts).
  Proof: lane after vs before, q00-q03 / p06 (`fix2/cap/lane_T1_opt` vs `lane_T1`): mean 0.03-0.87, max 1, 0 px > 2.
  Next: GPU-synced frame cost (6 rounds) and a fresh set of 6 perf_probe pairs.
- 16:15-16:18 GPU-synced frame cost after the optimisation (`fix2/perf/fc2.log`, 6 rounds, main = lane r10 within 1 %):
  q00 main 16.1 / r10 16.1 / judged 15.8 / final 17.8 ms (x1.106), p06 20.5 / 20.4 / 19.9 / 23.3 ms (x1.137). Knock-outs
  (`fc3.log`, 4 rounds, load 5.4 -> 9.9): final x1.000 / x0.996 vs main this time, J.x 0 / N 0 / M 0 + L.w 0 within +-4 %
  of the final: no single fix-round option carries the cost; run-to-run spread is +-10 % under the other lanes' load.
  A longer main / r10 / final run (8 rounds) follows.
- 16:20 fc4 (8 rounds, `fix2/perf/fc4.log`): q00 main 15.7 / lane r10 16.8 / final 17.5 ms, p06 20.3 / 21.7 / 22.3 ms. The
  two code-identical baselines differ by 7 %; against their mean the final costs x1.077 (q00) / x1.062 (p06). Over fc1, fc2,
  fc4: x1.056-1.106 at q00, x1.062-1.139 at p06 (fc3: x1.00): about +7 % (range 0 to +14 %), the same picture as judge 1's
  +8 % (+4..+12 %) for the judged build. Next: 6 fresh perf_probe pairs (set 2) in the background.
- 16:22 final tumble / T2 steps (jstep_seq / jstep on the shipped default): tumble lane / MAIN 30.3 / 30.7, 63.0 / 35.7,
  27.7 / 33.7 at tau 0.4 / 1.5 / 2.9 (`fix2/stats/tumble_steps.txt`); T2 47.6 / 75.9 / 32.3 (`hardsteps_T2.txt`).
- Next steps for whoever continues (the open items, in order of visual weight):
  1. Frost / chiselled facets (judge 1 d): the single deterministic ray cannot carry the twin's sub-pixel grain without
     aliasing (g05: steps x1.4-2.7). Options: (i) bake in Blender, on a COPY of `twin/twin_q00.blend`, a frost texture the
     engine can filter with mips: e.g. per ring the transmitted-luminance variation of Ice.004 with the hero lit flat, or the
     Noise B / Bump.001 normal and roughness at Blender scale, mapped by the rings' UVs or triplanar in object space; sample
     it at the pixel footprint and let it modulate the transmitted light and the trace's entry normal; (ii) 2-4 jittered
     rays per pixel with a temporal accumulation for the ice (no TAA exists in the pipeline; costly at T1).
  2. p06 ring A 5 L darker than the twin (face-on lobe growth; uR11K.w 1 fixes A but raises q00's face-on contrast) and ring
     B 4-10 B-R less blue than twin / F420.
  3. T4 band in front of the orb at rest: value on F000 / F045 now, sd low (q00 11 vs F000 17 / twin 22): the clamp flattens
     the plasma's bright sheets; a clamp on the mean only, or a higher clamp with the sharp sample, is worth a batch.
  4. Rim lines: q03 band D's top line, q00 top line (23 vs F000 36).
  5. The hold orb's busy plasma (sd 35.7 vs twin 29 / F420 15), the faint p06 speck, q03 hard steps (1.2x round 10).
- 16:46 perf_probe set 2 (6 pairs, after the exact optimisation; `fix2/perf/T1/summary.txt`, per-run start states in
  `runs.txt`): medians ice / base rest 1.003 (59.6 / 59.9 fps, vsync-capped), hold 0.816 (43.7 / 52.2 fps, 22.9 / 19.2 ms),
  collapse 0.909; worst frame medians 33/33, 42/42, 42/33 ms, max 67/67, 83/67, 83/50 ms. Every pair overlapped other
  lanes' jobs (env judge pairs, hold lane finals; load up to 17): pairs 4 / 5 base and 2 / 3 ice were throttled to 18-31 fps.
  Uncontended holds: base 52-54 fps, ice 40-52 (median ~48): about -9 % fps in the hold, i.e. at the +10 % frame-time
  limit, in line with the GPU-synced +6..+14 %. Next: cost knobs (max walls 4 = Cycles' glossy limit, stop threshold).
- 16:48 fc5 cost knobs (`fix2/perf/fc5.log`, 6 rounds): final x1.065 / x1.063 vs MAIN (q00 / p06); max walls 4: x1.085 /
  x1.014; stop threshold 0.12: x1.163 / x1.096; both: x1.085 / x0.957. Within the run-to-run spread; not changed.
- 16:49 final crawl residual on the shipped default (`fix2/stats/mcres.txt`): 4.84 / 4.08 / 3.98 at tau 0.4 / 1.5 / 2.9
  (Cycles video 4.63 / 4.36 / 5.86; judged 4.10 / 3.79 / 3.66; MAIN 3.72 / 3.12 / 3.10).

### 16:50 End of the fix round (second attempt): state
- Gates (self-assessed, judge's tools): I-G2 improved but not passed (q03 converged; p06 B / C close, A 5 L dark; q00 between
  twin and F000; frost / facets and top rim lines short of the twin). I-G3: aliasing at round 10's level except q03 (1.25x);
  no fireflies / seams; crawl within the Cycles video's own change except tau 0.4 (+5 %); T1 frame time about +7 % GPU-synced
  (range 0..+14 %), perf_probe hold about -9 % fps uncontended: at the +10 % limit. I-G4 PASS (`?ice=r10` = MAIN, `?ice=r11a`
  = the judged build, T0 = MAIN). Interaction, errors, T2, typecheck: pass.
- HANDOFF.md "Fix round after judge 1" section rewritten with the final numbers. Lab :5176 stopped (pid 10972, mine); MAIN's
  :5173 untouched; no background job of mine left; nothing committed or uploaded; no Blender run.
- Next for a continuing agent: the "Next steps" list at 16:22 above (frost first).
