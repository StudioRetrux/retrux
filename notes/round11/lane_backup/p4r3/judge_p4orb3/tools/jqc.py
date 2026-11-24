# judge p4orb3: qc-set crop sheets (panel MAIN r11_1 | current MAIN r11_2 | lane | REF) + full-frame lane-vs-r11_2 diff maps
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
S = {'r11_1': SP + '/p3/r11_1', 'r11_2': SP + '/p3/r11_2', 'lane': SP + '/work_p4/p4orb3/qc_final'}
O = sys.argv[1]; os.makedirs(O, exist_ok=True)
R = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
refs = {'q00_rest': ('ref_F000', (707, 336), 62), 'q03_eye': ('loop_F045', (716, 350), 48), 'p04_expand_pop': ('ref_F358', (677, 432), 75),
        'p05_expand': ('ref_F402', (709, 408), 80), 'p06_sustain': ('ref_F420', (695, 414), 80), 'p07_release_snap': ('ref_F453', (720, 387), 55),
        'p08_release_home': ('ref_F460', (723, 382), 55)}
def centre(a):
    m = a.min(-1) >= 246
    H, W = m.shape; m[:, :int(W * .3)] = False; m[:, int(W * .7):] = False; m[:int(H * .15)] = False; m[int(H * .8):] = False
    ys, xs = np.nonzero(m)
    if len(xs) < 30: return W / 2, H * .45, 40
    cx, cy = np.median(xs), np.median(ys)
    for _ in range(3):
        k = np.hypot(xs - cx, ys - cy) < 110
        cx, cy = xs[k].mean(), ys[k].mean()
    r = np.sqrt(k.sum() / np.pi)
    return cx, cy, r
lines = []
for pose, (rf, (rx, ry), rb) in refs.items():
    ims = {k: load(f'{v}/{pose}.png') for k, v in S.items()}
    ra = load(f'{R}/{rf}.png')
    cs = {k: centre(a) for k, a in ims.items()}
    hs = 150
    crops = []
    for k in ['r11_1', 'r11_2', 'lane']:
        cx, cy, r = cs[k]; crops.append(crop(ims[k], int(cx) - hs, int(cy) - hs, 2 * hs, 2 * hs))
    crops.append(crop(ra, rx - hs, ry - hs, 2 * hs, 2 * hs))
    st = [(x - 200) / 55 * 255 for x in crops]
    save(f'{O}/sheet_{pose}.png', vstack([hstack(crops), hstack(st)]))
    a, b = ims['lane'], ims['r11_2']
    d = luma(a) - luma(b); ad = np.abs(d)
    ys, xs = np.nonzero(ad > 6)
    bb = (xs.min(), ys.min(), xs.max(), ys.max()) if len(xs) else None
    lines.append(f"{pose:18s} sizes {a.shape[1]}x{a.shape[0]} ref {ra.shape[1]}x{ra.shape[0]} | centres " + ' '.join(f"{k}=({c[0]:.0f},{c[1]:.0f},r{c[2]:.0f})" for k, c in cs.items()) +
                 f" | lane-r11_2 mean|dL| {ad.mean():.2f} px>6 {(ad > 6).mean() * 100:.2f}% px>20 {(ad > 20).mean() * 100:.2f}% bbox>6 {bb} meandL {d.mean():+.2f}")
    dm = np.stack([np.clip(128 + 4 * d, 0, 255)] * 3, -1)
    save(f'{O}/diff_{pose}.png', vstack([hstack([b, a]), hstack([dm, np.abs(np.stack([d] * 3, -1)) * 8])]) [::2, ::2])
print('\n'.join(lines)); open(f'{O}/qc_stats.txt', 'w').write('\n'.join(lines) + '\n')
