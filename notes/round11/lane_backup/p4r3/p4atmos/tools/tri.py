import sys; sys.path.insert(0, sys.argv[1])
from jlib import *
# usage: tri.py toolsdir out x y w h k  a1 b1 c1 [a2 b2 c2 ...]  rows of 3
out=sys.argv[2]; x,y,w,h,k=[int(v) for v in sys.argv[3:8]]
fs=sys.argv[8:]
rows=[]
for i in range(0,len(fs),3):
    rows.append(hstack([up(crop(load(f),x,y,w,h),k) for f in fs[i:i+3]]))
save(out, vstack(rows))
