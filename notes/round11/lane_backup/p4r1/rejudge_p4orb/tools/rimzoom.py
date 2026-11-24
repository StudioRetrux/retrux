import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
D = sys.argv[1]; O = sys.argv[2]
R0 = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
def rd(nm):
    m = json.load(open(f'{D}/{nm}.json')); W, H = m['W'], m['H']
    return np.frombuffer(open(f'{D}/{nm}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32), m
rows = []
for k in ('p05_t3.3', 'p06_t3.3', 'p04_tn'):
    a, ma = rd(f'off_{k}'); b, _ = rd(f'lane_{k}'); o = ma['orb']
    # lower-left rim region (angle 225 deg) and right rim (0 deg)
    ims = []
    for ang in (200, 330):
        x = o['x'] + 0.95 * o['r'] * np.cos(np.radians(ang)); y = o['y'] - 0.95 * o['r'] * np.sin(np.radians(ang))
        for im in (a, b):
            ims.append(up(crop(im, int(x) - 50, int(y) - 50, 100, 100), 3))
    rows.append(hstack(ims))
r = load(f'{R0}/ref_F402.png')
refims = []
for (x, y) in ((709 - 80, 408 + 25), (709 + 75, 408 - 30), (709 - 40, 408 + 70), (709 + 60, 408 + 55)):
    refims.append(up(crop(r, x - 50, y - 50, 100, 100), 3))
rows.append(hstack(refims))
save(f'{O}/rim_zoom.png', vstack(rows))
