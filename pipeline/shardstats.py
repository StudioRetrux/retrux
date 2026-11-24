"""Shard pixels in a box (strongly blue: B - R >= 40 and B >= 150): count, mean sRGB, the share of near-white shard-ish pixels
(saturation < 0.18 and luma > 215 inside the blue pixels' 3 px neighbourhood is not tracked; this reports the blue pixels'
mean and their darkest / lightest 10 % luma).
   python shardstats.py "x,y,w,h" img1 img2 ...
"""
import sys
import numpy as np
from PIL import Image

x, y, w, h = (int(v) for v in sys.argv[1].split(","))
for f in sys.argv[2:]:
    a = np.asarray(Image.open(f).convert("RGB")).astype(float)[y:y + h, x:x + w].reshape(-1, 3)
    blue = (a[:, 2] - a[:, 0] >= 40) & (a[:, 2] >= 150)
    c = a[blue]
    name = f.replace("\\", "/").split("/")[-1][:24]
    if len(c) == 0:
        print("%-24s no shard px" % name)
        continue
    L = c @ np.array([0.2126, 0.7152, 0.0722])
    m = c.mean(0)
    print("%-24s px %6d  mean %3d,%3d,%3d  L p10 %5.1f p90 %5.1f" % (name, len(c), m[0], m[1], m[2], np.percentile(L, 10), np.percentile(L, 90)))
