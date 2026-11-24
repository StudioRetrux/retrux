# motion strip: consecutive stepped frames, builds stacked; args: tools J builds(csv dirs) frames(csv) x0 y0 x1 y1 (CSS) k name
import sys, json, zlib; sys.path.insert(0, sys.argv[1]); import numpy as np
from imgio import save
J=sys.argv[2]; dirs=sys.argv[3].split(','); frs=[int(v) for v in sys.argv[4].split(',')]; x0,y0,x1,y1=map(float,sys.argv[5:9]); k=int(sys.argv[9]); name=sys.argv[10]
rows=[]
for d in dirs:
    M=json.load(open(f'{J}/{d}/meta.json')); W=M["W"]; R=M["y1"]-M["y0"]; s=W/M["vw"]
    X0,Y0,X1,Y1=[int(round(v*s)) for v in (x0,y0,x1,y1)]; Y0-=M["y0"]; Y1-=M["y0"]
    cs=[]
    for i in frs:
        a=np.frombuffer(zlib.decompress(open(f'{J}/{d}/f%04d.bin'%i,'rb').read()),np.uint8).reshape(R,W,4)[::-1][Y0:Y1,X0:X1,:3].astype(np.float32)
        cs.append(np.repeat(np.repeat(a,k,0),k,1))
    r=cs[0]
    for c in cs[1:]: r=np.concatenate([r,np.full((r.shape[0],3,3),255,np.float32),c],1)
    rows.append(r)
out=rows[0]
for r in rows[1:]: out=np.concatenate([out,np.full((5,out.shape[1],3),255,np.float32),r],0)
save(f'{J}/img/{name}',out)
print(name,out.shape)
