import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
D = sys.argv[1]
res = {}
for mode in ('hold', 'rest'):
    fr = {}
    for tag in ('lane', 'off'):
        mp = f'{D}/{tag}_{mode}_meta.json'
        if not os.path.exists(mp): continue
        m = json.load(open(mp))
        W, H, K = m['W'], m['H'], m['K']
        fs = []
        for i in range(K):
            p = f'{D}/{tag}_{mode}_{i:02d}.rgba'
            if not os.path.exists(p): break
            a = np.frombuffer(open(p, 'rb').read(), np.uint8).reshape(H, W, 4)[::-1, :, :3].astype(np.float32)
            fs.append(a)
        fr[tag] = np.stack(fs)
    if len(fr) < 2: continue
    # crystal mask: blue-dominant & saturated in any frame of either run
    def cmask(F):
        s = (F.max(-1) - F.min(-1)) / np.maximum(F.max(-1), 1)
        return ((F[..., 2] - F[..., 0] >= 70) & (s >= 0.33)).any(0)
    mask = cmask(fr['lane']) | cmask(fr['off'])
    for tag, F in fr.items():
        d2 = np.abs(F[2:] - 2 * F[1:-1] + F[:-2]).max(-1)   # (K-2, H, W)
        d1 = np.abs(F[1:] - F[:-1]).max(-1)
        e_in = d2[:, mask].mean(); e_out = d2[:, ~mask].mean()
        pops = (d2[:, mask] > 60).mean() * 100
        res[f'{mode}_{tag}'] = (e_in, e_out, pops, d1[:, mask].mean())
        print(f"{mode:4s} {tag:4s} crystal px {mask.sum():6d} | 2nd-diff mean on crystals {e_in:6.2f}  elsewhere {e_out:5.2f} | crystal px with |d2|>60 {pops:5.2f}% | 1st-diff mean on crystals {d1[:, mask].mean():6.2f}")
    # save a strip of 6 consecutive frames (lane top, off bottom) of the region with the most crystal pixels (240x180 window)
    ys, xs = np.nonzero(mask)
    best = None
    for cy in range(90, mask.shape[0] - 90, 30):
        for cx in range(120, mask.shape[1] - 120, 30):
            c = mask[cy-90:cy+90, cx-120:cx+120].sum()
            if best is None or c > best[0]: best = (c, cx, cy)
    _, cx, cy = best
    rows = []
    for tag in ('lane', 'off'):
        F = fr[tag]
        rows.append(hstack([up(F[i, cy-90:cy+90, cx-120:cx+120], 2) for i in range(4, 10)], 2))
    save(f'{D}/strip_{mode}.png', vstack(rows))
    print(mode, 'strip window centre (crop coords)', cx, cy)
