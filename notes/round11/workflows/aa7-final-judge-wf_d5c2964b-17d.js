export const meta = {
  name: 'aa7-final-judge',
  description: 'AA7 final: 3 adversarial judges (motion, artifacts, perf+robustness+code) + G-3 scale-0.7 investigator, one fixer, one recheck',
  phases: [
    { title: 'Judge', detail: 'motion, artifacts, perf+robustness+code on aa7 (:5197); G-3 investigator in aa7g3 (:5198)' },
    { title: 'Fix', detail: 'one fixer for confirmed findings (+ G-3 patch if proven)' },
    { title: 'Recheck', detail: 'one recheck of every fixed item, G8, G1 table' },
  ],
}
const GATE = { type: 'object', properties: { gate: { type: 'string' }, verdict: { type: 'string' }, numbers: { type: 'string' } }, required: ['gate', 'verdict'] }
const FINDING = {
  type: 'object',
  properties: {
    id: { type: 'string' }, severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'nit'] },
    title: { type: 'string' }, evidence: { type: 'string' }, repro: { type: 'string' }, suggested_fix: { type: 'string' },
  },
  required: ['id', 'severity', 'title', 'evidence', 'repro'],
}
const VERDICT = {
  type: 'object',
  properties: {
    lens: { type: 'string' }, pass: { type: 'boolean', description: 'true = no blocker, major or minor open' },
    score: { type: 'number', description: '0-10 for this lens' },
    gates: { type: 'array', items: GATE }, findings: { type: 'array', items: FINDING },
    visual_verdict: { type: 'string' }, report_path: { type: 'string' },
  },
  required: ['lens', 'pass', 'score', 'gates', 'findings', 'visual_verdict', 'report_path'],
}
const G3 = {
  type: 'object',
  properties: {
    ok: { type: 'boolean', description: 'true only if the fix works at 0.9 / 0.8 / 0.7 AND is proven bit-identical at render scale 1.0' },
    cause: { type: 'string' }, change: { type: 'string' }, identity_proof: { type: 'string' }, effect_proof: { type: 'string' },
    patch_vs_aa7: { type: 'string', description: 'absolute path of the patch (paths a/retrux-web/...)' }, log_path: { type: 'string' }, notes: { type: 'string' },
  },
  required: ['ok', 'cause', 'change', 'identity_proof', 'effect_proof', 'log_path'],
}
const FIX = {
  type: 'object',
  properties: {
    fixed: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, what: { type: 'string' }, evidence: { type: 'string' } }, required: ['id', 'what', 'evidence'] } },
    not_fixed: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, why: { type: 'string' } }, required: ['id', 'why'] } },
    g3_applied: { type: 'boolean' },
    patch_vs_base: { type: 'string' }, log_path: { type: 'string' }, tsc_clean: { type: 'boolean' }, switches_exact: { type: 'boolean' }, notes: { type: 'string' },
  },
  required: ['fixed', 'not_fixed', 'g3_applied', 'patch_vs_base', 'tsc_clean', 'switches_exact'],
}

phase('Judge')
const judgeThunks = args.lenses.map((l) => () =>
  agent(`${args.common}\n\n${args.judge}\n\n${l.prompt}`, { label: `judge:${l.key}`, phase: 'Judge', schema: VERDICT }))
const g3Thunk = () => agent(`${args.common}\n\n${args.g3}`, { label: 'investigate:g3', phase: 'Judge', schema: G3 })
const all = await parallel([...judgeThunks, g3Thunk])
const verdicts = all.slice(0, args.lenses.length).map((v, i) => (v ? { ...v, lens: args.lenses[i].key } : null))
const g3 = all[args.lenses.length]
const missing = verdicts.map((v, i) => (v ? null : args.lenses[i].key)).filter(Boolean)
if (missing.length) log(`judges missing: ${missing.join(', ')}`)
const okV = verdicts.filter(Boolean)
const toFix = okV.flatMap((v) => v.findings.map((f) => ({ ...f, lens: v.lens }))).filter((f) => ['blocker', 'major', 'minor'].includes(f.severity))
log(`judges ${okV.length}/${args.lenses.length}; scores ${okV.map((v) => v.lens + ' ' + v.score).join(', ')}; to fix ${toFix.length}; g3 ok=${g3 ? g3.ok : 'n/a'}`)
if (!toFix.length && !(g3 && g3.ok)) return { verdicts, g3, fix: null, recheck: null }

phase('Fix')
const fix = await agent(`${args.common}\n\n${args.fixer}\n\nFINDINGS TO FIX (JSON):\n${JSON.stringify(toFix, null, 1)}\n\nG-3 INVESTIGATOR RESULT (JSON; apply its patch only if ok is true):\n${JSON.stringify(g3, null, 1)}`, { label: 'fix:aa7', phase: 'Fix', schema: FIX })
if (!fix) return { verdicts, g3, fix: null, recheck: null }
if (!fix.fixed.length && !fix.g3_applied) return { verdicts, g3, fix, recheck: null }

phase('Recheck')
const recheck = await agent(`${args.common}\n\n${args.recheck}\n\nJUDGE VERDICTS (JSON):\n${JSON.stringify(okV, null, 1)}\n\nG-3 RESULT (JSON):\n${JSON.stringify(g3, null, 1)}\n\nFIXER REPORT (JSON):\n${JSON.stringify(fix, null, 1)}`, { label: 'recheck:aa7', phase: 'Recheck', schema: VERDICT })
return { verdicts, g3, fix, recheck }
