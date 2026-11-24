import sys, os, glob
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
M = sys.argv[1]; L = sys.argv[2]; out = sys.argv[3]
os.makedirs(out, exist_ok=True)
names = []
for sub in ['', 'ptr', 'sweep']:
    for p in sorted(glob.glob(os.path.join(L, sub, '*.png'))):
        rel = os.path.relpath(p, L)
        if not os.path.exists(os.path.join(M, rel)): continue
        names.append(rel)
tiles = []
for rel in names:
    a = load(os.path.join(M, rel)); b = load(os.path.join(L, rel))
    if a.shape != b.shape: print(rel, 'shape', a.shape, b.shape); continue
    d = np.abs(a - b).max(-1)
    m = d > 10
    ys, xs = np.nonzero(m)
    bb = (xs.min(), ys.min(), xs.max(), ys.max()) if len(xs) else None
    # change outside a central hero zone x 380-1060, y 60-700
    outside = m.copy(); outside[60:700, 380:1060] = False
    dl = luma(b) - luma(a)
    print(f"{rel:28s} meanAbs {np.abs(a-b).mean():5.2f} chg>10 {m.mean()*100:5.2f}% outsideHero {outside.mean()*100:5.2f}% bbox {bb} dL(chg) {dl[m].mean() if m.any() else 0:+.1f}")
    # heat tile: diff x4 in red over grey lane
    g = luma(b)[..., None].repeat(3, -1) * 0.35
    g[..., 0] += np.clip(d * 4, 0, 255)
    tiles.append((rel, g[::4, ::4]))
# contact sheets of 12 per sheet
for s in range(0, len(tiles), 12):
    rows = []
    for r in range(s, min(s + 12, len(tiles)), 3):
        rows.append(hstack([t[1] for t in tiles[r:r + 3]]))
    save(os.path.join(out, f"diffsheet_{s//12:02d}.png"), vstack(rows))
print('sheets', (len(tiles) + 11) // 12, [t[0] for t in tiles])
