import sys
from PIL import Image, ImageChops
import numpy as np
a = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(np.int16)
b = np.asarray(Image.open(sys.argv[2]).convert("RGB")).astype(np.int16)
d = np.abs(a - b).max(axis=2)
# ignore the hero (animated): only rows/cols where both differ strongly in large blobs matter; report env-ish stats
ys, xs = np.nonzero(d > 40)
print("%s: px>40 %d  px>20 %d  mean %.2f" % (sys.argv[3], (d > 40).sum(), (d > 20).sum(), d.mean()))
if len(xs):
    # coarse 40px grid histogram of strong diffs
    H = {}
    for y, x in zip(ys, xs):
        k = (y // 40 * 40, x // 40 * 40); H[k] = H.get(k, 0) + 1
    top = sorted(H.items(), key=lambda kv: -kv[1])[:8]
    print("   top cells (y,x):", " ".join("%d,%d:%d" % (k[0], k[1], v) for k, v in top))
