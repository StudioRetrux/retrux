import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
M = SP + '/p3/r11_1'; L = SP + '/work_p4/p4orb/qc_final'; R = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
refs = {'q00_rest': 'ref_F000', 'q01_loop15': 'loop_F015', 'q02_loop30': 'loop_F030', 'q03_eye': 'loop_F045', 'p04_expand_pop': 'ref_F358', 'p05_expand': 'ref_F402', 'p06_sustain': 'ref_F420'}
def st(a):
    a = a[:, 2:-2]
    m = (a[..., 2] - a[..., 0]) >= 85
    p = a[m]
    if len(p) < 50: return 'n/a'
    l = 0.2126*p[:,0]+0.7152*p[:,1]+0.0722*p[:,2]
    mx = p.max(1); mn = p.min(1); s = (mx - mn) / np.maximum(mx, 1)
    # hue
    r, g, b = p[:,0], p[:,1], p[:,2]
    h = np.degrees(np.arctan2(np.sqrt(3)*(g-b), 2*r-g-b)) % 360
    return f"n {m.sum():6d} L med {np.median(l):5.1f} p95 {np.percentile(l,95):5.1f} sat med {np.median(s):.3f} hue {np.median(h):5.1f} RGB {np.median(p,0).round(0)}"
for pose in sys.argv[1:]:
    print(pose)
    for tag, p in (('  MAIN', f'{M}/{pose}.png'), ('  LANE', f'{L}/{pose}.png'), ('  REF ', f'{R}/{refs[pose]}.png')):
        print(tag, st(load(p)))
