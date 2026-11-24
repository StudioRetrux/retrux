import sys; sys.path.insert(0, sys.argv[1])
from jlib import *
from boxes import BOX, stats
# usage: boxcmp.py toolsdir REFDIR A_DIR B_DIR pairs(ref:shot,...) [boxes,...]
REF, A, B = sys.argv[2], sys.argv[3], sys.argv[4]
pairs = [p.split(':') for p in sys.argv[5].split(',')]
boxes = sys.argv[6].split(',') if len(sys.argv) > 6 else list(BOX)
print("box        | " + " | ".join(f"{r[:9]:>9} ref  base  new (d_base d_new)" for r, _ in pairs))
tot = {}
for k in boxes:
    cells = []
    for r, s in pairs:
        R = stats(load(f"{REF}/{r}.png"), BOX[k]); a = stats(load(f"{A}/{s}.png"), BOX[k]); b = stats(load(f"{B}/{s}.png"), BOX[k])
        cells.append(f"{R['L']:5.0f} {a['L']:5.0f} {b['L']:5.0f} ({a['L']-R['L']:+4.0f} {b['L']-R['L']:+4.0f}) lap{R['lap']:.1f}/{a['lap']:.1f}/{b['lap']:.1f}")
        tot.setdefault(k, [0, 0]); tot[k][0] += abs(a['L'] - R['L']); tot[k][1] += abs(b['L'] - R['L'])
    print(f"{k:<10} | " + " | ".join(cells))
print("mean |dL| base -> new: " + ", ".join(f"{k} {v[0]/len(pairs):.1f}->{v[1]/len(pairs):.1f}" for k, v in tot.items()))
