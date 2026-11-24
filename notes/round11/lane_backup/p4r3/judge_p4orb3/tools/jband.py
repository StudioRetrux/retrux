# judge p4orb3: hidden-orb hold, the band over the orb (rows cy-.6R..cy-.15R, |x-cx|<.45R) vs the band beside it (1.15-1.6 R), M/L + F420
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
D = sys.argv[1]
def rd(nm):
    m = json.load(open(f'{D}/{nm}.json')); W, H = m['W'], m['H']
    return np.frombuffer(open(f'{D}/{nm}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32), m
def band(a, cx, cy, R, lab):
    H, W = a.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]; sat = (a.max(-1) - a.min(-1)) / np.maximum(a.max(-1), 1); cr = (a[..., 2] - a[..., 0] >= 60) & (sat > 0.3); l = luma(a)
    rows = (yy > cy - 0.6 * R) & (yy < cy - 0.15 * R); over = rows & (np.abs(xx - cx) < 0.45 * R) & ~cr; side = rows & (np.abs(xx - cx) > 1.15 * R) & (np.abs(xx - cx) < 1.6 * R) & ~cr
    print(f"{lab}: band over orb L {l[over].mean():.1f} (p90 {np.percentile(l[over], 90):.0f}) beside {l[side].mean():.1f} -> contrast {l[over].mean() - l[side].mean():+.1f}")
for key in ['p05_tn', 'p06_tn']:
    for tag in ['M', 'L']:
        a, m = rd(f'{tag}_base_{key}'); o = m['orb']; band(a, o['x'], o['y'], o['r'], f'{key} {tag}')
band(load('/Users/muhamadrifaldi/RetruxR11Work/hp/reference/ref_F420.png'), 695, 414, 80, 'REF F420')
