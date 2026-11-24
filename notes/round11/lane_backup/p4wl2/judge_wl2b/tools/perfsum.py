import sys, json, statistics as st
runs={}; valid={}
for l in open(sys.argv[1]):
    l=l.strip()
    if l.startswith('# pair'):
        i=int(l.split()[2].rstrip(':')); valid[i]=' VALID' in l
        continue
    p=l.split(' ',2)
    if len(p)<3 or p[1] not in ('A','B'): continue
    try: d=json.loads(p[2].rsplit(' load',1)[0])
    except Exception: continue
    runs.setdefault(int(p[0]),{})[p[1]]=d
pairs=[(i,r['A']['med'],r['B']['med']) for i,r in sorted(runs.items()) if 'A' in r and 'B' in r]
for i,a,b in pairs: print('pair %d  A %.1f  B %.1f  B/A %.3f  %s  loads A %s/%s B %s/%s others %s'%(i,a,b,b/a,'VALID' if valid.get(i) else 'invalid',runs[i]['A']['load0'],runs[i]['A']['load1'],runs[i]['B']['load0'],runs[i]['B']['load1'],sorted(set(runs[i]['A']['others']+runs[i]['B']['others']))))
if pairs:
    rat=[b/a for _,a,b in pairs]; A=[a for _,a,_ in pairs]; B=[b for _,_,b in pairs]
    print('n %d  paired median B/A %.3f  (min %.3f max %.3f)  median A %.1f  median B %.1f'%(len(pairs),st.median(rat),min(rat),max(rat),st.median(A),st.median(B)))
    lo=lambda xs:[x for x in xs if x<20.8]; hi=lambda xs:[x for x in xs if x>=20.8]
    print('modes (split 20.8 ms): A low %s high %s | B low %s high %s'%(lo(A),hi(A),lo(B),hi(B)))
    vp=[(a,b) for i,a,b in pairs if valid.get(i)]
    print('valid pairs %d'%len(vp) + ('  paired median %.3f'%st.median([b/a for a,b in vp]) if vp else ''))
