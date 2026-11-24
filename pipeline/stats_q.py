import sys
import numpy as np
from PIL import Image
def stats(f, box):
    a = np.asarray(Image.open(f).convert("RGB")).astype(float)
    x, y, w, h = box
    r = a[y:y+h, x:x+w].reshape(-1, 3)
    l = r @ np.array([0.2126, 0.7152, 0.0722])
    p = np.percentile(l, [5, 50, 95])
    return r.mean(0).round(0), l.std().round(1), p.round(0)
eng = sys.argv[1]; ref = sys.argv[2]
print("eng A quarter", stats(eng, (440, 120, 150, 100)))
print("ref A quarter", stats(ref, (480, 90, 150, 80)))
print("eng right A", stats(eng, (930, 120, 80, 150)))
print("ref right A", stats(ref, (1300, 260, 70, 160)))
