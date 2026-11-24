import sys
sys.path.insert(0, sys.argv[1])
from im import load
import numpy as np
p = sys.argv[2]; xs = [int(v) for v in sys.argv[3].split(',')]; y0, y1 = map(int, sys.argv[4].split('-'))
a = load(p)
for x in xs:
    print('x', x)
    for y in range(y0, y1 + 1):
        r, g, b = a[y, x]; L = 0.2126*r+0.7152*g+0.0722*b
        print(f"  y{y} {int(r):3d} {int(g):3d} {int(b):3d} L{L:5.1f} B-R {int(b-r):3d}")
