export const meta = {
  name: 'hero-qc-judge-round4',
  description: 'Score the real-time Retrux hero vs the Cycles reference with 6 lens judges + 2 glitch hunters, then synthesize a ranked fix plan',
  phases: [
    { title: 'Judge', detail: 'independent lens judges and glitch hunters score the captures 0-10 with evidence' },
    { title: 'Plan', detail: 'merge issues, map them to engine code, rank fix tasks' },
  ],
}

const R = args.dir
const REFD = '/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/hero-pipeline/reference'
const FF = (process.env.FFMPEG || "/opt/homebrew/bin/ffmpeg")
const ENG = '/Users/muhamadrifaldi/Documents/GitHub/retrux-hero-rnd/retrux-web/app/hero/engine'
const f = (n) => `${R}\\${n}`

const PREAMBLE = `You are one judge on an independent QC panel for the hero section of the Retrux studio website.

WHAT IT IS: a real-time three.js (WebGL2) scene that recreates a Blender Cycles reference animation ("State 2 to 5.mp4", "Default Loop.mp4") and a Figma frame. An ice sculpture of four thick ice rings (A-D) surrounds a glowing white-cyan plasma orb; cobalt-blue crystal shards orbit it. Behind it is an arctic lake with snowy mountains, icebergs, ice floes and rocks (a camera-projected baked environment plate), and water with concentric ripples. Interactions (the client's spec): an idle tumble motion-captured from the Default Loop (4 s); the pointer near the screen edges orbits / pans the camera a little, the pointer near the orb pushes in slightly (~1.12x); a single click does NOTHING (by design, do not penalize); press-and-hold = the video's expand F331-F442 in slow motion (rings keep moving, the outer rings open, the camera dollies in); release -> reassembly. The click-triggered collapse of the State video was removed on purpose. The goal is an Awwwards Site-of-the-Year-level, photoreal result that matches the reference, with NO visual glitches anywhere (the client was explicit: nothing weird at the bottom of the frame, no doubled mountains when the camera moves with the cursor).

CAPTURES (all 1440x766, headless Chrome, quality tier T1 = the tier Apple-silicon Macs get, render scale 1, deterministic poses; the ring tumble clock is pinned to the reference moment):
- cmp_<pose>.jpg: ENGINE on TOP, REFERENCE on BOTTOM (each scaled to 960x511).
- crop_<pose>_<region>.jpg: full-resolution crops; ENGINE LEFT | REFERENCE RIGHT, except wide crops, which are ENGINE TOP / REFERENCE BOTTOM.
- <pose>.png: the full engine frame. Reference frames: ${REFD}\\ref_F###.png (State video), ${REFD}\\loop_F###.png (Default Loop), ${REFD}\\figma_hero_2497-2204.png (Figma frame).
- Pose -> reference: q00_rest->ref_F000 (= loop F000), q01_loop15->loop_F015, q02_loop30->loop_F030, q03_eye->loop_F045 (the eye), p04_expand_pop->ref_F358, p05_expand->ref_F402, p06_sustain->ref_F420 (hold, camera dollied in), p07_release_snap->ref_F453, p08_release_home->ref_F460, ui_rest->Figma frame.
- ptr\\ptr_<spot>.png: the rest pose with the pointer pinned at a screen spot (left, right, top, bottom, top_left, top_right, bottom_left, bottom_right, orb, rest), i.e. the camera orbited / pushed in by the cursor. There is no reference frame for these: they must simply look like the same photoreal scene seen from a slightly different place, with no artefacts.
- sweep\\sweep.jpg: contact sheet (6 per row, 320x171 thumbnails): the intro (8 frames), then hold / pop / release with the pointer at the edges (L, R, T, B, BL, TR), then 8 idle tumble phases. Full frames: sweep\\sw_<name>.png (intro_0..7, hold_L/R/T/B/BL/TR, pop_..., rel_..., tau_0.25..3.75).

DO NOT PENALIZE: shard positions (they run on their own clock), cloud positions (they drift), water-ripple phase, the thin hollow white circle (~79 px) in the reference frames (it is the video's custom cursor), H.264 softness of the reference. In the Figma frame the rings are at a different moment of their animation, so ignore the ring pose there. The State video after ~F045 is a hand-keyed demo, so expand ring poses can only match approximately.

KNOWN: the artist's render .blend is not available. The environment plates (version v7) are baked in Cycles from the team's own reconstruction of the scene (a copy of the export .blend with the massif turned toward the reference position and blended seamlessly into the ridge's foot, baked volumetric base mist, and a dark navy rock material on the lowered far-left ridge baked into the plate, so there is no shader overlay for the ridge any more), from five cameras: rest, hover push-in, hold dolly and two orbit views, blended per pixel. The hold-only fog bank over the mountain bases and a slope haze on the massif are shader effects. Score what you see. Set needs_render_blend=true only when neither shader work, nor re-baking the team's Blender reconstruction, nor retouching the plate image could plausibly fix it.

SCORING for your lens: 10 = indistinguishable from the reference at a glance, nothing a demanding art director would flag. 9 = only an expert notices, side by side. 8 = noticeable differences but still premium. 7 = clearly different, or some CG tells. 6 or lower = significant problems. Use one decimal. Be strict and honest, because the team wants a real 10/10, not flattery.

RULES: Read EVERY image listed for your lens (use the Read tool on each path). To zoom, you may cut extra crops with ffmpeg: "${FF}" -y -loglevel error -i <in> -vf crop=w:h:x:y <out>. Write them only into ${R}\\zoom_<your lens>\\ and run one process at a time. NEVER launch Chrome, node, npm, Blender, builds or anything heavy: this is an 8 GB laptop that freezes. Do not edit any project file.

For each issue give: the poses it affects; precise evidence (image file + pixel region + what the engine shows vs what the reference shows); a concrete suggested fix (what to change visually and, if you can tell, how, e.g. smoother normal perturbation, stronger mist band, brighter orb core); the estimated score gain in your lens; needs_render_blend. Also list what already matches well, so nobody breaks it. Order issues by impact.`

