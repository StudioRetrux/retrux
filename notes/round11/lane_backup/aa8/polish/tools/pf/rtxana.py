import json, sys, statistics as st
d = json.load(open(sys.argv[1]))
print('vw', d['vw'], 'vh', d['vh'], 'cycles', d['cycles'], 'secs', d['secs'], 'boot ms', d['boot'], 'logs', d['logs'][:6])
def q(a, f):
    b = sorted(a); return b[min(len(b) - 1, int(len(b) * f))]
for mode in ['move', 'rest']:
    print('==', mode)
    B = [b for b in d['blocks'] if b['mode'] == mode]
    for name in ['a7', 'base', 'a6']:
        bs = [b for b in B if b['name'] == name]
        allv = [x for b in bs for x in b['iv']]
        print(f"  {name:5s} frames {len(allv):5d} med {st.median(allv):6.2f} ms p95 {q(allv,.95):6.2f} ms  fps-ish {1000/st.median(allv):5.1f}  taa {[b['st']['taa'] and b['st']['taa']['weight'] for b in bs]}  reused {[b['st']['reused'] for b in bs]} scale {sorted(set(b['st']['scale'] for b in bs))}")
    for a, b in [('a7', 'base'), ('a7', 'a6'), ('a6', 'base')]:
        A = [x for x in B if x['name'] == a]; Bb = [x for x in B if x['name'] == b]
        rows = []
        for i in range(min(len(A), len(Bb))):
            ma, mb = st.median(A[i]['iv']), st.median(Bb[i]['iv'])
            pa, pb = q(A[i]['iv'], .95), q(Bb[i]['iv'], .95)
            lm = max(A[i]['load'], Bb[i]['load'], A[i]['loadEnd'], Bb[i]['loadEnd'])
            rows.append((ma / mb, pa / pb, lm))
        ok = [r for r in rows if r[2] < 10]
        print(f"  {a}/{b}: paired med ratios {[round(r[0],3) for r in rows]}")
        print(f"     loads(max per pair) {[round(r[2],1) for r in rows]}  pairs<10: {len(ok)}  median ratio(<10) {st.median([r[0] for r in ok]) if ok else float('nan'):.3f}  p95 ratio med(<10) {st.median([r[1] for r in ok]) if ok else float('nan'):.3f}  all-pairs med {st.median([r[0] for r in rows]):.3f}")
