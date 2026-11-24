# judge p4orb3: crystal zooms, the 5 largest crystals per image (B-R >= 70 & sat > .3 blobs), 72 px boxes x3; rows MAIN / lane / REF
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
R = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
A = SP + '/p3/r11_2'; B = SP + '/work_p4/p4orb3/qc_final'; O = sys.argv[1]
sat = lambda F: (F.max(-1) - F.min(-1)) / np.maximum(F.max(-1), 1)
def blobs(a, n=5, hs=36):
    m = (a[..., 2] - a[..., 0] >= 70) & (sat(a) > 0.3)
    m[:40] = False; m[-40:] = False; m[:, :40] = False; m[:, -40:] = False
    out = []
    mm = m.copy()
    for _ in range(n):
        # densest 72x72 window via integral image
        ii = np.pad(mm.astype(np.int32).cumsum(0).cumsum(1), ((1, 0), (1, 0)))
        s = ii[2*hs:, 2*hs:] - ii[:-2*hs, 2*hs:] - ii[2*hs:, :-2*hs] + ii[:-2*hs, :-2*hs]
        y, x = np.unravel_index(np.argmax(s), s.shape)
        if s[y, x] < 40: break
        out.append((x, y)); mm[y:y+2*hs, x:x+2*hs] = False
    return [up(a[y:y+2*hs, x:x+2*hs], 3) for x, y in out]
rows = []
for pose, ref in (('q00_rest', 'ref_F000'), ('p04_expand_pop', 'ref_F358'), ('p07_release_snap', 'ref_F453')):
    for D in (A, B):
        rows.append(hstack(blobs(load(f'{D}/{pose}.png'))))
    rows.append(hstack(blobs(load(f'{R}/{ref}.png'))))
save(f'{O}/crystal_zoom.png', vstack(rows)[::2, ::2])