const PTR = ['rest', 'left', 'right', 'top', 'bottom', 'top_left', 'top_right', 'bottom_left', 'bottom_right', 'orb'].map((s) => `ptr\\ptr_${s}.png`)

const LENSES = [
  {
    key: 'composition_motion',
    focus: `LENS: COMPOSITION, POSES AND MOTION. Judge ring orientations, which rings are face-on/edge-on/tilted, their sizes, centre positions, overlaps and depth order; orb placement and visibility; shard belt layout; camera framing (rest, pop, dollied-in hold). Check each pose against its reference, and the progression q00->q01->q02->q03 (the 4 s loop) and p04->p08 (pop -> sustain -> release). In particular, check whether rings C/D (the inner rings) match the reference at q00 (in ref_F000 the inner rings look face-on and concentric) and at q01/q02/q03.`,
    images: ['cmp_q00_rest.jpg','crop_q00_rest_hero.jpg','cmp_q01_loop15.jpg','crop_q01_loop15_hero.jpg','cmp_q02_loop30.jpg','crop_q02_loop30_hero.jpg','cmp_q03_eye.jpg','crop_q03_eye_hero.jpg','cmp_p04_expand_pop.jpg','cmp_p05_expand.jpg','cmp_p06_sustain.jpg','crop_p06_sustain_hero.jpg','cmp_p07_release_snap.jpg','cmp_p08_release_home.jpg','log.txt'],
  },
  {
    key: 'ice_material',
    focus: `LENS: ICE MATERIAL REALISM. Judge the ring ice against the Cycles reference: thickness read, transmission/clarity vs frost, surface smoothness vs bumpiness, scale and character of the frost/crack detail, refraction of the background, of the orb and of the other rings through the ice (the front rings now refract the rings behind them), Fresnel/edge highlights, specular glints, inner dark refracted bands, colour (cyan/blue tint), value range (is the ice too milky / too bright / too dark vs the reference?), silhouette (the reference ring outlines are irregular, chiselled), and any CG tells (noise, banding, aliasing, seams, crawling, blockiness, overly busy high-frequency detail). Zoom into the full-res crops and the full frames.`,
    images: ['crop_q00_rest_hero.jpg','crop_q01_loop15_hero.jpg','crop_q02_loop30_hero.jpg','crop_q03_eye_hero.jpg','crop_p06_sustain_hero.jpg','cmp_p05_expand.jpg','q00_rest.png','p06_sustain.png'],
    refs: ['ref_F000.png','ref_F420.png','loop_F045.png'],
  },
  {
    key: 'orb_shards_light',
    focus: `LENS: ORB, SHARDS AND LIGHT. Judge the plasma orb: core brightness and clipping, colour (white-cyan core, swirl structure), glow/bloom halo, how it reads through and behind the rings, and its reflection/light on the ice. Judge the cobalt crystal shards: colour saturation, size, material (faceted crystal, light/dark facets), sharpness, count and density, and depth cues. Judge light interplay (rim lights, highlights, glow in the hold and expand poses).`,
    images: ['crop_q00_rest_hero.jpg','crop_q03_eye_hero.jpg','crop_p06_sustain_hero.jpg','cmp_q00_rest.jpg','cmp_p04_expand_pop.jpg','cmp_p05_expand.jpg','cmp_p06_sustain.jpg'],
    refs: ['ref_F000.png','ref_F420.png'],
  },
  {
    key: 'environment',
    focus: `LENS: ENVIRONMENT. Judge the sky and clouds, the mountains (shape, position, snow shading, atmospheric haze, mist at the bases and peak, the dark left ridge), icebergs, far floes, foreground rocks, and the WATER (colour, the concentric ripple ring under the sculpture, reflections of the sculpture and the scenery, specular behaviour, near-to-far gradient). Use the region colour stats (mean sRGB per region, engine vs reference) in region_stats_q00.txt. Look hard at the dollied-in hold (p06_sustain.png vs ref_F420) for plate stretching, tearing of near floes / rocks, parallax or resolution problems, and judge the hold's fog over the mountain bases against F420.`,
    images: ['cmp_q00_rest.jpg','crop_q00_rest_mountains.jpg','crop_q00_rest_water.jpg','crop_q00_rest_right.jpg','region_stats_q00.txt','cmp_p06_sustain.jpg','p06_sustain.png','q00_rest.png'],
    refs: ['ref_F000.png','ref_F420.png','figma_hero_2497-2204.png'],
  },
  {
    key: 'color_grade_post',
    focus: `LENS: COLOUR GRADE AND POST. Judge the global tonal and colour match: white balance, saturation, contrast curve, black and white points, atmospheric depth, bloom amount and threshold, vignette, sharpness vs softness, grain/noise, and any banding. Use region_stats_q00.txt (mean sRGB per region: engine, reference, diff) and say which regions are off and by how much. Compare the rest, the eye, the pop and the dollied-in hold.`,
    images: ['cmp_q00_rest.jpg','region_stats_q00.txt','cmp_q03_eye.jpg','cmp_p04_expand_pop.jpg','cmp_p06_sustain.jpg','q00_rest.png'],
    refs: ['ref_F000.png'],
  },
  {
    key: 'awwwards_jury',
    focus: `LENS: AWWWARDS JURY (holistic). Judge as a senior Awwwards SOTY juror and a lead 3D artist would: realism, art direction, polish, cohesion, wow factor, and how close it is to the reference render, which is the target. Name the five things that most stand between this and a 10/10, in order. Consider every capture, including the UI frame and the cursor-orbit frames. Known facts: it runs at 60 fps on an Intel Iris 640 laptop at the low tier and holds 33-60 fps at the high tier; it has a custom cursor, a loader, a text reveal and sound.`,
    images: ['cmp_q00_rest.jpg','cmp_ui_rest.jpg','crop_q00_rest_hero.jpg','cmp_q03_eye.jpg','cmp_p05_expand.jpg','cmp_p06_sustain.jpg','crop_p06_sustain_hero.jpg','ptr\\ptr_left.png','ptr\\ptr_bottom_right.png'],
  },
  {
    key: 'glitch_cursor_orbit',
    focus: `LENS: GLITCH HUNT, CURSOR ORBIT (score = how glitch-free; 10 = not a single artefact). The client was explicit: when the cursor moves the camera, the mountains etc. must never look doubled, and the bottom of the frame must have nothing weird. Inspect every ptr_<spot>.png at full resolution, region by region (cut zoom crops: the far-left ridge, every mountain silhouette and skyline, the iceberg on the right, the far floes, the foreground rocks bottom-left and bottom-right, the bottom 120 px strip across the whole width, the lake around the sculpture, the frame edges). Compare each against ptr_rest.png (the rest view, which is the clean baked plate). Hunt for: doubled / ghosted silhouettes, bright seams or hairlines, smeared or stretched texels, stair-stepped bands, plate edges, holes, colour patches that do not belong, wrong reflections, z-fighting, aliasing. For every artefact give the exact file and pixel box and describe it. Ignore shard positions and cloud drift.`,
    images: PTR,
  },
  {
    key: 'glitch_hold_sweep',
    focus: `LENS: GLITCH HUNT, HOLD / RELEASE / INTRO / TUMBLE SWEEP (score = how glitch-free; 10 = not a single artefact). Start from sweep\\sweep.jpg to find suspicious frames, then read the full frames listed below at full resolution and cut zoom crops (bottom strip, the near lake, near floes and rocks, the mountains, the ring silhouettes, the orb). Hunt for: torn or stretched near floes / rocks, stair-stepped texel bands on the water, doubled silhouettes, seams, hard edges of fog or mist, colour patches, plate edges, ring self-intersection or flat bullseye poses, rings popping through each other, aliasing, banding, holes. In the hold (camera dollied in) the reference F420 has a soft fog over the mountain bases: soft is right, a hard-edged band is not. For every artefact give the exact file and pixel box and describe it. Ignore shard positions and cloud drift.`,
    images: ['sweep\\sweep.jpg','sweep\\sw_hold_L.png','sweep\\sw_hold_R.png','sweep\\sw_hold_B.png','sweep\\sw_hold_BL.png','sweep\\sw_hold_TR.png','sweep\\sw_pop_B.png','sweep\\sw_rel_BL.png','sweep\\sw_intro_3.png','sweep\\sw_tau_1.25.png','sweep\\sw_tau_2.75.png','p06_sustain.png'],
    refs: ['ref_F420.png'],
  },
]

