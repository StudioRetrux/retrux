export const meta = {
  name: 'p4-rip2',
  description: 'Client-priority ripple round 2: two explorers with different approaches, a pick judge, the winner finishes, final judge, fix and re-judge',
  phases: [
    { title: 'Explore', detail: 'two explorers, different approaches, same hard gates' },
    { title: 'Pick', detail: 'one judge compares both against the target and MAIN' },
    { title: 'Finish', detail: 'the winner passes every hard gate' },
    { title: 'Judge', detail: 'final adversarial judge' },
    { title: 'Fix', detail: 'fixer and re-judge if findings remain' },
  ],
}
const EXPLORE = { type: 'object', properties: { ok: { type: 'boolean' }, approach: { type: 'string' }, look_vs_target: { type: 'string' }, numbers_table: { type: 'string' }, gates: { type: 'string' }, sheets: { type: 'string' }, switches: { type: 'string' }, patch: { type: 'string' }, log_path: { type: 'string' } }, required: ['ok', 'approach', 'look_vs_target', 'numbers_table', 'gates', 'sheets', 'switches', 'patch', 'log_path'] }
const PICK = { type: 'object', properties: { winner: { type: 'string', enum: ['rxa', 'rxb', 'none'] }, why: { type: 'string' }, must_fix: { type: 'array', items: { type: 'string' } }, grafts: { type: 'string' }, numbers_table: { type: 'string' }, sheets: { type: 'string' }, report_path: { type: 'string' } }, required: ['winner', 'why', 'must_fix', 'grafts', 'numbers_table', 'sheets', 'report_path'] }
const BUILD = { type: 'object', properties: { ok: { type: 'boolean' }, done_tasks: { type: 'string' }, not_done: { type: 'string' }, switches: { type: 'string' }, proof: { type: 'string' }, perf: { type: 'string' }, captures: { type: 'string' }, patch: { type: 'string' }, log_path: { type: 'string' } }, required: ['ok', 'done_tasks', 'not_done', 'switches', 'proof', 'perf', 'captures', 'patch', 'log_path'] }
const LENS = { type: 'object', properties: { lens: { type: 'string' }, main: { type: 'number' }, lane: { type: 'number' } }, required: ['lens', 'main', 'lane'] }
const FINDING = { type: 'object', properties: { id: { type: 'string' }, severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'nit'] }, title: { type: 'string' }, evidence: { type: 'string' }, repro: { type: 'string' }, suggested_fix: { type: 'string' } }, required: ['id', 'severity', 'title', 'evidence', 'repro'] }
const VERDICT = { type: 'object', properties: { pass: { type: 'boolean' }, scores: { type: 'array', items: LENS }, findings: { type: 'array', items: FINDING }, regressions: { type: 'string' }, visual_verdict: { type: 'string' }, report_path: { type: 'string' } }, required: ['pass', 'scores', 'findings', 'regressions', 'visual_verdict', 'report_path'] }
const FIX = { type: 'object', properties: { fixed: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, what: { type: 'string' }, evidence: { type: 'string' } }, required: ['id', 'what', 'evidence'] } }, not_fixed: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, why: { type: 'string' } }, required: ['id', 'why'] } }, patch: { type: 'string' }, switches_exact: { type: 'boolean' }, tsc_clean: { type: 'boolean' }, captures: { type: 'string' }, log_path: { type: 'string' } }, required: ['fixed', 'not_fixed', 'patch', 'switches_exact', 'tsc_clean'] }

const A = args.argsFile
const C = `FIRST read the binding briefs ${args.brief} and ${args.brief2} in full. Your task text lives in the JSON file ${A} (key "args"): read args.shared IN FULL (the client's ask, the target, round 1's lessons, the lead's diagnosis, ACCEPTANCE and the HARD GATES (a)-(g)); it is binding.`
const B = args.basePort, M = args.mainPort

phase('Explore')
const ex = await parallel(args.explorers.map((x, i) => () => agent(`${C} Also read args.explorers[${i}].approach (YOUR approach).\n\nROLE: EXPLORER '${x.key}' of the ripple round 2. Lane LANES/${x.lane} (cp -c -R LANES/int3_base LANES/${x.lane}; keep it if it already exists from YOUR earlier cut-off attempt and read your LOG), lab :${x.port}, WORK $SP/work_p4/${x.lane}, mirror LOG + key images to MAIN/notes/round11/lane_backup/${args.round}/${x.lane}/. Base lab :${B} (int3_base, frozen), MAIN lab :${M}. Your switch: ?p4${x.key}=0 restores :${B} exactly. Time box ${args.exploreMin} min. Another explorer works on the same goal with a different approach in LANES/${args.explorers[1 - i].lane} (:${args.explorers[1 - i].port}); do not touch it.\nFinish with: the sheets TARGET | LANE | MAIN (target zoom and 1x vs F000, 3 clocks), the numbers table, every hard gate's status with numbers (re-run on your final build; say plainly which ones you did not reach), the patch vs LANES/int3_base/retrux-web/app, HANDOFF.md. ok = true only if the lane reads CLEARLY closer to the target than MAIN at a glance AND gates (a), (c), (d), (g) pass. Leave your lab running for the pick judge.`, { label: `explore:${x.key}`, phase: 'Explore', schema: EXPLORE })))
const exA = ex[0], exB = ex[1]
if (!exA && !exB) return { explorers: ex, pick: null }

