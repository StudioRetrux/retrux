export const meta = {
  name: 'aa6-integrate-prejudge',
  description: 'AA6: integrate AA5a glide + AA5b far-floe fix onto the fixed AA3 lane, two pre-judges on their risks, one fix round',
  phases: [
    { title: 'Integrate', detail: 'aa6 = aa3_fixed1 + aa5b (Water.ts) + aa5a (3-way)' },
    { title: 'Pre-judge', detail: 'glide risks, reflection risks' },
    { title: 'Fix', detail: 'one fixer for confirmed items' },
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
const INTEG = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' }, conflicts: { type: 'string' }, switch_proof: { type: 'string' },
    effect_proof: { type: 'string', description: 'numbers showing F1 and v3 effects survived the merge' },
    patch_vs_base: { type: 'string' }, patch_vs_fixed1: { type: 'string' }, log_path: { type: 'string' }, notes: { type: 'string' },
  },
  required: ['ok', 'conflicts', 'switch_proof', 'effect_proof', 'patch_vs_base', 'log_path'],
}
const VERDICT = {
  type: 'object',
  properties: { lens: { type: 'string' }, gates: { type: 'array', items: GATE }, findings: { type: 'array', items: FINDING }, visual_verdict: { type: 'string' }, report_path: { type: 'string' } },
  required: ['lens', 'gates', 'findings', 'visual_verdict', 'report_path'],
}
const FIX = {
  type: 'object',
  properties: {
    fixed: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, what: { type: 'string' }, evidence: { type: 'string' } }, required: ['id', 'what', 'evidence'] } },
    not_fixed: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, why: { type: 'string' } }, required: ['id', 'why'] } },
    patch_vs_base: { type: 'string' }, log_path: { type: 'string' }, tsc_clean: { type: 'boolean' }, switches_exact: { type: 'boolean' }, notes: { type: 'string' },
  },
  required: ['fixed', 'not_fixed', 'patch_vs_base', 'tsc_clean', 'switches_exact'],
}

phase('Integrate')
const integ = await agent(`${args.common}\n\n${args.integrator}`, { label: 'integrate:aa6', phase: 'Integrate', schema: INTEG })
if (!integ || !integ.ok) { log('integration failed: stop'); return { integ } }

phase('Pre-judge')
const raw = await parallel(args.lenses.map((l) => () =>
  agent(`${args.common}\n\n${args.prejudge}\n\nINTEGRATOR REPORT (JSON):\n${JSON.stringify(integ, null, 1)}\n\n${l.prompt}`, { label: `prejudge:${l.key}`, phase: 'Pre-judge', schema: VERDICT })))
const verdicts = raw.map((v, i) => (v ? { ...v, lens: args.lenses[i].key } : null)).filter(Boolean)
const toFix = verdicts.flatMap((v) => v.findings.map((f) => ({ ...f, lens: v.lens }))).filter((f) => ['blocker', 'major', 'minor'].includes(f.severity))
log(`pre-judges ${verdicts.length}/${args.lenses.length}; to fix ${toFix.length}`)
if (!toFix.length) return { integ, verdicts, fix: null }

phase('Fix')
const fix = await agent(`${args.common}\n\n${args.fixer}\n\nFINDINGS TO FIX (JSON):\n${JSON.stringify(toFix, null, 1)}`, { label: 'fix:aa6', phase: 'Fix', schema: FIX })
return { integ, verdicts, fix }
