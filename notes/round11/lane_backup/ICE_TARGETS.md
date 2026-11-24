# ICE_TARGETS: the engine's ice, orb and shards against a Cycles twin (round 11, ice lane, step 1)

Written 2026-11-14 by the ice-lane builder (ice-twin). This document closes SPEC 4.3 method steps 1-3 (gate I-G1) and
sets the measured targets for step 4. The engine's look was not changed in this step. All paths below are absolute
unless they start with `WORK/` (= `$SP/work/ice`) or `LANE/` (= `$SP/lanes/ice`), with
`SP = /private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad`.

## 0. Summary

- **The twin exists and reads like the reference.** A copy of `plate_scene_v7.blend` with the artist's own hero
  materials, every ring piece, the orb and all 18 crystals posed exactly as the engine poses them (checked to 1.6e-7 m
  against hero.glb's own vertices), the engine's camera, 1440x766, AgX, Cycles on the Metal GPU, 256 spp + OIDN. Renders
  exist for q00 (tau 0, F000), q03 (tau 1.5, loop F045) and p06 (expand 2.97, F420), plus diagnostic variants at q00
  (orb hidden, orb light only, no displacement, hero alone with alpha, hero hidden) and per-pass EXRs. At q00 the twin
  and F000 agree on the things the judges complained about: lumpy polygonal outlines, clear faces that refract the
  horizon into a mosaic, dark rim lines along the bands, rings almost as light as what is behind them.
- **What makes the engine's ice read "milky / acrylic", in order of visual impact** (numbers in section 3):
  1. Ring bodies are flat and soft: at the same pose the engine has 35-56 % of the twin's internal contrast (sd) and
     26-43 % of its band-pass sharpness on the bands in front of the orb (q00, q03, p06) and on ring A's right side (q03).
  2. Ring bodies are too dark and too blue for what is behind them: ring B sits 29.5 L below its background with
     +30 B-R where the twin sits +3.0 L / +9 (F000 -2.2 / +8); relative to the twin the engine is 17-33 L too dark
     on rings B / C and A's sides at q00, 13-26 L at q03 and 6-26 L on the hold arcs.
  3. No dark rim lines: edge-on bands carry 32-50 L deep (references 16-45 L), 6-19 px wide dark lines just inside
     their top and bottom edges in the twin; the engine has none, and draws bright Fresnel rims instead.
  4. The band in front of the orb is a smooth glow floor, not the orb seen through faceted ice (sd 7.7 vs 21.7).
  5. The orb lights every ring in Cycles (20-28 % of rings B / C / D, teal-cyan); the engine's orb light on the
     surrounding rings is about ten times weaker and neutral.
  6. Outlines are smooth arcs: ring B wobbles 0.5-0.6 px RMS vs the twin's 0.8-1.0 px (hold arcs 1.0 vs 1.8 px), and
     the outline is wavy instead of polygonal.
  7. The orb interior is flat (sd 9-19 vs 24-31) and the hold orb a white disc (L 247).
  8. The "TIR bar" is the wrong mechanism: in Cycles the dark vertical lines in band A are the quarter joints.
  9. Shards: right at rest, too blue in the hold (B-R 113 vs 95-97), facets ~25 % flatter than the twin's.
  10. Band end blocks: no special whitening in Cycles; the ends follow the refracted environment.
- **The engine terms that cause most of it** (details per target in section 3): the refraction copy's highlight knee
  (`RenderPipeline.ts` L50-57: sky blue ~2.3 reaches the ice as ~1.36), the extra compression and muting of the
  transmitted image (`IceMaterial.ts` L343-352), the removed section lens (L317) with "clear" ice sampled sharp
  (L302-309), the navy masks and bright Fresnel rim (L476-513), the lantern floor (L563-574), the weak neutral orb
  proximity light (L548), the x1.35 chroma (L585) and the smooth, finely subdivided outline displacement (L57, L682,
  `Rings.ts` subdivideMidpoint). The ice absorption itself is not the problem: at the face-on ring the engine's tint x
  Beer-Lambert is within about 6 % per channel (luma x0.67 vs x0.66) of Cycles' per-interface tint squared.

## 1. The Cycles twin (gate I-G1)

### 1.1 How it was built
- Source: `WORK/twin/src_plate_scene_v7_copy.blend`, a read-only copy of `LANE/blender/plate_scene_v7.blend` (the repo
  file was never opened for writing). Inspection (`WORK/twin/inspect_src.json`): the hero objects are not hidden in the
  saved file (the plate renders hid them only at render time); the materials are the artist's (`Ice Floes.004` on the
  8 ring pieces, `Ice Floes blue.002` on the belts, `magick_ball_01.002` on the orb with the drivers `frame/200` and
  `frame/800`); displacement BOTH on both ice materials; the Material Output inside group `Ice.004` was left as it is.
- Pose (`WORK/tools/dump_poses.mjs`, `WORK/tools/twin_pose.py`): the engine is driven exactly like `shoot_qc.mjs`
  (pose, settle, pin `rings.tau`, freeze) on my lab (:5176, T1, scale 1) and dumps, at the same frozen moment, the
  camera, every ring piece's `matrixWorld`, centroid and first vertices, the ring axes, the orb and the crystals. With
  Rings.ts' chain (world = MW x T(-centroid) x R(axis -> +Z) x T(-HERO_CENTER) x M_glb x v_glb, v_glb = C x v_blender,
  M_glb = C x M_blender x C^-1) every Blender object gets `C^-1 x MW x T(-c) x R x T(-HERO_CENTER) x M_glb x C`, so the
  artist's mesh, modifiers and object-space noise move rigidly with each piece. hero.glb's own vertices pushed through
  this chain land on the engine's geometry within 1.6e-7 m for all 8 pieces at every pose.
