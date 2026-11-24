import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
M = SP + '/p3/r11_1'; L = SP + '/work_p4/p4orb/qc_final'
for pose, (cx, cy), r in (('p04_expand_pop', (703, 349), 95), ('p05_expand', (716, 398), 88), ('p06_sustain', (722, 369), 76), ('q00_rest', (715, 337), 40), ('q03_eye', (721, 354), 50)):
    a = load(f'{M}/{pose}.png'); b = load(f'{L}/{pose}.png')
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    rr = np.hypot(xx - cx, yy - cy)
    inner = (rr < 0.8 * r) & (luma(a) > 225) & (luma(b) > 225)
    rim = (rr > 0.85 * r) & (rr < 1.02 * r) & (luma(b) > 200)
    da = (b[inner] - a[inner]).mean(0); 
    print(f"{pose:15s} inner n {inner.sum():6d} MAIN {a[inner].mean(0).round(1)} LANE {b[inner].mean(0).round(1)} diff {da.round(1)} | rim n {rim.sum():5d} MAIN {a[rim].mean(0).round(0)} B-R {a[rim][:,2].mean()-a[rim][:,0].mean():+.0f} LANE {b[rim].mean(0).round(0)} B-R {b[rim][:,2].mean()-b[rim][:,0].mean():+.0f}")
