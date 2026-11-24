import json, sys, statistics as st
d = json.load(open(sys.argv[1]))
for mode in ['move', 'rest']:
    B = [b for b in d['blocks'] if b['mode'] == mode]
    for a, c in [('a7', 'base'), ('a7', 'a6'), ('a6', 'base')]:
        A = [x for x in B if x['name'] == a]; C = [x for x in B if x['name'] == c]
        r = []; drop = []
        for i in range(min(len(A), len(C))):
            lm = max(A[i]['load'], C[i]['load'], A[i]['loadEnd'], C[i]['loadEnd'])
            if lm >= 10: continue
            r.append(st.mean(A[i]['iv']) / st.mean(C[i]['iv']))
        print(f"{mode} {a}/{c}: paired MEAN-interval ratios (load<10) {[round(x,3) for x in r]} median {st.median(r):.3f} mean {st.mean(r):.3f} min {min(r):.3f} max {max(r):.3f} n {len(r)}")
