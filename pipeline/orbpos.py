import numpy as np
from PIL import Image
import sys
for f in sys.argv[1:]:
    a = np.asarray(Image.open(f).convert("L")).astype(float)
    m = a >= 250
    ys, xs = np.nonzero(m)
    if len(xs) == 0:
        print(f, "no clipped"); continue
    # largest bright cluster near the centre: restrict to x 500-950
    sel = (xs > 450) & (xs < 1000)
    print(f.split("\\")[-1], "clipped px", sel.sum(), "centroid", round(xs[sel].mean()), round(ys[sel].mean()), "bbox", xs[sel].min(), ys[sel].min(), xs[sel].max(), ys[sel].max())
