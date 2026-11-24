"""Find the window where two frames differ most and save old | new | diff crops at 2x.
usage: diff_hot.py <a.png> <b.png> <out.png> [w=240] [h=120] [thr=12]"""
import sys
import numpy as np
from PIL import Image

pa, pb, out = sys.argv[1:4]
w = int(sys.argv[4]) if len(sys.argv) > 4 else 240
h = int(sys.argv[5]) if len(sys.argv) > 5 else 120
thr = int(sys.argv[6]) if len(sys.argv) > 6 else 12
A = np.asarray(Image.open(pa).convert("RGB")).astype(int)
B = np.asarray(Image.open(pb).convert("RGB")).astype(int)
D = (np.abs(A - B).max(axis=2) > thr).astype(np.int32)
ii = D.cumsum(0).cumsum(1)
ii = np.pad(ii, ((1, 0), (1, 0)))
H, W = D.shape
best, by, bx = -1, 0, 0
for y in range(0, H - h + 1, 8):
    for x in range(0, W - w + 1, 8):
        s = ii[y + h, x + w] - ii[y, x + w] - ii[y + h, x] + ii[y, x]
        if s > best:
            best, by, bx = s, y, x
print("hot window x %d y %d (%dx%d): %d px differ" % (bx, by, w, h, best))
dm = np.zeros_like(A)
dm[..., 0] = D * 255
tiles = [A[by:by + h, bx:bx + w], B[by:by + h, bx:bx + w], dm[by:by + h, bx:bx + w]]
row = np.concatenate(tiles, axis=1).astype(np.uint8)
Image.fromarray(row).resize((row.shape[1] * 2, row.shape[0] * 2), Image.NEAREST).save(out)
