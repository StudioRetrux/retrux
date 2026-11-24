import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
M = SP + '/p3/r11_1'; L = SP + '/work_p4/p4orb/qc_final'; R = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
out = SP + '/work_p4/judge_p4orb/img'
refs = {'q00_rest': 'ref_F000', 'q01_loop15': 'loop_F015', 'q02_loop30': 'loop_F030', 'q03_eye': 'loop_F045', 'p04_expand_pop': 'ref_F358', 'p05_expand': 'ref_F402', 'p06_sustain': 'ref_F420', 'p07_release_snap': 'ref_F453', 'p08_release_home': 'ref_F460'}
mode = sys.argv[1]
if mode == 'full':
    for pose in sys.argv[2:]:
        a = load(f'{M}/{pose}.png'); b = load(f'{L}/{pose}.png'); r = load(f'{R}/{refs[pose]}.png')
        save(f'{out}/full_{pose}.png', vstack([a[::2, ::2], b[::2, ::2], r[::2, ::2]]))
elif mode == 'box':
    # box pose x y w h zoom [tag]
    pose, x, y, w, h, z = sys.argv[2], *map(int, sys.argv[3:8])
    tag = sys.argv[8] if len(sys.argv) > 8 else 'box'
    a = load(f'{M}/{pose}.png'); b = load(f'{L}/{pose}.png'); r = load(f'{R}/{refs[pose]}.png')
    save(f'{out}/{tag}_{pose}.png', hstack([up(crop(i, x, y, w, h), z) for i in (a, b, r)]))
