import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
p = sys.argv[1]
a = load(p); l = luma(a)
sub = l[100:650, 450:1000]; hot = sub >= 244
ys, xs = np.nonzero(hot)
cy, cx = np.median(ys) + 100, np.median(xs) + 450
R = np.sqrt(hot.sum() / np.pi)
yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
rr = np.hypot(xx - cx, yy - cy)
print(f"{os.path.basename(p)} centre ({cx:.0f},{cy:.0f}) R(L>=244) {R:.0f}")
for r in range(int(R * 0.5), int(R * 1.35), 2):
    m = (rr >= r) & (rr < r + 2)
    c = a[m].mean(0); lv = l[m]
    print(f"  r {r:3d} ({r/R:4.2f}R) L mean {lv.mean():5.1f} p10 {np.percentile(lv,10):5.1f} RGB {c.round(0)}")