- Shards: SHARD_VERT is replicated on the CPU (at rest and in the hold `uShatter = 0`, so no hash term is involved); the
  world triangles of the 18 crystals (T1 has no procedural top-up) are welded per crystal into two objects at the belt
  pivot with the original object scale 1.975, the artist's `Ice Floes blue.002`, smooth shading with sharp edges at 30
  deg (the "Smooth by Angle" result; Blender 5.2 does not expose that modifier's inputs to Python).
- Orb: Icosphere.011 moved to the engine's orb centre (scale and rotation as stored).
- Camera: the engine camera's matrix (axes converted), lens 42.2530 mm on a 36 mm horizontal sensor, no shift, square
  pixels. The engine's rest camera puts the orb at (723.3, 371.6), about 2 px from the solved camera's (721.1, 369.5).
- Render (`WORK/tools/twin_render.py`, `WORK/tools/run_twin.sh`, always through the slot): 1440x766, the file's light
  paths (12 / diffuse 4 / glossy 4 / transmission 12 / volume 0 / transparent 8, caustics on, clamp indirect 10), AgX /
  look None / exposure 0 / gamma 1 / sRGB as in the file, Metal GPU, 256 spp adaptive 0.01, OIDN (albedo + normal,
  accurate). Blender 5.2 renders volumes unbiased, so the step-rate settings do not apply. Frames: q00 = 1 (F000),
  q03 = 46 (loop F045), p06 = 421 (F420), so the orb's plasma and the lake's Wave modifier sit at the reference's moment.
- Denoiser check: band-pass energy of the denoised vs noisy pass is 0.3215 vs 0.3241 on the band in front of the orb
  (noise floor 0.0087 in flat sky): OIDN does not soften the ice detail, so the twin's sharpness is a valid target.
- Timing: 218 s (q00), 251 s (q03), 317 s (p06) for a full frame while the GPU was free; up to 980 s while the env
  lane's Blender shared it.

### 1.2 Files
- Twin scene at q00 (posed, compressed copy): `WORK/twin/twin_q00.blend` (36 MB). Poses for q00-q03 and p06:
  `WORK/twin/pose/*_pose.json`. Engine dumps and frames: `WORK/engine/dump1/` (frame, hero-only frame, JSON).
- Beauties (PNG = AgX 8-bit, EXR = multilayer with depth, normal, object index, diffuse / glossy / transmission
  direct + indirect + colour, emission, environment, volume, noisy image): `WORK/twin/q00/q00_beauty.*`,
  `WORK/twin/q03/q03_beauty.*`, `WORK/twin/p06/p06_beauty.*`.
- Variants at q00: `q00_noorb` (orb hidden), `q00_orbonly` (environment hidden, world dark: only the orb lights the
  ice), `q00_nodisp` (displacement method BUMP), `q00_alpha` (hero alone over the world, film transparent),
  `q00_nohero` (hero hidden: the background behind the ice); `q03_nohero`, `p06_nohero`.
- Engine backgrounds at the dump1 moments (clocks restored, re-capture equal to dump1 within 1/255):
  `WORK/engine/bg1/*_bg.png`.
- Side-by-sides (twin | reference | engine): `WORK/cmp/q00_twin_ref_eng.png`, `WORK/cmp/q03_twin_ref_eng.png`,
  `WORK/cmp/p06_twin_ref_eng.png`; 2x crops of band A: `WORK/cmp/q00_bandA_left_2x.png`, `WORK/cmp/q00_bandA_right_2x.png`;
  variants: `WORK/cmp/q00_twin_beauty_noorb_orbonly.png`, `WORK/cmp/q00_twin_disp_vs_nodisp.png`,
  `WORK/cmp/q00_twin_alpha_vs_noorb.png`; masks: `WORK/cmp/q00_idx.png`, `WORK/cmp/q03_idx.png`, `WORK/cmp/p06_idx.png`
  (red A quarters, green B halves, blue C, yellow D, white orb, magenta shards); silhouette tracks:
  `WORK/cmp/q00_arc_top_v.png`, `WORK/cmp/q03_arc_left.png`, `WORK/cmp/q03_arc_right.png`, `WORK/cmp/p06_arcs.png`.

### 1.3 Validation against F000 / F045 / F420
- **q00 vs F000 (same moment, nearly the same ring pose).** The twin reproduces F000's ice: lumpy polygonal outlines,
  clear faces showing the refracted horizon, dark top / bottom rim lines on band A (44.7 / 31.7 L below the band core
  vs F000's 38.1 / 45.1), ring B as light as its background (twin +3.0 L, F000 -2.2 L), the sculpture box at L 194 /
  sd 25 vs F000's 199 / 22, and the same cobalt crystal colour (twin L 133, RGB 101 / 136 / 198; F000 138, 108 / 141 / 203).
  Differences and why:
  1. The twin's environment is 2-9 L darker and a little less blue than F000 (sky above the hero 209 vs 217, B-R 23
     vs 26; lake 177 vs 186). The twin is raw Blender 5.2 AgX on the v7 scene; the engine's plate grade lifts its
     environment to F000 (215). Absolute ice values are therefore compared with care, and every ring is also measured
     relative to its own background (Table 3), where the twin and F000 agree within about 5 L.
  2. Ring A's in-plane rotation differs: the twin (at the engine's pose) shows its quarter joints as dark vertical lines
     at x 666 / 799, F000 at x 584 / 878. This is a pose difference of the idle mocap (about 45 deg of in-plane spin of
     ring A at tau 0), not a material one; it matters for target 8.
  3. Crystal positions are the engine's belt phase, not F000's (the colour still matches when each image's own
     crystals are segmented).
  4. The orb's plasma is at Blender frame 1 like F000; the engine's orb runs its own frame (290 at the q00 capture).
  5. F000 contains the UI cursor ring at about (740, 395), and it is an MP4 frame (4:2:0, compressed).
