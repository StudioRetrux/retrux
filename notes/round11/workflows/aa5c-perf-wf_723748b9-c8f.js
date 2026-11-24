export const meta = {
  name: 'aa5c-perf',
  description: 'AA5c: bring the AA3 waterline fix (every-frame mirror + lake-edge TAA) inside the +5 % frame budget without the flash coming back',
  phases: [{ title: 'Perf', detail: 'one builder in its own lane' }],
}
const X = {
  type: 'object',
  properties: {
    implemented: { type: 'boolean' },
    switch: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    what_changed: { type: 'string' },
    perf_table: { type: 'string', description: 'in-session toggle ratios vs none (BASE schedule, no TAA): B, C, B+C before and after, per path and size, with noise and load' },
    look_evidence: { type: 'string', description: 'G6 / G3 / G4 / G5 numbers and the images you looked at' },
    gates: { type: 'array', items: { type: 'object', properties: { gate: { type: 'string' }, verdict: { type: 'string' }, numbers: { type: 'string' } }, required: ['gate', 'verdict'] } },
    images: { type: 'array', items: { type: 'string' } },
    patch_path: { type: 'string' },
    log_path: { type: 'string' },
    recommendation: { type: 'string', enum: ['adopt', 'adopt-with-fixes', 'reject'] },
    open_issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['implemented', 'perf_table', 'look_evidence', 'recommendation', 'patch_path', 'log_path'],
}
phase('Perf')
const r = await agent(args.prompt, { label: 'aa5c:perf', phase: 'Perf', schema: X })
return r
