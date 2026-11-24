# p4orb3 fixer: per variant x pose: radial median L (crystals masked) + core clip + interior stats; hidden-orb (tn) mean dL vs M.
#   BPY -I fa.py CAPDIR OUTIMG variants(comma) [poses]
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
D, O = sys.argv[1], sys.argv[2]; os.makedirs(O, exist_ok=True)
vs = sys.argv[3].split(','); keys = (sys.argv[4] if len(sys.argv) > 4 else 'p04_t3.3,p05_t3.3,p06_t3.3,p07_t3.3,p04_tn,p05_tn,p06_tn,p07_tn').split(',')
R = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
refs = {'p04': ('ref_F358', (677, 432), 75), 'p05': ('ref_F402', (709, 408), 80), 'p06': ('ref_F420', (695, 414), 80), 'p07': ('ref_F453', (720, 387), 55), 'p08': ('ref_F460', (723, 382), 55)}
sat = lambda F: (F.max(-1) - F.min(-1)) / np.maximum(F.max(-1), 1)
crm = lambda F: (F[..., 2] - F[..., 0] >= 60) & (sat(F) > 0.3)
bins = [(0, .3), (.3, .5), (.5, .6), (.6, .7), (.7, .8), (.8, .86), (.86, .92), (.92, .97), (.97, 1.0)]
def rd(nm):
    m = json.load(open(f'{D}/{nm}.json')); W, H = m['W'], m['H']
    return np.frombuffer(open(f'{D}/{nm}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32), m
def st(a, cx, cy, R0):
    H, W = a.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]; rr = np.hypot(xx - cx, yy - cy) / R0; cr = crm(a); l = luma(a)
    prof = [np.median(l[(rr >= r0) & (rr < r1) & ~cr]) for r0, r1 in bins]
    d = l[(rr < 0.75) & ~cr]
    return prof, (l[(rr < 0.5) & ~cr] >= 250).mean() * 100, (d < 215).mean() * 100, (d < 235).mean() * 100, d.std(), d.mean(), (d < 190).mean() * 100
def row(lab, s):
    p, core, f215, f235, sd, mn, f190 = s
    return f"{lab:18s} " + ' '.join(f"{x:4.0f}" for x in p) + f" | core>=250 {core:5.1f}% <215 {f215:5.1f} <235 {f235:5.1f} <190 {f190:4.1f} sd {sd:4.1f} mean {mn:6.1f}"
out = ['bins r/R ' + ' '.join(f'{a}-{b}' for a, b in bins)]
for key in keys:
    pose = key.split('_')[0]
    a, m = rd(f'M_base_{key}'); o = m['orb']; cx, cy, R0 = o['x'], o['y'], o['r']
    out.append(f'== {key} orb ({cx:.0f},{cy:.0f}) R {R0:.1f}')
    rf, (rx, ry), rb = refs[pose]; ra = load(f'{R}/{rf}.png')
    out.append(row('REF ' + rf, st(ra, rx, ry, rb)))
    sm = st(a, cx, cy, R0); out.append(row('M', sm))
    cs = []; hs = int(max(70, min(170, 1.25 * R0)))
    cs.append(crop(a, int(cx) - hs, int(cy) - hs, 2 * hs, 2 * hs))
    for v in vs:
        b, _ = rd(f'L_{v}_{key}'); s = st(b, cx, cy, R0)
        H, W = a.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]; rr = np.hypot(xx - cx, yy - cy) / R0; cr = crm(a) | crm(b); dl = luma(b) - luma(a)
        ann = '/'.join(f"{dl[(rr >= r0) & (rr < r1) & ~cr].mean():+.2f}" for r0, r1 in ((1.02, 1.25), (1.25, 1.6), (1.6, 3.0)))
        out.append(row('L ' + v, s) + f" | dmean vs M {s[5] - sm[5]:+5.1f} | ice 1.02-1.25/1.25-1.6/1.6-3 R {ann}")
        cs.append(crop(b, int(cx) - hs, int(cy) - hs, 2 * hs, 2 * hs))
    k = rb / max(1.0, R0); rh = int(round(hs * k)); rc = crop(ra, rx - rh, ry - rh, 2 * rh, 2 * rh)
    yi = (np.arange(2 * hs) * (2 * rh) / (2 * hs)).astype(int).clip(0, 2 * rh - 1); cs.append(rc[yi][:, yi])
    save(f'{O}/{key}.png', vstack([hstack(cs), hstack([(x - 200) / 55 * 255 for x in cs])]))
txt = '\n'.join(out); print(txt); open(f'{O}/stats.txt', 'w').write(txt + '\n')
