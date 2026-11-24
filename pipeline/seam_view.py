"""Seam visualisation: normal | seams marked red | variant, full crop at 2x and the seam bbox at 4x.
usage: seam_view.py <dir> <normal.png> <variant.png> <out-prefix>"""
import sys
import numpy as np
from PIL import Image

d, fa, fb, pre = sys.argv[1:5]


def lum(a):
    return a.astype(int) @ np.array([2, 7, 1]) / 10


def seams(L):
    s = []
    for y in range(20, L.shape[0] - 2):
        for x in range(6, L.shape[1] - 6):
            nb = np.concatenate([L[y, x - 5:x - 2], L[y, x + 3:x + 6]])
            if L[y, x] - np.median(nb) > 40 and np.median(nb) < 110:
                s.append((y, x))
    return s


a = np.asarray(Image.open(d + "/" + fa).convert("RGB"))
b = np.asarray(Image.open(d + "/" + fb).convert("RGB"))
S = seams(lum(a))
ys = [p[0] for p in S]
xs = [p[1] for p in S]
print("seams %d  bbox x %d-%d y %d-%d" % (len(S), min(xs), max(xs), min(ys), max(ys)))
m = a.copy()
for (y, x) in S:
    m[y, x] = (255, 0, 0)
top = np.concatenate([a, m, b], axis=1)
Image.fromarray(top).resize((top.shape[1] * 2, top.shape[0] * 2), Image.NEAREST).save(d + "/" + pre + "_full.png")
x0, x1 = max(min(xs) - 30, 0), min(max(xs) + 30, a.shape[1])
y0, y1 = max(min(ys) - 20, 0), min(max(ys) + 20, a.shape[0])
z = np.concatenate([a[y0:y1, x0:x1], m[y0:y1, x0:x1], b[y0:y1, x0:x1]], axis=1)
k = max(1, min(4, 1400 // z.shape[1]))
Image.fromarray(z).resize((z.shape[1] * k, z.shape[0] * k), Image.NEAREST).save(d + "/" + pre + "_zoom.png")
print("zoom box", x0, x1, y0, y1, "scale", k)
