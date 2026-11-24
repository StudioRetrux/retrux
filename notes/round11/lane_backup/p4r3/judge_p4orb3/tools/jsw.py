# judge p4orb3: sweep sheets, r11_2 (MAIN) row above lane row, hero region; + per-frame stats (crystal px, clipped px)
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
A = SP + '/p3/r11_2/sweep'; B = SP + '/work_p4/p4orb3/qc_final/sweep'; O = sys.argv[1]; os.makedirs(O, exist_ok=True)
groups = {'hold': ['sw_hold_' + s for s in ('T', 'TR', 'R', 'B', 'BL', 'L')], 'pop': ['sw_pop_' + s for s in ('T', 'TR', 'R', 'B', 'BL', 'L')],
          'rel': ['sw_rel_' + s for s in ('T', 'TR', 'R', 'B', 'BL', 'L')], 'intro': [f'sw_intro_{i}' for i in range(8)]}
lines = []
sat = lambda F: (F.max(-1) - F.min(-1)) / np.maximum(F.max(-1), 1)
for g, names in groups.items():
    rows = [[], []]
    for n in names:
        if not (os.path.exists(f'{A}/{n}.png') and os.path.exists(f'{B}/{n}.png')): continue
        a, b = load(f'{A}/{n}.png'), load(f'{B}/{n}.png')
        for k, im in enumerate((a, b)):
            c = im[40:740, 340:1100][::2, ::2]; rows[k].append(c)
        st = []
        for im in (a, b):
            cr = (im[..., 2] - im[..., 0] >= 85) & (sat(im) > 0.3); l = luma(im)
            pw = (im.min(-1) >= 235) & (im[..., 2] - im[..., 0] < 25)
            st.append(f"crys {cr.sum():6d} p95L {np.percentile(l[cr], 95) if cr.sum() > 50 else 0:5.1f} clip>=250 {(im.min(-1) >= 250).sum():6d} black {(im.max(-1) <= 8).sum():4d}")
        lines.append(f"{n:12s} MAIN {st[0]} | lane {st[1]}")
    if rows[0]:
        save(f'{O}/sweep_{g}.png', vstack([hstack(rows[0]), hstack(rows[1])]))
print('\n'.join(lines)); open(f'{O}/sweep_stats.txt', 'w').write('\n'.join(lines) + '\n')
