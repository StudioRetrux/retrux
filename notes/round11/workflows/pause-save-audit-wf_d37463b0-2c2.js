export const meta = {
  name: 'pause-save-audit',
  description: 'Independent audit before the Mac cleanup pause: is every useful Retrux round-11 artefact saved durably, does the resume recipe work, is the push complete and clean',
  phases: [{ title: 'Audit', detail: 'completeness + resume recipe; pushed tree + secrets' }],
}
const ITEM = { type: 'object', properties: { what: { type: 'string' }, where: { type: 'string' }, why_useful: { type: 'string' }, saved: { type: 'boolean' }, fix: { type: 'string' } }, required: ['what', 'where', 'saved'] }
const OUT = {
  type: 'object',
  properties: {
    ok: { type: 'boolean', description: 'true only if nothing useful is unsaved and every check passed' },
    unsaved: { type: 'array', items: ITEM },
    checks: { type: 'array', items: { type: 'object', properties: { check: { type: 'string' }, pass: { type: 'boolean' }, detail: { type: 'string' } }, required: ['check', 'pass'] } },
    notes: { type: 'string' },
  },
  required: ['ok', 'unsaved', 'checks'],
}
const res = await parallel(args.lenses.map((l) => () => agent(`${args.common}\n\n${l.prompt}`, { label: `audit:${l.key}`, phase: 'Audit', schema: OUT })))
return { results: res.map((r, i) => (r ? { lens: args.lenses[i].key, ...r } : null)) }
