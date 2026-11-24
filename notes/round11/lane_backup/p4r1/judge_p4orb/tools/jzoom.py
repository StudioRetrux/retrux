import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from jlib import *
SP = '/private/tmp/claude-501/-Users-muhamadrifaldi-Documents-GitHub-retrux-hero-rnd/a0f5735b-9a7f-477e-9b57-6de40ca5644b/scratchpad'
M = SP + '/p3/r11_1'; L = SP + '/work_p4/p4orb/qc_final'; R = '/Users/muhamadrifaldi/RetruxR11Work/hp/reference'
out = SP + '/work_p4/judge_p4orb/img'
refs = {'q00_rest': 'ref_F000', 'q01_loop15': 'loop_F015', 'q02_loop30': 'loop_F030', 'q03_eye': 'loop_F045', 'p04_expand_pop': 'ref_F358', 'p05_expand': 'ref_F402', 'p06_sustain': 'ref_F420', 'p07_release_snap': 'ref_F453', 'p08_release_home': 'ref_F460'}
# pose: (engine centre, ref centre, half size, zoom)
spec = {
 'q00_rest': ((715, 337), (707, 336), 80, 3),
 'q02_loop30': ((689, 377), (715, 393), 70, 3),
 'q03_eye': ((721, 354), (716, 350), 90, 2),
 'p04_expand_pop': ((703, 349), (677, 432), 90, 2),
 'p05_expand': ((716, 398), (709, 408), 125, 2),
 'p06_sustain': ((722, 369), (695, 414), 125, 2),
}
for pose in sys.argv[1:]:
    (ex, ey), (rx, ry), hs, z = spec[pose]
    a = load(f'{M}/{pose}.png'); b = load(f'{L}/{pose}.png'); r = load(f'{R}/{refs[pose]}.png')
    c = lambda im, x, y: up(crop(im, x - hs, y - hs, 2 * hs, 2 * hs), z)
    save(f'{out}/orb_{pose}.png', hstack([c(a, ex, ey), c(b, ex, ey), c(r, rx, ry)]))
