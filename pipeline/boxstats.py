"""Mean / std of sRGB and luma in boxes, for several images at once.
   python boxstats.py "x,y,w,h;x,y,w,h" img1 img2 ...
"""
import sys
import numpy as np
from PIL import Image

boxes = [tuple(int(v) for v in b.split(",")) for b in sys.argv[1].split(";") if b]
imgs = sys.argv[2:]
print("%-28s" % "image", "  ".join("box%d(x%d,y%d) mean rgb / luma sd" % (i, b[0], b[1]) for i, b in enumerate(boxes)))
for f in imgs:
    a = np.asarray(Image.open(f).convert("RGB")).astype(float)
    cells = []
    for (x, y, w, h) in boxes:
        c = a[y:y + h, x:x + w].reshape(-1, 3)
        L = c @ np.array([0.2126, 0.7152, 0.0722])
        m = c.mean(0)
        cells.append("%3d,%3d,%3d L%3d sd%4.1f" % (m[0], m[1], m[2], L.mean(), L.std()))
    print("%-28s" % f.replace("\\", "/").split("/")[-1][:28], "  ".join(cells))
