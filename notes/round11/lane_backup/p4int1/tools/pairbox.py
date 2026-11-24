# |A-B| in a box for pairs of deterministic shots. usage: pairbox.py x,y,w,h dirA dirB shots...
import sys, os, numpy as np, OpenImageIO as oiio
def load(p): return oiio.ImageBuf(p).get_pixels(oiio.FLOAT)[..., :3] * 255.0
x, y, w, h = [int(v) for v in sys.argv[1].split(",")]
for s in sys.argv[4:]:
    a = load(os.path.join(sys.argv[2], s + ".png"))[y:y+h, x:x+w]; b = load(os.path.join(sys.argv[3], s + ".png"))[y:y+h, x:x+w]
    d = np.abs(a - b).max(-1); print(f"  {s:20s} box {sys.argv[1]}: max {d.max():.0f} n>2 {int((d>2).sum())} n>0 {int((d>0.5).sum())} of {d.size}")
