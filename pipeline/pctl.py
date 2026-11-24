"""Luma percentiles (p0.1, p1, p5, p50) of a box, per image (crushed-black checks).
   python pctl.py "x,y,w,h" img1 img2 ...
"""
import sys
import numpy as np
from PIL import Image

x, y, w, h = (int(v) for v in sys.argv[1].split(","))
for f in sys.argv[2:]:
    im = Image.open(f).convert("RGB")
    if im.size[0] != 1440:
        im = im.resize((1440, 766))
    a = np.asarray(im).astype(float)[y:y + h, x:x + w].reshape(-1, 3)
    L = a @ np.array([0.2126, 0.7152, 0.0722])
    p = np.percentile(L, [0.1, 1, 5, 50])
    print("%-24s p0.1 %5.1f  p1 %5.1f  p5 %5.1f  p50 %5.1f" % (f.replace("\\", "/").split("/")[-1][:24], *p))
