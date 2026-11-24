"""Print sRGB values along a horizontal pixel run in several images (to tell which surface an edge artefact sits on).
   python line_px.py y x0 x1 img1 img2 ...
"""
import sys
import numpy as np
from PIL import Image

y, x0, x1 = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
for f in sys.argv[4:]:
    a = np.asarray(Image.open(f).convert("RGB")).astype(int)
    print(f.replace("\\", "/").split("/")[-1])
    print("  " + " ".join("%4d" % x for x in range(x0, x1)))
    for ch, name in enumerate("RGB"):
        print(name + " " + " ".join("%4d" % a[y, x, ch] for x in range(x0, x1)))
