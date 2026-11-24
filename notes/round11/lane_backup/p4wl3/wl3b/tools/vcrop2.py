# vertical stack: REF then builds (caps/rest_<spec>), crop CSS x0,y0,x1,y1 at k; args tools J x0 y0 x1 y1 k name specs...
import sys; sys.path.insert(0, sys.argv[1]); import numpy as np
from fr import fr, ref
from imgio import save
J=sys.argv[2]; x0,y0,x1,y1,k=map(int,sys.argv[3:8]); name=sys.argv[8]; specs=sys.argv[9:]
ims=[ref()]+[fr(f'{J}/caps/rest_{s}') for s in specs]
cs=[np.repeat(np.repeat(a[y0:y1,x0:x1].astype(np.float32),k,0),k,1) for a in ims]
out=cs[0]
for c in cs[1:]: out=np.concatenate([out,np.full((4,out.shape[1],3),255,np.float32),c],0)
save(f'{J}/img/{name}',out); print(name,out.shape)
