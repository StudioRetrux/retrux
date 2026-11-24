import sys, os, json
sys.path.insert(0, os.path.dirname(__file__) + '/rj')
from jlib import *
D, O, TAG, pose = sys.argv[1:5]; vs = sys.argv[5].split(',')
def rd(nm):
    m = json.load(open(f'{D}/{nm}.json')); W, H = m['W'], m['H']
    return np.frombuffer(open(f'{D}/{nm}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32)
ims = [rd(f'{TAG}_{v}_{pose}') for v in vs]
sat = lambda F: (F.max(-1) - F.min(-1)) / np.maximum(F.max(-1), 1)
m = np.zeros(ims[0].shape[:2], bool)
for a in ims: m |= ((a[..., 2] - a[..., 0]) >= 85) & (sat(a) > 0.3)
# top-3 crystal-dense boxes 200x150
boxes = []
mm = m.copy()
for k in range(3):
    best = None
    for cy in range(75, m.shape[0] - 75, 15):
        for cx in range(100, m.shape[1] - 100, 15):
            c = mm[cy-75:cy+75, cx-100:cx+100].sum()
            if best is None or c > best[0]: best = (c, cx, cy)
    boxes.append(best[1:]); mm[best[2]-75:best[2]+75, best[1]-100:best[1]+100] = False
rows = [hstack([up(crop(a, cx - 100, cy - 75, 200, 150), 2) for a in ims]) for cx, cy in boxes]
save(f'{O}/shz_{TAG}_{pose}.png', vstack(rows))
print(boxes)
