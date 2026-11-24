# hold-sweep glitch boxes of the P3 panel, MAIN r11_1 vs INT1 r11_2 (one common percentile stretch per pair); numbers per box
import sys; sys.path.insert(0, sys.argv[1] + '/tools'); import vlib as v, numpy as np
V, SP = sys.argv[1], sys.argv[2]
M, I = SP + '/p3/r11_1/', SP + '/p3/r11_2/'
notes = []
def pr(path, box, k, lab):
    a, b = v.crop(v.load(M + path), *box), v.crop(v.load(I + path), *box)
    La, Lb = v.luma(a), v.luma(b)
    notes.append(f"{lab:38s} MAIN L {La.mean():6.1f} sd {La.std():5.1f} min {La.min():5.0f} | INT1 L {Lb.mean():6.1f} sd {Lb.std():5.1f} min {Lb.min():5.0f}")
    sa, sb = v.stretch([a, b])
    return v.hst([v.up(sa, k), v.up(sb, k)], gap=4)
# A: bottom strips during the hold (p05, p06 qc poses) y 686-766, half scale, MAIN above INT1 (not stretched: tone matters)
rows = []
for p in ['p05_expand.png', 'p06_sustain.png']:
    a, b = v.load(M + p), v.load(I + p)
    for x, nm in [(a, 'MAIN'), (b, 'INT1')]:
        L = v.luma(x[686:766]); notes.append(f"{p} bottom y686-766 {nm}: L {L.mean():.1f} sd {L.std():.1f}")
    rows.append(v.vst([v.down(a[646:766], 2), v.down(b[646:766], 2)], gap=2))
v.save(V + '/img/S5a_hold_bottomstrip_p05_p06_MAIN_over_INT1.png', v.vst(rows, gap=8))
# B: pop frames bottom-left corner (the panel's dark wedge x0-40 y700-766) + bottom-right (grey smudge), 2x
rows = []
for d in ['L', 'R', 'T', 'B', 'BL', 'TR']:
    rows.append(v.hst([pr(f'sweep/sw_pop_{d}.png', (0, 676, 160, 766), 2, f'pop_{d} corner BL x0-160 y676-766'),
                       pr(f'sweep/sw_pop_{d}.png', (1280, 646, 1440, 766), 2, f'pop_{d} corner BR x1280-1440 y646-766')], gap=12))
v.save(V + '/img/S5b_pop_corners_MAIN_INT1_2x_str.png', v.vst(rows, gap=6))
# C: far peak behind the right iceberg during the hold (beige rim) + p06 bottom-right smudge, 3x
rows = [pr('sweep/sw_hold_BL.png', (960, 420, 1160, 500), 3, 'hold_BL far peak x960-1160 y420-500'),
        pr('sweep/sw_hold_TR.png', (1000, 420, 1200, 500), 3, 'hold_TR far peak x1000-1200 y420-500'),
        pr('p06_sustain.png', (1290, 700, 1440, 766), 3, 'p06 smudge x1290-1440 y700-766')]
v.save(V + '/img/S5c_farpeak_smudge_MAIN_INT1_3x_str.png', v.vst(rows, gap=6))
open(V + '/ana/hold_glitchboxes.txt', 'w').write("\n".join(notes) + "\n"); print("\n".join(notes))
