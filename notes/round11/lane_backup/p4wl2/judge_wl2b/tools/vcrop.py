# vertical stack of crops: REF (optional) + builds at rest; args: tools J tier ports x0 y0 x1 y1 k name [noref]
import sys; sys.path.insert(0, sys.argv[1]); import numpy as np
from fr import fr, ref
from imgio import save
J=sys.argv[2]; tier=sys.argv[3]; ports=sys.argv[4].split(','); x0,y0,x1,y1,k=map(int,sys.argv[5:10]); name=sys.argv[10]; noref=len(sys.argv)>11
ims=([] if noref else [ref()])+[fr(f'{J}/caps/rest_{tier}_{p}') for p in ports]
cs=[np.repeat(np.repeat(a[y0:y1,x0:x1].astype(np.float32),k,0),k,1) for a in ims]
out=cs[0]
for c in cs[1:]: out=np.concatenate([out,np.full((3,out.shape[1],3),255,np.float32),c],0)
save(f'{J}/img/{name}',out)
