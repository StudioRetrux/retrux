# lane effects side by side: MAIN r11_1 | ENV qc_fix | ICE qc_fix / ORB qc_fix | HOLD qc_final | INT1 r11_2 (2 x 3 grid)
import sys; sys.path.insert(0, sys.argv[1] + '/tools'); import vlib as v, numpy as np
V, SP = sys.argv[1], sys.argv[2]
S = {'MAIN': SP + '/p3/r11_1/', 'ENV': SP + '/work_p4/p4env/qc_fix/', 'ICE': SP + '/work_p4/p4ice/qc_fix/', 'ORB': SP + '/work_p4/p4orb/qc_fix/', 'HOLD': SP + '/work_p4/p4hold/qc_final/', 'INT1': SP + '/p3/r11_2/'}
order = ['MAIN', 'ENV', 'ICE', 'ORB', 'HOLD', 'INT1']
def grid(name, box, k_down=1, k_up=1):
    ims = []
    for s in order:
        a = v.crop(v.load(S[s] + name), *box)
        if k_down > 1: a = v.down(a, k_down)
        if k_up > 1: a = v.up(a, k_up)
        ims.append(a)
    return v.vst([v.hst(ims[0:3]), v.hst(ims[3:6])])
v.save(V + '/img/S6a_q00_hero_MAIN_ENV_ICE__ORB_HOLD_INT1.png', grid('q00_rest.png', (540, 170, 900, 560)))
v.save(V + '/img/S6b_p05_hero_MAIN_ENV_ICE__ORB_HOLD_INT1.png', grid('p05_expand.png', (360, 0, 1080, 766), k_down=2))
v.save(V + '/img/S6c_p06_full_MAIN_ENV_ICE__ORB_HOLD_INT1.png', grid('p06_sustain.png', (0, 0, 1440, 766), k_down=3))
v.save(V + '/img/S6e_q03_hero_MAIN_ENV_ICE__ORB_HOLD_INT1.png', grid('q03_eye.png', (540, 170, 900, 560)))
# env: ghost box (ptr_right, 2x) and hairline box (ptr_left, 3x): MAIN | ENV | INT1, one common stretch per row
rows = []
for spot, box, k in [('right', (1180, 290, 1440, 430), 2), ('left', (1120, 370, 1250, 460), 3)]:
    c = [v.crop(v.load(S[s] + f'ptr/ptr_{spot}.png'), *box) for s in ['MAIN', 'ENV', 'INT1']]
    rows.append(v.hst([v.up(x, k) for x in v.stretch(c)], gap=4))
v.save(V + '/img/S6d_env_ghost_hairline_MAIN_ENV_INT1_str.png', v.vst(rows, gap=4))
# numbers: orb rim / ring band stats are the integrator's; here simple region stats per set
import itertools
for name, box, lab in [('q00_rest.png', (640, 290, 800, 450), 'q00 orb box x640-800 y290-450'), ('q00_rest.png', (540, 170, 900, 560), 'q00 hero box'),
                       ('p05_expand.png', (880, 150, 1070, 550), 'p05 right-arc box x880-1070 y150-550')]:
    out = []
    for s in order:
        a = v.crop(v.load(S[s] + name), *box); L = v.luma(a)
        lap = np.abs(L[1:-1, 1:-1] * 4 - L[:-2, 1:-1] - L[2:, 1:-1] - L[1:-1, :-2] - L[1:-1, 2:]).mean()
        out.append(f"{s} L {L.mean():.1f} sd {L.std():.1f} lap {lap:.2f} B-R {(a[..., 2] - a[..., 0]).mean():+.1f} clip>=250 {(L >= 250).mean() * 100:.1f}%")
    print(lab + ': ' + ' | '.join(out))
