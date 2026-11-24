# column "breaks": vertical high-pass of luma inside each column (rows 505-585, 3 px wide), REF vs builds. args tools J specs...
import sys; sys.path.insert(0, sys.argv[1]); import numpy as np
from fr import fr, ref, luma
J=sys.argv[2]; specs=sys.argv[3:]
def hp(p,k=9):
    ker=np.ones(k)/k; s=np.convolve(np.pad(p,(k//2,k//2),'edge'),ker,'valid'); return p-s
def an(a, xs, name):
    L=luma(a).astype(np.float64); sd=[]; per=[]; ow=[]
    for x in xs:
        p=L[505:585,x-1:x+2].mean(1); h=hp(p); sd.append(h.std())
        F=np.abs(np.fft.rfft(h*np.hanning(len(h)))); f=np.fft.rfftfreq(len(h)); i=1+np.argmax(F[1:]); per.append(1/f[i])
    for x in range(1180,1200,3):
        p=L[505:585,x-1:x+2].mean(1); ow.append(hp(p).std())
    print('%-10s col hp-std med %.2f  [%s]  period med %.1f px | open-water hp-std %.2f'%(name,np.median(sd),' '.join('%.1f'%v for v in sd),np.median(per),np.median(ow)))
an(ref(),[906,940,1026,1087,1105,1213],'REF')
for s in specs: an(fr(f'{J}/caps/rest_{s}'),[912,948,1028,1087,1103,1207],s)