const ISSUE = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
    poses: { type: 'array', items: { type: 'string' } },
    evidence: { type: 'string' },
    suggested_fix: { type: 'string' },
    score_gain: { type: 'number' },
    needs_render_blend: { type: 'boolean' },
  },
  required: ['title', 'severity', 'evidence', 'suggested_fix', 'score_gain', 'needs_render_blend'],
}
const JUDGE = {
  type: 'object',
  properties: {
    lens: { type: 'string' },
    score: { type: 'number' },
    verdict: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    issues: { type: 'array', items: ISSUE },
  },
  required: ['lens', 'score', 'verdict', 'strengths', 'issues'],
}

phase('Judge')
const ACTIVE = args.lenses ? LENSES.filter((L) => args.lenses.includes(L.key)) : LENSES
const judged = await parallel(ACTIVE.map((L) => () => {
  const imgs = L.images.map((n) => `- ${f(n)}`).concat((L.refs || []).map((n) => `- ${REFD}\\${n}`)).join('\n')
  return agent(`${PREAMBLE}\n\n${L.focus}\n\nYour lens key is "${L.key}". Read these files (all of them):\n${imgs}\n\nThen return your structured verdict.`, { label: `judge:${L.key}`, phase: 'Judge', schema: JUDGE })
}))
const results = judged.filter(Boolean)
const dropped = ACTIVE.filter((L, i) => !judged[i]).map((L) => L.key)
if (dropped.length) log(`judges that returned nothing: ${dropped.join(', ')}`)
log('scores: ' + results.map((r) => `${r.lens} ${r.score}`).join(' | '))
if (args.noPlan) return { results }

