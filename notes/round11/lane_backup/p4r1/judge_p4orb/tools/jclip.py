import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
R = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
for name, p, (cx, cy) in (('REF F402', f'{R}/ref_F402.png', (709, 408)), ('REF F453', f'{R}/ref_F453.png', (720, 387)), ('REF F460', f'{R}/ref_F460.png', (723, 382)), ('REF F358', f'{R}/ref_F358.png', (677, 432)),
                          ('MAIN p05', f'{SP}/p3/r11_1/p05_expand.png', (722, 393)), ('LANE p05', f'{SP}/work_p4/p4orb/qc_final/p05_expand.png', (722, 393))):
    a = load(p)
    x0, y0 = int(cx - 120), int(cy - 120)
    box = a[y0:y0 + 241, x0:x0 + 241]
    print(f"{name}: box241 min-channel>=248 {100*(box.min(-1)>=248).mean():5.1f}%  >=250 {100*(box.min(-1)>=250).mean():5.1f}%  frame p99 L {np.percentile(luma(a[:, 2:-2]), 99):.0f}")
