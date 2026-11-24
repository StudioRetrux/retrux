# p4orb3 perf: rtx.mjs blocks (lane vs main, interleaved): per mode, per cycle the ratio lane / main of the block median and mean
# rAF interval; pairs whose max 1-min load >= 10 are excluded from the summary.
import json, sys, statistics as st
d = json.load(open(sys.argv[1]))
print('cycles', d.get('cycles'), 'secs', d.get('secs'), 'boot', d.get('boot'), 'logs', d.get('logs', [])[:4])
for mode in sorted({b['mode'] for b in d['blocks']}):
    B = [b for b in d['blocks'] if b['mode'] == mode]
    L = [b for b in B if b['name'] == 'lane']; M = [b for b in B if b['name'] == 'main']
    rows = []
    for a, b in zip(L, M):
        lm = max(a['load'], b['load'], a.get('loadEnd', 0), b.get('loadEnd', 0))
        rows.append((st.median(a['iv']) / st.median(b['iv']), st.mean(a['iv']) / st.mean(b['iv']), lm, st.median(a['iv']), st.median(b['iv'])))
    ok = [r for r in rows if r[2] < 10]
    print(f"== {mode}: pairs {len(rows)} (load < 10: {len(ok)})")
    print('   median ratios ' + ' '.join(f'{r[0]:.3f}' for r in rows) + ' | mean ratios ' + ' '.join(f'{r[1]:.3f}' for r in rows))
    print('   loads ' + ' '.join(f'{r[2]:.1f}' for r in rows))
    if ok:
        print(f"   paired median of median-ratios {st.median([r[0] for r in ok]):.3f}, of mean-ratios {st.median([r[1] for r in ok]):.3f};"
              f" block medians lane {st.median([r[3] for r in ok]):.2f} ms main {st.median([r[4] for r in ok]):.2f} ms")
