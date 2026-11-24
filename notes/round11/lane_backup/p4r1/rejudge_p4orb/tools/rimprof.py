# radial profile (median over angles, crystals masked) around the projected orb: L and B-R per 2 px, lane vs off; F402 for scale.
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
D = sys.argv[1]
def rd(nm):
    m = json.load(open(f'{D}/{nm}.json')); W, H = m['W'], m['H']
    return np.frombuffer(open(f'{D}/{nm}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32), m
def prof(a, cx, cy, r0, r1, step, mask=None):
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]; rr = np.hypot(xx - cx, yy - cy); l = luma(a)
    out = []
    for r in np.arange(r0, r1, step):
        m = (rr >= r) & (rr < r + step)
        if mask is not None: m &= ~mask
        if m.sum() < 10: out.append((r, np.nan, np.nan)); continue
        out.append((r, np.median(l[m]), np.median(a[m][:, 2] - a[m][:, 0])))
    return out
sat = lambda F: (F.max(-1) - F.min(-1)) / np.maximum(F.max(-1), 1)
for k in sys.argv[2:]:
    a, ma = rd(f'lane_{k}'); b, mb = rd(f'off_{k}')
    o = mb['orb']; cx, cy, R = o['x'], o['y'], o['r']
    cr = ((a[..., 2] - a[..., 0] >= 60) & (sat(a) > 0.3)) | ((b[..., 2] - b[..., 0] >= 60) & (sat(b) > 0.3))
    pa = prof(a, cx, cy, 0.6 * R, 1.25 * R, 2, cr); pb = prof(b, cx, cy, 0.6 * R, 1.25 * R, 2, cr)
    print(f'== {k} R {R:.1f}: r/R  OFF L, B-R | LANE L, B-R')
    print('  ' + '  '.join(f'{x[0]/R:.2f}:{y[1]:.0f}/{y[2]:+.0f}|{x[1]:.0f}/{x[2]:+.0f}' for x, y in zip(pa, pb)))
R0 = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
for ref, (cx, cy), rb in (('ref_F402', (709, 408), 80), ('loop_F045', (716, 350), 48), ('ref_F453', (720, 387), 55)):
    a = load(f'{R0}/{ref}.png')
    cr = (a[..., 2] - a[..., 0] >= 60) & (sat(a) > 0.3)
    p = prof(a, cx, cy, 0.6 * rb, 1.6 * rb, 2, cr)
    print(f'== {ref} bright r {rb}: r/rb L/B-R')
    print('  ' + '  '.join(f'{x[0]/rb:.2f}:{x[1]:.0f}/{x[2]:+.0f}' for x in p))
