import sys; sys.path.insert(0, sys.argv[1])
from jlib import *
# usage: pairs.py toolsdir out x y w h scale_div  a1 b1 a2 b2 ...  (rows: a|b side by side, downscaled by integer div)
out=sys.argv[2]; x,y,w,h,dv=[int(v) for v in sys.argv[3:8]]
fs=sys.argv[8:]
rows=[]
for i in range(0,len(fs),2):
    a=crop(load(fs[i]),x,y,w,h); b=crop(load(fs[i+1]),x,y,w,h)
    if dv>1:
        a=a[:a.shape[0]//dv*dv,:a.shape[1]//dv*dv].reshape(a.shape[0]//dv,dv,a.shape[1]//dv,dv,3).mean((1,3))
        b=b[:b.shape[0]//dv*dv,:b.shape[1]//dv*dv].reshape(b.shape[0]//dv,dv,b.shape[1]//dv,dv,3).mean((1,3))
    rows.append(hstack([a,b]))
save(out, vstack(rows))
