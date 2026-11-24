import sys; sys.path.insert(0, sys.argv[1]); import numpy as np
from fr import fr, ref, luma
J=sys.argv[2]; xc=int(sys.argv[3])
from numpy.lib.stride_tricks import sliding_window_view as sw
def box(L,kx,ky):
    P=np.pad(L,((ky//2,ky//2),(kx//2,kx//2)),'edge'); return sw(P,(ky,kx)).mean((-1,-2))
rows=list(range(498,606,6))
print('y      '+' '.join('%5d'%y for y in rows))
for nm,a in [('REF',ref())]+[(s,fr(f'{J}/caps/rest_{s}')) for s in sys.argv[4:]]:
    L=luma(a).astype(np.float64); S=box(L,5,3); med=np.median(S[:,900:1440],1); E=S-med[:,None]
    x=xc if nm!='REF' else xc+5
    print('%-8s'%nm[:8]+' '.join('%5.1f'%E[y,x-2:x+3].mean() for y in rows))
