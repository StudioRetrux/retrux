# like hcrop.py with a local contrast stretch (same for all tiles) so a few-level difference is visible; REF shifted by dx
import sys; sys.path.insert(0, sys.argv[1]); import numpy as np
from fr import fr, ref
from imgio import save
J=sys.argv[2]; x0,y0,x1,y1,k,dx=map(int,sys.argv[3:9]); name=sys.argv[9]; specs=sys.argv[10:]
ims=[ref()[y0:y1,x0+dx:x1+dx]]+[fr(f'{J}/caps/rest_{s.split(":")[0]}_{s.split(":")[1]}')[y0:y1,x0:x1] for s in specs]
lo,hi=160.0,235.0
cs=[np.repeat(np.repeat(np.clip((a.astype(np.float32)-lo)*255/(hi-lo),0,255),k,0),k,1) for a in ims]
out=cs[0]
for c in cs[1:]: out=np.concatenate([out,np.full((out.shape[0],4,3),255,np.float32),c],1)
save(f'{J}/img/{name}',out); print(name,out.shape)
