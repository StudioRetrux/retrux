export const meta = {
  name: 'hero-qc-judge-round2',
  description: 'Score the real-time Retrux hero vs the Cycles reference and Figma with 7 independent lens judges, then synthesize a ranked fix plan',
  phases: [
    { title: 'Judge', detail: '7 independent lens judges score the captures 0-10 with evidence' },
    { title: 'Plan', detail: 'merge issues, map them to engine code, rank fix tasks' },
  ],
}

const R = args.dir
const REFD = 'E:\\Retrux Hero R&D\\hero-pipeline\\reference'
const FF = 'E:\\Retrux Hero R&D\\hero-pipeline\\tools\\node_modules\\ffmpeg-static\\ffmpeg.exe'
const ENG = 'E:\\Retrux Hero R&D\\retrux-web\\app\\hero\\engine'
const f = (n) => `${R}\\${n}`

const PREAMBLE = `You are one judge on an independent QC panel for the hero section of the Retrux studio website.

WHAT IT IS: a real-time three.js (WebGL2) scene that recreates a Blender Cycles reference animation ("State 2 to 5.mp4", "Default Loop.mp4") and a Figma frame. An ice sculpture of four thick ice rings (A-D) surrounds a glowing white-cyan plasma orb; cobalt-blue crystal shards orbit it. Behind it is an arctic lake with snowy mountains, icebergs, ice floes and rocks (a camera-projected baked environment plate), and water with concentric ripples. Interactions (the client's spec): an idle tumble motion-captured from the Default Loop (4 s); a single click does NOTHING (by design, do not penalize); press-and-hold = the video's expand F331-F442 in slow motion (rings keep moving, the outer rings open, the camera dollies in); release -> reassembly. The click-triggered collapse of the State video was removed on purpose. The goal is an Awwwards Site-of-the-Year-level, photoreal result that matches the reference.

CAPTURES (all 1440x766, headless Chrome, quality tier T1 = the tier Apple-silicon Macs get, render scale 1, deterministic poses; the ring tumble clock is pinned to the reference moment):
- cmp_<pose>.jpg: ENGINE on TOP, REFERENCE on BOTTOM (each scaled to 960x511).
- crop_<pose>_<region>.jpg: full-resolution crops; ENGINE LEFT | REFERENCE RIGHT, except wide crops, which are ENGINE TOP / REFERENCE BOTTOM.
- <pose>.png: the full engine frame. Reference frames: ${REFD}\\ref_F###.png (State video), ${REFD}\\loop_F###.png (Default Loop), ${REFD}\\figma_hero_2497-2204.png (Figma frame).
- Pose -> reference: q00_rest->ref_F000 (= loop F000), q01_loop15->loop_F015, q02_loop30->loop_F030, q03_eye->loop_F045 (the eye), p04_expand_pop->ref_F358, p05_expand->ref_F402, p06_sustain->ref_F420 (hold, camera dollied in), p07_release_snap->ref_F453, p08_release_home->ref_F460, ui_rest->Figma frame.

DO NOT PENALIZE: shard positions (they run on their own clock), cloud positions (they drift), water-ripple phase, the thin hollow white circle (~79 px) in the reference frames (it is the video's custom cursor), H.264 softness of the reference. In the Figma frame the rings are at a different moment of their animation, so ignore the ring pose there. The State video after ~F045 is a hand-keyed demo, so collapse/expand ring poses can only match approximately.

KNOWN: the environment plate was baked from a different .blend than the one used for the reference. The reference's far mountains sit ~35-55 px further left, it has a dark navy shadowed ridge at the far left, and volumetric mist at the peak and mountain bases. Score what you see. Set needs_render_blend=true only when shader work or retouching the plate image could not plausibly fix it.

SCORING for your lens: 10 = indistinguishable from the reference at a glance, nothing a demanding art director would flag. 9 = only an expert notices, side by side. 8 = noticeable differences but still premium. 7 = clearly different, or some CG tells. 6 or lower = significant problems. Use one decimal. Be strict and honest, because the team wants a real 10/10, not flattery.

RULES: Read EVERY image listed for your lens (use the Read tool on each path). To zoom, you may cut extra crops with ffmpeg: "${FF}" -y -loglevel error -i <in> -vf crop=w:h:x:y <out>. Write them only into ${R}\\zoom_<your lens>\\ and run one process at a time. NEVER launch Chrome, node, npm, Blender, builds or anything heavy: this is an 8 GB laptop that freezes. Do not edit any project file.

For each issue give: the poses it affects; precise evidence (image file + pixel region + what the engine shows vs what the reference shows); a concrete suggested fix (what to change visually and, if you can tell, how, e.g. smoother normal perturbation, stronger mist band, brighter orb core); the estimated score gain in your lens; needs_render_blend. Also list what already matches well, so nobody breaks it. Order issues by impact.`

