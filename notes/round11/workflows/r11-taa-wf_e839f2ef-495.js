export const meta = {
  name: 'r11-taa',
  description: 'Temporal AA for the static environment (waterline crawl in motion): build, independent judge, narrow fix loop; no merge',
  phases: [{ title: 'Build' }, { title: 'Judge' }],
}
const SP = args.SP
const MAIN = args.MAIN
const INJ = args.inject || {}
const LANE = SP + '/lanes2/taa'
const BASE = SP + '/lanes2/aa'
const WORK = SP + '/work2/taa'
const SLOT = 'node ' + SP + '/slot/slot.mjs run'

const BUILD = {
  type: 'object',
  properties: {
    lane: { type: 'string' },
    status: { type: 'string', enum: ['done', 'partial', 'blocked'] },
    summary: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    switches: { type: 'array', items: { type: 'string' } },
    gates: { type: 'array', items: { type: 'object', properties: { gate: { type: 'string' }, status: { type: 'string', enum: ['pass', 'fail', 'unknown'] }, numbers: { type: 'string' } }, required: ['gate', 'status', 'numbers'] } },
    evidence: { type: 'array', items: { type: 'string' } },
    open_issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['lane', 'status', 'summary', 'files_changed', 'gates', 'open_issues'],
}
const VERDICT = {
  type: 'object',
  properties: {
    lane: { type: 'string' },
    pass: { type: 'boolean' },
    lens_score: { type: 'number' },
    gates: { type: 'array', items: { type: 'object', properties: { gate: { type: 'string' }, verdict: { type: 'string', enum: ['PASS', 'FAIL'] }, evidence: { type: 'string' } }, required: ['gate', 'verdict', 'evidence'] } },
    findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'nit'] }, title: { type: 'string' }, evidence: { type: 'string' }, fix_hint: { type: 'string' } }, required: ['severity', 'title', 'evidence', 'fix_hint'] } },
    summary: { type: 'string' },
  },
  required: ['lane', 'pass', 'lens_score', 'gates', 'findings', 'summary'],
}
const clean = (v) => !!v && (v.pass || !(v.findings || []).some((f) => f.severity === 'blocker' || f.severity === 'major'))

const CONTEXT = `PROJECT: Retrux hero R&D, a real-time three.js r184 (WebGL2, TypeScript) hero: four thick ice rings around a glowing orb with small cobalt crystal shards, over an arctic lake (baked environment + plate lake water, ice floes, rocks, snowy mountains, cloud cards, mist), matched to a Blender Cycles reference. Tiers: T1 = MSAA 4 (desktop), T0 = FXAA.

THE USER (18 Nov 22:30, verbatim): "paralel priority: benerin pinggiran air di deket es itu kalo geser kamera kek low quality anti aliasin gitu (semoga bener bahasanya), tapi dia aneh glitch gitu, make it smooth yaa" = the edge where the water meets the ice floes / rocks looks like low-quality anti-aliasing (jagged, crawling, glitchy) when the camera moves; make it smooth. The bar is AAA realism, 1:1 with the reference; no improvisation: nothing may change the look at rest, only the motion quality.

ALREADY IN MAIN (keep both, read their logs first):
1. hotfix2 (switch ?shoreaa=0): bilinear projector depth + SHORE_AA weights in the water shader removed the depth-map texel staircases. Log: ${SP}/work2/hotfix2/LOG.md (tools in that folder, e.g. bandw.mjs band masks bw_near / bws_far).
2. AA resolve (switch ?aaresolve=0): below the horizon the env materials (baked/plate, water) write tone-compressed color x = c/(K + luma c) (K 0.5) into the 4x MSAA target, the refraction copy and EnvEdge's armed triangle (runs inside the next render into main, before any hero object) expand it back; cloud cards hanging below eye level are carved out of the region. Outline big jumps fell 65-74 %. Log + crawl tools + crops: ${SP}/work2/aa/LOG.md, patch ${SP}/work2/aa/aa.patch.
What still crawls at the waterline in motion (the AA author's analysis): the lake's reflection of the floe sides (stair-stepped patches next to the rocks), glitter specks along the front slab, thin dark cracks covering a single sample, and only 4 samples per pixel. The AA author's recommendation: temporal AA for the static environment, which can be reprojected exactly from depth.

PATHS: LANE = ${LANE} (APFS clone of the whole repo; its retrux-web app is byte-identical to MAIN's at launch; edit freely). BASE = ${BASE} (the same state, the "before"; never edit it). WORK = ${WORK} (all outputs, LOG.md). MAIN = ${MAIN} (read-only; it will change during this run because another lane, water, merges into it, so compare against BASE, not MAIN). Labs: lane on port 5192, base on 5194: cd <LANE or BASE>/retrux-web && PORT=<port> nohup node hero-lab/serve.mjs > ${WORK}/lab_<port>.log 2>&1 & ; URL http://localhost:<port>/?tier=T1&debug=1 ; ready when document.documentElement.dataset.heroReady === "1" ; debug API window.__hero.debug.freeze(true) / settle(seconds) / pointer(nx, ny). Stop the labs you started before you return; never stop other servers (:5173, :3000, :5175, :5176, :5186-:5188, :5195-:5197 belong to others). Headless Chrome ONLY through the shared gate: ${SLOT} 'taa:<what>' -- <cmd> (if that file is missing use ${MAIN}/notes/round11/lane_backup/slot.mjs with SLOT_DIR=${SP}/slot). Playwright via createRequire("${MAIN}/hero-pipeline/tools/package.json"); Chrome "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" with ["--use-angle=metal","--enable-gpu","--ignore-gpu-blocklist"]; give browser.close() a timeout. Capture template: ${SP}/eyes/eyes3.mjs. Typecheck: cd <LANE>/retrux-web && node node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.hero.json && node node_modules/typescript/bin/tsc --noEmit --incremental false -p .
Timing runs: through the slot with SLOT_BG=0 in front of the slot command, at least 6 interleaved A/B pairs (lane vs base, same tier, window, DPR), only while the 1-min load is below 8; report medians and the worst frame.
No commits, no edits outside LANE and WORK, no downloads of new packages.
An abrupt stop (usage limit / network) can kill you at any moment: append your state to ${WORK}/LOG.md after every sub-step (what changed, numbers, what is next), and before you start read ${WORK}/LOG.md and continue from it if an earlier attempt was cut off.`

