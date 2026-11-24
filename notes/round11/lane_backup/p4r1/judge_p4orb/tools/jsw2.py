import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
L = SP + '/work_p4/p4orb/qc_final/sweep'; M = SP + '/p3/r11_1/sweep'
ims = []
for n in sys.argv[2:]:
    b = load(f'{L}/{n}.png'); l = luma(b)[100:650, 450:1000]
    hot = l >= 245
    ys, xs = np.nonzero(hot)
    cy, cx = int(np.median(ys)) + 100, int(np.median(xs)) + 450
    cx = min(max(cx, 200), 1240); cy = min(max(cy, 160), 606)
    ims.append(crop(b, cx - 200, cy - 160, 400, 320))
save(f'{SP}/work_p4/judge_p4orb/img/sw_lane_{sys.argv[1]}.png', vstack([hstack(ims[:3]), hstack(ims[3:6])]) if len(ims) > 3 else hstack(ims))