const LENSES = [
  {
    key: 'composition_motion',
    focus: `LENS: COMPOSITION, POSES AND MOTION. Judge ring orientations, which rings are face-on/edge-on/tilted, their sizes, centre positions, overlaps and depth order; orb placement and visibility; shard belt layout; camera framing (rest, pop, dollied-in hold). Check each pose against its reference, and the progression q00->q01->q02->q03 (the 4 s loop) and p04->p08 (pop -> sustain -> release). In particular, check whether rings C/D (the inner rings) match the reference at q00 (in ref_F000 the inner rings look face-on and concentric) and at q01/q02.`,
    images: ['cmp_q00_rest.jpg','crop_q00_rest_hero.jpg','cmp_q01_loop15.jpg','crop_q01_loop15_hero.jpg','cmp_q02_loop30.jpg','crop_q02_loop30_hero.jpg','cmp_q03_eye.jpg','crop_q03_eye_hero.jpg','cmp_p04_expand_pop.jpg','cmp_p05_expand.jpg','cmp_p06_sustain.jpg','crop_p06_sustain_hero.jpg','cmp_p07_release_snap.jpg','cmp_p08_release_home.jpg','log.txt'],
  },
  {
    key: 'ice_material',
    focus: `LENS: ICE MATERIAL REALISM. Judge the ring ice against the Cycles reference: thickness read, transmission/clarity vs frost, surface smoothness vs bumpiness, scale and character of the frost/crack detail, refraction of the background and the orb through the ice, Fresnel/edge highlights, specular glints, inner dark refracted bands, colour (cyan/blue tint), and any CG tells (noise, banding, aliasing, seams, crawling, blockiness, overly busy high-frequency detail). Zoom into the full-res crops and the full frames.`,
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
    focus: `LENS: ENVIRONMENT. Judge the sky and clouds, the mountains (shape, position, snow shading, atmospheric haze, mist at the bases and peak, the dark left ridge), icebergs, far floes, foreground rocks, and the WATER (colour, the concentric ripple ring under the sculpture, reflections of the sculpture and the scenery, specular behaviour, near-to-far gradient). Use the region colour stats (mean sRGB per region, engine vs reference) in region_stats_q00.txt. Also look at the dollied-in hold (p06) for any plate stretching, parallax or resolution problems.`,
    images: ['cmp_q00_rest.jpg','crop_q00_rest_mountains.jpg','crop_q00_rest_water.jpg','crop_q00_rest_right.jpg','region_stats_q00.txt','cmp_p06_sustain.jpg','q00_rest.png'],
    refs: ['ref_F000.png','figma_hero_2497-2204.png'],
  },
  {
    key: 'color_grade_post',
    focus: `LENS: COLOUR GRADE AND POST. Judge the global tonal and colour match: white balance, saturation, contrast curve, black and white points, atmospheric depth, bloom amount and threshold, vignette, sharpness vs softness, grain/noise, and any banding. Use region_stats_q00.txt (mean sRGB per region: engine, reference, diff) and say which regions are off and by how much. Compare the rest, the eye, the pop and the dollied-in hold.`,
    images: ['cmp_q00_rest.jpg','region_stats_q00.txt','cmp_q03_eye.jpg','cmp_p06_sustain.jpg','q00_rest.png'],
    refs: ['ref_F000.png'],
  },
  {
    key: 'ui_figma',
    focus: `LENS: UI OVERLAY vs FIGMA. Compare the page UI with the Figma frame: logo (size, position), nav items (font, size, weight, spacing, position, colour), the H1 "Ridiculously innovative studio for humankind" (font, size, line-height, letter-spacing, line breaks, position, colour), the subline, "Scroll to Explore", the Sound button and its wave icon (in Figma it is a sine-wave glyph), the top/bottom gradient overlay, and text legibility over the scene. Measure positions in pixels on the full-res crops (engine vs Figma) and report offsets in px. Ignore the ring pose, which is a different moment.`,
    images: ['cmp_ui_rest.jpg','crop_ui_rest_copy.jpg','crop_ui_rest_nav.jpg','crop_ui_rest_sound.jpg','crop_ui_rest_scroll.jpg','ui_rest.png'],
    refs: ['figma_hero_2497-2204.png'],
  },
  {
    key: 'awwwards_jury',
    focus: `LENS: AWWWARDS JURY (holistic). Judge as a senior Awwwards SOTY juror and a lead 3D artist would: realism, art direction, polish, cohesion, wow factor, and how close it is to the reference render, which is the target. Name the five things that most stand between this and a 10/10, in order. Consider every capture, including the UI frame. Known facts: it runs at 60 fps on an Intel Iris 640 laptop at the low tier and holds 33-60 fps at the high tier; it has a custom cursor, a loader, a text reveal and sound.`,
    images: ['cmp_q00_rest.jpg','cmp_ui_rest.jpg','crop_q00_rest_hero.jpg','cmp_q03_eye.jpg','cmp_p05_expand.jpg','cmp_p06_sustain.jpg','crop_p06_sustain_hero.jpg'],
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
const judged = await parallel(LENSES.map((L) => () => {
  const imgs = L.images.map((n) => `- ${f(n)}`).concat((L.refs || []).map((n) => `- ${REFD}\\${n}`)).join('\n')
  return agent(`${PREAMBLE}\n\n${L.focus}\n\nYour lens key is "${L.key}". Read these files (all of them):\n${imgs}\n\nThen return your structured verdict.`, { label: `judge:${L.key}`, phase: 'Judge', schema: JUDGE })
}))
const results = judged.filter(Boolean)
const dropped = LENSES.filter((L, i) => !judged[i]).map((L) => L.key)
if (dropped.length) log(`judges that returned nothing: ${dropped.join(', ')}`)
log('scores: ' + results.map((r) => `${r.lens} ${r.score}`).join(' | '))

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

Key files: hero\\Rings.ts (ring tumble chains: DEFS with tumble [axis, rate] lists; tau clock; EYE_TIME 1.5; hold/expand poses), hero\\IceMaterial.ts (ice shader: frost noise, bump layers, thick-lens refraction, cracks, displacement), hero\\Orb.ts (plasma orb), hero\\Shards.ts, world\\Water.ts (ripples, reflections), world\\PlateEnvironment.ts (camera-projected baked plate, clouds, fog), pipeline\\PostChain.ts (bloom, vignette, tone mapping), uniforms.ts (fog uFog/uFogHeight etc.), Choreography.ts, ui\\SoundWave.ts, HeroEngine.ts. The UI lives in E:\\Retrux Hero R&D\\retrux-web\\app\\components\\HeroOverlay.tsx and E:\\Retrux Hero R&D\\retrux-web\\hero-lab\\index.html. The baked plate is public\\hero\\plate_rest.webp (with plate.json); a Blender bake is impossible without the artist's render .blend, but the plate image can be retouched (e.g. a mist band or regrading a region) or the effect can be done in a shader.

Read the code you need, but do NOT edit anything and do NOT run anything heavy (no Chrome, node builds, npm or Blender; 8 GB laptop). Read-only file tools only.

The panel's verdicts (JSON):
${JSON.stringify(results, null, 1)}

Produce:
1. overall_score (the mean of the lens scores) and per_lens.
2. fix_tasks: merge duplicate issues across lenses into single tasks; rank them by the expected gain in overall quality per unit of risk (priority 1 = do first); give each a root cause grounded in the code you read (name the constants, uniforms and functions), a concrete implementation plan (which values to change and to what, starting values for tuning, and what to compare against), the files, the capture poses that verify it (q00_rest, q01_loop15, q02_loop30, q03_eye, p01..p08, ui), the expected gain, and the risks (what could regress, which tiers). Keep tasks independent where possible, so they can be applied and verified one at a time.
3. blocked: what truly needs the artist's render .blend.
4. disagreements: where judges contradicted each other, and your call.`, { label: 'plan', phase: 'Plan', schema: PLAN })

return { results, plan }



