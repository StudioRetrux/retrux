import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
M = SP + '/p3/r11_1'; L = SP + '/work_p4/p4orb/qc_final'; R = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
def prof(path, cx, cy, r0, r1, sector=None):
    a = load(path)
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    rr = np.hypot(xx - cx, yy - cy)
    ang = np.degrees(np.arctan2(yy - cy, xx - cx))
    out = []
    for r in range(r0, r1):
        m = (rr >= r) & (rr < r + 1)
        if sector: m &= (ang > sector[0]) & (ang < sector[1])
        c = a[m].mean(0)
        out.append((r, c))
    return out
pose = sys.argv[1]; ref = sys.argv[2]
ex, ey, rx, ry, r0, r1 = map(int, sys.argv[3:9])
sec = (-170, -10)  # upper half (avoid band in front at the bottom)
pm = prof(f'{M}/{pose}.png', ex, ey, r0, r1, sec); pl = prof(f'{L}/{pose}.png', ex, ey, r0, r1, sec); pr = prof(f'{R}/{ref}.png', rx, ry, r0, r1, sec)
print('r   MAIN(rgb, L, B-R)          LANE(rgb, L, B-R)          REF')
for (r, a), (_, b), (_, c) in zip(pm, pl, pr):
    f = lambda v: f"{int(v[0]):3d},{int(v[1]):3d},{int(v[2]):3d} L{int(0.2126*v[0]+0.7152*v[1]+0.0722*v[2]):3d} B-R{int(v[2]-v[0]):+3d}"
    print(f"{r:3d} {f(a)}   {f(b)}   {f(c)}")
