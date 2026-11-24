import re, json, statistics as st
J='/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad/work_p4/judge_p4atmos'
rows={}
for ln in open(f'{J}/perf/ab_rest.txt'):
    m=re.match(r'^(\d+) ([AB]) (\{.*\}) load ([\d.]+)', ln.strip())
    if m: rows.setdefault(int(m.group(1)),{})[m.group(2)]=(json.loads(m.group(3)),float(m.group(4)))
pm=[];pn=[];clean=[]
for i in sorted(rows):
    if 'A' in rows[i] and 'B' in rows[i]:
        a,la=rows[i]['A']; b,lb=rows[i]['B']
        rm=b['med']/a['med']; rn=b['mean']/a['mean']; pm.append(rm); pn.append(rn)
        if max(la,lb)<10: clean.append((rm,rn))
        print(f'pair {i}: A med {a["med"]:.1f} mean {a["mean"]:.1f} (load {la}) | B med {b["med"]:.1f} mean {b["mean"]:.1f} (load {lb}) | B/A {rm:.3f} / {rn:.3f}')
s=f'REST (judge run, T1 real RAF loop, vsync off, interleaved A=:5173 / B=:5178, {len(pm)} pairs, SLOT_BG=0): paired median B/A of run medians {st.median(pm):.3f}, of run means {st.median(pn):.3f}; pairs at load < 10: {len(clean)}'
if clean: s+=f' ({st.median([c[0] for c in clean]):.3f} / {st.median([c[1] for c in clean]):.3f})'
print(s); open(f'{J}/perf_summary.txt','w').write(s)
