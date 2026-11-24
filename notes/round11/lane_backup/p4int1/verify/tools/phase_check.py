# ring-phase agreement in the sweep: mean |diff| of luma (1/4 scale, blurred) in the ring area, each capture set vs MAIN r11_1
import sys, glob, os; sys.path.insert(0, sys.argv[1] + '/tools'); import vlib as v, numpy as np
V, SP = sys.argv[1], sys.argv[2]
sets = {'MAIN_r11_1': SP + '/p3/r11_1/sweep/', 'env_qc_fix': SP + '/work_p4/p4env/qc_fix/sweep/', 'ice_qc_fix': SP + '/work_p4/p4ice/qc_fix/sweep/',
        'orb_qc_fix': SP + '/work_p4/p4orb/qc_fix/sweep/', 'hold_qc_final': SP + '/work_p4/p4hold/qc_final/sweep/', 'INT1_r11_2': SP + '/p3/r11_2/sweep/'}
names = [f'sw_hold_{d}.png' for d in ['L', 'R', 'T', 'B', 'BL', 'TR']] + [f'sw_pop_{d}.png' for d in ['L', 'TR']] + [f'sw_rel_{d}.png' for d in ['L', 'TR']] + ['sw_tau_1.25.png', 'sw_intro_7.png']
def f(p):
    a = v.luma(v.down(v.load(p)[0:700, 250:1150], 4)); return a
print('ring-area mean |dLuma| vs MAIN r11_1 (x250-1150 y0-700, 1/4 scale): small (< ~6) = same ring phase')
print('frame'.ljust(16) + ''.join(k.ljust(15) for k in sets))
lines = []
for n in names:
    base = f(sets['MAIN_r11_1'] + n); row = n.ljust(16)
    for k, d in sets.items():
        row += (f"{np.abs(f(d + n) - base).mean():6.1f}" if os.path.exists(d + n) else '   -  ').ljust(15)
    lines.append(row); print(row)
open(V + '/ana/sweep_phase_check.txt', 'w').write("\n".join(lines) + "\n")