const GATES = `GATES (the judge checks these; measure them yourself first):
G1 Crawl in motion: on the waterline bands (hotfix2's bw_near / bws_far masks and the AA author's edge band; front slab, the white rock, the dark rock, far floes), slow and fast pointer sweeps and the hold dolly: frame-to-frame jumps > 32 levels and flicker energy at least 40 % lower than BASE; the time-slice crops (like ${SP}/work2/aa/crops/rslice_rock_zoom.png) show the edges gliding smoothly.
G2 No ghosting / smear / trails: fast pointer sweeps, sudden pointer reversal, press-and-hold (camera dolly + slow-mo, hold start and release), pointer leaving the window: no trails behind floe / rock / mountain edges, no smeared reflections, no lag of the water's ripples or glitter, no smear of the rings' reflections in the water (the rings spin constantly), no history from a previous camera pose after a large jump or resize.
G3 Sharpness: at rest the image converges to BASE's rest image (after motion stops, within 0.5 s: 99.5 % of env pixels within 2 levels); in slow motion the snow / ice / water detail keeps at least 90 % of BASE's gradient energy (no TAA blur).
G4 Hero untouched: rings, orb and shards (silhouettes, refraction, sparkle) identical to BASE in identical poses; nothing of the hero leaks into the environment history.
G5 Clouds, mist, sky, mountains above the horizon unchanged; no seam at the region boundary.
G6 Frame time at T1 within +5 % of BASE (interleaved pairs), memory reasonable (history at render resolution).
G7 Switch ?taa=0 restores BASE exactly (every linked shader program identical after preprocessing, like the AA author's check); T0 unchanged; the debug API captures (freeze / settle / pointer) give converged, artifact-free frames.
G8 Typecheck clean (hero and project), 0 console errors or warnings, works at DPR 1 and 2 and on resize.`

const buildPrompt = `You are a senior real-time graphics engineer. One focused job: add temporal anti-aliasing for the STATIC ENVIRONMENT region so the waterline stops crawling in motion, without touching the look at rest or the hero.

${CONTEXT}

DESIGN (you decide the details, justify them in LOG.md): reproject the previous frame's env-only image by depth with the previous view-projection (the env is static geometry; the camera moves), blend with the current expanded env color inside the existing below-horizon region (reuse the AA region logic incl. the cloud-card carve-out), neighborhood clamping or variance clipping (YCoCg) against ghosting, Catmull-Rom history sampling against blur, history rejection on disocclusion / off-screen / large camera jumps / resize, a blend weight that leaves the rest image exactly converged. Sub-pixel jitter is optional: in motion the camera itself provides new sample positions; if you jitter, jitter only the environment, never the hero, and the rest image must stay sharp and stable. The TAA must run before any hero object is drawn (the EnvEdge armed triangle / refraction copy path is where the AA author hooked in), so the hero never enters the history. Water is animated (ripples, glitter, reflections including the rings' reflection): handle it explicitly (e.g. lower history weight or tighter clamp on water, keep the rings' reflection out of the history) and prove no lag / smear. Keep T0 untouched; make the debug API (freeze / settle / pointer) produce converged frames (e.g. settle renders enough frames or the history resets cleanly). Switch: ?taa=0 restores today exactly.

${GATES}

DELIVER: changed files in LANE; a unified patch vs BASE at ${WORK}/taa.patch (paths a/retrux-web/... b/retrux-web/..., applicable with patch -p1 from a repo root holding BASE's state; prove it by applying it to a fresh APFS clone of BASE and comparing); crops / time slices / numbers in WORK; LOG.md. Return the structured result (lane "taa", gates with numbers, evidence paths you looked at yourself, open issues).`