- **q03 vs F045.** The arrangement is close (A the big oval, D the band across the orb). The twin matches F045's
  material read: the dark inner zone along A's right side (54.5 L below the ring core vs F045's 51.9), the band in front
  of the orb broken into bright facets with dark rims, the rings' polygonal outlines.
- **p06 vs F420.** The hold arrangement differs (the hold lane's work), so p06 is a twin-vs-engine comparison at the
  identical pose; F420 only confirms the material: clear chunky slabs with dark rims and a bright, faceted band over
  the orb (F420's band-over-orb box sd 32 / DoG 6.7, twin 23.5 / 5.5, engine 19.0 / 3.2).

## 2. How the numbers were measured
- L = Rec.709 luma of 8-bit sRGB (as `MAIN/pipeline/boxstats.py`), B-R = mean blue minus mean red (8-bit).
- Boxes are fixed pixel rectangles (round-10 boxes reused where they exist). Ring masks come from the twin's object
  index pass (eroded 3 px, so the engine's slightly different outline cannot leak background in); the engine and the
  twin share pose and camera, so the masks fit both. The reference's pose is close at q00, rougher at q03, different at
  p06.
- Sharpness = sd of a difference of Gaussians (sigma 1 px minus sigma 3 px) of L inside the region ("DoG").
- Rim lines: luminance profile across an edge-on band (mean over columns), core = median of its middle 40 %, rim line =
  minimum within the outer 22 % of the band on each side, darkness = core minus minimum. For face-on rings, the same
  along radial profiles around the orb. Mask version: core (>= 7 px inside) minus rim (0-3 px inside); negative = a
  bright rim.
- Background-relative values: the same mask on the image with the hero hidden (twin: `nohero` render; engine:
  `bg1/*_bg.png` captured at the identical frozen moment; F000 / F045 / F420 against the engine's background, which is
  graded to F000's environment, sky 215 vs 217).
- Silhouette wobble: the outline radius around the orb's screen centre every 0.25 deg; twin from its object index (or
  alpha), engine from its hero-only frame over black (threshold 22), reference from a two-pass gradient track; robust
  polynomial fit (degree 6 over >= 90 deg, else 4); residual RMS, p95 and angularity (RMS of the 4 px second difference
  x 100). A first version tracked gradients for all three images and was wrong (it hopped onto inner ring edges, giving
  the twin 2.9-5.1 px); every track used here was drawn and checked. The reference is only quoted where its track is
  clean (q00, B's top arc).
- Tools: `WORK/tools/ice_stats.py` (configs `WORK/stats/*_cfg.json`, results `WORK/stats/*_stats.json`),
  `WORK/tools/show_stats.py`, `WORK/tools/targets_tables.py` (the tables below are generated from the JSON).

## 3. Targets, ranked by visual impact

Each target names the measure, the twin / reference / engine values at the same pose, the target band for step 4, and
the engine terms that cause the gap (line numbers in LANE at 7ddac0d). "Twin" is the primary target where the poses
match; the reference decides where the twin and the reference disagree for reasons outside the ice (environment
offset, pose).

### T1. Clear faces with structure instead of a milky, flat body (ice lens, Awwwards)
- Measure: sd and DoG in the ring bodies (Table 1). The engine's band in front of the orb has 35 % of the twin's sd
  (q00 7.7 vs 21.7, F000 17.2) and 26 % of its sharpness (1.4 vs 5.2, F000 3.9); q03 band D 10.5 vs 22.9 (F045 20.2);
  q03 A's right side 16.2 vs 29.5 (F045 31.1); p06 ring A 14.9 vs 26.6, ring B over the orb 10.7 vs 21.2 with DoG 1.5
  vs 5.0. The broad face-on areas are closer (ring C at q00 16.0 vs 19.6), so the gap is in the thick, oblique and
  orb-lit parts.
- What Cycles does: the rings are transmission-dominated (Table 6: 92-99 % of their light is transmission, glossy 3-18 %,
  0.4-1.1 % in front of the orb). "Clear" ice has roughness 0.233 (Noise A ramp floor), so the far background (clouds,
  sky gradients) is blurred out at two interfaces, while the surface (two bump layers, Voronoi chips), the section's
  refraction of near-field edges (horizon, lake, orb, other rings) and the joints stay crisp. In the twin clouds are
  not legible inside band A; in the engine they are.
- Engine terms: the far background is sampled sharp on "clear" ice (`IceMaterial.ts` L302 `rough = max(frost,
  0.3 * thick)`, L309 `lod = mix(0.0, 1.6, rough)`), while the structure that should be sharp is missing because the
  section lens is removed (L317 `tilt -= tiltMacro * (1.0 - macroW)`) and the exit ray is projected to a fixed 6 m
  (L324, L676 `uLensDepth 6`). The transmitted image is then compressed and muted (L343 `trans /= 1 + 0.12 max`, L348
  `mix(vec3(tl), trans, 0.75)`, L351-352 chroma gate), which flattens what is left.
- Target (step 4): in each Table 1 region, engine sd within +-20 % of the twin and DoG >= 0.8x the twin (at least the
  reference's value); clouds not recognisable through band A at q00 / ptr_orb; the global sculpture mean within +-3 L
  of today (190.3 at q00) so nothing else moves.

### T2. Ring value and hue relative to what is behind them (ice, colour lenses)
- Measure: Table 3 (each ring against the image's own background with the hero hidden). q00: ring B twin +3.0 L /
  +9.1 B-R, F000 -2.2 / +8.2, engine -29.5 / +30.2; ring C +2.4 / +8.6, -4.4 / +9.2, -12.3 / +11.7; A's left side
  -4.3 / +6.1, -9.5 / +5.8, -21.2 / +7.7; A's right side +1.5 / +22.0, -7.4 / +23.9, -23.0 / +35.0. q03: A's right side
  -12.6 / +21.9 (F045 -23.9 / +25.9), engine -27.6 / +28.2; B -15.5 / +15.5 (-23.1 / +16.0), engine -28.5 / +20.7; C +13.6
  / +4.3 (-0.7 / +10.8), engine -12.5 / +16.9; A's left side is the exception (twin -16.5, engine -9.7). p06 (twin vs
  engine, same pose): A's top arc -13.7 vs -27.6, right arc -29.8 vs -35.3, left arc -18.3 vs -44.2 (B-R +15 vs +35),
  C -4.8 vs -12.6. Absolute (Table 1): q00 ring B L 193 / 197 / 169, B-R 36 / 42 / 64; p06 A's left arc 190 / 211 / 172,
  B-R 39 / 32 / 65.
- What Cycles does: no volume absorption; the base colour (0.648, 0.833, 1.0) tints each transmission event, so a
  straight pass is tint^2 = (0.42, 0.69, 1.0) whatever the thickness, the sky arrives at full radiance, and the orb adds
  20-28 % (T5). Thickness does not darken the ice; extra interfaces (internal reflections, joints) do.
- Engine terms: the absorption is not the cause (face-on ring B: engine tint x T = (0.445, 0.694, 1.06), luma x0.67;
  Cycles x0.66, same B/R 2.38). The causes are (1) the refraction copy's knee (`RenderPipeline.ts` L50-57: above 0.8 the
  max channel becomes 0.8 sqrt(m / 0.8), so the sky's blue ~2.3 reaches the ice as ~1.36, x0.59), (2) L343's extra
  `1 / (1 + 0.12 max)`, (3) the missing orb light (T5), (4) the navy masks `band`, `tir`, `pathK` (L476-495) where the
  transmitted image is dark, and (5) the global chroma x1.35 (L585), which turns the deficit blue (+21 B-R on ring B).
- Target: in every Table 3 region the engine's dL within +-6 L and dB-R within +-6 of the twin's (at q00 that is
  -10 to +3 L with +6 to +11 B-R, A's right side +22); no ring body above B-R +45 absolute at rest (today ring B 64).

### T3. Dark rim lines along the bands, no bright rims (ice, Awwwards, hold sweep)
- Measure: Table 2. Edge-on band A at q00: lines 44.7 / 31.7 L below the band core (F000 38.1 / 45.1), 0-8 % inside
  the edge, 10-19 px wide; engine -2.3 / 7.9. Band D at q03: 49.5 / 35.9 (F045 15.5 / 25.2), about 6 px wide; engine
  0.3 / 1.2. Masks: the engine's rims are brighter than the cores (q00 A -7.5, B -15.1, A right -24.8) where the twin's
  are darker (A +25.1, B +7.0).
- What Cycles does: the lines are section refraction, not displacement and not the orb. Without displacement they get
  deeper (48.2 / 51.8); without the orb they stay (23.7 / 28.5 against a darker core); with only the Nishita world
  visible (hero alone) they get much darker (81.9 / 56.8): the rounded section corners bend the view steeply towards
  the dark horizon band and the ground, which the real environment fills with lake, shore and mountain feet.
- Engine terms: the section's lens is removed (L317) except in the extreme corners (`macroW`, L316); the rim's
  Fresnel peak is up to ~0.88 at grazing on clear ice (L513) and reflects the engine's PMREM of `pano_orb.exr`
  (L519-540), which `pipeline/render_plates_v3.py` (mode pano) rendered with camera rays that see the pale BG.001 sky
  card; in Cycles the ice's glossy rays skip BG.001 (glossy visibility off, forensics 1.5) and see the darker, bluer
  Nishita world. `tir` and `band` (L476-485) only act where the refracted content is already dark.
- Target: on edge-on bands (q00 A, q03 D, the hold's B lips), a dark line 0-10 % inside each long edge, 25-50 L below
  the band core and 6-19 px wide at rest framing, following the lumpy outline (not a ruler line); mask rim-minus-core
  >= -5 L everywhere (no bright Fresnel rims). This is T09's "section exit" and T14's dark edges; the twin says the
  driver is the corner refraction towards the low environment.

### T4. The band in front of the orb: the orb seen through faceted ice (ice, orb lenses)
- Measure: q00 band A in front of the orb L 231.6 / 222.4 / 218.2, sd 21.7 / 17.2 / 7.7, DoG 5.2 / 3.9 / 1.4; q03
  band D 229.5 / 218.1 / 223.1, sd 22.9 / 20.2 / 10.5; p06 B over the orb sd 21.2 / 24.7 / 10.7, DoG 5.0 / 5.5 / 1.5.
- What Cycles does: 89 % of that band's light is the orb's (q00: 4.78 of 5.36 linear; orb hidden 0.57). The bright
  core breaks into facets with dark rim lines (T3) and dark joint lines (T8) crossing it.
- Engine terms: the lantern floor fills the disc around the unrefracted ray's closest approach (L563-574, `lanternG`,
  `glowC = (0.82, 1.0, 0.97) x uOrbGlow x 2.4`), independent of the facets; the copy carries the orb knee-compressed
  (RenderPipeline L50-57) and projected at 6 m (L324). T08's analytic refracted-ray orb hit is the right direction;
  the twin gives its numbers.
- Target: L 222-232 (between F000 and the twin), sd 17-23, DoG >= 4 at q00; the same at q03 / p06; p90 between 235
  (F000) and 248 (twin), today 225; dark rims along its edges.

### T5. The orb's teal light in the surrounding rings (orb, colour lenses)
- Measure (twin only, Table 6): the orb supplies 28 / 20 / 27 % of the light of rings B / C / D at q00 and 11-16 % of
  band A's sides, as teal-cyan (ring B orb-only RGB 0.131 / 0.309 / 0.379, i.e. 0.35 : 0.82 : 1.0), concentrated on
  facets and edges facing the orb (`WORK/cmp/q00_twin_beauty_noorb_orbonly.png`).
- Engine terms: `col += vec3(0.9, 0.95, 1.0) x uOrbGlow x 0.07 x prox x ...` (L548) gives about 0.01-0.04 linear on
  ring B (prox = exp(-0.95) at 1.78 m) against the twin's 0.28, and is neutral.
- Target: an orb term of about 0.2-0.3 linear on rings B / C / D at rest (20-28 % of their light), teal-cyan
  (0.35 : 0.82 : 1.0), modulated by the facets facing the orb; part of closing T2.

### T6. Lumpy, polygonal outlines instead of smooth arcs (ice, Awwwards, composition)
- Measure: Table 4. q00 ring B 0.80 / 0.96 px RMS (F000 top arc 1.12) vs engine 0.49 / 0.61; p06 A's right arc
  1.80 vs 1.01; q03 A 0.83-0.91 vs 0.74-0.76; ring C at q00 is already equal (0.77 vs 0.81). Angularity 3.9-4.4 (F000
  7.2) vs 2.6-3.7. The round-10 claim of 3-6 px bumps is peak-to-peak at best (twin ptp about 3 px at rest).
- What Cycles does: without displacement the wobble drops to 0.30 px and the angularity stays (~4): the Voronoi F1
  cell displacement (+-4.9 cm, sigma 2.1 cm) is applied at the SubD-L1 vertices (about 0.2 m = 16 px apart at rest) and
  interpolated linearly, so the outline is a chiselled polyline with flat facets between small corners.
- Engine terms: a smooth 3-octave fbm (`IceMaterial.ts` L57) scaled by `uDisplace` 0.133 m (L682) on SubD-L2 pieces
  subdivided x4 again at T1 (`Rings.ts` subdivideMidpoint), i.e. a dense mesh with smooth noise.
- Target: rest outline RMS 0.8-1.1 px (1.6-2x today), hold 1.6-2.0 px, angularity >= 4; the cheapest faithful route is
  the optional Blender bake from SPEC step 4: the displaced SubD-L1 geometry (Voronoi cell colour at the L1 vertices,
  object space) exported per piece, so the engine's outline is the artist's.

### T7. The orb's interior and the hold orb (orb lens)
- Measure (Table 5): orb sd / DoG at q00 30.7 / 5.1 (F000 24.0 / 4.8) vs engine 18.9 / 1.8; q03 24.0 / 5.6 (20.9 /
  4.2) vs 17.2 / 2.7; p06 29.7 / 4.9 (F420 14.7 / 4.2) vs 9.1 / 1.8, and the engine's hold orb is L 247 (twin 231,
  F420 227): a flat white disc.
- Engine terms: `Orb.ts` L565 (`smokeK`, at most -28 %, floor 0.47-0.7 in the hold), L569 (smooth radial hot core
  x2.6), L580 (the shell band); T10's direction is confirmed.
- Target: orb sd >= 20 and DoG >= 4 at rest; hold orb L <= 235 with sd >= 15.

### T8. Quarter joints, not a line-of-sight TIR bar (ice, hold sweep)
- Measure: profile along band A at q00 (dips deeper than 6 L below a 9 px running mean): twin x 666 (-7.8) and x 799
  (-7.1); F000 x 584 (-24.4) and x 878 (-15.2); engine x 878 (-19.5) and x 567 (-7.0).
- What Cycles does: the twin's dips sit exactly on ring A's quarter cut planes at this pose (projected x 658-669 and
  788-804) and persist without the orb. F000's "D-shaped bars" are most likely the joints of a ring A rotated about
  45 deg further in its own plane (see 1.3, difference 2).
- Engine terms: the bar is computed from the unrefracted line of sight's distance to the ring axis (L441 `tbB`,
  L463-464, L500), so it is a straight screen line at the inner radius, tuned to F000's x 878, and it appears on every
  detached piece in the hold.
- Target: replace it by dark, slightly irregular joint lines at the quarter cut angles in the quarters' own frame
  (they move with the ring), 7-25 L deep, present while the quarters are joined and becoming the real cut faces when
  they separate; no line-of-sight bar. Ring A's in-plane rotation at tau 0 is a mocap question for the lead / hold lane.

### T9. Shards (orb / shards, colour lenses)
- Measure (self-segmented, Table 5): at rest the colour already matches (q00 L 133 / 138 / 133, RGB 101-136-198 /
  108-141-203 / 99-136-200); facet sd is 23-28 % below the twin (16.3 vs 22.7 at q00, 16.8 vs 21.7 at q03, 18.2 vs 24.6 at p06); in the hold
  the engine's crystals are too blue (p06 B-R 113 vs 95 / 97, RGB 97-132-210 vs 89-126-184).
- Engine terms: `Shards.ts` L278 (facet value range), L320 (chroma x0.85), the hold path's tint.
- Target: keep the rest mean; facet sd about 21-24; hold B-R 95-100. Round 10's "compress the facet range" (T18) is not
  supported by the twin.

### T10. Band end blocks (ice)
- Measure: q00 right end (box 880,345 32x70) L 163 / 181 / 162, left end (534,345 30x70) 199 / 219 / 214; B-R 49 /
  43 / 64 and 29 / 27 / 28.
- What Cycles does: no whitened end block; the ends show the refracted environment and the joints. The reference's
  ends are 15-20 L lighter than the twin's (environment offset and ring A's different rotation).
- Engine terms: `tirZone` end-block whitening (L464, L501-511).
- Target: ends within +-8 L of the reference's value and following the refracted environment; lowest priority.

## 4. What the diagnostic passes add
- Transmission vs reflection (Table 6): rings 80-99 % transmission; glossy 3-22 % (most on up-facing and grazing faces,
  ring C at q03 22 %); in front of the orb 0.4-1.1 %. The engine's reflection should stay a minor term.
- Orb light (Table 6, second part): 89 % of the band in front of the orb, 20-28 % of rings B / C / D, 7 % of the shards.
- Displacement (`q00_nodisp`): outline wobble 0.77-0.96 -> 0.30-0.31 px; body L / sd / DoG nearly unchanged; rim lines
  slightly deeper. The body's look comes from the bump layers and the section refraction, not from the displacement.
- World only (`q00_alpha`): band A's rim lines 81.9 / 56.8 L deep: they are rays bent towards the dark low directions.
- Environment calibration (Table 6, third part): the twin's raw environment is 2-9 L darker than F000 and the engine,
  so absolute L targets lean on F000 and relative ones on the twin.

## 5. Round-10 disagreements this settles (ice lane)
1. Orb in the hold: no gain increase; the twin's hold orb is L 231 with sd 30 against the engine's 247 / 9: add internal
   contrast, lower the disc's mean.
5. Ice surface, blur vs sharpness: both lenses were half right. The far background (clouds) must blur (roughness 0.233
   floor), the surface and the near-field refraction (horizon, joints, rims, orb facets) must be sharper than today.
7. End blocks: neither cobalt nor white; they follow the refracted environment (T10).
8. TIR bars: they are joints, not TIR (T8): soft and irregular because they are refracting cut faces, moving with the ring.
4. Shards: the rest colour matches already; do not lighten or compress; fix the hold blue.

## 6. Caveats and open issues
- The twin's environment is darker than F000 (raw Blender 5.2 AgX on the v7 scene); use relative targets for values.
- The reference's outline wobble is only measured on q00's top arc of ring B; elsewhere its pose differs or its track
  is not clean.
- p06's arrangement differs from F420 (hold lane); the twin is valid for the engine's own hold pose.
- Ring A's in-plane rotation at tau 0 differs from F000 by roughly 45 deg (joints at x 666 / 799 vs 584 / 878).
- The engine's q03 pose is close to F045 but not exact; its p06 orb frame and the twin's (421) differ.
- Blender 5.2.1 warns that the file was written by 5.2.3 ("502.45"); no visible loss was found.

## 7. Tables (generated by `WORK/tools/targets_tables.py` from `WORK/stats/*_stats.json`)

### Table 1. Ring bodies: mean L / sd / DoG sharpness (twin | reference | engine)

| pose | region | L twin / ref / eng | sd twin / ref / eng | DoG twin / ref / eng | B-R twin / ref / eng |
|---|---|---|---|---|---|
| q00 | band A in front of the orb, box 665,352 120x50 | 231.6 / 222.4 / 218.2 | 21.7 / 17.2 / 7.7 | 5.2 / 3.9 / 1.4 | 19.6 / 33.8 / 29.5 |
| q00 | band A left, box 560,352 80x50 | 200.7 / 198.4 / 180.0 | 12.0 / 22.7 / 16.6 | 3.3 / 5.7 / 3.9 | 38.0 / 45.3 / 49.2 |
| q00 | band A right, box 805,352 75x50 | 177.7 / 183.1 / 165.7 | 10.7 / 15.3 / 11.6 | 2.7 / 3.9 / 3.3 | 50.5 / 56.2 / 64.9 |
| q00 | ring B top arc, box 670,219 110x16 | 193.5 / 193.0 / 171.0 | 8.2 / 8.5 / 8.3 | 3.5 / 4.4 / 1.9 | 35.5 / 44.7 / 61.8 |
| q00 | ring B bottom arc, box 670,506 110x15 | 189.8 / 190.4 / 159.8 | 13.7 / 7.3 / 9.2 | 6.0 / 3.4 / 2.2 | 35.4 / 41.5 / 70.1 |
| q00 | ring B (mask) | 193.2 / 196.6 / 169.3 | 11.2 / 10.2 / 13.3 | 4.6 / 3.8 / 3.0 | 36.1 / 41.6 / 63.6 |
| q00 | ring C (mask) | 188.8 / 188.5 / 180.6 | 19.6 / 21.4 / 16.0 | 5.0 / 5.0 / 5.3 | 40.0 / 47.6 / 50.1 |
| q00 | ring D (mask) | 188.7 / 188.1 / 190.3 | 17.8 / 29.5 / 12.7 | 6.0 / 8.4 / 4.2 | 39.7 / 49.7 / 40.8 |
| q00 | sculpture box 530,215 380x310 | 193.9 / 199.3 / 190.3 | 25.1 / 21.7 / 25.3 | 5.7 / 4.9 / 4.8 | 33.1 / 38.5 / 42.9 |
| q03 | ring A right side, box 822,300 35x120 (round 10) | 162.8 / 155.1 / 177.8 | 29.5 / 31.1 / 16.2 | 8.8 / 7.1 / 3.8 | 56.6 / 71.4 / 48.9 |
| q03 | ring A left side, box 585,300 25x120 (round 10) | 171.1 / 180.8 / 194.4 | 21.7 / 19.4 / 17.2 | 7.2 / 6.5 / 5.4 | 49.2 / 49.8 / 37.7 |
| q03 | band D in front of the orb, box 665,374 110x24 | 229.5 / 218.1 / 223.1 | 22.9 / 20.2 / 10.5 | 8.4 / 5.8 / 3.1 | 20.0 / 32.4 / 22.6 |
| q03 | ring A bottom, box 660,542 110x18 | 186.6 / 202.4 / 178.9 | 22.0 / 13.0 / 7.5 | 6.6 / 4.7 / 2.2 | 34.8 / 33.9 / 55.6 |
| q03 | ring C (mask) | 201.0 / 194.4 / 182.6 | 21.9 / 14.9 / 28.0 | 4.9 / 5.4 / 6.0 | 33.2 / 45.4 / 51.5 |
| p06 | band over the orb, box 640,400 200x50 (round 10) | 213.2 / 210.0 / 217.6 | 23.5 / 32.2 / 19.0 | 5.5 / 6.7 / 3.2 | 33.0 / 32.8 / 31.4 |
| p06 | ring A arcs (mask) | 188.1 / 204.4 / 182.4 | 26.6 / 24.1 / 14.9 | 3.9 / 3.2 / 3.0 | 40.5 / 33.9 / 51.8 |
| p06 | ring A left arc (mask) | 190.3 / 210.8 / 171.8 | 10.5 / 19.8 / 12.5 | 3.7 / 3.4 / 3.0 | 38.9 / 32.0 / 64.8 |
| p06 | ring B over the orb (mask) | 211.5 / 215.0 / 219.2 | 21.2 / 24.7 / 10.7 | 5.0 / 5.5 / 1.5 | 34.5 / 34.2 / 28.2 |

### Table 2. Dark rim lines and bright rims

| pose | measure | twin | reference | engine |
|---|---|---|---|---|
| q00 | A_band_x650_860 profile: top_dark (core minus rim-line minimum, L) | 44.7 | 38.1 | -2.3 |
| q00 | A_band_x650_860 profile: bot_dark (core minus rim-line minimum, L) | 31.7 | 45.1 | 7.9 |
| q03 | D_band_x680_780 profile: top_dark (core minus rim-line minimum, L) | 49.5 | 15.5 | 0.3 |
| q03 | D_band_x680_780 profile: bot_dark (core minus rim-line minimum, L) | 35.9 | 25.2 | 1.2 |
| q00 | radial B_top_60_120: inner_dark | 17.9 | 2.6 | -3.4 |
| q00 | radial B_top_60_120: outer_dark | 19.6 | 11.7 | -0.6 |
| q00 | radial B_bottom_240_300: inner_dark | 13.3 | 5.7 | -3.2 |
| q00 | radial B_bottom_240_300: outer_dark | 16.0 | 3.9 | -1.4 |
| q03 | radial A_right_m25_25: inner_dark | 54.5 | 51.9 | -21.5 |
| q03 | radial A_right_m25_25: outer_dark | -4.0 | -4.2 | 0.3 |
| q00 | mask A: core L minus 0-3 px rim L (negative = bright rim) | 25.1 | 16.6 | -7.5 |
| q00 | mask A_right: core L minus 0-3 px rim L (negative = bright rim) | -3.5 | -1.0 | -24.8 |
| q00 | mask B: core L minus 0-3 px rim L (negative = bright rim) | 7.0 | -0.7 | -15.1 |
| q03 | mask A_right: core L minus 0-3 px rim L (negative = bright rim) | -21.8 | -13.4 | -8.7 |
| q03 | mask B: core L minus 0-3 px rim L (negative = bright rim) | -6.7 | -6.9 | -16.9 |
| q03 | mask C: core L minus 0-3 px rim L (negative = bright rim) | 6.2 | 0.7 | -14.4 |
| p06 | mask A_left: core L minus 0-3 px rim L (negative = bright rim) | 4.0 | 3.3 | -24.8 |
| p06 | mask B: core L minus 0-3 px rim L (negative = bright rim) | 15.5 | -3.7 | 4.0 |

### Table 3. Ring value and hue relative to the background behind it (hero hidden)

| pose | ring | twin dL / dB-R (own background) | reference dL / dB-R (vs the engine background) | engine dL / dB-R (own background) |
|---|---|---|---|---|
| q00 | A_left | -4.3 / 6.1 | -9.5 / 5.8 | -21.2 / 7.7 |
| q00 | A_right | 1.5 / 22.0 | -7.4 / 23.9 | -23.0 / 35.0 |
| q00 | B | 3.0 / 9.1 | -2.2 / 8.2 | -29.5 / 30.2 |
| q00 | C | 2.4 / 8.6 | -4.4 / 9.2 | -12.3 / 11.7 |
| q00 | D | -10.3 / 11.2 | -17.2 / 13.2 | -15.0 / 4.3 |
| q03 | A_right | -12.6 / 21.9 | -23.9 / 25.9 | -27.6 / 28.2 |
| q03 | A_left | -16.5 / 20.4 | -11.8 / 14.8 | -9.7 / 14.2 |
| q03 | B | -15.5 / 15.5 | -23.1 / 16.0 | -28.5 / 20.7 |
| q03 | C | 13.6 / 4.3 | -0.7 / 10.8 | -12.5 / 16.9 |
| p06 | A_top | -13.7 / 13.7 | -4.2 / 4.1 | -27.6 / 20.7 |
| p06 | A_right | -29.8 / 22.1 | -22.5 / 9.8 | -35.3 / 23.8 |
| p06 | A_left | -18.3 / 15.1 | -5.2 / 2.6 | -44.2 / 35.4 |
| p06 | B | -14.9 / 17.5 | -8.3 / 7.6 | -12.4 / 5.8 |
| p06 | C | -4.8 / 9.7 | 2.6 / 0.3 | -12.6 / 0.4 |

### Table 4. Silhouette wobble (residual of a robust degree-4/6 fit; px RMS / p95 / angularity)

| pose | outline | twin | twin, no displacement | reference | engine |
|---|---|---|---|---|---|
| q00 | B_outer_top | 0.80 / 1.60 / 4.0 | 0.31 / 0.56 / 4.0 | 1.12 / 2.48 / 7.2 | 0.49 / 1.03 / 2.6 |
| q00 | B_outer_bottom | 0.96 / 1.83 / 4.0 | 0.31 / 0.58 / 3.9 | (track not clean: 2.55) | 0.61 / 1.19 / 3.7 |
| q00 | C_outer_top | 0.77 / 1.47 / 4.4 | 0.30 / 0.55 / 4.0 | (track not clean: 2.03) | 0.81 / 1.63 / 2.7 |
| q03 | A_outer_right | 0.83 / 1.56 / 3.9 | - | (track not clean: 2.22) | 0.74 / 1.39 / 3.3 |
| q03 | A_outer_left | 0.91 / 1.67 / 4.3 | - | (track not clean: 2.90) | 0.76 / 1.59 / 3.1 |
| p06 | A_outer_right | 1.80 / 3.17 / 4.2 | - | (track not clean: 3.04) | 1.01 / 1.96 / 4.2 |

### Table 5. Orb, shards

| pose | measure | twin | reference | engine |
|---|---|---|---|---|
| q00 | orb (mask): L / sd / DoG | 224.0 / 30.7 / 5.13 | 233.3 / 24.0 / 4.82 | 235.4 / 18.9 / 1.84 |
| q03 | orb (mask): L / sd / DoG | 238.7 / 24.0 / 5.58 | 239.0 / 20.9 / 4.24 | 237.2 / 17.2 / 2.67 |
| p06 | orb (mask): L / sd / DoG | 231.0 / 29.7 / 4.87 | 226.5 / 14.7 / 4.15 | 247.0 / 9.1 / 1.83 |
| q00 | cobalt shards, self-segmented: L / sd / B-R / RGB | 133.1 / 22.7 / 96.8 / (101, 136, 198) | 138.4 / 20.6 / 95.4 / (108, 141, 203) | 132.7 / 16.3 / 100.9 / (99, 136, 200) |
| q03 | cobalt shards, self-segmented: L / sd / B-R / RGB | 121.9 / 21.7 / 90.6 / (90, 126, 180) | 134.0 / 18.9 / 96.9 / (102, 137, 199) | 138.8 / 16.8 / 91.5 / (104, 143, 196) |
| p06 | cobalt shards, self-segmented: L / sd / B-R / RGB | 122.3 / 24.6 / 95.0 / (89, 126, 184) | 127.7 / 22.7 / 97.2 / (96, 130, 193) | 130.0 / 18.2 / 113.1 / (97, 132, 210) |

### Table 6. Twin light paths (linear luminance shares in the ring masks)

| pose | region | transmission | glossy | combined Y |
|---|---|---|---|---|
| q00 | A_over_orb | 99.5 % | 0.4 % | 5.357 |
| q00 | A_left | 82.0 % | 18.3 % | 1.262 |
| q00 | A_right | 95.9 % | 4.3 % | 0.593 |
| q00 | B | 91.8 % | 8.4 % | 0.972 |
| q00 | C | 91.6 % | 8.5 % | 0.974 |
| q00 | D | 93.0 % | 7.2 % | 0.954 |
| q00 | shards | 72.4 % | 28.1 % | 0.393 |
| q03 | A_right | 93.6 % | 6.6 % | 0.626 |
| q03 | B | 79.9 % | 20.4 % | 0.940 |
| q03 | C | 78.0 % | 22.1 % | 1.634 |
| q03 | D_over_orb | 99.5 % | 0.4 % | 5.395 |
| p06 | A_top | 86.9 % | 13.2 % | 1.586 |
| p06 | A_right | 96.4 % | 3.7 % | 0.746 |
| p06 | B | 90.4 % | 9.8 % | 1.583 |
| p06 | B_over_orb | 99.0 % | 1.1 % | 2.470 |
| p06 | shards | 83.9 % | 16.6 % | 0.341 |

| q00 region | beauty Y | orb hidden Y | orb-only Y | orb share |
|---|---|---|---|---|
| A_over_orb | 5.357 | 0.571 | 4.779 | 89 % |
| A_left | 1.262 | 1.129 | 0.138 | 11 % |
| A_right | 0.593 | 0.517 | 0.092 | 16 % |
| B | 0.972 | 0.698 | 0.276 | 28 % |
| C | 0.974 | 0.768 | 0.191 | 20 % |
| D | 0.954 | 0.704 | 0.258 | 27 % |
| shards | 0.393 | 0.364 | 0.029 | 7 % |

| environment box | twin L / B-R | reference L / B-R | engine L / B-R |
|---|---|---|---|
| q00 env_sky_above | 209.2 / 23.1 | 216.9 / 26.0 | 214.9 / 29.5 |
| q00 env_sky_left | 203.4 / 32.6 | 205.7 / 37.5 | 207.9 / 40.4 |
| q00 env_lake_below | 176.7 / 29.1 | 185.9 / 32.3 | 186.0 / 27.6 |
| q00 env_mountain | 168.5 / 24.1 | 154.8 / 33.6 | 166.1 / 32.1 |
| q00 env_iceberg | 125.2 / 60.0 | 139.5 / 53.9 | 119.4 / 70.4 |

