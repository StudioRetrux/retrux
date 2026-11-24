import sys; sys.path.insert(0, sys.argv[1])
from jlib import *
# usage: cmp2.py toolsdir out x y w h k img1 img2 [img3...]
out=sys.argv[2]; x,y,w,h,k=[int(v) for v in sys.argv[3:8]]
ims=[up(crop(load(p),x,y,w,h),k) for p in sys.argv[8:]]
save(out, vstack(ims))
