export const meta = {
  name: 'p4-lanes',
  description: 'P4 fix lanes from the P3 panel plan, each built, judged, fixed and re-judged independently (reference lab and round from args)',
  phases: [
    { title: 'Build', detail: 'one builder per lane' },
    { title: 'Judge', detail: 'one adversarial judge per lane' },
    { title: 'Fix', detail: 'one fixer per lane if needed' },
    { title: 'Rejudge', detail: 'one re-judge per fixed lane' },
  ],
}
const BUILD = { type: 'object', properties: { ok: { type: 'boolean' }, done_tasks: { type: 'string' }, not_done: { type: 'string' }, switches: { type: 'string' }, proof: { type: 'string' }, perf: { type: 'string' }, captures: { type: 'string' }, patch: { type: 'string' }, log_path: { type: 'string' } }, required: ['ok', 'done_tasks', 'not_done', 'switches', 'proof', 'perf', 'captures', 'patch', 'log_path'] }
const LENS = { type: 'object', properties: { lens: { type: 'string' }, main: { type: 'number' }, lane: { type: 'number' } }, required: ['lens', 'main', 'lane'] }
const FINDING = { type: 'object', properties: { id: { type: 'string' }, severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'nit'] }, title: { type: 'string' }, evidence: { type: 'string' }, repro: { type: 'string' }, suggested_fix: { type: 'string' } }, required: ['id', 'severity', 'title', 'evidence', 'repro'] }
const VERDICT = { type: 'object', properties: { pass: { type: 'boolean' }, scores: { type: 'array', items: LENS }, findings: { type: 'array', items: FINDING }, regressions: { type: 'string' }, visual_verdict: { type: 'string' }, report_path: { type: 'string' } }, required: ['pass', 'scores', 'findings', 'regressions', 'visual_verdict', 'report_path'] }
const FIX = { type: 'object', properties: { fixed: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, what: { type: 'string' }, evidence: { type: 'string' } }, required: ['id', 'what', 'evidence'] } }, not_fixed: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, why: { type: 'string' } }, required: ['id', 'why'] } }, patch: { type: 'string' }, switches_exact: { type: 'boolean' }, tsc_clean: { type: 'boolean' }, captures: { type: 'string' }, log_path: { type: 'string' } }, required: ['fixed', 'not_fixed', 'patch', 'switches_exact', 'tsc_clean'] }

const C = `FIRST read the binding brief ${args.brief} in full.`
const results = await pipeline(
  args.lanes,
  (lane) => agent(`${C}\n\nROLE: BUILDER of lane '${lane.key}' (lane folder LANES/${lane.lane}, lab port ${lane.port}, WORK $SP/work_p4/${lane.lane}, mirror to MAIN/notes/round11/lane_backup/${args.round}/${lane.lane}/). Time box ${args.buildMin} min.\n${lane.build}\nFinish with: tsc clean, the ?p4${lane.key}=0 ident proof, a perf A/B vs :${args.refPort}, your lane's full capture set (qc_r11.zsh) in WORK/qc_final, the patch, HANDOFF.md. Leave your lab running for the judge.`, { label: `build:${lane.key}`, phase: 'Build', schema: BUILD }),
  (build, lane) => {
    if (!build) return null
    return agent(`${C}\n\nROLE: independent, adversarial JUDGE of lane '${lane.key}' (lab :${lane.port}, read-only: never edit the lane, never restart its lab unless it is down). Time box ${args.judgeMin} min. Folder $SP/work_p4/judge_${lane.lane}; mirror to MAIN/notes/round11/lane_backup/${args.round}/judge_${lane.lane}/.\nBUILDER REPORT (JSON):\n${JSON.stringify(build, null, 1)}\n${lane.judge}\nUse the panel's own scoring scale (10 = indistinguishable from the reference at a glance; 9 = only an expert notices side by side; 8 = noticeable but premium; 7 = clearly different or CG tells). Score MAIN (from $SP/p3/r11_1, the panel's captures) and the lane on each lens listed, from the same images side by side. Hunt for anything the lane made WORSE anywhere in the frame (all poses, pointer spots, sweep) - a regression is at least major. Verify the switch proof and the perf numbers yourself (re-run ident for ?p4${lane.key}=0 and one perf A/B). pass = no blocker / major / minor open. Look at every image you cite.`, { label: `judge:${lane.key}`, phase: 'Judge', schema: VERDICT })
  },
  async (verdict, lane) => {
    if (!verdict) return null
    const todo = verdict.findings.filter((f) => ['blocker', 'major', 'minor'].includes(f.severity))
    if (!todo.length) return { lane: lane.key, verdict, fix: null, rejudge: null }
    const fix = await agent(`${C}\n\nROLE: FIXER of lane '${lane.key}' (LANES/${lane.lane}, you own :${lane.port} now). Fix exactly these judge findings, each reproduced first with the judge's repro and re-measured after (look at before / after images); no new features. Keep ?p4${lane.key}=0 exact (re-prove ident), tsc clean, perf within the brief's rule; refresh the capture set (qc_r11.zsh) into $SP/work_p4/${lane.lane}/qc_fix; regenerate the patch; append to LOG + HANDOFF; mirror. A finding that needs a design decision: leave it with options. Time box ${args.fixMin} min.\nFINDINGS (JSON):\n${JSON.stringify(todo, null, 1)}`, { label: `fix:${lane.key}`, phase: 'Fix', schema: FIX })
    if (!fix || !fix.fixed.length) return { lane: lane.key, verdict, fix, rejudge: null }
    const rejudge = await agent(`${C}\n\nROLE: RE-JUDGE of lane '${lane.key}' after its fix round (lab :${lane.port}, read-only). Time box ${args.rejudgeMin} min. Folder $SP/work_p4/rejudge_${lane.lane}; mirror to MAIN/notes/round11/lane_backup/${args.round}/rejudge_${lane.lane}/. Re-run every fixed finding's repro and look; re-check the switch (ident) and one perf A/B; score the same lenses for MAIN and the lane from the latest captures; hunt for anything the fix made worse.\n${lane.judge}\nPREVIOUS VERDICT (JSON):\n${JSON.stringify(verdict, null, 1)}\nFIXER (JSON):\n${JSON.stringify(fix, null, 1)}`, { label: `rejudge:${lane.key}`, phase: 'Rejudge', schema: VERDICT })
    return { lane: lane.key, verdict, fix, rejudge }
  },
)
return { results }
