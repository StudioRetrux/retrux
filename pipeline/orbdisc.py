import sys
import numpy as np
from PIL import Image
# Orb disc stats inside a given circle (crop coords): luma percentiles and clip share. argv: cx cy r imgs...
cx, cy, r = (float(v) for v in sys.argv[1:4])
for f in sys.argv[4:]:
    a = np.asarray(Image.open(f).convert("RGB")).astype(float)
    H, W, _ = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    m = (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r
    c = a[m]
    L = c @ np.array([0.2126, 0.7152, 0.0722])
    p = np.percentile(L, [5, 10, 25, 50, 75, 95])
    clip = (c >= 252).all(axis=1).mean() * 100
    print("%-22s p5/10/25/50/75/95 %3.0f %3.0f %3.0f %3.0f %3.0f %3.0f  clip %4.1f%%" % (f.split("\\")[-1], *p, clip))
