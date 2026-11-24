# per-column metrics in the far water: for x in [x0,x1), excess E(x,y) = luma (7px box, 3 rows) - row median.
# Column peaks: local maxima of mean E over rows ya..ya+20. For each: length = rows from ya down to where E (5 px band mean) < thr
# (first run of 4 rows below), and peak = max luma in rows ya..ya+10.
import sys; sys.path.insert(0, sys.argv[1]); import numpy as np
from fr import fr, ref, luma
x0,x1,ya,yb=map(int,sys.argv[2:6]); thr=float(sys.argv[6]); dirs=sys.argv[7:]
ims=[('REF',ref())]+[(d.rstrip('/').split('/')[-1],fr(d)) for d in dirs]
def box(L,kx,ky):
    from numpy.lib.stride_tricks import sliding_window_view as sw
    P=np.pad(L,((ky//2,ky//2),(kx//2,kx//2)),'edge'); return sw(P,(ky,kx)).mean((-1,-2))
res={}
for n,a in ims:
    L=luma(a).astype(np.float64); S=box(L,5,3)
    med=np.median(S[:,x0:x1],1)
    E=S-med[:,None]
    prof=E[ya:ya+20,x0:x1].mean(0)
    pk=[i for i in range(3,len(prof)-3) if prof[i]==prof[i-3:i+4].max() and prof[i]>thr]
    cols=[]
    for i in pk:
        x=x0+i; e=E[:,x]
        n_=0
        for y in range(ya,yb):
            if e[y:y+4].max()<thr: break
            n_+=1
        cols.append((x,round(prof[i],1),n_,round(L[ya:ya+10,x-2:x+3].max(),1)))
    res[n]=cols
    lens=[c[2] for c in cols]; pks=[c[3] for c in cols]; m20=[c[1] for c in cols]
    print(n, 'ncols',len(cols),'len med %.0f mean %.1f max %d'%(np.median(lens) if lens else 0,np.mean(lens) if lens else 0,max(lens) if lens else 0),
          'exc20 med %.1f'%(np.median(m20) if m20 else 0),'peak med %.1f'%(np.median(pks) if pks else 0), 'water med %.1f'%np.median(med[ya:yb]))
    print('   ', cols)
