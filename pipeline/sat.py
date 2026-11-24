"""Mean HSV-style saturation ((max-min)/max) and luma of a box, per image.
   python sat.py "x,y,w,h" img1 img2 ...
"""
import sys
import numpy as np
from PIL import Image

x, y, w, h = (int(v) for v in sys.argv[1].split(","))
for f in sys.argv[2:]:
    a = np.asarray(Image.open(f).convert("RGB")).astype(float)
    if a.shape[1] != 1440:
        a = np.asarray(Image.open(f).convert("RGB").resize((1440, 766))).astype(float)
    c = a[y:y + h, x:x + w].reshape(-1, 3)
    mx = c.max(1)
    mn = c.min(1)
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    L = c @ np.array([0.2126, 0.7152, 0.0722])
    print("%-24s sat %.3f  L %5.1f" % (f.replace("\\", "/").split("/")[-1][:24], s.mean(), L.mean()))
