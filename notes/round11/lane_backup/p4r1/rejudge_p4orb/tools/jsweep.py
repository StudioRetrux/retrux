import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
M = SP + '/p3/r11_1/sweep'; L = SP + '/work_p4/p4orb/qc_final/sweep'
out = SP + '/work_p4/rejudge_p4orb/img'
tag = sys.argv[1]; names = sys.argv[2:]
rows = []
for n in names:
    a = load(f'{M}/{n}.png'); b = load(f'{L}/{n}.png')
    # crop centre region x 240-1200, y 60-700 at 1/2
    rows.append(hstack([a[60:700:2, 240:1200:2], b[60:700:2, 240:1200:2]]))
save(f'{out}/sweep_{tag}.png', vstack(rows))
