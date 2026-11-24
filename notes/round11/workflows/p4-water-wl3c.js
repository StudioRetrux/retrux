export const meta = {
  name: 'p4-water-wl3c',
  description: 'Water round 3c: finish lane wl3a as the complaint-1 release candidate (distance-limit part W, prove perf on a quiet machine), judge it, one more fix + re-judge if needed',
  phases: [
    { title: 'Fix', detail: 'one fixer on LANES/wl3a' },
    { title: 'Judge', detail: 'adversarial judge of the release candidate' },
    { title: 'Fix2', detail: 'one more fix + re-judge if findings remain' },
  ],
}
const FIX = { type: 'object', properties: { ok: { type: 'boolean' }, done: { type: 'string' }, not_done: { type: 'string' }, numbers: { type: 'string' }, switches: { type: 'string' }, perf: { type: 'string' }, captures: { type: 'string' }, patch: { type: 'string' }, log_path: { type: 'string' } }, required: ['ok', 'done', 'not_done', 'numbers', 'switches', 'perf', 'patch', 'log_path'] }
const LENS = { type: 'object', properties: { lens: { type: 'string' }, main: { type: 'number' }, lane: { type: 'number' } }, required: ['lens', 'main', 'lane'] }
const FINDING = { type: 'object', properties: { id: { type: 'string' }, severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'nit'] }, title: { type: 'string' }, evidence: { type: 'string' }, repro: { type: 'string' }, suggested_fix: { type: 'string' } }, required: ['id', 'severity', 'title', 'evidence', 'repro'] }
const VERDICT = { type: 'object', properties: { pass: { type: 'boolean' }, mergeable: { type: 'boolean' }, scores: { type: 'array', items: LENS }, findings: { type: 'array', items: FINDING }, regressions: { type: 'string' }, visual_verdict: { type: 'string' }, report_path: { type: 'string' } }, required: ['pass', 'mergeable', 'scores', 'findings', 'regressions', 'visual_verdict', 'report_path'] }

const C = `FIRST read the binding briefs ${args.brief} and ${args.brief2}, the earlier task files ${args.prevArgs.join(', ')} (history; their gates and tools still bind), then the round-3 task file ${args.argsFile} (key "args": args.common IN FULL, then your task key named below). Base lane LANES/wl2 (:5167) is frozen; MAIN's water is :5162; never touch :5162, :5163, :5167, :3000 or :3001.`
const JR = `Use the panel's scale (10 = indistinguishable from the reference at a glance; 9 = only an expert notices side by side; 8 = noticeable but premium; 7 = clearly different or CG tells); score MAIN (:5162) and the lane per lens from the same images. Hunt regressions vs MAIN anywhere (at least major). Re-run ident and the perf A/B yourself. pass = no blocker / major / minor open; mergeable = you would merge it into MAIN as the complaint-1 release today. Look at every image you cite.`

phase('Fix')
const fix = await agent(`${C}\n\nROLE: FIXER of lane LANES/wl3a (lab :5169; restart it to pick up source changes: cd LANES/wl3a/retrux-web && PORT=5169 nohup node hero-lab/serve.mjs --no-watch > $SP/work_p4/wl3c/lab.log 2>&1 &). Your task: args.fix3c (read it IN FULL). WORK $SP/work_p4/wl3c; append dated entries to LANES/wl3a/HANDOFF.md and WORK/LOG.md; mirror LOG, HANDOFF, patch and key images to MAIN/notes/round11/lane_backup/p4wl3c/. Time box ${args.fixMin} min. Leave the lab running for the judge.`, { label: 'fix:wl3c', phase: 'Fix', schema: FIX, effort: 'xhigh' })
if (!fix) return { fix: null }
phase('Judge')
const verdict = await agent(`${C}\n\nROLE: independent, adversarial JUDGE of the complaint-1 release candidate LANES/wl3a (lab :5169, read-only). Your task: args.judge3c. Time box ${args.judgeMin} min. Folder $SP/work_p4/judge_wl3c; mirror to MAIN/notes/round11/lane_backup/p4wl3c/judge_wl3c/. ${JR}\nFIXER REPORT (JSON):\n${JSON.stringify(fix, null, 1)}`, { label: 'judge:wl3c', phase: 'Judge', schema: VERDICT })
if (!verdict) return { fix, verdict: null }
const todo = verdict.findings.filter((f) => ['blocker', 'major', 'minor'].includes(f.severity))
if (!todo.length) return { fix, verdict, fix2: null, rejudge: null }
phase('Fix2')
const fix2 = await agent(`${C}\n\nROLE: FIXER (second pass) of LANES/wl3a (you own :5169 now). Fix exactly these judge findings, blockers first, each reproduced first with the judge's repro and re-measured after; no new features. Keep ?wl3a=0 == :5167 and ?p4wl=0 == :5162 (re-prove ident), tsc clean, perf <= +5 % (>= 8 STRICT pairs, the machine is yours), refresh refs_user/wl3c_*, regenerate the patch vs LANES/p4ph/retrux-web/app; append to LOG + HANDOFF; mirror to MAIN/notes/round11/lane_backup/p4wl3c/. A finding that needs a design decision: leave it with options. Time box ${args.fixMin} min.\nFINDINGS (JSON):\n${JSON.stringify(todo, null, 1)}`, { label: 'fix2:wl3c', phase: 'Fix2', schema: FIX, effort: 'xhigh' })
if (!fix2) return { fix, verdict, fix2: null }
const rejudge = await agent(`${C}\n\nROLE: RE-JUDGE of the complaint-1 release candidate LANES/wl3a after its second fix (lab :5169, read-only). Your task: args.judge3c. Time box ${args.rejudgeMin} min. Folder $SP/work_p4/rejudge_wl3c; mirror to MAIN/notes/round11/lane_backup/p4wl3c/rejudge_wl3c/. Re-run every finding's repro and look; re-check ident and perf yourself; hunt anything the fix made worse. ${JR}\nPREVIOUS VERDICT (JSON):\n${JSON.stringify(verdict, null, 1)}\nFIXER (JSON):\n${JSON.stringify(fix2, null, 1)}`, { label: 'rejudge:wl3c', phase: 'Fix2', schema: VERDICT })
return { fix, verdict, fix2, rejudge }
