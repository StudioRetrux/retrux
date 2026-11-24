import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
D = sys.argv[1]; O = sys.argv[2]
R = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
refs = {'q00': 'ref_F000', 'q03': 'loop_F045', 'p04': 'ref_F358', 'p05': 'ref_F402', 'p06': 'ref_F420', 'p07': 'ref_F453', 'p08': 'ref_F460'}
def rd(nm):
    m = json.load(open(f'{D}/{nm}.json')); W, H = m['W'], m['H']
    return np.frombuffer(open(f'{D}/{nm}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32)
sat = lambda F: (F.max(-1) - F.min(-1)) / np.maximum(F.max(-1), 1)
cm = lambda F: (F[..., 2] - F[..., 0] >= 60) & (sat(F) > 0.3)
def st(a):
    a = a[:, 2:-2]; m = (a[..., 2] - a[..., 0]) >= 85; p = a[m]
    if len(p) < 50: return 'n/a'
    l = 0.2126*p[:,0]+0.7152*p[:,1]+0.0722*p[:,2]; s = (p.max(1) - p.min(1)) / np.maximum(p.max(1), 1)
    return f"n {m.sum():6d} L med {np.median(l):5.1f} p95 {np.percentile(l,95):5.1f} sat {np.median(s):.3f}"
def best(mask, hw=120, hh=90):
    b = None
    for cy in range(hh, mask.shape[0] - hh, 20):
        for cx in range(hw, mask.shape[1] - hw, 20):
            c = mask[cy-hh:cy+hh, cx-hw:cx+hw].sum()
            if b is None or c > b[0]: b = (c, cx, cy)
    return b[1], b[2]
rows = []
for k in sys.argv[3:]:
    a = rd(f'off_{k}'); b = rd(f'lane_{k}'); r = load(f"{R}/{refs[k.split('_')[0]]}.png")
    print(f'{k:9s} OFF  {st(a)}\n{"":9s} LANE {st(b)}\n{"":9s} REF  {st(r)}')
    cx, cy = best(cm(a) | cm(b)); rx, ry = best(cm(r))
    c_ = lambda im, x, y: up(crop(im, x - 120, y - 90, 240, 180), 2)
    rows.append(hstack([c_(a, cx, cy), c_(b, cx, cy), c_(r, rx, ry)]))
save(f'{O}/shards_pair.png', vstack(rows)[::1, ::1])