phase('Plan')
const PLAN = {
  type: 'object',
  properties: {
    overall_score: { type: 'number' },
    per_lens: { type: 'array', items: { type: 'object', properties: { lens: { type: 'string' }, score: { type: 'number' } }, required: ['lens', 'score'] } },
    fix_tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          lenses: { type: 'array', items: { type: 'string' } },
          priority: { type: 'number' },
          evidence_summary: { type: 'string' },
          root_cause: { type: 'string' },
          implementation_plan: { type: 'string' },
          files: { type: 'array', items: { type: 'string' } },
          verify_poses: { type: 'array', items: { type: 'string' } },
          expected_gain: { type: 'string' },
          risk: { type: 'string' },
          needs_render_blend: { type: 'boolean' },
        },
        required: ['id', 'title', 'priority', 'evidence_summary', 'implementation_plan', 'files', 'verify_poses', 'risk', 'needs_render_blend'],
      },
    },
    blocked: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, why: { type: 'string' } }, required: ['title', 'why'] } },
    disagreements: { type: 'string' },
  },
  required: ['overall_score', 'per_lens', 'fix_tasks', 'blocked'],
}
const plan = await agent(`You are the lead technical artist turning an independent QC panel's findings into a ranked fix plan for a real-time three.js hero (vanilla three.js r184, TypeScript) at ${ENG}.

Key files: hero\\Rings.ts (ring tumble: mocap tracks in hero\\ringMocap.ts, tau clock, EYE_TIME 1.5, hold/expand poses and alignment), hero\\IceMaterial.ts (ice shader: frost noise, facets, creases, thick-lens refraction, absorption, cracks, ICE_SPLIT for ice behind ice), hero\\Orb.ts (plasma orb), hero\\Shards.ts, world\\Water.ts (ripples, plate re-aimed reflections, live mirror, hold fog bank), world\\PlateEnvironment.ts (camera-projected baked plate, projector depth + occlusion fill, region grades, ridge navy, haze, far-shore mist, hold fog bank plateBank, clouds), pipeline\\RenderPipeline.ts (frame graph), pipeline\\PostChain.ts (bloom, vignette, AgX), uniforms.ts, Choreography.ts, CameraRig.ts (pointer orbit, hover push-in, hold dolly), quality.ts (tiers), HeroEngine.ts. The UI lives in E:\\Retrux Hero R&D\\retrux-web\\app\\components\\HeroOverlay.tsx and E:\\Retrux Hero R&D\\retrux-web\\hero-lab\\index.html. The baked plates are public\\hero\\plate_<camera>.webp (with .json; v5), and the shader's ridge navy overlay is now disabled (multiplier 0) because v5 bakes the dark ridge. A Blender (Cycles, CPU only) re-bake of the team's reconstruction (a copy of "Home - EXPORT.blend" prepared by scratchpad\\pipeline\\prep_v2.py / prep_v3 / prep_v4.py, rendered by render_v5_all.ps1, about 2 hours for all five cameras) is possible but blocks every other heavy job on this 8 GB laptop; the artist's own render .blend is not available. The plate image can also be retouched, or the effect done in a shader.

Read the code you need, but do NOT edit anything and do NOT run anything heavy (no Chrome, node builds, npm or Blender; 8 GB laptop). Read-only file tools only.

The panel's verdicts (JSON):
${JSON.stringify(results, null, 1)}

Produce:
1. overall_score (the mean of the six quality lens scores: composition_motion, ice_material, orb_shards_light, environment, color_grade_post, awwwards_jury; report the two glitch-hunt scores in per_lens but outside the mean) and per_lens.
2. fix_tasks: merge duplicate issues across lenses into single tasks; rank them by the expected gain in overall quality per unit of risk (priority 1 = do first), but put every confirmed glitch the client would notice (doubled silhouettes, seams, tearing, weird bottom strip) at the top; give each a root cause grounded in the code you read (name the constants, uniforms and functions), a concrete implementation plan (which values to change and to what, starting values for tuning, and what to compare against), the files, the capture poses that verify it (q00_rest, q01_loop15, q02_loop30, q03_eye, p04..p08, ptr spots, sweep frames, ui), the expected gain, and the risks (what could regress, which tiers). Keep tasks independent where possible, so they can be applied and verified one at a time.
3. blocked: what truly needs the artist's render .blend.
4. disagreements: where judges contradicted each other, and your call.`, { label: 'plan', phase: 'Plan', schema: PLAN })

return { results, plan }
