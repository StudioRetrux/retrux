import sys
import numpy as np
from PIL import Image
d = sys.argv[1]
for name in ["seam_normal", "seam_noclouds"]:
    a = np.asarray(Image.open(d + "/%s.png" % name).convert("RGB")).astype(int)
    L = a @ np.array([2, 7, 1]) / 10
    n = 0
    for y in range(20, a.shape[0] - 2):
        for x in range(6, a.shape[1] - 6):
            nb = np.concatenate([L[y, x-5:x-2], L[y, x+3:x+6]])
            if L[y, x] - np.median(nb) > 40 and np.median(nb) < 110:
                n += 1
    print(name, "seam px:", n)
