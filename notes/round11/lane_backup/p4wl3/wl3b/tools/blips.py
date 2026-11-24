# one-frame blips (thr 12, sign flip) per box per build on the same stepped poses; boxes in CSS px
import sys, json, zlib, numpy as np
def load(d, box):
    M=json.load(open(d+"/meta.json")); W=M["W"]; R=M["y1"]-M["y0"]; N=len(M["info"]); k=W/M["vw"]
    x0,y0,x1,y1=[int(round(v*k)) for v in box]; y0-=M["y0"]; y1-=M["y0"]
    F=np.array([np.frombuffer(zlib.decompress(open(d+"/f%04d.bin"%i,"rb").read()),np.uint8).reshape(R,W,4)[::-1][y0:y1,x0:x1,:3] for i in range(N)]).astype(np.float32)
    return F@np.array([.2126,.7152,.0722],np.float32)
def blips(L,thr=12):
    d=np.diff(L,axis=0); return ((np.abs(d[:-1])>thr)&(np.abs(d[1:])>thr)&(np.sign(d[:-1])!=np.sign(d[1:])))
J=sys.argv[1]; dirs=sys.argv[2].split(','); boxes=json.loads(sys.argv[3])
for nm,b in boxes.items():
    s=[]
    for d in dirs:
        L=load(J+'/'+d,b); B=blips(L); s.append('%s %.1f'%(d.split('_')[-1],B.reshape(len(B),-1).sum(1).mean()))
    print('%-8s %-24s'%(nm,str(b)),' | '.join(s))
