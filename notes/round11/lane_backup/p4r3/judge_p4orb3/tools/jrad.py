# judge p4orb3: radial median-L profiles of the orb (crystals masked) + gap darkness, det captures M/L vs REF.  BPY -I jrad.py caps/det
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
D = sys.argv[1]
def rd(nm):
    m = json.load(open(f'{D}/{nm}.json')); W, H = m['W'], m['H']
    return np.frombuffer(open(f'{D}/{nm}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32), m
sat = lambda F: (F.max(-1) - F.min(-1)) / np.maximum(F.max(-1), 1)
bins = [(0, .3), (.3, .5), (.5, .6), (.6, .7), (.7, .8), (.8, .86), (.86, .92), (.92, .97), (.97, 1.0), (1.0, 1.05), (1.05, 1.15)]
def prof(a, cx, cy, R, lab):
    H, W = a.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]; rr = np.hypot(xx - cx, yy - cy) / R; cr = (a[..., 2] - a[..., 0] >= 60) & (sat(a) > 0.3); l = luma(a)
    s = ' '.join(f"{np.median(l[(rr >= r0) & (rr < r1) & ~cr]):5.0f}" for r0, r1 in bins); d = l[(rr < 0.75) & ~cr]
    print(f"{lab:16s} {s} | disc<.75R L1/L2/L5 {np.percentile(d, 1):.0f}/{np.percentile(d, 2):.0f}/{np.percentile(d, 5):.0f} share<190 {(d < 190).mean() * 100:.1f}%")
print('bins r/R', ' '.join(f'{a}-{b}' for a, b in bins))
for key in ['p05_t3.3', 'p06_t3.3', 'p04_tn', 'p07_t3.3']:
    for tag in ['M', 'L']:
        a, m = rd(f'{tag}_base_{key}'); o = m['orb']; prof(a, o['x'], o['y'], o['r'], f'{tag} {key}')
for ref, (cx, cy), r in (('ref_F402', (709, 408), 80), ('ref_F358', (677, 432), 75), ('ref_F453', (720, 387), 55)):
    prof(load(f'/Users/muhamadrifaldi/RetruxR11Work/hp/reference/{ref}.png'), cx, cy, r, ref)
