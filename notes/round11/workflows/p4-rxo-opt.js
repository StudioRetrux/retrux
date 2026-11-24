export const meta = {
  name: 'p4-rxo-opt',
  description: 'Ripple: Opus optimisation pass on the Fable lane (perf + waterline), then a judge against shipped lane A, fix and re-judge if needed',
  phases: [
    { title: 'Build', detail: 'one optimiser (+ one continuation if its own gates fail)' },
    { title: 'Judge', detail: 'can it replace lane A?' },
    { title: 'Fix', detail: 'fixer and re-judge if findings remain' },
  ],
}
const BUILD = { type: 'object', properties: { ok: { type: 'boolean' }, done_tasks: { type: 'string' }, not_done: { type: 'string' }, switches: { type: 'string' }, proof: { type: 'string' }, perf: { type: 'string' }, captures: { type: 'string' }, patch: { type: 'string' }, log_path: { type: 'string' } }, required: ['ok', 'done_tasks', 'not_done', 'switches', 'proof', 'perf', 'captures', 'patch', 'log_path'] }
const LENS = { type: 'object', properties: { lens: { type: 'string' }, main: { type: 'number' }, lane: { type: 'number' } }, required: ['lens', 'main', 'lane'] }
const FINDING = { type: 'object', properties: { id: { type: 'string' }, severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'nit'] }, title: { type: 'string' }, evidence: { type: 'string' }, repro: { type: 'string' }, suggested_fix: { type: 'string' } }, required: ['id', 'severity', 'title', 'evidence', 'repro'] }
const VERDICT = { type: 'object', properties: { pass: { type: 'boolean' }, scores: { type: 'array', items: LENS }, findings: { type: 'array', items: FINDING }, regressions: { type: 'string' }, visual_verdict: { type: 'string' }, report_path: { type: 'string' } }, required: ['pass', 'scores', 'findings', 'regressions', 'visual_verdict', 'report_path'] }
const FIX = { type: 'object', properties: { fixed: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, what: { type: 'string' }, evidence: { type: 'string' } }, required: ['id', 'what', 'evidence'] } }, not_fixed: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, why: { type: 'string' } }, required: ['id', 'why'] } }, patch: { type: 'string' }, switches_exact: { type: 'boolean' }, tsc_clean: { type: 'boolean' }, captures: { type: 'string' }, log_path: { type: 'string' } }, required: ['fixed', 'not_fixed', 'patch', 'switches_exact', 'tsc_clean'] }

const L = args.lane, B = args.basePort, A = args.mainPort
const C = `FIRST read the binding briefs ${args.brief} and ${args.brief2} in full. Your task text lives in the JSON file ${args.argsFile} (key "args"): read args.build IN FULL (scope, hard gates (a)-(g), deliverables); it is binding and wins over the older briefs where they differ (notably the FAIR waterline gate and the governor perf rule).`
const WHERE = `Lane LANES/${L.lane} ALREADY EXISTS: an exact clone of LANES/p4rxf's final (Water.ts sha 69ca1991...); keep it (if it has a LOG from YOUR earlier cut-off attempt, read it). Serve it: cd LANES/${L.lane}/retrux-web && PORT=${L.port} nohup node hero-lab/serve.mjs --no-watch > $SP/work_p4/${L.lane}/lab.log 2>&1 &. WORK $SP/work_p4/${L.lane}; mirror LOG + key images to MAIN/notes/round11/lane_backup/${args.round}/${L.lane}/. Base lab :${B} (int3_base, frozen); shipped ripple A lab :${A}; Fable's final lab :5177 (reference, never edit LANES/p4rxf). Switch ?p4rxf=0 must restore :${B} exactly.`

