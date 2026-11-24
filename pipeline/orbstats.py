"""Orb disc stats: clipped pixels (all >= 252), mint pixels (G-R >= 12, G >= B-2, luma >= 170), mean sRGB, luma p50/p95.
   python orbstats.py cx cy r img1 img2 ...   (cx, cy, r in the image's pixels)
"""
import sys
import numpy as np
from PIL import Image

cx, cy, r = (float(v) for v in sys.argv[1:4])
for f in sys.argv[4:]:
    a = np.asarray(Image.open(f).convert("RGB")).astype(float)
    h, w, _ = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    m = (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r
    c = a[m]
    L = c @ np.array([0.2126, 0.7152, 0.0722])
    clip = np.all(c >= 252, axis=1).sum()
    mint = ((c[:, 1] - c[:, 0] >= 12) & (c[:, 1] >= c[:, 2] - 2) & (L >= 170)).sum()
    mean = c.mean(0)
    print("%-26s clip %5d  mint %5d  mean %3d,%3d,%3d  L50 %3d L95 %3d" % (f.replace("\\", "/").split("/")[-1][:26], clip, mint, mean[0], mean[1], mean[2], np.percentile(L, 50), np.percentile(L, 95)))
