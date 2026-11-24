import sys; sys.path.insert(0, sys.argv[1])
from jlib import *
import numpy as np
a = load(sys.argv[2]); b = load(sys.argv[3])
d = np.abs(a - b).max(-1)
H, W = d.shape
for name, (x0, y0, x1, y1) in {"right x700-1440 y350-500": (700, 350, 1440, 500), "left x0-700 y150-520": (0, 150, 700, 520), "frame": (0, 0, W, H)}.items():
    c = d[y0:y1, x0:x1]
    print(f"{name}: px changed >1: {(c > 1).sum()} ({100 * (c > 1).sum() / (W * H):.2f} % of the frame), >4: {(c > 4).sum()}")
