# side-by-side crops REF | builds at rest (tier per build given as tier:port); args tools J x0 y0 x1 y1 k name specs...
import sys; sys.path.insert(0, sys.argv[1]); import numpy as np
from fr import fr, ref
from imgio import save
J=sys.argv[2]; x0,y0,x1,y1,k=map(int,sys.argv[3:8]); name=sys.argv[8]; specs=sys.argv[9:]
ims=[ref()]+[fr(f'{J}/caps/rest_{s.split(":")[0]}_{s.split(":")[1]}') for s in specs]
cs=[np.repeat(np.repeat(a[y0:y1,x0:x1].astype(np.float32),k,0),k,1) for a in ims]
out=cs[0]
for c in cs[1:]: out=np.concatenate([out,np.full((out.shape[0],4,3),255,np.float32),c],1)
save(f'{J}/img/{name}',out); print(name,out.shape)
