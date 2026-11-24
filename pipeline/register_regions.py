"""Best integer shift (and optional scale) aligning engine regions to the reference, on edge images.
   python register_regions.py engine.png ref.png "name:x,y,w,h;..." [maxShift=80] [scales=1.0]
Reports for each region the (dx, dy, scale) that moves the ENGINE content onto the REFERENCE (ref ~ engine shifted
by dx, dy), with the normalized correlation.
"""
import sys
import numpy as np
from PIL import Image


def edges(path, blur=0.0):
    from PIL import ImageFilter
    im = Image.open(path).convert("L")
    if blur > 0:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    a = np.asarray(im).astype(np.float32)
    gx = np.zeros_like(a); gy = np.zeros_like(a)
    gx[:, 1:-1] = a[:, 2:] - a[:, :-2]
    gy[1:-1, :] = a[2:, :] - a[:-2, :]
    g = np.hypot(gx, gy)
    return g


def resize(g, s):
    if abs(s - 1.0) < 1e-6:
        return g
    im = Image.fromarray(g)
    h, w = g.shape
    return np.asarray(im.resize((int(round(w * s)), int(round(h * s))), Image.BILINEAR))


import os
E = edges(sys.argv[1], float(os.environ.get("EBLUR", "0")))
R = edges(sys.argv[2])
regions = [r for r in sys.argv[3].split(";") if r]
M = int(sys.argv[4]) if len(sys.argv) > 4 else 80
scales = [float(s) for s in (sys.argv[5].split(",") if len(sys.argv) > 5 else ["1.0"])]
for reg in regions:
    name, box = reg.split(":")
    x, y, w, h = [int(v) for v in box.split(",")]
    ref = R[y:y + h, x:x + w]
    rn = (ref - ref.mean()) / (ref.std() + 1e-6)
    best = (-9, 0, 0, 1.0)
    for s in scales:
        # scale the engine image about the region centre
        cx, cy = x + w / 2, y + h / 2
        Es = resize(E, s)
        for dy in range(-M // 2, M // 2 + 1):
            for dx in range(-M, M + 1):
                # engine content at (px - dx, py - dy) appears at (px, py) in the reference
                ex = int(round((x - dx - cx) * s + cx * s)); ey = int(round((y - dy - cy) * s + cy * s))
                if ex < 0 or ey < 0 or ex + w > Es.shape[1] or ey + h > Es.shape[0]:
                    continue
                e = Es[ey:ey + h, ex:ex + w]
                en = (e - e.mean()) / (e.std() + 1e-6)
                c = float((en * rn).mean())
                if c > best[0]:
                    best = (c, dx, dy, s)
    c0 = float((((E[y:y + h, x:x + w] - E[y:y + h, x:x + w].mean()) / (E[y:y + h, x:x + w].std() + 1e-6)) * rn).mean())
    print("%-16s dx %+4d dy %+4d scale %.3f  corr %.3f (unshifted %.3f)" % (name, best[1], best[2], best[3], best[0], c0))
