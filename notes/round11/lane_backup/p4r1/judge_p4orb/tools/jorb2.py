import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
for d, tag in ((SP + '/p3/r11_1/sweep', 'MAIN'), (SP + '/work_p4/p4orb/qc_final/sweep', 'LANE')):
    for n in sys.argv[1:]:
        a = load(f'{d}/{n}.png'); l = luma(a)
        sub = l[60:700, 300:1140]
        hot = (a[60:700, 300:1140].min(-1) >= 250)
        print(f"{tag} {n:12s} hero-zone clipped px (min>=250) {hot.sum():6d}  L>=245 px {(sub>=245).sum():6d}  p99.5 {np.percentile(sub,99.5):.0f} max-L {sub.max():.0f}")