phase('Pick')
const pick = await agent(`${C} Also read args.pick (YOUR role) and both args.explorers[].approach.\n\nTime box ${args.pickMin} min.\nEXPLORER A REPORT (JSON):\n${JSON.stringify(exA, null, 1)}\nEXPLORER B REPORT (JSON):\n${JSON.stringify(exB, null, 1)}`, { label: 'pick:rip2', phase: 'Pick', schema: PICK })
if (!pick || pick.winner === 'none') return { explorers: ex, pick, finish: null }
const W = args.explorers.find((x) => x.key === pick.winner)
const wRep = pick.winner === args.explorers[0].key ? exA : exB

phase('Finish')
const fin = await agent(`${C} Also read args.finish (YOUR role).\n\nROLE: FINISHER in the winning lane '${W.key}': LANES/${W.lane}, lab :${W.port}, WORK $SP/work_p4/${W.lane} (read its LOG and HANDOFF first), switch ?p4${W.key}=0 == :${B}. The losing lane stays as it is (read-only for grafts). Time box ${args.finishMin} min. Mirror to MAIN/notes/round11/lane_backup/${args.round}/${W.lane}/.\nTHE EXPLORER'S REPORT (JSON):\n${JSON.stringify(wRep, null, 1)}\nTHE PICK JUDGE (JSON):\n${JSON.stringify(pick, null, 1)}`, { label: `finish:${W.key}`, phase: 'Finish', schema: BUILD })
if (!fin) return { explorers: ex, pick, finish: null }

phase('Judge')
const verdict = await agent(`${C} Also read args.judge (the lenses and the client's question).\n\nROLE: independent, adversarial JUDGE of the ripple lane '${W.key}' (lab :${W.port}, read-only: never edit the lane, never restart its lab unless it is down). Time box ${args.judgeMin} min. Folder $SP/work_p4/judge_${W.lane}; mirror to MAIN/notes/round11/lane_backup/${args.round}/judge_${W.lane}/.\nFINISHER REPORT (JSON):\n${JSON.stringify(fin, null, 1)}\nUse the panel's scoring scale (10 = indistinguishable from the reference at a glance; 9 = only an expert notices side by side; 8 = noticeable but premium; 7 = clearly different or CG tells). Score MAIN (:${M}) and the lane on each lens from the same images side by side. Hunt for anything the lane made WORSE anywhere in the frame (all poses, pointer spots, sweep, hold / release) - a regression is at least major. Re-run yourself: the switch ident at T1, the 60 fps sparkle on the glint / near / bottom-rock boxes, two pop paths (fast, reverse) and one perf A/B (rest). pass = no blocker / major / minor open. Look at every image you cite.`, { label: `judge:${W.key}`, phase: 'Judge', schema: VERDICT })
if (!verdict) return { explorers: ex, pick, finish: fin, verdict: null }
const todo = verdict.findings.filter((f) => ['blocker', 'major', 'minor'].includes(f.severity))
if (!todo.length) return { explorers: ex, pick, finish: fin, verdict, fix: null, rejudge: null }

phase('Fix')
const fix = await agent(`${C}\n\nROLE: FIXER of the ripple lane '${W.key}' (LANES/${W.lane}, you own :${W.port} now). Fix exactly these judge findings, each reproduced first with the judge's repro and re-measured after (look at before / after images); no new features. Keep ?p4${W.key}=0 exact (re-prove ident vs :${B}), tsc clean, every hard gate re-run on the final build; refresh the capture set (qc_r11.zsh) into $SP/work_p4/${W.lane}/qc_fix and the client sheets (MAIN/notes/round11/refs_user/rip2_*.jpg); regenerate the patch; append to LOG + HANDOFF; mirror. A finding that needs a design decision: leave it with options. Time box ${args.fixMin} min.\nFINDINGS (JSON):\n${JSON.stringify(todo, null, 1)}`, { label: `fix:${W.key}`, phase: 'Fix', schema: FIX })
if (!fix || !fix.fixed.length) return { explorers: ex, pick, finish: fin, verdict, fix, rejudge: null }
const rejudge = await agent(`${C} Also read args.judge.\n\nROLE: RE-JUDGE of the ripple lane '${W.key}' after its fix round (lab :${W.port}, read-only). Time box ${args.rejudgeMin} min. Folder $SP/work_p4/rejudge_${W.lane}; mirror to MAIN/notes/round11/lane_backup/${args.round}/rejudge_${W.lane}/. Re-run every fixed finding's repro and look; re-check the switch (ident vs :${B}), the 60 fps sparkle, two pop paths and one perf A/B; score the same lenses for MAIN (:${M}) and the lane from the latest captures; hunt for anything the fix made worse.\nPREVIOUS VERDICT (JSON):\n${JSON.stringify(verdict, null, 1)}\nFIXER (JSON):\n${JSON.stringify(fix, null, 1)}`, { label: `rejudge:${W.key}`, phase: 'Fix', schema: VERDICT })
return { explorers: ex, pick, finish: fin, verdict, fix, rejudge }
