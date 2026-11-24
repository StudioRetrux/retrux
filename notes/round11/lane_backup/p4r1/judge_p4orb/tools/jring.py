import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
D = sys.argv[1]
m = json.load(open(f'{D}/lane_hold_meta.json')); W, H = m['W'], m['H']; X0, Y0 = m['X'], m['Y']
rd = lambda tag, i: np.frombuffer(open(f'{D}/{tag}_hold_{i:02d}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32)
a = rd('lane', 8); b = rd('off', 8)
la, lb = luma(a), luma(b)
# crystals: saturated blue in either
sat = lambda F: (F.max(-1) - F.min(-1)) / np.maximum(F.max(-1), 1)
cr = ((a[..., 2] - a[..., 0] >= 60) & (sat(a) > 0.3)) | ((b[..., 2] - b[..., 0] >= 60) & (sat(b) > 0.3))
# orb disc: off-frame bright >= 245 dilated
orb = (lb >= 244) | (la >= 244)
from numpy.lib.stride_tricks import sliding_window_view as sw
k = 9
pad = np.pad(orb | cr, k // 2)
dil = sw(pad, (k, k)).max(axis=(-1, -2))
rest = ~dil
d = la - lb
ch = rest & (np.abs(d) > 4)
print(f"hold, non-orb non-crystal px changed >4: {ch.mean()*100:.2f}% ; of those brighter {(d[ch]>0).mean()*100:.1f}% ; mean dL {d[ch].mean():+.2f} ; p5/p95 dL {np.percentile(d[ch],5):+.1f}/{np.percentile(d[ch],95):+.1f}")
# radial: dL vs distance from orb centre (centre of orb pixels)
ys, xs = np.nonzero((lb >= 244))
cy, cx = np.median(ys), np.median(xs)
yy, xx = np.mgrid[0:H, 0:W]; rr = np.hypot(xx - cx, yy - cy)
R = np.sqrt((lb >= 244).sum() / np.pi)
print(f"orb centre (crop) {cx:.0f},{cy:.0f} -> frame {cx+X0:.0f},{cy+Y0:.0f}  R~{R:.0f}")
for r0 in (1.0, 1.1, 1.25, 1.5, 2.0, 2.5, 3.0):
    r1 = r0 + (0.1 if r0 < 1.2 else 0.25 if r0 < 1.6 else 0.5)
    mm = rest & (rr >= r0 * R) & (rr < r1 * R)
    if mm.sum() < 20: continue
    print(f"  ring {r0:.2f}-{r1:.2f}R  n {mm.sum():6d}  lane L {la[mm].mean():6.1f}  off L {lb[mm].mean():6.1f}  dL {d[mm].mean():+5.2f}  lane RGB {a[mm].mean(0).round(0)} off RGB {b[mm].mean(0).round(0)}")
