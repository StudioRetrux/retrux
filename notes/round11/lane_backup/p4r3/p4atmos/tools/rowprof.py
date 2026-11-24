import sys; sys.path.insert(0, sys.argv[1])
from jlib import *
import numpy as np
# usage: rowprof.py toolsdir x0 x1 y0 y1 step img...
x0,x1,y0,y1,st=[int(v) for v in sys.argv[2:7]]
A=[load(p) for p in sys.argv[7:]]
print("rows   " + " | ".join(p.split('/')[-1][:14] for p in sys.argv[7:]))
for y in range(y0,y1,st):
    cells=[]
    for a in A:
        c=a[y:y+st,x0:x1].reshape(-1,3).mean(0); L=luma(a[y:y+st,x0:x1])
        cells.append(f"{c[0]:3.0f},{c[1]:3.0f},{c[2]:3.0f} L{L.mean():3.0f} sd{L.std():4.1f}")
    print(f"{y:3d}-{y+st:3d} " + " | ".join(cells))
