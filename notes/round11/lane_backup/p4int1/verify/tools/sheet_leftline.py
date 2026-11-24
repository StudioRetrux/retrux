import sys; sys.path.insert(0, sys.argv[1] + '/tools'); import vlib as v, numpy as np
V, SP = sys.argv[1], sys.argv[2]
M, I, E = SP + '/p3/r11_1/ptr/', SP + '/p3/r11_2/ptr/', SP + '/work_p4/p4env/qc_fix/ptr/'
rows, notes = [], []
for s in ['left', 'top_left', 'bottom_left', 'orb']:
    a, b, e = v.load(M + f'ptr_{s}.png'), v.load(I + f'ptr_{s}.png'), v.load(E + f'ptr_{s}.png')
    d = np.abs(a - b).max(2); sub = d[290:430, 880:1140]; ys, xs = np.nonzero(sub > 6)
    bb = (xs.min() + 880, ys.min() + 290, xs.max() + 880, ys.max() + 290) if len(xs) else None
    de = np.abs(e - b).max(2)[290:430, 880:1140]
    notes.append(f"{s}: x880-1140 y290-430 int1 vs MAIN max {sub.max():.0f} n>6 {len(xs)} bbox {bb}; int1 vs env lane qc_fix max {de.max():.0f} n>6 {(de > 6).sum()}")
    box = (880, 290, 1140, 430)
    ca, cb, ce = v.crop(a, *box), v.crop(b, *box), v.crop(e, *box)
    sa, se, sb = v.stretch([ca, ce, cb])
    rows.append(v.hst([v.up(sa, 2), v.up(se, 2), v.up(sb, 2)], gap=3))
v.save(V + '/img/S3f_leftviews_crestline_MAIN_ENV_INT1_2x_str.png', v.vst(rows, gap=3))
print("\n".join(notes)); open(V + '/ana/leftviews_crestline.txt', 'w').write("\n".join(notes) + "\n")