const RETRY_NOTE = `\n\nNOTE: a previous attempt at this step was cut off. Read ${WORK}/LOG.md first and continue from its state; do not start over.`

const judgePrompt = (b, fixes, r) => `You are an adversarial, independent judge (round ${r}) of a temporal anti-aliasing change for a real-time three.js hero. You did not build it. Default to FAIL on any gate you cannot prove with your own measurements and your own eyes. Read-only for the code: do not edit LANE or BASE; write your outputs to ${WORK}/judge${r}/.

${CONTEXT}

${GATES}

HOW TO JUDGE: start both labs (lane 5192, base 5194; stop them at the end). Make your OWN captures (do not reuse the builder's images): consecutive moving frames (pointer sweeps at several speeds, reversal, the press-and-hold sequence: hold start, mid-hold, release), crops at 4-5x of the front slab waterline, the white rock, the dark rock, the far floes and the rings' reflection in the water; time slices; diff maps lane vs base at rest and per pose; crawl numbers on the same bands. LOOK at the crops yourself and say what you saw. Measure the frame time (interleaved pairs). Check ?taa=0 exactness and the typecheck. Severity: blocker = broken / visible artifact at normal use; major = gate fails or visible regression (ghosting, blur, smear, hero change, >5 % frame time); minor = small, measurable; nit = cosmetic. pass = true only with no blocker, major or minor open.

The builder's report: ${JSON.stringify(b).slice(0, 6000)}
${fixes.length ? 'Fix rounds since the build: ' + JSON.stringify(fixes.map((f) => ({ status: f.status, summary: String(f.summary).slice(0, 1500), gates: f.gates, open_issues: f.open_issues }))).slice(0, 5000) : ''}

Return the structured verdict (lane "taa"), every gate with evidence (paths + numbers), findings with fix hints.`

const fixPrompt = (v, r) => `You are the fixer (round ${r}) of a temporal anti-aliasing change. Fix ONLY the judge's blocker / major / minor findings below, narrowly; reproduce each with the judge's own method first (their outputs are in ${WORK}/judge${r}/), then fix, then re-measure the same way. Do not redesign what passes.

${CONTEXT}

${GATES}

The judge's verdict: ${JSON.stringify(v).slice(0, 9000)}

Keep ${WORK}/taa.patch current (vs BASE, applicable with patch -p1; prove it on a fresh clone of BASE). Return the structured result (lane "taa").`

phase('Build')
let b = INJ['build:taa'] || await agent(buildPrompt, { label: 'build:taa', phase: 'Build', schema: BUILD })
if (!b) b = await agent(buildPrompt + RETRY_NOTE, { label: 'build:taa-b', phase: 'Build', schema: BUILD })
if (!b) { log('build died twice: aborted'); return { aborted: 'build' } }
log('build: ' + b.status + ' | ' + String(b.summary).slice(0, 220))

phase('Judge')
const verdicts = []
const fixes = []
for (let r = 1; r <= 3; r++) {
  const v = INJ['judge' + r + ':taa'] || await agent(judgePrompt(b, fixes, r), { label: 'judge' + r + ':taa', phase: 'Judge', schema: VERDICT })
  if (!v) { log('judge' + r + ' died'); break }
  verdicts.push(v)
  log('judge' + r + ': pass=' + v.pass + ' score=' + v.lens_score + ' | ' + (v.findings || []).filter((f) => f.severity !== 'nit').map((f) => f.severity + ': ' + f.title).join(' ; ').slice(0, 400))
  if (clean(v) || r === 3) break
  let fx = INJ['fix' + r + ':taa'] || await agent(fixPrompt(v, r), { label: 'fix' + r + ':taa', phase: 'Judge', schema: BUILD })
  if (!fx) fx = await agent(fixPrompt(v, r) + RETRY_NOTE, { label: 'fix' + r + 'b:taa', phase: 'Judge', schema: BUILD })
  if (!fx) { log('fixer ' + r + ' died twice: stop'); break }
  fixes.push(fx)
  log('fix' + r + ': ' + fx.status + ' | ' + String(fx.summary).slice(0, 200))
}
const last = verdicts[verdicts.length - 1]
return { build: b, verdicts, fixes, clean: clean(last), patch: WORK + '/taa.patch' }
