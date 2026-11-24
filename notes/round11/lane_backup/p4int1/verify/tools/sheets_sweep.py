import sys; sys.path.insert(0, sys.argv[1] + '/tools'); import vlib as v, numpy as np
V, SP = sys.argv[1], sys.argv[2]
M, I, H = SP + '/p3/r11_1/sweep/', SP + '/p3/r11_2/sweep/', SP + '/work_p4/p4hold/qc_final/sweep/'
notes = []
for grp in ['hold', 'pop']:
    rows = []
    for d in ['L', 'R', 'T', 'B', 'BL', 'TR']:
        n = f'sw_{grp}_{d}.png'
        a, h, b = v.load(M + n), v.load(H + n), v.load(I + n)
        rows.append(v.hst([v.down(a, 3), v.down(h, 3), v.down(b, 3)], gap=4))
        dh = np.abs(h - b).max(2)
        notes.append(f"{n:16s} int1 vs hold lane: max {dh.max():4.0f} n>8 {(dh > 8).sum():6d}  (bottom 80 rows n>8 {(dh[686:] > 8).sum():5d}, top 160 rows n>8 {(dh[:160] > 8).sum():5d})")
    v.save(V + f'/img/S4_{grp}_MAIN_HOLD_INT1.png', v.vst(rows, gap=4))
for n in ['sw_rel_L.png', 'sw_rel_R.png', 'sw_rel_T.png', 'sw_rel_B.png', 'sw_rel_BL.png', 'sw_rel_TR.png'] + [f'sw_intro_{i}.png' for i in range(8)] + [f'sw_tau_{t}.png' for t in ['0.25', '0.75', '1.25', '1.75', '2.25', '2.75', '3.25', '3.75']]:
    h, b = v.load(H + n), v.load(I + n); dh = np.abs(h - b).max(2)
    notes.append(f"{n:16s} int1 vs hold lane: max {dh.max():4.0f} n>8 {(dh > 8).sum():6d}  (bottom 80 rows n>8 {(dh[686:] > 8).sum():5d})")
open(V + '/ana/sweep_vs_holdlane.txt', 'w').write("\n".join(notes) + "\n"); print("\n".join(notes))
