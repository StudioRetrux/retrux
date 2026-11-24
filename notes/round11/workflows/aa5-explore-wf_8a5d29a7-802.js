export const meta = {
  name: 'aa5-explore',
  description: 'AA5: tune the lake-edge TAA toward reference glide, and root-cause the far-floe pale-block pop',
  phases: [{ title: 'Explore', detail: 'AA5a glide tuning, AA5b far-floe pop' }],
}

const X = {
  type: 'object',
  properties: {
    track: { type: 'string' },
    implemented: { type: 'boolean' },
    switch: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    root_cause: { type: 'string' },
    chosen_settings: { type: 'string' },
    metrics_table: { type: 'string', description: 'BASE / AA3 / yours / GT for every metric you used, per path' },
    perf_vs_base: { type: 'string' },
    gates: {
      type: 'array',
      items: { type: 'object', properties: { gate: { type: 'string' }, verdict: { type: 'string' }, numbers: { type: 'string' } }, required: ['gate', 'verdict'] },
    },
    images: { type: 'array', items: { type: 'string' }, description: 'slices / strips / crops the lead should look at, full paths' },
    patch_path: { type: 'string' },
    log_path: { type: 'string' },
    recommendation: { type: 'string', enum: ['adopt', 'adopt-with-fixes', 'reject'] },
    open_issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['track', 'implemented', 'metrics_table', 'recommendation', 'patch_path', 'log_path', 'images'],
}

phase('Explore')
const res = await parallel(args.tracks.map((x) => () =>
  agent(`${args.common}\n\n${x.prompt}`, { label: `aa5:${x.key}`, phase: 'Explore', schema: X })))
const out = res.map((r, i) => (r ? { ...r, key: args.tracks[i].key } : null))
if (out.some((r) => !r)) log('an AA5 agent returned nothing')
return out
