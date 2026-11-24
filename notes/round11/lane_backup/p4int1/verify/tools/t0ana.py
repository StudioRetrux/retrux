# T0 phone at t+90 s: int1 default vs :5199, int1 all-off vs :5199; diff stats + a crop sheet (MAIN | INT1 | |diff| x8) of the diff bbox
import sys; sys.path.insert(0, sys.argv[1] + '/tools'); import vlib as v, numpy as np
V = sys.argv[1]
m, i, o = v.load(V + '/t0/main_t90.png'), v.load(V + '/t0/int1_t90.png'), v.load(V + '/t0/int1off_t90.png')
for nm, b in [('int1 default', i), ('int1 all-off', o)]:
    d = np.abs(b - m).max(2); ys, xs = np.nonzero(d > 2)
    print(f"T0 t+90 {nm} vs 5199: max {d.max():.0f} n>2 {len(xs)} n>8 {(d > 8).sum()} of {d.size} px; bbox {(xs.min(), ys.min(), xs.max(), ys.max()) if len(xs) else None}")
d = np.abs(i - m).max(2); ys, xs = np.nonzero(d > 2)
if len(xs):
    x0, y0, x1, y1 = max(xs.min() - 40, 0), max(ys.min() - 40, 0), min(xs.max() + 40, m.shape[1]), min(ys.max() + 40, m.shape[0])
    if (x1 - x0) * (y1 - y0) > 900 * 900:  # keep it viewable: the densest 600 px window
        cy, cx = int(np.median(ys)), int(np.median(xs)); x0, x1 = max(cx - 300, 0), min(cx + 300, m.shape[1]); y0, y1 = max(cy - 300, 0), min(cy + 300, m.shape[0])
    ca, cb = v.crop(m, x0, y0, x1, y1), v.crop(i, x0, y0, x1, y1)
    v.save(V + '/img/T0_t90_MAIN_INT1_diffx8.png', v.hst([ca, cb, v.diffmap(ca, cb, 8)], gap=4))
    print("crop", (x0, y0, x1, y1))
v.save(V + '/img/T0_t90_full_MAIN_INT1.png', v.hst([v.down(m, 3), v.down(i, 3), v.down(v.diffmap(m, i, 8), 3)], gap=4))
