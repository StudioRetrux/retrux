import sys
from PIL import Image
a = Image.open(sys.argv[1]).convert("RGB")
b = Image.open(sys.argv[2]).convert("RGB")
# find bright thin lines on the dark ridge: pixels much brighter than the median of their row neighbours
import numpy as np
A = np.asarray(a).astype(int); L = A @ np.array([2, 7, 1]) / 10
hits = []
for y in range(250, 460):
    for x in range(100, 420):
        nb = np.concatenate([L[y, x-5:x-2], L[y, x+3:x+6]])
        if L[y, x] - np.median(nb) > 40 and np.median(nb) < 110:
            hits.append((x, y))
print(len(hits), "seam px")
if hits:
    xs = [h[0] for h in hits]; ys = [h[1] for h in hits]
    x0, x1, y0, y1 = max(min(xs) - 30, 0), min(max(xs) + 30, 1440), max(min(ys) - 30, 0), min(max(ys) + 30, 766)
    print("bbox", x0, y0, x1, y1)
    s = Image.new("RGB", ((x1 - x0) * 2, (y1 - y0) * 4))
    s.paste(a.crop((x0, y0, x1, y1)).resize(((x1 - x0) * 2, (y1 - y0) * 2), Image.NEAREST), (0, 0))
    s.paste(b.crop((x0, y0, x1, y1)).resize(((x1 - x0) * 2, (y1 - y0) * 2), Image.NEAREST), (0, (y1 - y0) * 2))
    s.save(sys.argv[3], quality=92)
