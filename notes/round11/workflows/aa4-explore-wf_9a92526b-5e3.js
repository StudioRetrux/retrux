export const meta = {
  name: 'aa4-explore',
  description: 'Two AA4 explorers chase reference-quality waterline edges: GBAA contour distance vs MLAA on the exact lake mask',
  phases: [{ title: 'Explore', detail: 'two angles, own lanes and labs' }],
}

const X = {
  type: 'object',
  properties: {
    angle: { type: 'string' },
    implemented: { type: 'boolean' },
    switch: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    replaces_C: { type: 'boolean' },
    metrics_table: { type: 'string', description: 'per path: BASE / AA3 / yours / GT for edge error vs GT, MCE, MC32, J48, J32, texture, flash peak' },
    edge_error_reduction_vs_base: { type: 'string' },
    perf_vs_base: { type: 'string' },
    gates: {
      type: 'array',
      items: { type: 'object', properties: { gate: { type: 'string' }, verdict: { type: 'string' }, numbers: { type: 'string' } }, required: ['gate', 'verdict'] },
    },
    slices: { type: 'array', items: { type: 'string' } },
    patch_path: { type: 'string' },
    log_path: { type: 'string' },
    recommendation: { type: 'string', enum: ['adopt', 'adopt-with-fixes', 'reject'] },
    open_issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['angle', 'implemented', 'metrics_table', 'recommendation', 'patch_path', 'log_path'],
}

phase('Explore')
const res = await parallel(args.explorers.map((x) => () =>
  agent(`${args.common}\n\n${args.explore}\n\n${x.prompt}`, { label: `explore:${x.key}`, phase: 'Explore', schema: X })))
const out = res.map((r, i) => (r ? { ...r, key: args.explorers[i].key } : null))
if (out.some((r) => !r)) log('an explorer returned nothing')
return out
