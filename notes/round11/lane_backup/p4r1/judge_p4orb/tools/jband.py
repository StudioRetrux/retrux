import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
M = SP + '/p3/r11_1'; L = SP + '/work_p4/p4orb/qc_final'
def reg(a, x0, y0, x1, y1):
    p = a[y0:y1, x0:x1].reshape(-1, 3); l = luma(a[y0:y1, x0:x1]).ravel()
    return f"L50 {np.median(l):5.1f} sd {l.std():4.1f} RGB {p.mean(0).round(0)}"
for pose, boxes in (('p06_sustain', [('band over orb', 680, 420, 765, 470), ('band beside', 560, 420, 640, 470)]),
                    ('q00_rest', [('band over orb', 680, 360, 760, 410), ('band beside', 560, 360, 640, 410)]),
                    ('p05_expand', [('ring left of orb', 560, 360, 620, 440), ('sky/ring above', 680, 250, 760, 300)])):
    a = load(f'{M}/{pose}.png'); b = load(f'{L}/{pose}.png')
    for name, *bx in boxes:
        print(f"{pose:12s} {name:18s} MAIN {reg(a, *bx)} | LANE {reg(b, *bx)}")
