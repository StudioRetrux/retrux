# judge p4orb3: pointer spots, MAIN (r11_2) row above lane row (hero region, half size) + crystal stats
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
A = SP + '/p3/r11_2/ptr'; B = SP + '/work_p4/p4orb3/qc_final/ptr'; O = sys.argv[1]
spots = ['rest', 'orb', 'top', 'top_right', 'right', 'bottom_right', 'bottom', 'bottom_left', 'left', 'top_left']
sat = lambda F: (F.max(-1) - F.min(-1)) / np.maximum(F.max(-1), 1)
rows = [[], [], [], []]; lines = []
for i, s in enumerate(spots):
    a, b = load(f'{A}/ptr_{s}.png'), load(f'{B}/ptr_{s}.png')
    r = 0 if i < 5 else 2
    rows[r].append(a[60:720, 330:1110][::2, ::2]); rows[r + 1].append(b[60:720, 330:1110][::2, ::2])
    st = []
    for im in (a, b):
        cr = (im[..., 2] - im[..., 0] >= 85) & (sat(im) > 0.3); l = luma(im)
        st.append(f"crys {cr.sum():6d} p95L {np.percentile(l[cr], 95) if cr.sum() > 50 else 0:5.1f} medSat {np.median(sat(im)[cr]) if cr.sum() > 50 else 0:.3f} clip>=250 {(im.min(-1) >= 250).sum():6d}")
    lines.append(f"{s:12s} MAIN {st[0]} | lane {st[1]}")
save(f'{O}/ptr_sheet.png', vstack([hstack(x) for x in rows]))
print('\n'.join(lines)); open(f'{O}/ptr_stats.txt', 'w').write('\n'.join(lines) + '\n')
