# sweep sheet: MAIN (panel r11_1) row vs LANE (qc_fix) row, crops 400x320 around the orb (luma >= 245 median; fallback centre)
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
M = SP + '/p3/r11_1/sweep'; L = SP + '/work_p4/p4orb/qc_fix/sweep'
def c(b):
    l = luma(b)[100:650, 450:1000]; hot = l >= 245; ys, xs = np.nonzero(hot)
    if len(xs) < 30: cy, cx = 400, 720
    else: cy, cx = int(np.median(ys)) + 100, int(np.median(xs)) + 450
    cx = min(max(cx, 200), 1240); cy = min(max(cy, 160), 606)
    return crop(b, cx - 200, cy - 160, 400, 320)
names = sys.argv[2:]
rows = [hstack([c(load(f'{M}/{n}.png')) for n in names]), hstack([c(load(f'{L}/{n}.png')) for n in names])]
save(f'{SP}/work_p4/rejudge_p4orb/img/sw_{sys.argv[1]}.png', vstack(rows)[::2, ::2] if len(names) > 3 else vstack(rows))
for n in names:
    a = load(f'{M}/{n}.png'); b = load(f'{L}/{n}.png')
    for t, im in (('MAIN', a), ('LANE', b)):
        l = luma(im); sub = im[100:650, 450:1000]
        print(f"{n:10s} {t} frame p99 {np.percentile(l[:,2:-2],99):.0f} p99.9 {np.percentile(l[:,2:-2],99.9):.0f} hero-box min-ch>=250 {(sub.min(-1)>=250).mean()*100:5.2f}%  >=248 {(sub.min(-1)>=248).mean()*100:5.2f}%")
