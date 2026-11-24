export const meta = {
  name: 'p4-int3-verify',
  description: 'Verify integration lane int3 (round-4 lanes + orb): integrity, switch proofs, lane effects, waterline AA, 60 fps, captures, perf, client sheets',
  phases: [{ title: 'Verify', detail: 'one independent verifier' }],
}
const FINDING = { type: 'object', properties: { id: { type: 'string' }, severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'nit'] }, title: { type: 'string' }, evidence: { type: 'string' }, repro: { type: 'string' }, suggested_fix: { type: 'string' } }, required: ['id', 'severity', 'title', 'evidence', 'repro'] }
const VERIFY = { type: 'object', properties: { ok: { type: 'boolean' }, integrity: { type: 'string' }, switch_proofs: { type: 'string' }, a4_optin: { type: 'string' }, lane_effects: { type: 'string' }, aa_gates: { type: 'string' }, fps60: { type: 'string' }, regressions: { type: 'string' }, startup: { type: 'string' }, perf: { type: 'string' }, sheets: { type: 'string' }, findings: { type: 'array', items: FINDING }, report_path: { type: 'string' } }, required: ['ok', 'integrity', 'switch_proofs', 'a4_optin', 'lane_effects', 'aa_gates', 'fps60', 'regressions', 'startup', 'perf', 'sheets', 'findings', 'report_path'] }
phase('Verify')
const v = await agent(`FIRST read the binding briefs ${args.brief} and ${args.brief2} in full.\n\n${args.verify}`, { label: 'verify:int3', phase: 'Verify', schema: VERIFY })
return { verify: v }