phase('Build')
let build = await agent(`${C}\n\nROLE: OPTIMISER of the Fable ripple lane. ${WHERE} Time box ${args.buildMin} min.`, { label: `build:${L.key}`, phase: 'Build', schema: BUILD, effort: 'xhigh' })
if (!build) return { build: null }
if (!build.ok) {
  const cont = await agent(`${C}\n\nROLE: OPTIMISER, CONTINUATION. ${WHERE} You reported ok = false. Read your own LOG.md and HANDOFF.md, then close every failing hard gate (perf: governor must hold 1.0 and medians <= +5 %; the fair waterline gate on all six paths) without changing the look beyond the stated tolerance; if a sub-part cannot pass, say exactly which and why. Time box ${args.fixMin} min. Re-run every proof on the final build, refresh the sheets, the patch, HANDOFF.\nYOUR PREVIOUS REPORT (JSON):\n${JSON.stringify(build, null, 1)}`, { label: `build2:${L.key}`, phase: 'Build', schema: BUILD, effort: 'xhigh' })
  if (cont) build = cont
}

phase('Judge')
const verdict = await agent(`${C} Also read args.judge (the decision this judge makes).\n\nROLE: independent, adversarial JUDGE of the optimised Fable ripple lane '${L.key}' (lab :${L.port}, read-only: never edit the lane, never restart its lab unless it is down). Time box ${args.judgeMin} min. Folder $SP/work_p4/judge_${L.lane}; mirror to MAIN/notes/round11/lane_backup/${args.round}/judge_${L.lane}/.\nOPTIMISER REPORT (JSON):\n${JSON.stringify(build, null, 1)}\nScoring scale: 10 = indistinguishable from the reference at a glance; 9 = only an expert notices side by side; 8 = noticeable but premium; 7 = clearly different or CG tells. In the scores, 'main' = lane A (:${A}, what ships now) and 'lane' = this lane. A regression vs A anywhere is at least major. Look at every image you cite.`, { label: `judge:${L.key}`, phase: 'Judge', schema: VERDICT, effort: 'xhigh' })
if (!verdict) return { build, verdict: null }
const todo = verdict.findings.filter((f) => ['blocker', 'major', 'minor'].includes(f.severity))
if (!todo.length) return { build, verdict, fix: null, rejudge: null }

phase('Fix')
const fix = await agent(`${C}\n\nROLE: FIXER of the optimised ripple lane '${L.key}' (LANES/${L.lane}, you own :${L.port} now). Fix exactly these judge findings, each reproduced first with the judge's repro and re-measured after (look at before / after images); no new features, no look redesign. Keep ?p4rxf=0 exact (re-prove ident vs :${B}), tsc clean, every hard gate re-run on the final build (re-render the lane's own GT if the lake changed); refresh the capture set (qc_r11.zsh) into $SP/work_p4/${L.lane}/qc_fix and the client sheets (MAIN/notes/round11/refs_user/rip4_*.jpg); regenerate the patch; append to LOG + HANDOFF; mirror. A finding that needs a design decision: leave it with options. Time box ${args.fixMin} min.\nFINDINGS (JSON):\n${JSON.stringify(todo, null, 1)}`, { label: `fix:${L.key}`, phase: 'Fix', schema: FIX, effort: 'xhigh' })
if (!fix || !fix.fixed.length) return { build, verdict, fix, rejudge: null }
const rejudge = await agent(`${C} Also read args.judge.\n\nROLE: RE-JUDGE of the optimised ripple lane '${L.key}' after its fix round (lab :${L.port}, read-only). Time box ${args.rejudgeMin} min. Folder $SP/work_p4/rejudge_${L.lane}; mirror to MAIN/notes/round11/lane_backup/${args.round}/rejudge_${L.lane}/. Re-run every fixed finding's repro and look; re-check ident vs :${B}, the governor probe + one perf A/B, the fair waterline gate on fast + reverse, the 60 fps sparkle; score A (:${A}, as 'main') and the lane from the latest captures; hunt for anything the fix made worse.\nPREVIOUS VERDICT (JSON):\n${JSON.stringify(verdict, null, 1)}\nFIXER (JSON):\n${JSON.stringify(fix, null, 1)}`, { label: `rejudge:${L.key}`, phase: 'Fix', schema: VERDICT, effort: 'xhigh' })
return { build, verdict, fix, rejudge }
