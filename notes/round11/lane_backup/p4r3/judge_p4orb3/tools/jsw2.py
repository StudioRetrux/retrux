# judge p4orb3: sweep orb zooms (hold + pop), MAIN row above lane row, 220 px box around the brightest disc, x1.5
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
A = SP + '/p3/r11_2/sweep'; B = SP + '/work_p4/p4orb3/qc_final/sweep'; O = sys.argv[1]
def centre(a):
    m = a.min(-1) >= 240; H, W = m.shape; m[:, :int(W * .3)] = False; m[:, int(W * .7):] = False; m[:int(H * .1)] = False; m[int(H * .85):] = False
    ys, xs = np.nonzero(m)
    if len(xs) < 30: return W // 2, int(H * .5)
    cx, cy = np.median(xs), np.median(ys)
    for _ in range(3):
        k = np.hypot(xs - cx, ys - cy) < 120; cx, cy = xs[k].mean(), ys[k].mean()
    return int(cx), int(cy)
rows = [[], []]
for g in ('hold', 'pop'):
    for s in ('T', 'TR', 'R', 'B', 'BL', 'L'):
        n = f'sw_{g}_{s}'
        for k, D in enumerate((A, B)):
            a = load(f'{D}/{n}.png'); cx, cy = centre(a); hs = 110
            c = a[max(0, cy - hs):cy + hs, max(0, cx - hs):cx + hs]
            rows[k].append(c)
save(f'{O}/sweep_orbzoom.png', vstack([hstack(rows[0][:6]), hstack(rows[1][:6]), hstack(rows[0][6:]), hstack(rows[1][6:])]))
