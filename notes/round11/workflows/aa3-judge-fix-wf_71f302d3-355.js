export const meta = {
  name: 'aa3-judge-fix',
  description: 'Independent 3-lens judging of the AA3 waterline anti-aliasing lane, one fix round and a recheck',
  phases: [
    { title: 'Judge', detail: 'motion quality, artifacts, perf + robustness + code' },
    { title: 'Fix', detail: 'one fixer for confirmed fixable findings' },
    { title: 'Recheck', detail: 'recheck each lens that had findings' },
  ],
}

const FINDING = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'unique, prefixed by lens: M-1, A-1, P-1' },
    gate: { type: 'string' },
    severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'nit'] },
    title: { type: 'string' },
    evidence: { type: 'string', description: 'image / data paths AND numbers' },
    repro: { type: 'string', description: 'exact command or probe that reproduces it' },
    fixable_in_aa3: { type: 'boolean', description: 'fixable inside the AA3 approach (not a G1b reference-quality gap)' },
    suggested_fix: { type: 'string' },
    status: { type: 'string', description: 'recheck only: fixed / not-fixed / regressed' },
  },
  required: ['id', 'gate', 'severity', 'title', 'evidence', 'repro', 'fixable_in_aa3'],
}
const VERDICT = {
  type: 'object',
  properties: {
    lens: { type: 'string' },
    gates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          gate: { type: 'string' },
          verdict: { type: 'string', enum: ['PASS', 'FAIL', 'N/A', 'REPORT'] },
          numbers: { type: 'string' },
          evidence: { type: 'array', items: { type: 'string' } },
        },
        required: ['gate', 'verdict', 'numbers'],
      },
    },
    findings: { type: 'array', items: FINDING },
    score: { type: 'number', description: '0-10 for this lens' },
    visual_verdict: { type: 'string', description: 'what you saw with your own eyes, honestly' },
    report_path: { type: 'string' },
  },
  required: ['lens', 'gates', 'findings', 'score', 'visual_verdict', 'report_path'],
}
const FIX = {
  type: 'object',
  properties: {
    fixed: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, what: { type: 'string' }, evidence: { type: 'string' } }, required: ['id', 'what', 'evidence'] } },
    not_fixed: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, why: { type: 'string' } }, required: ['id', 'why'] } },
    patch_path: { type: 'string' },
    log_path: { type: 'string' },
    tsc_clean: { type: 'boolean' },
    g8_identity: { type: 'boolean' },
    notes: { type: 'string' },
  },
  required: ['fixed', 'not_fixed', 'patch_path', 'tsc_clean', 'g8_identity'],
}

const C = args.common
const LENSES = args.lenses

phase('Judge')
const raw = await parallel(LENSES.map((l) => () =>
  agent(`${C}\n\n${l.prompt}`, { label: `judge:${l.key}`, phase: 'Judge', schema: VERDICT })))
const verdicts = raw.map((v, i) => (v ? { ...v, lens: LENSES[i].key } : null)).filter(Boolean)
const all = verdicts.flatMap((v) => (v.findings || []).map((f) => ({ ...f, lens: v.lens })))
const toFix = all.filter((f) => f.fixable_in_aa3 && ['blocker', 'major', 'minor'].includes(f.severity))
log(`judges returned ${verdicts.length}/${LENSES.length}; findings ${all.length}; to fix ${toFix.length}`)
if (verdicts.length < LENSES.length) log('a judge returned nothing: its lens is NOT covered')
if (!toFix.length) return { verdicts, fix: null, recheck: [] }

phase('Fix')
const fix = await agent(`${C}\n\n${args.fixer}\n\nFINDINGS TO FIX (JSON):\n${JSON.stringify(toFix, null, 1)}`,
  { label: 'fix:aa3', phase: 'Fix', schema: FIX })

phase('Recheck')
const lensKeys = [...new Set(toFix.map((f) => f.lens))]
const rraw = await parallel(lensKeys.map((key) => () => {
  const mine = toFix.filter((f) => f.lens === key)
  const orig = LENSES.find((l) => l.key === key)
  return agent(`${C}\n\n${args.recheck}\n\nLENS: ${key}\nORIGINAL LENS BRIEF:\n${orig ? orig.prompt : ''}\n\nFINDINGS (JSON):\n${JSON.stringify(mine, null, 1)}\n\nFIXER REPORT (JSON):\n${JSON.stringify(fix, null, 1)}`,
    { label: `recheck:${key}`, phase: 'Recheck', schema: VERDICT })
}))
const recheck = rraw.map((v, i) => (v ? { ...v, lens: lensKeys[i] } : null)).filter(Boolean)
return { verdicts, fix, recheck }
