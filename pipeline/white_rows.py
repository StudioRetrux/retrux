"""Rows / extent of near-white pixels (luma > thr) inside a column band, per image (where the orb reads pure white).
   python white_rows.py x0 x1 thr img1 img2 ...
"""
import sys
import numpy as np
from PIL import Image

x0, x1, thr = int(sys.argv[1]), int(sys.argv[2]), float(sys.argv[3])
for f in sys.argv[4:]:
    a = np.asarray(Image.open(f).convert("RGB")).astype(float)
    L = a @ np.array([0.2126, 0.7152, 0.0722])
    band = L[:, x0:x1] > thr
    rows = np.where(band.sum(1) >= 4)[0]
    n = int(band.sum())
    name = f.replace("\\", "/").split("/")[-1]
    if len(rows):
        print("%-22s white px %6d  rows %3d..%3d  (%d rows)" % (name, n, rows.min(), rows.max(), len(rows)))
    else:
        print("%-22s white px %6d  (none)" % (name, n))
