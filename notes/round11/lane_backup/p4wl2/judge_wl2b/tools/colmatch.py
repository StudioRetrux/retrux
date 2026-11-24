# far columns (x 900-1440): mean excess over rows 510-585 (below the feet, above the near floe) per column, REF vs builds; columns = REF peaks
import sys; sys.path.insert(0, sys.argv[1]); import numpy as np
from fr import fr, ref, luma
from numpy.lib.stride_tricks import sliding_window_view as sw
J=sys.argv[2]
def box(L,kx,ky):
    P=np.pad(L,((ky//2,ky//2),(kx//2,kx//2)),'edge'); return sw(P,(ky,kx)).mean((-1,-2))
def E(a):
    L=luma(a).astype(np.float64); S=box(L,5,3); med=np.median(S[:,900:1440],1); return S-med[:,None]
ER=E(ref())
builds=[(s,E(fr(f'{J}/caps/rest_{s}'))) for s in sys.argv[3:]]
# column x positions from each build's own peaks near the REF's (search +-8 px)
prR=ER[498:518,900:1440].mean(0)
pk=[i for i in range(3,len(prR)-3) if prR[i]==prR[i-3:i+4].max() and prR[i]>6]
print('rows 510-585 mean excess per column (REF x: build x matched within 8 px)')
tot={s:[] for s,_ in builds}
for i in pk:
    xr=900+i; line='REF x%4d %5.1f |'%(xr,ER[510:586,xr-2:xr+3].mean())
    for s,Eb in builds:
        pr=Eb[498:518,xr-8:xr+9].mean(0); xb=xr-8+int(np.argmax(pr)); v=Eb[510:586,xb-2:xb+3].mean(); tot[s].append((ER[510:586,xr-2:xr+3].mean(),v))
        line+=' %s x%4d %5.1f'%(s,xb,v)
    print(line)
for s in tot:
    r=np.array(tot[s]); print('%-8s sum excess %.1f vs REF %.1f  (ratio %.2f)  mean |build-REF| %.2f'%(s,r[:,1].sum(),r[:,0].sum(),r[:,1].sum()/r[:,0].sum(),np.abs(r[:,1]-r[:,0]).mean()))
