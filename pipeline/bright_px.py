import sys
import numpy as np
from PIL import Image
n = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(int)
m = np.asarray(Image.open(sys.argv[2]).convert("RGB")).astype(int)
lum = n @ np.array([2, 7, 1]) / 10
H, W = lum.shape
hits = []
for y in range(70, 200):
    for x in range(30, 170):
        loc = np.concatenate([lum[y, x - 4:x - 1], lum[y, x + 2:x + 5]])
        if lum[y, x] - np.median(loc) > 25:
            mg = m[y, x]
            hits.append((x, y, int(lum[y, x]), int(np.median(loc)), tuple(mg)))
print(len(hits), "bright line px")
for h in hits[:: max(1, len(hits) // 10)][:10]:
    print(h)
