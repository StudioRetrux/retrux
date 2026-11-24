# judge_wl3c: cols.py's column metric (same maths) on many frames of a stepped path capture, per build; columns matched across builds by x (+-4 px).
# BPY -I colsN.py TOOLSDIR x0 x1 ya yb thr step DIR_A DIR_B DIR_C   (CSS coords at 1440; caps with --rows y0,y1)
import sys, json, zlib; sys.path.insert(0, sys.argv[1]); import numpy as np
from numpy.lib.stride_tricks import sliding_window_view as sw
x0,x1,ya,yb=map(int,sys.argv[2:6]); thr=float(sys.argv[6]); step=int(sys.argv[7]); dirs=sys.argv[8:]
def load(d,i,M):
    W=M["W"]; R=M["y1"]-M["y0"]
    return np.frombuffer(zlib.decompress(open(d+"/f%04d.bin"%i,"rb").read()),np.uint8).reshape(R,W,4)[::-1][...,:3].astype(np.float64)
def box(L,kx,ky):
    P=np.pad(L,((ky//2,ky//2),(kx//2,kx//2)),'edge'); return sw(P,(ky,kx)).mean((-1,-2))
def cols(a,oy):
    L=a[...,0]*0.2126+a[...,1]*0.7152+a[...,2]*0.0722; S=box(L,5,3); med=np.median(S[:,x0:x1],1); E=S-med[:,None]
    A,B=ya-oy,yb-oy; prof=E[A:A+20,x0:x1].mean(0); out=[]
    for i in range(3,len(prof)-3):
        if prof[i]==prof[i-3:i+4].max() and prof[i]>thr:
            x=x0+i; e=E[:,x]; n=0
            for y in range(A,B):
                if e[y:y+4].max()<thr: break
                n+=1
            out.append((x,prof[i],n))
    return out
Ms=[json.load(open(d+"/meta.json")) for d in dirs]; N=min(M.get("frames",M.get("n",0)) or 0 for M in Ms)
import os
N=min(len([f for f in os.listdir(d) if f.endswith('.bin')]) for d in dirs)
names=[d.rstrip('/').split('/')[-1] for d in dirs]
tot={n:[] for n in names}; short={n:0 for n in names[1:]}; longer={n:0 for n in names[1:]}; dimmer={n:0 for n in names[1:]}; nm={n:0 for n in names[1:]}; dl={n:[] for n in names[1:]}; de={n:[] for n in names[1:]}
for i in range(0,N,step):
    C=[cols(load(d,i,M),M["y0"]) for d,M in zip(dirs,Ms)]
    line="f%03d"%i
    for n,c in zip(names,C):
        lens=[q[2] for q in c]; tot[n].append(np.median(lens) if lens else 0); line+=" | %s n%d med %.0f"%(n[-5:],len(c),np.median(lens) if lens else 0)
    for n,c in zip(names[1:],C[1:]):
        for (x,e,l) in C[0]:
            m=[q for q in c if abs(q[0]-x)<=4]
            if m:
                q=min(m,key=lambda q:abs(q[0]-x)); nm[n]+=1; dl[n].append(q[2]-l); de[n].append(q[1]-e)
                if q[2]<=l-10: short[n]+=1
                if q[2]>=l+10: longer[n]+=1
    print(line)
print("== median of per-frame median length:", {n:float(np.median(v)) for n,v in tot.items()})
for n in names[1:]:
    print("== %s vs %s: matched %d, shorter by >=10 px %d, longer by >=10 px %d, mean dlen %+.1f, mean dexc20 %+.2f"%(n,names[0],nm[n],short[n],longer[n],np.mean(dl[n]) if dl[n] else 0,np.mean(de[n]) if de[n] else 0))
